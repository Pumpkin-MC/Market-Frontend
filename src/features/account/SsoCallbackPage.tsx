import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { getSsoAuthorizeUrl } from '../../lib/domains';
import '../../styles/account.css';

const SsoCallbackPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const exchangedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const rawNext = searchParams.get('next') || '/';
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get('code');
    if (!code) {
      setError(t('auth.sso.missing_code'));
      return;
    }

    const exchange = async () => {
      try {
        const res = await api.post('/auth/sso/exchange', { code });
        if (res.data?.token) {
          login(res.data.token);
          navigate(safeNext, { replace: true });
        } else {
          setError(t('auth.sso.incomplete_response'));
        }
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
            t('auth.sso.expired_error')
        );
      }
    };

    exchange();
  }, [login, navigate, safeNext, searchParams, t]);

  if (error) {
    return (
      <div className="ac-auth">
        <div className="panel panel-fg ac-card" role="alert">
          <div className="ac-card-head">
            <span className="ac-badge ac-badge-danger">
              <AlertCircle />
            </span>
            <h1 className="h1">
              <Trans t={t} i18nKey="auth.sso.expired_title" components={{ highlight: <span className="mark ac-mark-danger" /> }} />
            </h1>
            <p className="small">{error}</p>
          </div>
          <a
            href={getSsoAuthorizeUrl(safeNext)}
            className="button button-primary button-block"
          >
            {t('auth.sso.try_again')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-auth">
      <div className="panel panel-fg ac-card" role="status">
        <div className="ac-card-head">
          <span className="loading" />
          <h1 className="h1">{t('auth.sso.signing_in')}</h1>
          <p className="small">{t('auth.sso.completing_handoff')}</p>
        </div>
      </div>
    </div>
  );
};

export default SsoCallbackPage;
