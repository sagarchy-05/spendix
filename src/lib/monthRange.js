// Parses a YYYY-MM string (or defaults to the current UTC month) and produces
// everything the pages + queries need to scope themselves to a single month:
//
//   - `start` / `end`   : Date objects suitable for { $gte: start, $lt: end }
//   - `label`           : "YYYY-MM" — the canonical form used in the URL
//   - `display`         : "October 2026" — for the picker UI
//   - `prev` / `next`   : "YYYY-MM" of adjacent months for navigation
//
// Boundaries are UTC. See chat: fine for IST and ±5h of UTC; would need
// per-user timezones to be correct everywhere.

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function asLabel(year, monthIndex /* 0-based */) {
  return `${year}-${pad2(monthIndex + 1)}`;
}

// "YYYY-MM" of the current UTC month — used to cap pickers on pages where
// future doesn't make sense (transactions, charts).
export function currentMonthLabel() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
}

export function isFutureMonth(label) {
  return typeof label === 'string' && label > currentMonthLabel();
}

export function parseMonth(input) {
  let year, monthIndex; // monthIndex is 0-based to match JS Date semantics
  const m = typeof input === 'string' && input.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    year = Number(m[1]);
    monthIndex = Number(m[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      // Fall through to current month on garbage input
      const now = new Date();
      year = now.getUTCFullYear();
      monthIndex = now.getUTCMonth();
    }
  } else {
    const now = new Date();
    year = now.getUTCFullYear();
    monthIndex = now.getUTCMonth();
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  // Adjacent months — Date math handles year rollovers for us.
  const prevDate = new Date(Date.UTC(year, monthIndex - 1, 1));
  const nextDate = new Date(Date.UTC(year, monthIndex + 1, 1));

  return {
    start,
    end,
    label: asLabel(year, monthIndex),
    display: `${MONTH_NAMES[monthIndex]} ${year}`,
    prev: asLabel(prevDate.getUTCFullYear(), prevDate.getUTCMonth()),
    next: asLabel(nextDate.getUTCFullYear(), nextDate.getUTCMonth()),
  };
}
