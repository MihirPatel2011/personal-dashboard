import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, Kanban, Users, Reply, FileText, BarChart3, Settings2, LogOut, Sun, Moon, NotebookPen, ListTodo, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { isToday, isPast } from '../../utils';
import { actionNeeded } from '../../utils/followups';

// ─── Mobile bottom tab bar ─────────────────────────────────────────────────────
export function MobileNav() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = path => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    const base = '/' + path.split('/').filter(Boolean)[0];
    return pathname.startsWith(base);
  };

  const morePaths = ['/notes'];
  const moreActive = morePaths.some(p => pathname.startsWith(p));

  const primaryTabs = [
    { path: '/dashboard',         label: 'Home',     icon: LayoutDashboard },
    { path: '/goals',             label: 'Goals',    icon: Target          },
    { path: '/mortgage/pipeline', label: 'Mortgage', icon: Kanban          },
  ];

  const moreItems = [
    { path: '/notes', label: 'Notes & Ideas', icon: NotebookPen },
  ];

  return (
    <>
      {showMore && (
        <div className="mobile-more-backdrop" onClick={() => setShowMore(false)}>
          <div className="mobile-more-sheet" onClick={e => e.stopPropagation()}>
            <div className="mobile-more-handle"/>
            <div className="mobile-more-nav">
              {moreItems.map(({ path, label, icon: Icon }) => (
                <button
                  key={path}
                  className={`mobile-more-item${pathname.startsWith(path) ? ' active' : ''}`}
                  onClick={() => { navigate(path); setShowMore(false); }}
                >
                  <Icon size={20}/>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="mobile-more-sep"/>
            <button className="mobile-more-item" onClick={() => { toggleTheme(); }}>
              {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button className="mobile-more-item danger" onClick={logout}>
              <LogOut size={20}/>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
      <nav className="mobile-nav" aria-label="Main navigation">
        {primaryTabs.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            className={`mobile-nav-item${isActive(path) ? ' active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon size={22}/>
            <span>{label}</span>
          </button>
        ))}
        <button
          className={`mobile-nav-item${moreActive ? ' active' : ''}`}
          onClick={() => setShowMore(v => !v)}
        >
          <MoreHorizontal size={22}/>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();
  const { crmTasks, followups, loading } = useData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const go = path => navigate(path);
  const active = path => pathname === path || pathname.startsWith(path + '/');

  // Badges
  const overdueCrm = crmTasks.filter(t =>
    !['Done','Cancelled'].includes(t.status) && isPast(t.dueDate) && !isToday(t.dueDate)
  ).length;
  const followupsDue = followups.filter(actionNeeded).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">A</div>
        <div>
          <div className="brand-name">Apex</div>
          <div className="brand-sub">Personal Dashboard</div>
        </div>
      </div>

      <div className="sidebar-scroll">
        {/* Main */}
        <button className={`nav-item${active('/') && pathname === '/' ? ' active' : ''}${active('/dashboard') ? ' active' : ''}`} onClick={() => go('/dashboard')}>
          <span className="nav-icon dash-icon"><LayoutDashboard size={15}/></span>
          Dashboard
        </button>

        {/* Goals */}
        <div className="sidebar-section-label">Goals</div>
        <button className={`nav-item${active('/goals') ? ' active' : ''}`} onClick={() => go('/goals')}>
          <span className="nav-icon goals-icon"><Target size={15}/></span>
          Goals Tracker
        </button>

        {/* Capture */}
        <div className="sidebar-section-label">Capture</div>
        <button className={`nav-item${active('/notes') ? ' active' : ''}`} onClick={() => go('/notes')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><NotebookPen size={15}/></span>
          Notes &amp; Ideas
        </button>

        {/* Mortgage */}
        <div className="sidebar-section-label">Mortgage CRM</div>
        <button className={`nav-item${active('/mortgage/pipeline') ? ' active' : ''}`} onClick={() => go('/mortgage/pipeline')}>
          <span className="nav-icon mtg-icon"><Kanban size={15}/></span>
          Pipeline
        </button>
        <button className={`nav-item${active('/mortgage/clients') ? ' active' : ''}`} onClick={() => go('/mortgage/clients')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><Users size={15}/></span>
          Clients
        </button>
        <button className={`nav-item${active('/mortgage/followups') ? ' active' : ''}`} onClick={() => go('/mortgage/followups')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><Reply size={15}/></span>
          Follow-ups
          {followupsDue > 0 && <span className="nav-badge">{followupsDue}</span>}
        </button>
        <button className={`nav-item${active('/mortgage/tasks') ? ' active' : ''}`} onClick={() => go('/mortgage/tasks')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><ListTodo size={15}/></span>
          Tasks
          {overdueCrm > 0 && <span className="nav-badge">{overdueCrm}</span>}
        </button>
        <button className={`nav-item${active('/mortgage/notes') ? ' active' : ''}`} onClick={() => go('/mortgage/notes')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><FileText size={15}/></span>
          Notes
        </button>
        <button className={`nav-item${active('/mortgage/performance') ? ' active' : ''}`} onClick={() => go('/mortgage/performance')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><BarChart3 size={15}/></span>
          Performance
        </button>
        <button className={`nav-item${active('/mortgage/settings') ? ' active' : ''}`} onClick={() => go('/mortgage/settings')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><Settings2 size={15}/></span>
          Settings
        </button>
      </div>

      <div className="sidebar-footer">
        <div className={`sync-dot${loading ? ' syncing' : ''}`}/>
        <span className="sync-label">{loading ? 'Syncing…' : 'Live sync'}</span>
        <button
          className="icon-btn sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={13}/> : <Moon size={13}/>}
        </button>
        <button className="icon-btn sm" onClick={logout} title="Sign out"><LogOut size={13}/></button>
      </div>
    </aside>
  );
}
