import React, { useState } from 'react';
import type { GradeInfo } from '../types';

interface GradeAddModalProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onSave: (grades: Omit<GradeInfo, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => void;
}

export const GradeAddModal: React.FC<GradeAddModalProps> = ({ isOpen, isClosing, onClose, onSave }) => {
  const [pasteData, setPasteData] = useState('');
  const [error, setError] = useState('');

  if (!isOpen && !isClosing) return null;

  const handleSave = () => {
    try {
      const lines = pasteData.trim().split('\n');
      const gradesToSave: Omit<GradeInfo, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [];

      let startIdx = 0;
      // 最初のデータ行（数字で始まり、タブが含まれる行）を探す
      const firstDataIdx = lines.findIndex(l => /^\d+\t/.test(l));
      if (firstDataIdx !== -1) {
        startIdx = firstDataIdx;
      }

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        // 最低限の列数があるか確認（サンプルの場合13列）
        if (parts.length >= 13) {
          gradesToSave.push({
            no: parseInt(parts[0], 10),
            category_large: parts[1],
            category_medium: parts[2],
            category_small: parts[3],
            registration_code: parts[4],
            subject_code: parts[5],
            subject_name: parts[6],
            instructor: parts[7],
            credits: parseFloat(parts[8]),
            year: parseInt(parts[9], 10),
            semester: parts[10],
            grade: parts[11],
            pass_status: parts[12],
          });
        }
      }

      if (gradesToSave.length === 0) {
        setError('成績データが見つかりませんでした。正しい形式でコピー＆ペーストしてください。');
        return;
      }

      onSave(gradesToSave);
      setPasteData('');
      setError('');
    } catch (e) {
      setError('データの解析に失敗しました。');
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/60 z-[100] flex justify-center items-end sm:items-center p-0 sm:p-6 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={onClose}>
      <div 
        className={`bg-[#0f172a] sm:rounded-3xl rounded-t-3xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl border border-[#1e293b] ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-[#1e293b] shrink-0">
          <h2 className="text-xl font-bold text-white tracking-wider">成績データを追加</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 tracking-wider">成績データをペースト</label>
            <p className="text-[11px] text-slate-500 mb-3 ml-1">成績表システム（Loyola等）から表全体をコピーして、ここに貼り付けてください。</p>
            <textarea
              className="w-full h-48 p-4 bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all text-sm resize-none"
              placeholder="No. 科目大区分 科目中区分...&#10;1 全学共通科目 必修科目..."
              value={pasteData}
              onChange={e => {
                setPasteData(e.target.value);
                setError('');
              }}
            />
          </div>
        </div>

        <div className="p-6 border-t border-[#1e293b] bg-[#0f172a] shrink-0 sm:rounded-b-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={handleSave}
            disabled={!pasteData.trim()}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-sky-500/20 text-sm tracking-widest"
          >
            保存して解析
          </button>
        </div>
      </div>
    </div>
  );
};
