import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="modal-body">
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>{message}</p>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button
          className={`btn ${danger ? 'danger-ghost' : 'primary'}`}
          style={danger ? { background: 'var(--danger-dim)', color: 'var(--danger)', borderColor: 'rgba(239,68,68,.3)' } : {}}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
