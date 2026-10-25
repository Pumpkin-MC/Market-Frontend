import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Check } from 'lucide-react';
import api from '../../lib/api';
import '../../styles/account.css';
import { useAuth } from '../../app/auth';

const ConfirmEmailChangePage = () => {
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
                setError(err.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
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
                        <h1 className="h1">Verifying your email change...</h1>
                    </div>
                )}
                {status === 'success' && (
                    <div className="ac-card-head">
                        <span className="ac-badge ac-badge-success"><Check /></span>
                        <h1 className="h1">Email Updated <span className="mark">Successfully!</span></h1>
                        <p className="small">Your new email is now active. Redirecting to your profile...</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="ac-card-head">
                        <span className="ac-badge ac-badge-danger"><AlertCircle /></span>
                        <h1 className="h1">Update <span className="mark ac-mark-danger">Failed</span></h1>
                        <p className="body">{error}</p>
                        <p className="small">Please try updating your email again from your profile page.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfirmEmailChangePage;
