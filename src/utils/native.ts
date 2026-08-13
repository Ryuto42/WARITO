import { Capacitor } from '@capacitor/core';

export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const isIOS = () => {
  try {
    return Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
};

// 各プラットフォームで出せる最小の振動。iOSはselectionChanged()が最軽量だが、
// Androidはプラグインの最小プリセットでも長く強い（50-100ms）ため、Web Vibration APIの8msを使う。
const MIN_VIBRATE_MS = 8;

const tryWebVibrate = (ms: number) => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    return navigator.vibrate(ms);
  } catch {
    return false;
  }
};

export const selectionHaptic = () => {
  if (isNative() && isIOS()) {
    import('@capacitor/haptics')
      .then(({ Haptics }) => Haptics.selectionChanged())
      .catch(() => {});
    return;
  }

  if (tryWebVibrate(MIN_VIBRATE_MS)) return;

  // Vibration API が無い Android WebView 向けのフォールバック
  if (isNative()) {
    import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {});
  }
};

export const impactHaptic = () => selectionHaptic();

export const notifyHaptic = (type: 'success' | 'warning' | 'error' = 'success') => {
  if (!isNative()) return;
  import('@capacitor/haptics')
    .then(({ Haptics, NotificationType }) =>
      Haptics.notification({
        type:
          type === 'error'
            ? NotificationType.Error
            : type === 'warning'
              ? NotificationType.Warning
              : NotificationType.Success,
      })
    )
    .catch(() => {});
};

// iOSはCSSがOSのLiquid Glass素材にならないため、タブバーをネイティブビューで描画する（GlassTabBarController.swift）
export const usesNativeTabBar = () => isNative() && isIOS();

// タブバーと同じネイティブレイヤーに置くコントロール群
export const usesNativeGlassControls = () => usesNativeTabBar();

type NativeTabBarState = { activeTab: string; visible: boolean };

export const syncNativeTabBar = (state: NativeTabBarState) => {
  if (!usesNativeTabBar()) return;
  try {
    (window as any).webkit?.messageHandlers?.waritoTabBar?.postMessage(state);
  } catch {}
};

export const bindNativeTabBar = (handlers: {
  onTab: (tab: 'timetable' | 'grades') => void;
  onAdd: () => void;
}) => {
  if (!usesNativeTabBar()) return () => {};
  const w = window as any;
  w.__waritoNativeTab = (tab: string) => {
    if (tab === 'timetable' || tab === 'grades') handlers.onTab(tab);
  };
  w.__waritoNativeAdd = () => handlers.onAdd();
  return () => {
    delete w.__waritoNativeTab;
    delete w.__waritoNativeAdd;
  };
};

type NativeGlassControlsState = {
  activeTab: string;
  visible: boolean;
  year: number;
  semester: string;
};

export const syncNativeGlassControls = (state: NativeGlassControlsState) => {
  if (!usesNativeGlassControls()) return;
  try {
    (window as any).webkit?.messageHandlers?.waritoGlassControls?.postMessage(state);
  } catch {}
};

export const bindNativeGlassControls = (handlers: {
  onSearch: () => void;
  onAccount: () => void;
  onTerm: () => void;
}) => {
  if (!usesNativeGlassControls()) return () => {};
  const w = window as any;
  w.__waritoNativeGlassSearch = handlers.onSearch;
  w.__waritoNativeGlassAccount = handlers.onAccount;
  w.__waritoNativeGlassTerm = handlers.onTerm;
  return () => {
    delete w.__waritoNativeGlassSearch;
    delete w.__waritoNativeGlassAccount;
    delete w.__waritoNativeGlassTerm;
  };
};

// ネイティブ起動時の初期化: ステータスバー・スプラッシュ・キーボード
export const initNativeShell = async () => {
  if (!isNative()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const isLight = document.documentElement.classList.contains('theme-light');
    await StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {}

  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    // Keyboard.setScroll({isDisabled:true}) はWKWebViewのscrollView自体を無効化し
    // 成績・アカウント画面がスクロール不能になるため使わない
  } catch {}

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {}
};

export const syncStatusBarTheme = async (isLightTheme: boolean) => {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: isLightTheme ? Style.Light : Style.Dark });
  } catch {}
};
