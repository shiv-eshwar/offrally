package app.offrally.qafixture;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Isolated native controls for a disposable emulator. No network, login or social content. */
public final class Screen extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        show(getIntent().getStringExtra("screen"));
    }

    @Override public void onBackPressed() { show("home"); }

    private void trace(String value) {
        Log.i("OffrallyFixture", getPackageName() + " " + getIntent().getStringExtra("ticket") + " " + value);
    }

    private void position(View v, String key) {
        v.post(() -> {
            int[] xy = new int[2];
            v.getLocationOnScreen(xy);
            trace(key + " " + (xy[0] + v.getWidth() / 2) + " " + (xy[1] + v.getHeight() / 2));
        });
    }

    private void show(String screen) {
        String pkg = getPackageName();
        boolean ig = pkg.equals("com.instagram.android"), yt = pkg.equals("com.google.android.youtube");
        boolean fb = pkg.equals("com.facebook.katana"), tt = pkg.equals("com.zhiliaoapp.musically");
        String section = ig || fb ? "Reels" : yt ? "Shorts" : tt ? "For You" : "Spotlight";
        boolean top = tt || (fb && !"bottom".equals(screen));
        boolean viewer = "viewer".equals(screen) || "link".equals(screen) || "sticky".equals(screen);
        LinearLayout root = new LinearLayout(this);
        root.setFitsSystemWindows(true);
        root.setOrientation(LinearLayout.VERTICAL);
        LinearLayout nav = new LinearLayout(this);
        for (String label : new String[]{tt ? "Following" : "Home", section, "Chat"}) {
            Button tab = new Button(this);
            tab.setText(label);
            tab.setContentDescription(label + ", Tab");
            boolean target = section.equals(label);
            tab.setSelected(target && viewer);
            tab.setOnClickListener(v -> {
                trace(target ? "targetTap" : "neighborTap");
                if ("sticky".equals(screen) && !target) return;
                show(target ? "viewer" : "home");
            });
            if (viewer && target) {
                tab.setClickable(false);
                if (fb) {
                    tab.setSelected(false);
                    tab.setContentDescription(label + ", selected, tab 2 of 3");
                }
            }
            nav.addView(tab, new LinearLayout.LayoutParams(0, -1, 1));
            position(tab, target ? "targetPoint" : label.equals("Chat") ? "rightPoint" : "safePoint");
        }
        int barHeight = Math.round(52 * getResources().getDisplayMetrics().density);
        boolean hasNav = !"link".equals(screen) && !"article".equals(screen);
        if (hasNav && top) root.addView(nav, -1, barHeight);
        TextView body = new TextView(this);
        body.setGravity(Gravity.CENTER);
        body.setText("OFFRALLY TEST FIXTURE\n" + screen);
        body.setOnClickListener(v -> trace("bodyTap"));
        if ("article".equals(screen)) body.setContentDescription(section);
        if (viewer && (ig || yt)) body.setId(ig ? R.id.clips_viewer_container : R.id.reel_player_page_container);
        root.addView(body, new LinearLayout.LayoutParams(-1, 0, 1));
        if (fb && "link".equals(screen)) {
            for (String name : new String[]{"STICKER", "GIF"}) {
                Button action = new Button(this);
                action.setContentDescription("FbShortsComposerAttachmentComponentSpec_" + name);
                root.addView(action);
            }
        }
        if (hasNav && !top) root.addView(nav, -1, barHeight);
        setContentView(root);
        position(body, "bodyPoint");
        trace(screen);
    }
}
