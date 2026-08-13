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

/**
 * 各プラットフォームで出せる最小の振動。
 *
 * 強さの順序はプラットフォームで異なるので分岐している:
 * - iOS: selectionChanged()（UISelectionFeedbackGenerator）が最も軽い。
 *   ImpactStyle.Light よりさらに弱い「カチッ」。
 * - Android: プラグインの最小プリセットでも impact LIGHT = 50ms/振幅110、
 *   selectionChanged に至っては 100ms あり「ブッ」と鳴ってしまう。
 *   そのため Web Vibration API の 8ms ティックを使う。
 * - Web: navigator.vibrate（実質 Android ブラウザのみ）。非対応なら無振動。
 */
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

  // Vibration API が無い Android WebView 向けの保険。
  // プラグインで出せる最小プリセットにフォールバックする。
  // Web（PC ブラウザ等）では振動しないまま終わる。
  if (isNative()) {
    import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {});
  }
};

/** メニューバーの + ボタンも同じ最小フィードバックに揃える */
export const impactHaptic = () => selectionHaptic();

/** 保存成功・エラーなどの通知フィードバック */
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

/**
 * iOS ではタブバーをネイティブビュー（UIGlassEffect）で描画する。
 * WebView 内の CSS は OS の Liquid Glass 素材にはならないため、
 * そのバーだけネイティブに持ち上げている（GlassTabBarController.swift）。
 */
export const usesNativeTabBar = () => isNative() && isIOS();

/**
 * iOS 26 の UIKit Liquid Glass コントロールを使う対象。
 * タブバーと同じネイティブレイヤーに置くため、iOS のみ有効にする。
 */
export const usesNativeGlassControls = () => usesNativeTabBar();

type NativeTabBarState = { activeTab: string; visible: boolean };

export const syncNativeTabBar = (state: NativeTabBarState) => {
  if (!usesNativeTabBar()) return;
  try {
    (window as any).webkit?.messageHandlers?.waritoTabBar?.postMessage(state);
  } catch {}
};

/** ネイティブのタブバーからのタップを受け取る */
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

/** ネイティブの検索・アカウント・学期ボタンからのタップを受け取る */
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

/** ネイティブ起動時の初期化（ステータスバー・スプラッシュ・キーボード） */
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
    // Keyboard.setScroll({ isDisabled: true }) は WKWebView の scrollView 自体を
    // 無効化してしまい、成績・アカウント画面がスクロールできなくなるので使わない。
  } catch {}

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {}
};

/** テーマ切替に追従してステータスバーの文字色を変える */
export const syncStatusBarTheme = async (isLightTheme: boolean) => {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: isLightTheme ? Style.Light : Style.Dark });
  } catch {}
};
