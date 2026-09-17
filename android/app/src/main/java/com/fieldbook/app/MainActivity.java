package com.fieldbook.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View container = (View) getBridge().getWebView().getParent();
        container.setBackgroundColor(Color.rgb(245, 243, 233));
        // Keep the entire WebView outside the bars, even when its document scrolls.
        // MainActivity owns insets; SystemBars CSS injection is disabled in config.
        ViewCompat.setOnApplyWindowInsetsListener(container, (view, windowInsets) -> {
            Insets safe = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right, Math.max(safe.bottom, keyboard.bottom));
            // Already applied in native pixels: do not apply them again inside WebView.
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(container);
    }
}
