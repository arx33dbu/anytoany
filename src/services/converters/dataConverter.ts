import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Parse text file or blob into string
export async function blobToText(blob: Blob): Promise<string> {
  return await blob.text();
}

// Simple YAML to JSON and JSON to YAML without large dependency
export function jsonToYaml(obj: unknown, indent: number = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}null\n`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `${pad}${obj}\n`;
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes('"') || obj.includes(':')) {
      return `${pad}"${obj.replace(/"/g, '\\"')}"\n`;
    }
    return `${pad}${obj}\n`;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${pad}[]\n`;
    return obj
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const inner = jsonToYaml(item, indent + 1).trimStart();
          return `${pad}- ${inner}`;
        }
        return `${pad}- ${jsonToYaml(item, 0).trim()}`;
      })
      .join('\n') + '\n';
  }
  if (typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          return `${pad}${k}:\n${jsonToYaml(v, indent + 1)}`;
        }
        return `${pad}${k}: ${jsonToYaml(v, 0).trim()}\n`;
      })
      .join('');
  }
  return `${pad}${String(obj)}\n`;
}

// Convert JSON array or object to SQL Insert Statements
export function jsonToSql(jsonData: unknown, tableName: string = 'records'): string {
  const records = Array.isArray(jsonData) ? jsonData : [jsonData];
  if (records.length === 0 || typeof records[0] !== 'object') {
    return `-- No records found\n`;
  }

  const columns = Object.keys(records[0] as Record<string, unknown>);
  const createTable = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns.map((c) => `\`${c}\` TEXT`).join(',\n  ')}\n);\n\n`;

  const inserts = records.map((row) => {
    const values = columns.map((col) => {
      const val = (row as Record<string, unknown>)[col];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    return `INSERT INTO ${tableName} (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});`;
  });

  return createTable + inserts.join('\n');
}

// Convert Data table to PDF table
export async function dataToPdf(rows: unknown[][]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  page.drawText('Exported Data Sheet', {
    x: margin,
    y: y - 10,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 35;

  const rowHeight = 20;
  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const colWidth = (width - margin * 2) / Math.min(colCount, 8);

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    if (y < margin + 30) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }

    const row = rows[rIdx];
    const isHeader = rIdx === 0;

    for (let cIdx = 0; cIdx < Math.min(row.length, 8); cIdx++) {
      const cellText = String(row[cIdx] ?? '').slice(0, 24);
      page.drawText(cellText, {
        x: margin + cIdx * colWidth + 4,
        y: y + 5,
        size: isHeader ? 9 : 8,
        font: isHeader ? boldFont : font,
        color: isHeader ? rgb(0, 0, 0) : rgb(0.2, 0.2, 0.2),
      });
    }

    y -= rowHeight;
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function convertData(
  sourceBlob: Blob,
  sourceExt: string,
  targetExt: string
): Promise<Blob> {
  const sExt = sourceExt.toLowerCase().replace('.', '');
  const tExt = targetExt.toLowerCase().replace('.', '');

  // Handle XLSX / XLS input
  if (sExt === 'xlsx' || sExt === 'xls') {
    const arrayBuffer = await sourceBlob.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (tExt === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      return new Blob([csvOutput], { type: 'text/csv' });
    }
    if (tExt === 'tsv') {
      const tsvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
      return new Blob([tsvOutput], { type: 'text/tab-separated-values' });
    }
    if (tExt === 'json') {
      const jsonOutput = XLSX.utils.sheet_to_json(worksheet);
      return new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    }
    if (tExt === 'html') {
      const htmlOutput = XLSX.utils.sheet_to_html(worksheet);
      return new Blob([htmlOutput], { type: 'text/html' });
    }
    if (tExt === 'pdf') {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
      return await dataToPdf(rows);
    }
  }

  // Handle JSON input
  if (sExt === 'json') {
    const text = await blobToText(sourceBlob);
    const parsed = JSON.parse(text);

    if (tExt === 'yaml' || tExt === 'yml') {
      return new Blob([jsonToYaml(parsed)], { type: 'text/yaml' });
    }
    if (tExt === 'sql') {
      return new Blob([jsonToSql(parsed)], { type: 'application/sql' });
    }
    if (tExt === 'csv' || tExt === 'xlsx' || tExt === 'tsv') {
      const arrayData = Array.isArray(parsed) ? parsed : [parsed];
      const worksheet = XLSX.utils.json_to_sheet(arrayData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      if (tExt === 'xlsx') {
        const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
      if (tExt === 'tsv') {
        const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
        return new Blob([tsv], { type: 'text/tab-separated-values' });
      }
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new Blob([csv], { type: 'text/csv' });
    }
    if (tExt === 'xml') {
      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const body = rows.map((r) => {
        const fields = Object.entries(r).map(([k, v]) => `    <${k}>${String(v)}</${k}>`).join('\n');
        return `  <item>\n${fields}\n  </item>`;
      }).join('\n');
      return new Blob([xmlHeader + body + '\n</root>'], { type: 'application/xml' });
    }
    if (tExt === 'txt') {
      return new Blob([JSON.stringify(parsed, null, 2)], { type: 'text/plain' });
    }
  }

  // Handle CSV / TSV input
  if (sExt === 'csv' || sExt === 'tsv') {
    const text = await blobToText(sourceBlob);
    const workbook = XLSX.read(text, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (tExt === 'xlsx') {
      const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    if (tExt === 'json') {
      const json = XLSX.utils.sheet_to_json(sheet);
      return new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    }
    if (tExt === 'yaml') {
      const json = XLSX.utils.sheet_to_json(sheet);
      return new Blob([jsonToYaml(json)], { type: 'text/yaml' });
    }
    if (tExt === 'sql') {
      const json = XLSX.utils.sheet_to_json(sheet);
      return new Blob([jsonToSql(json)], { type: 'application/sql' });
    }
    if (tExt === 'html') {
      const html = XLSX.utils.sheet_to_html(sheet);
      return new Blob([html], { type: 'text/html' });
    }
    if (tExt === 'pdf') {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      return await dataToPdf(rows);
    }
  }

  // Fallback: raw text
  const raw = await blobToText(sourceBlob);
  return new Blob([raw], { type: 'text/plain' });
}
