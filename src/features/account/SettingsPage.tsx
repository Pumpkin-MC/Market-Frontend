import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../lib/api';
import { translateApiMessage } from '../../lib/apiMessages';
import { getLanguageCode, normalizeLocale, sameBaseLanguage } from '../../lib/locale';
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

const NAV: { key: Tab; label: ParseKeys; icon: React.FC<{ size?: number }> ; danger?: boolean }[] = [
  { key: 'account',       label: 'profile.nav.account',             icon: User        },
  { key: 'security',      label: 'profile.nav.security',            icon: Shield      },
  { key: 'api_keys',      label: 'profile.nav.api_keys',            icon: Key         },
  { key: 'developer',     label: 'profile.nav.developer',   icon: Code        },
  { key: 'notifications', label: 'profile.nav.notifications',       icon: Bell        },
  { key: 'library',       label: 'profile.nav.library',             icon: BookOpen    },
  { key: 'privacy',       label: 'profile.nav.privacy',      icon: ShieldCheck },
  { key: 'danger',        label: 'profile.nav.danger',         icon: AlertTriangle, danger: true },
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
  savingLabel?: string;
}

const SaveBtn: React.FC<SaveBtnProps> = ({ isSaving = false, disabled = false, label, savingLabel }) => {
  const { t } = useTranslation();
  return (
    <button type="submit" className="button button-primary" disabled={isSaving || disabled} aria-busy={isSaving}>
      {isSaving ? (savingLabel ?? t('common.saving_changes')) : (label ?? t('common.save_changes'))}
    </button>
  );
};

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

const PwInput: React.FC<PwInputProps> = ({ placeholder, value, onChange, show, onToggle, autoComplete, id, name }) => {
  const { t } = useTranslation();
  return (
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
    <button type="button" className="ac-eye" onClick={onToggle} tabIndex={-1} aria-label={show ? t('common.hide_password') : t('common.show_password')}>
      {show ? <EyeOff /> : <Eye />}
    </button>
  </span>
  );
};

const COUNTRY_OPTIONS = [
  ...Object.entries(getCodeList())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([code, name]) => ({ value: code, label: name })),
];

const LANGUAGE_OPTIONS = [
  { value: 'en_us', label: 'profile.languages.en' },
  { value: 'de_de', label: 'profile.languages.de' },
  { value: 'fr_fr', label: 'profile.languages.fr' },
  { value: 'es_es', label: 'profile.languages.es' },
  { value: 'it_it', label: 'profile.languages.it' },
  { value: 'nl_nl', label: 'profile.languages.nl' },
  { value: 'pt_br', label: 'profile.languages.pt' },
  { value: 'pl_pl', label: 'profile.languages.pl' },
  { value: 'ru_ru', label: 'profile.languages.ru' },
  { value: 'tr_tr', label: 'profile.languages.tr' },
  { value: 'ja_jp', label: 'profile.languages.ja' },
  { value: 'ko_kr', label: 'profile.languages.ko' },
  { value: 'zh_cn', label: 'profile.languages.zh' },
  { value: 'zh_hk', label: 'profile.languages.zh_hk' },
  { value: 'zh_tw', label: 'profile.languages.zh_tw' },
 ] as const;

const EXPIRY_OPTIONS = [
  { value: '30', label: 'profile.expiry.days_30' },
  { value: '90', label: 'profile.expiry.days_90' },
  { value: '180', label: 'profile.expiry.days_180' },
  { value: '365', label: 'profile.expiry.days_365' },
  { value: '0', label: 'profile.expiry.days_0' },
 ] as const;

