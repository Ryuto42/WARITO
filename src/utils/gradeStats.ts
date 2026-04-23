import { supabase } from '../supabaseClient';
import type { ClassGradeStat } from '../types';

export const fetchClassGradeStats = async (year?: number): Promise<ClassGradeStat[]> => {
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
