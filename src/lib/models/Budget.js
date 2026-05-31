import mongoose from 'mongoose';

// One row per (userId, month). `month` is either a real "YYYY-MM" string
// (the user customized that month) or the sentinel "default" (the user's
// template, applied to any month they haven't customized).
//
// Spent is NOT stored here — it's computed on demand from the Transaction
// collection. See chat history for that refactor.
const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  month: {
    type: String,
    required: true,
    default: 'default',
    match: /^(default|\d{4}-\d{2})$/,
  },
  budgets: [
    {
      category: { type: String, required: true, trim: true },
      limit: { type: Number, required: true, min: 0 },
    },
  ],
});

budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.models.Budget ||
  mongoose.model('Budget', budgetSchema);
