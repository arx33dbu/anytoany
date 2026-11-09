import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  Volume2,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Bold,
  Italic,
  List,
  Heading,
} from 'lucide-react';
import type {
  ConversionItem,
  ImageEditState,
  MediaEditState,
  DocumentEditState,
} from '../types';
import { docxToText } from '../services/converters/documentConverter';
import { processImageEdits, loadImageElement } from '../services/converters/imageConverter';

interface EditorModalProps {
  item: ConversionItem;
  isOpen: boolean;
  onClose: () => void;
  onSaveEdits: (
    id: string,
    edits: {
      imageEdits?: ImageEditState;
      mediaEdits?: MediaEditState;
      documentEdits?: DocumentEditState;
    }
  ) => void;
}

export const EditorModal: React.FC<EditorModalProps> = ({
  item,
  isOpen,
  onClose,
  onSaveEdits,
}) => {
  // Document State
  const [docText, setDocText] = useState<string>('');
  const [findWord, setFindWord] = useState('');
  const [replaceWord, setReplaceWord] = useState('');

  // Image State
  const [imageEdits, setImageEdits] = useState<ImageEditState>({
    rotate: item.imageEdits?.rotate || 0,
    flipH: item.imageEdits?.flipH || false,
    flipV: item.imageEdits?.flipV || false,
    brightness: item.imageEdits?.brightness ?? 100,
    contrast: item.imageEdits?.contrast ?? 100,
    grayscale: item.imageEdits?.grayscale || false,
    invert: item.imageEdits?.invert || false,
    sepia: item.imageEdits?.sepia || false,
    watermarkText: item.imageEdits?.watermarkText || '',
    watermarkPosition: item.imageEdits?.watermarkPosition || 'bottom-right',
  });
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Media State (Audio & Video)
  const [mediaEdits, setMediaEdits] = useState<MediaEditState>({
    trimStart: item.mediaEdits?.trimStart || 0,
    trimEnd: item.mediaEdits?.trimEnd || 0,
    playbackRate: item.mediaEdits?.playbackRate || 1,
    volume: item.mediaEdits?.volume ?? 100,
    extractAudioOnly: item.mediaEdits?.extractAudioOnly || false,
  });
  const [mediaDuration, setMediaDuration] = useState<number>(0);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  // Initialize content on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initContent = async () => {
      try {
        if (item.category === 'document' || item.category === 'spreadsheet' || item.category === 'data') {
          if (item.documentEdits?.textContent) {
            setDocText(item.documentEdits.textContent);
          } else if (item.ext === 'docx' || item.ext === 'doc') {
            const txt = await docxToText(item.file);
            if (isMounted) setDocText(txt);
          } else {
            const raw = await item.file.text();
            if (isMounted) setDocText(raw);
          }
        } else if (item.category === 'image') {
          const url = URL.createObjectURL(item.file);
          if (isMounted) setImagePreviewSrc(url);
        } else if (item.category === 'audio' || item.category === 'video') {
          const url = URL.createObjectURL(item.file);
          if (isMounted) setImagePreviewSrc(url);
        }
      } catch (e) {
        console.error('Failed to init editor content:', e);
      }
    };

    initContent();
    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  // Update image canvas preview whenever image edits change
  useEffect(() => {
    if (item.category !== 'image' || !imagePreviewSrc) return;

    let active = true;
    const renderCanvas = async () => {
      try {
        const img = await loadImageElement(imagePreviewSrc);
        const processed = await processImageEdits(img, imageEdits);
        if (active && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          canvasRef.current.width = processed.width;
          canvasRef.current.height = processed.height;
          ctx?.drawImage(processed, 0, 0);
        }
      } catch (err) {
        console.warn('Canvas render error:', err);
      }
    };

    renderCanvas();
    return () => {
      active = false;
    };
  }, [imageEdits, imagePreviewSrc, item.category]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (item.category === 'document' || item.category === 'spreadsheet' || item.category === 'data') {
      onSaveEdits(item.id, {
        documentEdits: {
          textContent: docText,
          htmlContent: `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(
            docText
          )}</pre>`,
        },
      });
    } else if (item.category === 'image') {
      onSaveEdits(item.id, {
        imageEdits,
      });
    } else if (item.category === 'audio' || item.category === 'video') {
      onSaveEdits(item.id, {
        mediaEdits,
      });
    }
    onClose();
  };

  const handleReplaceText = () => {
    if (!findWord) return;
    setDocText((prev) => prev.replaceAll(findWord, replaceWord));
  };

  const insertTextFormatting = (prefix: string, suffix: string = '') => {
    setDocText((prev) => `${prefix}${prev}${suffix}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-[6px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            {item.category === 'image' ? (
              <ImageIcon className="w-4 h-4 text-emerald-400" />
            ) : item.category === 'video' ? (
              <Video className="w-4 h-4 text-amber-400" />
            ) : item.category === 'audio' ? (
              <Music className="w-4 h-4 text-violet-400" />
            ) : (
              <FileText className="w-4 h-4 text-zinc-300" />
            )}
            <span className="text-sm font-semibold text-zinc-100">Editor</span>
            <span className="text-xs font-mono text-zinc-400">· {item.name}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Editor Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* 1. DOCUMENT & TEXT EDITOR */}
          {(item.category === 'document' ||
            item.category === 'spreadsheet' ||
            item.category === 'data') && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[4px] bg-zinc-900 border border-zinc-800 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertTextFormatting('# ')}
                    className="p-1.5 rounded-[3px] hover:bg-zinc-800 text-zinc-300 hover:text-white"
                    title="Heading 1"
                  >
                    <Heading className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextFormatting('**', '**')}
                    className="p-1.5 rounded-[3px] hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextFormatting('*', '*')}
                    className="p-1.5 rounded-[3px] hover:bg-zinc-800 text-zinc-300 hover:text-white italic"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextFormatting('- ')}
                    className="p-1.5 rounded-[3px] hover:bg-zinc-800 text-zinc-300 hover:text-white"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Find & Replace */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Find"
                    value={findWord}
                    onChange={(e) => setFindWord(e.target.value)}
                    className="w-24 px-2 py-1 rounded-[3px] bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Replace"
                    value={replaceWord}
                    onChange={(e) => setReplaceWord(e.target.value)}
                    className="w-24 px-2 py-1 rounded-[3px] bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleReplaceText}
                    className="px-2 py-1 rounded-[3px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs cursor-pointer"
                  >
                    Replace All
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Edit document content..."
                rows={16}
                className="w-full rounded-[4px] bg-zinc-900/80 border border-zinc-800 p-3.5 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-zinc-600 leading-relaxed resize-y"
              />

              {/* Word count stats */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>
                  {docText.trim() ? docText.trim().split(/\s+/).length : 0} words ·{' '}
                  {docText.length} characters
                </span>
                <span>Ready for export to .{item.targetExt.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* 2. IMAGE EDITOR */}
          {item.category === 'image' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Controls */}
              <div className="md:col-span-5 space-y-4 text-xs">
                {/* Transform */}
                <div className="space-y-2">
                  <span className="font-medium text-zinc-300">Orientation & Flip</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setImageEdits((prev) => ({
                          ...prev,
                          rotate: (prev.rotate - 90 + 360) % 360,
                        }))
                      }
                      className="flex-1 py-1.5 rounded-[4px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center gap-1 text-zinc-300"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> -90°
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImageEdits((prev) => ({
                          ...prev,
                          rotate: (prev.rotate + 90) % 360,
                        }))
                      }
                      className="flex-1 py-1.5 rounded-[4px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center gap-1 text-zinc-300"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> +90°
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImageEdits((prev) => ({ ...prev, flipH: !prev.flipH }))
                      }
                      className={`p-1.5 rounded-[4px] border ${
                        imageEdits.flipH
                          ? 'bg-zinc-800 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImageEdits((prev) => ({ ...prev, flipV: !prev.flipV }))
                      }
                      className={`p-1.5 rounded-[4px] border ${
                        imageEdits.flipV
                          ? 'bg-zinc-800 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Adjustments */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <span className="font-medium text-zinc-300">Filters & Adjustments</span>
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Brightness</span>
                      <span className="font-mono">{imageEdits.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={imageEdits.brightness}
                      onChange={(e) =>
                        setImageEdits((prev) => ({
                          ...prev,
                          brightness: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-zinc-200 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Contrast</span>
                      <span className="font-mono">{imageEdits.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={imageEdits.contrast}
                      onChange={(e) =>
                        setImageEdits((prev) => ({
                          ...prev,
                          contrast: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-zinc-200 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setImageEdits((prev) => ({ ...prev, grayscale: !prev.grayscale }))
                      }
                      className={`py-1 rounded-[3px] border text-center ${
                        imageEdits.grayscale
                          ? 'bg-zinc-800 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Grayscale
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImageEdits((prev) => ({ ...prev, invert: !prev.invert }))
                      }
                      className={`py-1 rounded-[3px] border text-center ${
                        imageEdits.invert
                          ? 'bg-zinc-800 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Invert
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImageEdits((prev) => ({ ...prev, sepia: !prev.sepia }))
                      }
                      className={`py-1 rounded-[3px] border text-center ${
                        imageEdits.sepia
                          ? 'bg-zinc-800 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Sepia
                    </button>
                  </div>
                </div>

                {/* Watermark text */}
                <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                  <span className="font-medium text-zinc-300">Watermark Text</span>
                  <input
                    type="text"
                    placeholder="e.g. DRAFT or Confidential"
                    value={imageEdits.watermarkText}
                    onChange={(e) =>
                      setImageEdits((prev) => ({
                        ...prev,
                        watermarkText: e.target.value,
                      }))
                    }
                    className="w-full rounded-[4px] bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-200"
                  />
                  <select
                    value={imageEdits.watermarkPosition}
                    onChange={(e) =>
                      setImageEdits((prev) => ({
                        ...prev,
                        watermarkPosition: e.target.value as ImageEditState['watermarkPosition'],
                      }))
                    }
                    className="w-full rounded-[4px] bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-400"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="center">Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>

              {/* Canvas Preview */}
              <div className="md:col-span-7 bg-zinc-900/50 rounded-[4px] border border-zinc-800 p-3 flex items-center justify-center min-h-[300px] overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[360px] object-contain shadow-lg rounded-[2px]"
                />
              </div>
            </div>
          )}

          {/* 3. AUDIO / VIDEO TRIMMER & SETTINGS */}
          {(item.category === 'audio' || item.category === 'video') && (
            <div className="space-y-4 text-xs">
              {/* Media Player */}
              <div className="rounded-[4px] overflow-hidden bg-black flex items-center justify-center border border-zinc-800 max-h-[300px]">
                {item.category === 'video' ? (
                  <video
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    src={imagePreviewSrc}
                    controls
                    onLoadedMetadata={(e) => {
                      const dur = (e.target as HTMLVideoElement).duration;
                      setMediaDuration(dur);
                      if (mediaEdits.trimEnd === 0) {
                        setMediaEdits((prev) => ({ ...prev, trimEnd: dur }));
                      }
                    }}
                    className="max-h-[300px] w-auto"
                  />
                ) : (
                  <div className="p-8 w-full flex flex-col items-center justify-center">
                    <Music className="w-8 h-8 text-violet-400 mb-3" />
                    <audio
                      ref={mediaRef as React.RefObject<HTMLAudioElement>}
                      src={imagePreviewSrc}
                      controls
                      onLoadedMetadata={(e) => {
                        const dur = (e.target as HTMLAudioElement).duration;
                        setMediaDuration(dur);
                        if (mediaEdits.trimEnd === 0) {
                          setMediaEdits((prev) => ({ ...prev, trimEnd: dur }));
                        }
                      }}
                      className="w-full max-w-md"
                    />
                  </div>
                )}
              </div>

              {/* Trimmer Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[4px] bg-zinc-900 border border-zinc-800">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5 text-zinc-400" /> Trim Start
                    </span>
                    <span className="font-mono">{mediaEdits.trimStart.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={mediaDuration || 60}
                    step="0.1"
                    value={mediaEdits.trimStart}
                    onChange={(e) =>
                      setMediaEdits((prev) => ({
                        ...prev,
                        trimStart: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5 text-zinc-400" /> Trim End
                    </span>
                    <span className="font-mono">
                      {(mediaEdits.trimEnd || mediaDuration).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={mediaDuration || 60}
                    step="0.1"
                    value={mediaEdits.trimEnd || mediaDuration}
                    onChange={(e) =>
                      setMediaEdits((prev) => ({
                        ...prev,
                        trimEnd: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* Volume & Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-[4px] bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="flex justify-between text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-zinc-400" /> Volume
                    </span>
                    <span className="font-mono">{mediaEdits.volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={mediaEdits.volume}
                    onChange={(e) =>
                      setMediaEdits((prev) => ({
                        ...prev,
                        volume: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-[4px] bg-zinc-900 border border-zinc-800 space-y-1">
                  <label className="block text-zinc-300">Playback Speed</label>
                  <select
                    value={mediaEdits.playbackRate}
                    onChange={(e) =>
                      setMediaEdits((prev) => ({
                        ...prev,
                        playbackRate: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-[3px] bg-zinc-950 border border-zinc-800 px-2 py-1 text-zinc-200 font-mono"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1.0x (Normal)</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2.0x</option>
                  </select>
                </div>

                {item.category === 'video' && (
                  <div className="p-3 rounded-[4px] bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-medium block">Extract Audio Only</span>
                      <span className="text-[10px] text-zinc-400">Save track as MP3/WAV</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={mediaEdits.extractAudioOnly}
                      onChange={(e) =>
                        setMediaEdits((prev) => ({
                          ...prev,
                          extractAudioOnly: e.target.checked,
                        }))
                      }
                      className="rounded-[3px] accent-zinc-400"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/60">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-[4px] text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
