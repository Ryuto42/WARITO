import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.ryuto.warito',
  appName: 'WARITO',
  webDir: 'out',
  ios: {
    // WebView のスクロールは既定のまま触らない。
    // contentInset / scrollEnabled を指定すると成績・アカウント画面が
    // スクロールできなくなるため、余白は CSS の safe-area-inset だけで扱う。
    backgroundColor: '#050811',
  },
  android: {
    // iOS と同じく、余白は CSS の safe-area-inset だけで扱う（targetSdk 36 は
    // 既定でエッジツーエッジなので、ステータスバー下まで WebView が広がる）
    backgroundColor: '#050811',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#050811',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#050811',
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
