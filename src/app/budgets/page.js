import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireServerUser } from '@/lib/serverAuth';
import { parseMonth } from '@/lib/monthRange';
import {
  getBudgetForMonth,
  DEFAULT_MONTH,
} from '@/lib/budgetHelpers';
import BudgetsClient from './BudgetsClient';

export const metadata = { title: 'Budgets - Spendix' };

async function loadBudgets(userId, month, monthStart, monthEnd) {
  await connectDB();
  const result = await getBudgetForMonth(userId, month);

  if (month === DEFAULT_MONTH || result.budgets.length === 0) {
    return {
      source: result.source,
      budgets: result.budgets.map((b) => ({
        _id: String(b._id),
        category: b.category,
        limit: b.limit,
        spent: 0, // no transactions concept for default template / empty
      })),
    };
  }

  // Compute current-month spent for each category.
  const spentByCategory = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: monthStart, $lt: monthEnd },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  const spentMap = new Map(spentByCategory.map((s) => [s._id, s.total]));

  return {
    source: result.source,
    budgets: result.budgets.map((b) => ({
      _id: String(b._id),
      category: b.category,
      limit: b.limit,
      spent: spentMap.get(b.category) || 0,
    })),
  };
}

export default async function BudgetsPage({ searchParams }) {
  const { userId } = await requireServerUser();
  const { month: monthParam, view } = await searchParams;

  const viewingDefault = view === 'default';
  const range = parseMonth(monthParam);
  const targetMonth = viewingDefault ? DEFAULT_MONTH : range.label;

  const { source, budgets } = await loadBudgets(
    userId,
    targetMonth,
    range.start,
    range.end
  );

  return (
    <BudgetsClient
      initialBudgets={budgets}
      budgetSource={source}
      viewingDefault={viewingDefault}
      monthLabel={range.label}
      monthDisplay={range.display}
      prevMonth={range.prev}
      nextMonth={range.next}
    />
  );
}
