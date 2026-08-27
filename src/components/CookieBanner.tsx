import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Cookie, Shield, Check, X, Sliders, Lock } from 'lucide-react';
import {
  getStoredConsent,
  saveConsent,
  applyConsent,
  type CookieConsent,
} from '../utils/consent';
import './CookieBanner.css';

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
      {/* ── Cookie Consent Banner ── */}
      {showBanner && (
        <div className="cookie-banner-overlay" role="region" aria-label="Cookie consent banner">
          <div className="cookie-banner-container">
            <div className="cookie-banner-content">
              <Cookie className="cookie-banner-icon" size={24} />
              <div>
                <p className="cookie-banner-title">{t('cookie.banner_title')}</p>
                <p className="cookie-banner-text">
                  {t('cookie.banner_desc')}{' '}
                  <Link to="/privacy" className="cookie-banner-link">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>

            <div className="cookie-banner-actions">
              <button
                type="button"
                className="cookie-btn cookie-btn-outline"
                onClick={() => setShowModal(true)}
              >
                <Sliders size={14} />
                {t('cookie.customize')}
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-secondary"
                onClick={handleRejectNonEssential}
              >
                {t('cookie.reject_non_essential')}
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-primary"
                onClick={handleAcceptAll}
              >
                <Check size={14} />
                {t('cookie.accept_all')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cookie Preferences Modal ── */}
      {showModal && (
        <div
          className="cookie-modal-backdrop"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
        >
          <div className="cookie-modal" onClick={e => e.stopPropagation()}>
            <div className="cookie-modal-header">
              <h2 id="cookie-modal-title" className="cookie-modal-title">
                <Shield size={20} color="#ff6b00" />
                Privacy & Cookie Preferences
              </h2>
              <button
                type="button"
                className="cookie-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close preferences"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cookie-modal-body">
              <p className="cookie-modal-intro">
                Customize your cookie settings below. Strictly necessary cookies are required for authentication,
                security, and basic site functionality and cannot be disabled.
              </p>

              {/* Category 1: Strictly Necessary */}
              <div className="cookie-category-card">
                <div className="cookie-category-header">
                  <div className="cookie-category-title-group">
                    <Lock size={16} color="#ff8c00" />
                    <p className="cookie-category-name">Strictly Necessary Cookies & Storage</p>
                  </div>
                  <span className="cookie-badge-required">Always Active</span>
                </div>
                <p className="cookie-category-desc">
                  Essential for security, user authentication sessions, bot protection (Cloudflare Turnstile), and
                  remembering your preferences (such as selected language and currency).
                </p>
                <div className="cookie-category-meta">
                  <strong>Providers:</strong> PumpkinMarket, Cloudflare · <strong>Storage:</strong> LocalStorage & Session Tokens
                </div>
              </div>

              {/* Category 2: Analytics & Performance */}
              <div className="cookie-category-card">
                <div className="cookie-category-header">
                  <div className="cookie-category-title-group">
                    <Cookie size={16} color="#60a5fa" />
                    <p className="cookie-category-name">Analytics & Performance Cookies</p>
                  </div>
                  <label className="cookie-switch">
                    <input
                      type="checkbox"
                      checked={analyticsAllowed}
                      onChange={e => setAnalyticsAllowed(e.target.checked)}
                      aria-label="Toggle analytics cookies"
                    />
                    <span className="cookie-slider" />
                  </label>
                </div>
                <p className="cookie-category-desc">
                  Collects anonymous aggregated statistical data about site usage (pages viewed, session lengths) to help
                  us optimize Marketplace features and discover popular plugins. IP addresses are masked and anonymized.
                </p>
                <div className="cookie-category-meta">
                  <strong>Provider:</strong> Google Analytics 4 (IP Anonymized) · <strong>Retention:</strong> Up to 14 months
                </div>
              </div>
            </div>

            <div className="cookie-modal-footer">
              <button
                type="button"
                className="cookie-btn cookie-btn-secondary"
                onClick={handleRejectNonEssential}
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-primary"
                onClick={handleSaveCustom}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
