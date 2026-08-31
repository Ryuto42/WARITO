// 静的import必須: async関数からCapacitorのプロキシをreturnすると thenable 判定で
// `.then` がネイティブ呼び出しに転送され "Preferences.then() is not implemented" で reject する
import { Preferences } from '@capacitor/preferences';
import { isNative } from './native';

export const CACHE_KEYS = {
  classes: 'waritoClassesCache',
  grades: 'waritoGradesCache',
  settings: 'waritoSettings',
  year: 'waritoCurrentYear',
  semester: 'waritoCurrentSemester',
  presets: 'waritoPresetsCache',
  activePresets: 'waritoActivePresets',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

const memory = new Map<string, string>();

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
    // 旧版は年度・学期を生文字列で保存していた
    return raw as unknown as T;
  }
};

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

// 行順・キー順の違いで差分を誤検知しないための正規化
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
