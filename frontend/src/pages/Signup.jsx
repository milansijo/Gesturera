import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to create account');
      }

      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb orb-a" />
      <div className="auth-orb orb-b" />
      <div className="auth-orb orb-c" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-9v4h4l-5 9z"/></svg>
          </div>
          <span className="auth-logo-name">Gesturera</span>
        </div>

        <h2 className="auth-heading">Create account</h2>
        <p className="auth-subtext">Get started with real-time ASL translation</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSignup}>
          <label className="field-label">Email</label>
          <input
            id="signup-email"
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="field-label">Password</label>
          <input
            id="signup-password"
            type="password"
            className="input-field"
            placeholder="Choose a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button id="signup-submit" type="submit" className="btn-accent btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
        <div className="auth-link" style={{ marginTop: '0.5rem' }}>
          <Link to="/" className="back-link">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
