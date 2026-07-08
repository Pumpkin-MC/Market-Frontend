import './LegalPages.css';

const GuidelinesPage = () => {
    return (
        <div className="legal-container guidelines-page">
            <div className="legal-content">
                <header className="guidelines-header">
                    <h1>PumpkinMarket <span>Review Guidelines</span></h1>
                    <p className="subtitle">High-quality plugins for a high-quality community.</p>
                    <div className="last-updated">Last Updated: June 11, 2026</div>
                </header>

                <section className="introduction">
                    <p>
                        Plugins are a great way to extend the functionality of PumpkinMC servers. Our goal is to provide a safe experience for users 
                        and a great opportunity for every developer to succeed. We’ve developed these Review Guidelines to help you through 
                        the development process.
                    </p>
                    <div className="callout">
                        <h3>Before You Submit</h3>
                        <ul>
                            <li>Ensure your plugin is complete and functional.</li>
                            <li>Test for crashes and server performance impact.</li>
                            <li>Check that all links, icons, and metadata are accurate and final.</li>
                            <li>Verify that your plugin follows all security best practices.</li>
                        </ul>
                    </div>
                </section>

                <section className="guideline-section">
                    <h2>1. Safety</h2>
                    <p className="section-intro">When users download a plugin from PumpkinMarket, they need to be certain that it is safe to do so. Your plugin should not contain self-replicating code, backdoors, or any features that could harm a server or its data.</p>
                    
                    <div className="sub-section">
                        <h3>1.1 Objectionable Content</h3>
                        <p>Plugins should not include content that is offensive, insensitive, upsetting, intended to disgust, or in exceptionally poor taste. Examples of such content include:</p>
                        <ul>
                            <li><strong>1.1.1 Defamatory or Discriminatory:</strong> Content that is defamatory, discriminatory, or mean-spirited, including references or commentary about religion, race, sexual orientation, gender, national/ethnic origin, or other targeted groups.</li>
                            <li><strong>1.1.2 Violence:</strong> Realistic depictions of physical harm or violence against people or animals. Content that encourages self-harm or illegal acts.</li>
                            <li><strong>1.1.3 Sexual Content:</strong> Overtly sexual or pornographic material, including "adult-themed" plugins.</li>
                            <li><strong>1.1.4 Harassment:</strong> Features designed to facilitate doxxing, stalking, or targeted harassment of server players.</li>
                        </ul>
                    </div>

                    <div className="sub-section">
                        <h3>1.2 User Protection</h3>
                        <p>PumpkinMarket is dedicated to the prevention of "griefing" and malicious exploitation at the platform level.</p>
                        <ul>
                            <li><strong>1.2.1 Malware:</strong> Plugins must not contain any malicious code. This includes viruses, backdoors, hidden "OP" commands, or any code that performs actions without the server owner's knowledge.</li>
                            <li><strong>1.2.2 Phishing:</strong> Plugins must not attempt to steal user credentials, tokens (like Discord tokens), or any sensitive configuration files from the server host.</li>
                            <li><strong>1.2.3 Remote Execution:</strong> Plugins must not download and execute arbitrary code from external sources that was not included in the original WASM binary approved by the market.</li>
                        </ul>
                    </div>

                    <div className="sub-section">
                        <h3>1.3 Data Privacy</h3>
                        <p>Data privacy is a fundamental right. Plugins must be transparent about data collection.</p>
                        <ul>
                            <li><strong>1.3.1 Transparency:</strong> If your plugin sends data to an external server (e.g., for analytics or licensing), you must disclose this clearly in the description.</li>
                            <li><strong>1.3.2 Opt-out:</strong> All telemetry or external reporting must provide a configuration option to be disabled.</li>
                            <li><strong>1.3.3 Sensitive Files:</strong> Plugins must not access or upload files outside of their designated data folder without clear justification and disclosure.</li>
                        </ul>
                    </div>
                </section>

                <section className="guideline-section">
                    <h2>2. Performance</h2>
                    <p className="section-intro">Users expect plugins to be reliable and efficient. Unoptimized plugins can crash servers or cause significant lag, leading to a poor user experience.</p>
                    
                    <div className="sub-section">
                        <h3>2.1 Plugin Completeness</h3>
                        <p>PumpkinMarket will reject plugins that are not yet complete. We do not accept "placeholder" plugins or versions that are non-functional.</p>
                        <ul>
                            <li><strong>2.1.1 Minimum Functionality:</strong> Plugins must provide a meaningful extension to the server experience. "Empty" plugins or those that only print a message to the console will be rejected.</li>
                            <li><strong>2.1.2 Stability:</strong> Plugins that cause the server to crash or hang during normal operation will be removed.</li>
                        </ul>
                    </div>

                    <div className="sub-section">
                        <h3>2.2 Accurate Metadata</h3>
                        <p>The information you provide about your plugin must be accurate and honest.</p>
                        <ul>
                            <li><strong>2.2.1 Screenshots:</strong> Screenshots must accurately reflect the plugin's interface or effects in-game. Do not use generic or "stock" images that are unrelated.</li>
                            <li><strong>2.2.2 Categorization:</strong> Plugins must be placed in the most relevant category. Mis-categorizing to gain visibility is a violation.</li>
                            <li><strong>2.2.3 Descriptions:</strong> Do not include irrelevant keywords or "tag spam" in your description to manipulate search results.</li>
                        </ul>
                    </div>

                    <div className="sub-section">
                        <h3>2.3 Resource Management</h3>
                        <p>PumpkinMC servers run in high-concurrency environments. Performance is critical.</p>
                        <ul>
                            <li><strong>2.3.1 CPU usage:</strong> Avoid blocking the main server thread. Use asynchronous tasks where possible.</li>
                            <li><strong>2.3.2 Memory leaks:</strong> Ensure your WASM binary does not leak memory over long runtimes.</li>
                        </ul>
                    </div>
                </section>

                <section className="guideline-section">
                    <h2>3. Business</h2>
                    <p className="section-intro">monetization on PumpkinMarket should be transparent and provide clear value to the user.</p>
                    
                    <div className="sub-section">
                        <h3>3.1 Payments</h3>
                        <ul>
                            <li><strong>3.1.1 Integrated Payments:</strong> All transactions for plugins must go through the PumpkinMarket system. Linking to Patreon, PayPal, or other external payment sites within the plugin or description is not allowed.</li>
                            <li><strong>3.1.2 Digital Goods:</strong> Plugins must not unlock features via external "keys" or "codes" purchased outside the market.</li>
                        </ul>
                    </div>

                    <div className="sub-section">
                        <h3>3.2 Business Practices</h3>
                        <ul>
                            <li><strong>3.2.1 Bait and Switch:</strong> Plugins must not change their primary purpose after approval or hide essential features behind unexpected paywalls.</li>
                            <li><strong>3.2.2 Fake Reviews:</strong> Developers found to be inflating their own ratings or reviews will be permanently banned.</li>
                            <li><strong>3.2.3 Scamming:</strong> Any plugin found to be a scam or "vaporware" will result in an immediate permanent ban and possible refunding of all affected users.</li>
                        </ul>
                    </div>
                </section>

                <section className="guideline-section">
                    <h2>4. Design</h2>
                    <p className="section-intro">A great plugin is more than just code; it's also about how it's presented and how users interact with it.</p>
                    
                    <div className="sub-section">
                        <h3>4.1 Copycats and Spam</h3>
                        <ul>
                            <li><strong>4.1.1 Originality:</strong> Do not simply "clone" another popular plugin. While similar features are allowed, your plugin should offer unique value or a different implementation.</li>
                            <li><strong>4.1.2 Spam:</strong> Do not upload multiple near-identical plugins. Consolidate features into a single, high-quality plugin with configuration options.</li>
                        </ul>
                    </div>

                    <div className="sub-section">
                        <h3>4.2 User Experience</h3>
                        <ul>
                            <li><strong>4.2.1 Consistency:</strong> We recommend following standard command patterns (e.g., /pluginname help) to ensure a familiar experience for users.</li>
                            <li><strong>4.2.2 Documentation:</strong> Provide clear instructions in your description or a linked wiki. Plugins that are impossible to configure or use will be rejected.</li>
                        </ul>
                    </div>
                </section>

                <section className="guideline-section">
                    <h2>5. Legal</h2>
                    <p className="section-intro">You are responsible for ensuring your plugin complies with all applicable laws and regulations.</p>
                    
                    <div className="sub-section">
                        <h3>5.1 Intellectual Property</h3>
                        <p>You must be the original author of the code or have the legal right to distribute it. Using leaked or stolen code ("leaks") will result in an immediate ban.</p>
                    </div>

                    <div className="sub-section">
                        <h3>5.2 Open Source Licenses</h3>
                        <p>If your plugin includes open-source components, you must adhere to the terms of those licenses. Include necessary attributions and license files within your plugin archive.</p>
                    </div>

                    <div className="sub-section">
                        <h3>5.3 Right to Remove</h3>
                        <p>PumpkinMarket reserves the right to remove any plugin at its sole discretion if it is determined to be detrimental to the market's reputation or user safety, even if a specific guideline has not been technically violated.</p>
                    </div>
                </section>

                <footer className="guidelines-footer">
                    <p>We hope these guidelines help you build better plugins and a better PumpkinMarket. We’re excited to see what you create!</p>
                </footer>
            </div>
        </div>
    );
};

export default GuidelinesPage;
