import type { TFunction } from 'i18next';

export type GuidelineSectionId = 'safety' | 'performance' | 'business' | 'design' | 'legal';

export interface GuidelineItem {
    code: string;
    key: string;
    sectionId: GuidelineSectionId;
    groupCode: string;
    defaultTitle: string;
    defaultDesc: string;
}

export interface GuidelineGroup {
    code: string;
    key: string;
    defaultTitle: string;
    items: GuidelineItem[];
}

export interface GuidelineSection {
    id: GuidelineSectionId;
    number: string;
    defaultTitle: string;
    groups: GuidelineGroup[];
}

export const GUIDELINE_CATALOG: GuidelineSection[] = [
    {
        id: 'safety',
        number: '1',
        defaultTitle: '1. Safety',
        groups: [
            {
                code: '1.1',
                key: '1_1',
                defaultTitle: '1.1 Objectionable Content',
                items: [
                    {
                        code: '1.1.1',
                        key: '1_1_1',
                        sectionId: 'safety',
                        groupCode: '1.1',
                        defaultTitle: 'Defamatory or Discriminatory',
                        defaultDesc:
                            'Content that is defamatory, discriminatory, or mean-spirited, including references or commentary about religion, race, sexual orientation, gender, national/ethnic origin, or other targeted groups.',
                    },
                    {
                        code: '1.1.2',
                        key: '1_1_2',
                        sectionId: 'safety',
                        groupCode: '1.1',
                        defaultTitle: 'Violence',
                        defaultDesc:
                            'Realistic depictions of physical harm or violence against people or animals. Content that encourages self-harm or illegal acts.',
                    },
                    {
                        code: '1.1.3',
                        key: '1_1_3',
                        sectionId: 'safety',
                        groupCode: '1.1',
                        defaultTitle: 'Sexual Content',
                        defaultDesc: 'Overtly sexual or pornographic material, including "adult-themed" plugins.',
                    },
                    {
                        code: '1.1.4',
                        key: '1_1_4',
                        sectionId: 'safety',
                        groupCode: '1.1',
                        defaultTitle: 'Harassment',
                        defaultDesc: 'Features designed to facilitate doxxing, stalking, or targeted harassment of server players.',
                    },
                ],
            },
            {
                code: '1.2',
                key: '1_2',
                defaultTitle: '1.2 User Protection',
                items: [
                    {
                        code: '1.2.1',
                        key: '1_2_1',
                        sectionId: 'safety',
                        groupCode: '1.2',
                        defaultTitle: 'Malware',
                        defaultDesc:
                            'Plugins must not contain any malicious code. This includes viruses, backdoors, hidden "OP" commands, or any code that performs actions without the server owner\'s knowledge.',
                    },
                    {
                        code: '1.2.2',
                        key: '1_2_2',
                        sectionId: 'safety',
                        groupCode: '1.2',
                        defaultTitle: 'Phishing',
                        defaultDesc:
                            'Plugins must not attempt to steal user credentials, tokens (like Discord tokens), or any sensitive configuration files from the server host.',
                    },
                    {
                        code: '1.2.3',
                        key: '1_2_3',
                        sectionId: 'safety',
                        groupCode: '1.2',
                        defaultTitle: 'Remote Execution',
                        defaultDesc:
                            'Plugins must not download and execute arbitrary code from external sources that was not included in the original WASM binary approved by the market.',
                    },
                ],
            },
            {
                code: '1.3',
                key: '1_3',
                defaultTitle: '1.3 Data Privacy',
                items: [
                    {
                        code: '1.3.1',
                        key: '1_3_1',
                        sectionId: 'safety',
                        groupCode: '1.3',
                        defaultTitle: 'Transparency',
                        defaultDesc:
                            'If your plugin sends data to an external server (e.g., for analytics or licensing), you must disclose this clearly in the description.',
                    },
                    {
                        code: '1.3.2',
                        key: '1_3_2',
                        sectionId: 'safety',
                        groupCode: '1.3',
                        defaultTitle: 'Opt-out',
                        defaultDesc: 'All telemetry or external reporting must provide a configuration option to be disabled.',
                    },
                    {
                        code: '1.3.3',
                        key: '1_3_3',
                        sectionId: 'safety',
                        groupCode: '1.3',
                        defaultTitle: 'Sensitive Files',
                        defaultDesc:
                            'Plugins must not access or upload files outside of their designated data folder without clear justification and disclosure.',
                    },
                ],
            },
        ],
    },
    {
        id: 'performance',
        number: '2',
        defaultTitle: '2. Performance',
        groups: [
            {
                code: '2.1',
                key: '2_1',
                defaultTitle: '2.1 Plugin Completeness',
                items: [
                    {
                        code: '2.1.1',
                        key: '2_1_1',
                        sectionId: 'performance',
                        groupCode: '2.1',
                        defaultTitle: 'Minimum Functionality',
                        defaultDesc:
                            'Plugins must provide a meaningful extension to the server experience. Trivial single-command wrappers, "empty" plugins, or low-effort/unreviewed AI-generated scripts will be rejected.',
                    },
                    {
                        code: '2.1.2',
                        key: '2_1_2',
                        sectionId: 'performance',
                        groupCode: '2.1',
                        defaultTitle: 'Stability',
                        defaultDesc: 'Plugins that cause the server to crash or hang during normal operation will be removed.',
                    },
                ],
            },
            {
                code: '2.2',
                key: '2_2',
                defaultTitle: '2.2 Accurate Metadata',
                items: [
                    {
                        code: '2.2.1',
                        key: '2_2_1',
                        sectionId: 'performance',
                        groupCode: '2.2',
                        defaultTitle: 'Screenshots',
                        defaultDesc:
                            'Screenshots must accurately reflect the plugin\'s actual interface, custom UI/web panel, or effects in-game. Do not use unrelated stock images or deceptive AI-generated artwork in place of real screenshots.',
                    },
                    {
                        code: '2.2.2',
                        key: '2_2_2',
                        sectionId: 'performance',
                        groupCode: '2.2',
                        defaultTitle: 'Categorization',
                        defaultDesc: 'Plugins must be placed in the most relevant category. Miscategorizing to gain visibility is a violation.',
                    },
                    {
                        code: '2.2.3',
                        key: '2_2_3',
                        sectionId: 'performance',
                        groupCode: '2.2',
                        defaultTitle: 'Descriptions',
                        defaultDesc: 'Do not include irrelevant keywords or "tag spam" in your description to manipulate search results.',
                    },
                ],
            },
            {
                code: '2.3',
                key: '2_3',
                defaultTitle: '2.3 Resource Management',
                items: [
                    {
                        code: '2.3.1',
                        key: '2_3_1',
                        sectionId: 'performance',
                        groupCode: '2.3',
                        defaultTitle: 'CPU usage',
                        defaultDesc: 'Avoid blocking the main server thread. Use asynchronous tasks where possible.',
                    },
                    {
                        code: '2.3.2',
                        key: '2_3_2',
                        sectionId: 'performance',
                        groupCode: '2.3',
                        defaultTitle: 'Memory leaks',
                        defaultDesc: 'Ensure your WASM binary does not leak memory over long runtimes.',
                    },
                ],
            },
        ],
    },
    {
        id: 'business',
        number: '3',
        defaultTitle: '3. Business',
        groups: [
            {
                code: '3.1',
                key: '3_1',
                defaultTitle: '3.1 Payments',
                items: [
                    {
                        code: '3.1.1',
                        key: '3_1_1',
                        sectionId: 'business',
                        groupCode: '3.1',
                        defaultTitle: 'Integrated Payments',
                        defaultDesc:
                            'All transactions for plugins must go through the PumpkinMarket system. Linking to Patreon, PayPal, or other external payment sites within the plugin or description is not allowed.',
                    },
                    {
                        code: '3.1.2',
                        key: '3_1_2',
                        sectionId: 'business',
                        groupCode: '3.1',
                        defaultTitle: 'Digital Goods',
                        defaultDesc: 'Plugins must not unlock features via external "keys" or "codes" purchased outside the market.',
                    },
                ],
            },
            {
                code: '3.2',
                key: '3_2',
                defaultTitle: '3.2 Business Practices',
                items: [
                    {
                        code: '3.2.1',
                        key: '3_2_1',
                        sectionId: 'business',
                        groupCode: '3.2',
                        defaultTitle: 'Bait and Switch',
                        defaultDesc:
                            'Plugins must not change their primary purpose after approval or hide essential features behind unexpected paywalls.',
                    },
                    {
                        code: '3.2.2',
                        key: '3_2_2',
                        sectionId: 'business',
                        groupCode: '3.2',
                        defaultTitle: 'Fake Reviews',
                        defaultDesc: 'Developers found to be inflating their own ratings or reviews will be permanently banned.',
                    },
                    {
                        code: '3.2.3',
                        key: '3_2_3',
                        sectionId: 'business',
                        groupCode: '3.2',
                        defaultTitle: 'Scamming',
                        defaultDesc:
                            'Any plugin found to be a scam or "vaporware" will result in an immediate permanent ban and possible refunding of all affected users.',
                    },
                ],
            },
        ],
    },
    {
        id: 'design',
        number: '4',
        defaultTitle: '4. Design',
        groups: [
            {
                code: '4.1',
                key: '4_1',
                defaultTitle: '4.1 Copycats and Spam',
                items: [
                    {
                        code: '4.1.1',
                        key: '4_1_1',
                        sectionId: 'design',
                        groupCode: '4.1',
                        defaultTitle: 'Originality',
                        defaultDesc:
                            'Competing plugins in existing categories are welcome when they offer meaningful improvements (better performance, richer configuration, database support, or active maintenance). Barebones clones or template-level duplicates that offer less functionality than established plugins will be rejected.',
                    },
                    {
                        code: '4.1.2',
                        key: '4_1_2',
                        sectionId: 'design',
                        groupCode: '4.1',
                        defaultTitle: 'Spam',
                        defaultDesc:
                            'Do not upload multiple near-identical plugins or mass-generated AI submissions. Consolidate features into a single, high-quality plugin with configuration options.',
                    },
                ],
            },
            {
                code: '4.2',
                key: '4_2',
                defaultTitle: '4.2 User Experience',
                items: [
                    {
                        code: '4.2.1',
                        key: '4_2_1',
                        sectionId: 'design',
                        groupCode: '4.2',
                        defaultTitle: 'Consistency',
                        defaultDesc:
                            'We recommend following standard command patterns (e.g., /pluginname help) to ensure a familiar experience for users.',
                    },
                    {
                        code: '4.2.2',
                        key: '4_2_2',
                        sectionId: 'design',
                        groupCode: '4.2',
                        defaultTitle: 'Documentation',
                        defaultDesc:
                            'Provide clear instructions in your description or a linked wiki. Plugins that are impossible to configure or use will be rejected.',
                    },
                ],
            },
        ],
    },
    {
        id: 'legal',
        number: '5',
        defaultTitle: '5. Legal',
        groups: [
            {
                code: '5.1',
                key: '5_1',
                defaultTitle: '5.1 Intellectual Property',
                items: [
                    {
                        code: '5.1',
                        key: '5_1',
                        sectionId: 'legal',
                        groupCode: '5.1',
                        defaultTitle: 'Intellectual Property',
                        defaultDesc:
                            'You must be the original author of the code or have the legal right to distribute it. Using leaked or stolen code ("leaks") will result in an immediate ban.',
                    },
                ],
            },
            {
                code: '5.2',
                key: '5_2',
                defaultTitle: '5.2 Open Source Licenses',
                items: [
                    {
                        code: '5.2',
                        key: '5_2',
                        sectionId: 'legal',
                        groupCode: '5.2',
                        defaultTitle: 'Open Source Licenses',
                        defaultDesc:
                            'If your plugin includes open-source components, you must adhere to the terms of those licenses. Include necessary attributions and license files within your plugin archive.',
                    },
                ],
            },
            {
                code: '5.3',
                key: '5_3',
                defaultTitle: '5.3 Right to Remove',
                items: [
                    {
                        code: '5.3',
                        key: '5_3',
                        sectionId: 'legal',
                        groupCode: '5.3',
                        defaultTitle: 'Right to Remove',
                        defaultDesc:
                            'PumpkinMarket reserves the right to remove any plugin at its sole discretion if it is determined to be detrimental to the market\'s reputation or user safety, even if a specific guideline has not been technically violated.',
                    },
                ],
            },
        ],
    },
];

