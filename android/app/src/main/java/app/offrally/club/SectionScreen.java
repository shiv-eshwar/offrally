package app.offrally.club;

import android.graphics.Rect;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

/** Match a visible player or a selected navigation tab alongside a known sibling. */
final class SectionScreen {
    static boolean matches(AccessibilityNodeInfo root, String pkg, GuardApp app) {
        Rect window = bounds(root);
        if (window.isEmpty()) return false;
        for (String id : app.players) {
            for (AccessibilityNodeInfo node : root.findAccessibilityNodeInfosByViewId(pkg + ":id/" + id)) {
                Rect visible = bounds(node);
                if (node.isVisibleToUser() && pkg.equals(String.valueOf(node.getPackageName())) && visible.intersect(window)
                    && visible.width() >= window.width() * .65 && visible.height() >= window.height() * .5) return true;
            }
        }
        List<AccessibilityNodeInfo> candidates = root.findAccessibilityNodeInfosByText(app.section);
        for (AccessibilityNodeInfo node : candidates) {
            if (!inBar(node, pkg, app, window, app.section) || !selectedControl(node, window)) continue;
            Rect target = bounds(node);
            for (String neighbor : app.neighbors) {
                for (AccessibilityNodeInfo peer : root.findAccessibilityNodeInfosByText(neighbor)) {
                    Rect other = bounds(peer);
                    if (inBar(peer, pkg, app, window, neighbor) && other.bottom > target.top && other.top < target.bottom
                        && (other.right <= target.left || other.left >= target.right)) return true;
                }
            }
        }
        return false;
    }

    private static Rect bounds(AccessibilityNodeInfo node) {
        Rect rect = new Rect();
        node.getBoundsInScreen(rect);
        return rect;
    }

    private static boolean inBar(AccessibilityNodeInfo node, String pkg, GuardApp app, Rect window, String label) {
        if (!node.isVisibleToUser() || !pkg.equals(String.valueOf(node.getPackageName()))) return false;
        Rect b = bounds(node);
        if (!b.intersect(window) || b.width() > window.width() * .45 || b.height() > window.height() * .17) return false;
        int y = b.centerY() - window.top;
        if (app.topBar ? y > window.height() * .19 : y < window.height() * .79) return false;
        return tabLabel(node.getContentDescription(), label) || tabLabel(node.getText(), label);
    }

    static boolean tabLabel(CharSequence raw, String label) {
        if (raw == null) return false;
        String s = raw.toString().trim().toLowerCase(java.util.Locale.ROOT);
        String wanted = label.toLowerCase(java.util.Locale.ROOT);
        return s.equals(wanted) || s.startsWith(wanted + ", tab") || s.equals(wanted + ", selected")
            || s.equals(wanted + " tab");
    }

    private static boolean selectedControl(AccessibilityNodeInfo node, Rect window) {
        for (int i = 0; i < 3 && node != null; i++, node = node.getParent()) {
            Rect b = bounds(node);
            if (b.width() > window.width() * .45 || b.height() > window.height() * .18) break;
            if (node.isSelected() || (node.isCheckable() && node.isChecked())) return true;
        }
        return false;
    }
}
