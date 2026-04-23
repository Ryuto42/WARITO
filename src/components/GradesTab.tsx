import React, { useMemo, useState, useEffect } from 'react';
import type { GradeInfo, ClassGradeStat } from '../types';
import { fetchClassGradeStats } from '../utils/gradeStats';
import { getGradeStatMatchScore } from '../utils/gradeStatMatching';

interface GradesTabProps {
  grades: GradeInfo[];
}

const gradeToGpaMap: Record<string, number> = {
  'S': 4.0,
  'A': 3.0,
  'B': 2.0,
  'C': 1.0,
  'W': 0.0,
  'D': 0.0,
  'F': 0.0,
  '履修中': 0.0,
};

const calcGpa = (grades: GradeInfo[]) => {
  let totalCredits = 0;
  let totalGradePoints = 0;
  
  grades.forEach(g => {
    if (g.grade && g.credits && (g.pass_status === '合' || g.pass_status === '否')) {
      if (gradeToGpaMap[g.grade as string] !== undefined && g.grade !== 'W' && g.grade !== '履修中' && g.grade !== 'P' && g.grade !== 'F') {
        let gp = gradeToGpaMap[g.grade as string] || 0;
        if (g.grade === 'A') gp = 4.0;
        if (g.grade === 'B') gp = 3.0;
        if (g.grade === 'C') gp = 2.0;
        if (g.grade === 'D') gp = 1.0;
        
        if (g.pass_status === '合' || g.pass_status === '否') {
            totalCredits += g.credits;
            totalGradePoints += gp * g.credits;
        }
      }
    }
  });

  return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
}

const getSemesterRank = (sem: string | undefined): number => {
  if (!sem) return 99;
  if (sem.includes('春')) return 1;
  if (sem.includes('秋')) return 2;
  return 3;
};

const GradeBadge = ({ grade }: { grade: string | undefined }) => {
  if (!grade) return <span className="text-slate-500">-</span>;
  
  let styles = "text-slate-400";
  if (grade === 'S' || grade === 'A') {
    styles = "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]";
  } else if (grade === 'B') {
    styles = "text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]";
  } else if (grade === 'C') {
    styles = "text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]";
  } else if (grade === 'D' || grade === 'F' || grade === '否') {
    styles = "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]";
  }

  return (
    <div className={`text-sm sm:text-base font-black inline-flex items-center justify-center ${styles}`}>
      {grade}
    </div>
  );
};

