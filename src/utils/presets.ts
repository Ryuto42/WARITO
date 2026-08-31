import { supabase } from '../supabaseClient';
import { ARCHIVE_DAY } from '../types';
import type { ClassInfo, TimetablePreset, TimetableTermSetting } from '../types';

export const presetsForTerm = (
  presets: TimetablePreset[],
  year: number,
  semester: string
) => presets
  .filter((p) => p.academic_year === year && p.semester === semester)
  .sort((a, b) => a.sort_order - b.sort_order || (a.created_at || '').localeCompare(b.created_at || ''));

export const fetchPresets = async (userId: string): Promise<TimetablePreset[]> => {
  try {
    const { data, error } = await supabase
      .from('timetable_presets')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []) as TimetablePreset[];
  } catch (e) {
    console.error('fetchPresets failed (offline?)', e);
    return [];
  }
};

export const createPreset = async (
  userId: string,
  year: number,
  semester: string,
  name: string,
  sortOrder: number,
  settings?: TimetableTermSetting | null
): Promise<TimetablePreset | null> => {
  const { data, error } = await supabase
    .from('timetable_presets')
    .insert([{
      user_id: userId,
      academic_year: year,
      semester,
      name,
      sort_order: sortOrder,
      settings: settings ?? null,
    }])
    .select()
    .single();
  if (error) {
    console.error(error);
    return null;
  }
  return data as TimetablePreset;
};

const COPYABLE_FIELDS = [
  'name', 'day', 'period', 'room', 'color', 'class_format', 'credits',
  'evaluation', 'schedule', 'faculty_dept', 'instructor', 'semester',
  'academic_year', 'subject_code', 'memo', 'class_schedules',
];

export const copyClassesToPreset = async (
  userId: string,
  sourceClasses: ClassInfo[],
  targetPresetId: string
) => {
  const rows = sourceClasses
    .filter((c) => c.day !== ARCHIVE_DAY)
    .map((c) => {
      const src = c as unknown as Record<string, unknown>;
      const row: Record<string, unknown> = { user_id: userId, preset_id: targetPresetId };
      COPYABLE_FIELDS.forEach((f) => { row[f] = src[f] ?? null; });
      return row;
    });
  if (rows.length === 0) return true;

  const { error } = await supabase.from('classes').insert(rows);
  if (error) {
    console.error(error);
    return false;
  }
  return true;
};

export const updatePresetSettings = async (presetId: string, settings: TimetableTermSetting) => {
  const { error } = await supabase.from('timetable_presets').update({ settings }).eq('id', presetId);
  if (error) console.error(error);
  return !error;
};

export const deletePreset = async (presetId: string) => {
  const { error } = await supabase.from('timetable_presets').delete().eq('id', presetId);
  if (error) console.error(error);
  return !error;
};
