import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    if (!isOpen || codes.length === 0) return null;

    const handleCopyAll = () => {
        const text = t('profile.recovery_modal.copy_document', {
            date: new Date().toLocaleString(),
            codes: codes.map((c, i) => `${i + 1}. ${c}`).join('\n'),
        });
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownload = () => {
        const text = t('profile.recovery_modal.download_document', {
            date: new Date().toISOString(),
            codes: codes.map((c, i) => `${i + 1}. ${c}`).join('\n'),
        });
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
                        <h3 className="h2" id="recoveryCodesTitle">{t('profile.recovery_modal.title')}</h3>
                        <p className="small">
                            {t('profile.recovery_modal.description')}
                        </p>
                    </div>
                </div>

                <div className="sheet-body">
                    <div className="notice notice-warning ac-alert">
                        <span className="mark-box mark-box-warning"><AlertTriangle /></span>
                        <p className="notice-text"><Trans t={t} i18nKey="profile.recovery_modal.warning" components={{ strong: <strong /> }} /></p>
                    </div>

                    <div className="ac-codes">
                        {codes.map((code, idx) => (
                            <span key={idx}>{code}</span>
                        ))}
                    </div>

                    <div className="row">
                        <button type="button" className="button button-sm" onClick={handleCopyAll}>
                            {copied ? <Check /> : <Copy />}
                            {copied ? t('common.copied') : t('profile.recovery_modal.copy_all')}
                        </button>
                        <button type="button" className="button button-sm" onClick={handleDownload}>
                            <Download /> {t('profile.recovery_modal.download')}
                        </button>
                        <button
                            type="button"
                            className="button button-sm button-icon"
                            onClick={handlePrint}
                            title={t('profile.recovery_modal.print')}
                            aria-label={t('profile.recovery_modal.print')}
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
                        {t('profile.recovery_modal.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};
