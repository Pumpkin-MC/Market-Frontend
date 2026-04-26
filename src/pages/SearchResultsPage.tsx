import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';

const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialType = searchParams.get('type') || '';
  const initialMinPrice = searchParams.get('min_price') || '';
  const initialMaxPrice = searchParams.get('max_price') || '';

  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState(initialType);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);

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
          min_price: minPrice ? parseInt(minPrice) * 100 : undefined,
          max_price: maxPrice ? parseInt(maxPrice) * 100 : undefined,
        };
        const response = await api.get('/plugins', { params });
        setPlugins(Array.isArray(response.data) ? response.data : []);
      } catch (err: any) {
        console.error('Error fetching plugins:', err);
        setError('Failed to load plugins. Please try again.');
        setPlugins([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();

    // Update URL params
    const newParams: any = {};
    if (searchQuery) newParams.q = searchQuery;
    if (sort) newParams.sort = sort;
    if (category) newParams.category = category;
    if (type) newParams.type = type;
    if (minPrice) newParams.min_price = minPrice;
    if (maxPrice) newParams.max_price = maxPrice;
    setSearchParams(newParams, { replace: true });

  }, [searchQuery, sort, category, type, minPrice, maxPrice, setSearchParams]);

  return (
    <div className="container">
      <SEO 
        title={searchQuery ? `Search results for "${searchQuery}"` : "All Plugins"}
        description={`Browse our collection of Minecraft plugins. ${searchQuery ? `Showing results for ${searchQuery}.` : ''}`}
      />
      
      <div className="search-page-layout">
        <aside className="search-sidebar">
          <div className="filter-section">
            <h3 className="filter-title">Filters</h3>
            <button className="btn-text-only" onClick={() => {
              setCategory('');
              setType('');
              setMinPrice('');
              setMaxPrice('');
            }}>Clear All</button>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {PLUGIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>License Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="">All Types</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="adwall">Adwall</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Price Range ($)</label>
            <div className="price-range-inputs">
              <input 
                type="number" 
                placeholder="Min" 
                value={minPrice} 
                onChange={e => setMinPrice(e.target.value)}
              />
              <span>-</span>
              <input 
                type="number" 
                placeholder="Max" 
                value={maxPrice} 
                onChange={e => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
        </aside>

        <main className="search-main">
          <div className="search-header">
            <h1 className="search-title">
              {searchQuery
                ? <>Results <span>for "{searchQuery}"</span></>
                : 'All Plugins'
              }
              <small className="results-count">({plugins.length} found)</small>
            </h1>

            <div className="search-controls">
              <label htmlFor="sort-by">Sort by:</label>
              <select id="sort-by" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">Newest</option>
                <option value="downloads">Most Popular</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
              </select>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Searching market...</p>
            </div>
          ) : (
            <div className="plugin-grid search-grid">
              {plugins.length > 0 ? (
                plugins.map((plugin) => (
                  <PluginCard key={plugin.id} plugin={plugin} />
                ))
              ) : (
                <div className="empty-state">
                  <p>
                    {searchQuery
                      ? `No plugins found for "${searchQuery}" with these filters.`
                      : 'No plugins available with these filters.'
                    }
                  </p>
                  <button className="btn btn-secondary" onClick={() => {
                    setCategory('');
                    setType('');
                    setMinPrice('');
                    setMaxPrice('');
                  }}>Clear Filters</button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResultsPage;