import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: string;
}

const sections: Section[] = [
  {
    id: 'operator',
    title: '1. Service Provider & Operator Information (§ 5 DDG)',
    content: `Information pursuant to § 5 of the German Digital Services Act (Digitale-Dienste-Gesetz - DDG):

Service Operator:
Aleksandr Medvedev
Kastanienweg 20
40723 Hilden
Germany

Contact Details:
• Direct Email: lilalexmed@proton.me
• Platform Support: support@pumpkinmc.org
• Privacy & Data Protection: privacy@pumpkinmc.org
• Official Website: https://pumpkinmc.org
• Discord Community: https://discord.gg/pumpkinmc`
  },
  {
    id: 'editorial',
    title: '2. Responsible for Content (§ 18 Abs. 2 MStV)',
    content: `Responsible for journalistic and editorial content pursuant to § 18 Section 2 of the German Interstate Media Treaty (Medienstaatsvertrag - MStV):

Aleksandr Medvedev
Kastanienweg 20
40723 Hilden
Germany`
  },
  {
    id: 'dispute-resolution',
    title: '3. EU Online Dispute Resolution & Consumer Arbitration',
    content: `Online Dispute Resolution (ODR):
The European Commission provides a platform for online dispute resolution (ODR), accessible at:
https://ec.europa.eu/consumers/odr/

Our contact email for consumer dispute matters: lilalexmed@proton.me

Consumer Dispute Resolution:
We are neither obligated nor willing to participate in dispute resolution proceedings before a consumer arbitration board (Verbraucherschlichtungsstelle) pursuant to the German Consumer Dispute Resolution Act (VSBG).`
  },
  {
    id: 'liability-content',
    title: '4. Liability for Content (§ 7 Abs. 1 DDG)',
    content: `As a service provider, we are responsible for our own content on these pages under general statutory laws pursuant to § 7 Section 1 of the German Digital Services Act (DDG).

According to §§ 8 to 10 DDG, however, we as a service provider are not obligated to permanently monitor transmitted or stored third-party information (such as user-submitted plugins, reviews, or comments) or to investigate circumstances that indicate illegal activity.

Obligations to remove or block the use of information under general statutory laws remain unaffected. Any liability in this respect, however, is only possible from the time of knowledge of a specific infringement. Upon notification of corresponding infringements, we will remove this content immediately.`
  },
  {
    id: 'liability-links',
    title: '5. Liability for External Links',
    content: `Our Service contains links to external third-party websites (such as plugin repositories, creator documentation, and Discord) over whose content we have no influence. Therefore, we cannot assume any liability for this external content.

The respective provider or operator of the pages is always responsible for the content of the linked pages. The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking.

Permanent monitoring of the content of the linked pages is not reasonable without concrete evidence of an infringement. Upon notification of legal infringements, we will remove such links immediately.`
  },
  {
    id: 'copyright',
    title: '6. Copyright & Intellectual Property',
    content: `The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, and any kind of exploitation outside the limits of copyright law require the written consent of the respective author or creator.

Downloads and copies of this site are only permitted for private, non-commercial use, unless expressly permitted otherwise by the respective plugin's open-source or commercial license.

Insofar as the content on this site was not created by the operator, the copyrights of third parties (such as plugin creators and contributing developers) are respected. In particular, third-party content is marked as such. Should you nevertheless become aware of a copyright infringement, please notify us at support@pumpkinmc.org. Upon notification of infringements, we will remove such content immediately.`
  }
];

