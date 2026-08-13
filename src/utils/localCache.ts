import { Preferences } from '@capacitor/preferences';
import { isNative } from './native';

// localStorage（同期・初回描画用）と Preferences（非同期・WebView再作成に耐える永続化）の二重保存

export const CACHE_KEYS = {
  classes: 'waritoClassesCache',
  grades: 'waritoGradesCache',
  settings: 'waritoSettings',
  year: 'waritoCurrentYear',
  semester: 'waritoCurrentSemester',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

const memory = new Map<string, string>();

// Preferences は静的importで受け取る: async関数からCapacitorのプロキシをreturnすると、
// await時の thenable 判定で `.then` にアクセスされ、プロキシがそれをネイティブ呼び出しに
// 転送して "Preferences.then() is not implemented" で必ず reject する。

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
    // 旧バージョンが年度・学期を生の文字列で保存していた名残
    return raw as unknown as T;
  }
};

// localStorageに無くPreferencesにあれば復元、逆はPreferencesへ書き戻す
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

// localStorageは同期、Preferencesは非同期で追従して書く
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

// 行の並び順やキー順の違いで誤検知しないよう、id昇順・キーソート済みで比較するための正規化
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

export const writeCacheIfChanged = (key: CacheKey, nextRows: unknown): boolean => {
  const previous = readCacheSync(key);
  const changed = canonicalizeRows(previous) !== canonicalizeRows(nextRows);
  if (changed) writeCache(key, nextRows);
  return changed;
};
