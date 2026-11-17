package app.offrally.club;

import static org.junit.Assert.*;
import android.Manifest;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.os.Build;
import android.view.accessibility.AccessibilityManager;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ProtectionManifestTest {
    @Test public void installedServiceIsScopedToSupportedPackages() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        AccessibilityManager manager = (AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
        for (AccessibilityServiceInfo info : manager.getInstalledAccessibilityServiceList()) {
            if (!info.getResolveInfo().serviceInfo.name.equals(ProtectionService.class.getName())) continue;
            assertEquals(Manifest.permission.BIND_ACCESSIBILITY_SERVICE, info.getResolveInfo().serviceInfo.permission);
            Set<String> expected = new HashSet<>();
            for (GuardApp app : GuardApp.values()) expected.addAll(Arrays.asList(app.packages));
            assertEquals(expected, new HashSet<>(Arrays.asList(info.packageNames)));
            assertTrue((info.getCapabilities() & AccessibilityServiceInfo.CAPABILITY_CAN_RETRIEVE_WINDOW_CONTENT) != 0);
            if (Build.VERSION.SDK_INT >= 31) assertFalse(info.isAccessibilityTool());
            return;
        }
        fail("Offrally Accessibility service absent from the installed application");
    }
}
