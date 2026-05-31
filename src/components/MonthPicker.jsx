'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { currentMonthLabel } from '@/lib/monthRange';

// Header strip with ‹ Month Year › arrows + a hidden native month input
// (click the label to jump to any month). `noFuture` caps navigation at the
// current UTC month — use it on Transactions/Charts where future data
// doesn't exist. Budgets leaves it off so the user can plan ahead.
export default function MonthPicker({
  label,
  display,
  prev,
  next,
  noFuture = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentLabel = currentMonthLabel();
  const nextDisabled = noFuture && next > currentLabel;

  const go = (month) => {
    if (noFuture && month > currentLabel) return;
    const params = new URLSearchParams(searchParams);
    params.set('month', month);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className='d-inline-flex align-items-center gap-2'>
      <button
        type='button'
        className='btn btn-sm btn-outline-secondary'
        onClick={() => go(prev)}
        disabled={isPending}
        aria-label='Previous month'
      >
        <i className='bi bi-chevron-left'></i>
      </button>

      <label
        className='position-relative fw-semibold mb-0 user-select-none'
        style={{ minWidth: '140px', textAlign: 'center', cursor: 'pointer' }}
      >
        <span style={{ opacity: isPending ? 0.5 : 1 }}>{display}</span>
        <input
          type='month'
          value={label}
          max={noFuture ? currentLabel : undefined}
          onChange={(e) => go(e.target.value)}
          className='position-absolute top-0 start-0 w-100 h-100 opacity-0'
          style={{ cursor: 'pointer' }}
          aria-label='Pick month'
        />
      </label>

      <button
        type='button'
        className='btn btn-sm btn-outline-secondary'
        onClick={() => go(next)}
        disabled={isPending || nextDisabled}
        aria-label='Next month'
      >
        <i className='bi bi-chevron-right'></i>
      </button>
    </div>
  );
}
