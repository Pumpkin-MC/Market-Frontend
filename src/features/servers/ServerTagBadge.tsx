import React, { useMemo, useState } from 'react';
import { ArrowUp, Check, Hash, Search, Sparkles, X } from 'lucide-react';
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
  primary?: boolean;
  count?: number;
  removable?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  title?: string;
}

export const ServerTagBadge: React.FC<ServerTagBadgeProps> = ({
  tag,
  active = false,
  primary = false,
  count,
  removable = false,
  size = 'sm',
  onClick,
  title,
}) => {
  const meta = SERVER_TAG_MAP[tag];
  const Icon = meta?.icon || Hash;
  const label = meta?.label || tag;
  const category = meta?.category || 'core';
  const resolvedTitle = title ?? meta?.description ?? label;

  const content = (
    <>
      <Icon size={size === 'sm' ? 12 : 14} className="sv-tag-icon" />
      <span>{label}</span>
      {primary && <span className="sv-tag-primary-mark">Primary</span>}
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
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<'all' | ServerTagCategory>('all');

  const toggleTag = (tagVal: string) => {
    if (value.includes(tagVal)) {
      onChange(value.filter((t) => t !== tagVal));
      return;
    }
    if (value.length >= maxTags) {
      onMaxReached?.();
      return;
    }
    onChange([...value, tagVal]);
  };

  const promoteToPrimary = (tagVal: string) => {
    const rest = value.filter((t) => t !== tagVal);
    onChange([tagVal, ...rest]);
  };

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVER_TAG_CATEGORIES.filter((cat) => activeCat === 'all' || cat.id === activeCat)
      .map((cat) => ({
        ...cat,
        items: SERVER_TAGS.filter(
          (t) =>
            t.category === cat.id &&
            (!q ||
              t.label.toLowerCase().includes(q) ||
              t.value.includes(q) ||
              t.description.toLowerCase().includes(q))
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeCat, query]);

  return (
    <div className="sv-picker">
      {/* Selected Tags Strip */}
      <div className="sv-picker-selected">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="small muted">
            {value.length === 0
              ? 'Select up to 8 tags — your first tag is highlighted as your server’s Primary Tag.'
              : 'Click a selected tag to remove it, or promote any tag to Primary (#1):'}
          </span>
          <span className="tag tag-fg mono">
            {value.length}/{maxTags}
          </span>
        </div>

        {value.length > 0 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {value.map((tagVal, idx) => (
              <div key={tagVal} className="sv-selected-pill-wrap">
                {idx > 0 && (
                  <button
                    type="button"
                    className="sv-promote-btn"
                    onClick={() => promoteToPrimary(tagVal)}
                    title="Make primary tag"
                    aria-label={`Make ${tagVal} primary tag`}
                  >
                    <ArrowUp size={11} />
                  </button>
                )}
                <ServerTagBadge
                  tag={tagVal}
                  active
                  primary={idx === 0}
                  removable
                  size="md"
                  onClick={() => toggleTag(tagVal)}
                />
              </div>
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
            placeholder="Filter tags (e.g. SMP, LifeSteal, Economy, Voice Chat)…"
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
            All ({SERVER_TAGS.length})
          </button>
          {SERVER_TAG_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="sv-cat-tab"
              aria-pressed={activeCat === cat.id}
              onClick={() => setActiveCat(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categorized Tag Grid */}
      {filteredGroups.length === 0 ? (
        <p className="small muted" style={{ padding: '0.5rem 0' }}>
          No tags match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="stack" style={{ '--gap': '0.9rem' } as React.CSSProperties}>
          {filteredGroups.map((group) => (
            <div key={group.id} className="sv-picker-group">
              <span className="label" style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>
                {group.label}
              </span>
              <div className="sv-picker-grid">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = value.includes(item.value);
                  const atLimit = !isSelected && value.length >= maxTags;
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
                        <strong>
                          {item.label}
                          {item.featured && !isSelected && (
                            <Sparkles
                              size={10}
                              className="pumpkin"
                              style={{ marginLeft: 4, verticalAlign: '1px' }}
                            />
                          )}
                        </strong>
                        <span>{item.description}</span>
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
