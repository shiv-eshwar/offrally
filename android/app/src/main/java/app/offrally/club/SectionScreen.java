package app.offrally.club;

import android.graphics.Rect;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Only a verified navigation control may be covered. The player can also open from a link or swipe. */
final class SectionScreen {
    private static final Pattern TAB_SUFFIX = Pattern.compile(
        "(?:,? (?:tab|selected|unselected|[0-9]+ of [0-9]+))+");

    Rect tab;
    boolean inSection;
    AccessibilityNodeInfo alternate;

    static SectionScreen inspect(AccessibilityNodeInfo root, String pkg, GuardApp app) {
        SectionScreen screen = new SectionScreen();
        Rect window = bounds(root);
        if (window.isEmpty()) return screen;
        for (String id : app.players) {
            for (AccessibilityNodeInfo node : root.findAccessibilityNodeInfosByViewId(pkg + ":id/" + id)) {
                Rect b = bounds(node);
                if (visible(node, pkg) && b.intersect(window) && b.width() >= window.width() * .65
                    && b.height() >= window.height() * .5) screen.inSection = true;
            }
        }
        if (app == GuardApp.FACEBOOK && pkg.equals("com.facebook.katana")) {
            screen.inSection |= visibleDescription(root, pkg, "FbShortsComposerAttachmentComponentSpec_STICKER", window)
                && visibleDescription(root, pkg, "FbShortsComposerAttachmentComponentSpec_GIF", window);
        }
        for (String id : app.tabIds) {
            if (screen.findTab(root.findAccessibilityNodeInfosByViewId(pkg + ":id/" + id), true, root, pkg, app, window)) return screen;
        }
        screen.findTab(root.findAccessibilityNodeInfosByText(app.section), false, root, pkg, app, window);
        return screen;
    }

    private static boolean visibleDescription(AccessibilityNodeInfo root, String pkg, String marker, Rect window) {
        for (AccessibilityNodeInfo node : root.findAccessibilityNodeInfosByText(marker)) {
            if (visible(node, pkg) && marker.equals(String.valueOf(node.getContentDescription()))
                && Rect.intersects(window, bounds(node))) return true;
        }
        return false;
    }

    private boolean findTab(List<AccessibilityNodeInfo> candidates, boolean knownId, AccessibilityNodeInfo root,
                            String pkg, GuardApp app, Rect window) {
        for (AccessibilityNodeInfo node : candidates) {
            if (!knownId && !labelled(node, app.section)) continue;
            AccessibilityNodeInfo control = control(node, pkg, app.bar, window);
            if (control == null) continue;
            Rect button = bounds(control);
            boolean active = selected(node, window) || selectedLabel(node.getContentDescription(), app.section);
            boolean hasPeer = false;
            for (String neighbor : app.neighbors) {
                for (AccessibilityNodeInfo peer : root.findAccessibilityNodeInfosByText(neighbor)) {
                    if (!labelled(peer, neighbor)) continue;
                    AccessibilityNodeInfo other = control(peer, pkg, app.bar, window);
                    if (other == null) continue;
                    Rect b = bounds(other);
                    if ((b.right <= button.left || button.right <= b.left) && b.bottom > button.top && b.top < button.bottom
                        && (knownId || active || hasTabRole(node) || hasTabRole(peer) || selected(peer, window)
                            || selectedLabel(peer.getContentDescription(), neighbor) || sameBar(control, other, window))) {
                        hasPeer = true;
                        if (other.isClickable() && other.isEnabled()) {
                            alternate = other;
                            break;
                        }
                    }
                }
                if (alternate != null) break;
            }
            if (!knownId && !hasPeer) continue;
            button.intersect(window);
            tab = button;
            inSection |= active;
            return true;
        }
        return false;
    }

    private static boolean sameBar(AccessibilityNodeInfo a, AccessibilityNodeInfo b, Rect window) {
        for (AccessibilityNodeInfo parent = a.getParent(); parent != null; parent = parent.getParent()) {
            Rect area = bounds(parent);
            if (area.height() > window.height() * .22) break;
            if (area.contains(bounds(b))) {
                for (AccessibilityNodeInfo p = b.getParent(); p != null && bounds(p).height() <= window.height() * .22; p = p.getParent()) {
                    if (parent.equals(p)) return true;
                }
            }
        }
        return false;
    }

    static Rect bounds(AccessibilityNodeInfo node) {
        Rect rect = new Rect();
        node.getBoundsInScreen(rect);
        return rect;
    }

    private static boolean visible(AccessibilityNodeInfo node, String pkg) {
        return node.isVisibleToUser() && pkg.equals(String.valueOf(node.getPackageName()));
    }

    private static boolean hasTabRole(AccessibilityNodeInfo node) {
        return String.valueOf(node.getContentDescription()).toLowerCase(Locale.ROOT).contains("tab")
            || node.getCollectionItemInfo() != null;
    }

    private static boolean labelled(AccessibilityNodeInfo node, String label) {
        return tabLabel(node.getContentDescription(), label) || tabLabel(node.getText(), label);
    }

    static boolean tabLabel(CharSequence raw, String label) {
        if (raw == null) return false;
        String value = raw.toString().trim().toLowerCase(Locale.ROOT);
        String wanted = label.toLowerCase(Locale.ROOT);
        return value.equals(wanted) || value.startsWith(wanted + ", tab,") || value.startsWith(wanted + ", tab ")
            || (value.startsWith(wanted) && TAB_SUFFIX.matcher(value.substring(wanted.length())).matches());
    }

    static boolean selectedLabel(CharSequence raw, String label) {
        if (!tabLabel(raw, label)) return false;
        String value = raw.toString().toLowerCase(Locale.ROOT);
        if (value.contains("not selected")) return false;
        for (String word : value.split("[, ]+")) {
            if (word.equals("selected")) return true;
        }
        return false;
    }

    private static AccessibilityNodeInfo control(AccessibilityNodeInfo node, String pkg, GuardApp.Bar bar, Rect window) {
        if (!visible(node, pkg)) return null;
        AccessibilityNodeInfo label = null;
        for (int i = 0; i < 5 && node != null; i++, node = node.getParent()) {
            Rect b = bounds(node);
            if (!b.intersect(window) || b.width() > window.width() * .45 || b.height() > window.height() * .18) break;
            int y = b.centerY() - window.top;
            boolean inBar = (bar != GuardApp.Bar.BOTTOM && y <= window.height() * .22)
                || (bar != GuardApp.Bar.TOP && y >= window.height() * .77);
            if (inBar && visible(node, pkg)) {
                if (node.isClickable()) return node;
                if (label == null) label = node;
            }
        }
        return label;
    }

    private static boolean selected(AccessibilityNodeInfo node, Rect window) {
        for (int i = 0; i < 5 && node != null; i++, node = node.getParent()) {
            Rect b = bounds(node);
            if (b.width() > window.width() * .45 || b.height() > window.height() * .18) break;
            if (node.isSelected() || (node.isCheckable() && node.isChecked())) return true;
        }
        return false;
    }
}
