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
  useEffect(() => {
    if (plugin?.translated_descriptions) {
      try {
        const translations = typeof plugin.translated_descriptions === 'string'
          ? JSON.parse(plugin.translated_descriptions)
          : plugin.translated_descriptions;
        const activeLang = (i18n.language || 'en').slice(0, 2);
        setCurrentDescription(
          translations[activeLang] ||
          translations['en'] ||
          translations['en-US'] ||
          (Object.values(translations)[0] as string) ||
          ''
        );
      } catch {
        setCurrentDescription('Description not available.');
      }
    } else if (plugin?.description) {
      setCurrentDescription(plugin.description);
    }
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

  const downloadLabel = (() => {
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
    ['overview', 'Overview'],
    ...(versions.length > 0 ? [['versions', 'Versions', versions.length] as [typeof tab, string, number]] : []),
    ['reviews', 'Reviews', reviews.length],
    ...(commandCount > 0 ? [['commands', t('plugin.commands.title', 'Commands'), commandCount] as [typeof tab, string, number]] : []),
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

  return (
    <div className="page pd">
      <SEO
        title={plugin.name}
        description={cleanDesc || `Download ${plugin.name} by ${plugin.dev_name} on Pumpkin Market.`}
        keywords={`${plugin.name}, minecraft plugin, ${plugin.category || ''}, ${plugin.keywords || ''}`}
        ogType="product"
        ogImage={plugin.preview_path || "/icon.png"}
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

      {(showPaymentSuccess || plugin.is_preorder || plugin.is_early_access) && (
        <div className="pd-notices">
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
                <span className="entry-by">by <Link className="link" to={`/profile/${plugin.dev_name}`}>{plugin.dev_name}</Link></span>
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
                          {latest.created_at && <span className="small">{formatDate(latest.created_at)}</span>}
                          <span className="spacer" />
                          {versions.length > 1 && (
                            <button type="button" className="button button-flat button-sm" onClick={() => openTab('versions')}>
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
                            <button type="button" className="button button-ghost button-sm" onClick={() => openTab('versions')}>
                              View More
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
                        <span className="small">Released {formatDate(v.created_at)}</span>
                      </div>
                      <div className="pd-prose">
                        {v.release_notes ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{v.release_notes}</ReactMarkdown>
                        ) : (
                          <p className="muted">No specific release notes for this update.</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {activeTab === 'reviews' && (
                <section className="pd-reviews" aria-label="Ratings & Reviews">
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
                                <span className="label pumpkin">Developer Response</span>
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
                                    placeholder="Write your response to this review..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    rows={3}
                                    autoFocus
                                  />
                                </div>
                                <div className="row">
                                  <button type="button" className="button button-ghost button-sm" onClick={() => { setReplyOpen(null); setReplyText(''); }}>
                                    Cancel
                                  </button>
                                  <button type="submit" className="button button-primary button-sm" disabled={replySubmitting || !replyText.trim()}>
                                    {replySubmitting ? 'Replying...' : 'Post Reply'}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                {user && user.username === r.username ? (
                                  <button type="button" className="button button-ghost button-sm pd-danger" onClick={deleteReview}>
                                    <Trash2 /> Delete my review
                                  </button>
                                ) : user && (
                                  <button type="button" className="button button-ghost button-sm" onClick={() => setReviewReportOpen(r.id)}>
                                    <Flag /> Report review
                                  </button>
                                )}

                                {isOwner && !r.developer_reply && !replyOpen && (
                                  <button type="button" className="button button-ghost button-sm pd-accent" onClick={() => setReplyOpen(r.id)}>
                                    <MessageSquare /> Reply as developer
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
                disabled={plugin.type === 'paid' && !ownershipChecked}
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

          <div className="pd-meta">
            <dl className="specs">
              {plugin.version && (
                <>
                  <dt>Version</dt>
                  <dd>
                    <span className="pd-spec-version">
                      <span className="mono">{plugin.version}</span>
                      {versions.length > 0 && (
                        <button type="button" className="pd-textbtn" onClick={() => openTab('versions')}>Update History</button>
                      )}
                    </span>
                  </dd>
                </>
              )}
              <dt>Downloads</dt>
              <dd>{(plugin.downloads ?? 0).toLocaleString()}</dd>
              {plugin.created_at && (
                <>
                  <dt>Released</dt>
                  <dd>{formatDate(plugin.created_at)}</dd>
                </>
              )}
              <dt>Category</dt>
              <dd>{plugin.category}</dd>
              {plugin.source_link && (
                <>
                  <dt>Source</dt>
                  <dd>
                    <a href={plugin.source_link} target="_blank" rel="noopener noreferrer" className="link link-pumpkin">View Source Code</a>
                  </dd>
                </>
              )}
            </dl>

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
