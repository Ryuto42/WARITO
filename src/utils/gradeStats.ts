import { supabase } from '../supabaseClient';
import type { ClassGradeStat } from '../types';

export const fetchClassGradeStats = async (): Promise<ClassGradeStat[]> => {
  try {
    const { data, error } = await supabase
      .from('class_grade_stats')
      .select('*')
      .order('year', { ascending: false });
    
    if (error) {
      console.error('Error fetching grade stats:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('Unexpected error fetching grade stats:', e);
    return [];
  }
};
