package app.offrally.club;

import android.accessibilityservice.AccessibilityService;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;

public final class ProtectionService extends AccessibilityService {
    static volatile boolean connected;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String pendingPackage, lastPackage;
    private int lastWindow = -1;
    private long lastAction;
    private boolean scheduled;

    @Override protected void onServiceConnected() {
        super.onServiceConnected();
        connected = true;
    }

    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        String pkg = event.getPackageName().toString();
        GuardApp app = GuardApp.forPackage(pkg);
        SharedPreferences prefs = GuardSettings.prefs(this);
        if (app == null || !GuardSettings.active(prefs) || GuardSettings.mode(prefs, app).equals("allow")) return;
        pendingPackage = pkg;
        if (!scheduled) {
            scheduled = true;
            handler.postDelayed(this::check, 75);
        }
    }

    private void check() {
        scheduled = false;
        GuardApp app = GuardApp.forPackage(pendingPackage);
        SharedPreferences prefs = GuardSettings.prefs(this);
        if (app == null || !GuardSettings.active(prefs)) return;
        String mode = GuardSettings.mode(prefs, app);
        if (mode.equals("allow")) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || !pendingPackage.equals(String.valueOf(root.getPackageName()))) return;
        boolean whole = mode.equals("whole");
        if (!whole && !SectionScreen.matches(root, pendingPackage, app)) {
            lastWindow = -1;
            return;
        }
        long now = SystemClock.uptimeMillis();
        boolean repeated = pendingPackage.equals(lastPackage) && root.getWindowId() == lastWindow;
        if (repeated && now - lastAction < 900) {
            if (!scheduled) {
                scheduled = true;
                handler.postDelayed(this::check, 900 - (now - lastAction));
            }
            return;
        }
        boolean exitApp = whole || (repeated && now - lastAction < 1700);
        if (performGlobalAction(exitApp ? GLOBAL_ACTION_HOME : GLOBAL_ACTION_BACK)) {
            lastPackage = pendingPackage;
            lastWindow = root.getWindowId();
            lastAction = now;
            Toast.makeText(this, (whole ? app.title : app.section) + " paused by Offrally", Toast.LENGTH_SHORT).show();
            if (!exitApp) {
                String pkg = pendingPackage;
                handler.postDelayed(() -> {
                    if (pkg.equals(pendingPackage) && lastAction == now && lastWindow != -1) check();
                }, 1050);
            }
        }
    }

    @Override public void onInterrupt() { resetChecks(); }

    private void resetChecks() {
        handler.removeCallbacksAndMessages(null);
        pendingPackage = null;
        lastWindow = -1;
        scheduled = false;
    }

    @Override public void onDestroy() {
        connected = false;
        resetChecks();
        super.onDestroy();
    }
}
