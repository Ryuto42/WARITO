import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { PRESET_COLORS, defaultTimetableSetting } from './types';
import type { ClassInfo, TimetableTermSetting, TimetableSettingsRecord } from './types';
import TimetableTab from './components/TimetableTab';
import AccountTab from './components/AccountTab';
import Navigation from './components/Navigation';
import { ClassAddModal, ClassDetailModal } from './components/ClassModals';

const App = () => {

  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'timetable' | 'account'>('timetable');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClosingAdd, setIsClosingAdd] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [isClosingDetail, setIsClosingDetail] = useState(false);

  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentSemester, setCurrentSemester] = useState<string>('春学期');

  const [timetableSettings, setTimetableSettings] = useState<TimetableSettingsRecord>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchClasses(session.user.id);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchClasses(session.user.id);
    });

    const saved = localStorage.getItem('waritoSettings');
    if (saved) {
      try {
        setTimetableSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings');
      }
    }
  }, []);

  const updateTimetableSetting = (setting: TimetableTermSetting) => {
    const key = `${currentYear}-${currentSemester}`;
    const newSettings = { ...timetableSettings, [key]: setting };
    setTimetableSettings(newSettings);
    localStorage.setItem('waritoSettings', JSON.stringify(newSettings));
  };

  const currentSetting = timetableSettings[`${currentYear}-${currentSemester}`] || defaultTimetableSetting;

  const fetchClasses = async (userId: string) => {
    const { data, error } = await supabase.from('classes').select('*').eq('user_id', userId);
    if (data) setClasses(data);
    if (error) console.error(error);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.auth.signUp({ email, password });
    alert('登録メールを確認してください');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.auth.signInWithPassword({ email, password });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setClasses([]);
  };

  const timetableData: { [day: string]: { [period: number]: ClassInfo[] } } = {};
  classes.filter(c => c.academic_year === currentYear && c.semester === currentSemester).forEach(c => {
    if (!timetableData[c.day]) timetableData[c.day] = {};
    if (!timetableData[c.day][c.period]) timetableData[c.day][c.period] = [];
    timetableData[c.day][c.period].push(c);
  });

  const handleSaveClass = async (payload: Partial<ClassInfo>) => {
    if (payload.id) {
      const { error } = await supabase.from('classes').update(payload).eq('id', payload.id);
      if (!error) {
        fetchClasses(session.user.id);
        if (selectedClass && selectedClass.id === payload.id) {
          setSelectedClass({ ...selectedClass, ...payload } as ClassInfo);
        }
      } else {
        console.error(error);
        alert('エラーが発生しました');
      }
  } else {
      const classPayload = {
        user_id: session.user.id,
        semester: currentSemester,
        academic_year: currentYear,
        color: PRESET_COLORS[0].id,
        room: '',
        day: 'Mon',
        period: 1,
        ...payload
      };
      const { error } = await supabase.from('classes').insert([classPayload]);
      if (!error) {
        fetchClasses(session.user.id);
        setIsAddModalOpen(false);
      } else {
        console.error(error);
        alert('追加時にエラーが発生しました');
      }
    }
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) {
      fetchClasses(session.user.id);
      setIsClosingDetail(true);
      setTimeout(() => {
        setSelectedClass(null);
        setIsClosingDetail(false);
      }, 200);
    } else {
      console.error(error);
    }
  };

  const closeDetailModalWithAnim = () => {
    setIsClosingDetail(true);
    setTimeout(() => {
      setSelectedClass(null);
      setIsClosingDetail(false);
    }, 200);
  };

  const handleUpdateFacultyColor = async (facultyDept: string, newColor: string) => {
    const { error } = await supabase
      .from('classes')
      .update({ color: newColor })
      .eq('user_id', session.user.id)
      .eq('faculty_dept', facultyDept);

    if (!error) {
      fetchClasses(session.user.id);
    } else {
      console.error(error);
      alert('カラーの更新に失敗しました');
    }
  };

  const closeAddModalWithAnim = () => {
    setIsClosingAdd(true);
    setTimeout(() => {
      setIsAddModalOpen(false);
      setIsClosingAdd(false);
    }, 200);
  };

  if (loading) return null;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#050811] text-gray-200 flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-12 tracking-[0.3em] text-white leading-none drop-shadow-md pb-1">WARITO</h1>
        <div className="bg-[#0f172a] border border-[#1e293b] p-8 rounded-3xl w-full max-w-sm shadow-2xl">
          <form onSubmit={handleSignUp} className="mb-6">
            <h2 className="text-xl font-bold mb-4 text-white text-center">新規登録</h2>
            <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-3 p-3 bg-[#1e293b]/50 border border-[#1e293b] rounded-xl focus:outline-none focus:border-sky-500 text-sm" required />
            <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-4 p-3 bg-[#1e293b]/50 border border-[#1e293b] rounded-xl focus:outline-none focus:border-sky-500 text-sm" required />
            <button type="submit" className="w-full bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold p-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-sky-500/20">アカウント作成</button>
          </form>
          <hr className="border-[#1e293b] mb-6" />
          <form onSubmit={handleSignIn}>
            <h2 className="text-xl font-bold mb-4 text-white text-center">ログイン</h2>
            <button type="submit" className="w-full bg-[#1e293b] hover:bg-[#334155] text-slate-300 font-bold p-3 rounded-xl transition-all active:scale-95 border border-[#1e293b]">既存のアカウントでログイン</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-gray-200 font-sans selection:bg-sky-500/30">
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { display: block; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-overlay { animation: fadeInOverlay 0.2s ease-out forwards; }
        @keyframes fadeOutOverlay { from { opacity: 1; } to { opacity: 0; } }
        .animate-fade-out-overlay { animation: fadeOutOverlay 0.2s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideDown { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(20px) scale(0.95); } }
        .animate-slide-down { animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
      
      <div className="max-w-6xl mx-auto relative relative pb-0">
        <header className="flex justify-center items-center py-4 sm:py-6 px-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-[0.2em] sm:tracking-[0.3em] text-white leading-none drop-shadow-md pt-2">WARITO</h1>
        </header>

        {activeTab === 'timetable' && (
          <TimetableTab 
            currentYear={currentYear}
            currentSemester={currentSemester}
            timetableData={timetableData}
            setting={currentSetting}
            onTermChange={(year, term) => { setCurrentYear(year); setCurrentSemester(term); }}
            onClassClick={setSelectedClass}
          />
        )}

        {activeTab === 'account' && (
          <AccountTab 
            session={session}
            classes={classes}
            currentYear={currentYear}
            currentSemester={currentSemester}
            onSignOut={handleSignOut}
            setting={currentSetting}
            updateSetting={updateTimetableSetting}
            onUpdateFacultyColor={handleUpdateFacultyColor}
          />
        )}

        <ClassAddModal 
          isOpen={isAddModalOpen} 
          isClosing={isClosingAdd}
          onClose={closeAddModalWithAnim}
          onSave={handleSaveClass}
        />

        <ClassDetailModal 
          cls={selectedClass}
          isClosing={isClosingDetail}
          onClose={closeDetailModalWithAnim}
          onSave={handleSaveClass}
          onDelete={handleDeleteClass}
        />

        <Navigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onAddClick={() => setIsAddModalOpen(true)}
        />
      </div>
    </div>
  );
};

export default App;