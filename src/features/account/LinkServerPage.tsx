import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
            (res.data.serverType === 'vine' ? 'Vine Proxy' : 'Pumpkin Server')
        );
      } catch (err: any) {
        if (cancelled) return;
        setPreview(null);
        setError(
          err.response?.data?.error ||
            'Invalid or expired link code. Run `pumpkin link` or `vine link` in your console again.'
        );
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [urlCode]);

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
          'Failed to link node. Please generate a fresh `pumpkin link` or `vine link` code.'
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
        title={isVine ? 'Link Vine Proxy' : 'Link Server'}
        description="Connect your Pumpkin server or Vine proxy to your Pumpkin Account for live telemetry, network topology, and server management."
      />
      <div className="panel panel-fg ac-card" style={{ maxWidth: '34rem' }}>
        <div className="ac-card-head">
          <span className={`ac-badge ${isVine ? 'ac-badge-vine' : ''}`}>
            {isVine ? <GitFork /> : <Server />}
          </span>
          <h1 className="h1">
            Link <span className="mark">{isVine ? 'Vine Proxy' : 'Server'}</span>
          </h1>
          <p className="small">
            {isVine
              ? 'Connect your Vine proxy to your Pumpkin Account to visualize your multi-server routing tree and monitor live proxy traffic.'
              : 'Connect your Pumpkin server or Vine proxy to your Pumpkin Account for live telemetry, crash monitoring, and network topology.'}
          </p>
        </div>

        {loadingPreview ? (
          <div className="stack" style={{ alignItems: 'center', padding: '1.5rem 0' }}>
            <span className="loading" />
            <p className="small">Verifying cryptographic Ed25519 signature…</p>
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
                Run <code>pumpkin link</code> in your Pumpkin server console or{' '}
                <code>vine link</code> in your Vine proxy console to generate an 8-character claim code.
              </p>
            </div>

            <label className="field" htmlFor="serverLinkCode">
              <span className="field-label">Server / Proxy Link Code</span>
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
              Verify Code
            </button>

            <p className="ac-card-foot small">
              <Link to="/settings?tab=servers" className="link">
                ← Back to Your Servers
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
                <strong>Ed25519 Signature Verified</strong> — Key <code>{shortKey}</code> proved possession of{' '}
                <code>{isVine ? '.vine/identity.key' : '.pumpkin/identity.key'}</code>.
              </p>
            </div>

            {preview.alreadyLinkedToOther && (
              <div className="notice ac-alert">
                <span className="mark-box">
                  <AlertCircle />
                </span>
                <p className="notice-text">
                  This {isVine ? 'proxy' : 'server'} key was previously linked to another account. Confirming will transfer ownership to your Pumpkin Account.
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
                    Software
                  </span>
                  <span className="spacer" />
                  <span className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
                    {isVine && <span className="sticker sticker-sm ac-sticker-vine">Proxy</span>}
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
                      Platform
                    </span>
                    <span className="spacer" />
                    <span>{[preview.os, preview.arch].filter(Boolean).join(' • ')}</span>
                  </div>
                )}
                <div className="row small">
                  <span className="muted">
                    <Key size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                    Identity Key
                  </span>
                  <span className="spacer" />
                  <code>{shortKey}</code>
                </div>
              </div>
            </div>

            <label className="field" htmlFor="displayName">
              <span className="field-label">Display Name</span>
              <span className="control">
                <input
                  id="displayName"
                  className="input"
                  type="text"
                  maxLength={64}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isVine ? 'EU Edge Vine Proxy' : 'My Pumpkin Survival Server'}
                  required
                />
              </span>
              <span className="field-hint">
                {isVine
                  ? 'Shown in your network topology graph and Pumpkin Account dashboard. You can rename it anytime.'
                  : 'Shown in your Pumpkin Account telemetry dashboard. You can rename it anytime.'}
              </span>
            </label>

            <button
              type="submit"
              className="button button-primary button-lg button-block"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                isVine ? 'Linking Vine Proxy…' : 'Linking Server…'
              ) : (
                <>
                  <Check />
                  <span>
                    {preview.alreadyLinkedToYou
                      ? isVine
                        ? 'Update Linked Proxy'
                        : 'Update Linked Server'
                      : isVine
                        ? 'Confirm & Link Vine Proxy'
                        : 'Confirm & Link Server'}
                  </span>
                </>
              )}
            </button>

            <p className="ac-card-foot small">
              <Link to="/settings?tab=servers" className="link">
                Cancel
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LinkServerPage;
