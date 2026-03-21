import React, { useState, useRef, useEffect } from 'react';
import { Globe, ImageIcon, Plus, Save, Search, X } from 'lucide-react';
import api from '../../../api';
import type { PluginData } from './ManagePlugin';

const PLUGIN_CATEGORIES = [
    "Admin Tools","Economy","Fun","World Management","Utilities","Chat","Other"
];

// ── Full locale list via Intl.DisplayNames (no npm package needed) ──────────
const DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

const ALL_LOCALES: { code: string; name: string }[] = [
    'af','sq','am','ar','ar-SA','ar-EG','ar-AE','ar-MA','hy','az',
    'eu','be','bn','bs','bg','ca',
    'zh','zh-CN','zh-TW','zh-HK',
    'hr','cs','da','nl','nl-NL','nl-BE',
    'en-US','en-GB','en-AU','en-CA','en-IN',
    'et','fi','fr','fr-FR','fr-CA','fr-BE',
    'gl','ka','de','de-DE','de-AT','de-CH',
    'el','gu','ht','ha','he','hi','hu','is','id','ga','it',
    'ja','kn','kk','km','ko','ku','ky','lo','lv','lt','lb',
    'mk','mg','ms','ml','mt','mi','mr','mn','ne',
    'nb','nn','no','ps','fa','pl',
    'pt','pt-BR','pt-PT',
    'pa','ro','ru','sm',
    'sr','sr-Latn','sr-Cyrl',
    'sn','sd','si','sk','sl','so','st',
    'es','es-ES','es-MX','es-AR','es-CO','es-CL',
    'su','sw','sv','tg','tl','ta','tt','te','th','tr','tk',
    'uk','ur','ug','uz','vi','cy','xh','yi','yo','zu',
].map(code => {
    try {
        return { code, name: DISPLAY_NAMES.of(code) ?? code };
    } catch {
        return { code, name: code };
    }
}).sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_LOCALE = 'en-US';

// ── Language Picker Dropdown ─────────────────────────────────────────────────
type PickerProps = {
    usedCodes: string[];
    onAdd: (code: string) => void;
    onClose: () => void;
};

