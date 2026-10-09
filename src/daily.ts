export type Cell = string | number | boolean | null;
export type Sheet = { sheet: string; data: Cell[][] };
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function cellDate(value: Cell): string | null {
  if (typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return validDate(value.trim()) ? value.trim() : null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year.length === 2 ? '20' + year : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return validDate(iso) ? iso : null;
}
// Indian date order (day/month/year). Never choose the first row or combine dates.
export function selectDailyRow(sheets: unknown, date: string) {
  if (!validDate(date) || !Array.isArray(sheets) || sheets.length < 1 || sheets.length > 20) throw new Error('Choose a valid reporting date and Excel file.');
  const matches: { sheet: string; row: number; cells: { label: string; value: Cell }[] }[] = [];
  let count = 0;
  for (const sheet of sheets) {
    if (!sheet || typeof sheet.sheet !== 'string' || sheet.sheet.length > 200 || !Array.isArray(sheet.data)) throw new Error('Choose a valid Excel file.');
    let headings: Cell[] | null = null; let dateColumn = -1;
    for (const [index, row] of sheet.data.entries()) {
      if (!Array.isArray(row) || row.length > 100 || (count += row.length) > 50000) throw new Error('Excel file is too large. Use a smaller daily report.');
      for (const cell of row) if (cell !== null && !(typeof cell === 'string' && cell.length <= 1000) && !(typeof cell === 'number' && Number.isFinite(cell)) && typeof cell !== 'boolean') throw new Error('Choose a valid Excel file.');
      const candidate = row.findIndex((cell: Cell) => typeof cell === 'string' && /^(date|reporting date)$/i.test(cell.trim()));
      if (candidate >= 0) { headings = row; dateColumn = candidate; continue; }
      if (headings && cellDate(row[dateColumn] ?? null) === date) {
        const cells = headings.map((label, column) => ({ label: typeof label === 'string' ? label : '', value: typeof row[column] === 'string' && !row[column].trim() ? null : row[column] ?? null })).filter((cell, column) => column !== dateColumn && cell.label.trim());
        if (!cells.length) throw new Error('Excel needs named amount columns.');
        matches.push({ sheet: sheet.sheet, row: index + 1, cells });
      }
    }
  }
  if (!matches.length) throw new Error('No row found for this date. Use day/month/year dates or Excel date cells.');
  if (matches.length !== 1) throw new Error('More than one row has this date. Upload a file with one report row per date.');
  return matches[0];
}
export const recordKinds = ['Guest bill', 'Food bill', 'Expense bill', 'UPI payment record'] as const;
export function recordType(bytes: Uint8Array) {
  return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-' ? 'application/pdf' : null;
}
