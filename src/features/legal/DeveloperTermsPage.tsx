import React from 'react';
import LegalDoc from './LegalDoc';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';

export const DeveloperTermsPage: React.FC = () => {
  const { t } = useTranslation();

  const sections = [
    { id: 'definitions', title: t('legal.developer_terms.sections.definitions.title'), content: t('legal.developer_terms.sections.definitions.content') },
    { id: 'license-grant', title: t('legal.developer_terms.sections.license-grant.title'), content: t('legal.developer_terms.sections.license-grant.content') },
    { id: 'platform-control', title: t('legal.developer_terms.sections.platform-control.title'), content: t('legal.developer_terms.sections.platform-control.content') },
    { id: 'developer-warranties', title: t('legal.developer_terms.sections.developer-warranties.title'), content: t('legal.developer_terms.sections.developer-warranties.content') },
    { id: 'mojang-compliance', title: t('legal.developer_terms.sections.mojang-compliance.title'), content: t('legal.developer_terms.sections.mojang-compliance.content') },
    { id: 'commercial-terms', title: t('legal.developer_terms.sections.commercial-terms.title'), content: t('legal.developer_terms.sections.commercial-terms.content') },
    { id: 'support-sla', title: t('legal.developer_terms.sections.support-sla.title'), content: t('legal.developer_terms.sections.support-sla.content') },
    { id: 'anti-circumvention', title: t('legal.developer_terms.sections.anti-circumvention.title'), content: t('legal.developer_terms.sections.anti-circumvention.content') },
    { id: 'indemnification', title: t('legal.developer_terms.sections.indemnification.title'), content: t('legal.developer_terms.sections.indemnification.content') },
    { id: 'termination', title: t('legal.developer_terms.sections.termination.title'), content: t('legal.developer_terms.sections.termination.content') },
    { id: 'governing-law', title: t('legal.developer_terms.sections.governing-law.title'), content: t('legal.developer_terms.sections.governing-law.content') },
  ];

  return (
    <>
      <SEO
        title={t('legal.developer_terms.seo_title')}
        description={t('legal.developer_terms.seo_description')}
      />
      <LegalDoc
        title={<>{t('legal.developer_terms.title')} <span className="mark">{t('legal.developer_terms.title_highlight')}</span></>}
        lede={t('legal.developer_terms.lede')}
        updated={t('legal.developer_terms.updated')}
        toc={sections}
        footer={
          <div className="lg-links">
            <Link className="link" to="/terms">{t('legal.developer_terms.footer_terms')}</Link>
            <Link className="link" to="/guidelines">{t('legal.developer_terms.footer_guidelines')}</Link>
            <Link className="link" to="/privacy">{t('legal.developer_terms.footer_privacy')}</Link>
          </div>
        }
      >
        <aside className="lg-callout">
          <h2 className="sticker">{t('legal.developer_terms.summary_title')}</h2>
          <ul>
            <li><Trans t={t} i18nKey="legal.developer_terms.summary.ownership" /></li>
            <li><Trans t={t} i18nKey="legal.developer_terms.summary.license" /></li>
            <li><Trans t={t} i18nKey="legal.developer_terms.summary.control" /></li>
            <li><Trans t={t} i18nKey="legal.developer_terms.summary.revenue" /></li>
            <li><Trans t={t} i18nKey="legal.developer_terms.summary.security" /></li>
          </ul>
        </aside>

        {sections.map(sec => (
          <section key={sec.id} id={sec.id} className="lg-section">
            <h2>{sec.title}</h2>
            <div className="lg-body">{sec.content}</div>
          </section>
        ))}
      </LegalDoc>
    </>
  );
};

export default DeveloperTermsPage;
