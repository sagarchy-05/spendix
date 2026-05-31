'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { FaFilePdf, FaPlus, FaEdit, FaTrash, FaFilter } from 'react-icons/fa';
import Alert from '@/components/Alert';
import TransactionModal from '@/components/TransactionModal';
import MonthPicker from '@/components/MonthPicker';
import { useConfirm } from '@/components/ConfirmDialog';
import exportToPDF from '@/utils/exportToPDF';
import api from '@/lib/axios';

export default function TransactionsClient({
  initialTransactions,
  initialCategories,
  monthLabel,
  monthDisplay,
  prevMonth,
  nextMonth,
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  // Server data — read directly from props, never cloned into useState.
  const transactions = initialTransactions;
  const budgets = initialCategories;

  // Transient client state
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '', visible: false });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  const filteredTransactions = useMemo(() => {
    if (selectedCategory?.value) {
      return transactions.filter((tx) => tx.category === selectedCategory.value);
    }
    return transactions;
  }, [selectedCategory, transactions]);

  const exportFilteredTransactions = async () => {
    setIsExporting(true);
    const tempTable = document.createElement('table');
    tempTable.className = 'table table-hover mb-0';
    tempTable.id = 'tempPdfTable';

    const thead = document.createElement('thead');
    thead.className = 'table-light';
    thead.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Category</th>
        <th>Amount</th>
        <th>Description</th>
      </tr>
    `;
    tempTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    filteredTransactions.forEach((tx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(tx.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}</td>
        <td>${tx.category}</td>
        <td>₹${tx.amount.toFixed(2)}</td>
        <td>${tx.description || '-'}</td>
      `;
      tbody.appendChild(row);
    });
    tempTable.appendChild(tbody);

    tempTable.style.position = 'absolute';
    tempTable.style.left = '-9999px';
    document.body.appendChild(tempTable);

    try {
      await exportToPDF('tempPdfTable', 'transactions.pdf');
    } finally {
      document.body.removeChild(tempTable);
      setIsExporting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete transaction?',
      body: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/transactions/delete/${id}`);
      setAlert({
        type: 'success',
        message: 'Transaction deleted successfully!',
        visible: true,
      });
      refresh();
    } catch (error) {
      setAlert({
        type: 'danger',
        message:
          error.response?.data?.message || 'Failed to delete transaction',
        visible: true,
      });
    }
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedTransaction({});
    setShowModal(true);
  };

  const handleSave = async (data) => {
    try {
      const payload = {
        amount: Number(data.amount),
        category: data.category,
        date: data.date,
        description: data.description,
      };

      if (selectedTransaction && selectedTransaction._id) {
        await api.put(`/transactions/${selectedTransaction._id}`, payload);
        setAlert({
          type: 'success',
          message: 'Transaction updated successfully!',
          visible: true,
        });
      } else {
        await api.post('/transactions/create', payload);
        setAlert({
          type: 'success',
          message: 'Transaction added successfully!',
          visible: true,
        });
      }

      setShowModal(false);
      refresh();
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || 'Transaction operation failed',
        visible: true,
      });
    }
  };

  const categoryOptions = [
    { value: null, label: 'All Categories' },
    ...budgets.map((category) => ({ value: category, label: category })),
  ];

  return (
    <div className='container py-4'>
      <div className='d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3'>
        <div className='d-flex flex-wrap align-items-center gap-3'>
          <h2 className='fw-bold mb-0'>Transactions</h2>
          <MonthPicker
            label={monthLabel}
            display={monthDisplay}
            prev={prevMonth}
            next={nextMonth}
            noFuture
          />
        </div>

        <div className='d-flex flex-wrap gap-2 align-items-center'>
          <div style={{ width: '180px' }}>
            <Select
              options={categoryOptions}
              value={selectedCategory || categoryOptions[0]}
              onChange={setSelectedCategory}
              placeholder='Filter'
              isSearchable
              classNamePrefix='react-select'
              className='category-select'
            />
          </div>

          <button
            className='btn btn-outline-danger d-flex align-items-center py-2'
            onClick={exportFilteredTransactions}
            disabled={isExporting || filteredTransactions.length === 0}
          >
            {isExporting ? (
              <>
                <span className='spinner-border spinner-border-sm me-1' />
                <span className='d-none d-sm-inline'>Exporting…</span>
              </>
            ) : (
              <>
                <FaFilePdf className='me-1' />
                <span className='d-none d-sm-inline'>Export</span>
              </>
            )}
          </button>

          <button
            className='btn btn-primary d-flex align-items-center py-2'
            onClick={handleAdd}
          >
            <FaPlus className='me-1' />
            <span className='d-none d-sm-inline'>Add New</span>
          </button>
        </div>
      </div>

      {alert.visible && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      )}

      {filteredTransactions.length === 0 ? (
        <div className='card shadow-sm'>
          <div className='card-body text-center py-5'>
            <FaFilter className='text-muted fs-1 mb-3' />
            <h4>No Transactions Found</h4>
            <p className='text-muted mb-4'>
              {selectedCategory?.value
                ? `No transactions in "${selectedCategory.label}" category`
                : 'Add your first transaction to get started'}
            </p>
            <button className='btn btn-primary' onClick={handleAdd}>
              <FaPlus className='me-2' />
              Add Transaction
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`card shadow-sm border-0 overflow-hidden ${
            isPending ? 'opacity-75' : ''
          }`}
          style={{ transition: 'opacity 150ms' }}
        >
          <div className='table-responsive' id='transactionsTable'>
            <table className='table table-hover mb-0'>
              <thead className='table-light'>
                <tr>
                  <th className='ps-4'>Date</th>
                  <th>Category</th>
                  <th className='text-end'>Amount</th>
                  <th>Description</th>
                  <th className='pe-4 text-end'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className='ps-4'>
                      {new Date(tx.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className='badge bg-light text-dark'>
                        {tx.category}
                      </span>
                    </td>
                    <td className='text-end fw-bold'>
                      ₹{tx.amount.toFixed(2)}
                    </td>
                    <td className='text-truncate' style={{ maxWidth: '200px' }}>
                      {tx.description || '-'}
                    </td>
                    <td className='pe-4 text-end'>
                      <div className='d-flex justify-content-end gap-2'>
                        <button
                          type='button'
                          className='spx-icon-btn spx-icon-btn--edit'
                          onClick={() => handleEdit(tx)}
                          aria-label='Edit transaction'
                          title='Edit'
                        >
                          <FaEdit />
                        </button>
                        <button
                          type='button'
                          className='spx-icon-btn spx-icon-btn--delete'
                          onClick={() => handleDelete(tx._id)}
                          aria-label='Delete transaction'
                          title='Delete'
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TransactionModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSave={handleSave}
        transaction={selectedTransaction}
      />
    </div>
  );
}
