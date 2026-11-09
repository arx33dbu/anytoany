import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';

export async function renderDocxToHtmlContainer(
  blob: Blob,
  container: HTMLElement
): Promise<void> {
  const arrayBuffer = await blob.arrayBuffer();
  container.innerHTML = '';
  await renderAsync(arrayBuffer, container, undefined, {
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,
    breakPages: true,
    ignoreLastRenderedPageBreak: false,
    experimental: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    useBase64URL: true,
  });
}

// Convert DOCX with 100% style fidelity (lines, gray background rectangles, table borders) to PDF
export async function convertDocxToFidelityPdf(
  blob: Blob,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const hiddenHost = document.createElement('div');
  hiddenHost.style.position = 'fixed';
  hiddenHost.style.left = '-99999px';
  hiddenHost.style.top = '0';
  hiddenHost.style.width = '820px';
  hiddenHost.style.background = '#ffffff';
  hiddenHost.style.color = '#000000';
  hiddenHost.style.zIndex = '-9999';
  document.body.appendChild(hiddenHost);

  try {
    onProgress?.(20);
    await renderDocxToHtmlContainer(blob, hiddenHost);
    onProgress?.(45);

    // Give browser brief tick to layout styles & images
    await new Promise((r) => setTimeout(r, 150));

    // Find all pages rendered by docx-preview
    const pages = hiddenHost.querySelectorAll<HTMLElement>('.docx-wrapper > section.docx-page, .docx-wrapper > article, .docx-page');
    const pdfDoc = await PDFDocument.create();

    const targets = pages.length > 0 ? Array.from(pages) : [hiddenHost];
    const total = targets.length;

    for (let idx = 0; idx < total; idx++) {
      const pageEl = targets[idx];
      const canvas = await html2canvas(pageEl, {
        scale: 2, // High DPI for crisp text and sharp lines
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const pngDataUrl = canvas.toDataURL('image/png');
      const pngImage = await pdfDoc.embedPng(pngDataUrl);

      // Standard A4 or element dimensions
      const ptWidth = 595.28;
      const ptHeight = 841.89;
      const pdfPage = pdfDoc.addPage([ptWidth, ptHeight]);

      const scale = Math.min(ptWidth / pngImage.width, ptHeight / pngImage.height);
      const drawWidth = pngImage.width * scale;
      const drawHeight = pngImage.height * scale;

      pdfPage.drawImage(pngImage, {
        x: (ptWidth - drawWidth) / 2,
        y: ptHeight - drawHeight - 10,
        width: drawWidth,
        height: drawHeight,
      });

      onProgress?.(45 + Math.round(((idx + 1) / total) * 50));
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  } finally {
    hiddenHost.remove();
  }
}

// Convert DOCX to styled standalone HTML containing all inline styles
export async function convertDocxToFidelityHtml(blob: Blob): Promise<string> {
  const hiddenHost = document.createElement('div');
  hiddenHost.style.display = 'none';
  document.body.appendChild(hiddenHost);

  try {
    await renderDocxToHtmlContainer(blob, hiddenHost);
    const styles = Array.from(hiddenHost.querySelectorAll('style'))
      .map((s) => s.outerHTML)
      .join('\n');
    const content = hiddenHost.innerHTML;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #111827; }
  .docx-wrapper { background: transparent !important; padding: 0 !important; }
  .docx-page { box-shadow: none !important; margin: 0 auto 20px auto !important; }
</style>
${styles}
</head>
<body>
${content}
</body>
</html>`;
  } finally {
    hiddenHost.remove();
  }
}
