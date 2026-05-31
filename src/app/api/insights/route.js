import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { connectDB } from '@/lib/mongoose';
import Insight from '@/lib/models/Insight';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/requireAuth';
import { checkRateLimit, refundRateLimit } from '@/lib/rateLimiter';
import { parseMonth } from '@/lib/monthRange';

export const maxDuration = 60; // Extend Vercel Hobby tier timeout to 60 seconds


const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
const modelId = process.env.GEMINI_MODEL;

// Gemini calls cost money. Cap to 1 generation per user per hour.
// Slot is consumed only when Gemini is actually called.
const INSIGHT_LIMIT_PER_HOUR = 1;

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  try {
    await connectDB();
    const insights = await Insight.find({ userId: auth.userId }).sort({
      createdAt: -1,
    });
    return Response.json({ insights });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return Response.json(
      { message: 'Failed to fetch insights', error: error.message },
      { status: 500 }
    );
  }
}

function parseAndValidateInsight(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { aiInsight: '', valid: false };
  }

  // Accept any common bullet character (-, *, •) and normalize to "- ".
  // Strip numbered-list prefixes (1., 1)) as well.
  const bullets = rawText
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*\d+[.)]\s*/, '- ')
        .replace(/^\s*[-*•]\s*-?\s*/, '- ')
        .trim()
    )
    .filter((line) => line.startsWith('- ') && line.length > 2)
    .slice(0, 6);

  const aiInsight = bullets.join('\n').trim();

  // Lenient: any output with at least one real bullet counts. Prose-only
  // garbage with no bullets at all still gets rejected.
  const valid =
    bullets.length >= 1 && !aiInsight.includes('Transactions:');

  return { aiInsight, valid };
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.error)
    return Response.json({ message: auth.error }, { status: auth.status });

  // No CAPTCHA here: this endpoint requires a valid session cookie AND is
  // rate-limited to one generation per user per hour, which makes scripted
  // abuse economically pointless. Captcha is still gating the unauth'd
  // endpoints (signup, login, resend-verification).

  // Load current-month transactions only. Insights are about how the user
  // is spending right now — historical months are interesting but including
  // them would dilute the advice with stale patterns.
  const range = parseMonth(undefined); // current UTC month
  let transactions;
  try {
    await connectDB();
    transactions = await Transaction.find({
      userId: auth.userId,
      date: { $gte: range.start, $lt: range.end },
    })
      .sort({ date: -1 })
      .limit(100);
  } catch (error) {
    console.error('Error loading transactions for insight:', error);
    return Response.json(
      { message: 'Failed to generate insight', error: error.message },
      { status: 500 }
    );
  }
  if (!transactions || transactions.length === 0) {
    return Response.json({
      message: `No transactions present in ${range.display} to generate insights on.`,
      insights: [],
    });
  }

  // Reserve the rate-limit slot right before the Gemini call.
  const rate = checkRateLimit(auth.userId, INSIGHT_LIMIT_PER_HOUR);
  if (!rate.ok) {
    return Response.json(
      {
        message:
          'You can generate one insight per hour. Please try again later.',
        retryAfter: rate.retryAfter,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfter) },
      }
    );
  }

  // Build prompt + stream from Gemini.
  const transactionText = transactions
    .map(
      (t) =>
        `₹${t.amount} for ${t.category}${
          t.description ? ` (${t.description})` : ''
        }`
    )
    .join(', ');

  const prompt = `
Given the following list of recent financial transactions, you MUST generate exactly 3 to 4 distinct personalized insights to help the user save money, spot spending patterns, or improve financial habits.

CRITICAL INSTRUCTIONS:
- Generate exactly 3 to 4 insights. Do not generate just one.
- Respond ONLY with bullet points that start with a dash (-). 
- Do NOT mention or repeat the individual transactions. 
- Avoid generic tips. Each bullet must be highly concise and actionable.

Transactions:
${transactionText}
`;

  if (!process.env.GEMINI_API_KEY) {
    refundRateLimit(auth.userId);
    return Response.json(
      { message: 'GEMINI_API_KEY is not set in environment' },
      { status: 500 }
    );
  }

  // streamText returns a result whose .toTextStreamResponse() pipes the
  // raw model tokens to the client. onFinish runs after the full text is
  // accumulated — that's where we parse/validate/persist.
  const result = streamText({
    model: google(modelId),
    system: 'You are a smart and concise personal finance assistant.',
    prompt,
    maxOutputTokens: 800,
    temperature: 0.7,
    onFinish: async ({ text }) => {
      try {
        const { aiInsight, valid } = parseAndValidateInsight(text);
        if (!valid) return; // don't pollute history with bad output
        await Insight.create({
          userId: auth.userId,
          content: aiInsight,
        });
      } catch (err) {
        console.error('[insight] save failed:', err);
      }
    },
    onError: ({ error }) => {
      // Stream errored before/during Gemini producing useful content.
      // Refund the rate slot so the user isn't penalized for our outage.
      refundRateLimit(auth.userId);
      console.error('Gemini stream error:', error);
    },
  });

  return result.toTextStreamResponse();
}
