import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import api from '../../api';
import { SecuritySetupCards } from '../../components/SecuritySetupCards';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const VerifyEmailPage: React.FC = () => {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const verify = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');

            if (!token) {
                setStatus('error');
                setError('No verification token found.');
                return;
            }

            try {
                const res = await api.get(`/auth/verify-email?token=${token}`);
                
                if (res.data.token) {
                    login(res.data.token);
                }

                setStatus('success');
            } catch (err: any) {
                setStatus('error');
                setError(err.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
            }
        };

        verify();
    }, [location]);

    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
        }}>
            {status === 'verifying' && (
                <div style={{ textAlign: 'center', color: 'var(--mp-muted, #94a3b8)' }}>
                    <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: 'var(--mp-accent, #f97316)' }} />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--mp-text, #fff)' }}>Verifying your email address...</h2>
                    <p>Please wait while we confirm your credentials.</p>
                </div>
            )}

            {status === 'success' && (
                <div style={{ width: '100%', maxWidth: 680 }}>
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: '#4ade80',
                    }}>
                        <CheckCircle2 size={24} />
                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Email verified successfully! Welcome to Pumpkin Market.</span>
                    </div>

                    <SecuritySetupCards
                        title="Protect Your Account (Recommended)"
                        description="Add an extra layer of security before you get started. Choose passkeys (biometrics) or an authenticator app. You can also do this later."
                        canSkip={true}
                        onSkip={() => navigate('/')}
                        onComplete={() => navigate('/')}
                    />
                </div>
            )}

            {status === 'error' && (
                <div style={{
                    maxWidth: 480,
                    width: '100%',
                    padding: '2.5rem',
                    background: 'var(--mp-surface, #14171c)',
                    borderRadius: 16,
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                    }}>
                        <AlertCircle size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#fff' }}>
                        Verification Failed
                    </h2>
                    <p style={{ color: 'var(--mp-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                        {error}
                    </p>
                    <button
                        className="mp-btn mp-btn-primary"
                        onClick={() => navigate('/register')}
                        style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
                    >
                        Return to Registration
                    </button>
                </div>
            )}
        </div>
    );
};

export default VerifyEmailPage;
