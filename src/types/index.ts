export interface ClassInfo {
  id: string;
  user_id: string;
  name: string;
  day: string;
  period: number;
  room: string;
  color: string;
  created_at?: string;
  updated_at?: string;
  class_format?: string;
  credits?: number;
  evaluation?: string;
  schedule?: string;
  faculty_dept?: string;
  instructor?: string;
  semester?: string;
  academic_year?: number;
  memo?: string;
  class_schedules?: { day: string; period: number; room: string }[];
}

export interface PeriodTime {
  start: string;
  end: string;
}

export interface TimetableTermSetting {
  showSaturday: boolean;
  periodCount: number;
  periodTimes: Record<number, PeriodTime>;
}

export type TimetableSettingsRecord = Record<string, TimetableTermSetting>;

export const PRESET_COLORS = [
  { id: 'bg-[#1e293b] text-slate-200', display: 'bg-slate-600' },
  { id: 'bg-[#450a0a] text-red-200', display: 'bg-red-800' },
  { id: 'bg-[#431407] text-orange-200', display: 'bg-orange-800' },
  { id: 'bg-[#451a03] text-amber-200', display: 'bg-amber-800' },
  { id: 'bg-[#1a2e05] text-lime-200', display: 'bg-lime-800' },
  { id: 'bg-[#022c22] text-emerald-200', display: 'bg-emerald-800' },
  { id: 'bg-[#083344] text-cyan-200', display: 'bg-cyan-800' },
  { id: 'bg-[#0c4a6e] text-sky-200', display: 'bg-sky-800' },
  { id: 'bg-[#172554] text-blue-200', display: 'bg-blue-800' },
  { id: 'bg-[#1e1b4b] text-indigo-200', display: 'bg-indigo-800' },
  { id: 'bg-[#2e1065] text-violet-200', display: 'bg-violet-800' },
  { id: 'bg-[#4a044e] text-fuchsia-200', display: 'bg-fuchsia-800' },
  { id: 'bg-[#4c0519] text-rose-200', display: 'bg-rose-800' },
  { id: 'bg-[#831843] text-pink-200', display: 'bg-pink-800' }
];

export const formatDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const dayMap: Record<string, string> = {
  Mon: '月',
  Tue: '火',
  Wed: '水',
  Thu: '木',
  Fri: '金',
  Sat: '土',
  Sun: '日'
};

export const defaultTimetableSetting: TimetableTermSetting = {
  showSaturday: false,
  periodCount: 6,
  periodTimes: {
    1: { start: '09:00', end: '10:40' },
    2: { start: '10:55', end: '12:35' },
    3: { start: '13:30', end: '15:10' },
    4: { start: '15:25', end: '17:05' },
    5: { start: '17:20', end: '19:00' },
    6: { start: '19:10', end: '20:50' },
    7: { start: '21:00', end: '22:40' },
  }
};
