package app.offrally.club;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(AppProtection.class);
        super.onCreate(state);
        Window window = getWindow();
        int surface = Color.rgb(20, 21, 30);
        findViewById(android.R.id.content).setBackgroundColor(surface);
        if (Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(surface);
            window.setNavigationBarColor(surface);
        }
        if (Build.VERSION.SDK_INT >= 29) window.setNavigationBarContrastEnforced(false);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
    }
}
