import { useTranslation } from 'react-i18next';
import LegalDoc from './LegalDoc';

const GuidelinesPage = () => {
    const { t } = useTranslation();

    const toc = [
        { id: 'safety', title: t('guidelines.sections.safety', '1. Safety') },
        { id: 'performance', title: t('guidelines.sections.performance', '2. Performance') },
        { id: 'business', title: t('guidelines.sections.business', '3. Business') },
        { id: 'design', title: t('guidelines.sections.design', '4. Design') },
        { id: 'legal', title: t('guidelines.sections.legal', '5. Legal') },
    ];

    return (
        <LegalDoc
            title={<>{t('guidelines.page.title_lead', 'PumpkinMarket')} <span className="mark">{t('guidelines.page.title_mark', 'Review Guidelines')}</span></>}
            lede={t('guidelines.page.lede', 'High-quality plugins for a high-quality community.')}
            updated={t('guidelines.page.updated', 'Last Updated: June 11, 2026')}
            toc={toc}
            footer={<p>{t('guidelines.page.footer', 'We hope these guidelines help you build better plugins and a better PumpkinMarket. We’re excited to see what you create!')}</p>}
        >
            <section className="lg-intro">
                <p>
                    {t('guidelines.page.intro', 'Plugins are a great way to extend the functionality of PumpkinMC servers. Our goal is to provide a safe experience for users and a great opportunity for every developer to succeed. We’ve developed these Review Guidelines to help you through the development process.')}
                </p>
                <aside className="lg-callout">
                    <h2 className="sticker">{t('guidelines.page.before_submit_title', 'Before You Submit')}</h2>
                    <ul>
                        <li>{t('guidelines.page.before_submit_1', 'Ensure your plugin is complete and functional.')}</li>
                        <li>{t('guidelines.page.before_submit_2', 'Test for crashes and server performance impact.')}</li>
                        <li>{t('guidelines.page.before_submit_3', 'Check that all links, icons, and metadata are accurate and final.')}</li>
                        <li>{t('guidelines.page.before_submit_4', 'Verify that your plugin follows all security best practices.')}</li>
                    </ul>
                </aside>
            </section>

            <section id="safety" className="lg-section">
                <h2>{t('guidelines.sections.safety', '1. Safety')}</h2>
                <p className="lg-lead">{t('guidelines.page.safety_lead', 'When users download a plugin from PumpkinMarket, they need to be certain that it is safe to do so. Your plugin should not contain self-replicating code, backdoors, or any features that could harm a server or its data.')}</p>
                
                <div className="lg-sub">
                    <h3>{t('guidelines.groups.1_1', '1.1 Objectionable Content')}</h3>
                    <p>{t('guidelines.page.group_1_1_lead', 'Plugins should not include content that is offensive, insensitive, upsetting, intended to disgust, or in exceptionally poor taste. Examples of such content include:')}</p>
                    <ul>
                        <li id="guideline-1.1.1"><strong>1.1.1 {t('guidelines.items.1_1_1.title', 'Defamatory or Discriminatory')}:</strong> {t('guidelines.items.1_1_1.desc', 'Content that is defamatory, discriminatory, or mean-spirited, including references or commentary about religion, race, sexual orientation, gender, national/ethnic origin, or other targeted groups.')}</li>
                        <li id="guideline-1.1.2"><strong>1.1.2 {t('guidelines.items.1_1_2.title', 'Violence')}:</strong> {t('guidelines.items.1_1_2.desc', 'Realistic depictions of physical harm or violence against people or animals. Content that encourages self-harm or illegal acts.')}</li>
                        <li id="guideline-1.1.3"><strong>1.1.3 {t('guidelines.items.1_1_3.title', 'Sexual Content')}:</strong> {t('guidelines.items.1_1_3.desc', 'Overtly sexual or pornographic material, including "adult-themed" plugins.')}</li>
                        <li id="guideline-1.1.4"><strong>1.1.4 {t('guidelines.items.1_1_4.title', 'Harassment')}:</strong> {t('guidelines.items.1_1_4.desc', 'Features designed to facilitate doxxing, stalking, or targeted harassment of server players.')}</li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('guidelines.groups.1_2', '1.2 User Protection')}</h3>
                    <p>{t('guidelines.page.group_1_2_lead', 'PumpkinMarket is dedicated to the prevention of "griefing" and malicious exploitation at the platform level.')}</p>
                    <ul>
                        <li id="guideline-1.2.1"><strong>1.2.1 {t('guidelines.items.1_2_1.title', 'Malware')}:</strong> {t('guidelines.items.1_2_1.desc', 'Plugins must not contain any malicious code. This includes viruses, backdoors, hidden "OP" commands, or any code that performs actions without the server owner\'s knowledge.')}</li>
                        <li id="guideline-1.2.2"><strong>1.2.2 {t('guidelines.items.1_2_2.title', 'Phishing')}:</strong> {t('guidelines.items.1_2_2.desc', 'Plugins must not attempt to steal user credentials, tokens (like Discord tokens), or any sensitive configuration files from the server host.')}</li>
                        <li id="guideline-1.2.3"><strong>1.2.3 {t('guidelines.items.1_2_3.title', 'Remote Execution')}:</strong> {t('guidelines.items.1_2_3.desc', 'Plugins must not download and execute arbitrary code from external sources that was not included in the original WASM binary approved by the market.')}</li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('guidelines.groups.1_3', '1.3 Data Privacy')}</h3>
                    <p>{t('guidelines.page.group_1_3_lead', 'Data privacy is a fundamental right. Plugins must be transparent about data collection.')}</p>
                    <ul>
                        <li id="guideline-1.3.1"><strong>1.3.1 {t('guidelines.items.1_3_1.title', 'Transparency')}:</strong> {t('guidelines.items.1_3_1.desc', 'If your plugin sends data to an external server (e.g., for analytics or licensing), you must disclose this clearly in the description.')}</li>
                        <li id="guideline-1.3.2"><strong>1.3.2 {t('guidelines.items.1_3_2.title', 'Opt-out')}:</strong> {t('guidelines.items.1_3_2.desc', 'All telemetry or external reporting must provide a configuration option to be disabled.')}</li>
                        <li id="guideline-1.3.3"><strong>1.3.3 {t('guidelines.items.1_3_3.title', 'Sensitive Files')}:</strong> {t('guidelines.items.1_3_3.desc', 'Plugins must not access or upload files outside of their designated data folder without clear justification and disclosure.')}</li>
                    </ul>
                </div>
            </section>

            <section id="performance" className="lg-section">
                <h2>{t('guidelines.sections.performance', '2. Performance')}</h2>
                <p className="lg-lead">{t('guidelines.page.performance_lead', 'Users expect plugins to be reliable and efficient. Unoptimized plugins can crash servers or cause significant lag, leading to a poor user experience.')}</p>
                
                <div className="lg-sub">
                    <h3>{t('guidelines.groups.2_1', '2.1 Plugin Completeness')}</h3>
                    <p>{t('guidelines.page.group_2_1_lead', 'PumpkinMarket will reject plugins that are not yet complete. We do not accept "placeholder" plugins or versions that are non-functional.')}</p>
                    <ul>
                        <li id="guideline-2.1.1"><strong>2.1.1 {t('guidelines.items.2_1_1.title', 'Minimum Functionality')}:</strong> {t('guidelines.items.2_1_1.desc', 'Plugins must provide a meaningful extension to the server experience. Trivial single-command wrappers, "empty" plugins, or low-effort/unreviewed AI-generated scripts will be rejected.')}</li>
                        <li id="guideline-2.1.2"><strong>2.1.2 {t('guidelines.items.2_1_2.title', 'Stability')}:</strong> {t('guidelines.items.2_1_2.desc', 'Plugins that cause the server to crash or hang during normal operation will be removed.')}</li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('guidelines.groups.2_2', '2.2 Accurate Metadata')}</h3>
                    <p>{t('guidelines.page.group_2_2_lead', 'The information you provide about your plugin must be accurate and honest.')}</p>
                    <ul>
                        <li id="guideline-2.2.1"><strong>2.2.1 {t('guidelines.items.2_2_1.title', 'Screenshots')}:</strong> {t('guidelines.items.2_2_1.desc', 'Screenshots must accurately reflect the plugin\'s actual interface, custom UI/web panel, or effects in-game. Do not use unrelated stock images or deceptive AI-generated artwork in place of real screenshots.')}</li>
                        <li id="guideline-2.2.2"><strong>2.2.2 {t('guidelines.items.2_2_2.title', 'Categorization')}:</strong> {t('guidelines.items.2_2_2.desc', 'Plugins must be placed in the most relevant category. Miscategorizing to gain visibility is a violation.')}</li>
                        <li id="guideline-2.2.3"><strong>2.2.3 {t('guidelines.items.2_2_3.title', 'Descriptions')}:</strong> {t('guidelines.items.2_2_3.desc', 'Do not include irrelevant keywords or "tag spam" in your description to manipulate search results.')}</li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('guidelines.groups.2_3', '2.3 Resource Management')}</h3>
                    <p>{t('guidelines.page.group_2_3_lead', 'PumpkinMC servers run in high-concurrency environments. Performance is critical.')}</p>
                    <ul>
                        <li id="guideline-2.3.1"><strong>2.3.1 {t('guidelines.items.2_3_1.title', 'CPU usage')}:</strong> {t('guidelines.items.2_3_1.desc', 'Avoid blocking the main server thread. Use asynchronous tasks where possible.')}</li>
                        <li id="guideline-2.3.2"><strong>2.3.2 {t('guidelines.items.2_3_2.title', 'Memory leaks')}:</strong> {t('guidelines.items.2_3_2.desc', 'Ensure your WASM binary does not leak memory over long runtimes.')}</li>
                    </ul>
                </div>
            </section>

            <section id="business" className="lg-section">
                <h2>{t('guidelines.sections.business', '3. Business')}</h2>
                <p className="lg-lead">{t('guidelines.page.business_lead', 'Monetization on PumpkinMarket should be transparent and provide clear value to the user.')}</p>
                
                <div className="lg-sub">
                    <h3>{t('guidelines.groups.3_1', '3.1 Payments')}</h3>
                    <ul>
                        <li id="guideline-3.1.1"><strong>3.1.1 {t('guidelines.items.3_1_1.title', 'Integrated Payments')}:</strong> {t('guidelines.items.3_1_1.desc', 'All transactions for plugins must go through the PumpkinMarket system. Linking to Patreon, PayPal, or other external payment sites within the plugin or description is not allowed.')}</li>
                        <li id="guideline-3.1.2"><strong>3.1.2 {t('guidelines.items.3_1_2.title', 'Digital Goods')}:</strong> {t('guidelines.items.3_1_2.desc', 'Plugins must not unlock features via external "keys" or "codes" purchased outside the market.')}</li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('guidelines.groups.3_2', '3.2 Business Practices')}</h3>
                    <ul>
                        <li id="guideline-3.2.1"><strong>3.2.1 {t('guidelines.items.3_2_1.title', 'Bait and Switch')}:</strong> {t('guidelines.items.3_2_1.desc', 'Plugins must not change their primary purpose after approval or hide essential features behind unexpected paywalls.')}</li>
                        <li id="guideline-3.2.2"><strong>3.2.2 {t('guidelines.items.3_2_2.title', 'Fake Reviews')}:</strong> {t('guidelines.items.3_2_2.desc', 'Developers found to be inflating their own ratings or reviews will be permanently banned.')}</li>
                        <li id="guideline-3.2.3"><strong>3.2.3 {t('guidelines.items.3_2_3.title', 'Scamming')}:</strong> {t('guidelines.items.3_2_3.desc', 'Any plugin found to be a scam or "vaporware" will result in an immediate permanent ban and possible refunding of all affected users.')}</li>
                    </ul>
                </div>
            </section>

            <section id="design" className="lg-section">
                <h2>{t('guidelines.sections.design', '4. Design')}</h2>
                <p className="lg-lead">{t('guidelines.page.design_lead', "A great plugin is more than just code; it's also about how it's presented and how users interact with it.")}</p>
                
                <div className="lg-sub">
                    <h3>{t('guidelines.groups.4_1', '4.1 Copycats and Spam')}</h3>
                    <ul>
                        <li id="guideline-4.1.1"><strong>4.1.1 {t('guidelines.items.4_1_1.title', 'Originality')}:</strong> {t('guidelines.items.4_1_1.desc', 'Competing plugins in existing categories are welcome when they offer meaningful improvements (better performance, richer configuration, database support, or active maintenance). Barebones clones or template-level duplicates that offer less functionality than established plugins will be rejected.')}</li>
                        <li id="guideline-4.1.2"><strong>4.1.2 {t('guidelines.items.4_1_2.title', 'Spam')}:</strong> {t('guidelines.items.4_1_2.desc', 'Do not upload multiple near-identical plugins or mass-generated AI submissions. Consolidate features into a single, high-quality plugin with configuration options.')}</li>
                    </ul>
                </div>

                <div className="lg-sub">
                    <h3>{t('guidelines.groups.4_2', '4.2 User Experience')}</h3>
                    <ul>
                        <li id="guideline-4.2.1"><strong>4.2.1 {t('guidelines.items.4_2_1.title', 'Consistency')}:</strong> {t('guidelines.items.4_2_1.desc', 'We recommend following standard command patterns (e.g., /pluginname help) to ensure a familiar experience for users.')}</li>
                        <li id="guideline-4.2.2"><strong>4.2.2 {t('guidelines.items.4_2_2.title', 'Documentation')}:</strong> {t('guidelines.items.4_2_2.desc', 'Provide clear instructions in your description or a linked wiki. Plugins that are impossible to configure or use will be rejected.')}</li>
                    </ul>
                </div>
            </section>

            <section id="legal" className="lg-section">
                <h2>{t('guidelines.sections.legal', '5. Legal')}</h2>
                <p className="lg-lead">{t('guidelines.page.legal_lead', 'You are responsible for ensuring your plugin complies with all applicable laws and regulations.')}</p>
                
                <div className="lg-sub" id="guideline-5.1">
                    <h3>5.1 {t('guidelines.items.5_1.title', 'Intellectual Property')}</h3>
                    <p>{t('guidelines.items.5_1.desc', 'You must be the original author of the code or have the legal right to distribute it. Using leaked or stolen code ("leaks") will result in an immediate ban.')}</p>
                </div>

                <div className="lg-sub" id="guideline-5.2">
                    <h3>5.2 {t('guidelines.items.5_2.title', 'Open Source Licenses')}</h3>
                    <p>{t('guidelines.items.5_2.desc', 'If your plugin includes open-source components, you must adhere to the terms of those licenses. Include necessary attributions and license files within your plugin archive.')}</p>
                </div>

                <div className="lg-sub" id="guideline-5.3">
                    <h3>5.3 {t('guidelines.items.5_3.title', 'Right to Remove')}</h3>
                    <p>{t('guidelines.items.5_3.desc', 'PumpkinMarket reserves the right to remove any plugin at its sole discretion if it is determined to be detrimental to the market\'s reputation or user safety, even if a specific guideline has not been technically violated.')}</p>
                </div>
            </section>

        </LegalDoc>
    );
};

export default GuidelinesPage;
