// src/pages/focuslog/FocusLogLayout.jsx — tabbed shell (Log / Stats),
// same sub-nav pattern as MortgageLayout.
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Timer, NotebookPen, BarChart3 } from 'lucide-react';

const tabs = [
  { path: '/focus/log',   label: 'Log',   icon: NotebookPen },
  { path: '/focus/stats', label: 'Stats', icon: BarChart3   },
];

export default function FocusLogLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Timer size={18} style={{ color: 'var(--tasks)' }}/>
            <span style={{ color: 'var(--tasks)' }}>Focus Log</span>
          </div>
        </div>
      </div>
      <div className="crm-sub-nav">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = pathname === t.path || pathname.startsWith(t.path + '/');
          return (
            <button key={t.path} className={`crm-sub-btn${active ? ' active' : ''}`} onClick={() => navigate(t.path)}>
              <Icon size={14}/> {t.label}
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