export const ALL_GUIDELINES: GuidelineItem[] = GUIDELINE_CATALOG.flatMap(section =>
    section.groups.flatMap(group => group.items)
);

export const GUIDELINE_BY_CODE: Record<string, GuidelineItem> = Object.fromEntries(
    ALL_GUIDELINES.map(item => [item.code, item])
);

export interface ParsedRejectionReason {
    guidelines: string[];
    custom: string;
}

export function serializeRejectionReason(guidelines: string[], custom?: string): string {
    const cleanGuidelines = Array.from(new Set(guidelines.map(c => c.trim()).filter(Boolean)));
    const cleanCustom = (custom || '').trim();
    const payload: { guidelines: string[]; custom?: string } = {
        guidelines: cleanGuidelines,
    };
    if (cleanCustom) {
        payload.custom = cleanCustom;
    }
    return JSON.stringify(payload);
}

export function parseRejectionReason(raw?: string | null): ParsedRejectionReason {
    if (!raw || !raw.trim()) {
        return { guidelines: [], custom: '' };
    }
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object') {
                const guidelines = Array.isArray(parsed.guidelines)
                    ? parsed.guidelines
                          .filter((c: unknown): c is string => typeof c === 'string' && Boolean(c.trim()))
                          .map((c: string) => c.trim())
                    : [];
                const custom = typeof parsed.custom === 'string' ? parsed.custom.trim() : '';
                if (guidelines.length > 0 || custom) {
                    return { guidelines, custom };
                }
            }
        } catch {
            // Fall through to legacy plain text handling
        }
    }

    if (GUIDELINE_BY_CODE[trimmed]) {
        return { guidelines: [trimmed], custom: '' };
    }

    return { guidelines: [], custom: trimmed };
}

export function getLocalizedGuideline(code: string, t: TFunction) {
    const item = GUIDELINE_BY_CODE[code];
    if (!item) {
        return {
            code,
            sectionId: 'safety' as GuidelineSectionId,
            title: code,
            description: '',
        };
    }
    return {
        code: item.code,
        sectionId: item.sectionId,
        title: t(`guidelines.items.${item.key}.title`, item.defaultTitle),
        description: t(`guidelines.items.${item.key}.desc`, item.defaultDesc),
    };
}

export function formatRejectionReasonSummary(raw: string | null | undefined, t: TFunction): string {
    if (!raw || !raw.trim()) return '';
    const { guidelines, custom } = parseRejectionReason(raw);
    const parts: string[] = guidelines.map(code => {
        const g = getLocalizedGuideline(code, t);
        return g.description ? `${g.code} ${g.title}: ${g.description}` : `${g.code} ${g.title}`;
    });
    if (custom) {
        if (guidelines.length > 0) {
            parts.push(`${t('guidelines.other_label', 'Other')}: ${custom}`);
        } else {
            parts.push(custom);
        }
    }
    return parts.join(' • ');
}
