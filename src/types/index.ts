export type FileCategory = 
  | 'document' 
  | 'image' 
  | 'audio' 
  | 'video' 
  | 'spreadsheet' 
  | 'data';

export interface FormatDefinition {
  ext: string;
  name: string;
  category: FileCategory;
  mime: string;
  targets: string[]; // Supported target extensions to convert to
}

export interface PrintSettings {
  fitToOnePage: boolean; // Compress document to fit entirely on 1 single sheet length-wise
  fitMode: 'single-page' | 'fit-width' | 'fit-height' | 'custom';
  customScale: number; // 25 - 200%
  pagesPerSheet: 1 | 2 | 4 | 6; // N-up printing
  paperSize: 'a4' | 'letter' | 'legal' | 'tabloid' | 'a3' | 'a5';
  orientation: 'portrait' | 'landscape' | 'auto';
  margins: 'none' | 'compact' | 'normal' | 'wide';
  colorMode: 'color' | 'grayscale' | 'bw';
  includeHeader: boolean;
  includePageNumbers: boolean;
}

export interface ImageEditState {
  rotate: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  brightness: number; // 50 to 150
  contrast: number; // 50 to 150
  grayscale: boolean;
  invert: boolean;
  sepia: boolean;
  crop?: { x: number; y: number; width: number; height: number };
  resizeWidth?: number;
  resizeHeight?: number;
  watermarkText?: string;
  watermarkPosition?: 'bottom-right' | 'bottom-left' | 'center' | 'top-right';
}

export interface MediaEditState {
  trimStart: number; // in seconds
  trimEnd: number; // in seconds
  playbackRate: number; // 0.5, 1, 1.25, 1.5, 2
  volume: number; // 0 to 200%
  extractAudioOnly?: boolean;
}

export interface DocumentEditState {
  textContent?: string;
  htmlContent?: string;
  markdownContent?: string;
  annotations?: PdfAnnotation[];
  deletedPages?: number[];
  pageRotations?: Record<number, number>;
  modifiedBlob?: Blob;
}

export interface PdfAnnotation {
  id: string;
  pageIndex: number;
  type: 'text' | 'highlight' | 'rectangle' | 'line' | 'whiteout' | 'draw' | 'stamp';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
  points?: { x: number; y: number }[];
}

export interface ConversionItem {
  id: string;
  file: File;
  name: string;
  ext: string;
  size: number;
  category: FileCategory;
  targetExt: string;
  status: 'idle' | 'converting' | 'completed' | 'error';
  progress: number;
  resultBlob?: Blob;
  resultUrl?: string;
  resultName?: string;
  error?: string;
  durationMs?: number;

  // Custom edits made by user
  imageEdits?: ImageEditState;
  mediaEdits?: MediaEditState;
  documentEdits?: DocumentEditState;

  // Print settings override per document if desired
  printSettings?: Partial<PrintSettings>;
  previewUrl?: string;
}
