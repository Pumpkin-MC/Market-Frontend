import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams, useLocation, Link } from 'react-router-dom';
import api from '../../lib/api';
import { getLocalizedText } from '../../lib/locale';
import { useAuth } from '../../app/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import SEO from '../../components/SEO';
import { PluginVideoPlayer } from './PluginVideoPlayer';
import { Sparkles, History, ChevronRight, ChevronLeft, Star, Check, Trash2, Flag, MessageSquare, Copy, Key, ChevronDown, ChevronUp, Package, Play, X } from 'lucide-react';
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
  { value: 'Malware or malicious code', label: 'plugin.report.plugin_reasons.malware' },
  { value: 'Stolen or plagiarised content', label: 'plugin.report.plugin_reasons.stolen' },
  { value: 'Misleading description', label: 'plugin.report.plugin_reasons.misleading' },
  { value: 'Broken / non-functional', label: 'plugin.report.plugin_reasons.broken' },
  { value: 'Inappropriate content', label: 'plugin.report.plugin_reasons.inappropriate' },
  { value: 'Spam or fake listing', label: 'plugin.report.plugin_reasons.spam' },
  { value: 'Other', label: 'plugin.report.plugin_reasons.other' },
] as const;

const REVIEW_REPORT_REASONS = [
  { value: 'Inappropriate language', label: 'plugin.report.review_reasons.language' },
  { value: 'Spam or advertising', label: 'plugin.report.review_reasons.spam' },
  { value: 'Hate speech or harassment', label: 'plugin.report.review_reasons.hate' },
  { value: 'Off-topic or irrelevant', label: 'plugin.report.review_reasons.off_topic' },
  { value: 'Other', label: 'plugin.report.review_reasons.other' },
] as const;
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
  img: function MarkdownImage({ src, alt, ...props }: any) {
    const { t } = useTranslation();
    const isSafe = typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'));
    if (!isSafe) {
      return null;
    }
    return (
      <img
        src={src}
        alt={alt || t('plugin.media.illustration')}
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
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > limit;
  const displayText = isExpanded ? text : text.slice(0, limit) + (shouldTruncate ? '...' : '');

  return (
    <div className={className}>
      <p className="pd-pre">{displayText}</p>
      {shouldTruncate && (
        <button type="button" className="pd-textbtn" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? t('plugin.actions.show_less') : t('plugin.actions.expand')}
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
    return getLocalizedText(rawDescription, activeLanguage);
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

  const activeLang = i18n.language;
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
                      <span>{t('plugin.commands.copied')}</span>
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
  const [currentDescription, setCurrentDescription] = useState('');

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
        setCouponMessage({ text: res.data.message || t('plugin.messages.invalid_coupon'), isError: true });
      }
    } catch {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponMessage({ text: t('plugin.messages.coupon_failed'), isError: true });
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
  const [tab, setTab] = useState<'overview' | 'versions' | 'reviews' | 'commands'>('overview');

  // Review Report State
  const [reviewReportOpen, setReviewReportOpen] = useState<number | null>(null);
  const [reviewReportSelected, setReviewReportSelected] = useState('');
  const [reviewReportCustom, setReviewReportCustom] = useState('');
  const [reviewReportSubmitting, setReviewReportSubmitting] = useState(false);

  const [replyOpen, setReplyOpen] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const isOwner = user && plugin && user.id === plugin.dev_id;
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
      setError(t('plugin.messages.load_failed'));
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
  useEffect(() => {
    if (plugin?.translated_descriptions) {
      try {
        const translations = typeof plugin.translated_descriptions === 'string'
          ? JSON.parse(plugin.translated_descriptions)
          : plugin.translated_descriptions;
        setCurrentDescription(getLocalizedText(translations, i18n.language));
      } catch {
        setCurrentDescription(t('plugin.messages.description_unavailable'));
      }
    } else if (plugin?.description) {
      setCurrentDescription(plugin.description);
    }
  }, [plugin, i18n.language, t]);

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
          alt={alt || t('plugin.media.illustration')}
          loading="lazy"
          decoding="async"
          className="pd-md-img"
          onClick={() => openLightboxWithSrc(src)}
          {...props}
        />
      );
    },
  }), [openLightboxWithSrc, t]);

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

  // ── Keyboard navigation for lightbox ────────────────────────────────────
  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && isScreenshotInGallery) lightboxPrev();
      else if (e.key === 'ArrowRight' && isScreenshotInGallery) lightboxNext();
      else if (e.key === 'Escape') closeLightbox();
    };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage, lightboxIndex, screenshots, isScreenshotInGallery]);

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
      if (!user) return navigate('/login', { state: { from: `/plugins/${id}` } });

      // Already owns it — download directly, no checkout
      if (ownsPlugin) {
        if (plugin.is_preorder) {
          alert(t('plugin.messages.preorder_owned'));
          return;
        }
        try {
          await triggerDownload(`/plugins/${id}/download/premium`);
        } catch {
          alert(t('plugin.messages.download_failed'));
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
            alert(t('plugin.messages.preorder_confirmed'));
          } else {
            alert(t('plugin.messages.already_owned'));
            await triggerDownload(`/plugins/${id}/download/premium`);
          }
        } else {
          alert(t('plugin.messages.checkout_failed'));
        }
      } finally {
      }
      return;
    }

    // Adwall
    if (plugin.type === 'adwall' && !adShown) {
      alert(t('plugin.messages.ad_wait'));
      setTimeout(() => setAdShown(true), 5000);
      return;
    }

    // Free / adwall (after ad)
    try {
      await triggerDownload(`/plugins/${id}/download`);
    } catch {
      alert(t('plugin.messages.download_failed'));
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
    if (!window.confirm(t('plugin.reviews.delete_confirm'))) return;
    try {
      await api.delete(`/plugins/${id}/reviews`);
      fetchPlugin();
    } catch {
      alert(t('plugin.messages.delete_review_failed'));
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
      alert(err.response?.data?.error || t('plugin.messages.reply_failed'));
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
      alert(t('plugin.messages.report_failed'));
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
      alert(t('plugin.messages.review_report_success'));
    } catch {
      alert(t('plugin.messages.review_report_failed'));
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
          <h1 className="h1"><Trans t={t} i18nKey="plugin.messages.not_found_title" components={{ mark: <span className="mark" /> }} /></h1>
          <p className="small">{error || t('plugin.messages.not_found')}</p>
          <Link to="/" className="button">{t('common.back')}</Link>
        </div>
      </div>
    );
  }

  const downloadLabel = (() => {
    const sizeStr = plugin?.file_size ? ` ${formatSize(plugin.file_size)}` : '';

    if (plugin.type === 'paid') {
      if (!ownershipChecked) return t('plugin.actions.loading');
      if (ownsPlugin) {
        if (plugin.is_preorder) {
          return t('plugin.purchase.awaiting_release');
        }
        return t('plugin.purchase.download', { size: sizeStr });
      }
      if (plugin.is_preorder) {
        return t('plugin.purchase.preorder_now');
      }
      return t('plugin.purchase.purchase');
    }

    if (plugin.type === 'adwall' && !adShown) return t('plugin.purchase.watch_ad');

    return t('plugin.purchase.download', { size: sizeStr });
  })();

  const cleanDesc = currentDescription.replace(/[#*`_\[\]]/g, '').slice(0, 160).trim();

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
            "name": t('home.page_title'),
            "item": "https://market.pumpkinmc.org"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": plugin.category || t('search.plugins_title'),
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
    ...(versions.length > 0 ? [['versions', t('plugin.tabs.versions'), versions.length] as [typeof tab, string, number]] : []),
    ['reviews', t('plugin.tabs.reviews'), reviews.length],
    ...(commandCount > 0 ? [['commands', t('plugin.commands.title', 'Commands'), commandCount] as [typeof tab, string, number]] : []),
  ];

  const activeTab = tabList.some(([key]) => key === tab) ? tab : 'overview';

  const reasonPicker = (
    reasons: typeof REPORT_REASONS | typeof REVIEW_REPORT_REASONS,
    selected: string,
    onPick: (reason: string) => void,
  ) => (
    <div className="segmented pd-reasons">
      {reasons.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={selected === value} onClick={() => onPick(value)}>
          {t(label)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="page pd">
      <SEO
        title={plugin.name}
        description={cleanDesc || t('plugin.metadata.description', { name: plugin.name, author: plugin.dev_name })}
        keywords={t('plugin.metadata.keywords', { name: plugin.name, category: plugin.category || '', keywords: plugin.keywords || '' })}
        ogType="product"
        ogImage={plugin.preview_path || "/icon.png"}
      />
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>

      <nav className="crumbs" aria-label={t('plugin.navigation.breadcrumb')}>
        <Link to="/">{t('nav.footer.market')}</Link>
        <ChevronRight />
        {plugin.category && (
          <>
            <Link to={`/search?category=${encodeURIComponent(plugin.category)}`}>{plugin.category}</Link>
            <ChevronRight />
          </>
        )}
        <span aria-current="page">{plugin.name}</span>
      </nav>

      {(showPaymentSuccess || plugin.is_preorder || plugin.is_early_access) && (
        <div className="pd-notices">
          {showPaymentSuccess && (
            <div className="notice notice-success" role="status">
              <span className="sticker sticker-success">{t('plugin.purchase.success')}</span>
              <p className="notice-text">
                <Trans t={t} i18nKey="plugin.purchase.owned_notice" components={{ plugin: <strong>{plugin.name}</strong> }} />
              </p>
              <button type="button" className="button button-ghost button-sm button-icon" onClick={() => setShowPaymentSuccess(false)} aria-label={t('common.dismiss')}>
                <X />
              </button>
            </div>
          )}

          {plugin.is_preorder && (
            <div className="notice notice-pumpkin">
              <span className="sticker">{t('plugin.purchase.available_preorder')}</span>
              <div className="notice-text pd-notice-body">
                {plugin.preorder_release_date && (
                  <span className="label label-fg">{t('plugin.purchase.expected_release', { date: formatDate(plugin.preorder_release_date) })}</span>
                )}
                {ownsPlugin ? (
                  <p className="pd-ok">
                    <Check /> {t('plugin.purchase.preorder_owned_notice')}
                  </p>
                ) : (
                  <p>
                    {t('plugin.purchase.preorder_notice')}
                  </p>
                )}
              </div>
            </div>
          )}

          {plugin.is_early_access && (
            <div className="notice notice-warning">
              <span className="sticker sticker-warning">{t('plugin.purchase.early_access_title')}</span>
              <p className="notice-text">
                <Trans t={t} i18nKey="plugin.purchase.early_access_notice" components={{ strong: <strong /> }} />
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
                <span className="entry-by"><Trans t={t} i18nKey="common.by_author" components={{ author: <Link className="link" to={`/profile/${plugin.dev_name}`}>{plugin.dev_name}</Link> }} /></span>
                {plugin.category && <span className="tag tag-fg">{plugin.category}</span>}
                {plugin.is_preorder && <span className="sticker sticker-sm">{t('plugin.purchase.preorder_badge')}</span>}
                {plugin.is_early_access && <span className="sticker sticker-sm sticker-warning">{t('plugin.early_access_badge')}</span>}
                {plugin.type === 'paid' && saleDiscount > 0 && <span className="sticker sticker-sm">-{saleDiscount}%</span>}
              </div>
              {stats && (
                <div className="row pd-score">
                  <Stars value={Number(stats.avg)} />
                  <span className="small"><strong>{stats.avg}</strong> · {t('plugin.reviews.rating_count', { count: stats.total, formattedCount: stats.total.toLocaleString() })}</span>
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
                          <img src={mainScreenshot || screenshots[0]?.path} alt={t('plugin.media.main')} />
                        </button>
                      )}
                      <div className="pd-thumbs">
                        {plugin.youtube_video_url && (
                          <button type="button" className="pd-thumb" aria-pressed={mainScreenshot === 'video'} onClick={() => setMainScreenshot('video')}>
                            {getYoutubeVideoId(plugin.youtube_video_url) ? (
                              <img src={`https://img.youtube.com/vi/${getYoutubeVideoId(plugin.youtube_video_url)}/hqdefault.jpg`} alt={t('plugin.media.video_thumbnail')} />
                            ) : (
                              <span className="label">{t('plugin.media.video')}</span>
                            )}
                            <span className="pd-play"><Play /></span>
                          </button>
                        )}
                        {screenshots.map((shot: any) => (
                          <button key={shot.id} type="button" className="pd-thumb" aria-pressed={mainScreenshot === shot.path} onClick={() => setMainScreenshot(shot.path)}>
                            <img src={shot.path} alt={t('plugin.media.thumbnail')} />
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
                          <h2 className="h3">{t('plugin.versions.whats_new')}</h2>
                          <span className="tag tag-pumpkin">v{latest.version}</span>
                          {latest.created_at && <span className="small">{formatDate(latest.created_at)}</span>}
                          <span className="spacer" />
                          {versions.length > 1 && (
                            <button type="button" className="button button-flat button-sm" onClick={() => openTab('versions')}>
                              <History />
                              {t('plugin.versions.history', { count: versions.length })}
                            </button>
                          )}
                        </div>
                        <div className={`panel-body pd-prose${isLong ? ' pd-clamp' : ''}`}>
                          {latest.release_notes ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {latest.release_notes}
                            </ReactMarkdown>
                          ) : (
                            <p className="muted">{t('plugin.versions.default_notes')}</p>
                          )}
                        </div>
                        {isLong && (
                          <div className="panel-foot">
                            <button type="button" className="button button-ghost button-sm" onClick={() => openTab('versions')}>
                              {t('plugin.actions.view_more')}
                              <ChevronRight />
                            </button>
                          </div>
                        )}
                      </section>
                    );
                  })()}

                  <div className="pd-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{currentDescription}</ReactMarkdown>
                  </div>
                </>
              )}

              {activeTab === 'versions' && (
                <ol className="pd-versions">
                  {versions.map((v: any) => (
                    <li key={v.id} className="pd-version">
                      <div className="row">
                        <span className="pd-version-num">v{v.version}</span>
                        {v.track && <span className={`tag tag-solid ${trackTone[v.track] ?? 'tag-fg'}`}>{v.track}</span>}
                        <span className="small">{t('plugin.versions.release_date', { date: formatDate(v.created_at) })}</span>
                      </div>
                      <div className="pd-prose">
                        {v.release_notes ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{v.release_notes}</ReactMarkdown>
                        ) : (
                          <p className="muted">{t('plugin.versions.no_notes')}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {activeTab === 'reviews' && (
                <section className="pd-reviews" aria-label={t('plugin.reviews.title')}>
                  {stats ? (
                    <div className="pd-ratings">
                      <div className="pd-avg">
                        <span className="stat-value">{stats.avg}</span>
                        <Stars value={Number(stats.avg)} />
                        <span className="small">{t('plugin.reviews.rating_count', { count: stats.total, formattedCount: stats.total.toLocaleString() })}</span>
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
                      <p className="h3">{t('plugin.reviews.empty')}</p>
                    </div>
                  )}

                  {reviews.length > 0 && (
                    <ul className="pd-review-list">
                      {reviews.map((r: any) => (
                        <li key={r.id} className="pd-review">
                          <div className="pd-review-top">
                            <span className={`avatar ${getAvatarClass(r.username)}`}>{getInitials(r.username)}</span>
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
                                <span className="label pumpkin">{t('plugin.reviews.developer_response')}</span>
                                <span className="small">{formatDate(r.replied_at)}</span>
                              </div>
                              <ExpandableText text={r.developer_reply} limit={300} />
                            </div>
                          )}

                          <div className="pd-review-actions">
                            {reportedReviews.has(r.id) ? (
                              <p className="small pd-ok">
                                <Check /> {t('plugin.report.submitted')}
                              </p>
                            ) : reviewReportOpen === r.id ? (
                              <form onSubmit={(e) => submitReviewReport(e, r.id)} className="pd-form">
                                <span className="field-label">{t('plugin.report.review_reason')}</span>
                                {reasonPicker(REVIEW_REPORT_REASONS, reviewReportSelected, reason => { setReviewReportSelected(reason); setReviewReportCustom(''); })}
                                {reviewReportSelected === 'Other' && (
                                  <div className="control">
                                    <textarea
                                      className="input"
                                      placeholder={t('plugin.report.describe_issue')}
                                      value={reviewReportCustom}
                                      onChange={e => setReviewReportCustom(e.target.value)}
                                      rows={2}
                                      autoFocus
                                    />
                                  </div>
                                )}
                                <div className="row">
                                  <button type="button" className="button button-ghost button-sm" onClick={resetReviewReport}>
                                    {t('common.cancel')}
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
                                    {reviewReportSubmitting ? t('plugin.actions.sending') : t('common.submit')}
                                  </button>
                                </div>
                              </form>
                            ) : replyOpen === r.id ? (
                              <form onSubmit={(e) => submitReply(e, r.id)} className="pd-form">
                                <div className="control">
                                  <textarea
                                    className="input"
                                    placeholder={t('plugin.reviews.response_placeholder')}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    rows={3}
                                    autoFocus
                                  />
                                </div>
                                <div className="row">
                                  <button type="button" className="button button-ghost button-sm" onClick={() => { setReplyOpen(null); setReplyText(''); }}>
                                    {t('common.cancel')}
                                  </button>
                                  <button type="submit" className="button button-primary button-sm" disabled={replySubmitting || !replyText.trim()}>
                                    {replySubmitting ? t('plugin.reviews.replying') : t('plugin.reviews.reply_submit')}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                {user && user.username === r.username ? (
                                  <button type="button" className="button button-ghost button-sm pd-danger" onClick={deleteReview}>
                                    <Trash2 /> {t('plugin.reviews.delete_mine')}
                                  </button>
                                ) : user && (
                                  <button type="button" className="button button-ghost button-sm" onClick={() => setReviewReportOpen(r.id)}>
                                    <Flag /> {t('plugin.reviews.report')}
                                  </button>
                                )}

                                {isOwner && !r.developer_reply && !replyOpen && (
                                  <button type="button" className="button button-ghost button-sm pd-accent" onClick={() => setReplyOpen(r.id)}>
                                    <MessageSquare /> {t('plugin.reviews.reply_as_developer')}
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
                          <Trans t={t} i18nKey="plugin.reviews.posted_notice" components={{ strong: <strong /> }} />
                        </p>
                        <button type="button" className="button button-danger button-sm" onClick={deleteReview}>
                          {t('plugin.reviews.delete_review_label')}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={submitReview} className="panel">
                        <div className="panel-head">
                          <h3 className="h3">{t('plugin.reviews.leave_review')}</h3>
                        </div>
                        <div className="panel-body fields">
                          <div className="field">
                            <span className="field-label">{t('plugin.reviews.rating')}</span>
                            <Stars value={reviewForm.rating} onRate={val => setReviewForm({ ...reviewForm, rating: val })} />
                          </div>
                          <label className="field">
                            <span className="field-label">{t('plugin.reviews.experience')}</span>
                            <span className="control">
                              <textarea
                                className="input"
                                placeholder={t('plugin.reviews.experience_placeholder')}
                                value={reviewForm.comment}
                                maxLength={MAX_REVIEW_LENGTH}
                                onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                required
                              />
                            </span>
                          </label>
                        </div>
                        <div className="panel-foot">
                          <button className="button button-primary" type="submit">{t('plugin.reviews.post_review')}</button>
                        </div>
                      </form>
                    )
                  ) : (
                    <div className="notice notice-plain">
                      <p className="notice-text">
                        <Trans t={t} i18nKey="plugin.reviews.login_required" components={{ login: <Link className="link link-pumpkin" to="/login" /> }} />
                      </p>
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'commands' && <PluginCommands commands={plugin.commands} />}
            </div>
          </div>
        </div>

        <aside className="pd-aside">
          <div className="panel panel-pumpkin pd-buy">
            <div className="panel-body stack">
              {plugin.type === 'paid' && ownsPlugin ? (
                <span className="status pd-owned">
                  <span className={`mark-box ${plugin.is_preorder ? 'mark-box-warning' : 'mark-box-success'}`}><Check /></span>
                  {plugin.is_preorder ? t('plugin.purchase.awaiting_release') : t('plugin.purchase.purchased')}
                </span>
              ) : plugin.type === 'paid' ? (
                <div className="stack pd-price">
                  {plugin.is_preorder && <span className="sticker sticker-sm">{t('plugin.purchase.preorder_badge')}</span>}
                  <span className={`cost cost-lg${discounted ? ' cost-sale' : ''}`}>
                    {discounted && <s>{euro(basePrice)}</s>}
                    {euro(finalPrice)}
                  </span>
                  {discounted && (
                    <div className="row">
                      {saleDiscount > 0 && <span className="tag tag-danger">{t('plugin.purchase.sale_discount', { discount: saleDiscount })}</span>}
                      {couponDiscount > 0 && <span className="tag tag-success">{t('plugin.purchase.coupon_discount', { discount: couponDiscount })}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <span className={`cost cost-lg${plugin.type === 'adwall' ? '' : ' cost-free'}`}>{plugin.type === 'adwall' ? t('plugin.purchase.ad_supported') : t('plugin.purchase.free')}</span>
              )}

              {plugin.type === 'paid' && !ownsPlugin && (
                <div className="field">
                  <label className="field-label" htmlFor="detailPromoCode">{t('plugin.purchase.promo_prompt')}</label>
                  <div className="pd-coupon">
                    <span className="control">
                      <input
                        id="detailPromoCode"
                        name="promoCode"
                        type="text"
                        className="input"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder={t('plugin.purchase.promo_placeholder')}
                        disabled={validatingCoupon || appliedCoupon !== null}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                      />
                    </span>
                    {appliedCoupon ? (
                      <button type="button" className="button button-flat" onClick={handleClearCoupon}>
                        {t('plugin.purchase.clear')}
                      </button>
                    ) : (
                      <button type="button" className="button" onClick={handleApplyCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                        {validatingCoupon ? '…' : t('plugin.purchase.apply')}
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
                disabled={plugin.type === 'paid' && !ownershipChecked}
              >
                {downloadLabel}
              </button>

              <div className="cmd">
                <code title={ppmCommand}>{ppmCommand}</code>
                <button type="button" onClick={() => handleCopyPpm(ppmCommand)} title={t('plugin.commands.copy_command')} aria-label={t('plugin.installation.copy_command')}>
                  {ppmCopied ? <Check /> : <Copy />}
                  {ppmCopied ? t('plugin.actions.copied') : t('common.copy')}
                </button>
              </div>
              <a
                href="https://github.com/Pumpkin-MC/ppm"
                target="_blank"
                rel="noopener noreferrer"
                className="pd-ppm"
                title={t('plugin.installation.github')}
              >
                <Package />
                {t('plugin.installation.install')}
              </a>
            </div>
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
                        <button type="button" className="pd-textbtn" onClick={() => openTab('versions')}>{t('plugin.versions.update_history')}</button>
                      )}
                    </span>
                  </dd>
                </>
              )}
              <dt>{t('plugin.downloads')}</dt>
              <dd>{(plugin.downloads ?? 0).toLocaleString()}</dd>
              {plugin.created_at && (
                <>
                  <dt>{t('plugin.versions.released')}</dt>
                  <dd>{formatDate(plugin.created_at)}</dd>
                </>
              )}
              <dt>{t('plugin.category')}</dt>
              <dd>{plugin.category}</dd>
              {plugin.source_link && (
                <>
                  <dt>{t('plugin.metadata.source')}</dt>
                  <dd>
                    <a href={plugin.source_link} target="_blank" rel="noopener noreferrer" className="link link-pumpkin">{t('plugin.metadata.view_source')}</a>
                  </dd>
                </>
              )}
            </dl>

            {user && !reportDone && (
              !reportOpen ? (
                <button type="button" className="button button-ghost button-sm pd-report-btn" onClick={() => setReportOpen(true)}>
                  <Flag /> {t('plugin.report.report_plugin_label')}
                </button>
              ) : (
                <form onSubmit={submitReport} className="pd-form">
                  <span className="field-label">{t('plugin.report.reason')}</span>
                  {reasonPicker(REPORT_REASONS, reportSelected, reason => { setReportSelected(reason); setReportCustom(''); })}
                  {reportSelected === 'Other' && (
                    <div className="control">
                      <textarea
                        className="input"
                        placeholder={t('plugin.report.describe_issue')}
                        value={reportCustom}
                        onChange={e => setReportCustom(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="row">
                    <button type="button" className="button button-ghost button-sm" onClick={resetReport}>
                      {t('common.cancel')}
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
                      {reportSubmitting ? t('plugin.actions.sending') : t('common.submit')}
                    </button>
                  </div>
                </form>
              )
            )}
            {reportDone && (
              <p className="small pd-ok">
                <Check /> {t('plugin.report.submission_success')}
              </p>
            )}
          </div>
        </aside>
      </div>

      {lightboxImage && (
        <div className="pd-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label={t('plugin.media.expanded_view')}>
          <div className="pd-lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt={t('plugin.media.expanded_view')} />
            <div className="pd-lightbox-bar">
              {isScreenshotInGallery && (
                <>
                  <button type="button" className="button button-sm button-icon" onClick={lightboxPrev} aria-label={t('plugin.media.previous')}>
                    <ChevronLeft />
                  </button>
                  <div className="pd-dots">
                    {screenshots.map((_: any, i: number) => (
                      <button
                        key={i}
                        type="button"
                        aria-current={i === lightboxIndex}
                        onClick={() => openLightbox(i)}
                        aria-label={t('plugin.media.go_to_screenshot', { number: i + 1 })}
                      />
                    ))}
                  </div>
                  <button type="button" className="button button-sm button-icon" onClick={lightboxNext} aria-label={t('plugin.media.next')}>
                    <ChevronRight />
                  </button>
                </>
              )}
              <span className="spacer" />
              <button type="button" className="button button-sm button-icon" onClick={closeLightbox} aria-label={t('common.close')}>
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
