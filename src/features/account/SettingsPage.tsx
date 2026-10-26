import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { getCodeList } from 'country-list';
import DeveloperOnboardingModal from '../studio/DeveloperOnboardingModal';
import { getPluginUrl } from '../../lib/url';
import { openCookiePreferencesModal } from '../../lib/consent';
import { startRegistration } from '@simplewebauthn/browser';
import { RecoveryCodesModal } from './RecoveryCodesModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  User, Mail, Lock, Shield, CreditCard,
  BookOpen, AlertTriangle, LogOut,
  AlertCircle, Eye, EyeOff, ChevronRight, Bell,
  Smartphone, Key, Trash2, Code, Sparkles, Building2,
  ShieldCheck, Download, Sliders, Package, Laptop, Tablet,
  Fingerprint, Plus, ShieldAlert, RefreshCw, Copy, Check, Terminal,
  Cloud, Pencil, X
} from 'lucide-react';
import { getDevicePasskeyName } from '../../lib/deviceInfo';
import { Select } from '../../components/Select';
import '../../styles/account.css';

interface LibraryEntry {
  plugin_id:    number;
  public_id?:   string;
  name:         string;
  category:     string | null;
  preview_path: string | null;
  dev_name:     string;
  amount_cents: number;
  purchased_at: string;
  is_preorder?: boolean;
}

type Tab = 'account' | 'security' | 'api_keys' | 'developer' | 'notifications' | 'library' | 'privacy' | 'danger';

const NAV: { key: Tab; label: string; icon: React.FC<{ size?: number }> ; danger?: boolean }[] = [
  { key: 'account',       label: 'Account',             icon: User        },
  { key: 'security',      label: 'Security',            icon: Shield      },
  { key: 'api_keys',      label: 'API Keys',            icon: Key         },
  { key: 'developer',     label: 'Developer Profile',   icon: Code        },
  { key: 'notifications', label: 'Notifications',       icon: Bell        },
  { key: 'library',       label: 'Library',             icon: BookOpen    },
  { key: 'privacy',       label: 'Privacy & Data',      icon: ShieldCheck },
  { key: 'danger',        label: 'Danger Zone',         icon: AlertTriangle, danger: true },
];

interface SettingsCardProps {
  title?: string;
  description?: string;
  icon?: React.FC<{ size?: number }>;
  children: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, icon: Icon, children }) => (
  <section className="panel">
    {(title || Icon) && (
      <header className="panel-head ac-panel-head">
        {Icon && <span className="ac-icon"><Icon /></span>}
        <div>
          {title && <h3 className="h3">{title}</h3>}
          {description && <p className="small">{description}</p>}
        </div>
      </header>
    )}
    <div className="panel-body stack">{children}</div>
  </section>
);

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

interface SaveBtnProps {
  isSaving?: boolean;
  disabled?: boolean;
  label?: string;
}

const SaveBtn: React.FC<SaveBtnProps> = ({ isSaving = false, disabled = false, label = 'Save Changes' }) => (
  <button type="submit" className="button button-primary" disabled={isSaving || disabled} aria-busy={isSaving}>
    {isSaving ? `${label.replace('Save', 'Saving')}…` : label}
  </button>
);

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, desc }) => (
  <label className="choice ac-toggle-row">
    <span>
      {label}
      {desc && <span className="small">{desc}</span>}
    </span>
    <input
      type="checkbox"
      role="switch"
      className="toggle"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
  </label>
);

interface PwInputProps {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
  id?: string;
  name?: string;
}

const PwInput: React.FC<PwInputProps> = ({ placeholder, value, onChange, show, onToggle, autoComplete, id, name }) => (
  <span className="control">
    <input
      id={id}
      name={name}
      type={show ? 'text' : 'password'}
      className="input"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoComplete={autoComplete}
      required
    />
    <button type="button" className="ac-eye" onClick={onToggle} tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? <EyeOff /> : <Eye />}
    </button>
  </span>
);

const COUNTRY_OPTIONS = [
  { value: '', label: 'Select a country…' },
  ...Object.entries(getCodeList())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([code, name]) => ({ value: code, label: name })),
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch (German)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'it', label: 'Italiano (Italian)' },
  { value: 'nl', label: 'Nederlands (Dutch)' },
  { value: 'pt', label: 'Português (Portuguese)' },
  { value: 'pl', label: 'Polski (Polish)' },
  { value: 'ru', label: 'Русский (Russian)' },
  { value: 'tr', label: 'Türkçe (Turkish)' },
  { value: 'ja', label: '日本語 (Japanese)' },
  { value: 'ko', label: '한국어 (Korean)' },
  { value: 'zh', label: '中文 (Chinese)' },
];

const EXPIRY_OPTIONS = [
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days (Recommended)' },
  { value: '180', label: '180 Days' },
  { value: '365', label: '1 Year' },
  { value: '0', label: 'No Expiration' },
];

const SectionHead: React.FC<{ lead: React.ReactNode; rest: string; sub?: string; children?: React.ReactNode }> = ({ lead, rest, sub, children }) => (
  <header className="ac-section-head">
    <h2 className="h1"><span className="mark">{lead}</span> {rest}{children}</h2>
    {sub && <p className="small">{sub}</p>}
  </header>
);

