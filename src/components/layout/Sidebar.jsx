import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, CheckSquare, Kanban, Users, FileText, BarChart3, Settings2, LogOut, Sun, Moon, NotebookPen, BookMarked, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { isToday, isPast } from '../../utils';

// ─── Mobile bottom tab bar ─────────────────────────────────────────────────────
export function MobileNav() {
  const { logout } = useAuth();
  const { personalTasks } = useData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const inboxCount = personalTasks.filter(t => {
    if (t.status !== 'inbox' && t.status) return false;
    return !t.deadline && !t.isToday;
  }).length;

  const isActive = path => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    const base = '/' + path.split('/').filter(Boolean)[0];
    return pathname.startsWith(base);
  };

  const tabs = [
    { path: '/dashboard',        label: 'Home',     icon: LayoutDashboard },
    { path: '/tasks',            label: 'Tasks',    icon: CheckSquare     },
    { path: '/notes',            label: 'Notes',    icon: NotebookPen     },
    { path: '/journal',          label: 'Journal',  icon: BookMarked      },
    { path: '/mortgage/pipeline',label: 'Mortgage', icon: Kanban          },
  ];

  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      {tabs.map(({ path, label, icon: Icon }) => (
        <button
          key={path}
          className={`mobile-nav-item${isActive(path) ? ' active' : ''}`}
          onClick={() => navigate(path)}
        >
          <Icon size={22}/>
          <span>{label}</span>
          {path === '/tasks' && inboxCount > 0 && (
            <span className="mobile-nav-badge">{inboxCount > 9 ? '9+' : inboxCount}</span>
          )}
        </button>
      ))}
      <button
        className="mobile-nav-item"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={22}/> : <Moon size={22}/>}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </nav>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();
  const { personalTasks, crmTasks, loading } = useData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const go = path => navigate(path);
  const active = path => pathname === path || pathname.startsWith(path + '/');

  // Badges
  const overdueCrm = crmTasks.filter(t =>
    !['Done','Cancelled'].includes(t.status) && isPast(t.dueDate) && !isToday(t.dueDate)
  ).length;
  const inboxCount = personalTasks.filter(t => {
    if (t.status !== 'inbox' && t.status) return false;
    return !t.deadline && !t.isToday;
  }).length;

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

        {/* Habits */}
        <div className="sidebar-section-label">Wellness</div>
        <button className={`nav-item${active('/habits') ? ' active' : ''}`} onClick={() => go('/habits')}>
          <span className="nav-icon habits-icon"><Zap size={15}/></span>
          Habits
        </button>

        {/* Tasks */}
        <div className="sidebar-section-label">Focus</div>
        <button className={`nav-item${active('/tasks') ? ' active' : ''}`} onClick={() => go('/tasks')}>
          <span className="nav-icon tasks-icon"><CheckSquare size={15}/></span>
          Task Manager
          {inboxCount > 0 && <span className="nav-badge warn">{inboxCount}</span>}
        </button>
        <button className={`nav-item${active('/notes') ? ' active' : ''}`} onClick={() => go('/notes')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><NotebookPen size={15}/></span>
          Notes &amp; Ideas
        </button>
        <button className={`nav-item${active('/journal') ? ' active' : ''}`} onClick={() => go('/journal')}>
          <span className="nav-icon" style={{ color: 'var(--ink-3)' }}><BookMarked size={15}/></span>
          Journal
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
