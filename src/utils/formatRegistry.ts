import type { FileCategory, FormatDefinition } from '../types';

export const FORMAT_REGISTRY: Record<string, FormatDefinition> = {
  // Documents
  pdf: {
    ext: 'pdf',
    name: 'Portable Document Format',
    category: 'document',
    mime: 'application/pdf',
    targets: ['png', 'jpg', 'webp', 'txt', 'html', 'pdf'],
  },
  docx: {
    ext: 'docx',
    name: 'Word Document',
    category: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    targets: ['pdf', 'html', 'txt', 'md', 'png', 'jpg'],
  },
  doc: {
    ext: 'doc',
    name: 'Legacy Word Document',
    category: 'document',
    mime: 'application/msword',
    targets: ['pdf', 'html', 'txt', 'md'],
  },
  txt: {
    ext: 'txt',
    name: 'Plain Text',
    category: 'document',
    mime: 'text/plain',
    targets: ['pdf', 'docx', 'md', 'html'],
  },
  md: {
    ext: 'md',
    name: 'Markdown Document',
    category: 'document',
    mime: 'text/markdown',
    targets: ['pdf', 'docx', 'html', 'txt'],
  },
  markdown: {
    ext: 'markdown',
    name: 'Markdown Document',
    category: 'document',
    mime: 'text/markdown',
    targets: ['pdf', 'docx', 'html', 'txt'],
  },
  html: {
    ext: 'html',
    name: 'HTML Web Page',
    category: 'document',
    mime: 'text/html',
    targets: ['pdf', 'docx', 'md', 'txt', 'png'],
  },
  rtf: {
    ext: 'rtf',
    name: 'Rich Text Format',
    category: 'document',
    mime: 'application/rtf',
    targets: ['txt', 'html', 'pdf', 'docx'],
  },
  epub: {
    ext: 'epub',
    name: 'Electronic Publication',
    category: 'document',
    mime: 'application/epub+zip',
    targets: ['txt', 'html', 'pdf'],
  },

  // Spreadsheets
  xlsx: {
    ext: 'xlsx',
    name: 'Excel Spreadsheet',
    category: 'spreadsheet',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    targets: ['csv', 'tsv', 'json', 'html', 'pdf'],
  },
  xls: {
    ext: 'xls',
    name: 'Legacy Excel Spreadsheet',
    category: 'spreadsheet',
    mime: 'application/vnd.ms-excel',
    targets: ['csv', 'tsv', 'json', 'html', 'pdf'],
  },
  csv: {
    ext: 'csv',
    name: 'Comma-Separated Values',
    category: 'spreadsheet',
    mime: 'text/csv',
    targets: ['xlsx', 'json', 'yaml', 'xml', 'sql', 'tsv', 'html', 'pdf'],
  },
  tsv: {
    ext: 'tsv',
    name: 'Tab-Separated Values',
    category: 'spreadsheet',
    mime: 'text/tab-separated-values',
    targets: ['xlsx', 'csv', 'json', 'xml', 'sql', 'html', 'pdf'],
  },

  // Data / Code
  json: {
    ext: 'json',
    name: 'JavaScript Object Notation',
    category: 'data',
    mime: 'application/json',
    targets: ['csv', 'tsv', 'yaml', 'xml', 'sql', 'txt'],
  },
  yaml: {
    ext: 'yaml',
    name: 'YAML Data',
    category: 'data',
    mime: 'text/yaml',
    targets: ['json', 'csv', 'xml', 'txt'],
  },
  yml: {
    ext: 'yml',
    name: 'YAML Data',
    category: 'data',
    mime: 'text/yaml',
    targets: ['json', 'csv', 'xml', 'txt'],
  },
  xml: {
    ext: 'xml',
    name: 'Extensible Markup Language',
    category: 'data',
    mime: 'application/xml',
    targets: ['json', 'csv', 'yaml', 'txt'],
  },
  sql: {
    ext: 'sql',
    name: 'Structured Query Language',
    category: 'data',
    mime: 'application/sql',
    targets: ['csv', 'json', 'tsv', 'txt'],
  },

  // Images
  jpg: {
    ext: 'jpg',
    name: 'JPEG Image',
    category: 'image',
    mime: 'image/jpeg',
    targets: ['png', 'webp', 'pdf', 'ico', 'bmp', 'svg'],
  },
  jpeg: {
    ext: 'jpeg',
    name: 'JPEG Image',
    category: 'image',
    mime: 'image/jpeg',
    targets: ['png', 'webp', 'pdf', 'ico', 'bmp', 'svg'],
  },
  png: {
    ext: 'png',
    name: 'Portable Network Graphics',
    category: 'image',
    mime: 'image/png',
    targets: ['jpg', 'webp', 'pdf', 'ico', 'bmp', 'svg'],
  },
  webp: {
    ext: 'webp',
    name: 'WebP Image',
    category: 'image',
    mime: 'image/webp',
    targets: ['png', 'jpg', 'pdf', 'ico', 'bmp'],
  },
  gif: {
    ext: 'gif',
    name: 'Graphics Interchange Format',
    category: 'image',
    mime: 'image/gif',
    targets: ['png', 'jpg', 'webp', 'pdf'],
  },
  bmp: {
    ext: 'bmp',
    name: 'Bitmap Image',
    category: 'image',
    mime: 'image/bmp',
    targets: ['png', 'jpg', 'webp', 'pdf', 'ico'],
  },
  svg: {
    ext: 'svg',
    name: 'Scalable Vector Graphics',
    category: 'image',
    mime: 'image/svg+xml',
    targets: ['png', 'jpg', 'webp', 'pdf', 'ico'],
  },
  ico: {
    ext: 'ico',
    name: 'Icon Image',
    category: 'image',
    mime: 'image/x-icon',
    targets: ['png', 'jpg', 'webp'],
  },
  tiff: {
    ext: 'tiff',
    name: 'Tagged Image File Format',
    category: 'image',
    mime: 'image/tiff',
    targets: ['png', 'jpg', 'webp', 'pdf'],
  },
  tif: {
    ext: 'tif',
    name: 'Tagged Image File Format',
    category: 'image',
    mime: 'image/tiff',
    targets: ['png', 'jpg', 'webp', 'pdf'],
  },

  // Audio
  mp3: {
    ext: 'mp3',
    name: 'MPEG-1 Audio Layer 3',
    category: 'audio',
    mime: 'audio/mpeg',
    targets: ['wav', 'ogg', 'webm'],
  },
  wav: {
    ext: 'wav',
    name: 'Waveform Audio File',
    category: 'audio',
    mime: 'audio/wav',
    targets: ['mp3', 'ogg', 'webm'],
  },
  ogg: {
    ext: 'ogg',
    name: 'Ogg Vorbis Audio',
    category: 'audio',
    mime: 'audio/ogg',
    targets: ['wav', 'mp3', 'webm'],
  },
  aac: {
    ext: 'aac',
    name: 'Advanced Audio Coding',
    category: 'audio',
    mime: 'audio/aac',
    targets: ['wav', 'mp3', 'ogg'],
  },
  m4a: {
    ext: 'm4a',
    name: 'MPEG-4 Audio',
    category: 'audio',
    mime: 'audio/mp4',
    targets: ['wav', 'mp3', 'ogg'],
  },
  flac: {
    ext: 'flac',
    name: 'Free Lossless Audio Codec',
    category: 'audio',
    mime: 'audio/flac',
    targets: ['wav', 'mp3', 'ogg'],
  },

  // Video
  mp4: {
    ext: 'mp4',
    name: 'MPEG-4 Video',
    category: 'video',
    mime: 'video/mp4',
    targets: ['gif', 'mp3', 'wav', 'webm', 'png', 'jpg'],
  },
  webm: {
    ext: 'webm',
    name: 'WebM Video',
    category: 'video',
    mime: 'video/webm',
    targets: ['gif', 'mp3', 'wav', 'mp4', 'png', 'jpg'],
  },
  mov: {
    ext: 'mov',
    name: 'QuickTime Movie',
    category: 'video',
    mime: 'video/quicktime',
    targets: ['mp4', 'webm', 'gif', 'mp3', 'wav', 'png', 'jpg'],
  },
  mkv: {
    ext: 'mkv',
    name: 'Matroska Video',
    category: 'video',
    mime: 'video/x-matroska',
    targets: ['webm', 'gif', 'mp3', 'wav', 'png', 'jpg'],
  },
  avi: {
    ext: 'avi',
    name: 'Audio Video Interleave',
    category: 'video',
    mime: 'video/x-msvideo',
    targets: ['mp4', 'webm', 'gif', 'mp3', 'wav', 'png'],
  },
};

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()!.toLowerCase().trim();
}

export function detectCategory(ext: string): FileCategory {
  const registered = FORMAT_REGISTRY[ext];
  if (registered) return registered.category;

  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'ico', 'tiff', 'avif'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'flv', 'wmv'].includes(ext)) return 'video';
  if (['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(ext)) return 'spreadsheet';
  if (['json', 'xml', 'yaml', 'yml', 'sql', 'graphql'].includes(ext)) return 'data';
  return 'document';
}

export function getAvailableTargets(ext: string): string[] {
  const format = FORMAT_REGISTRY[ext];
  if (format && format.targets.length > 0) {
    return format.targets;
  }

  // Fallbacks by category
  const category = detectCategory(ext);
  switch (category) {
    case 'image':
      return ['png', 'jpg', 'webp', 'pdf', 'ico', 'bmp'];
    case 'audio':
      return ['wav', 'mp3', 'ogg', 'webm'];
    case 'video':
      return ['gif', 'mp3', 'wav', 'webm', 'png'];
    case 'spreadsheet':
      return ['csv', 'xlsx', 'json', 'tsv', 'html', 'pdf'];
    case 'data':
      return ['json', 'csv', 'yaml', 'xml', 'txt'];
    case 'document':
    default:
      return ['pdf', 'txt', 'html', 'docx'];
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
