import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  Search,
  X,
  Clock,
  Package,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import api from '../../lib/api';
import { getPluginUrl } from '../../lib/url';
import '../../styles/store.css';

export interface SearchSuggestionPlugin {
  id: number;
  name: string;
  dev_name: string;
  category: string | null;
  preview_path: string | null;
  price_cents: number;
  price: number;
  type: 'free' | 'paid' | 'adwall';
  sale_active: boolean;
  sale_discount_percent: number;
  downloads: number;
  is_early_access: boolean;
  is_preorder: boolean;
}

export interface SearchSuggestionsResponse {
  plugins: SearchSuggestionPlugin[];
  authors?: any[];
  categories?: any[];
  tags?: string[];
}

const RECENT_SEARCHES_KEY = 'pumpkin_market_recent_searches';
const MAX_RECENT_SEARCHES = 6;

const getRecentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (term: string) => {
  const clean = term.trim();
  if (!clean) return;
  try {
    const existing = getRecentSearches();
    const updated = [clean, ...existing.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
  }
};

const removeRecentSearch = (term: string) => {
  try {
    const existing = getRecentSearches();
    const updated = existing.filter((s) => s.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
  }
};

const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
  }
};

interface CacheEntry {
  data: SearchSuggestionsResponse;
  timestamp: number;
}

const clientSuggestionCache = new Map<string, CacheEntry>();
const MAX_CLIENT_CACHE = 100;
const CLIENT_CACHE_TTL_MS = 15_000;
export const clearSuggestionCache = () => {
  clientSuggestionCache.clear();
};

const getCachedSuggestions = (term: string): SearchSuggestionsResponse | undefined => {
  const entry = clientSuggestionCache.get(term.toLowerCase());
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CLIENT_CACHE_TTL_MS) {
    clientSuggestionCache.delete(term.toLowerCase());
    return undefined;
  }
  return entry.data;
};

const setCachedSuggestions = (term: string, data: SearchSuggestionsResponse) => {
  if (clientSuggestionCache.size >= MAX_CLIENT_CACHE) {
    const firstKey = clientSuggestionCache.keys().next().value;
    if (firstKey) clientSuggestionCache.delete(firstKey);
  }
  clientSuggestionCache.set(term.toLowerCase(), { data, timestamp: Date.now() });
};

type FlattenedItem =
  | { kind: 'recent'; query: string }
  | { kind: 'plugin'; plugin: SearchSuggestionPlugin }
  | { kind: 'view_all'; query: string };

