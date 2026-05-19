import { createWorker } from 'tesseract.js';

export interface CheckOcrResult {
  check_number: string | null;
  check_date: string | null;
  check_issuer: string | null;
  check_receiver: string | null;
  check_amount: number | null;
  rawText: string;
}

export async function ocrCheckImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CheckOcrResult> {
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  try {
    const url = URL.createObjectURL(file);
    try {
      const { data } = await worker.recognize(url);
      return parseCheckText(data.text);
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    await worker.terminate();
  }
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export function parseCheckText(text: string): CheckOcrResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Amount: dollar amounts like 1,234.56 or $1234.56. Pick the most frequent;
  // ties go to the largest value (the numeric box usually appears twice — in
  // the box and in MICR — and is the largest plausible number on the check).
  const amountMatches: number[] = [];
  for (const line of lines) {
    for (const m of line.matchAll(/\$?\s*([0-9][0-9,]*\.\d{2})/g)) {
      const num = Number(m[1].replace(/,/g, ''));
      if (Number.isFinite(num) && num > 0 && num < 10_000_000) amountMatches.push(num);
    }
  }
  let amount: number | null = null;
  if (amountMatches.length > 0) {
    const counts = new Map<number, number>();
    for (const n of amountMatches) counts.set(n, (counts.get(n) || 0) + 1);
    amount = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  }

  // Date: MM/DD/YYYY, MM-DD-YYYY, or "Month Day, Year".
  let date: string | null = null;
  for (const line of lines) {
    const slash = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (slash) {
      let yearNum = Number(slash[3]);
      if (yearNum < 100) yearNum += 2000;
      const y = String(yearNum).padStart(4, '0');
      const m = slash[1].padStart(2, '0');
      const d = slash[2].padStart(2, '0');
      if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
        date = `${y}-${m}-${d}`;
        break;
      }
    }
    const named = line.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
    );
    if (named) {
      const prefix = named[1].toLowerCase().slice(0, 3);
      const idx = MONTHS.findIndex((n) => n.startsWith(prefix));
      if (idx >= 0) {
        date = `${named[3]}-${String(idx + 1).padStart(2, '0')}-${named[2].padStart(2, '0')}`;
        break;
      }
    }
  }

  // Check number: 3–6 digit standalone number in the first few lines.
  // Skip values that look like a year.
  let checkNumber: string | null = null;
  for (const line of lines.slice(0, 6)) {
    const m = line.match(/(?:^|\b)(?:no\.?|#|number)?\s*(\d{3,6})\b/i);
    if (m) {
      const num = Number(m[1]);
      if (num >= 100 && (num < 1900 || num > 2100)) {
        checkNumber = m[1];
        break;
      }
    }
  }

  // Receiver: text after "Pay to the order of".
  let receiver: string | null = null;
  const payIdx = lines.findIndex((l) => /pay\s+to\s+(?:the\s+)?order/i.test(l));
  if (payIdx >= 0) {
    const after = lines[payIdx]
      .replace(/.*pay\s+to\s+(?:the\s+)?order\s+(?:of)?\s*[:\-]?\s*/i, '')
      .trim();
    if (after) receiver = after;
    else if (payIdx + 1 < lines.length) receiver = lines[payIdx + 1];
  }

  // Issuer: first line near the top that is mostly alphabetic and isn't the
  // check number / a date / the pay-to label.
  let issuer: string | null = null;
  for (const line of lines.slice(0, 4)) {
    if (/pay\s+to/i.test(line)) continue;
    if (/^\s*(?:no\.?|#)?\s*\d{2,}\s*$/i.test(line)) continue;
    const stripped = line.replace(/[^A-Za-z\s'.,&-]/g, '').trim();
    if (stripped.length >= 3 && /[A-Za-z]{2,}/.test(stripped)) {
      issuer = stripped;
      break;
    }
  }

  return {
    check_number: checkNumber,
    check_date: date,
    check_issuer: issuer,
    check_receiver: receiver,
    check_amount: amount,
    rawText: text,
  };
}
