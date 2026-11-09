import type { PrintSettings } from '../types';

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  fitToOnePage: true,
  fitMode: 'single-page',
  customScale: 100,
  pagesPerSheet: 1,
  paperSize: 'a4',
  orientation: 'portrait',
  margins: 'normal',
  colorMode: 'color',
  includeHeader: false,
  includePageNumbers: true,
};

export function getPaperDimensions(size: PrintSettings['paperSize'], orientation: PrintSettings['orientation']) {
  let widthMm = 210;
  let heightMm = 297;

  switch (size) {
    case 'letter':
      widthMm = 215.9;
      heightMm = 279.4;
      break;
    case 'legal':
      widthMm = 215.9;
      heightMm = 355.6;
      break;
    case 'tabloid':
      widthMm = 279.4;
      heightMm = 431.8;
      break;
    case 'a3':
      widthMm = 297;
      heightMm = 420;
      break;
    case 'a5':
      widthMm = 148;
      heightMm = 210;
      break;
    case 'a4':
    default:
      widthMm = 210;
      heightMm = 297;
      break;
  }

  if (orientation === 'landscape') {
    return { widthMm: heightMm, heightMm: widthMm };
  }
  return { widthMm, heightMm };
}

export function executePrint(
  contentHtml: string,
  settings: PrintSettings,
  documentTitle: string = 'Document'
) {
  // Create a dedicated hidden iframe for clean printing without UI interference
  const existingFrame = document.getElementById('print-iframe');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const { widthMm, heightMm } = getPaperDimensions(settings.paperSize, settings.orientation);

  let marginVal = '15mm';
  if (settings.margins === 'none') marginVal = '0mm';
  if (settings.margins === 'compact') marginVal = '5mm';
  if (settings.margins === 'wide') marginVal = '25mm';

  // Calculate filter for color mode
  let colorFilter = 'none';
  if (settings.colorMode === 'grayscale') colorFilter = 'grayscale(100%)';
  if (settings.colorMode === 'bw') colorFilter = 'grayscale(100%) contrast(200%)';

  // Fit to one page scaling style
  let fitCss = '';
  if (settings.fitToOnePage || settings.fitMode === 'single-page') {
    fitCss = `
      @page {
        size: ${widthMm}mm ${heightMm}mm;
        margin: ${marginVal};
      }
      html, body {
        width: 100%;
        height: 100%;
        max-height: 100vh;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .printable-content {
        transform-origin: top left;
        max-height: 100vh;
        page-break-inside: avoid;
        page-break-after: avoid;
        page-break-before: avoid;
      }
    `;
  } else {
    fitCss = `
      @page {
        size: ${widthMm}mm ${heightMm}mm;
        margin: ${marginVal};
      }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff !important;
      }
    `;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <style>
          ${fitCss}
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #111827;
            filter: ${colorFilter};
            line-height: 1.5;
            font-size: 11pt;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 6px 10px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
          }
          pre, code {
            font-family: monospace;
            background: #f4f4f5;
            padding: 2px 4px;
            font-size: 10pt;
          }
          pre {
            padding: 10px;
            overflow-x: auto;
          }
          .header-bar {
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 12px;
            padding-bottom: 6px;
            font-size: 9pt;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
          }
          .footer-bar {
            border-top: 1px solid #e5e7eb;
            margin-top: 12px;
            padding-top: 6px;
            font-size: 8pt;
            color: #9ca3af;
            text-align: right;
          }
        </style>
      </head>
      <body>
        ${settings.includeHeader ? `<div class="header-bar"><span>${documentTitle}</span><span>${new Date().toLocaleDateString()}</span></div>` : ''}
        <div class="printable-content" id="print-content">
          ${contentHtml}
        </div>
        ${settings.includePageNumbers ? `<div class="footer-bar">Page 1 of 1</div>` : ''}
      </body>
    </html>
  `);
  doc.close();

  // Wait for images to load inside iframe before calling print
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 350);
}
