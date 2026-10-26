import { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, CornerDownRight, Send, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';
import type { PluginData } from './ManagePluginPage';

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

const Reviews = ({ plugin }: Props) => {
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

    const renderStars = (rating: number, className = '') => (
        <span className={`stars ${className}`} aria-label={`${rating} / 5`}>
            {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className={star <= rating ? '' : 'off'} />
            ))}
        </span>
    );

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">Reviews &amp; Ratings</h2>
                <p className="small">Monitor user feedback, rating trends, and reply directly to customer reviews.</p>
            </header>

            {loading ? (
                <span className="row small"><span className="loading" />Loading plugin reviews…</span>
            ) : (
                <>
                    <div className="panel st-rv-summary">
                        <div className="st-rv-score">
                            <span className="stat-value">{stats.average > 0 ? stats.average : 'N/A'}</span>
                            {renderStars(Math.round(stats.average), 'st-stars-lg')}
                            <span className="small">Based on {stats.total} {stats.total === 1 ? 'review' : 'reviews'}</span>
                        </div>
                        <div className="stack st-tight">
                            <span className="label">Rating Breakdown</span>
                            {[5, 4, 3, 2, 1].map(starsCount => {
                                const count = stats.distribution[starsCount] || 0;
                                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                                return (
                                    <div key={starsCount} className="st-rv-bar">
                                        <span className="small">{starsCount}</span>
                                        <div className="meter meter-pumpkin"><span style={{ width: `${pct}%` }} /></div>
                                        <span className="small num">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <section className="stack">
                        <h3 className="h2">All Reviews <span className="mark num">{reviews.length}</span></h3>

                        {reviews.length === 0 ? (
                            <div className="blank">
                                <MessageSquare size={36} className="pumpkin" />
                                <p className="h3">No reviews yet</p>
                                <p className="small">When users review this plugin, their feedback and ratings will appear here.</p>
                            </div>
                        ) : (
                            <div className="stack">
                                {reviews.map(rev => (
                                    <article key={rev.id} className="panel">
                                        <div className="panel-body stack">
                                            <div className="row">
                                                <span className="avatar st-rv-avatar">{rev.username.charAt(0).toUpperCase()}</span>
                                                <div className="stack st-rv-who">
                                                    <strong>{rev.username}</strong>
                                                    {renderStars(rev.rating)}
                                                </div>
                                                <span className="spacer" />
                                                <span className="small">{new Date(rev.created_at).toLocaleDateString()}</span>
                                            </div>

                                            <p className="body st-pre">{rev.comment}</p>

                                            {rev.developer_reply ? (
                                                <div className="st-rv-reply">
                                                    <span className="row st-tight">
                                                        <span className="label label-fg row st-tight"><CheckCircle2 size={14} className="st-pos" /> Developer Response</span>
                                                        <span className="spacer" />
                                                        {rev.replied_at && (
                                                            <span className="small">{new Date(rev.replied_at).toLocaleDateString()}</span>
                                                        )}
                                                    </span>
                                                    <p className="body">{rev.developer_reply}</p>
                                                </div>
                                            ) : (
                                                <label className="field">
                                                    <span className="field-label row st-tight"><CornerDownRight size={14} /> Respond to {rev.username}:</span>
                                                    <div className="st-inline-form">
                                                        <span className="control">
                                                            <textarea
                                                                className="input"
                                                                rows={2}
                                                                placeholder="Write your official response..."
                                                                value={replyText[rev.id] || ''}
                                                                onChange={e => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                                                            />
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="button button-primary"
                                                            disabled={submitting[rev.id] || !replyText[rev.id]?.trim()}
                                                            aria-busy={submitting[rev.id]}
                                                            onClick={() => handleSendReply(rev.id)}
                                                        >
                                                            <Send />
                                                            {submitting[rev.id] ? 'Posting…' : 'Reply'}
                                                        </button>
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default Reviews;