const GpaChart = ({ activeGrades }: { activeGrades: GradeInfo[] }) => {
  const timeline = useMemo(() => {
    const groups: Record<string, GradeInfo[]> = {};
    activeGrades.forEach(g => {
        if (!g.year || !g.semester) return;
        const key = `${g.year} ${g.semester}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(g);
    });

    const timelineData = Object.keys(groups).map(key => {
        const grades = groups[key];
        const year = grades[0].year || 0;
        const semester = grades[0].semester || '';
        const rawGpa = calcGpa(grades);
        const gpa = parseFloat(rawGpa);
        return { label: key.replace('学期', ''), year, semester, gpa, isEmpty: rawGpa === '0.00' && grades.length === 0 };
    }).filter(t => !t.isEmpty);

    timelineData.sort((a, b) => {
        const yearDiff = a.year - b.year;
        if (yearDiff !== 0) return yearDiff;
        return getSemesterRank(a.semester) - getSemesterRank(b.semester);
    });

    return timelineData;
  }, [activeGrades]);

  if (timeline.length < 2) return null;

  const width = Math.max(600, timeline.length * 150);
  const height = 180;
  const padding = 40;
  
  const validGpas = timeline.map(t => t.gpa);
  const minGpa = Math.max(0, Math.min(...validGpas) - 0.5);
  const maxGpa = Math.min(4.0, Math.max(...validGpas) + 0.5);
  const gpaRange = Math.max(0.1, maxGpa - minGpa);

  const points = timeline.map((t, i) => {
    const x = padding + (i / (timeline.length - 1)) * (width - padding * 2);
    const y = height - padding - ((t.gpa - minGpa) / gpaRange) * (height - padding * 2.5);
    return { x, y, ...t };
  });

  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div className="w-full overflow-x-auto custom-scrollbar relative">
      <div className="w-full relative" style={{ minWidth: `${width}px`, height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full overflow-visible">
          <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" className="drop-shadow-md" />
              <text x={p.x} y={p.y - 15} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" className="shadow-black drop-shadow-md">{p.gpa.toFixed(2)}</text>
              <text x={p.x} y={height - 10} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const ExpandedGradeStat = ({ grade }: { grade: GradeInfo }) => {
  const [stats, setStats] = useState<ClassGradeStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const allStats = await fetchClassGradeStats(grade.year);
        const gradeYear = grade.year;

        const matched = allStats
          .map((s) => ({ stat: s, score: getGradeStatMatchScore(grade, s) }))
          .filter(({ stat, score }) => {
            if (gradeYear && stat.year !== gradeYear) {
              return false;
            }
            return score > 0;
          })
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.stat.year !== a.stat.year) return b.stat.year - a.stat.year;
            return getSemesterRank(a.stat.semester) - getSemesterRank(b.stat.semester);
          })
          .map(({ stat }) => stat);

        setStats(matched);
      } catch(e) {}
      setLoading(false);
    };
    fetchStats();
  }, [grade]);

  if (loading) {
    return <div className="p-4 text-center text-xs text-slate-400 animate-pulse">読み込み中...</div>;
  }
  if (!stats || stats.length === 0) {
    return <div className="p-4 text-center text-xs text-slate-400">過去のデータがありません</div>;
  }

  const stat = stats[0];
  const gradeItems = [
    { name: 'A', value: stat.a_percent || 0, color: 'bg-emerald-500' },
    { name: 'B', value: stat.b_percent || 0, color: 'bg-sky-500' },
    { name: 'C', value: stat.c_percent || 0, color: 'bg-yellow-500' },
    { name: 'D', value: stat.d_percent || 0, color: 'bg-orange-500' },
    { name: 'F', value: stat.f_percent || 0, color: 'bg-red-500' },
    { name: '他', value: stat.other_percent || 0, color: 'bg-slate-500' }
  ].filter(i => i.value > 0);

  return (
    <div className="p-5 bg-black/20 shadow-inner">
      <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 font-bold mb-3 tracking-wider">
        <span>過去の成績分布 ({stat.year}年度 {stat.semester})</span>
        <span className="text-sky-400 font-bold">受講者数: {stat.student_count}人</span>
      </div>
      <div className="flex items-end gap-2 mb-4">
        <span className="text-2xl font-black text-white">{stat.gpa}</span>
        <span className="text-[10px] text-slate-400 font-bold pb-1 mb-0.5">平均GPA</span>
      </div>
      <div className="h-3 w-full max-w-lg flex rounded-full overflow-hidden mb-3 shadow-inner bg-slate-800">
         {gradeItems.map((item, idx) => (
            <div key={idx} style={{ width: `${item.value}%` }} className={`${item.color} h-full transition-all border-r border-slate-900/40 last:border-0`} />
         ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] sm:text-xs">
         {gradeItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-slate-300 font-bold tracking-wider">
               <span className={`w-2 h-2 rounded-full shadow-sm ${item.color}`}></span>
               {item.name} <span className="text-slate-400 font-medium">{item.value}%</span>
            </div>
         ))}
      </div>
    </div>
  );
};

const GradeTable = ({ grades, showEmptyState = true }: { grades: GradeInfo[], showEmptyState?: boolean }) => {
  const [expandedId, setExpandedId] = useState<string|null>(null);

  return (
    <>
      <div className="sm:hidden space-y-3 p-3">
        {grades.map((g) => (
          <div key={g.id} className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f172a]/60">
            <button
              onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
              className="w-full p-4 text-left transition-colors active:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-black text-white leading-tight break-words">{g.subject_name || '-'}</div>
                  <div className="mt-1 text-[11px] text-slate-400 font-medium break-words">
                    {[g.year ? `${g.year}年度` : null, g.semester || null, g.instructor || null].filter(Boolean).join(' / ') || '-'}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <GradeBadge grade={g.grade} />
                  <div className="mt-1 text-[11px] font-bold text-slate-400">{g.credits !== undefined ? `${g.credits}単位` : '-'}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="text-slate-500 font-bold mb-1">中区分</div>
                  <div className="text-slate-300 break-words">{g.category_medium || '-'}</div>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="text-slate-500 font-bold mb-1">学期</div>
                  <div className="text-slate-300 break-words">{g.semester || '-'}</div>
                </div>
              </div>
            </button>
            {expandedId === g.id && (
              <div className="border-t border-white/5 border-l-[3px] border-l-sky-500/80 animate-fade-in">
                <ExpandedGradeStat grade={g} />
              </div>
            )}
          </div>
        ))}
        {grades.length === 0 && showEmptyState && (
          <div className="px-4 py-12 text-center text-slate-500">
            表示する成績データがありません。
          </div>
        )}
      </div>

      <div className="hidden sm:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-white/5 text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider">
              <th className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-b border-white/5 w-12 sm:w-16">年度</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-b border-white/5 w-12 sm:w-16">学期</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-b border-white/5 w-32 sm:w-40 truncate">中区分</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-b border-white/5 max-w-[120px] sm:max-w-xs truncate">科目</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-b border-white/5 w-20 sm:w-24">教員名</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-b border-white/5 w-10 sm:w-12 text-center">単位</th>
              <th className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-b border-white/5 w-12 sm:w-16 text-center">評価</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200 text-xs sm:text-sm">
            {grades.map((g) => (
              <React.Fragment key={g.id}>
                <tr 
                  onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                  className="hover:bg-white/5 transition-colors cursor-pointer group text-[11px] sm:text-xs"
                >
                  <td className="px-2 sm:px-4 py-2 sm:py-3">{g.year || '-'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs">{g.semester || '-'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-400 text-[9px] sm:text-[10px] max-w-[120px] sm:max-w-[180px] break-words whitespace-normal" title={g.category_medium}>{g.category_medium || '-'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 font-bold text-white max-w-[120px] sm:max-w-[200px] truncate" title={g.subject_name}>{g.subject_name}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-400 max-w-[80px] sm:max-w-[120px] truncate" title={g.instructor}>{g.instructor || '-'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-slate-300">{g.credits !== undefined ? g.credits : '-'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                    <GradeBadge grade={g.grade} />
                  </td>
                </tr>
                {expandedId === g.id && (
                  <tr>
                    <td colSpan={7} className="p-0 border-l-[3px] border-sky-500/80 animate-fade-in text-left">
                      <ExpandedGradeStat grade={g} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {grades.length === 0 && showEmptyState && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  表示する成績データがありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

const GradesTab: React.FC<GradesTabProps> = ({ grades }) => {
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterSemester, setFilterSemester] = useState<string>('All');
  const [sortField, setSortField] = useState<'year' | 'credits' | 'grade'>('year');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [isEnrolledExpanded, setIsEnrolledExpanded] = useState(false);
  const [isWithdrawnExpanded, setIsWithdrawnExpanded] = useState(false);

  const { activeGrades, enrolledGrades, withdrawnGrades } = useMemo(() => {
    const active: GradeInfo[] = [];
    const enrolled: GradeInfo[] = [];
    const withdrawn: GradeInfo[] = [];

    grades.forEach(g => {
      if (g.grade === '履修中') {
        enrolled.push(g);
      } else if (g.grade === 'W') {
        withdrawn.push(g);
      } else {
        active.push(g);
      }
    });

    enrolled.sort((a, b) => {
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return getSemesterRank(a.semester) - getSemesterRank(b.semester);
    });
    withdrawn.sort((a, b) => {
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return getSemesterRank(a.semester) - getSemesterRank(b.semester);
    });

    return { activeGrades: active, enrolledGrades: enrolled, withdrawnGrades: withdrawn };
  }, [grades]);

  const years = useMemo(() => Array.from(new Set(activeGrades.map(g => g.year?.toString() || ''))).filter(Boolean).sort((a, b) => b.localeCompare(a)), [activeGrades]);
  const semesters = useMemo(() => Array.from(new Set(activeGrades.map(g => g.semester || ''))).filter(Boolean).sort(), [activeGrades]);

  const sortedAndFilteredGrades = useMemo(() => {
    let result = [...activeGrades];

    if (filterYear !== 'All') {
      result = result.filter(g => g.year?.toString() === filterYear);
    }
    if (filterSemester !== 'All') {
      result = result.filter(g => g.semester === filterSemester);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'year') {
        const yearDiff = (a.year || 0) - (b.year || 0);
        if (yearDiff !== 0) comparison = yearDiff;
        else comparison = getSemesterRank(a.semester) - getSemesterRank(b.semester);
      } else if (sortField === 'credits') {
        comparison = (a.credits || 0) - (b.credits || 0);
      } else if (sortField === 'grade') {
        const gpaA = gradeToGpaMap[a.grade as string] !== undefined ? gradeToGpaMap[a.grade as string] : -1;
        const gpaB = gradeToGpaMap[b.grade as string] !== undefined ? gradeToGpaMap[b.grade as string] : -1;
        comparison = gpaA - gpaB;
      }
      
      if (comparison === 0 && sortField !== 'year') {
        comparison = ((a.year || 0) - (b.year || 0)) || (getSemesterRank(a.semester) - getSemesterRank(b.semester));
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [activeGrades, filterYear, filterSemester, sortField, sortOrder]);

  // フィルタ状態に連動するGPAと修得単位数
  const totalCreditsFiltered = useMemo(() => {
    return sortedAndFilteredGrades.filter(g => g.pass_status === '合').reduce((acc, curr) => acc + (curr.credits || 0), 0);
  }, [sortedAndFilteredGrades]);

  const gpaFiltered = useMemo(() => calcGpa(sortedAndFilteredGrades), [sortedAndFilteredGrades]);

  return (
    <div className="px-4 sm:px-6 mt-6 pb-32 animate-fade-in relative z-[1]">

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#1e293b]/40 backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
          <div className="flex flex-col relative z-10">
            <span className="text-xs font-bold text-sky-400 tracking-wider mb-1">修得単位数</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{totalCreditsFiltered}</span>
              <span className="text-xs text-slate-400 font-bold">単位</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b]/40 backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
          <div className="flex flex-col relative z-10">
            <span className="text-xs font-bold text-indigo-400 tracking-wider mb-1">推定GPA</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{gpaFiltered}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 bg-[#1e293b]/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg overflow-hidden">
         <button 
           onClick={() => setIsChartExpanded(prev => !prev)}
           className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors focus:outline-none active:bg-white/10"
         >
            <div className="flex items-center gap-3">
               <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
               <span className="font-bold text-slate-300">GPA推移グラフ</span>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isChartExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
         </button>
         {isChartExpanded && (
           <div className="border-t border-white/5 animate-fade-in p-4 sm:p-5">
             <GpaChart activeGrades={activeGrades} />
           </div>
         )}
      </div>


      <div className="flex flex-wrap gap-3 mb-6 bg-[#1e293b]/40 backdrop-blur-md rounded-3xl p-4 border border-white/5 shadow-lg">
        <select 
          value={filterYear} 
          onChange={(e) => setFilterYear(e.target.value)}
          className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-sky-500 flex-1 min-w-[120px]"
        >
          <option value="All">すべての年度</option>
          {years.map(y => <option key={y} value={y}>{y}年度</option>)}
        </select>
        
        <select 
          value={filterSemester} 
          onChange={(e) => setFilterSemester(e.target.value)}
          className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-sky-500 flex-1 min-w-[120px]"
        >
          <option value="All">すべての学期</option>
          {semesters.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select 
          value={sortField} 
          onChange={(e) => setSortField(e.target.value as any)}
          className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-sky-500 flex-1 min-w-[120px]"
        >
          <option value="year">年度・学期順</option>
          <option value="grade">評価順</option>
          <option value="credits">単位数順</option>
        </select>

        <button 
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="bg-[#0f172a] border border-[#1e293b] hover:bg-[#1e293b] active:scale-95 rounded-xl px-4 py-2 text-sm text-slate-300 transition-all flex items-center justify-center font-bold"
        >
          {sortOrder === 'asc' ? '昇順 ▲' : '降順 ▼'}
        </button>
      </div>

      <div className="bg-[#1e293b]/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-xl overflow-hidden text-sm mb-6">
        <GradeTable grades={sortedAndFilteredGrades} showEmptyState={false} />
        {activeGrades.length === 0 && sortedAndFilteredGrades.length === 0 && (
           <div className="px-4 py-12 text-center text-slate-500">
              成績データがありません。<br />下の＋ボタンから追加してください。
           </div>
        )}
        {activeGrades.length > 0 && sortedAndFilteredGrades.length === 0 && (
           <div className="px-4 py-12 text-center text-slate-500">
              条件に一致する成績が見つかりませんでした。
           </div>
        )}
      </div>

      {enrolledGrades.length > 0 && (
        <div className="mb-4 bg-[#1e293b]/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg overflow-hidden">
           <button 
             onClick={() => setIsEnrolledExpanded(prev => !prev)}
             className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors focus:outline-none active:bg-white/10"
           >
              <div className="flex items-center gap-3">
                 <span className="font-bold text-slate-300">履修中の科目</span>
                 <span className="bg-sky-500/20 text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-black">{enrolledGrades.length}件</span>
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isEnrolledExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           {isEnrolledExpanded && (
             <div className="border-t border-white/5 animate-fade-in text-sm">
               <GradeTable grades={enrolledGrades} showEmptyState={false} />
             </div>
           )}
        </div>
      )}

      {withdrawnGrades.length > 0 && (
        <div className="mb-4 bg-[#1e293b]/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg overflow-hidden">
           <button 
             onClick={() => setIsWithdrawnExpanded(prev => !prev)}
             className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors focus:outline-none active:bg-white/10"
           >
              <div className="flex items-center gap-3">
                 <span className="font-bold text-slate-300">履修中止 (W) の科目</span>
                 <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-black">{withdrawnGrades.length}件</span>
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isWithdrawnExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           {isWithdrawnExpanded && (
             <div className="border-t border-white/5 animate-fade-in text-sm">
               <GradeTable grades={withdrawnGrades} showEmptyState={false} />
             </div>
           )}
        </div>
      )}

    </div>
  );
};

export default GradesTab;
