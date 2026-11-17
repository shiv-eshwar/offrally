package app.offrally.club;

import android.accessibilityservice.AccessibilityService;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** A touchable window confined to the verified app window or its single navigation cell. */
final class ProtectionOverlay {
    private final AccessibilityService service;
    private final WindowManager windows;
    private final Rect area = new Rect();
    private View view;
    private String currentTitle;
    private boolean full;
    private int currentColor;

    ProtectionOverlay(AccessibilityService service) {
        this.service = service;
        windows = service.getSystemService(WindowManager.class);
    }

    void tab(Rect bounds, GuardApp app) {
        boolean dark = (service.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
        int color = app == GuardApp.TIKTOK ? Color.BLACK : dark ? Color.rgb(15, 15, 15) : Color.WHITE;
        show(bounds, app.section, false, color);
    }

    void shield(Rect bounds, String title) {
        show(bounds, title, true, Color.rgb(24, 25, 33));
    }

    private void show(Rect bounds, String title, boolean shield, int color) {
        if (view != null && full == shield && title.equals(currentTitle) && color == currentColor) {
            if (!area.equals(bounds)) {
                windows.updateViewLayout(view, layout(bounds));
                area.set(bounds);
            }
            return;
        }
        clear();
        View next = shield ? pauseView(title) : new View(service);
        next.setBackgroundColor(color);
        next.setClickable(true); // Consume taps and swipes that start inside this window.
        if (!shield) next.setContentDescription(title + " paused by Offrally");
        windows.addView(next, layout(bounds));
        view = next;
        currentTitle = title;
        currentColor = color;
        full = shield;
        area.set(bounds);
    }

    private WindowManager.LayoutParams layout(Rect bounds) {
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(bounds.width(), bounds.height(),
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.OPAQUE);
        p.gravity = Gravity.TOP | Gravity.LEFT;
        p.x = bounds.left;
        p.y = bounds.top;
        if (Build.VERSION.SDK_INT >= 28) p.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        if (Build.VERSION.SDK_INT >= 30) p.setFitInsetsTypes(0);
        p.setTitle("Offrally protection");
        return p;
    }

    private View pauseView(String title) {
        LinearLayout panel = new LinearLayout(service);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(16), 0, dp(16), 0);
        TextView brand = new TextView(service);
        brand.setText("Offrally");
        brand.setGravity(Gravity.CENTER);
        brand.setTextColor(Color.rgb(198, 238, 152));
        brand.setTextSize(16);
        panel.addView(brand);
        TextView heading = new TextView(service);
        heading.setText(title + " is paused");
        heading.setTextColor(Color.WHITE);
        heading.setGravity(Gravity.CENTER);
        heading.setTextSize(28);
        heading.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        panel.addView(heading);
        Button home = new Button(service);
        home.setText("Go to Home screen");
        home.setAllCaps(false);
        home.setTextColor(Color.rgb(26, 34, 23));
        GradientDrawable fill = new GradientDrawable();
        fill.setColor(Color.rgb(198, 238, 152));
        fill.setCornerRadius(dp(22));
        home.setBackground(fill);
        home.setPadding(dp(24), 0, dp(24), 0);
        home.setOnClickListener(v -> service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME));
        LinearLayout.LayoutParams button = new LinearLayout.LayoutParams(-2, dp(48));
        button.topMargin = dp(20);
        panel.addView(home, button);
        return panel;
    }

    private int dp(int size) { return Math.round(size * service.getResources().getDisplayMetrics().density); }

    void clear() {
        if (view != null) windows.removeViewImmediate(view);
        view = null;
        area.setEmpty();
    }
}
