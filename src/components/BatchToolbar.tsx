import React from 'react';
import { Play, Download, Layers } from 'lucide-react';

interface BatchToolbarProps {
  totalCount: number;
  completedCount: number;
  isConvertingAll: boolean;
  onConvertAll: () => void;
  onDownloadAllZip: () => void;
  onClearCompleted: () => void;
  onSetGlobalTarget: (targetExt: string) => void;
}

export const BatchToolbar: React.FC<BatchToolbarProps> = ({
  totalCount,
  completedCount,
  isConvertingAll,
  onConvertAll,
  onDownloadAllZip,
  onClearCompleted,
  onSetGlobalTarget,
}) => {
  if (totalCount <= 1) return null;

  return (
    <div className="rounded-[5px] bg-zinc-900/90 border border-zinc-800 p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Batch Format Setter */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-zinc-400" /> Set all to:
        </span>
        <div className="flex items-center gap-1">
          {['pdf', 'png', 'csv', 'mp3', 'docx'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => onSetGlobalTarget(fmt)}
              className="px-2 py-1 rounded-[3px] bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              .{fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Actions */}
      <div className="flex items-center gap-2">
        {completedCount > 0 && (
          <>
            <button
              onClick={onDownloadAllZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All (ZIP)</span>
            </button>

            <button
              onClick={onClearCompleted}
              className="px-2.5 py-1.5 rounded-[4px] text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Clear Completed
            </button>
          </>
        )}

        <button
          onClick={onConvertAll}
          disabled={isConvertingAll}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isConvertingAll ? 'Converting Queue...' : 'Convert All'}</span>
        </button>
      </div>
    </div>
  );
};
