import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { FileItem } from './components/FileItem';
import { BatchToolbar } from './components/BatchToolbar';
import { PrintModal } from './components/PrintModal';
import { EditorModal } from './components/EditorModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import type { ConversionItem, ImageEditState, MediaEditState, DocumentEditState } from './types';
import { detectCategory, formatFileSize, getAvailableTargets, getFileExtension } from './utils/formatRegistry';
import { convertSingleItem } from './services/conversionEngine';
import { exportFilesAsZip } from './utils/zipExporter';
import { createSampleDocument, createSampleImage, createSampleDataset } from './utils/sampleData';

export function App() {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  // Active modals
  const [activePrintItem, setActivePrintItem] = useState<ConversionItem | null>(null);
  const [activeEditItem, setActiveEditItem] = useState<ConversionItem | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Helper to append files to queue
  const addFilesToQueue = useCallback((newFiles: File[]) => {
    const newItems: ConversionItem[] = newFiles.map((file) => {
      const ext = getFileExtension(file.name) || 'txt';
      const category = detectCategory(ext);
      const targets = getAvailableTargets(ext);
      const defaultTarget = targets[0] || 'pdf';

      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        ext,
        size: file.size,
        category,
        targetExt: defaultTarget,
        status: 'idle',
        progress: 0,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  // Clipboard paste listener: paste screenshot, file, or text directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Check if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const filesToAdd: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) filesToAdd.push(file);
        } else if (item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString((text) => {
            if (text.trim().length > 0) {
              const textBlob = new Blob([text], { type: 'text/plain' });
              const textFile = new File([textBlob], `Pasted_Text_${Date.now().toString().slice(-4)}.txt`, {
                type: 'text/plain',
              });
              addFilesToQueue([textFile]);
            }
          });
        }
      }

      if (filesToAdd.length > 0) {
        addFilesToQueue(filesToAdd);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFilesToQueue]);

  // Target format change
  const handleTargetChange = (id: string, targetExt: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, targetExt, status: 'idle', progress: 0, resultBlob: undefined } : item
      )
    );
  };

  // Convert single item
  const handleConvertItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'converting', progress: 5, error: undefined } : i))
    );

    const startTime = performance.now();
    try {
      const { blob, filename } = await convertSingleItem(item, (pct) => {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, progress: pct } : i))
        );
      });

      const url = URL.createObjectURL(blob);
      const durationMs = Math.round(performance.now() - startTime);

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'completed',
                progress: 100,
                resultBlob: blob,
                resultUrl: url,
                resultName: filename,
                durationMs,
              }
            : i
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: 'error', progress: 0, error: errMsg } : i
        )
      );
    }
  };

  // Convert all pending items
  const handleConvertAll = async () => {
    setIsConvertingAll(true);
    for (const item of items) {
      if (item.status !== 'completed') {
        await handleConvertItem(item.id);
      }
    }
    setIsConvertingAll(false);
  };

  // Set all items to target format if supported
  const handleSetGlobalTarget = (targetExt: string) => {
    setItems((prev) =>
      prev.map((item) => {
        const available = getAvailableTargets(item.ext);
        if (available.includes(targetExt)) {
          return { ...item, targetExt, status: 'idle', progress: 0, resultBlob: undefined };
        }
        return item;
      })
    );
  };

  // Download converted single file
  const handleDownloadItem = (item: ConversionItem) => {
    if (!item.resultBlob) return;
    const url = item.resultUrl || URL.createObjectURL(item.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.resultName || `${item.name.replace(/\.[^/.]+$/, '')}.${item.targetExt}`;
    a.click();
  };

  // Download all completed as ZIP
  const handleDownloadAllZip = async () => {
    const completed = items.filter((i) => i.status === 'completed' && i.resultBlob);
    if (completed.length === 0) return;

    setIsZipping(true);
    try {
      const zipBlob = await exportFilesAsZip(completed);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anytoany_export_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to create ZIP: ' + err);
    } finally {
      setIsZipping(false);
    }
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  // Clear all items
  const handleClearAll = () => {
    items.forEach((i) => {
      if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
    });
    setItems([]);
  };

  // Clear completed only
  const handleClearCompleted = () => {
    setItems((prev) => {
      prev.filter((i) => i.status === 'completed').forEach((i) => {
        if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
      });
      return prev.filter((i) => i.status !== 'completed');
    });
  };

  // Load sample presets
  const handleLoadSample = async (type: 'doc' | 'image' | 'data') => {
    if (type === 'doc') {
      const docFile = createSampleDocument();
      addFilesToQueue([docFile]);
    } else if (type === 'image') {
      const imgFile = await createSampleImage();
      addFilesToQueue([imgFile]);
    } else if (type === 'data') {
      const dataFile = createSampleDataset();
      addFilesToQueue([dataFile]);
    }
  };

  // Save edits from EditorModal
  const handleSaveEdits = (
    id: string,
    edits: {
      imageEdits?: ImageEditState;
      mediaEdits?: MediaEditState;
      documentEdits?: DocumentEditState;
    }
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              ...edits,
              status: 'idle',
              progress: 0,
              resultBlob: undefined,
            }
          : i
      )
    );
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalBytes = items.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="min-h-screen bg-[#0c0d10] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Header */}
      <Header
        totalCount={items.length}
        completedCount={completedCount}
        totalSizeFormatted={formatFileSize(totalBytes)}
        onClearAll={handleClearAll}
        onDownloadZip={handleDownloadAllZip}
        isZipping={isZipping}
        onToggleShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* DropZone */}
        <DropZone onFilesSelected={addFilesToQueue} onLoadSample={handleLoadSample} />

        {/* Batch Toolbar */}
        {items.length > 0 && (
          <BatchToolbar
            totalCount={items.length}
            completedCount={completedCount}
            isConvertingAll={isConvertingAll}
            onConvertAll={handleConvertAll}
            onDownloadAllZip={handleDownloadAllZip}
            onClearCompleted={handleClearCompleted}
            onSetGlobalTarget={handleSetGlobalTarget}
          />
        )}

        {/* Queued Files List */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
              <span>QUEUE ({items.length})</span>
              <span>{completedCount} completed</span>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <FileItem
                  key={item.id}
                  item={item}
                  onTargetChange={handleTargetChange}
                  onConvert={handleConvertItem}
                  onEdit={(it) => setActiveEditItem(it)}
                  onPrint={(it) => setActivePrintItem(it)}
                  onRemove={handleRemoveItem}
                  onDownload={handleDownloadItem}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State Guidance (minimal, no AI marketing fluff) */}
        {items.length === 0 && (
          <div className="rounded-[5px] border border-zinc-800/60 bg-zinc-950/30 p-6 text-center text-xs text-zinc-400 font-mono space-y-2">
            <p className="text-zinc-400">
              Supported categories: Documents (DOCX, PDF, MD, HTML) · Images (PNG, JPG, WEBP, SVG) · Audio (WAV, MP3) · Video (MP4, WebM) · Data (CSV, JSON, XLSX)
            </p>
            <p className="text-zinc-400 text-[11px]">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded-[3px] bg-zinc-900 border border-zinc-800 text-zinc-300">Ctrl + V</kbd> anywhere to paste copied images or text directly.
            </p>
          </div>
        )}
      </main>

      {/* Print Studio Modal */}
      {activePrintItem && (
        <PrintModal
          item={activePrintItem}
          isOpen={Boolean(activePrintItem)}
          onClose={() => setActivePrintItem(null)}
        />
      )}

      {/* Editor Modal */}
      {activeEditItem && (
        <EditorModal
          item={activeEditItem}
          isOpen={Boolean(activeEditItem)}
          onClose={() => setActiveEditItem(null)}
          onSaveEdits={handleSaveEdits}
        />
      )}

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export default App;
