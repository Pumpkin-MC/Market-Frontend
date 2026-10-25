import { Link } from 'react-router-dom';
import LegalDoc from './LegalDoc';

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

In the event of a disputed charge, please contact support@pumpkinmc.org before initiating a chargeback with your payment provider. Chargebacks initiated without prior contact may result in account suspension.`
  },
  {
    id: 'refunds',
    title: '7. Digital Withdrawal Waiver & Refund Policy',
    content: `Digital Content & Right of Withdrawal Waiver:
Due to the digital nature of software downloads, when you purchase and download a Plugin, you expressly consent to immediate performance of the contract and acknowledge that you lose your statutory 14-day right of withdrawal under EU Consumer Rights Directive (2011/83/EU) once the download or key generation commences.

When Refunds Are Granted:
We want all buyers to have a safe and fair experience. Refunds may be approved under the following conditions:
• Technical Defect: The Plugin has a verifiable critical defect on supported server software, and the developer fails to provide a working fix or update within 5 business days of your support request.
• Material Misrepresentation: The Plugin is missing core advertised features explicitly listed on its store page.
• Accidental Duplicate Purchase: You accidentally purchased the identical Plugin twice within 24 hours.
• Security & Policy Violation: The Plugin is found to contain unauthorized backdoors, malware, or violates our safety policies.

Non-Refundable Circumstances:
• Change of Mind ("Buyer's Remorse"): Deciding you no longer need the Plugin or purchased by mistake after downloading.
• Incompatibility with Unsupported Versions: Attempting to run the Plugin on an incompatible server engine or Minecraft version clearly marked unsupported on the store listing.
• Configuration / Administration Issues: Inability or lack of technical knowledge to configure YAML/JSON files or server environments.

Dispute & Refund Workflow:
1. Contact the Developer: Reach out directly to the developer using their support email or Discord listed on the Plugin page.
2. 5-Day Resolution Window: Give the developer 5 business days to assist or resolve the defect.
3. Escalate to PumpkinMarket: If the developer is unresponsive or unable to resolve the verified defect, forward your proof of purchase and communication to support@pumpkinmc.org.

License Revocation:
Upon any approved refund or chargeback, the associated cryptographic license key is immediately revoked, and download access from your Library is disabled.`
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

You may close your account at any time by contacting support@pumpkinmc.org. Closing your account does not entitle you to a refund of any purchases.`
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

Email: support@pumpkinmc.org
Discord: discord.gg/pumpkinmc
Website: pumpkinmc.org

We aim to respond to all inquiries within 3 business days.`
  }
];

const TermsOfServicePage = () => (
  <LegalDoc
    kicker="Legal"
    title={<>Plugin Marketplace<br /><span className="mark">Terms of Service</span></>}
    lede="Please read these terms carefully before buying or selling plugins on PumpkinMC."
    updated="Last updated: March 3, 2026 · Effective immediately"
    toc={sections}
    footer={
      <>
        <p>
          Questions about these terms? Reach us at{' '}
          <a className="link link-pumpkin" href="mailto:support@pumpkinmc.org">support@pumpkinmc.org</a>{' '}
          or join our <a className="link link-pumpkin" href="https://discord.gg/pumpkinmc">Discord server</a>.
        </p>
        <Link to="/register" className="button button-primary">
          Create an account
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

export default TermsOfServicePage;
