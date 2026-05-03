import { useState, useMemo } from 'react';
import { useTransfers } from '../hooks/useTransfers';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate, ORGANIZERS } from '../lib/constants';
import { Plus, Trash2, Edit3, X, Save, ArrowRightLeft } from 'lucide-react';

export default function TransfersPage({ isEmbedded }) {
  const { transfers, loading, addTransfer, deleteTransfer } = useTransfers();
  const { addToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (transfer) => {
    if (!window.confirm(`Delete transfer of ${formatCurrency(transfer.amount)} from ${transfer.from_admin} to ${transfer.to_admin}?`)) return;
    try {
      await deleteTransfer(transfer.id);
      addToast('Transfer deleted', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className={!isEmbedded ? "animate-in" : ""}>
      {!isEmbedded && (
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>Transfers</h1>
            <p>Manage admin-to-admin settlements</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Transfer
          </button>
        </div>
      )}
      
      {isEmbedded && (
        <div className="flex justify-end mb-md">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Transfer
          </button>
        </div>
      )}

      {/* Transfers List */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">Loading transfers...</div>
        </div>
      ) : transfers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💸</div>
          <div className="empty-state-title">No transfers yet</div>
          <p className="text-muted text-sm">Add settlements between organizers to balance out the ledger.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td className="text-muted">{formatDate(t.date)}</td>
                  <td className="font-semibold" style={{ color: 'var(--danger)' }}>{t.from_admin}</td>
                  <td className="font-semibold" style={{ color: 'var(--success)' }}>{t.to_admin}</td>
                  <td className="font-bold">{formatCurrency(t.amount)}</td>
                  <td className="text-muted text-sm">{t.notes || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(t)} aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <TransferModal
          onClose={() => setShowCreate(false)}
          onSave={async (data) => {
            try {
              await addTransfer(data);
              addToast('Transfer added!', 'success');
              setShowCreate(false);
            } catch (err) {
              addToast(err.message, 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function TransferModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    from_admin: ORGANIZERS[0],
    to_admin: ORGANIZERS[1] || ORGANIZERS[0],
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.from_admin === form.to_admin) {
      alert("Sender and receiver cannot be the same person.");
      return;
    }
    setSubmitting(true);
    await onSave({
      from_admin: form.from_admin,
      to_admin: form.to_admin,
      amount: Number(form.amount) || 0,
      date: form.date,
      notes: form.notes,
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Record Transfer</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-from">From</label>
              <select
                id="transfer-from"
                className="form-input"
                value={form.from_admin}
                onChange={(e) => handleChange('from_admin', e.target.value)}
              >
                {ORGANIZERS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-center pt-lg text-muted">
              <ArrowRightLeft size={16} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-to">To</label>
              <select
                id="transfer-to"
                className="form-input"
                value={form.to_admin}
                onChange={(e) => handleChange('to_admin', e.target.value)}
              >
                {ORGANIZERS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-amount">Amount (€)</label>
              <input
                id="transfer-amount"
                className="form-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-date">Date</label>
              <input
                id="transfer-date"
                className="form-input"
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group mt-md">
            <label className="form-label" htmlFor="transfer-notes">Notes</label>
            <input
              id="transfer-notes"
              className="form-input"
              type="text"
              placeholder="e.g. Settle August courts"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Record Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
