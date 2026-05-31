import { connectDB } from '@/lib/mongoose';
import Insight from '@/lib/models/Insight';
import { requireServerUser } from '@/lib/serverAuth';
import InsightsClient from './InsightsClient';

export const metadata = { title: 'AI Insights - Spendix' };

export default async function InsightsPage() {
  const { userId } = await requireServerUser();
  await connectDB();
  const docs = await Insight.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  // ObjectId and Date need to become primitives for the RSC boundary.
  const initialInsights = docs.map((d) => ({
    _id: String(d._id),
    content: d.content,
    createdAt: d.createdAt?.toISOString() || null,
  }));

  return <InsightsClient initialInsights={initialInsights} />;
}
