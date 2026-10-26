import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
        <div className="sf-cookie" role="region" aria-label="Cookie consent banner">
          <span className="sticker hide-sm">
            <Cookie size={14} />
          </span>
          <div className="stack sf-cookie-copy">
            <p className="h3">{t('cookie.banner_title')}</p>
            <p className="small">
              {t('cookie.banner_desc')}{' '}
              <Link to="/privacy" className="link link-pumpkin">
                Privacy Policy
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
                <h2 id="cookie-modal-title" className="h2">Privacy & Cookie Preferences</h2>
              </div>
              <button
                type="button"
                className="button button-ghost button-icon"
                onClick={() => setShowModal(false)}
                aria-label="Close preferences"
              >
                <X />
              </button>
            </div>

            <div className="sheet-body">
              <p className="small">
                Customize your cookie settings below. Strictly necessary cookies are required for authentication,
                security, and basic site functionality and cannot be disabled.
              </p>

              <div className="panel">
                <div className="panel-head">
                  <Lock className="pumpkin" />
                  <p className="h3">Strictly Necessary Cookies & Storage</p>
                  <span className="tag tag-solid tag-success">Always Active</span>
                </div>
                <div className="panel-body">
                  <p className="small">
                    Essential for security, user authentication sessions, bot protection (Cloudflare Turnstile), and
                    remembering your preferences (such as selected language and currency).
                  </p>
                  <p className="small">
                    <strong>Providers:</strong> PumpkinMarket, Cloudflare · <strong>Storage:</strong> LocalStorage & Session Tokens
                  </p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <Cookie className="pumpkin" />
                  <p className="h3">Analytics & Performance Cookies</p>
                  <input
                    type="checkbox"
                    role="switch"
                    className="toggle"
                    checked={analyticsAllowed}
                    onChange={e => setAnalyticsAllowed(e.target.checked)}
                    aria-label="Toggle analytics cookies"
                  />
                </div>
                <div className="panel-body">
                  <p className="small">
                    Collects anonymous aggregated statistical data about site usage (pages viewed, session lengths) to help
                    us optimize Marketplace features and discover popular plugins. IP addresses are masked and anonymized.
                  </p>
                  <p className="small">
                    <strong>Provider:</strong> Google Analytics 4 (IP Anonymized) · <strong>Retention:</strong> Up to 14 months
                  </p>
                </div>
              </div>
            </div>

            <div className="sheet-foot">
              <button type="button" className="button button-ghost" onClick={handleRejectNonEssential}>
                Reject Non-Essential
              </button>
              <button type="button" className="button button-primary" onClick={handleSaveCustom}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
