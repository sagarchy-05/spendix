import { connectDB } from '@/lib/mongoose';
import Budget from '@/lib/models/Budget';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';

// POST /api/budgets/rename  { from, to }
//
// Renames a category across every Budget doc (default template + every
// per-month customization) and every Transaction for this user. Refuses
// if any single budget already contains both the source and target names
// — that would create a duplicate category within the same array.
//
// Each collection's `updateMany` is atomic on its own; if Transaction
// rename fails after Budget rename succeeded, the user can retry safely
// (Budget rename will then be a no-op).
export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const from = typeof body?.from === 'string' ? body.from.trim() : '';
    const to = typeof body?.to === 'string' ? body.to.trim() : '';

    if (!from || !to) {
      return Response.json(
        { message: 'Both `from` and `to` category names are required' },
        { status: 400 }
      );
    }
    if (from === to) {
      return Response.json(
        { message: 'New name is the same as the old name' },
        { status: 400 }
      );
    }
    if (from === 'Others') {
      return Response.json(
        { message: "Default category 'Others' cannot be renamed." },
        { status: 400 }
      );
    }
    if (to === 'Others') {
      return Response.json(
        { message: "Cannot rename to 'Others' — it's reserved." },
        { status: 400 }
      );
    }

    await connectDB();

    // Look for any budget doc that already contains both names (would
    // collide after rename).
    const collisions = await Budget.find({
      userId: auth.userId,
      $and: [
        { 'budgets.category': from },
        { 'budgets.category': to },
      ],
    })
      .select({ month: 1 })
      .lean();

    if (collisions.length > 0) {
      const months = collisions.map((c) => c.month).join(', ');
      return Response.json(
        {
          message: `"${to}" already exists alongside "${from}" in: ${months}. Remove one before renaming.`,
        },
        { status: 409 }
      );
    }

    // Cascade: rename in all Budget subdocs that hold `from`, then in all
    // Transactions. Order is "Budget first" so if the second step fails, a
    // retry safely no-ops the first and completes the second.
    const budgetResult = await Budget.updateMany(
      { userId: auth.userId, 'budgets.category': from },
      { $set: { 'budgets.$[el].category': to } },
      { arrayFilters: [{ 'el.category': from }] }
    );

    const txResult = await Transaction.updateMany(
      { userId: auth.userId, category: from },
      { $set: { category: to } }
    );

    return Response.json({
      message: `Renamed "${from}" to "${to}".`,
      budgetDocsUpdated: budgetResult.modifiedCount,
      transactionsUpdated: txResult.modifiedCount,
    });
  } catch (error) {
    console.error('Rename error:', error);
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
