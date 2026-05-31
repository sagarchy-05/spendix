'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/Alert';
import BudgetModal from '@/components/BudgetModal';
import MonthPicker from '@/components/MonthPicker';
import { useConfirm } from '@/components/ConfirmDialog';
import api from '@/lib/axios';

// Two tabs:
//   • Monthly         — shows the budget for the picked month (custom if
//                       set, otherwise the default template). Edits here
//                       create/update a custom budget *for that month only*.
//                       A "Reset to Default" button appears when the month
//                       has been customized.
//   • Default Template — shows the user's default budget. Edits here only
//                       affect months that haven't been customized yet.
//                       Past customized months are frozen as they were.
export default function BudgetsClient({
  initialBudgets,
  budgetSource, // 'custom' | 'default' | 'none'
  viewingDefault,
  monthLabel,
  monthDisplay,
  prevMonth,
  nextMonth,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({ category: '', limit: '' });
  // Original category name at the moment the edit modal was opened —
  // used to detect a rename on submit. null when adding a new budget.
  const [originalCategory, setOriginalCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '', visible: false });
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const budgets = initialBudgets;
  const targetMonth = viewingDefault ? 'default' : monthLabel;

  const refresh = () => startTransition(() => router.refresh());

  // Tab URLs preserve unrelated query params (e.g. `?month=…`).
  const monthlyTabUrl = (() => {
    const params = new URLSearchParams(searchParams);
    params.delete('view');
    const s = params.toString();
    return s ? `${pathname}?${s}` : pathname;
  })();
  const defaultTabUrl = (() => {
    const params = new URLSearchParams(searchParams);
    params.set('view', 'default');
    return `${pathname}?${params.toString()}`;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newLimit = parseFloat(formData.limit);
    if (!Number.isFinite(newLimit) || newLimit < 0) {
      setAlert({
        type: 'danger',
        message: 'Budget limit must be a non-negative number.',
        visible: true,
      });
      return;
    }

    const newCategory = formData.category.trim();
    const isRename =
      editMode &&
      originalCategory &&
      originalCategory !== newCategory;

    // Confirm rename — it's a global cascade, the user should know.
    if (isRename) {
      const ok = await confirm({
        title: 'Rename category?',
        body: `Rename "${originalCategory}" to "${newCategory}"? This updates every month's budget that includes this category and every existing transaction.`,
        confirmLabel: 'Rename',
        confirmVariant: 'primary',
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      // Step 1: cascade rename if needed. Must happen before the PUT
      // because PUT replaces this month's budget by name — if we don't
      // rename first, the PUT would treat it as a "delete old + add new"
      // and orphan all the existing transactions.
      if (isRename) {
        await api.post('/budgets/rename', {
          from: originalCategory,
          to: newCategory,
        });
      }

      // Step 2: compose the new state for this month and PUT it. After
      // the rename, `budgets` (from props) still has the old name in
      // memory — substitute the new name when matching.
      const matchName = isRename ? originalCategory : newCategory;
      const updatedBudgets = [...budgets];
      const index = updatedBudgets.findIndex((b) => b.category === matchName);

      if (index !== -1) {
        if (!viewingDefault) {
          const currentSpent = updatedBudgets[index].spent || 0;
          if (newLimit < currentSpent) {
            setAlert({
              type: 'danger',
              message: `New limit (₹${newLimit}) can't be less than spent amount (₹${currentSpent})`,
              visible: true,
            });
            setSaving(false);
            setShowModal(false);
            return;
          }
        }
        updatedBudgets[index] = {
          ...updatedBudgets[index],
          category: newCategory,
          limit: newLimit,
        };
      } else {
        updatedBudgets.push({
          category: newCategory,
          limit: newLimit,
          spent: 0,
        });
      }

      await api.put('/budgets/update', {
        month: targetMonth,
        budgets: updatedBudgets.map((b) => ({
          category: b.category,
          limit: b.limit,
        })),
      });

      setAlert({
        type: 'success',
        message: isRename
          ? `Renamed to "${newCategory}".`
          : editMode
          ? 'Budget updated successfully'
          : 'Budget added successfully',
        visible: true,
      });
      setFormData({ category: '', limit: '' });
      setOriginalCategory(null);
      setShowModal(false);
      refresh();
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.response?.data?.message || 'Failed to save budget',
        visible: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setFormData({ category: '', limit: '' });
    setOriginalCategory(null);
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = (budget) => {
    setFormData({ category: budget.category, limit: budget.limit });
    setOriginalCategory(budget.category);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (category === 'Others') {
      setAlert({
        type: 'danger',
        message: "Default category 'Others' cannot be deleted.",
        visible: true,
      });
      return;
    }

    const target = budgets.find((b) => b.category === category);
    if (!viewingDefault && target?.spent > 0) {
      setAlert({
        type: 'danger',
        message: `Cannot delete "${category}" — it has existing transactions (₹${target.spent.toFixed(
          2
        )} spent). Delete those transactions first.`,
        visible: true,
      });
      return;
    }

    const ok = await confirm({
      title: 'Delete budget?',
      body: viewingDefault
        ? `Remove "${category}" from the default template? Months that aren't customized will no longer include this category.`
        : `Delete the "${category}" budget for ${monthDisplay}? This can't be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(
        `/budgets/${encodeURIComponent(category)}?month=${encodeURIComponent(
          targetMonth
        )}`
      );
      setAlert({
        type: 'success',
        message: `"${category}" budget deleted successfully`,
        visible: true,
      });
      refresh();
    } catch (error) {
      setAlert({
        type: 'danger',
        message: error.response?.data?.message || 'Failed to delete budget',
        visible: true,
      });
    }
  };

  const getBudgetStatus = (spent, limit) => {
    const safeSpent = Math.max(0, spent || 0);
    const safeLimit = Math.max(0, limit || 0);
    const remaining = safeLimit - safeSpent;

    if (safeLimit === 0) {
      const isOver = safeSpent > 0;
      return {
        remaining,
        percent: 0,
        isOver,
        finitePercent: false,
        variant: isOver ? 'danger' : 'secondary',
      };
    }

    const percent = (safeSpent / safeLimit) * 100;
    const isOver = safeSpent > safeLimit;
    let variant = 'success';
    if (isOver || percent >= 90) variant = 'danger';
    else if (percent >= 75) variant = 'warning';

    return { remaining, percent, isOver, finitePercent: true, variant };
  };

  const overBudgetCount = viewingDefault
    ? 0
    : budgets.filter((b) => getBudgetStatus(b.spent, b.limit).isOver).length;

  return (
    <div className='container py-4'>
      {/* Tabs */}
      <ul className='nav nav-tabs mb-4'>
        <li className='nav-item'>
          <Link
            className={`nav-link ${!viewingDefault ? 'active' : ''}`}
            href={monthlyTabUrl}
          >
            <i className='bi bi-calendar3 me-2'></i>Monthly
          </Link>
        </li>
        <li className='nav-item'>
          <Link
            className={`nav-link ${viewingDefault ? 'active' : ''}`}
            href={defaultTabUrl}
          >
            <i className='bi bi-bookmark-star me-2'></i>Default Template
          </Link>
        </li>
      </ul>

      {/* Header */}
      <div className='d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3'>
        <div className='d-flex flex-wrap align-items-center gap-3'>
          <h2 className='fw-bold mb-0'>
            {viewingDefault ? 'Default Budget Template' : 'Monthly Budget'}
          </h2>
          {!viewingDefault && (
            <MonthPicker
              label={monthLabel}
              display={monthDisplay}
              prev={prevMonth}
              next={nextMonth}
            />
          )}
        </div>
        <button className='btn btn-success' onClick={openAddModal}>
          <i className='bi bi-plus-lg me-2'></i>Add Budget
        </button>
      </div>

      {/* Context banner — explains the current view */}
      {viewingDefault ? (
        <div className='alert alert-secondary d-flex align-items-start mb-4'>
          <i className='bi bi-bookmark-star me-2 fs-5'></i>
          <div>
            This template applies to any month you haven&apos;t customized. Edits
            here don&apos;t change past months that already have their own
            customizations.
          </div>
        </div>
      ) : budgetSource === 'default' ? (
        <div className='alert alert-info d-flex align-items-start mb-4'>
          <i className='bi bi-info-circle-fill me-2 fs-5'></i>
          <div>
            <strong>{monthDisplay}</strong> is using the default template.
            Any change you make here will create a custom budget for this
            month only.
          </div>
        </div>
      ) : null}

      {alert.visible && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      )}

      {!viewingDefault && overBudgetCount > 0 && (
        <div className='alert alert-danger d-flex align-items-center mb-4'>
          <i className='bi bi-exclamation-triangle-fill me-2 fs-5'></i>
          <div>
            <strong>{overBudgetCount}</strong>{' '}
            {overBudgetCount === 1 ? 'category is' : 'categories are'} over
            budget.
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className='card shadow-sm'>
          <div className='card-body text-center py-5'>
            <i className='bi bi-piggy-bank fs-1 text-muted mb-3'></i>
            <h5 className='mb-3'>
              {viewingDefault
                ? 'No default budget set'
                : 'No budgets for this month'}
            </h5>
            <p className='text-muted mb-4'>
              {viewingDefault
                ? 'Add categories here to seed every future month.'
                : 'Add a budget to start tracking this month.'}
            </p>
            <button className='btn btn-primary' onClick={openAddModal}>
              <i className='bi bi-plus-lg me-2'></i>Add Budget
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`card shadow-sm ${isPending ? 'opacity-75' : ''}`}
          style={{ transition: 'opacity 150ms' }}
        >
          <div className='table-responsive'>
            <table className='table table-sm align-middle mb-0'>
              <thead className='table-light'>
                <tr>
                  <th className='ps-3'>Category</th>
                  <th className='text-end pe-3'>Limit</th>
                  {!viewingDefault && (
                    <>
                      <th className='text-end pe-3'>Spent</th>
                      <th className='text-end pe-3'>Remaining</th>
                      <th className='text-center'>Progress</th>
                    </>
                  )}
                  <th className='text-end pe-3'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => {
                  const status = getBudgetStatus(budget.spent, budget.limit);
                  const { remaining, percent, isOver, finitePercent, variant } =
                    status;
                  return (
                    <tr
                      key={budget._id || budget.category}
                      className={
                        !viewingDefault && isOver ? 'table-danger' : ''
                      }
                    >
                      <td className='ps-3 fw-medium'>
                        {budget.category}
                        {!viewingDefault && isOver && (
                          <span className='badge bg-danger ms-2'>
                            <i className='bi bi-exclamation-triangle-fill me-1'></i>
                            Over budget
                          </span>
                        )}
                      </td>
                      <td className='text-end pe-3'>
                        ₹{budget.limit?.toFixed(2) || '0.00'}
                      </td>
                      {!viewingDefault && (
                        <>
                          <td className='text-end pe-3'>
                            ₹{(budget.spent || 0).toFixed(2)}
                          </td>
                          <td
                            className={`text-end pe-3 fw-bold ${
                              isOver ? 'text-danger' : ''
                            }`}
                          >
                            {isOver
                              ? `Over by ₹${Math.abs(remaining).toFixed(2)}`
                              : `₹${remaining.toFixed(2)}`}
                          </td>
                          <td>
                            <div className='mx-2'>
                              <div
                                className='progress'
                                style={{ height: '6px' }}
                              >
                                <div
                                  className={`progress-bar bg-${variant} ${
                                    isOver
                                      ? 'progress-bar-striped progress-bar-animated'
                                      : ''
                                  }`}
                                  style={{
                                    width: `${Math.min(100, percent)}%`,
                                  }}
                                />
                              </div>
                              {isOver && finitePercent && (
                                <small className='text-danger fw-semibold'>
                                  +{Math.round(percent - 100)}% over
                                </small>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className='text-end pe-3'>
                        <div className='d-flex justify-content-end gap-2'>
                          <button
                            type='button'
                            className='spx-icon-btn spx-icon-btn--edit'
                            onClick={() => handleEdit(budget)}
                            aria-label={`Edit ${budget.category}`}
                            title='Edit budget'
                          >
                            <i className='bi bi-pencil'></i>
                          </button>
                          <button
                            type='button'
                            className='spx-icon-btn spx-icon-btn--delete'
                            onClick={() => handleDelete(budget.category)}
                            disabled={
                              budget.category === 'Others' ||
                              (!viewingDefault && budget.spent > 0)
                            }
                            aria-label={`Delete ${budget.category}`}
                            title={
                              budget.category === 'Others'
                                ? 'Default category cannot be deleted'
                                : !viewingDefault && budget.spent > 0
                                ? 'Cannot delete category with transactions'
                                : 'Delete budget'
                            }
                          >
                            <i className='bi bi-trash'></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BudgetModal
        show={showModal}
        onHide={() => setShowModal(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        loading={saving}
        editMode={editMode}
      />
    </div>
  );
}
