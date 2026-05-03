import { useState } from 'react';
import { useMembers } from '../hooks/useMembers';
import { useMemberExpenseTotals } from '../hooks/useExpenses';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../lib/constants';
import { Plus, Trash2, Edit3, Upload, X, Save, Search, RefreshCw } from 'lucide-react';

export default function MembersPage() {
  const { members, loading, addMember, updateMember, deleteMember, bulkAddMembers } = useMembers();
  const { totals: expenseTotals, loading: expLoading } = useMemberExpenseTotals();
  const { addToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState('');

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalFees = members.reduce((sum, m) => sum + (m.membership_fee_paid || 0), 0);
  const totalExpenseShares = members.reduce((sum, m) => {
    const exp = expenseTotals[m.id];
    return sum + (exp?.unsettled || 0);
  }, 0);

  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      membership_fee_paid: member.membership_fee_paid || 0,
      membership_start: member.membership_start || '',
      membership_end: member.membership_end || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      await updateMember(editingId, {
        name: editForm.name,
        membership_fee_paid: Number(editForm.membership_fee_paid) || 0,
        membership_start: editForm.membership_start || null,
        membership_end: editForm.membership_end || null,
      });
      setEditingId(null);
      addToast('Member updated!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Remove ${member.name} from the member list?`)) return;
    try {
      await deleteMember(member.id);
      addToast(`${member.name} removed`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleRenew = async (member) => {
    if (!window.confirm(`Renew ${member.name} for Aug 1st, 2026 – Sep 30th, 2026?`)) return;
    try {
      await updateMember(member.id, {
        membership_start: '2026-08-01',
        membership_end: '2026-09-30',
      });
      addToast(`${member.name} renewed for Aug–Sep 2026!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Members</h1>
          <p>Manage your club membership list</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={() => setShowBulk(true)}>
            <Upload size={14} /> Bulk Add
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Members</div>
          <div className="stat-value accent">{members.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Membership Fees Collected</div>
          <div className="stat-value success">{formatCurrency(totalFees)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unsettled Expenses</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {formatCurrency(totalExpenseShares)}
          </div>
          <div className="text-xs text-muted mt-md">Owed by members for one-off costs</div>
        </div>
      </div>

      {/* Search */}
      <div className="form-group mb-md" style={{ maxWidth: 360 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            className="form-input"
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">Loading members...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">
            {search ? 'No members found' : 'No members yet'}
          </div>
          <p className="text-muted text-sm">
            {search ? 'Try a different search term.' : 'Add your club members to get started!'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Period</th>
                <th>Membership Fee</th>
                <th>Expense Share</th>
                <th>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const expData = expenseTotals[m.id];
                const unsettledExpense = expData?.unsettled || 0;
                const balance = (m.membership_fee_paid || 0) - unsettledExpense;

                const today = new Date().toISOString().split('T')[0];
                const isActive = m.membership_start && m.membership_end && today >= m.membership_start && today <= m.membership_end;
                const isExpired = m.membership_end && today > m.membership_end;

                return (
                  <tr key={m.id}>
                    <td>
                      {editingId === m.id ? (
                        <input
                          className="form-input"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={{ maxWidth: 200 }}
                        />
                      ) : (
                        <span className="font-semibold">{m.name}</span>
                      )}
                    </td>
                    <td>
                      {editingId === m.id ? (
                        <div className="flex gap-xs">
                          <input
                            className="form-input"
                            type="date"
                            value={editForm.membership_start}
                            onChange={(e) => setEditForm({ ...editForm, membership_start: e.target.value })}
                            style={{ maxWidth: 130 }}
                          />
                          <span style={{ paddingTop: 8 }}>-</span>
                          <input
                            className="form-input"
                            type="date"
                            value={editForm.membership_end}
                            onChange={(e) => setEditForm({ ...editForm, membership_end: e.target.value })}
                            style={{ maxWidth: 130 }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-xs">
                          <span className="text-secondary text-sm">
                            {m.membership_start ? new Date(m.membership_start).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                            {' - '}
                            {m.membership_end ? new Date(m.membership_end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                          </span>
                          {isActive && <span className="badge badge-settled" style={{ width: 'fit-content', fontSize: '0.65rem', padding: '2px 6px' }}>Active</span>}
                          {isExpired && <span className="badge badge-unsettled" style={{ width: 'fit-content', fontSize: '0.65rem', padding: '2px 6px' }}>Expired</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      {editingId === m.id ? (
                        <input
                          className="form-input"
                          type="number"
                          step="0.01"
                          value={editForm.membership_fee_paid}
                          onChange={(e) => setEditForm({ ...editForm, membership_fee_paid: e.target.value })}
                          style={{ maxWidth: 120 }}
                        />
                      ) : (
                        formatCurrency(m.membership_fee_paid)
                      )}
                    </td>
                    <td>
                      {unsettledExpense > 0 ? (
                        <span style={{ color: 'var(--warning)' }}>
                          -{formatCurrency(unsettledExpense)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`font-semibold ${balance >= 0 ? '' : ''}`} style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatCurrency(balance)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {editingId === m.id ? (
                        <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                            <Save size={12} /> Save
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => handleRenew(m)} 
                            title="Renew for Aug-Sep 2026"
                          >
                            <RefreshCw size={12} /> Renew
                          </button>
                          <button className="btn btn-ghost btn-icon" onClick={() => handleStartEdit(m)} aria-label={`Edit ${m.name}`}>
                            <Edit3 size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(m)} aria-label={`Delete ${m.name}`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Single Member Modal */}
      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onAdd={async (data) => {
            try {
              await addMember(data);
              addToast(`${data.name} added!`, 'success');
              setShowAdd(false);
            } catch (err) {
              addToast(err.message, 'error');
            }
          }}
        />
      )}

      {/* Bulk Add Modal */}
      {showBulk && (
        <BulkAddModal
          onClose={() => setShowBulk(false)}
          onBulkAdd={async (data) => {
            try {
              await bulkAddMembers(data);
              addToast(`${data.length} members added!`, 'success');
              setShowBulk(false);
            } catch (err) {
              addToast(err.message, 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  
  // Default to Sep 1st of current/next year to Aug 31st of following year
  const defaultStart = (() => {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-09-01`;
  })();
  const defaultEnd = (() => {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
    return `${year}-08-31`;
  })();

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onAdd({ 
      name, 
      membership_fee_paid: Number(fee) || 0, 
      membership_start: start || null,
      membership_end: end || null
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-member-name">Name</label>
            <input
              id="new-member-name"
              className="form-input"
              type="text"
              placeholder="Member name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label" htmlFor="new-member-fee">Membership Fee Paid (€)</label>
              <input
                id="new-member-fee"
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Period</label>
              <div className="flex gap-xs">
                <input
                  className="form-input"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
                <span style={{ paddingTop: 8 }}>-</span>
                <input
                  className="form-input"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkAddModal({ onClose, onBulkAdd }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const names = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (names.length === 0) return;
    setSubmitting(true);
    await onBulkAdd(names.map((name) => ({ name, membership_fee_paid: 0 })));
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Bulk Add Members</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="bulk-names">
              Paste names (one per line)
            </label>
            <textarea
              id="bulk-names"
              className="form-input"
              rows={8}
              placeholder={"Alice Johnson\nBob Smith\nCharlie Brown"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>
          <p className="text-xs text-muted mt-md">
            {text.split('\n').filter((l) => l.trim()).length} name(s) detected. Membership fees can be set individually after import.
          </p>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Import Members'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
