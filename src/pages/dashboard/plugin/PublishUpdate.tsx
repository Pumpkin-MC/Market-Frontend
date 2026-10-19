import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCode, Send, CheckCircle, AlertTriangle, Clock, ShieldAlert, ShieldCheck, Lock, Cpu, Layers, Plus, X, History } from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../App';
import type { PluginData } from './ManagePlugin';
import { validateWasmFile } from '../../../utils/fileValidation';
import {
    KNOWN_PUMPKIN_RELEASES,
    KNOWN_PLUGIN_API_VERSIONS,
    getNormalizedPluginVersions,
    appendCompatibilityToReleaseNotes,
    cleanReleaseNotes,
} from '../../../utils/compatibility';

type Props = { plugin: PluginData; onSaved: () => void };

const TRACKS = [
    { key: 'stable', label: 'Production (Stable)', desc: 'Available to all users across the marketplace.' },
    { key: 'beta',   label: 'Beta',               desc: 'Public beta release for community testing.' },
    { key: 'alpha',  label: 'Alpha / Testing',    desc: 'Early access build for testers.' },
] as const;

const PublishUpdate = ({ plugin, onSaved }: Props) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const existingVersions = useMemo(() => getNormalizedPluginVersions(plugin), [plugin]);
    const latestExisting = existingVersions[0];

    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [wasmValidationErr, setWasmValidationErr] = useState<string | null>(null);
    const [wasmFormatInfo, setWasmFormatInfo]       = useState<string | null>(null);
    const [detectedWasmApi, setDetectedWasmApi]     = useState<string[]>([]);
    const [validatingWasm, setValidatingWasm]       = useState(false);
    const [version, setVersion] = useState('');
    const [track, setTrack] = useState<'stable' | 'beta' | 'alpha'>('stable');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [pumpkinVersions, setPumpkinVersions] = useState<string[]>(
        () => latestExisting?.pumpkinVersions ?? []
    );
    const [customPumpkinInput, setCustomPumpkinInput] = useState('');
    const [apiVersions, setApiVersions] = useState<string[]>(
        () => latestExisting?.apiVersions ?? []
    );
    const [customApiInput, setCustomApiInput] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [published, setPublished] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);

    const toggleVersionItem = (_list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        const cleaned = item.trim().replace(/^v(?=\d)/i, '');
        if (!cleaned) return;
        setList(prev => prev.includes(cleaned) ? prev.filter(v => v !== cleaned) : [...prev, cleaned]);
    };

    const addCustomVersionItem = (
        input: string,
        setInput: React.Dispatch<React.SetStateAction<string>>,
        setList: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        const tokens = input
            .split(/[,;]+/)
            .map(s => s.trim().replace(/^v(?=\d)/i, ''))
            .filter(Boolean);
        if (tokens.length === 0) return;
        setList(prev => {
            const next = [...prev];
            for (const tok of tokens) {
                if (!next.includes(tok)) next.push(tok);
            }
            return next;
        });
        setInput('');
    };

    const handleFileValidation = async (file: File | null) => {
        if (!file) {
            setWasmFile(null);
            setWasmValidationErr(null);
            setWasmFormatInfo(null);
            setDetectedWasmApi([]);
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
                setDetectedWasmApi([]);
                return;
            }
            setWasmFile(file);
            setWasmFormatInfo(res.details?.format || 'WebAssembly Binary');
            const detected = res.details?.detectedApiVersions ?? [];
            setDetectedWasmApi(detected);
            if (detected.length > 0) {
                setApiVersions(prev => {
                    const merged = [...prev];
                    for (const ver of detected) {
                        if (!merged.includes(ver)) merged.push(ver);
                    }
                    return merged;
                });
            }
            setWasmValidationErr(null);
        } catch (err: any) {
            setWasmValidationErr(err.message || 'Failed to inspect file.');
            setWasmFile(null);
            setWasmFormatInfo(null);
            setDetectedWasmApi([]);
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

        const enrichedReleaseNotes = appendCompatibilityToReleaseNotes(
            releaseNotes,
            pumpkinVersions,
            apiVersions
        );

        const metadata = {
            version: version.trim().replace(/^v(?=\d)/i, '') || undefined,
            track,
            releaseNotes: enrichedReleaseNotes || undefined,
            pumpkinVersions: pumpkinVersions.length > 0 ? pumpkinVersions : undefined,
            apiVersions: apiVersions.length > 0 ? apiVersions : undefined,
            pumpkin_versions: pumpkinVersions.length > 0 ? pumpkinVersions : undefined,
            api_versions: apiVersions.length > 0 ? apiVersions : undefined,
        };
        fd.append('metadata', JSON.stringify(metadata));

        try {
            await api.put(`/plugins/${plugin.id}`, fd);
            setPublished(true);
            onSaved();
            setTimeout(() => {
                setPublished(false);
                setWasmFile(null);
                setDetectedWasmApi([]);
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
                            Your new version has been published successfully to the <strong>{track}</strong> track. Previous releases remain available in version history.
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
                <p>Ship a new version of your plugin. Choose your release track, specify Pumpkin &amp; Plugin API compatibility, and upload the binary.</p>
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
                        Version Tag <span style={{color:'var(--mp-text-3)', fontWeight:400}}>(e.g. 1.2.3)</span>
                    </label>
                    <input
                        id="pluginVersionTag"
                        name="version"
                        className="mp-input"
                        type="text"
                        value={version}
                        onChange={e => setVersion(e.target.value)}
                        placeholder={latestExisting ? `Current: ${latestExisting.version.replace(/^v/i, '')}` : '1.0.0'}
                        autoComplete="off"
                        spellCheck={false}
                        style={{fontFamily:'var(--font-mono)'}}
                    />
                </div>

                <div className="mp-form-group" style={{ marginBottom: 0 }}>
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

            {/* ── Pumpkin & Plugin API Compatibility ── */}
            <div className="mp-card">
                <div className="mp-card-title">
                    <Layers size={14} />
                    Pumpkin &amp; Plugin API Compatibility
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--mp-text-3)', marginBottom: '1rem', lineHeight: 1.5 }}>
                    Specify which tagged Pumpkin server releases and Plugin API versions this build supports. Plugin API versions can be specified independently of tagged Pumpkin releases (including intermediate API versions between releases).
                </p>

                {/* Supported Pumpkin Releases */}
                <div className="mp-form-group">
                    <label className="mp-label">
                        Supported Pumpkin Releases{' '}
                        <span style={{ color: 'var(--mp-text-3)', fontWeight: 400 }}>(select presets or add custom tag)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                        {KNOWN_PUMPKIN_RELEASES.map(rel => {
                            const active = pumpkinVersions.includes(rel);
                            return (
                                <button
                                    key={rel}
                                    type="button"
                                    onClick={() => toggleVersionItem(pumpkinVersions, setPumpkinVersions, rel)}
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.73rem',
                                        padding: '0.28rem 0.6rem',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        border: active ? '1px solid rgba(255, 117, 24, 0.55)' : '1px solid var(--mp-border)',
                                        background: active ? 'rgba(255, 117, 24, 0.14)' : 'var(--mp-surface-2)',
                                        color: active ? '#ff7518' : 'var(--mp-text-2)',
                                        fontWeight: active ? 600 : 400,
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {active ? '✓ ' : '+ '}{rel}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="mp-input"
                            placeholder="Add custom Pumpkin version or tag (e.g. 0.2.1, 0.3.0-rc1)"
                            value={customPumpkinInput}
                            onChange={e => setCustomPumpkinInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomVersionItem(customPumpkinInput, setCustomPumpkinInput, setPumpkinVersions);
                                }
                            }}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flex: 1 }}
                        />
                        <button
                            type="button"
                            className="mp-btn mp-btn-outline"
                            onClick={() => addCustomVersionItem(customPumpkinInput, setCustomPumpkinInput, setPumpkinVersions)}
                            disabled={!customPumpkinInput.trim()}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            <Plus size={13} /> Add
                        </button>
                    </div>

                    {pumpkinVersions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
                            {pumpkinVersions.map(ver => (
                                <span
                                    key={ver}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: 'rgba(255, 117, 24, 0.12)',
                                        border: '1px solid rgba(255, 117, 24, 0.35)',
                                        color: '#ff7518',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: 5,
                                    }}
                                >
                                    Pumpkin {ver}
                                    <button
                                        type="button"
                                        onClick={() => toggleVersionItem(pumpkinVersions, setPumpkinVersions, ver)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                                        title="Remove version"
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Supported Plugin API Versions */}
                <div className="mp-form-group" style={{ marginBottom: 0 }}>
                    <label className="mp-label">
                        Supported Plugin API Versions{' '}
                        <span style={{ color: 'var(--mp-text-3)', fontWeight: 400 }}>(auto-detected from .wasm WIT metadata or custom semver)</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                        {KNOWN_PLUGIN_API_VERSIONS.map(apiVer => {
                            const active = apiVersions.includes(apiVer);
                            return (
                                <button
                                    key={apiVer}
                                    type="button"
                                    onClick={() => toggleVersionItem(apiVersions, setApiVersions, apiVer)}
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.73rem',
                                        padding: '0.28rem 0.6rem',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        border: active ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid var(--mp-border)',
                                        background: active ? 'rgba(56, 189, 248, 0.14)' : 'var(--mp-surface-2)',
                                        color: active ? '#38bdf8' : 'var(--mp-text-2)',
                                        fontWeight: active ? 600 : 400,
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {active ? '✓ ' : '+ '}API {apiVer}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="mp-input"
                            placeholder="Add Plugin API version (e.g. 0.2.1-dev, 0.3.0)"
                            value={customApiInput}
                            onChange={e => setCustomApiInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomVersionItem(customApiInput, setCustomApiInput, setApiVersions);
                                }
                            }}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flex: 1 }}
                        />
                        <button
                            type="button"
                            className="mp-btn mp-btn-outline"
                            onClick={() => addCustomVersionItem(customApiInput, setCustomApiInput, setApiVersions)}
                            disabled={!customApiInput.trim()}
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            <Plus size={13} /> Add
                        </button>
                    </div>

                    {apiVersions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
                            {apiVersions.map(ver => (
                                <span
                                    key={ver}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: 'rgba(56, 189, 248, 0.12)',
                                        border: '1px solid rgba(56, 189, 248, 0.35)',
                                        color: '#38bdf8',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: 5,
                                    }}
                                >
                                    <Cpu size={11} /> API {ver}
                                    {detectedWasmApi.includes(ver) && (
                                        <span style={{ fontSize: '0.62rem', opacity: 0.85 }}>(auto-detected)</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => toggleVersionItem(apiVersions, setApiVersions, ver)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                                        title="Remove API version"
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
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
                    <small>.wasm only · max 5 MB · validated &amp; inspected for Plugin API version on drop</small>
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
                    <div className="mp-file-badge" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.06)', flexWrap: 'wrap' }}>
                        <CheckCircle size={15} color="#10b981" />
                        <span style={{ fontWeight: 600, color: 'var(--mp-text-1)' }}>{wasmFile.name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: 4, marginLeft: '0.5rem' }}>
                            Verified {wasmFormatInfo || '.wasm'}
                        </span>
                        {detectedWasmApi.length > 0 && (
                            <span style={{ fontSize: '0.68rem', color: '#38bdf8', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                                Detected Plugin API {detectedWasmApi.map(v => `v${v}`).join(', ')}
                            </span>
                        )}
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

            <div style={{display:'flex', justifyContent:'flex-end', gap:'0.75rem', marginBottom: existingVersions.length > 0 ? '1.5rem' : 0}}>
                <button
                    className="mp-btn mp-btn-primary"
                    onClick={handlePublish}
                    disabled={!wasmFile || uploading || validatingWasm}
                >
                    <Send size={15} />
                    {uploading ? 'Publishing…' : 'Publish Update'}
                </button>
            </div>

            {/* ── Published Releases History ── */}
            {existingVersions.length > 0 && (
                <div className="mp-card">
                    <div className="mp-card-title">
                        <History size={14} />
                        Published Releases ({existingVersions.length})
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--mp-text-3)', marginBottom: '0.85rem' }}>
                        Older releases remain available for download when new versions are published.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {existingVersions.map(v => {
                            const notes = cleanReleaseNotes(v.release_notes);
                            return (
                                <div
                                    key={v.id || v.version}
                                    style={{
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: 8,
                                        background: 'var(--mp-surface-2)',
                                        border: v.isLatest ? '1px solid rgba(255, 117, 24, 0.35)' : '1px solid var(--mp-border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.4rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--mp-text-1)' }}>
                                            {v.displayVersion}
                                        </span>
                                        {v.isLatest && (
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                                                Latest
                                            </span>
                                        )}
                                        <span className={`mp-track-badge ${v.track || 'stable'}`} style={{ fontSize: '0.65rem' }}>
                                            {v.track || 'stable'}
                                        </span>
                                        {v.pumpkinVersions.map(pv => (
                                            <span key={`p-${pv}`} style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4, background: 'rgba(255, 117, 24, 0.12)', color: '#ff7518', border: '1px solid rgba(255, 117, 24, 0.3)' }}>
                                                Pumpkin {pv}
                                            </span>
                                        ))}
                                        {v.apiVersions.map(av => (
                                            <span key={`a-${av}`} style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4, background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                                API {av}
                                            </span>
                                        ))}
                                        {v.created_at && (
                                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--mp-text-3)' }}>
                                                {new Date(v.created_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    {notes && (
                                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--mp-text-2)', whiteSpace: 'pre-wrap' }}>
                                            {notes.length > 180 ? `${notes.slice(0, 180)}…` : notes}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublishUpdate;
