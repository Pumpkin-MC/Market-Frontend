import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCode, Send, CheckCircle, AlertTriangle, Clock, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../App';
import type { PluginData } from './ManagePlugin';
import { validateWasmFile } from '../../../utils/fileValidation';

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
        if (version) fd.append('version', version);
        fd.append('track', track);
        if (releaseNotes) fd.append('release_notes', releaseNotes);

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

    if (published) {
        return (
            <div>
                <div className="mp-tab-header">
                    <h2>Publish Update</h2>
                </div>
                <div className="mp-card" style={{
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', gap:'1rem', padding:'3rem', textAlign:'center'
                }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CheckCircle size={26} color="var(--mp-success)" />
                    </div>
                    <div>
                        <p style={{fontWeight:700, fontSize:'1rem', color:'var(--mp-text)'}}>Update Published!</p>
                        <p style={{fontSize:'0.83rem', color:'var(--mp-text-2)', marginTop:'0.3rem'}}>
                            Your new version has been published successfully to the <strong>{track}</strong> track.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mp-tab-header">
                <h2>Publish Update</h2>
                <p>Ship a new version of your plugin. Choose your release track, upload the binary, and add release notes — like Google Play, but for your plugin marketplace.</p>
            </div>

            {user && !user.totp_enabled && (
                <div className="mp-banner warn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <ShieldAlert size={24} color="#f97316" style={{ flexShrink: 0 }} />
                        <div>
                            <strong style={{ color: '#f97316', display: 'block', fontSize: '0.95rem' }}>Two-Factor Authentication (2FA) Required</strong>
                            <span style={{ fontSize: '0.85rem', color: 'var(--mp-text-2)' }}>
                                To protect servers and prevent unauthorized plugin uploads, 2FA is required before publishing updates.
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="mp-btn mp-btn-primary"
                        style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => navigate('/settings?tab=security')}
                    >
                        <ShieldCheck size={16} /> Enable 2FA →
                    </button>
                </div>
            )}

            {/* ── Release Track ── */}
            <div className="mp-card">
                <div className="mp-card-title">
                    <Send size={14} />
                    Release Track
                </div>
                <div className="mp-tracks">
                    {TRACKS.map(t => (
                        <button
                            key={t.key}
                            type="button"
                            className={`mp-track ${track === t.key ? 'active' : ''}`}
                            onClick={() => setTrack(t.key)}
                        >
                            <div className="mp-track-label">
                                {t.label}
                                <span className={`mp-track-badge ${t.key}`}>{t.key}</span>
                            </div>
                            <div className="mp-track-desc">{t.desc}</div>
                        </button>
                    ))}
                </div>

                {track === 'stable' && (
                    <div className="mp-banner warn" style={{ marginTop: '1rem' }}>
                        <AlertTriangle size={16} style={{flexShrink:0, marginTop:1}} />
                        <span>Production releases are immediately visible to all users. Make sure your build is tested.</span>
                    </div>
                )}
                {track !== 'stable' && (
                    <div className="mp-banner info" style={{ marginTop: '1rem' }}>
                        <Clock size={16} style={{flexShrink:0, marginTop:1}} />
                        <span>Pre-release ({track}) tracks allow community testing before promoting to production.</span>
                    </div>
                )}
            </div>

            {/* ── Version & Notes ── */}
            <div className="mp-card">
                <div className="mp-card-title">
                    <FileCode size={14} />
                    Version Details
                </div>

                <div className="mp-form-group">
                    <label className="mp-label" htmlFor="pluginVersionTag">
                        Version Tag <span style={{color:'var(--mp-text-3)', fontWeight:400}}>(optional — e.g. 1.2.3)</span>
                    </label>
                    <input
                        id="pluginVersionTag"
                        name="version"
                        className="mp-input"
                        type="text"
                        value={version}
                        onChange={e => setVersion(e.target.value)}
                        placeholder="1.0.0"
                        autoComplete="off"
                        spellCheck={false}
                        style={{fontFamily:'var(--font-mono)'}}
                    />
                </div>

                <div className="mp-form-group">
                    <label className="mp-label">Release Notes</label>
                    <textarea
                        className="mp-textarea"
                        rows={5}
                        value={releaseNotes}
                        onChange={e => setReleaseNotes(e.target.value)}
                        placeholder={`What's new in this release?\n\n- Fixed crash on startup\n- Added support for multi-world\n- Improved performance by 30%`}
                    />
                </div>
            </div>

            {/* ── WASM Upload ── */}
            <div className="mp-card">
                <div className="mp-card-title">
                    <Upload size={14} />
                    Plugin Binary
                </div>

                <div
                    className={`mp-dropzone ${dragOver ? 'drag-over' : ''}`}
                    style={{ opacity: validatingWasm ? 0.6 : 1, cursor: validatingWasm ? 'wait' : 'pointer' }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !validatingWasm && document.getElementById('wasm-upload-input')?.click()}
                >
                    <div className="mp-dropzone-icon">
                        <Upload size={20} />
                    </div>
                    <p>
                        {validatingWasm ? (
                            <strong>Validating WebAssembly binary structure…</strong>
                        ) : (
                            <><strong>Drag & drop your .wasm file</strong> or click to browse</>
                        )}
                    </p>
                    <small>.wasm only · max 5 MB · validated on drop</small>
                    <input
                        id="wasm-upload-input"
                        type="file"
                        accept=".wasm"
                        onChange={e => handleFileValidation(e.target.files?.[0] ?? null)}
                    />
                </div>

                {wasmValidationErr && (
                    <div className="mp-banner error" style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={15} color="var(--mp-error)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--mp-error)' }}>{wasmValidationErr}</span>
                    </div>
                )}

                {wasmFile && !wasmValidationErr && (
                    <div className="mp-file-badge" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.06)' }}>
                        <CheckCircle size={15} color="#10b981" />
                        <span style={{ fontWeight: 600, color: 'var(--mp-text-1)' }}>{wasmFile.name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: 4, marginLeft: '0.5rem' }}>
                            Verified {wasmFormatInfo || '.wasm'}
                        </span>
                        <span style={{ marginLeft: 'auto', color: 'var(--mp-text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {(wasmFile.size / 1024).toFixed(1)} KB
                        </span>
                    </div>
                )}
            </div>

            {publishError && (
                <div className="mp-banner error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <Lock size={22} color="#ef4444" style={{ flexShrink: 0 }} />
                        <div>
                            <strong style={{ color: '#ef4444', display: 'block', fontSize: '0.92rem' }}>
                                {publishError.toLowerCase().includes('2fa') || publishError.toLowerCase().includes('two-factor') ? 'Two-Factor Authentication Required' : 'Publish Failed'}
                            </strong>
                            <span style={{ fontSize: '0.83rem', color: 'var(--mp-text-2)' }}>{publishError}</span>
                        </div>
                    </div>
                    {(publishError.toLowerCase().includes('2fa') || publishError.toLowerCase().includes('two-factor') || !user?.totp_enabled) && (
                        <button
                            type="button"
                            className="mp-btn mp-btn-primary"
                            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => navigate('/settings?tab=security')}
                        >
                            <ShieldCheck size={16} /> Enable 2FA →
                        </button>
                    )}
                </div>
            )}

            <div style={{display:'flex', justifyContent:'flex-end', gap:'0.75rem'}}>
                <button
                    className="mp-btn mp-btn-primary"
                    onClick={handlePublish}
                    disabled={!wasmFile || uploading || validatingWasm}
                >
                    <Send size={15} />
                    {uploading ? 'Publishing…' : 'Publish Update'}
                </button>
            </div>
        </div>
    );
};

export default PublishUpdate;
