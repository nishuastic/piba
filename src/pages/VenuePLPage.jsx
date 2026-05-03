import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { VENUES, formatCurrency, formatDate } from '../lib/constants';
import { useToast } from '../contexts/ToastContext';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, MapPin } from 'lucide-react';

export default function VenuePLPage({ isEmbedded }) {
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVenue, setExpandedVenue] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [evRes, attRes] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('attendees').select('event_id, amount_paid'),
      ]);
      if (evRes.error) addToast(evRes.error.message, 'error');
      if (attRes.error) addToast(attRes.error.message, 'error');
      setEvents(evRes.data || []);
      setAttendees(attRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [addToast]);

  const incomeByEvent = useMemo(() => {
    const map = {};
    for (const a of attendees) {
      map[a.event_id] = (map[a.event_id] || 0) + (a.amount_paid || 0);
    }
    return map;
  }, [attendees]);

  const byVenue = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const result = {};
    for (const venue of VENUES) {
      const venueEvents = events.filter((e) => e.venue === venue && new Date(e.date) < now);
      const eventRows = venueEvents.map((e) => {
        const income = incomeByEvent[e.id] || 0;
        const costs = (e.court_cost || 0) + (e.shuttle_cost || 0);
        return { ...e, income, costs, profit: income - costs };
      });

      const totalIncome = eventRows.reduce((s, e) => s + e.income, 0);
      const totalCosts = eventRows.reduce((s, e) => s + e.costs, 0);

      result[venue] = {
        events: eventRows,
        totalIncome,
        totalCosts,
        profit: totalIncome - totalCosts,
      };
    }
    return result;
  }, [events, incomeByEvent]);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-title">Loading venue data...</div>
      </div>
    );
  }

  return (
    <div className={!isEmbedded ? 'animate-in' : ''}>
      {!isEmbedded && (
        <div className="page-header">
          <h1>Venue P&amp;L</h1>
          <p>Profit and loss per location</p>
        </div>
      )}

      {isEmbedded && (
        <div className="mb-md">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Venue Profit &amp; Loss</h2>
          <p className="text-sm text-muted">Income vs costs broken down by location</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="stat-grid">
        {VENUES.map((venue) => {
          const d = byVenue[venue];
          return (
            <div
              key={venue}
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setExpandedVenue(expandedVenue === venue ? null : venue)}
            >
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} /> {venue}
              </div>
              <div className={`stat-value ${d.profit >= 0 ? 'success' : 'danger'}`}>
                {d.profit >= 0 ? '+' : ''}{formatCurrency(d.profit)}
              </div>
              <div className="text-xs text-muted mt-md">
                <span style={{ color: 'var(--success)' }}>↑ {formatCurrency(d.totalIncome)}</span>
                {' · '}
                <span style={{ color: 'var(--danger)' }}>↓ {formatCurrency(d.totalCosts)}</span>
                {' · '}
                {d.events.length} event{d.events.length !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-venue breakdown */}
      {VENUES.map((venue) => {
        const d = byVenue[venue];
        const isExpanded = expandedVenue === venue;

        return (
          <div key={venue} className={`card mb-md ledger-admin-card ${isExpanded ? 'expanded' : ''}`}>
            <div
              className="ledger-admin-header"
              onClick={() => setExpandedVenue(isExpanded ? null : venue)}
            >
              <div className="flex items-center gap-md">
                <div className="ledger-avatar">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="font-bold">{venue}</div>
                  <div className="text-xs text-muted">
                    {d.events.length} event{d.events.length !== 1 ? 's' : ''} · Net:{' '}
                    <span style={{ color: d.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {d.profit >= 0 ? '+' : ''}{formatCurrency(d.profit)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-lg">
                <div className="text-xs text-muted" style={{ display: 'flex', gap: 16 }}>
                  <span className="flex items-center gap-sm">
                    <TrendingUp size={12} style={{ color: 'var(--success)' }} />
                    {formatCurrency(d.totalIncome)}
                  </span>
                  <span className="flex items-center gap-sm">
                    <TrendingDown size={12} style={{ color: 'var(--danger)' }} />
                    {formatCurrency(d.totalCosts)}
                  </span>
                </div>
                <div className="expense-chevron">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="ledger-admin-body animate-in">
                {d.events.length === 0 ? (
                  <div className="text-muted text-sm" style={{ padding: '16px', textAlign: 'center' }}>
                    No events at {venue} yet.
                  </div>
                ) : (
                  <div className="ledger-section">
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Income</th>
                            <th>Costs</th>
                            <th>Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.events.map((e) => (
                            <tr key={e.id}>
                              <td className="text-muted">{formatDate(e.date)}</td>
                              <td style={{ color: 'var(--success)' }}>{formatCurrency(e.income)}</td>
                              <td style={{ color: 'var(--danger)' }}>{formatCurrency(e.costs)}</td>
                              <td className="font-bold" style={{ color: e.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {e.profit >= 0 ? '+' : ''}{formatCurrency(e.profit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border)' }}>
                            <td className="font-bold">Total</td>
                            <td className="font-bold" style={{ color: 'var(--success)' }}>{formatCurrency(d.totalIncome)}</td>
                            <td className="font-bold" style={{ color: 'var(--danger)' }}>{formatCurrency(d.totalCosts)}</td>
                            <td className="font-bold" style={{ color: d.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {d.profit >= 0 ? '+' : ''}{formatCurrency(d.profit)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
