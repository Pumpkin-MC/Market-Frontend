import { useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import '../../styles/account.css';

const CheckEmailPage = () => {
    const location = useLocation();
    const email = location.state?.email || 'your email address';

    return (
        <div className="ac-auth">
            <div className="panel panel-fg ac-card">
                <div className="ac-card-head">
                    <span className="ac-badge"><Mail /></span>
                    <h1 className="h1">Check Your <span className="mark">Inbox</span></h1>
                </div>
                <p className="body">We've sent a verification link to <strong>{email}</strong>.</p>
                <p className="small">Please click the link in the email to activate your account. The link will expire in 15 minutes.</p>
                <p className="ac-card-foot small">
                    Didn't receive the email? Check your spam folder or try registering again.
                </p>
            </div>
        </div>
    );
};

export default CheckEmailPage;
