import React, { useState, useEffect, useMemo } from 'react';
import { dayMap, formatDays, isArchivedClass } from '../types';
import type { ClassInfo, TimetableTermSetting, TimetablePreset } from '../types';
import { usesNativeGlassControls } from '../utils/native';

interface TimetableTabProps {
  currentYear: number;
  currentSemester: string;
  classes: ClassInfo[];
  timetableData: { [day: string]: { [period: number]: ClassInfo[] } };
  setting: TimetableTermSetting;
  onTermChange: (year: number, semester: string) => void;
  onClassClick: (cls: ClassInfo) => void;
  presets: TimetablePreset[];
  activePresetId: string | null;
  onPresetChange: (presetId: string) => void;
  onCreatePreset: (mode: 'empty' | 'duplicate', sourcePresetId?: string) => void;
  onDeletePreset: (presetId: string) => void;
  timetableDataByPreset: Record<string, { [day: string]: { [period: number]: ClassInfo[] } }>;
  settingForPreset: (preset: TimetablePreset | null) => TimetableTermSetting;
  pageIndex: number;
  onPageChange: (index: number) => void;
}

interface TimetableGridProps {
  setting: TimetableTermSetting;
  timetableData: { [day: string]: { [period: number]: ClassInfo[] } };
  currentDayStr: string;
  onClassClick: (cls: ClassInfo) => void;
  onEmptySlotClick: (day: string, period: number) => void;
}

