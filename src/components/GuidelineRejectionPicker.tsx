import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ExternalLink } from 'lucide-react';
import {
    GUIDELINE_CATALOG,
    getLocalizedGuideline,
    parseRejectionReason,
    type GuidelineSectionId,
} from '../lib/guidelines';

interface GuidelineRejectionPickerProps {
    selectedCodes: string[];
    onToggleCode: (code: string) => void;
    otherChecked: boolean;
    onToggleOther: (checked: boolean) => void;
    customReason: string;
    onChangeCustomReason: (value: string) => void;
}

export const GuidelineRejectionPicker = ({
    selectedCodes,
    onToggleCode,
    otherChecked,
    onToggleOther,
    customReason,
    onChangeCustomReason,
}: GuidelineRejectionPickerProps) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<'all' | GuidelineSectionId>('all');

    const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

    const filteredSections = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return GUIDELINE_CATALOG.filter(sec => activeSection === 'all' || sec.id === activeSection)
            .map(sec => {
                const groups = sec.groups
                    .map(group => {
                        const groupTitle = t(`guidelines.groups.${group.key}`, group.defaultTitle);
                        const items = group.items.filter(item => {
                            if (!q) return true;
                            const locTitle = t(`guidelines.items.${item.key}.title`, item.defaultTitle).toLowerCase();
                            const locDesc = t(`guidelines.items.${item.key}.desc`, item.defaultDesc).toLowerCase();
                            return (
                                item.code.toLowerCase().includes(q) ||
                                locTitle.includes(q) ||
                                locDesc.includes(q) ||
                                item.defaultTitle.toLowerCase().includes(q) ||
                                item.defaultDesc.toLowerCase().includes(q) ||
                                groupTitle.toLowerCase().includes(q)
                            );
                        });
                        return { ...group, localizedTitle: groupTitle, items };
                    })
                    .filter(g => g.items.length > 0);
                return {
                    ...sec,
                    localizedTitle: t(`guidelines.sections.${sec.id}`, sec.defaultTitle),
                    groups,
                };
            })
            .filter(sec => sec.groups.length > 0);
    }, [searchQuery, activeSection, t]);

    const totalSelectedCount = selectedCodes.length + (otherChecked ? 1 : 0);

    return (
        <div className="gl-picker stack">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span className="field-label">
                    {t('guidelines.catalog_label', 'Review Guidelines Catalog')}
                </span>
                <div className="row" style={{ gap: 8 }}>
                    {totalSelectedCount > 0 && (
                        <span className="tag tag-pumpkin">
                            {t('guidelines.selected_count', '{{count}} selected', { count: totalSelectedCount })}
                        </span>
                    )}
                    <Link to="/guidelines" target="_blank" rel="noreferrer" className="link small row" style={{ gap: 4 }}>
                        {t('guidelines.view_guidelines', 'Full Guidelines')} <ExternalLink size={12} />
                    </Link>
                </div>
            </div>

            <div className="gl-picker-controls stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <label className="search">
                    <Search />
                    <input
                        type="search"
                        className="input"
                        placeholder={t('guidelines.catalog_search_placeholder', 'Search guidelines by number (e.g. 2.1.1) or keyword…')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </label>

                <div className="segmented gl-section-tabs" role="group" aria-label={t('guidelines.catalog_label', 'Review Guidelines Catalog')}>
                    <button
                        type="button"
                        aria-pressed={activeSection === 'all'}
                        onClick={() => setActiveSection('all')}
                    >
                        {t('guidelines.filter_all', 'All')}
                    </button>
                    {GUIDELINE_CATALOG.map(sec => (
                        <button
                            key={sec.id}
                            type="button"
                            aria-pressed={activeSection === sec.id}
                            onClick={() => setActiveSection(sec.id)}
                        >
                            {t(`guidelines.sections.${sec.id}`, sec.defaultTitle)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="gl-catalog" role="group" aria-label={t('guidelines.catalog_label', 'Review Guidelines Catalog')}>
                {filteredSections.length === 0 ? (
                    <div className="gl-empty small muted">
                        {t('guidelines.no_matching_guidelines', 'No guidelines match your search filter.')}
                    </div>
                ) : (
                    filteredSections.map(section => (
                        <div key={section.id} className="gl-section">
                            <div className="gl-section-head">
                                <strong>{section.localizedTitle}</strong>
                            </div>
                            <div className="gl-groups">
                                {section.groups.map(group => (
                                    <div key={group.code} className="gl-group">
                                        {group.items.length > 1 || group.code !== group.items[0]?.code ? (
                                            <div className="gl-group-title small muted">{group.localizedTitle}</div>
                                        ) : null}
                                        <div className="gl-items">
                                            {group.items.map(item => {
                                                const checked = selectedSet.has(item.code);
                                                const locTitle = t(`guidelines.items.${item.key}.title`, item.defaultTitle);
                                                const locDesc = t(`guidelines.items.${item.key}.desc`, item.defaultDesc);
                                                return (
                                                    <label
                                                        key={item.code}
                                                        className="choice gl-item"
                                                        data-checked={checked ? 'true' : undefined}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="check"
                                                            checked={checked}
                                                            onChange={() => onToggleCode(item.code)}
                                                        />
                                                        <span className="gl-item-body">
                                                            <span className="gl-item-title-row">
                                                                <span className="tag mono gl-code-badge">{item.code}</span>
                                                                <strong>{locTitle}</strong>
                                                            </span>
                                                            <span className="small muted">{locDesc}</span>
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="gl-other-box" data-checked={otherChecked ? 'true' : undefined}>
                <label className="choice gl-other-choice">
                    <input
                        type="checkbox"
                        className="check"
                        checked={otherChecked}
                        onChange={e => onToggleOther(e.target.checked)}
                    />
                    <span className="gl-item-body">
                        <span className="gl-item-title-row">
                            <span className="tag tag-fg">{t('guidelines.other_label', 'Other')}</span>
                            <strong>{t('guidelines.other_checkbox', 'Other (Custom Reason)')}</strong>
                        </span>
                        <span className="small muted">
                            {t(
                                'guidelines.other_checkbox_hint',
                                'Check this to provide a custom explanation not covered by the standard guidelines catalog.'
                            )}
                        </span>
                    </span>
                </label>

                {otherChecked && (
                    <label className="field gl-other-field">
                        <span className="field-label">
                            {t('guidelines.custom_reason_label', 'Custom Developer Feedback *')}
                        </span>
                        <span className="control">
                            <textarea
                                className="input"
                                rows={3}
                                placeholder={t(
                                    'guidelines.other_placeholder',
                                    'Explain clearly what the developer needs to fix before resubmitting…'
                                )}
                                value={customReason}
                                onChange={e => onChangeCustomReason(e.target.value)}
                                required
                                autoFocus
                            />
                        </span>
                    </label>
                )}
            </div>
        </div>
    );
};

interface RejectionReasonsListProps {
    rejectionReason?: string | null;
    fallbackText?: string;
}

export const RejectionReasonsList = ({ rejectionReason, fallbackText }: RejectionReasonsListProps) => {
    const { t } = useTranslation();
    const { guidelines, custom } = useMemo(() => parseRejectionReason(rejectionReason), [rejectionReason]);

    if (guidelines.length === 0 && !custom) {
        return (
            <span>
                {fallbackText ||
                    t(
                        'guidelines.default_rejection_fallback',
                        'Please address the requested changes in your store listing or build, then resubmit for review.'
                    )}
            </span>
        );
    }

    return (
        <ul className="gl-feedback-list">
            {guidelines.map(code => {
                const g = getLocalizedGuideline(code, t);
                return (
                    <li key={code} className="gl-feedback-item">
                        <div className="gl-feedback-head">
                            <Link
                                to={`/guidelines#${g.sectionId}`}
                                className="tag tag-danger mono gl-feedback-badge"
                                title={t('guidelines.view_guidelines', 'Full Guidelines')}
                            >
                                {t('guidelines.guideline_code_label', 'Guideline {{code}}', { code: g.code })}
                            </Link>
                            <strong>{g.title}</strong>
                        </div>
                        {g.description && <p className="gl-feedback-desc">{g.description}</p>}
                    </li>
                );
            })}
            {custom && (
                <li className="gl-feedback-item">
                    <div className="gl-feedback-head">
                        <span className="tag tag-fg gl-feedback-badge">
                            {t('guidelines.other_label', 'Other')}
                        </span>
                        {guidelines.length > 0 && (
                            <strong>{t('guidelines.custom_reason_heading', 'Additional Reviewer Note')}</strong>
                        )}
                    </div>
                    <p className="gl-feedback-desc">{custom}</p>
                </li>
            )}
        </ul>
    );
};
