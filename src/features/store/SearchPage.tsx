import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';
import api from '../../lib/api';
import SEO from '../../components/SEO';
import PluginCard from '../../components/PluginCard';
import { Select } from '../../components/Select';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import '../../styles/store.css';

const PAGE_SIZE = 24;

const readPage = (res: any) => {
  const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
  return {
    items,
    more: res.data?.has_more ?? (res.headers?.['x-has-more'] === 'true' || items.length === PAGE_SIZE),
  };
};

const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialType = searchParams.get('type') || '';
  const initialMinPrice = searchParams.get('min_price') || '';
  const initialMaxPrice = searchParams.get('max_price') || '';

  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const request = useRef(0);

  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState(initialType);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);

  const filters = useMemo(() => ({
    q: searchQuery || undefined,
    sort: sort || undefined,
    category: category || undefined,
    type: type || undefined,
    min_price: minPrice ? parseInt(minPrice) * 100 : undefined,
    max_price: maxPrice ? parseInt(maxPrice) * 100 : undefined,
    paginated: true,
    limit: PAGE_SIZE,
  }), [searchQuery, sort, category, type, minPrice, maxPrice]);

  useEffect(() => {
    const fetchPlugins = async () => {
      const id = ++request.current;
      setLoading(true);
      setError(null);
      setMoreFailed(false);
      try {
        const page = readPage(await api.get('/plugins', { params: filters }));
        if (id !== request.current) return;
        setPlugins(page.items);
        setHasMore(page.more && page.items.length > 0);
      } catch (err: any) {
        if (id !== request.current) return;
        console.error('Error fetching plugins:', err);
        setError('Failed to load plugins. Please try again.');
        setPlugins([]);
        setHasMore(false);
      } finally {
        if (id === request.current) setLoading(false);
      }
    };

    fetchPlugins();

    const newParams: any = {};
    if (searchQuery) newParams.q = searchQuery;
    if (sort) newParams.sort = sort;
    if (category) newParams.category = category;
    if (type) newParams.type = type;
    if (minPrice) newParams.min_price = minPrice;
    if (maxPrice) newParams.max_price = maxPrice;
    setSearchParams(newParams, { replace: true });

  }, [filters, searchQuery, sort, category, type, minPrice, maxPrice, setSearchParams]);

  const loadMore = async () => {
    const id = request.current;
    setLoadingMore(true);
    try {
      const page = readPage(await api.get('/plugins', { params: { ...filters, offset: plugins.length } }));
      if (id !== request.current) return;
      setPlugins(prev => {
        const seen = new Set(prev.map((p: any) => p.id));
        return [...prev, ...page.items.filter((p: any) => !seen.has(p.id))];
      });
      setHasMore(page.more && page.items.length > 0);
    } catch (err) {
      if (id !== request.current) return;
      console.error('Failed to load more plugins:', err);
      setMoreFailed(true);
    } finally {
      if (id === request.current) setLoadingMore(false);
    }
  };

  const sentinel = useInfiniteScroll(loadMore, hasMore && !loading && !loadingMore && !moreFailed);

  const clearFilters = () => {
    setCategory('');
    setType('');
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <div className="page sf-search-layout">
      <SEO
        title={searchQuery ? `${searchQuery} - Plugins` : "All Plugins"}
        description={`Browse our collection of Minecraft plugins. ${searchQuery ? `Showing results for ${searchQuery}.` : ''}`}
      />

      <aside className="panel sf-filters">
        <div className="panel-head">
          <h2 className="h3">Filters</h2>
          <button className="button button-ghost button-sm" onClick={clearFilters}>Clear All</button>
        </div>
        <div className="panel-body fields">
          <label className="field">
            <span className="field-label" id="sf-filter-category">Category</span>
            <Select
              options={[{ value: '', label: 'All Categories' }, ...PLUGIN_CATEGORIES]}
              value={category}
              onChange={setCategory}
              aria-labelledby="sf-filter-category"
            />
          </label>

          <label className="field">
            <span className="field-label" id="sf-filter-type">License Type</span>
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'free', label: 'Free' },
                { value: 'paid', label: 'Paid' },
                { value: 'adwall', label: 'Adwall' },
              ]}
              value={type}
              onChange={setType}
              aria-labelledby="sf-filter-type"
            />
          </label>

          <div className="field">
            <span className="field-label">Price Range ($)</span>
            <div className="sf-range">
              <span className="control">
                <input
                  id="searchMinPrice"
                  name="minPrice"
                  className="input num"
                  type="number"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Min"
                  aria-label="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                />
              </span>
              <span className="muted">-</span>
              <span className="control">
                <input
                  id="searchMaxPrice"
                  name="maxPrice"
                  className="input num"
                  type="number"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Max"
                  aria-label="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                />
              </span>
            </div>
          </div>
        </div>
      </aside>

      <section className="sect">
        <div className="row sf-results-head">
          <div className="stack">
            <h1 className="display-2"><span className="mark">All</span> Plugins</h1>
            <span className="label">({plugins.length}{hasMore ? '+' : ''} found)</span>
          </div>
          <span className="spacer" />
          <label className="field sf-sort">
            <span className="field-label" id="sort-by">Sort by:</span>
            <Select
              options={[
                { value: '', label: 'Newest' },
                { value: 'downloads', label: 'Most Popular' },
                { value: 'name-asc', label: 'Name (A-Z)' },
                { value: 'name-desc', label: 'Name (Z-A)' },
                { value: 'price-asc', label: 'Price (Low to High)' },
                { value: 'price-desc', label: 'Price (High to Low)' },
              ]}
              value={sort}
              onChange={setSort}
              aria-labelledby="sort-by"
            />
          </label>
        </div>

        {error && (
          <div className="notice notice-danger">
            <span className="mark-box mark-box-danger"><CircleAlert /></span>
            <p className="notice-text">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="sf-loader">
            <span className="loading" />
            <p className="small">Searching market...</p>
          </div>
        ) : plugins.length > 0 ? (
          <>
            <div className="catalogue">
              {plugins.map((plugin) => (
                <PluginCard key={plugin.id} plugin={plugin} />
              ))}
            </div>
            <div ref={sentinel} className="sf-sentinel" />
            {loadingMore && (
              <div className="row sf-more">
                <span className="loading" />
                <span className="small">Loading more plugins...</span>
              </div>
            )}
            {moreFailed && (
              <div className="row sf-more">
                <button className="button" onClick={() => setMoreFailed(false)}>Retry</button>
              </div>
            )}
          </>
        ) : (
          <div className="blank">
            <p className="h2">
              {searchQuery
                ? `No plugins found matching your search and filters.`
                : 'No plugins available with these filters.'
              }
            </p>
            <button className="button" onClick={clearFilters}>Clear Filters</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default SearchPage;