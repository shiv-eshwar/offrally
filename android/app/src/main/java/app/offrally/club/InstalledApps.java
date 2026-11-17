package app.offrally.club;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.provider.Settings;
import android.telecom.TelecomManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

final class InstalledApps {
    static final String PREFIX = "package:";

    static List<ApplicationInfo> otherApps(Context context) {
        PackageManager pm = context.getPackageManager();
        Set<String> excluded = new HashSet<>();
        excluded.add(context.getPackageName());
        for (ResolveInfo home : pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)) {
            excluded.add(home.activityInfo.packageName);
        }
        for (ResolveInfo settings : pm.queryIntentActivities(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS), 0)) {
            excluded.add(settings.activityInfo.packageName);
        }
        TelecomManager phone = context.getSystemService(TelecomManager.class);
        if (phone != null) {
            excluded.add(phone.getDefaultDialerPackage());
            if (Build.VERSION.SDK_INT >= 29) excluded.add(phone.getSystemDialerPackage());
        }
        List<ApplicationInfo> apps = new ArrayList<>();
        Intent launch = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        for (ResolveInfo entry : pm.queryIntentActivities(launch, 0)) {
            ApplicationInfo info = entry.activityInfo.applicationInfo;
            if (info.enabled && GuardApp.forPackage(info.packageName) == null
                && excluded.add(info.packageName)) apps.add(info);
        }
        Collections.sort(apps, new ApplicationInfo.DisplayNameComparator(pm));
        return apps;
    }

    static ApplicationInfo find(PackageManager pm, String pkg) {
        try { return pm.getApplicationInfo(pkg, 0); }
        catch (PackageManager.NameNotFoundException e) { return null; }
    }

    static String label(PackageManager pm, String pkg) {
        ApplicationInfo info = find(pm, pkg);
        return info == null ? pkg : info.loadLabel(pm).toString();
    }
}
