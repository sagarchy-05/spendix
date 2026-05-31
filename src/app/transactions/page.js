import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireServerUser } from '@/lib/serverAuth';
import { parseMonth } from '@/lib/monthRange';
import { getBudgetForMonth } from '@/lib/budgetHelpers';
import TransactionsClient from './TransactionsClient';

export const metadata = { title: 'Transactions - Spendix' };

export default async function TransactionsPage({ searchParams }) {
  const { userId } = await requireServerUser();
  const { month } = await searchParams;
  const range = parseMonth(month);

  await connectDB();

  // Filter dropdown categories come from the picked month's budget (custom
  // if set, default otherwise). The modal does its own date-based load.
  const [txDocs, monthBudget] = await Promise.all([
    Transaction.find({
      userId,
      date: { $gte: range.start, $lt: range.end },
    })
      .sort({ date: -1 })
      .lean(),
    getBudgetForMonth(userId, range.label),
  ]);

  const initialTransactions = txDocs.map((t) => ({
    _id: String(t._id),
    amount: t.amount,
    category: t.category,
    description: t.description || '',
    date: t.date?.toISOString() || null,
  }));

  const initialCategories = (monthBudget.budgets || []).map((b) => b.category);

  return (
    <TransactionsClient
      initialTransactions={initialTransactions}
      initialCategories={initialCategories}
      monthLabel={range.label}
      monthDisplay={range.display}
      prevMonth={range.prev}
      nextMonth={range.next}
    />
  );
}
