import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { dayMap, PRESET_COLORS } from '../types';
import type { ClassInfo, TimetableTermSetting } from '../types';
import pako from 'pako';


interface AccountTabProps {
  session: any;
  classes: ClassInfo[];
  currentYear: number;
  currentSemester: string;
  onSignOut: () => void;
  setting: TimetableTermSetting;
  updateSetting: (setting: TimetableTermSetting) => void;
  onUpdateFacultyColor: (facultyDept: string, newColor: string) => Promise<void>;
}

const AccountTab: React.FC<AccountTabProps> = ({
  session,
  classes,
  currentYear,
  currentSemester,
  onSignOut,
  setting,
  updateSetting,
  onUpdateFacultyColor
}) => {
  const [showClassList, setShowClassList] = useState(false);
  const [confirmDeleteState, setConfirmDeleteState] = useState({ isOpen: false, isClosing: false });
  const [timeSettingsExpanded, setTimeSettingsExpanded] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  const openConfirmDelete = () => setConfirmDeleteState({ isOpen: true, isClosing: false });
  const closeConfirmDelete = () => {
    setConfirmDeleteState(prev => ({ ...prev, isClosing: true }));
    setTimeout(() => setConfirmDeleteState({ isOpen: false, isClosing: false }), 200);
  };
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('waritoTheme') !== 'light';
  });

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem('waritoTheme', nextDark ? 'dark' : 'light');
    
    document.documentElement.classList.add('theme-transition');
    if (nextDark) {
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
    }
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500);
  };
  
  const handleTimeChange = (period: number, type: 'start' | 'end', val: string) => {
    const updated = { ...setting };
    if (!updated.periodTimes[period]) {
      updated.periodTimes[period] = { start: '', end: '' };
    }
    updated.periodTimes[period][type] = val;
    updateSetting(updated);
  };

  const handlePeriodCountChange = (count: number) => {
    updateSetting({ ...setting, periodCount: count });
  };

  const executeDeleteUser = async () => {
    closeConfirmDelete();
    await supabase.from('classes').delete().eq('user_id', session.user.id);
    const { error } = await supabase.rpc('delete_user');
    if (!error) { 
      onSignOut(); 
    } else { 
      alert('エラーが発生しました: ' + error.message); 
    }
  };

  const periodOptions = [1, 2, 3, 4, 5, 6, 7];

  const facultyColors: Record<string, string> = {};
  classes.forEach(c => {
    if (c.faculty_dept) facultyColors[c.faculty_dept] = c.color;
  });
  const uniqueFaculties = Object.keys(facultyColors).sort();

  return (
    <>
    {(confirmDeleteState.isOpen || confirmDeleteState.isClosing) && (
      <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm ${confirmDeleteState.isClosing ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={closeConfirmDelete}>
        <div className={`bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center scale-100 ${confirmDeleteState.isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
          <div className="text-red-500 text-3xl mb-4">⚠️</div>
          <p className="text-white text-sm font-bold mb-2">アカウントを削除しますか？</p>
          <p className="text-slate-400 text-xs mb-6 font-bold leading-relaxed">登録した時間割データもすべて削除され、復元はできません。</p>
          <div className="flex gap-3">
            <button onClick={closeConfirmDelete} className="w-1/2 py-3 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded-xl font-bold transition-all active:scale-95">キャンセル</button>
            <button onClick={executeDeleteUser} className="w-1/2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded-xl font-bold transition-all active:scale-95">削除する</button>
          </div>
        </div>
      </div>
    )}

    <div className="max-w-3xl mx-auto animate-fade-in pb-32 pt-8 px-4 relative">
      <button 
        onClick={toggleTheme}
        className="absolute top-0 right-4 p-3 bg-[#111111] border border-gray-800 rounded-full shadow-lg text-xl hover:scale-110 active:scale-95 transition-all z-10"
      >
        {isDarkMode ? '🌙' : '☀️'}
      </button>

      <div className="bg-[#111111] border border-gray-800 rounded-3xl p-8 mb-8 shadow-2xl text-center">
        <div className="w-20 h-20 bg-gray-900 border border-gray-800 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner">
          👤
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">{session?.user?.email}</h2>
        <p className="text-xs text-gray-500 mb-8">WARITO アカウント</p>
        
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <button onClick={onSignOut} className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-700 text-gray-300 hover:text-white font-bold p-3 rounded-xl transition-all">
            ログアウト
          </button>
          <button 
            onClick={openConfirmDelete} 
            className="w-full bg-red-950/20 shadow-md border border-red-900/40 text-red-500 hover:text-red-400 font-bold p-3 rounded-xl transition-all"
          >
            アカウントを削除する
          </button>
        </div>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 mb-8 text-left shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">
          🔗 時間割を共有する
        </h3>
        <p className="text-xs text-gray-400 mb-4 font-bold leading-relaxed">
          現在の学期（{currentYear}年 {currentSemester}）の時間割をURLで共有できます。受け取った人はURLを開くだけで自動インポートできます。
        </p>
        <button
          onClick={() => {
            const termClasses = classes.filter(c => c.academic_year === currentYear && c.semester === currentSemester);
            if (termClasses.length === 0) { setShareUrl(''); return; }
            const shareData = JSON.stringify({ year: currentYear, semester: currentSemester, classes: termClasses });
            const compressed = pako.deflate(shareData);
            const base64 = btoa(String.fromCharCode(...compressed))
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const url = `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(base64)}`;
            setShareUrl(url);
            navigator.clipboard.writeText(url).catch(() => {});
          }}
          className="w-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:text-sky-300 font-bold p-3 rounded-xl transition-all active:scale-95 text-sm tracking-wider"
        >
          📲 共有URLを生成する
        </button>
        {shareUrl && (
          <div className="mt-3">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 break-all select-all font-mono">
              {shareUrl}
            </div>
            <p className="text-[10px] text-emerald-400 mt-2 font-bold">✓ クリップボードにコピーしました</p>
          </div>
        )}
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 mb-8 text-left shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">
          {currentYear}年 {currentSemester} の時間割設定
        </h3>

        <div className="flex items-center justify-between py-4 border-b border-gray-800">
          <div>
            <div className="text-sm font-bold text-gray-200">土曜日の表示</div>
            <div className="text-[10px] text-gray-500">週に土曜日を含めるか</div>
          </div>
          <button 
            onClick={() => updateSetting({ ...setting, showSaturday: !setting.showSaturday })}
            className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors duration-300 ${setting.showSaturday ? 'bg-sky-500' : 'bg-gray-800'}`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${setting.showSaturday ? 'translate-x-6' : 'translate-x-0'}`}></div>
          </button>
        </div>

        <div className="py-4 border-b border-gray-800">
          <div className="text-sm font-bold text-gray-200 mb-3">1日の授業コマ数 (時限数)</div>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map(num => (
              <button 
                key={num}
                onClick={() => handlePeriodCountChange(num)}
                className={`w-10 h-10 rounded-xl font-bold transition-all ${setting.periodCount === num ? 'bg-sky-500 text-gray-900 shadow-md scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="py-2">
          <button 
            onClick={() => setTimeSettingsExpanded(!timeSettingsExpanded)} 
            className="w-full flex items-center justify-between text-sm font-bold text-gray-200 py-2 hover:text-white transition-colors"
          >
            <span>各時限の時間設定</span>
            <span className="text-gray-500">{timeSettingsExpanded ? '▲' : '▼'}</span>
          </button>
          
          <div className={`transition-all duration-300 overflow-hidden ${timeSettingsExpanded ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-3 pb-2">
              {Array.from({ length: setting.periodCount }, (_, i) => i + 1).map(period => (
                <div key={period} className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                  <div className="w-8 h-8 flex-none bg-gray-800 rounded-full flex justify-center items-center text-gray-300 font-bold text-sm">
                    {period}
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <input 
                      type="time" 
                      value={setting.periodTimes[period]?.start || ''} 
                      onChange={(e) => handleTimeChange(period, 'start', e.target.value)}
                      className="w-full bg-[#1A1A1A] text-gray-200 text-xs sm:text-sm p-2 rounded-md border border-gray-700 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-gray-500 font-bold">-</span>
                    <input 
                      type="time" 
                      value={setting.periodTimes[period]?.end || ''} 
                      onChange={(e) => handleTimeChange(period, 'end', e.target.value)}
                      className="w-full bg-[#1A1A1A] text-gray-200 text-xs sm:text-sm p-2 rounded-md border border-gray-700 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {uniqueFaculties.length > 0 && (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 mb-8 text-left shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">
            開講元カラーの自動設定
          </h3>
          <p className="text-xs text-gray-400 mb-6 font-bold leading-relaxed">
            同じ開講元の授業は自動的に同じシステムカラーになります。ここから開講元ごとに授業カラーを一括変更できます。
          </p>
          <div className="space-y-6">
            {uniqueFaculties.map(faculty => (
              <div key={faculty} className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm font-bold text-gray-200">{faculty}</div>
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 custom-scrollbar pt-2 px-1">
                  {PRESET_COLORS.map(colorObj => (
                    <button
                      key={colorObj.id}
                      onClick={() => {
                        if (facultyColors[faculty] !== colorObj.id) {
                          onUpdateFacultyColor(faculty, colorObj.id);
                        }
                      }}
                      className={`shrink-0 w-8 h-8 rounded-full border-2 transition-transform duration-200 active:scale-90 ${facultyColors[faculty] === colorObj.id ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-80'} ${colorObj.display}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden p-4 shadow-xl">
        <button onClick={() => setShowClassList(!showClassList)} className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors p-2 font-bold tracking-wide">
          <span>📝 登録済みのすべての授業一覧 ({classes.length}件)</span>
          <span>{showClassList ? '▲' : '▼'}</span>
        </button>
        
        {showClassList && (
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {classes.map(cls => (
              <div key={cls.id} className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex justify-between items-center transition-colors hover:bg-gray-800/50 cursor-default">
                <div>
                  <div className="text-sm font-bold text-white/90">{cls.name}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{cls.academic_year} {cls.semester} | {dayMap[cls.day]}曜日 {cls.period}限</div>
                </div>
                {cls.room && (
                  <div className="text-[10px] text-gray-400 bg-gray-950 border border-gray-800 px-2 py-1 rounded ml-2 text-right whitespace-nowrap">
                    {cls.room}
                  </div>
                )}
              </div>
            ))}
            {classes.length === 0 && <div className="text-xs text-gray-600 text-center py-4 font-medium">登録されている授業はありません</div>}
          </div>
        )}
      </div>

    </div>
    </>
  );
};

export default AccountTab;
