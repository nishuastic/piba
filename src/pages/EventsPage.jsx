import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';
import { useToast } from '../contexts/ToastContext';
import { VENUES, formatCurrency, formatDate, formatTime } from '../lib/constants';
import { Plus, MapPin, Clock, Users, X, Copy } from 'lucide-react';

export default function EventsPage() {
  const { events, loading, createEvent } = useEvents();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [duplicating, setDuplicating] = useState(null);
  const [tab, setTab] = useState('upcoming');

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = events.filter((e) => new Date(e.date) >= now);
  const past = events.filter((e) => new Date(e.date) < now);
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="animate-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Events</h1>
          <p>Manage your badminton sessions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Event
        </button>
      </div>

      <div className="tab-pills">
        <button
          className={`tab-pill ${tab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setTab('upcoming')}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          className={`tab-pill ${tab === 'past' ? 'active' : ''}`}
          onClick={() => setTab('past')}
        >
          Past ({past.length})
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">Loading events...</div>
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">
            {tab === 'upcoming' ? 'No upcoming events' : 'No past events yet'}
          </div>
          <p className="text-muted text-sm">
            {tab === 'upcoming'
              ? 'Create your first event to get started!'
              : 'Your completed events will appear here.'}
          </p>
        </div>
      ) : (
        <div className="events-grid">
          {displayed.map((event) => (
            <div
              key={event.id}
              className="card event-card"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <div className="event-card-date">
                <Clock size={14} />
                {formatDate(event.date)}
                {event.time && ` · ${formatTime(event.time)}`}
              </div>
              <div className="event-card-venue">
                <MapPin size={16} style={{ display: 'inline', marginRight: 6, opacity: 0.6 }} />
                {event.venue}
              </div>
              <div className="event-card-stats">
                <span className="event-card-stat">
                  <Users size={14} />
                  {event.attendees?.[0]?.count ?? 0} players
                </span>
                <span className="event-card-stat">
                  Courts: {formatCurrency(event.court_cost)}
                </span>
                <span className="event-card-stat">
                  Shuttles: {formatCurrency(event.shuttle_cost)}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm event-card-duplicate"
                onClick={(e) => { e.stopPropagation(); setDuplicating(event); }}
                title="Duplicate this event"
              >
                <Copy size={12} /> Duplicate
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            try {
              await createEvent(data);
              setShowCreate(false);
              addToast('Event created!', 'success');
            } catch (err) {
              addToast(err.message, 'error');
            }
          }}
        />
      )}

      {duplicating && (
        <DuplicateEventModal
          event={duplicating}
          onClose={() => setDuplicating(null)}
          onDuplicate={async (data) => {
            try {
              await createEvent(data);
              setDuplicating(null);
              addToast('Event duplicated!', 'success');
            } catch (err) {
              addToast(err.message, 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function CreateEventModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    venue: VENUES[0],
    court_cost: '',
    shuttle_cost: '',
    member_price: '',
    non_member_price: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onCreate({
      ...form,
      court_cost: Number(form.court_cost) || 0,
      shuttle_cost: Number(form.shuttle_cost) || 0,
      member_price: Number(form.member_price) || 0,
      non_member_price: Number(form.non_member_price) || 0,
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Event</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="event-date">Date</label>
              <input
                id="event-date"
                className="form-input"
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="event-time">Time</label>
              <input
                id="event-time"
                className="form-input"
                type="time"
                value={form.time}
                onChange={(e) => handleChange('time', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group mt-md">
            <label className="form-label" htmlFor="event-venue">Venue</label>
            <select
              id="event-venue"
              className="form-input"
              value={form.venue}
              onChange={(e) => handleChange('venue', e.target.value)}
            >
              {VENUES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label" htmlFor="event-court-cost">Court Cost (€)</label>
              <input
                id="event-court-cost"
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.court_cost}
                onChange={(e) => handleChange('court_cost', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="event-shuttle-cost">Shuttle Cost (€)</label>
              <input
                id="event-shuttle-cost"
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.shuttle_cost}
                onChange={(e) => handleChange('shuttle_cost', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row mt-md">
            <div className="form-group">
              <label className="form-label" htmlFor="event-member-price">Member Price (€)</label>
              <input
                id="event-member-price"
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.member_price}
                onChange={(e) => handleChange('member_price', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="event-nonmember-price">Non-Member Price (€)</label>
              <input
                id="event-nonmember-price"
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.non_member_price}
                onChange={(e) => handleChange('non_member_price', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group mt-md">
            <label className="form-label" htmlFor="event-notes">Notes (optional)</label>
            <input
              id="event-notes"
              className="form-input"
              type="text"
              placeholder="e.g. 3 courts booked, bring water..."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DuplicateEventModal({ event, onClose, onDuplicate }) {
  // Default to +7 days from the source event
  const defaultDate = (() => {
    const d = new Date(event.date);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const [newDate, setNewDate] = useState(defaultDate);
  const [newTime, setNewTime] = useState(event.time || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onDuplicate({
      date: newDate,
      time: newTime || null,
      venue: event.venue,
      court_cost: event.court_cost || 0,
      shuttle_cost: event.shuttle_cost || 0,
      court_cost_paid_by: event.court_cost_paid_by || '',
      shuttle_cost_paid_by: event.shuttle_cost_paid_by || '',
      member_price: event.member_price || 0,
      non_member_price: event.non_member_price || 0,
      notes: event.notes || '',
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Duplicate Event</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
            <div className="text-sm text-secondary">
              Copying from: <strong>{event.venue}</strong> — {formatDate(event.date)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Courts: {formatCurrency(event.court_cost)} · Shuttles: {formatCurrency(event.shuttle_cost)} · Member: {formatCurrency(event.member_price)} · Non-Member: {formatCurrency(event.non_member_price)}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="dup-date">New Date</label>
              <input
                id="dup-date"
                className="form-input"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dup-time">Time</label>
              <input
                id="dup-time"
                className="form-input"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Duplicate Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
