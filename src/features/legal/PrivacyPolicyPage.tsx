import { Link } from 'react-router-dom';
import { openCookiePreferencesModal } from '../../lib/consent';
import { Shield, Sliders } from 'lucide-react';
import LegalDoc from './LegalDoc';

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

const PrivacyPolicyPage = () => (
  <LegalDoc
    kicker={<><Shield /> Privacy Policy</>}
    title={<>Your Privacy,<br /><span className="mark">Our Commitment</span></>}
    lede="Learn how we collect, use, and protect your personal information, and the choices you have regarding your data."
    updated="Last updated: August 2026 · Effective immediately"
    toc={sections}
    footer={
      <>
        <p>
          Questions about your privacy or data? Reach us anytime at{' '}
          <a className="link link-pumpkin" href="mailto:privacy@pumpkinmc.org">privacy@pumpkinmc.org</a>
        </p>
        <div className="lg-links">
          <Link className="link" to="/terms">Terms of Service</Link>
          <Link className="link" to="/">Marketplace</Link>
          <button type="button" className="link" onClick={openCookiePreferencesModal}>Cookie Preferences</button>
          <Link className="link" to="/register">Create Account</Link>
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
            Manage Cookie Preferences
          </button>
        )}
      </section>
    ))}
  </LegalDoc>
);

export default PrivacyPolicyPage;
