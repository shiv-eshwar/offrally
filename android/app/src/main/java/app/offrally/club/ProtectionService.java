package app.offrally.club;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.KeyguardManager;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Rect;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public final class ProtectionService extends AccessibilityService implements SharedPreferences.OnSharedPreferenceChangeListener {
    static volatile boolean connected;
    private static final int WINDOWS = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED | AccessibilityEvent.TYPE_WINDOWS_CHANGED;
    private static final int CONTENT = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED | AccessibilityEvent.TYPE_VIEW_SCROLLED
        | AccessibilityEvent.TYPE_VIEW_SELECTED | AccessibilityEvent.TYPE_VIEW_CLICKED;
    private final Handler handler = new Handler(Looper.getMainLooper());
    // A closing publisher process can stall a node request. A new window can use the second worker.
    private final ExecutorService reader = Executors.newFixedThreadPool(2);
    private final Runnable check = () -> update(null, -1, true);
    private final Runnable verifyNeighbor = this::verifyNavigation;
    private ProtectionOverlay overlay;
    private SharedPreferences prefs;
    private int windowId = -1, subscribedEvents = -1, missingRoot;
    private final Rect area = new Rect();
    private String owner, title;
    private boolean leavingSection, retryWithBack, queued, needsRescan;
    private volatile long generation;
    private Future<?> scan;

    @Override protected void onServiceConnected() {
        super.onServiceConnected();
        overlay = new ProtectionOverlay(this);
        prefs = GuardSettings.prefs(this);
        prefs.registerOnSharedPreferenceChangeListener(this);
        connected = true;
        rulesChanged();
    }

    @Override public void onSharedPreferenceChanged(SharedPreferences p, String key) { rulesChanged(); }

    private void rulesChanged() {
        reset();
        listen(GuardSettings.active(prefs) ? WINDOWS : 0);
        if (GuardSettings.active(prefs)) update(null, -1, true);
    }

    private void listen(int events) {
        if (events == subscribedEvents) return;
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            if (info.eventTypes != events) {
                info.eventTypes = events;
                setServiceInfo(info);
            }
            subscribedEvents = events;
        }
    }

    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || prefs == null || !GuardSettings.active(prefs)) return;
        String pkg = event.getPackageName() == null ? null : event.getPackageName().toString();
        int type = event.getEventType();
        if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            update(pkg, event.getWindowId(), true);
        } else if (type == AccessibilityEvent.TYPE_WINDOWS_CHANGED) {
            update(null, -1, false);
        } else if (pkg != null && pkg.equals(owner) && event.getWindowId() == windowId) {
            scheduleCheck(32);
        }
    }

    private void scheduleCheck(long delay) {
        if (!queued) {
            queued = true;
            handler.postDelayed(check, delay);
        }
    }

    private AccessibilityWindowInfo foreground(Rect available) {
        if (!getSystemService(PowerManager.class).isInteractive() || getSystemService(KeyguardManager.class).isKeyguardLocked()) return null;
        List<AccessibilityWindowInfo> windows = getWindows();
        AccessibilityWindowInfo focused = null;
        for (AccessibilityWindowInfo w : windows) {
            if (w.isFocused() && w.getType() == AccessibilityWindowInfo.TYPE_APPLICATION) { focused = w; break; }
        }
        if (focused == null) return null;
        focused.getBoundsInScreen(available);
        for (AccessibilityWindowInfo w : windows) {
            if (w.getLayer() <= focused.getLayer() || w.getType() == AccessibilityWindowInfo.TYPE_ACCESSIBILITY_OVERLAY) continue;
            Rect obstruction = new Rect();
            w.getBoundsInScreen(obstruction);
            excludeEdge(available, obstruction);
        }
        return available.isEmpty() ? null : focused;
    }

    private void update(String hint, int hintWindow, boolean inspect) {
        if (inspect) {
            handler.removeCallbacks(check);
            queued = false;
        }
        if (!GuardSettings.active(prefs)) return;
        Rect bounds = new Rect();
        AccessibilityWindowInfo window = foreground(bounds);
        if (window == null) {
            if (windowId != -1) { reset(); listen(WINDOWS); }
            return;
        }
        int id = window.getId();
        if (id != windowId) {
            reset();
            windowId = id;
            area.set(bounds);
            inspect = true;
        } else if (!bounds.equals(area)) {
            cancelScan();
            area.set(bounds);
            if (owner == null || !"whole".equals(GuardSettings.modeForPackage(prefs, owner))) overlay.clear();
            inspect = true;
        }
        // Android supplies the window ID with state events. Never act on a package hint for a background window.
        if (hint != null && hintWindow == id && !hint.equals(owner)) {
            cancelScan();
            handler.removeCallbacks(verifyNeighbor);
            owner = hint;
            title = null;
            leavingSection = false;
            retryWithBack = false;
            inspect = true;
        }
        if (owner != null && !sectionRule()) return;
        if (inspect || owner == null) inspect(window);
    }

    /** Apply rules that need only foreground identity. They never wait for the publisher's view tree. */
    private boolean sectionRule() {
        String mode = GuardSettings.modeForPackage(prefs, owner);
        if (mode.equals("section")) {
            listen(WINDOWS | CONTENT);
            return true;
        }
        listen(WINDOWS);
        if (mode.equals("whole")) {
            if (title == null) {
                GuardApp app = GuardApp.forPackage(owner);
                title = app == null ? InstalledApps.label(getPackageManager(), owner) : app.title;
            }
            overlay.shield(area, title);
        } else {
            overlay.clear();
        }
        return false;
    }

    private void inspect(AccessibilityWindowInfo window) {
        if (scan != null) { needsRescan = true; return; }
        long ticket = generation;
        scan = reader.submit(() -> {
            try {
                AccessibilityNodeInfo root = Build.VERSION.SDK_INT >= 33 ? window.getRoot(0) : window.getRoot();
                if (ticket != generation) return;
                String pkg = root == null || root.getPackageName() == null ? null : root.getPackageName().toString();
                GuardApp app = GuardApp.forPackage(pkg);
                SectionScreen result = app != null && app.section != null && GuardSettings.active(prefs)
                    && "section".equals(GuardSettings.mode(prefs, app)) ? SectionScreen.inspect(root, pkg, app) : null;
                handler.post(() -> inspected(ticket, pkg, result));
            } catch (IllegalStateException | SecurityException e) {
                // The window or service connection may have gone away during the IPC.
                handler.post(() -> inspected(ticket, null, null));
            }
        });
    }

    private void inspected(long ticket, String pkg, SectionScreen result) {
        if (ticket != generation) return;
        scan = null;
        if (!stillFocused(ticket)) { update(null, -1, false); return; }
        if (pkg == null) {
            if (++missingRoot <= 4) scheduleCheck(64);
            return;
        }
        missingRoot = 0;
        owner = pkg;
        if (!sectionRule()) return;
        if (result != null) {
            GuardApp app = GuardApp.forPackage(pkg);
            if (result.inSection) {
                overlay.shield(area, app.section);
                if (retryWithBack) {
                    retryWithBack = false;
                    performGlobalAction(GLOBAL_ACTION_BACK);
                    scheduleCheck(100);
                } else if (!leavingSection) {
                    leavingSection = true;
                    if (result.alternate == null) performGlobalAction(GLOBAL_ACTION_BACK);
                    else {
                        selectNeighbor(ticket, pkg, result.alternate);
                        handler.postDelayed(verifyNeighbor, 500);
                    }
                    scheduleCheck(100);
                }
            } else {
                handler.removeCallbacks(verifyNeighbor);
                leavingSection = false;
                retryWithBack = false;
                if (result.tab != null && result.tab.intersect(area)) overlay.tab(result.tab, app);
                else overlay.clear();
            }
        }
        if (needsRescan) {
            needsRescan = false;
            scheduleCheck(32);
        }
    }

    private boolean stillFocused(long ticket) {
        if (ticket != generation || !GuardSettings.active(prefs)) return false;
        Rect bounds = new Rect();
        AccessibilityWindowInfo w = foreground(bounds);
        return w != null && w.getId() == windowId && bounds.equals(area);
    }

    private void selectNeighbor(long ticket, String pkg, AccessibilityNodeInfo node) {
        reader.execute(() -> {
            if (ticket != generation || !GuardSettings.active(prefs) || !"section".equals(GuardSettings.modeForPackage(prefs, pkg))) return;
            try {
                if (node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return;
            } catch (IllegalStateException | SecurityException ignored) {
                // A replaced tab can no longer accept the action.
            }
            handler.post(() -> {
                if (leavingSection && stillFocused(ticket)) verifyNavigation();
            });
        });
    }

    private void verifyNavigation() {
        handler.removeCallbacks(verifyNeighbor);
        if (!leavingSection) return;
        // A publisher may accept the click during a launch animation without navigating.
        // Read the current window again before issuing one fallback Back.
        cancelScan();
        retryWithBack = true;
        update(null, -1, true);
    }

    // Accessibility overlays sit above system UI. Leave OS-owned edges reachable.
    private static void excludeEdge(Rect area, Rect obstruction) {
        if (!obstruction.intersect(area)) return;
        if (obstruction.equals(area)) area.setEmpty();
        else if (obstruction.width() == area.width()) {
            if (obstruction.top == area.top) area.top = obstruction.bottom;
            else if (obstruction.bottom == area.bottom) area.bottom = obstruction.top;
        } else if (obstruction.height() == area.height()) {
            if (obstruction.left == area.left) area.left = obstruction.right;
            else if (obstruction.right == area.right) area.right = obstruction.left;
        }
    }

    private void cancelScan() {
        generation++;
        if (scan != null) scan.cancel(false);
        scan = null;
        needsRescan = false;
        missingRoot = 0;
    }

    private void reset() {
        cancelScan();
        handler.removeCallbacks(check);
        handler.removeCallbacks(verifyNeighbor);
        queued = false;
        if (overlay != null) overlay.clear();
        windowId = -1;
        owner = null;
        title = null;
        leavingSection = false;
        retryWithBack = false;
    }

    @Override public void onConfigurationChanged(Configuration config) {
        super.onConfigurationChanged(config);
        if (overlay != null) { reset(); scheduleCheck(16); }
    }

    @Override public void onInterrupt() { reset(); }

    @Override public void onDestroy() {
        connected = false;
        if (prefs != null) prefs.unregisterOnSharedPreferenceChangeListener(this);
        reset();
        reader.shutdownNow();
        super.onDestroy();
    }
}
