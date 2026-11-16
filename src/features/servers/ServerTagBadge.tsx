import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Hash, Search, X } from 'lucide-react';
import {
  MAX_SERVER_TAGS,
  SERVER_TAGS,
  SERVER_TAG_CATEGORIES,
  SERVER_TAG_MAP,
  type ServerTagCategory,
} from './constants';

interface ServerTagBadgeProps {
  tag: string;
  active?: boolean;
  count?: number;
  removable?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  title?: string;
}

export const ServerTagBadge: React.FC<ServerTagBadgeProps> = ({
  tag,
  active = false,
  count,
  removable = false,
  size = 'sm',
  onClick,
  title,
}) => {
  const { t } = useTranslation();
  const meta = SERVER_TAG_MAP[tag];
  const Icon = meta?.icon || Hash;
  const label = meta ? t(`servers.tags.items.${meta.value}.label` as any, meta.label) : tag;
  const category = meta?.category || 'core';
  const desc = meta ? t(`servers.tags.items.${meta.value}.description` as any, meta.description) : label;
  const resolvedTitle = title ?? desc;

  const content = (
    <>
      <Icon size={size === 'sm' ? 12 : 14} className="sv-tag-icon" />
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="sv-tag-count">{count}</span>
      )}
      {removable && <X size={12} style={{ opacity: 0.85 }} />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`sv-tag-badge sv-tag-${size}`}
        data-cat={category}
        aria-pressed={active}
        onClick={onClick}
        title={resolvedTitle}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`sv-tag-badge sv-tag-${size}`}
      data-cat={category}
      data-active={active || undefined}
      title={resolvedTitle}
    >
      {content}
    </span>
  );
};

interface ServerTagPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  maxTags?: number;
  onMaxReached?: () => void;
}

export const ServerTagPicker: React.FC<ServerTagPickerProps> = ({
  value,
  onChange,
  maxTags = MAX_SERVER_TAGS,
  onMaxReached,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<'all' | ServerTagCategory>('all');

  const toggleTag = (tagVal: string) => {
    if (value.includes(tagVal)) {
      onChange(value.filter((v) => v !== tagVal));
      return;
    }
    if (value.length >= maxTags) {
      onMaxReached?.();
      return;
    }
    onChange([...value, tagVal]);
  };

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVER_TAG_CATEGORIES.filter((cat) => activeCat === 'all' || cat.id === activeCat)
      .map((cat) => ({
        ...cat,
        translatedLabel: t(`servers.tags.categories.${cat.id}` as any, cat.label),
        items: SERVER_TAGS.filter((item) => {
          if (item.category !== cat.id) return false;
          if (!q) return true;
          const localizedLabel = t(`servers.tags.items.${item.value}.label` as any, item.label).toLowerCase();
          const localizedDesc = t(`servers.tags.items.${item.value}.description` as any, item.description).toLowerCase();
          return (
            localizedLabel.includes(q) ||
            item.label.toLowerCase().includes(q) ||
            item.value.includes(q) ||
            localizedDesc.includes(q) ||
            item.description.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeCat, query, t]);

  return (
    <div className="sv-picker">
      {/* Selected Tags Strip */}
      <div className="sv-picker-selected">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="small muted">
            {value.length === 0
              ? t('servers.tags.picker_select_hint', { max: maxTags })
              : t('servers.tags.picker_selected_hint')}
          </span>
          <span className="small muted mono">
            {value.length}/{maxTags}
          </span>
        </div>

        {value.length > 0 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {value.map((tagVal) => (
              <ServerTagBadge
                key={tagVal}
                tag={tagVal}
                active
                removable
                size="md"
                onClick={() => toggleTag(tagVal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter & Category Tabs */}
      <div className="sv-picker-controls">
        <label className="search" style={{ flex: '1 1 14rem' }}>
          <Search />
          <input
            type="search"
            className="input"
            placeholder={t('servers.tags.picker_filter_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>

        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="sv-cat-tab"
            aria-pressed={activeCat === 'all'}
            onClick={() => setActiveCat('all')}
          >
            {t('studio.plugins.filter_all', { count: SERVER_TAGS.length })}
          </button>
          {SERVER_TAG_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="sv-cat-tab"
              aria-pressed={activeCat === cat.id}
              onClick={() => setActiveCat(cat.id)}
            >
              {t(`servers.tags.categories.${cat.id}` as any, cat.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Categorized Tag Grid */}
      {filteredGroups.length === 0 ? (
        <p className="small muted" style={{ padding: '0.5rem 0' }}>
          {t('servers.tags.no_matches', { query })}
        </p>
      ) : (
        <div className="stack" style={{ '--gap': '0.9rem' } as React.CSSProperties}>
          {filteredGroups.map((group) => (
            <div key={group.id} className="sv-picker-group">
              <span className="label" style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>
                {group.translatedLabel}
              </span>
              <div className="sv-picker-grid">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = value.includes(item.value);
                  const atLimit = !isSelected && value.length >= maxTags;
                  const itemLabel = t(`servers.tags.items.${item.value}.label` as any, item.label);
                  const itemDesc = t(`servers.tags.items.${item.value}.description` as any, item.description);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className="sv-picker-option"
                      data-cat={item.category}
                      aria-pressed={isSelected}
                      disabled={atLimit}
                      onClick={() => toggleTag(item.value)}
                    >
                      <span className="sv-picker-opt-icon">
                        {isSelected ? <Check size={14} /> : <Icon size={14} />}
                      </span>
                      <span className="sv-picker-opt-text">
                        <strong>{itemLabel}</strong>
                        <span>{itemDesc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
