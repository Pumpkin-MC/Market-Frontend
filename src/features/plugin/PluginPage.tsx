import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import { PluginVideoPlayer } from './PluginVideoPlayer';
import { GuidelineRejectionPicker, RejectionReasonsList } from '../../components/GuidelineRejectionPicker';
import { serializeRejectionReason } from '../../lib/guidelines';
import { Sparkles, History, ChevronRight, ChevronLeft, Star, Check, Trash2, Flag, MessageSquare, Copy, Key, ChevronDown, ChevronUp, Package, Play, X, ShieldCheck, AlertTriangle, Lock, Cpu, Globe, HardDrive, Terminal, Fingerprint } from 'lucide-react';
import type { PluginDetail, PluginCommand } from '../../types/plugin';
import '../../styles/plugin.css';

const getYoutubeVideoId = (url: string) => {
  if (!url) return null;
  try {
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/embed/')) {
      return url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/shorts/')) {
      return url.split('youtube.com/shorts/')[1].split(/[?#]/)[0];
    } else if (url.includes('v=')) {
      return url.split('v=')[1].split(/[&?#]/)[0];
    }
    return null;
  } catch {
    return null;
  }
};

const REPORT_REASONS = [
  'Malware or malicious code',
  'Stolen or plagiarised content',
  'Misleading description',
  'Broken / non-functional',
  'Inappropriate content',
  'Spam or fake listing',
  'Other',
];

const REVIEW_REPORT_REASONS = [
  'Inappropriate language',
  'Spam or advertising',
  'Hate speech or harassment',
  'Off-topic or irrelevant',
  'Other',
];
const MAX_REVIEW_LENGTH = 2000;

const safeMarkdownComponents = {
  a: ({ href, children, ...props }: any) => {
    const isSafe = typeof href === 'string' && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/'));
    if (!isSafe) {
      return <span>{children}</span>;
    }
    const isExternal = href.startsWith('http://') || href.startsWith('https://');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer nofollow' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt, ...props }: any) => {
    const isSafe = typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'));
    if (!isSafe) {
      return null;
    }
    return (
      <img
        src={src}
        alt={alt || 'Plugin illustration'}
        loading="lazy"
        decoding="async"
        className="pd-md-img"
        {...props}
      />
    );
  },
};

const Stars = ({ value, onRate }: { value: number; onRate?: (n: number) => void }) => (
  <span className={`stars${onRate ? ' pd-rate' : ''}`} role={onRate ? 'radiogroup' : 'img'} aria-label={`${value} / 5`}>
    {[1, 2, 3, 4, 5].map(n => onRate ? (
      <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} / 5`} onClick={() => onRate(n)}>
        <Star className={n <= value ? '' : 'off'} />
      </button>
    ) : (
      <Star key={n} className={n <= Math.round(value) ? '' : 'off'} />
    ))}
  </span>
);

const ExpandableText = ({ text, limit = 500, className }: { text: string; limit?: number; className?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > limit;
  const displayText = isExpanded ? text : text.slice(0, limit) + (shouldTruncate ? '...' : '');

  return (
    <div className={className}>
      <p className="pd-pre">{displayText}</p>
      {shouldTruncate && (
        <button type="button" className="pd-textbtn" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Show Less' : 'Expand'}
        </button>
      )}
    </div>
  );
};

const euro = (cents: number) => `€${(cents / 100).toFixed(2)}`;

const getAvatarClass = (username: string) => {
  const classes = ['', 'avatar-fg', 'avatar-ghost'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return classes[Math.abs(hash) % classes.length];
};

const getInitials = (username: string) => {
  const parts = username.trim().split(/[\s_\-\.]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};

const getLocalizedCommandDescription = (
  rawDescription: string | Record<string, string> | undefined | null,
  activeLanguage: string
): string => {
  if (!rawDescription) return '';
  if (typeof rawDescription === 'object') {
    const full = activeLanguage;
    const short = activeLanguage.slice(0, 2);
    return (
      rawDescription[full] ||
      rawDescription[short] ||
      rawDescription['en-US'] ||
      rawDescription['en'] ||
      rawDescription['en-GB'] ||
      Object.values(rawDescription)[0] ||
      ''
    );
  }
  if (typeof rawDescription === 'string') {
    try {
      const parsed = JSON.parse(rawDescription);
      if (parsed && typeof parsed === 'object') {
        return getLocalizedCommandDescription(parsed, activeLanguage);
      }
      return rawDescription;
    } catch {
      return rawDescription;
    }
  }
  return '';
};

const PluginCommands = ({ commands }: { commands?: PluginCommand[] }) => {
  const { t, i18n } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!commands || commands.length === 0) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeLang = i18n.language || 'en';
  const visibleCommands = expanded ? commands : commands.slice(0, 4);

  return (
    <div className="stack">
      <ul className="pd-cmds">
        {visibleCommands.map((cmd: any, index: number) => {
          const desc = getLocalizedCommandDescription(cmd.description, activeLang);
          const cmdCopyKey = `cmd-${cmd.id || index}`;
          const permCopyKey = `perm-${cmd.id || index}`;
          const formattedName = cmd.name?.startsWith('/') ? cmd.name : `/${cmd.name}`;

          return (
            <li key={cmd.id || index} className="pd-cmd">
              <div className="pd-cmd-head">
                <code className="pd-cmd-name">{formattedName}</code>
                <button
                  type="button"
                  className="button button-flat button-sm"
                  onClick={() => handleCopy(formattedName, cmdCopyKey)}
                  title={t('plugin.commands.copy_command', 'Copy command')}
                  aria-label={t('plugin.commands.copy_command', 'Copy command')}
                >
                  {copiedId === cmdCopyKey ? (
                    <>
                      <Check />
                      <span>{t('plugin.commands.copied', 'Copied')}</span>
                    </>
                  ) : (
                    <Copy />
                  )}
                </button>
              </div>

              {cmd.aliases && Array.isArray(cmd.aliases) && cmd.aliases.length > 0 ? (
                <div className="row pd-aliases">
                  <span className="label">{t('plugin.commands.aliases', 'Aliases')}</span>
                  {cmd.aliases.map((alias: string, aIdx: number) => (
                    <code key={aIdx} className="pd-chip">{alias.startsWith('/') ? alias : `/${alias}`}</code>
                  ))}
                </div>
              ) : null}

              {cmd.permission ? (
                <div className="pd-perm">
                  <Key />
                  <code>{cmd.permission}</code>
                  <button
                    type="button"
                    className={`pd-iconbtn${copiedId === permCopyKey ? ' pd-ok' : ''}`}
                    onClick={() => handleCopy(cmd.permission, permCopyKey)}
                    title={t('plugin.commands.copy_permission', 'Copy permission')}
                    aria-label={t('plugin.commands.copy_permission', 'Copy permission')}
                  >
                    {copiedId === permCopyKey ? <Check /> : <Copy />}
                  </button>
                </div>
              ) : null}

              {desc ? <p className="pd-cmd-desc">{desc}</p> : null}
            </li>
          );
        })}
      </ul>

      {commands.length > 4 && (
        <button type="button" className="button button-flat button-block" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <>
              <ChevronUp />
              {t('plugin.commands.show_less', 'Show less')}
            </>
          ) : (
            <>
              <ChevronDown />
              {t('plugin.commands.show_all', 'Show all {{count}} commands', { count: commands.length })}
            </>
          )}
        </button>
      )}
    </div>
  );
};

const PluginPage = () => {
  const { t, i18n } = useTranslation();
  const { id: rawId, slug } = useParams();
  const id = rawId ? rawId.split('-')[0] : rawId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [plugin, setPlugin] = useState<PluginDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [adShown, setAdShown] = useState(false);
  const [mainScreenshot, setMainScreenshot] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponMessage(null);
    try {
      const res = await api.get(`/plugins/${id}/validate-coupon?code=${couponCode.trim()}`);
      if (res.data.valid) {
        setAppliedCoupon(couponCode.trim().toUpperCase());
        setCouponDiscount(res.data.discount_percent);
        setCouponMessage({ text: res.data.message, isError: false });
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponMessage({ text: res.data.message || 'Invalid coupon code', isError: true });
      }
    } catch {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponMessage({ text: 'Failed to validate coupon.', isError: true });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleClearCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponMessage(null);
  };

  // Ownership
  const [ownsPlugin, setOwnsPlugin] = useState(false);
  const [ownershipChecked, setOwnershipChecked] = useState(false);

  // PPM copy state
  const [ppmCopied, setPpmCopied] = useState(false);
  const handleCopyPpm = (text: string) => {
    navigator.clipboard.writeText(text);
    setPpmCopied(true);
    setTimeout(() => setPpmCopied(false), 2000);
  };

  // Payment success banner
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSelected, setReportSelected] = useState<string>('');
  const [reportCustom, setReportCustom] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [tab, setTab] = useState<'overview' | 'commands' | 'security'>('overview');
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedPerm, setCopiedPerm] = useState<string | null>(null);

  // Review Report State
  const [reviewReportOpen, setReviewReportOpen] = useState<number | null>(null);
  const [reviewReportSelected, setReviewReportSelected] = useState('');
  const [reviewReportCustom, setReviewReportCustom] = useState('');
  const [reviewReportSubmitting, setReviewReportSubmitting] = useState(false);

  const [replyOpen, setReplyOpen] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const isOwner = user && plugin && user.id === plugin.dev_id;
  const isStaff = user?.role === 'admin' || user?.role === 'moderator';
  const canReview = isStaff || user?.role === 'reviewer';
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffRejectOpen, setStaffRejectOpen] = useState(false);
  const [staffRejectCodes, setStaffRejectCodes] = useState<string[]>([]);
  const [staffRejectOtherChecked, setStaffRejectOtherChecked] = useState(false);
  const [staffRejectReason, setStaffRejectReason] = useState('');
  const [reportedReviews, setReportedReviews] = useState<Set<number>>(new Set());

  // ── Detect ?payment=success and strip from URL ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      setShowPaymentSuccess(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, []);

  // ── Fetch plugin ─────────────────────────────────────────────────────────
  const fetchPlugin = () => {
    setLoading(true);
    setError(null);
    api.get(`/plugins/${id}`).then(res => {
      setPlugin(res.data);
      if (res.data.youtube_video_url) {
        setMainScreenshot('video');
      } else if (res.data.screenshots?.length > 0) {
        setMainScreenshot(res.data.screenshots[0].path);
      }

      // Canonical URL check & replace (App ID)
      if (res.data.name) {
        const expectedSlug = res.data.name.toLowerCase().trim().replace(/[\s_\.\-]+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
        const targetId = res.data.public_id || res.data.id;
        const targetPath = expectedSlug ? `/plugin/${targetId}-${expectedSlug}` : `/plugin/${targetId}`;
        if (location.pathname !== targetPath || slug !== expectedSlug || rawId !== targetId) {
          window.history.replaceState({}, '', targetPath + location.search);
        }
      }
    })
    .catch(err => {
      console.error('Failed to load plugin:', err);
      setError('Plugin not found or failed to load.');
    })
    .finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => { fetchPlugin(); }, [id]);

  // ── Check ownership ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !id) { setOwnershipChecked(true); return; }
    api.get(`/plugins/${id}/owned`)
    .then(res => setOwnsPlugin(res.data.owned === true))
    .catch(() => setOwnsPlugin(false))
    .finally(() => setOwnershipChecked(true));
  }, [user, id]);

  // ── Translations ─────────────────────────────────────────────────────────
  const currentDescription = useMemo(() => {
    const extractText = (val: unknown): string => {
      if (typeof val === 'string') return val;
      if (val && typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        if (typeof obj.description === 'string') return obj.description;
        if (typeof obj.shortDescription === 'string') return obj.shortDescription;
      }
      return '';
    };

    if (plugin?.translated_descriptions) {
      try {
        const translations = typeof plugin.translated_descriptions === 'string'
          ? JSON.parse(plugin.translated_descriptions)
          : plugin.translated_descriptions;
        if (typeof translations === 'string') return translations;
        if (translations && typeof translations === 'object') {
          const fullLang = i18n.language || 'en-US';
          const activeLang = fullLang.slice(0, 2);
          const candidate =
            translations[fullLang] ??
            translations[activeLang] ??
            translations['en-US'] ??
            translations['en'] ??
            translations['en-GB'] ??
            Object.values(translations)[0];
          const extracted = extractText(candidate);
          if (extracted) return extracted;
        }
      } catch {
        return typeof plugin.description === 'string' ? plugin.description : '';
      }
    }
    return typeof plugin?.description === 'string' ? plugin.description : '';
  }, [plugin, i18n.language]);

  // ── Lightbox helpers ─────────────────────────────────────────────────────
  const screenshots = plugin?.screenshots ?? [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxImage(screenshots[index]?.path ?? null);
  };

  const openLightboxWithSrc = useCallback((src: string) => {
    const idx = screenshots.findIndex((s: any) => s.path === src);
    if (idx >= 0) {
      setLightboxIndex(idx);
    }
    setLightboxImage(src);
  }, [screenshots]);

  const isScreenshotInGallery = useMemo(() => {
    return screenshots.length > 1 && screenshots.some((s: any) => s.path === lightboxImage);
  }, [screenshots, lightboxImage]);

  const markdownComponents = useMemo(() => ({
    ...safeMarkdownComponents,
    img: ({ src, alt, ...props }: any) => {
      const isSafe = typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'));
      if (!isSafe) {
        return null;
      }
      return (
        <img
          src={src}
          alt={alt || 'Plugin illustration'}
          loading="lazy"
          decoding="async"
          className="pd-md-img"
          onClick={() => openLightboxWithSrc(src)}
          {...props}
        />
      );
    },
  }), [openLightboxWithSrc]);

  const lightboxPrev = () => {
    if (!screenshots.length) return;
    const newIndex = (lightboxIndex - 1 + screenshots.length) % screenshots.length;
    setLightboxIndex(newIndex);
    setLightboxImage(screenshots[newIndex].path);
  };

  const lightboxNext = () => {
    if (!screenshots.length) return;
    const newIndex = (lightboxIndex + 1) % screenshots.length;
    setLightboxIndex(newIndex);
    setLightboxImage(screenshots[newIndex].path);
  };

  const closeLightbox = () => setLightboxImage(null);

  // ── Keyboard navigation for lightbox & version history modal ────────────
  useEffect(() => {
    if (!lightboxImage && !versionsOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxImage) {
        if (e.key === 'ArrowLeft' && isScreenshotInGallery) lightboxPrev();
        else if (e.key === 'ArrowRight' && isScreenshotInGallery) lightboxNext();
        else if (e.key === 'Escape') closeLightbox();
      } else if (versionsOpen && e.key === 'Escape') {
        setVersionsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage, lightboxIndex, screenshots, isScreenshotInGallery, versionsOpen]);

  const hasReviewed = useMemo(() => {
    if (!user || !plugin?.reviews || !Array.isArray(plugin.reviews)) return false;
    return plugin.reviews.some((r: any) => r.username === user.username);
  }, [plugin?.reviews, user]);

  const stats = useMemo(() => {
    if (!plugin?.reviews || !Array.isArray(plugin.reviews) || plugin.reviews.length === 0) return null;
    const total = plugin.reviews.length;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    plugin.reviews.forEach((r: any) => {
      distribution[r.rating as keyof typeof distribution]++;
      sum += r.rating;
    });
    return { avg: (sum / total).toFixed(1), total, distribution };
  }, [plugin?.reviews]);

  // ── Trigger a blob download ──────────────────────────────────────────────
  const triggerDownload = async (endpoint: string) => {
    if (!plugin) return;
    const res = await api.get(endpoint, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plugin.name.replace(/\s+/g, '_')}.wasm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download / purchase handler ──────────────────────────────────────────
  const handleDownload = async () => {
    if (!plugin) return;

    if (plugin.type === 'paid') {
      if (!user) return navigate('/login', { state: { from: `/plugin/${id}` } });

      // Already owns it — download directly, no checkout
      if (ownsPlugin) {
        if (plugin.is_preorder) {
          alert('You have successfully pre-ordered this plugin! You will receive an automated email notification the moment the developer releases the downloadable version.');
          return;
        }
        try {
          await triggerDownload(`/plugins/${id}/download/premium`);
        } catch {
          alert('Download failed. Please try again.');
        }
        return;
      }

      // Does not own — go to Stripe checkout
      try {
        const url = appliedCoupon ? `/plugins/${id}/checkout?coupon=${appliedCoupon}` : `/plugins/${id}/checkout`;
        const res = await api.post(url);
        if (res.data.url) window.location.href = res.data.url;
      } catch (err: any) {
        if (err?.response?.status === 409) {
          // Webhook already recorded purchase before redirect resolved
          setOwnsPlugin(true);
          if (plugin.is_preorder) {
            alert('You have pre-ordered this plugin! You will receive an email as soon as it releases.');
          } else {
            alert('You already own this plugin — downloading now.');
            await triggerDownload(`/plugins/${id}/download/premium`);
          }
        } else {
          alert('Checkout failed. Please try again.');
        }
      } finally {
      }
      return;
    }

    // Adwall
    if (plugin.type === 'adwall' && !adShown) {
      alert('Wait 5 seconds to support the developer...');
      setTimeout(() => setAdShown(true), 5000);
      return;
    }

    // Free / adwall (after ad)
    try {
      await triggerDownload(`/plugins/${id}/download`);
    } catch {
      alert('Download failed. Please try again.');
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const comment = reviewForm.comment.trim();
    if (!comment || comment.length > MAX_REVIEW_LENGTH) {
      return;
    }
    await api.post(`/plugins/${id}/reviews`, reviewForm);
    fetchPlugin();
    setReviewForm({ rating: 5, comment: '' });
  };

  const deleteReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await api.delete(`/plugins/${id}/reviews`);
      fetchPlugin();
    } catch {
      alert('Failed to delete review.');
    }
  };

  const submitReply = async (e: React.FormEvent, reviewId: number) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      await api.post(`/plugins/${id}/reviews/${reviewId}/reply`, { reply: replyText.trim() });
      setReplyOpen(null);
      setReplyText('');
      fetchPlugin();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post reply.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const resetReport = () => {
    setReportOpen(false);
    setReportSelected('');
    setReportCustom('');
    setReportDone(false);
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const reason = reportSelected === 'Other' ? reportCustom.trim() : reportSelected;
    if (!reason) return;
    setReportSubmitting(true);
    try {
      await api.post(`/plugins/${id}/report`, { reason });
      setReportDone(true);
    } catch {
      alert('Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const resetReviewReport = () => {
    setReviewReportOpen(null);
    setReviewReportSelected('');
    setReviewReportCustom('');
  };

  const submitReviewReport = async (e: React.FormEvent, reviewId: number) => {
    e.preventDefault();
    const reason = reviewReportSelected === 'Other' ? reviewReportCustom.trim() : reviewReportSelected;
    if (!reason) return;
    setReviewReportSubmitting(true);
    try {
      await api.post(`/plugins/${id}/reviews/${reviewId}/report`, { reason });
      setReportedReviews(prev => new Set(prev).add(reviewId));
      resetReviewReport();
      alert('Thank you. The report has been submitted to moderators.');
    } catch {
      alert('Failed to report review. Please try again.');
    } finally {
      setReviewReportSubmitting(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1048576) return `(${(bytes / 1048576).toFixed(2)} MB)`;
    if (bytes >= 1024) return `(${(bytes / 1024).toFixed(1)} KB)`;
    return `(${bytes} B)`;
  };


  const openTab = (next: typeof tab) => {
    setTab(next);
    document.getElementById('pd-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="stack pd-loading">
          <span className="loading" />
          <p className="label">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !plugin) {
    return (
      <div className="page pd">
        <div className="blank">
          <h1 className="h1">Plugin Not <span className="mark">Found</span></h1>
          <p className="small">{error || 'The requested plugin could not be found.'}</p>
          <Link to="/" className="button">{t('common.back')}</Link>
        </div>
      </div>
    );
  }

  const hasBinary = Boolean(plugin.file_size && plugin.file_size > 0);
  const isDraft = !plugin.status || plugin.status === 'draft';
  const isUnderReview = plugin.status === 'under_review';
  const isRejected = plugin.status === 'rejected';
  const isSuspended = plugin.status === 'suspended';

  const handleStaffClaim = async () => {
    if (!plugin) return;
    setStaffBusy(true);
    try {
      await api.post(`/admin/plugins/${plugin.id}/claim`);
      fetchPlugin();
    } catch (err: any) {
      alert(err?.response?.data || t('staff.actions.claim_failed'));
    } finally {
      setStaffBusy(false);
    }
  };

  const handleStaffUnclaim = async () => {
    if (!plugin) return;
    setStaffBusy(true);
    try {
      await api.post(`/admin/plugins/${plugin.id}/unclaim`);
      fetchPlugin();
    } catch (err: any) {
      alert(err?.response?.data || t('staff.actions.unclaim_failed'));
    } finally {
      setStaffBusy(false);
    }
  };

  const handleStaffApprove = async () => {
    if (!plugin) return;
    setStaffBusy(true);
    try {
      await api.post(`/admin/plugins/${plugin.id}/approve`, { reason: 'Approved during page inspection' });
      fetchPlugin();
    } catch (err: any) {
      alert(err?.response?.data || t('staff.actions.approve_failed'));
    } finally {
      setStaffBusy(false);
    }
  };

  const canSubmitStaffReject =
    staffRejectCodes.length > 0
      ? !staffRejectOtherChecked || Boolean(staffRejectReason.trim())
      : staffRejectOtherChecked && Boolean(staffRejectReason.trim());

  const toggleStaffRejectCode = (code: string) => {
    setStaffRejectCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleStaffReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plugin || !canSubmitStaffReject) return;
    setStaffBusy(true);
    try {
      const reason = serializeRejectionReason(
        staffRejectCodes,
        staffRejectOtherChecked ? staffRejectReason : ''
      );
      await api.post(`/admin/plugins/${plugin.id}/reject`, { reason });
      setStaffRejectOpen(false);
      setStaffRejectCodes([]);
      setStaffRejectOtherChecked(false);
      setStaffRejectReason('');
      fetchPlugin();
    } catch (err: any) {
      alert(err?.response?.data || t('staff.actions.reject_failed'));
    } finally {
      setStaffBusy(false);
    }
  };

  const downloadLabel = (() => {
    if (!hasBinary && !plugin.is_preorder) {
      return t('plugin.no_binary');
    }
    const sizeStr = plugin?.file_size ? ` ${formatSize(plugin.file_size)}` : '';

    if (plugin.type === 'paid') {
      if (!ownershipChecked) return 'Loading…';
      if (ownsPlugin) {
        if (plugin.is_preorder) {
          return 'Pre-Ordered (Awaiting Release)';
        }
        return `Download ${sizeStr}`;
      }
      if (plugin.is_preorder) {
        return 'Pre-Order Now';
      }
      return 'Purchase Plugin';
    }

    if (plugin.type === 'adwall' && !adShown) return 'Watch Ad to Download';

    return `Download ${sizeStr}`;
  })();

  const cleanDesc = currentDescription
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
    .trim();

  const productSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": plugin.name,
        "description": cleanDesc,
        "operatingSystem": "Minecraft",
        "applicationCategory": "GameApplication",
        "softwareVersion": plugin.version || "1.0.0",
        "fileSize": plugin.file_size ? `${plugin.file_size} B` : undefined,
        "image": plugin.preview_path || "https://market.pumpkinmc.org/icon.png",
        "offers": {
          "@type": "Offer",
          "price": plugin.type === 'paid' && plugin.price_cents ? (plugin.price_cents / 100).toFixed(2) : "0.00",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": stats ? {
          "@type": "AggregateRating",
          "ratingValue": stats.avg,
          "ratingCount": stats.total,
          "bestRating": "5",
          "worstRating": "1"
        } : undefined,
        "author": {
          "@type": "Person",
          "name": plugin.dev_name,
          "url": `https://market.pumpkinmc.org/profile/${plugin.dev_name}`
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://market.pumpkinmc.org"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": plugin.category || "Plugins",
            "item": `https://market.pumpkinmc.org/search?category=${encodeURIComponent(plugin.category || '')}`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": plugin.name,
            "item": `https://market.pumpkinmc.org/plugin/${plugin.public_id || plugin.id}`
          }
        ]
      }
    ]
  };

  const versions = Array.isArray(plugin.versions) ? plugin.versions : [];
  const reviews = Array.isArray(plugin.reviews) ? plugin.reviews : [];
  const commandCount = plugin.commands?.length ?? 0;
  const basePrice = plugin.price_cents ?? 0;
  const saleDiscount = plugin.sale_active ? plugin.sale_discount_percent ?? 0 : 0;
  const salePrice = saleDiscount > 0 ? Math.round(basePrice * (1 - saleDiscount / 100)) : basePrice;
  const finalPrice = couponDiscount > 0 ? Math.round(salePrice * (1 - couponDiscount / 100)) : salePrice;
  const discounted = saleDiscount > 0 || couponDiscount > 0;
  const ppmCommand = `ppm install ${plugin.public_id || plugin.id}`;
  const trackTone: Record<string, string> = { stable: 'tag-success', beta: 'tag-warning', alpha: 'tag-danger' };

  const tabList: [typeof tab, string, number?][] = [
    ['overview', t('plugin.tabs.overview')],
    ...(commandCount > 0 ? [['commands', t('plugin.commands.title', 'Commands'), commandCount] as [typeof tab, string, number]] : []),
    ['security', t('plugin.tabs.security')],
  ];

  const activeTab = tabList.some(([key]) => key === tab) ? tab : 'overview';

  const reasonPicker = (
    reasons: string[],
    selected: string,
    onPick: (reason: string) => void,
  ) => (
    <div className="segmented pd-reasons">
      {reasons.map(reason => (
        <button key={reason} type="button" aria-pressed={selected === reason} onClick={() => onPick(reason)}>
          {reason}
        </button>
      ))}
    </div>
  );

  const seoPriceLabel = (() => {
    if (plugin.type === 'paid') {
      const priceText = saleDiscount > 0 ? `${euro(salePrice)} (-${saleDiscount}%)` : euro(basePrice);
      return plugin.is_preorder ? `${priceText} (Pre-Order)` : priceText;
    }
    if (plugin.type === 'adwall') return 'Free (Ad-Supported)';
    return 'Free';
  })();

  const seoStatsLine = [
    plugin.category,
    plugin.version ? `v${plugin.version.replace(/^v/, '')}` : null,
    seoPriceLabel,
    plugin.is_early_access ? 'Early Access' : null,
    `${(plugin.downloads ?? 0).toLocaleString()} ${(plugin.downloads ?? 0) === 1 ? 'download' : 'downloads'}`,
    stats ? `★ ${stats.avg}/5 (${stats.total})` : null,
  ].filter(Boolean).join(' • ');

  const seoSummary = cleanDesc || `Download ${plugin.name} by ${plugin.dev_name} on Pumpkin Market.`;
  const seoMetaDesc = `${seoSummary} — ${seoStatsLine}`;
  const seoOgDesc = `${seoSummary}\n\n${seoStatsLine}`;
  const seoOgTitle = plugin.version
    ? `${plugin.name} (v${plugin.version.replace(/^v/, '')}) by ${plugin.dev_name}`
    : `${plugin.name} by ${plugin.dev_name}`;
  const ytVideoId = plugin.youtube_video_url ? getYoutubeVideoId(plugin.youtube_video_url) : null;
  const seoOgImage =
    plugin.preview_path ||
    screenshots[0]?.path ||
    (ytVideoId ? `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg` : '/icon.png');
  const seoTwitterCard = plugin.preview_path
    ? 'summary'
    : screenshots.length > 0 || ytVideoId
      ? 'summary_large_image'
      : 'summary';
  const expectedSlug = plugin.name
    .toLowerCase()
    .trim()
    .replace(/[\s_.\-]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  const targetPluginId = plugin.public_id || plugin.id;
  const canonicalUrl = expectedSlug
    ? `https://market.pumpkinmc.org/plugin/${targetPluginId}-${expectedSlug}`
    : `https://market.pumpkinmc.org/plugin/${targetPluginId}`;

  return (
    <div className="page pd">
      <SEO
        title={`${plugin.name} by ${plugin.dev_name}`}
        ogTitle={seoOgTitle}
        description={seoMetaDesc}
        ogDescription={seoOgDesc}
        canonical={canonicalUrl}
        keywords={`${plugin.name}, ${plugin.dev_name}, minecraft plugin, pumpkinmc, wasm, ${plugin.category || ''}, ${plugin.keywords || ''}`}
        ogType="website"
        ogImage={seoOgImage}
        twitterCard={seoTwitterCard}
        twitterLabels={{
          label1: 'Developer',
          data1: plugin.dev_name,
          label2: 'Price',
          data2: seoPriceLabel,
        }}
      />
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Market</Link>
        <ChevronRight />
        {plugin.category && (
          <>
            <Link to={`/search?category=${encodeURIComponent(plugin.category)}`}>{plugin.category}</Link>
            <ChevronRight />
          </>
        )}
        <span aria-current="page">{plugin.name}</span>
      </nav>

      {(isDraft || isUnderReview || isRejected || isSuspended || showPaymentSuccess || plugin.is_preorder || plugin.is_early_access) && (
        <div className="pd-notices">
          {isDraft && (
            <div className="notice notice-warning" role="status">
              <span className="sticker sticker-warning"><Lock /> {t('staff.banners.draft_badge', 'Draft Mode')}</span>
              <div className="notice-text pd-notice-body">
                <p>
                  <strong>{t('staff.banners.draft_title', 'This plugin is currently in Draft mode and is not publicly listed on PumpkinMarket.')}</strong>{' '}
                  {t('staff.banners.draft_desc', 'Only the plugin developer, moderators, and administrators can view this page.')}
                </p>
              </div>
              <div className="row">
                {isOwner && (
                  <Link to={`/dashboard/manage-plugin/${plugin.public_id || plugin.id}`} className="button button-primary button-sm">
                    {t('staff.actions.manage_draft', 'Manage Draft')}
                  </Link>
                )}
                {isStaff && (
                  <Link to="/staff" className="button button-ghost button-sm">
                    {t('staff.actions.staff_dashboard', 'Staff Dashboard')}
                  </Link>
                )}
              </div>
            </div>
          )}

          {isUnderReview && (
            <div className="notice notice-pumpkin" role="status">
              <span className="sticker"><ShieldCheck /> {t('staff.banners.under_review_badge', 'Under Review')}</span>
              <div className="notice-text pd-notice-body">
                <p>
                  <strong>{t('staff.banners.under_review_title', 'This plugin is awaiting review by the PumpkinMarket Staff & Review Team.')}</strong>{' '}
                  {t('staff.banners.under_review_desc', 'It is hidden from the public store until approved.')}
                  {plugin.claimed_by_name && (
                    <> {t('staff.banners.claimed_by', { name: plugin.claimed_by_name, defaultValue: 'Currently claimed by @{{name}}.' })}</>
                  )}
                </p>
              </div>
              <div className="row">
                {canReview && (
                  <>
                    {!plugin.claimed_by_id ? (
                      <button type="button" className="button button-sm" onClick={handleStaffClaim} disabled={staffBusy}>
                        {t('staff.actions.claim_review', 'Claim Review')}
                      </button>
                    ) : plugin.claimed_by_id === user?.id || user?.role === 'admin' ? (
                      <>
                        <button type="button" className="button button-primary button-sm" onClick={handleStaffApprove} disabled={staffBusy}>
                          <Check /> {t('staff.actions.approve', 'Approve')}
                        </button>
                        <button type="button" className="button button-danger button-sm" onClick={() => setStaffRejectOpen(true)} disabled={staffBusy}>
                          {t('staff.actions.request_changes', 'Request Changes')}
                        </button>
                        <button type="button" className="button button-ghost button-sm" onClick={handleStaffUnclaim} disabled={staffBusy}>
                          {t('staff.actions.release', 'Release')}
                        </button>
                      </>
                    ) : null}
                    <Link to="/staff" className="button button-ghost button-sm">
                      {t('staff.actions.staff_queue', 'Staff Queue')}
                    </Link>
                  </>
                )}
                {isOwner && (
                  <Link to={`/dashboard/manage-plugin/${plugin.public_id || plugin.id}`} className="button button-ghost button-sm">
                    {t('staff.actions.manage_plugin', 'Manage Plugin')}
                  </Link>
                )}
              </div>
            </div>
          )}

          {isRejected && (
            <div className="notice notice-danger gl-notice-rejected" role="status">
              <span className="sticker sticker-danger"><AlertTriangle /> {t('guidelines.changes_requested', 'Changes Requested')}</span>
              <div className="notice-text pd-notice-body gl-notice-body">
                <p>
                  <strong>{t('guidelines.changes_requested_intro', 'Your submission requires changes before it can be published:')}</strong>
                </p>
                <RejectionReasonsList rejectionReason={plugin.rejection_reason} />
              </div>
              <div className="row">
                {isOwner && (
                  <Link to={`/dashboard/manage-plugin/${plugin.public_id || plugin.id}`} className="button button-primary button-sm">
                    {t('staff.actions.fix_resubmit', 'Fix & Resubmit')}
                  </Link>
                )}
                {canReview && (
                  <>
                    <button type="button" className="button button-sm" onClick={handleStaffApprove} disabled={staffBusy}>
                      <Check /> {t('staff.actions.approve_now', 'Approve Now')}
                    </button>
                    <Link to="/staff" className="button button-ghost button-sm">
                      {t('staff.actions.staff_queue', 'Staff Queue')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {isSuspended && (
            <div className="notice notice-danger gl-notice-rejected" role="status">
              <span className="sticker sticker-danger"><AlertTriangle /> {t('staff.banners.suspended_badge', 'Suspended')}</span>
              <div className="notice-text pd-notice-body gl-notice-body">
                <p>
                  <strong>{t('staff.banners.suspended_title', 'This plugin has been suspended by moderation and is hidden from the public store.')}</strong>
                </p>
                {plugin.rejection_reason && <RejectionReasonsList rejectionReason={plugin.rejection_reason} />}
              </div>
              {isStaff && (
                <Link to="/staff" className="button button-ghost button-sm">
                  {t('staff.actions.staff_dashboard', 'Staff Dashboard')}
                </Link>
              )}
            </div>
          )}

          {showPaymentSuccess && (
            <div className="notice notice-success" role="status">
              <span className="sticker sticker-success">Purchase successful!</span>
              <p className="notice-text">
                You now own <strong>{plugin.name}</strong>. Click the download button to get your WASM file.
              </p>
              <button type="button" className="button button-ghost button-sm button-icon" onClick={() => setShowPaymentSuccess(false)} aria-label="Dismiss">
                <X />
              </button>
            </div>
          )}

          {plugin.is_preorder && (
            <div className="notice notice-pumpkin">
              <span className="sticker">Available for Pre-Order</span>
              <div className="notice-text pd-notice-body">
                {plugin.preorder_release_date && (
                  <span className="label label-fg">Expected: {formatDate(plugin.preorder_release_date)}</span>
                )}
                {ownsPlugin ? (
                  <p className="pd-ok">
                    <Check /> You have successfully pre-ordered this plugin! Your license key is reserved, and you will receive an automatic email notification the moment the download is released.
                  </p>
                ) : (
                  <p>
                    Pre-order now to secure your license key and early access. You will receive an automatic email notification the moment the developer releases the downloadable version.
                  </p>
                )}
              </div>
            </div>
          )}

          {plugin.is_early_access && (
            <div className="notice notice-warning">
              <span className="sticker sticker-warning">Early Access Plugin</span>
              <p className="notice-text">
                This plugin is currently in <strong>Early Access</strong>. It is still under active development and may contain bugs or incomplete features.
                Downloading it now helps support the developer and shape the future of the plugin!
              </p>
            </div>
          )}
        </div>
      )}

      <div className="pd-layout">
        <div className="pd-main">
          <header className="pd-head">
            <span className="avatar pd-icon">
              {plugin.preview_path ? <img src={plugin.preview_path} alt="" /> : plugin.name.charAt(0)}
            </span>
            <div className="pd-title">
              <h1 className="display-2">{plugin.name}</h1>
              <div className="row">
                <span className="entry-by">{t('plugin.by')} <Link className="link" to={`/profile/${plugin.dev_name}`}>{plugin.dev_name}</Link></span>
                {plugin.dev_verified && <span className="tag tag-info" title={t('plugin.verified_developer')}><ShieldCheck size={12} /> {t('staff.table.verified')}</span>}
                {plugin.category && <span className="tag tag-fg">{plugin.category}</span>}
                {plugin.is_preorder && <span className="sticker sticker-sm">PRE-ORDER</span>}
                {plugin.is_early_access && <span className="sticker sticker-sm sticker-warning">Early Access</span>}
                {plugin.type === 'paid' && saleDiscount > 0 && <span className="sticker sticker-sm">-{saleDiscount}%</span>}
              </div>
              {stats && (
                <div className="row pd-score">
                  <Stars value={Number(stats.avg)} />
                  <span className="small"><strong>{stats.avg}</strong> · {stats.total.toLocaleString()} Ratings</span>
                </div>
              )}
            </div>
          </header>

          <div className="pd-body">
            <div className="tabs" role="tablist" id="pd-tabs">
              {tabList.map(([key, label, count]) => (
                <button key={key} type="button" role="tab" aria-selected={activeTab === key} aria-controls="pd-panel" onClick={() => setTab(key)}>
                  {label}
                  {count !== undefined && <span className="count">{count}</span>}
                </button>
              ))}
            </div>

            <div className="pd-panel" id="pd-panel" role="tabpanel">
              {activeTab === 'overview' && (
                <>
                  {screenshots.length > 0 ? (
                    <div className="pd-media">
                      {mainScreenshot === 'video' ? (
                        <PluginVideoPlayer url={plugin.youtube_video_url || undefined} />
                      ) : (
                        <button
                          type="button"
                          className="pd-stage"
                          onClick={() => {
                            const idx = screenshots.findIndex((s: any) => s.path === (mainScreenshot || screenshots[0]?.path));
                            openLightbox(idx >= 0 ? idx : 0);
                          }}
                        >
                          <img src={mainScreenshot || screenshots[0]?.path} alt="Main" />
                        </button>
                      )}
                      <div className="pd-thumbs">
                        {plugin.youtube_video_url && (
                          <button type="button" className="pd-thumb" aria-pressed={mainScreenshot === 'video'} onClick={() => setMainScreenshot('video')}>
                            {getYoutubeVideoId(plugin.youtube_video_url) ? (
                              <img src={`https://img.youtube.com/vi/${getYoutubeVideoId(plugin.youtube_video_url)}/hqdefault.jpg`} alt="Video Thumbnail" />
                            ) : (
                              <span className="label">Video</span>
                            )}
                            <span className="pd-play"><Play /></span>
                          </button>
                        )}
                        {screenshots.map((shot: any) => (
                          <button key={shot.id} type="button" className="pd-thumb" aria-pressed={mainScreenshot === shot.path} onClick={() => setMainScreenshot(shot.path)}>
                            <img src={shot.path} alt="Thumbnail" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : plugin.youtube_video_url ? (
                    <div className="pd-media">
                      <PluginVideoPlayer url={plugin.youtube_video_url} />
                    </div>
                  ) : null}

                  {versions.length > 0 && (() => {
                    const latest = versions[0];
                    const isLong = Boolean(latest.release_notes && (latest.release_notes.length > 200 || latest.release_notes.split('\n').length > 4));
                    return (
                      <section className="panel pd-news">
                        <div className="panel-head">
                          <Sparkles className="pumpkin" />
                          <h2 className="h3">What's New</h2>
                          <span className="tag tag-pumpkin">v{latest.version}</span>
                          {latest.api_version && <span className="tag tag-fg">API v{latest.api_version}</span>}
                          {latest.created_at && <span className="small">{formatDate(latest.created_at)}</span>}
                          <span className="spacer" />
                          {versions.length > 1 && (
                            <button type="button" className="button button-flat button-sm" onClick={() => setVersionsOpen(true)}>
                              <History />
                              Version History ({versions.length})
                            </button>
                          )}
                        </div>
                        <div className={`panel-body pd-prose${isLong ? ' pd-clamp' : ''}`}>
                          {latest.release_notes ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {latest.release_notes}
                            </ReactMarkdown>
                          ) : (
                            <p className="muted">Bug fixes and performance improvements.</p>
                          )}
                        </div>
                        {isLong && (
                          <div className="panel-foot">
                            <button type="button" className="button button-ghost button-sm" onClick={() => setVersionsOpen(true)}>
                              {t('plugin.view_more')}
                              <ChevronRight />
                            </button>
                          </div>
                        )}
                      </section>
                    );
                  })()}

                  <div className="pd-prose">
                    {currentDescription.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{currentDescription}</ReactMarkdown>
                    ) : (
                      <p className="muted">{t('plugin.no_description')}</p>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'commands' && <PluginCommands commands={plugin.commands} />}

              {activeTab === 'security' && (() => {
                const sec = plugin.wasm_security;
                const runtimePerms = sec?.runtime_permissions ?? [];
                const cmdPerms = sec?.command_permissions ?? [];
                const deps = sec?.dependencies ?? sec?.plugin_metadata?.dependencies ?? [];
                const metaAuthors = sec?.authors ?? sec?.plugin_metadata?.authors ?? [];
                const imports = sec?.imported_interfaces ?? [];
                const exportsList = sec?.exported_interfaces ?? [];
                return (
                  <section className="stack" aria-label={t('plugin.security.inspector_label')}>
                    <div className="notice notice-plain">
                      <span className="sticker sticker-success"><ShieldCheck /> {t('plugin.security.wit_badge')}</span>
                      <p className="notice-text">
                        {t('plugin.security.wit_intro_before')}{' '}<code>pumpkin:plugin/metadata#get-metadata</code>{' '}{t('plugin.security.wit_intro_after')}
                      </p>
                    </div>

                    <div className="pd-safety-grid">
                      <div className="pd-cap-card">
                        <div className="pd-cap-head">
                          <span className="pd-cap-title"><Cpu /> {t('plugin.security.sandbox_title')}</span>
                          <span className="tag tag-success">{t('plugin.security.enforced')}</span>
                        </div>
                        <p className="small muted">
                          {t('plugin.security.sandbox_desc_before')}{' '}<code>PluginMetadata.permissions</code>{t('plugin.security.sandbox_desc_after')}
                        </p>
                      </div>

                      <div className="pd-cap-card">
                        <div className="pd-cap-head">
                          <span className="pd-cap-title"><Fingerprint /> {t('plugin.security.signature_title')}</span>
                          <span className={`tag ${sec?.ed25519_signed ? 'tag-success' : 'tag-warning'}`}>
                            {sec?.ed25519_signed ? t('staff.table.verified') : t('plugin.security.pending_build')}
                          </span>
                        </div>
                        <p className="small muted">
                          {sec?.ed25519_signed
                            ? t('plugin.security.signature_verified_desc')
                            : t('plugin.security.signature_pending_desc')}
                        </p>
                      </div>

                      <div className="pd-cap-card">
                        <div className="pd-cap-head">
                          <span className="pd-cap-title"><Globe /> {t('plugin.security.network_title')}</span>
                          <span className={`tag ${sec?.network_access ? 'tag-warning' : 'tag-success'}`}>
                            {sec?.network_access ? t('plugin.security.requested') : t('plugin.security.no_network')}
                          </span>
                        </div>
                        <p className="small muted">
                          {sec?.network_access
                            ? t('plugin.security.network_requested_desc')
                            : t('plugin.security.network_none_desc')}
                        </p>
                      </div>

                      <div className="pd-cap-card">
                        <div className="pd-cap-head">
                          <span className="pd-cap-title"><HardDrive /> {t('plugin.security.fs_title')}</span>
                          <span className={`tag ${sec?.filesystem_access ? 'tag-warning' : 'tag-success'}`}>
                            {sec?.filesystem_access ? t('plugin.security.scoped_data_folder') : t('plugin.security.isolated')}
                          </span>
                        </div>
                        <p className="small muted">
                          {sec?.filesystem_access
                            ? t('plugin.security.fs_scoped_desc')
                            : t('plugin.security.fs_isolated_desc')}
                        </p>
                      </div>

                      <div className="pd-cap-card">
                        <div className="pd-cap-head">
                          <span className="pd-cap-title"><Terminal /> {t('plugin.security.system_title')}</span>
                          <span className={`tag ${sec?.system_access ? 'tag-warning' : 'tag-fg'}`}>
                            {sec?.system_access ? t('plugin.security.host_env_info') : t('plugin.security.cmd_count', { count: commandCount })}
                          </span>
                        </div>
                        <p className="small muted">
                          {sec?.system_access
                            ? t('plugin.security.system_requested_desc')
                            : commandCount > 0
                              ? t('plugin.security.system_commands_desc', { commands: commandCount, permissions: cmdPerms.length })
                              : t('plugin.security.system_none_desc')}
                        </p>
                      </div>

                      <div className="pd-cap-card">
                        <div className="pd-cap-head">
                          <span className="pd-cap-title"><Package /> {t('plugin.security.format_title')}</span>
                          <span className="tag tag-pumpkin">
                            {sec?.is_component ? t('plugin.security.component_wit') : t('plugin.security.core_wasm')}
                          </span>
                        </div>
                        <p className="small muted">
                          {sec?.binary_format || t('plugin.security.wasm_module')}
                          {plugin.api_version ? ` ${t('plugin.security.targeting_api', { version: plugin.api_version })}` : '.'}
                          {' '}
                          {deps.length > 0 ? t('plugin.security.depends_on_count', { count: deps.length }) : t('plugin.security.zero_deps')}
                        </p>
                      </div>
                    </div>

                    <div className="panel">
                      <div className="panel-head" style={{ justifyContent: 'space-between' }}>
                        <div className="row" style={{ gap: 8 }}>
                          <ShieldCheck className="pumpkin" />
                          <h3 className="h3">{t('staff.inspection.fields.permissions')}</h3>
                        </div>
                        <span className={`tag ${runtimePerms.length > 0 ? 'tag-warning' : 'tag-success'}`}>
                          {runtimePerms.length === 0
                            ? t('plugin.security.zero_requested')
                            : t('plugin.security.permissions_count', { count: runtimePerms.length })}
                        </span>
                      </div>
                      <div className="panel-body stack">
                        {runtimePerms.length === 0 ? (
                          <p className="small muted">
                            {t('plugin.security.no_permissions_before')} (<code>permissions = []</code>). {t('plugin.security.no_permissions_after')}
                          </p>
                        ) : (
                          <>
                            <p className="small muted">
                              {t('plugin.security.declared_permissions_before')}{' '}<code>advanced_config.plugins.blocked_permissions</code>{t('plugin.security.declared_permissions_after')}
                            </p>
                            <div className="stack" style={{ gap: 8 }}>
                              {runtimePerms.map(rp => {
                                const riskTone = rp.risk === 'high' ? 'tag-danger' : rp.risk === 'medium' ? 'tag-warning' : 'tag-fg';
                                return (
                                  <div
                                    key={rp.id}
                                    className="pd-cap-card"
                                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                  >
                                    <div className="pd-cap-head">
                                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                        <strong>{rp.label}</strong>
                                        <code className="pd-chip">{rp.id}</code>
                                      </div>
                                      <div className="row" style={{ gap: 6 }}>
                                        <span className={`tag ${riskTone}`}>{rp.risk.toUpperCase()}</span>
                                        <button
                                          type="button"
                                          className={`pd-iconbtn${copiedPerm === rp.id ? ' pd-ok' : ''}`}
                                          onClick={() => {
                                            navigator.clipboard.writeText(rp.id);
                                            setCopiedPerm(rp.id);
                                            setTimeout(() => setCopiedPerm(null), 2000);
                                          }}
                                          title={t('plugin.security.copy_permission_constant')}
                                        >
                                          {copiedPerm === rp.id ? <Check /> : <Copy />}
                                        </button>
                                      </div>
                                    </div>
                                    <p className="small muted">{rp.description}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {(deps.length > 0 || metaAuthors.length > 0) && (
                          <div className="row" style={{ gap: 16, flexWrap: 'wrap', paddingTop: 4 }}>
                            {deps.length > 0 && (
                              <div className="field" style={{ flex: 1, minWidth: 220 }}>
                                <span className="field-label">{t('staff.inspection.fields.dependencies')}</span>
                                <div className="pd-wit-list">
                                  {deps.map(dep => (
                                    <code key={dep} className="pd-chip">{dep}</code>
                                  ))}
                                </div>
                              </div>
                            )}
                            {metaAuthors.length > 0 && (
                              <div className="field" style={{ flex: 1, minWidth: 220 }}>
                                <span className="field-label">{t('plugin.security.authors')}</span>
                                <div className="pd-wit-list">
                                  {metaAuthors.map(author => (
                                    <span key={author} className="tag tag-fg">{author}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {cmdPerms.length > 0 && (
                      <div className="panel">
                        <div className="panel-head">
                          <Key className="pumpkin" />
                          <h3 className="h3">{t('plugin.security.command_permissions_title', { count: cmdPerms.length })}</h3>
                        </div>
                        <div className="panel-body stack">
                          <p className="small muted">
                            {t('plugin.security.command_permissions_desc')}
                          </p>
                          <div className="pd-wit-list">
                            {cmdPerms.map(perm => (
                              <div key={perm} className="pd-perm" style={{ border: '1.5px solid var(--line-2)', padding: '4px 8px', background: 'var(--sunk)' }}>
                                <Key />
                                <code>{perm}</code>
                                <button
                                  type="button"
                                  className={`pd-iconbtn${copiedPerm === perm ? ' pd-ok' : ''}`}
                                  onClick={() => {
                                    navigator.clipboard.writeText(perm);
                                    setCopiedPerm(perm);
                                    setTimeout(() => setCopiedPerm(null), 2000);
                                  }}
                                  title={t('plugin.commands.copy_permission')}
                                >
                                  {copiedPerm === perm ? <Check /> : <Copy />}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="panel">
                      <div className="panel-head">
                        <Fingerprint className="pumpkin" />
                        <h3 className="h3">{t('plugin.security.provenance_title')}</h3>
                      </div>
                      <div className="panel-body stack">
                        {sec?.sha256 && (
                          <div className="field">
                            <span className="field-label">{t('plugin.security.sha256_checksum')}</span>
                            <div className="pd-hash-box">
                              <code>{sec.sha256}</code>
                              <button
                                type="button"
                                className="button button-flat button-sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(sec.sha256!);
                                  setCopiedHash(true);
                                  setTimeout(() => setCopiedHash(false), 2000);
                                }}
                              >
                                {copiedHash ? <Check /> : <Copy />}
                                {copiedHash ? t('plugin.copied') : t('plugin.security.copy_sha256')}
                              </button>
                            </div>
                          </div>
                        )}

                        {imports.length > 0 && (
                          <div className="field">
                            <span className="field-label">{t('plugin.security.imported_interfaces')}</span>
                            <div className="pd-wit-list">
                              {imports.map(imp => (
                                <code key={imp} className="pd-chip">{imp}</code>
                              ))}
                            </div>
                          </div>
                        )}

                        {exportsList.length > 0 && (
                          <div className="field">
                            <span className="field-label">{t('plugin.security.exported_entrypoints')}</span>
                            <div className="pd-wit-list">
                              {exportsList.map(exp => (
                                <code key={exp} className="pd-chip">{exp}</code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })()}
            </div>
          </div>

          <section className="pd-reviews" id="pd-reviews" aria-label="Ratings & Reviews">
            <div className="pd-reviews-head">
              <h2 className="h2">Ratings &amp; Reviews</h2>
              {reviews.length > 0 && (
                <span className="tag tag-fg">{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</span>
              )}
            </div>

            {stats ? (
              <div className="pd-ratings">
                <div className="pd-avg">
                  <span className="stat-value">{stats.avg}</span>
                  <Stars value={Number(stats.avg)} />
                  <span className="small">{stats.total.toLocaleString()} Ratings</span>
                </div>
                <div className="pd-bars">
                  {[5, 4, 3, 2, 1].map(num => (
                    <div key={num}>
                      <span className="small num">{num}</span>
                      <div className="meter meter-pumpkin">
                        <span style={{ width: `${(stats.distribution[num as keyof typeof stats.distribution] / stats.total) * 100}%` }} />
                      </div>
                      <span className="small num">{stats.distribution[num as keyof typeof stats.distribution]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="blank">
                <p className="h3">No reviews yet. Be the first to leave one!</p>
              </div>
            )}

            {reviews.length > 0 && (
              <ul className="pd-review-list">
                {reviews.map((r: any) => (
                  <li key={r.id} className="pd-review">
                    <div className="pd-review-top">
                      <span className={`avatar ${getAvatarClass(r.username)}`}>
                        {r.avatar_url ? <img src={r.avatar_url} alt={r.username} /> : getInitials(r.username)}
                      </span>
                      <div className="pd-review-meta">
                        <strong>{r.username}</strong>
                        <span className="small">{formatDate(r.created_at)}</span>
                      </div>
                      <Stars value={r.rating} />
                    </div>
                    <ExpandableText className="pd-review-body" text={r.comment} limit={400} />

                    {r.developer_reply && (
                      <div className="pd-reply">
                        <div className="row">
                          <span className="label pumpkin">{t('plugin.reviews.dev_reply', 'Developer Reply')}</span>
                          <span className="small">{formatDate(r.replied_at)}</span>
                        </div>
                        <ExpandableText text={r.developer_reply} limit={300} />
                      </div>
                    )}

                    <div className="pd-review-actions">
                      {reportedReviews.has(r.id) ? (
                        <p className="small pd-ok">
                          <Check /> Report submitted
                        </p>
                      ) : reviewReportOpen === r.id ? (
                        <form onSubmit={(e) => submitReviewReport(e, r.id)} className="pd-form">
                          <span className="field-label">Reason for reporting this review</span>
                          {reasonPicker(REVIEW_REPORT_REASONS, reviewReportSelected, reason => { setReviewReportSelected(reason); setReviewReportCustom(''); })}
                          {reviewReportSelected === 'Other' && (
                            <div className="control">
                              <textarea
                                className="input"
                                placeholder="Describe the issue…"
                                value={reviewReportCustom}
                                onChange={e => setReviewReportCustom(e.target.value)}
                                rows={2}
                                autoFocus
                              />
                            </div>
                          )}
                          <div className="row">
                            <button type="button" className="button button-ghost button-sm" onClick={resetReviewReport}>
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="button button-primary button-sm"
                              disabled={
                                reviewReportSubmitting ||
                                !reviewReportSelected ||
                                (reviewReportSelected === 'Other' && !reviewReportCustom.trim())
                              }
                            >
                              {reviewReportSubmitting ? 'Sending…' : 'Submit'}
                            </button>
                          </div>
                        </form>
                      ) : replyOpen === r.id ? (
                        <form onSubmit={(e) => submitReply(e, r.id)} className="pd-form">
                          <div className="control">
                            <textarea
                              className="input"
                              placeholder={t('plugin.reviews.reply_placeholder', 'Write your response to this review...')}
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              rows={3}
                              autoFocus
                            />
                          </div>
                          <div className="row">
                            <button type="button" className="button button-ghost button-sm" onClick={() => { setReplyOpen(null); setReplyText(''); }}>
                              {t('common.cancel', 'Cancel')}
                            </button>
                            <button type="submit" className="button button-primary button-sm" disabled={replySubmitting || !replyText.trim()}>
                              {replySubmitting ? t('studio.reviews.posting', 'Posting…') : t('plugin.reviews.reply_submit', 'Post Reply')}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {user && user.username === r.username ? (
                            <button type="button" className="button button-ghost button-sm pd-danger" onClick={deleteReview}>
                              <Trash2 /> {t('plugin.reviews.delete_review', 'Delete')}
                            </button>
                          ) : user && (
                            <button type="button" className="button button-ghost button-sm" onClick={() => setReviewReportOpen(r.id)}>
                              <Flag /> {t('plugin.report.report_review', 'Report Review')}
                            </button>
                          )}

                          {isOwner && !r.developer_reply && !replyOpen && (
                            <button type="button" className="button button-ghost button-sm pd-accent" onClick={() => setReplyOpen(r.id)}>
                              <MessageSquare /> {t('plugin.reviews.reply_btn', 'Reply')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {user ? (
              hasReviewed ? (
                <div className="notice notice-success">
                  <span className="mark-box"><Check /></span>
                  <p className="notice-text">
                    <strong>Review posted</strong> You've already reviewed this plugin. Thanks for the feedback!
                  </p>
                  <button type="button" className="button button-danger button-sm" onClick={deleteReview}>
                    Delete Review
                  </button>
                </div>
              ) : (
                <form onSubmit={submitReview} className="panel">
                  <div className="panel-head">
                    <h3 className="h3">Leave a Review</h3>
                  </div>
                  <div className="panel-body fields">
                    <div className="field">
                      <span className="field-label">Your Rating</span>
                      <Stars value={reviewForm.rating} onRate={val => setReviewForm({ ...reviewForm, rating: val })} />
                    </div>
                    <label className="field">
                      <span className="field-label">Your Experience</span>
                      <span className="control">
                        <textarea
                          className="input"
                          placeholder="What did you like? What could be better?"
                          value={reviewForm.comment}
                          maxLength={MAX_REVIEW_LENGTH}
                          onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          required
                        />
                      </span>
                    </label>
                  </div>
                  <div className="panel-foot">
                    <button className="button button-primary" type="submit">Post Review</button>
                  </div>
                </form>
              )
            ) : (
              <div className="notice notice-plain">
                <p className="notice-text">
                  Please <Link className="link link-pumpkin" to="/login">login</Link> to rate this plugin.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="pd-aside">
          <div className="panel panel-pumpkin pd-buy">
            <div className="panel-body stack">
              {plugin.type === 'paid' && ownsPlugin ? (
                <span className="status pd-owned">
                  <span className={`mark-box ${plugin.is_preorder ? 'mark-box-warning' : 'mark-box-success'}`}><Check /></span>
                  {plugin.is_preorder ? 'Pre-Ordered (Awaiting Release)' : 'Purchased'}
                </span>
              ) : plugin.type === 'paid' ? (
                <div className="stack pd-price">
                  {plugin.is_preorder && <span className="sticker sticker-sm">PRE-ORDER</span>}
                  <span className={`cost cost-lg${discounted ? ' cost-sale' : ''}`}>
                    {discounted && <s>{euro(basePrice)}</s>}
                    {euro(finalPrice)}
                  </span>
                  {discounted && (
                    <div className="row">
                      {saleDiscount > 0 && <span className="tag tag-danger">-{saleDiscount}% SALE</span>}
                      {couponDiscount > 0 && <span className="tag tag-success">-{couponDiscount}% COUPON</span>}
                    </div>
                  )}
                </div>
              ) : (
                <span className={`cost cost-lg${plugin.type === 'adwall' ? '' : ' cost-free'}`}>{plugin.type === 'adwall' ? 'AD SUPPORTED' : 'FREE'}</span>
              )}

              {plugin.type === 'paid' && !ownsPlugin && (
                <div className="field">
                  <label className="field-label" htmlFor="detailPromoCode">Have a promo code?</label>
                  <div className="pd-coupon">
                    <span className="control">
                      <input
                        id="detailPromoCode"
                        name="promoCode"
                        type="text"
                        className="input"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="PROMOCODE"
                        disabled={validatingCoupon || appliedCoupon !== null}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                      />
                    </span>
                    {appliedCoupon ? (
                      <button type="button" className="button button-flat" onClick={handleClearCoupon}>
                        Clear
                      </button>
                    ) : (
                      <button type="button" className="button" onClick={handleApplyCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                        {validatingCoupon ? '…' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {couponMessage && (
                    <p className={couponMessage.isError ? 'field-error' : 'small pd-ok'}>{couponMessage.text}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                className="button button-primary button-lg button-block"
                onClick={handleDownload}
                disabled={(!hasBinary && !plugin.is_preorder) || (plugin.type === 'paid' && !ownershipChecked)}
              >
                {downloadLabel}
              </button>

              <div className="cmd">
                <code title={ppmCommand}>{ppmCommand}</code>
                <button type="button" onClick={() => handleCopyPpm(ppmCommand)} title="Copy command" aria-label="Copy ppm install command">
                  {ppmCopied ? <Check /> : <Copy />}
                  {ppmCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <a
                href="https://github.com/Pumpkin-MC/ppm"
                target="_blank"
                rel="noopener noreferrer"
                className="pd-ppm"
                title="View ppm package manager on GitHub"
              >
                <Package />
                Install with ppm package manager
              </a>
            </div>
          </div>

          <div className="pd-safety-card" aria-label={t('plugin.security.summary_label')}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={15} className="pumpkin" /> {t('plugin.security.summary_title')}
              </span>
              <span className={`tag ${plugin.wasm_security?.sandbox_level === 'elevated' ? 'tag-warning' : 'tag-success'}`}>
                {plugin.wasm_security?.sandbox_level === 'elevated' ? t('plugin.security.host_capabilities') : t('plugin.security.strict_sandbox')}
              </span>
            </div>

            <ul className="pd-safety-list">
              <li className="pd-safety-item">
                <Cpu />
                <div>
                  <strong>{plugin.wasm_security?.binary_format || t('plugin.security.wasm_sandbox')}</strong>
                  <span className="muted">{t('plugin.security.isolated_linear_memory')}{plugin.api_version ? ` · API v${plugin.api_version}` : ''}</span>
                </div>
              </li>
              <li className="pd-safety-item">
                <Fingerprint />
                <div>
                  <strong>{plugin.wasm_security?.ed25519_signed ? t('plugin.security.signed_binary_title') : t('plugin.security.awaiting_binary')}</strong>
                  <span className="muted">
                    {plugin.wasm_security?.sha256
                      ? `SHA-256: ${plugin.wasm_security.sha256.slice(0, 10)}…${plugin.wasm_security.sha256.slice(-6)}`
                      : t('plugin.security.verified_via_w3c')}
                  </span>
                </div>
              </li>
              <li className="pd-safety-item">
                <Globe />
                <div>
                  <strong>{plugin.wasm_security?.network_access ? t('plugin.security.requests_network') : t('plugin.security.no_outbound_network')}</strong>
                  <span className="muted">
                    {plugin.wasm_security?.filesystem_access ? t('plugin.security.uses_scoped_fs') : t('plugin.security.no_raw_fs')}
                  </span>
                </div>
              </li>
              <li className="pd-safety-item">
                <Key />
                <div>
                  <strong>
                    {(plugin.wasm_security?.runtime_permissions?.length ?? 0) === 0
                      ? t('plugin.security.zero_permissions')
                      : t('plugin.security.permissions_count', { count: plugin.wasm_security?.runtime_permissions?.length ?? 0 })}
                  </strong>
                  <span className="muted">
                    {t('plugin.security.commands_count_inline', { count: commandCount })}
                    {' · '}
                    {t('plugin.security.dependencies_count_inline', { count: plugin.wasm_security?.dependencies?.length ?? 0 })}
                  </span>
                </div>
              </li>
            </ul>

            <button
              type="button"
              className="button button-ghost button-sm button-block"
              style={{ justifyContent: 'space-between' }}
              onClick={() => openTab('security')}
            >
              <span>{t('plugin.security.inspect_btn')}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="pd-meta">
            <dl className="specs">
              {plugin.version && (
                <>
                  <dt>{t('plugin.version')}</dt>
                  <dd>
                    <span className="pd-spec-version">
                      <span className="mono">{plugin.version}</span>
                      {versions.length > 0 && (
                        <button type="button" className="pd-textbtn" onClick={() => setVersionsOpen(true)}>{t('plugin.update_history')}</button>
                      )}
                    </span>
                  </dd>
                </>
              )}
              {plugin.api_version && (
                <>
                  <dt>Pumpkin API</dt>
                  <dd><span className="mono">v{plugin.api_version}</span></dd>
                </>
              )}
              <dt>{t('plugin.downloads')}</dt>
              <dd>{(plugin.downloads ?? 0).toLocaleString()}</dd>
              {plugin.created_at && (
                <>
                  <dt>{t('plugin.released')}</dt>
                  <dd>{formatDate(plugin.created_at)}</dd>
                </>
              )}
              <dt>{t('plugin.category')}</dt>
              <dd>{plugin.category}</dd>
              {plugin.source_link && (
                <>
                  <dt>{t('plugin.source')}</dt>
                  <dd>
                    <a href={plugin.source_link} target="_blank" rel="noopener noreferrer" className="link link-pumpkin">{t('plugin.view_source')}</a>
                  </dd>
                </>
              )}
            </dl>

            <button
              type="button"
              className="button button-ghost button-sm button-block pd-version-history-btn"
              onClick={() => setVersionsOpen(true)}
            >
              <span className="row" style={{ gap: 8 }}>
                <History size={15} />
                <span>{t('plugin.version_history')}</span>
                {versions.length > 0 && <span className="tag tag-fg">{versions.length}</span>}
              </span>
              <ChevronRight size={14} />
            </button>

            {user && !reportDone && (
              !reportOpen ? (
                <button type="button" className="button button-ghost button-sm pd-report-btn" onClick={() => setReportOpen(true)}>
                  <Flag /> Report plugin
                </button>
              ) : (
                <form onSubmit={submitReport} className="pd-form">
                  <span className="field-label">Reason for report</span>
                  {reasonPicker(REPORT_REASONS, reportSelected, reason => { setReportSelected(reason); setReportCustom(''); })}
                  {reportSelected === 'Other' && (
                    <div className="control">
                      <textarea
                        className="input"
                        placeholder="Describe the issue…"
                        value={reportCustom}
                        onChange={e => setReportCustom(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="row">
                    <button type="button" className="button button-ghost button-sm" onClick={resetReport}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="button button-primary button-sm"
                      disabled={
                        reportSubmitting ||
                        !reportSelected ||
                        (reportSelected === 'Other' && !reportCustom.trim())
                      }
                    >
                      {reportSubmitting ? 'Sending…' : 'Submit'}
                    </button>
                  </div>
                </form>
              )
            )}
            {reportDone && (
              <p className="small pd-ok">
                <Check /> Report submitted. Thanks for keeping the marketplace safe.
              </p>
            )}
          </div>
        </aside>
      </div>

      {canReview && staffRejectOpen && (
        <div className="overlay sf-modal" onClick={() => !staffBusy && setStaffRejectOpen(false)} role="dialog" aria-modal="true" aria-label={t('staff.actions.request_changes', 'Request Changes')}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <div className="stack">
                <span className="sticker sticker-sm sticker-warning">
                  <AlertTriangle size={12} /> {t('staff.modal.badge', 'Policy & Review Resolution')}
                </span>
                <h2 className="h2">{t('staff.modal.title_reject', { name: plugin.name, defaultValue: 'Request Changes — {{name}}' })}</h2>
              </div>
              <button type="button" className="button button-ghost button-sm button-icon" onClick={() => setStaffRejectOpen(false)} aria-label={t('common.close', 'Close')} disabled={staffBusy}>
                <X />
              </button>
            </div>
            <form onSubmit={handleStaffReject} className="sheet-body stack">
              <GuidelineRejectionPicker
                selectedCodes={staffRejectCodes}
                onToggleCode={toggleStaffRejectCode}
                otherChecked={staffRejectOtherChecked}
                onToggleOther={checked => {
                  setStaffRejectOtherChecked(checked);
                  if (!checked) setStaffRejectReason('');
                }}
                customReason={staffRejectReason}
                onChangeCustomReason={setStaffRejectReason}
              />
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="button button-ghost" onClick={() => setStaffRejectOpen(false)} disabled={staffBusy}>
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="button button-danger" disabled={staffBusy || !canSubmitStaffReject}>
                  {staffBusy ? t('staff.modal.processing', 'Processing…') : t('staff.modal.btn_send_reject', 'Send Feedback & Reject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {versionsOpen && (
        <div className="overlay" onClick={() => setVersionsOpen(false)} role="dialog" aria-modal="true" aria-label={t('plugin.version_history')}>
          <div className="sheet pd-versions-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <div className="row" style={{ gap: 10 }}>
                <History className="pumpkin" size={20} />
                <h2 className="h2">{t('plugin.version_history')}</h2>
                {versions.length > 0 && <span className="tag tag-fg">{versions.length}</span>}
              </div>
              <button type="button" className="button button-ghost button-sm button-icon" onClick={() => setVersionsOpen(false)} aria-label={t('common.close')}>
                <X />
              </button>
            </div>
            <div className="sheet-body">
              {versions.length > 0 ? (
                <ol className="pd-versions">
                  {versions.map((v: any) => (
                    <li key={v.id} className="pd-version">
                      <div className="row">
                        <span className="pd-version-num">v{v.version}</span>
                        {v.track && <span className={`tag tag-solid ${trackTone[v.track] ?? 'tag-fg'}`}>{v.track}</span>}
                        {v.api_version && <span className="tag tag-fg">API v{v.api_version}</span>}
                        <span className="small">{t('plugin.released_date', { date: formatDate(v.created_at) })}</span>
                      </div>
                      <div className="pd-prose">
                        {v.release_notes ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{v.release_notes}</ReactMarkdown>
                        ) : (
                          <p className="muted">{t('plugin.no_release_notes')}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : plugin.version ? (
                <ol className="pd-versions">
                  <li className="pd-version">
                    <div className="row">
                      <span className="pd-version-num">v{plugin.version}</span>
                      <span className="tag tag-solid tag-success">stable</span>
                      {plugin.api_version && <span className="tag tag-fg">API v{plugin.api_version}</span>}
                      {plugin.created_at && <span className="small">{t('plugin.released_date', { date: formatDate(plugin.created_at) })}</span>}
                    </div>
                    <div className="pd-prose">
                      <p className="muted">{t('plugin.initial_release')}</p>
                    </div>
                  </li>
                </ol>
              ) : (
                <div className="blank">
                  <p className="h3">{t('plugin.no_version_history')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="pd-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Expanded view">
          <div className="pd-lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Expanded view" />
            <div className="pd-lightbox-bar">
              {isScreenshotInGallery && (
                <>
                  <button type="button" className="button button-sm button-icon" onClick={lightboxPrev} aria-label="Previous screenshot">
                    <ChevronLeft />
                  </button>
                  <div className="pd-dots">
                    {screenshots.map((_: any, i: number) => (
                      <button
                        key={i}
                        type="button"
                        aria-current={i === lightboxIndex}
                        onClick={() => openLightbox(i)}
                        aria-label={`Go to screenshot ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button type="button" className="button button-sm button-icon" onClick={lightboxNext} aria-label="Next screenshot">
                    <ChevronRight />
                  </button>
                </>
              )}
              <span className="spacer" />
              <button type="button" className="button button-sm button-icon" onClick={closeLightbox} aria-label="Close">
                <X />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginPage;
