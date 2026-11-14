import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { getSsoAuthorizeUrl } from '../../lib/domains';
import '../../styles/account.css';

const SsoCallbackPage = () => {
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
      setError('Missing single sign-on authorization code.');
      return;
    }

    const exchange = async () => {
      try {
        const res = await api.post('/auth/sso/exchange', { code });
        if (res.data?.token) {
          login(res.data.token);
          navigate(safeNext, { replace: true });
        } else {
          setError('Authentication response was incomplete.');
        }
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
            'Your sign-in link has expired or was already used. Please try signing in again.'
        );
      }
    };

    exchange();
  }, [login, navigate, safeNext, searchParams]);

  if (error) {
    return (
      <div className="ac-auth">
        <div className="panel panel-fg ac-card" role="alert">
          <div className="ac-card-head">
            <span className="ac-badge ac-badge-danger">
              <AlertCircle />
            </span>
            <h1 className="h1">
              Sign-in <span className="mark ac-mark-danger">Expired</span>
            </h1>
            <p className="small">{error}</p>
          </div>
          <a
            href={getSsoAuthorizeUrl(safeNext)}
            className="button button-primary button-block"
          >
            Try Signing In Again
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
          <h1 className="h1">Signing you in…</h1>
          <p className="small">Completing your Pumpkin Account handoff.</p>
        </div>
      </div>
    </div>
  );
};

export default SsoCallbackPage;
