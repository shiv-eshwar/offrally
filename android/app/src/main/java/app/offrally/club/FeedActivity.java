package app.offrally.club;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.net.Uri;
import android.view.Gravity;
import android.view.View;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.util.Iterator;

public class FeedActivity extends Activity {
    private JSONObject policy,flags;
    private WebView web;
    private String script;
    private TextView address;
    private String asset(String name) throws IOException {
        try(InputStream in=getAssets().open("public/policy/"+name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buf=new byte[4096];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);return out.toString("UTF-8");
        }
    }
    private boolean contains(JSONArray list,String host){for(int i=0;i<list.length();i++)if(list.optString(i).equals(host))return true;return false;}
    private String home(){return flags.optBoolean("home")&&policy.optJSONObject("rules").has("home")?"https://m.youtube.com/feed/subscriptions":policy.optString("home");}
    private String destination(Uri u){
        String host=u.getHost();
        if(!"https".equals(u.getScheme())||host==null||u.getUserInfo()!=null||(u.getPort()!=-1&&u.getPort()!=443))return null;
        if(contains(policy.optJSONArray("authHosts"),host))return u.toString();
        if(!contains(policy.optJSONArray("hosts"),host))return null;
        String path=u.getPath();JSONObject rules=policy.optJSONObject("rules");
        for(Iterator<String> it=rules.keys();it.hasNext();){
            String key=it.next();if(!flags.optBoolean(key))continue;
            JSONArray paths=rules.optJSONObject(key).optJSONArray("paths");
            for(int i=0;i<paths.length();i++){String p=paths.optString(i);if(p.equals(path)||(!p.equals("/")&&path!=null&&path.startsWith(p+"/")))return home();}
        }return u.toString();
    }
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        String site=getIntent().getStringExtra("site");
        try{policy=new JSONObject(asset("rules.json")).getJSONObject(site);flags=new JSONObject(getIntent().getStringExtra("flags"));script=asset("filter.js")+"("+policy+","+flags+")";}catch(Exception e){finish();return;}
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setBackgroundColor(Color.rgb(21,22,30));
        layout.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER_VERTICAL);Button close=new Button(this);close.setText("Done");close.setOnClickListener(v->finish());bar.addView(close);
        address=new TextView(this);address.setTextColor(Color.WHITE);bar.addView(address,new LinearLayout.LayoutParams(0,-2,1));
        Button back=new Button(this);back.setText("Back");back.setOnClickListener(v->onBackPressed());bar.addView(back);layout.addView(bar);
        web=new WebView(this);web.setBackgroundColor(Color.WHITE);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){
                if(!req.isForMainFrame())return false;String next=destination(req.getUrl());
                if(next==null){Toast.makeText(FeedActivity.this,"This link leaves the protected feed.",Toast.LENGTH_SHORT).show();return true;}
                if(!next.equals(req.getUrl().toString())){v.loadUrl(next);return true;}return false;
            }
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){address.setText(Uri.parse(url).getHost());}
            @Override public void onPageFinished(WebView v,String url){if(contains(policy.optJSONArray("hosts"),Uri.parse(url).getHost()))v.evaluateJavascript(script,null);}
        });
        if(androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.DOCUMENT_START_SCRIPT)){
            java.util.Set<String> origins=new java.util.HashSet<>();JSONArray hosts=policy.optJSONArray("hosts");for(int i=0;i<hosts.length();i++)origins.add("https://"+hosts.optString(i));
            androidx.webkit.WebViewCompat.addDocumentStartJavaScript(web,script,origins);
        }
        layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(layout);web.loadUrl(home());
    }
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onPause(){if(web!=null)web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(web!=null){web.stopLoading();((android.view.ViewGroup)web.getParent()).removeView(web);web.destroy();}super.onDestroy();}
}
