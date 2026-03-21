import React, { useState } from 'react';
import { Upload, FileCode, Send, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../../../api';
import type { PluginData } from './ManagePlugin';

type ReleaseTrack = 'stable' | 'beta' | 'alpha';
type Props = { plugin: PluginData; onSaved: () => void };

const TRACKS: { key: ReleaseTrack; label: string; desc: string }[] = [
    { key: 'stable',  label: 'Stable',  desc: 'Released to all users. Thoroughly tested.' },
    { key: 'beta',    label: 'Beta',    desc: 'Opt-in testers only. Wider feedback loop.' },
    { key: 'alpha',   label: 'Internal', desc: 'Team or whitelist access only.' },
];

const PublishUpdate = ({ plugin, onSaved }: Props) => {
    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [track, setTrack] = useState<ReleaseTrack>('stable');
    const [version, setVersion] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [published, setPublished] = useState(false);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.wasm')) setWasmFile(file);
        else alert('Please drop a valid .wasm file.');
    };

    const handlePublish = async () => {
        if (!wasmFile) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('wasm', wasmFile);
        fd.append('track', track);
        if (version) fd.append('version', version);
        if (releaseNotes) fd.append('release_notes', releaseNotes);

        try {
            await api.put(`/plugins/${plugin.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPublished(true);
            onSaved();
            setTimeout(() => {
                setPublished(false);
                setWasmFile(null);
                setVersion('');
                setReleaseNotes('');
            }, 3000);
        } catch {
            alert('Publish failed.');
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
                            Your new version is being rolled out on the <strong>{track}</strong> track.
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

            {/* ── Release Track ──
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
                    <div className="mp-banner warn">
                        <AlertTriangle size={16} style={{flexShrink:0, marginTop:1}} />
                        <span>Stable releases are immediately visible to all users. Make sure your build is production-ready.</span>
                    </div>
                )}
                {track === 'alpha' && (
                    <div className="mp-banner info">
                        <Clock size={16} style={{flexShrink:0, marginTop:1}} />
                        <span>Internal track is only visible to whitelisted user IDs. Configure access in your plugin settings.</span>
                    </div>
                )}
            </div> */}

            {/* ── Version & Notes ── */}
            <div className="mp-card">
                <div className="mp-card-title">
                    <FileCode size={14} />
                    Version Details
                </div>

                <div className="mp-form-group">
                    <label className="mp-label">
                        Version Tag <span style={{color:'var(--mp-text-3)', fontWeight:400}}>(optional — e.g. 1.2.3)</span>
                    </label>
                    <input
                        className="mp-input"
                        type="text"
                        value={version}
                        onChange={e => setVersion(e.target.value)}
                        placeholder="1.0.0"
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
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('wasm-upload-input')?.click()}
                >
                    <div className="mp-dropzone-icon">
                        <Upload size={20} />
                    </div>
                    <p>
                        <strong>Drag & drop your .wasm file</strong> or click to browse
                    </p>
                    <small>.wasm only</small>
                    <input
                        id="wasm-upload-input"
                        type="file"
                        accept=".wasm"
                        onChange={e => setWasmFile(e.target.files?.[0] ?? null)}
                    />
                </div>

                {wasmFile && (
                    <div className="mp-file-badge">
                        <FileCode size={14} />
                        {wasmFile.name}
                        <span style={{marginLeft:'auto', color:'var(--mp-text-3)'}}>
                            {(wasmFile.size / 1024).toFixed(1)} KB
                        </span>
                    </div>
                )}
            </div>

            <div style={{display:'flex', justifyContent:'flex-end', gap:'0.75rem'}}>
                <button
                    className="mp-btn mp-btn-primary"
                    onClick={handlePublish}
                    disabled={!wasmFile || uploading}
                >
                    <Send size={15} />
                    {uploading ? 'Publishing…' : `Publish to ${track.charAt(0).toUpperCase() + track.slice(1)}`}
                </button>
            </div>
        </div>
    );
};

export default PublishUpdate;
