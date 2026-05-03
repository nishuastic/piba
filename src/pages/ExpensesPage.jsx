import { useState, useMemo } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useMembers } from '../hooks/useMembers';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate, ORGANIZERS } from '../lib/constants';
import { Plus, Trash2, Edit3, X, Save, Search, Receipt, ChevronDown, ChevronUp, Check, Circle } from 'lucide-react';

export default function ExpensesPage({ isEmbedded }) {
  const { expenses, loading, createExpense, updateExpense, deleteExpense, toggleSettled } = useExpenses();
  const { members } = useMembers();
  const { addToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = expenses.filter((exp) =>
    exp.description.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);
    const totalUnsettled = expenses.reduce((sum, e) => {
      return sum + (e.expense_splits || [])
        .filter((s) => !s.settled)
        .reduce((s2, sp) => s2 + (Number(sp.share_amount) || 0), 0);
    }, 0);
    return { totalExpenses, totalUnsettled, count: expenses.length };
  }, [expenses]);

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.description}"?`)) return;
    try {
      await deleteExpense(expense.id);
      addToast('Expense deleted', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleSettled = async (splitId, currentSettled) => {
    try {
      await toggleSettled(splitId, !currentSettled);
      addToast(currentSettled ? 'Marked as unsettled' : 'Marked as settled', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="animate-in">
      {!isEmbedded && (
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>Expenses</h1>
            <p>Track one-off costs split among members</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Expense
          </button>
        </div>
      )}
      
      {isEmbedded && (
        <div className="flex justify-between items-center mb-md">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Expenses</h2>
            <p className="text-sm text-muted">Track one-off costs split among members</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Expense
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value danger">{formatCurrency(stats.totalExpenses)}</div>
          <div className="text-xs text-muted mt-md">{stats.count} expense(s)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unsettled Amount</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {formatCurrency(stats.totalUnsettled)}
          </div>
          <div className="text-xs text-muted mt-md">Still owed by members</div>
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
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">Loading expenses...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💸</div>
          <div className="empty-state-title">
            {search ? 'No expenses found' : 'No expenses yet'}
          </div>
          <p className="text-muted text-sm">
            {search ? 'Try a different search.' : 'Add your first one-off expense to split among members!'}
          </p>
        </div>
      ) : (
        <div className="expenses-list">
          {filtered.map((expense) => {
            const isExpanded = expandedId === expense.id;
            const splits = expense.expense_splits || [];
            const settledCount = splits.filter((s) => s.settled).length;
            const allSettled = splits.length > 0 && settledCount === splits.length;

            return (
              <div key={expense.id} className={`card expense-card mb-md ${allSettled ? 'expense-settled' : ''}`}>
                <div
                  className="expense-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-md" style={{ flex: 1 }}>
                    <div className="expense-icon">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <div className="font-semibold">{expense.description}</div>
                      <div className="text-xs text-muted">
                        {formatDate(expense.date)}
                        {expense.paid_by ? ` · Paid by ${expense.paid_by}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-md">
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-bold" style={{ fontSize: 'var(--font-size-lg)' }}>
                        {formatCurrency(expense.total_amount)}
                      </div>
                      <div className="text-xs text-muted">
                        {splits.length > 0
                          ? `${settledCount}/${splits.length} settled`
                          : 'No splits'}
                      </div>
                    </div>
                    <div className="expense-chevron">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="expense-card-body animate-in">
                    {expense.notes && (
                      <div className="text-sm text-secondary mb-md" style={{ padding: '0 16px' }}>
                        📝 {expense.notes}
                      </div>
                    )}

                    {splits.length > 0 ? (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Member</th>
                              <th>Share</th>
                              <th>Status</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {splits.map((split) => (
                              <tr key={split.id} className={split.settled ? 'row-settled' : ''}>
                                <td className="font-semibold">
                                  {split.members?.name || 'Unknown'}
                                </td>
                                <td>{formatCurrency(split.share_amount)}</td>
                                <td>
                                  <span className={`badge ${split.settled ? 'badge-settled' : 'badge-unsettled'}`}>
                                    {split.settled ? 'Settled' : 'Owes'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    className={`btn btn-sm ${split.settled ? 'btn-ghost' : 'btn-primary'}`}
                                    onClick={() => handleToggleSettled(split.id, split.settled)}
                                    title={split.settled ? 'Mark as unsettled' : 'Mark as settled'}
                                  >
                                    {split.settled ? <Circle size={14} /> : <Check size={14} />}
                                    {split.settled ? 'Undo' : 'Settle'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted text-sm" style={{ padding: '0 16px' }}>
                        No members assigned to this expense.
                      </p>
                    )}

                    <div className="expense-card-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingId(expense.id)}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(expense)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <ExpenseModal
          members={members}
          onClose={() => setShowCreate(false)}
          onSave={async (data) => {
            try {
              await createExpense(data);
              addToast('Expense added!', 'success');
              setShowCreate(false);
            } catch (err) {
              addToast(err.message, 'error');
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {editingId && (() => {
        const expense = expenses.find((e) => e.id === editingId);
        if (!expense) return null;
        return (
          <ExpenseModal
            expense={expense}
            members={members}
            onClose={() => setEditingId(null)}
            onSave={async (data) => {
              try {
                await updateExpense(editingId, data);
                addToast('Expense updated!', 'success');
                setEditingId(null);
              } catch (err) {
                addToast(err.message, 'error');
              }
            }}
          />
        );
      })()}
    </div>
  );
}

function ExpenseModal({ expense, members, onClose, onSave }) {
  const [form, setForm] = useState({
    description: expense?.description || '',
    total_amount: expense?.total_amount || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    paid_by: expense?.paid_by || '',
    notes: expense?.notes || '',
  });
  const [selectedMembers, setSelectedMembers] = useState(() => {
    if (expense?.expense_splits) {
      return expense.expense_splits.map((s) => s.member_id || s.members?.id).filter(Boolean);
    }
    return [];
  });
  const [selectAll, setSelectAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const perPerson = selectedMembers.length > 0 && Number(form.total_amount) > 0
    ? Math.round((Number(form.total_amount) / selectedMembers.length) * 100) / 100
    : 0;

  const handleChange = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleToggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSave({
      description: form.description,
      total_amount: Number(form.total_amount) || 0,
      date: form.date,
      paid_by: form.paid_by,
      notes: form.notes,
      member_ids: selectedMembers,
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{expense ? 'Edit Expense' : 'New Expense'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="expense-desc">Description</label>
            <input
              id="expense-desc"
              className="form-input"
              type="text"
              placeholder="e.g. Shuttlecocks (Yonex AS-50)"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              required
            />
          </div>

          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label" htmlFor="expense-amount">Total Amount (€)</label>
              <input
                id="expense-amount"
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.total_amount}
                onChange={(e) => handleChange('total_amount', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="expense-date">Date</label>
              <input
                id="expense-date"
                className="form-input"
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label" htmlFor="expense-paid-by">Paid By</label>
              <select
                id="expense-paid-by"
                className="form-input"
                value={form.paid_by}
                onChange={(e) => handleChange('paid_by', e.target.value)}
              >
                <option value="">Not specified</option>
                {ORGANIZERS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="expense-notes">Notes</label>
              <input
                id="expense-notes"
                className="form-input"
                type="text"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Member Selection */}
          <div className="form-group mt-md">
            <div className="flex justify-between items-center">
              <label className="form-label">Split Among Members</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleSelectAll}>
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="member-select-grid">
              {members.map((m) => {
                const isSelected = selectedMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`member-select-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleMember(m.id)}
                  >
                    {isSelected ? <Check size={12} /> : null}
                    {m.name}
                  </button>
                );
              })}
            </div>

            {selectedMembers.length > 0 && Number(form.total_amount) > 0 && (
              <div className="per-person-preview">
                <div className="per-person-label">Per person</div>
                <div className="per-person-amount">{formatCurrency(perPerson)}</div>
                <div className="per-person-detail">
                  {formatCurrency(form.total_amount)} ÷ {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (expense ? 'Update Expense' : 'Add Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
