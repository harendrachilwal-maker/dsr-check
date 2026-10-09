export const sections = ['Sales', 'Payment', 'Expense', 'Cash balance'] as const;
export type Section = typeof sections[number];
export type DsrLine = { section: Section | null; label: string | null; amount: number | null; unclear: boolean };
export type Extracted = { lines: DsrLine[] };
export const MAX_BYTES = 10 * 1024 * 1024;
export const BUSY = 'Busy right now. Try again in a few minutes.';
export function validateExtraction(value: unknown): Extracted {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid extraction');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Array.isArray(record.lines) || record.lines.length > 1000) throw new Error('Invalid lines');
  const lines = record.lines.map((item): DsrLine => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid line');
    const line = item as Record<string, unknown>;
    if (Object.keys(line).length !== 4 || !['section', 'label', 'amount', 'unclear'].every(key => Object.hasOwn(line, key))) throw new Error('Invalid line fields');
    if (line.section !== null && !sections.includes(line.section as Section)) throw new Error('Invalid section');
    if (line.label !== null && (typeof line.label !== 'string' || !line.label.trim() || line.label.length > 1000)) throw new Error('Invalid label');
    const amount = line.amount;
    if (amount !== null && (typeof amount !== 'number' || !Number.isFinite(amount) || Math.abs(amount) > 1e12 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.001)) throw new Error('Invalid amount');
    if (typeof line.unclear !== 'boolean') throw new Error('Missing uncertainty');
    // Missing fields are always uncertain, even when the model marks them clear.
    // This derived flag does not alter any source field or the retained raw response.
    const unclear = line.unclear || amount === null || line.label === null || line.section === null;
    return { section: line.section as Section | null, label: line.label as string | null, amount: amount as number | null, unclear };
  });
  return { lines };
}
export function rawAnswer(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid AI response');
  const response = raw as { status?: unknown; output?: unknown };
  if (response.status !== 'completed' || !Array.isArray(response.output)) throw new Error('Incomplete AI response');
  const texts: string[] = [];
  for (const item of response.output) {
    if (!item || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text') {
        if (typeof part.text !== 'string') throw new Error('Invalid AI text');
        texts.push(part.text);
      }
    }
  }
  return JSON.parse(texts.join(''));
}
export function extractionFromRawResponse(raw: unknown): Extracted {
  return validateExtraction(rawAnswer(raw));
}
export function dailyFromRawResponse(raw: unknown, date: string): Extracted {
  const answer = rawAnswer(raw) as { date?: unknown; lines?: unknown } | null;
  if (!answer || Object.keys(answer).length !== 2 || answer.date !== date) throw new Error('Wrong reporting date');
  return validateExtraction({ lines: answer.lines });
}
export const documentKinds = ['Daily sheet', 'Handwritten DSR', 'Guest bill', 'Food bill', 'Expense bill', 'UPI record', 'Not identified'] as const;
export type ReadDocument = { source: number; kind: typeof documentKinds[number]; date: string | null; lines: DsrLine[] };
export function documentsFromRawResponse(raw: unknown, date: string | null, sources: number[]): ReadDocument[] {
  const answer = rawAnswer(raw) as { date?: unknown; documents?: unknown } | null;
  if (!answer || Object.keys(answer).length !== 2 || !Array.isArray(answer.documents)) throw new Error('Invalid document reading');
  if (answer.date !== date) throw new Error('Wrong reporting date');
  if (answer.documents.length !== sources.length) throw new Error('Document count mismatch');
  const seen = new Set<number>();
  const documents = answer.documents.map((item): ReadDocument => {
    if (!item || typeof item !== 'object' || Object.keys(item).length !== 4 || !['source','kind','date','lines'].every(key => Object.hasOwn(item,key))) throw new Error('Invalid document');
    if (!Number.isInteger(item.source) || !sources.includes(item.source) || seen.has(item.source)) throw new Error('Invalid document source');
    seen.add(item.source);
    if (!documentKinds.includes(item.kind)) throw new Error('Invalid document kind');
    if (item.date !== null) {
      if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(new Date(item.date).getTime()) || new Date(item.date).toISOString().slice(0,10)!==item.date) throw new Error('Invalid document date');
    }
    const extracted = validateExtraction({lines:item.lines});
    if ((item.kind === 'Daily sheet' || item.kind === 'Handwritten DSR') && (item.date !== date || date === null) && extracted.lines.some(line=>line.amount!==null)) throw new Error('Wrong sheet date');
    return {source:item.source,kind:item.kind,date:item.date,lines:extracted.lines};
  });
  return documents.sort((a,b)=>a.source-b.source);
}
export function autoDocumentsFromRawResponse(raw: unknown, sources: number[]) {
  const answer = rawAnswer(raw) as {date?:unknown} | null;
  const date=answer?.date;
  if(date!==null && (typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date).getTime()) || new Date(date).toISOString().slice(0,10)!==date))throw new Error('Invalid reporting date');
  const documents=documentsFromRawResponse(raw,date as string|null,sources);
  if(date!==null&&!documents.some(doc=>(doc.kind==='Daily sheet'||doc.kind==='Handwritten DSR')&&doc.date===date))throw new Error('Date has no DSR source');
  if(date!==null&&documents.some(doc=>(doc.kind==='Daily sheet'||doc.kind==='Handwritten DSR')&&doc.date!==null&&doc.date!==date))throw new Error('Conflicting DSR dates');
  return {date:date as string|null,documents};
}
export function datedDocumentsFromRawResponse(raw: unknown, date: string, sources: number[], dsrSources: number[]) {
  const documents=documentsFromRawResponse(raw,date,sources);
  for(const doc of documents){
    const isDsr=doc.kind==='Daily sheet'||doc.kind==='Handwritten DSR';
    if(dsrSources.includes(doc.source)&&!isDsr&&doc.kind!=='Not identified')throw new Error('DSR upload misclassified');
    if(!dsrSources.includes(doc.source)&&isDsr)throw new Error('Bill upload cannot replace DSR');
  }
  return {date,documents};
}
export function displayAmount(amount: number | null) {
  if (amount === null) return 'Not extracted';
  const digits = new Intl.NumberFormat('en-IN', { useGrouping: true, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}₹${digits}`;
}
export function displayLineAmount(line: DsrLine) {
  return displayAmount(line.amount) + (line.amount !== null && line.unclear ? '?' : '');
}
// Only explicit standalone total labels are recognised; other labels are preserved as entries.
export function isWrittenTotal(label: string | null) {
  return label !== null && /^(?:(?:sales|payments?|expenses?|cash(?:\s+balance)?)\s+)?(?:grand\s+total|sub[\s-]?total|total|ttl)\s*[:.\-]?$/i.test(label.trim());
}
export function totalsBySection(extracted: Extracted) {
  const unassigned = extracted.lines.filter(line => line.section === null).length;
  return sections.map(section => {
    const lines = extracted.lines.filter(line => line.section === section);
    const entries = lines.filter(line => !isWrittenTotal(line.label));
    const readable = entries.filter(line => line.amount !== null && !line.unclear);
    // Add integer paise, never binary floating-point rupees.
    const paise = readable.reduce((sum, line) => sum + BigInt(Math.round(line.amount! * 100)), 0n);
    if (paise > BigInt(Number.MAX_SAFE_INTEGER) || paise < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Total exceeds safe range');
    const readableSubtotal = readable.length ? Number(paise) / 100 : null;
    const incomplete = entries.length - readable.length + unassigned;
    return { section, total: entries.length && !incomplete ? readableSubtotal : null, readableSubtotal, incomplete };
  });
}
export function imageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return 'image/webp';
  return null;
}

// Only static, approved codes may leave the validator. Never echo arbitrary error text.
export function extractionFailureCode(cause: unknown): string {
  if (cause instanceof SyntaxError) return 'invalid_json';
  const codes: Record<string,string> = {
    'Invalid extraction':'invalid_extraction', 'Invalid lines':'invalid_lines',
    'Invalid line':'invalid_line', 'Invalid line fields':'invalid_line_fields',
    'Invalid section':'invalid_section', 'Invalid label':'invalid_label',
    'Invalid amount':'invalid_amount', 'Missing uncertainty':'missing_uncertainty',
    'Invalid AI response':'invalid_ai_response', 'Incomplete AI response':'incomplete_ai_response',
    'Invalid AI text':'invalid_ai_text', 'Wrong reporting date':'reporting_date_mismatch',
    'Invalid document reading':'invalid_document_reading', 'Document count mismatch':'document_count_mismatch',
    'Invalid document':'invalid_document', 'Invalid document source':'invalid_document_source',
    'Invalid document kind':'invalid_document_kind', 'Invalid document date':'invalid_document_date',
    'Wrong sheet date':'dsr_date_mismatch', 'Invalid reporting date':'invalid_reporting_date',
    'Date has no DSR source':'date_without_dsr', 'Conflicting DSR dates':'conflicting_dsr_dates',
    'DSR upload misclassified':'dsr_upload_misclassified', 'Bill upload cannot replace DSR':'supporting_upload_misclassified',
    'Total exceeds safe range':'total_out_of_range',
    'Invalid comparison reading':'invalid_comparison_reading', 'Invalid comparison context':'invalid_comparison_context',
    'Invalid context source':'invalid_context_source', 'Missing comparison context':'missing_comparison_context',
  };
  return cause instanceof Error && Object.hasOwn(codes,cause.message) ? codes[cause.message] : 'unknown_validation_error';
}
