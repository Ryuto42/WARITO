import { syncStatusBarTheme } from './native';

export type ThemePreference = 'system' | 'dark' | 'light';

const STORAGE_KEY = 'waritoTheme';

// 未設定・不正値は 'system'（端末のダーク/ライトに追従）
export const getThemePreference = (): ThemePreference => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch {}
  return 'system';
};

export const prefersLightSystem = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch {
    return false;
  }
};

export const resolveTheme = (preference: ThemePreference = getThemePreference()): 'dark' | 'light' => {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return prefersLightSystem() ? 'light' : 'dark';
};

// ブラウザ/PWAのクローム色をアプリ内テーマに合わせる（Web/Android用）
const syncMetaThemeColor = (theme: 'dark' | 'light') => {
  const color = theme === 'light' ? '#f1f5f9' : '#050811';
  // media付きのタグは端末設定に反応してしまうため、上書き用の1枚だけを操作する
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-app-theme]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.setAttribute('data-app-theme', '');
    document.head.appendChild(meta);
  }
  meta.content = color;
};

export const applyTheme = (theme: 'dark' | 'light', animate = false) => {
  const root = document.documentElement;
  if (animate) root.classList.add('theme-transition');
  root.classList.toggle('theme-light', theme === 'light');
  root.style.colorScheme = theme;
  syncMetaThemeColor(theme);
  syncStatusBarTheme(theme === 'light');
  if (animate) {
    window.setTimeout(() => root.classList.remove('theme-transition'), 500);
  }
};

export const setThemePreference = (preference: ThemePreference) => {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {}
  applyTheme(resolveTheme(preference), true);
};

// preferenceが'system'のときだけ端末のダーク/ライト切替に追従する
export const watchSystemTheme = (onChange: (theme: 'dark' | 'light') => void) => {
  let media: MediaQueryList;
  try {
    media = window.matchMedia('(prefers-color-scheme: light)');
  } catch {
    return () => {};
  }
  const handler = () => {
    if (getThemePreference() !== 'system') return;
    const next = resolveTheme('system');
    applyTheme(next, true);
    onChange(next);
  };
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
};
