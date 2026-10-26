import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCode, Send, CheckCircle, AlertTriangle, Clock, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../app/auth';
import type { PluginData } from './ManagePluginPage';
import { validateWasmFile } from '../../../lib/fileValidation';

type Props = { plugin: PluginData; onSaved: () => void };

const TRACKS = [
    { key: 'stable', label: 'Production (Stable)', desc: 'Available to all users across the marketplace.' },
    { key: 'beta',   label: 'Beta',               desc: 'Public beta release for community testing.' },
    { key: 'alpha',  label: 'Alpha / Testing',    desc: 'Early access build for testers.' },
] as const;

const PublishUpdate = ({ plugin, onSaved }: Props) => {
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
                setWasmValidationErr(res.error || 'Invalid WebAssembly binary.');
                setWasmFile(null);
                setWasmFormatInfo(null);
                return;
            }
            setWasmFile(file);
            setWasmFormatInfo(res.details?.format || 'WebAssembly Binary');
            setWasmValidationErr(null);
        } catch (err: any) {
            setWasmValidationErr(err.message || 'Failed to inspect file.');
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
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Publish failed. Please check your inputs and try again.';
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
                    <h2 className="h1">Publish Update</h2>
                </header>
                <div className="blank">
                    <span className="mark-box mark-box-success st-mark-lg"><CheckCircle /></span>
                    <p className="h2">Update Published!</p>
                    <p className="small">
                        Your new version has been published successfully to the <strong>{track}</strong> track.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">Publish Update</h2>
                <p className="small">Ship a new version of your plugin. Choose your release track, upload the binary, and add release notes.</p>
            </header>

            {user && !user.totp_enabled && (
                <div className="notice notice-warning">
                    <span className="mark-box mark-box-warning"><ShieldAlert /></span>
                    <p className="notice-text">
                        <strong>Two-Factor Authentication (2FA) Required.</strong>{' '}
                        To protect servers and prevent unauthorized plugin uploads, 2FA is required before publishing updates.
                    </p>
                    <button
                        type="button"
                        className="button button-sm"
                        onClick={() => navigate('/settings?tab=security')}
                    >
                        <ShieldCheck /> Enable 2FA →
                    </button>
                </div>
            )}

            <section className="panel">
                <div className="panel-head">
                    <Send size={16} className="pumpkin" />
                    <h3 className="h3">Release Track</h3>
                </div>
                <div className="panel-body stack">
                    <div className="st-pick">
                        {TRACKS.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                className="st-option"
                                aria-pressed={track === t.key}
                                onClick={() => setTrack(t.key)}
                            >
                                <span className="row st-tight">
                                    <strong>{t.label}</strong>
                                    <span className={`tag ${t.key === 'stable' ? 'tag-success' : t.key === 'beta' ? 'tag-warning' : 'tag-pumpkin'}`}>{t.key}</span>
                                </span>
                                <span className="small">{t.desc}</span>
                            </button>
                        ))}
                    </div>

                    {track === 'stable' ? (
                        <p className="status small">
                            <span className="mark-box mark-box-warning"><AlertTriangle /></span>
                            Production releases are immediately visible to all users. Make sure your build is tested.
                        </p>
                    ) : (
                        <p className="status small">
                            <span className="mark-box st-mark-info"><Clock /></span>
                            Pre-release ({track}) tracks allow community testing before promoting to production.
                        </p>
                    )}
                </div>
            </section>

            <section className="panel">
                <div className="panel-head">
                    <FileCode size={16} className="pumpkin" />
                    <h3 className="h3">Version Details</h3>
                </div>
                <div className="panel-body fields">
                    <label className="field">
                        <span className="field-label">Version Tag <em>(optional — e.g. 1.2.3)</em></span>
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
                        <span className="field-label">Release Notes</span>
                        <span className="control">
                            <textarea
                                className="input"
                                rows={5}
                                value={releaseNotes}
                                onChange={e => setReleaseNotes(e.target.value)}
                                placeholder={`What's new in this release?\n\n- Fixed crash on startup\n- Added support for multi-world\n- Improved performance by 30%`}
                            />
                        </span>
                    </label>
                </div>
            </section>

            <section className="panel">
                <div className="panel-head">
                    <Upload size={16} className="pumpkin" />
                    <h3 className="h3">Plugin Binary</h3>
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
                                <strong>Validating WebAssembly binary structure…</strong>
                            ) : (
                                <><strong>Drag & drop your .wasm file</strong> or click to browse</>
                            )}
                        </p>
                        <span className="small">.wasm only · max 5 MB · validated on drop</span>
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
                            <span className="tag tag-success">Verified {wasmFormatInfo || '.wasm'}</span>
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
                        <strong>{twoFaError ? 'Two-Factor Authentication Required' : 'Publish Failed'}</strong>
                        <span className="ledger-sub">{publishError}</span>
                    </p>
                    {(twoFaError || !user?.totp_enabled) && (
                        <button
                            type="button"
                            className="button button-sm"
                            onClick={() => navigate('/settings?tab=security')}
                        >
                            <ShieldCheck /> Enable 2FA →
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
                    {uploading ? 'Publishing…' : 'Publish Update'}
                </button>
            </div>
        </div>
    );
};

export default PublishUpdate;
