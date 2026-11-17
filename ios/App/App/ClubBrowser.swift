import Capacitor
import UIKit
import WebKit

class ClubBridge: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(ClubBrowser()) }
}

struct FeedPolicy: Decodable {
    struct Rule: Decodable { let paths: [String]; let fallback: String? }
    let hosts: [String]
    let authHosts: [String]
    let home: String
    let rules: [String: Rule]

    func target(_ url: URL, flags: [String: Bool]) -> URL? {
        guard url.scheme == "https", let host = url.host?.lowercased(), url.user == nil,
              url.port == nil || url.port == 443 else { return nil }
        if authHosts.contains(host) { return url }
        guard hosts.contains(host) else { return nil }
        let path = url.path.isEmpty ? "/" : url.path
        for (key, rule) in rules where flags[key] == true {
            if rule.paths.contains(where: { path == $0 || ($0 != "/" && path.hasPrefix($0 + "/")) }) {
                return URL(string: rule.fallback ?? (flags["home"] == true ? rules["home"]?.fallback : nil) ?? home)
            }
        }
        return url
    }
}

@objc(ClubBrowser)
public class ClubBrowser: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ClubBrowser"
    public let jsName = "ClubBrowser"
    public let pluginMethods = [CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)]
    @objc func open(_ call: CAPPluginCall) {
        guard let site = call.getString("site"), let flags = call.getObject("flags") as? [String: Bool],
              let rulesURL = Bundle.main.url(forResource: "rules", withExtension: "json", subdirectory: "public/policy"),
              let scriptURL = Bundle.main.url(forResource: "filter", withExtension: "js", subdirectory: "public/policy") else {
            call.reject("Missing feed configuration"); return
        }
        do {
            let bytes = try Data(contentsOf: rulesURL)
            guard let policy = try JSONDecoder().decode([String: FeedPolicy].self, from: bytes)[site],
                  let objects = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                  let raw = objects[site] else { call.reject("Unknown feed"); return }
            let args = try JSONSerialization.data(withJSONObject: [raw,flags])
            let source = try String(contentsOf: scriptURL, encoding: .utf8) + "(..." + String(decoding: args, as: UTF8.self) + ")"
            DispatchQueue.main.async {
                guard let presenter = self.bridge?.viewController, presenter.presentedViewController == nil else {
                    call.reject("Close the open view first"); return
                }
                let feed = FeedView(policy: policy, flags: flags, script: source)
                let nav = UINavigationController(rootViewController: feed)
                nav.modalPresentationStyle = .fullScreen
                presenter.present(nav, animated: true) {call.resolve()}
            }
        } catch { call.reject("Could not load feed settings") }
    }
}

private final class FeedView: UIViewController, WKNavigationDelegate, WKUIDelegate {
    let policy: FeedPolicy
    let flags: [String: Bool]
    let web: WKWebView
    init(policy: FeedPolicy, flags: [String: Bool], script: String) {
        self.policy = policy; self.flags = flags
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        self.web = WKWebView(frame: .zero, configuration: config)
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("Use designated initializer") }
    override func viewDidLoad() {
        super.viewDidLoad()
        view = web; web.navigationDelegate = self; web.uiDelegate = self; web.allowsBackForwardNavigationGestures = true
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(closeFeed))
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Back", style: .plain, target: self, action: #selector(back))
        if let url = URL(string: policy.home), let target = policy.target(url, flags: flags) {
            title = target.host; web.load(URLRequest(url: target))
        }
    }
    @objc func closeFeed() { dismiss(animated: true) }
    @objc func back() { if web.canGoBack { web.goBack() } else { closeFeed() } }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { title = webView.url?.host }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.targetFrame?.isMainFrame == false {decisionHandler(.allow); return}
        guard let url = action.request.url, let target = policy.target(url, flags: flags) else {
            decisionHandler(.cancel); navigationItem.prompt = "This link leaves the protected feed."; return
        }
        navigationItem.prompt = nil; title = target.host
        if target != url || action.targetFrame == nil {decisionHandler(.cancel);webView.load(URLRequest(url:target));return}
        decisionHandler(.allow)
    }
}
