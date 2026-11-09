import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  X,
  FileDown,
  LayoutTemplate,
  Minimize2,
  RotateCw,
} from 'lucide-react';
import type { ConversionItem, PrintSettings } from '../types';
import { DEFAULT_PRINT_SETTINGS, executePrint, getPaperDimensions } from '../services/printEngine';
import { convertDocument } from '../services/converters/documentConverter';

interface PrintModalProps {
  item: ConversionItem;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({ item, isOpen, onClose }) => {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const previewSheetRef = useRef<HTMLDivElement>(null);

  // Load document HTML for printing preview
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingPreview(true);

    const loadContent = async () => {
      try {
        // If user already edited text or html
        if (item.documentEdits?.htmlContent) {
          if (isMounted) setPreviewHtml(item.documentEdits.htmlContent);
          return;
        }
        if (item.documentEdits?.textContent) {
          const formatted = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(
            item.documentEdits.textContent
          )}</pre>`;
          if (isMounted) setPreviewHtml(formatted);
          return;
        }

        // If it's an image
        if (item.category === 'image') {
          const url = item.resultUrl || URL.createObjectURL(item.file);
          const imgTag = `<div style="text-align: center;"><img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain;" /></div>`;
          if (isMounted) setPreviewHtml(imgTag);
          return;
        }

        // If it's a document/data file, convert to HTML for print preview
        const targetBlob = item.resultBlob || item.file;
        const htmlBlob = await convertDocument(
          targetBlob,
          item.ext,
          'html',
          item.documentEdits
        );
        const text = await htmlBlob.text();
        if (isMounted) {
          setPreviewHtml(text || `<p>${escapeHtml(item.name)}</p>`);
        }
      } catch (err) {
        if (isMounted) {
          setPreviewHtml(`<div style="padding: 20px; color: #ef4444;">Preview generation: ${err}</div>`);
        }
      } finally {
        if (isMounted) setLoadingPreview(false);
      }
    };

    loadContent();
    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  if (!isOpen) return null;

  const { widthMm, heightMm } = getPaperDimensions(settings.paperSize, settings.orientation);
  const aspectRatio = widthMm / heightMm;

  // Margin in pixels for preview
  const getMarginPixels = () => {
    switch (settings.margins) {
      case 'none':
        return 0;
      case 'compact':
        return 8;
      case 'wide':
        return 32;
      case 'normal':
      default:
        return 20;
    }
  };

  // Compute effective scale
  let calculatedScale = settings.customScale / 100;
  if (settings.fitToOnePage || settings.fitMode === 'single-page') {
    calculatedScale = 0.72; // condensed single page length-wise fit
  }

  const handlePrint = () => {
    executePrint(previewHtml, settings, item.name);
  };

