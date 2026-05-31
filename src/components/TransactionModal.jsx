'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select';
import Alert from './Alert';
import api from '@/lib/axios';
import { todayLocalISO } from '@/utils/formatDate';

// Date-driven category loading: the available categories depend on the
// transaction's *date* (the month-specific budget for that month, falling
// back to the default template). Picking a date before the category makes
// the dropdown reflect what's actually budgeted for that month.
const TransactionModal = ({ show, onHide, onSave, transaction }) => {
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [budgetError, setBudgetError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  // Tracks the last month we fetched so changing day-of-month doesn't
  // trigger a refetch when the month is the same.
  const lastFetchedMonthRef = useRef(null);

  const isEdit = transaction && Object.keys(transaction).length > 0;

  // Reset/hydrate form state during render when `show` or `transaction` changes,
  // avoiding cascading re-renders from useEffect.
  const [prevTransaction, setPrevTransaction] = useState(transaction);
  const [prevShow, setPrevShow] = useState(show);

  if (transaction !== prevTransaction || show !== prevShow) {
    setPrevTransaction(transaction);
    setPrevShow(show);
    
    if (show) {
      setBudgetError(null);
      if (isEdit) {
        setAmount(transaction.amount || '');
        setCategory(transaction.category || '');
        setDate(transaction.date ? transaction.date.slice(0, 10) : '');
        setDescription(transaction.description || '');
      } else {
        setAmount('');
        setCategory('');
        setDate(todayLocalISO());
        setDescription('');
      }
      setLoading(false);
    }
  }

  // Force re-fetch on next open
  useEffect(() => {
    if (show) lastFetchedMonthRef.current = null;
  }, [show]);

  // Fetch the budget's categories for whatever month the date falls in.
  // Refires only when the *month* changes (not on every day-of-month tweak).
  useEffect(() => {
    if (!show || !date) return;
    const month = date.slice(0, 7); // "YYYY-MM"
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    if (month === lastFetchedMonthRef.current) return;
    lastFetchedMonthRef.current = month;

    let cancelled = false;
    setCategoriesLoading(true);
    (async () => {
      try {
        const res = await api.get(`/budgets?month=${month}`);
        if (cancelled) return;
        const cats = (res.data?.budgets || []).map((b) => b.category);
        setCategories(cats);
        // Currently-selected category may not exist in the new month.
        // Use a functional update to avoid stale closure.
        setCategory((prev) => (cats.includes(prev) ? prev : ''));
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setBudgetError(null);

    if (!date) {
      setBudgetError('Please pick a date first.');
      setLoading(false);
      return;
    }
    if (date > todayLocalISO()) {
      setBudgetError('Transaction date cannot be in the future.');
      setLoading(false);
      return;
    }
    if (!category) {
      setBudgetError('Please pick a category.');
      setLoading(false);
      return;
    }

    try {
      await onSave({
        amount: Number(amount),
        category,
        date,
        description,
      });
    } catch (err) {
      setBudgetError('Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories.map((c) => ({ label: c, value: c }));
  const monthLabel = date && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : null;
  const showNoBudgetHint =
    !categoriesLoading && categories.length === 0 && date;

  return (
    <Modal show={show} onHide={onHide} centered scrollable>
      <Modal.Header closeButton className='px-4 pt-4'>
        <Modal.Title as='h5' className='fw-bold'>
          {isEdit ? 'Edit Transaction' : 'Add Transaction'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className='px-4 pb-4'>
        {budgetError && (
          <Alert
            type='danger'
            message={budgetError}
            onClose={() => setBudgetError(null)}
          />
        )}

        <Form onSubmit={handleSubmit}>
          {/* 1. Date first — drives which categories are available. */}
          <Form.Group className='mb-3'>
            <Form.Label>Date</Form.Label>
            <Form.Control
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              max={todayLocalISO()}
            />
          </Form.Group>

          {/* 2. Category — loaded from the budget for `date`'s month. */}
          <Form.Group className='mb-3'>
            <Form.Label>
              Category
              {monthLabel && (
                <small className='text-muted ms-2'>
                  (for {monthLabel})
                </small>
              )}
            </Form.Label>
            <Select
              options={categoryOptions}
              value={
                categoryOptions.find((opt) => opt.value === category) || null
              }
              onChange={(selected) => setCategory(selected?.value || '')}
              placeholder={
                categoriesLoading
                  ? 'Loading categories…'
                  : categories.length === 0
                  ? 'No budget for this month'
                  : 'Select category'
              }
              isDisabled={categoriesLoading || categories.length === 0}
              isLoading={categoriesLoading}
              classNamePrefix='Select'
              styles={{
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                  maxHeight: 200,
                  overflowY: 'auto',
                }),
                menuList: (base) => ({
                  ...base,
                  maxHeight: 200,
                  overflowY: 'auto',
                }),
              }}
            />
            {showNoBudgetHint && (
              <Form.Text className='text-muted'>
                No budget set for this month. Add one on the Budgets page
                before logging a transaction.
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className='mb-3'>
            <Form.Label>Amount (₹)</Form.Label>
            <Form.Control
              type='number'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min='0.01'
              step='0.01'
            />
          </Form.Group>

          <Form.Group className='mb-3'>
            <Form.Label>Description</Form.Label>
            <Form.Control
              type='text'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Group>

          <Button
            type='submit'
            variant='primary'
            disabled={loading || categoriesLoading || !category}
            className='w-100 py-2'
            size='lg'
          >
            {loading ? (
              <>
                <span className='spinner-border spinner-border-sm me-2'></span>
                {isEdit ? 'Updating...' : 'Adding...'}
              </>
            ) : isEdit ? (
              'Update'
            ) : (
              'Add'
            )}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default TransactionModal;
