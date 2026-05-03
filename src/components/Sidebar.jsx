import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, Receipt, Wallet, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/', label: 'Events', icon: <Calendar size={18} /> },
    { to: '/expenses', label: 'Expenses', icon: <Receipt size={18} /> },
    { to: '/members', label: 'Members', icon: <Users size={18} /> },
    { to: '/ledger', label: 'Admin Ledger', icon: <Wallet size={18} /> },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="flex items-center gap-sm">
          <span style={{ fontSize: '1.3rem' }}>🏸</span>
          <span className="font-bold">Shuttle Club</span>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏸</div>
          <span className="sidebar-logo-text">Shuttle Club</span>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive && location.pathname === link.to ? 'active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
              end={link.to === '/'}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="text-xs text-muted mb-md" style={{ wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <button className="btn btn-ghost w-full" onClick={handleSignOut}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
