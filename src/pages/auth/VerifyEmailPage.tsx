import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';

const VerifyEmailPage = () => {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

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
                
                // Assuming the API returns a token and user object on success
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));

                setStatus('success');

                // Redirect to home page after a short delay
                setTimeout(() => {
                    navigate('/');
                }, 3000);

            } catch (err: any) {
                setStatus('error');
                setError(err.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
            }
        };

        verify();
    }, [location, navigate]);

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            {status === 'verifying' && <h1>Verifying your email...</h1>}
            {status === 'success' && (
                <div>
                    <h1>Email Verified Successfully!</h1>
                    <p>You are now logged in. Redirecting to the homepage...</p>
                </div>
            )}
            {/* {status === 'error' && (
                <div>
                    <h1>Verification Failed</h1>
                    <p>{error}</p>
                    <p>Please try registering again or contact support.</p>
                </div>
            )} */}
        </div>
    );
};

export default VerifyEmailPage;
