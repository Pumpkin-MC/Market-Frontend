import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import LegalDoc from './LegalDoc';

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

const LegalNoticePage = () => (
  <LegalDoc
    kicker={<><Scale /> Legal Notice / Impressum</>}
    title={<>Legal Notice &amp;<br /><span className="mark">Provider Identification</span></>}
    lede="Information and provider identification pursuant to § 5 of the German Digital Services Act (DDG) and § 18 Section 2 MStV."
    updated="Last updated: August 2026 · Effective immediately"
    toc={sections}
    footer={
      <>
        <p>
          Official Provider Identification for the PumpkinMC Plugin Marketplace · Contact:{' '}
          <a className="link link-pumpkin" href="mailto:lilalexmed@proton.me">lilalexmed@proton.me</a>
        </p>
        <div className="lg-links">
          <Link className="link" to="/terms">Terms of Service</Link>
          <Link className="link" to="/privacy">Privacy Policy</Link>
          <Link className="link" to="/">Marketplace</Link>
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

export default LegalNoticePage;
