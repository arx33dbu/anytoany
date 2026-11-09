import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Database,
  FileSpreadsheet,
  Printer,
  Edit3,
  Download,
  Play,
  RotateCw,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { ConversionItem, FileCategory } from '../types';
import { formatFileSize, getAvailableTargets } from '../utils/formatRegistry';

interface FileItemProps {
  item: ConversionItem;
  onTargetChange: (id: string, targetExt: string) => void;
  onConvert: (id: string) => void;
  onEdit: (item: ConversionItem) => void;
  onPrint: (item: ConversionItem) => void;
  onRemove: (id: string) => void;
  onDownload: (item: ConversionItem) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  item,
  onTargetChange,
  onConvert,
  onEdit,
  onPrint,
  onRemove,
  onDownload,
}) => {
  const availableTargets = getAvailableTargets(item.ext);

  // Pick category icon
  const getCategoryIcon = (category: FileCategory) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-violet-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-amber-400" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-4 h-4 text-teal-400" />;
      case 'data':
        return <Database className="w-4 h-4 text-cyan-400" />;
      case 'document':
      default:
        return <FileText className="w-4 h-4 text-zinc-300" />;
    }
  };

  const hasEdits = Boolean(
    item.imageEdits ||
    item.mediaEdits ||
    item.documentEdits?.textContent ||
    item.documentEdits?.htmlContent
  );

  return (
    <div className="group rounded-[5px] bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* File info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-[4px] bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
          {getCategoryIcon(item.category)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium text-zinc-100 truncate max-w-[240px] sm:max-w-[320px]"
              title={item.name}
            >
              {item.name}
            </span>
            {hasEdits && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[3px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                Edited
              </span>
            )}
            {item.status === 'completed' && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[3px] bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Ready
              </span>
            )}
            {item.status === 'error' && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[3px] bg-rose-950/70 text-rose-400 border border-rose-800/60 flex items-center gap-1" title={item.error}>
                <AlertCircle className="w-2.5 h-2.5" /> Error
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
            <span className="uppercase text-zinc-400">{item.ext}</span>
            <span className="text-zinc-600">·</span>
            <span>{formatFileSize(item.size)}</span>
            {item.resultBlob && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">
                  out: {formatFileSize(item.resultBlob.size)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Target Selector & Actions */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
        {/* Target format dropdown */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="font-mono text-zinc-400 text-[11px] hidden lg:inline">to</span>
          <select
            value={item.targetExt}
            disabled={item.status === 'converting'}
            onChange={(e) => onTargetChange(item.id, e.target.value)}
            className="rounded-[4px] bg-zinc-950 border border-zinc-700/80 text-zinc-200 text-xs font-mono px-2.5 py-1.5 focus:outline-hidden focus:border-zinc-500 cursor-pointer disabled:opacity-50"
          >
            {availableTargets.map((target) => (
              <option key={target} value={target}>
                .{target.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1">
          {/* Edit button */}
          <button
            onClick={() => onEdit(item)}
            title="Edit document, image, or media before conversion"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Edit</span>
          </button>

          {/* Print button (with fit to one page options) */}
          <button
            onClick={() => onPrint(item)}
            title="Print or export with 'Fit to one page' and layout scaling options"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>Print</span>
          </button>

          {/* Convert or Download */}
          {item.status === 'completed' ? (
            <button
              onClick={() => onDownload(item)}
              title="Download converted file"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          ) : (
            <button
              onClick={() => onConvert(item.id)}
              disabled={item.status === 'converting'}
              title="Start conversion"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-200 hover:bg-zinc-100 text-zinc-950 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {item.status === 'converting' ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                  <span className="font-mono">{item.progress}%</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Convert</span>
                </>
              )}
            </button>
          )}

          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            title="Remove file"
            className="p-1.5 rounded-[4px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
