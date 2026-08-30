import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCodeList } from 'country-list';
import {
  Globe, Mail, CheckCircle2, ChevronRight,
  AlertCircle, CreditCard, Code2, ShieldCheck, MapPin,
  Gift,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../App';
import { SecuritySetupCards } from './SecuritySetupCards';
import './DeveloperOnboardingModal.css';

interface DeveloperOnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

export const DeveloperOnboardingModal: React.FC<DeveloperOnboardingModalProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  embedded = false,
}) => {
  const { t } = useTranslation();
  const { user, login, refreshUser } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [entityType, setEntityType] = useState<'individual' | 'organization'>('individual');
  const [orgType, setOrgType] = useState<string>('');
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [nameChecking, setNameChecking] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSellingPaid, setIsSellingPaid] = useState<boolean | null>(null);

  // Legal / Address (for paid sellers)
  const [legalName, setLegalName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [vatId, setVatId] = useState('');
  const [country, setCountry] = useState(user?.country || '');

  // Contact / Social
  const [supportEmail, setSupportEmail] = useState(user?.email || '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced check for developer display name availability
  useEffect(() => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setNameChecking(true);
      try {
        const res = await api.get(`/user/developer/check-name?name=${encodeURIComponent(trimmed)}`);
        if (res.data?.available === false) {
          setNameError(res.data.message || t('developer.onboarding.name_taken_error'));
        } else {
          setNameError(null);
        }
      } catch (err: any) {
        if (err.response?.data?.error) {
          setNameError(err.response.data.error);
        }
      } finally {
        setNameChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [displayName, t]);

  const hasSecureAuth = Boolean(user?.totp_enabled || (user?.passkey_count && user.passkey_count > 0) || user?.has_passkey);

  if (!embedded && !isOpen) return null;

  const handleCompleteOnboarding = async (connectStripe: boolean) => {
    if (!acceptedTerms) {
      setError('You must accept the Developer Distribution Agreement to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/user/developer/onboard', {
        entityType,
        displayName,
        legalName: isSellingPaid ? (legalName.trim() || null) : null,
        streetAddress: isSellingPaid ? (streetAddress.trim() || null) : null,
        city: isSellingPaid ? (city.trim() || null) : null,
        postalCode: isSellingPaid ? (postalCode.trim() || null) : null,
        vatId: isSellingPaid ? (vatId.trim() || null) : null,
        publishingIntent: isSellingPaid ? 'paid' : 'free',
        supportEmail: supportEmail.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        githubUrl: githubUrl.trim() || null,
        country: country || user?.country || null,
        acceptedTerms,
      });

      if (res.data.token) {
        login(res.data.token);
      }

      if (connectStripe) {
        const stripeRes = await api.post('/stripe/onboard');
        if (stripeRes.data.url) {
          window.location.href = stripeRes.data.url;
          return;
        }
      }

      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete developer onboarding');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setStep(s => Math.max(1, s - 1));
  };

  const handleStep2Next = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setNameChecking(true);
    try {
      const res = await api.get(`/user/developer/check-name?name=${encodeURIComponent(trimmed)}`);
      if (res.data?.available === false) {
        setNameError(res.data.message || t('developer.onboarding.name_taken_error'));
        return;
      }
      setNameError(null);
      nextStep();
    } catch (err: any) {
      setNameError(err.response?.data?.error || 'Failed to verify developer name');
    } finally {
      setNameChecking(false);
    }
  };

  const isStep2Valid = Boolean(displayName.trim() && !nameError && !nameChecking);

  const isStep3Valid = Boolean(
    isSellingPaid !== null &&
    (isSellingPaid === false ||
      (isSellingPaid === true &&
        legalName.trim() &&
        streetAddress.trim() &&
        city.trim() &&
        postalCode.trim() &&
        country))
  );

  const content = (
    <div className="dev-modal-container">
      {!embedded && onClose && (
        <button className="dev-modal-close" onClick={onClose} aria-label="Close modal">&times;</button>
      )}

        <div className="dev-modal-header">
          <div className="dev-modal-badge">
            {t('developer.onboarding.badge')}
          </div>
          <h2>{t('developer.onboarding.title')}</h2>
          <p>
            {isSellingPaid
              ? t('developer.onboarding.subtitle_paid')
              : t('developer.onboarding.subtitle_free')}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="dev-steps-nav">
          <div className={`dev-step-pill ${step >= 1 ? 'active' : ''}`}>1. {t('developer.onboarding.step_account_type')}</div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= 2 ? 'active' : ''}`}>2. {t('developer.onboarding.step_name')}</div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= 3 ? 'active' : ''}`}>3. {t('developer.onboarding.step_monetization')}</div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= 4 ? 'active' : ''}`}>4. {t('developer.onboarding.step_links')}</div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= 5 ? 'active' : ''}`}>5. {t('developer.onboarding.step_finish')}</div>
        </div>

        {error && (
          <div className="dev-modal-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Account Type (Google Play Style) ── */}
        {step === 1 && (
          <div className="dev-step-content">
            <div className="dev-account-types-container">
              {/* An organization */}
              <div className={`dev-account-card ${entityType === 'organization' ? 'selected' : ''}`}>
                <div className="dev-account-card-header">
                  <h3 className="dev-account-card-title">{t('developer.onboarding.org_title')}</h3>
                  <p className="dev-account-card-desc">
                    {t('developer.onboarding.org_desc')}
                  </p>
                </div>

                <div className="dev-account-card-field">
                  <label htmlFor="orgTypeSelect">{t('developer.onboarding.org_type_label')}</label>
                  <select
                    id="orgTypeSelect"
                    className="dev-input dev-select"
                    value={orgType}
                    onChange={e => {
                      setOrgType(e.target.value);
                      setEntityType('organization');
                    }}
                  >
                    <option value="">{t('developer.onboarding.org_type_placeholder')}</option>
                    <option value="company">Company / Studio</option>
                    <option value="nonprofit">Non-profit / Open Source Organization</option>
                    <option value="education">Educational Institution</option>
                    <option value="other">Other entity</option>
                  </select>
                </div>

                <div className="dev-account-card-actions">
                  <button
                    type="button"
                    className="dev-account-get-started-btn"
                    disabled={!orgType}
                    onClick={() => {
                      setEntityType('organization');
                      nextStep();
                    }}
                  >
                    {t('developer.onboarding.btn_get_started')}
                  </button>
                </div>
              </div>

              {/* Yourself */}
              <div className={`dev-account-card ${entityType === 'individual' ? 'selected' : ''}`}>
                <div className="dev-account-card-header">
                  <h3 className="dev-account-card-title">{t('developer.onboarding.individual_title')}</h3>
                  <p className="dev-account-card-desc">
                    {t('developer.onboarding.individual_desc')}
                  </p>
                </div>

                <div className="dev-account-card-actions">
                  <button
                    type="button"
                    className="dev-account-get-started-btn"
                    onClick={() => {
                      setEntityType('individual');
                      nextStep();
                    }}
                  >
                    {t('developer.onboarding.btn_get_started')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Developer Public Name / Brand ── */}
        {step === 2 && (
          <div className="dev-step-content">
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '0.35rem' }}>
                {t('developer.onboarding.dev_name_title')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5, margin: 0 }}>
                {t('developer.onboarding.dev_name_desc')}
              </p>
            </div>

            <div className="dev-form-group">
              <label htmlFor="onboardingDisplayName">{t('developer.onboarding.display_name_label')}</label>
              <input
                id="onboardingDisplayName"
                name="displayName"
                type="text"
                className={`dev-input ${nameError ? 'dev-input-error' : ''}`}
                placeholder={entityType === 'organization' ? 'e.g. PixelCraft Studios' : t('developer.onboarding.display_name_placeholder')}
                value={displayName}
                onChange={e => {
                  setDisplayName(e.target.value);
                  setNameError(null);
                }}
                autoComplete="nickname"
                maxLength={60}
                autoFocus
              />
              {nameError ? (
                <span className="dev-field-error">
                  <AlertCircle size={14} />
                  <span>{nameError}</span>
                </span>
              ) : (
                <span className="dev-hint">{t('developer.onboarding.display_name_hint')}</span>
              )}
            </div>

            <div className="dev-btn-row" style={{ marginTop: '1.5rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={prevStep}>
                {t('developer.onboarding.btn_back')}
              </button>
              <button
                className="dev-btn dev-btn-primary"
                disabled={!isStep2Valid}
                onClick={handleStep2Next}
              >
                {nameChecking ? 'Checking...' : t('developer.onboarding.btn_continue')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Monetization & Seller Details ── */}
        {step === 3 && (
          <div className="dev-step-content">
            {/* Required Radio Question: Do you plan to publish Paid plugins? */}
            <div className="dev-form-group">
              <label className="dev-field-label" style={{ marginBottom: '0.6rem', display: 'block', fontWeight: 600 }}>
                {t('developer.onboarding.plan_paid_question')}
              </label>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  cursor: 'pointer',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  background: isSellingPaid === true ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isSellingPaid === true ? '#f97316' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isSellingPaid === true ? '#fff' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                }}>
                  <input
                    type="radio"
                    name="planPaidChoice"
                    checked={isSellingPaid === true}
                    onChange={() => setIsSellingPaid(true)}
                    style={{ accentColor: '#f97316', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  {t('developer.onboarding.option_yes')}
                </label>

                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  cursor: 'pointer',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  background: isSellingPaid === false ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isSellingPaid === false ? '#f97316' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isSellingPaid === false ? '#fff' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                }}>
                  <input
                    type="radio"
                    name="planPaidChoice"
                    checked={isSellingPaid === false}
                    onChange={() => setIsSellingPaid(false)}
                    style={{ accentColor: '#f97316', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  {t('developer.onboarding.option_no')}
                </label>
              </div>

              {/* If clicked yes, display all the new required seller fields below */}
              {isSellingPaid === true && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  background: 'rgba(249, 115, 22, 0.04)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  borderRadius: '10px',
                }}>
                  <div className="dev-form-group">
                    <label className="dev-field-label" htmlFor="onboardingLegalName">
                      <ShieldCheck size={14} /> {t('developer.onboarding.legal_name_label')}
                    </label>
                    <input
                      id="onboardingLegalName"
                      name="legalName"
                      type="text"
                      className="dev-input"
                      value={legalName}
                      onChange={e => setLegalName(e.target.value)}
                      placeholder={entityType === 'individual' ? 'First and Last Name' : 'Legal Company Name Inc.'}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="dev-form-group">
                    <label className="dev-field-label" htmlFor="onboardingStreetAddress">
                      <MapPin size={14} /> {t('developer.onboarding.street_label')}
                    </label>
                    <input
                      id="onboardingStreetAddress"
                      name="streetAddress"
                      type="text"
                      className="dev-input"
                      value={streetAddress}
                      onChange={e => setStreetAddress(e.target.value)}
                      placeholder="123 Main St, Suite 400"
                      autoComplete="street-address"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="dev-form-group">
                      <label className="dev-field-label" htmlFor="onboardingCity">{t('developer.onboarding.city_label')}</label>
                      <input
                        id="onboardingCity"
                        name="city"
                        type="text"
                        className="dev-input"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="City"
                        autoComplete="address-level2"
                        required
                      />
                    </div>
                    <div className="dev-form-group">
                      <label className="dev-field-label" htmlFor="onboardingPostalCode">{t('developer.onboarding.postal_label')}</label>
                      <input
                        id="onboardingPostalCode"
                        name="postalCode"
                        type="text"
                        className="dev-input"
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        placeholder="10001"
                        autoComplete="postal-code"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="dev-form-group">
                      <label className="dev-field-label" htmlFor="onboardingCountry">
                        <Globe size={14} /> {t('developer.onboarding.country_label')}
                      </label>
                      <select
                        id="onboardingCountry"
                        name="country"
                        className="dev-input dev-select"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        autoComplete="country"
                        required
                      >
                        <option value="">Select country...</option>
                        {Object.entries(getCodeList()).map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="dev-form-group">
                      <label className="dev-field-label" htmlFor="onboardingVatId">{t('developer.onboarding.vat_label')}</label>
                      <input
                        id="onboardingVatId"
                        name="vatId"
                        type="text"
                        className="dev-input"
                        value={vatId}
                        onChange={e => setVatId(e.target.value)}
                        placeholder="EU123456789 or Tax ID"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="dev-btn-row" style={{ marginTop: '1.25rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={prevStep}>
                {t('developer.onboarding.btn_back')}
              </button>
              <button
                className="dev-btn dev-btn-primary"
                disabled={!isStep3Valid}
                onClick={nextStep}
              >
                {t('developer.onboarding.btn_continue')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Support Contact & Portfolio Links ── */}
        {step === 4 && (
          <div className="dev-step-content">
            <div className="dev-form-group">
              <label className="dev-field-label" htmlFor="onboardingSupportEmail"><Mail size={14} /> {t('developer.onboarding.support_email_label')} *</label>
              <input
                id="onboardingSupportEmail"
                name="supportEmail"
                type="email"
                className="dev-input"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                placeholder="support@yourdomain.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="dev-form-group">
              <label className="dev-field-label" htmlFor="onboardingWebsiteUrl"><Globe size={14} /> {t('developer.onboarding.website_label')}</label>
              <input
                id="onboardingWebsiteUrl"
                name="websiteUrl"
                type="url"
                className="dev-input"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                autoComplete="url"
              />
            </div>

            <div className="dev-form-group">
              <label className="dev-field-label" htmlFor="onboardingGithubUrl"><Code2 size={14} /> {t('developer.onboarding.github_label')}</label>
              <input
                id="onboardingGithubUrl"
                name="githubUrl"
                type="text"
                className="dev-input"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                placeholder="https://github.com/yourname"
                autoComplete="url"
              />
            </div>

            <div className="dev-btn-row" style={{ marginTop: '1.5rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={prevStep}>{t('developer.onboarding.btn_back')}</button>
              <button
                className="dev-btn dev-btn-primary"
                disabled={!supportEmail.trim()}
                onClick={nextStep}
              >
                {t('developer.onboarding.btn_continue')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Finish & Confirmation ── */}
        {step === 5 && (
          <div className="dev-step-content">
            <div className="dev-monetization-box" style={{ marginBottom: '0.85rem' }}>
              <div className="dev-monetization-header">
                {!isSellingPaid ? (
                  <Gift size={20} color="#10b981" />
                ) : (
                  <CreditCard size={20} color="#f97316" />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                      {!isSellingPaid ? 'Free Creator Profile' : 'Commercial Seller Profile'}
                    </h4>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 999,
                      background: !isSellingPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                      color: !isSellingPaid ? '#34d399' : '#f97316',
                      border: `1px solid ${!isSellingPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                    }}>
                      {!isSellingPaid ? 'Free Uploads' : 'Paid + Stripe'}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Display: <strong style={{ color: '#fff' }}>{displayName}</strong> • Email: <strong style={{ color: '#fff' }}>{supportEmail}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Security Requirement for Developers ── */}
            {hasSecureAuth ? (
              <div style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                color: '#4ade80',
                fontSize: '0.82rem',
                marginBottom: '0.85rem',
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span><strong>Security Verified:</strong> 2FA / Passkey protection is active on your account.</span>
              </div>
            ) : (
              <div style={{ marginBottom: '0.85rem' }}>
                <SecuritySetupCards
                  compact={true}
                  title="Developer Security Requirement"
                  description="To publish plugins, set up Passkey or 2FA Authenticator before finishing."
                  isRequired={true}
                  onComplete={async () => {
                    if (refreshUser) await refreshUser();
                  }}
                />
              </div>
            )}

            {/* ── Mandatory Legal Consent ── */}
            <div style={{
              padding: '0.75rem 0.85rem',
              background: 'rgba(255, 183, 77, 0.05)',
              border: '1px solid rgba(255, 183, 77, 0.2)',
              borderRadius: 8,
              marginBottom: '1rem',
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', cursor: 'pointer', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  style={{ marginTop: '0.15rem', accentColor: '#f97316', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                />
                <span>
                  I agree to the <a href="/developer-terms" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline', fontWeight: 600 }}>Developer Distribution Agreement</a>, <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline' }}>Terms of Service</a>, and <a href="/guidelines" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline' }}>Review Guidelines</a>. I grant Pumpkin Market license to distribute my plugins and confirm compliance with Mojang's Minecraft EULA.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="dev-btn-row-stacked">
              {isSellingPaid ? (
                <>
                  <button
                    className="dev-btn dev-btn-stripe"
                    disabled={loading || !acceptedTerms || !hasSecureAuth}
                    onClick={() => handleCompleteOnboarding(true)}
                  >
                    <CreditCard size={16} /> {loading ? 'Connecting Stripe...' : t('developer.onboarding.btn_connect_stripe')}
                  </button>
                  <button
                    className="dev-btn dev-btn-secondary"
                    disabled={loading || !acceptedTerms || !hasSecureAuth}
                    onClick={() => handleCompleteOnboarding(false)}
                  >
                    {t('developer.onboarding.btn_complete')}
                  </button>
                </>
              ) : (
                <button
                  className="dev-btn dev-btn-primary"
                  disabled={loading || !acceptedTerms || !hasSecureAuth}
                  onClick={() => handleCompleteOnboarding(false)}
                >
                  {loading ? 'Completing registration...' : t('developer.onboarding.btn_complete')}
                </button>
              )}
            </div>

            <div className="dev-btn-row" style={{ marginTop: '0.85rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={prevStep}>
                {t('developer.onboarding.btn_back')}
              </button>
            </div>
          </div>
        )}
    </div>
  );

  if (embedded) {
    return (
      <div className="dev-onboarding-embedded">
        {content}
      </div>
    );
  }

  return (
    <div className="dev-modal-overlay">
      {content}
    </div>
  );
};

export default DeveloperOnboardingModal;
