import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireServerUser } from '@/lib/serverAuth';
import { parseMonth } from '@/lib/monthRange';
import { getBudgetForMonth } from '@/lib/budgetHelpers';
import financialQuotes from '@/utils/financialQuotes';
import DashboardClient from './DashboardClient';

export const metadata = { title: 'Dashboard - Spendix' };

async function loadDashboardStats(userId) {
  await connectDB();
  const range = parseMonth(undefined); // current UTC month
  const oid = new mongoose.Types.ObjectId(userId);
  const matchThisMonth = {
    userId: oid,
    date: { $gte: range.start, $lt: range.end },
  };

  // One pass each for the three things we display in tiles.
  const [txCount, totalAgg, perCategoryAgg, monthBudget] = await Promise.all([
    Transaction.countDocuments({
      userId,
      date: { $gte: range.start, $lt: range.end },
    }),
    Transaction.aggregate([
      { $match: matchThisMonth },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: matchThisMonth },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
    getBudgetForMonth(userId, range.label),
  ]);

  const spentMap = new Map(perCategoryAgg.map((c) => [c._id, c.total]));
  const overBudget = (monthBudget.budgets || []).filter((b) => {
    if (!b.limit) return false;
    return (spentMap.get(b.category) || 0) > b.limit;
  }).length;

  return {
    monthDisplay: range.display,
    txCount,
    totalSpent: totalAgg[0]?.total || 0,
    overBudgetCount: overBudget,
    budgetCount: (monthBudget.budgets || []).length,
  };
}

export default async function DashboardPage() {
  const user = await requireServerUser();
  const stats = await loadDashboardStats(user.userId);
  // Pick a random quote on every page load. The linter rule is disabled
  // because this is a server component and impurity is allowed here.
  // eslint-disable-next-line react-hooks/purity
  const quote =
    financialQuotes[Math.floor(Math.random() * financialQuotes.length)];

  return (
    <DashboardClient
      userName={user.name?.split(' ')[0] || ''}
      quote={quote}
      stats={stats}
    />
  );
}