const SectionHead: React.FC<{ title: React.ReactNode; sub?: string; children?: React.ReactNode }> = ({ title, sub, children }) => (
  <header className="ac-section-head">
    <h2 className="h1">{title}{children}</h2>
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
        // The server stores only the base code (e.g. "zh"), so prefer the
        // locally-active locale to preserve regional Chinese variants
        // (zh_hk / zh_tw) instead of collapsing them to zh_cn.
        language: sameBaseLanguage(i18n.language, user.preferred_language)
          ? normalizeLocale(i18n.language)
          : normalizeLocale(user.preferred_language),
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
      setDevNameError(t('profile.developer.name_too_short'));
      setDevNameChecking(false);
      setDevNameAvailable(false);
      return;
    }

    if (trimmed.length > 50) {
      setDevNameError(t('profile.developer.name_too_long'));
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
          setDevNameError(t('developer.onboarding.name_taken_error'));
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
      showToast(devNameError || t('profile.developer.checking_name'), 'error');
      return;
    }
    await withSaving('devProfile', async () => {
      try {
        const res = await api.put('/user/developer/profile', devProfileForm);
        setDevProfile(res.data.profile);
        showToast(t('profile.developer.updated'));
      } catch (err: any) {
        showToast(translateApiMessage(t, err.response?.data?.error || t('profile.developer.update_failed')), 'error');
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
      name: t('search.plugins_title'),
      description: t('profile.scopes.plugins_description'),
      scopes: [
        {
          key: API_KEY_SCOPES.PLUGINS_READ,
          name: t('profile.scopes.plugins_read'),
          description: t('profile.scopes.plugins_read_description'),
        },
        {
          key: API_KEY_SCOPES.PLUGINS_DOWNLOAD,
          name: t('profile.scopes.plugins_download'),
          description: t('profile.scopes.plugins_download_description'),
        },
        {
          key: API_KEY_SCOPES.PLUGINS_CREATE,
          name: t('profile.scopes.plugins_create'),
          description: t('profile.scopes.plugins_create_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_UPDATE,
          name: t('profile.scopes.plugins_update'),
          description: t('profile.scopes.plugins_update_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_VERSIONS_UPLOAD,
          name: t('profile.scopes.plugins_versions'),
          description: t('profile.scopes.plugins_versions_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_MEDIA_UPLOAD,
          name: t('profile.scopes.plugins_media'),
          description: t('profile.scopes.plugins_media_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_PUBLISH,
          name: t('profile.scopes.plugins_publish'),
          description: t('profile.scopes.plugins_publish_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.PLUGINS_DELETE,
          name: t('profile.scopes.plugins_delete'),
          description: t('profile.scopes.plugins_delete_description'),
          devOnly: true,
        },
      ],
    },
    {
      id: 'licenses',
      name: t('developer.dashboard.licenses'),
      description: t('profile.scopes.licenses_description'),
      scopes: [
        {
          key: API_KEY_SCOPES.LICENSES_READ,
          name: t('profile.scopes.licenses_read'),
          description: t('profile.scopes.licenses_read_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.LICENSES_CREATE,
          name: t('profile.scopes.licenses_create'),
          description: t('profile.scopes.licenses_create_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.LICENSES_REVOKE,
          name: t('profile.scopes.licenses_revoke'),
          description: t('profile.scopes.licenses_revoke_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.LICENSES_DELETE,
          name: t('profile.scopes.licenses_delete'),
          description: t('profile.scopes.licenses_delete_description'),
          devOnly: true,
        },
      ],
    },
    {
      id: 'coupons',
      name: t('developer.dashboard.coupons'),
      description: t('profile.scopes.coupons_description'),
      scopes: [
        {
          key: API_KEY_SCOPES.COUPONS_READ,
          name: t('profile.scopes.coupons_read'),
          description: t('profile.scopes.coupons_read_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.COUPONS_WRITE,
          name: t('profile.scopes.coupons_write'),
          description: t('profile.scopes.coupons_write_description'),
          devOnly: true,
        },
      ],
    },
    {
      id: 'reviews',
      name: t('developer.dashboard.reviews'),
      description: t('profile.scopes.reviews_description'),
      scopes: [
        {
          key: API_KEY_SCOPES.REVIEWS_READ,
          name: t('profile.scopes.reviews_read'),
          description: t('profile.scopes.reviews_read_description'),
        },
        {
          key: API_KEY_SCOPES.REVIEWS_REPLY,
          name: t('profile.scopes.reviews_reply'),
          description: t('profile.scopes.reviews_reply_description'),
          devOnly: true,
        },
      ],
    },
    {
      id: 'analytics',
      name: t('profile.scopes.analytics_title'),
      description: t('profile.scopes.analytics_description'),
      scopes: [
        {
          key: API_KEY_SCOPES.ANALYTICS_READ,
          name: t('profile.scopes.analytics_read'),
          description: t('profile.scopes.analytics_read_description'),
          devOnly: true,
        },
        {
          key: API_KEY_SCOPES.TELEMETRY_READ,
          name: t('profile.scopes.telemetry_read'),
          description: t('profile.scopes.telemetry_read_description'),
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
      showToast(t('profile.api_keys.select_scope_error'), 'error');
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
      showToast(t('profile.api_keys.created'));
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.api_keys.create_failed')), 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: number) => {
    if (!window.confirm(t('profile.api_keys.revoke_confirm'))) return;
    setRevokingKeyId(id);
    try {
      await api.delete(`/user/api-keys/${id}`);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      showToast(t('profile.api_keys.revoked'));
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.api_keys.revoke_failed')), 'error');
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
      showToast(t('profile.recovery.generated'));
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.recovery.generate_failed')), 'error');
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
      showToast(t('profile.passkeys.registered'));
      setNewPasskeyName('');
      setShowAddPasskeyModal(false);
      fetchPasskeys();
      refreshUser?.();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        showToast(translateApiMessage(t, err.response?.data?.error || err.message || t('profile.passkeys.register_failed')), 'error');
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
      showToast(t('profile.passkeys.renamed'));
      setEditingPasskeyId(null);
      fetchPasskeys();
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.passkeys.rename_failed')), 'error');
    } finally {
      setPasskeyRenaming(false);
    }
  };

  const handleDeletePasskey = async (id: number) => {
    if (!window.confirm(t('profile.passkeys.delete_confirm'))) return;
    try {
      const res = await api.delete(`/user/passkeys/${id}`);
      if (res.data.token) login(res.data.token);
      showToast(t('profile.passkeys.removed'));
      fetchPasskeys();
      refreshUser?.();
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.passkeys.delete_failed')), 'error');
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
      showToast(t('profile.sessions.revoked'));
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.sessions.revoke_failed')), 'error');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm(t('profile.sessions.revoke_others_confirm'))) return;
    setRevokingAllSessions(true);
    try {
      await api.post('/user/sessions/revoke-others');
      setSessions(prev => prev.filter(s => s.is_current));
      showToast(t('profile.sessions.others_revoked'));
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.sessions.revoke_others_failed')), 'error');
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
      .catch(() => setLibraryError(t('profile.library.load_failed')))
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
          showToast(translateApiMessage(t, err.response?.data?.error || t('profile.account.username_failed')), 'error');
          return;
        }
      }

      if (formData.email && formData.email !== user?.email) {
        try {
          await api.post('/user/change-email', { newEmail: formData.email });
          updatedAny = true;
        } catch (err: any) {
          showToast(translateApiMessage(t, err.response?.data?.error || t('profile.account.email_failed')), 'error');
          return;
        }
      }

      if (formData.country && formData.country !== user?.country) {
        try {
          const res = await api.post('/user/change-country', { newCountry: formData.country });
          if (res.data.token) login(res.data.token);
          updatedAny = true;
        } catch (err: any) {
          showToast(translateApiMessage(t, err.response?.data?.error || t('profile.account.country_failed')), 'error');
          return;
        }
      }

      if (formData.language && !sameBaseLanguage(formData.language, user?.preferred_language)) {
        try {
          // Apply the new language locally first so login() below (which
          // reads the server's base code) cannot reset a regional variant.
          i18n.changeLanguage(formData.language);
          const res = await api.post('/user/change-language', { newLanguage: getLanguageCode(formData.language) });
          if (res.data.token) login(res.data.token);
          updatedAny = true;
        } catch (err: any) {
          showToast(translateApiMessage(t, err.response?.data?.error || t('profile.account.language_failed')), 'error');
          return;
        }
      } else if (formData.language && formData.language !== normalizeLocale(i18n.language)) {
        // Same base language but a different regional variant (e.g. zh_cn ->
        // zh_hk): the server only stores the base code, so just apply it
        // locally without an API round-trip.
        i18n.changeLanguage(formData.language);
        updatedAny = true;
      }

      if (updatedAny) {
        showToast(t('profile.account.updated'));
        refreshUser?.();
      } else {
        showToast(t('profile.account.no_changes'));
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
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.developer.onboarding_failed')), 'error');
      setIsStripeLoading(false);
    }
  };

  const handleGoToStripe = async () => {
    setIsStripeLoading(true);
    try {
      const res = await api.get('/stripe/dashboard');
      if (res.data.url) window.location.href = res.data.url;
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.developer.dashboard_failed')), 'error');
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
      showToast(t('profile.privacy.exported'));
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.privacy.export_failed')), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('profile.danger.delete_confirm'))) return;
    try {
      await api.delete('/user');
      logout();
      navigate('/login');
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.danger.delete_failed')), 'error');
    }
  };

  const start2faSetup = async () => {
    try {
      const res = await api.post('/user/2fa/setup');
      setSetup2faData(res.data);
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.security.setup_failed')), 'error');
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
      showToast(t('profile.security.enabled_success'));
      refreshUser?.();
    } catch (err: any) {
      setVerify2faError(translateApiMessage(t, err.response?.data?.error || t('auth.invalid_2fa_code')));
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
      showToast(t('profile.security.disabled_success'));
      refreshUser?.();
    } catch (err: any) {
      showToast(translateApiMessage(t, err.response?.data?.error || t('profile.security.disable_failed')), 'error');
    }
  };

  return (
    <div className="page ac-settings">
      <header className="ac-settings-head">
        <h1 className="display-2"><Trans t={t} i18nKey="profile.page_title" components={{ mark: <span className="mark" /> }} /></h1>
      </header>

      {toast && (
        <div className="toast ac-toast" data-type={toast.type} role="status">
          <span className="mark-box">
            {toast.type === 'success' ? <Check /> : <AlertCircle />}
          </span>
          {toast.text}
        </div>
      )}

      <div className="tabs ac-tabs" role="tablist" aria-label={t('nav.settings')}>
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
          {t('profile.sign_out')}
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

          <nav className="sidenav ac-sidenav" aria-label={t('nav.settings')}>
            {NAV.map(({ key, label, icon: Icon, danger }) => (
              <a
                key={key}
                href={`?tab=${key}`}
                aria-current={activeTab === key ? 'page' : undefined}
                data-danger={danger || undefined}
                onClick={e => { e.preventDefault(); setActiveTab(key); }}
              >
                <Icon />
                {t(label)}
                {activeTab === key && <ChevronRight size={14} className="count" />}
              </a>
            ))}
          </nav>

          <div className="ac-signout">
            <button type="button" className="button button-ghost" onClick={handleLogout}>
              <LogOut />
              {t('profile.sign_out')}
            </button>
          </div>
        </aside>

        <div className="ac-main">

          {activeTab === 'account' && (
            <>
              <SectionHead title={<Trans t={t} i18nKey="profile.account.heading" components={{ mark: <span className="mark" /> }} />} />

              <SettingsCard title={t('profile.account.profile_title')} icon={User}>
                <form className="stack" onSubmit={handleSaveAccountInfo}>
                  <div className="fields ac-fields-2">
                    <Field label={t('auth.username')}>
                      <span className="control">
                        <input
                          id="accountUsername"
                          name="username"
                          className="input"
                          type="text"
                          value={formData.username}
                          onChange={e => setFormData({ ...formData, username: e.target.value })}
                          placeholder={t('profile.account.username_placeholder')}
                          autoComplete="username"
                          required
                        />
                      </span>
                    </Field>

                    <Field label={t('auth.email')}>
                      <span className="control">
                        <input
                          id="accountEmail"
                          name="email"
                          className="input"
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder={t('profile.account.email_placeholder')}
                          autoComplete="email"
                          required
                        />
                      </span>
                    </Field>

                    <Field label={t('profile.account.country')}>
                      <Select
                        options={[{ value: '', label: t('profile.account.country_placeholder') }, ...COUNTRY_OPTIONS]}
                        value={formData.country}
                        onChange={v => setFormData({ ...formData, country: v })}
                        placeholder={t('profile.account.country_placeholder')}
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

                    <Field label={t('profile.account.language')}>
                      <Select
                        options={LANGUAGE_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
                        value={normalizeLocale(formData.language)}
                        onChange={v => setFormData({ ...formData, language: v })}
                      />
                    </Field>
                  </div>

                  <div className="row">
                    <SaveBtn isSaving={saving['accountInfo']} label={t('common.save_changes')} />
                  </div>
                </form>
              </SettingsCard>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <SectionHead title={<Trans t={t} i18nKey="profile.security.heading" components={{ mark: <span className="mark" /> }} />} sub={t('profile.security.subtitle')} />

              <SettingsCard title={t('auth.password')} description={t('profile.security.password_description')} icon={Key}>
                <div className="ac-split">
                  <p className="small">
                    {t('profile.security.password_instructions')}
                  </p>
                  <button
                    type="button"
                    className="button button-sm"
                    onClick={() => setShowChangePasswordModal(true)}
                  >
                    <Key /> {t('profile.security.change_password')}
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard
                title={t('profile.passkeys.title')}
                icon={Fingerprint}
                description={t('profile.passkeys.description')}
              >
                <div className="ac-split">
                  <p className="small">
                    {t('profile.passkeys.instructions')}
                  </p>
                  <button
                    type="button"
                    className="button button-primary button-sm"
                    onClick={() => {
                      setNewPasskeyName(getDevicePasskeyName());
                      setShowAddPasskeyModal(true);
                    }}
                  >
                    <Plus /> {t('profile.passkeys.add')}
                  </button>
                </div>

                {showAddPasskeyModal && (
                  <form className="ac-inset" onSubmit={handleRegisterPasskey}>
                    <p className="h3">{t('profile.passkeys.register_title')}</p>
                    <Field label={t('profile.passkeys.name')} hint={t('profile.passkeys.name_hint')}>
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
                        <Fingerprint /> {passkeyRegistering ? t('profile.passkeys.prompting') : t('profile.passkeys.continue')}
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => { setShowAddPasskeyModal(false); setNewPasskeyName(''); }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                )}

                {passkeysLoading ? (
                  <p className="small">{t('profile.passkeys.loading')}</p>
                ) : passkeys.length === 0 ? (
                  <p className="status">
                    <span className="mark-box mark-box-warning"><AlertCircle /></span>
                    <span>{t('profile.passkeys.empty')}</span>
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
                                  aria-label={t('profile.passkeys.rename')}
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
                                title={t('profile.passkeys.save_name')}
                                aria-label={t('profile.passkeys.save_name')}
                              >
                                <Check />
                              </button>
                              <button
                                type="button"
                                className="ac-icon-btn"
                                onClick={() => setEditingPasskeyId(null)}
                                disabled={passkeyRenaming}
                                title={t('common.cancel')}
                                aria-label={t('common.cancel')}
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
                                title={t('profile.passkeys.rename')}
                                aria-label={t('profile.passkeys.rename')}
                              >
                                <Pencil />
                              </button>
                              {pk.synced !== false ? (
                                <span className="tag tag-info"><Cloud /> {t('profile.passkeys.synced')}</span>
                              ) : (
                                <span className="tag tag-fg"><Key /> {t('profile.passkeys.hardware')}</span>
                              )}
                            </div>
                          )}
                          <div className="ac-meta">
                            <span>{pk.createdAt ? t('profile.passkeys.added_on', { date: new Date(pk.createdAt).toLocaleDateString() }) : t('profile.passkeys.added_recently')}</span>
                            {pk.lastUsedAt && <span>{t('profile.passkeys.last_used', { date: new Date(pk.lastUsedAt).toLocaleDateString() })}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="button button-ghost button-sm button-icon"
                          onClick={() => handleDeletePasskey(pk.id)}
                          title={t('profile.passkeys.delete')}
                          aria-label={t('profile.passkeys.delete')}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsCard>

              <SettingsCard title={t('auth.two_factor_title')} icon={Smartphone}
                description={t('profile.security.totp_description')}>
                {is2faEnabled ? (
                  <>
                    <p className="status">
                      <span className="mark-box mark-box-success"><Check /></span>
                      <span><Trans t={t} i18nKey="profile.security.enabled_message" components={{ strong: <strong /> }} /></span>
                    </p>
                    {user?.role === 'admin' || user?.role === 'moderator' ? (
                      <p className="status">
                        <span className="mark-box mark-box-warning"><Shield /></span>
                        <span>
                          {t('profile.security.staff_requirement', { role: user.role === 'admin' ? t('profile.roles.admin') : t('profile.roles.moderator') })}
                        </span>
                      </p>
                    ) : (
                      <form className="stack" onSubmit={disable2fa}>
                        <Field label={t('profile.security.disable_confirmation')}>
                          <PwInput
                            id="disable2faPassword"
                            name="disable2faPassword"
                            placeholder={t('profile.security.current_password_placeholder')}
                            value={formData.disable2faPassword}
                            onChange={v => setFormData({ ...formData, disable2faPassword: v })}
                            show={show2faPw}
                            onToggle={() => setShow2faPw(s => !s)}
                            autoComplete="current-password"
                          />
                        </Field>
                        <div className="row">
                          <button type="submit" className="button button-danger">
                            {t('profile.security.disable_totp')}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                ) : !setup2faData ? (
                  <>
                    <p className="status">
                      <span className="mark-box mark-box-warning"><AlertCircle /></span>
                      <span><Trans t={t} i18nKey="profile.security.disabled_message" components={{ strong: <strong /> }} /></span>
                    </p>
                    <div className="row">
                      <button className="button button-primary" onClick={start2faSetup}>
                        {t('profile.security.setup_totp')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="ac-step"><span className="mark-box ac-num">1</span> {t('profile.security.scan_qr')}</p>
                    <div className="ac-qr">
                      <QRCodeSVG value={setup2faData.uri} size={140} />
                    </div>
                    <div className="field">
                      <span className="field-hint">{t('profile.security.manual_code')}</span>
                      <div className="ac-secret"><code>{setup2faData.secret}</code></div>
                    </div>
                    <p className="ac-step"><span className="mark-box ac-num">2</span> {t('profile.security.enter_code')}</p>
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
                          aria-label={t('auth.authentication_code')}
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
                          t('profile.security.verifying')
                        ) : verify2faError ? (
                          <>
                            <AlertCircle /> {t('common.retry_error', { error: verify2faError })}
                          </>
                        ) : (
                          t('profile.security.verify_enable')
                        )}
                      </button>
                    </form>
                  </>
                )}
              </SettingsCard>

              <SettingsCard
                title={t('profile.recovery.title')}
                icon={ShieldAlert}
                description={t('profile.recovery.description')}
              >
                {recoveryLoading ? (
                  <p className="small">{t('profile.recovery.loading')}</p>
                ) : (
                  <div className="ac-split">
                    <p className="small">
                      {recoveryStatus?.hasCodes ? (
                        <span><Trans t={t} i18nKey="profile.recovery.remaining" components={{ remaining: <strong className="pumpkin">{recoveryStatus.remaining}</strong>, total: <strong>{recoveryStatus.total}</strong> }} /></span>
                      ) : (
                        <span>{t('profile.recovery.empty')}</span>
                      )}
                    </p>
                    <button
                      type="button"
                      className="button button-sm"
                      onClick={() => setShowRegenModal(true)}
                    >
                      <RefreshCw /> {recoveryStatus?.hasCodes ? t('profile.recovery.generate_new') : t('profile.recovery.generate')}
                    </button>
                  </div>
                )}

                {showRegenModal && (
                  <form className="ac-inset" onSubmit={handleGenerateRecoveryCodes}>
                    <div className="stack ac-tight">
                      <p className="h3">{t('profile.recovery.confirm_title')}</p>
                      <p className="small">
                        {t('profile.recovery.invalidate_warning')}
                      </p>
                    </div>
                    <Field label={t('profile.recovery.current_password')}>
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
                        {regenLoading ? t('profile.recovery.generating') : t('profile.recovery.generate_ten')}
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => { setShowRegenModal(false); setRegenPassword(''); }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                )}
              </SettingsCard>

              <SettingsCard
                title={t('profile.sessions.title')}
                icon={Laptop}
                description={t('profile.sessions.description')}
              >
                {sessionsLoading ? (
                  <p className="small">{t('profile.sessions.loading')}</p>
                ) : sessions.length === 0 ? (
                  <p className="small">{t('profile.sessions.empty')}</p>
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
                                {s.device_name || s.os || t('profile.sessions.device_fallback')}
                                {s.is_current && <span className="tag tag-solid tag-success">{t('profile.sessions.current_device')}</span>}
                              </div>
                              <div className="ac-meta">
                                <span>{s.browser || t('profile.sessions.browser_fallback')}</span>
                                {s.os && s.os !== s.device_name && <span>{s.os}</span>}
                                {s.country && <span>{s.country}</span>}
                                {s.ip_address && <span className="mono">{t('profile.sessions.ip_address', { ip: s.ip_address })}</span>}
                                <span>
                                  {s.is_current ? t('profile.sessions.active_now') : t('profile.sessions.last_active', { date: new Date(s.last_active_at).toLocaleDateString(), time: new Date(s.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
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
                                {revokingSessionId === s.id ? t('profile.sessions.revoking') : t('common.revoke')}
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
                          {revokingAllSessions ? t('profile.sessions.signing_out') : t('profile.sessions.sign_out_others')}
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
              <SectionHead title={<Trans t={t} i18nKey="profile.api_keys.heading" components={{ mark: <span className="mark" /> }} />}
                sub={t('profile.api_keys.subtitle')}
              />

              {createdRawKey && (
                <div className="panel panel-pumpkin">
                  <div className="panel-body stack">
                    <p className="status">
                      <span className="mark-box mark-box-success"><Check /></span>
                      <span>{t('profile.api_keys.created_title')}</span>
                    </p>
                    <p className="small">
                      <Trans t={t} i18nKey="profile.api_keys.copy_warning" components={{ strong: <strong /> }} />
                    </p>
                    <div className="ac-secret"><code>{createdRawKey}</code></div>
                    <div className="row">
                      <button
                        type="button"
                        className="button button-primary button-sm"
                        onClick={handleCopyRawKey}
                      >
                        {copiedKey ? <Check /> : <Copy />}
                        <span>{copiedKey ? t('common.copied') : t('profile.api_keys.copy')}</span>
                      </button>
                      <button
                        type="button"
                        className="button button-ghost button-sm"
                        onClick={() => setCreatedRawKey(null)}
                      >
                        {t('common.dismiss')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <SettingsCard
                title={t('profile.api_keys.create_title')}
                icon={Key}
                description={t('profile.api_keys.create_description')}
              >
                <form className="stack" onSubmit={handleCreateApiKey}>
                  <div className="fields ac-fields-2">
                    <Field label={t('profile.api_keys.name')} hint={t('profile.api_keys.name_hint')}>
                      <span className="control">
                        <input
                          type="text"
                          className="input"
                          placeholder={t('profile.api_keys.name_placeholder')}
                          value={newKeyName}
                          onChange={e => setNewKeyName(e.target.value)}
                          maxLength={64}
                          required
                        />
                      </span>
                    </Field>

                    <Field label={t('profile.api_keys.expiration')} hint={t('profile.api_keys.expiration_hint')}>
                      <Select
                        options={EXPIRY_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
                        value={String(newKeyExpiresIn)}
                        onChange={v => setNewKeyExpiresIn(Number(v))}
                      />
                    </Field>
                  </div>

                  <div className="stack">
                    <div className="ac-split">
                      <div className="stack ac-tight">
                        <span className="field-label">{t('profile.api_keys.scope_title')}</span>
                        <span className="field-hint">
                          {t('profile.api_keys.scope_description')}
                        </span>
                      </div>
                      <div className="row">
                        <button type="button" onClick={selectAllScopes} className="button button-flat button-sm">
                          {t('profile.api_keys.select_all')}
                        </button>
                        <button type="button" onClick={deselectAllScopes} className="button button-flat button-sm">
                          {t('profile.api_keys.deselect_all')}
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
                                {t('profile.api_keys.selected_scopes', { selected: selectedCount, total: catScopeKeys.length })}
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
                                        {scope.devOnly && <span className="tag tag-pumpkin">{t('profile.api_keys.developer_badge')}</span>}
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
                      {creatingKey ? t('profile.api_keys.generating') : t('profile.api_keys.generate')}
                    </button>
                  </div>
                </form>
              </SettingsCard>

              <SettingsCard
                title={t('profile.api_keys.active_title')}
                icon={Key}
                description={t('profile.api_keys.active_description')}
              >
                {apiKeysLoading ? (
                  <p className="small">{t('profile.api_keys.loading')}</p>
                ) : apiKeys.length === 0 ? (
                  <div className="blank">
                    <span className="ac-icon"><Key /></span>
                    <p className="h3">{t('profile.api_keys.empty')}</p>
                    <p className="small">
                      {t('profile.api_keys.empty_description')}
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
                            <span>{t('profile.api_keys.created_on', { date: new Date(k.createdAt).toLocaleDateString() })}</span>
                            <span>{t('profile.api_keys.expires_on', { date: k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : t('profile.api_keys.never') })}</span>
                            <span>{t('profile.api_keys.last_used', { date: k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : t('profile.api_keys.never') })}</span>
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
                          {revokingKeyId === k.id ? t('profile.sessions.revoking') : t('common.revoke')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsCard>

              <SettingsCard
                title={t('profile.api_keys.usage_title')}
                icon={Terminal}
                description={t('profile.api_keys.usage_description')}
              >
                <p className="small">
                  <Trans t={t} i18nKey="profile.api_keys.usage_instructions" components={{ header: <code className="mono pumpkin">Authorization: Bearer</code> }} />
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
              <SectionHead title={<Trans t={t} i18nKey="profile.developer.heading" components={{ mark: <span className="mark" /> }} />} sub={t('profile.developer.subtitle')} />

              {!user?.is_developer ? (
                <SettingsCard title={t('profile.developer.onboarding_title')} icon={Sparkles}
                  description={t('profile.developer.onboarding_description')}>
                  <div className="blank">
                    <span className="ac-badge"><Code /></span>
                    <p className="h3">{t('profile.developer.no_profile')}</p>
                    <p className="small">
                      {t('profile.developer.free_onboarding')}
                    </p>
                    <button
                      className="button button-primary"
                      onClick={() => setIsDevModalOpen(true)}
                    >
                      <Sparkles /> {t('profile.developer.complete_onboarding')}
                    </button>
                  </div>
                </SettingsCard>
              ) : (
                <>
                  {devProfile && (
                    <SettingsCard title={t('profile.developer.identity_title')} icon={Building2}
                      description={t('profile.developer.identity_description')}>
                      <form className="fields ac-fields-2" onSubmit={handleUpdateDevProfile}>
                        <Field label={t('profile.developer.entity_type')}>
                          <span className="control">
                            <input
                              className="input"
                              type="text"
                              value={devProfile.entity_type === 'organization' ? t('profile.developer.organization') : t('profile.developer.individual')}
                              disabled
                            />
                          </span>
                        </Field>

                        <Field label={t('profile.developer.display_name')} hint={t('profile.developer.display_name_hint')}>
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
                            <span className="field-hint">{t('profile.developer.checking_availability')}</span>
                          )}
                          {devNameError && (
                            <span className="field-error"><AlertCircle size={14} />{devNameError}</span>
                          )}
                          {devNameAvailable && !devNameChecking && !devNameError && (
                            <span className="field-hint ac-hint-ok">{t('profile.developer.name_available')}</span>
                          )}
                        </Field>

                        <Field label={t('profile.developer.legal_name')} hint={t('profile.developer.legal_name_hint')}>
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

                        <Field label={t('profile.developer.street_address')}>
                          <span className="control">
                            <input
                              id="devStreetAddress"
                              name="streetAddress"
                              className="input"
                              type="text"
                              value={devProfileForm.streetAddress}
                              onChange={e => setDevProfileForm({ ...devProfileForm, streetAddress: e.target.value })}
                              placeholder={t('profile.developer.street_placeholder')}
                              autoComplete="street-address"
                            />
                          </span>
                        </Field>

                        <Field label={t('profile.developer.city')}>
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

                        <Field label={t('profile.developer.postal_code')}>
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

                        <Field label={t('profile.developer.tax_id')} hint={t('profile.developer.tax_id_hint')}>
                          <span className="control">
                            <input
                              id="devVatId"
                              name="vatId"
                              className="input"
                              type="text"
                              value={devProfileForm.vatId}
                              onChange={e => setDevProfileForm({ ...devProfileForm, vatId: e.target.value })}
                              placeholder={t('profile.developer.tax_id_placeholder')}
                              autoComplete="off"
                            />
                          </span>
                        </Field>

                        <Field label={t('profile.developer.support_email')} hint={t('profile.developer.support_email_hint')}>
                          <span className="control">
                            <input
                              id="devSupportEmail"
                              name="supportEmail"
                              className="input"
                              type="email"
                              value={devProfileForm.supportEmail}
                              onChange={e => setDevProfileForm({ ...devProfileForm, supportEmail: e.target.value })}
                              placeholder={t('profile.developer.support_email_placeholder')}
                              autoComplete="email"
                            />
                          </span>
                        </Field>

                        <Field label={t('developer.onboarding.website_label')}>
                          <span className="control">
                            <input
                              id="devWebsiteUrl"
                              name="websiteUrl"
                              className="input"
                              type="url"
                              value={devProfileForm.websiteUrl}
                              onChange={e => setDevProfileForm({ ...devProfileForm, websiteUrl: e.target.value })}
                              placeholder={t('profile.developer.website_placeholder')}
                              autoComplete="url"
                            />
                          </span>
                        </Field>

                        <Field label={t('profile.developer.github')}>
                          <span className="control">
                            <input
                              id="devGithubUrl"
                              name="githubUrl"
                              className="input"
                              type="text"
                              value={devProfileForm.githubUrl}
                              onChange={e => setDevProfileForm({ ...devProfileForm, githubUrl: e.target.value })}
                              placeholder={t('profile.developer.github_placeholder')}
                              autoComplete="url"
                            />
                          </span>
                        </Field>

                        <div className="row ac-span">
                          <SaveBtn isSaving={saving['devProfile']} disabled={Boolean(devNameError) || devNameChecking} label={t('profile.developer.save')} savingLabel={t('profile.developer.saving')} />
                        </div>
                      </form>
                    </SettingsCard>
                  )}

                  <SettingsCard title={t('profile.developer.payout_title')} icon={CreditCard}
                    description={t('profile.developer.payout_description')}>
                    {user?.stripe_ready ? (
                      <>
                        <div className="status ac-status-block">
                          <span className="mark-box mark-box-success"><Check /></span>
                          <div>
                            <strong>{t('profile.developer.payout_connected')}</strong>
                            <p className="small">{t('profile.developer.payout_ready')}</p>
                          </div>
                        </div>
                        <div className="row">
                          <button className="button" onClick={handleGoToStripe} disabled={isStripeLoading} aria-busy={isStripeLoading}>
                            {isStripeLoading ? t('profile.developer.opening') : t('profile.developer.open_dashboard')}
                          </button>
                        </div>
                      </>
                    ) : user?.stripe_account_id ? (
                      <>
                        <div className="status ac-status-block">
                          <span className="mark-box mark-box-warning"><AlertCircle /></span>
                          <div>
                            <strong>{t('profile.developer.payout_incomplete')}</strong>
                            <p className="small">{t('profile.developer.payout_not_activated')}</p>
                          </div>
                        </div>
                        <div className="row">
                          <button className="button button-primary" onClick={handleConnectStripe} disabled={isStripeLoading} aria-busy={isStripeLoading}>
                            {isStripeLoading ? t('profile.developer.redirecting') : t('profile.developer.continue_payout')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="status">
                          <span className="dot" />
                          <span className="muted">{t('profile.developer.no_payout')}</span>
                        </p>
                        <div className="row">
                          <button className="button button-primary" onClick={handleConnectStripe} disabled={isStripeLoading} aria-busy={isStripeLoading}>
                            <CreditCard />
                            {isStripeLoading ? t('profile.developer.connecting') : t('profile.developer.connect_payout')}
                          </button>
                        </div>
                      </>
                    )}
                  </SettingsCard>

                  <SettingsCard title={t('profile.developer.payout_faq')} icon={Lock}>
                    <div className="ac-faq">
                      {[
                        { q: t('profile.developer.faq_free_question'), a: t('profile.developer.faq_free_answer') },
                        { q: t('profile.developer.faq_timing_question'), a: t('profile.developer.faq_timing_answer') },
                        { q: t('profile.developer.faq_fee_question'), a: t('profile.developer.faq_fee_answer') },
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
              <SectionHead title={<Trans t={t} i18nKey="profile.notifications.heading" components={{ mark: <span className="mark" /> }} />} sub={t('profile.notifications.subtitle')} />

              <SettingsCard title={t('profile.notifications.title')} icon={Mail}
                description={t('profile.notifications.description')}>
                <div className="ac-toggles">
                  <Toggle
                    checked={notifPrefs.purchaseEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, purchaseEmail: v }))}
                    label={t('profile.notifications.purchase')}
                    desc={t('profile.notifications.purchase_description')}
                  />
                  <Toggle
                    checked={notifPrefs.reviewEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, reviewEmail: v }))}
                    label={t('profile.notifications.review')}
                    desc={t('profile.notifications.review_description')}
                  />
                  <Toggle
                    checked={notifPrefs.updateEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, updateEmail: v }))}
                    label={t('profile.notifications.updates')}
                    desc={t('profile.notifications.updates_description')}
                  />
                  <Toggle
                    checked={notifPrefs.marketingEmail}
                    onChange={v => setNotifPrefs(p => ({ ...p, marketingEmail: v }))}
                    label={t('profile.notifications.marketing')}
                    desc={t('profile.notifications.marketing_description')}
                  />
                </div>
                <div className="row">
                  <button
                    className="button button-primary"
                    onClick={() => showToast(t('profile.notifications.saved'))}
                  >
                    {t('common.save_preferences')}
                  </button>
                </div>
              </SettingsCard>
            </>
          )}

          {activeTab === 'library' && (
            <>
              <SectionHead title={<Trans t={t} i18nKey="profile.library.heading" components={{ mark: <span className="mark" /> }} />} sub={t('profile.library.subtitle')}>
                {library.length > 0 && (
                  <span className="label mono ac-count">
                    {t('profile.library.plugin_count', { count: library.length })}
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
                  <p className="h2"><Trans t={t} i18nKey="profile.library.empty_title" components={{ mark: <span className="mark" /> }} /></p>
                  <p className="small">{t('profile.library.empty_description')}</p>
                  <Link to="/" className="button button-primary">
                    {t('profile.library.browse')}
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
                            {entry.is_preorder ? t('profile.library.preorder_badge') : t('profile.library.owned')}
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
                        <p className="entry-by"><Trans t={t} i18nKey="common.by_author" components={{ author: <strong>{entry.dev_name}</strong> }} /></p>
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
              <SectionHead title={<Trans t={t} i18nKey="profile.privacy.heading" components={{ mark: <span className="mark" /> }} />}
                sub={t('profile.privacy.subtitle')}
              />

              <SettingsCard
                title={t('profile.privacy.export_title')}
                icon={Download}
                description={t('profile.privacy.export_description')}
              >
                <p className="small">
                  {t('profile.privacy.export_instructions')}
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
                    {isExporting ? t('profile.privacy.export_generating') : t('profile.privacy.export_download')}
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard
                title={t('cookie.banner_title')}
                icon={Sliders}
                description={t('profile.privacy.cookie_description')}
              >
                <p className="small">
                  {t('profile.privacy.cookie_instructions')}
                </p>
                <div className="row">
                  <button
                    type="button"
                    onClick={openCookiePreferencesModal}
                    className="button"
                  >
                    <Sliders />
                    {t('profile.privacy.cookie_manage')}
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard
                title={t('profile.privacy.controls_title')}
                icon={ShieldCheck}
                description={t('profile.privacy.controls_description')}
              >
                <div className="ac-faq">
                  <div>
                    <p className="h3">{t('profile.privacy.access_title')}</p>
                    <p className="small">{t('profile.privacy.access_description')}</p>
                  </div>
                  <div>
                    <p className="h3">{t('profile.privacy.update_title')}</p>
                    <p className="small">{t('profile.privacy.update_description')}</p>
                  </div>
                  <div>
                    <p className="h3">{t('profile.privacy.delete_title')}</p>
                    <p className="small">{t('profile.privacy.delete_description')}</p>
                  </div>
                  <div>
                    <p className="h3">{t('profile.privacy.contact_title')}</p>
                    <p className="small">
                      <Trans t={t} i18nKey="profile.privacy.contact_description" components={{ email: <a href="mailto:privacy@pumpkinmc.org" className="link link-pumpkin">privacy@pumpkinmc.org</a> }} />
                    </p>
                  </div>
                </div>
              </SettingsCard>
            </>
          )}

          {activeTab === 'danger' && (
            <>
              <header className="ac-section-head">
                <h2 className="h1"><Trans t={t} i18nKey="profile.danger.heading" components={{ mark: <span className="mark ac-mark-danger" /> }} /></h2>
                <p className="small">{t('profile.danger.subtitle')}</p>
              </header>

              <div className="notice notice-danger ac-danger">
                <span className="sticker sticker-danger"><Trash2 size={13} /> {t('profile.danger.delete_title')}</span>
                <p className="notice-text">
                  <Trans t={t} i18nKey="profile.danger.delete_warning" components={{ strong: <strong /> }} />
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="button button-danger"
                >
                  <Trash2 />
                  {t('profile.danger.delete_action')}
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
          showToast(t('profile.security.password_changed'), 'success');
          fetchSessions();
        }}
      />
    </div>
  );
};

export default SettingsPage;
