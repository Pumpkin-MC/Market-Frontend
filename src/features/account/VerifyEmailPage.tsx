import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth';
import api from '../../lib/api';
import { SecuritySetupCards } from '../../components/SecuritySetupCards';
import { Check, AlertCircle } from 'lucide-react';
import '../../styles/account.css';

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
        <div className="ac-auth">
            {status === 'verifying' && (
                <div className="panel panel-fg ac-card" role="status">
                    <div className="ac-card-head">
                        <span className="loading" />
                        <h1 className="h1">Verifying your email address...</h1>
                        <p className="small">Please wait while we confirm your credentials.</p>
                    </div>
                </div>
            )}

            {status === 'success' && (
                <div className="ac-wide stack">
                    <div className="notice notice-success ac-alert" role="status">
                        <span className="mark-box mark-box-success"><Check /></span>
                        <p className="notice-text"><strong>Email verified successfully! Welcome to Pumpkin Market.</strong></p>
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
                <div className="panel panel-fg ac-card">
                    <div className="ac-card-head">
                        <span className="ac-badge ac-badge-danger"><AlertCircle /></span>
                        <h1 className="h1">Verification <span className="mark ac-mark-danger">Failed</span></h1>
                        <p className="small">{error}</p>
                    </div>
                    <button
                        className="button button-primary button-block"
                        onClick={() => navigate('/register')}
                    >
                        Return to Registration
                    </button>
                </div>
            )}
        </div>
    );
};

export default VerifyEmailPage;