interface NavSearchProps {
  onNavigate?: () => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export const NavSearch: React.FC<NavSearchProps> = ({
  onNavigate,
  className = '',
  placeholder,
  autoFocus = false,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/search') {
      return new URLSearchParams(window.location.search).get('q') || '';
    }
    return '';
  });

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestionsResponse | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (location.pathname === '/search') {
      const urlQ = new URLSearchParams(location.search).get('q') || '';
      setQuery(urlQ);
    }
  }, [location.pathname, location.search]);

  const refreshRecentSearches = useCallback(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    refreshRecentSearches();
  }, [refreshRecentSearches]);

  useEffect(() => {
    const handleFocus = () => {
      clearSuggestionCache();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!trimmed) {
      setSuggestions(null);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    const cached = getCachedSuggestions(trimmed);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/plugins/suggestions', {
          params: { q: trimmed },
          signal: controller.signal,
        });
        setCachedSuggestions(trimmed, res.data);
        setSuggestions(res.data);
        setSelectedIndex(-1);
      } catch (err: any) {
        if (err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') {
          console.error('Failed to fetch search suggestions:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 160);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [query]);

  const flattenedItems = useMemo<FlattenedItem[]>(() => {
    const items: FlattenedItem[] = [];
    const trimmed = query.trim();

    if (!trimmed) {
      recentSearches.forEach((s) => {
        items.push({ kind: 'recent', query: s });
      });
      return items;
    }

    if (suggestions) {
      suggestions.plugins.forEach((plugin) => {
        items.push({ kind: 'plugin', plugin });
      });
      items.push({ kind: 'view_all', query: trimmed });
    }

    return items;
  }, [query, recentSearches, suggestions]);

  const executeSearch = useCallback(
    (searchTerm: string) => {
      const clean = searchTerm.trim();
      if (clean) {
        saveRecentSearch(clean);
        refreshRecentSearches();
        navigate(`/search?q=${encodeURIComponent(clean)}`);
      } else {
        navigate('/search');
      }
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      onNavigate?.();
    },
    [navigate, onNavigate, refreshRecentSearches]
  );

  const handleSelectItem = useCallback(
    (item: FlattenedItem) => {
      switch (item.kind) {
        case 'recent': {
          setQuery(item.query);
          executeSearch(item.query);
          break;
        }
        case 'plugin': {
          saveRecentSearch(item.plugin.name);
          refreshRecentSearches();
          navigate(getPluginUrl(item.plugin));
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          onNavigate?.();
          break;
        }
        case 'view_all': {
          executeSearch(item.query);
          break;
        }
      }
    },
    [executeSearch, navigate, onNavigate, refreshRecentSearches]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        refreshRecentSearches();
        return;
      }
      if (flattenedItems.length === 0) return;
      setSelectedIndex((prev) => (prev + 1 >= flattenedItems.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      if (flattenedItems.length === 0) return;
      setSelectedIndex((prev) => (prev <= 0 ? flattenedItems.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flattenedItems.length) {
        handleSelectItem(flattenedItems[selectedIndex]);
      } else {
        executeSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions(null);
    setSelectedIndex(-1);
    inputRef.current?.focus();
    if (location.pathname === '/search') {
      navigate('/search');
    }
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeRecentSearch(term);
    refreshRecentSearches();
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    refreshRecentSearches();
  };

  const hasSuggestions = Boolean(suggestions && suggestions.plugins.length > 0);

  const showRecentDropdown = isOpen && !query.trim() && recentSearches.length > 0;
  const showSuggestionsDropdown = isOpen && query.trim().length > 0;

  return (
    <div className={`sf-nav-search ${className}`} ref={containerRef} data-open={isOpen || undefined}>
      <label className="search">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          className="input"
          type="search"
          name="q"
          placeholder={placeholder || t('nav.search_placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            refreshRecentSearches();
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="nav-search-suggestions"
          role="combobox"
        />
      </label>

      <div className="sf-nav-search-end">
        {loading && <span className="loading" aria-label={t('search.loading_suggestions')} />}
        {query && (
          <button type="button" className="sf-icon-btn" onClick={handleClear} aria-label={t('search.clear_input')}>
            <X />
          </button>
        )}
      </div>

      {(showRecentDropdown || showSuggestionsDropdown) && (
        <div id="nav-search-suggestions" className="dropdown-list sf-suggest" role="listbox">
          {showRecentDropdown && (
            <>
              {recentSearches.map((term, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <div
                    key={`recent-${term}`}
                    onClick={() => handleSelectItem({ kind: 'recent', query: term })}
                    role="option"
                    aria-selected={isSelected}
                    data-active={isSelected || undefined}
                  >
                    <Clock />
                    <span className="sf-suggest-text">{term}</span>
                    <button
                      type="button"
                      className="sf-icon-btn"
                      onClick={(e) => handleRemoveRecent(e, term)}
                      aria-label={t('search.remove_recent', { term })}
                    >
                      <X />
                    </button>
                  </div>
                );
              })}
              <div className="sf-suggest-foot">
                <button type="button" className="button button-ghost button-sm" onClick={handleClearAllRecent}>
                  {t('search.clear_recent')}
                </button>
              </div>
            </>
          )}

          {showSuggestionsDropdown && (
            <>
              {loading && !suggestions && (
                <div className="sf-suggest-state">
                  <span className="loading" />
                  <span className="small">{t('common.loading')}</span>
                </div>
              )}

              {suggestions && !hasSuggestions && (
                <div className="sf-suggest-state">
                  <span className="h3">{t('search.no_suggestions')}</span>
                  <span className="small">{t('search.press_enter')}</span>
                </div>
              )}

              {suggestions && hasSuggestions && (
                <>
                  <div className="sf-suggest-head label">
                    <Package />
                    {t('search.plugins_title')}
                  </div>
                  {suggestions.plugins.map((plugin) => {
                    const itemIndex = flattenedItems.findIndex(
                      (it) => it.kind === 'plugin' && it.plugin.id === plugin.id
                    );
                    const isSelected = selectedIndex === itemIndex;

                    const isFree = plugin.type === 'free';
                    const isSale = plugin.sale_active && plugin.sale_discount_percent > 0;
                    const price = plugin.price_cents / 100;
                    const discountedPrice = isSale
                      ? (price * (1 - plugin.sale_discount_percent / 100)).toFixed(2)
                      : price.toFixed(2);

                    return (
                      <div
                        key={`plugin-${plugin.id}`}
                        onClick={() => handleSelectItem({ kind: 'plugin', plugin })}
                        role="option"
                        aria-selected={isSelected}
                        data-active={isSelected || undefined}
                      >
                        <span className="sf-suggest-thumb">
                          {plugin.preview_path ? (
                            <img src={plugin.preview_path} alt={plugin.name} />
                          ) : (
                            <span className="avatar">{plugin.name.charAt(0).toUpperCase()}</span>
                          )}
                        </span>

                        <span className="sf-suggest-main">
                          <span>
                            {plugin.name}
                            {plugin.is_preorder && <> <span className="tag tag-info">{t('plugin.pre_order')}</span></>}
                          </span>
                          <span className="small">
                            <Trans t={t} i18nKey="common.by_author" components={{ author: <span>{plugin.dev_name}</span> }} />
                            {plugin.category && <> · {plugin.category}</>}
                          </span>
                        </span>

                        {isFree ? (
                          <span className="cost cost-free">{t('plugin.free')}</span>
                        ) : isSale ? (
                          <span className="cost cost-sale">
                            <s>-{plugin.sale_discount_percent}%</s>€{discountedPrice}
                          </span>
                        ) : (
                          <span className="cost">€{price.toFixed(2)}</span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {query.trim() && (
                <div
                  className="sf-suggest-all"
                  onClick={() => handleSelectItem({ kind: 'view_all', query: query.trim() })}
                  role="option"
                  aria-selected={selectedIndex === flattenedItems.length - 1}
                  data-active={selectedIndex === flattenedItems.length - 1 || undefined}
                >
                  <Search />
                  <span className="sf-suggest-text">{t('search.view_all_results', { query: query.trim() })}</span>
                  <span className="kbd hide-sm"><CornerDownLeft size={11} /></span>
                  <ArrowRight />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NavSearch;
