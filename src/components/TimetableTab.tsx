import React, { useState } from 'react';
import { formatDays } from '../types';
import type { ClassInfo, TimetableTermSetting } from '../types';

interface TimetableTabProps {
  currentYear: number;
  currentSemester: string;
  timetableData: { [day: string]: { [period: number]: ClassInfo[] } };
  setting: TimetableTermSetting;
  onTermChange: (year: number, semester: string) => void;
  onClassClick: (cls: ClassInfo) => void;
}

const TimetableTab: React.FC<TimetableTabProps> = ({
  currentYear,
  currentSemester,
  timetableData,
  setting,
  onTermChange,
  onClassClick
}) => {
  const displayDays = setting.showSaturday ? formatDays : formatDays.slice(0, 5);
  const periods = Array.from({ length: setting.periodCount }, (_, i) => i + 1);
  const todayIndex = new Date().getDay();
  const currentDayStr = formatDays[todayIndex - 1] || '';

  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isClosingTerm, setIsClosingTerm] = useState(false);
  const [modalYear, setModalYear] = useState(currentYear);
  const [modalSemester, setModalSemester] = useState(currentSemester);

  const SEMESTER_OPTIONS = [
    { label: '1学期 / 前期 / 春学期', value: '春学期' },
    { label: '2学期 / 後期 / 秋学期', value: '秋学期' },
    { label: '3学期', value: '3学期' },
    { label: '4学期', value: '4学期' },
    { label: '通年', value: '通年' },
  ];

  // これまでの学期の値から適切に選択肢にマッピングするヘルパー
  const getSelectedSemesterValue = (sem: string) => {
    if (sem.includes('春') || sem.includes('1') || sem.includes('前')) return '春学期';
    if (sem.includes('秋') || sem.includes('2') || sem.includes('後')) return '秋学期';
    if (sem.includes('3')) return '3学期';
    if (sem.includes('4')) return '4学期';
    if (sem.includes('通年')) return '通年';
    return '春学期';
  };

  const handleOpenTermModal = () => {
    setModalYear(currentYear);
    setModalSemester(getSelectedSemesterValue(currentSemester));
    setIsTermModalOpen(true);
  };

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

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-fade-in relative z-10 text-gray-200">
      <div className="px-1 sm:px-2 mt-4 sm:mt-6">
        <div className="flex gap-1 sm:gap-2 mb-1.5 sm:mb-2">
          <div className="w-8 sm:w-14 flex-none invisible"></div>
          {displayDays.map((day) => (
            <div 
              key={day} 
              className={`flex-1 rounded-xl text-center py-2 sm:py-3 text-[10px] sm:text-xs font-bold tracking-wider ${day === currentDayStr ? 'bg-sky-400 text-[#0f172a]' : 'bg-[#1e293b] text-slate-300'}`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 sm:gap-2">
          {periods.map(period => (
            <div key={`period-${period}`} className="flex gap-1 sm:gap-2">
              <div className="w-8 sm:w-14 flex-none rounded-xl flex flex-col items-center justify-center p-0.5 sm:p-2 sticky left-0 z-10 h-full min-h-[90px] sm:min-h-[120px]">
                {setting.periodTimes[period]?.start && (
                  <span className="text-[7px] sm:text-[9px] text-slate-600 font-bold mb-1 opacity-70 tracking-tighter">{setting.periodTimes[period].start}</span>
                )}
                <span className="text-slate-500 text-xs sm:text-sm font-bold my-auto">{period}</span>
                {setting.periodTimes[period]?.end && (
                  <span className="text-[7px] sm:text-[9px] text-slate-600 font-bold mt-1 opacity-70 tracking-tighter">{setting.periodTimes[period].end}</span>
                )}
              </div>

              {displayDays.map(day => {
                const dayClasses = timetableData[day]?.[period] || [];
                return (
                  <div 
                    key={`${day}-${period}`} 
                    className={`flex-1 relative bg-[#06090D] border border-gray-900/40 rounded-xl min-h-[90px] sm:min-h-[120px] transition-colors hover:bg-gray-900/50 cursor-pointer overflow-hidden p-1 shadow-inner opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]`}
                    style={{ animationDelay: `${(period - 1) * 50 + displayDays.indexOf(day) * 30}ms` }}
                    onClick={() => {}}
                  >
                    {dayClasses.map((cls, idx) => (
                      <div 
                        key={cls.id} 
                        onClick={(e) => { e.stopPropagation(); onClassClick(cls); }} 
                        className={`absolute inset-0 p-1 sm:p-3 rounded-xl transition-all duration-200 shadow-md ${cls.color} ${idx > 0 ? 'mt-2 ml-2 shadow-xl z-20 border border-white/10' : 'z-10'} flex flex-col justify-center items-center text-center opacity-0 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]`}
                        style={{ 
                          animationDelay: `${(period - 1) * 50 + displayDays.indexOf(day) * 30 + 150}ms`,
                          ...(idx > 0 ? { top: `${idx * 16}px`, left: `${idx * 8}px` } : {})
                        }}
                      >
                      <div className="w-full flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                        <div className="text-[9px] sm:text-xs font-bold leading-tight drop-shadow-md">
                          {cls.name}
                        </div>
                        {cls.room && (
                          <div className="text-[7px] sm:text-[9px] bg-black/40 text-white/90 px-1.5 sm:px-2 py-0.5 rounded-full inline-block border border-white/10 shadow-sm shrink-0">
                            {cls.room}
                          </div>
                        )}
                      </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40">
        <button 
          onClick={handleOpenTermModal}
          className="bg-[#111111]/80 backdrop-blur-md border border-gray-800 rounded-full px-6 py-3 shadow-2xl text-gray-200 text-xs sm:text-sm font-bold tracking-widest hover:bg-[#222222]/90 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>{currentYear}年度</span>
          <span className="text-sky-400 mx-1">|</span>
          <span>{currentSemester}</span>
          <svg className="w-3.5 h-3.5 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {(isTermModalOpen || isClosingTerm) && (
        <div className={`fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[70] sm:p-4 backdrop-blur-sm ${isClosingTerm ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={handleCloseTermModal}>
          <div className={`bg-[#0f172a] border-t sm:border border-[#1e293b] rounded-t-[2rem] sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl ${isClosingTerm ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-6 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-700/50 rounded-full"></div>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs text-slate-400 mb-2 font-bold ml-1">年度</label>
              <div className="relative">
                <select 
                  value={modalYear}
                  onChange={e => setModalYear(Number(e.target.value))}
                  className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-3.5 text-white font-bold focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
                >
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].sort().map(y => (
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
                    <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">
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
    </div>
  );
};

export default TimetableTab;

