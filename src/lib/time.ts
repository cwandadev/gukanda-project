// Pure date/time helpers (no React). Appointments are stored in UTC and SHOWN in the business time zone.
// Date-only values are plain 'YYYY-MM-DD' strings so they never shift with the device time zone.

export const DEFAULT_TIMEZONE = 'Europe/Paris';

// Database weekday: 0 = Sunday ... 6 = Saturday. France shows Monday first.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** ['00:00', '00:15', ... '23:45'] */
export function timeOptions(stepMinutes = 15): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

/** '09:00:00' -> '09:00' */
export const toHHMM = (t: string) => t.slice(0, 5);

/** '09:30' -> 570 */
export function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type LocalParts = { y: number; m: number; d: number; hh: number; mm: number };

/** The wall-clock parts of an instant in a time zone. */
export function parts(iso: string, tz: string): LocalParts {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const get = (type: string) => Number(f.formatToParts(new Date(iso)).find((p) => p.type === type)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), hh: get('hour'), mm: get('minute') };
}

export const dateStrOf = (p: LocalParts) => `${p.y}-${pad(p.m)}-${pad(p.d)}`;
export const timeStrOf = (p: LocalParts) => `${pad(p.hh)}:${pad(p.mm)}`;

/** Today's date (YYYY-MM-DD) in a time zone. */
export const todayIn = (tz: string) => dateStrOf(parts(new Date().toISOString(), tz));

// Day-before-month order (1 December), like France. Plain 'en' would give the US order.
const LOCALES: Record<string, string> = { en: 'en-GB', fr: 'fr-FR' };

/** Format a date-only string, e.g. "Mon 8 Dec". */
export function formatDateStr(dateStr: string, lang: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALES[lang] ?? lang, { timeZone: 'UTC', ...opts }).format(new Date(`${dateStr}T00:00:00Z`));
}

const SHORT_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };

/** Human text for a time-off range, in the business time zone. */
export function describeRange(startIso: string, endIso: string, lang: string, tz: string): string {
  const s = parts(startIso, tz);
  const e = parts(endIso, tz);
  const allDay = s.hh === 0 && s.mm === 0 && e.hh === 0 && e.mm === 0;
  const sDate = dateStrOf(s);
  if (allDay) {
    const lastDay = addDays(dateStrOf(e), -1); // the end is "midnight after the last day"
    const first = formatDateStr(sDate, lang, SHORT_DATE);
    return lastDay <= sDate ? first : `${first} – ${formatDateStr(lastDay, lang, SHORT_DATE)}`;
  }
  const eDate = dateStrOf(e);
  if (sDate === eDate) return `${formatDateStr(sDate, lang, SHORT_DATE)}, ${timeStrOf(s)} – ${timeStrOf(e)}`;
  return `${formatDateStr(sDate, lang, SHORT_DATE)} ${timeStrOf(s)} – ${formatDateStr(eDate, lang, SHORT_DATE)} ${timeStrOf(e)}`;
}

/** Weeks (Monday first) of a month. month = 1..12. Cells outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
