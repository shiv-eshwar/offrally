import Capacitor
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

class ClubBridge: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppProtection())
    }
}

@MainActor
private enum Shields {
    static let store = ManagedSettingsStore(named: .init("offrally"))
    static let defaults = UserDefaults.standard
    static let selectionKey = "protection.appSelection"
    static let activeKey = "protection.shieldsEnabled"

    static var selection: FamilyActivitySelection {
        guard let data = defaults.data(forKey: selectionKey),
              let value = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return value
    }

    static var authorized: Bool { AuthorizationCenter.shared.authorizationStatus == .approved }

    static func status() -> [String: Any] {
#if targetEnvironment(simulator)
        return ["available": false, "authorized": false, "active": false, "count": 0,
                "note": "Screen Time protection requires a physical iPhone or iPad."]
#else
        if !authorized {
            // Apple invalidates selections when authorization is revoked.
            store.clearAllSettings()
            defaults.removeObject(forKey: selectionKey)
            defaults.removeObject(forKey: activeKey)
        }
        let tokens = selection.applicationTokens
        let active = authorized && !tokens.isEmpty && defaults.bool(forKey: activeKey)
        let desired = active ? tokens : nil
        if store.shield.applications != desired { store.shield.applications = desired }
        return ["available": true, "authorized": authorized, "active": active, "count": tokens.count]
#endif
    }
}

private struct AppChooser: View {
    @State var selection: FamilyActivitySelection
    let finish: (FamilyActivitySelection?) -> Void

    private var invalid: Bool {
        !selection.categoryTokens.isEmpty || !selection.webDomainTokens.isEmpty || selection.applicationTokens.count > 50
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if invalid {
                    Text("Choose up to 50 individual apps. Expand a category to pick apps inside it.")
                        .font(.footnote).padding()
                }
                FamilyActivityPicker(selection: $selection)
            }
            .navigationTitle("Protected apps")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { finish(nil) } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { finish(selection) }.disabled(invalid) }
            }
        }
    }
}

@objc(AppProtection)
public class AppProtection: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppProtection"
    public let jsName = "AppProtection"
    public let pluginMethods: [CAPPluginMethod] = ["status", "requestAccess", "chooseApps", "setActive"].map {
        CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise)
    }

    @objc func status(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(Shields.status()) }
    }

    @objc func requestAccess(_ call: CAPPluginCall) {
        Task { @MainActor in
            _ = Shields.status()
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(Shields.status())
            } catch {
                call.reject("Screen Time access was not granted. You can try again in Settings or here.")
            }
        }
    }

    @objc func chooseApps(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard Shields.authorized else { call.reject("Connect Screen Time first."); return }
            guard let presenter = self.bridge?.viewController, presenter.presentedViewController == nil
            else { call.reject("Close the open sheet and try again."); return }
            let picker = AppChooser(selection: Shields.selection) { choice in
                presenter.dismiss(animated: true) {
                    guard Shields.authorized else { call.resolve(Shields.status()); return }
                    if let choice {
                        do {
                            let encoded = try PropertyListEncoder().encode(choice)
                            Shields.defaults.set(encoded, forKey: Shields.selectionKey)
                            if choice.applicationTokens.isEmpty { Shields.defaults.removeObject(forKey: Shields.activeKey) }
                        } catch { call.reject("Could not save the app selection."); return }
                    }
                    call.resolve(Shields.status())
                }
            }
            let sheet = UIHostingController(rootView: picker)
            sheet.isModalInPresentation = true
            presenter.present(sheet, animated: true)
        }
    }

    @objc func setActive(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let active = call.getBool("active"),
                  !active || (Shields.authorized && !Shields.selection.applicationTokens.isEmpty)
            else { call.reject("Connect Screen Time and choose an app first."); return }
            Shields.defaults.set(active, forKey: Shields.activeKey)
            call.resolve(Shields.status())
        }
    }
}
