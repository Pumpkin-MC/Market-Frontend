import { Trans, useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Check } from 'lucide-react';
import api from '../../lib/api';
import '../../styles/account.css';
import { useAuth } from '../../app/auth';

const ConfirmEmailChangePage = () => {
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
                const res = await api.post('/user/confirm-email-change', { token });
                
                if (res.data.token) {
                    login(res.data.token);
                }

                setStatus('success');

                setTimeout(() => {
                    navigate('/profile');
                }, 3000);

            } catch (err: any) {
                setStatus('error');
                setError(err.response?.data?.error || t('auth.errors.verification_failed'));
            }
        };

        verify();
    }, [location, navigate, login]);

    return (
        <div className="ac-auth">
            <div className="panel panel-fg ac-card" role="status">
                {status === 'verifying' && (
                    <div className="ac-card-head">
                        <span className="loading" />
                        <h1 className="h1">{t('auth.confirm_email.verifying')}</h1>
                    </div>
                )}
                {status === 'success' && (
                    <div className="ac-card-head">
                        <span className="ac-badge ac-badge-success"><Check /></span>
                        <h1 className="h1"><Trans t={t} i18nKey="auth.confirm_email.success" components={{ highlight: <span className="mark" /> }} /></h1>
                        <p className="small">{t('auth.confirm_email.success_description')}</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="ac-card-head">
                        <span className="ac-badge ac-badge-danger"><AlertCircle /></span>
                        <h1 className="h1"><Trans t={t} i18nKey="auth.confirm_email.failed" components={{ highlight: <span className="mark ac-mark-danger" /> }} /></h1>
                        <p className="body">{error}</p>
                        <p className="small">{t('auth.confirm_email.retry')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfirmEmailChangePage;
