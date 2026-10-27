import { useState, useEffect, useMemo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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

const PLUGIN_CATEGORIES = [
  { value: 'Admin Tools', label: 'developer.categories.admin_tools' },
  { value: 'Economy', label: 'developer.categories.economy' },
  { value: 'Fun', label: 'developer.categories.fun' },
  { value: 'World Management', label: 'developer.categories.world_management' },
  { value: 'Utilities', label: 'developer.categories.utilities' },
  { value: 'Chat', label: 'developer.categories.chat' },
  { value: 'Other', label: 'developer.categories.other' },
] as const;

const SearchPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialType = searchParams.get('type') || '';
  const initialMinPrice = searchParams.get('min_price') || '';
  const initialMaxPrice = searchParams.get('max_price') || '';

  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
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
      setLoadFailed(false);
      setMoreFailed(false);
      setLoadingMore(false);
      try {
        const page = readPage(await api.get('/plugins', { params: filters }));
        if (id !== request.current) return;
        setPlugins(page.items);
        setHasMore(page.more && page.items.length > 0);
      } catch (err: any) {
        if (id !== request.current) return;
        console.error('Error fetching plugins:', err);
        setLoadFailed(true);
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
        title={searchQuery ? t('search.page_title', { query: searchQuery }) : t('home.all_plugins')}
        description={searchQuery ? t('search.results_description', { query: searchQuery }) : t('search.page_description')}
      />

      <aside className="panel sf-filters">
        <div className="panel-head">
          <h2 className="h3">{t('search.filters')}</h2>
          <button className="button button-ghost button-sm" onClick={clearFilters}>{t('search.clear_all')}</button>
        </div>
        <div className="panel-body fields">
          <label className="field">
            <span className="field-label" id="sf-filter-category">{t('plugin.category')}</span>
            <Select
              options={[{ value: '', label: t('home.filter_all') }, ...PLUGIN_CATEGORIES.map(option => ({ ...option, label: t(option.label) }))]}
              value={category}
              onChange={setCategory}
              aria-labelledby="sf-filter-category"
            />
          </label>

          <label className="field">
            <span className="field-label" id="sf-filter-type">{t('search.license_type')}</span>
            <Select
              options={[
                { value: '', label: t('search.all_types') },
                { value: 'free', label: t('plugin.free') },
                { value: 'paid', label: t('developer.upload.price_paid') },
                { value: 'adwall', label: t('search.adwall') },
              ]}
              value={type}
              onChange={setType}
              aria-labelledby="sf-filter-type"
            />
          </label>

          <div className="field">
            <span className="field-label">{t('search.price_range')}</span>
            <div className="sf-range">
              <span className="control">
                <input
                  id="searchMinPrice"
                  name="minPrice"
                  className="input num"
                  type="number"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={t('search.min_price')}
                  aria-label={t('search.min_price')}
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
                  placeholder={t('search.max_price')}
                  aria-label={t('search.max_price')}
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
            <h1 className="display-2"><Trans t={t} i18nKey="search.results_title" components={{ highlight: <span className="mark" /> }} /></h1>
            <span className="label">{t('search.results_count', { total: plugins.length, more: hasMore ? '+' : '' })}</span>
          </div>
          <span className="spacer" />
          <label className="field sf-sort">
            <span className="field-label" id="sort-by">{t('search.sort_by')}</span>
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

        {loadFailed && (
          <div className="notice notice-danger">
            <span className="mark-box mark-box-danger"><CircleAlert /></span>
            <p className="notice-text">{t('search.load_failed')}</p>
          </div>
        )}

        {loading ? (
          <div className="sf-loader">
            <span className="loading" />
            <p className="small">{t('search.searching')}</p>
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
                <span className="small">{t('home.loading_more')}</span>
              </div>
            )}
            {moreFailed && (
              <div className="row sf-more">
                <button className="button" onClick={() => setMoreFailed(false)}>{t('common.retry')}</button>
              </div>
            )}
          </>
        ) : (
          <div className="blank">
            <p className="h2">
              {searchQuery
                ? t('search.no_matches')
                : t('search.no_plugins')
              }
            </p>
            <button className="button" onClick={clearFilters}>{t('search.clear_filters')}</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default SearchPage;
