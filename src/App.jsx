import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
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

  return user ? <AppShell/> : <Login/>;
}
