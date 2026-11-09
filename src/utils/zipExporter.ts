import JSZip from 'jszip';
import type { ConversionItem } from '../types';

export async function exportFilesAsZip(items: ConversionItem[]): Promise<Blob> {
  const zip = new JSZip();

  for (const item of items) {
    if (item.resultBlob && item.status === 'completed') {
      const filename = item.resultName || `${item.name.replace(/\.[^/.]+$/, '')}.${item.targetExt}`;
      zip.file(filename, item.resultBlob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  return content;
}
