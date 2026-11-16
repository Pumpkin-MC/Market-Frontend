import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Check,
  Cpu,
  GitFork,
  Key,
  Server,
  ShieldCheck,
} from 'lucide-react';
import api from '../../lib/api';
import SEO from '../../components/SEO';
import '../../styles/account.css';

interface ServerLinkPreview {
  code: string;
  serverName: string;
  serverPublicKey: string;
  serverType: string;
  serverVersion: string;
  minecraftVersion: string | null;
  os: string | null;
  arch: string | null;
  expiresAt: string;
  alreadyLinkedToYou: boolean;
  alreadyLinkedToOther: boolean;
}

const LinkServerPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlCode = searchParams.get('code') || '';
  const [manualCode, setManualCode] = useState(urlCode);
  const [preview, setPreview] = useState<ServerLinkPreview | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(Boolean(urlCode));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!urlCode.trim()) {
      setPreview(null);
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
    const loadPreview = async () => {
      setLoadingPreview(true);
      setError(null);
      try {
        const res = await api.get(`/user/servers/link/${encodeURIComponent(urlCode.trim())}`);
        if (cancelled) return;
        setPreview(res.data);
        setDisplayName(
          res.data.serverName ||
            (res.data.serverType === 'vine'
              ? t('servers.link.default_proxy_name')
              : t('servers.link.default_server_name'))
        );
      } catch (err: any) {
        if (cancelled) return;
        setPreview(null);
        setError(
          err.response?.data?.error ||
            t('servers.link.invalid_code')
        );
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [urlCode, t]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualCode.trim().toUpperCase();
    if (!cleaned) return;
    setSearchParams({ code: cleaned });
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/user/servers/link/confirm', {
        code: preview.code,
        displayName: displayName.trim() || preview.serverName,
      });
      navigate(`/settings?tab=servers&server=${res.data.serverId}`, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          t('servers.link.link_failed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isVine = preview?.serverType === 'vine';
  const shortKey = preview
    ? `${preview.serverPublicKey.slice(0, 12)}…${preview.serverPublicKey.slice(-8)}`
    : '';

  return (
    <div className="ac-auth">
      <SEO
        title={t(isVine ? 'servers.link.seo_title_proxy' : 'servers.link.seo_title')}
        description={t('servers.link.seo_description')}
      />
      <div className="panel panel-fg ac-card" style={{ maxWidth: '34rem' }}>
        <div className="ac-card-head">
          <span className={`ac-badge ${isVine ? 'ac-badge-vine' : ''}`}>
            {isVine ? <GitFork /> : <Server />}
          </span>
          <h1 className="h1">
            <Trans
              t={t}
              i18nKey={isVine ? 'servers.link.title_proxy' : 'servers.link.title'}
              components={{ mark: <span className="mark" /> }}
            />
          </h1>
          <p className="small">
            {t(isVine ? 'servers.link.subtitle_proxy' : 'servers.link.subtitle')}
          </p>
        </div>

        {loadingPreview ? (
          <div className="stack" style={{ alignItems: 'center', padding: '1.5rem 0' }}>
            <span className="loading" />
            <p className="small">{t('servers.link.verifying')}</p>
          </div>
        ) : !preview ? (
          <form className="stack" onSubmit={handleLookupSubmit}>
            {error && (
              <div className="notice notice-danger ac-alert" role="alert">
                <span className="mark-box mark-box-danger">
                  <AlertCircle />
                </span>
                <p className="notice-text">{error}</p>
              </div>
            )}

            <div className="panel" style={{ padding: '0.875rem 1rem' }}>
              <p className="small" style={{ margin: 0 }}>
                <Trans t={t} i18nKey="servers.link.console_hint" components={{ code: <code /> }} />
              </p>
            </div>

            <label className="field" htmlFor="serverLinkCode">
              <span className="field-label">{t('servers.link.code_label')}</span>
              <span className="control">
                <input
                  id="serverLinkCode"
                  className="input ac-code ac-code-sm"
                  type="text"
                  placeholder="ABCD-EF23"
                  maxLength={12}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  autoFocus
                  required
                />
              </span>
            </label>

            <button type="submit" className="button button-primary button-lg button-block">
              {t('auth.verify_code')}
            </button>

            <p className="ac-card-foot small">
              <Link to="/settings?tab=servers" className="link">
                {t('servers.link.back_to_servers')}
              </Link>
            </p>
          </form>
        ) : (
          <form className="stack" onSubmit={handleConfirm}>
            {error && (
              <div className="notice notice-danger ac-alert" role="alert">
                <span className="mark-box mark-box-danger">
                  <AlertCircle />
                </span>
                <p className="notice-text">{error}</p>
              </div>
            )}

            <div className="notice notice-success ac-alert">
              <span className="mark-box mark-box-success">
                <ShieldCheck />
              </span>
              <p className="notice-text">
                <Trans
                  t={t}
                  i18nKey={
                    isVine
                      ? 'servers.link.signature_verified_proxy'
                      : 'servers.link.signature_verified'
                  }
                  values={{ key: shortKey }}
                  components={{ strong: <strong />, code: <code /> }}
                />
              </p>
            </div>

            {preview.alreadyLinkedToOther && (
              <div className="notice ac-alert">
                <span className="mark-box">
                  <AlertCircle />
                </span>
                <p className="notice-text">
                  {t(
                    isVine
                      ? 'servers.link.transfer_warning_proxy'
                      : 'servers.link.transfer_warning'
                  )}
                </p>
              </div>
            )}

            <div className="panel" style={{ padding: '1rem' }}>
              <div className="stack" style={{ gap: '0.5rem' }}>
                <div className="row small">
                  <span className="muted">
                    {isVine ? (
                      <GitFork size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    ) : (
                      <Server size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    )}
                    {t('servers.link.software')}
                  </span>
                  <span className="spacer" />
                  <span className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
                    {isVine && (
                      <span className="sticker sticker-sm ac-sticker-vine">
                        {t('servers.link.proxy_badge')}
                      </span>
                    )}
                    <strong>
                      {isVine ? 'Vine' : 'Pumpkin'} {preview.serverVersion}
                      {preview.minecraftVersion ? ` (MC ${preview.minecraftVersion})` : ''}
                    </strong>
                  </span>
                </div>
                {(preview.os || preview.arch) && (
                  <div className="row small">
                    <span className="muted">
                      <Cpu size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                      {t('servers.link.platform')}
                    </span>
                    <span className="spacer" />
                    <span>{[preview.os, preview.arch].filter(Boolean).join(' • ')}</span>
                  </div>
                )}
                <div className="row small">
                  <span className="muted">
                    <Key size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    {t('servers.link.identity_key')}
                  </span>
                  <span className="spacer" />
                  <code>{shortKey}</code>
                </div>
              </div>
            </div>

            <label className="field" htmlFor="displayName">
              <span className="field-label">{t('servers.link.display_name')}</span>
              <span className="control">
                <input
                  id="displayName"
                  className="input"
                  type="text"
                  maxLength={64}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t(
                    isVine
                      ? 'servers.link.display_name_placeholder_proxy'
                      : 'servers.link.display_name_placeholder'
                  )}
                  required
                />
              </span>
              <span className="field-hint">
                {t(
                  isVine
                    ? 'servers.link.display_name_hint_proxy'
                    : 'servers.link.display_name_hint'
                )}
              </span>
            </label>

            <button
              type="submit"
              className="button button-primary button-lg button-block"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                t(isVine ? 'servers.link.linking_proxy' : 'servers.link.linking')
              ) : (
                <>
                  <Check />
                  <span>
                    {preview.alreadyLinkedToYou
                      ? t(
                          isVine
                            ? 'servers.link.update_linked_proxy'
                            : 'servers.link.update_linked'
                        )
                      : t(isVine ? 'servers.link.confirm_link_proxy' : 'servers.link.confirm_link')}
                  </span>
                </>
              )}
            </button>

            <p className="ac-card-foot small">
              <Link to="/settings?tab=servers" className="link">
                {t('common.cancel')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LinkServerPage;
