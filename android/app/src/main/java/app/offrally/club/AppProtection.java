package app.offrally.club;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.provider.Settings;
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
        state.put("apps", apps);
        state.put("count", count);
        return state;
    }

    @PluginMethod public void status(PluginCall call) { call.resolve(snapshot()); }

    @PluginMethod public void setMode(PluginCall call) {
        GuardApp app = GuardApp.forId(call.getString("id", ""));
        String mode = call.getString("mode", "");
        if (app == null || !(mode.equals("allow") || mode.equals("section") || mode.equals("whole"))) {
            call.reject("Unknown protection rule.");
            return;
        }
        SharedPreferences p = prefs();
        p.edit().putString(app.id(), mode).apply();
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
            .setMessage("Offrally uses Android Accessibility to detect which of your selected apps is open. For section rules, it checks the screen layout and navigation labels on this device. It uses Back or Home when a rule matches. Offrally does not save or send screen contents or messages. You can turn access off in Android Settings at any time.")
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
