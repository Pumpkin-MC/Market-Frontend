import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

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

const StarRating = ({ rating, max = 5, onRate }: { rating: number; max?: number; onRate?: (n: number) => void }) => (
  <div className="star-rating-container">
  {[...Array(max)].map((_, i) => (
    <span
    key={i}
    className={`star-icon ${i < rating ? 'filled' : 'empty'} ${onRate ? 'interactive' : ''}`}
    onClick={() => onRate && onRate(i + 1)}
    >
    {i < rating ? '★' : '☆'}
    </span>
  ))}
  </div>
);

const PriceDisplay = ({ cents }: { cents: number }) => {
  if (!cents && cents !== 0) return null;
  const euros = Math.floor(cents / 100);
  const remainder = (cents % 100).toString().padStart(2, '0');
  return (
    <div className="price-container">
    <span className="currency-symbol">€</span>
    <span className="price-dollars">{euros}</span>
    <span className="price-decimal">.</span>
    <span className="price-cents">{remainder}</span>
    </div>
  );
};

const getAvatarClass = (username: string) => {
  const classes = ['av-a', 'av-b', 'av-c', 'av-d', 'av-e'];
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

const PluginDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [plugin, setPlugin] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [adShown, setAdShown] = useState(false);
  const [mainScreenshot, setMainScreenshot] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [selectedLanguage] = useState('en');
  const [currentDescription, setCurrentDescription] = useState('');
  const [loading, setLoading] = useState(true);

  // Ownership
  const [ownsPlugin, setOwnsPlugin] = useState(false);
  const [ownershipChecked, setOwnershipChecked] = useState(false);

  // Payment success banner
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSelected, setReportSelected] = useState<string>('');
  const [reportCustom, setReportCustom] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  // Review Report State
  const [reviewReportOpen, setReviewReportOpen] = useState<number | null>(null);
  const [reviewReportSelected, setReviewReportSelected] = useState<string>('');
  const [reviewReportCustom, setReviewReportCustom] = useState('');
  const [reviewReportSubmitting, setReviewReportSubmitting] = useState(false);
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
    api.get(`/plugins/${id}`).then(res => {
      setPlugin(res.data);
      setLoading(false);
      if (res.data.screenshots?.length > 0) {
        setMainScreenshot(res.data.screenshots[0].path);
      }
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
        const translations = JSON.parse(plugin.translated_descriptions);
        setCurrentDescription(
          translations[selectedLanguage] ||
          translations['en'] ||
          Object.values(translations)[0] as string ||
          ''
        );
      } catch {
        setCurrentDescription('Description not available.');
      }
    } else {
      setCurrentDescription('Description not available.');
    }
  }, [plugin, selectedLanguage]);

  // ── Lightbox helpers ─────────────────────────────────────────────────────
  const screenshots = plugin?.screenshots ?? [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxImage(screenshots[index]?.path ?? null);
  };

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
      if (e.key === 'ArrowLeft') lightboxPrev();
      else if (e.key === 'ArrowRight') lightboxNext();
      else if (e.key === 'Escape') closeLightbox();
    };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage, lightboxIndex, screenshots]);

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
    if (plugin.type === 'paid') {
      if (!user) return navigate('/login', { state: { from: `/plugins/${id}` } });

      // Already owns it — download directly, no checkout
      if (ownsPlugin) {
        try {
          await triggerDownload(`/plugins/${id}/download/premium`);
        } catch {
          alert('Download failed. Please try again.');
        }
        return;
      }

      // Does not own — go to Stripe checkout
      try {
        setLoading(true);
        const res = await api.post(`/plugins/${id}/checkout`);
        if (res.data.url) window.location.href = res.data.url;
      } catch (err: any) {
        if (err?.response?.status === 409) {
          // Webhook already recorded purchase before redirect resolved
          setOwnsPlugin(true);
          alert('You already own this plugin — downloading now.');
          await triggerDownload(`/plugins/${id}/download/premium`);
        } else {
          alert('Checkout failed. Please try again.');
        }
      } finally {
        setLoading(false);
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

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const reason = reportSelected === 'Other' ? reportCustom.trim() : reportSelected;
    if (!reason) return;
    setReportSubmitting(true);
    try {
      await api.post(`/plugins/${id}/report`, { reason });
      setReportDone(true);
      setReportSelected('');
      setReportCustom('');
    } catch {
      alert('Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const resetReport = () => {
    setReportOpen(false);
    setReportSelected('');
    setReportCustom('');
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
    } catch {
      alert('Failed to submit report. Please try again.');
    } finally {
      setReviewReportSubmitting(false);
    }
  };

  const resetReviewReport = () => {
    setReviewReportOpen(null);
    setReviewReportSelected('');
    setReviewReportCustom('');
  };

  if (!plugin) return <div className="container"><h2>LOADING...</h2></div>;

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes >= 1048576) return `(${(bytes / 1048576).toFixed(2)} MB)`;
    if (bytes >= 1024) return `(${(bytes / 1024).toFixed(1)} KB)`;
    return `(${bytes} B)`;
  };

  const downloadLabel = (() => {
    const sizeStr = plugin.file_size ? ` ${formatSize(plugin.file_size)}` : '';

  if (plugin.type === 'paid') {
    if (!ownershipChecked) return 'Loading…';
    return ownsPlugin ? `Download ${sizeStr}` : 'Purchase Plugin';
  }

  if (plugin.type === 'adwall' && !adShown) return 'Watch Ad to Download';

  return `Download ${sizeStr}`;
  })();

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "SoftwareApplication",
    "name": plugin.name,
    "operatingSystem": "Minecraft",
    "applicationCategory": "GameApplication",
    "offers": {
      "@type": "Offer",
      "price": plugin.type === 'paid' ? (plugin.price_cents / 100).toFixed(2) : "0.00",
      "priceCurrency": "EUR"
    },
    "aggregateRating": stats ? {
      "@type": "AggregateRating",
      "ratingValue": stats.avg,
      "reviewCount": stats.total
    } : undefined,
    "author": {
      "@type": "Person",
      "name": plugin.dev_name
    }
  };

  return (
    <div className="container">
    <SEO
    title={plugin.name}
    description={currentDescription.substring(0, 160)}
    ogType="product"
    ogImage={plugin.preview_path || "/icon.png"}
    />
    <script type="application/ld+json">
    {JSON.stringify(productSchema)}
    </script>

    {/* ── Payment success banner ── */}
    {showPaymentSuccess && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.35)',
                            borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem',
      }}>
      <span style={{ fontSize: '1.4rem' }}>🎉</span>
      <div>
      <div style={{ fontWeight: 700, color: 'var(--success, #4ade80)', marginBottom: '0.15rem' }}>
      Purchase successful!
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
      You now own <strong>{plugin.name}</strong>. Click the download button to get your WASM file.
      </div>
      </div>
      <button
      onClick={() => setShowPaymentSuccess(false)}
      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1 }}
      >×</button>
      </div>
    )}

    {/* HEADER */}
    <div className="plugin-detail-header">
    <div
    className="plugin-icon large"
    style={{ backgroundImage: plugin.preview_path ? `url(${plugin.preview_path})` : 'none' }}
    >
    {!plugin.preview_path && plugin.name.charAt(0)}
    </div>
    <div>
    <h1 className="plugin-title">{plugin.name}</h1>
    <p className="dev-name">by <Link to={`/profile/${plugin.dev_name}`} style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>{plugin.dev_name}</Link></p>
    </div>
    </div>

    <div className="plugin-detail-layout">
    <div className="plugin-main-content">

    {/* SCREENSHOTS */}
    {Array.isArray(plugin.screenshots) && plugin.screenshots.length > 0 && (
      <div className="screenshot-gallery">
      <img
      src={mainScreenshot || plugin.screenshots[0].path}
      alt="Main"
      className="main-screenshot"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        const idx = plugin.screenshots.findIndex((s: any) => s.path === (mainScreenshot || plugin.screenshots[0].path));
        openLightbox(idx >= 0 ? idx : 0);
      }}
      />
      <div className="thumbnail-strip">
      {plugin.screenshots.map((shot: any) => (
        <img
        key={shot.id}
        src={shot.path}
        alt="Thumbnail"
        className={`thumbnail ${mainScreenshot === shot.path ? 'active' : ''}`}
        onClick={() => setMainScreenshot(shot.path)}
        />
      ))}
      </div>
      </div>
    )}

    {/* DESCRIPTION */}
    <div className="markdown-content">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentDescription}</ReactMarkdown>
    </div>

    <hr className="divider" />

    {/* REVIEWS */}
    <section className="reviews-section">
    <span className="reviews-section-label">Ratings &amp; Reviews</span>

    {stats ? (
      <div className="review-summary-grid">
      <div className="review-avg-block">
      <div className="review-big-avg">{stats.avg}</div>
      <div className="review-stars-row">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`review-star-icon ${n <= Math.round(Number(stats.avg)) ? 'filled' : 'empty'}`}>★</span>
      ))}
      </div>
      <div className="review-total-label">{stats.total.toLocaleString()} Ratings</div>
      </div>
      <div className="review-bars-block">
      {[5, 4, 3, 2, 1].map(num => (
        <div key={num} className="review-bar-row">
        <span className="review-bar-num">{num}</span>
        <div className="review-bar-track">
        <div
        className="review-bar-fill"
        style={{ width: `${(stats.distribution[num as keyof typeof stats.distribution] / stats.total) * 100}%` }}
        />
        </div>
        <span className="review-bar-count">
        {stats.distribution[num as keyof typeof stats.distribution]}
        </span>
        </div>
      ))}
      </div>
      </div>
    ) : (
      <div className="empty-reviews-prompt">No reviews yet. Be the first to leave one!</div>
    )}

    <div className="review-list-premium">
    {Array.isArray(plugin.reviews) && plugin.reviews.map((r: any) => (
      <div key={r.id} className="review-item-premium">
      <div className="review-item-top">
      <div className={`review-avatar ${getAvatarClass(r.username)}`}>
      {getInitials(r.username)}
      </div>
      <div className="review-item-meta">
      <span className="review-item-author">{r.username}</span>
      <span className="review-item-date">Verified User</span>
      </div>
      </div>
      <div className="review-item-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`review-star-sm ${n <= r.rating ? 'filled' : 'empty'}`}>★</span>
      ))}
      </div>
      <p className="review-item-body">{r.comment}</p>
      
      {/* Review Report Button/Form */}
      <div style={{ marginTop: '0.75rem' }}>
        {reportedReviews.has(r.id) ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--success)', margin: 0 }}>✓ Report submitted</p>
        ) : reviewReportOpen === r.id ? (
          <form onSubmit={(e) => submitReviewReport(e, r.id)} className="report-form" style={{ maxWidth: '400px' }}>
            <label className="report-form-label">Reason for reporting this review</label>
            <div className="report-reasons" style={{ transform: 'scale(0.9)', originX: 'left' }}>
              {REVIEW_REPORT_REASONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  className={`report-reason-chip ${reviewReportSelected === reason ? 'selected' : ''}`}
                  onClick={() => { setReviewReportSelected(reason); setReviewReportCustom(''); }}
                >
                  {reason}
                </button>
              ))}
            </div>
            {reviewReportSelected === 'Other' && (
              <textarea
                className="report-textarea"
                placeholder="Describe the issue…"
                value={reviewReportCustom}
                onChange={e => setReviewReportCustom(e.target.value)}
                rows={2}
                autoFocus
                style={{ fontSize: '0.8rem' }}
              />
            )}
            <div className="report-form-actions">
              <button type="button" className="btn-report-cancel" onClick={resetReviewReport} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-report-submit"
                disabled={
                  reviewReportSubmitting ||
                  !reviewReportSelected ||
                  (reviewReportSelected === 'Other' && !reviewReportCustom.trim())
                }
                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
              >
                {reviewReportSubmitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </form>
        ) : (
          user && user.username !== r.username && (
            <button className="btn-report" onClick={() => setReviewReportOpen(r.id)} style={{ fontSize: '0.7rem' }}>
              🚩 Report review
            </button>
          )
        )}
      </div>
      </div>
    ))}
    </div>

    {user ? (
      hasReviewed ? (
        <div className="review-already-posted">
        <span className="review-already-icon">✓</span>
        <div>
        <div className="review-already-title">Review posted</div>
        <div className="review-already-sub">You've already reviewed this plugin. Thanks for the feedback!</div>
        </div>
        </div>
      ) : (
        <form onSubmit={submitReview} className="review-submit-form">
        <h3 className="review-form-title">Leave a Review</h3>
        <div className="form-group">
        <label>Your Rating</label>
        <StarRating rating={reviewForm.rating} onRate={val => setReviewForm({ ...reviewForm, rating: val })} />
        </div>
        <div className="form-group">
        <label>Your Experience</label>
        <textarea
        placeholder="What did you like? What could be better?"
        value={reviewForm.comment}
        maxLength={MAX_REVIEW_LENGTH}
        onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
        required
        />
        </div>
        <button className="btn btn-primary" type="submit">Post Review</button>
        </form>
      )
    ) : (
      <div className="auth-notice">
      Please <Link to="/login">login</Link> to rate this plugin.
      </div>
    )}
    </section>
    </div>

    {/* SIDEBAR */}
    <aside className="plugin-sidebar">
    <div className="sidebar-widget">

    {/* Price / owned indicator */}
    <div className="price-hero-section">
    {plugin.type === 'paid' && ownsPlugin ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success, #4ade80)', fontWeight: 700, fontSize: '0.9rem' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      Purchased
      </div>
    ) : plugin.type === 'paid' ? (
      <div>
      {plugin.sale_active && plugin.sale_discount_percent > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {/* Sale price prominent */}
        <PriceDisplay cents={Math.round(plugin.price_cents * (1 - plugin.sale_discount_percent / 100))} />
        {/* Original price struck through */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
        €{(plugin.price_cents / 100).toFixed(2)}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.35)', color: '#ff6b6b', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.04em' }}>
        -{plugin.sale_discount_percent}% SALE
        </span>
        </div>
        </div>
      ) : (
        <PriceDisplay cents={plugin.price_cents} />
      )}
      </div>
    ) : (
      <div className="price-free">{plugin.type === 'adwall' ? 'AD SUPPORTED' : 'FREE'}</div>
    )}
    </div>

    <button
    className="btn btn-download-main"
    onClick={handleDownload}
    disabled={plugin.type === 'paid' && !ownershipChecked}
    >
    {downloadLabel}
    </button>

    {plugin.source_link && (
      <a
      href={plugin.source_link}
      target="_blank"
      rel="noopener noreferrer"
      className="github-link-secondary"
      >
      <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
      </svg>
      View Source Code
      </a>
    )}

    <div className="sidebar-stats">
    <div className="stat-item"><strong>{plugin.downloads.toLocaleString()}</strong> Downloads</div>
    {plugin.created_at && (
      <div className="stat-item">Released: <strong>{new Date(plugin.created_at).toLocaleDateString()}</strong></div>
    )}
    <div className="stat-item">Category: <strong>{plugin.category}</strong></div>
    {plugin.version && (
      <div className="stat-item">Version: <strong>{plugin.version}</strong></div>
    )}

    <div className="divider-sm" />
    {user && !reportDone && (
      <>
      {!reportOpen ? (
        <button className="btn-report" onClick={() => setReportOpen(true)}>
        🚩 Report plugin
        </button>
      ) : (
        <form onSubmit={submitReport} className="report-form">
        <label className="report-form-label">Reason for report</label>
        <div className="report-reasons">
        {REPORT_REASONS.map(reason => (
          <button
          key={reason}
          type="button"
          className={`report-reason-chip ${reportSelected === reason ? 'selected' : ''}`}
          onClick={() => { setReportSelected(reason); setReportCustom(''); }}
          >
          {reason}
          </button>
        ))}
        </div>
        {reportSelected === 'Other' && (
          <textarea
          className="report-textarea"
          placeholder="Describe the issue…"
          value={reportCustom}
          onChange={e => setReportCustom(e.target.value)}
          rows={3}
          autoFocus
          />
        )}
        <div className="report-form-actions">
        <button type="button" className="btn-report-cancel" onClick={resetReport}>
        Cancel
        </button>
        <button
        type="submit"
        className="btn-report-submit"
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
      )}
      </>
    )}
    {reportDone && (
      <p className="report-done">✓ Report submitted. Thanks for keeping the marketplace safe.</p>
    )}
    </div>
    </div>
    </aside>
    </div>

    {/* LIGHTBOX MODAL */}
    {lightboxImage && (
      <div className="lightbox-overlay" onClick={closeLightbox}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
      <img src={lightboxImage} alt="Expanded view" className="lightbox-img" />
      <button className="lightbox-close" onClick={closeLightbox}>
      &times;
      </button>

      {/* Left arrow — only shown when multiple screenshots exist */}
      {screenshots.length > 1 && (
        <button
        className="lightbox-arrow lightbox-arrow-left"
        onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
        aria-label="Previous screenshot"
        >
        &#8249;
        </button>
      )}

      {/* Right arrow */}
      {screenshots.length > 1 && (
        <button
        className="lightbox-arrow lightbox-arrow-right"
        onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
        aria-label="Next screenshot"
        >
        &#8250;
        </button>
      )}

      {/* Dot indicators */}
      {screenshots.length > 1 && (
        <div className="lightbox-dots">
        {screenshots.map((_: any, i: number) => (
          <button
          key={i}
          className={`lightbox-dot ${i === lightboxIndex ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); openLightbox(i); }}
          aria-label={`Go to screenshot ${i + 1}`}
          />
        ))}
        </div>
      )}
      </div>
      </div>
    )}
    </div>
  );
};

export default PluginDetail;
