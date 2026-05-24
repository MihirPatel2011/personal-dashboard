import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]     = useState('');
  const [pass,  setPass]      = useState('');
  const [err,   setErr]       = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(email, pass);
    } catch {
      setErr('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card fade-in">
        <div className="login-logo">A</div>
        <h1 className="login-title">Apex</h1>
        <p className="login-sub">Your personal command centre.</p>
        {err && <div className="login-error">{err}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoFocus required/>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder="••••••••" required/>
          </div>
          <button className="btn accent lg" type="submit" disabled={loading || !email || !pass}
            style={{ marginTop: 4, justifyContent: 'center' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
