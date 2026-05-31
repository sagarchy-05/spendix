'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { Modal, Button } from 'react-bootstrap';

// Imperative confirm dialog: one provider mounted in the app shell, callers
// just `await confirm({ ... })` from anywhere.
//
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: 'Delete transaction?',
//     body: 'This action cannot be undone.',
//     confirmLabel: 'Delete',
//     confirmVariant: 'danger',
//   });
//   if (!ok) return;
//
// Resolves false on cancel, ESC, backdrop click, or close button.

const ConfirmContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      // If a dialog is somehow already open (e.g. quick double-trigger),
      // resolve the previous one as cancelled before replacing it.
      if (resolverRef.current) resolverRef.current(false);
      resolverRef.current = resolve;
      setOpts(options || {});
    });
  }, []);

  const settle = (value) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    r?.(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal show={!!opts} onHide={() => settle(false)} centered>
        <Modal.Header closeButton className='px-4 pt-4'>
          <Modal.Title as='h5' className='fw-bold'>
            {opts?.title || 'Are you sure?'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='px-4'>
          {typeof opts?.body === 'string' ? (
            <p className='mb-0'>{opts.body}</p>
          ) : (
            opts?.body
          )}
        </Modal.Body>
        <Modal.Footer className='px-4 pb-4'>
          <Button variant='secondary' onClick={() => settle(false)}>
            {opts?.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant={opts?.confirmVariant || 'primary'}
            onClick={() => settle(true)}
            autoFocus
          >
            {opts?.confirmLabel || 'OK'}
          </Button>
        </Modal.Footer>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error(
      'useConfirm() must be used inside <ConfirmDialogProvider>'
    );
  }
  return ctx;
}
