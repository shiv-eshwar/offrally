package app.offrally.club;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.Settings;
import java.util.TreeSet;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppProtection")
public final class AppProtection extends Plugin {
    private SharedPreferences prefs() { return GuardSettings.prefs(getContext()); }

    private boolean installed(GuardApp app) {
        for (String pkg : app.packages) {
            try {
                if (getContext().getPackageManager().getApplicationInfo(pkg, 0).enabled) return true;
            } catch (PackageManager.NameNotFoundException ignored) { }
        }
        return false;
    }

    private JSObject snapshot() {
        SharedPreferences p = prefs();
        JSObject state = new JSObject();
        boolean authorized = ProtectionService.connected && p.getBoolean("consent", false);
        state.put("available", true);
        state.put("authorized", authorized);
        state.put("active", authorized && GuardSettings.active(p) && GuardSettings.hasRules(p));
        JSArray apps = new JSArray();
        int count = 0;
        for (GuardApp app : GuardApp.values()) {
            JSObject row = new JSObject();
            String mode = GuardSettings.mode(p, app);
            row.put("id", app.id());
            row.put("name", app.title);
            row.put("section", app.section);
            row.put("installed", installed(app));
            row.put("mode", mode);
            apps.put(row);
            if (!mode.equals("allow")) count++;
        }
        PackageManager pm = getContext().getPackageManager();
        for (String key : new TreeSet<>(p.getAll().keySet())) {
            if (!key.startsWith(InstalledApps.PREFIX)) continue;
            String pkg = key.substring(InstalledApps.PREFIX.length());
            JSObject row = new JSObject();
            ApplicationInfo info = InstalledApps.find(pm, pkg);
            row.put("id", key);
            row.put("name", info == null ? pkg : info.loadLabel(pm).toString());
            row.put("installed", info != null && info.enabled);
            row.put("mode", "whole");
            apps.put(row);
            count++;
        }
        state.put("apps", apps);
        state.put("count", count);
        return state;
    }

    @PluginMethod public void status(PluginCall call) { call.resolve(snapshot()); }

    @PluginMethod public void otherApps(PluginCall call) {
        JSArray apps = new JSArray();
        for (ApplicationInfo info : InstalledApps.otherApps(getContext())) {
            String id = InstalledApps.PREFIX + info.packageName;
            if (prefs().contains(id)) continue;
            JSObject app = new JSObject();
            app.put("id", id);
            app.put("name", info.loadLabel(getContext().getPackageManager()).toString());
            apps.put(app);
        }
        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod public void setMode(PluginCall call) {
        String id = call.getString("id", "");
        GuardApp app = GuardApp.forId(id);
        String mode = call.getString("mode", "");
        SharedPreferences p = prefs();
        boolean supported = app != null && (mode.equals("allow") || mode.equals("whole") || (mode.equals("section") && app.section != null));
        if (app == null && id.startsWith(InstalledApps.PREFIX)) {
            if (mode.equals("allow")) supported = p.contains(id);
            if (mode.equals("whole")) {
                for (ApplicationInfo info : InstalledApps.otherApps(getContext())) {
                    if (id.equals(InstalledApps.PREFIX + info.packageName)) { supported = true; break; }
                }
            }
        }
        if (!supported) {
            call.reject("Unknown protection rule.");
            return;
        }
        if (mode.equals("allow")) p.edit().remove(id).apply();
        else p.edit().putString(id, mode).apply();
        if (!GuardSettings.hasRules(p)) p.edit().putBoolean("active", false).apply();
        call.resolve(snapshot());
    }

    @PluginMethod public void setActive(PluginCall call) {
        Boolean active = call.getBoolean("active");
        if (active == null || (active && (!ProtectionService.connected || !prefs().getBoolean("consent", false) || !GuardSettings.hasRules(prefs())))) {
            call.reject("Choose an app and connect Accessibility first.");
            return;
        }
        prefs().edit().putBoolean("active", active).apply();
        call.resolve(snapshot());
    }

    @PluginMethod public void requestAccess(PluginCall call) {
        getActivity().runOnUiThread(() -> new AlertDialog.Builder(getActivity())
            .setTitle("Connect app protection?")
            .setMessage("Offrally uses Accessibility to identify the foreground app. For Skip rules, it checks navigation labels and layout on this device, covers the matching tab and leaves recognized video feeds. For whole-app rules, it covers the app with a pause screen. Screen contents stay on this device and are never saved. You can turn access off in Android Settings at any time.")
            .setNegativeButton("Cancel", (d, w) -> call.resolve(snapshot()))
            .setOnCancelListener(d -> call.resolve(snapshot()))
            .setPositiveButton("Agree and continue", (d, w) -> {
                prefs().edit().putBoolean("consent", true).apply();
                if (!ProtectionService.connected) {
                    try { getActivity().startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)); }
                    catch (android.content.ActivityNotFoundException e) { call.reject("Open Android Accessibility settings to connect Offrally."); return; }
                }
                call.resolve(snapshot());
            }).show());
    }
}
