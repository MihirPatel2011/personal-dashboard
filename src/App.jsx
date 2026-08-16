import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PanelLeftOpen } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Sidebar, { MobileNav } from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import MortgageLayout from './pages/mortgage/MortgageLayout';
import Pipeline from './pages/mortgage/Pipeline';
import Clients from './pages/mortgage/Clients';
import Followups from './pages/mortgage/Followups';
import Notes from './pages/mortgage/Notes';
import Tasks from './pages/Tasks';
import Performance from './pages/mortgage/Performance';
import Settings from './pages/mortgage/Settings';
import PersonalNotes from './pages/PersonalNotes';
import Money from './pages/Money';

function ThemedToaster() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background:   dark ? '#221F18' : '#FFFFFF',
          color:        dark ? '#E9E3D5' : '#17150F',
          border:       `1px solid ${dark ? 'rgba(233,227,213,0.17)' : '#E0D9CB'}`,
          borderRadius: '99px',
          fontSize:     '13px',
          fontWeight:   500,
          padding:      '10px 18px',
          boxShadow:    dark
            ? '0 8px 24px rgba(0,0,0,0.40)'
            : '0 8px 24px rgba(23,21,15,0.10)',
        },
        success: {
          iconTheme: {
            primary:   dark ? '#9EC4A3' : '#3D6B45',
            secondary: dark ? '#221F18' : '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary:   dark ? '#D99B8E' : '#98392E',
            secondary: dark ? '#221F18' : '#FFFFFF',
          },
        },
      }}
    />
  );
}

function AppShell() {
  // Remembered per browser: hiding the nav is a working preference, not a
  // one-off, and it should survive a reload.
  const [navHidden, setNavHidden] = useState(() => {
    try { return localStorage.getItem('apex-nav-hidden') === '1'; } catch { return false; }
  });
  const setHidden = (v) => {
    setNavHidden(v);
    try { localStorage.setItem('apex-nav-hidden', v ? '1' : '0'); } catch { /* private mode */ }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {!navHidden && <Sidebar onHide={() => setHidden(true)}/>}
      {navHidden && (
        <button className="nav-restore" onClick={() => setHidden(false)}
                title="Show sidebar" aria-label="Show sidebar">
          <PanelLeftOpen size={16}/>
        </button>
      )}
      <main className="main-content" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Routes>
          <Route path="/"                    element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/dashboard"           element={<Dashboard/>}/>
          <Route path="/goals"               element={<Goals/>}/>
          <Route path="/tasks"               element={<Tasks/>}/>
          <Route path="/money"               element={<Money/>}/>
          <Route path="/notes"               element={<PersonalNotes/>}/>
          <Route path="/mortgage"            element={<MortgageLayout/>}>
            <Route index                     element={<Navigate to="/mortgage/pipeline" replace/>}/>
            <Route path="pipeline"           element={<Pipeline/>}/>
            <Route path="clients"            element={<Clients/>}/>
            <Route path="followups"          element={<Followups/>}/>
            <Route path="notes"              element={<Notes/>}/>
            <Route path="tasks"              element={<Navigate to="/tasks" replace/>}/>
            <Route path="performance"        element={<Performance/>}/>
            <Route path="settings"           element={<Settings/>}/>
          </Route>
          <Route path="*"                    element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </main>
      <MobileNav/>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}/>
        <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading Apex…</span>
      </div>
    );
  }

  return (
    <>
      {user ? <AppShell/> : <Login/>}
      <ThemedToaster/>
    </>
  );
}
