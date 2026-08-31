package com.ryuto.warito;

import android.graphics.Rect;
import android.os.Build;
import android.view.View;

import com.getcapacitor.BridgeActivity;

import java.util.Collections;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;

        View webView = getBridge().getWebView();
        if (webView == null) return;
        webView.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> exclude(v));
        webView.post(() -> exclude(webView));
    }

    // 時間割の横スワイプが戻るジェスチャに奪われないようにする。OSは端から200dpまでしか受け付けない
    private void exclude(View v) {
        if (v.getWidth() == 0 || v.getHeight() == 0) return;
        int band = (int) (200 * getResources().getDisplayMetrics().density);
        int top = Math.max(0, (v.getHeight() - band) / 2);
        v.setSystemGestureExclusionRects(
            Collections.singletonList(new Rect(0, top, v.getWidth(), Math.min(v.getHeight(), top + band)))
        );
    }
}
