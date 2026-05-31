import Budget from '@/lib/models/Budget';

export const DEFAULT_MONTH = 'default';

// Find the user's default-template Budget. Includes a self-healing fallback
// for pre-month-aware docs (where `month` is missing entirely) — those get
// silently treated as the default and re-saved with month='default' so the
// compound index can do its job.
export async function getDefaultBudgetDoc(userId) {
  let doc = await Budget.findOne({ userId, month: DEFAULT_MONTH });
  if (doc) return doc;

  const legacy = await Budget.findOne({
    userId,
    month: { $in: [null, undefined] },
  });
  if (legacy) {
    legacy.month = DEFAULT_MONTH;
    try {
      await legacy.save();
    } catch {
      /* duplicate-key races: another caller already created the default */
    }
    return legacy;
  }
  return null;
}

// Resolves which budget applies for (userId, month). Falls back to the
// default template when there's no per-month customization.
// Returns { source: 'custom' | 'default' | 'none', budgets, _id }.
export async function getBudgetForMonth(userId, month) {
  if (month !== DEFAULT_MONTH) {
    const custom = await Budget.findOne({ userId, month }).lean();
    if (custom) {
      return {
        source: 'custom',
        _id: String(custom._id),
        budgets: custom.budgets,
      };
    }
  }

  const def = await getDefaultBudgetDoc(userId);
  if (def) {
    return {
      source: month === DEFAULT_MONTH ? 'custom' : 'default',
      _id: String(def._id),
      budgets: def.budgets.toObject ? def.budgets.toObject() : def.budgets,
    };
  }

  return { source: 'none', _id: null, budgets: [] };
}

