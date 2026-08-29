import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCodeList } from 'country-list';
import {
  Building2, User, Globe, Mail, CheckCircle2, ChevronRight,
  AlertCircle, CreditCard, Sparkles, Code2, ShieldCheck, MapPin,
  Gift, DollarSign,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../App';
import { SecuritySetupCards } from './SecuritySetupCards';
import './DeveloperOnboardingModal.css';

interface DeveloperOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeveloperOnboardingModal: React.FC<DeveloperOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [entityType, setEntityType] = useState<'individual' | 'organization'>('individual');
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [isSellingPaid, setIsSellingPaid] = useState<boolean>(false);

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

  const hasSecureAuth = Boolean(user?.totp_enabled || (user?.passkey_count && user.passkey_count > 0) || user?.has_passkey);

  if (!isOpen) return null;

  // Max steps: 3 for Free, 4 for Paid
  const totalSteps = isSellingPaid ? 4 : 3;

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
      onClose();
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

  return (
    <div className="dev-modal-overlay">
      <div className="dev-modal-container">
        <button className="dev-modal-close" onClick={onClose} aria-label="Close modal">&times;</button>

        <div className="dev-modal-header">
          <div className="dev-modal-badge">
            <Sparkles size={14} /> {t('developer.onboarding.badge')}
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
          <div className={`dev-step-pill ${step >= 1 ? 'active' : ''}`}>{t('developer.onboarding.step_profile')}</div>
          <div className="dev-step-line" />
          {isSellingPaid && (
            <>
              <div className={`dev-step-pill ${step >= 2 ? 'active' : ''}`}>{t('developer.onboarding.step_seller')}</div>
              <div className="dev-step-line" />
            </>
          )}
          <div className={`dev-step-pill ${step >= (isSellingPaid ? 3 : 2) ? 'active' : ''}`}>
            {isSellingPaid ? `3. ${t('developer.onboarding.step_links')}` : `2. ${t('developer.onboarding.step_links')}`}
          </div>
          <div className="dev-step-line" />
          <div className={`dev-step-pill ${step >= totalSteps ? 'active' : ''}`}>
            {totalSteps}. {t('developer.onboarding.step_finish')}
          </div>
        </div>

        {error && (
          <div className="dev-modal-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Entity Type, Public Name & Plan ── */}
        {step === 1 && (
          <div className="dev-step-content">
            <label className="dev-field-label">{t('developer.onboarding.entity_question')}</label>
            <div className="dev-entity-grid">
              <button
                type="button"
                className={`dev-entity-card ${entityType === 'individual' ? 'selected' : ''}`}
                onClick={() => setEntityType('individual')}
              >
                <div className="dev-entity-icon"><User size={22} /></div>
                <div>
                  <h4>{t('developer.onboarding.individual_title')}</h4>
                  <p>{t('developer.onboarding.individual_desc')}</p>
                </div>
              </button>

              <button
                type="button"
                className={`dev-entity-card ${entityType === 'organization' ? 'selected' : ''}`}
                onClick={() => setEntityType('organization')}
              >
                <div className="dev-entity-icon"><Building2 size={22} /></div>
                <div>
                  <h4>{t('developer.onboarding.org_title')}</h4>
                  <p>{t('developer.onboarding.org_desc')}</p>
                </div>
              </button>
            </div>

            <div className="dev-form-group">
              <label htmlFor="onboardingDisplayName">{t('developer.onboarding.display_name_label')}</label>
              <input
                id="onboardingDisplayName"
                name="displayName"
                type="text"
                className="dev-input"
                placeholder={t('developer.onboarding.display_name_placeholder')}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="nickname"
                maxLength={60}
                autoFocus
              />
              <span className="dev-hint">{t('developer.onboarding.display_name_hint')}</span>
            </div>

            <div className="dev-form-group">
              <label>{t('developer.onboarding.intent_label')}</label>
              <div className="dev-entity-grid">
                <button
                  type="button"
                  className={`dev-entity-card ${!isSellingPaid ? 'active' : ''}`}
                  onClick={() => setIsSellingPaid(false)}
                >
                  <div className="dev-entity-icon"><Gift size={22} color="#10b981" /></div>
                  <div>
                    <h4>{t('developer.onboarding.intent_free')}</h4>
                    <p>{t('developer.onboarding.intent_free_desc')}</p>
                  </div>
                </button>

                <button
                  type="button"
                  className={`dev-entity-card ${isSellingPaid ? 'active' : ''}`}
                  onClick={() => setIsSellingPaid(true)}
                >
                  <div className="dev-entity-icon"><DollarSign size={22} color="#f97316" /></div>
                  <div>
                    <h4>{t('developer.onboarding.intent_paid')}</h4>
                    <p>{t('developer.onboarding.intent_paid_desc')}</p>
                  </div>
                </button>
              </div>
            </div>

            <button
              className="dev-btn dev-btn-primary"
              style={{ marginTop: '1.25rem' }}
              disabled={!displayName.trim()}
              onClick={nextStep}
            >
              {t('developer.onboarding.btn_continue')} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2 (Paid Only): Legal Seller Identity & Address ── */}
        {isSellingPaid && step === 2 && (
          <div className="dev-step-content">
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
              <label className="dev-field-label" htmlFor="onboardingStreetAddress"><MapPin size={14} /> {t('developer.onboarding.street_label')}</label>
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
                <label className="dev-field-label" htmlFor="onboardingCountry"><Globe size={14} /> {t('developer.onboarding.country_label')}</label>
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

            <div className="dev-btn-row" style={{ marginTop: '1.25rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={prevStep}>{t('developer.onboarding.btn_back')}</button>
              <button
                className="dev-btn dev-btn-primary"
                disabled={!legalName.trim() || !streetAddress.trim() || !city.trim() || !postalCode.trim() || !country}
                onClick={nextStep}
              >
                {t('developer.onboarding.btn_continue')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP (Free: Step 2, Paid: Step 3): Support Contact & Portfolio Links ── */}
        {((!isSellingPaid && step === 2) || (isSellingPaid && step === 3)) && (
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

        {/* ── STEP (Free: Step 3, Paid: Step 4): Finish & Confirmation ── */}
        {step === totalSteps && (
          <div className="dev-step-content">
            {!isSellingPaid ? (
              <>
                <div className="dev-monetization-box">
                  <div className="dev-monetization-header">
                    <Gift size={22} color="#10b981" />
                    <div>
                      <h4>Ready to Publish Free Plugins!</h4>
                      <p>Your developer profile is configured for free &amp; open-source uploads.</p>
                    </div>
                  </div>
                  <ul className="dev-check-list">
                    <li><CheckCircle2 size={16} color="#10b981" /> Publish unlimited free plugins ($0 fee)</li>
                    <li><CheckCircle2 size={16} color="#10b981" /> Full analytics and review dashboard</li>
                    <li><CheckCircle2 size={16} color="#10b981" /> Option to add address &amp; sell paid plugins anytime later</li>
                  </ul>
                </div>

                {/* ── Security Requirement for Developers ── */}
                {!hasSecureAuth && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <SecuritySetupCards
                      title="Developer Security Requirement"
                      description="To publish plugins and protect developer payouts, you must set up a Passkey or Two-Factor Authentication before completing onboarding."
                      isRequired={true}
                      onComplete={() => {}}
                    />
                  </div>
                )}

                {/* ── Mandatory Legal Consent ── */}
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 183, 77, 0.06)',
                  border: '1px solid rgba(255, 183, 77, 0.25)',
                  borderRadius: 8,
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      style={{ marginTop: '0.15rem', accentColor: '#f97316', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span>
                      I agree to the <a href="/developer-terms" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline', fontWeight: 600 }}>Developer Distribution Agreement</a>, <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline' }}>Terms of Service</a>, and <a href="/guidelines" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline' }}>Review Guidelines</a>. I grant Pumpkin Marketplace the worldwide license to distribute my plugins, acknowledge platform moderation and takedown authority, and confirm my plugins comply with Mojang's Minecraft EULA.
                    </span>
                  </label>
                </div>

                <div className="dev-btn-row-stacked" style={{ marginTop: '1.25rem' }}>
                  <button
                    className="dev-btn dev-btn-primary"
                    disabled={loading || !acceptedTerms || !hasSecureAuth}
                    onClick={() => handleCompleteOnboarding(false)}
                  >
                    {loading ? 'Completing registration...' : t('developer.onboarding.btn_complete')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="dev-monetization-box">
                  <div className="dev-monetization-header">
                    <CreditCard size={22} color="#f97316" />
                    <div>
                      <h4>{t('developer.onboarding.intent_paid')}</h4>
                      <p>{t('developer.onboarding.intent_paid_desc')}</p>
                    </div>
                  </div>
                  <ul className="dev-check-list">
                    <li><CheckCircle2 size={16} color="#10b981" /> Automated payouts directly to your bank account</li>
                    <li><CheckCircle2 size={16} color="#10b981" /> Set custom pricing, discounts, and coupons</li>
                    <li><CheckCircle2 size={16} color="#10b981" /> Automated license key generation for buyers</li>
                  </ul>
                </div>

                {/* ── Security Requirement for Developers ── */}
                {!hasSecureAuth && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <SecuritySetupCards
                      title="Developer Security Requirement"
                      description="To publish plugins and protect developer payouts, you must set up a Passkey or Two-Factor Authentication before completing onboarding."
                      isRequired={true}
                      onComplete={() => {}}
                    />
                  </div>
                )}

                {/* ── Mandatory Legal Consent ── */}
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 183, 77, 0.06)',
                  border: '1px solid rgba(255, 183, 77, 0.25)',
                  borderRadius: 8,
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      style={{ marginTop: '0.15rem', accentColor: '#f97316', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span>
                      I agree to the <a href="/developer-terms" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline', fontWeight: 600 }}>Developer Distribution Agreement</a>, <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline' }}>Terms of Service</a>, and <a href="/guidelines" target="_blank" rel="noopener noreferrer" style={{ color: '#ffb74d', textDecoration: 'underline' }}>Review Guidelines</a>. I grant Pumpkin Marketplace the worldwide license to distribute my plugins, acknowledge platform moderation and takedown authority, and confirm my plugins comply with Mojang's Minecraft EULA.
                    </span>
                  </label>
                </div>

                <div className="dev-btn-row-stacked" style={{ marginTop: '1.25rem' }}>
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
                </div>
              </>
            )}

            <div className="dev-btn-row" style={{ marginTop: '1rem' }}>
              <button className="dev-btn dev-btn-secondary" onClick={prevStep}>{t('developer.onboarding.btn_back')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperOnboardingModal;
