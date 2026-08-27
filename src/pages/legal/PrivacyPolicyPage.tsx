import { useState } from 'react';
import { Link } from 'react-router-dom';
import { openCookiePreferencesModal } from '../../utils/consent';
import { Shield, Sliders } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: string;
  hasCookieButton?: boolean;
}

const sections: Section[] = [
  {
    id: 'overview',
    title: '1. Overview & Data Controller',
    content: `PumpkinMC ("we", "us", or "our") operates the PumpkinMC Plugin Marketplace and related services (the "Service"). This Privacy Policy explains how we collect, use, store, and protect your information when you browse our site, publish plugins, or make purchases.

We believe in privacy by design. We do not sell your personal data to advertisers or third parties, and we only collect information necessary to operate, improve, and secure our marketplace.

Data Controller Contact Information:
• Entity: PumpkinMC Data Protection
• Email: privacy@pumpkinmc.org
• Support: support@pumpkinmc.org
• Website: https://pumpkinmc.org`
  },
  {
    id: 'information-collected',
    title: '2. Information We Collect',
    content: `We collect the following categories of information:

Account Information
When you create an account, we collect your username, email address, password hash (salted using bcrypt), country of residence, preferred currency, and two-factor authentication (TOTP) status.

Developer & Seller Profile
If you register as a creator or publish plugins, we collect your public display name, entity type (individual vs. organization), and payout/tax details where applicable (legal name, address, VAT ID, support email, website, and GitHub link).

Transactions & Licenses
When you purchase or sell plugins, we record transaction details including plugin ID, amount, date, and generated license keys. Payment processing is handled directly by Stripe — we do not store full credit card numbers on our servers.

Technical & Security Data
To defend against automated bots, fraud, and attacks, we process basic connection headers, coarse country location (via Cloudflare edge headers without storing raw IP addresses in application databases), and Cloudflare Turnstile security tokens.

User Content & Reviews
Reviews, ratings, replies, and plugin listings you post publicly on the platform.`
  },
  {
    id: 'how-we-use',
    title: '3. How & Why We Process Your Data',
    content: `We process your information under the following legal standards and purposes:

To Deliver Our Marketplace Services
• Creating and managing your account.
• Delivering purchased plugins and verifying license keys.
• Enabling developer payouts and sales management.
• Sending necessary transactional emails (email confirmations, password resets, security alerts).

To Ensure Security & Prevent Abuse
• Defending against spam, bots, and brute force attacks (via Cloudflare Turnstile).
• Preventing fraudulent payments and chargebacks.
• Resolving customer support requests and enforcing marketplace rules.

With Your Consent
• Anonymous aggregated analytics to understand popular plugins and site traffic (Google Analytics 4 with IP anonymization).
• Optional product announcements. You may change your preferences or opt out at any time.

Compliance with Legal Obligations
• Retaining transaction records and invoices as required by financial, commercial, and tax laws.`
  },
  {
    id: 'service-providers',
    title: '4. Third-Party Service Providers',
    content: `We work with trusted third-party providers who process data on our behalf under strict data protection agreements:

Stripe (Payments & Payouts)
Processes payments and creator payout onboarding securely under PCI-DSS Level 1 compliance.

Cloudflare (Security & CDN)
Provides fast content delivery, DDoS protection, and privacy-preserving bot detection (Turnstile).

Google Analytics (Analytics — Consent Only)
Collects aggregated visit metrics only when you choose to enable analytics cookies. IP anonymization is enforced.

Email Delivery Service
Transmits essential account notices, security updates, and verification emails.

We never sell, rent, or trade your personal data with third-party advertisers or data brokers.`
  },
  {
    id: 'international-transfers',
    title: '5. International Transfers',
    content: `PumpkinMC operates globally. When data is transferred across international borders, we ensure appropriate safeguards are in place — including Standard Contractual Clauses (SCCs) and verified compliance frameworks — to ensure your data receives strong and consistent protection.`
  },
  {
    id: 'retention',
    title: '6. Data Retention',
    content: `We keep your personal information only for as long as needed to fulfill the purposes outlined in this policy:

• Active Accounts: Retained for the lifetime of your account.
• Deleted Accounts: Removed immediately upon account deletion; backup archives clear within 30 days.
• Invoices & Financial Records: Retained for up to 7 to 10 years to comply with statutory accounting and tax regulations.
• Analytics Logs: Stored in aggregated, anonymized form without personal identifiers.`
  },
  {
    id: 'cookies',
    title: '7. Cookies & Local Storage',
    content: `We use cookies and browser storage responsibly:

Strictly Necessary Storage (Always Active)
Essential for session authentication, security verification, and remembering your language or currency. The marketplace cannot function without these.

Analytics Cookies (Optional)
Help us understand how users interact with the site so we can improve performance and feature discovery. These are turned off by default and only activate if you consent.

You can customize or change your cookie choices at any time using the preferences button below or from the site footer.`,
    hasCookieButton: true,
  },
  {
    id: 'rights',
    title: '8. Your Rights & Choices',
    content: `Regardless of your location, you have strong controls over your personal data:

• Access & Portability: You can request and download a full machine-readable JSON export of your account data at any time from your Account Settings.
• Correction & Updates: You can update your email, username, country, and developer profile directly from your settings.
• Account Deletion: You can permanently delete your account and all associated personal data anytime in the Danger Zone settings tab.
• Manage Consent: You can update your cookie preferences or opt out of analytics tracking at any time with immediate effect.
• Inquiries & Concerns: You have the right to contact us or lodge a complaint with your local data protection supervisory authority if you believe your data has been mishandled.

To exercise any of your rights, use the tools in your Account Settings or contact us at privacy@pumpkinmc.org.`
  },
  {
    id: 'security',
    title: '9. Data Security',
    content: `We implement robust security measures to protect your information:

• Strong one-way password hashing using bcrypt.
• End-to-end encrypted web traffic using TLS 1.3 encryption.
• Two-factor authentication (TOTP) support for all accounts.
• Strict role-based access controls limiting internal data access to authorized systems only.`
  },
  {
    id: 'children',
    title: '10. Children\'s Privacy',
    content: `The Service is not intended for children under 16 years of age. We do not knowingly collect personal data from minors. If you believe a minor has registered an account without appropriate parental consent, please contact us at privacy@pumpkinmc.org and we will promptly remove the account.`
  },
  {
    id: 'contact',
    title: '11. Contact Us',
    content: `If you have any questions or requests regarding this Privacy Policy or your data, please contact our team:

Email: privacy@pumpkinmc.org
Support: support@pumpkinmc.org
Discord: https://discord.gg/pumpkinmc
Website: https://pumpkinmc.org

We respond to all privacy inquiries within 5 business days.`
  }
];