const TimetableGrid: React.FC<TimetableGridProps> = React.memo(({
  setting,
  timetableData,
  currentDayStr,
  onClassClick,
  onEmptySlotClick,
}) => {
  const displayDays = setting.showSaturday ? formatDays : formatDays.slice(0, 5);
  const periods = Array.from({ length: setting.periodCount }, (_, i) => i + 1);
  const minHeightClass =
    setting.periodCount >= 7 ? 'min-h-[70px] sm:min-h-[65px]'
    : setting.periodCount === 6 ? 'min-h-[85px] sm:min-h-[80px]'
    : 'min-h-[105px] sm:min-h-[100px]';

  return (
    <>
        <div className="px-0.5 sm:px-1 mt-3 sm:mt-4">
          <div className="flex gap-0.5 sm:gap-1.5 mb-1 sm:mb-1.5">
            <div className="w-8 sm:w-14 flex-none invisible"></div>
            {displayDays.map((day) => (
              <div 
                key={day} 
                className={`flex-1 rounded-xl text-center py-1.5 sm:py-2.5 text-[9px] sm:text-[11px] font-bold tracking-wider ${day === currentDayStr ? 'bg-sky-400 text-[#0f172a]' : 'bg-[#1e293b] text-slate-300'}`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-0.5 sm:gap-1.5">
            {periods.map(period => (
              <div key={`period-${period}`} className="flex gap-0.5 sm:gap-1.5">
                <div className={`w-8 sm:w-14 flex-none rounded-xl flex flex-col items-center justify-center p-0.5 sm:p-1.5 h-full ${minHeightClass}`}>
                  {setting.periodTimes[period]?.start && (
                    <span className="text-[8px] sm:text-[10px] text-slate-200 font-bold mb-0.5 tracking-tighter">{setting.periodTimes[period].start}</span>
                  )}
                  <span className="text-sky-400 text-xs sm:text-base font-black my-auto">{period}</span>
                  {setting.periodTimes[period]?.end && (
                    <span className="text-[8px] sm:text-[10px] text-slate-200 font-bold mt-0.5 tracking-tighter">{setting.periodTimes[period].end}</span>
                  )}
                </div>

                {displayDays.map(day => {
                  const dayClasses = timetableData[day]?.[period] || [];
                  return (
                    <div 
                      key={`${day}-${period}`} 
                      className={`flex-1 relative bg-[#06090D] rounded-xl ${minHeightClass} transition-colors hover:bg-gray-900/50 cursor-pointer overflow-hidden p-0 shadow-inner opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]`}
                      style={{ animationDelay: `${(period - 1) * 50 + displayDays.indexOf(day) * 30}ms` }}
                      onClick={() => {
                        if (dayClasses.length === 0) {
                          onEmptySlotClick(day, period);
                        }
                      }}
                    >
                      <div className="absolute inset-0 flex flex-col sm:flex-row h-full">
                        {dayClasses.map((cls) => (
                          <div 
                            key={cls.id} 
                            onClick={(e) => { e.stopPropagation(); onClassClick(cls); }} 
                            className={`flex-1 h-full relative p-1 sm:p-2 transition-all duration-200 shadow-md ${cls.color} z-10 flex flex-col justify-center items-center text-center opacity-0 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] class-card`}
                            style={{ 
                              animationDelay: `${(period - 1) * 50 + displayDays.indexOf(day) * 30 + 150}ms`
                            }}
                          >
                            <div className="flex-1 w-full flex items-center justify-center px-1">
                              <div className={`font-bold leading-tight drop-shadow-md ${dayClasses.length > 1 ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-[13px]'}`} style={{ color: '#ffffff' }}>
                                {cls.name}
                              </div>
                            </div>
                            {cls.room && (
                              <div className={`absolute bottom-1 left-1 right-1 flex justify-center pointer-events-none ${dayClasses.length > 1 ? 'hidden sm:flex' : 'flex'}`}>
                                <div className={`${([cls.room, cls.class_format, cls.schedule].some(t => t && (t.includes('オンデマンド') || t.includes('オンデマ') || t.includes('ZOOM')))) ? 'bg-emerald-500/25 border-emerald-400/30' : 'bg-black/40 border-transparent'} px-1.5 sm:px-2 py-0.5 rounded-full inline-block border shadow-sm shrink-0 ${dayClasses.length > 1 ? 'text-[7px] sm:text-[9px]' : 'text-[8px] sm:text-[10px]'} text-slate-200`}>
                                  {cls.room}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
    </>
  );
});
TimetableGrid.displayName = 'TimetableGrid';

const TimetableTab: React.FC<TimetableTabProps> = ({
  currentYear,
  currentSemester,
  classes,
  timetableData,
  setting,
  onTermChange,
  onClassClick,
  presets,
  activePresetId,
  onPresetChange,
  onCreatePreset,
  onDeletePreset,
  timetableDataByPreset,
  settingForPreset,
  pageIndex,
  onPageChange,
}) => {
  const nativeGlassControls = usesNativeGlassControls();
  const displayDays = setting.showSaturday ? formatDays : formatDays.slice(0, 5);
  const periods = Array.from({ length: setting.periodCount }, (_, i) => i + 1);
  const todayIndex = new Date().getDay();
  const currentDayStr = formatDays[todayIndex - 1] || '';

  const carouselRef = React.useRef<HTMLDivElement | null>(null);
  const activeIndex = Math.max(0, presets.findIndex((p) => p.id === activePresetId));
  const pageCount = presets.length + 1;

  const userScrolling = React.useRef(false);
  const scrollIdleTimer = React.useRef<number | null>(null);

  const markUserScroll = () => {
    userScrolling.current = true;
    if (scrollIdleTimer.current) window.clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = window.setTimeout(() => { userScrolling.current = false; }, 180);
  };

  const scrollToIndex = (index: number) => {
    const el = carouselRef.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  };

  // スクロール中に補正すると慣性が途切れるので、止まるまで待つ
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || userScrolling.current) return;
    const target = activeIndex * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 4) el.scrollLeft = target;
  }, [activeIndex, presets.length]);

  useEffect(() => () => {
    if (scrollIdleTimer.current) window.clearTimeout(scrollIdleTimer.current);
  }, []);

  useEffect(() => {
    const onPage = (e: Event) => {
      const i = (e as CustomEvent<number>).detail;
      if (typeof i === 'number') scrollToIndex(i);
    };
    window.addEventListener('waritoNativePresetPage', onPage);
    return () => window.removeEventListener('waritoNativePresetPage', onPage);
  }, [presets.length]);

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth === 0) return;
    markUserScroll();
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== pageIndex) onPageChange(index);
    const preset = presets[index];
    if (preset && preset.id !== activePresetId) onPresetChange(preset.id);
  };

  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isClosingTerm, setIsClosingTerm] = useState(false);
  const [modalYear, setModalYear] = useState(currentYear);
  const [modalSemester, setModalSemester] = useState(currentSemester);
  const [slotPicker, setSlotPicker] = useState<{ day: string; period: number } | null>(null);
  const [isClosingSlotPicker, setIsClosingSlotPicker] = useState(false);

  const SEMESTER_OPTIONS = [
    { label: '1学期 / 前期 / 春学期', value: '春学期' },
    { label: '2学期 / 後期 / 秋学期', value: '秋学期' },
    { label: '3学期', value: '3学期' },
    { label: '4学期', value: '4学期' },
    { label: '通年', value: '通年' },
  ];

  const getSelectedSemesterValue = (sem: string) => {
    if (sem.includes('春') || sem.includes('1') || sem.includes('前')) return '春学期';
    if (sem.includes('秋') || sem.includes('2') || sem.includes('後')) return '秋学期';
    if (sem.includes('3')) return '3学期';
    if (sem.includes('4')) return '4学期';
    if (sem.includes('通年')) return '通年';
    return '春学期';
  };

  const getPeriodMinHeight = () => {
    if (setting.periodCount >= 7) return "min-h-[70px] sm:min-h-[65px]";
    if (setting.periodCount === 6) return "min-h-[85px] sm:min-h-[80px]";
    return "min-h-[105px] sm:min-h-[100px]";
  };
  const minHeightClass = getPeriodMinHeight();

  const handleOpenTermModal = () => {
    setModalYear(currentYear);
    setModalSemester(getSelectedSemesterValue(currentSemester));
    setIsTermModalOpen(true);
  };

  useEffect(() => {
    const handleNativeTerm = () => handleOpenTermModal();
    window.addEventListener('waritoNativeTerm', handleNativeTerm);
    return () => window.removeEventListener('waritoNativeTerm', handleNativeTerm);
  }, [currentYear, currentSemester]);

  const handleCloseTermModal = () => {
    setIsClosingTerm(true);
    setTimeout(() => {
      setIsTermModalOpen(false);
      setIsClosingTerm(false);
    }, 200);
  };

  const handleApplyTerm = () => {
    setIsClosingTerm(true);
    setTimeout(() => {
      onTermChange(modalYear, modalSemester);
      setIsTermModalOpen(false);
      setIsClosingTerm(false);
    }, 200);
  };

  const openSlotPicker = (day: string, period: number) => {
    setSlotPicker({ day, period });
  };

  const closeSlotPicker = () => {
    setIsClosingSlotPicker(true);
    setTimeout(() => {
      setSlotPicker(null);
      setIsClosingSlotPicker(false);
    }, 200);
  };

  const availableClasses = useMemo(() => {
    if (!slotPicker) return [];

    const matched = classes.filter((cls) => {
      if (cls.academic_year !== currentYear || cls.semester !== currentSemester) {
        return false;
      }

      const schedules = cls.class_schedules && cls.class_schedules.length > 0
        ? cls.class_schedules
        : [{ day: cls.day, period: cls.period, room: cls.room }];

      return schedules.some((schedule) => schedule.day === slotPicker.day && schedule.period === slotPicker.period);
    });

    // 同一授業がアーカイブ/各プリセットに重複するため1件に統合する
    const identity = (cls: ClassInfo) =>
      cls.subject_code?.trim() ||
      `${(cls.name || '').replace(/\s+/g, '')}|${(cls.instructor || '').replace(/\s+/g, '')}`;
    const rank = (cls: ClassInfo) => {
      if (activePresetId && cls.preset_id === activePresetId) return 0;
      if (isArchivedClass(cls)) return 1;
      return 2;
    };

    const unified = new Map<string, ClassInfo>();
    for (const cls of matched) {
      const key = identity(cls);
      const current = unified.get(key);
      if (!current || rank(cls) < rank(current)) unified.set(key, cls);
    }

    return [...unified.values()]
      .sort((a, b) => {
      const aCurrent = a.academic_year === currentYear && a.semester === currentSemester;
      const bCurrent = b.academic_year === currentYear && b.semester === currentSemester;
      if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
      if (isArchivedClass(a) !== isArchivedClass(b)) return isArchivedClass(a) ? -1 : 1;
      return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
    });
  }, [activePresetId, classes, currentSemester, currentYear, slotPicker]);

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-fade-in relative z-10 text-gray-200">
      {pageCount > 1 && (
        <div className={`flex justify-center pt-3 ${nativeGlassControls ? 'invisible pointer-events-none' : ''}`}>
          <div className="liquid-glass liquid-glass-control liquid-preset-dots rounded-full px-3.5 py-2 flex items-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => {
              const isAddPage = i === presets.length;
              const active = i === pageIndex;
              return (
                <button
                  key={isAddPage ? 'add' : presets[i].id}
                  onClick={() => scrollToIndex(i)}
                  aria-label={isAddPage ? '時間割を追加' : presets[i].name}
                  className={`h-1.5 rounded-full transition-all ${
                    active ? 'w-5 bg-sky-400' : isAddPage ? 'w-1.5 bg-white/15' : 'w-1.5 bg-white/30'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain scrollbar-none"
      >
        {presets.map((preset) => (
          <div key={preset.id} className="min-w-full shrink-0 snap-center">
            <TimetableGrid
              setting={settingForPreset(preset)}
              timetableData={timetableDataByPreset[preset.id] || {}}
              currentDayStr={currentDayStr}
              onClassClick={onClassClick}
              onEmptySlotClick={openSlotPicker}
            />
          </div>
        ))}

        <div className="min-w-full shrink-0 snap-center px-4 pt-6">
          <div className="rounded-3xl border border-dashed border-white/15 p-6 flex flex-col gap-3">
            <div className="text-sm font-bold text-slate-200">時間割を追加</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              {currentYear}年度 {currentSemester} の中に、別パターンの時間割を作れます。
            </div>
            <button
              onClick={() => onCreatePreset('empty')}
              className="rounded-2xl bg-[#1e293b] px-4 py-3 text-xs font-bold text-slate-100 active:scale-95 transition-transform"
            >
              空の時間割を作る
            </button>
            <button
              onClick={() => onCreatePreset('duplicate', activePresetId || undefined)}
              className="rounded-2xl bg-sky-600 px-4 py-3 text-xs font-bold text-white active:scale-95 transition-transform disabled:opacity-40"
              disabled={!activePresetId}
            >
              いま見ている時間割を複製
            </button>
          </div>

          {presets.length > 1 && (
            <div className="mt-5">
              <div className="text-[11px] font-bold text-slate-400 mb-2 px-1">この学期の時間割</div>
              <div className="rounded-2xl bg-[#111111] divide-y divide-white/5 overflow-hidden">
                {presets.map((preset, i) => (
                  <div key={preset.id} className="flex items-center justify-between px-4 py-3">
                    <button onClick={() => scrollToIndex(i)} className="text-xs font-bold text-slate-100">
                      {preset.name}
                    </button>
                    <button
                      onClick={() => onDeletePreset(preset.id)}
                      className="text-[11px] font-bold text-red-400/80 active:text-red-300"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* env() は非対応環境では0扱いになるため、全プラットフォームで同じ式を使える */}
      <div className={`fixed left-1/2 -translate-x-1/2 z-[50] bottom-[calc(6rem+env(safe-area-inset-bottom))] ${nativeGlassControls ? 'invisible pointer-events-none' : ''}`}>
        <button
          onClick={handleOpenTermModal}
          className="liquid-glass liquid-glass-control liquid-term-button rounded-full px-4 py-2 sm:py-2.5 text-xs font-semibold tracking-normal flex items-center gap-2 touch-manipulation"
        >
          <span>{currentYear}年度</span>
          <span>{currentSemester}</span>
          <svg className="w-3.5 h-3.5 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {(isTermModalOpen || isClosingTerm) && (
        <div className={`fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[100] sm:p-4 backdrop-blur-sm ${isClosingTerm ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={handleCloseTermModal}>
          <div className={`bg-[#0f172a] border-t sm:border border-[#1e293b] rounded-t-[2rem] sm:rounded-3xl p-6 pb-28 sm:p-8 sm:pb-8 w-full max-w-md shadow-2xl ${isClosingTerm ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-6 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/50 rounded-full"></div>
            </div>

            <div className="mb-8 text-center bg-sky-500/10 border border-sky-500/20 py-4 rounded-2xl">
              <div className="text-[10px] text-sky-400 font-bold tracking-widest mb-1 uppercase">Total Credits</div>
              <div className="text-2xl font-black text-white">
                {Array.from(new Set(Object.values(timetableData).flatMap(p => Object.values(p)).flat().map(c => c.id))).reduce((acc, id) => {
                  const cls = Object.values(timetableData).flatMap(p => Object.values(p)).flat().find(c => c.id === id);
                  return acc + (cls?.credits || 0);
                }, 0)}
                <span className="text-xs ml-1 text-slate-400 font-bold">単位</span>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs text-slate-400 mb-2 font-bold ml-1">年度</label>
              <div className="relative">
                <select 
                  value={modalYear}
                  onChange={e => setModalYear(Number(e.target.value))}
                  className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-3.5 text-white font-bold focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
                >
                  {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <option key={y} value={y} className="bg-slate-900">{y}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-3 font-bold ml-1">学期</label>
              <div className="space-y-3 pl-1">
                {SEMESTER_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input 
                        type="radio" 
                        name="semester" 
                        value={option.value}
                        checked={modalSemester === option.value}
                        onChange={() => setModalSemester(option.value)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded-full border-2 border-slate-500 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-colors"></div>
                      <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                    </div>
                    <span className="text-slate-300 text-sm font-medium transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 mb-8 ml-1 leading-relaxed">
              ※ クォーター制の方は、1学期〜4学期の中から該当する学期を選択しましょう<br/>
              （例：第1クォーター → 1学期）
            </div>

            <button 
              onClick={handleApplyTerm}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20 text-sm tracking-widest"
            >
              変更する
            </button>
          </div>
        </div>
      )}

      {(slotPicker || isClosingSlotPicker) && (
        <div
          className={`fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[150] p-0 sm:p-4 backdrop-blur-sm ${isClosingSlotPicker ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`}
          onClick={closeSlotPicker}
        >
          <div
            className={`bg-[#0f172a] border sm:border border-[#1e293b] rounded-3xl w-full max-w-lg shadow-2xl max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] sm:max-h-[85vh] overflow-hidden mb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:mb-0 mx-3 sm:mx-0 ${isClosingSlotPicker ? 'animate-slide-down' : 'animate-slide-up'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-[#1e293b]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mb-2">Class List</div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {slotPicker ? `${dayMap[slotPicker.day] || slotPicker.day}曜日 ${slotPicker.period}限` : ''} の候補
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">登録済み授業の詳細を開けます。</p>
                </div>
                <button onClick={closeSlotPicker} className="text-slate-500 hover:text-white text-xl p-1 transition-colors">✕</button>
              </div>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar max-h-[65vh] space-y-2">
              {availableClasses.map((cls) => {
                const sameTerm = cls.academic_year === currentYear && cls.semester === currentSemester;
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      onClassClick(cls);
                      closeSlotPicker();
                    }}
                    className="w-full text-left rounded-2xl border border-white/5 bg-[#1e293b]/30 p-4 hover:bg-[#1e293b]/50 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-bold text-white break-words">{cls.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          <span>{cls.instructor || '教員不明'}</span>
                          {cls.academic_year && <span>{cls.academic_year}年度</span>}
                          {cls.semester && <span>{cls.semester}</span>}
                          {cls.credits !== undefined && <span>{cls.credits}単位</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isArchivedClass(cls) ? 'text-amber-400' : sameTerm ? 'text-sky-400' : 'text-slate-500'}`}>
                          {isArchivedClass(cls) ? 'Archive' : sameTerm ? 'Current' : 'Saved'}
                        </span>
                        {!!cls.room && <span className="text-[10px] text-slate-500">{cls.room}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
              {availableClasses.length === 0 && (
                <div className="px-4 py-12 text-center text-slate-500 text-sm">登録済みの授業がありません。</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableTab;
