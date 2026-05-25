import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
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

function ThemedToaster() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background:   dark ? '#2C2C2E' : '#FFFFFF',
          color:        dark ? '#FFFFFF' : '#000000',
          border:       `1px solid ${dark ? 'rgba(84,84,88,0.6)' : 'rgba(60,60,67,0.2)'}`,
          borderRadius: '99px',
          fontSize:     '13px',
          fontWeight:   500,
          padding:      '10px 18px',
          boxShadow:    dark
            ? '0 8px 32px rgba(0,0,0,0.65)'
            : '0 8px 32px rgba(0,0,0,0.12)',
        },
        success: {
          iconTheme: {
            primary:   dark ? '#30D158' : '#34C759',
            secondary: dark ? '#2C2C2E' : '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary:   dark ? '#FF453A' : '#FF3B30',
            secondary: dark ? '#2C2C2E' : '#FFFFFF',
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
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/"                    element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/dashboard"           element={<Dashboard/>}/>
          <Route path="/goals"               element={<Goals/>}/>
          <Route path="/tasks"               element={<Tasks/>}/>
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
