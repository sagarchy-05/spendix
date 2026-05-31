import { connectDB } from '@/lib/mongoose';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';

export async function DELETE(request, ctx) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    const { transactionId } = await ctx.params;
    await connectDB();

    const transaction = await Transaction.findOneAndDelete({
      _id: transactionId,
      userId: auth.userId,
    });
    if (!transaction) {
      return Response.json(
        { message: 'Transaction not found' },
        { status: 404 }
      );
    }

    return Response.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    return Response.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
