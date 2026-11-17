package app.offrally.qafixture;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Isolated native UI for an empty emulator. No network, login or social content. */
public final class Screen extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        show(getIntent().getStringExtra("screen"));
    }

    @Override public void onBackPressed() { show("home"); }

    private void show(String screen) {
        String pkg = getPackageName();
        boolean ig = pkg.equals("com.instagram.android"), yt = pkg.equals("com.google.android.youtube");
        boolean top = pkg.equals("com.zhiliaoapp.musically");
        boolean viewer = "viewer".equals(screen);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        LinearLayout nav = new LinearLayout(this);
        for (String label : new String[]{top ? "Following" : "Home", ig ? "Reels" : yt ? "Shorts" : top ? "For You" : "Spotlight", top ? "Friends" : "Chat"}) {
            Button tab = new Button(this);
            tab.setText(label);
            tab.setContentDescription(label);
            tab.setSelected(viewer && (label.equals("For You") || label.equals("Spotlight")));
            nav.addView(tab, new LinearLayout.LayoutParams(0, -1, 1));
        }
        int barHeight = Math.round(52 * getResources().getDisplayMetrics().density);
        if (top) root.addView(nav, -1, barHeight);
        TextView body = new TextView(this);
        body.setGravity(Gravity.CENTER);
        body.setText("OFFRALLY TEST FIXTURE\n" + screen);
        if (viewer && (ig || yt)) body.setId(ig ? R.id.clips_viewer_container : R.id.reel_player_page_container);
        root.addView(body, new LinearLayout.LayoutParams(-1, 0, 1));
        if (!top) root.addView(nav, -1, barHeight);
        setContentView(root);
        Log.i("OffrallyFixture", pkg + " " + getIntent().getStringExtra("ticket") + " " + screen);
    }
}
