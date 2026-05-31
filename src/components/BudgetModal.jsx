'use client';

import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const BudgetModal = ({
  show,
  onHide,
  formData,
  setFormData,
  onSubmit,
  loading,
  editMode,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Modal show={show} onHide={onHide} centered size='lg'>
      <Modal.Header closeButton className='px-4 pt-4'>
        <Modal.Title as='h5' className='fw-bold'>
          {editMode ? 'Edit Budget' : 'Add Budget'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className='px-4 pb-4'>
        <Form onSubmit={onSubmit}>
          <div className='row g-3'>
            <Form.Group as='div' className='col-12 col-md-6 mb-3'>
              <Form.Label>Category</Form.Label>
              <Form.Control
                type='text'
                name='category'
                value={formData.category}
                onChange={handleChange}
                placeholder='e.g. Groceries'
                required
                // 'Others' is the reserved default — never renameable.
                // Any other category is editable, including in edit mode,
                // so the user can fix typos (the parent does a cascade
                // rename across budgets + transactions).
                disabled={editMode && formData.category === 'Others'}
              />
              {editMode && formData.category !== 'Others' && (
                <Form.Text className='text-muted'>
                  Changing the category name renames it across all months
                  and all existing transactions.
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group as='div' className='col-12 col-md-6 mb-3'>
              <Form.Label>Limit (₹)</Form.Label>
              <Form.Control
                type='number'
                name='limit'
                value={formData.limit}
                onChange={handleChange}
                placeholder='e.g. 300'
                min='0'
                step='0.01'
                required
              />
            </Form.Group>

            <div className='col-12 mt-2'>
              <Button
                type='submit'
                variant='primary'
                disabled={loading}
                className='w-100 py-2'
                size='lg'
              >
                {loading
                  ? 'Processing...'
                  : editMode
                  ? 'Update Budget'
                  : 'Add Budget'}
              </Button>
            </div>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default BudgetModal;
