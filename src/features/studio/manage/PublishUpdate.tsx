import { Trans, useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCode, Send, CheckCircle, AlertTriangle, Clock, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';
import api from '../../../lib/api';
import { translateApiMessage } from '../../../lib/apiMessages';
import { useAuth } from '../../../app/auth';
import type { PluginData } from './ManagePluginPage';
import { validateWasmFile } from '../../../lib/fileValidation';

type Props = { plugin: PluginData; onSaved: () => void };



const PublishUpdate = ({ plugin, onSaved }: Props) => {
    const { t } = useTranslation();
    const trackLabels = {
        stable: t('developer.update.track_stable'),
        beta: t('developer.update.track_beta'),
        alpha: t('developer.update.track_alpha'),
    };
    const TRACKS = [
        { key: 'stable', label: t('developer.update.stable_label'), desc: t('developer.update.stable_desc') },
        { key: 'beta',   label: t('developer.update.beta'),               desc: t('developer.update.beta_desc') },
        { key: 'alpha',  label: t('developer.update.alpha_label'),    desc: t('developer.update.alpha_desc') },
    ] as const;
    const { user } = useAuth();
    const navigate = useNavigate();
    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [wasmValidationErr, setWasmValidationErr] = useState<string | null>(null);
    const [wasmFormatInfo, setWasmFormatInfo]       = useState<string | null>(null);
    const [validatingWasm, setValidatingWasm]       = useState(false);
    const [version, setVersion] = useState('');
    const [track, setTrack] = useState<'stable' | 'beta' | 'alpha'>('stable');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [published, setPublished] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const formatLabel = wasmFormatInfo === 'Core Module (v1)'
        ? t('developer.update.format_core')
        : wasmFormatInfo === 'Component Model (WIT / Preview 2)'
            ? t('developer.update.format_component')
            : wasmFormatInfo === 'WebAssembly Binary'
                ? t('developer.update.format_binary')
                : wasmFormatInfo || '.wasm';

    const handleFileValidation = async (file: File | null) => {
        if (!file) {
            setWasmFile(null);
            setWasmValidationErr(null);
            setWasmFormatInfo(null);
            return;
        }
        setValidatingWasm(true);
        setWasmValidationErr(null);
        try {
            const res = await validateWasmFile(file);
            if (!res.valid) {
                setWasmValidationErr(res.error || t('developer.update.invalid_binary'));
                setWasmFile(null);
                setWasmFormatInfo(null);
                return;
            }
            setWasmFile(file);
            setWasmFormatInfo(res.details?.format || 'WebAssembly Binary');
            setWasmValidationErr(null);
        } catch (err: any) {
            setWasmValidationErr(translateApiMessage(t, err.message, t('developer.update.inspection_failed')));
            setWasmFile(null);
            setWasmFormatInfo(null);
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
                setVersion('');
                setReleaseNotes('');
            }, 3000);
        } catch (err: any) {
            const msg = translateApiMessage(t, err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null), t('developer.update.publish_failed_desc'));
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
                    <h2 className="h1">{t('developer.dashboard.publish_update')}</h2>
                </header>
                <div className="blank">
                    <span className="mark-box mark-box-success st-mark-lg"><CheckCircle /></span>
                    <p className="h2">{t('developer.update.published_title')}</p>
                    <p className="small">
                        <Trans t={t} i18nKey="developer.update.published_description" components={{ track: <strong>{trackLabels[track]}</strong> }} />
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('developer.dashboard.publish_update')}</h2>
                <p className="small">{t('developer.update.subtitle')}</p>
            </header>

            {user && !user.totp_enabled && (
                <div className="notice notice-warning">
                    <span className="mark-box mark-box-warning"><ShieldAlert /></span>
                    <p className="notice-text">
                        <Trans t={t} i18nKey="developer.update.security_required" components={{ strong: <strong /> }} />
                    </p>
                    <button
                        type="button"
                        className="button button-sm"
                        onClick={() => navigate('/settings?tab=security')}
                    >
                        <ShieldCheck />{' '}{t('developer.dashboard.enable_2fa')}</button>
                </div>
            )}

            <section className="panel">
                <div className="panel-head">
                    <Send size={16} className="pumpkin" />
                    <h3 className="h3">{t('developer.update.release_track')}</h3>
                </div>
                <div className="panel-body stack">
                    <div className="st-pick">
                        {TRACKS.map(option => (
                            <button
                                key={option.key}
                                type="button"
                                className="st-option"
                                aria-pressed={track === option.key}
                                onClick={() => setTrack(option.key)}
                            >
                                <span className="row st-tight">
                                    <strong>{option.label}</strong>
                                    <span className={`tag ${option.key === 'stable' ? 'tag-success' : option.key === 'beta' ? 'tag-warning' : 'tag-pumpkin'}`}>{trackLabels[option.key]}</span>
                                </span>
                                <span className="small">{option.desc}</span>
                            </button>
                        ))}
                    </div>

                    {track === 'stable' ? (
                        <p className="status small">
                            <span className="mark-box mark-box-warning"><AlertTriangle /></span>{t('developer.update.production_notice')}</p>
                    ) : (
                        <p className="status small">
                            <span className="mark-box st-mark-info"><Clock /></span>
                            {t('developer.update.prerelease_description', { track: trackLabels[track] })}
                        </p>
                    )}
                </div>
            </section>

            <section className="panel">
                <div className="panel-head">
                    <FileCode size={16} className="pumpkin" />
                    <h3 className="h3">{t('developer.update.version_details')}</h3>
                </div>
                <div className="panel-body fields">
                    <label className="field">
                        <span className="field-label"><Trans t={t} i18nKey="developer.update.version_tag" components={{ optional: <em /> }} /></span>
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
                        <span className="field-label">{t('developer.update.release_notes')}</span>
                        <span className="control">
                            <textarea
                                className="input"
                                rows={5}
                                value={releaseNotes}
                                onChange={e => setReleaseNotes(e.target.value)}
                                placeholder={t('developer.update.release_notes_placeholder')}
                            />
                        </span>
                    </label>
                </div>
            </section>

            <section className="panel">
                <div className="panel-head">
                    <Upload size={16} className="pumpkin" />
                    <h3 className="h3">{t('developer.update.plugin_binary')}</h3>
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
                                <strong>{t('developer.update.validating_binary')}</strong>
                            ) : (
                                <Trans t={t} i18nKey="developer.update.drop_file" components={{ strong: <strong /> }} />
                            )}
                        </p>
                        <span className="small">{t('developer.update.binary_hint')}</span>
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
                            <span className="tag tag-success">{t('developer.update.verified_format', { format: formatLabel })}</span>
                            <span className="spacer" />
                            <span className="mono small">{(wasmFile.size / 1024).toFixed(1)}{' '}{t('developer.update.kb')}</span>
                        </div>
                    )}
                </div>
            </section>

            {publishError && (
                <div className="notice notice-danger">
                    <span className="mark-box mark-box-danger"><Lock /></span>
                    <p className="notice-text">
                        <strong>{twoFaError ? t('developer.dashboard.security_required') : t('developer.update.publish_failed_title')}</strong>
                        <span className="ledger-sub">{publishError}</span>
                    </p>
                    {(twoFaError || !user?.totp_enabled) && (
                        <button
                            type="button"
                            className="button button-sm"
                            onClick={() => navigate('/settings?tab=security')}
                        >
                            <ShieldCheck />{' '}{t('developer.dashboard.enable_2fa')}</button>
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
                    {uploading ? t('developer.dashboard.publishing') : t('developer.dashboard.publish_update')}
                </button>
            </div>
        </div>
    );
};

export default PublishUpdate;
