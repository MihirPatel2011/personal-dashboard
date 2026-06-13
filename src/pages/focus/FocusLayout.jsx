import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ListTodo, Timer, BarChart3 } from 'lucide-react';

const tabs = [
  { path: '/focus/tasks', label: 'Tasks', icon: ListTodo  },
  { path: '/focus/timer', label: 'Focus', icon: Timer     },
  { path: '/focus/stats', label: 'Stats', icon: BarChart3 },
];

export default function FocusLayout() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
        <div>
          <div className="page-title">
            <span style={{ color: 'var(--tasks)' }}>Focus</span>
          </div>
        </div>
      </div>

      <div className="crm-sub-nav">
        {tabs.map(t => {
          const Icon   = t.icon;
          const active = pathname === t.path || pathname.startsWith(t.path + '/');
          return (
            <button
              key={t.path}
              className="crm-sub-btn"
              onClick={() => navigate(t.path)}
              style={active ? { color: 'var(--tasks)', fontWeight: 600 } : undefined}
            >
              <Icon size={14}/> {t.label}
              {active && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: 'var(--tasks)', borderRadius: '3px 3px 0 0' }}/>}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet/>
      </div>
    </div>
  );
}
