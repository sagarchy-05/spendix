import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    description: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model('Transaction', transactionSchema);
