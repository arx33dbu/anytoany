import type { ConversionItem } from '../types';
import { detectCategory } from '../utils/formatRegistry';
import { convertDocument } from './converters/documentConverter';
import { convertImage } from './converters/imageConverter';
import { convertAudio } from './converters/audioConverter';
import { convertVideo } from './converters/videoConverter';
import { convertData } from './converters/dataConverter';

export async function convertSingleItem(
  item: ConversionItem,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const sourceExt = item.ext.toLowerCase();
  const targetExt = item.targetExt.toLowerCase();
  const sourceCat = item.category || detectCategory(sourceExt);
  const baseName = item.name.replace(/\.[^/.]+$/, '');
  const outFilename = `${baseName}.${targetExt}`;

  onProgress?.(15);

  let resultBlob: Blob;

  // 1. Image source
  if (sourceCat === 'image') {
    onProgress?.(40);
    resultBlob = await convertImage(item.file, targetExt, item.imageEdits);
    onProgress?.(100);
    return { blob: resultBlob, filename: outFilename };
  }

  // 2. Audio source
  if (sourceCat === 'audio') {
    onProgress?.(30);
    resultBlob = await convertAudio(item.file, targetExt, item.mediaEdits);
    onProgress?.(100);
    return { blob: resultBlob, filename: outFilename };
  }

  // 3. Video source
  if (sourceCat === 'video') {
    onProgress?.(25);
    resultBlob = await convertVideo(item.file, targetExt, item.mediaEdits, onProgress);
    onProgress?.(100);
    return { blob: resultBlob, filename: outFilename };
  }

  // 4. Spreadsheet or Structured Data
  if (sourceCat === 'spreadsheet' || sourceCat === 'data') {
    onProgress?.(50);
    resultBlob = await convertData(item.file, sourceExt, targetExt);
    onProgress?.(100);
    return { blob: resultBlob, filename: outFilename };
  }

  // 5. Document source (default)
  onProgress?.(45);
  const fitToOnePage = Boolean(item.printSettings?.fitToOnePage);
  resultBlob = await convertDocument(
    item.file,
    sourceExt,
    targetExt,
    item.documentEdits,
    fitToOnePage
  );
  onProgress?.(100);
  return { blob: resultBlob, filename: outFilename };
}
