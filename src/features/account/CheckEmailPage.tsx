import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import '../../styles/account.css';

const CheckEmailPage = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const email = location.state?.email || t('auth.check_email.email_fallback');

    return (
        <div className="ac-auth">
            <div className="panel panel-fg ac-card">
                <div className="ac-card-head">
                    <span className="ac-badge"><Mail /></span>
                    <h1 className="h1"><Trans t={t} i18nKey="auth.check_email.title" components={{ highlight: <span className="mark" /> }} /></h1>
                </div>
                <p className="body"><Trans t={t} i18nKey="auth.check_email.sent" components={{ email: <strong>{email}</strong> }} /></p>
                <p className="small">{t('auth.check_email.instructions')}</p>
                <p className="ac-card-foot small">
                    {t('auth.check_email.missing')}
                </p>
            </div>
        </div>
    );
};

export default CheckEmailPage;
