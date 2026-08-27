import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import './LegalPages.css';

const sections = [
  {
    id: 'definitions',
    title: '1. Definitions & Scope of Agreement',
    content: `This Developer Distribution Agreement ("Agreement") constitutes a legally binding contract between you (either as an individual developer or an authorized representative of a company/entity, referred to as "Developer" or "You") and Aleksandr Medvedev ("Operator", "Pumpkin Marketplace", "We", or "Us"), governing your distribution, publication, sale, and licensing of Minecraft plugins, WebAssembly modules, and associated digital assets ("Plugins") via the Pumpkin Marketplace platform.

By completing developer onboarding or submitting any Plugin to Pumpkin Marketplace, you explicitly agree to be bound by this Agreement, our general Terms of Service, Privacy Policy, and Marketplace Review Guidelines. If you do not agree to all terms of this Agreement, you must not register as a developer or submit Plugins.`
  },
  {
    id: 'license-grant',
    title: '2. Grant of Worldwide Distribution & Processing License',
    content: `2.1 Distribution License:
You retain your intellectual property ownership in your original Plugin source code. However, you hereby grant to Pumpkin Marketplace a worldwide, non-exclusive, royalty-free, transferable, and sublicensable license to:
• Host, reproduce, store, cache, format, sign, compile, and distribute the Plugin binary (.wasm) and metadata to end users.
• Parse, inspect, sandbox, benchmark, decompile, and security-scan your Plugin files for malicious behavior, stability, and policy compliance.
• Use your Plugin's name, icon, screenshots, video trailers, and developer display name for marketing, promotional campaigns, showcase reels, and marketplace cataloging.

2.2 End User Sublicense:
You grant Pumpkin Marketplace the authority to issue licenses to end users who acquire your Plugin (whether free, ad-supported, or paid) allowing them to install and run the Plugin on their Minecraft servers in accordance with your specified license terms.`
  },
  {
    id: 'platform-control',
    title: '3. Absolute Platform Control, Moderation & Discretionary Takedowns',
    content: `3.1 Sole Discretion over Distribution:
Pumpkin Marketplace operates a curated, secure ecosystem. The Operator retains absolute and sole discretion regarding whether to approve, reject, feature, sandbox, delist, disable, or remove any Plugin, update, or developer account from the platform at any time.

3.2 Zero-Liability Takedown Rights:
The Operator may immediately remove, disable, or quarantine any Plugin without prior notice and without liability to you in circumstances including but not limited to:
• Security Vulnerabilities: Discovery of security exploits, backdoors, crash triggers, memory leaks, or unauthorized remote code execution.
• Malicious Functionality: Inclusion of hidden "OP" commands, ransomware, token stealers, botnets, or undisclosed spyware.
• Copyright & IP Disputes: Receipt of a credible DMCA notice, copyright infringement claim, or trademark violation.
• Minecraft / Mojang EULA Breaches: Violations of Mojang Studios' Commercial Usage Guidelines or EULA.
• Deceptive Practices: Misleading store descriptions, false advertising, fake ratings, or review manipulation.
• Developer Abandonment: Extended periods of non-responsiveness to critical bug reports or severe compatibility failures.

3.3 Emergency Remote Kill Switch & Binary Revocation:
In the event of a verified critical security threat or zero-day vulnerability threatening the wider Minecraft server ecosystem, Pumpkin Marketplace reserves the right to disable cryptographic license verification, revoke download links, or instruct client runtimes to block the affected binary immediately.`
  },
  {
    id: 'developer-warranties',
    title: '4. Developer Warranties, Security & Prohibited Conduct',
    content: `By publishing any Plugin, you represent and warrant that:
• Originality & Ownership: You are the original author of the Plugin or possess all necessary commercial licenses, intellectual property rights, and permissions to distribute all included code, libraries, and assets.
• No Malicious Payloads: The Plugin does not contain malware, trojans, cryptominers, spyware, keyloggers, or hidden administrative backdoors.
• Transparent Telemetry: Any telemetry, remote licensing validation, or analytics performed by your Plugin must be explicitly disclosed in the store listing description and must include an opt-out configuration setting.
• No Circumvention: You will not attempt to bypass platform review processes, evade sandboxing restrictions, or distribute obfuscated code designed to hide non-compliant functionality.
• Truthful Information: All documentation, changelogs, system requirements, and marketing materials provided are accurate and not misleading.`
  },
  {
    id: 'mojang-compliance',
    title: '5. Mojang Studios & Minecraft EULA Compliance',
    content: `5.1 Strict EULA Compliance:
You acknowledge that all Minecraft-related creations must strictly adhere to Mojang Studios' End User License Agreement (EULA), Brand and Asset Guidelines, and Commercial Usage Guidelines.

5.2 In-Game Monetization Rules:
Plugins distributed on Pumpkin Marketplace must not facilitate "pay-to-win" mechanics or gameplay features that violate Mojang's commercial rules for server monetization. You are solely responsible for ensuring your Plugin's functionality conforms to Mojang's evolving policies.

5.3 No Official Endorsement:
You may not claim, imply, or advertise that your Plugin or studio is officially affiliated with, endorsed by, or sponsored by Mojang Studios, Microsoft, or PumpkinMC.`
  },
  {
    id: 'commercial-terms',
    title: '6. Commercial Terms, Revenue Share (70/30) & Payouts',
    content: `6.1 Revenue Split:
For all paid Plugin sales and pre-orders processed through the Marketplace, the standard revenue distribution is:
• 70% of Net Revenue to the Developer.
• 30% Platform Fee to Pumpkin Marketplace for hosting, cryptographic licensing infrastructure, bandwidth, catalog distribution, and maintenance.

6.2 Payouts via Stripe Connect:
Sellers must maintain an active, fully verified Stripe Connected Account in an eligible jurisdiction. Payouts are transferred automatically by Stripe in accordance with your regional Stripe payout schedule.

6.3 Payment Processing & Currency:
Transactions are executed in EUR. Standard payment gateway processing fees (e.g., Stripe processing fees) and mandatory government taxes (such as VAT where applicable) are deducted from gross receipts before net distribution.

6.4 Refund & Chargeback Offsets (Clawbacks):
If a refund is issued in accordance with our Digital Withdrawal Waiver & Refund Policy, or if a buyer initiates a fraudulent payment chargeback, the refunded amount and associated payment dispute fees will be deducted from your developer account balance or offset against future earnings.`
  },
  {
    id: 'support-sla',
    title: '7. Customer Support & Maintenance Commitments',
    content: `7.1 Support Obligation:
As a developer selling or distributing software on Pumpkin Marketplace, you are solely responsible for providing end-user technical support for your Plugins. You must maintain a valid, monitored support email address or support Discord server listed on your profile and plugin listings.

7.2 Response Time SLA:
You agree to make reasonable, good-faith efforts to respond to customer support inquiries and defect reports within 5 business days. Repeated failure to respond to buyer inquiries regarding verified technical defects may result in listing suspension or mandatory refund issuance.`
  },
  {
    id: 'anti-circumvention',
    title: '8. Anti-Steering & Circumvention Prohibitions',
    content: `Developers may not use Pumpkin Marketplace listings, descriptions, binary messages, or community features to direct users off-platform for the purpose of evading platform fees or purchasing digital goods outside of our secure checkout. Any attempt to circumvent Marketplace payment systems will result in immediate termination of developer privileges and permanent forfeiture of pending payouts.`
  },
  {
    id: 'indemnification',
    title: '9. Developer Indemnification & Operator Liability Shield',
    content: `To the maximum extent permitted by applicable law, you agree to DEFEND, INDEMNIFY, and HOLD HARMLESS Aleksandr Medvedev (Operator), Pumpkin Marketplace, its affiliates, contributors, and agents from and against any and all claims, demands, liabilities, damages, losses, costs, expenses, and legal fees arising out of or related to:
• Any breach by you of this Agreement, warranties, or representations.
• Any claim that your Plugin infringes or misappropriates any third-party patent, copyright, trademark, trade secret, or privacy right.
• Any harm, server crash, data loss, financial loss, or damage caused to end users or third parties by your Plugin.
• Any violation by your Plugin of the Minecraft / Mojang EULA or applicable regional laws and regulations.`
  },
  {
    id: 'termination',
    title: '10. Term, Suspension & Post-Termination Rights',
    content: `10.1 Voluntary Termination:
You may terminate your developer account at any time by delisting your Plugins and contacting support@pumpkinmc.org.

10.2 Survival of Buyer Licenses:
In the event of delisting or developer account closure, existing buyers who previously purchased or acquired your Plugin retain their perpetual license to access, download, and use the versions they acquired.

10.3 Survival of Legal Provisions:
Sections 2.1 (for existing installations), 3, 4, 5, 6.4, 9, 10, and 11 shall survive any termination of this Agreement.`
  },
  {
    id: 'governing-law',
    title: '11. Governing Law & Operator Contact',
    content: `11.1 Governing Law:
This Agreement and any disputes arising out of or related to it shall be governed by and construed in accordance with the substantive laws of the Federal Republic of Germany, without regard to its conflict of law principles.

11.2 Operator Legal Contact:
Aleksandr Medvedev
Kastanienweg 20
40723 Hilden, Germany
Contact: lilalexmed@proton.me / support@pumpkinmc.org`
  }
];

