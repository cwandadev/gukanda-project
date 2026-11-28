// Pure logic for the weekly working hours editor (no React).
import { minutes, toHHMM } from '../../lib/time';

export type Range = { id: string; start: string; end: string }; // 'HH:MM'
export type WeekHours = Record<number, Range[]>; // key = weekday 0..6 (0 = Sunday)
export type Row = { weekday: number; start_time: string; end_time: string };
export type HoursProblem = 'hours_invalid' | 'hours_overlap';

let counter = 0;
export const newId = () => `r${++counter}`;

export function emptyWeek(): WeekHours {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

export function fromRows(rows: Row[]): WeekHours {
  const week = emptyWeek();
  for (const r of rows) week[r.weekday].push({ id: newId(), start: toHHMM(r.start_time), end: toHHMM(r.end_time) });
  for (const wd of Object.keys(week)) week[Number(wd)].sort((a, b) => minutes(a.start) - minutes(b.start));
  return week;
}

/** What is sent to the database. Sorted so two equal weeks give equal JSON. */
export function toPayload(week: WeekHours): Row[] {
  const rows: Row[] = [];
  for (let wd = 0; wd <= 6; wd++) {
    for (const r of week[wd]) rows.push({ weekday: wd, start_time: `${r.start}:00`, end_time: `${r.end}:00` });
  }
  return rows.sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
}

export function validateWeek(week: WeekHours): HoursProblem | null {
  for (let wd = 0; wd <= 6; wd++) {
    const ranges = [...week[wd]].sort((a, b) => minutes(a.start) - minutes(b.start));
    for (const r of ranges) if (minutes(r.end) <= minutes(r.start)) return 'hours_invalid';
    for (let i = 1; i < ranges.length; i++) {
      if (minutes(ranges[i].start) < minutes(ranges[i - 1].end)) return 'hours_overlap';
    }
  }
  return null;
}

/** A sensible next range: 09:00-17:00 on an empty day, otherwise 2 hours after the last range. */
export function nextRange(ranges: Range[]): Range {
  if (ranges.length === 0) return { id: newId(), start: '09:00', end: '17:00' };
  const lastEnd = Math.max(...ranges.map((r) => minutes(r.end)));
  const start = Math.min(lastEnd + 60, 21 * 60);
  const end = Math.min(start + 120, 23 * 60 + 45);
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { id: newId(), start: f(start), end: f(end) };
}

/** Copy one day's ranges to other days (fresh ids). */
export function copyDay(week: WeekHours, from: number, to: number[]): WeekHours {
  const next = { ...week };
  for (const wd of to) next[wd] = week[from].map((r) => ({ ...r, id: newId() }));
  return next;
}
