import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAttendees } from '../hooks/useAttendees';
import { useMembers } from '../hooks/useMembers';
import { useToast } from '../contexts/ToastContext';
import { PAYMENT_METHODS, VENUES, ORGANIZERS, formatCurrency, formatDate, formatTime } from '../lib/constants';
import { ArrowLeft, Plus, Trash2, Edit3, X, UserPlus, Save } from 'lucide-react';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { attendees, loading: attLoading, addAttendee, updateAttendee, deleteAttendee } = useAttendees(id);
  const { members } = useMembers();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (error) {
        addToast('Event not found', 'error');
        navigate('/');
        return;
      }
      setEvent(data);
      setEditForm(data);
      setLoading(false);
    };
    fetchEvent();
  }, [id, navigate, addToast]);

  // Financial summary
  const summary = useMemo(() => {
    const totalCost = (event?.court_cost || 0) + (event?.shuttle_cost || 0);
    const totalIncome = attendees.reduce((sum, a) => sum + (a.amount_paid || 0), 0);
    const byMethod = {};
    PAYMENT_METHODS.forEach((m) => {
      byMethod[m] = attendees
        .filter((a) => a.payment_method === m)
        .reduce((sum, a) => sum + (a.amount_paid || 0), 0);
    });
    return { totalCost, totalIncome, balance: totalIncome - totalCost, byMethod };
  }, [attendees, event]);

  const handleSaveEvent = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          date: editForm.date,
          time: editForm.time,
          venue: editForm.venue,
          court_cost: Number(editForm.court_cost) || 0,
          shuttle_cost: Number(editForm.shuttle_cost) || 0,
          court_cost_paid_by: editForm.court_cost_paid_by || '',
          shuttle_cost_paid_by: editForm.shuttle_cost_paid_by || '',
          member_price: Number(editForm.member_price) || 0,
          non_member_price: Number(editForm.non_member_price) || 0,
          notes: editForm.notes || '',
        })
        .eq('id', id);
      if (error) throw error;
      setEvent({ ...event, ...editForm });
      setEditing(false);
      addToast('Event updated!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Delete this event and all its attendees?')) return;
    try {
      await supabase.from('attendees').delete().eq('event_id', id);
      await supabase.from('events').delete().eq('id', id);
      addToast('Event deleted', 'success');
      navigate('/');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="animate-in empty-state">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-title">Loading event...</div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center gap-md mb-md">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            {event.venue}
          </h1>
          <p className="text-secondary text-sm">
            {formatDate(event.date)}{event.time ? ` · ${formatTime(event.time)}` : ''}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
          <Edit3 size={14} /> {editing ? 'Cancel' : 'Edit'}
        </button>
        <button className="btn btn-danger btn-sm" onClick={handleDeleteEvent}>
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* Editable Event Details */}
      {editing && (
        <div className="card mb-md animate-in">
          <div className="card-header">
            <span className="card-title">Edit Event Details</span>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={editForm.date || ''} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" type="time" value={editForm.time || ''} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <select className="form-input" value={editForm.venue || ''} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}>
                {VENUES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label">Court Cost (€)</label>
              <input className="form-input" type="number" step="0.01" value={editForm.court_cost || ''} onChange={(e) => setEditForm({ ...editForm, court_cost: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Court Paid By</label>
              <select className="form-input" value={editForm.court_cost_paid_by || ''} onChange={(e) => setEditForm({ ...editForm, court_cost_paid_by: e.target.value })}>
                <option value="">Not specified</option>
                {ORGANIZERS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label">Shuttle Cost (€)</label>
              <input className="form-input" type="number" step="0.01" value={editForm.shuttle_cost || ''} onChange={(e) => setEditForm({ ...editForm, shuttle_cost: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Shuttle Paid By</label>
              <select className="form-input" value={editForm.shuttle_cost_paid_by || ''} onChange={(e) => setEditForm({ ...editForm, shuttle_cost_paid_by: e.target.value })}>
                <option value="">Not specified</option>
                {ORGANIZERS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label">Member Price (€)</label>
              <input className="form-input" type="number" step="0.01" value={editForm.member_price || ''} onChange={(e) => setEditForm({ ...editForm, member_price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Non-Member Price (€)</label>
              <input className="form-input" type="number" step="0.01" value={editForm.non_member_price || ''} onChange={(e) => setEditForm({ ...editForm, non_member_price: e.target.value })} />
            </div>
          </div>
          <div className="form-group mt-md">
            <label className="form-label">Notes</label>
            <input className="form-input" type="text" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </div>
          <div className="mt-md">
            <button className="btn btn-primary" onClick={handleSaveEvent}>
              <Save size={14} /> Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Costs</div>
          <div className="stat-value danger">{formatCurrency(summary.totalCost)}</div>
          <div className="text-xs text-muted mt-md">
            Courts: {formatCurrency(event.court_cost)}{event.court_cost_paid_by ? ` (${event.court_cost_paid_by})` : ''} · Shuttles: {formatCurrency(event.shuttle_cost)}{event.shuttle_cost_paid_by ? ` (${event.shuttle_cost_paid_by})` : ''}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Income</div>
          <div className="stat-value success">{formatCurrency(summary.totalIncome)}</div>
          <div className="text-xs text-muted mt-md">
            From {attendees.length} player{attendees.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Balance</div>
          <div className={`stat-value ${summary.balance >= 0 ? 'success' : 'danger'}`}>
            {summary.balance >= 0 ? '+' : ''}{formatCurrency(summary.balance)}
          </div>
        </div>
      </div>

      {/* Income by Payment Method */}
      <div className="card mb-md">
        <div className="card-header">
          <span className="card-title">Income by Payment Method</span>
        </div>
        <div className="form-row">
          {PAYMENT_METHODS.map((method) => (
            <div key={method} style={{ textAlign: 'center' }}>
              <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {method}
              </div>
              <div className="font-bold" style={{ fontSize: 'var(--font-size-lg)', marginTop: 4 }}>
                {formatCurrency(summary.byMethod[method])}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendees */}
      <div className="detail-section">
        <div className="flex justify-between items-center mb-md">
          <div className="detail-section-title">
            <UserPlus size={16} /> Attendees ({attendees.length})
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddAttendee(true)}>
            <Plus size={14} /> Add Player
          </button>
        </div>

        {attLoading ? (
          <p className="text-muted">Loading attendees...</p>
        ) : attendees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No attendees yet</div>
            <p className="text-muted text-sm">Add players who are joining this session.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th>Method</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.name}</td>
                    <td>
                      <span className={`badge ${a.is_member ? 'badge-member' : 'badge-nonmember'}`}>
                        {a.is_member ? 'Member' : 'Non-Member'}
                      </span>
                    </td>
                    <td>{formatCurrency(a.amount_paid)}</td>
                    <td className="text-secondary">{a.payment_method}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => {
                          if (window.confirm(`Remove ${a.name}?`)) deleteAttendee(a.id);
                        }}
                        aria-label={`Remove ${a.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {event.notes && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Notes</div>
          <p className="text-secondary text-sm">{event.notes}</p>
        </div>
      )}

      {showAddAttendee && (
        <AddAttendeeModal
          event={event}
          members={members}
          onClose={() => setShowAddAttendee(false)}
          onAdd={async (data) => {
            try {
              await addAttendee(data);
              addToast(`${data.name} added!`, 'success');
            } catch (err) {
              addToast(err.message, 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function AddAttendeeModal({ event, members, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [amountPaid, setAmountPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [foundMember, setFoundMember] = useState(null);

  // Auto-fill price based on membership status
  useEffect(() => {
    if (isMember && event.member_price) {
      setAmountPaid(String(event.member_price));
    } else if (!isMember && event.non_member_price) {
      setAmountPaid(String(event.non_member_price));
    }
  }, [isMember, event.member_price, event.non_member_price]);

  // Check if selected name is a member
  const handleNameChange = (val) => {
    setName(val);
    const found = members.find((m) => m.name.toLowerCase() === val.toLowerCase());
    setFoundMember(found || null);
    if (found) setIsMember(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onAdd({
      name,
      is_member: isMember,
      payment_method: paymentMethod,
      amount_paid: Number(amountPaid) || 0,
    });
    setName('');
    setAmountPaid('');
    setFoundMember(null);
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Player</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="attendee-name">Name</label>
            <input
              id="attendee-name"
              className="form-input"
              type="text"
              placeholder="Player name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              list="member-suggestions"
              required
            />
            {foundMember && (
              <div className="text-xs mt-sm" style={{ color: 'var(--success)', fontWeight: 500 }}>
                ✓ Found in members list!
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  if (foundMember.membership_start && foundMember.membership_end) {
                    if (today > foundMember.membership_end) return <span style={{ color: 'var(--danger)', marginLeft: 6 }}>(Membership Expired)</span>;
                    return <span style={{ opacity: 0.8, marginLeft: 6 }}>(Active)</span>;
                  }
                  return '';
                })()}
              </div>
            )}
            <datalist id="member-suggestions">
              {members.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </div>

          <div className="form-group mt-md">
            <label className="form-label">Status</label>
            <div className="flex gap-sm">
              <button
                type="button"
                className={`btn btn-sm ${isMember ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsMember(true)}
              >
                Member
              </button>
              <button
                type="button"
                className={`btn btn-sm ${!isMember ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsMember(false)}
              >
                Non-Member
              </button>
            </div>
          </div>

          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label" htmlFor="attendee-amount">Amount Paid (€)</label>
              <input
                id="attendee-amount"
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="attendee-method">Paid To</label>
              <select
                id="attendee-method"
                className="form-input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
