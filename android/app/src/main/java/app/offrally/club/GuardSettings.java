package app.offrally.club;

import android.content.Context;
import android.content.SharedPreferences;

final class GuardSettings {
    static final String PREFS = "installed-app-protection";
    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String mode(SharedPreferences prefs, GuardApp app) {
        return prefs.getString(app.id(), "allow");
    }

    static boolean hasRules(SharedPreferences prefs) {
        for (GuardApp app : GuardApp.values()) if (!mode(prefs, app).equals("allow")) return true;
        return false;
    }

    static boolean active(SharedPreferences prefs) {
        return prefs.getBoolean("consent", false) && prefs.getBoolean("active", false);
    }
}
