import React, { useState, useMemo } from 'react';
import { isArchivedClass } from '../types';
import type { ClassInfo } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  classes: ClassInfo[];
  onClassClick: (cls: ClassInfo) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ 
  isOpen, 
  isClosing, 
  onClose, 
  classes,
  onClassClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];

    const results: Array<ClassInfo & { type: 'class'; searchKey: string }> = [];

    classes.forEach(c => {
      const searchable = [
        c.name,
        c.instructor,
        c.subject_code,
        c.faculty_dept,
        c.semester,
        c.room,
        c.memo,
        c.class_format,
        c.academic_year ? `${c.academic_year}` : '',
        c.credits !== undefined ? `${c.credits}` : '',
        ...(c.class_schedules?.map((schedule) => `${schedule.day} ${schedule.period} ${schedule.room || ''}`) || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchable.includes(query)) {
        results.push({ ...c, type: 'class', searchKey: `class-${c.id}` });
      }
    });

    return results
      .sort((a, b) => {
        if (isArchivedClass(a) !== isArchivedClass(b)) {
          return isArchivedClass(a) ? -1 : 1;
        }
        return (b.created_at || '').localeCompare(a.created_at || '');
      })
      .slice(0, 50);
  }, [searchQuery, classes]);

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`fixed inset-0 bg-black/70 flex items-start justify-center z-[2000] p-4 pt-16 sm:pt-24 backdrop-blur-md ${isClosing ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={onClose}>
      <div className={`bg-[#0f172a] border border-[#1e293b] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b border-[#1e293b] shrink-0">
          <div className="relative">
            <input 
              autoFocus
              type="text" 
              placeholder="授業名、教員名、授業コードで検索..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all font-bold"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
          {!searchQuery.trim() && resultsTitle('最近の登録授業', resultsByDate(classes))}

          {filteredResults.length > 0 ? (
            <div className="space-y-2">
              {filteredResults.map(res => (
                <button 
                  key={res.searchKey}
                  onClick={() => {
                    onClassClick(res);
                    onClose();
                  }}
                  className="w-full text-left p-4 rounded-2xl bg-[#1e293b]/30 border border-white/5 hover:bg-[#1e293b]/50 hover:border-white/10 transition-all group flex items-center gap-4"
                >
                  <div className="p-2.5 rounded-xl shrink-0 bg-sky-500/10 text-sky-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white truncate group-hover:text-sky-400 transition-colors">{res.name}</span>
                      <span className={`text-[10px] shrink-0 font-bold uppercase tracking-widest ${isArchivedClass(res) ? 'text-amber-400' : 'text-slate-500'}`}>
                        {isArchivedClass(res) ? 'Archive' : 'Timetable'}
                      </span>
                    </div>
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-slate-400 font-medium">
                      <span>{res.instructor || '教員不明'}</span>
                      {res.academic_year && <span>{res.academic_year}年度</span>}
                      {res.semester && <span>{res.semester}</span>}
                      {res.subject_code && <span className="text-slate-500 text-[10px] font-mono">{res.subject_code}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            searchQuery.trim() !== '' && (
              <div className="py-20 text-center">
                <div className="text-slate-500 text-sm font-bold mb-2">見つかりませんでした</div>
                <div className="text-slate-600 text-xs">キーワードを変えてみてください</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

function resultsTitle(title: string, content: React.ReactNode) {
    return (
        <div className="mb-6">
            <h3 className="px-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{title}</h3>
            {content}
        </div>
    );
}

function resultsByDate(classes: ClassInfo[]) {
    return (
        <div className="space-y-2">
            {[...classes].reverse().slice(0, 5).map(c => (
                <div key={c.id} className="text-xs text-slate-400 px-2 py-1 flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-slate-600">{c.academic_year}年度</span>
                </div>
            ))}
        </div>
    );
}

export default SearchModal;
