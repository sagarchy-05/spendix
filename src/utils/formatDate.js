export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB');
};

export const formatMonthYear = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
};

// "01 Jan" — short day + month label for chart axis tick labels.
export const formatShortDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
};

export const formatForInput = (dateStr) => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

// Today's date as YYYY-MM-DD in the *local* timezone. Don't use
// toISOString() for this — it returns UTC, which is the wrong calendar day
// for any non-UTC user between midnight local and ~UTC offset hours.
export const todayLocalISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
