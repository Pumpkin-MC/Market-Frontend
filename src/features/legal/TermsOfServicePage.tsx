import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import LegalDoc from './LegalDoc';

const TermsOfServicePage = () => {
  const { t } = useTranslation();

  const sections = [
    { id: 'acceptance', title: t('legal.terms.sections.acceptance.title'), content: t('legal.terms.sections.acceptance.content') },
    { id: 'eligibility', title: t('legal.terms.sections.eligibility.title'), content: t('legal.terms.sections.eligibility.content') },
    { id: 'accounts', title: t('legal.terms.sections.accounts.title'), content: t('legal.terms.sections.accounts.content') },
    { id: 'plugins', title: t('legal.terms.sections.plugins.title'), content: t('legal.terms.sections.plugins.content') },
    { id: 'prohibited', title: t('legal.terms.sections.prohibited.title'), content: t('legal.terms.sections.prohibited.content') },
    { id: 'transactions', title: t('legal.terms.sections.transactions.title'), content: t('legal.terms.sections.transactions.content') },
    { id: 'refunds', title: t('legal.terms.sections.refunds.title'), content: t('legal.terms.sections.refunds.content') },
    { id: 'sellers', title: t('legal.terms.sections.sellers.title'), content: t('legal.terms.sections.sellers.content') },
    { id: 'ip', title: t('legal.terms.sections.ip.title'), content: t('legal.terms.sections.ip.content') },
    { id: 'privacy', title: t('legal.terms.sections.privacy.title'), content: t('legal.terms.sections.privacy.content') },
    { id: 'disclaimer', title: t('legal.terms.sections.disclaimer.title'), content: t('legal.terms.sections.disclaimer.content') },
    { id: 'liability', title: t('legal.terms.sections.liability.title'), content: t('legal.terms.sections.liability.content') },
    { id: 'termination', title: t('legal.terms.sections.termination.title'), content: t('legal.terms.sections.termination.content') },
    { id: 'governing', title: t('legal.terms.sections.governing.title'), content: t('legal.terms.sections.governing.content') },
    { id: 'contact', title: t('legal.terms.sections.contact.title'), content: t('legal.terms.sections.contact.content') },
  ];

  return (
    <LegalDoc
      kicker={t('legal.terms.kicker')}
      title={<>{t('legal.terms.title')}<br /><span className="mark">{t('legal.terms.title_highlight')}</span></>}
      lede={t('legal.terms.lede')}
      updated={t('legal.terms.updated')}
      toc={sections}
      footer={
        <>
          <p>
            <Trans
              t={t}
              i18nKey="legal.terms.footer"
              components={{
                email: <a className="link link-pumpkin" href="mailto:support@pumpkinmc.org">support@pumpkinmc.org</a>,
                discord: <a className="link link-pumpkin" href="https://discord.gg/pumpkinmc" />,
              }}
            />
          </p>
          <Link to="/register" className="button button-primary">
            {t('legal.links.create_account')}
          </Link>
        </>
      }
    >
      {sections.map(s => (
        <section key={s.id} id={s.id} className="lg-section">
          <h2>{s.title}</h2>
          <div className="lg-body">{s.content}</div>
        </section>
      ))}
    </LegalDoc>
  );
};

export default TermsOfServicePage;
