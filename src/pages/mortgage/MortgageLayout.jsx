import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Kanban, Users, Reply, FileText, BarChart3, Settings2 } from 'lucide-react';

const tabs = [
  { path: '/mortgage/pipeline',    label: 'Pipeline',     icon: Kanban    },
  { path: '/mortgage/clients',     label: 'Clients',      icon: Users     },
  { path: '/mortgage/followups',   label: 'Follow-ups',   icon: Reply     },
  { path: '/mortgage/notes',       label: 'Notes',        icon: FileText  },
  { path: '/mortgage/performance', label: 'Performance',  icon: BarChart3 },
  { path: '/mortgage/settings',    label: 'Settings',     icon: Settings2 },
];

export default function MortgageLayout() {
  const navigate      = useNavigate();
  const { pathname }  = useLocation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="page-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--mortgage)' }}>Mortgage CRM</span>
          </div>
        </div>
      </div>

      <div className="crm-sub-nav">
        {tabs.map(t => {
          const Icon   = t.icon;
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
