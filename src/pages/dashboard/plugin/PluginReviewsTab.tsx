import { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, CornerDownRight, Send, CheckCircle2 } from 'lucide-react';
import api from '../../../api';
import type { PluginData } from './ManagePlugin';

interface Review {
    id: number;
    user_id: number;
    plugin_id: number;
    rating: number;
    comment: string;
    developer_reply?: string | null;
    replied_at?: string | null;
    created_at: string;
    username: string;
}

type Props = {
    plugin: PluginData;
};

const PluginReviewsTab = ({ plugin }: Props) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState<{ [reviewId: number]: string }>({});
    const [submitting, setSubmitting] = useState<{ [reviewId: number]: boolean }>({});

    useEffect(() => {
        fetchPluginReviews();
    }, [plugin.id]);

    const fetchPluginReviews = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/plugins/${plugin.id}`);
            const fetchedReviews: Review[] = res.data.reviews || [];
            setReviews(fetchedReviews);
        } catch (err) {
            console.error('Failed to fetch plugin reviews', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate rating statistics & distribution
    const stats = useMemo(() => {
        if (reviews.length === 0) {
            return {
                average: 0,
                total: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const average = Number((sum / total).toFixed(1));

        const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (distribution[r.rating] !== undefined) {
                distribution[r.rating]++;
            }
        });

        return { average, total, distribution };
    }, [reviews]);

    const handleSendReply = async (reviewId: number) => {
        const text = replyText[reviewId]?.trim();
        if (!text) return;

        setSubmitting(s => ({ ...s, [reviewId]: true }));
        try {
            await api.post(`/plugins/${plugin.id}/reviews/${reviewId}/reply`, { reply: text });
            setReviews(prev =>
                prev.map(r =>
                    r.id === reviewId
                        ? { ...r, developer_reply: text, replied_at: new Date().toISOString() }
                        : r
                )
            );
            setReplyText(t => ({ ...t, [reviewId]: '' }));
        } catch (err: any) {
            alert(err.response?.data?.error || err.response?.data || 'Failed to submit reply.');
        } finally {
            setSubmitting(s => ({ ...s, [reviewId]: false }));
        }
    };

    const renderStars = (rating: number, size = 14) => (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <Star
                    key={star}
                    size={size}
                    fill={star <= rating ? '#f59e0b' : 'transparent'}
                    color={star <= rating ? '#f59e0b' : 'var(--mp-border)'}
                />
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div className="mp-section-header">
                <h2 className="mp-title">Reviews &amp; Ratings</h2>
                <p>Monitor user feedback, rating trends, and reply directly to customer reviews.</p>
            </div>

            {loading ? (
                <div style={{ color: 'var(--mp-muted)', padding: '2rem 0' }}>Loading plugin reviews…</div>
            ) : (
                <>
                    {/* Rating Overview Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {/* Summary Box */}
                        <div className="mp-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '3.2rem', fontWeight: 800, color: 'var(--mp-text)', lineHeight: 1 }}>
                                {stats.average > 0 ? stats.average : 'N/A'}
                            </div>
                            <div style={{ margin: '0.75rem 0' }}>
                                {renderStars(Math.round(stats.average), 18)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--mp-muted)' }}>
                                Based on {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                            </div>
                        </div>

                        {/* Breakdown Bars */}
                        <div className="mp-card" style={{ flex: 1 }}>
                            <div className="mp-card-title" style={{ marginBottom: '1rem' }}>
                                Rating Breakdown
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {[5, 4, 3, 2, 1].map(starsCount => {
                                    const count = stats.distribution[starsCount] || 0;
                                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                                    return (
                                        <div key={starsCount} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '50px', color: 'var(--mp-muted)' }}>
                                                <span>{starsCount}</span>
                                                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                            </div>
                                            <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '4px', transition: 'width 0.3s' }} />
                                            </div>
                                            <div style={{ width: '40px', textAlign: 'right', color: 'var(--mp-muted)', fontSize: '0.8rem' }}>
                                                {pct}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className="mp-card">
                        <div className="mp-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <MessageSquare size={16} /> All Reviews ({reviews.length})
                        </div>

                        {reviews.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--mp-muted)' }}>
                                <MessageSquare size={36} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                                <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0' }}>No reviews yet</p>
                                <p style={{ fontSize: '0.85rem' }}>When users review this plugin, their feedback and ratings will appear here.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {reviews.map(rev => (
                                    <div
                                        key={rev.id}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid var(--mp-border)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--mp-text)' }}>
                                                    {rev.username}
                                                </div>
                                                <div style={{ marginTop: '0.25rem' }}>
                                                    {renderStars(rev.rating)}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--mp-muted)' }}>
                                                {new Date(rev.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--mp-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                            {rev.comment}
                                        </p>

                                        {/* Developer Reply Box or Input */}
                                        {rev.developer_reply ? (
                                            <div style={{
                                                marginTop: '0.5rem',
                                                padding: '1rem',
                                                borderRadius: '6px',
                                                background: 'rgba(34, 197, 94, 0.08)',
                                                borderLeft: '3px solid var(--mp-success)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.4rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mp-success)' }}>
                                                    <CheckCircle2 size={13} /> Developer Response
                                                    {rev.replied_at && (
                                                        <span style={{ fontWeight: 400, color: 'var(--mp-muted)', marginLeft: 'auto' }}>
                                                            {new Date(rev.replied_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--mp-text)', lineHeight: 1.4 }}>
                                                    {rev.developer_reply}
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--mp-muted)' }}>
                                                    <CornerDownRight size={13} /> Respond to {rev.username}:
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <textarea
                                                        className="mp-input"
                                                        rows={2}
                                                        placeholder="Write your official response..."
                                                        value={replyText[rev.id] || ''}
                                                        onChange={e => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                                                        style={{ flex: 1, resize: 'vertical', fontSize: '0.85rem' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="mp-btn mp-btn-primary"
                                                        disabled={submitting[rev.id] || !replyText[rev.id]?.trim()}
                                                        onClick={() => handleSendReply(rev.id)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: 'fit-content', padding: '0.6rem 1rem' }}
                                                    >
                                                        <Send size={13} />
                                                        {submitting[rev.id] ? 'Posting…' : 'Reply'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PluginReviewsTab;
