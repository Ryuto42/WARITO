import React from 'react';
import {
  selectionHaptic,
  impactHaptic,
  usesNativeTabBar,
  syncNativeTabBar,
  bindNativeTabBar,
  syncNativeGlassControls,
  bindNativeGlassControls,
} from '../utils/native';

interface NavigationProps {
  activeTab: 'timetable' | 'grades' | 'account';
  setActiveTab: (tab: 'timetable' | 'grades' | 'account') => void;
  onAddClick: () => void;
  onSearchClick: () => void;
  presetCount: number;
  presetIndex: number;
  onPresetSelect: (index: number) => void;
  currentYear: number;
  currentSemester: string;
  hidden?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onAddClick,
  onSearchClick,
  presetCount,
  presetIndex,
  onPresetSelect,
  currentYear,
  currentSemester,
  hidden = false,
}) => {
  const [morphKey, setMorphKey] = React.useState(0);
  const native = usesNativeTabBar();

  const latest = React.useRef({ setActiveTab, onAddClick, onSearchClick, onPresetSelect });
  React.useEffect(() => { latest.current = { setActiveTab, onAddClick, onSearchClick, onPresetSelect }; });

  React.useEffect(() => bindNativeTabBar({
    onTab: (tab) => latest.current.setActiveTab(tab),
    onAdd: () => latest.current.onAddClick(),
  }), []);

  React.useEffect(() => bindNativeGlassControls({
    onSearch: () => latest.current.onSearchClick(),
    onAccount: () => latest.current.setActiveTab('account'),
    // 学期モーダルを持つ時間割タブへ橋渡し
    onTerm: () => window.dispatchEvent(new Event('waritoNativeTerm')),
    onPresetSelect: (index) => latest.current.onPresetSelect(index),
  }), []);

  // モーダルを列挙せず、共通の `fixed inset-0` オーバーレイで判定する
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  React.useEffect(() => {
    if (!native) return;
    const check = () => setOverlayOpen(!!document.querySelector('div.fixed.inset-0'));
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, [native]);

  React.useEffect(() => {
    syncNativeTabBar({ activeTab, visible: !hidden && !overlayOpen });
  }, [activeTab, hidden, overlayOpen]);

  React.useEffect(() => {
    syncNativeGlassControls({
      activeTab,
      visible: !hidden && !overlayOpen,
      year: currentYear,
      semester: currentSemester,
      presetCount,
      presetIndex,
    });
  }, [activeTab, currentYear, currentSemester, hidden, overlayOpen, presetCount, presetIndex]);

  React.useEffect(() => () => {
    syncNativeTabBar({ activeTab: 'timetable', visible: false });
    syncNativeGlassControls({
      activeTab: 'timetable',
      visible: false,
      year: 0,
      semester: '',
      presetCount: 0,
      presetIndex: 0,
    });
  }, []);

  const handleTab = (tab: 'timetable' | 'grades') => {
    if (tab !== activeTab) {
      selectionHaptic();
      setMorphKey((n) => n + 1);
    }
    setActiveTab(tab);
  };

  if (native) return null; // 二重表示を防ぐため Web 側は描画しない

  const tabLabel = (tab: 'timetable' | 'grades', label: string) => (
    <button
      onClick={() => handleTab(tab)}
      aria-label={label}
      className={`flex-1 flex items-center justify-center relative z-10 h-full rounded-full transition-colors duration-200 font-bold text-xs tracking-wider ${
        activeTab === tab ? 'text-[#0A84FF]' : 'text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="liquid-tabbar fixed left-1/2 -translate-x-1/2 flex items-center justify-center z-10 pointer-events-none gap-3 w-full px-6 bottom-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="liquid-glass liquid-tabbar-pill rounded-full h-14 flex items-center relative pointer-events-auto">
        {/* w-[calc(50%-12px)] + 6px余白で両タブ中心に正確に載る: 6|116|12|116|6 = 256px(16rem) */}
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
        className="liquid-glass liquid-glass-control liquid-add-button w-14 h-14 rounded-full flex items-center justify-center z-50 pointer-events-auto shrink-0 touch-manipulation"
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
