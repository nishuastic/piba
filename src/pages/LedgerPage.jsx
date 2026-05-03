import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ORGANIZERS, formatCurrency, formatDate, formatTime } from '../lib/constants';
import { useToast } from '../contexts/ToastContext';
import { ChevronDown, ChevronUp, Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function LedgerPage({ isEmbedded }) {
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAdmin, setExpandedAdmin] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [evRes, attRes, expRes, transRes] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('attendees').select('*, events:event_id(date, venue, time)'),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('transfers').select('*').order('date', { ascending: false }),
      ]);
      if (evRes.error) addToast(evRes.error.message, 'error');
      if (attRes.error) addToast(attRes.error.message, 'error');
      if (expRes.error) addToast(expRes.error.message, 'error');
      if (transRes.error) addToast(transRes.error.message, 'error');
      setEvents(evRes.data || []);
      setAttendees(attRes.data || []);
      setExpenses(expRes.data || []);
      setTransfers(transRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [addToast]);

  // Build per-admin ledger
  const ledger = useMemo(() => {
    const result = {};

    for (const admin of ORGANIZERS) {
      result[admin] = {
        received: [],    // payments received from players
        paid: [],        // costs paid for events/expenses
        totalReceived: 0,
        totalPaid: 0,
      };

      // --- Payments RECEIVED (attendee payments where payment_method = admin) ---
      const adminAttendees = attendees.filter((a) => a.payment_method === admin);
      const byEvent = {};
      for (const att of adminAttendees) {
        const eventId = att.event_id;
        if (!byEvent[eventId]) {
          byEvent[eventId] = {
            type: 'received',
            label: att.events
              ? `${formatDate(att.events.date)} — ${att.events.venue}`
              : 'Unknown event',
            date: att.events?.date || '',
            items: [],
            total: 0,
          };
        }
        byEvent[eventId].items.push({
          name: att.name,
          amount: att.amount_paid || 0,
          isMember: att.is_member,
        });
        byEvent[eventId].total += att.amount_paid || 0;
      }
      // Transfers IN (Received)
      const receivedGroups = Object.values(byEvent);
      
      const transferReceivedItems = transfers
        .filter((t) => t.to_admin === admin)
        .map((t) => ({
          name: `Transfer from ${t.from_admin}`,
          amount: t.amount,
          isMember: false,
        }));
      if (transferReceivedItems.length > 0) {
        receivedGroups.push({
          type: 'received',
          label: 'Admin Transfers (In)',
          date: '9999-12-31', // force to top
          items: transferReceivedItems,
          total: transferReceivedItems.reduce((s, i) => s + i.amount, 0),
        });
      }

      result[admin].received = receivedGroups.sort((a, b) => b.date.localeCompare(a.date));
      result[admin].totalReceived = receivedGroups.reduce((s, g) => s + g.total, 0);

      // --- Costs PAID (court/shuttle costs where paid_by = admin) ---
      const paidItems = [];

      for (const ev of events) {
        if (ev.court_cost_paid_by === admin && ev.court_cost > 0) {
          paidItems.push({
            label: `Court cost — ${ev.venue}`,
            date: ev.date,
            amount: ev.court_cost,
            detail: formatDate(ev.date),
          });
        }
        if (ev.shuttle_cost_paid_by === admin && ev.shuttle_cost > 0) {
          paidItems.push({
            label: `Shuttle cost — ${ev.venue}`,
            date: ev.date,
            amount: ev.shuttle_cost,
            detail: formatDate(ev.date),
          });
        }
      }

      for (const exp of expenses) {
        if (exp.paid_by === admin && exp.total_amount > 0) {
          paidItems.push({
            label: exp.description,
            date: exp.date,
            amount: exp.total_amount,
            detail: `${formatDate(exp.date)} (expense)`,
          });
        }
      }

      for (const t of transfers) {
        if (t.from_admin === admin && t.amount > 0) {
          paidItems.push({
            label: `Transfer to ${t.to_admin}`,
            date: t.date,
            amount: t.amount,
            detail: t.notes ? `Settlement: ${t.notes}` : 'Settlement',
          });
        }
      }

      paidItems.sort((a, b) => b.date.localeCompare(a.date));
      result[admin].paid = paidItems;
      result[admin].totalPaid = paidItems.reduce((s, i) => s + i.amount, 0);
    }

    return result;
  }, [attendees, events, expenses, transfers]);

  if (loading) {
    return (
      <div className="animate-in empty-state">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-title">Loading ledger...</div>
      </div>
    );
  }

  return (
    <div className={!isEmbedded ? "animate-in" : ""}>
      {!isEmbedded && (
        <div className="page-header">
          <h1>Admin Ledger</h1>
          <p>Track who paid what and who received what</p>
        </div>
      )}

      {isEmbedded && (
        <div className="mb-md">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ledger</h2>
          <p className="text-sm text-muted">Track who paid what and who received what</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="stat-grid">
        {ORGANIZERS.map((admin) => {
          const data = ledger[admin];
          const net = data.totalReceived - data.totalPaid;
          return (
            <div key={admin} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setExpandedAdmin(expandedAdmin === admin ? null : admin)}>
              <div className="stat-label">{admin}</div>
              <div className={`stat-value ${net >= 0 ? 'success' : 'danger'}`}>
                {net >= 0 ? '+' : ''}{formatCurrency(net)}
              </div>
              <div className="text-xs text-muted mt-md">
                <span style={{ color: 'var(--success)' }}>↑ {formatCurrency(data.totalReceived)}</span>
                {' · '}
                <span style={{ color: 'var(--danger)' }}>↓ {formatCurrency(data.totalPaid)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed breakdowns */}
      {ORGANIZERS.map((admin) => {
        const data = ledger[admin];
        const isExpanded = expandedAdmin === admin;
        const net = data.totalReceived - data.totalPaid;

        return (
          <div key={admin} className={`card mb-md ledger-admin-card ${isExpanded ? 'expanded' : ''}`}>
            <div
              className="ledger-admin-header"
              onClick={() => setExpandedAdmin(isExpanded ? null : admin)}
            >
              <div className="flex items-center gap-md">
                <div className="ledger-avatar">
                  <Wallet size={18} />
                </div>
                <div>
                  <div className="font-bold">{admin}</div>
                  <div className="text-xs text-muted">
                    Net: <span style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-lg">
                <div style={{ textAlign: 'right' }}>
                  <div className="text-xs text-muted" style={{ display: 'flex', gap: 16 }}>
                    <span className="flex items-center gap-sm">
                      <TrendingUp size={12} style={{ color: 'var(--success)' }} />
                      {formatCurrency(data.totalReceived)}
                    </span>
                    <span className="flex items-center gap-sm">
                      <TrendingDown size={12} style={{ color: 'var(--danger)' }} />
                      {formatCurrency(data.totalPaid)}
                    </span>
                  </div>
                </div>
                <div className="expense-chevron">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="ledger-admin-body animate-in">
                {/* Payments Received */}
                {data.received.length > 0 && (
                  <div className="ledger-section">
                    <div className="ledger-section-title">
                      <TrendingUp size={14} /> Payments Received
                    </div>
                    {data.received.map((group, gi) => (
                      <div key={gi} className="ledger-group">
                        <div className="ledger-group-header">
                          <span>{group.label}</span>
                          <span className="font-semibold" style={{ color: 'var(--success)' }}>
                            +{formatCurrency(group.total)}
                          </span>
                        </div>
                        <div className="ledger-group-items">
                          {group.items.map((item, ii) => (
                            <div key={ii} className="ledger-item">
                              <span>
                                {item.name}
                                <span className={`badge ${item.isMember ? 'badge-member' : 'badge-nonmember'}`} style={{ marginLeft: 6 }}>
                                  {item.isMember ? 'M' : 'NM'}
                                </span>
                              </span>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Costs Paid */}
                {data.paid.length > 0 && (
                  <div className="ledger-section">
                    <div className="ledger-section-title">
                      <TrendingDown size={14} /> Costs Paid Out
                    </div>
                    {data.paid.map((item, i) => (
                      <div key={i} className="ledger-item">
                        <div>
                          <div>{item.label}</div>
                          <div className="text-xs text-muted">{item.detail}</div>
                        </div>
                        <span className="font-semibold" style={{ color: 'var(--danger)' }}>
                          -{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {data.received.length === 0 && data.paid.length === 0 && (
                  <div className="text-muted text-sm" style={{ padding: '16px', textAlign: 'center' }}>
                    No transactions yet for {admin}.
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
