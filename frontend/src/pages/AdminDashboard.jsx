import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);
  const [reloadStatus, setReloadStatus] = useState(null);
  const [reloadMsg, setReloadMsg] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const fetchMetrics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/system`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unauthorized or Forbidden');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Users fetch error:', err);
    }
  }, [token]);

  const fetchModelInfo = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/model-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch model info');
      const data = await res.json();
      setModelInfo(data);
    } catch (err) {
      console.error('Model info error:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMetrics();
    fetchModelInfo();
    fetchUsers();
    
    // Poll metrics every 5 seconds to get live active users
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, [token, navigate, fetchMetrics, fetchModelInfo, fetchUsers]);

  const handleReloadModel = async () => {
    setReloadStatus('loading');
    setReloadMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/reload-model`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reload failed');
      setReloadStatus('success');
      setReloadMsg(data.message || 'Model reloaded successfully');
      fetchModelInfo();
    } catch (err) {
      setReloadStatus('error');
      setReloadMsg(err.message);
    }
    setTimeout(() => {
      setReloadStatus(null);
      setReloadMsg('');
    }, 5000);
  };

  return (
    <div className="admin-page">
      {/* Decorative orbs */}
      <div className="ws-orb ws-orb-1" />
      <div className="ws-orb ws-orb-2" />

      {/* Navigation */}
      <nav className="ws-nav">
        <div className="ws-nav-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-9v4h4l-5 9z"/></svg>
          </div>
          Gesturera Admin
        </div>
        <div className="ws-nav-right">
          <button className="btn-ghost" onClick={() => navigate('/workspace')}>Workspace</button>
          <button className="btn-ghost" onClick={() => {
            localStorage.removeItem('token');
            navigate('/login');
          }}>Logout</button>
        </div>
      </nav>

      <div className="admin-content">
        {error ? (
          <div className="admin-card" style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem' }}>🔒</span>
            <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-primary)' }}>Access Denied</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{error}. You might not have administrator privileges.</p>
          </div>
        ) : (
          <>
            {/* ── Section: System Overview ── */}
            <div className="admin-section-label">
              <span className="section-icon">📊</span>
              System Overview
            </div>
            <div className="admin-metrics-grid">
              <div className="admin-metric-card">
                <div className="metric-label">Status</div>
                <div className="metric-value" style={{ color: '#2db56e' }}>● Operational</div>
              </div>
              <div className="admin-metric-card">
                <div className="metric-label">Total Users</div>
                <div className="metric-value">{metrics ? metrics.total_users : '…'}</div>
              </div>
              <div className="admin-metric-card">
                <div className="metric-label">Live Active</div>
                <div className="metric-value" style={{ color: 'var(--accent)' }}>
                  {metrics ? metrics.active_connections : '…'} <span style={{ fontSize: '0.9rem' }}>now</span>
                </div>
              </div>
            </div>

            {/* ── Section: AI Model ── */}
            <div className="admin-section-label" style={{ marginTop: '2rem' }}>
              <span className="section-icon">🧠</span>
              AI Model
              <button
                className="btn-accent btn-sm"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleReloadModel}
                disabled={reloadStatus === 'loading'}
              >
                {reloadStatus === 'loading' ? (
                  <><span className="spinner" /> Reloading…</>
                ) : (
                  <>🔄 Reload Model</>
                )}
              </button>
            </div>

            {/* Reload feedback */}
            {reloadStatus && reloadStatus !== 'loading' && (
              <div className={`admin-toast ${reloadStatus === 'success' ? 'toast-success' : 'toast-error'}`}>
                {reloadStatus === 'success' ? '✅' : '❌'} {reloadMsg}
              </div>
            )}

            {modelInfo ? (
              <>
                <div className="admin-metrics-grid">
                  <div className="admin-metric-card">
                    <div className="metric-label">Classes</div>
                    <div className="metric-value">{modelInfo.num_classes}</div>
                  </div>
                  <div className="admin-metric-card">
                    <div className="metric-label">Input Features</div>
                    <div className="metric-value">{modelInfo.input_size}</div>
                  </div>
                  <div className="admin-metric-card">
                    <div className="metric-label">File Size</div>
                    <div className="metric-value">{modelInfo.model_file_size_kb} KB</div>
                  </div>
                </div>

                <div className="admin-metrics-grid" style={{ marginTop: '1rem' }}>
                  <div className="admin-metric-card">
                    <div className="metric-label">Last Loaded</div>
                    <div className="metric-value" style={{ fontSize: '0.95rem' }}>
                      {modelInfo.loaded_at ? new Date(modelInfo.loaded_at).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  <div className="admin-metric-card">
                    <div className="metric-label">File Modified</div>
                    <div className="metric-value" style={{ fontSize: '0.95rem' }}>
                      {modelInfo.model_file_modified ? new Date(modelInfo.model_file_modified).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Version pill */}
                <div style={{ marginTop: '1rem' }}>
                  <span className={`admin-pill ${modelInfo.input_size === 126 ? 'pill-blue' : 'pill-amber'}`}>
                    {modelInfo.input_size === 126 ? 'v2 — Velocity Enhanced' : 'v1 — Static Landmarks'}
                  </span>
                </div>

                {/* Class grid */}
                <div className="admin-card" style={{ marginTop: '1.25rem' }}>
                  <div className="metric-label" style={{ marginBottom: '0.75rem' }}>Recognised Signs</div>
                  <div className="admin-sign-grid">
                    {modelInfo.classes.map((c) => (
                      <span key={c} className="admin-sign-chip">{c}</span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="admin-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading model info…</div>
            )}

            {/* ── Section: Users List ── */}
            <div className="admin-section-label" style={{ marginTop: '3rem' }}>
              <span className="section-icon">👥</span>
              Registered Users
            </div>
            
            <div className="admin-card" style={{ padding: '1rem' }}>
              {users && users.length > 0 ? (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>#{u.id}</td>
                          <td style={{ fontWeight: 500 }}>{u.email}</td>
                          <td>
                            <span className={`role-badge role-${u.role}`}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                  Loading users...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
