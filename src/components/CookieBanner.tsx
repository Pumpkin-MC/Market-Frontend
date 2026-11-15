import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Cookie, Shield, Check, X, Sliders, Lock } from 'lucide-react';
import {
  getStoredConsent,
  saveConsent,
  applyConsent,
  type CookieConsent,
} from '../lib/consent';
import '../styles/store.css';

export const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      setShowBanner(true);
      applyConsent(null);
    } else {
      setAnalyticsAllowed(consent.analytics);
      applyConsent(consent);
    }

    const handleOpenModal = () => {
      const current = getStoredConsent();
      if (current) {
        setAnalyticsAllowed(current.analytics);
      }
      setShowModal(true);
    };

    const handleConsentUpdated = (e: CustomEvent<CookieConsent>) => {
      setAnalyticsAllowed(e.detail.analytics);
    };

    window.addEventListener('open-cookie-preferences', handleOpenModal);
    window.addEventListener('cookie-consent-updated', handleConsentUpdated as EventListener);

    return () => {
      window.removeEventListener('open-cookie-preferences', handleOpenModal);
      window.removeEventListener('cookie-consent-updated', handleConsentUpdated as EventListener);
    };
  }, []);

  const handleAcceptAll = () => {
    saveConsent(true);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleRejectNonEssential = () => {
    saveConsent(false);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSaveCustom = () => {
    saveConsent(analyticsAllowed);
    setShowBanner(false);
    setShowModal(false);
  };

  return (
    <>
      {showBanner && (
        <div className="sf-cookie" role="region" aria-label={t('cookie.banner_label')}>
          <span className="sticker hide-sm">
            <Cookie size={14} />
          </span>
          <div className="stack sf-cookie-copy">
            <p className="h3">{t('cookie.banner_title')}</p>
            <p className="small">
              {t('cookie.banner_desc')}{' '}
              <Link to="/privacy" className="link link-pumpkin">
                {t('cookie.privacy_policy')}
              </Link>
            </p>
          </div>

          <div className="row sf-cookie-actions">
            <button type="button" className="button button-ghost button-sm" onClick={() => setShowModal(true)}>
              <Sliders />
              {t('cookie.customize')}
            </button>
            <button type="button" className="button button-sm" onClick={handleRejectNonEssential}>
              {t('cookie.reject_non_essential')}
            </button>
            <button type="button" className="button button-primary button-sm" onClick={handleAcceptAll}>
              <Check />
              {t('cookie.accept_all')}
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="overlay sf-modal"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
        >
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <div className="stack">
                <span className="sticker sticker-sm"><Shield size={12} /></span>
                <h2 id="cookie-modal-title" className="h2">{t('cookie.preferences_title')}</h2>
              </div>
              <button
                type="button"
                className="button button-ghost button-icon"
                onClick={() => setShowModal(false)}
                aria-label={t('cookie.close_preferences')}
              >
                <X />
              </button>
            </div>

            <div className="sheet-body">
              <p className="small">
                {t('cookie.preferences_desc')}
              </p>

              <div className="panel">
                <div className="panel-head">
                  <Lock className="pumpkin" />
                  <p className="h3">{t('cookie.necessary_title')}</p>
                  <span className="tag tag-solid tag-success">{t('cookie.always_active')}</span>
                </div>
                <div className="panel-body">
                  <p className="small">
                    {t('cookie.necessary_desc')}
                  </p>
                  <p className="small">
                    <Trans t={t} i18nKey="cookie.necessary_details" components={{ providers: <strong />, storage: <strong /> }} />
                  </p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <Cookie className="pumpkin" />
                  <p className="h3">{t('cookie.analytics_title')}</p>
                  <input
                    type="checkbox"
                    role="switch"
                    className="toggle"
                    checked={analyticsAllowed}
                    onChange={e => setAnalyticsAllowed(e.target.checked)}
                    aria-label={t('cookie.toggle_analytics')}
                  />
                </div>
                <div className="panel-body">
                  <p className="small">
                    {t('cookie.analytics_desc')}
                  </p>
                  <p className="small">
                    <Trans t={t} i18nKey="cookie.analytics_details" components={{ provider: <strong />, retention: <strong /> }} />
                  </p>
                </div>
              </div>
            </div>

            <div className="sheet-foot">
              <button type="button" className="button button-ghost" onClick={handleRejectNonEssential}>
                {t('cookie.reject_optional')}
              </button>
              <button type="button" className="button button-primary" onClick={handleSaveCustom}>
                {t('cookie.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
