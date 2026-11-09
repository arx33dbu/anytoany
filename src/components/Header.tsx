import React from 'react';
import { Files, Download, Trash2, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  totalCount: number;
  completedCount: number;
  totalSizeFormatted: string;
  onClearAll: () => void;
  onDownloadZip: () => void;
  isZipping: boolean;
  onToggleShortcuts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  completedCount,
  totalSizeFormatted,
  onClearAll,
  onDownloadZip,
  isZipping,
  onToggleShortcuts,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[5px] bg-zinc-900 border border-zinc-700/70 flex items-center justify-center text-zinc-100 font-semibold text-sm tracking-tight shadow-xs">
            A<span className="text-zinc-400">2</span>A
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-zinc-100 tracking-tight text-base">
              any to any
            </span>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              universal converter & print studio
            </span>
          </div>
        </div>

        {/* Global Stats & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {totalCount > 0 && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 font-mono">
              <Files className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {completedCount}/{totalCount} processed
              </span>
              <span className="text-zinc-600">|</span>
              <span>{totalSizeFormatted}</span>
            </div>
          )}

          {completedCount > 0 && (
            <button
              onClick={onDownloadZip}
              disabled={isZipping}
              title="Download all converted files in a single .zip"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Archiving...' : 'Download All (.zip)'}</span>
            </button>
          )}

          {totalCount > 0 && (
            <button
              onClick={onClearAll}
              title="Clear all files from queue"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          <button
            onClick={onToggleShortcuts}
            title="Keyboard shortcuts & options"
            className="p-1.5 rounded-[4px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
