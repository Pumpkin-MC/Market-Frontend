import { useLocation } from 'react-router-dom';
import './CheckEmailPage.css';

const CheckEmailPage = () => {
    const location = useLocation();
    const email = location.state?.email || 'your email address';

    return (
        <div className="check-email-container">
            <div className="check-email-box">
                <div className="check-email-icon">
                    {/* Placeholder for an email icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                </div>
                <h1>Check Your Inbox</h1>
                <p>We've sent a verification link to <strong>{email}</strong>.</p>
                <p>Please click the link in the email to activate your account. The link will expire in 15 minutes.</p>
                <hr />
                <p className="check-email-footer">
                    Didn't receive the email? Check your spam folder or try registering again.
                </p>
            </div>
        </div>
    );
};

export default CheckEmailPage;
