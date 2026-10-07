import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  RotateCcw,
  ChevronDown,
  Package,
} from 'lucide-react';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';

const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

const SORT_OPTIONS = [
  { value: '', label: 'Newest' },
  { value: 'downloads', label: 'Most Popular' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
];

const LICENSE_TYPES = [
  { value: '', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'adwall', label: 'Adwall' },
];

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || '';
  const category = searchParams.get('category') || '';
  const type = searchParams.get('type') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setMinPriceInput(minPrice);
  }, [minPrice]);

  useEffect(() => {
    setMaxPriceInput(maxPrice);
  }, [maxPrice]);

  const updateFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '') {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchTerm.trim() });
  };

  const handleClearAll = () => {
    setSearchTerm('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams({}, { replace: true });
  };

  const handleApplyPrice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateFilters({
      min_price: minPriceInput ? String(Math.max(0, parseInt(minPriceInput, 10) || 0)) : '',
      max_price: maxPriceInput ? String(Math.max(0, parseInt(maxPriceInput, 10) || 0)) : '',
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count += 1;
    if (category) count += 1;
    if (type) count += 1;
    if (minPrice || maxPrice) count += 1;
    if (sort) count += 1;
    return count;
  }, [searchQuery, category, type, minPrice, maxPrice, sort]);

  useEffect(() => {
    const fetchPlugins = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          q: searchQuery || undefined,
          sort: sort || undefined,
          category: category || undefined,
          type: type || undefined,
          min_price: minPrice ? parseInt(minPrice, 10) * 100 : undefined,
          max_price: maxPrice ? parseInt(maxPrice, 10) * 100 : undefined,
        };
        const response = await api.get('/plugins', { params });
        setPlugins(Array.isArray(response.data) ? response.data : []);
      } catch (err: any) {
        setError('Failed to load plugins. Please try again.');
        setPlugins([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();
  }, [searchQuery, sort, category, type, minPrice, maxPrice]);

  return (
    <div className="container search-container">
      <SEO
        title={searchQuery ? `${searchQuery} - Search Plugins` : 'Search Plugins'}
        description={`Browse and search Minecraft WebAssembly plugins for PumpkinMC. ${searchQuery ? `Showing results for ${searchQuery}.` : ''}`}
      />

      <div className="search-hero-bar">
        <form onSubmit={handleSearchSubmit} className="search-input-form">
          <Search size={18} className="search-input-icon" />
          <input
            id="searchInputField"
            name="searchQuery"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plugins by name, developer, category..."
            className="search-input-field"
            autoComplete="off"
          />
          {searchTerm && (
            <button
              type="button"
              className="search-input-clear-btn"
              onClick={() => {
                setSearchTerm('');
                updateFilters({ q: '' });
              }}
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}
          <button type="submit" className="search-submit-btn">
            Search
          </button>
        </form>
      </div>

      <div className="search-header-bar">
        <div className="search-title-group">
          <h1 className="search-title">
            {searchQuery ? (
              <>
                Results for <span className="hl-tag">&ldquo;{searchQuery}&rdquo;</span>
              </>
            ) : (
              <>
                Explore <span className="hl-tag">Plugins</span>
              </>
            )}
          </h1>
          <span className="search-count-badge">
            {plugins.length} {plugins.length === 1 ? 'plugin' : 'plugins'} found
          </span>
        </div>

        <div className="search-toolbar-actions">
          <button
            type="button"
            className={`search-mobile-filter-btn ${isMobileFilterOpen || activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setIsMobileFilterOpen((prev) => !prev)}
            aria-label="Toggle filter sidebar"
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="search-filter-badge">{activeFilterCount}</span>
            )}
          </button>

          <div className="search-sort-group">
            <label htmlFor="search-sort-select">Sort by:</label>
            <div className="search-select-wrapper">
              <select
                id="search-sort-select"
                value={sort}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="search-sort-select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="search-select-chevron" />
            </div>
          </div>

          <div className="search-view-toggle">
            <button
              type="button"
              className={`search-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`search-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="search-active-pills-row">
          <span className="search-active-label">Active:</span>
          {searchQuery && (
            <span className="search-pill">
              Query: &ldquo;{searchQuery}&rdquo;
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  updateFilters({ q: '' });
                }}
              >
                &times;
              </button>
            </span>
          )}
          {category && (
            <span className="search-pill">
              Category: {category}
              <button type="button" onClick={() => updateFilters({ category: '' })}>
                &times;
              </button>
            </span>
          )}
          {type && (
            <span className="search-pill">
              License: {type.toUpperCase()}
              <button type="button" onClick={() => updateFilters({ type: '' })}>
                &times;
              </button>
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span className="search-pill">
              Price: €{minPrice || 0} - €{maxPrice || '∞'}
              <button
                type="button"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                  updateFilters({ min_price: '', max_price: '' });
                }}
              >
                &times;
              </button>
            </span>
          )}
          {sort && (
            <span className="search-pill">
              Sort: {SORT_OPTIONS.find((s) => s.value === sort)?.label || sort}
              <button type="button" onClick={() => updateFilters({ sort: '' })}>
                &times;
              </button>
            </span>
          )}
          <button type="button" className="search-clear-all-pill" onClick={handleClearAll}>
            Clear all ({activeFilterCount})
          </button>
        </div>
      )}

      <div className="search-page-layout">
        <aside className={`search-sidebar ${isMobileFilterOpen ? 'mobile-open' : ''}`}>
          <div className="filter-section">
            <h3 className="filter-title">Filters</h3>
            {activeFilterCount > 0 ? (
              <button type="button" className="btn-text-only" onClick={handleClearAll}>
                Clear All
              </button>
            ) : null}
            {isMobileFilterOpen && (
              <button
                type="button"
                className="search-mobile-close-btn"
                onClick={() => setIsMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="filter-group">
            <label htmlFor="searchCategorySelect">Category</label>
            <div className="search-select-wrapper">
              <select
                id="searchCategorySelect"
                value={category}
                onChange={(e) => updateFilters({ category: e.target.value })}
              >
                <option value="">All Categories</option>
                {PLUGIN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="search-select-chevron" />
            </div>
          </div>

          <div className="filter-group">
            <label>License Type</label>
            <div className="search-type-pills">
              {LICENSE_TYPES.map((lt) => (
                <button
                  key={lt.value}
                  type="button"
                  className={`search-type-pill ${type === lt.value ? 'active' : ''}`}
                  onClick={() => updateFilters({ type: lt.value })}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Price Range (€)</label>
            <form onSubmit={handleApplyPrice} className="price-range-form">
              <div className="price-range-inputs">
                <div className="price-input-wrapper">
                  <span className="price-currency">€</span>
                  <input
                    id="searchMinPrice"
                    name="minPrice"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                  />
                </div>
                <span className="price-sep">-</span>
                <div className="price-input-wrapper">
                  <span className="price-currency">€</span>
                  <input
                    id="searchMaxPrice"
                    name="maxPrice"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="price-apply-btn">
                Apply Price
              </button>
            </form>
          </div>

          {isMobileFilterOpen && (
            <div className="search-mobile-apply-row">
              <button
                type="button"
                className="search-mobile-apply-btn"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                View {plugins.length} Results
              </button>
            </div>
          )}
        </aside>

        {isMobileFilterOpen && (
          <div className="search-backdrop" onClick={() => setIsMobileFilterOpen(false)} />
        )}

        <main className="search-main">
          {error && (
            <div className="search-error-card">
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  updateFilters({});
                }}
              >
                <RotateCcw size={14} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {loading ? (
            <div
              className={
                viewMode === 'grid' ? 'plugin-grid search-grid' : 'home-plugin-list search-list'
              }
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className={
                    viewMode === 'grid'
                      ? 'plugin-card-skeleton shimmer'
                      : 'plugin-list-skeleton shimmer'
                  }
                >
                  <div className="skeleton-thumb" />
                  <div className="skeleton-content">
                    <div className="skeleton-bar title" />
                    <div className="skeleton-bar subtitle" />
                    <div className="skeleton-bar text" />
                  </div>
                </div>
              ))}
            </div>
          ) : plugins.length > 0 ? (
            <div
              className={
                viewMode === 'grid' ? 'plugin-grid search-grid' : 'home-plugin-list search-list'
              }
            >
              {plugins.map((plugin) => (
                <PluginCard key={plugin.id} plugin={plugin} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <div className="search-empty-state">
              <div className="search-empty-icon">
                <Package size={36} />
              </div>
              <h2 className="search-empty-title">No plugins found</h2>
              <p className="search-empty-text">
                {searchQuery
                  ? `No plugins matched "${searchQuery}" with current filters.`
                  : 'No plugins match the selected criteria.'}
              </p>
              <button
                type="button"
                className="search-empty-action-btn"
                onClick={handleClearAll}
              >
                Clear all filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResultsPage;