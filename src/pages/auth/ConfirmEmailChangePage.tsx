import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../App';

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
        <div style={{ textAlign: 'center', padding: '50px' }}>
            {status === 'verifying' && <h1>Verifying your email change...</h1>}
            {status === 'success' && (
                <div>
                    <h1>Email Updated Successfully!</h1>
                    <p>Your new email is now active. Redirecting to your profile...</p>
                </div>
            )}
            {status === 'error' && (
                <div>
                    <h1>Update Failed</h1>
                    <p>{error}</p>
                    <p>Please try updating your email again from your profile page.</p>
                </div>
            )}
        </div>
    );
};

export default ConfirmEmailChangePage;
