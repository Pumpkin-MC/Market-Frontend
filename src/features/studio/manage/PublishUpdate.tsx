import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCode, Send, CheckCircle, AlertTriangle, Clock, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../app/auth';
import type { PluginData } from './ManagePluginPage';
import { validateWasmFile } from '../../../lib/fileValidation';

type Props = { plugin: PluginData; onSaved: () => void };

const PublishUpdate = ({ plugin, onSaved }: Props) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const TRACKS = [
        { key: 'stable', label: t('studio.update.track_stable_label'), desc: t('studio.update.track_stable_desc') },
        { key: 'beta',   label: t('studio.update.track_beta_label'),   desc: t('studio.update.track_beta_desc') },
        { key: 'alpha',  label: t('studio.update.track_alpha_label'),  desc: t('studio.update.track_alpha_desc') },
    ] as const;
    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [wasmValidationErr, setWasmValidationErr] = useState<string | null>(null);
    const [wasmFormatInfo, setWasmFormatInfo]       = useState<string | null>(null);
    const [detectedApiVersion, setDetectedApiVersion] = useState<string | null>(null);
    const [validatingWasm, setValidatingWasm]       = useState(false);
    const [version, setVersion] = useState('');
    const [track, setTrack] = useState<'stable' | 'beta' | 'alpha'>('stable');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [published, setPublished] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);

    const handleFileValidation = async (file: File | null) => {
        if (!file) {
            setWasmFile(null);
            setWasmValidationErr(null);
            setWasmFormatInfo(null);
            setDetectedApiVersion(null);
            return;
        }
        setValidatingWasm(true);
        setWasmValidationErr(null);
        try {
            const res = await validateWasmFile(file);
            if (!res.valid) {
                setWasmValidationErr(res.error || t('studio.update.invalid_wasm'));
                setWasmFile(null);
                setWasmFormatInfo(null);
                setDetectedApiVersion(null);
                return;
            }
            setWasmFile(file);
            setWasmFormatInfo(res.details?.format || t('studio.update.wasm_binary'));
            setDetectedApiVersion(res.details?.apiVersion || null);
            if (res.details?.pluginVersion && !version.trim()) {
                setVersion(res.details.pluginVersion);
            }
            setWasmValidationErr(null);
        } catch (err: any) {
            setWasmValidationErr(err.message || t('studio.update.inspect_failed'));
            setWasmFile(null);
            setWasmFormatInfo(null);
            setDetectedApiVersion(null);
        } finally {
            setValidatingWasm(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileValidation(file);
    };

    const handlePublish = async () => {
        if (!wasmFile) return;
        setUploading(true);
        setPublishError(null);
        const fd = new FormData();
        fd.append('wasm', wasmFile);
        const metadata = {
            version: version || undefined,
            track,
            releaseNotes: releaseNotes || undefined,
        };
        fd.append('metadata', JSON.stringify(metadata));

        try {
            await api.put(`/plugins/${plugin.id}`, fd);
            setPublished(true);
            onSaved();
            setTimeout(() => {
                setPublished(false);
                setWasmFile(null);
                setDetectedApiVersion(null);
                setVersion('');
                setReleaseNotes('');
            }, 3000);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || t('studio.update.publish_failed');
            setPublishError(msg);
        } finally {
            setUploading(false);
        }
    };

    const twoFaError = publishError ? (publishError.toLowerCase().includes('2fa') || publishError.toLowerCase().includes('two-factor')) : false;

    if (published) {
        return (
            <div className="st-tab">
                <header className="st-tab-head">
                    <h2 className="h1">{t('studio.update.title')}</h2>
                </header>
                <div className="blank">
                    <span className="mark-box mark-box-success st-mark-lg"><CheckCircle /></span>
                    <p className="h2">{t('studio.update.published_title')}</p>
                    <p className="small">
                        {t('studio.update.published_desc', { track })}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('studio.update.title')}</h2>
                <p className="small">{t('studio.update.subtitle')}</p>
            </header>

            {user && !user.totp_enabled && (
                <div className="notice notice-warning">
                    <span className="mark-box mark-box-warning"><ShieldAlert /></span>
                    <p className="notice-text">
                        <strong>{t('studio.update.tfa_required_title')}</strong>{' '}
                        {t('studio.update.tfa_required_desc')}
                    </p>
                    <button
                        type="button"
                        className="button button-sm"
                        onClick={() => navigate('/settings?tab=security')}
                    >
                        <ShieldCheck /> {t('studio.listing.enable_tfa')}
                    </button>
                </div>
            )}

            <section className="panel">
                <div className="panel-head">
                    <Send size={16} className="pumpkin" />
                    <h3 className="h3">{t('studio.update.release_track')}</h3>
                </div>
                <div className="panel-body stack">
                    <div className="st-pick">
                        {TRACKS.map(tr => (
                            <button
                                key={tr.key}
                                type="button"
                                className="st-option"
                                aria-pressed={track === tr.key}
                                onClick={() => setTrack(tr.key)}
                            >
                                <span className="row st-tight">
                                    <strong>{tr.label}</strong>
                                    <span className={`tag ${tr.key === 'stable' ? 'tag-success' : tr.key === 'beta' ? 'tag-warning' : 'tag-pumpkin'}`}>{tr.key}</span>
                                </span>
                                <span className="small">{tr.desc}</span>
                            </button>
                        ))}
                    </div>

                    {track === 'stable' ? (
                        <p className="status small">
                            <span className="mark-box mark-box-warning"><AlertTriangle /></span>
                            {t('studio.update.stable_warning')}
                        </p>
                    ) : (
                        <p className="status small">
                            <span className="mark-box st-mark-info"><Clock /></span>
                            {t('studio.update.prerelease_notice', { track })}
                        </p>
                    )}
                </div>
            </section>

            <section className="panel">
                <div className="panel-head">
                    <FileCode size={16} className="pumpkin" />
                    <h3 className="h3">{t('studio.update.version_details')}</h3>
                </div>
                <div className="panel-body fields">
                    <label className="field">
                        <span className="field-label">{t('studio.update.version_tag')} <em>{t('studio.update.version_tag_hint')}</em></span>
                        <span className="control st-narrow">
                            <input
                                id="pluginVersionTag"
                                name="version"
                                className="input mono"
                                type="text"
                                value={version}
                                onChange={e => setVersion(e.target.value)}
                                placeholder="1.0.0"
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </span>
                    </label>
                    <label className="field">
                        <span className="field-label">{t('studio.update.release_notes')}</span>
                        <span className="control">
                            <textarea
                                className="input"
                                rows={5}
                                value={releaseNotes}
                                onChange={e => setReleaseNotes(e.target.value)}
                                placeholder={t('studio.update.release_notes_placeholder')}
                            />
                        </span>
                    </label>
                </div>
            </section>

            <section className="panel">
                <div className="panel-head">
                    <Upload size={16} className="pumpkin" />
                    <h3 className="h3">{t('studio.update.plugin_binary')}</h3>
                </div>
                <div className="panel-body stack">
                    <div
                        className="st-drop"
                        data-active={dragOver || undefined}
                        aria-busy={validatingWasm}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => !validatingWasm && document.getElementById('wasm-upload-input')?.click()}
                    >
                        {validatingWasm ? <span className="loading" /> : <Upload />}
                        <p>
                            {validatingWasm ? (
                                <strong>{t('studio.update.validating_wasm')}</strong>
                            ) : (
                                <strong>{t('studio.update.drop_wasm')}</strong>
                            )}
                        </p>
                        <span className="small">{t('studio.update.wasm_hint')}</span>
                        <input
                            id="wasm-upload-input"
                            type="file"
                            accept=".wasm"
                            onChange={e => handleFileValidation(e.target.files?.[0] ?? null)}
                        />
                    </div>

                    {wasmValidationErr && (
                        <span className="field-error"><AlertTriangle size={14} />{wasmValidationErr}</span>
                    )}

                    {wasmFile && !wasmValidationErr && (
                        <div className="st-file">
                            <span className="mark-box mark-box-success"><CheckCircle /></span>
                            <strong className="st-file-name">{wasmFile.name}</strong>
                            <span className="tag tag-success">{t('studio.update.verified_wasm', { format: wasmFormatInfo || '.wasm' })}</span>
                            {detectedApiVersion && (
                                <span className="tag tag-pumpkin">
                                    Pumpkin API v{detectedApiVersion}
                                </span>
                            )}
                            <span className="spacer" />
                            <span className="mono small">{(wasmFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                    )}
                </div>
            </section>

            {publishError && (
                <div className="notice notice-danger">
                    <span className="mark-box mark-box-danger"><Lock /></span>
                    <p className="notice-text">
                        <strong>{twoFaError ? t('studio.listing.tfa_required') : t('studio.update.publish_failed')}</strong>
                        <span className="ledger-sub">{publishError}</span>
                    </p>
                    {(twoFaError || !user?.totp_enabled) && (
                        <button
                            type="button"
                            className="button button-sm"
                            onClick={() => navigate('/settings?tab=security')}
                        >
                            <ShieldCheck /> {t('studio.listing.enable_tfa')}
                        </button>
                    )}
                </div>
            )}

            <div className="row">
                <span className="spacer" />
                <button
                    className="button button-primary"
                    onClick={handlePublish}
                    disabled={!wasmFile || uploading || validatingWasm}
                    aria-busy={uploading}
                >
                    <Send />
                    {uploading ? t('studio.update.publishing') : t('studio.update.title')}
                </button>
            </div>
        </div>
    );
};

export default PublishUpdate;
