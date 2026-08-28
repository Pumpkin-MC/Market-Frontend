import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  Clock,
  Package,
  ArrowRight,
  CornerDownLeft,
  Loader2,
} from 'lucide-react';
import api from '../api';
import { getPluginUrl } from '../utils/url';
import './NavSearch.css';

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
    // Ignore localStorage errors
  }
};

const removeRecentSearch = (term: string) => {
  try {
    const existing = getRecentSearches();
    const updated = existing.filter((s) => s.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore localStorage errors
  }
};

const clientSuggestionCache = new Map<string, SearchSuggestionsResponse>();
const MAX_CLIENT_CACHE = 100;

const getCachedSuggestions = (term: string): SearchSuggestionsResponse | undefined => {
  return clientSuggestionCache.get(term.toLowerCase());
};

const setCachedSuggestions = (term: string, data: SearchSuggestionsResponse) => {
  if (clientSuggestionCache.size >= MAX_CLIENT_CACHE) {
    const firstKey = clientSuggestionCache.keys().next().value;
    if (firstKey) clientSuggestionCache.delete(firstKey);
  }
  clientSuggestionCache.set(term.toLowerCase(), data);
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

  // Sync query with URL on /search page
  useEffect(() => {
    if (location.pathname === '/search') {
      const urlQ = new URLSearchParams(location.search).get('q') || '';
      setQuery(urlQ);
    }
  }, [location.pathname, location.search]);

  // Load recent searches on mount / open
  const refreshRecentSearches = useCallback(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    refreshRecentSearches();
  }, [refreshRecentSearches]);

  // Close dropdown when clicking outside
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

  // Fetch suggestions with instant in-memory client cache & debounced fallback
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

    // 1. Check client memory cache (0ms instant response on backspace / repeat)
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

  // Compute flattened navigable items
  const flattenedItems = useMemo<FlattenedItem[]>(() => {
    const items: FlattenedItem[] = [];
    const trimmed = query.trim();

    if (!trimmed) {
      // Show recent searches
      recentSearches.forEach((s) => {
        items.push({ kind: 'recent', query: s });
      });
      return items;
    }

    if (suggestions) {
      // Plugins
      suggestions.plugins.forEach((plugin) => {
        items.push({ kind: 'plugin', plugin });
      });
      // View all results
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
    <div className={`nav-search-container ${className}`} ref={containerRef}>
      <div className={`nav-search-input-wrap ${isOpen ? 'dropdown-active' : ''}`}>
        <Search size={16} className="nav-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
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

        <div className="nav-search-end-adornments">
          {loading && (
            <Loader2 size={15} className="nav-search-spinner" aria-label="Loading suggestions" />
          )}

          {query && (
            <button
              type="button"
              className="nav-search-clear"
              onClick={handleClear}
              aria-label="Clear search input"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions & Recent Searches Dropdown */}
      {(showRecentDropdown || showSuggestionsDropdown) && (
        <div
          id="nav-search-suggestions"
          className="nav-search-dropdown animate-fade-in"
          role="listbox"
        >
          {/* ── 1. Recent Searches View (Empty query) ── */}
          {showRecentDropdown && (
            <div className="nav-search-section">
              <div className="nav-search-section-header">
                <span className="nav-search-section-title">
                  <Clock size={13} />
                  {t('search.recent_title')}
                </span>
                <button
                  type="button"
                  className="nav-search-clear-recent-btn"
                  onClick={handleClearAllRecent}
                >
                  {t('search.clear_recent')}
                </button>
              </div>

              <div className="nav-search-recent-list">
                {recentSearches.map((term, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <div
                      key={`recent-${term}`}
                      className={`nav-search-item nav-search-recent-item ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => handleSelectItem({ kind: 'recent', query: term })}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <Clock size={14} className="nav-search-item-icon muted" />
                      <span className="nav-search-item-text">{term}</span>
                      <button
                        type="button"
                        className="nav-search-item-remove-btn"
                        onClick={(e) => handleRemoveRecent(e, term)}
                        aria-label={`Remove ${term} from recent searches`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 2. Live Search Suggestions View ── */}
          {showSuggestionsDropdown && (
            <>
              {loading && !suggestions && (
                <div className="nav-search-loading-state">
                  <Loader2 size={18} className="nav-search-spinner" />
                  <span>{t('common.loading')}</span>
                </div>
              )}

              {suggestions && !hasSuggestions && (
                <div className="nav-search-empty-state">
                  <p className="nav-search-empty-title">{t('search.no_suggestions')}</p>
                  <p className="nav-search-empty-hint">{t('search.press_enter')}</p>
                </div>
              )}

              {suggestions && hasSuggestions && (
                <div className="nav-search-results-list">
                  {/* Plugin matches */}
                  <div className="nav-search-section">
                    <div className="nav-search-section-header">
                      <span className="nav-search-section-title">
                        <Package size={13} />
                        {t('search.plugins_title')}
                      </span>
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
                          className={`nav-search-item nav-search-plugin-item ${
                            isSelected ? 'selected' : ''
                          }`}
                          onClick={() => handleSelectItem({ kind: 'plugin', plugin })}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="nav-search-plugin-thumb">
                            {plugin.preview_path ? (
                              <img src={plugin.preview_path} alt={plugin.name} />
                            ) : (
                              <div className="nav-search-thumb-fallback">
                                {plugin.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="nav-search-plugin-info">
                            <div className="nav-search-plugin-title-row">
                              <span className="nav-search-plugin-name">
                                {plugin.name}
                              </span>
                              {plugin.is_preorder && (
                                <span className="nav-search-pill preorder">
                                  {t('plugin.pre_order')}
                                </span>
                              )}
                            </div>
                            <div className="nav-search-plugin-meta">
                              <span className="nav-search-plugin-dev">
                                by {plugin.dev_name}
                              </span>
                              {plugin.category && (
                                <>
                                  <span className="nav-search-meta-dot">·</span>
                                  <span className="nav-search-plugin-cat">{plugin.category}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="nav-search-plugin-pricing">
                            {isFree ? (
                              <span className="nav-search-price-badge free">
                                {t('plugin.free')}
                              </span>
                            ) : isSale ? (
                              <div className="nav-search-sale-wrap">
                                <span className="nav-search-sale-discount">
                                  -{plugin.sale_discount_percent}%
                                </span>
                                <span className="nav-search-price-badge paid">
                                  €{discountedPrice}
                                </span>
                              </div>
                            ) : (
                              <span className="nav-search-price-badge paid">
                                €{price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View All Results Footer */}
              {query.trim() && (
                <div
                  className={`nav-search-view-all-footer ${
                    selectedIndex === flattenedItems.length - 1 ? 'selected' : ''
                  }`}
                  onClick={() => handleSelectItem({ kind: 'view_all', query: query.trim() })}
                  role="option"
                  aria-selected={selectedIndex === flattenedItems.length - 1}
                >
                  <div className="nav-search-view-all-left">
                    <Search size={14} className="nav-search-view-all-icon" />
                    <span>
                      {t('search.view_all_results', { query: query.trim() })}
                    </span>
                  </div>
                  <div className="nav-search-view-all-right">
                    <span className="nav-search-key-hint">
                      <CornerDownLeft size={11} /> Enter
                    </span>
                    <ArrowRight size={14} className="nav-search-view-all-arrow" />
                  </div>
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
