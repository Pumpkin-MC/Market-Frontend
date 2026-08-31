import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ImageIcon, Plus, Save, Search, X, AlertTriangle, CheckCircle, ShieldCheck, Lock, Terminal, Trash2 } from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../App';
import type { PluginData } from './ManagePlugin';
import { validateAndSanitizeImage } from '../../../utils/fileValidation';

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
    const { user } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [name, setName] = useState(plugin.name);
    const [descriptions, setDescriptions] = useState<Record<string, string>>(() => {
        let parsed: Record<string, unknown> = {};
        if (typeof plugin.translated_descriptions === 'object' && plugin.translated_descriptions !== null) {
            parsed = plugin.translated_descriptions as Record<string, unknown>;
        } else if (typeof plugin.translated_descriptions === 'string') {
            try { parsed = JSON.parse(plugin.translated_descriptions || '{}'); } catch { /* ignore */ }
        }

        // Normalize: if a value is a nested object (old format), extract its 'description' string.
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') {
                flat[k] = v;
            } else if (v && typeof v === 'object' && 'description' in v) {
                flat[k] = String((v as Record<string, unknown>).description ?? '');
            }
        }

        // Ensure the default locale always exists.
        if (!flat[DEFAULT_LOCALE]) {
            flat[DEFAULT_LOCALE] = flat['en-GB'] ?? flat['en'] ?? '';
        }
        return flat;
    });
    const [activeLocale, setActiveLocale] = useState(DEFAULT_LOCALE);
    const [category, setCategory] = useState(plugin.category || 'Utilities');
    const [sourceLink, setSourceLink] = useState(plugin.source_link || '');
    const [youtubeVideoUrl, setYoutubeVideoUrl] = useState(plugin.youtube_video_url || '');
    const [keywords, setKeywords] = useState(plugin.keywords || '');
    const [isEarlyAccess, setIsEarlyAccess] = useState(plugin.is_early_access || false);
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

    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(plugin.preview_path || null);
    const [iconValidationErr, setIconValidationErr] = useState<string | null>(null);
    const [screenshotValidationErr, setScreenshotValidationErr] = useState<string | null>(null);
    const [processingImage, setProcessingImage] = useState(false);

    const [commands, setCommands] = useState<Array<{
        id?: number;
        name: string;
        aliases: string;
        permission: string;
        descriptions: Record<string, string>;
    }>>(() => {
        if (!plugin.commands || !Array.isArray(plugin.commands)) return [];
        return plugin.commands.map(cmd => {
            let descMap: Record<string, string> = {};
            if (typeof cmd.description === 'string') {
                try {
                    const parsed = JSON.parse(cmd.description);
                    if (parsed && typeof parsed === 'object') {
                        for (const [k, v] of Object.entries(parsed)) {
                            descMap[k] = String(v ?? '');
                        }
                    } else {
                        descMap[DEFAULT_LOCALE] = cmd.description;
                    }
                } catch {
                    descMap[DEFAULT_LOCALE] = cmd.description;
                }
            } else if (cmd.description && typeof cmd.description === 'object') {
                for (const [k, v] of Object.entries(cmd.description)) {
                    descMap[k] = String(v ?? '');
                }
            }
            return {
                id: cmd.id,
                name: (cmd.name || '').replace(/^\/+/, ''),
                aliases: Array.isArray(cmd.aliases) ? cmd.aliases.join(', ') : '',
                permission: cmd.permission || '',
                descriptions: descMap,
            };
        });
    });

    const addCommand = () => {
        setCommands(prev => [
            ...prev,
            {
                name: '',
                aliases: '',
                permission: '',
                descriptions: { [activeLocale]: '' },
            },
        ]);
    };

    const updateCommandField = (index: number, field: 'name' | 'permission' | 'aliases', value: string) => {
        const cleanValue = field === 'name' ? value.replace(/^\/+/, '') : value;
        setCommands(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: cleanValue };
            return next;
        });
    };

    const updateCommandDescription = (index: number, locale: string, value: string) => {
        setCommands(prev => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                descriptions: {
                    ...next[index].descriptions,
                    [locale]: value,
                },
            };
            return next;
        });
    };

    const removeCommand = (index: number) => {
        setCommands(prev => prev.filter((_, i) => i !== index));
    };

    const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIconValidationErr(null);
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProcessingImage(true);
            try {
                const res = await validateAndSanitizeImage(file, {
                    maxWidth: 512,
                    maxHeight: 512,
                    quality: 0.85,
                    minWidth: 32,
                    minHeight: 32,
                });
                if (!res.valid || !res.file) {
                    setIconValidationErr(res.error || 'Invalid icon file.');
                    return;
                }
                setIconFile(res.file);
                setIconPreview(res.previewUrl || URL.createObjectURL(res.file));
            } catch (err: any) {
                setIconValidationErr(err.message || 'Could not process icon.');
            } finally {
                setProcessingImage(false);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);
        const validCommands = commands
            .filter(c => c.name.trim().replace(/^\/+/, '').length > 0)
            .map((c, idx) => {
                const aliases = c.aliases
                    ? c.aliases.split(',').map(a => a.trim().replace(/^\/+/, '')).filter(a => a.length > 0)
                    : undefined;
                return {
                    id: c.id,
                    name: c.name.trim().replace(/^\/+/, ''),
                    aliases: aliases && aliases.length > 0 ? aliases : undefined,
                    permission: c.permission.trim() || undefined,
                    description: c.descriptions,
                    display_order: idx,
                };
            });

        const metadata = {
            name,
            category,
            sourceLink: sourceLink || undefined,
            youtubeVideoUrl: youtubeVideoUrl || undefined,
            keywords: keywords || undefined,
            translatedDescriptions: descriptions,
            isEarlyAccess,
            commands: validCommands,
        };

        const fd = new FormData();
        fd.append('metadata', JSON.stringify(metadata));
        if (iconFile) {
            fd.append('preview_image', iconFile);
        }
        try {
            await api.put(`/plugins/${plugin.id}`, fd);
            setSaveSuccess(true);
            onSaved();
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to save plugin details.';
            setSaveError(msg);
        } finally {
            setSaving(false);
        }
    };

    const deleteScreenshot = async (screenId: number) => {
        if (!window.confirm('Delete this screenshot?')) return;
        try {
            await api.delete(`/plugins/screenshots/${screenId}`);
            setScreenshots(prev => prev.filter(s => s.id !== screenId));
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to delete screenshot.';
            setSaveError(msg);
        }
    };

    const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setScreenshotValidationErr(null);
        setProcessingImage(true);
        const validFiles: File[] = [];
        try {
            for (const f of Array.from(files)) {
                const res = await validateAndSanitizeImage(f, {
                    maxWidth: 1920,
                    maxHeight: 1080,
                    quality: 0.82,
                    minWidth: 100,
                    minHeight: 100,
                });
                if (!res.valid || !res.file) {
                    setScreenshotValidationErr(res.error || `Invalid screenshot "${f.name}".`);
                    continue;
                }
                validFiles.push(res.file);
            }

            if (validFiles.length > 0) {
                const fd = new FormData();
                validFiles.forEach(f => fd.append('screenshots', f));
                const res = await api.post(`/plugins/${plugin.id}/screenshots`, fd);
                setScreenshots(prev => [...prev, ...(res.data.screenshots || [])]);
            }
        } catch {
            setScreenshotValidationErr('Screenshot upload failed.');
        } finally {
            setProcessingImage(false);
            e.target.value = '';
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
                        <label className="mp-label">Plugin Icon</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.25rem' }}>
                            <div style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '12px',
                                border: '1px solid var(--mp-border)',
                                background: iconPreview ? `url(${iconPreview}) center/cover no-repeat` : 'var(--mp-surface-2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: 'var(--mp-text-2)',
                                flexShrink: 0
                            }}>
                                {!iconPreview && name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <label htmlFor="icon-upload-input" className="mp-btn mp-btn-secondary" style={{ cursor: processingImage ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.82rem', opacity: processingImage ? 0.7 : 1 }}>
                                    <ImageIcon size={14} />
                                    {processingImage ? 'Validating & Sanitizing…' : 'Change Icon'}
                                </label>
                                <input
                                    id="icon-upload-input"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleIconChange}
                                    style={{ display: 'none' }}
                                    disabled={processingImage}
                                />
                                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.74rem', color: 'var(--mp-text-3)' }}>
                                    Square image recommended (PNG, JPEG, WebP). Max 2MB. Validated on selection.
                                </p>
                            </div>
                        </div>
                        {iconValidationErr && (
                            <div className="mp-banner error" style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={15} color="var(--mp-error)" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--mp-error)' }}>{iconValidationErr}</span>
                            </div>
                        )}
                    </div>

                    <div className="mp-form-group">
                        <label className="mp-label" htmlFor="listingPluginName">Plugin Name</label>
                        <input
                            id="listingPluginName"
                            name="pluginName"
                            className="mp-input"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>

                    <div className="mp-form-row">
                        <div className="mp-form-group">
                            <label className="mp-label" htmlFor="listingPluginCategory">Category</label>
                            <select id="listingPluginCategory" name="category" className="mp-select" value={category} onChange={e => setCategory(e.target.value)}>
                                {PLUGIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="mp-form-group">
                            <label className="mp-label" htmlFor="listingPluginSourceLink">Source Link</label>
                            <input
                                id="listingPluginSourceLink"
                                name="sourceLink"
                                className="mp-input"
                                type="url"
                                value={sourceLink}
                                onChange={e => setSourceLink(e.target.value)}
                                placeholder="https://github.com/you/plugin"
                                autoComplete="url"
                            />
                        </div>
                    </div>

                    <div className="mp-form-row">
                        <div className="mp-form-group">
                            <label className="mp-label" htmlFor="listingPluginKeywords">
                                Keywords <span style={{color:'var(--mp-text-3)',fontWeight:400}}>(comma-separated)</span>
                            </label>
                            <input
                                id="listingPluginKeywords"
                                name="keywords"
                                className="mp-input"
                                type="text"
                                value={keywords}
                                onChange={e => setKeywords(e.target.value)}
                                placeholder="economy, shop, currency"
                                autoComplete="off"
                            />
                        </div>
                        <div className="mp-form-group">
                            <label className="mp-label" htmlFor="listingPluginYoutubeUrl">
                                YouTube Video URL <span style={{color:'var(--mp-text-3)',fontWeight:400}}>(optional)</span>
                            </label>
                            <input
                                id="listingPluginYoutubeUrl"
                                name="youtubeVideoUrl"
                                className="mp-input"
                                type="url"
                                value={youtubeVideoUrl}
                                onChange={e => setYoutubeVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                autoComplete="url"
                            />
                        </div>
                    </div>

                    <div className="mp-form-group">
                        <label className="mp-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', marginTop: '0.5rem' }}>
                            <input
                                id="listingPluginEarlyAccess"
                                name="earlyAccess"
                                type="checkbox"
                                checked={isEarlyAccess}
                                onChange={e => setIsEarlyAccess(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mp-text)' }}>Early Access</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--mp-text-3)', fontWeight: 400 }}>Flag this plugin as incomplete or in active development.</div>
                            </div>
                        </label>
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

                {/* ── Commands ── */}
                <div className="mp-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <div className="mp-card-title" style={{ margin: 0 }}>
                            <Terminal size={14} />Commands
                        </div>
                        <button
                            type="button"
                            className="mp-btn mp-btn-secondary"
                            onClick={addCommand}
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                            <Plus size={13} /> Add Command
                        </button>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--mp-text-3)', marginBottom: '1rem', lineHeight: 1.4 }}>
                        List commands registered by your plugin along with their permissions and descriptions. Descriptions are localized to the currently selected language tab (<span style={{ fontFamily: 'var(--font-mono)', color: 'var(--mp-text-2)' }}>{getLocaleName(activeLocale)}</span>).
                    </p>

                    {commands.length === 0 ? (
                        <div style={{
                            padding: '1.75rem 1rem',
                            textAlign: 'center',
                            background: 'var(--mp-surface-2)',
                            borderRadius: 'var(--mp-radius-sm)',
                            border: '1px dashed var(--mp-border)',
                            color: 'var(--mp-text-3)',
                            fontSize: '0.82rem'
                        }}>
                            No commands added yet. Click <strong>"Add Command"</strong> above to register commands.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {commands.map((cmd, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: 'var(--mp-surface-2)',
                                        border: '1px solid var(--mp-border)',
                                        borderRadius: 'var(--mp-radius-sm)',
                                        padding: '0.85rem 1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.65rem'
                                    }}
                                >
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div>
                                            <label className="mp-label" style={{ fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                                                Command <span style={{ color: 'var(--mp-error)' }}>*</span>
                                            </label>
                                            <input
                                                className="mp-input"
                                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                                                placeholder="spawn [player]"
                                                value={cmd.name}
                                                maxLength={64}
                                                onChange={e => updateCommandField(idx, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mp-label" style={{ fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                                                Aliases <span style={{ color: 'var(--mp-text-3)', fontWeight: 400 }}>(optional, comma-separated)</span>
                                            </label>
                                            <input
                                                className="mp-input"
                                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                                                placeholder="hub, lobby, s"
                                                value={cmd.aliases}
                                                maxLength={128}
                                                onChange={e => updateCommandField(idx, 'aliases', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mp-label" style={{ fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                                                Permission Node <span style={{ color: 'var(--mp-text-3)', fontWeight: 400 }}>(optional)</span>
                                            </label>
                                            <input
                                                className="mp-input"
                                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                                                placeholder="pumpkin.command.spawn"
                                                value={cmd.permission}
                                                maxLength={128}
                                                onChange={e => updateCommandField(idx, 'permission', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeCommand(idx)}
                                            title="Remove Command"
                                            style={{
                                                alignSelf: 'flex-end',
                                                marginBottom: '2px',
                                                background: 'rgba(242, 65, 90, 0.1)',
                                                border: '1px solid rgba(242, 65, 90, 0.25)',
                                                borderRadius: '6px',
                                                color: 'var(--mp-error)',
                                                padding: '0.48rem 0.6rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242, 65, 90, 0.2)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(242, 65, 90, 0.1)')}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                            <label className="mp-label" style={{ fontSize: '0.72rem', margin: 0 }}>
                                                Description ({getLocaleName(activeLocale)})
                                            </label>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--mp-text-3)' }}>
                                                {activeLocale !== DEFAULT_LOCALE && !cmd.descriptions[activeLocale] ? (
                                                    <span>Falls back to: <em style={{ color: 'var(--mp-text-2)' }}>{cmd.descriptions[DEFAULT_LOCALE] || 'English default'}</em></span>
                                                ) : null}
                                            </span>
                                        </div>
                                        <input
                                            className="mp-input"
                                            style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                                            placeholder={`What does this command do? (${getLocaleName(activeLocale)})`}
                                            value={cmd.descriptions[activeLocale] ?? ''}
                                            onChange={e => updateCommandDescription(idx, activeLocale, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {saveError && (
                    <div className="mp-banner error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem', marginBottom: '1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <Lock size={22} color="#ef4444" style={{ flexShrink: 0 }} />
                            <div>
                                <strong style={{ color: '#ef4444', display: 'block', fontSize: '0.92rem' }}>
                                    {saveError.toLowerCase().includes('2fa') || saveError.toLowerCase().includes('two-factor') ? 'Two-Factor Authentication Required' : 'Save Error'}
                                </strong>
                                <span style={{ fontSize: '0.83rem', color: 'var(--mp-text-2)' }}>{saveError}</span>
                            </div>
                        </div>
                        {(saveError.toLowerCase().includes('2fa') || saveError.toLowerCase().includes('two-factor') || !user?.totp_enabled) && (
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

                {saveSuccess && (
                    <div className="mp-banner success" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', marginBottom: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px' }}>
                        <CheckCircle size={20} color="#10b981" />
                        <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Listing details saved successfully!</span>
                    </div>
                )}

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
                {screenshotValidationErr && (
                    <div className="mp-banner error" style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={15} color="var(--mp-error)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--mp-error)' }}>{screenshotValidationErr}</span>
                    </div>
                )}
                <p style={{marginTop:'0.75rem', fontSize:'0.76rem', color:'var(--mp-text-3)'}}>
                    Recommended: 16:9 aspect ratio, min 1280×720px. PNG, JPEG, or WebP. Validated on selection.
                </p>
            </div>
        </div>
    );
};

export default StoreListing;