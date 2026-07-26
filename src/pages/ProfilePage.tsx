import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import { useAuth } from '../App';
import { getCodeList } from 'country-list';
import DeveloperOnboardingModal from '../components/DeveloperOnboardingModal';
import {
  User, Mail, Globe, Lock, Shield, CreditCard,
  BookOpen, AlertTriangle, LogOut, CheckCircle,
  AlertCircle, Eye, EyeOff, ChevronRight, Bell,
  Smartphone, Key, Trash2, Code, Sparkles, Building2
} from 'lucide-react';

interface LibraryEntry {
  plugin_id:    number;
  name:         string;
  category:     string | null;
  preview_path: string | null;
  dev_name:     string;
  amount_cents: number;
  purchased_at: string;
}

type Tab = 'account' | 'security' | 'developer' | 'notifications' | 'library' | 'danger';

const NAV: { key: Tab; label: string; icon: React.FC<{ size?: number }> ; danger?: boolean }[] = [
  { key: 'account',       label: 'Account',        icon: User        },
  { key: 'security',      label: 'Security',        icon: Shield      },
  { key: 'developer',     label: 'Developer Profile', icon: Code     },
  { key: 'notifications', label: 'Notifications',   icon: Bell        },
  { key: 'library',       label: 'Library',         icon: BookOpen    },
  { key: 'danger',        label: 'Danger Zone',     icon: AlertTriangle, danger: true },
];

