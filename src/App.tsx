import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { PRESET_COLORS, defaultTimetableSetting } from './types';
import type { ClassInfo, TimetableTermSetting, TimetableSettingsRecord } from './types';
import TimetableTab from './components/TimetableTab';
import AccountTab from './components/AccountTab';
import Navigation from './components/Navigation';
import { ClassAddModal, ClassDetailModal } from './components/ClassModals';
import pako from 'pako';

const App = () => {

  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'timetable' | 'account'>('timetable');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClosingAdd, setIsClosingAdd] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [isClosingDetail, setIsClosingDetail] = useState(false);

  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentSemester, setCurrentSemester] = useState<string>('春学期');

  const [timetableSettings, setTimetableSettings] = useState<TimetableSettingsRecord>({});
  
  const [globalAlert, setGlobalAlert] = useState({ isOpen: false, isClosing: false, msg: '' });
  const [showWelcome, setShowWelcome] = useState(false);
  const [isClosingWelcome, setIsClosingWelcome] = useState(false);
  const [shareImportData, setShareImportData] = useState<any>(null);
  const [isClosingImport, setIsClosingImport] = useState(false);

  const showAppAlert = (msg: string) => setGlobalAlert({ isOpen: true, isClosing: false, msg });
  const closeAppAlert = () => {
    setGlobalAlert(prev => ({ ...prev, isClosing: true }));
    setTimeout(() => setGlobalAlert({ isOpen: false, isClosing: false, msg: '' }), 200);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchClasses(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchClasses(session.user.id);
        if (!localStorage.getItem('waritoWelcomeDone')) {
          setShowWelcome(true);
          localStorage.setItem('waritoWelcomeDone', 'true');
        }
      }
    });

    const saved = localStorage.getItem('waritoSettings');
    if (saved) {
      try {
        setTimetableSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings');
      }
    }

    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (shareParam) {
      try {
        const base64 = shareParam.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const binary = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
        const decompressed = pako.inflate(binary, { to: 'string' });
        const parsed = JSON.parse(decompressed);
        setShareImportData(parsed);
      } catch (e) {
        console.error('Failed to decode share data', e);
      }
    }

    return () => subscription.unsubscribe();
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
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    if (password.length < 6) {
      setAuthError('パスワードは6文字以上で入力してください');
      setAuthLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://warito.pages.dev/',
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setAuthError('このメールアドレスは既に登録されています。ログインしてください。');
        } else if (error.message.includes('valid email')) {
          setAuthError('有効なメールアドレスを入力してください。');
        } else if (error.message.includes('rate limit')) {
          setAuthError('リクエストが多すぎます。しばらく待ってから再試行してください。');
        } else {
          setAuthError(`登録エラー: ${error.message}`);
        }
      } else if (data?.user?.identities?.length === 0) {
        setAuthError('このメールアドレスは既に登録されています。ログインしてください。');
      } else {
        setAuthSuccess('確認メールを送信しました！メールのリンクをクリックして登録を完了してください。');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setAuthError('予期しないエラーが発生しました。もう一度お試しください。');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('メールアドレスまたはパスワードが正しくありません。');
        } else if (error.message.includes('Email not confirmed')) {
          setAuthError('メールアドレスが確認されていません。受信トレイを確認してください。');
        } else {
          setAuthError(`ログインエラー: ${error.message}`);
        }
      }
    } catch (err) {
      setAuthError('予期しないエラーが発生しました。もう一度お試しください。');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setClasses([]);
  };

  const switchAuthMode = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthSuccess('');
  };

  const timetableData: { [day: string]: { [period: number]: ClassInfo[] } } = {};
  classes.filter(c => c.academic_year === currentYear && c.semester === currentSemester).forEach(c => {
    const schedules = c.class_schedules && c.class_schedules.length > 0 
      ? c.class_schedules 
      : [{ day: c.day, period: c.period, room: c.room }];
      
    schedules.forEach(sch => {
      if (!timetableData[sch.day]) timetableData[sch.day] = {};
      if (!timetableData[sch.day][sch.period]) timetableData[sch.day][sch.period] = [];
      timetableData[sch.day][sch.period].push({ ...c, day: sch.day, period: sch.period, room: sch.room || c.room });
    });
  });

  const handleSaveClass = async (payload: Partial<ClassInfo>) => {
    let finalPayload = { ...payload };

    if (!finalPayload.id && finalPayload.name) {
      const { data: existing } = await supabase.from('classes')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .eq('name', finalPayload.name)
        .limit(1);

      if (existing && existing.length > 0) {
        finalPayload.id = existing[0].id;
      }
    }

    if (finalPayload.id) {
      const { id, faculty_dept, ...updateData } = finalPayload;
      const { error } = await supabase.from('classes').update(updateData).eq('id', finalPayload.id);
      if (!error) {
        fetchClasses(session.user.id);
        if (selectedClass && selectedClass.id === finalPayload.id) {
          setSelectedClass({ ...selectedClass, ...finalPayload } as ClassInfo);
        }
        closeAddModalWithAnim();
      } else {
        console.error(error);
        showAppAlert('エラーが発生しました');
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
        ...finalPayload
      };
      const { error } = await supabase.from('classes').insert([classPayload]);
      if (!error) {
        fetchClasses(session.user.id);
        setIsAddModalOpen(false);
      } else {
        console.error(error);
        showAppAlert('追加時にエラーが発生しました');
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
      showAppAlert('カラーの更新に失敗しました');
    }
  };

  const closeAddModalWithAnim = () => {
    setIsClosingAdd(true);
    setTimeout(() => {
      setIsAddModalOpen(false);
      setIsClosingAdd(false);
    }, 200);
  };

  const handleImportShare = async () => {
    if (!shareImportData || !session) return;
    const items = shareImportData.classes || [];
    let imported = 0;
    for (const item of items) {
      const { id, user_id, created_at, ...rest } = item;
      
      const existing = classes.find(c => 
        c.name === rest.name && 
        c.academic_year === rest.academic_year && 
        c.semester === rest.semester
      );

      const classPayload = {
        user_id: session.user.id,
        ...rest,
      };

      if (existing) {
        const { faculty_dept, ...updateData } = classPayload;
        const { error } = await supabase.from('classes').update(updateData).eq('id', existing.id);
        if (!error) imported++;
      } else {
        const { error } = await supabase.from('classes').insert([classPayload]);
        if (!error) imported++;
      }
    }
    fetchClasses(session.user.id);
    if (shareImportData.year) setCurrentYear(shareImportData.year);
    if (shareImportData.semester) setCurrentSemester(shareImportData.semester);
    setIsClosingImport(true);
    setTimeout(() => {
      setShareImportData(null);
      setIsClosingImport(false);
    }, 200);
    showAppAlert(`${imported}件の授業をインポートしました！`);
  };

  const dismissImport = () => {
    setIsClosingImport(true);
    setTimeout(() => {
      setShareImportData(null);
      setIsClosingImport(false);
    }, 200);
  };

  const closeWelcome = () => {
    setIsClosingWelcome(true);
    setTimeout(() => {
      setShowWelcome(false);
      setIsClosingWelcome(false);
    }, 200);
  };

  if (loading) return null;

  if (!session) {
    return (
      <div className="min-h-[100dvh] bg-[#050811] text-gray-200 flex flex-col items-center justify-center p-6 sm:p-8">
        <style>{`
          @keyframes authFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .auth-fade-in { animation: authFadeIn 0.3s ease-out forwards; }
        `}</style>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-2 tracking-[0.3em] pl-[0.3em] text-white leading-none drop-shadow-md pb-1">WARITO</h1>
        <p className="text-slate-400 text-[13px] sm:text-sm mb-10">大学時間割管理アプリ</p>
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div className="flex border-b border-[#1e293b]">
            <button
              type="button"
              onClick={() => switchAuthMode('signin')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                authMode === 'signin'
                  ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-400/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => switchAuthMode('signup')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                authMode === 'signup'
                  ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-400/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              新規登録
            </button>
          </div>

          <div className="p-8 auth-fade-in" key={authMode}>
            {authError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs leading-relaxed auth-fade-in">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                  <span>{authError}</span>
                </div>
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs leading-relaxed auth-fade-in">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  <span>{authSuccess}</span>
                </div>
              </div>
            )}

            <form onSubmit={authMode === 'signup' ? handleSignUp : handleSignIn}>
              <div className="mb-3">
                <label className="block text-xs text-slate-400 mb-1.5 ml-1">メールアドレス</label>
                <input
                  type="email"
                  placeholder="example@university.ac.jp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3.5 bg-[#1e293b]/50 border border-[#1e293b] rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 text-base transition-all placeholder:text-slate-600 appearance-none"
                  required
                  disabled={authLoading}
                />
              </div>
              <div className="mb-1">
                <label className="block text-xs text-slate-400 mb-1.5 ml-1">パスワード</label>
                <input
                  type="password"
                  placeholder={authMode === 'signup' ? '6文字以上で入力' : 'パスワードを入力'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 bg-[#1e293b]/50 border border-[#1e293b] rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 text-base transition-all placeholder:text-slate-600 appearance-none"
                  required
                  disabled={authLoading}
                  minLength={authMode === 'signup' ? 6 : undefined}
                />
              </div>

              <p className={`text-[11px] mb-4 ml-1 ${authMode === 'signup' ? 'text-slate-500' : 'text-transparent select-none'}`}>
                パスワードは6文字以上で設定してください
              </p>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full font-bold p-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white shadow-lg shadow-sky-500/20"
              >
                {authLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    処理中...
                  </span>
                ) : authMode === 'signup' ? 'アカウントを作成' : 'ログイン'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              {authMode === 'signin' ? (
                <>
                  アカウントをお持ちでない方は{' '}
                  <button type="button" onClick={() => switchAuthMode('signup')} className="text-sky-400 hover:text-sky-300 hover:underline transition-colors">
                    新規登録
                  </button>
                </>
              ) : (
                <>
                  既にアカウントをお持ちの方は{' '}
                  <button type="button" onClick={() => switchAuthMode('signin')} className="text-sky-400 hover:text-sky-300 hover:underline transition-colors">
                    ログイン
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        {(shareImportData || isClosingImport) && (
          <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-md ${isClosingImport ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={dismissImport}>
            <div className={`bg-[#0f172a] border border-[#1e293b] rounded-3xl p-8 w-full max-w-md shadow-2xl text-center ${isClosingImport ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
              <div className="text-4xl mb-4">📥</div>
              <h2 className="text-xl font-bold text-white mb-3">時間割のインポート</h2>
              <p className="text-slate-400 text-sm mb-2 font-bold">{shareImportData?.year}年度 {shareImportData?.semester}</p>
              <p className="text-slate-500 text-xs mb-6">{shareImportData?.classes?.length || 0}件の授業データが共有されています。<br/>ログインまたは新規登録するとインポートできます。</p>
              <button onClick={dismissImport} className="w-full py-3 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded-xl font-bold transition-all active:scale-95 border border-[#1e293b]">閉じる</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050811] text-gray-200 font-sans selection:bg-sky-500/30 overflow-x-hidden">
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-[0.2em] sm:tracking-[0.3em] pl-[0.2em] sm:pl-[0.3em] text-white leading-none drop-shadow-md pt-2">WARITO</h1>
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
          classes={classes}
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
        
        {(globalAlert.isOpen || globalAlert.isClosing) && (
          <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm ${globalAlert.isClosing ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={closeAppAlert}>
            <div className={`bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center ${globalAlert.isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
              <div className="text-sky-400 text-3xl mb-4">ℹ️</div>
              <p className="text-white text-sm font-bold mb-6 whitespace-pre-wrap leading-relaxed">{globalAlert.msg}</p>
              <button onClick={closeAppAlert} className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-sky-500/20">OK</button>
            </div>
          </div>
        )}

        {(showWelcome || isClosingWelcome) && (
          <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-md ${isClosingWelcome ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={closeWelcome}>
            <div className={`bg-[#0f172a] border border-[#1e293b] rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-2xl text-center ${isClosingWelcome ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
              <div className="text-5xl mb-4">🎓</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-wider">ようこそ！</h2>
              <p className="text-slate-400 text-sm mb-2 font-bold leading-relaxed">WARITOへのご登録ありがとうございます。</p>
              <p className="text-slate-500 text-xs mb-8 leading-relaxed">シラバスを貼り付けるだけで時間割が完成します。<br/>まずは ＋ ボタンから授業を追加してみましょう！</p>
              <button onClick={closeWelcome} className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-sky-500/20 text-sm tracking-widest">はじめる</button>
            </div>
          </div>
        )}

        {(shareImportData || isClosingImport) && session && (
          <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-md ${isClosingImport ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={dismissImport}>
            <div className={`bg-[#0f172a] border border-[#1e293b] rounded-3xl p-8 w-full max-w-md shadow-2xl text-center ${isClosingImport ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
              <div className="text-4xl mb-4">📥</div>
              <h2 className="text-xl font-bold text-white mb-3">時間割のインポート</h2>
              <p className="text-slate-400 text-sm mb-2 font-bold">{shareImportData?.year}年度 {shareImportData?.semester}</p>
              <p className="text-slate-500 text-xs mb-6">{shareImportData?.classes?.length || 0}件の授業データが共有されています。<br/>インポートしますか？</p>
              <div className="flex gap-3">
                <button onClick={dismissImport} className="w-1/2 py-3 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded-xl font-bold transition-all active:scale-95 border border-[#1e293b]">キャンセル</button>
                <button onClick={handleImportShare} className="w-1/2 py-3 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-sky-500/20">インポート</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;