const SettingsPage = () => {
  const { user, login, logout, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
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
    username: '', email: '', country: '', language: '',
    password: '', disable2faPassword: '',
  });
  const [show2faPw, setShow2faPw]           = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [library, setLibrary]           = useState<LibraryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [setup2faData, setSetup2faData] = useState<{ uri: string; secret: string } | null>(null);
  const [verify2faCode, setVerify2faCode] = useState('');

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
        language: user.preferred_language || prev.language || (i18n.language ? i18n.language.split('-')[0] : 'en'),
      }));
      setIs2faEnabled(user.totp_enabled || false);
    }
  }, [user, i18n.language]);

  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [devProfile, setDevProfile] = useState<any>(null);
  const [devProfileForm, setDevProfileForm] = useState({
    displayName: '', legalName: '', streetAddress: '', city: '', postalCode: '', vatId: '', publishingIntent: '', supportEmail: '', websiteUrl: '', githubUrl: '',
  });
  const [devNameError, setDevNameError] = useState<string | null>(null);
  const [devNameChecking, setDevNameChecking] = useState(false);
  const [devNameAvailable, setDevNameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const trimmed = devProfileForm.displayName.trim();
    if (!trimmed || (devProfile && trimmed.toLowerCase() === (devProfile.display_name || '').toLowerCase())) {
      setDevNameError(null);
      setDevNameChecking(false);
      setDevNameAvailable(null);
      return;
    }

    if (trimmed.length < 2) {
      setDevNameError('Developer name must be at least 2 characters');
      setDevNameChecking(false);
      setDevNameAvailable(false);
      return;
    }

    if (trimmed.length > 50) {
      setDevNameError('Developer name cannot exceed 50 characters');
      setDevNameChecking(false);
      setDevNameAvailable(false);
      return;
    }

    setDevNameChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/user/developer/check-name?name=${encodeURIComponent(trimmed)}`);
        if (res.data.available) {
          setDevNameError(null);
          setDevNameAvailable(true);
        } else {
          setDevNameError(t('developer.onboarding.name_taken_error', 'This developer name is already taken. Please choose another name.'));
          setDevNameAvailable(false);
        }
      } catch {
        setDevNameError(null);
        setDevNameAvailable(null);
      } finally {
        setDevNameChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [devProfileForm.displayName, devProfile, t]);

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
    if (devNameError || devNameChecking) {
      showToast(devNameError || 'Checking developer name availability...', 'error');
      return;
    }
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

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAllSessions, setRevokingAllSessions] = useState(false);

  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [editingPasskeyId, setEditingPasskeyId] = useState<number | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState('');
  const [passkeyRenaming, setPasskeyRenaming] = useState(false);

  const [recoveryStatus, setRecoveryStatus] = useState<{ remaining: number; total: number; hasCodes: boolean } | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [verify2faError, setVerify2faError] = useState('');
  const [verify2faLoading, setVerify2faLoading] = useState(false);

  interface ApiKey {
    id: number;
    name: string;
    keyPrefix: string;
    scopes: string[];
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    isRevoked: boolean;
  }

  const API_KEY_SCOPES = {
    PLUGINS_READ: 'plugins:read',
    PLUGINS_DOWNLOAD: 'plugins:download',
    PLUGINS_CREATE: 'plugins:create',
    PLUGINS_UPDATE: 'plugins:update',
    PLUGINS_VERSIONS_UPLOAD: 'plugins:versions:upload',
    PLUGINS_MEDIA_UPLOAD: 'plugins:media:upload',
    PLUGINS_PUBLISH: 'plugins:publish',
    PLUGINS_DELETE: 'plugins:delete',

    LICENSES_READ: 'licenses:read',
    LICENSES_CREATE: 'licenses:create',
    LICENSES_REVOKE: 'licenses:revoke',
    LICENSES_DELETE: 'licenses:delete',

    COUPONS_READ: 'coupons:read',
    COUPONS_WRITE: 'coupons:write',

    REVIEWS_READ: 'reviews:read',
    REVIEWS_REPLY: 'reviews:reply',

    ANALYTICS_READ: 'analytics:read',
    TELEMETRY_READ: 'telemetry:read',
  } as const;

  type ApiKeyScope = (typeof API_KEY_SCOPES)[keyof typeof API_KEY_SCOPES];

  interface ScopeItem {
    key: ApiKeyScope;
    name: string;
    description: string;
    devOnly?: boolean;
  }

  interface ScopeCategory {
    id: string;
    name: string;
    description: string;
    scopes: ScopeItem[];
  }

  const SCOPE_CATEGORIES: ScopeCategory[] = [
    {
      id: 'plugins',
      name: 'Plugins',
      description: 'Permissions for reading, downloading, creating, updating, and publishing plugins',
      scopes: [
        {
          key: API_KEY_SCOPES.PLUGINS_READ,
          name: 'Read Plugins',
          description: 'View plugin metadata, draft status, and version history',
        },
        {
          key: API_KEY_SCOPES.PLUGINS_DOWNLOAD,
          name: 'Download Plugins',
          description: 'Download free and owned plugin WebAssembly binaries and release artifacts',
        },
        {
          key: API_KEY_SCOPES.PLUGINS_CREATE,
          name: 'Create Plugins',
          description: 'Register and create new plugin listings on the marketplace',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_UPDATE,
          name: 'Update Details',
          description: 'Edit plugin descriptions, categories, links, icons, and pricing',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_VERSIONS_UPLOAD,
          name: 'Upload Versions',
          description: 'Upload new WebAssembly release binaries and version archives',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_MEDIA_UPLOAD,
          name: 'Upload Media',
          description: 'Upload screenshots, promotional images, and media gallery assets',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_PUBLISH,
          name: 'Publish & Unpublish',
          description: 'Publish draft plugins or toggle release visibility status',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_DELETE,
          name: 'Delete Plugins',
          description: 'Permanently remove owned plugins and associated artifacts',
          devOnly: true,
        },
      ],
    },
    {
      id: 'licenses',
      name: 'Licenses',
      description: 'Permissions for customer licenses on paid/premium plugins',
      scopes: [
        {
          key: API_KEY_SCOPES.LICENSES_READ,
          name: 'View Licenses',
          description: 'List issued customer licenses and inspect activation status',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.LICENSES_CREATE,
          name: 'Issue Licenses',
          description: 'Generate and issue new customer license keys',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.LICENSES_REVOKE,
          name: 'Revoke Licenses',
          description: 'Toggle revocation status for issued customer licenses',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.LICENSES_DELETE,
          name: 'Delete Licenses',
          description: 'Permanently remove license records from the database',
          devOnly: true,
        },
      ],
    },
    {
      id: 'coupons',
      name: 'Coupons',
      description: 'Permissions for promotional discount codes',
      scopes: [
        {
          key: API_KEY_SCOPES.COUPONS_READ,
          name: 'View Coupons',
          description: 'List active, scheduled, and expired promotional discount codes',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.COUPONS_WRITE,
          name: 'Manage Coupons',
          description: 'Create, update, and delete promotional discount codes',
          devOnly: true,
        },
      ],
    },
    {
      id: 'reviews',
      name: 'Reviews',
      description: 'Permissions for reading and replying to community reviews',
      scopes: [
        {
          key: API_KEY_SCOPES.REVIEWS_READ,
          name: 'View Reviews',
          description: 'Read plugin user ratings and feedback reviews',
        },
        {
          key: API_KEY_SCOPES.REVIEWS_REPLY,
          name: 'Reply to Reviews',
          description: 'Post official developer replies to customer reviews',
          devOnly: true,
        },
      ],
    },
    {
      id: 'analytics',
      name: 'Analytics & Telemetry',
      description: 'Permissions for developer statistics, revenue metrics, and runtime telemetry',
      scopes: [
        {
          key: API_KEY_SCOPES.ANALYTICS_READ,
          name: 'Read Analytics',
          description: 'Query developer download charts, visitor statistics, and revenue telemetry',
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.TELEMETRY_READ,
          name: 'Read Telemetry',
          description: 'Query runtime heartbeat metrics, active player counts, and server distributions',
          devOnly: true,
        },
      ],
    },
  ];

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiresIn, setNewKeyExpiresIn] = useState(90);
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([API_KEY_SCOPES.PLUGINS_DOWNLOAD]);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const toggleCategory = (cat: ScopeCategory) => {
    const keys = cat.scopes.map(s => s.key);
    const allSelected = keys.every(k => selectedScopes.includes(k));
    if (allSelected) {
      setSelectedScopes(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setSelectedScopes(prev => Array.from(new Set([...prev, ...keys])));
    }
  };

  const toggleScope = (key: ApiKeyScope) => {
    setSelectedScopes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllScopes = () => {
    const allKeys = SCOPE_CATEGORIES.flatMap(c => c.scopes.map(s => s.key));
    setSelectedScopes(allKeys);
  };

  const deselectAllScopes = () => {
    setSelectedScopes([]);
  };

  const fetchApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const res = await api.get('/user/api-keys');
      setApiKeys(res.data);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    if (selectedScopes.length === 0) {
      showToast('Please select at least one permission scope for this key.', 'error');
      return;
    }
    setCreatingKey(true);
    try {
      const res = await api.post('/user/api-keys', {
        name: newKeyName.trim(),
        expiresInDays: newKeyExpiresIn > 0 ? newKeyExpiresIn : null,
        scopes: selectedScopes,
      });
      setCreatedRawKey(res.data.rawKey);
      setNewKeyName('');
      setNewKeyExpiresIn(90);
      setSelectedScopes([API_KEY_SCOPES.PLUGINS_DOWNLOAD]);
      await fetchApiKeys();
      showToast('API Key created successfully!');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create API key', 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: number) => {
    if (!window.confirm('Are you sure you want to revoke this API key? External tools and servers using it will immediately lose access.')) return;
    setRevokingKeyId(id);
    try {
      await api.delete(`/user/api-keys/${id}`);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      showToast('API Key revoked successfully.');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to revoke API key', 'error');
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleCopyRawKey = () => {
    if (!createdRawKey) return;
    navigator.clipboard.writeText(createdRawKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
      fetchPasskeys();
      fetchRecoveryStatus();
    } else if (activeTab === 'api_keys') {
      fetchApiKeys();
    }
  }, [activeTab]);

  const fetchRecoveryStatus = async () => {
    setRecoveryLoading(true);
    try {
      const res = await api.get('/user/recovery-codes');
      setRecoveryStatus(res.data);
    } catch {
      setRecoveryStatus(null);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleGenerateRecoveryCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegenLoading(true);
    try {
      const res = await api.post('/user/recovery-codes/generate', { password: regenPassword });
      setGeneratedCodes(res.data.codes || []);
      setShowRegenModal(false);
      setRegenPassword('');
      setShowCodesModal(true);
      fetchRecoveryStatus();
      showToast('New recovery codes generated.');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to generate recovery codes.', 'error');
    } finally {
      setRegenLoading(false);
    }
  };

  const fetchPasskeys = async () => {
    setPasskeysLoading(true);
    try {
      const res = await api.get('/user/passkeys');
      setPasskeys(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPasskeys([]);
    } finally {
      setPasskeysLoading(false);
    }
  };

  const handleRegisterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyRegistering(true);
    try {
      const startRes = await api.post('/user/passkey/register/start');
      const options = startRes.data?.publicKey || startRes.data;
      const credential = await startRegistration({ optionsJSON: options });
      const finishRes = await api.post('/user/passkey/register/finish', {
        name: newPasskeyName.trim() || getDevicePasskeyName(),
        credential,
      });
      if (finishRes.data.token) login(finishRes.data.token);
      showToast('Passkey registered successfully!');
      setNewPasskeyName('');
      setShowAddPasskeyModal(false);
      fetchPasskeys();
      refreshUser?.();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        showToast(err.response?.data?.error || err.message || 'Failed to register passkey.', 'error');
      }
    } finally {
      setPasskeyRegistering(false);
    }
  };

  const handleStartRenamePasskey = (pk: any) => {
    setEditingPasskeyId(pk.id);
    setEditingPasskeyName(pk.name);
  };

  const handleSaveRenamePasskey = async (id: number) => {
    const trimmed = editingPasskeyName.trim();
    if (!trimmed) return;
    setPasskeyRenaming(true);
    try {
      await api.patch(`/user/passkeys/${id}`, { name: trimmed });
      showToast('Passkey renamed.');
      setEditingPasskeyId(null);
      fetchPasskeys();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to rename passkey.', 'error');
    } finally {
      setPasskeyRenaming(false);
    }
  };

  const handleDeletePasskey = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this passkey?')) return;
    try {
      const res = await api.delete(`/user/passkeys/${id}`);
      if (res.data.token) login(res.data.token);
      showToast('Passkey removed.');
      fetchPasskeys();
      refreshUser?.();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove passkey.', 'error');
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/user/sessions');
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await api.delete(`/user/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('Session revoked successfully.');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to revoke session.', 'error');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Are you sure you want to sign out of all other devices?')) return;
    setRevokingAllSessions(true);
    try {
      await api.post('/user/sessions/revoke-others');
      setSessions(prev => prev.filter(s => s.is_current));
      showToast('Signed out of all other devices.');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to sign out of other sessions.', 'error');
    } finally {
      setRevokingAllSessions(false);
    }
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

  const handleSaveAccountInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await withSaving('accountInfo', async () => {
      let updatedAny = false;

      if (formData.username && formData.username !== user?.username) {
        try {
          const res = await api.post('/user/change-username', { newUsername: formData.username });
          if (res.data.token) login(res.data.token);
          updatedAny = true;
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Failed to update username.', 'error');
          return;
        }
      }

      if (formData.email && formData.email !== user?.email) {
        try {
          await api.post('/user/change-email', { newEmail: formData.email });
          updatedAny = true;
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Failed to update email.', 'error');
          return;
        }
      }

      if (formData.country && formData.country !== user?.country) {
        try {
          const res = await api.post('/user/change-country', { newCountry: formData.country });
          if (res.data.token) login(res.data.token);
          updatedAny = true;
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Failed to update country.', 'error');
          return;
        }
      }

      if (formData.language && formData.language !== user?.preferred_language) {
        try {
          const res = await api.post('/user/change-language', { newLanguage: formData.language });
          if (res.data.token) login(res.data.token);
          i18n.changeLanguage(formData.language);
          updatedAny = true;
        } catch (err: any) {
          showToast(err.response?.data?.error || 'Failed to update preferred language.', 'error');
          return;
        }
      }

      if (updatedAny) {
        showToast('Account details updated successfully!');
        refreshUser?.();
      } else {
        showToast('No changes to save.');
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
      showToast(err.response?.data?.error || 'Failed to start payout onboarding.', 'error');
      setIsStripeLoading(false);
    }
  };

  const handleGoToStripe = async () => {
    setIsStripeLoading(true);
    try {
      const res = await api.get('/stripe/dashboard');
      if (res.data.url) window.location.href = res.data.url;
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to open payout dashboard.', 'error');
      setIsStripeLoading(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/user/export-data');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `pumpkinmarket-data-export-${user?.username || 'user'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Personal data export downloaded successfully!');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to export your data.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to permanently delete your account? Under GDPR Article 17 (Right to erasure), all your account data, developer profile, uploaded plugins, and reviews will be permanently wiped.')) return;
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
    setVerify2faError('');
    setVerify2faLoading(true);
    try {
      const res = await api.post('/user/2fa/verify', { code: verify2faCode });
      if (res.data.token) login(res.data.token);
      setIs2faEnabled(true);
      setSetup2faData(null);
      setVerify2faCode('');
      setVerify2faError('');
      showToast('2FA enabled successfully!');
      refreshUser?.();
    } catch (err: any) {
      setVerify2faError(err.response?.data?.error || 'Invalid 2FA code');
    } finally {
      setVerify2faLoading(false);
    }
  };

  const disable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/user/2fa/disable', { password: formData.disable2faPassword });
      if (res.data.token) login(res.data.token);
      setIs2faEnabled(false);
      setFormData({ ...formData, disable2faPassword: '' });
      showToast('2FA has been disabled.');
      refreshUser?.();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to disable 2FA.', 'error');
    }
  };

  return (
    <div className="page ac-settings">
      <header className="ac-settings-head">
        <h1 className="display-2">Account <span className="mark">Settings</span></h1>
      </header>

      {toast && (
        <div className="toast ac-toast" data-type={toast.type} role="status">
          <span className="mark-box">
            {toast.type === 'success' ? <Check /> : <AlertCircle />}
          </span>
          {toast.text}
        </div>
      )}

      <div className="tabs ac-tabs" role="tablist" aria-label="Settings">
        {NAV.map(({ key, label, icon: Icon, danger }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            data-danger={danger || undefined}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={false} onClick={handleLogout}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>

      <div className="ac-layout">
        <aside className="ac-aside">
          <div className="ac-user">
            <span className="avatar">
              {user?.username?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <div>
              <strong>{user?.username}</strong>
              <span className="small">{user?.email}</span>
            </div>
          </div>

          <nav className="sidenav ac-sidenav" aria-label="Settings">
            {NAV.map(({ key, label, icon: Icon, danger }) => (
              <a
                key={key}
                href={`?tab=${key}`}
                aria-current={activeTab === key ? 'page' : undefined}
                data-danger={danger || undefined}
                onClick={e => { e.preventDefault(); setActiveTab(key); }}
              >
                <Icon />
                {label}
                {activeTab === key && <ChevronRight size={14} className="count" />}
              </a>
            ))}
          </nav>

          <div className="ac-signout">
            <button type="button" className="button button-ghost" onClick={handleLogout}>
              <LogOut />
              Sign Out
            </button>
          </div>
        </aside>

        <div className="ac-main">

          {activeTab === 'account' && (
            <>
              <SectionHead lead="Account" rest="Details" />

              <SettingsCard title="Account Profile" icon={User}>
                <form className="stack" onSubmit={handleSaveAccountInfo}>
                  <div className="fields ac-fields-2">
                    <Field label="Username">
                      <span className="control">
                        <input
                          id="accountUsername"
                          name="username"
                          className="input"
                          type="text"
                          value={formData.username}
                          onChange={e => setFormData({ ...formData, username: e.target.value })}
                          placeholder="Your username"
                          autoComplete="username"
                          required
                        />
                      </span>
                    </Field>

                    <Field label="Email Address">
                      <span className="control">
                        <input
                          id="accountEmail"
                          name="email"
                          className="input"
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your@email.com"
                          autoComplete="email"
                          required
                        />
                      </span>
                    </Field>

                    <Field label="Country">
                      <Select
                        options={COUNTRY_OPTIONS}
                        value={formData.country}
                        onChange={v => setFormData({ ...formData, country: v })}
                        placeholder="Select a country…"
                      />
                      <input
                        className="ac-required"
                        name="country"
                        value={formData.country}
                        onChange={() => {}}
                        tabIndex={-1}
                        aria-hidden="true"
                        required
                      />
                    </Field>

                    <Field label="Preferred Language">
                      <Select
                        options={LANGUAGE_OPTIONS}
                        value={formData.language ? formData.language.split('-')[0] : 'en'}
                        onChange={v => setFormData({ ...formData, language: v })}
                      />
                    </Field>
                  </div>

                  <div className="row">
                    <SaveBtn isSaving={saving['accountInfo']} label="Save Changes" />
                  </div>
                </form>
              </SettingsCard>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <SectionHead lead="Security" rest="Settings" sub="Protect your account with a strong password and two-factor authentication." />

              <SettingsCard title="Password" description="Use a strong, unique password you don't use elsewhere." icon={Key}>
                <div className="ac-split">
                  <p className="small">
                    Protect your account with a strong password. You can also choose to log out of other active devices when updating your password.
                  </p>
                  <button
                    type="button"
                    className="button button-sm"
                    onClick={() => setShowChangePasswordModal(true)}
                  >
                    <Key /> Change Password
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard
                title="Passkeys & Biometrics"
                icon={Fingerprint}
                description="Sign in securely and instantly with Touch ID, Face ID, Windows Hello, or physical security keys."
              >
                <div className="ac-split">
                  <p className="small">
                    Passkeys provide phishing-resistant security backed by hardware cryptographic keys on your device.
                  </p>
                  <button
                    type="button"
                    className="button button-primary button-sm"
                    onClick={() => {
                      setNewPasskeyName(getDevicePasskeyName());
                      setShowAddPasskeyModal(true);
                    }}
                  >
                    <Plus /> Add Passkey
                  </button>
                </div>

                {showAddPasskeyModal && (
                  <form className="ac-inset" onSubmit={handleRegisterPasskey}>
                    <p className="h3">Register a New Passkey</p>
                    <Field label="Passkey Name (e.g. MacBook Pro Touch ID, Windows Hello)" hint="Give your passkey a descriptive nickname so you recognize the device later.">
                      <span className="control">
                        <input
                          type="text"
                          className="input"
                          placeholder={getDevicePasskeyName()}
                          value={newPasskeyName}
                          onChange={e => setNewPasskeyName(e.target.value)}
                          autoFocus
                        />
                      </span>
                    </Field>
                    <div className="row">
                      <button
                        type="submit"
                        className="button button-primary"
                        disabled={passkeyRegistering}
                        aria-busy={passkeyRegistering}
                      >
                        <Fingerprint /> {passkeyRegistering ? 'Prompting Device...' : 'Continue with Biometrics'}
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => { setShowAddPasskeyModal(false); setNewPasskeyName(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {passkeysLoading ? (
                  <p className="small">Loading registered passkeys...</p>
                ) : passkeys.length === 0 ? (
                  <p className="status">
                    <span className="mark-box mark-box-warning"><AlertCircle /></span>
                    <span>No passkeys registered yet. Add one to enable passwordless biometrics.</span>
                  </p>
                ) : (
                  <div className="ac-list">
                    {passkeys.map(pk => (
                      <div key={pk.id} className="ac-item">
                        <span className="ac-icon ac-icon-success"><Fingerprint /></span>
                        <div className="ac-item-main">
                          {editingPasskeyId === pk.id ? (
                            <div className="ac-rename">
                              <span className="control">
                                <input
                                  type="text"
                                  className="input"
                                  value={editingPasskeyName}
                                  onChange={e => setEditingPasskeyName(e.target.value)}
                                  disabled={passkeyRenaming}
                                  autoFocus
                                  aria-label="Rename Passkey"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveRenamePasskey(pk.id);
                                    if (e.key === 'Escape') setEditingPasskeyId(null);
                                  }}
                                />
                              </span>
                              <button
                                type="button"
                                className="ac-icon-btn"
                                onClick={() => handleSaveRenamePasskey(pk.id)}
                                disabled={passkeyRenaming}
                                title="Save Name"
                                aria-label="Save Name"
                              >
                                <Check />
                              </button>
                              <button
                                type="button"
                                className="ac-icon-btn"
                                onClick={() => setEditingPasskeyId(null)}
                                disabled={passkeyRenaming}
                                title="Cancel"
                                aria-label="Cancel"
                              >
                                <X />
                              </button>
                            </div>
                          ) : (
                            <div className="ac-item-title">
                              {pk.name}
                              <button
                                type="button"
                                className="ac-icon-btn"
                                onClick={() => handleStartRenamePasskey(pk)}
                                title="Rename Passkey"
                                aria-label="Rename Passkey"
                              >
                                <Pencil />
                              </button>
                              {pk.synced !== false ? (
                                <span className="tag tag-info"><Cloud /> Synced</span>
                              ) : (
                                <span className="tag tag-fg"><Key /> Hardware Key</span>
                              )}
                            </div>
                          )}
                          <div className="ac-meta">
                            <span>Added {pk.createdAt ? new Date(pk.createdAt).toLocaleDateString() : 'recently'}</span>
                            {pk.lastUsedAt && <span>Last used {new Date(pk.lastUsedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="button button-ghost button-sm button-icon"
                          onClick={() => handleDeletePasskey(pk.id)}
                          title="Delete Passkey"
                          aria-label="Delete Passkey"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsCard>

              <SettingsCard title="Two-Factor Authentication" icon={Smartphone}
                description="Add an extra layer of security using an authenticator app like Google Authenticator or Authy.">
                {is2faEnabled ? (
                  <>
                    <p className="status">
                      <span className="mark-box mark-box-success"><Check /></span>
                      <span>2FA is currently <strong>enabled</strong> on your account.</span>
                    </p>
                    {user?.role === 'admin' || user?.role === 'moderator' ? (
                      <p className="status">
                        <span className="mark-box mark-box-warning"><Shield /></span>
                        <span>
                          Staff members ({user.role === 'admin' ? 'Administrator' : 'Moderator'}) are required to keep 2FA enabled for platform security.
                        </span>
                      </p>
                    ) : (
                      <form className="stack" onSubmit={disable2fa}>
                        <Field label="Confirm with your password to disable">
                          <PwInput
                            id="disable2faPassword"
                            name="disable2faPassword"
                            placeholder="Your current password"
                            value={formData.disable2faPassword}
                            onChange={v => setFormData({ ...formData, disable2faPassword: v })}
                            show={show2faPw}
                            onToggle={() => setShow2faPw(s => !s)}
                            autoComplete="current-password"
                          />
                        </Field>
                        <div className="row">
                          <button type="submit" className="button button-danger">
                            Disable 2FA
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                ) : !setup2faData ? (
                  <>
                    <p className="status">
                      <span className="mark-box mark-box-warning"><AlertCircle /></span>
                      <span>2FA is <strong>not enabled</strong>. We recommend enabling it for account protection.</span>
                    </p>
                    <div className="row">
                      <button className="button button-primary" onClick={start2faSetup}>
                        Set Up 2FA
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="ac-step"><span className="mark-box ac-num">1</span> Scan this QR code with your authenticator app:</p>
                    <div className="ac-qr">
                      <QRCodeSVG value={setup2faData.uri} size={140} />
                    </div>
                    <div className="field">
                      <span className="field-hint">Or enter this code manually:</span>
                      <div className="ac-secret"><code>{setup2faData.secret}</code></div>
                    </div>
                    <p className="ac-step"><span className="mark-box ac-num">2</span> Enter the 6-digit code from your app:</p>
                    <form className="ac-verify" onSubmit={confirm2faSetup}>
                      <span className="control">
                        <input
                          type="text"
                          id="verify2faCode"
                          name="code"
                          className="input ac-code"
                          placeholder="000 000"
                          maxLength={8}
                          value={verify2faCode}
                          onChange={e => {
                            setVerify2faError('');
                            setVerify2faCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          }}
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                          autoFocus
                          aria-label="Authentication Code"
                          aria-invalid={verify2faError ? true : undefined}
                        />
                      </span>
                      <button
                        type="submit"
                        className={`button ${verify2faError ? 'button-danger' : 'button-primary'}`}
                        disabled={verify2faLoading}
                        aria-busy={verify2faLoading}
                      >
                        {verify2faLoading ? (
                          'Verifying...'
                        ) : verify2faError ? (
                          <>
                            <AlertCircle /> {verify2faError} — Try Again
                          </>
                        ) : (
                          'Verify & Enable'
                        )}
                      </button>
                    </form>
                  </>
                )}
              </SettingsCard>

              <SettingsCard
                title="Emergency Recovery Codes"
                icon={ShieldAlert}
                description="One-time use backup codes to regain access to your account if you lose your phone or security key."
              >
                {recoveryLoading ? (
                  <p className="small">Loading recovery codes status...</p>
                ) : (
                  <div className="ac-split">
                    <p className="small">
                      {recoveryStatus?.hasCodes ? (
                        <span>You have <strong className="pumpkin">{recoveryStatus.remaining}</strong> of <strong>{recoveryStatus.total}</strong> recovery codes remaining.</span>
                      ) : (
                        <span>No active recovery codes. Generate a set of backup codes to prevent getting locked out.</span>
                      )}
                    </p>
                    <button
                      type="button"
                      className="button button-sm"
                      onClick={() => setShowRegenModal(true)}
                    >
                      <RefreshCw /> {recoveryStatus?.hasCodes ? 'Generate New Codes' : 'Generate Codes'}
                    </button>
                  </div>
                )}

                {showRegenModal && (
                  <form className="ac-inset" onSubmit={handleGenerateRecoveryCodes}>
                    <div className="stack ac-tight">
                      <p className="h3">Confirm Password to Generate Recovery Codes</p>
                      <p className="small">
                        Generating new recovery codes will automatically invalidate all previously generated codes.
                      </p>
                    </div>
                    <Field label="Your Current Password">
                      <span className="control">
                        <input
                          type="password"
                          className="input"
                          placeholder="••••••••"
                          value={regenPassword}
                          onChange={e => setRegenPassword(e.target.value)}
                          autoFocus
                          required
                        />
                      </span>
                    </Field>
                    <div className="row">
                      <button
                        type="submit"
                        className="button button-primary"
                        disabled={regenLoading}
                        aria-busy={regenLoading}
                      >
                        {regenLoading ? 'Generating...' : 'Generate 10 Codes'}
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => { setShowRegenModal(false); setRegenPassword(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </SettingsCard>

              <SettingsCard
                title="Active Devices & Sessions"
                icon={Laptop}
                description="Review browsers and devices currently logged into your account. You can revoke unrecognized sessions at any time."
              >
                {sessionsLoading ? (
                  <p className="small">Loading active devices…</p>
                ) : sessions.length === 0 ? (
                  <p className="small">No active sessions found.</p>
                ) : (
                  <>
                    <div className="ac-list">
                      {sessions.map((s: any) => {
                        const isMobile = s.device_type === 'mobile';
                        const isTablet = s.device_type === 'tablet';
                        const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;

                        return (
                          <div key={s.id} className="ac-item" data-current={s.is_current || undefined}>
                            <span className={`ac-icon${s.is_current ? ' ac-icon-pumpkin' : ''}`}><DeviceIcon /></span>
                            <div className="ac-item-main">
                              <div className="ac-item-title">
                                {s.device_name || s.os || 'Web Device'}
                                {s.is_current && <span className="tag tag-solid tag-success">Current Device</span>}
                              </div>
                              <div className="ac-meta">
                                <span>{s.browser || 'Web Browser'}</span>
                                {s.os && s.os !== s.device_name && <span>{s.os}</span>}
                                {s.country && <span>{s.country}</span>}
                                {s.ip_address && <span className="mono">IP: {s.ip_address}</span>}
                                <span>
                                  {s.is_current ? 'Active now' : `Last active ${new Date(s.last_active_at).toLocaleDateString()} ${new Date(s.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </span>
                              </div>
                            </div>

                            {!s.is_current && (
                              <button
                                type="button"
                                className="button button-danger button-sm"
                                onClick={() => handleRevokeSession(s.id)}
                                disabled={revokingSessionId === s.id}
                                aria-busy={revokingSessionId === s.id}
                              >
                                <LogOut />
                                {revokingSessionId === s.id ? 'Revoking…' : 'Revoke'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {sessions.length > 1 && (
                      <div className="row ac-end">
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={handleRevokeOtherSessions}
                          disabled={revokingAllSessions}
                          aria-busy={revokingAllSessions}
                        >
                          <LogOut />
                          {revokingAllSessions ? 'Signing out…' : 'Sign Out of All Other Devices'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </SettingsCard>
            </>
          )}

          {activeTab === 'api_keys' && (
            <>
              <SectionHead
                lead="API Keys"
                rest="& Automation Tokens"
                sub="Personal access tokens allow external tools, CI/CD pipelines, and Minecraft servers to securely call the Pumpkin Market REST API without exposing your account password."
              />

              {createdRawKey && (
                <div className="panel panel-pumpkin">
                  <div className="panel-body stack">
                    <p className="status">
                      <span className="mark-box mark-box-success"><Check /></span>
                      <span>Personal Access Token Created Successfully!</span>
                    </p>
                    <p className="small">
                      <strong>Make sure to copy your token now.</strong> For your security, you will not be able to view this token again after leaving this page.
                    </p>
                    <div className="ac-secret"><code>{createdRawKey}</code></div>
                    <div className="row">
                      <button
                        type="button"
                        className="button button-primary button-sm"
                        onClick={handleCopyRawKey}
                      >
                        {copiedKey ? <Check /> : <Copy />}
                        <span>{copiedKey ? 'Copied!' : 'Copy Token'}</span>
                      </button>
                      <button
                        type="button"
                        className="button button-ghost button-sm"
                        onClick={() => setCreatedRawKey(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <SettingsCard
                title="Generate New API Key"
                icon={Key}
                description="Create a dedicated token for automated plugin downloads, server setup scripts, or backup bots."
              >
                <form className="stack" onSubmit={handleCreateApiKey}>
                  <div className="fields ac-fields-2">
                    <Field label="Key Name / Purpose" hint="e.g., 'SMP Server 1', 'Pterodactyl Daemon', 'CI Automation'">
                      <span className="control">
                        <input
                          type="text"
                          className="input"
                          placeholder="My Production Server"
                          value={newKeyName}
                          onChange={e => setNewKeyName(e.target.value)}
                          maxLength={64}
                          required
                        />
                      </span>
                    </Field>

                    <Field label="Expiration" hint="Tokens will automatically stop working after expiry">
                      <Select
                        options={EXPIRY_OPTIONS}
                        value={String(newKeyExpiresIn)}
                        onChange={v => setNewKeyExpiresIn(Number(v))}
                      />
                    </Field>
                  </div>

                  <div className="stack">
                    <div className="ac-split">
                      <div className="stack ac-tight">
                        <span className="field-label">Permission Scopes</span>
                        <span className="field-hint">
                          Configure permissions granted to this token. External tools will only be able to perform authorized actions.
                        </span>
                      </div>
                      <div className="row">
                        <button type="button" onClick={selectAllScopes} className="button button-flat button-sm">
                          Select All
                        </button>
                        <button type="button" onClick={deselectAllScopes} className="button button-flat button-sm">
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="ac-scopes">
                      {SCOPE_CATEGORIES.map(cat => {
                        const catScopeKeys = cat.scopes.map(s => s.key);
                        const selectedCount = catScopeKeys.filter(k => selectedScopes.includes(k)).length;
                        const allSelected = selectedCount === catScopeKeys.length;
                        const someSelected = selectedCount > 0 && !allSelected;

                        return (
                          <div key={cat.id} className="ac-scope" data-on={selectedCount > 0 || undefined}>
                            <div className="ac-scope-head" onClick={() => toggleCategory(cat)}>
                              <input
                                type="checkbox"
                                className="check"
                                checked={allSelected}
                                ref={el => {
                                  if (el) el.indeterminate = someSelected;
                                }}
                                onChange={() => toggleCategory(cat)}
                                onClick={e => e.stopPropagation()}
                                aria-label={cat.name}
                              />
                              <div>
                                <strong>{cat.name}</strong>
                                <span className="small">{cat.description}</span>
                              </div>
                              <span className={`tag${selectedCount > 0 ? ' tag-pumpkin' : ''}`}>
                                {selectedCount} / {catScopeKeys.length} selected
                              </span>
                            </div>

                            <div className="ac-scope-body">
                              {cat.scopes.map(scope => {
                                const isChecked = selectedScopes.includes(scope.key);
                                return (
                                  <label key={scope.key} className="choice">
                                    <input
                                      type="checkbox"
                                      className="check"
                                      checked={isChecked}
                                      onChange={() => toggleScope(scope.key)}
                                    />
                                    <span>
                                      <span className="ac-scope-name">
                                        <code className={`tag ac-mono-tag${isChecked ? ' tag-info' : ''}`}>{scope.key}</code>
                                        {scope.name}
                                        {scope.devOnly && <span className="tag tag-pumpkin">Developer</span>}
                                      </span>
                                      <span className="small">{scope.description}</span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="row">
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={creatingKey || !newKeyName.trim() || selectedScopes.length === 0}
                      aria-busy={creatingKey}
                    >
                      <Plus />
                      {creatingKey ? 'Generating…' : 'Generate Token'}
                    </button>
                  </div>
                </form>
              </SettingsCard>

              <SettingsCard
                title="Active Tokens"
                icon={Key}
                description="Tokens currently authorized to authenticate as your account."
              >
                {apiKeysLoading ? (
                  <p className="small">Loading your API keys…</p>
                ) : apiKeys.length === 0 ? (
                  <div className="blank">
                    <span className="ac-icon"><Key /></span>
                    <p className="h3">No API keys generated yet.</p>
                    <p className="small">
                      Generate your first token above to start automating plugin downloads with curl or scripts.
                    </p>
                  </div>
                ) : (
                  <div className="ac-list">
                    {apiKeys.map(k => (
                      <div key={k.id} className="ac-item">
                        <div className="ac-item-main">
                          <div className="ac-item-title">
                            {k.name}
                            <code className="tag tag-info ac-mono-tag">{k.keyPrefix}</code>
                          </div>
                          <div className="ac-meta">
                            <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                            <span>Expires: {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}</span>
                            <span>Last used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                          </div>
                          {k.scopes && k.scopes.length > 0 && (
                            <div className="row ac-tags">
                              {k.scopes.map(s => (
                                <code key={s} className="tag ac-mono-tag">{s}</code>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="button button-danger button-sm"
                          onClick={() => handleRevokeApiKey(k.id)}
                          disabled={revokingKeyId === k.id}
                          aria-busy={revokingKeyId === k.id}
                        >
                          <Trash2 />
                          {revokingKeyId === k.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsCard>

              <SettingsCard
                title="How to Use Your Token"
                icon={Terminal}
                description="Using your token with cURL or automation scripts."
              >
                <p className="small">
                  Pass your token in the <code className="mono pumpkin">Authorization: Bearer</code> header to authenticate directly with the REST API:
                </p>
                <div className="cmd">
                  <code>
                    curl -H "Authorization: Bearer pmk_your_token_here" \<br />
                    &nbsp;&nbsp;https://market.pumpkinmc.org/api/v1/rest/plugins/1/download -o my_plugin.wasm
                  </code>
                </div>
              </SettingsCard>
            </>
          )}

          {activeTab === 'developer' && (
            <>
              <SectionHead lead="Developer" rest="Account & Payouts" sub="Manage your creator identity, support information, and payout settings." />

              {!user?.is_developer ? (
                <SettingsCard title="Become a Developer" icon={Sparkles}
                  description="Unlock developer features to publish free or paid plugins to PumpkinMarket.">
                  <div className="blank">
                    <span className="ac-badge"><Code /></span>
                    <p className="h3">You haven't set up a Developer Profile yet.</p>
                    <p className="small">
                      Individual creators and organizations can publish plugins for $0. Start your onboarding now!
                    </p>
                    <button
                      className="button button-primary"
                      onClick={() => setIsDevModalOpen(true)}
                    >
                      <Sparkles /> Complete Developer Onboarding
                    </button>
                  </div>
                </SettingsCard>
              ) : (
                <>
                  {devProfile && (
                    <SettingsCard title="Developer Identity" icon={Building2}
                      description="Your public developer information shown on plugin pages.">
                      <form className="fields ac-fields-2" onSubmit={handleUpdateDevProfile}>
                        <Field label="Entity Type">
                          <span className="control">
                            <input
                              className="input"
                              type="text"
                              value={devProfile.entity_type === 'organization' ? 'Organization / Studio' : 'Individual Developer'}
                              disabled
                            />
                          </span>
                        </Field>

                        <Field label="Public Display Name" hint="Shown on your public developer profile and plugin listings.">
                          <span className={`control${devNameAvailable && !devNameChecking && !devNameError ? ' ac-valid' : ''}`}>
                            <input
                              id="devDisplayName"
                              name="displayName"
                              className="input"
                              type="text"
                              value={devProfileForm.displayName}
                              onChange={e => setDevProfileForm({ ...devProfileForm, displayName: e.target.value })}
                              autoComplete="nickname"
                              required
                              aria-invalid={devNameError ? true : undefined}
                            />
                            {devNameChecking && <span className="loading" />}
                          </span>
                          {devNameChecking && (
                            <span className="field-hint">Checking availability…</span>
                          )}
                          {devNameError && (
                            <span className="field-error"><AlertCircle size={14} />{devNameError}</span>
                          )}
                          {devNameAvailable && !devNameChecking && !devNameError && (
                            <span className="field-hint ac-hint-ok">Developer name is available</span>
                          )}
                        </Field>

                        <Field label="Legal Full Name / Business Name" hint="Used for internal verification & tax compliance">
                          <span className="control">
                            <input
                              id="devLegalName"
                              name="legalName"
                              className="input"
                              type="text"
                              value={devProfileForm.legalName}
                              onChange={e => setDevProfileForm({ ...devProfileForm, legalName: e.target.value })}
                              autoComplete="name"
                            />
                          </span>
                        </Field>

                        <Field label="Street Address">
                          <span className="control">
                            <input
                              id="devStreetAddress"
                              name="streetAddress"
                              className="input"
                              type="text"
                              value={devProfileForm.streetAddress}
                              onChange={e => setDevProfileForm({ ...devProfileForm, streetAddress: e.target.value })}
                              placeholder="123 Main St"
                              autoComplete="street-address"
                            />
                          </span>
                        </Field>

                        <Field label="City">
                          <span className="control">
                            <input
                              id="devCity"
                              name="city"
                              className="input"
                              type="text"
                              value={devProfileForm.city}
                              onChange={e => setDevProfileForm({ ...devProfileForm, city: e.target.value })}
                              autoComplete="address-level2"
                            />
                          </span>
                        </Field>

                        <Field label="Postal / ZIP Code">
                          <span className="control">
                            <input
                              id="devPostalCode"
                              name="postalCode"
                              className="input"
                              type="text"
                              value={devProfileForm.postalCode}
                              onChange={e => setDevProfileForm({ ...devProfileForm, postalCode: e.target.value })}
                              autoComplete="postal-code"
                            />
                          </span>
                        </Field>

                        <Field label="VAT / Tax ID" hint="Optional for businesses">
                          <span className="control">
                            <input
                              id="devVatId"
                              name="vatId"
                              className="input"
                              type="text"
                              value={devProfileForm.vatId}
                              onChange={e => setDevProfileForm({ ...devProfileForm, vatId: e.target.value })}
                              placeholder="EU123456789"
                              autoComplete="off"
                            />
                          </span>
                        </Field>

                        <Field label="Support Email" hint="Public email for plugin buyers to contact you">
                          <span className="control">
                            <input
                              id="devSupportEmail"
                              name="supportEmail"
                              className="input"
                              type="email"
                              value={devProfileForm.supportEmail}
                              onChange={e => setDevProfileForm({ ...devProfileForm, supportEmail: e.target.value })}
                              placeholder="support@domain.com"
                              autoComplete="email"
                            />
                          </span>
                        </Field>

                        <Field label="Website URL">
                          <span className="control">
                            <input
                              id="devWebsiteUrl"
                              name="websiteUrl"
                              className="input"
                              type="url"
                              value={devProfileForm.websiteUrl}
                              onChange={e => setDevProfileForm({ ...devProfileForm, websiteUrl: e.target.value })}
                              placeholder="https://website.com"
                              autoComplete="url"
                            />
                          </span>
                        </Field>

                        <Field label="GitHub Profile">
                          <span className="control">
                            <input
                              id="devGithubUrl"
                              name="githubUrl"
                              className="input"
                              type="text"
                              value={devProfileForm.githubUrl}
                              onChange={e => setDevProfileForm({ ...devProfileForm, githubUrl: e.target.value })}
                              placeholder="https://github.com/username"
                              autoComplete="url"
                            />
                          </span>
                        </Field>

                        <div className="row ac-span">
                          <SaveBtn isSaving={saving['devProfile']} disabled={Boolean(devNameError) || devNameChecking} label="Save Developer Info" />
                        </div>
                      </form>
                    </SettingsCard>
                  )}

                  <SettingsCard title="Developer Payouts (Paid Plugins)" icon={CreditCard}
                    description="Connect your payout account to receive earnings from paid plugin sales. Optional for free plugins.">
                    {user?.stripe_ready ? (
                      <>
                        <div className="status ac-status-block">
                          <span className="mark-box mark-box-success"><Check /></span>
                          <div>
                            <strong>Payout account connected</strong>
                            <p className="small">Your payouts are active and ready to receive funds from paid plugin sales.</p>
                          </div>
                        </div>
                        <div className="row">
                          <button className="button" onClick={handleGoToStripe} disabled={isStripeLoading} aria-busy={isStripeLoading}>
                            {isStripeLoading ? 'Opening…' : 'Go to Payout Dashboard →'}
                          </button>
                        </div>
                      </>
                    ) : user?.stripe_account_id ? (
                      <>
                        <div className="status ac-status-block">
                          <span className="mark-box mark-box-warning"><AlertCircle /></span>
                          <div>
                            <strong>Payout onboarding incomplete</strong>
                            <p className="small">Your account was created but hasn't been fully activated yet.</p>
                          </div>
                        </div>
                        <div className="row">
                          <button className="button button-primary" onClick={handleConnectStripe} disabled={isStripeLoading} aria-busy={isStripeLoading}>
                            {isStripeLoading ? 'Redirecting…' : 'Continue Payout Setup →'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="status">
                          <span className="dot" />
                          <span className="muted">No payout account linked yet. Free plugin uploads are fully enabled.</span>
                        </p>
                        <div className="row">
                          <button className="button button-primary" onClick={handleConnectStripe} disabled={isStripeLoading} aria-busy={isStripeLoading}>
                            <CreditCard />
                            {isStripeLoading ? 'Connecting…' : 'Connect Payout Account for Paid Sales'}
                          </button>
                        </div>
                      </>
                    )}
                  </SettingsCard>

                  <SettingsCard title="Payout FAQ" icon={Lock}>
                    <div className="ac-faq">
                      {[
                        { q: 'Can I upload free plugins without a payout account?', a: 'Yes! A payout account is only required if you want to sell paid plugins.' },
                        { q: 'When do I get paid for sales?', a: 'Earnings are transferred automatically within 2–7 business days according to your payout schedule.' },
                        { q: 'What platform fee applies?', a: 'PumpkinMarket takes a platform commission per sale. Standard payment processing fees apply.' },
                      ].map(({ q, a }) => (
                        <div key={q}>
                          <p className="h3">{q}</p>
                          <p className="small">{a}</p>
                        </div>
                      ))}
                    </div>
                  </SettingsCard>
                </>
              )}
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <SectionHead lead="Notification" rest="Preferences" sub="Choose which emails and alerts you want to receive." />

              <SettingsCard title="Email Notifications" icon={Mail}
                description="Control which transactional emails we send to your registered address.">
                <div className="ac-toggles">
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
                <div className="row">
                  <button
                    className="button button-primary"
                    onClick={() => showToast('Notification preferences saved!')}
                  >
                    Save Preferences
                  </button>
                </div>
              </SettingsCard>
            </>
          )}

          {activeTab === 'library' && (
            <>
              <SectionHead lead="My" rest="Library" sub="Your purchased plugins, available to download at any time.">
                {library.length > 0 && (
                  <span className="label mono ac-count">
                    {library.length} plugin{library.length !== 1 ? 's' : ''}
                  </span>
                )}
              </SectionHead>

              {libraryLoading && (
                <div className="catalogue">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton ac-skeleton" />
                  ))}
                </div>
              )}

              {libraryError && (
                <div className="notice notice-warning ac-alert" role="alert">
                  <span className="mark-box mark-box-warning"><AlertTriangle /></span>
                  <p className="notice-text">{libraryError}</p>
                </div>
              )}

              {!libraryLoading && !libraryError && library.length === 0 && (
                <div className="blank">
                  <span className="ac-icon"><Package /></span>
                  <p className="h2">Your library is <span className="mark">empty</span></p>
                  <p className="small">Purchased plugins will appear here, ready to download anytime.</p>
                  <Link to="/" className="button button-primary">
                    Browse Plugins
                  </Link>
                </div>
              )}

              {!libraryLoading && !libraryError && library.length > 0 && (
                <div className="catalogue ac-library">
                  {library.map(entry => (
                    <Link
                      key={entry.plugin_id}
                      to={getPluginUrl({ id: entry.plugin_id, public_id: entry.public_id, name: entry.name })}
                      className="entry"
                    >
                      <div className="entry-cover">
                        {entry.preview_path ? (
                          <img src={entry.preview_path} alt={entry.name} />
                        ) : (
                          <div className="placeholder">
                            <span className="avatar">{entry.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="entry-flags">
                          <span className={`sticker sticker-sm ${entry.is_preorder ? '' : 'sticker-success'}`}>
                            {entry.is_preorder ? 'Pre-Ordered' : 'Owned'}
                          </span>
                        </div>
                      </div>
                      <div className="entry-body">
                        {entry.category && (
                          <div className="entry-meta">
                            <span className="label">{entry.category}</span>
                          </div>
                        )}
                        <h3 className="entry-name">{entry.name}</h3>
                        <p className="entry-by">by <strong>{entry.dev_name}</strong></p>
                        <div className="entry-foot">
                          <span className="cost">€{(entry.amount_cents / 100).toFixed(2)}</span>
                          <span className="small">
                            {new Date(entry.purchased_at).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <SectionHead
                lead="Privacy"
                rest="& Data"
                sub="Manage your personal data, download an export of your account, and configure cookie settings."
              />

              <SettingsCard
                title="Export Account Data"
                icon={Download}
                description="Download a copy of your account data including your purchases, licenses, reviews, and developer details in JSON format."
              >
                <p className="small">
                  Generate a structured machine-readable export of all data associated with your PumpkinMarket account.
                </p>
                <div className="row">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="button button-primary"
                    disabled={isExporting}
                    aria-busy={isExporting}
                  >
                    <Download />
                    {isExporting ? 'Generating Export…' : 'Download Data Export (.json)'}
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard
                title="Cookie Preferences"
                icon={Sliders}
                description="Choose what cookies and tracking technologies are enabled while you browse PumpkinMarket."
              >
                <p className="small">
                  You can update your preferences or turn off analytics cookies at any time without affecting your marketplace experience.
                </p>
                <div className="row">
                  <button
                    type="button"
                    onClick={openCookiePreferencesModal}
                    className="button"
                  >
                    <Sliders />
                    Manage Cookie Preferences
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard
                title="Data & Privacy Controls"
                icon={ShieldCheck}
                description="How you can access, update, or remove your data on PumpkinMarket."
              >
                <div className="ac-faq">
                  <div>
                    <p className="h3">Access & Portability</p>
                    <p className="small">You can request and download a full copy of your account records at any time using the export tool above.</p>
                  </div>
                  <div>
                    <p className="h3">Updating Your Information</p>
                    <p className="small">Keep your email, username, country, and developer profile up to date anytime directly from your settings tabs.</p>
                  </div>
                  <div>
                    <p className="h3">Deleting Your Account</p>
                    <p className="small">Permanently delete your account and all associated data anytime in the Danger Zone tab.</p>
                  </div>
                  <div>
                    <p className="h3">Contact & Support</p>
                    <p className="small">
                      Have questions about your data or privacy? Contact our team anytime at <a href="mailto:privacy@pumpkinmc.org" className="link link-pumpkin">privacy@pumpkinmc.org</a>.
                    </p>
                  </div>
                </div>
              </SettingsCard>
            </>
          )}

          {activeTab === 'danger' && (
            <>
              <header className="ac-section-head">
                <h2 className="h1"><span className="mark ac-mark-danger">Danger</span> Zone</h2>
                <p className="small">These actions are permanent and cannot be undone.</p>
              </header>

              <div className="notice notice-danger ac-danger">
                <span className="sticker sticker-danger"><Trash2 size={13} /> Delete Account</span>
                <p className="notice-text">
                  <strong>Permanently deletes your account, all uploaded plugins, and any remaining balance. This cannot be reversed.</strong>
                  {' '}Deleting your account will immediately remove all your plugins from the marketplace
                  and forfeit any pending payouts.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="button button-danger"
                >
                  <Trash2 />
                  Delete My Account Permanently
                </button>
              </div>
            </>
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

      <RecoveryCodesModal
        isOpen={showCodesModal}
        codes={generatedCodes}
        onClose={() => setShowCodesModal(false)}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {
          showToast('Password changed successfully.', 'success');
          fetchSessions();
        }}
      />
    </div>
  );
};

export default SettingsPage;
