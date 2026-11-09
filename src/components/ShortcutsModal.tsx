import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + V / ⌘ + V', desc: 'Paste clipboard image, screenshot, or text directly into converter' },
    { key: 'Drag & Drop', desc: 'Drop any document, image, audio, video or spreadsheet file' },
    { key: 'Print Button', desc: 'Open print studio with Fit to One Page and layout calibration' },
    { key: 'Edit Button', desc: 'Modify text, crop/rotate images, or trim audio/video start & end times' },
    { key: 'Esc', desc: 'Close any active modal dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[6px] shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Keyboard className="w-4 h-4 text-zinc-400" />
            <span>Shortcuts & Capabilities</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-[4px] bg-zinc-900 border border-zinc-800/80"
            >
              <span className="text-zinc-400">{sc.desc}</span>
              <kbd className="px-2 py-0.5 rounded-[3px] bg-zinc-950 border border-zinc-700 font-mono text-zinc-200 text-[11px] shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-[4px] bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
