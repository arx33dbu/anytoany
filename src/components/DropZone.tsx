import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-[6px] border border-dashed transition-all p-8 sm:p-10 text-center ${
        isDragging
          ? 'border-zinc-400 bg-zinc-900/60'
          : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700/80 hover:bg-zinc-900/20'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="w-10 h-10 rounded-[4px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3 shadow-xs">
          <UploadCloud className="w-5 h-5 text-zinc-400" />
        </div>

        <div className="text-sm font-medium text-zinc-200 mb-1">
          Drop files to convert, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-zinc-100 underline underline-offset-2 hover:text-white cursor-pointer font-medium"
          >
            browse
          </button>
        </div>

        <p className="text-xs text-zinc-400 font-mono">
          Documents (DOCX, PDF, MD) · Images · Audio · Video · Data (CSV, JSON, XLSX)
        </p>
      </div>
    </div>
  );
};
