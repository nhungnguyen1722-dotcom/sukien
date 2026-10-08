type SpreadsheetCell = string | number;

interface SpreadsheetColumn {
  header: string;
  width: number;
  style: number;
  headerStyle?: number;
  value: (row: Record<string, unknown>, index: number) => SpreadsheetCell;
}

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index: number): string {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function cellXml(reference: string, value: SpreadsheetCell, style: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}" s="${style}" t="n"><v>${value}</v></c>`;
  }
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

const columns: SpreadsheetColumn[] = [
  { header: 'STT', width: 7, style: 4, value: (_row, index) => index + 1 },
  { header: 'Mã hợp đồng', width: 19, style: 5, value: (row) => String(row.contract_code ?? '') },
  { header: 'Loại hợp đồng', width: 16, style: 5, value: (row) => String(row.contract_type ?? '') },
  { header: 'Ngày ký', width: 14, style: 6, value: (row) => String(row.contract_date_text ?? row.contract_date ?? '') },
  { header: 'Tên khách hàng', width: 29, style: 7, value: (row) => String(row.customer_name ?? '') },
  { header: 'SĐT khách hàng', width: 17, style: 8, value: (row) => String(row.customer_phone ?? '') },
  { header: 'Địa chỉ khách hàng', width: 32, style: 5, value: (row) => String(row.customer_address ?? '') },
  { header: 'Giá trị hợp đồng (VNĐ)', width: 22, style: 9, value: (row) => Number(row.value) || 0 },
  { header: 'Người chốt', width: 24, style: 10, headerStyle: 3, value: (row) => String(row.closer_name ?? '') },
  { header: 'SĐT người chốt', width: 18, style: 8, headerStyle: 3, value: (row) => String(row.closer_phone ?? '') },
  { header: 'Người giới thiệu', width: 24, style: 11, headerStyle: 3, value: (row) => String(row.referrer_name ?? '') },
  { header: 'SĐT người giới thiệu', width: 20, style: 8, headerStyle: 3, value: (row) => String(row.referrer_phone ?? '') },
  { header: 'Người hỗ trợ', width: 24, style: 12, value: (row) => String(row.supporter_name ?? '') },
  { header: 'SĐT người hỗ trợ', width: 19, style: 8, value: (row) => String(row.supporter_phone ?? '') },
  { header: 'Đội nhóm', width: 22, style: 13, value: (row) => String(row.team_name ?? '').trim() },
  { header: 'Trạng thái', width: 16, style: 14, value: (row) => String(row.status ?? '') },
];

function createWorksheet(rows: Record<string, unknown>[]): string {
  const lastRow = rows.length + 2;
  const endColumn = columnName(columns.length - 1);
  const widths = columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`).join('');

  const title = cellXml('A1', 'DANH SÁCH HỢP ĐỒNG — ĐẦY ĐỦ', 1);
  const headerCells = columns.map((column, index) => cellXml(`${columnName(index)}2`, column.header, column.headerStyle ?? 2)).join('');
  const dataRows = rows.map((row, rowIndex) => {
    const excelRow = rowIndex + 3;
    const cells = columns.map((column, columnIndex) => cellXml(
      `${columnName(columnIndex)}${excelRow}`,
      column.value(row, rowIndex),
      column.style,
    )).join('');
    return `<row r="${excelRow}" ht="22" customHeight="1">${cells}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<dimension ref="A1:${endColumn}${lastRow}"/>` +
    `<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="20"/><cols>${widths}</cols><sheetData>` +
    `<row r="1" ht="32" customHeight="1">${title}</row>` +
    `<row r="2" ht="36" customHeight="1">${headerCells}</row>` + dataRows +
    `</sheetData><autoFilter ref="A2:${endColumn}${lastRow}"/>` +
    `<mergeCells count="1"><mergeCell ref="A1:${endColumn}1"/></mergeCells>` +
    `<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>` +
    `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

function createStyles(): string {
  const border = '<border><left style="thin"><color rgb="FFB7C9DD"/></left><right style="thin"><color rgb="FFB7C9DD"/></right><top style="thin"><color rgb="FFB7C9DD"/></top><bottom style="thin"><color rgb="FFB7C9DD"/></bottom><diagonal/></border>';
  const xfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="3" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.## &quot;₫&quot;"/></numFmts>` +
    `<fonts count="6">` +
    `<font><sz val="10"/><color rgb="FF1F2937"/><name val="Arial"/></font>` +
    `<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FFFFFF00"/><name val="Arial"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF1F2937"/><name val="Arial"/></font>` +
    `<font><sz val="10"/><color rgb="FF2563EB"/><name val="Arial"/></font>` +
    `<font><b/><sz val="10"/><color rgb="FF6D28D9"/><name val="Arial"/></font>` +
    `</fonts><fills count="9">` +
    `<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF234A83"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFE4DFEC"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.match(/<xf /g)?.length ?? 0}">${xfs}</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleMedium9"/>` +
    `</styleSheet>`;
}

const crc32Table = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ ((value & 1) ? 0xEDB88320 : 0);
  }
  return value >>> 0;
});

function crc32(data: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function zipStore(entries: { name: string; content: string }[]): Buffer {
  const localParts: Buffer[] = [];
  const directoryParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.content, 'utf8');
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034B50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x0021, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, data);

    const directoryHeader = Buffer.alloc(46);
    directoryHeader.writeUInt32LE(0x02014B50, 0);
    directoryHeader.writeUInt16LE(20, 4);
    directoryHeader.writeUInt16LE(20, 6);
    directoryHeader.writeUInt16LE(0x0800, 8);
    directoryHeader.writeUInt16LE(0, 10);
    directoryHeader.writeUInt16LE(0, 12);
    directoryHeader.writeUInt16LE(0x0021, 14);
    directoryHeader.writeUInt32LE(checksum, 16);
    directoryHeader.writeUInt32LE(data.length, 20);
    directoryHeader.writeUInt32LE(data.length, 24);
    directoryHeader.writeUInt16LE(name.length, 28);
    directoryHeader.writeUInt16LE(0, 30);
    directoryHeader.writeUInt16LE(0, 32);
    directoryHeader.writeUInt16LE(0, 34);
    directoryHeader.writeUInt16LE(0, 36);
    directoryHeader.writeUInt32LE(0, 38);
    directoryHeader.writeUInt32LE(offset, 42);
    directoryParts.push(directoryHeader, name);
    offset += localHeader.length + name.length + data.length;
  }

  const directory = Buffer.concat(directoryParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, directory, end]);
}

export function createContractsWorkbook(rows: Record<string, unknown>[]): Buffer {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;
  const packageRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<bookViews><workbookView/></bookViews><sheets><sheet name="Danh sách hợp đồng" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  return zipStore([
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: packageRels },
    { name: 'xl/workbook.xml', content: workbook },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    { name: 'xl/worksheets/sheet1.xml', content: createWorksheet(rows) },
    { name: 'xl/styles.xml', content: createStyles() },
  ]);
}
