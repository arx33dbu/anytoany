import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Music,
  Type,
  Square,
  Minus,
  Highlighter,
  Eraser,
  PenTool,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  ConversionItem,
  ImageEditState,
  MediaEditState,
  DocumentEditState,
  PdfAnnotation,
} from '../types';
import { renderPdfToCanvases } from '../services/converters/pdfHelper';
import { convertDocxToFidelityPdf } from '../services/converters/docxRenderer';
import { processImageEdits, loadImageElement } from '../services/converters/imageConverter';
import { PDFDocument } from 'pdf-lib';

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

type EditorTool =
  | 'select'
  | 'text'
  | 'rectangle'
  | 'line'
  | 'highlight'
  | 'whiteout'
  | 'pen'
  | 'stamp';

export const EditorModal: React.FC<EditorModalProps> = ({
  item,
  isOpen,
  onClose,
  onSaveEdits,
}) => {
  // --- PDF / Document State ---
  const [pageCanvases, setPageCanvases] = useState<HTMLCanvasElement[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>(
    item.documentEdits?.annotations || []
  );
  const [pageRotations, setPageRotations] = useState<Record<number, number>>(
    item.documentEdits?.pageRotations || {}
  );
  const [deletedPages, setDeletedPages] = useState<number[]>(
    item.documentEdits?.deletedPages || []
  );

  // Active Tool & Styling Properties
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [textSize, setTextSize] = useState<number>(14);
  const [shapeFill, setShapeFill] = useState<string>('#e2e8f0'); // Default elegant gray rectangle
  const [shapeBorderColor, setShapeBorderColor] = useState<string>('#64748b');
  const [shapeBorderWidth, setShapeBorderWidth] = useState<number>(1);
  const [stampText, setStampText] = useState<string>('APPROVED');

  // Drawing & Canvas interaction state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- Image State ---
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
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- Media State (Audio & Video) ---
  const [mediaEdits, setMediaEdits] = useState<MediaEditState>({
    trimStart: item.mediaEdits?.trimStart || 0,
    trimEnd: item.mediaEdits?.trimEnd || 0,
    playbackRate: item.mediaEdits?.playbackRate || 1,
    volume: item.mediaEdits?.volume ?? 100,
    extractAudioOnly: item.mediaEdits?.extractAudioOnly || false,
  });
  const [mediaDuration, setMediaDuration] = useState<number>(0);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(true);

  const isDocumentType =
    item.category === 'document' ||
    item.category === 'spreadsheet' ||
    item.category === 'data' ||
    item.ext === 'pdf' ||
    item.ext === 'docx';

  // 1. Initialize Document / PDF page canvases
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingPages(true);

    const initPages = async () => {
      try {
        let pdfBlob: Blob = item.resultBlob || item.file;

        // If DOCX, convert to high-fidelity PDF preserving all gray rectangles & lines
        if (item.ext === 'docx' || item.ext === 'doc') {
          pdfBlob = await convertDocxToFidelityPdf(item.file);
        }

        if (item.ext === 'pdf' || item.ext === 'docx' || item.ext === 'doc') {
          const canvases = await renderPdfToCanvases(pdfBlob);
          if (isMounted) {
            setPageCanvases(canvases);
            setCurrentPageIndex(0);
          }
        }
      } catch (err) {
        console.error('Error rendering document canvases:', err);
      } finally {
        if (isMounted) setIsLoadingPages(false);
      }
    };

    if (isDocumentType) {
      initPages();
    } else if (item.category === 'image') {
      const url = URL.createObjectURL(item.file);
      setImagePreviewSrc(url);
      setIsLoadingPages(false);
    } else if (item.category === 'audio' || item.category === 'video') {
      const url = URL.createObjectURL(item.file);
      setImagePreviewSrc(url);
      setIsLoadingPages(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, item, isDocumentType]);

  // 2. Render overlays (annotations, shapes, lines, text) on the active page
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || pageCanvases.length === 0) return;

    const basePage = pageCanvases[currentPageIndex];
    if (!basePage) return;

    canvas.width = basePage.width;
    canvas.height = basePage.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter annotations for this page
    const pageAnns = annotations.filter((a) => a.pageIndex === currentPageIndex);

    pageAnns.forEach((ann) => {
      ctx.save();

      // Shape: Filled / Outlined Rectangle (including Gray Background Rectangles!)
      if (ann.type === 'rectangle') {
        if (ann.fillColor && ann.fillColor !== 'transparent') {
          ctx.fillStyle = ann.fillColor;
          ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        }
        if (ann.color && ann.strokeWidth && ann.strokeWidth > 0) {
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = ann.strokeWidth;
          ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        }
      }

      // Shape: Line / Divider
      if (ann.type === 'line') {
        ctx.strokeStyle = ann.color || '#000000';
        ctx.lineWidth = ann.strokeWidth || 2;
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + ann.width, ann.y + ann.height);
        ctx.stroke();
      }

      // Tool: Whiteout / Redact
      if (ann.type === 'whiteout') {
        ctx.fillStyle = ann.fillColor || '#ffffff';
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }

      // Tool: Highlighter
      if (ann.type === 'highlight') {
        ctx.fillStyle = ann.fillColor || 'rgba(254, 240, 138, 0.45)';
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }

      // Tool: Text Box
      if (ann.type === 'text') {
        if (ann.fillColor && ann.fillColor !== 'transparent') {
          ctx.fillStyle = ann.fillColor;
          ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        }
        ctx.fillStyle = ann.color || '#000000';
        ctx.font = `600 ${ann.fontSize || 14}px sans-serif`;
        ctx.fillText(ann.text || '', ann.x + 6, ann.y + (ann.fontSize || 14) + 4);
      }

      // Tool: Stamp
      if (ann.type === 'stamp') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(ann.x, ann.y, 140, 44);
        ctx.fillStyle = '#ef4444';
        ctx.font = '700 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ann.text || 'APPROVED', ann.x + 70, ann.y + 28);
      }

      // Tool: Freehand Drawing / Signature
      if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
        ctx.strokeStyle = ann.color || '#1e293b';
        ctx.lineWidth = ann.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    });

    // Render active drag box preview
    if (dragRect) {
      ctx.save();
      if (activeTool === 'rectangle') {
        ctx.fillStyle = shapeFill;
        ctx.fillRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
        ctx.strokeStyle = shapeBorderColor;
        ctx.lineWidth = shapeBorderWidth;
        ctx.strokeRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
      } else if (activeTool === 'line') {
        ctx.strokeStyle = shapeBorderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dragRect.x, dragRect.y);
        ctx.lineTo(dragRect.x + dragRect.width, dragRect.y);
        ctx.stroke();
      } else if (activeTool === 'highlight') {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
        ctx.fillRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
      } else if (activeTool === 'whiteout') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(dragRect.x, dragRect.y, dragRect.width, dragRect.height);
      }
      ctx.restore();
    }
  }, [
    annotations,
    currentPageIndex,
    pageCanvases,
    dragRect,
    activeTool,
    shapeFill,
    shapeBorderColor,
    shapeBorderWidth,
  ]);

  // Update image canvas preview whenever image edits change
  useEffect(() => {
    if (item.category !== 'image' || !imagePreviewSrc) return;

    let active = true;
    const renderCanvas = async () => {
      try {
        const img = await loadImageElement(imagePreviewSrc);
        const processed = await processImageEdits(img, imageEdits);
        if (active && imgCanvasRef.current) {
          const ctx = imgCanvasRef.current.getContext('2d');
          imgCanvasRef.current.width = processed.width;
          imgCanvasRef.current.height = processed.height;
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

  // Mouse Handlers on Document Overlay
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'select') return;
    const { x, y } = getCoordinates(e);

    if (activeTool === 'text') {
      const text = prompt('Enter text annotation:', 'Text note');
      if (text) {
        const newAnn: PdfAnnotation = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          pageIndex: currentPageIndex,
          type: 'text',
          x,
          y,
          width: text.length * (textSize * 0.65) + 16,
          height: textSize + 14,
          text,
          fontSize: textSize,
          color: textColor,
          fillColor: shapeFill === 'transparent' ? 'transparent' : shapeFill,
        };
        setAnnotations((prev) => [...prev, newAnn]);
      }
      return;
    }

    if (activeTool === 'stamp') {
      const newAnn: PdfAnnotation = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        pageIndex: currentPageIndex,
        type: 'stamp',
        x: Math.max(10, x - 70),
        y: Math.max(10, y - 22),
        width: 140,
        height: 44,
        text: stampText,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPoints([{ x, y }]);
      return;
    }

    // Drag shapes: rectangle, line, highlight, whiteout
    setDragStart({ x, y });
    setDragRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pen' && isDrawing) {
      const pt = getCoordinates(e);
      setCurrentPoints((prev) => [...prev, pt]);
      return;
    }

    if (dragStart) {
      const { x, y } = getCoordinates(e);
      const width = x - dragStart.x;
      const height = activeTool === 'line' ? 0 : y - dragStart.y;
      setDragRect({
        x: width < 0 ? x : dragStart.x,
        y: height < 0 ? y : dragStart.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'pen' && isDrawing && currentPoints.length > 1) {
      const newAnn: PdfAnnotation = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        pageIndex: currentPageIndex,
        type: 'draw',
        x: currentPoints[0].x,
        y: currentPoints[0].y,
        width: 100,
        height: 100,
        points: currentPoints,
        color: textColor,
        strokeWidth: 2,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }

    if (dragStart && dragRect && (dragRect.width > 5 || activeTool === 'line')) {
      const newAnn: PdfAnnotation = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        pageIndex: currentPageIndex,
        type: activeTool as PdfAnnotation['type'],
        x: dragRect.x,
        y: dragRect.y,
        width: Math.max(dragRect.width, 10),
        height: activeTool === 'line' ? 2 : Math.max(dragRect.height, 10),
        color: activeTool === 'rectangle' ? shapeBorderColor : activeTool === 'line' ? shapeBorderColor : undefined,
        fillColor:
          activeTool === 'rectangle'
            ? shapeFill
            : activeTool === 'highlight'
            ? 'rgba(254, 240, 138, 0.45)'
            : activeTool === 'whiteout'
            ? '#ffffff'
            : undefined,
        strokeWidth: activeTool === 'rectangle' ? shapeBorderWidth : activeTool === 'line' ? 2 : undefined,
      };
      setAnnotations((prev) => [...prev, newAnn]);
    }

    setDragStart(null);
    setDragRect(null);
  };

  const handleRotateCurrentPage = () => {
    setPageRotations((prev) => ({
      ...prev,
      [currentPageIndex]: ((prev[currentPageIndex] || 0) + 90) % 360,
    }));
  };

  const handleDeleteCurrentPage = () => {
    if (pageCanvases.length <= 1) {
      alert('Cannot delete the only page in the document.');
      return;
    }
    setDeletedPages((prev) => [...prev, currentPageIndex]);
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));
  };

  // Compile and Save Edits
  const handleSave = async () => {
    if (isDocumentType) {
      // Burn annotations and page rotations into final PDF
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < pageCanvases.length; i++) {
        if (deletedPages.includes(i)) continue;

        const baseCanvas = pageCanvases[i];
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = baseCanvas.width;
        combinedCanvas.height = baseCanvas.height;
        const ctx = combinedCanvas.getContext('2d');

        if (ctx) {
          // Draw base page
          ctx.drawImage(baseCanvas, 0, 0);

          // Draw annotations for page i
          const pageAnns = annotations.filter((a) => a.pageIndex === i);
          pageAnns.forEach((ann) => {
            ctx.save();
            if (ann.type === 'rectangle') {
              if (ann.fillColor && ann.fillColor !== 'transparent') {
                ctx.fillStyle = ann.fillColor;
                ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
              }
              if (ann.color && ann.strokeWidth) {
                ctx.strokeStyle = ann.color;
                ctx.lineWidth = ann.strokeWidth;
                ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
              }
            } else if (ann.type === 'line') {
              ctx.strokeStyle = ann.color || '#000000';
              ctx.lineWidth = ann.strokeWidth || 2;
              ctx.beginPath();
              ctx.moveTo(ann.x, ann.y);
              ctx.lineTo(ann.x + ann.width, ann.y + ann.height);
              ctx.stroke();
            } else if (ann.type === 'whiteout') {
              ctx.fillStyle = ann.fillColor || '#ffffff';
              ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
            } else if (ann.type === 'highlight') {
              ctx.fillStyle = ann.fillColor || 'rgba(254, 240, 138, 0.45)';
              ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
            } else if (ann.type === 'text') {
              if (ann.fillColor && ann.fillColor !== 'transparent') {
                ctx.fillStyle = ann.fillColor;
                ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
              }
              ctx.fillStyle = ann.color || '#000000';
              ctx.font = `600 ${ann.fontSize || 14}px sans-serif`;
              ctx.fillText(ann.text || '', ann.x + 6, ann.y + (ann.fontSize || 14) + 4);
            } else if (ann.type === 'stamp') {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 3;
              ctx.strokeRect(ann.x, ann.y, 140, 44);
              ctx.fillStyle = '#ef4444';
              ctx.font = '700 18px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(ann.text || 'APPROVED', ann.x + 70, ann.y + 28);
            } else if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
              ctx.strokeStyle = ann.color || '#1e293b';
              ctx.lineWidth = ann.strokeWidth || 2;
              ctx.beginPath();
              ctx.moveTo(ann.points[0].x, ann.points[0].y);
              for (let ptIdx = 1; ptIdx < ann.points.length; ptIdx++) {
                ctx.lineTo(ann.points[ptIdx].x, ann.points[ptIdx].y);
              }
              ctx.stroke();
            }
            ctx.restore();
          });

          const imgData = combinedCanvas.toDataURL('image/png');
          const pngImage = await pdfDoc.embedPng(imgData);
          const page = pdfDoc.addPage([combinedCanvas.width * 0.75, combinedCanvas.height * 0.75]);
          const rot = pageRotations[i] || 0;
          if (rot !== 0) {
            page.setRotation({ type: 'degrees', angle: rot } as unknown as Parameters<typeof page.setRotation>[0]);
          }
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: combinedCanvas.width * 0.75,
            height: combinedCanvas.height * 0.75,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const modifiedBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

      onSaveEdits(item.id, {
        documentEdits: {
          annotations,
          deletedPages,
          pageRotations,
          modifiedBlob,
        },
      });
    } else if (item.category === 'image') {
      onSaveEdits(item.id, { imageEdits });
    } else if (item.category === 'audio' || item.category === 'video') {
      onSaveEdits(item.id, { mediaEdits });
    }

    onClose();
  };

  const activePage = pageCanvases[currentPageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-hidden">
      <div className="relative w-full max-w-6xl bg-[#0c0d10] border border-zinc-800 rounded-[6px] shadow-2xl flex flex-col h-[94vh] overflow-hidden">
        {/* PDF Premium Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="px-2 py-0.5 rounded-[3px] bg-zinc-800 text-zinc-200 text-xs font-semibold font-mono">
              PDF Studio
            </div>
            <span className="text-sm font-medium text-zinc-100 truncate max-w-xs">{item.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-[4px] text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>

        {/* 1. DOCUMENT & PDF PREMIUM TOOLBAR */}
        {isDocumentType && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/90 text-xs">
            {/* Primary Editing Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTool('select')}
                className={`p-1.5 rounded-[4px] transition-colors ${
                  activeTool === 'select'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Select & Pan"
              >
                Pointer
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('text')}
                className={`p-1.5 rounded-[4px] transition-colors flex items-center gap-1 ${
                  activeTool === 'text'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Add Text Box"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Text</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('rectangle')}
                className={`p-1.5 rounded-[4px] transition-colors flex items-center gap-1 ${
                  activeTool === 'rectangle'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Draw Gray/Colored Rectangle Box"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Box</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('line')}
                className={`p-1.5 rounded-[4px] transition-colors flex items-center gap-1 ${
                  activeTool === 'line'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Draw Horizontal Line / Divider"
              >
                <Minus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Line</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('highlight')}
                className={`p-1.5 rounded-[4px] transition-colors flex items-center gap-1 ${
                  activeTool === 'highlight'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Text Highlighter"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Highlight</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('whiteout')}
                className={`p-1.5 rounded-[4px] transition-colors flex items-center gap-1 ${
                  activeTool === 'whiteout'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Whiteout / Redact section"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Whiteout</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('pen')}
                className={`p-1.5 rounded-[4px] transition-colors flex items-center gap-1 ${
                  activeTool === 'pen'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Signature & Freehand Pen"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Signature</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('stamp')}
                className={`p-1.5 rounded-[4px] transition-colors flex items-center gap-1 ${
                  activeTool === 'stamp'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Stamp"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stamp</span>
              </button>
            </div>

            {/* Tool Properties: Fill Colors (Gray, White, etc.), Line Thickness */}
            <div className="flex items-center gap-2">
              {activeTool === 'text' && (
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-[4px] border border-zinc-800">
                  <span className="text-[11px] text-zinc-400">Size:</span>
                  <select
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="bg-transparent text-zinc-200 text-[11px] font-mono focus:outline-hidden"
                  >
                    {[12, 14, 16, 18, 24, 32].map((s) => (
                      <option key={s} value={s} className="bg-zinc-900">
                        {s}px
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-zinc-400 ml-1">Color:</span>
                  {['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTextColor(c)}
                      className={`w-3.5 h-3.5 rounded-[2px] border ${
                        textColor === c ? 'ring-2 ring-zinc-400' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}

              {activeTool === 'rectangle' && (
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-[4px] border border-zinc-800">
                  <span className="text-[11px] text-zinc-400">Fill:</span>
                  {[
                    { label: 'Gray', val: '#e2e8f0' },
                    { label: 'Dark Gray', val: '#64748b' },
                    { label: 'White', val: '#ffffff' },
                    { label: 'Yellow', val: '#fef08a' },
                    { label: 'Clear', val: 'transparent' },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setShapeFill(c.val)}
                      className={`w-4 h-4 rounded-[2px] border ${
                        shapeFill === c.val ? 'ring-2 ring-zinc-400' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: c.val === 'transparent' ? '#000' : c.val }}
                      title={c.label}
                    />
                  ))}
                  <span className="text-[11px] text-zinc-400 ml-1">Border:</span>
                  <select
                    value={shapeBorderWidth}
                    onChange={(e) => setShapeBorderWidth(Number(e.target.value))}
                    className="bg-transparent text-zinc-200 text-[11px] font-mono focus:outline-hidden"
                  >
                    <option value={0} className="bg-zinc-900">0px</option>
                    <option value={1} className="bg-zinc-900">1px</option>
                    <option value={2} className="bg-zinc-900">2px</option>
                  </select>
                </div>
              )}

              {activeTool === 'line' && (
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-[4px] border border-zinc-800">
                  <span className="text-[11px] text-zinc-400">Line:</span>
                  {['#000000', '#64748b', '#cbd5e1', '#ef4444', '#3b82f6'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setShapeBorderColor(col)}
                      className={`w-4 h-4 rounded-[2px] border ${
                        shapeBorderColor === col ? 'ring-2 ring-zinc-400' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              )}

              {activeTool === 'stamp' && (
                <select
                  value={stampText}
                  onChange={(e) => setStampText(e.target.value)}
                  className="rounded-[3px] bg-zinc-950 border border-zinc-800 px-2 py-1 text-zinc-200 font-mono text-[11px]"
                >
                  <option value="APPROVED">APPROVED</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="FINAL">FINAL</option>
                  <option value="VOID">VOID</option>
                </select>
              )}

              {/* Page Controls */}
              <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                <button
                  type="button"
                  onClick={handleRotateCurrentPage}
                  className="p-1.5 rounded-[4px] text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Rotate Page 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCurrentPage}
                  className="p-1.5 rounded-[4px] text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                  title="Delete Page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.15))}
                  className="p-1 rounded-[3px] text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-zinc-300 w-10 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.15))}
                  className="p-1 rounded-[3px] text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Area */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-4 sm:p-6 flex justify-center items-start">
          {/* A. DOCUMENT & PDF PAGES */}
          {isDocumentType && (
            <div className="flex flex-col items-center gap-4 w-full">
              {isLoadingPages ? (
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 py-16">
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Loading document pages with 100% styling...</span>
                </div>
              ) : activePage ? (
                <div
                  ref={containerRef}
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top center',
                    transitionDuration: '0.1s',
                  }}
                  className="relative shadow-2xl rounded-[2px] border border-zinc-800 bg-white"
                >
                  {/* Base Rendered Page Canvas */}
                  <canvas
                    ref={(node) => {
                      if (node && activePage) {
                        node.width = activePage.width;
                        node.height = activePage.height;
                        const ctx = node.getContext('2d');
                        ctx?.drawImage(activePage, 0, 0);
                      }
                    }}
                    className="block"
                  />

                  {/* Interactive Annotation Overlay Canvas */}
                  <canvas
                    ref={overlayCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className={`absolute inset-0 z-10 ${
                      activeTool === 'select'
                        ? 'cursor-default'
                        : activeTool === 'pen'
                        ? 'cursor-crosshair'
                        : activeTool === 'text'
                        ? 'cursor-text'
                        : 'cursor-crosshair'
                    }`}
                  />
                </div>
              ) : (
                <div className="text-zinc-500 text-xs py-10">No pages found</div>
              )}
            </div>
          )}

          {/* B. IMAGE EDITOR VIEW */}
          {item.category === 'image' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full max-w-4xl">
              <div className="md:col-span-5 space-y-4 text-xs">
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
                    onClick={() => setImageEdits((prev) => ({ ...prev, flipH: !prev.flipH }))}
                    className={`p-1.5 rounded-[4px] border ${
                      imageEdits.flipH
                        ? 'bg-zinc-800 border-zinc-600 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageEdits((prev) => ({ ...prev, flipV: !prev.flipV }))}
                    className={`p-1.5 rounded-[4px] border ${
                      imageEdits.flipV
                        ? 'bg-zinc-800 border-zinc-600 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <FlipVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  <div className="flex justify-between text-zinc-400">
                    <span>Brightness</span>
                    <span className="font-mono">{imageEdits.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={imageEdits.brightness}
                    onChange={(e) =>
                      setImageEdits((prev) => ({ ...prev, brightness: Number(e.target.value) }))
                    }
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                  <div className="flex justify-between text-zinc-400">
                    <span>Contrast</span>
                    <span className="font-mono">{imageEdits.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={imageEdits.contrast}
                    onChange={(e) =>
                      setImageEdits((prev) => ({ ...prev, contrast: Number(e.target.value) }))
                    }
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="md:col-span-7 bg-zinc-900/50 rounded-[4px] border border-zinc-800 p-3 flex items-center justify-center min-h-[300px]">
                <canvas ref={imgCanvasRef} className="max-w-full max-h-[360px] object-contain shadow-lg" />
              </div>
            </div>
          )}

          {/* C. AUDIO / VIDEO TRIMMER VIEW */}
          {(item.category === 'audio' || item.category === 'video') && (
            <div className="space-y-4 text-xs w-full max-w-2xl">
              <div className="rounded-[4px] overflow-hidden bg-black flex items-center justify-center border border-zinc-800 max-h-[300px]">
                {item.category === 'video' ? (
                  <video
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    src={imagePreviewSrc}
                    controls
                    onLoadedMetadata={(e) => {
                      const dur = (e.target as HTMLVideoElement).duration;
                      setMediaDuration(dur);
                      if (mediaEdits.trimEnd === 0) setMediaEdits((p) => ({ ...p, trimEnd: dur }));
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
                        if (mediaEdits.trimEnd === 0) setMediaEdits((p) => ({ ...p, trimEnd: dur }));
                      }}
                      className="w-full max-w-md"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-[4px] bg-zinc-900 border border-zinc-800">
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>Trim Start</span>
                    <span className="font-mono">{mediaEdits.trimStart.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={mediaDuration || 60}
                    step="0.1"
                    value={mediaEdits.trimStart}
                    onChange={(e) => setMediaEdits((p) => ({ ...p, trimStart: Number(e.target.value) }))}
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>Trim End</span>
                    <span className="font-mono">{(mediaEdits.trimEnd || mediaDuration).toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={mediaDuration || 60}
                    step="0.1"
                    value={mediaEdits.trimEnd || mediaDuration}
                    onChange={(e) => setMediaEdits((p) => ({ ...p, trimEnd: Number(e.target.value) }))}
                    className="w-full accent-zinc-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PDF Premium Bottom Navigation Rail */}
        {isDocumentType && pageCanvases.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-950 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                disabled={currentPageIndex === 0}
                className="p-1 rounded-[3px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono text-zinc-300">
                Page {currentPageIndex + 1} of {pageCanvases.length}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPageIndex((p) => Math.min(pageCanvases.length - 1, p + 1))}
                disabled={currentPageIndex === pageCanvases.length - 1}
                className="p-1 rounded-[3px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] font-mono text-zinc-400">
              {annotations.filter((a) => a.pageIndex === currentPageIndex).length} edits on this page
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
