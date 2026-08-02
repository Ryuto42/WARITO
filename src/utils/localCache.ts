import { Preferences } from '@capacitor/preferences';
import { isNative } from './native';

/**
 * 端末内ストレージ（iOS では Capacitor Preferences = UserDefaults）に
 * 時間割・成績を保存し、通信が遅い/切れている場合でも即座に描画できるようにする。
 *
 * - 起動時は localStorage から同期的に読み出して初回描画に間に合わせる
 * - 同じ内容を Preferences にも非同期で書き戻し、WebView のデータ削除に耐える
 */

export const CACHE_KEYS = {
  classes: 'waritoClassesCache',
  grades: 'waritoGradesCache',
  settings: 'waritoSettings',
  year: 'waritoCurrentYear',
  semester: 'waritoCurrentSemester',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

const memory = new Map<string, string>();

/**
 * Preferences は静的 import で受け取る。
 * async 関数から Capacitor のプロキシを return すると、await 時の thenable 判定で
 * `.then` プロパティにアクセスされ、プロキシがそれをネイティブ呼び出しに転送して
 * 「"Preferences.then()" is not implemented」で必ず reject する。
 */

/** 同期読み出し（初回描画用）。localStorage が空なら null */
export const readCacheSync = <T,>(key: CacheKey): T | null => {
  let raw: string | null = null;
  try {
    raw = memory.get(key) ?? localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // 旧バージョンは年度・学期を生の文字列で保存していたため、そのまま返す
    return raw as unknown as T;
  }
};

/**
 * 起動時に localStorage と Preferences を突き合わせる。
 * - localStorage に無く Preferences にある → 復元して返す（WebView のデータが消えた場合）
 * - localStorage にあり Preferences に無い → 書き戻す（取りこぼしの補完）
 */
export const hydrateFromNativeStore = async (keys: CacheKey[] = Object.values(CACHE_KEYS)) => {
  if (!isNative()) return {} as Record<string, unknown>;
  const restored: Record<string, unknown> = {};
  for (const key of keys) {
    try {
      const local = localStorage.getItem(key);
      if (local !== null) {
        const { value } = await Preferences.get({ key });
        if (value !== local) await Preferences.set({ key, value: local });
        continue;
      }
      const { value } = await Preferences.get({ key });
      if (value == null) continue;
      localStorage.setItem(key, value);
      memory.set(key, value);
      try {
        restored[key] = JSON.parse(value);
      } catch {
        restored[key] = value;
      }
    } catch (e) {
      console.error('hydrateFromNativeStore failed', key, e);
    }
  }
  return restored;
};

/** 書き込み。localStorage は同期、Preferences は非同期で追従させる */
export const writeCache = (key: CacheKey, value: unknown) => {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {}
  if (isNative()) {
    Preferences.set({ key, value: raw }).catch((e) => {
      console.error('Preferences.set failed', key, e);
    });
  }
};

export const clearCache = (keys: CacheKey[] = Object.values(CACHE_KEYS)) => {
  for (const key of keys) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  if (isNative()) {
    Promise.all(keys.map((key) => Preferences.remove({ key }))).catch((e) => {
      console.error('Preferences.remove failed', e);
    });
  }
};

/**
 * サーバーから取得した内容がキャッシュと異なるかを判定する。
 * 行の並び順や updated_at の表記ゆれで誤検知しないよう、id 昇順に整列し
 * キーもソートしてから比較する。
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

const canonicalizeRows = (rows: unknown) => {
  if (!Array.isArray(rows)) return stableStringify(rows);
  const sorted = [...rows].sort((a: any, b: any) =>
    String(a?.id ?? '') < String(b?.id ?? '') ? -1 : String(a?.id ?? '') > String(b?.id ?? '') ? 1 : 0
  );
  return stableStringify(sorted);
};

/** キャッシュと差分があれば true。あわせて新しい内容を保存する */
export const writeCacheIfChanged = (key: CacheKey, nextRows: unknown): boolean => {
  const previous = readCacheSync(key);
  const changed = canonicalizeRows(previous) !== canonicalizeRows(nextRows);
  if (changed) writeCache(key, nextRows);
  return changed;
};
