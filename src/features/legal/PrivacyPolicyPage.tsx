import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { openCookiePreferencesModal } from '../../lib/consent';
import { Shield, Sliders } from 'lucide-react';
import LegalDoc from './LegalDoc';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();

  const sections = [
    {
      id: 'overview',
      title: t('legal.privacy.sections.overview.title'),
      content: t('legal.privacy.sections.overview.content'),
    },
    {
      id: 'information-collected',
      title: t('legal.privacy.sections.information-collected.title'),
      content: t('legal.privacy.sections.information-collected.content'),
    },
    {
      id: 'how-we-use',
      title: t('legal.privacy.sections.how-we-use.title'),
      content: t('legal.privacy.sections.how-we-use.content'),
    },
    {
      id: 'service-providers',
      title: t('legal.privacy.sections.service-providers.title'),
      content: t('legal.privacy.sections.service-providers.content'),
    },
    {
      id: 'international-transfers',
      title: t('legal.privacy.sections.international-transfers.title'),
      content: t('legal.privacy.sections.international-transfers.content'),
    },
    {
      id: 'retention',
      title: t('legal.privacy.sections.retention.title'),
      content: t('legal.privacy.sections.retention.content'),
    },
    {
      id: 'cookies',
      title: t('legal.privacy.sections.cookies.title'),
      content: t('legal.privacy.sections.cookies.content'),
      hasCookieButton: true,
    },
    {
      id: 'rights',
      title: t('legal.privacy.sections.rights.title'),
      content: t('legal.privacy.sections.rights.content'),
    },
    {
      id: 'security',
      title: t('legal.privacy.sections.security.title'),
      content: t('legal.privacy.sections.security.content'),
    },
    {
      id: 'children',
      title: t('legal.privacy.sections.children.title'),
      content: t('legal.privacy.sections.children.content'),
    },
    {
      id: 'contact',
      title: t('legal.privacy.sections.contact.title'),
      content: t('legal.privacy.sections.contact.content'),
    },
  ];

  return (
    <LegalDoc
      kicker={<><Shield /> {t('legal.privacy.kicker')}</>}
      title={<>{t('legal.privacy.title')}<br /><span className="mark">{t('legal.privacy.title_highlight')}</span></>}
      lede={t('legal.privacy.lede')}
      updated={t('legal.privacy.updated')}
      toc={sections}
      footer={
        <>
          <p>
            <Trans
              t={t}
              i18nKey="legal.privacy.footer"
              components={{
                email: <a className="link link-pumpkin" href="mailto:privacy@pumpkinmc.org">privacy@pumpkinmc.org</a>,
              }}
            />
          </p>
          <div className="lg-links">
            <Link className="link" to="/terms">{t('legal.links.terms')}</Link>
            <Link className="link" to="/">{t('legal.links.marketplace')}</Link>
            <button type="button" className="link" onClick={openCookiePreferencesModal}>{t('legal.cookie_preferences')}</button>
            <Link className="link" to="/register">{t('legal.links.create_account')}</Link>
          </div>
        </>
      }
    >
      {sections.map(s => (
        <section key={s.id} id={s.id} className="lg-section">
          <h2>{s.title}</h2>
          <div className="lg-body">
            {s.content.split('\n').map((line, i) => {
              const isSubheading = line.length > 0 && !line.startsWith('•') && !line.startsWith(' ') && i > 0 && s.content.split('\n')[i - 1] === '';
              return isSubheading
                ? <strong key={i}>{line}</strong>
                : <span key={i}>{line}{'\n'}</span>;
            })}
          </div>
          {s.hasCookieButton && (
            <button type="button" className="button button-sm" onClick={openCookiePreferencesModal}>
              <Sliders />
              {t('legal.manage_cookie_preferences')}
            </button>
          )}
        </section>
      ))}
    </LegalDoc>
  );
};

export default PrivacyPolicyPage;
