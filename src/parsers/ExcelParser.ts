import * as ExcelJS from 'exceljs';
import { ParsedData } from '../types';

export class ExcelParser {
  async parseAll(filePath: string): Promise<ParsedData[]> {
    try {
      return await this.parseAllWithWorkbook(filePath);
    } catch (primaryError) {
      const fallback = await this.tryParseAllWithZipXml(filePath)
        ?? await this.tryParseAllWithStreamReader(filePath);
      if (fallback && fallback.length > 0) return fallback;

      const message = primaryError instanceof Error ? primaryError.message : String(primaryError);
      if (message.includes(`reading 'sheets'`)) {
        throw new Error('Invalid or unsupported Excel workbook structure. Please re-save the file as .xlsx and try again.');
      }
      throw primaryError;
    }
  }

  async parse(filePath: string, sheetName?: string): Promise<ParsedData> {
    const allSheets = await this.parseAll(filePath);
    if (allSheets.length === 0) {
      throw new Error('No data found in the workbook');
    }

    if (sheetName) {
      const found = allSheets.find((sheet) => sheet.tableName === sheetName);
      if (!found) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }
      return found;
    }

    return allSheets[0];
  }

  async getSheetNames(filePath: string): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook.worksheets.map(sheet => sheet.name);
  }

  private async parseAllWithWorkbook(filePath: string): Promise<ParsedData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const parsedSheets: ParsedData[] = [];

    for (const worksheet of workbook.worksheets) {
      const rows: any[][] = [];
      let headers: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        const rowData = values.slice(1).map((cell) => this.normalizeCellValue(cell));

        if (rowNumber === 1) {
          headers = rowData.map(cell => String(cell ?? ''));
        } else {
          rows.push(rowData);
        }
      });

      if (headers.length === 0) continue;
      parsedSheets.push(this.buildParsedData(worksheet.name, headers, rows));
    }

    if (parsedSheets.length === 0) {
      throw new Error('No data found in the workbook');
    }

    return parsedSheets;
  }

  private async tryParseAllWithStreamReader(filePath: string): Promise<ParsedData[] | null> {
    try {
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        entries: 'emit',
        worksheets: 'emit',
        sharedStrings: 'cache'
      });

      const parsedSheets: ParsedData[] = [];

      for await (const worksheetReader of workbookReader) {
        const worksheetName = String((worksheetReader as any)?.name || '');
        let headers: string[] = [];
        const rows: any[][] = [];

        for await (const row of worksheetReader) {
          const rowData = (Array.isArray(row.values) ? row.values.slice(1) : [])
            .map((cell) => this.normalizeCellValue(cell));

          if (headers.length === 0) {
            headers = rowData.map((cell) => String(cell ?? ''));
          } else {
            rows.push(rowData);
          }
        }

        if (headers.length > 0) {
          parsedSheets.push(this.buildParsedData(worksheetName || `Sheet${parsedSheets.length + 1}`, headers, rows));
        }
      }

      return parsedSheets.length > 0 ? parsedSheets : null;
    } catch {
      return null;
    }
  }

  private async tryParseAllWithZipXml(filePath: string): Promise<ParsedData[] | null> {
    try {
      const fs = await import('fs/promises');
      const jszipModule: any = await import('jszip');
      const JSZip = jszipModule?.default || jszipModule;
      const fileBuffer = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(fileBuffer);

      const workbookFile = zip.file('xl/workbook.xml');
      const relsFile = zip.file('xl/_rels/workbook.xml.rels');
      if (!workbookFile || !relsFile) return null;

      const workbookXml = String(await workbookFile.async('string'));
      const relsXml = String(await relsFile.async('string'));
      const sharedStrings = await this.readSharedStringsFromZip(zip);

      const sheets = this.parseWorkbookSheets(workbookXml);
      const worksheetTargets = this.parseWorksheetTargets(relsXml);
      if (sheets.length === 0 || Object.keys(worksheetTargets).length === 0) return null;
      const parsedSheets: ParsedData[] = [];

      for (const candidate of sheets) {
        const target = worksheetTargets[candidate.rId];
        if (!target) continue;
        const normalizedTarget = target.replace(/^\/+/, '');
        const worksheetFile = zip.file(normalizedTarget);
        if (!worksheetFile) continue;

        const worksheetXml = String(await worksheetFile.async('string'));
        const parsed = this.parseWorksheetXml(candidate.name, worksheetXml, sharedStrings);
        if (parsed) parsedSheets.push(parsed);
      }

      return parsedSheets.length > 0 ? parsedSheets : null;
    } catch {
      return null;
    }
  }

  private async readSharedStringsFromZip(zip: any): Promise<string[]> {
    const file = zip.file('xl/sharedStrings.xml');
    if (!file) return [];

    const xml = String(await file.async('string'));
    const strings: string[] = [];
    const siRegex = /<(?:[A-Za-z_][\w.-]*:)?si\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?si>/g;
    let match: RegExpExecArray | null;

    while ((match = siRegex.exec(xml)) !== null) {
      strings.push(this.collectTextNodes(match[1] || ''));
    }

    return strings;
  }

  private parseWorkbookSheets(workbookXml: string): Array<{ name: string; rId: string }> {
    const sheets: Array<{ name: string; rId: string }> = [];
    const sheetRegex = /<(?:[A-Za-z_][\w.-]*:)?sheet\b([^>]*)\/?>/g;
    let match: RegExpExecArray | null;

    while ((match = sheetRegex.exec(workbookXml)) !== null) {
      const attrs = match[1] || '';
      const name = this.extractAttr(attrs, 'name');
      const rId = this.extractAttr(attrs, 'r:id');
      if (!name || !rId) continue;
      sheets.push({ name: this.decodeXmlText(name), rId });
    }

    return sheets;
  }

  private parseWorksheetTargets(relsXml: string): Record<string, string> {
    const targets: Record<string, string> = {};
    const relRegex = /<(?:[A-Za-z_][\w.-]*:)?Relationship\b([^>]*)\/?>/g;
    let match: RegExpExecArray | null;

    while ((match = relRegex.exec(relsXml)) !== null) {
      const attrs = match[1] || '';
      const id = this.extractAttr(attrs, 'Id');
      const type = this.extractAttr(attrs, 'Type');
      const target = this.extractAttr(attrs, 'Target');
      if (!id || !type || !target) continue;
      if (!type.includes('/worksheet')) continue;
      targets[id] = target;
    }

    return targets;
  }

  private parseWorksheetXml(tableName: string, worksheetXml: string, sharedStrings: string[]): ParsedData | null {
    const rowRegex = /<(?:[A-Za-z_][\w.-]*:)?row\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?row>/g;
    const cellRegex = /<(?:[A-Za-z_][\w.-]*:)?c\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?c>|<(?:[A-Za-z_][\w.-]*:)?c\b([^>]*)\/>/g;
    const rows: any[][] = [];
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(worksheetXml)) !== null) {
      const rowInnerXml = rowMatch[1] || '';
      const rowValues: any[] = [];
      let cellMatch: RegExpExecArray | null;
      let nextColumnIndex = 0;

      while ((cellMatch = cellRegex.exec(rowInnerXml)) !== null) {
        const attrs = (cellMatch[1] || cellMatch[3] || '').trim();
        const innerXml = cellMatch[2] || '';
        const ref = this.extractAttr(attrs, 'r');
        const type = this.extractAttr(attrs, 't') || '';
        const colIndex = ref ? this.columnRefToIndex(ref) : nextColumnIndex;
        if (colIndex < 0) continue;

        const value = this.parseCellValue(type, innerXml, sharedStrings);
        rowValues[colIndex] = value;
        nextColumnIndex = colIndex + 1;
      }

      if (rowValues.length > 0) {
        rows.push(rowValues);
      }
    }

    if (rows.length === 0) return null;

    const headerRowIndex = rows.findIndex((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
    if (headerRowIndex < 0) return null;

    const headersRaw = rows[headerRowIndex];
    const headers = headersRaw.map((cell, idx) => {
      const text = String(cell ?? '').trim();
      return text || `column_${idx + 1}`;
    });

    const dataRows = rows
      .slice(headerRowIndex + 1)
      .map((row) => {
        const normalized = Array.from({ length: headers.length }, (_, idx) => this.normalizeCellValue(row[idx]));
        return normalized;
      })
      .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));

    return this.buildParsedData(tableName, headers, dataRows);
  }

  private parseCellValue(type: string, innerXml: string, sharedStrings: string[]): any {
    const normalizedType = String(type || '').trim();
    const inlineText = this.collectTextNodes(innerXml);

    if (normalizedType === 'inlineStr') {
      return inlineText;
    }

    const valueMatch = /<(?:[A-Za-z_][\w.-]*:)?v\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?v>/.exec(innerXml);
    const rawValue = this.decodeXmlText(valueMatch?.[1] || '');

    if (normalizedType === 's') {
      const sharedIndex = Number(rawValue);
      if (Number.isFinite(sharedIndex) && sharedIndex >= 0 && sharedIndex < sharedStrings.length) {
        return sharedStrings[sharedIndex];
      }
      return rawValue;
    }

    if (normalizedType === 'b') {
      return rawValue === '1' || rawValue.toLowerCase() === 'true';
    }

    if (normalizedType === 'n' || normalizedType === '') {
      const num = Number(rawValue);
      if (Number.isFinite(num)) return num;
    }

    return rawValue || inlineText;
  }

  private collectTextNodes(xml: string): string {
    const textRegex = /<(?:[A-Za-z_][\w.-]*:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?t>/g;
    const chunks: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = textRegex.exec(xml)) !== null) {
      chunks.push(this.decodeXmlText(match[1] || ''));
    }
    return chunks.join('');
  }

  private columnRefToIndex(cellRef: string): number {
    const match = /^([A-Za-z]+)\d+$/.exec(String(cellRef).trim());
    if (!match) return -1;
    const letters = match[1].toUpperCase();
    let index = 0;
    for (const ch of letters) {
      index = index * 26 + (ch.charCodeAt(0) - 64);
    }
    return index - 1;
  }

  private extractAttr(attrs: string, key: string): string | null {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`\\b${escapedKey}="([^"]*)"`).exec(attrs);
    return match ? match[1] : null;
  }

  private decodeXmlText(value: string): string {
    return String(value || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#([0-9]+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  }

  private buildParsedData(tableName: string, headers: string[], rows: any[][]): ParsedData {
    const dataTypes = this.inferDataTypes(rows, headers);
    return {
      tableName,
      headers,
      rows,
      metadata: {
        rowCount: rows.length,
        columnCount: headers.length,
        dataTypes
      }
    };
  }

  private normalizeCellValue(cell: any): any {
    if (cell === null || cell === undefined) return '';
    if (cell instanceof Date) return cell.toISOString();
    if (typeof cell === 'object') {
      if (Object.prototype.hasOwnProperty.call(cell, 'result')) return (cell as any).result;
      if (Object.prototype.hasOwnProperty.call(cell, 'text')) return (cell as any).text;
      if (Object.prototype.hasOwnProperty.call(cell, 'hyperlink')) return (cell as any).hyperlink;
    }
    return cell;
  }

  private inferDataTypes(rows: any[][], headers: string[]): Record<string, string> {
    const dataTypes: Record<string, string> = {};

    headers.forEach((header, index) => {
      const sample = rows.slice(0, 100).map(row => row[index]);
      dataTypes[header] = this.inferColumnType(sample);
    });

    return dataTypes;
  }

  private inferColumnType(values: any[]): string {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (nonNullValues.length === 0) return 'string';

    const isNumeric = nonNullValues.every(v => typeof v === 'number' || !isNaN(Number(v)));
    const isInteger = isNumeric && nonNullValues.every(v => {
      const num = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(num);
    });
    const isBoolean = nonNullValues.every(v =>
      v === true || v === false || v === 'true' || v === 'false' || v === 1 || v === 0
    );
    const isDate = nonNullValues.every(v => {
      if (v instanceof Date) return true;
      // ExcelJS automatically converts Excel dates to Date objects
      if (typeof v === 'string') return !isNaN(Date.parse(v));
      return false;
    });

    if (isBoolean) return 'boolean';
    if (isInteger) return 'integer';
    if (isNumeric) return 'number';
    if (isDate) return 'date';
    return 'string';
  }
}
