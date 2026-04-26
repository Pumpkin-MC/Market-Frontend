import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Globe, ImageIcon, Plus, Search, X, Upload, FileCode,
    DollarSign, CheckCircle, ChevronRight, ChevronLeft,
    Zap, Lock, AlertTriangle, Tag, Store, User,
} from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../App';
import './AddPlugin.css';

// ── Locale helpers ────────────────────────────────────────────────────────────
const DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });
const ALL_LOCALES: { code: string; name: string }[] = [
    'af', 'sq', 'am', 'ar', 'ar-SA', 'ar-EG', 'ar-AE', 'ar-MA', 'hy', 'az',
    'eu', 'be', 'bn', 'bs', 'bg', 'ca',
    'zh', 'zh-CN', 'zh-TW', 'zh-HK',
    'hr', 'cs', 'da', 'nl', 'nl-NL', 'nl-BE',
    'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
    'et', 'fi', 'fr', 'fr-FR', 'fr-CA', 'fr-BE',
    'gl', 'ka', 'de', 'de-DE', 'de-AT', 'de-CH',
    'el', 'gu', 'ht', 'ha', 'he', 'hi', 'hu', 'is', 'id', 'ga', 'it',
    'ja', 'kn', 'kk', 'km', 'ko', 'ku', 'ky', 'lo', 'lv', 'lt', 'lb',
    'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'ne',
    'nb', 'nn', 'no', 'ps', 'fa', 'pl',
    'pt', 'pt-BR', 'pt-PT',
    'pa', 'ro', 'ru', 'sm',
    'sr', 'sr-Latn', 'sr-Cyrl',
    'sn', 'sd', 'si', 'sk', 'sl', 'so', 'st',
    'es', 'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL',
    'su', 'sw', 'sv', 'tg', 'tl', 'ta', 'tt', 'te', 'th', 'tr', 'tk',
    'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu',
].map(code => {
    try { return { code, name: DISPLAY_NAMES.of(code) ?? code }; }
    catch { return { code, name: code }; }
}).sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_LOCALE    = 'en-US';
const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

const getLocaleName = (code: string) => {
    try { return DISPLAY_NAMES.of(code) ?? code; } catch { return code; }
};

// ── Size limits ───────────────────────────────────────────────────────────────
const MAX_WASM_BYTES         = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES  = 5 * 1024 * 1024;
const MAX_NAME_LEN           = 64;
const MAX_CATEGORY_LEN       = 48;
const MAX_SOURCE_LINK_LEN    = 512;
const MAX_KEYWORDS_LEN       = 256;
const MAX_DESC_LEN           = 64_000;
const MAX_SCREENSHOTS        = 8;

// ── Compression settings ──────────────────────────────────────────────────────
const PREVIEW_MAX_WIDTH    = 800;
const SCREENSHOT_MAX_WIDTH = 1920;
const IMAGE_QUALITY        = 0.80;

// ── Image compression helper ──────────────────────────────────────────────────
const compressImage = (file: File, maxWidth: number, quality: number): Promise<File> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const ratio = Math.min(1, maxWidth / img.width);
            const w = Math.round(img.width  * ratio);
            const h = Math.round(img.height * ratio);
            const canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                blob => {
                    if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
                    resolve(new File([blob], name, { type: 'image/jpeg' }));
                },
                'image/jpeg',
                quality,
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });

