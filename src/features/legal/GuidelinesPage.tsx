import { Trans, useTranslation } from 'react-i18next';
import LegalDoc from './LegalDoc';

const GuidelinesPage = () => {
    const { t } = useTranslation();

    const toc = [
        { id: 'safety', title: t('legal.guidelines.toc.safety') },
        { id: 'performance', title: t('legal.guidelines.toc.performance') },
        { id: 'business', title: t('legal.guidelines.toc.business') },
        { id: 'design', title: t('legal.guidelines.toc.design') },
        { id: 'legal', title: t('legal.guidelines.toc.legal') },
    ];

    return (
        <LegalDoc
            title={<>{t('legal.guidelines.title')} <span className="mark">{t('legal.guidelines.title_highlight')}</span></>}
            lede={t('legal.guidelines.lede')}
            updated={t('legal.guidelines.updated')}
            toc={toc}
            footer={<p>{t('legal.guidelines.footer')}</p>}
        >
            <section className="lg-intro">
                <p>{t('legal.guidelines.intro')}</p>
                <aside className="lg-callout">
                    <h2 className="sticker">{t('legal.guidelines.before_submit')}</h2>
                    <ul>
                        <li>{t('legal.guidelines.before_submit_items.complete')}</li>
                        <li>{t('legal.guidelines.before_submit_items.crashes')}</li>
                        <li>{t('legal.guidelines.before_submit_items.links')}</li>
                        <li>{t('legal.guidelines.before_submit_items.security')}</li>
                    </ul>
                </aside>
            </section>

            <section id="safety" className="lg-section">
                <h2>{t('legal.guidelines.toc.safety')}</h2>
                <p className="lg-lead">{t('legal.guidelines.safety.lead')}</p>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.safety.objectionable.title')}</h3>
                    <p>{t('legal.guidelines.safety.objectionable.intro')}</p>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.objectionable.defamatory" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.objectionable.violence" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.objectionable.sexual" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.objectionable.harassment" /></li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.safety.protection.title')}</h3>
                    <p>{t('legal.guidelines.safety.protection.intro')}</p>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.protection.malware" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.protection.phishing" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.protection.remote" /></li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.safety.privacy.title')}</h3>
                    <p>{t('legal.guidelines.safety.privacy.intro')}</p>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.privacy.transparency" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.privacy.opt_out" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.safety.privacy.sensitive" /></li>
                    </ul>
                </div>
            </section>

            <section id="performance" className="lg-section">
                <h2>{t('legal.guidelines.toc.performance')}</h2>
                <p className="lg-lead">{t('legal.guidelines.performance.lead')}</p>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.performance.completeness.title')}</h3>
                    <p>{t('legal.guidelines.performance.completeness.intro')}</p>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.performance.completeness.minimum" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.performance.completeness.stability" /></li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.performance.metadata.title')}</h3>
                    <p>{t('legal.guidelines.performance.metadata.intro')}</p>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.performance.metadata.screenshots" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.performance.metadata.categorization" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.performance.metadata.descriptions" /></li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.performance.resources.title')}</h3>
                    <p>{t('legal.guidelines.performance.resources.intro')}</p>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.performance.resources.cpu" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.performance.resources.memory" /></li>
                    </ul>
                </div>
            </section>

            <section id="business" className="lg-section">
                <h2>{t('legal.guidelines.toc.business')}</h2>
                <p className="lg-lead">{t('legal.guidelines.business.lead')}</p>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.business.payments.title')}</h3>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.business.payments.integrated" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.business.payments.digital" /></li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.business.practices.title')}</h3>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.business.practices.bait" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.business.practices.reviews" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.business.practices.scamming" /></li>
                    </ul>
                </div>
            </section>

            <section id="design" className="lg-section">
                <h2>{t('legal.guidelines.toc.design')}</h2>
                <p className="lg-lead">{t('legal.guidelines.design.lead')}</p>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.design.copycats.title')}</h3>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.design.copycats.originality" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.design.copycats.spam" /></li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.design.ux.title')}</h3>
                    <ul>
                        <li><Trans t={t} i18nKey="legal.guidelines.design.ux.consistency" /></li>
                        <li><Trans t={t} i18nKey="legal.guidelines.design.ux.documentation" /></li>
                    </ul>
                </div>
            </section>

            <section id="legal" className="lg-section">
                <h2>{t('legal.guidelines.toc.legal')}</h2>
                <p className="lg-lead">{t('legal.guidelines.legal.lead')}</p>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.legal.ip.title')}</h3>
                    <p>{t('legal.guidelines.legal.ip.body')}</p>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.legal.licenses.title')}</h3>
                    <p>{t('legal.guidelines.legal.licenses.body')}</p>
                </div>

                <div className="lg-sub">
                    <h3>{t('legal.guidelines.legal.removal.title')}</h3>
                    <p>{t('legal.guidelines.legal.removal.body')}</p>
                </div>
            </section>
        </LegalDoc>
    );
};

export default GuidelinesPage;