const PrivacyPolicyPage = () => {
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

        .pp-page {
          min-height: 100vh;
          background-color: #0f1117;
          background-image: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255, 107, 0, 0.12) 0%, transparent 65%);
          color: #c8cdd8;
        }

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
          color: #8c9bb4;
          font-weight: 600;
          max-width: 540px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .pp-date {
          margin-top: 16px;
          font-size: 12.5px;
          color: #6b7a94;
          font-weight: 600;
        }

        /* ── Layout ── */
        .pp-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          max-width: 1120px;
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
        .pp-content { min-width: 0; }

        .pp-section {
          background: #161b26;
          border: 1px solid #1e2535;
          border-radius: 12px;
          padding: 28px 32px;
          margin-bottom: 16px;
          transition: border-color 0.2s;
          scroll-margin-top: 100px;
        }

        .pp-section:hover { border-color: rgba(255, 107, 0, 0.2); }
        .pp-section.active { border-color: rgba(255, 107, 0, 0.35); }

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

        .cookie-trigger-btn {
          margin-top: 16px;
          padding: 10px 18px;
          background: rgba(255, 107, 0, 0.12);
          border: 1px solid rgba(255, 107, 0, 0.3);
          color: #ff8c00;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.15s ease;
        }

        .cookie-trigger-btn:hover {
          background: #ff6b00;
          color: #ffffff;
          transform: translateY(-1px);
        }

        /* ── Footer ── */
        .pp-footer {
          border-top: 1px solid #1a2030;
          padding: 32px 24px;
          text-align: center;
        }

        .pp-footer-text {
          font-size: 13px;
          color: #8c9bb4;
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
          color: #8c9bb4;
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
          <div className="pp-badge">
            <Shield size={13} /> Privacy Policy
          </div>
          <h1 className="pp-title">
            Your Privacy,<br /><span>Our Commitment</span>
          </h1>
          <p className="pp-subtitle">
            Learn how we collect, use, and protect your personal information, and the choices you have regarding your data.
          </p>
          <p className="pp-date">Last updated: August 2026 · Effective immediately</p>
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
                    const isSubheading = line.length > 0 && !line.startsWith('•') && !line.startsWith(' ') && i > 0 && s.content.split('\n')[i - 1] === '';
                    return isSubheading
                      ? <strong key={i}>{line}</strong>
                      : <span key={i}>{line}{'\n'}</span>;
                  })}
                </div>

                {s.hasCookieButton && (
                  <button
                    type="button"
                    className="cookie-trigger-btn"
                    onClick={openCookiePreferencesModal}
                  >
                    <Sliders size={15} />
                    Manage Cookie Preferences
                  </button>
                )}
              </section>
            ))}
          </main>
        </div>

        {/* Footer */}
        <footer className="pp-footer">
          <p className="pp-footer-text">
            Questions about your privacy or data? Reach us anytime at{' '}
            <a href="mailto:privacy@pumpkinmc.org">privacy@pumpkinmc.org</a>
          </p>
          <div className="pp-footer-links">
            <Link to="/terms" className="pp-footer-link">Terms of Service</Link>
            <span className="pp-footer-sep" />
            <Link to="/" className="pp-footer-link">Marketplace</Link>
            <span className="pp-footer-sep" />
            <button
              type="button"
              onClick={openCookiePreferencesModal}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 700,
                color: '#8c9bb4',
                transition: 'color 0.15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff6b00')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8c9bb4')}
            >
              Cookie Preferences
            </button>
            <span className="pp-footer-sep" />
            <Link to="/register" className="pp-footer-link">Create Account</Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;