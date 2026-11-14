import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCodeList } from 'country-list';
import {
  Check, CheckCircle2, ChevronRight,
  AlertCircle, CreditCard, Gift, User, Building2, X, Upload, Trash2,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { validateAndSanitizeImage } from '../../lib/fileValidation';
import { SecuritySetupCards } from '../../components/SecuritySetupCards';
import { Select } from '../../components/Select';
import '../../styles/studio.css';
import { useDialog } from '../../hooks/useDialog';

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
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarBusy(true);
    setError(null);
    try {
      const validation = await validateAndSanitizeImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        minWidth: 32,
        minHeight: 32,
        quality: 0.88,
      });
      if (!validation.valid || !validation.file) {
        setError(validation.error || t('profile.avatar_invalid'));
        return;
      }

      const fd = new FormData();
      fd.append('avatar', validation.file);
      const res = await api.post('/user/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.token) {
        login(res.data.token);
      }
      refreshUser?.();
    } catch (err: any) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : err.response?.data?.error || t('profile.avatar_upload_failed');
      setError(msg);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarBusy(true);
    setError(null);
    try {
      const res = await api.delete('/user/avatar');
      if (res.data?.token) {
        login(res.data.token);
      }
      refreshUser?.();
    } catch (err: any) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : err.response?.data?.error || t('profile.avatar_remove_failed');
      setError(msg);
    } finally {
      setAvatarBusy(false);
    }
  };

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
  const dialog = useDialog<HTMLDivElement>(!embedded && isOpen, embedded ? undefined : onClose);

  if (!embedded && !isOpen) return null;

  const handleCompleteOnboarding = async (connectStripe: boolean) => {
    if (!acceptedTerms) {
      setError(t('studio.onboarding.accept_terms_required'));
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
      setError(err.response?.data?.error || t('studio.onboarding.complete_failed'));
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
      setNameError(err.response?.data?.error || t('studio.onboarding.verify_name_failed'));
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
    { value: 'company', label: t('studio.onboarding.org_company') },
    { value: 'nonprofit', label: t('studio.onboarding.org_nonprofit') },
    { value: 'education', label: t('studio.onboarding.org_education') },
    { value: 'other', label: t('studio.onboarding.org_other') },
  ];

  const countryOptions = Object.entries(getCodeList()).map(([code, name]) => ({ value: code, label: name }));

  const content = (
    <>
      <div className="sheet-head">
        <div className="st-head-text st-onb-title">
          <h2 className="h2" id="st-onb-title">{t('developer.onboarding.title')}</h2>
          <p className="small">
            {isSellingPaid
              ? t('developer.onboarding.subtitle_paid')
              : t('developer.onboarding.subtitle_free')}
          </p>
        </div>
        {!embedded && onClose && (
          <button type="button" className="button button-ghost button-icon" onClick={onClose} aria-label={t('common.close')}><X /></button>
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

            <div className="row" style={{ gap: 'var(--s-4)', alignItems: 'center' }}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
              <span className="avatar avatar-xl">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={displayName || user?.username || ''} />
                ) : (
                  (displayName || user?.username || '?').charAt(0).toUpperCase()
                )}
              </span>
              <div className="stack" style={{ gap: 4 }}>
                <span className="field-label">{t('studio.onboarding.avatar_label')}</span>
                <span className="field-hint">{t('studio.onboarding.avatar_hint')}</span>
                <div className="row" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="button button-sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarBusy}
                  >
                    <Upload size={14} />
                    {avatarBusy ? t('studio.onboarding.uploading') : user?.avatar_url ? t('studio.onboarding.change_picture') : t('studio.onboarding.upload_picture')}
                  </button>
                  {user?.avatar_url && (
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={handleAvatarRemove}
                      disabled={avatarBusy}
                    >
                      <Trash2 size={14} />
                      {t('studio.onboarding.remove_picture')}
                    </button>
                  )}
                </div>
              </div>
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
                {nameChecking ? t('studio.onboarding.checking') : t('developer.onboarding.btn_continue')}<ChevronRight />
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
                      placeholder={entityType === 'individual' ? t('studio.onboarding.legal_name_individual_placeholder') : t('studio.onboarding.legal_name_org_placeholder')}
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
                      placeholder={t('profile.developer.street_placeholder')}
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
                      placeholder={t('studio.settings.city')}
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
                    placeholder={t('studio.onboarding.select_country')}
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
                      placeholder={t('profile.developer.tax_id_placeholder')}
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
                    placeholder={t('profile.developer.support_email_placeholder')}
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
                {!isSellingPaid ? t('studio.onboarding.badge_free') : t('studio.onboarding.badge_paid')}
              </span>
              <p className="notice-text">
                <strong>{!isSellingPaid ? t('studio.onboarding.profile_free') : t('studio.onboarding.profile_paid')}</strong>
                <span className="st-onb-meta">{t('studio.onboarding.meta_display')} <strong>{displayName}</strong> • {t('studio.onboarding.meta_email')} <strong>{supportEmail}</strong></span>
              </p>
            </div>

            {hasSecureAuth ? (
              <div className="notice notice-plain">
                <span className="mark-box mark-box-success"><CheckCircle2 /></span>
                <p className="notice-text"><strong>{t('studio.onboarding.security_verified_title')}</strong> {t('studio.onboarding.security_verified_desc')}</p>
              </div>
            ) : (
              <SecuritySetupCards
                compact={true}
                title={t('studio.onboarding.security_req_title')}
                description={t('studio.onboarding.security_req_desc')}
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
                {t('studio.onboarding.terms_prefix')} <a className="link link-pumpkin" href="/developer-terms" target="_blank" rel="noopener noreferrer">{t('studio.onboarding.terms_dda')}</a>, <a className="link link-pumpkin" href="/terms" target="_blank" rel="noopener noreferrer">{t('studio.onboarding.terms_tos')}</a>, {t('studio.onboarding.terms_and')} <a className="link link-pumpkin" href="/guidelines" target="_blank" rel="noopener noreferrer">{t('studio.onboarding.terms_guidelines')}</a>. {t('studio.onboarding.terms_suffix')}
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
                    <CreditCard />{loading ? t('studio.onboarding.connecting_payouts') : t('developer.onboarding.btn_connect_stripe')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button button-primary"
                  disabled={loading || !acceptedTerms || !hasSecureAuth}
                  onClick={() => handleCompleteOnboarding(false)}
                >
                  {loading ? t('studio.onboarding.completing_registration') : t('developer.onboarding.btn_complete')}
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
      <div ref={dialog} tabIndex={-1} className="sheet st-sheet st-onb" role="dialog" aria-modal="true" aria-labelledby="st-onb-title">
        {content}
      </div>
    </div>
  );
};

export default DeveloperOnboardingModal;
