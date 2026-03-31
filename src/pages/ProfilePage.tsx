import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';

interface LibraryEntry {
  plugin_id:    number;
  name:         string;
  category:     string | null;
  preview_path: string | null;
  dev_name:     string;
  amount_cents: number;
  purchased_at: string;
}

const ProfilePage = () => {
  const { user, login, logout, refreshUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [activeTab, setActiveTab] = useState('accountDetails');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if      (tab === 'payouts') setActiveTab('payouts');
    else if (tab === 'security') setActiveTab('security');
    else if (tab === 'danger')   setActiveTab('danger');
    else if (tab === 'library')  setActiveTab('library');
    else                         setActiveTab('accountDetails');
  }, [location]);

  const [formData, setFormData]         = useState({ username: '', email: '', password: '' });
  const [message, setMessage]           = useState({ text: '', type: '' });
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  // Library state
  const [library, setLibrary]           = useState<LibraryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  useEffect(() => { refreshUser?.(); }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, username: user.username || '', email: user.email || '' }));
    }
  }, [user]);

  // Fetch library when tab becomes active
  useEffect(() => {
    if (activeTab !== 'library') return;
    setLibraryLoading(true);
    setLibraryError(null);
    api.get('/user/library')
      .then(res => setLibrary(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLibraryError('Failed to load your library. Please try again.'))
      .finally(() => setLibraryLoading(false));
  }, [activeTab]);

  const showMessage = (text: string, isError = false) => {
    setMessage({ text, type: isError ? 'error' : 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleUpdate = async (e: React.FormEvent, endpoint: string, payload: object) => {
    e.preventDefault();
    try {
      const res = await api.post(endpoint, payload);
      if (res.data.token) login(res.data.token);
      showMessage(res.data.message || 'Updated successfully!');
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Update failed.', true);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleConnectStripe = async () => {
    setIsStripeLoading(true);
    try {
      const res = await api.post('/stripe/onboard');
      if (res.data.url) window.location.href = res.data.url;
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to start Stripe onboarding.', true);
      setIsStripeLoading(false);
    }
  };

  const handleGoToStripe = async () => {
    setIsStripeLoading(true);
    try {
      const res = await api.get('/stripe/dashboard');
      if (res.data.url) window.location.href = res.data.url;
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to open Stripe dashboard.', true);
      setIsStripeLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action is irreversible.')) return;
    try {
      await api.delete('/user');
      logout();
      navigate('/login');
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Failed to delete account.', true);
    }
  };

  return (
    <div className="container profile-page">
      <h1 className="page-title">User <span>Profile</span></h1>

      {message.text && (
        <p
          className={`form-message ${message.type === 'error' ? 'text-danger' : 'text-success'}`}
          style={{ textAlign: 'center', color: message.type === 'error' ? '#ff4d4d' : '#4ade80' }}
        >
          {message.text}
        </p>
      )}

      <div className="profile-layout">
        <nav className="profile-nav">
          <button className={`profile-nav-item ${activeTab === 'accountDetails' ? 'active' : ''}`} onClick={() => setActiveTab('accountDetails')}>
            Account Details
          </button>
          <button className={`profile-nav-item ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>
            Library
          </button>
          <button className={`profile-nav-item ${activeTab === 'payouts' ? 'active' : ''}`} onClick={() => setActiveTab('payouts')}>
            Payouts
          </button>
          <button className={`profile-nav-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            Security
          </button>
          <button className={`profile-nav-item ${activeTab === 'danger' ? 'active' : ''}`} onClick={() => setActiveTab('danger')} style={{ color: '#ff4d4d' }}>
            Danger Zone
          </button>
          <button className="profile-nav-item" onClick={handleLogout} style={{ marginTop: 'auto', borderTop: '1px solid #333' }}>
            Sign Out
          </button>
        </nav>

        <div className="profile-content">

          {/* ── Account Details ── */}
          {activeTab === 'accountDetails' && (
            <div className="profile-section">
              <h2 className="section-title"><span>Change</span> Account Details</h2>

              <form onSubmit={(e) => handleUpdate(e, '/user/change-username', { newUsername: formData.username })}>
                <div className="form-group">
                  <label>USERNAME</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                </div>
                <button type="submit" className="btn">Update Username</button>
              </form>

              <form onSubmit={(e) => handleUpdate(e, '/user/change-email', { newEmail: formData.email })} style={{ marginTop: '2rem' }}>
                <div className="form-group">
                  <label>EMAIL</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <button type="submit" className="btn">Update Email</button>
              </form>
            </div>
          )}

          {/* ── Library ── */}
          {activeTab === 'library' && (
            <div className="profile-section">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}><span>My</span> Library</h2>
                {library.length > 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {library.length} plugin{library.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.88rem' }}>
                Your purchased plugins. Click to visit the plugin page and download.
              </p>

              {libraryLoading && (
                <div className="library-loading">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="library-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}

              {libraryError && (
                <div className="library-error">
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <span>{libraryError}</span>
                </div>
              )}

              {!libraryLoading && !libraryError && library.length === 0 && (
                <div className="library-empty">
                  <div className="library-empty-bg" />
                  <div className="library-empty-icon">📦</div>
                  <p className="library-empty-title">Your library is empty</p>
                  <p className="library-empty-sub">Purchased plugins will appear here, ready to download anytime.</p>
                  <Link to="/" className="btn" style={{ marginTop: '1.25rem', fontSize: '0.8rem', padding: '0.6rem 1.4rem' }}>
                    Browse Plugins
                  </Link>
                </div>
              )}

              {!libraryLoading && !libraryError && library.length > 0 && (
                <div className="library-grid">
                  {library.map((entry, idx) => (
                    <Link
                      key={entry.plugin_id}
                      to={`/plugin/${entry.plugin_id}`}
                      className="library-card"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      {/* Preview image */}
                      <div className="library-card-image">
                        {entry.preview_path ? (
                          <img
                            src={entry.preview_path}
                            alt={entry.name}
                          />
                        ) : (
                          <div className="library-card-image-fallback">
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Owned badge */}
                        <div className="library-owned-badge">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Owned
                        </div>
                        {/* Category tag */}
                        {entry.category && (
                          <div className="library-card-category-tag">{entry.category}</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="library-card-body">
                        <div className="library-card-title-row">
                          <span className="library-card-name">{entry.name}</span>
                        </div>
                        <span className="library-card-dev">by {entry.dev_name}</span>

                        <div className="library-card-footer">
                          <span className="library-card-price">
                            €{(entry.amount_cents / 100).toFixed(2)}
                          </span>
                          <span className="library-card-date">
                            {new Date(entry.purchased_at).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Hover arrow */}
                      <div className="library-card-arrow">→</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Payouts ── */}
          {activeTab === 'payouts' && (
            <div className="profile-section">
              <h2 className="section-title"><span>Payout</span> Settings</h2>
              <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                Connect your Stripe account to receive payouts for your plugin sales.
              </p>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                {user?.stripe_ready ? (
                  /* ── Fully connected ── */
                  <>
                    <div style={{ color: '#4ade80', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>Stripe account connected</span>
                    </div>
                    <button className="btn btn-secondary" onClick={handleGoToStripe} disabled={isStripeLoading} style={{ gap: '10px' }}>
                      {isStripeLoading ? <><span className="spinner" /> Opening Dashboard…</> : 'Go to Stripe Dashboard'}
                    </button>
                  </>
                ) : user?.stripe_account_id ? (
                  /* ── Account created but onboarding not finished ── */
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f59e0b', marginBottom: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span style={{ fontWeight: 700 }}>Finish Stripe connection</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                      Your Stripe account was created but hasn't been fully activated yet.<br />
                      Complete the onboarding to start receiving payouts.
                    </p>
                    <button className="btn" style={{ background: '#f59e0b', color: '#000', gap: '10px' }} onClick={handleConnectStripe} disabled={isStripeLoading}>
                      {isStripeLoading ? <><span className="spinner" /> Redirecting…</> : 'Continue Stripe Setup →'}
                    </button>
                  </>
                ) : (
                  /* ── No account at all ── */
                  <>
                    <div style={{ marginBottom: '1.5rem', opacity: 0.7 }}>No Stripe account linked.</div>
                    <button className="btn" style={{ background: '#6366f1', gap: '10px' }} onClick={handleConnectStripe} disabled={isStripeLoading}>
                      {isStripeLoading ? <><span className="spinner" /> Connecting to Stripe…</> : 'Connect Stripe Account'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="profile-section">
              <h2 className="section-title"><span>Change</span> Password</h2>
              <form onSubmit={(e) => handleUpdate(e, '/user/settings', { newPassword: formData.password })}>
                <div className="form-group">
                  <label>NEW PASSWORD</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <button type="submit" className="btn">Update Password</button>
              </form>
            </div>
          )}

          {/* ── Danger Zone ── */}
          {activeTab === 'danger' && (
            <div className="profile-section">
              <h2 className="section-title"><span>Danger</span> Zone</h2>
              <p style={{ marginBottom: '1rem' }}>Proceeding will wipe your balance and all uploaded plugins from PumpkinMC.</p>
              <button onClick={handleDeleteAccount} className="btn" style={{ background: '#ff4d4d' }}>
                Delete My Account
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;