import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCodeList } from 'country-list';
import {
  Check, CheckCircle2, ChevronRight,
  AlertCircle, CreditCard, Gift, User, Building2, X,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { SecuritySetupCards } from '../../components/SecuritySetupCards';
import { Select } from '../../components/Select';
import '../../styles/studio.css';

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

  const [legalName, setLegalName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [vatId, setVatId] = useState('');
  const [country, setCountry] = useState(user?.country || '');

  const [supportEmail, setSupportEmail] = useState(user?.email || '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const steps = [
    { num: 1, label: t('developer.onboarding.step_account_type') },
    { num: 2, label: t('developer.onboarding.step_name') },
    { num: 3, label: t('developer.onboarding.step_monetization') },
    { num: 4, label: t('developer.onboarding.step_links') },
    { num: 5, label: t('developer.onboarding.step_finish') },
  ];

  const orgOptions = [
    { value: 'company', label: 'Company / Studio' },
    { value: 'nonprofit', label: 'Non-profit / Open Source' },
    { value: 'education', label: 'Educational Institution' },
    { value: 'other', label: 'Other entity' },
  ];

  const countryOptions = Object.entries(getCodeList()).map(([code, name]) => ({ value: code, label: name }));

  const content = (
    <>
      <div className="sheet-head">
        <div className="st-head-text st-onb-title">
          <h2 className="h2">{t('developer.onboarding.title')}</h2>
          <p className="small">
            {isSellingPaid
              ? t('developer.onboarding.subtitle_paid')
              : t('developer.onboarding.subtitle_free')}
          </p>
        </div>
        {!embedded && onClose && (
          <button type="button" className="button button-ghost button-icon" onClick={onClose} aria-label="Close modal"><X /></button>
        )}
      </div>

      <div className="sheet-body">
        <ol className="st-onb-steps">
          {steps.map(s => (
            <li key={s.num}>
              <button
                type="button"
                className="st-onb-step"
                aria-current={step === s.num ? 'step' : undefined}
                data-done={step > s.num || undefined}
                onClick={() => {
                  if (step > s.num) setStep(s.num);
                }}
              >
                <span className="st-onb-num">{step > s.num ? <Check /> : s.num}</span>
                <span className="st-onb-step-label">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>

        {error && (
          <div className="notice notice-danger">
            <span className="mark-box mark-box-danger"><AlertCircle /></span>
            <p className="notice-text">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="st-pick">
            <div
              className="st-option st-onb-card"
              data-selected={entityType === 'individual' || undefined}
              onClick={() => setEntityType('individual')}
            >
              <User />
              <strong>{t('developer.onboarding.individual_title')}</strong>
              <span className="small">{t('developer.onboarding.individual_desc')}</span>
              <button
                type="button"
                className="button button-primary button-sm st-onb-go"
                onClick={(e) => {
                  e.stopPropagation();
                  setEntityType('individual');
                  nextStep();
                }}
              >
                {t('developer.onboarding.btn_get_started')}<ChevronRight />
              </button>
            </div>

            <div
              className="st-option st-onb-card"
              data-selected={entityType === 'organization' || undefined}
              onClick={() => setEntityType('organization')}
            >
              <Building2 />
              <strong>{t('developer.onboarding.org_title')}</strong>
              <span className="small">{t('developer.onboarding.org_desc')}</span>
              <div className="field" onClick={(e) => e.stopPropagation()}>
                <span className="field-label" id="orgTypeSelect">{t('developer.onboarding.org_type_label')}</span>
                <Select
                  options={orgOptions}
                  value={orgType}
                  placeholder={t('developer.onboarding.org_type_placeholder')}
                  aria-labelledby="orgTypeSelect"
                  onChange={v => {
                    setOrgType(v);
                    setEntityType('organization');
                  }}
                />
              </div>
              <button
                type="button"
                className="button button-primary button-sm st-onb-go"
                disabled={!orgType}
                onClick={(e) => {
                  e.stopPropagation();
                  setEntityType('organization');
                  nextStep();
                }}
              >
                {t('developer.onboarding.btn_get_started')}<ChevronRight />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <div className="st-tab-head">
              <h3 className="h3">{t('developer.onboarding.dev_name_title')}</h3>
              <p className="small">{t('developer.onboarding.dev_name_desc')}</p>
            </div>

            <label className="field">
              <span className="field-label">{t('developer.onboarding.display_name_label')}</span>
              <span className="control">
                <input
                  id="onboardingDisplayName"
                  name="displayName"
                  type="text"
                  className="input"
                  aria-invalid={nameError ? true : undefined}
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
              </span>
              {nameError ? (
                <span className="field-error"><AlertCircle size={14} />{nameError}</span>
              ) : (
                <span className="field-hint">{t('developer.onboarding.display_name_hint')}</span>
              )}
            </label>

            <div className="row st-onb-actions">
              <button type="button" className="button button-ghost" onClick={prevStep}>
                {t('developer.onboarding.btn_back')}
              </button>
              <span className="spacer" />
              <button
                type="button"
                className="button button-primary"
                disabled={!isStep2Valid}
                onClick={handleStep2Next}
              >
                {nameChecking ? 'Checking...' : t('developer.onboarding.btn_continue')}<ChevronRight />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <span className="field-label">{t('developer.onboarding.plan_paid_question')}</span>

            <div className="st-pick">
              <label className="st-option st-onb-card" data-selected={isSellingPaid === false || undefined}>
                <input
                  type="radio"
                  name="planPaidChoice"
                  checked={isSellingPaid === false}
                  onChange={() => setIsSellingPaid(false)}
                  className="st-onb-hidden"
                />
                <Gift />
                <strong>{t('developer.onboarding.option_no')}</strong>
                <span className="small">{t('developer.onboarding.intent_free_desc')}</span>
              </label>

              <label className="st-option st-onb-card" data-selected={isSellingPaid === true || undefined}>
                <input
                  type="radio"
                  name="planPaidChoice"
                  checked={isSellingPaid === true}
                  onChange={() => setIsSellingPaid(true)}
                  className="st-onb-hidden"
                />
                <CreditCard />
                <strong>{t('developer.onboarding.option_yes')}</strong>
                <span className="small">{t('developer.onboarding.intent_paid_desc')}</span>
              </label>
            </div>

            {isSellingPaid === true && (
              <div className="fields st-cols-2">
                <label className="field">
                  <span className="field-label">{t('developer.onboarding.legal_name_label')}</span>
                  <span className="control">
                    <input
                      id="onboardingLegalName"
                      name="legalName"
                      type="text"
                      className="input"
                      value={legalName}
                      onChange={e => setLegalName(e.target.value)}
                      placeholder={entityType === 'individual' ? 'First and Last Name' : 'Legal Company Name Inc.'}
                      autoComplete="name"
                      required
                    />
                  </span>
                </label>

                <label className="field">
                  <span className="field-label">{t('developer.onboarding.street_label')}</span>
                  <span className="control">
                    <input
                      id="onboardingStreetAddress"
                      name="streetAddress"
                      type="text"
                      className="input"
                      value={streetAddress}
                      onChange={e => setStreetAddress(e.target.value)}
                      placeholder="123 Main St, Suite 400"
                      autoComplete="street-address"
                      required
                    />
                  </span>
                </label>

                <label className="field">
                  <span className="field-label">{t('developer.onboarding.city_label')}</span>
                  <span className="control">
                    <input
                      id="onboardingCity"
                      name="city"
                      type="text"
                      className="input"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="City"
                      autoComplete="address-level2"
                      required
                    />
                  </span>
                </label>

                <label className="field">
                  <span className="field-label">{t('developer.onboarding.postal_label')}</span>
                  <span className="control">
                    <input
                      id="onboardingPostalCode"
                      name="postalCode"
                      type="text"
                      className="input"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      placeholder="10001"
                      autoComplete="postal-code"
                      required
                    />
                  </span>
                </label>

                <div className="field">
                  <span className="field-label" id="onboardingCountry">{t('developer.onboarding.country_label')}</span>
                  <Select
                    options={countryOptions}
                    value={country}
                    onChange={setCountry}
                    placeholder="Select country..."
                    aria-labelledby="onboardingCountry"
                  />
                </div>

                <label className="field">
                  <span className="field-label">{t('developer.onboarding.vat_label')}</span>
                  <span className="control">
                    <input
                      id="onboardingVatId"
                      name="vatId"
                      type="text"
                      className="input"
                      value={vatId}
                      onChange={e => setVatId(e.target.value)}
                      placeholder="EU123456789 or Tax ID"
                      autoComplete="off"
                    />
                  </span>
                </label>
              </div>
            )}

            <div className="row st-onb-actions">
              <button type="button" className="button button-ghost" onClick={prevStep}>
                {t('developer.onboarding.btn_back')}
              </button>
              <span className="spacer" />
              <button
                type="button"
                className="button button-primary"
                disabled={!isStep3Valid}
                onClick={nextStep}
              >
                {t('developer.onboarding.btn_continue')}<ChevronRight />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="stack">
            <div className="fields st-cols-2">
              <label className="field st-span">
                <span className="field-label">{t('developer.onboarding.support_email_label')} *</span>
                <span className="control">
                  <input
                    id="onboardingSupportEmail"
                    name="supportEmail"
                    type="email"
                    className="input"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    placeholder="support@yourdomain.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="field">
                <span className="field-label">{t('developer.onboarding.website_label')}</span>
                <span className="control">
                  <input
                    id="onboardingWebsiteUrl"
                    name="websiteUrl"
                    type="url"
                    className="input"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    autoComplete="url"
                  />
                </span>
              </label>

              <label className="field">
                <span className="field-label">{t('developer.onboarding.github_label')}</span>
                <span className="control">
                  <input
                    id="onboardingGithubUrl"
                    name="githubUrl"
                    type="text"
                    className="input"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yourname"
                    autoComplete="url"
                  />
                </span>
              </label>
            </div>

            <div className="row st-onb-actions">
              <button type="button" className="button button-ghost" onClick={prevStep}>{t('developer.onboarding.btn_back')}</button>
              <span className="spacer" />
              <button
                type="button"
                className="button button-primary"
                disabled={!supportEmail.trim()}
                onClick={nextStep}
              >
                {t('developer.onboarding.btn_continue')}<ChevronRight />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="stack">
            <div className={`notice ${isSellingPaid ? 'notice-pumpkin' : 'notice-success'}`}>
              <span className={`sticker sticker-sm ${isSellingPaid ? '' : 'sticker-success'}`}>
                {!isSellingPaid ? 'Free Uploads' : 'Paid Plugins'}
              </span>
              <p className="notice-text">
                <strong>{!isSellingPaid ? 'Free Creator Profile' : 'Commercial Seller Profile'}</strong>
                <span className="st-onb-meta">Display: <strong>{displayName}</strong> • Email: <strong>{supportEmail}</strong></span>
              </p>
            </div>

            {hasSecureAuth ? (
              <div className="notice notice-plain">
                <span className="mark-box mark-box-success"><CheckCircle2 /></span>
                <p className="notice-text"><strong>Security Verified:</strong> 2FA / Passkey protection is active on your account.</p>
              </div>
            ) : (
              <SecuritySetupCards
                compact={true}
                title="Developer Security Requirement"
                description="To publish plugins, set up Passkey or 2FA Authenticator before finishing."
                isRequired={true}
                onComplete={async () => {
                  if (refreshUser) await refreshUser();
                }}
              />
            )}

            <label className="choice">
              <input
                type="checkbox"
                className="check"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
              />
              <span className="small">
                I agree to the <a className="link link-pumpkin" href="/developer-terms" target="_blank" rel="noopener noreferrer">Developer Distribution Agreement</a>, <a className="link link-pumpkin" href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>, and <a className="link link-pumpkin" href="/guidelines" target="_blank" rel="noopener noreferrer">Review Guidelines</a>. I grant Pumpkin Market license to distribute my plugins and confirm compliance with Mojang's Minecraft EULA.
              </span>
            </label>

            <div className="row st-onb-actions">
              <button type="button" className="button button-ghost" onClick={prevStep}>
                {t('developer.onboarding.btn_back')}
              </button>
              <span className="spacer" />
              {isSellingPaid ? (
                <>
                  <button
                    type="button"
                    className="button"
                    disabled={loading || !acceptedTerms || !hasSecureAuth}
                    onClick={() => handleCompleteOnboarding(false)}
                  >
                    {t('developer.onboarding.btn_complete')}
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={loading || !acceptedTerms || !hasSecureAuth}
                    onClick={() => handleCompleteOnboarding(true)}
                  >
                    <CreditCard />{loading ? 'Connecting Payouts...' : t('developer.onboarding.btn_connect_stripe')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button button-primary"
                  disabled={loading || !acceptedTerms || !hasSecureAuth}
                  onClick={() => handleCompleteOnboarding(false)}
                >
                  {loading ? 'Completing registration...' : t('developer.onboarding.btn_complete')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="panel st-onb">{content}</div>;
  }

  return (
    <div className="overlay">
      <div className="sheet st-sheet st-onb" role="dialog" aria-modal="true">
        {content}
      </div>
    </div>
  );
};

export default DeveloperOnboardingModal;