// ── Formatting helpers ────────────────────────────────────────────────────────
const fmtBytes = (b: number): string => {
    if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / 1024).toFixed(0)} KB`;
};

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
    { key: 'details', label: 'Details',       icon: Globe       },
    { key: 'listing', label: 'Store Listing', icon: Store       },
    { key: 'binary',  label: 'Binary',        icon: FileCode    },
    { key: 'review',  label: 'Review',        icon: CheckCircle },
];

type LicenseType = 'free' | 'paid';

// ── Size-budget indicator ─────────────────────────────────────────────────────
const SizeBudget = ({ usedBytes, maxBytes, label }: { usedBytes: number; maxBytes: number; label: string }) => {
    const pct   = Math.min(100, (usedBytes / maxBytes) * 100);
    const warn  = pct >= 80;
    const over  = pct >= 100;
    const color = over ? 'var(--mp-error, #ff4d4f)' : warn ? '#f59e0b' : 'var(--mp-accent, #4f7eff)';
    return (
        <div style={{ marginTop: '0.55rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.28rem', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--mp-text-3)' }}>{label}</span>
                <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {fmtBytes(usedBytes)} / {fmtBytes(maxBytes)}
                </span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'var(--mp-surface-2, rgba(255,255,255,0.06))', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s ease, background 0.2s ease' }} />
            </div>
            {over && (
                <p style={{ fontSize: '0.7rem', color: 'var(--mp-error, #ff4d4f)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangle size={11} /> Exceeds {fmtBytes(maxBytes)} limit — please remove or replace assets.
                </p>
            )}
        </div>
    );
};

// ── Inline field error ────────────────────────────────────────────────────────
const FieldError = ({ msg }: { msg?: string }) => msg ? (
    <span style={{ fontSize: '0.72rem', color: 'var(--mp-error)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <AlertTriangle size={11} />{msg}
    </span>
) : null;

// ── Character counter ─────────────────────────────────────────────────────────
const CharCount = ({ current, max }: { current: number; max: number }) => {
    const over = current > max;
    return (
        <span style={{ color: over ? 'var(--mp-error)' : 'var(--mp-text-3)', fontWeight: over ? 600 : 400, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginLeft: '0.4rem' }}>
            {current}/{max}
        </span>
    );
};

// ── Language picker ───────────────────────────────────────────────────────────
const LangPicker = ({ usedCodes, onAdd, onClose }: { usedCodes: string[]; onAdd: (c: string) => void; onClose: () => void }) => {
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const ref      = useRef<HTMLDivElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const filtered = ALL_LOCALES.filter(l =>
        !usedCodes.includes(l.code) &&
        (l.name.toLowerCase().includes(search.toLowerCase()) ||
            l.code.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div ref={ref} className="ap-lang-picker">
            <div className="ap-lang-picker-search">
                <Search size={13} color="var(--mp-text-3)" />
                <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search language…" />
            </div>
            <div className="ap-lang-picker-list">
                {filtered.length === 0
                    ? <div className="ap-lang-picker-empty">No languages found</div>
                    : filtered.map(l => (
                        <button key={l.code} type="button" className="ap-lang-picker-item"
                            onClick={() => { onAdd(l.code); onClose(); }}>
                            <span>{l.name}</span>
                            <span className="ap-lang-code">{l.code}</span>
                        </button>
                    ))
                }
            </div>
        </div>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const AddPlugin = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep]           = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone]           = useState(false);

    // ── Step 0: Details ──
    const [name, setName]               = useState('');
    const [developerName, setDeveloperName] = useState('');
    const [category, setCategory]       = useState(PLUGIN_CATEGORIES[0]);
    const [sourceLink, setSourceLink]   = useState('');
    const [keywords, setKeywords]       = useState('');

    // ── Step 1: Store Listing ──
    const [descriptions, setDescriptions] = useState<Record<string, string>>({ [DEFAULT_LOCALE]: '' });
    const [activeLocale, setActiveLocale] = useState(DEFAULT_LOCALE);
    const [pickerOpen, setPickerOpen]     = useState(false);

    const [previewImage, setPreviewImage]       = useState<File | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [previewDragOver, setPreviewDragOver] = useState(false);
    const [compressingPreview, setCompressingPreview] = useState(false);

    const [screenshots, setScreenshots]               = useState<File[]>([]);
    const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
    const [imgDragOver, setImgDragOver]               = useState(false);
    const [compressingScreenshot, setCompressingScreenshot] = useState(false);

    const [dragIndex, setDragIndex]         = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const [licenseType, setLicenseType] = useState<LicenseType>('free');
    const [price, setPrice]             = useState(4.99);
    const [isEarlyAccess, setIsEarlyAccess] = useState(false);
    const stripeConnected               = user.stripe_ready;

    // ── Step 2: Binary ──
    const [wasmFile, setWasmFile]       = useState<File | null>(null);
    const [wasmDragOver, setWasmDragOver] = useState(false);

    // ── Computed sizes ──
    const totalImageBytes    = (previewImage?.size ?? 0) + screenshots.reduce((s, f) => s + f.size, 0);
    const imageBudgetExceeded = totalImageBytes > MAX_TOTAL_IMAGE_BYTES;
    const wasmTooLarge        = wasmFile !== null && wasmFile.size > MAX_WASM_BYTES;
    const totalSteps          = STEPS.length;
    const progress            = (step / (totalSteps - 1)) * 100;

    // ── Field-level validation ────────────────────────────────────────────────
    const fieldErrors = useMemo(() => {
        const errs: Record<string, string> = {};
        if (name.length > MAX_NAME_LEN)
            errs.name = `Name exceeds ${MAX_NAME_LEN} characters (${name.length}/${MAX_NAME_LEN}).`;
        if (category.length > MAX_CATEGORY_LEN)
            errs.category = `Category exceeds ${MAX_CATEGORY_LEN} characters.`;
        if (sourceLink.length > MAX_SOURCE_LINK_LEN)
            errs.sourceLink = `Source link exceeds ${MAX_SOURCE_LINK_LEN} characters.`;
        if (sourceLink && !sourceLink.startsWith('http://') && !sourceLink.startsWith('https://'))
            errs.sourceLink = 'Source link must start with http:// or https://';
        if (keywords.length > MAX_KEYWORDS_LEN)
            errs.keywords = `Keywords exceed ${MAX_KEYWORDS_LEN} characters.`;
        const descLen = (descriptions[DEFAULT_LOCALE] ?? '').length;
        if (descLen > MAX_DESC_LEN)
            errs.description = `Description exceeds ${MAX_DESC_LEN} characters (${descLen}/${MAX_DESC_LEN}).`;
        return errs;
    }, [name, category, sourceLink, keywords, descriptions]);

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;

    // ── Image helpers ──
    const setPreviewFile = async (file: File) => {
        if (file.size > 20 * 1024 * 1024) { alert('Image is too large to process (max 20 MB original). Please resize it first.'); return; }
        setCompressingPreview(true);
        try {
            const compressed = await compressImage(file, PREVIEW_MAX_WIDTH, IMAGE_QUALITY);
            setPreviewImage(compressed);
            const r = new FileReader();
            r.onload = e => setPreviewImageUrl(e.target?.result as string);
            r.readAsDataURL(compressed);
        } catch { alert('Could not process image. Please try a different file.'); }
        finally { setCompressingPreview(false); }
    };

    const removePreviewImage = () => { setPreviewImage(null); setPreviewImageUrl(null); };

    const addScreenshots = async (files: FileList | File[]) => {
        if (screenshots.length >= MAX_SCREENSHOTS) {
            alert(`Maximum ${MAX_SCREENSHOTS} screenshots allowed.`);
            return;
        }
        setCompressingScreenshot(true);
        try {
            for (const f of Array.from(files)) {
                if (screenshots.length >= MAX_SCREENSHOTS) break;
                if (f.size > 20 * 1024 * 1024) { alert(`"${f.name}" is too large (max 20 MB original). Skipping.`); continue; }
                const compressed = await compressImage(f, SCREENSHOT_MAX_WIDTH, IMAGE_QUALITY);
                setScreenshots(p => [...p, compressed]);
                const r = new FileReader();
                await new Promise<void>(res => {
                    r.onload = e => { setScreenshotPreviews(p => [...p, e.target?.result as string]); res(); };
                    r.readAsDataURL(compressed);
                });
            }
        } catch { alert('One or more images could not be processed.'); }
        finally { setCompressingScreenshot(false); }
    };

    const removeScreenshot = (i: number) => {
        setScreenshots(p => p.filter((_, x) => x !== i));
        setScreenshotPreviews(p => p.filter((_, x) => x !== i));
    };

    const reorderScreenshots = (from: number, to: number) => {
        if (from === to) return;
        const reorder = <T,>(arr: T[]) => { const next = [...arr]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; };
        setScreenshots(reorder);
        setScreenshotPreviews(reorder);
    };

    const addLanguage    = (code: string) => { setDescriptions(p => ({ ...p, [code]: '' })); setActiveLocale(code); };
    const removeLanguage = (code: string) => {
        if (code === DEFAULT_LOCALE) return;
        setDescriptions(p => { const n = { ...p }; delete n[code]; return n; });
        if (activeLocale === code) setActiveLocale(DEFAULT_LOCALE);
    };

    // ── WASM setter ───────────────────────────────────────────────────────────
    const handleWasmFile = (file: File | null) => {
        if (!file) { setWasmFile(null); return; }
        if (!file.name.endsWith('.wasm')) { alert('Please upload a .wasm file.'); return; }
        if (file.size > MAX_WASM_BYTES) {
            alert(`Plugin binary exceeds the ${fmtBytes(MAX_WASM_BYTES)} limit (your file: ${fmtBytes(file.size)}). Please optimise or split your plugin.`);
            return;
        }
        setWasmFile(file);
    };

    // ── Proceed guard ─────────────────────────────────────────────────────────
    const priceTooLow = licenseType === 'paid' && stripeConnected && price < 0.99;

    const canProceed = () => {
        if (step === 0) return name.trim().length > 0 && !hasFieldErrors;
        if (step === 1) return (
            (descriptions[DEFAULT_LOCALE] ?? '').trim().length > 0 &&
            previewImage !== null &&
            !imageBudgetExceeded &&
            !priceTooLow &&
            !hasFieldErrors
        );
        if (step === 2) return wasmFile !== null && !wasmTooLarge;
        return true;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (hasFieldErrors)       { alert('Please fix validation errors before publishing.'); return; }
        if (imageBudgetExceeded)  { alert('Total image size exceeds 5 MB. Please remove some screenshots.'); return; }
        if (wasmTooLarge)         { alert('Plugin binary exceeds 5 MB.'); return; }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('name',                    name);
            fd.append('category',                category);
            fd.append('source_link',             sourceLink);
            fd.append('keywords',                keywords);
            fd.append('translated_descriptions', JSON.stringify(descriptions));
            fd.append('type',                    licenseType);
            fd.append('price', licenseType === 'paid' ? String(Math.round(price * 100)) : '0');
            fd.append('is_early_access',         String(isEarlyAccess));
            if (previewImage) fd.append('preview_image', previewImage);
            if (wasmFile)     fd.append('wasm', wasmFile);
            screenshots.forEach(f => fd.append('screenshots', f));
            await api.post('/plugins', fd);
            setDone(true);
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data || 'Failed to publish.');
        } finally { setSubmitting(false); }
    };

    const resetAll = () => {
        setDone(false); setStep(0);
        setName(''); setDeveloperName(''); setCategory(PLUGIN_CATEGORIES[0]);
        setSourceLink(''); setKeywords('');
        setDescriptions({ [DEFAULT_LOCALE]: '' }); setActiveLocale(DEFAULT_LOCALE);
        setPreviewImage(null); setPreviewImageUrl(null);
        setScreenshots([]); setScreenshotPreviews([]);
        setLicenseType('free'); setPrice(4.99); setIsEarlyAccess(false);
        setWasmFile(null);
    };

    // ── Success screen ────────────────────────────────────────────────────────
    if (done) return (
        <div className="ap-root">
            <div className="ap-success">
                <div className="ap-success-icon"><CheckCircle size={32} color="var(--mp-success)" /></div>
                <h2>Plugin Published!</h2>
                <p>Your plugin is live and visible in the marketplace.</p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button className="mp-btn mp-btn-primary" onClick={() => navigate('/dashboard/plugins')}>View My Plugins</button>
                    <button className="mp-btn mp-btn-outline" onClick={resetAll}>Add Another</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="ap-root">

            {/* ── Progress header ── */}
            <div className="ap-header">
                <div className="ap-header-top">
                    <div>
                        <h1 className="ap-title">New Plugin</h1>
                        <p className="ap-subtitle">Step {step + 1} of {totalSteps} — {STEPS[step].label}</p>
                    </div>
                    <button className="mp-btn mp-btn-outline"
                        onClick={() => navigate('/dashboard/plugins')}
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}>
                        Cancel
                    </button>
                </div>

                <div className="ap-steps">
                    <div className="ap-steps-line">
                        <div className="ap-steps-fill" style={{ width: `${progress}%` }} />
                    </div>
                    {STEPS.map((s, i) => {
                        const Icon  = s.icon;
                        const state = i < step ? 'done' : i === step ? 'active' : 'idle';
                        return (
                            <button key={s.key} className={`ap-step-dot ${state}`}
                                onClick={() => i < step && setStep(i)}
                                disabled={i > step} title={s.label}>
                                {state === 'done' ? <CheckCircle size={14} /> : <Icon size={14} />}
                                <span className="ap-step-label">{s.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="ap-body">
                <div className="ap-content">

                    {/* ══════════════ Step 0: Details ══════════════ */}
                    {step === 0 && (
                        <div>
                            <div className="mp-tab-header">
                                <h2>Plugin Details</h2>
                                <p>Basic information and authorship for your plugin.</p>
                            </div>

                            <div className="mp-card">
                                <div className="mp-card-title"><Globe size={14} />General</div>

                                {/* Name */}
                                <div className="mp-form-group">
                                    <label className="mp-label">
                                        Plugin Name <span className="ap-required">*</span>
                                        <CharCount current={name.length} max={MAX_NAME_LEN} />
                                    </label>
                                    <input
                                        className="mp-input"
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="My Awesome Plugin"
                                        autoFocus
                                        style={{ borderColor: fieldErrors.name ? 'var(--mp-error)' : undefined }}
                                    />
                                    <FieldError msg={fieldErrors.name} />
                                </div>

                                <div className="mp-form-row">
                                    {/* Category */}
                                    <div className="mp-form-group">
                                        <label className="mp-label">Category</label>
                                        <select className="mp-select" value={category}
                                            onChange={e => setCategory(e.target.value)}>
                                            {PLUGIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <FieldError msg={fieldErrors.category} />
                                    </div>

                                    {/* Source link */}
                                    <div className="mp-form-group">
                                        <label className="mp-label">
                                            Source Link{' '}
                                            <span style={{ color: 'var(--mp-text-3)', fontWeight: 400 }}>(optional)</span>
                                            <CharCount current={sourceLink.length} max={MAX_SOURCE_LINK_LEN} />
                                        </label>
                                        <input
                                            className="mp-input"
                                            type="url"
                                            value={sourceLink}
                                            onChange={e => setSourceLink(e.target.value)}
                                            placeholder="https://github.com/you/plugin"
                                            style={{ borderColor: fieldErrors.sourceLink ? 'var(--mp-error)' : undefined }}
                                        />
                                        <FieldError msg={fieldErrors.sourceLink} />
                                    </div>
                                </div>

                                {/* Keywords */}
                                <div className="mp-form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="mp-label">
                                        Keywords{' '}
                                        <span style={{ color: 'var(--mp-text-3)', fontWeight: 400 }}>(comma-separated)</span>
                                        <CharCount current={keywords.length} max={MAX_KEYWORDS_LEN} />
                                    </label>
                                    <input
                                        className="mp-input"
                                        type="text"
                                        value={keywords}
                                        onChange={e => setKeywords(e.target.value)}
                                        placeholder="economy, shop, currency"
                                        style={{ borderColor: fieldErrors.keywords ? 'var(--mp-error)' : undefined }}
                                    />
                                    <FieldError msg={fieldErrors.keywords} />
                                </div>

                                {/* Early Access */}
                                <div className="mp-form-group">
                                    <label className="mp-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={isEarlyAccess}
                                            onChange={e => setIsEarlyAccess(e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mp-text-1)' }}>Early Access</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--mp-text-3)', fontWeight: 400 }}>Flag this plugin as incomplete or in active development.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Authorship */}
                            <div className="mp-card">
                                <div className="mp-card-title"><User size={14} />Authorship</div>
                                <div className="mp-form-group" style={{ marginBottom: 0 }}>
                                    <label className="mp-label">Developer Name</label>
                                    <input
                                        className="mp-input"
                                        type="text"
                                        value={developerName}
                                        onChange={e => setDeveloperName(e.target.value)}
                                        placeholder={user?.username ?? 'Developer or studio name'}
                                    />
                                    <span style={{ fontSize: '0.74rem', color: 'var(--mp-text-3)', marginTop: '0.3rem', display: 'block' }}>
                                        The person or team who built the plugin. Leave blank to use your account name.
                                    </span>
                                </div>
                                <div className="mp-divider" style={{ margin: '1.1rem 0' }} />
                                <div className="ap-publisher-row">
                                    <div className="ap-publisher-avatar">{(user?.username ?? 'P').charAt(0).toUpperCase()}</div>
                                    <div className="ap-publisher-info">
                                        <div className="ap-publisher-label">Publisher</div>
                                        <div className="ap-publisher-name">{user?.username ?? 'Your account'}</div>
                                    </div>
                                    <div className="ap-publisher-badge"><CheckCircle size={13} />This account</div>
                                </div>
                                <p style={{ fontSize: '0.74rem', color: 'var(--mp-text-3)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                                    The publisher is always the account that uploads the plugin and cannot be changed.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ══════════════ Step 1: Store Listing ══════════════ */}
                    {step === 1 && (
                        <div>
                            <div className="mp-tab-header">
                                <h2>Store Listing</h2>
                                <p>Description, screenshots, and pricing — everything users see on your store page.</p>
                            </div>

                            {/* Description */}
                            <div className="mp-card">
                                <div className="mp-card-title"><Tag size={14} />Description</div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                    {Object.keys(descriptions).map(code => (
                                        <div key={code}
                                            className={`mp-lang-tab ${activeLocale === code ? 'active' : ''}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', paddingRight: code === DEFAULT_LOCALE ? undefined : '0.3rem' }}>
                                            <button type="button"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                onClick={() => setActiveLocale(code)}>
                                                {getLocaleName(code)}
                                                {code === DEFAULT_LOCALE && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(79,126,255,0.2)', color: 'var(--mp-accent)', padding: '0.05rem 0.3rem', borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                        default
                                                    </span>
                                                )}
                                            </button>
                                            {code !== DEFAULT_LOCALE && (
                                                <button type="button" onClick={() => removeLanguage(code)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mp-text-3)', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--mp-error)')}
                                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--mp-text-3)')}>
                                                    <X size={11} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <div style={{ position: 'relative' }}>
                                        <button type="button" className="mp-lang-tab"
                                            onClick={() => setPickerOpen(v => !v)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Plus size={11} /> Add language
                                        </button>
                                        {pickerOpen && (
                                            <LangPicker
                                                usedCodes={Object.keys(descriptions)}
                                                onAdd={addLanguage}
                                                onClose={() => setPickerOpen(false)} />
                                        )}
                                    </div>
                                </div>

                                <textarea
                                    className="mp-textarea"
                                    rows={8}
                                    value={descriptions[activeLocale] ?? ''}
                                    onChange={e => setDescriptions(p => ({ ...p, [activeLocale]: e.target.value }))}
                                    placeholder={`Describe your plugin in ${getLocaleName(activeLocale)}…\n\nWhat does it do? What makes it unique? Any requirements?`}
                                    style={{ borderColor: fieldErrors.description ? 'var(--mp-error)' : undefined }}
                                />

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.72rem' }}>
                                    <span style={{ color: 'var(--mp-text-3)' }}>
                                        Editing: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--mp-text-2)' }}>{activeLocale}</span>
                                        {activeLocale === DEFAULT_LOCALE && ' · Shown as fallback when no translation exists.'}
                                    </span>
                                    <CharCount current={descriptions[activeLocale]?.length ?? 0} max={MAX_DESC_LEN} />
                                </div>

                                <FieldError msg={fieldErrors.description} />

                                {(descriptions[DEFAULT_LOCALE] ?? '').trim().length === 0 && (
                                    <div className="mp-banner warn" style={{ marginTop: '1rem', marginBottom: 0 }}>
                                        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                                        A default (American English) description is required to continue.
                                    </div>
                                )}
                            </div>

                            {/* Store Preview Image */}
                            <div className="mp-card">
                                <div className="mp-card-title">
                                    <ImageIcon size={14} />Store Preview Image
                                    <span className="ap-required" style={{ marginLeft: 4 }}>*</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                                    {[
                                        { label: 'Recommended', value: '616 × 353 px', highlight: true },
                                        { label: 'Minimum',     value: '460 × 215 px' },
                                        { label: 'Aspect ratio',value: '16:9' },
                                        { label: 'Format',      value: 'PNG or JPEG' },
                                        { label: 'Max size',    value: '2 MB (auto-compressed)' },
                                    ].map(({ label, value, highlight }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', background: highlight ? 'rgba(79,126,255,0.08)' : 'var(--mp-surface-2)', border: `1px solid ${highlight ? 'rgba(79,126,255,0.25)' : 'var(--mp-border)'}`, borderRadius: 5, padding: '0.25rem 0.55rem' }}>
                                            <span style={{ color: 'var(--mp-text-3)' }}>{label}:</span>
                                            <span style={{ color: highlight ? 'var(--mp-accent)' : 'var(--mp-text-2)', fontFamily: 'var(--font-mono)', fontWeight: highlight ? 600 : 400 }}>{value}</span>
                                        </div>
                                    ))}
                                </div>

                                <input id="ap-preview-image" type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) { setPreviewFile(f); e.target.value = ''; } }} />

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div
                                        className={`mp-dropzone ${!previewImageUrl && previewDragOver ? 'drag-over' : ''}`}
                                        style={{ flexShrink: 0, width: 180, aspectRatio: '16/9', padding: 0, overflow: 'hidden', position: 'relative', cursor: compressingPreview ? 'wait' : 'pointer', borderStyle: previewImageUrl ? 'solid' : undefined, opacity: compressingPreview ? 0.6 : 1 }}
                                        onDragOver={e => { e.preventDefault(); setPreviewDragOver(true); }}
                                        onDragLeave={() => setPreviewDragOver(false)}
                                        onDrop={e => { e.preventDefault(); setPreviewDragOver(false); const f = e.dataTransfer.files[0]; if (f) setPreviewFile(f); }}
                                        onClick={() => !compressingPreview && document.getElementById('ap-preview-image')?.click()}
                                    >
                                        {previewImageUrl ? (
                                            <img src={previewImageUrl} alt="Store preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        ) : compressingPreview ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.3rem' }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--mp-text-3)' }}>Compressing…</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.3rem' }}>
                                                <ImageIcon size={16} color="var(--mp-text-3)" />
                                                <span style={{ fontSize: '0.65rem', color: 'var(--mp-text-3)', textAlign: 'center', lineHeight: 1.3 }}>Click or drag<br />to upload</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, paddingTop: '0.15rem' }}>
                                        {previewImageUrl ? (
                                            <>
                                                <p style={{ fontSize: '0.78rem', color: 'var(--mp-text-2)', marginBottom: '0.3rem', fontWeight: 500 }}>{previewImage?.name}</p>
                                                <p style={{ fontSize: '0.72rem', color: 'var(--mp-text-3)', marginBottom: '0.65rem' }}>
                                                    {previewImage ? fmtBytes(previewImage.size) : ''}
                                                    {previewImage && (
                                                        <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', color: 'var(--mp-accent)', background: 'rgba(79,126,255,0.1)', border: '1px solid rgba(79,126,255,0.2)', borderRadius: 3, padding: '0.05rem 0.3rem' }}>compressed</span>
                                                    )}
                                                </p>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button type="button" className="mp-btn mp-btn-outline" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                                                        onClick={() => document.getElementById('ap-preview-image')?.click()}>
                                                        Replace image
                                                    </button>
                                                    <button type="button" className="mp-btn mp-btn-outline" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem', color: 'var(--mp-error)', borderColor: 'var(--mp-error)' }}
                                                        onClick={removePreviewImage}>
                                                        Remove
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <p style={{ fontSize: '0.75rem', color: 'var(--mp-text-3)', lineHeight: 1.55 }}>
                                                Shown as the listing card thumbnail. Images are automatically compressed to JPEG. Drag & drop or click the box to upload.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Screenshots */}
                            <div className="mp-card">
                                <div className="mp-card-title">
                                    <ImageIcon size={14} />Screenshots
                                    <span style={{ color: 'var(--mp-text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>(optional)</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: screenshots.length >= MAX_SCREENSHOTS ? 'var(--mp-error)' : 'var(--mp-text-3)', fontFamily: 'var(--font-mono)' }}>
                                        {screenshots.length}/{MAX_SCREENSHOTS}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                                    {[
                                        { label: 'Recommended', value: '1280 × 720 px', highlight: true },
                                        { label: 'Aspect ratio', value: '16:9' },
                                        { label: 'Format',       value: 'PNG or JPEG' },
                                        { label: 'Max size',     value: '2 MB each (auto-compressed)' },
                                    ].map(({ label, value, highlight }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', background: highlight ? 'rgba(79,126,255,0.08)' : 'var(--mp-surface-2)', border: `1px solid ${highlight ? 'rgba(79,126,255,0.25)' : 'var(--mp-border)'}`, borderRadius: 5, padding: '0.25rem 0.55rem' }}>
                                            <span style={{ color: 'var(--mp-text-3)' }}>{label}:</span>
                                            <span style={{ color: highlight ? 'var(--mp-accent)' : 'var(--mp-text-2)', fontFamily: 'var(--font-mono)', fontWeight: highlight ? 600 : 400 }}>{value}</span>
                                        </div>
                                    ))}
                                </div>

                                {screenshots.length < MAX_SCREENSHOTS && (
                                    <div
                                        className={`mp-dropzone ${imgDragOver ? 'drag-over' : ''}`}
                                        style={{ opacity: compressingScreenshot ? 0.6 : 1, cursor: compressingScreenshot ? 'wait' : 'pointer' }}
                                        onDragOver={e => { e.preventDefault(); setImgDragOver(true); }}
                                        onDragLeave={() => setImgDragOver(false)}
                                        onDrop={e => { e.preventDefault(); setImgDragOver(false); if (!compressingScreenshot) addScreenshots(e.dataTransfer.files); }}
                                        onClick={() => !compressingScreenshot && document.getElementById('ap-screenshots')?.click()}>
                                        <div className="mp-dropzone-icon"><ImageIcon size={20} /></div>
                                        <p>{compressingScreenshot ? <strong>Compressing…</strong> : <><strong>Drag & drop screenshots</strong> or click to browse</>}</p>
                                        <small>Multiple files · auto-compressed to JPEG · first screenshot = cover</small>
                                        <input id="ap-screenshots" type="file" accept="image/*" multiple
                                            onChange={e => e.target.files && addScreenshots(e.target.files)} />
                                    </div>
                                )}

                                {(previewImage || screenshots.length > 0) && (
                                    <SizeBudget usedBytes={totalImageBytes} maxBytes={MAX_TOTAL_IMAGE_BYTES} label="Total image budget (preview + screenshots)" />
                                )}

                                {screenshotPreviews.length > 0 && (
                                    <div className="mp-screenshots" style={{ marginTop: '1rem' }}>
                                        {screenshotPreviews.map((src, i) => {
                                            const isBeingDragged = dragIndex === i;
                                            const isDropTarget   = dragOverIndex === i && dragIndex !== i;
                                            const insertBefore   = isDropTarget && dragIndex !== null && dragIndex > i;
                                            const insertAfter    = isDropTarget && dragIndex !== null && dragIndex < i;
                                            return (
                                                <div
                                                    key={src}
                                                    className="mp-screenshot-item"
                                                    draggable
                                                    onDragStart={e => {
                                                        setDragIndex(i);
                                                        const el = e.currentTarget as HTMLElement;
                                                        const rect = el.getBoundingClientRect();
                                                        const ghost = el.cloneNode(true) as HTMLElement;
                                                        ghost.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${rect.width}px;height:${rect.height}px;margin:0;opacity:0.92;pointer-events:none;`;
                                                        document.body.appendChild(ghost);
                                                        e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
                                                        setTimeout(() => document.body.removeChild(ghost), 0);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragEnter={e => { e.preventDefault(); setDragOverIndex(i); }}
                                                    onDragOver={e  => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverIndex(null); }}
                                                    onDrop={e => { e.preventDefault(); if (dragIndex !== null) reorderScreenshots(dragIndex, i); setDragIndex(null); setDragOverIndex(null); }}
                                                    onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                                                    style={{ opacity: isBeingDragged ? 0.35 : 1, transform: isDropTarget ? 'scale(1.03)' : 'scale(1)', transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease, outline 0.1s ease', outline: isDropTarget ? '2px solid var(--mp-accent)' : '2px solid transparent', outlineOffset: 2, boxShadow: isDropTarget ? '0 0 0 4px rgba(79,126,255,0.18)' : undefined, cursor: 'grab', borderLeft: insertBefore ? '3px solid var(--mp-accent)' : undefined, borderRight: insertAfter ? '3px solid var(--mp-accent)' : undefined }}
                                                >
                                                    <img src={src} alt={`screenshot ${i + 1}`} draggable={false} />
                                                    <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(13,15,18,0.82)', border: '1px solid var(--mp-border)', borderRadius: 4, fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--mp-text-3)', padding: '2px 5px' }}>
                                                        {fmtBytes(screenshots[i]?.size ?? 0)}
                                                    </div>
                                                    {i === 0 && (
                                                        <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(13,15,18,0.85)', border: '1px solid var(--mp-border)', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, color: 'var(--mp-accent)', padding: '2px 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cover</div>
                                                    )}
                                                    <div style={{ position: 'absolute', top: 5, right: 22, display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.5, pointerEvents: 'none' }}>
                                                        {[0,1,2].map(r => <div key={r} style={{ display: 'flex', gap: 2 }}>{[0,1].map(c => <div key={c} style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }} />)}</div>)}
                                                    </div>
                                                    <button className="mp-screenshot-del" type="button"
                                                        onClick={e => { e.stopPropagation(); removeScreenshot(i); }}>×</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pricing */}
                            <div className="mp-card">
                                <div className="mp-card-title"><DollarSign size={14} />Pricing</div>
                                <div className="mp-pricing-options">
                                    {([
                                        { key: 'free' as LicenseType, label: 'Free', icon: <Zap size={18} />,  desc: 'Anyone installs for free. Maximises reach.' },
                                        { key: 'paid' as LicenseType, label: 'Paid', icon: <Lock size={18} />, desc: 'One-time purchase via Stripe.' },
                                    ]).map(opt => {
                                        const isLocked = opt.key === 'paid' && !stripeConnected;
                                        return (
                                            <div key={opt.key} style={{ position: 'relative', flex: 1 }}>
                                                <button type="button"
                                                    className={`mp-pricing-card ${licenseType === opt.key ? 'selected' : ''}`}
                                                    onClick={() => !isLocked && setLicenseType(opt.key)}
                                                    style={{ width: '100%', height: '100%', opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'default' : 'pointer' }}>
                                                    <div style={{ color: licenseType === opt.key ? 'var(--mp-accent)' : 'var(--mp-text-2)', marginBottom: '0.5rem' }}>{opt.icon}</div>
                                                    <div className="mp-pricing-card-name">{opt.label}</div>
                                                    <div className="mp-pricing-card-desc">{opt.desc}</div>
                                                </button>
                                                {isLocked && (
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,15,18,0.2)', backdropFilter: 'blur(2px)', borderRadius: 'var(--mp-radius)', zIndex: 5, padding: '1rem', textAlign: 'center' }}>
                                                        <button type="button" className="mp-btn mp-btn-primary"
                                                            style={{ fontSize: '0.7rem', padding: '0.4rem 0.7rem', fontWeight: 700 }}
                                                            onClick={e => { e.stopPropagation(); navigate('/settings?tab=payouts'); }}>
                                                            <Lock size={11} style={{ marginRight: 4 }} />Unlock
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {licenseType === 'paid' && stripeConnected && (
                                    <div className="mp-form-group" style={{ marginTop: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
                                        <label className="mp-label">Base Price (EUR)</label>
                                        {priceTooLow && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', padding: '0.45rem 0.65rem', background: 'rgba(255,77,79,0.1)', border: '1px solid rgba(255,77,79,0.35)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--mp-error, #ff4d4f)' }}>
                                                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                                                Minimum price is €0.99. Please enter a higher amount to continue.
                                            </div>
                                        )}
                                        <div style={{ position: 'relative', maxWidth: 160 }}>
                                            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: priceTooLow ? 'var(--mp-error, #ff4d4f)' : 'var(--mp-text-3)', fontSize: '0.85rem' }}>€</span>
                                            <input className="mp-input" type="number" step="0.01" min="0.99" value={price}
                                                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                                                style={{ paddingLeft: '1.6rem', borderColor: priceTooLow ? 'var(--mp-error, #ff4d4f)' : undefined }} />
                                        </div>
                                        {(() => {
                                            const priceCents    = Math.round(price * 100);
                                            const stripeCents   = Math.ceil(priceCents * 0.015 + 25);
                                            const platformCents = Math.round(priceCents * 0.30);
                                            const earningsCents = priceCents - stripeCents - platformCents;
                                            const fmt = (c: number) => (c / 100).toFixed(2);
                                            return (
                                                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--mp-bg-2)', borderRadius: 8, border: '1px solid var(--mp-border)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                                        <span style={{ color: 'var(--mp-text-3)' }}>Platform fee (30%)</span>
                                                        <span style={{ color: 'var(--mp-red)' }}>-€{fmt(platformCents)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.55rem', paddingBottom: '0.55rem', borderBottom: '1px solid var(--mp-border)' }}>
                                                        <span style={{ color: 'var(--mp-text-3)' }}>Stripe fee (1.5% + €0.25)</span>
                                                        <span style={{ color: 'var(--mp-red)' }}>-€{fmt(stripeCents)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                                                        <span style={{ color: 'var(--mp-text-1)' }}>Your earnings</span>
                                                        <span style={{ color: earningsCents > 0 ? 'var(--mp-green)' : 'var(--mp-error, #ff4d4f)' }}>
                                                            {earningsCents >= 0 ? '+' : ''}{fmt(earningsCents) === '-0.00' ? '€0.00' : `€${fmt(earningsCents)}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <p style={{ fontSize: '0.7rem', color: 'var(--mp-text-3)', marginTop: '0.5rem' }}>
                                            Stripe fees are estimates. Payouts occur according to your Stripe schedule.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ Step 2: Binary ══════════════ */}
                    {step === 2 && (
                        <div>
                            <div className="mp-tab-header">
                                <h2>Plugin Binary</h2>
                                <p>Upload your compiled <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em', background: 'var(--mp-surface-2)', padding: '0.1em 0.4em', borderRadius: 4 }}>.wasm</code> file. This is the actual code users will run.</p>
                            </div>
                            <div className="mp-card">
                                <div className="mp-card-title">
                                    <FileCode size={14} />WebAssembly Binary <span className="ap-required" style={{ marginLeft: 4 }}>*</span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                                    {[{ label: 'Format', value: '.wasm' }, { label: 'Max size', value: '5 MB', highlight: true }].map(({ label, value, highlight }: any) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', background: highlight ? 'rgba(79,126,255,0.08)' : 'var(--mp-surface-2)', border: `1px solid ${highlight ? 'rgba(79,126,255,0.25)' : 'var(--mp-border)'}`, borderRadius: 5, padding: '0.25rem 0.55rem' }}>
                                            <span style={{ color: 'var(--mp-text-3)' }}>{label}:</span>
                                            <span style={{ color: highlight ? 'var(--mp-accent)' : 'var(--mp-text-2)', fontFamily: 'var(--font-mono)', fontWeight: highlight ? 600 : 400 }}>{value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className={`mp-dropzone ${wasmDragOver ? 'drag-over' : ''}`}
                                    onDragOver={e => { e.preventDefault(); setWasmDragOver(true); }}
                                    onDragLeave={() => setWasmDragOver(false)}
                                    onDrop={e => { e.preventDefault(); setWasmDragOver(false); handleWasmFile(e.dataTransfer.files[0] ?? null); }}
                                    onClick={() => document.getElementById('ap-wasm')?.click()}>
                                    <div className="mp-dropzone-icon"><Upload size={20} /></div>
                                    <p><strong>Drag & drop your .wasm file</strong> or click to browse</p>
                                    <small>.wasm only · max 5 MB</small>
                                    <input id="ap-wasm" type="file" accept=".wasm"
                                        onChange={e => handleWasmFile(e.target.files?.[0] ?? null)} />
                                </div>

                                {wasmFile && (
                                    <>
                                        <div className="mp-file-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FileCode size={14} />
                                            {wasmFile.name}
                                            <span style={{ marginLeft: 'auto', color: wasmTooLarge ? 'var(--mp-error)' : 'var(--mp-text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                                                {fmtBytes(wasmFile.size)}
                                            </span>
                                            <button type="button" onClick={() => setWasmFile(null)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mp-text-3)', display: 'flex', padding: 0 }}
                                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--mp-error)')}
                                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--mp-text-3)')}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <SizeBudget usedBytes={wasmFile.size} maxBytes={MAX_WASM_BYTES} label="Plugin binary size" />
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════════ Step 3: Review ══════════════ */}
                    {step === 3 && (
                        <div>
                            <div className="mp-tab-header">
                                <h2>Review & Publish</h2>
                                <p>Click any card to jump back and edit. Everything is editable from Manage Plugin after publishing.</p>
                            </div>

                            {(imageBudgetExceeded || wasmTooLarge || hasFieldErrors) && (
                                <div className="mp-banner warn" style={{ marginBottom: '1.25rem' }}>
                                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                                    <span>
                                        {hasFieldErrors      && 'There are validation errors that must be fixed. '}
                                        {imageBudgetExceeded && `Total image assets exceed 5 MB (${fmtBytes(totalImageBytes)}). `}
                                        {wasmTooLarge        && `Plugin binary exceeds 5 MB (${fmtBytes(wasmFile!.size)}). `}
                                        Please go back and fix these before publishing.
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="ap-review-grid">

                                        {/* Details card */}
                                        <div className="mp-card ap-review-card" onClick={() => setStep(0)}>
                                            <div className="ap-review-section-label"><Globe size={13} />Details</div>
                                            <div className="ap-review-field"><span>Name</span><strong>{name || '—'}</strong></div>
                                            <div className="ap-review-field"><span>Category</span><strong>{category}</strong></div>
                                            <div className="ap-review-field"><span>Developer</span><strong>{developerName.trim() || user?.username || '—'}</strong></div>
                                            <div className="ap-review-field"><span>Publisher</span><strong>{user?.username || '—'}</strong></div>
                                            {keywords && <div className="ap-review-field"><span>Keywords</span><strong>{keywords}</strong></div>}
                                            {hasFieldErrors && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--mp-error)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <AlertTriangle size={11} /> Has validation errors
                                                </div>
                                            )}
                                        </div>

                                        {/* Store Listing card */}
                                        <div className="mp-card ap-review-card" onClick={() => setStep(1)}>
                                            <div className="ap-review-section-label"><Store size={13} />Store Listing</div>
                                            {previewImageUrl ? (
                                                <img src={previewImageUrl} alt="Store preview" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 5, border: '1px solid var(--mp-border)', marginBottom: '0.65rem' }} />
                                            ) : (
                                                <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--mp-surface-2)', border: '1px dashed var(--mp-border)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.65rem' }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--mp-text-3)' }}>No preview image</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                                                {Object.keys(descriptions).map(c => (
                                                    <span key={c} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', background: 'var(--mp-surface-2)', border: '1px solid var(--mp-border)', borderRadius: 4, padding: '0.1rem 0.4rem', color: 'var(--mp-text-2)' }}>{c}</span>
                                                ))}
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--mp-text-2)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '0.65rem' }}>
                                                {descriptions[DEFAULT_LOCALE] || '—'}
                                            </p>
                                            {screenshotPreviews.length > 0 ? (
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                                                    {screenshotPreviews.map((src, i) => (
                                                        <img key={i} src={src} alt="" style={{ height: 40, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 3, border: '1px solid var(--mp-border)' }} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '0.78rem', color: 'var(--mp-text-3)', marginBottom: '0.5rem' }}>No screenshots</p>
                                            )}
                                            <div className="ap-review-field">
                                                <span>Pricing</span>
                                                <strong style={{ textTransform: 'capitalize' }}>
                                                    {licenseType}{licenseType === 'paid' ? ` · €${price.toFixed(2)}` : ''}
                                                </strong>
                                            </div>
                                            {(previewImage || screenshots.length > 0) && (
                                                <SizeBudget usedBytes={totalImageBytes} maxBytes={MAX_TOTAL_IMAGE_BYTES} label="Total image assets" />
                                            )}
                                        </div>

                                        {/* Binary card */}
                                        <div className="mp-card ap-review-card" onClick={() => setStep(2)} style={{ gridColumn: '1 / -1' }}>
                                            <div className="ap-review-section-label"><FileCode size={13} />Binary</div>
                                            {wasmFile ? (
                                                <>
                                                    <div className="ap-review-field">
                                                        <span>File</span>
                                                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                                                            {wasmFile.name}
                                                            <span style={{ color: wasmTooLarge ? 'var(--mp-error)' : 'var(--mp-text-3)', fontWeight: 400, marginLeft: '0.5rem' }}>
                                                                {fmtBytes(wasmFile.size)}
                                                            </span>
                                                        </strong>
                                                    </div>
                                                    <SizeBudget usedBytes={wasmFile.size} maxBytes={MAX_WASM_BYTES} label="Plugin binary size" />
                                                </>
                                            ) : (
                                                <p style={{ fontSize: '0.82rem', color: 'var(--mp-error)' }}>No .wasm file — required</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Live card preview */}
                                <div style={{ width: 280, flexShrink: 0, position: 'sticky', top: '1rem' }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mp-text-3)', marginBottom: '0.65rem' }}>Store card preview</p>
                                    <div style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--mp-surface, #16191f)', border: '1px solid var(--mp-border, rgba(255,255,255,0.07))', boxShadow: '0 8px 32px rgba(0,0,0,0.35)', fontSize: '0.85rem' }}>
                                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--mp-bg, #0d0f12)' }}>
                                            {previewImageUrl ? (
                                                <img src={previewImageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', fontWeight: 800, color: 'var(--mp-accent)', background: 'linear-gradient(135deg, rgba(79,126,255,0.12) 0%, #0d0f12 100%)' }}>
                                                    {name ? name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(13,15,18,0.55) 65%, rgba(13,15,18,0.96) 100%)', pointerEvents: 'none' }} />
                                            {category && (
                                                <span style={{ position: 'absolute', top: 8, left: 8, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: 'rgba(13,15,18,0.72)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', padding: '0.18rem 0.45rem', borderRadius: 4 }}>{category}</span>
                                            )}
                                            <span style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 4, backdropFilter: 'blur(6px)', background: licenseType === 'paid' ? 'rgba(255,209,102,0.16)' : 'rgba(6,214,160,0.18)', border: licenseType === 'paid' ? '1px solid rgba(255,209,102,0.35)' : '1px solid rgba(6,214,160,0.35)', color: licenseType === 'paid' ? '#ffd166' : '#06d6a0' }}>
                                                {licenseType === 'paid' ? `€${price.toFixed(2)}` : 'Free'}
                                            </span>
                                        </div>
                                        <div style={{ padding: '0.8rem 0.9rem 0.9rem' }}>
                                            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--mp-text-1, #f0f0f0)', margin: '0 0 0.12rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-display, system-ui)' }}>
                                                {name || <span style={{ color: 'var(--mp-text-3)' }}>Plugin name…</span>}
                                            </p>
                                            <p style={{ fontSize: '0.68rem', color: 'var(--mp-text-3, #5a6070)', margin: '0 0 0.5rem' }}>by {developerName.trim() || user?.username || '—'}</p>
                                            <p style={{ fontSize: '0.73rem', color: 'var(--mp-text-2, #8b909a)', lineHeight: 1.5, margin: '0 0 0.7rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {descriptions[DEFAULT_LOCALE]?.trim() || <span style={{ color: 'var(--mp-text-3)', fontStyle: 'italic' }}>No description yet…</span>}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid var(--mp-border, rgba(255,255,255,0.06))' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.66rem', color: 'var(--mp-text-3)' }}>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                                    </svg>
                                                    0
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.66rem', color: 'var(--mp-text-3)', marginLeft: 'auto', fontFamily: 'var(--font-mono, monospace)' }}>v1.0.0</span>
                                            </div>
                                        </div>
                                        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--mp-accent), transparent)' }} />
                                    </div>
                                    <p style={{ fontSize: '0.67rem', color: 'var(--mp-text-3)', marginTop: '0.6rem', lineHeight: 1.5, textAlign: 'center' }}>This is how your plugin will appear on the store.</p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* ── Nav bar ── */}
                <div className="ap-nav-bar">
                    <button className="mp-btn mp-btn-outline"
                        onClick={() => setStep(s => s - 1)} disabled={step === 0}>
                        <ChevronLeft size={16} />Back
                    </button>
                    {step < totalSteps - 1 ? (
                        <button className="mp-btn mp-btn-primary"
                            onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                            Continue<ChevronRight size={16} />
                        </button>
                    ) : (
                        <button className="mp-btn mp-btn-success"
                            onClick={handleSubmit}
                            disabled={submitting || !wasmFile || imageBudgetExceeded || wasmTooLarge || hasFieldErrors}>
                            {submitting ? 'Publishing…' : 'Publish Plugin'}
                            {!submitting && <CheckCircle size={16} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddPlugin;