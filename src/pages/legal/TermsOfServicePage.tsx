import { useState } from 'react';
import { Link } from 'react-router-dom';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using the PumpkinMC Plugin Marketplace ("Marketplace"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Marketplace. These Terms apply to all visitors, buyers, sellers, and developers who access the Marketplace.

PumpkinMC reserves the right to update or modify these Terms at any time. Continued use of the Marketplace after any changes constitutes your acceptance of the new Terms. We will notify registered users of material changes via email or a prominent notice on the platform.`
  },
  {
    id: 'eligibility',
    title: '2. Eligibility',
    content: `You must be at least 13 years of age to use the Marketplace. If you are under 18, you must have the consent of a parent or legal guardian. By using the Marketplace, you represent and warrant that you meet these eligibility requirements.

You may not use the Marketplace if you have previously been banned or suspended from PumpkinMC or any related service, or if your use would violate any applicable law or regulation.`
  },
  {
    id: 'accounts',
    title: '3. Accounts & Registration',
    content: `To access certain features of the Marketplace, you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date.

You are responsible for safeguarding your password and for any activity that occurs under your account. You must notify PumpkinMC immediately of any unauthorized use. PumpkinMC is not liable for any loss or damage arising from your failure to protect your account credentials.

Accounts are personal and non-transferable. You may not create multiple accounts to circumvent bans, purchase limits, or any other restrictions.`
  },
  {
    id: 'plugins',
    title: '4. Plugin Listings & Content',
    content: `Sellers may submit Minecraft plugins and related digital goods ("Plugins") for listing on the Marketplace subject to review and approval. By submitting a Plugin, you represent and warrant that:

• You are the original author or have the legal right to sell the Plugin.
• The Plugin does not infringe upon any third-party intellectual property rights, including those of Mojang Studios or Microsoft.
• The Plugin does not contain malicious code, backdoors, exploits, or any functionality designed to harm servers, players, or end users.
• All Plugin descriptions, screenshots, and metadata are accurate and not misleading.
• The Plugin complies with Mojang's End User License Agreement (EULA) and any applicable Minecraft usage policies.

PumpkinMC reserves the right to remove any Plugin listing at any time, without notice, for any reason including but not limited to violation of these Terms, community reports, or suspected malicious activity.`
  },
  {
    id: 'prohibited',
    title: '5. Prohibited Content',
    content: `The following content is strictly prohibited on the Marketplace:

• Plugins containing malware, ransomware, spyware, or any malicious code.
• Plugins that steal player data, credentials, or personal information.
• Duplicate or plagiarized plugins submitted without the original author's consent.
• Plugins that enable griefing, cheating, or exploiting of unrelated servers or players.
• Adult, explicit, or NSFW content of any kind.
• Plugins that violate Mojang's EULA, including those that grant gameplay advantages for real-money purchases in non-compliant ways.
• Content that promotes hate speech, harassment, or discrimination.
• Any Plugin misrepresented as an official PumpkinMC, Mojang, or Microsoft product.

Violation of these prohibitions may result in immediate account termination and, where applicable, referral to relevant authorities.`
  },
  {
    id: 'transactions',
    title: '6. Purchases & Payments',
    content: `All purchases made through the Marketplace are final unless otherwise stated or required by applicable law. By completing a purchase, you authorize PumpkinMC to charge your selected payment method for the listed price.

Prices are displayed in EUR and may be subject to applicable taxes depending on your jurisdiction. PumpkinMC is not responsible for currency conversion fees charged by your bank or payment provider.

In the event of a disputed charge, please contact support@pumpkinmc.net before initiating a chargeback with your payment provider. Chargebacks initiated without prior contact may result in account suspension.`
  },
  {
    id: 'refunds',
    title: '7. Refunds & Disputes',
    content: `Due to the digital nature of Plugins, all sales are generally non-refundable. Refunds may be issued at PumpkinMC's sole discretion in the following circumstances:

• The Plugin does not function as described and the seller has not resolved the issue within 72 hours of a support request.
• The Plugin contains malicious code or functionality that harms your server or players.
• A duplicate purchase was made in error within 24 hours.

To request a refund, contact support@pumpkinmc.net with your order details and a description of the issue. PumpkinMC will review all refund requests and respond within 5 business days.`
  },
  {
    id: 'sellers',
    title: '8. Seller Obligations',
    content: `Sellers are responsible for maintaining and supporting their Plugins for a reasonable period following sale. This includes providing updates to maintain compatibility with reasonably current versions of Minecraft and Spigot/Paper API where applicable.

Sellers receive payouts according to the PumpkinMC revenue share agreement communicated at the time of seller onboarding. PumpkinMC reserves the right to adjust revenue share rates with 30 days' notice to active sellers.

Sellers must respond to buyer support inquiries within 5 business days. Failure to maintain adequate support may result in Plugin delisting or seller account review.

Sellers may not solicit buyers to transact outside of the Marketplace in order to circumvent fees or protections.`
  },
  {
    id: 'ip',
    title: '9. Intellectual Property',
    content: `Sellers retain ownership of their Plugin source code and associated assets. By listing a Plugin on the Marketplace, sellers grant PumpkinMC a non-exclusive, royalty-free license to display, reproduce, and distribute the Plugin solely for the purpose of operating the Marketplace.

Buyers receive a limited, non-exclusive, non-transferable license to use purchased Plugins on their own Minecraft servers. Buyers may not resell, redistribute, decompile, reverse-engineer, or sublicense Plugins unless explicitly permitted by the seller's stated license terms.

The PumpkinMC name, logo, and branding are the exclusive property of PumpkinMC and may not be used without prior written consent.`
  },
  {
    id: 'privacy',
    title: '10. Privacy',
    content: `Your use of the Marketplace is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Marketplace, you consent to the collection and use of your information as described in our Privacy Policy.

We collect information necessary to operate the Marketplace, process transactions, and provide support. We do not sell your personal information to third parties. Seller payout information may be shared with payment processors as necessary to complete transactions.`
  },
  {
    id: 'disclaimer',
    title: '11. Disclaimer of Warranties',
    content: `The Marketplace is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. PumpkinMC does not warrant that the Marketplace will be uninterrupted, error-free, or free of viruses or other harmful components.

PumpkinMC does not endorse, verify, or take responsibility for any Plugin listed by third-party sellers. You download and install Plugins at your own risk. PumpkinMC strongly recommends reviewing Plugin source code and testing in a non-production environment before deploying to a live server.`
  },
  {
    id: 'liability',
    title: '12. Limitation of Liability',
    content: `To the fullest extent permitted by applicable law, PumpkinMC and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Marketplace, including but not limited to server damage, data loss, or loss of profits.

In no event shall PumpkinMC's total liability to you for all claims exceed the greater of the amount you paid to PumpkinMC in the twelve months preceding the claim or USD $50.`
  },
  {
    id: 'termination',
    title: '13. Termination',
    content: `PumpkinMC may suspend or terminate your account at any time, with or without notice, for conduct that violates these Terms or is harmful to other users, PumpkinMC, or third parties, or for any other reason at PumpkinMC's sole discretion.

Upon termination, your right to use the Marketplace ceases immediately. Provisions of these Terms that by their nature should survive termination — including intellectual property, disclaimers, and limitations of liability — shall survive.

You may close your account at any time by contacting support@pumpkinmc.net. Closing your account does not entitle you to a refund of any purchases.`
  },
  {
    id: 'governing',
    title: '14. Governing Law',
    content: `These Terms are governed by and construed in accordance with applicable law. Any disputes arising under or in connection with these Terms shall be resolved through binding arbitration, except that either party may seek injunctive or other equitable relief in a court of competent jurisdiction.

If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.`
  },
  {
    id: 'contact',
    title: '15. Contact',
    content: `If you have any questions about these Terms or the Marketplace, please contact us at:

Email: support@pumpkinmc.net
Discord: discord.gg/pumpkinmc
Website: pumpkinmc.net

We aim to respond to all inquiries within 3 business days.`
  }
];

const TermsOfServicePage = () => {
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

        .tos-page {
          min-height: 100vh;
          background-color: #0f1117;
          background-image: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255, 107, 0, 0.12) 0%, transparent 65%);
          color: #c8cdd8;
        }

        /* ── Nav ── */
        .tos-nav {
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
        .tos-hero {
          text-align: center;
          padding: 64px 24px 48px;
          border-bottom: 1px solid #1a2030;
        }

        .tos-badge {
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

        .tos-title {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 800;
          color: #f0f2f5;
          letter-spacing: -0.5px;
          line-height: 1.2;
          margin-bottom: 14px;
        }

        .tos-title span {
          background: linear-gradient(135deg, #ff8c00, #ff6b00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tos-subtitle {
          font-size: 15px;
          color: #4a5568;
          font-weight: 600;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .tos-date {
          margin-top: 16px;
          font-size: 12.5px;
          color: #3d4a5e;
          font-weight: 600;
        }

        /* ── Layout ── */
        .tos-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
          gap: 40px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .tos-layout { grid-template-columns: 1fr; }
          .tos-sidebar { display: none; }
        }

        /* ── Sidebar ── */
        .tos-sidebar {
          position: sticky;
          top: 76px;
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
        .tos-content { min-width: 0; }

        .tos-section {
          background: #161b26;
          border: 1px solid #1e2535;
          border-radius: 12px;
          padding: 28px 32px;
          margin-bottom: 16px;
          transition: border-color 0.2s;
          scroll-margin-top: 80px;
        }

        .tos-section:hover { border-color: rgba(255, 107, 0, 0.2); }

        .tos-section.active { border-color: rgba(255, 107, 0, 0.35); }

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

        .section-body strong { color: #c8cdd8; font-weight: 700; }

        /* ── Footer ── */
        .tos-footer {
          border-top: 1px solid #1a2030;
          padding: 32px 24px;
          text-align: center;
        }

        .tos-footer-text {
          font-size: 13px;
          color: #3d4a5e;
          font-weight: 600;
          line-height: 1.7;
        }

        .tos-footer-text a {
          color: #ff6b00;
          text-decoration: none;
          font-weight: 700;
        }

        .tos-footer-text a:hover { text-decoration: underline; text-underline-offset: 2px; }

        .accept-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 20px;
          padding: 12px 28px;
          background: linear-gradient(135deg, #ff6b00, #e85d00);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          text-decoration: none;
          box-shadow: 0 2px 12px rgba(255, 107, 0, 0.3);
          transition: all 0.15s;
        }

        .accept-btn:hover {
          background: linear-gradient(135deg, #ff7a1a, #f06000);
          box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="tos-page">

        {/* Hero */}
        <div className="tos-hero">
          <div className="tos-badge">📜 Legal</div>
          <h1 className="tos-title">
            Plugin Marketplace<br /><span>Terms of Service</span>
          </h1>
          <p className="tos-subtitle">
            Please read these terms carefully before buying or selling plugins on PumpkinMC.
          </p>
          <p className="tos-date">Last updated: March 3, 2026 · Effective immediately</p>
        </div>

        {/* Layout */}
        <div className="tos-layout">

          {/* Sidebar */}
          <aside className="tos-sidebar">
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
          <main className="tos-content">
            {sections.map(s => (
              <section
                key={s.id}
                id={s.id}
                className={`tos-section${activeSection === s.id ? ' active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <h2 className="section-title">{s.title}</h2>
                <div className="section-body">{s.content}</div>
              </section>
            ))}
          </main>
        </div>

        {/* Footer */}
        <footer className="tos-footer">
          <p className="tos-footer-text">
            Questions about these terms? Reach us at{' '}
            <a href="mailto:support@pumpkinmc.net">support@pumpkinmc.net</a>{' '}
            or join our <a href="https://discord.gg/pumpkinmc">Discord server</a>.
          </p>
          <Link to="/register" className="accept-btn">
            🎃 Create an account
          </Link>
        </footer>

      </div>
    </>
  );
};

export default TermsOfServicePage;