const ProfilePage = () => {
  const { user, login, logout, refreshUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>('account');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as Tab | null;
    if (tab && NAV.some(n => n.key === tab)) setActiveTab(tab);
    else setActiveTab('account');
  }, [location]);

  const [formData, setFormData] = useState({
    username: '', email: '', country: '',
    password: '', currentPassword: '', disable2faPassword: '',
    newPassword: '', confirmPassword: '',
  });
  const [showCurrentPw, setShowCurrentPw]   = useState(false);
  const [showNewPw, setShowNewPw]           = useState(false);
  const [showConfirmPw, setShowConfirmPw]   = useState(false);
  const [show2faPw, setShow2faPw]           = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Library
  const [library, setLibrary]           = useState<LibraryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  // 2FA
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [setup2faData, setSetup2faData] = useState<{ uri: string; secret: string } | null>(null);
  const [verify2faCode, setVerify2faCode] = useState('');

  // Notifications (UI-only for now, persisted locally)
  const [notifPrefs, setNotifPrefs] = useState({
    purchaseEmail: true,
    reviewEmail: true,
    updateEmail: false,
    marketingEmail: false,
  });

  useEffect(() => { refreshUser?.(); }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        country: user.country || '',
      }));
      setIs2faEnabled(user.totp_enabled || false);
    }
  }, [user]);

  // Developer Profile State
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [devProfile, setDevProfile] = useState<any>(null);
  const [devProfileForm, setDevProfileForm] = useState({
    displayName: '', legalName: '', streetAddress: '', city: '', postalCode: '', vatId: '', publishingIntent: '', supportEmail: '', websiteUrl: '', githubUrl: '',
  });

  useEffect(() => {
    if (activeTab === 'developer' && user?.is_developer) {
      api.get('/user/developer/profile')
        .then(res => {
          if (res.data.profile) {
            setDevProfile(res.data.profile);
            setDevProfileForm({
              displayName: res.data.profile.display_name || '',
              legalName: res.data.profile.legal_name || '',
              streetAddress: res.data.profile.street_address || '',
              city: res.data.profile.city || '',
              postalCode: res.data.profile.postal_code || '',
              vatId: res.data.profile.vat_id || '',
              publishingIntent: res.data.profile.publishing_intent || '',
              supportEmail: res.data.profile.support_email || '',
              websiteUrl: res.data.profile.website_url || '',
              githubUrl: res.data.profile.github_url || '',
            });
          }
        })
        .catch(err => console.error('Failed to load dev profile', err));
    }
  }, [activeTab, user?.is_developer]);

  const handleUpdateDevProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await withSaving('devProfile', async () => {
      try {
        const res = await api.put('/user/developer/profile', devProfileForm);
        setDevProfile(res.data.profile);
        showToast('Developer profile updated!');
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to update developer profile.', 'error');
      }
    });
  };

  useEffect(() => {
    if (activeTab !== 'library') return;
    setLibraryLoading(true);
    setLibraryError(null);
    api.get('/user/library')
      .then(res => setLibrary(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLibraryError('Failed to load your library. Please try again.'))
      .finally(() => setLibraryLoading(false));
  }, [activeTab]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const withSaving = async (key: string, fn: () => Promise<void>) => {
    setSaving(s => ({ ...s, [key]: true }));
    try { await fn(); } finally { setSaving(s => ({ ...s, [key]: false })); }
  };

  const handleUpdate = async (e: React.FormEvent, endpoint: string, payload: object, key: string) => {
    e.preventDefault();
    await withSaving(key, async () => {
      try {
        const res = await api.post(endpoint, payload);
        if (res.data.token) login(res.data.token);
        showToast(res.data.message || 'Updated successfully!');
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Update failed.', 'error');
      }
    });
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleConnectStripe = async () => {
    setIsStripeLoading(true);
    try {
      const res = await api.post('/stripe/onboard');
      if (res.data.url) window.location.href = res.data.url;
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to start Stripe onboarding.', 'error');
      setIsStripeLoading(false);
    }
  };

  const handleGoToStripe = async () => {
    setIsStripeLoading(true);
    try {
      const res = await api.get('/stripe/dashboard');
      if (res.data.url) window.location.href = res.data.url;
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to open Stripe dashboard.', 'error');
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
      showToast(err.response?.data?.error || 'Failed to delete account.', 'error');
    }
  };

  const start2faSetup = async () => {
    try {
      const res = await api.post('/user/2fa/setup');
      setSetup2faData(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to start 2FA setup.', 'error');
      if (err.response?.status === 400 && err.response?.data?.error === '2FA is already enabled') {
        setIs2faEnabled(true);
        refreshUser?.();
      }
    }
  };

  const confirm2faSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/user/2fa/verify', { code: verify2faCode });
      setIs2faEnabled(true);
      setSetup2faData(null);
      setVerify2faCode('');
      showToast('2FA enabled successfully!');
      refreshUser?.();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Invalid 2FA code.', 'error');
    }
  };

  const disable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/user/2fa/disable', { password: formData.disable2faPassword });
      setIs2faEnabled(false);
      setFormData({ ...formData, disable2faPassword: '' });
      showToast('2FA has been disabled.');
      refreshUser?.();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to disable 2FA.', 'error');
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────────

  const SettingsCard = ({ title, description, icon: Icon, children }: {
    title: string; description?: string; icon?: React.FC<{ size?: number }>; children: React.ReactNode;
  }) => (
    <div className="settings-card">
      {(title || Icon) && (
        <div className="settings-card-header">
          {Icon && <div className="settings-card-icon"><Icon size={16} /></div>}
          <div>
            <p className="settings-card-title">{title}</p>
            {description && <p className="settings-card-desc">{description}</p>}
          </div>
        </div>
      )}
      <div className="settings-card-body">{children}</div>
    </div>
  );

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      {hint && <p className="settings-hint">{hint}</p>}
      {children}
    </div>
  );

  const SaveBtn = ({ id, label = 'Save Changes' }: { id: string; label?: string }) => (
    <button type="submit" className="settings-btn settings-btn-primary" disabled={saving[id]}>
      {saving[id] ? <><span className="spinner-sm" />{label.replace('Save', 'Saving')}…</> : label}
    </button>
  );

  const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
    <div className="settings-toggle-row">
      <div>
        <p className="settings-toggle-label">{label}</p>
        {desc && <p className="settings-toggle-desc">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`settings-toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-toggle-thumb" />
      </button>
    </div>
  );

  const PwInput = ({ placeholder, value, onChange, show, onToggle }: {
    placeholder: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
  }) => (
    <div className="settings-pw-wrap">
      <input
        type={show ? 'text' : 'password'}
        className="settings-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
      />
      <button type="button" className="settings-pw-eye" onClick={onToggle} tabIndex={-1}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="container profile-page">
      <h1 className="page-title">Account <span>Settings</span></h1>

      {/* Toast */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success'
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />}
          {toast.text}
        </div>
      )}

      <div className="profile-layout">
        {/* ── Sidebar nav ── */}
        <nav className="profile-nav">
          <div className="settings-nav-user">
            <div className="settings-nav-avatar">
              {user?.username?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="settings-nav-meta">
              <p className="settings-nav-name">{user?.username}</p>
              <p className="settings-nav-email">{user?.email}</p>
            </div>
          </div>

          <div className="settings-nav-divider" />

          {NAV.map(({ key, label, icon: Icon, danger }) => (
            <button
              key={key}
              className={`profile-nav-item ${activeTab === key ? 'active' : ''} ${danger ? 'danger' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={15} />
              {label}
              {activeTab === key && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </button>
          ))}

          <div className="settings-nav-divider" style={{ marginTop: 'auto' }} />
          <button className="profile-nav-item" onClick={handleLogout}>
            <LogOut size={15} />
            Sign Out
          </button>
        </nav>

        {/* ── Main content ── */}
        <div className="profile-content">

          {/* ══ ACCOUNT ══════════════════════════════════════════════════ */}
          {activeTab === 'account' && (
            <div className="profile-section">
              <div className="settings-section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <span>Account</span> Details
                </h2>
                <p className="settings-section-sub">Manage your public identity and contact information.</p>
              </div>

              <SettingsCard title="Username" description="Your public display name across the marketplace." icon={User}>
                <form onSubmit={e => handleUpdate(e, '/user/change-username', { newUsername: formData.username }, 'username')}>
                  <Field label="Username">
                    <input
                      className="settings-input"
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Your username"
                    />
                  </Field>
                  <SaveBtn id="username" label="Update Username" />
                </form>
              </SettingsCard>

              <SettingsCard title="Email Address" description="We'll send a verification link to your new address." icon={Mail}>
                <form onSubmit={e => handleUpdate(e, '/user/change-email', { newEmail: formData.email }, 'email')}>
                  <Field label="Email">
                    <input
                      className="settings-input"
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </Field>
                  <SaveBtn id="email" label="Update Email" />
                </form>
              </SettingsCard>

              <SettingsCard title="Country" description="Used for tax purposes and regional features. Auto-detected from IP on registration." icon={Globe}>
                <form onSubmit={e => {
                  if (!formData.country) {
                    e.preventDefault();
                    showToast('Please select a country.', 'error');
                    return;
                  }
                  handleUpdate(e, '/user/change-country', { newCountry: formData.country }, 'country');
                }}>
                  <Field label="Country">
                    <select
                      className="settings-input settings-select"
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      required
                    >
                      <option value="">Select a country…</option>
                      {Object.entries(getCodeList())
                        .sort((a, b) => a[1].localeCompare(b[1]))
                        .map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                    </select>
                  </Field>
                  <SaveBtn id="country" label="Update Country" />
                </form>
              </SettingsCard>
            </div>
          )}

          {/* ══ SECURITY ══════════════════════════════════════════════════ */}
          {activeTab === 'security' && (
            <div className="profile-section">
              <div className="settings-section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <span>Security</span> Settings
                </h2>
                <p className="settings-section-sub">Protect your account with a strong password and two-factor authentication.</p>
              </div>

              {/* Password */}
              <SettingsCard title="Change Password" description="Use a strong, unique password you don't use elsewhere." icon={Key}>
                <form onSubmit={e => {
                  if (formData.newPassword !== formData.confirmPassword) {
                    e.preventDefault();
                    showToast('Passwords do not match.', 'error');
                    return;
                  }
                  handleUpdate(e, '/user/settings', {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                  }, 'password');
                }}>
                  <Field label="Current Password">
                    <PwInput
                      placeholder="Current password"
                      value={formData.currentPassword}
                      onChange={v => setFormData({ ...formData, currentPassword: v })}
                      show={showCurrentPw}
                      onToggle={() => setShowCurrentPw(s => !s)}
                    />
                  </Field>
                  <Field label="New Password">
                    <PwInput
                      placeholder="New password"
                      value={formData.newPassword}
                      onChange={v => setFormData({ ...formData, newPassword: v })}
                      show={showNewPw}
                      onToggle={() => setShowNewPw(s => !s)}
                    />
                  </Field>
                  <Field label="Confirm New Password">
                    <PwInput
                      placeholder="Repeat new password"
                      value={formData.confirmPassword}
                      onChange={v => setFormData({ ...formData, confirmPassword: v })}
                      show={showConfirmPw}
                      onToggle={() => setShowConfirmPw(s => !s)}
                    />
                  </Field>
                  {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                    <p className="settings-inline-error"><AlertCircle size={13} /> Passwords do not match</p>
                  )}
                  <SaveBtn id="password" label="Update Password" />
                </form>
              </SettingsCard>

              {/* 2FA */}
              <SettingsCard title="Two-Factor Authentication" icon={Smartphone}
                description="Add an extra layer of security using an authenticator app like Google Authenticator or Authy.">
                {is2faEnabled ? (
                  <div>
                    <div className="settings-status-row success">
                      <CheckCircle size={16} />
                      <span>2FA is currently <strong>enabled</strong> on your account.</span>
                    </div>
                    <form onSubmit={disable2fa} style={{ marginTop: '1.5rem' }}>
                      <Field label="Confirm with your password to disable">
                        <PwInput
                          placeholder="Your current password"
                          value={formData.disable2faPassword}
                          onChange={v => setFormData({ ...formData, disable2faPassword: v })}
                          show={show2faPw}
                          onToggle={() => setShow2faPw(s => !s)}
                        />
                      </Field>
                      <button type="submit" className="settings-btn settings-btn-danger-outline">
                        Disable 2FA
                      </button>
                    </form>
                  </div>
                ) : !setup2faData ? (
                  <div>
                    <div className="settings-status-row warn">
                      <AlertCircle size={16} />
                      <span>2FA is <strong>not enabled</strong>. We recommend enabling it for account protection.</span>
                    </div>
                    <button className="settings-btn settings-btn-primary" style={{ marginTop: '1.5rem' }} onClick={start2faSetup}>
                      Set Up 2FA
                    </button>
                  </div>
                ) : (
                  <div className="settings-2fa-setup">
                    <p className="settings-2fa-step"><span>1</span> Scan this QR code with your authenticator app:</p>
                    <div className="settings-qr-wrap">
                      <QRCodeSVG value={setup2faData.uri} size={140} />
                    </div>
                    <p className="settings-2fa-manual">
                      Or enter this code manually:<br />
                      <code className="settings-secret">{setup2faData.secret}</code>
                    </p>
                    <p className="settings-2fa-step" style={{ marginTop: '1.5rem' }}><span>2</span> Enter the 6-digit code from your app:</p>
                    <form onSubmit={confirm2faSetup} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
                      <input
                        type="text"
                        className="settings-input settings-code-input"
                        placeholder="000 000"
                        maxLength={6}
                        value={verify2faCode}
                        onChange={e => setVerify2faCode(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                      <button type="submit" className="settings-btn settings-btn-primary">Verify & Enable</button>
                    </form>
                  </div>
                )}
              </SettingsCard>
            </div>
          )}

          {/* ══ DEVELOPER PROFILE ════════════════════════════════════════════ */}
          {activeTab === 'developer' && (
            <div className="profile-section">
              <div className="settings-section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <span>Developer</span> Account & Payouts
                </h2>
                <p className="settings-section-sub">Manage your creator identity, support information, and payout settings.</p>
              </div>

              {!user?.is_developer ? (
                <SettingsCard title="Become a Developer" icon={Sparkles}
                  description="Unlock developer features to publish free or paid plugins to PumpkinMarket.">
                  <div className="settings-stripe-empty">
                    <Code size={36} style={{ color: '#f97316' }} />
                    <p style={{ margin: '0.75rem 0', fontWeight: 600 }}>You haven't set up a Developer Profile yet.</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Individual creators and organizations can publish plugins for $0. Start your onboarding now!
                    </p>
                    <button
                      className="settings-btn settings-btn-primary"
                      style={{ marginTop: '1rem' }}
                      onClick={() => setIsDevModalOpen(true)}
                    >
                      <Sparkles size={16} /> Complete Developer Onboarding
                    </button>
                  </div>
                </SettingsCard>
              ) : (
                <>
                  {/* Developer Details */}
                  {devProfile && (
                    <SettingsCard title="Developer Identity" icon={Building2}
                      description="Your public developer information shown on plugin pages.">
                      <form onSubmit={handleUpdateDevProfile}>
                        <Field label="Entity Type">
                          <input
                            className="settings-input"
                            type="text"
                            value={devProfile.entity_type === 'organization' ? 'Organization / Studio' : 'Individual Developer'}
                            disabled
                          />
                        </Field>

                        <Field label="Public Display Name">
                          <input
                            className="settings-input"
                            type="text"
                            value={devProfileForm.displayName}
                            onChange={e => setDevProfileForm({ ...devProfileForm, displayName: e.target.value })}
                            required
                          />
                        </Field>

                        <Field label="Legal Full Name / Business Name" hint="Used for internal verification & tax compliance">
                          <input
                            className="settings-input"
                            type="text"
                            value={devProfileForm.legalName}
                            onChange={e => setDevProfileForm({ ...devProfileForm, legalName: e.target.value })}
                          />
                        </Field>

                        <Field label="Street Address">
                          <input
                            className="settings-input"
                            type="text"
                            value={devProfileForm.streetAddress}
                            onChange={e => setDevProfileForm({ ...devProfileForm, streetAddress: e.target.value })}
                            placeholder="123 Main St"
                          />
                        </Field>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <Field label="City">
                            <input
                              className="settings-input"
                              type="text"
                              value={devProfileForm.city}
                              onChange={e => setDevProfileForm({ ...devProfileForm, city: e.target.value })}
                            />
                          </Field>
                          <Field label="Postal / ZIP Code">
                            <input
                              className="settings-input"
                              type="text"
                              value={devProfileForm.postalCode}
                              onChange={e => setDevProfileForm({ ...devProfileForm, postalCode: e.target.value })}
                            />
                          </Field>
                        </div>

                        <Field label="VAT / Tax ID" hint="Optional for businesses">
                          <input
                            className="settings-input"
                            type="text"
                            value={devProfileForm.vatId}
                            onChange={e => setDevProfileForm({ ...devProfileForm, vatId: e.target.value })}
                            placeholder="EU123456789"
                          />
                        </Field>

                        <Field label="Support Email" hint="Public email for plugin buyers to contact you">
                          <input
                            className="settings-input"
                            type="email"
                            value={devProfileForm.supportEmail}
                            onChange={e => setDevProfileForm({ ...devProfileForm, supportEmail: e.target.value })}
                            placeholder="support@domain.com"
                          />
                        </Field>

                        <Field label="Website URL">
                          <input
                            className="settings-input"
                            type="url"
                            value={devProfileForm.websiteUrl}
                            onChange={e => setDevProfileForm({ ...devProfileForm, websiteUrl: e.target.value })}
                            placeholder="https://website.com"
                          />
                        </Field>

                        <Field label="GitHub Profile">
                          <input
                            className="settings-input"
                            type="text"
                            value={devProfileForm.githubUrl}
                            onChange={e => setDevProfileForm({ ...devProfileForm, githubUrl: e.target.value })}
                            placeholder="https://github.com/username"
                          />
                        </Field>

                        <SaveBtn id="devProfile" label="Save Developer Info" />
                      </form>
                    </SettingsCard>
                  )}

                  {/* Payouts / Stripe */}
                  <SettingsCard title="Stripe Payouts (Paid Plugins)" icon={CreditCard}
                    description="Connect your Stripe account to earn money from paid plugin sales. Optional for free plugins.">
                    <div className="settings-stripe-box">
                      {user?.stripe_ready ? (
                        <>
                          <div className="settings-status-row success" style={{ marginBottom: '1.5rem' }}>
                            <CheckCircle size={18} />
                            <div>
                              <p style={{ fontWeight: 700, margin: 0 }}>Stripe account connected</p>
                              <p style={{ fontSize: '0.82rem', margin: '0.2rem 0 0', opacity: 0.7 }}>Your payouts are active and ready to receive funds from paid plugin sales.</p>
                            </div>
                          </div>
                          <button className="settings-btn settings-btn-secondary" onClick={handleGoToStripe} disabled={isStripeLoading}>
                            {isStripeLoading ? <><span className="spinner-sm" />Opening…</> : 'Go to Stripe Dashboard →'}
                          </button>
                        </>
                      ) : user?.stripe_account_id ? (
                        <>
                          <div className="settings-status-row warn" style={{ marginBottom: '1.5rem' }}>
                            <AlertCircle size={18} />
                            <div>
                              <p style={{ fontWeight: 700, margin: 0 }}>Stripe onboarding incomplete</p>
                              <p style={{ fontSize: '0.82rem', margin: '0.2rem 0 0', opacity: 0.7 }}>Your account was created but hasn't been fully activated yet.</p>
                            </div>
                          </div>
                          <button className="settings-btn settings-btn-warn" onClick={handleConnectStripe} disabled={isStripeLoading}>
                            {isStripeLoading ? <><span className="spinner-sm" />Redirecting…</> : 'Continue Stripe Setup →'}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="settings-stripe-empty">
                            <CreditCard size={32} style={{ opacity: 0.3 }} />
                            <p>No Stripe account linked yet. Free plugin uploads are fully enabled.</p>
                          </div>
                          <button className="settings-btn settings-btn-primary" onClick={handleConnectStripe} disabled={isStripeLoading}>
                            {isStripeLoading ? <><span className="spinner-sm" />Connecting…</> : 'Connect Stripe Account for Paid Sales'}
                          </button>
                        </>
                      )}
                    </div>
                  </SettingsCard>

                  <SettingsCard title="Payout FAQ" icon={Lock}>
                    <div className="settings-faq">
                      {[
                        { q: 'Can I upload free plugins without Stripe?', a: 'Yes! Stripe Connect is only required if you want to sell paid plugins.' },
                        { q: 'When do I get paid for sales?', a: 'Stripe transfers earnings automatically within 2–7 business days.' },
                        { q: 'What platform fee applies?', a: 'PumpkinMarket takes a low platform commission per sale. Stripe processing fees apply.' },
                      ].map(({ q, a }) => (
                        <div key={q} className="settings-faq-item">
                          <p className="settings-faq-q">{q}</p>
                          <p className="settings-faq-a">{a}</p>
                        </div>
                      ))}
                    </div>
                  </SettingsCard>
                </>
              )}
            </div>
          )}

          {/* ══ NOTIFICATIONS ═════════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <div className="profile-section">
              <div className="settings-section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <span>Notification</span> Preferences
                </h2>
                <p className="settings-section-sub">Choose which emails and alerts you want to receive.</p>
              </div>

              <SettingsCard title="Email Notifications" icon={Mail}
                description="Control which transactional emails we send to your registered address.">
                <div className="settings-toggles">
                  <Toggle
                    checked={notifPrefs.purchaseEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, purchaseEmail: v }))}
                    label="New purchase"
                    desc="Receive an email whenever someone buys your plugin."
                  />
                  <Toggle
                    checked={notifPrefs.reviewEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, reviewEmail: v }))}
                    label="New review"
                    desc="Get notified when a user leaves a review on your plugin."
                  />
                  <Toggle
                    checked={notifPrefs.updateEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, updateEmail: v }))}
                    label="Marketplace updates"
                    desc="Important changes to marketplace policies or features."
                  />
                  <Toggle
                    checked={notifPrefs.marketingEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, marketingEmail: v }))}
                    label="Tips & promotions"
                    desc="Occasional tips to grow your plugin sales."
                  />
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    className="settings-btn settings-btn-primary"
                    onClick={() => showToast('Notification preferences saved!')}
                  >
                    Save Preferences
                  </button>
                </div>
              </SettingsCard>
            </div>
          )}

          {/* ══ LIBRARY ═══════════════════════════════════════════════════ */}
          {activeTab === 'library' && (
            <div className="profile-section">
              <div className="settings-section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <span>My</span> Library
                  {library.length > 0 && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {library.length} plugin{library.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </h2>
                <p className="settings-section-sub">Your purchased plugins, available to download at any time.</p>
              </div>

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
                      <div className="library-card-image">
                        {entry.preview_path ? (
                          <img src={entry.preview_path} alt={entry.name} />
                        ) : (
                          <div className="library-card-image-fallback">
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="library-owned-badge">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Owned
                        </div>
                        {entry.category && (
                          <div className="library-card-category-tag">{entry.category}</div>
                        )}
                      </div>
                      <div className="library-card-body">
                        <div className="library-card-title-row">
                          <span className="library-card-name">{entry.name}</span>
                        </div>
                        <span className="library-card-dev">by {entry.dev_name}</span>
                        <div className="library-card-footer">
                          <span className="library-card-price">€{(entry.amount_cents / 100).toFixed(2)}</span>
                          <span className="library-card-date">
                            {new Date(entry.purchased_at).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="library-card-arrow">→</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ DANGER ZONE ═══════════════════════════════════════════════ */}
          {activeTab === 'danger' && (
            <div className="profile-section">
              <div className="settings-section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <span style={{ color: 'var(--danger, #ef4444)' }}>Danger</span> Zone
                </h2>
                <p className="settings-section-sub">These actions are permanent and cannot be undone.</p>
              </div>

              <SettingsCard title="Delete Account" icon={Trash2}
                description="Permanently deletes your account, all uploaded plugins, and any remaining balance. This cannot be reversed.">
                <div className="settings-danger-box">
                  <div className="settings-status-row error">
                    <AlertTriangle size={16} />
                    <span>
                      Deleting your account will immediately remove all your plugins from the marketplace
                      and forfeit any pending payouts.
                    </span>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="settings-btn settings-btn-danger"
                    style={{ marginTop: '1.5rem' }}
                  >
                    <Trash2 size={15} />
                    Delete My Account Permanently
                  </button>
                </div>
              </SettingsCard>
            </div>
          )}

        </div>
      </div>

      <DeveloperOnboardingModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
        onSuccess={() => {
          refreshUser?.();
          setActiveTab('developer');
        }}
      />
    </div>
  );
};

export default ProfilePage;