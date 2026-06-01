import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Sidebar, { MobileNav } from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Tasks from './pages/Tasks';
import MortgageLayout from './pages/mortgage/MortgageLayout';
import Pipeline from './pages/mortgage/Pipeline';
import Clients from './pages/mortgage/Clients';
import Notes from './pages/mortgage/Notes';
import CRMTasks from './pages/mortgage/CRMTasks';
import Performance from './pages/mortgage/Performance';
import Settings from './pages/mortgage/Settings';
import PersonalNotes from './pages/PersonalNotes';
import Journal from './pages/Journal';
import Habits from './pages/Habits';

function ThemedToaster() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background:   dark ? '#121922' : '#FAFCFE',
          color:        dark ? '#E2EDF7' : '#0A1628',
          border:       `1px solid ${dark ? 'rgba(0,210,160,0.13)' : 'rgba(0,100,80,0.18)'}`,
          borderRadius: '99px',
          fontSize:     '13px',
          fontWeight:   500,
          padding:      '10px 18px',
          boxShadow:    dark
            ? '0 8px 32px rgba(0,0,0,0.7)'
            : '0 8px 24px rgba(0,60,50,0.14)',
        },
        success: {
          iconTheme: {
            primary:   dark ? '#00C896' : '#009870',
            secondary: dark ? '#121922' : '#FAFCFE',
          },
        },
        error: {
          iconTheme: {
            primary:   dark ? '#F06060' : '#C83030',
            secondary: dark ? '#121922' : '#FAFCFE',
          },
        },
      }}
    />
  );
}

function AppShell() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar/>
      <main className="main-content" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Routes>
          <Route path="/"                    element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/dashboard"           element={<Dashboard/>}/>
          <Route path="/goals"               element={<Goals/>}/>
          <Route path="/tasks"               element={<Tasks/>}/>
          <Route path="/notes"               element={<PersonalNotes/>}/>
          <Route path="/journal"             element={<Journal/>}/>
          <Route path="/habits"              element={<Habits/>}/>
          <Route path="/mortgage"            element={<MortgageLayout/>}>
            <Route index                     element={<Navigate to="/mortgage/pipeline" replace/>}/>
            <Route path="pipeline"           element={<Pipeline/>}/>
            <Route path="clients"            element={<Clients/>}/>
            <Route path="notes"              element={<Notes/>}/>
            <Route path="tasks"              element={<CRMTasks/>}/>
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
