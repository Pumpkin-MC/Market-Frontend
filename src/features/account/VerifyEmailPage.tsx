import { Trans, useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth';
import api from '../../lib/api';
import { translateApiMessage } from '../../lib/apiMessages';
import { SecuritySetupCards } from '../../components/SecuritySetupCards';
import { Check, AlertCircle } from 'lucide-react';
import '../../styles/account.css';

const VerifyEmailPage: React.FC = () => {
    const { t } = useTranslation();
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
                setError(t('auth.errors.missing_verification_token'));
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
                setError(translateApiMessage(t, err.response?.data?.error || t('auth.errors.verification_failed')));
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
                        <h1 className="h1">{t('auth.verify_email.verifying')}</h1>
                        <p className="small">{t('auth.verify_email.waiting')}</p>
                    </div>
                </div>
            )}

            {status === 'success' && (
                <div className="ac-wide stack">
                    <div className="notice notice-success ac-alert" role="status">
                        <span className="mark-box mark-box-success"><Check /></span>
                        <p className="notice-text"><strong>{t('auth.verify_email.success')}</strong></p>
                    </div>

                    <SecuritySetupCards
                        title={t('auth.verify_email.security_title')}
                        description={t('auth.verify_email.security_description')}
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
                        <h1 className="h1"><Trans t={t} i18nKey="auth.verify_email.failed" components={{ highlight: <span className="mark ac-mark-danger" /> }} /></h1>
                        <p className="small">{error}</p>
                    </div>
                    <button
                        className="button button-primary button-block"
                        onClick={() => navigate('/register')}
                    >
                        {t('auth.verify_email.return_to_registration')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default VerifyEmailPage;