  const handleExportPrintPdf = async () => {
    setIsExportingPdf(true);
    try {
      const source = item.resultBlob || item.file;
      const pdfBlob = await convertDocument(
        source,
        item.ext,
        'pdf',
        item.documentEdits,
        settings.fitToOnePage
      );
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `print-${item.name.replace(/\.[^/.]+$/, '')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error generating print-ready PDF: ' + err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-[6px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <Printer className="w-4 h-4 text-zinc-300" />
            <span className="text-sm font-semibold text-zinc-100">Print Studio</span>
            <span className="text-xs font-mono text-zinc-400">· {item.name}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Left Controls, Right WYSIWYG Paper Sheet */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Controls Panel */}
          <div className="md:col-span-5 border-r border-zinc-800/80 p-5 space-y-5 bg-zinc-950 text-xs">
            {/* Fit to One Page Feature */}
            <div className="p-3.5 rounded-[5px] bg-zinc-900/90 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                    <Minimize2 className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Fit to One Page (Length-wise)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Scales document so all content sits on a single side of paper.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.fitToOnePage}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSettings((prev) => ({
                        ...prev,
                        fitToOnePage: checked,
                        fitMode: checked ? 'single-page' : 'custom',
                      }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-zinc-200"></div>
                </label>
              </div>

              {!settings.fitToOnePage && (
                <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                  <div className="flex justify-between text-zinc-400">
                    <span>Manual Scale</span>
                    <span className="font-mono">{settings.customScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="5"
                    value={settings.customScale}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        customScale: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Paper Sizing & Orientation */}
            <div className="space-y-3">
              <div className="font-medium text-zinc-300 flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-zinc-400" />
                <span>Page Layout & Paper</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Paper Size</label>
                  <select
                    value={settings.paperSize}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        paperSize: e.target.value as PrintSettings['paperSize'],
                      }))
                    }
                    className="w-full rounded-[4px] bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-1.5 focus:border-zinc-600 focus:outline-hidden"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="legal">US Legal (8.5 × 14 in)</option>
                    <option value="tabloid">Tabloid (11 × 17 in)</option>
                    <option value="a3">A3 (297 × 420 mm)</option>
                    <option value="a5">A5 (148 × 210 mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Orientation</label>
                  <select
                    value={settings.orientation}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        orientation: e.target.value as PrintSettings['orientation'],
                      }))
                    }
                    className="w-full rounded-[4px] bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-1.5 focus:border-zinc-600 focus:outline-hidden"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              {/* Margins & N-up */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Margins</label>
                  <select
                    value={settings.margins}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        margins: e.target.value as PrintSettings['margins'],
                      }))
                    }
                    className="w-full rounded-[4px] bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-1.5 focus:border-zinc-600 focus:outline-hidden"
                  >
                    <option value="normal">Standard (15mm)</option>
                    <option value="compact">Compact (5mm)</option>
                    <option value="wide">Wide (25mm)</option>
                    <option value="none">Borderless (0mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Pages Per Sheet</label>
                  <select
                    value={settings.pagesPerSheet}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        pagesPerSheet: Number(e.target.value) as PrintSettings['pagesPerSheet'],
                      }))
                    }
                    className="w-full rounded-[4px] bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-1.5 focus:border-zinc-600 focus:outline-hidden"
                  >
                    <option value={1}>1 page (Standard)</option>
                    <option value={2}>2 pages (Side-by-side)</option>
                    <option value={4}>4 pages (2×2 Grid)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Color & Ink Preservation */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <label className="block text-[11px] text-zinc-400">Color Mode & Ink Saver</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['color', 'grayscale', 'bw'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, colorMode: mode }))}
                    className={`py-1.5 px-2 rounded-[4px] text-center capitalize transition-colors border ${
                      settings.colorMode === mode
                        ? 'bg-zinc-800 text-white border-zinc-600 font-medium'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {mode === 'bw' ? 'B&W Saver' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Header / Footer metadata */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={settings.includeHeader}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, includeHeader: e.target.checked }))
                  }
                  className="rounded-[3px] accent-zinc-400"
                />
                <span>Include document header & date</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={settings.includePageNumbers}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, includePageNumbers: e.target.checked }))
                  }
                  className="rounded-[3px] accent-zinc-400"
                />
                <span>Include page numbering footer</span>
              </label>
            </div>
          </div>

          {/* Right Preview: Virtual Print Sheet */}
          <div className="md:col-span-7 bg-zinc-900/40 p-6 flex flex-col items-center justify-center min-h-[420px] relative">
            {loadingPreview ? (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <RotateCw className="w-4 h-4 animate-spin text-zinc-400" />
                <span>Rendering sheet preview...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-full">
                {/* Physical sheet simulation */}
                <div
                  ref={previewSheetRef}
                  style={{
                    aspectRatio: `${aspectRatio}`,
                    width: settings.orientation === 'landscape' ? '420px' : '320px',
                    maxWidth: '100%',
                    padding: `${getMarginPixels()}px`,
                    filter:
                      settings.colorMode === 'grayscale'
                        ? 'grayscale(100%)'
                        : settings.colorMode === 'bw'
                        ? 'grayscale(100%) contrast(200%)'
                        : 'none',
                  }}
                  className="bg-white text-zinc-900 rounded-[2px] shadow-2xl relative overflow-hidden transition-all duration-200 border border-zinc-700/40"
                >
                  {/* Optional Header */}
                  {settings.includeHeader && (
                    <div className="border-b border-zinc-200 pb-1 mb-2 flex justify-between text-[8px] text-zinc-500 font-mono">
                      <span>{item.name}</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Scaled Content Container */}
                  <div
                    style={{
                      transform: `scale(${calculatedScale})`,
                      transformOrigin: 'top left',
                      width: `${100 / calculatedScale}%`,
                      maxHeight: settings.fitToOnePage ? `${100 / calculatedScale}%` : 'auto',
                      overflow: 'hidden',
                    }}
                    className="text-[10px] leading-relaxed text-zinc-800"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />

                  {/* Optional Footer */}
                  {settings.includePageNumbers && (
                    <div className="absolute bottom-1.5 right-3 text-[8px] text-zinc-400 font-mono">
                      Sheet 1 of 1
                    </div>
                  )}
                </div>

                {/* Sheet Metadata badge */}
                <div className="mt-4 px-3 py-1 rounded-[4px] bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                  <span>
                    {settings.paperSize.toUpperCase()} · {widthMm} × {heightMm} mm
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span>{settings.fitToOnePage ? 'Fit to 1 page (active)' : `${settings.customScale}% scale`}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/60">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-[4px] text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPrintPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating...' : 'Save as PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
          </div>
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