const LangPicker = ({ usedCodes, onAdd, onClose }: PickerProps) => {
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const filtered = ALL_LOCALES.filter(
        l => !usedCodes.includes(l.code) &&
             (l.name.toLowerCase().includes(search.toLowerCase()) ||
              l.code.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div ref={ref} style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
            background: 'var(--mp-surface)', border: '1px solid var(--mp-border)',
            borderRadius: 'var(--mp-radius)', width: 260,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
        }}>
            {/* Search */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 0.75rem',
                borderBottom: '1px solid var(--mp-border)',
                background: 'var(--mp-surface-2)',
            }}>
                <Search size={13} color="var(--mp-text-3)" style={{flexShrink:0}} />
                <input
                    ref={inputRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search language…"
                    style={{
                        background: 'none', border: 'none', outline: 'none',
                        color: 'var(--mp-text)', fontFamily: 'var(--font-display)',
                        fontSize: '0.82rem', width: '100%',
                    }}
                />
            </div>

            {/* List */}
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                    <div style={{
                        padding: '1.5rem', textAlign: 'center',
                        fontSize: '0.8rem', color: 'var(--mp-text-3)',
                    }}>
                        No languages found
                    </div>
                ) : filtered.map(l => (
                    <button
                        key={l.code}
                        type="button"
                        onClick={() => { onAdd(l.code); onClose(); }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', background: 'none', border: 'none',
                            padding: '0.5rem 0.85rem', cursor: 'pointer',
                            color: 'var(--mp-text-2)', fontFamily: 'var(--font-display)',
                            fontSize: '0.82rem', textAlign: 'left', gap: '0.5rem',
                            transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--mp-surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                        <span>{l.name}</span>
                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                            color: 'var(--mp-text-3)', flexShrink: 0,
                        }}>{l.code}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
type Props = { plugin: PluginData; onSaved: () => void };

const StoreListing = ({ plugin, onSaved }: Props) => {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState(plugin.name);
    const [descriptions, setDescriptions] = useState<Record<string, string>>(() => {
        const parsed = JSON.parse(plugin.translated_descriptions || '{}');
        // Ensure default locale always exists
        if (!parsed[DEFAULT_LOCALE]) parsed[DEFAULT_LOCALE] = parsed['en'] ?? '';
        return parsed;
    });
    const [activeLocale, setActiveLocale] = useState(DEFAULT_LOCALE);
    const [category, setCategory] = useState(plugin.category);
    const [sourceLink, setSourceLink] = useState(plugin.source_link || '');
    const [keywords, setKeywords] = useState(plugin.keywords || '');
    const [screenshots, setScreenshots] = useState(plugin.screenshots || []);
    const [pickerOpen, setPickerOpen] = useState(false);

    const usedCodes = Object.keys(descriptions);

    const addLanguage = (code: string) => {
        setDescriptions(prev => ({ ...prev, [code]: '' }));
        setActiveLocale(code);
    };

    const removeLanguage = (code: string) => {
        if (code === DEFAULT_LOCALE) return; // guard
        setDescriptions(prev => {
            const next = { ...prev };
            delete next[code];
            return next;
        });
        if (activeLocale === code) setActiveLocale(DEFAULT_LOCALE);
    };

    const getLocaleName = (code: string) => {
        try { return DISPLAY_NAMES.of(code) ?? code; } catch { return code; }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData();
        fd.append('name', name);
        fd.append('translated_descriptions', JSON.stringify(descriptions));
        fd.append('category', category);
        fd.append('source_link', sourceLink);
        fd.append('keywords', keywords);
        try {
            await api.put(`/plugins/${plugin.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onSaved();
        } catch {
            alert('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const deleteScreenshot = async (screenId: number) => {
        if (!window.confirm('Delete this screenshot?')) return;
        try {
            await api.delete(`/plugins/screenshots/${screenId}`);
            setScreenshots(prev => prev.filter(s => s.id !== screenId));
        } catch {
            alert('Failed to delete screenshot.');
        }
    };

    const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fd = new FormData();
        Array.from(files).forEach(f => fd.append('screenshots', f));
        try {
            const res = await api.post(`/plugins/${plugin.id}/screenshots`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setScreenshots(prev => [...prev, ...(res.data.screenshots || [])]);
        } catch {
            alert('Screenshot upload failed.');
        }
    };

    return (
        <div>
            <div className="mp-tab-header">
                <h2>Store Listing</h2>
                <p>Manage what users see on your plugin's store page — name, description, screenshots, and discoverability.</p>
            </div>

            <form onSubmit={handleSave}>
                {/* ── General Details ── */}
                <div className="mp-card">
                    <div className="mp-card-title"><Globe size={14} />General Details</div>

                    <div className="mp-form-group">
                        <label className="mp-label">Plugin Name</label>
                        <input className="mp-input" type="text" value={name}
                            onChange={e => setName(e.target.value)} required />
                    </div>

                    <div className="mp-form-row">
                        <div className="mp-form-group">
                            <label className="mp-label">Category</label>
                            <select className="mp-select" value={category} onChange={e => setCategory(e.target.value)}>
                                {PLUGIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="mp-form-group">
                            <label className="mp-label">Source Link</label>
                            <input className="mp-input" type="url" value={sourceLink}
                                onChange={e => setSourceLink(e.target.value)}
                                placeholder="https://github.com/you/plugin" />
                        </div>
                    </div>

                    <div className="mp-form-group">
                        <label className="mp-label">
                            Keywords <span style={{color:'var(--mp-text-3)',fontWeight:400}}>(comma-separated)</span>
                        </label>
                        <input className="mp-input" type="text" value={keywords}
                            onChange={e => setKeywords(e.target.value)}
                            placeholder="economy, shop, currency" />
                    </div>
                </div>

                {/* ── Descriptions ── */}
                <div className="mp-card">
                    <div className="mp-card-title"><Globe size={14} />Descriptions</div>

                    {/* Tab bar */}
                    <div style={{display:'flex', alignItems:'center', gap:'4px', flexWrap:'wrap', marginBottom:'0.75rem'}}>
                        {usedCodes.map(code => (
                            <div
                                key={code}
                                className={`mp-lang-tab ${activeLocale === code ? 'active' : ''}`}
                                style={{display:'flex', alignItems:'center', gap:'0.3rem', paddingRight: code === DEFAULT_LOCALE ? undefined : '0.3rem'}}
                            >
                                <button
                                    type="button"
                                    style={{
                                        background:'none', border:'none', cursor:'pointer',
                                        color:'inherit', fontFamily:'var(--font-display)',
                                        fontSize:'0.75rem', fontWeight:500, padding:0,
                                        display:'flex', alignItems:'center', gap:'0.3rem',
                                    }}
                                    onClick={() => setActiveLocale(code)}
                                >
                                    {getLocaleName(code)}
                                    {code === DEFAULT_LOCALE && (
                                        <span style={{
                                            fontSize:'0.6rem', fontWeight:700,
                                            background:'rgba(79,126,255,0.2)',
                                            color:'var(--mp-accent)',
                                            padding:'0.05rem 0.3rem', borderRadius:3,
                                            letterSpacing:'0.05em', textTransform:'uppercase',
                                        }}>default</span>
                                    )}
                                </button>

                                {/* Remove button — only for non-default locales */}
                                {code !== DEFAULT_LOCALE && (
                                    <button
                                        type="button"
                                        onClick={() => removeLanguage(code)}
                                        title={`Remove ${getLocaleName(code)}`}
                                        style={{
                                            background:'none', border:'none', cursor:'pointer',
                                            color:'var(--mp-text-3)', padding:0, lineHeight:1,
                                            display:'flex', alignItems:'center',
                                            transition:'color 0.15s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--mp-error)')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--mp-text-3)')}
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Add language button */}
                        <div style={{position:'relative'}}>
                            <button
                                type="button"
                                className="mp-lang-tab"
                                onClick={() => setPickerOpen(v => !v)}
                                style={{display:'flex', alignItems:'center', gap:'0.3rem'}}
                            >
                                <Plus size={11} />
                                Add language
                            </button>
                            {pickerOpen && (
                                <LangPicker
                                    usedCodes={usedCodes}
                                    onAdd={addLanguage}
                                    onClose={() => setPickerOpen(false)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Textarea for active locale */}
                    <textarea
                        className="mp-textarea"
                        rows={8}
                        value={descriptions[activeLocale] ?? ''}
                        onChange={e => setDescriptions(prev => ({ ...prev, [activeLocale]: e.target.value }))}
                        placeholder={`Write your plugin description in ${getLocaleName(activeLocale)}…`}
                    />
                    <p style={{marginTop:'0.5rem', fontSize:'0.74rem', color:'var(--mp-text-3)'}}>
                        Editing: <span style={{fontFamily:'var(--font-mono)', color:'var(--mp-text-2)'}}>{activeLocale}</span>
                        {activeLocale === DEFAULT_LOCALE && ' · This is the default language shown when no translation is available.'}
                    </p>
                </div>

                <div style={{display:'flex', justifyContent:'flex-end'}}>
                    <button type="submit" className="mp-btn mp-btn-primary" disabled={saving}>
                        <Save size={15} />
                        {saving ? 'Saving…' : 'Save Listing'}
                    </button>
                </div>
            </form>

            <div className="mp-divider" />

            {/* ── Screenshots ── */}
            <div className="mp-card">
                <div className="mp-card-title"><ImageIcon size={14} />Screenshots</div>
                <div className="mp-screenshots">
                    {screenshots.map(s => (
                        <div key={s.id} className="mp-screenshot-item">
                            <img src={s.path} alt="screenshot" />
                            <button className="mp-screenshot-del" type="button"
                                onClick={() => deleteScreenshot(s.id)}>×</button>
                        </div>
                    ))}

                    <label
                        htmlFor="screenshot-upload"
                        style={{
                            aspectRatio:'16/9', border:'2px dashed var(--mp-border-2)',
                            borderRadius:'var(--mp-radius-sm)', display:'flex',
                            flexDirection:'column', alignItems:'center', justifyContent:'center',
                            gap:'0.35rem', cursor:'pointer', color:'var(--mp-text-3)',
                            fontSize:'0.75rem', transition:'border-color 0.15s, color 0.15s',
                            background:'var(--mp-surface-2)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--mp-accent)'; e.currentTarget.style.color='var(--mp-accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--mp-border-2)'; e.currentTarget.style.color='var(--mp-text-3)'; }}
                    >
                        <Plus size={18} />
                        Add
                    </label>
                    <input id="screenshot-upload" type="file" accept="image/*" multiple
                        style={{display:'none'}} onChange={handleScreenshotUpload} />
                </div>
                <p style={{marginTop:'0.75rem', fontSize:'0.76rem', color:'var(--mp-text-3)'}}>
                    Recommended: 16:9 aspect ratio, min 1280×720px. PNG or JPEG.
                </p>
            </div>
        </div>
    );
};

export default StoreListing;