export const DeveloperTermsPage: React.FC = () => {
  return (
    <div className="legal-container">
      <SEO
        title="Developer Distribution Agreement"
        description="Legal terms and distribution agreement for developers publishing plugins on Pumpkin Marketplace."
      />
      <div className="legal-content">
        <header className="guidelines-header">
          <h1>Developer <span>Distribution Agreement</span></h1>
          <p className="subtitle">Terms, distribution rights, and platform governance for Pumpkin Marketplace creators.</p>
          <div className="last-updated">Effective Date: June 2026 • Version 2026.1</div>
        </header>

        <div className="callout">
          <h3>Summary for Creators</h3>
          <ul>
            <li><strong>You own your code:</strong> You retain ownership of your original Plugin source code and assets.</li>
            <li><strong>Distribution license:</strong> You grant Pumpkin Marketplace a worldwide license to host, cache, security-scan, sign, and distribute your binaries to buyers.</li>
            <li><strong>Full platform control:</strong> Pumpkin Marketplace maintains strict quality &amp; safety standards and reserves the right to delist or quarantine non-compliant, unsafe, or abandoned plugins.</li>
            <li><strong>Revenue &amp; payouts:</strong> Paid plugins follow a standard 70/30 developer/platform split with automated Stripe Connect payouts.</li>
            <li><strong>Security &amp; EULA:</strong> Code must be free of backdoors, spyware, or malicious payloads and comply with Mojang's Minecraft EULA.</li>
          </ul>
        </div>

        {sections.map(sec => (
          <section key={sec.id} id={sec.id} className="guideline-section" style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#ffb74d', borderBottom: '1px solid #333', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
              {sec.title}
            </h2>
            <div style={{ whiteSpace: 'pre-line', color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.7' }}>
              {sec.content}
            </div>
          </section>
        ))}

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #333', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link to="/terms" style={{ color: '#ffb74d', textDecoration: 'none', fontSize: '0.9rem' }}>→ General Terms of Service</Link>
          <Link to="/guidelines" style={{ color: '#ffb74d', textDecoration: 'none', fontSize: '0.9rem' }}>→ Marketplace Review Guidelines</Link>
          <Link to="/privacy" style={{ color: '#ffb74d', textDecoration: 'none', fontSize: '0.9rem' }}>→ Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
};

export default DeveloperTermsPage;
