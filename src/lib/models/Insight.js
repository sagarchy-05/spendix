import mongoose from 'mongoose';

const insightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Insight ||
  mongoose.model('Insight', insightSchema);
