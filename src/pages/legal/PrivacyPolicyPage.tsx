import { useState } from 'react';
import { Link } from 'react-router-dom';

const sections = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `PumpkinMC ("we", "us", or "our") operates the PumpkinMC Plugin Marketplace and related services (collectively, the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our Service.

We are committed to protecting your privacy. We will never sell your personal information to third parties, and we only collect what is necessary to operate and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.

If you have questions or concerns about this policy, please contact us at privacy@pumpkinmc.net.`
  },
  {
    id: 'information-collected',
    title: '2. Information We Collect',
    content: `We collect the following categories of information:

Account Information
When you register, we collect your username, email address, and a hashed version of your password. Sellers may additionally provide payment and payout details required to process transactions.

Transaction Data
When you purchase or sell a Plugin, we collect records of those transactions including the Plugin name, price, date, and payment method type (we do not store full card numbers — these are handled by our payment processor).

Usage Data
We automatically collect certain information when you visit the Service, including your IP address, browser type, operating system, referring URLs, pages visited, and timestamps. This data helps us understand how the Service is used and identify issues.

Communications
If you contact our support team or post in community areas, we retain those communications to resolve disputes and improve our service.

Cookies & Similar Technologies
We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyze usage patterns. See Section 7 for more detail.`
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Information',
    content: `We use the information we collect to:

• Operate and maintain the Marketplace, including processing purchases and payouts.
• Create and manage your account and authenticate your identity.
• Send transactional emails such as purchase confirmations, account verification, and password resets.
• Respond to support requests, disputes, and inquiries.
• Detect, investigate, and prevent fraudulent transactions, abuse, and violations of our Terms of Service.
• Improve the Service through analytics and usage research.
• Send optional product updates and newsletters — you may opt out at any time.
• Comply with legal obligations and enforce our agreements.

We do not use your data for automated decision-making or profiling that produces significant legal effects.`
  },
  {
    id: 'sharing',
    title: '4. How We Share Your Information',
    content: `We do not sell, trade, or rent your personal information. We may share your information only in the following limited circumstances:

Service Providers
We work with trusted third-party vendors to help operate the Service, including payment processors, email delivery services, and hosting providers. These parties are contractually obligated to protect your information and may only use it to perform services on our behalf.

Sellers & Buyers
When you purchase a Plugin, your username and order details are shared with the selling developer to facilitate support. Your email address is not shared with sellers without your consent.

Legal Requirements
We may disclose your information if required to do so by law, subpoena, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, or investigate fraud.

Business Transfers
If PumpkinMC is acquired by or merged with another company, your information may be transferred as part of that transaction. We will notify you before your information becomes subject to a materially different privacy policy.

With Your Consent
We may share your information in other ways with your explicit consent.`
  },
  {
    id: 'data-retention',
    title: '5. Data Retention',
    content: `We retain your personal information for as long as your account is active or as needed to provide the Service. Specifically:

• Account data is retained for the lifetime of your account and for up to 90 days after account deletion to allow for dispute resolution.
• Transaction records are retained for up to 7 years to comply with financial and tax regulations.
• Support communications are retained for up to 3 years.
• Usage and analytics data is retained in aggregated, anonymized form indefinitely.

You may request deletion of your account and associated personal data at any time by contacting privacy@pumpkinmc.net. Note that we may be unable to delete information that we are legally required to retain.`
  },
  {
    id: 'security',
    title: '6. Data Security',
    content: `We implement industry-standard security measures to protect your information, including:

• Passwords are stored using strong one-way hashing (bcrypt).
• All data transmitted between your browser and our servers is encrypted using TLS.
• Payment processing is handled by PCI-DSS compliant third-party processors — we do not store raw card numbers on our servers.
• Access to personal data is restricted to authorized personnel who require it to perform their job functions.
• We conduct regular security reviews and promptly address identified vulnerabilities.

Despite these measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security, and you use the Service at your own risk. If you believe your account has been compromised, contact support@pumpkinmc.net immediately.`
  },
  {
    id: 'cookies',
    title: '7. Cookies & Tracking',
    content: `We use the following types of cookies and tracking technologies:

Essential Cookies
Required for the Service to function. These include session cookies that keep you logged in and security tokens that protect against cross-site request forgery. You cannot opt out of these without disabling the Service.

Analytics Cookies
We use privacy-respecting analytics tools to understand how users interact with the Service — pages visited, session duration, and feature usage. This data is aggregated and anonymized where possible.

Preference Cookies
These remember your settings and preferences, such as your display language or UI preferences, to personalize your experience.

You can control cookies through your browser settings. Disabling certain cookies may affect the functionality of the Service. We do not use advertising or third-party tracking cookies.`
  },
  {
    id: 'children',
    title: '8. Children\'s Privacy',
    content: `The Service is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal data from a child under 13 without verifiable parental consent, we will take steps to delete that information as quickly as possible.

If you are a parent or guardian and believe your child has provided us with personal information without your consent, please contact us at privacy@pumpkinmc.net.`
  },
  {
    id: 'rights',
    title: '9. Your Rights & Choices',
    content: `Depending on your location, you may have the following rights with respect to your personal information:

Access & Portability
You may request a copy of the personal information we hold about you and, where technically feasible, receive it in a structured, machine-readable format.

Correction
You may update or correct inaccurate account information at any time through your account settings or by contacting us.

Deletion
You may request deletion of your personal data, subject to our legal retention obligations described in Section 5.

Opt-Out of Marketing
You may unsubscribe from marketing emails at any time using the unsubscribe link in any marketing email or by contacting us. You will continue to receive transactional emails necessary to operate your account.

Restriction & Objection
In certain circumstances, you may request that we restrict or stop processing your personal data.

To exercise any of these rights, contact privacy@pumpkinmc.net. We will respond within 30 days. We may need to verify your identity before processing your request.`
  },
  {
    id: 'third-party',
    title: '10. Third-Party Links & Services',
    content: `The Service may contain links to third-party websites, plugins, or services that are not owned or controlled by PumpkinMC. This Privacy Policy applies only to the PumpkinMC Service.

We have no control over and assume no responsibility for the privacy practices of any third-party sites or services. We encourage you to review the privacy policy of every site you visit or service you use.

Plugin developers are independent third parties. PumpkinMC is not responsible for data collection or privacy practices embedded within third-party Plugins you download. Review each Plugin's documentation before use.`
  },
  {
    id: 'international',
    title: '11. International Transfers',
    content: `PumpkinMC operates globally and your information may be transferred to and processed in countries other than the country in which you reside. These countries may have data protection laws that are different from the laws of your country.

Where required, we use appropriate safeguards — such as standard contractual clauses — to ensure that your information receives an adequate level of protection wherever it is processed.`
  },
  {
    id: 'changes',
    title: '12. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. For material changes, we will provide more prominent notice, such as an email notification to registered users or a banner on the Service.

We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.`
  },
  {
    id: 'contact',
    title: '13. Contact Us',
    content: `If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to us:

Email: privacy@pumpkinmc.net
Support: support@pumpkinmc.net
Discord: discord.gg/pumpkinmc
Website: pumpkinmc.net

We take privacy seriously and will respond to all inquiries within 5 business days.`
  }
];

const PrivacyPolicyPage = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Nunito', sans-serif;
          -webkit-font-smoothing: antialiased;
          background: #0f1117;
        }

        .pp-page {
          min-height: 100vh;
          background-color: #0f1117;
          background-image: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255, 107, 0, 0.12) 0%, transparent 65%);
          color: #c8cdd8;
        }

        /* ── Nav ── */
        .pp-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(15, 17, 23, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 107, 0, 0.1);
          padding: 0 32px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
        }

        .nav-brand-icon { font-size: 24px; filter: drop-shadow(0 0 8px rgba(255,107,0,0.5)); }

        .nav-brand-text {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.3px;
          background: linear-gradient(135deg, #ff8c00, #ff6b00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-back {
          font-size: 13px;
          font-weight: 600;
          color: #4a5568;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color 0.15s;
        }

        .nav-back:hover { color: #ff6b00; }

        /* ── Hero ── */
        .pp-hero {
          text-align: center;
          padding: 64px 24px 48px;
          border-bottom: 1px solid #1a2030;
        }

        .pp-badge {
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

        .pp-title {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 800;
          color: #f0f2f5;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin-bottom: 14px;
        }

        .pp-title span {
          background: linear-gradient(135deg, #ff8c00, #ff6b00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pp-subtitle {
          font-size: 15px;
          color: #4a5568;
          font-weight: 600;
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .pp-date {
          margin-top: 16px;
          font-size: 12.5px;
          color: #3d4a5e;
          font-weight: 600;
        }

        /* ── Highlight banner ── */
        .pp-highlight {
          max-width: 700px;
          margin: 32px auto 0;
          background: rgba(255, 107, 0, 0.06);
          border: 1px solid rgba(255, 107, 0, 0.18);
          border-radius: 10px;
          padding: 14px 20px;
          font-size: 13.5px;
          font-weight: 600;
          color: #ff8c00;
          display: flex;
          align-items: center;
          gap: 10px;
          line-height: 1.5;
        }

        .pp-highlight-icon { font-size: 18px; flex-shrink: 0; }

        /* ── Layout ── */
        .pp-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
          gap: 40px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .pp-layout { grid-template-columns: 1fr; }
          .pp-sidebar { display: none; }
        }

        /* ── Sidebar ── */
        .pp-sidebar {
          position: sticky;
          top: 100px;
        }

        .sidebar-label {
          font-size: 11px;
          font-weight: 700;
          color: #3d4a5e;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
          padding-left: 10px;
        }

        .sidebar-nav { display: flex; flex-direction: column; gap: 2px; }

        .sidebar-link {
          font-size: 13px;
          font-weight: 600;
          color: #3d4a5e;
          text-decoration: none;
          padding: 7px 10px;
          border-radius: 6px;
          transition: all 0.15s;
          border-left: 2px solid transparent;
          line-height: 1.4;
        }

        .sidebar-link:hover {
          color: #c8cdd8;
          background: rgba(255, 107, 0, 0.06);
          border-left-color: rgba(255, 107, 0, 0.3);
        }

        .sidebar-link.active {
          color: #ff8c00;
          background: rgba(255, 107, 0, 0.08);
          border-left-color: #ff6b00;
        }

        /* ── Content ── */
        .pp-content { min-width: 0; }

        .pp-section {
          background: #161b26;
          border: 1px solid #1e2535;
          border-radius: 12px;
          padding: 28px 32px;
          margin-bottom: 16px;
          transition: border-color 0.2s;
          scroll-margin-top: 100px;
          cursor: default;
        }

        .pp-section:hover { border-color: rgba(255, 107, 0, 0.2); }
        .pp-section.active { border-color: rgba(255, 107, 0, 0.35); }

        .section-title {
          font-size: 16px;
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
          color: #6b7a94;
          font-weight: 500;
          white-space: pre-line;
        }

        /* Sub-headings within body */
        .section-body strong {
          display: block;
          color: #c8cdd8;
          font-weight: 700;
          margin-top: 14px;
          margin-bottom: 2px;
        }

        .section-body strong:first-child { margin-top: 0; }

        /* ── Footer ── */
        .pp-footer {
          border-top: 1px solid #1a2030;
          padding: 32px 24px;
          text-align: center;
        }

        .pp-footer-text {
          font-size: 13px;
          color: #3d4a5e;
          font-weight: 600;
          line-height: 1.7;
        }

        .pp-footer-text a {
          color: #ff6b00;
          text-decoration: none;
          font-weight: 700;
        }

        .pp-footer-text a:hover { text-decoration: underline; text-underline-offset: 2px; }

        .pp-footer-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .pp-footer-link {
          font-size: 13px;
          font-weight: 700;
          color: #3d4a5e;
          text-decoration: none;
          transition: color 0.15s;
        }

        .pp-footer-link:hover { color: #ff6b00; }

        .pp-footer-sep {
          width: 3px;
          height: 3px;
          background: #2a3347;
          border-radius: 50%;
        }
      `}</style>

      <div className="pp-page">
        {/* Hero */}
        <div className="pp-hero">
          <div className="pp-badge">🔒 Privacy</div>
          <h1 className="pp-title">
            Your Privacy,<br /><span>Our Commitment</span>
          </h1>
          <p className="pp-subtitle">
            We believe in being transparent about how we collect and use your data.
            Here's everything you need to know.
          </p>
          <p className="pp-date">Last updated: March 3, 2026 · Effective immediately</p>
        </div>

        {/* Layout */}
        <div className="pp-layout">

          {/* Sidebar */}
          <aside className="pp-sidebar">
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
          <main className="pp-content">
            {sections.map(s => (
              <section
                key={s.id}
                id={s.id}
                className={`pp-section${activeSection === s.id ? ' active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <h2 className="section-title">{s.title}</h2>
                <div className="section-body">
                  {s.content.split('\n').map((line, i) => {
                    // Render sub-headings (lines not starting with bullet and followed by blank line pattern)
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
        <footer className="pp-footer">
          <p className="pp-footer-text">
            Questions about your privacy? Contact us at{' '}
            <a href="mailto:privacy@pumpkinmc.net">privacy@pumpkinmc.net</a>
          </p>
          <div className="pp-footer-links">
            <Link to="/terms" className="pp-footer-link">Terms of Service</Link>
            <span className="pp-footer-sep" />
            <Link to="/marketplace" className="pp-footer-link">Marketplace</Link>
            <span className="pp-footer-sep" />
            <a href="https://discord.gg/pumpkinmc" className="pp-footer-link">Discord</a>
            <span className="pp-footer-sep" />
            <Link to="/register" className="pp-footer-link">Create Account</Link>
          </div>
        </footer>

      </div>
    </>
  );
};

export default PrivacyPolicyPage;