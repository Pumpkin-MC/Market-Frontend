import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CircleAlert, ImageIcon, Plus, Save, Search, X, ShieldCheck, Lock, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../app/auth';
import type { PluginData } from './ManagePluginPage';
import { validateAndSanitizeImage } from '../../../lib/fileValidation';
import { Select } from '../../../components/Select';
import '../../../styles/studio.css';

const PLUGIN_CATEGORIES = [
    "Admin Tools","Economy","Fun","World Management","Utilities","Chat","Other"
];

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
        <div ref={ref} className="st-listing-picker">
            <label className="search">
                <Search />
                <input
                    ref={inputRef}
                    className="input"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search language…"
                />
            </label>
            <div className="st-listing-picker-list">
                {filtered.length === 0 ? (
                    <p className="small st-listing-picker-empty">No languages found</p>
                ) : filtered.map(l => (
                    <button
                        key={l.code}
                        type="button"
                        onClick={() => { onAdd(l.code); onClose(); }}
                    >
                        <span>{l.name}</span>
                        <span className="mono muted">{l.code}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

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

        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') {
                flat[k] = v;
            } else if (v && typeof v === 'object' && 'description' in v) {
                flat[k] = String((v as Record<string, unknown>).description ?? '');
            }
        }

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
        if (code === DEFAULT_LOCALE) return;
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

    const needs2fa = (msg: string) => msg.toLowerCase().includes('2fa') || msg.toLowerCase().includes('two-factor');

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">Store Listing</h2>
                <p className="small">Manage what users see on your plugin's store page — name, description, screenshots, and discoverability.</p>
            </header>

            <form className="st-tab" onSubmit={handleSave}>
                <section className="panel">
                    <div className="panel-head"><h3 className="h3">General Details</h3></div>
                    <div className="panel-body stack">
                        <div className="field">
                            <span className="field-label">Plugin Icon</span>
                            <div className="row">
                                <span className="avatar avatar-ghost st-listing-icon">
                                    {iconPreview ? <img src={iconPreview} alt="" /> : name.charAt(0).toUpperCase()}
                                </span>
                                <div className="stack st-listing-icon-meta">
                                    <label className="button button-sm" aria-disabled={processingImage || undefined}>
                                        <ImageIcon />
                                        {processingImage ? 'Validating & Sanitizing…' : 'Change Icon'}
                                        <input
                                            id="icon-upload-input"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleIconChange}
                                            hidden
                                            disabled={processingImage}
                                        />
                                    </label>
                                    <span className="field-hint">Square image recommended (PNG, JPEG, WebP). Max 2MB. Validated on selection.</span>
                                </div>
                            </div>
                            {iconValidationErr && (
                                <span className="field-error"><CircleAlert size={14} />{iconValidationErr}</span>
                            )}
                        </div>

                        <div className="fields st-cols-2">
                            <label className="field st-span">
                                <span className="field-label">Plugin Name</span>
                                <span className="control">
                                    <input
                                        id="listingPluginName"
                                        name="pluginName"
                                        className="input"
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        autoComplete="off"
                                        required
                                    />
                                </span>
                            </label>

                            <div className="field">
                                <span className="field-label" id="listingPluginCategory">Category</span>
                                <Select options={PLUGIN_CATEGORIES} value={category} onChange={setCategory} aria-labelledby="listingPluginCategory" />
                            </div>

                            <label className="field">
                                <span className="field-label">Source Link</span>
                                <span className="control">
                                    <input
                                        id="listingPluginSourceLink"
                                        name="sourceLink"
                                        className="input"
                                        type="url"
                                        value={sourceLink}
                                        onChange={e => setSourceLink(e.target.value)}
                                        placeholder="https://github.com/you/plugin"
                                        autoComplete="url"
                                    />
                                </span>
                            </label>

                            <label className="field">
                                <span className="field-label">Keywords <em>(comma-separated)</em></span>
                                <span className="control">
                                    <input
                                        id="listingPluginKeywords"
                                        name="keywords"
                                        className="input"
                                        type="text"
                                        value={keywords}
                                        onChange={e => setKeywords(e.target.value)}
                                        placeholder="economy, shop, currency"
                                        autoComplete="off"
                                    />
                                </span>
                            </label>

                            <label className="field">
                                <span className="field-label">YouTube Video URL <em>(optional)</em></span>
                                <span className="control">
                                    <input
                                        id="listingPluginYoutubeUrl"
                                        name="youtubeVideoUrl"
                                        className="input"
                                        type="url"
                                        value={youtubeVideoUrl}
                                        onChange={e => setYoutubeVideoUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        autoComplete="url"
                                    />
                                </span>
                            </label>
                        </div>

                        <label className="choice">
                            <input
                                id="listingPluginEarlyAccess"
                                name="earlyAccess"
                                type="checkbox"
                                className="check"
                                checked={isEarlyAccess}
                                onChange={e => setIsEarlyAccess(e.target.checked)}
                            />
                            <span>Early Access<span className="small">Flag this plugin as incomplete or in active development.</span></span>
                        </label>
                    </div>
                </section>

                <section className="panel">
                    <div className="panel-head"><h3 className="h3">Descriptions</h3></div>
                    <div className="panel-body stack">
                        <div className="st-listing-langs">
                            {usedCodes.map(code => (
                                <span key={code} className="st-listing-lang" data-active={activeLocale === code || undefined}>
                                    <button type="button" onClick={() => setActiveLocale(code)}>
                                        {getLocaleName(code)}
                                        {code === DEFAULT_LOCALE && <span className="st-listing-default">default</span>}
                                    </button>
                                    {code !== DEFAULT_LOCALE && (
                                        <button
                                            type="button"
                                            className="st-listing-lang-x"
                                            onClick={() => removeLanguage(code)}
                                            title={`Remove ${getLocaleName(code)}`}
                                            aria-label={`Remove ${getLocaleName(code)}`}
                                        >
                                            <X />
                                        </button>
                                    )}
                                </span>
                            ))}

                            <span className="st-listing-add">
                                <button
                                    type="button"
                                    className="button button-flat button-sm"
                                    onClick={() => setPickerOpen(v => !v)}
                                >
                                    <Plus />
                                    Add language
                                </button>
                                {pickerOpen && (
                                    <LangPicker
                                        usedCodes={usedCodes}
                                        onAdd={addLanguage}
                                        onClose={() => setPickerOpen(false)}
                                    />
                                )}
                            </span>
                        </div>

                        <div className="field">
                            <span className="control">
                                <textarea
                                    className="input"
                                    rows={8}
                                    value={descriptions[activeLocale] ?? ''}
                                    onChange={e => setDescriptions(prev => ({ ...prev, [activeLocale]: e.target.value }))}
                                    placeholder={`Write your plugin description in ${getLocaleName(activeLocale)}…`}
                                    aria-label={`Description (${getLocaleName(activeLocale)})`}
                                />
                            </span>
                            <span className="field-hint">
                                Editing: <span className="mono label-fg">{activeLocale}</span>
                                {activeLocale === DEFAULT_LOCALE && ' · This is the default language shown when no translation is available.'}
                            </span>
                        </div>
                    </div>
                </section>

                <section className="panel">
                    <div className="panel-head">
                        <h3 className="h3">Commands</h3>
                        <span className="spacer" />
                        <button type="button" className="button button-sm" onClick={addCommand}>
                            <Plus />Add Command
                        </button>
                    </div>
                    <div className="panel-body stack">
                        <p className="small">
                            List commands registered by your plugin along with their permissions and descriptions. Descriptions are localized to the currently selected language tab (<span className="mono label-fg">{getLocaleName(activeLocale)}</span>).
                        </p>

                        {commands.length === 0 ? (
                            <div className="blank st-listing-blank">
                                <p className="small">No commands added yet. Click <strong>"Add Command"</strong> above to register commands.</p>
                            </div>
                        ) : (
                            commands.map((cmd, idx) => (
                                <div key={idx} className="st-listing-cmd">
                                    <div className="st-listing-cmd-grid">
                                        <label className="field">
                                            <span className="field-label">Command <em>*</em></span>
                                            <span className="control">
                                                <input
                                                    className="input mono"
                                                    placeholder="spawn [player]"
                                                    value={cmd.name}
                                                    maxLength={64}
                                                    onChange={e => updateCommandField(idx, 'name', e.target.value)}
                                                    required
                                                />
                                            </span>
                                        </label>
                                        <label className="field">
                                            <span className="field-label">Aliases <em>(optional, comma-separated)</em></span>
                                            <span className="control">
                                                <input
                                                    className="input mono"
                                                    placeholder="hub, lobby, s"
                                                    value={cmd.aliases}
                                                    maxLength={128}
                                                    onChange={e => updateCommandField(idx, 'aliases', e.target.value)}
                                                />
                                            </span>
                                        </label>
                                        <label className="field">
                                            <span className="field-label">Permission Node <em>(optional)</em></span>
                                            <span className="control">
                                                <input
                                                    className="input mono"
                                                    placeholder="pumpkin.command.spawn"
                                                    value={cmd.permission}
                                                    maxLength={128}
                                                    onChange={e => updateCommandField(idx, 'permission', e.target.value)}
                                                />
                                            </span>
                                        </label>
                                        <button
                                            type="button"
                                            className="button button-danger button-icon st-listing-cmd-del"
                                            onClick={() => removeCommand(idx)}
                                            title="Remove Command"
                                            aria-label="Remove Command"
                                        >
                                            <Trash2 />
                                        </button>
                                    </div>

                                    <label className="field">
                                        <span className="field-label">Description ({getLocaleName(activeLocale)})</span>
                                        <span className="control">
                                            <input
                                                className="input"
                                                placeholder={`What does this command do? (${getLocaleName(activeLocale)})`}
                                                value={cmd.descriptions[activeLocale] ?? ''}
                                                onChange={e => updateCommandDescription(idx, activeLocale, e.target.value)}
                                            />
                                        </span>
                                        {activeLocale !== DEFAULT_LOCALE && !cmd.descriptions[activeLocale] && (
                                            <span className="field-hint">Falls back to: <em>{cmd.descriptions[DEFAULT_LOCALE] || 'English default'}</em></span>
                                        )}
                                    </label>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {saveError && (
                    <div className="notice notice-danger">
                        <span className="mark-box mark-box-danger"><Lock /></span>
                        <p className="notice-text">
                            <strong>{needs2fa(saveError) ? 'Two-Factor Authentication Required' : 'Save Error'}</strong> {saveError}
                        </p>
                        {(needs2fa(saveError) || !user?.totp_enabled) && (
                            <button
                                type="button"
                                className="button button-primary button-sm"
                                onClick={() => navigate('/settings?tab=security')}
                            >
                                <ShieldCheck /> Enable 2FA →
                            </button>
                        )}
                    </div>
                )}

                {saveSuccess && (
                    <div className="notice notice-success">
                        <span className="mark-box mark-box-success"><Check /></span>
                        <p className="notice-text"><strong>Listing details saved successfully!</strong></p>
                    </div>
                )}

                <div className="row">
                    <span className="spacer" />
                    <button type="submit" className="button button-primary" disabled={saving}>
                        <Save />
                        {saving ? 'Saving…' : 'Save Listing'}
                    </button>
                </div>
            </form>

            <section className="panel">
                <div className="panel-head">
                    <h3 className="h3">Screenshots</h3>
                    <span className="small">(optional)</span>
                </div>
                <div className="panel-body stack">
                    <p className="small">Optional. You can also embed images and GIFs directly into your Markdown description.</p>
                    <div className="st-listing-shots">
                        {screenshots.map(s => (
                            <div key={s.id} className="st-listing-shot">
                                <img className="st-thumb" src={s.path} alt="screenshot" />
                                <button
                                    className="button button-danger button-sm button-icon"
                                    type="button"
                                    aria-label="Delete screenshot"
                                    onClick={() => deleteScreenshot(s.id)}
                                >
                                    <X />
                                </button>
                            </div>
                        ))}

                        <label className="st-drop st-listing-shot-add">
                            <Plus />
                            <span className="label label-fg">Add</span>
                            <input id="screenshot-upload" type="file" accept="image/*" multiple onChange={handleScreenshotUpload} />
                        </label>
                    </div>
                    {screenshotValidationErr && (
                        <span className="field-error"><CircleAlert size={14} />{screenshotValidationErr}</span>
                    )}
                    <span className="field-hint">Recommended: 16:9 aspect ratio, min 1280×720px. PNG, JPEG, or WebP. Validated on selection.</span>
                </div>
            </section>
        </div>
    );
};

export default StoreListing;