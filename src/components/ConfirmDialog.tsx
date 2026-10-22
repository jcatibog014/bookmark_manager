import type { ReactNode } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({ title, description, confirmLabel, danger, onConfirm, onClose, children }: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      {children ? <div className="px-5 pt-4 pb-5">{children}</div> : <div className="h-4" />}
    </Modal>
  );
}
