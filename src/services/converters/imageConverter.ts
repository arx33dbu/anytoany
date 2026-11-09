import { PDFDocument } from 'pdf-lib';
import type { ImageEditState } from '../../types';

export async function loadImageElement(source: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.src = url;
    }
  });
}

export async function processImageEdits(
  img: HTMLImageElement,
  edits?: ImageEditState
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d canvas context');

  let width = edits?.resizeWidth || img.naturalWidth || img.width;
  let height = edits?.resizeHeight || img.naturalHeight || img.height;

  // Handle Crop if specified
  const crop = edits?.crop;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = img.naturalWidth || img.width;
  let sourceHeight = img.naturalHeight || img.height;

  if (crop && crop.width > 0 && crop.height > 0) {
    sourceX = crop.x;
    sourceY = crop.y;
    sourceWidth = crop.width;
    sourceHeight = crop.height;
    width = sourceWidth;
    height = sourceHeight;
  }

  // Handle Rotation 90 / 270 degrees swap width & height
  const rotate = (edits?.rotate || 0) % 360;
  const isPerpendicular = rotate === 90 || rotate === 270;
  canvas.width = isPerpendicular ? height : width;
  canvas.height = isPerpendicular ? width : height;

  ctx.save();

  // Move origin to center for rotation/flip
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (rotate !== 0) {
    ctx.rotate((rotate * Math.PI) / 180);
  }

  // Flip horizontal / vertical
  const scaleX = edits?.flipH ? -1 : 1;
  const scaleY = edits?.flipV ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  // Apply visual filters
  const filterList: string[] = [];
  if (edits?.brightness !== undefined && edits.brightness !== 100) {
    filterList.push(`brightness(${edits.brightness}%)`);
  }
  if (edits?.contrast !== undefined && edits.contrast !== 100) {
    filterList.push(`contrast(${edits.contrast}%)`);
  }
  if (edits?.grayscale) {
    filterList.push('grayscale(100%)');
  }
  if (edits?.invert) {
    filterList.push('invert(100%)');
  }
  if (edits?.sepia) {
    filterList.push('sepia(100%)');
  }

  if (filterList.length > 0) {
    ctx.filter = filterList.join(' ');
  }

  // Draw the image
  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    -width / 2,
    -height / 2,
    width,
    height
  );

  ctx.restore();

  // Add Watermark if provided
  if (edits?.watermarkText && edits.watermarkText.trim().length > 0) {
    ctx.save();
    const fontSize = Math.max(16, Math.floor(canvas.width / 30));
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const text = edits.watermarkText;
    const padding = 20;
    const textMetrics = ctx.measureText(text);

    let x = canvas.width - textMetrics.width - padding;
    let y = canvas.height - padding;

    if (edits.watermarkPosition === 'bottom-left') {
      x = padding;
      y = canvas.height - padding;
    } else if (edits.watermarkPosition === 'top-right') {
      x = canvas.width - textMetrics.width - padding;
      y = padding + fontSize;
    } else if (edits.watermarkPosition === 'center') {
      x = (canvas.width - textMetrics.width) / 2;
      y = canvas.height / 2;
    }

    ctx.fillText(text, x, y);
    ctx.restore();
  }

  return canvas;
}

export async function convertImage(
  sourceBlob: Blob,
  targetExt: string,
  edits?: ImageEditState,
  quality: number = 0.92
): Promise<Blob> {
  const img = await loadImageElement(sourceBlob);
  const canvas = await processImageEdits(img, edits);

  const normalizedTarget = targetExt.toLowerCase().replace('.', '');

  // Special case: Image -> PDF
  if (normalizedTarget === 'pdf') {
    return convertImageToPdf(canvas);
  }

  // Special case: ICO
  if (normalizedTarget === 'ico') {
    return generateIcoBlob(canvas);
  }

  // Standard mime types
  let mime = 'image/png';
  if (normalizedTarget === 'jpg' || normalizedTarget === 'jpeg') {
    mime = 'image/jpeg';
  } else if (normalizedTarget === 'webp') {
    mime = 'image/webp';
  } else if (normalizedTarget === 'bmp') {
    mime = 'image/bmp';
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image blob for ' + normalizedTarget));
      },
      mime,
      quality
    );
  });
}

export async function convertImageToPdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const pngDataUrl = canvas.toDataURL('image/png');
  const pngImage = await pdfDoc.embedPng(pngDataUrl);

  const imgDims = pngImage.scale(1);
  const page = pdfDoc.addPage([imgDims.width, imgDims.height]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: imgDims.width,
    height: imgDims.height,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// Generate an ICO format container from canvas
function generateIcoBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    // Resize down to 64x64 or 32x32 for icon compliance
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 32;
    iconCanvas.height = 32;
    const ctx = iconCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, 32, 32);
    }
    iconCanvas.toBlob((blob) => {
      // In modern browsers, a PNG file inside .ico container or direct PNG blob named .ico is supported
      resolve(blob || new Blob([], { type: 'image/x-icon' }));
    }, 'image/png');
  });
}
