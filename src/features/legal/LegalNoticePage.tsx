import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Scale } from 'lucide-react';
import LegalDoc from './LegalDoc';

const LegalNoticePage = () => {
  const { t } = useTranslation();

  const sections = [
    { id: 'operator', title: t('legal.notice.sections.operator.title'), content: t('legal.notice.sections.operator.content') },
    { id: 'editorial', title: t('legal.notice.sections.editorial.title'), content: t('legal.notice.sections.editorial.content') },
    { id: 'dispute-resolution', title: t('legal.notice.sections.dispute-resolution.title'), content: t('legal.notice.sections.dispute-resolution.content') },
    { id: 'liability-content', title: t('legal.notice.sections.liability-content.title'), content: t('legal.notice.sections.liability-content.content') },
    { id: 'liability-links', title: t('legal.notice.sections.liability-links.title'), content: t('legal.notice.sections.liability-links.content') },
    { id: 'copyright', title: t('legal.notice.sections.copyright.title'), content: t('legal.notice.sections.copyright.content') },
  ];

  return (
    <LegalDoc
      kicker={<><Scale /> {t('legal.notice.kicker')}</>}
      title={<>{t('legal.notice.title')}<br /><span className="mark">{t('legal.notice.title_highlight')}</span></>}
      lede={t('legal.notice.lede')}
      updated={t('legal.notice.updated')}
      toc={sections}
      footer={
        <>
          <p>
            <Trans
              t={t}
              i18nKey="legal.notice.footer"
              components={{
                email: <a className="link link-pumpkin" href="mailto:lilalexmed@proton.me">lilalexmed@proton.me</a>,
              }}
            />
          </p>
          <div className="lg-links">
            <Link className="link" to="/terms">{t('legal.links.terms')}</Link>
            <Link className="link" to="/privacy">{t('legal.links.privacy')}</Link>
            <Link className="link" to="/">{t('legal.links.marketplace')}</Link>
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
        </section>
      ))}
    </LegalDoc>
  );
};

export default LegalNoticePage;
