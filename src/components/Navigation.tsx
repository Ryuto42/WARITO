import React from 'react';

interface NavigationProps {
  activeTab: 'timetable' | 'account';
  setActiveTab: (tab: 'timetable' | 'account') => void;
  onAddClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, onAddClick }) => {
  return (
    <>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center z-50 pointer-events-none gap-3">
        <div className="bg-[#111111] border border-gray-800 rounded-full h-14 flex items-center shadow-2xl relative w-64 pointer-events-auto">
          <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#333333] rounded-full transition-transform duration-300 ease-out z-0"
            style={{ 
              transform: activeTab === 'account' ? 'translateX(100%) translateX(6px)' : 'translateX(6px)' 
            }}
          />
          
          <button 
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 flex items-center justify-center relative z-10 h-full rounded-full transition-colors duration-200 font-bold text-xs tracking-wider ${activeTab === 'timetable' ? 'text-sky-400' : 'text-gray-400 hover:text-white'}`}
          >
            時間割
          </button>
          
          <button 
            onClick={() => setActiveTab('account')}
            className={`flex-1 flex items-center justify-center relative z-10 h-full rounded-full transition-colors duration-200 font-bold text-xs tracking-wider ${activeTab === 'account' ? 'text-sky-400' : 'text-gray-400 hover:text-white'}`}
          >
            アカウント
          </button>
        </div>

        <button 
          onClick={onAddClick} 
          className="w-14 h-14 bg-[#111111] hover:bg-[#222222] border border-gray-800 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 z-50 pointer-events-auto shrink-0"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </>
  );
};

export default Navigation;
