import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireServerUser } from '@/lib/serverAuth';
import { parseMonth } from '@/lib/monthRange';
import { getBudgetForMonth } from '@/lib/budgetHelpers';
import { formatMonthYear, formatShortDate } from '@/utils/formatDate';
import ChartsClient from './ChartsClient';

export const metadata = { title: 'Charts - Spendix' };

async function loadChartData(userId, month, monthStart, monthEnd) {
  await connectDB();
  const oid = new mongoose.Types.ObjectId(userId);

  // Three of the four charts (category totals, daily summary, budget vs
  // actual) are scoped to the selected month. The fourth — monthly trends
  // — is intentionally year-over-year and ignores the selected month so
  // users can see how spending evolved.
  const monthMatch = {
    userId: oid,
    date: { $gte: monthStart, $lt: monthEnd },
  };

  const [categoryTotals, monthlyTrends, dailySummary, monthBudget] =
    await Promise.all([
      Transaction.aggregate([
        { $match: monthMatch },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $project: { _id: 0, category: '$_id', total: 1 } },
      ]),
      // Year-over-year, not scoped.
      Transaction.aggregate([
        { $match: { userId: oid } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' },
          },
        },
        {
          $project: {
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                {
                  $cond: [
                    { $lt: ['$_id.month', 10] },
                    { $concat: ['0', { $toString: '$_id.month' }] },
                    { $toString: '$_id.month' },
                  ],
                },
              ],
            },
            total: 1,
            _id: 0,
          },
        },
        { $sort: { month: 1 } },
      ]),
      Transaction.aggregate([
        { $match: monthMatch },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' },
            },
            total: { $sum: '$amount' },
          },
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
            total: 1,
            _id: 0,
          },
        },
        { $sort: { date: 1 } },
      ]),
      getBudgetForMonth(userId, month),
    ]);

  const totalsMap = new Map(categoryTotals.map((c) => [c.category, c.total]));
  const budgetVsActual = (monthBudget.budgets || []).map((b) => ({
    category: b.category,
    budget: b.limit,
    spent: totalsMap.get(b.category) || 0,
  }));

  return {
    categoryData: categoryTotals,
    monthlyData: monthlyTrends
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .map((item) => ({ ...item, month: formatMonthYear(item.month) })),
    dailyData: dailySummary
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((item) => ({
        ...item,
        date: formatShortDate(item.date.toISOString()),
      })),
    budgetData: budgetVsActual,
  };
}

export default async function ChartsPage({ searchParams }) {
  const { userId } = await requireServerUser();
  const { month } = await searchParams;
  const range = parseMonth(month);
  const data = await loadChartData(userId, range.label, range.start, range.end);

  return (
    <ChartsClient
      {...data}
      monthLabel={range.label}
      monthDisplay={range.display}
      prevMonth={range.prev}
      nextMonth={range.next}
    />
  );
}
