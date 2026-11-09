import mammoth from 'mammoth';
import { marked } from 'marked';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { DocumentEditState } from '../../types';
import { extractPdfText, renderPdfToCanvases } from './pdfHelper';

// Read Blob to ArrayBuffer
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer();
}

// Convert DOCX to HTML
export async function docxToHtml(blob: Blob): Promise<string> {
  const arrayBuffer = await blobToArrayBuffer(blob);
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

// Convert DOCX to raw text
export async function docxToText(blob: Blob): Promise<string> {
  const arrayBuffer = await blobToArrayBuffer(blob);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Create a real Microsoft Word .docx from text or markdown
export async function textToDocx(content: string): Promise<Blob> {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^[-*]\s+/, ''),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { before: 80, after: 80 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

// Convert plain text or markdown to PDF with clean pagination
export async function textToPdf(text: string, fitToOnePage: boolean = false): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28; // A4 standard width in points
  const pageHeight = 841.89; // A4 standard height
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  // Split lines and word wrap
  const rawLines = text.split('\n');
  const wrappedLines: string[] = [];

  let baseFontSize = 10;
  let lineHeight = 14;

  const wrapText = (str: string, size: number) => {
    const words = str.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth <= usableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) wrappedLines.push(currentLine);
  };

  // If fitToOnePage is enabled, calculate the required font scale to fit on 1 sheet!
  if (fitToOnePage) {
    for (const line of rawLines) {
      wrapText(line, baseFontSize);
    }
    const totalLines = Math.max(1, wrappedLines.length);
    const maxLinesPossible = Math.floor(usableHeight / lineHeight);

    if (totalLines > maxLinesPossible) {
      const scaleFactor = maxLinesPossible / totalLines;
      baseFontSize = Math.max(4.5, baseFontSize * scaleFactor);
      lineHeight = baseFontSize * 1.35;
      // Re-wrap with smaller font size
      wrappedLines.length = 0;
      for (const line of rawLines) {
        wrapText(line, baseFontSize);
      }
    }
  } else {
    for (const line of rawLines) {
      wrapText(line, baseFontSize);
    }
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of wrappedLines) {
    if (y < margin + lineHeight && !fitToOnePage) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    page.drawText(line, {
      x: margin,
      y: y - baseFontSize,
      size: baseFontSize,
      font,
      color: rgb(0.12, 0.12, 0.14),
    });

    y -= lineHeight;
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// Multi-page PDF to single Fit-to-One-Page PDF
export async function fitPdfToOnePage(sourceBlob: Blob): Promise<Blob> {
  const arrayBuffer = await blobToArrayBuffer(sourceBlob);
  const srcDoc = await PDFDocument.load(arrayBuffer);
  const outDoc = await PDFDocument.create();

  const numPages = srcDoc.getPageCount();
  if (numPages === 0) return sourceBlob;
  if (numPages === 1) return sourceBlob;

  // Single page target
  const targetPage = outDoc.addPage([595.28, 841.89]); // A4
  const { width: tW, height: tH } = targetPage.getSize();
  const margin = 20;
  const availW = tW - margin * 2;
  const availH = tH - margin * 2;

  // Determine grid layout based on number of pages
  let cols = 1;
  let rows = numPages;

  if (numPages >= 2 && numPages <= 3) {
    cols = 1;
    rows = numPages;
  } else if (numPages === 4) {
    cols = 2;
    rows = 2;
  } else if (numPages <= 6) {
    cols = 2;
    rows = 3;
  } else {
    cols = Math.ceil(Math.sqrt(numPages));
    rows = Math.ceil(numPages / cols);
  }

  const cellW = availW / cols;
  const cellH = availH / rows;

  const embeddedPages = await outDoc.embedPdf(srcDoc, srcDoc.getPageIndices());

  embeddedPages.forEach((embPage, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const scale = Math.min((cellW - 8) / embPage.width, (cellH - 8) / embPage.height);
    const drawW = embPage.width * scale;
    const drawH = embPage.height * scale;

    const x = margin + col * cellW + (cellW - drawW) / 2;
    const y = tH - margin - (row + 1) * cellH + (cellH - drawH) / 2;

    targetPage.drawPage(embPage, {
      x,
      y,
      xScale: scale,
      yScale: scale,
    });
  });

  const bytes = await outDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// Convert Document
export async function convertDocument(
  sourceBlob: Blob,
  sourceExt: string,
  targetExt: string,
  edits?: DocumentEditState,
  fitToOnePage: boolean = false
): Promise<Blob> {
  const sExt = sourceExt.toLowerCase().replace('.', '');
  const tExt = targetExt.toLowerCase().replace('.', '');

  // 1. If user provided edited text/markdown, prioritize it
  let activeText = edits?.textContent;
  let activeHtml = edits?.htmlContent;

  if (!activeText && !activeHtml) {
    if (sExt === 'docx' || sExt === 'doc') {
      activeHtml = await docxToHtml(sourceBlob);
      activeText = await docxToText(sourceBlob);
    } else if (sExt === 'pdf') {
      activeText = await extractPdfText(sourceBlob);
    } else if (sExt === 'md' || sExt === 'markdown') {
      activeText = await sourceBlob.text();
      activeHtml = await marked.parse(activeText);
    } else if (sExt === 'html') {
      activeHtml = await sourceBlob.text();
      activeText = activeHtml.replace(/<[^>]+>/g, ' ');
    } else {
      activeText = await sourceBlob.text();
    }
  }

  // 2. Handle PDF output
  if (tExt === 'pdf') {
    if (sExt === 'pdf' && fitToOnePage) {
      return await fitPdfToOnePage(sourceBlob);
    }
    return await textToPdf(activeText || '', fitToOnePage);
  }

  // 3. Handle DOCX output
  if (tExt === 'docx') {
    return await textToDocx(activeText || '');
  }

  // 4. Handle HTML output
  if (tExt === 'html') {
    if (activeHtml) return new Blob([activeHtml], { type: 'text/html' });
    const rendered = await marked.parse(activeText || '');
    return new Blob([rendered], { type: 'text/html' });
  }

  // 5. Handle Markdown / TXT output
  if (tExt === 'md' || tExt === 'markdown' || tExt === 'txt') {
    return new Blob([activeText || ''], { type: 'text/plain' });
  }

  // 6. Handle PDF to Image (PNG / JPG)
  if (sExt === 'pdf' && (tExt === 'png' || tExt === 'jpg' || tExt === 'jpeg' || tExt === 'webp')) {
    const canvases = await renderPdfToCanvases(sourceBlob);
    if (canvases.length > 0) {
      const mime = tExt === 'jpg' || tExt === 'jpeg' ? 'image/jpeg' : tExt === 'webp' ? 'image/webp' : 'image/png';
      return new Promise((resolve) => {
        canvases[0].toBlob((blob) => resolve(blob || sourceBlob), mime, 0.92);
      });
    }
  }

  // Fallback: raw text
  return new Blob([activeText || ''], { type: 'text/plain' });
}
