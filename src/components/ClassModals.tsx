import React, { useState, useEffect } from 'react';
import { PRESET_COLORS, dayMap } from '../types';
import type { ClassInfo } from '../types';

const PieChart = ({ items }: { items: { name: string; percent: number }[] }) => {
  let cumulativePercent = 0;
  const pieColors = ['#818cf8', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#a78bfa', '#cbd5e1'];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="w-24 h-24 sm:w-32 sm:h-32">
        {items.map((slice, i) => {
          if (slice.percent === 0) return null;
          if (slice.percent === 100) return <circle key={i} cx="0" cy="0" r="1" fill={pieColors[i % pieColors.length]} />;
          const startX = Math.cos(2 * Math.PI * cumulativePercent);
          const startY = Math.sin(2 * Math.PI * cumulativePercent);
          const endPercent = cumulativePercent + slice.percent / 100;
          const endX = Math.cos(2 * Math.PI * endPercent);
          const endY = Math.sin(2 * Math.PI * endPercent);
          const largeArcFlag = slice.percent > 50 ? 1 : 0;
          const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            'L 0 0',
          ].join(' ');
          cumulativePercent = endPercent;
          return <path key={i} d={pathData} fill={pieColors[i % pieColors.length]} />;
        })}
      </svg>
      <div className="flex-1 grid grid-cols-1 gap-2 w-full">
        {items.map((slice, i) => (
          <div key={i} className="flex items-center text-xs text-slate-300 font-medium tracking-wide">
            <span className="w-3 h-3 rounded-full mr-3 shrink-0 shadow-sm" style={{ backgroundColor: pieColors[i % pieColors.length] }}></span>
            <span>{slice.name} ({slice.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ClassAddModalProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onSave: (payload: Partial<ClassInfo>) => void;
}

export const ClassAddModal: React.FC<ClassAddModalProps> = ({ isOpen, isClosing, onClose, onSave }) => {
  const [syllabusText, setSyllabusText] = useState('');
  const [inputColor, setInputColor] = useState(PRESET_COLORS[0].id);
  const [parsedData, setParsedData] = useState<Partial<ClassInfo>>({});

  const getFacultyColor = (facultyName: string) => {
    if (!facultyName) return PRESET_COLORS[0].id;
    let hash = 0;
    for (let i = 0; i < facultyName.length; i++) {
      hash = facultyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PRESET_COLORS[Math.abs(hash) % PRESET_COLORS.length].id;
  };

  const handleSyllabusParse = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setSyllabusText(text);

    const extract = (pattern: RegExp, group: number = 1): string => {
      const match = text.match(pattern);
      return match ? match[group].trim() : '';
    };

    const parsedName = extract(/科目名／Course title\s+([^／\n]+)/);
    const dayMapRev: { [key: string]: string } = { 月: 'Mon', 火: 'Tue', 水: 'Wed', 木: 'Thu', 金: 'Fri', 土: 'Sat' };
    const rawDay = extract(/曜限／Period\s+([月火水木金土日])/);
    const parsedDay = dayMapRev[rawDay] || 'Mon';
    const periodStr = extract(/曜限／Period\s+[月火水木金土日]／[A-Za-z]+\s*([0-9]+)/);
    const parsedPeriod = periodStr ? parseInt(periodStr, 10) : 1;
    
    let parsedRoom = extract(/教室／Classroom\s+(?:[^:：\n]+[:：])?\s*([^／\n]+)/);
    if (!parsedRoom) parsedRoom = extract(/教室／Classroom\s+([^／\n]+)/);

    const facultyLine = text.match(/開講元学部[^\n]*/)?.[0] || '';
    const facultyRaw = facultyLine.split(/[\t 　]+/)[1]?.split('／')[0]?.trim() || '';

    const deptLine = text.match(/開講元学科[^\n]*/)?.[0] || '';
    const deptRaw = deptLine.split(/[\t 　]+/)[1]?.split('／')[0]?.trim() || '';
    
    const parsedFacultyDept = [facultyRaw, deptRaw].filter(Boolean).join(' ');

    const parsedInstructor = extract(/主担当教員名[^\n]*?／Instructor\s+([^／\n]+)/) || extract(/教員表示名\s+([^／\n]+)/);
    const parsedSemester = extract(/学期／Semester\s+([^／\n]+)/);

    const parsedClassFormat = extract(/授業実施方法[\s\S]*?／Class format\s+([^／\n]+)/);
    const creditsStr = extract(/単位数／Credits\s+([0-9]+)/);
    const parsedCredits = creditsStr ? parseInt(creditsStr, 10) : 0;
    const parsedUpdatedAt = extract(/更新日／Date of renewal\s+([0-9/]+)/);
    
    const evalMatch = text.match(/評価基準・割合[\s\S]*?／Evaluation\s*([\s\S]*?)(?=テキスト|自由記述|参考書|講義スケジュール|$)/);
    const parsedEvaluationRaw = evalMatch ? evalMatch[1] : '';
    
    const parsedEvaluation = parsedEvaluationRaw.split('\n').map(line => {
      const pMatch = line.match(/(\d+(?:\.\d+)?)[％%]/);
      if (pMatch) {
        const name = line.split('／')[0].trim();
        return `${name} (${pMatch[1]}%)`;
      }
      return '';
    }).filter(Boolean).join('\n');

    const parsedScheduleRaw = extract(/授業計画／Class schedule\s*([\s\S]*?)(?=課題等に対するフィードバック方法|備考|$)/);
    const parsedSchedule = parsedScheduleRaw.split('\n').filter(line => line.trim() !== '').join('\n');

    if (parsedFacultyDept) {
      setInputColor(getFacultyColor(parsedFacultyDept));
    }

    setParsedData(prev => ({
      ...prev,
      name: parsedName || prev.name,
      room: parsedRoom || prev.room,
      day: parsedDay || prev.day,
      period: parsedPeriod || prev.period,
      faculty_dept: parsedFacultyDept || prev.faculty_dept,
      instructor: parsedInstructor || prev.instructor,
      semester: parsedSemester || prev.semester,
      class_format: parsedClassFormat || prev.class_format,
      schedule: parsedSchedule || prev.schedule,
      credits: parsedCredits || prev.credits,
      evaluation: parsedEvaluation || prev.evaluation,
      updated_at: parsedUpdatedAt || prev.updated_at,
    }));
  };

  const handleSaveClick = () => {
    if (!parsedData.name) {
      alert("授業名が入力・抽出されていません。");
      return;
    }
    onSave({ ...parsedData, color: inputColor });
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm ${isClosing ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`}>
      <div className={`bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white text-center tracking-wider">授業を追加</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-sky-400 mb-2 font-bold ml-1">シラバスをペーストして自動入力（手動でもOK）</label>
            <textarea 
              value={syllabusText} 
              onChange={handleSyllabusParse} 
              placeholder="ここにシラバスのテキストを貼り付けると自動で抽出されます" 
              className="w-full bg-[#1e293b]/50 border border-[#1e293b] rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-sky-500 h-28 transition-colors custom-scrollbar" 
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-2 font-bold ml-1">授業名 <span className="text-red-400">*</span></label>
              <input 
                type="text" 
                value={parsedData.name || ''} 
                onChange={e => setParsedData({...parsedData, name: e.target.value})}
                className="w-full bg-[#1e293b]/50 border border-[#1e293b] rounded-xl p-3 text-sm text-white font-bold focus:outline-none focus:border-sky-500"
                placeholder="授業名"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-2 font-bold ml-1">教室</label>
              <input 
                type="text" 
                value={parsedData.room || ''} 
                onChange={e => setParsedData({...parsedData, room: e.target.value})}
                className="w-full bg-[#1e293b]/50 border border-[#1e293b] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="教室"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2 ml-1 font-bold">授業の色設定</label>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 grid grid-cols-7">
              {PRESET_COLORS.map(colorObj => (
                <button 
                  key={colorObj.id} 
                  type="button" 
                  onClick={() => setInputColor(colorObj.id)} 
                  className={['w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-transform duration-200 active:scale-90', inputColor === colorObj.id ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-80', colorObj.display].join(' ')} 
                />
              ))}
            </div>
          </div>
          <div className="pt-6 flex justify-between gap-3">
            <button onClick={onClose} className="w-1/2 py-3 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded-xl font-bold transition-all active:scale-95 border border-[#1e293b]">キャンセル</button>
            <button onClick={handleSaveClick} className="w-1/2 py-3 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-sky-500/20">保存する</button>
          </div>
        </div>
      </div>
    </div>
  );
};


interface ClassDetailModalProps {
  cls: ClassInfo | null;
  isClosing: boolean;
  onClose: () => void;
  onSave: (payload: Partial<ClassInfo>) => void;
  onDelete: (id: string) => void;
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ cls, isClosing, onClose, onSave, onDelete }) => {
  const [editMode, setEditMode] = useState(false);
  
  const [inputName, setInputName] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [inputColor, setInputColor] = useState('');
  const [inputFacultyDept, setInputFacultyDept] = useState('');
  const [inputInstructor, setInputInstructor] = useState('');
  const [inputSemester, setInputSemester] = useState('');
  const [inputMemo, setInputMemo] = useState('');
  const [inputClassFormat, setInputClassFormat] = useState('');
  const [inputCredits, setInputCredits] = useState<number>(0);
  const [inputEvaluation, setInputEvaluation] = useState('');
  const [inputSchedule, setInputSchedule] = useState('');

  useEffect(() => {
    if (cls && !editMode) {
      setInputName(cls.name || '');
      setInputRoom(cls.room || '');
      setInputColor(cls.color || PRESET_COLORS[0].id);
      setInputFacultyDept(cls.faculty_dept || '');
      setInputInstructor(cls.instructor || '');
      setInputSemester(cls.semester || '');
      setInputMemo(cls.memo || '');
      setInputClassFormat(cls.class_format || '');
      setInputCredits(cls.credits || 0);
      setInputEvaluation(cls.evaluation || '');
      setInputSchedule(cls.schedule || '');
    }
  }, [cls, editMode]);

  if (!cls) return null;

  const handleSaveClick = () => {
    onSave({
      name: inputName,
      room: inputRoom,
      color: inputColor,
      faculty_dept: inputFacultyDept,
      instructor: inputInstructor,
      semester: inputSemester,
      memo: inputMemo,
      class_format: inputClassFormat,
      credits: inputCredits,
      evaluation: inputEvaluation,
      schedule: inputSchedule,
    });
    setEditMode(false);
  };

  const evaluationItems = cls.evaluation ? cls.evaluation.split('\n').map(line => {
    const match = line.match(/(.*?)\s*\(([\d.]+)%\)/);
    if (match) return { name: match[1].trim(), percent: parseFloat(match[2]) };
    return null;
  }).filter(Boolean) as { name: string; percent: number }[] : [];

  return (
    <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-md ${isClosing ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={onClose}>
      <div className={`bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-5 text-slate-500 hover:text-white text-xl p-1 transition-colors">✕</button>
        
        {!editMode && (
          <div className="absolute top-4 right-14 flex gap-2">
            <button onClick={() => { if(window.confirm('この授業を削除しますか？')) onDelete(cls.id || ''); }} className="text-[10px] sm:text-xs font-medium bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-md text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-all active:scale-95">削除する</button>
            <button onClick={() => setEditMode(true)} className="text-[10px] sm:text-xs font-medium bg-[#1e293b] border border-[#334155] px-3 py-1.5 rounded-md text-slate-300 hover:text-white transition-all active:scale-95">編集する</button>
          </div>
        )}

        <div className="flex flex-col items-center mb-8 mt-6">
          <div className={`inline-block px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold mb-4 ${cls.color} text-white shadow-sm border border-white/10 tracking-widest`}>
            {dayMap[cls.day]}曜日 {cls.period}限
          </div>
          {editMode ? (
            <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} className="w-full max-w-sm bg-[#1e293b] border border-[#334155] rounded-xl p-3 text-white text-center text-xl font-bold focus:outline-none focus:border-sky-500 transition-colors" />
          ) : (
            <h2 className="text-2xl sm:text-3xl font-black text-white text-center leading-tight tracking-wide">{cls.name}</h2>
          )}
        </div>
        
        {editMode ? (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">教室</label>
                <input type="text" value={inputRoom} onChange={e => setInputRoom(e.target.value)} className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">単位数</label>
                <input type="number" value={inputCredits} onChange={e => setInputCredits(Number(e.target.value))} className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">担当教員</label>
                <input type="text" value={inputInstructor} onChange={e => setInputInstructor(e.target.value)} className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">学期</label>
                <input type="text" value={inputSemester} onChange={e => setInputSemester(e.target.value)} className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">開講部署</label>
              <input type="text" value={inputFacultyDept} onChange={e => setInputFacultyDept(e.target.value)} className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">テーマカラー</label>
              <div className="flex flex-wrap gap-3 mt-1 grid grid-cols-7">
                {PRESET_COLORS.map(colorObj => (
                  <button key={colorObj.id} type="button" onClick={() => setInputColor(colorObj.id)} className={['w-8 h-8 rounded-full border-2 transition-transform duration-200 active:scale-90', inputColor === colorObj.id ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-80', colorObj.display].join(' ')} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">メモ</label>
              <textarea value={inputMemo} onChange={e => setInputMemo(e.target.value)} placeholder="授業に関するメモ..." className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-sky-500 min-h-[100px] custom-scrollbar" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">評価基準・割合 （コロンかスペースの跡に「50%」等）</label>
              <textarea value={inputEvaluation} onChange={e => setInputEvaluation(e.target.value)} className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-sky-500 min-h-[120px] custom-scrollbar" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-bold ml-1">授業計画</label>
              <textarea value={inputSchedule} onChange={e => setInputSchedule(e.target.value)} className="w-full bg-[#1e293b]/50 border border-[#334155]/50 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-sky-500 min-h-[150px] custom-scrollbar" />
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button onClick={() => setEditMode(false)} className="px-6 py-2.5 bg-[#1e293b] border border-[#334155] hover:bg-[#334155] text-slate-300 rounded-xl font-bold transition-all active:scale-95">キャンセル</button>
              <button onClick={handleSaveClick} className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-xl font-bold shadow-lg shadow-sky-500/20 transition-all active:scale-95">保存する</button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in pb-4">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: '教室', value: cls.room },
                { label: '単位数', value: cls.credits ? `${cls.credits}単位` : null },
                { label: '担当教員', value: cls.instructor },
                { label: '学期', value: cls.semester },
                { label: '開講元', value: cls.faculty_dept },
                { label: '授業実施方法', value: cls.class_format }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#1e293b]/50 border border-[#1e293b] p-4 rounded-xl flex flex-col justify-center shadow-sm">
                  <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-1 tracking-wider">{item.label}</div>
                  <div className="text-sm sm:text-base font-bold text-white tracking-wide">{item.value || '-'}</div>
                </div>
              ))}
            </div>

            {cls.memo && (
              <div className="bg-[#1e293b]/50 p-5 rounded-xl border border-[#1e293b] mb-4 shadow-sm">
                <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-3 tracking-wider">メモ</div>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{cls.memo}</pre>
              </div>
            )}

            {evaluationItems.length > 0 && (
              <div className="bg-[#1e293b]/50 p-5 rounded-xl border border-[#1e293b] mb-4 shadow-sm">
                <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-3 tracking-wider">評価基準・割合</div>
                <PieChart items={evaluationItems} />
              </div>
            )}

            {cls.schedule && (
              <div className="bg-[#1e293b]/50 p-5 rounded-xl border border-[#1e293b] mb-4 shadow-sm">
                <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-3 tracking-wider">授業計画</div>
                <pre className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{cls.schedule}</pre>
              </div>
            )}

            {cls.updated_at && (
              <div className="mt-8 text-right text-[10px] text-slate-600 font-medium tracking-wider">
                更新日: {cls.updated_at}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
