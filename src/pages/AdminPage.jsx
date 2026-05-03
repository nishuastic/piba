import { useState } from 'react';
import LedgerPage from './LedgerPage';
import ExpensesPage from './ExpensesPage';
import TransfersPage from './TransfersPage';
import VenuePLPage from './VenuePLPage';

export default function AdminPage() {
  const [tab, setTab] = useState('ledger');

  return (
    <div className="animate-in">
      <div className="page-header mb-0">
        <h1>Admin</h1>
        <p>Manage financials, expenses, and settlements</p>
      </div>

      <div className="flex gap-sm border-b" style={{ paddingBottom: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button 
          className={`btn btn-sm ${tab === 'ledger' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setTab('ledger')}
        >
          Ledger & Balances
        </button>
        <button 
          className={`btn btn-sm ${tab === 'expenses' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setTab('expenses')}
        >
          Expenses
        </button>
        <button
          className={`btn btn-sm ${tab === 'transfers' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('transfers')}
        >
          Transfers
        </button>
        <button
          className={`btn btn-sm ${tab === 'venue' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('venue')}
        >
          Venue P&amp;L
        </button>
      </div>

      <div className="admin-tab-content">
        {tab === 'ledger' && <LedgerPage isEmbedded />}
        {tab === 'expenses' && <ExpensesPage isEmbedded />}
        {tab === 'transfers' && <TransfersPage isEmbedded />}
        {tab === 'venue' && <VenuePLPage isEmbedded />}
      </div>
    </div>
  );
}
