import React, { useState } from 'react';
import { ShieldAlert, Download, Copy, Check, Printer, AlertTriangle } from 'lucide-react';
import '../../styles/account.css';

interface RecoveryCodesModalProps {
    isOpen: boolean;
    codes: string[];
    onClose: () => void;
}

export const RecoveryCodesModal: React.FC<RecoveryCodesModalProps> = ({
    isOpen,
    codes,
    onClose,
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || codes.length === 0) return null;

    const handleCopyAll = () => {
        const text = `PUMPKIN MARKET - EMERGENCY RECOVERY CODES\nGenerated on: ${new Date().toLocaleString()}\n\nEach code can be used once if you lose access to your Passkey or 2FA Authenticator:\n\n` +
            codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\nKeep these codes in a secure location (e.g., password manager).`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownload = () => {
        const text = `PUMPKIN MARKET - EMERGENCY RECOVERY CODES\nGenerated on: ${new Date().toISOString()}\n\nEach code can be used once if you lose access to your Passkey or 2FA Authenticator:\n\n` +
            codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\nStore these codes safely. Never share them with anyone.`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pumpkin-market-recovery-codes-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="overlay">
            <div className="sheet ac-sheet" role="dialog" aria-modal="true" aria-labelledby="recoveryCodesTitle">
                <div className="sheet-head">
                    <span className="ac-icon ac-icon-pumpkin"><ShieldAlert /></span>
                    <div>
                        <h3 className="h2" id="recoveryCodesTitle">Save Your Recovery Codes</h3>
                        <p className="small">
                            If you ever lose access to your authenticator app or security keys, you can use these 10 one-time codes to regain access to your account.
                        </p>
                    </div>
                </div>

                <div className="sheet-body">
                    <div className="notice notice-warning ac-alert">
                        <span className="mark-box mark-box-warning"><AlertTriangle /></span>
                        <p className="notice-text"><strong>Important:</strong> We do not store these codes in plaintext and cannot recover them for you. Save them in a password manager now.</p>
                    </div>

                    <div className="ac-codes">
                        {codes.map((code, idx) => (
                            <span key={idx}>{code}</span>
                        ))}
                    </div>

                    <div className="row">
                        <button type="button" className="button button-sm" onClick={handleCopyAll}>
                            {copied ? <Check /> : <Copy />}
                            {copied ? 'Copied!' : 'Copy All'}
                        </button>
                        <button type="button" className="button button-sm" onClick={handleDownload}>
                            <Download /> Download (.txt)
                        </button>
                        <button
                            type="button"
                            className="button button-sm button-icon"
                            onClick={handlePrint}
                            title="Print Codes"
                            aria-label="Print Codes"
                        >
                            <Printer />
                        </button>
                    </div>
                </div>

                <div className="sheet-foot">
                    <button
                        type="button"
                        className="button button-primary button-block"
                        onClick={onClose}
                    >
                        I have safely stored my recovery codes →
                    </button>
                </div>
            </div>
        </div>
    );
};
