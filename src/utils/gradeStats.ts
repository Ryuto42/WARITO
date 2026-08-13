import { supabase } from '../supabaseClient';
import type { ClassGradeStat } from '../types';

// 約1,700行あり重いため、セッション中はキャッシュして使い回す（同時呼び出しも1リクエストに束ねる）
const statsCache = new Map<string, Promise<ClassGradeStat[]>>();

export const fetchClassGradeStats = (year?: number): Promise<ClassGradeStat[]> => {
  const key = year ? String(year) : 'all';
  const cached = statsCache.get(key);
  if (cached) return cached;

  const request = fetchClassGradeStatsUncached(year).then((rows) => {
    if (rows.length === 0) statsCache.delete(key); // 失敗時は次回に再試行させる
    return rows;
  }).catch((e) => {
    statsCache.delete(key);
    throw e;
  });

  statsCache.set(key, request);
  return request;
};

export const clearClassGradeStatsCache = () => statsCache.clear();

const fetchClassGradeStatsUncached = async (year?: number): Promise<ClassGradeStat[]> => {
  try {
    const pageSize = 1000;
    let from = 0;
    let allRows: ClassGradeStat[] = [];

    while (true) {
      let query = supabase
        .from('class_grade_stats')
        .select('*')
        .order('year', { ascending: false })
        .range(from, from + pageSize - 1);

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching grade stats:', error);
        return [];
      }

      const rows = data || [];
      allRows = allRows.concat(rows);

      if (rows.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return allRows;
  } catch (e) {
    console.error('Unexpected error fetching grade stats:', e);
    return [];
  }
};
