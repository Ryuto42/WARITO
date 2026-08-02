import React from 'react';
import { selectionHaptic, impactHaptic } from '../utils/native';

interface NavigationProps {
  activeTab: 'timetable' | 'grades' | 'account';
  setActiveTab: (tab: 'timetable' | 'grades' | 'account') => void;
  onAddClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, onAddClick }) => {
  // 切替のたびに key を変えて、伸縮アニメーションを最初から再生させる
  const [morphKey, setMorphKey] = React.useState(0);

  const handleTab = (tab: 'timetable' | 'grades') => {
    if (tab !== activeTab) {
      selectionHaptic();
      setMorphKey((n) => n + 1);
    }
    setActiveTab(tab);
  };

  const tabLabel = (tab: 'timetable' | 'grades', label: string) => (
    <button
      onClick={() => handleTab(tab)}
      aria-label={label}
      className={`flex-1 flex items-center justify-center relative z-10 h-full rounded-full transition-colors duration-200 font-bold text-xs tracking-wider ${
        activeTab === tab ? 'text-sky-400' : 'text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="liquid-tabbar fixed left-1/2 -translate-x-1/2 flex items-center justify-center z-10 pointer-events-none gap-3 w-full px-6 bottom-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="liquid-glass liquid-tabbar-pill rounded-full h-14 flex items-center relative pointer-events-auto">
        {/* 外側がバネで移動し、内側が進行方向へ伸び縮みする（iOS 26 のリキッドグラス挙動） */}
        {/* 幅 calc(50%-12px) + 左右 6px の余白で、両タブの中心に正確に載る:
            6 | 116 | 12 | 116 | 6 = 256px（バー幅 16rem）*/}
        <div
          className="liquid-capsule-track absolute top-1.5 bottom-1.5 w-[calc(50%-12px)] z-0"
          style={{
            transform:
              activeTab === 'grades'
                ? 'translateX(calc(100% + 18px))'
                : 'translateX(6px)',
            opacity: activeTab === 'account' ? 0 : 1,
          }}
        >
          <div
            key={morphKey}
            className={`liquid-capsule h-full w-full rounded-full ${morphKey ? 'is-morphing' : ''}`}
          />
        </div>

        {tabLabel('timetable', '時間割')}
        {tabLabel('grades', '成績')}
      </div>

      <button
        onClick={() => { impactHaptic(); onAddClick(); }}
        aria-label="授業を追加"
        className="liquid-glass w-14 h-14 rounded-full flex items-center justify-center z-50 pointer-events-auto shrink-0"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
};

export default Navigation;