const LegalNoticePage = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          background: #0f1117;
        }

        .ln-page {
          min-height: 100vh;
          background-color: #0f1117;
          background-image: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255, 107, 0, 0.12) 0%, transparent 65%);
          color: #c8cdd8;
        }

        /* ── Hero ── */
        .ln-hero {
          text-align: center;
          padding: 64px 24px 48px;
          border-bottom: 1px solid #1a2030;
        }

        .ln-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 107, 0, 0.1);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #ff8c00;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .ln-title {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 800;
          color: #f0f2f5;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin-bottom: 14px;
        }

        .ln-title span {
          background: linear-gradient(135deg, #ff8c00, #ff6b00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ln-subtitle {
          font-size: 15px;
          color: #8c9bb4;
          font-weight: 600;
          max-width: 560px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .ln-date {
          margin-top: 16px;
          font-size: 12.5px;
          color: #6b7a94;
          font-weight: 600;
        }

        /* ── Layout ── */
        .ln-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          max-width: 1120px;
          margin: 0 auto;
          padding: 40px 24px 80px;
          gap: 40px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .ln-layout { grid-template-columns: 1fr; }
          .ln-sidebar { display: none; }
        }

        /* ── Sidebar ── */
        .ln-sidebar {
          position: sticky;
          top: 100px;
        }

        .sidebar-label {
          font-size: 11px;
          font-weight: 700;
          color: #6b7a94;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
          padding-left: 10px;
        }

        .sidebar-nav { display: flex; flex-direction: column; gap: 2px; }

        .sidebar-link {
          font-size: 13px;
          font-weight: 600;
          color: #8c9bb4;
          text-decoration: none;
          padding: 7px 10px;
          border-radius: 6px;
          transition: all 0.15s;
          border-left: 2px solid transparent;
          line-height: 1.4;
        }

        .sidebar-link:hover {
          color: #ffffff;
          background: rgba(255, 107, 0, 0.06);
          border-left-color: rgba(255, 107, 0, 0.3);
        }

        .sidebar-link.active {
          color: #ff8c00;
          background: rgba(255, 107, 0, 0.08);
          border-left-color: #ff6b00;
        }

        /* ── Content ── */
        .ln-content { min-width: 0; }

        .ln-section {
          background: #161b26;
          border: 1px solid #1e2535;
          border-radius: 12px;
          padding: 28px 32px;
          margin-bottom: 16px;
          transition: border-color 0.2s;
          scroll-margin-top: 100px;
        }

        .ln-section:hover { border-color: rgba(255, 107, 0, 0.2); }
        .ln-section.active { border-color: rgba(255, 107, 0, 0.35); }

        .section-title {
          font-size: 17px;
          font-weight: 800;
          color: #e8eaf0;
          margin-bottom: 14px;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title::before {
          content: '';
          display: inline-block;
          width: 3px;
          height: 18px;
          background: linear-gradient(180deg, #ff8c00, #ff6b00);
          border-radius: 2px;
          flex-shrink: 0;
        }

        .section-body {
          font-size: 14px;
          line-height: 1.8;
          color: #9aa5b8;
          font-weight: 500;
          white-space: pre-line;
        }

        .section-body strong {
          display: block;
          color: #e2e8f0;
          font-weight: 700;
          margin-top: 14px;
          margin-bottom: 2px;
        }

        .section-body strong:first-child { margin-top: 0; }

        /* ── Footer ── */
        .ln-footer {
          border-top: 1px solid #1a2030;
          padding: 32px 24px;
          text-align: center;
        }

        .ln-footer-text {
          font-size: 13px;
          color: #8c9bb4;
          font-weight: 600;
          line-height: 1.7;
        }

        .ln-footer-text a {
          color: #ff6b00;
          text-decoration: none;
          font-weight: 700;
        }

        .ln-footer-text a:hover { text-decoration: underline; text-underline-offset: 2px; }

        .ln-footer-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .ln-footer-link {
          font-size: 13px;
          font-weight: 700;
          color: #8c9bb4;
          text-decoration: none;
          transition: color 0.15s;
        }

        .ln-footer-link:hover { color: #ff6b00; }

        .ln-footer-sep {
          width: 3px;
          height: 3px;
          background: #2a3347;
          border-radius: 50%;
        }
      `}</style>

      <div className="ln-page">
        {/* Hero */}
        <div className="ln-hero">
          <div className="ln-badge">
            <Scale size={13} /> Legal Notice / Impressum
          </div>
          <h1 className="ln-title">
            Legal Notice &amp;<br /><span>Provider Identification</span>
          </h1>
          <p className="ln-subtitle">
            Information and provider identification pursuant to § 5 of the German Digital Services Act (DDG) and § 18 Section 2 MStV.
          </p>
          <p className="ln-date">Last updated: August 2026 · Effective immediately</p>
        </div>

        {/* Layout */}
        <div className="ln-layout">
          {/* Sidebar */}
          <aside className="ln-sidebar">
            <p className="sidebar-label">On this page</p>
            <nav className="sidebar-nav">
              {sections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`sidebar-link${activeSection === s.id ? ' active' : ''}`}
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Sections */}
          <main className="ln-content">
            {sections.map(s => (
              <section
                key={s.id}
                id={s.id}
                className={`ln-section${activeSection === s.id ? ' active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <h2 className="section-title">{s.title}</h2>
                <div className="section-body">
                  {s.content.split('\n').map((line, i) => {
                    const isSubheading = line.length > 0 && !line.startsWith('•') && !line.startsWith(' ') && i > 0 && s.content.split('\n')[i - 1] === '';
                    return isSubheading
                      ? <strong key={i}>{line}</strong>
                      : <span key={i}>{line}{'\n'}</span>;
                  })}
                </div>
              </section>
            ))}
          </main>
        </div>

        {/* Footer */}
        <footer className="ln-footer">
          <p className="ln-footer-text">
            Official Provider Identification for the PumpkinMC Plugin Marketplace · Contact:{' '}
            <a href="mailto:lilalexmed@proton.me">lilalexmed@proton.me</a>
          </p>
          <div className="ln-footer-links">
            <Link to="/terms" className="ln-footer-link">Terms of Service</Link>
            <span className="ln-footer-sep" />
            <Link to="/privacy" className="ln-footer-link">Privacy Policy</Link>
            <span className="ln-footer-sep" />
            <Link to="/" className="ln-footer-link">Marketplace</Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LegalNoticePage;
