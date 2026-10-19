import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';
import {
  PUMPKIN_SERVER_PROFILES,
  KNOWN_PLUGIN_API_VERSIONS,
  evaluatePluginForServer,
  getSavedServerProfileId,
  setSavedServerProfileId,
  hydratePluginsVersionHistory,
} from '../utils/compatibility';
import { Layers, Cpu } from 'lucide-react';

const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialType = searchParams.get('type') || '';
  const initialMinPrice = searchParams.get('min_price') || '';
  const initialMaxPrice = searchParams.get('max_price') || '';
  const initialPumpkin = searchParams.get('pumpkin') || getSavedServerProfileId() || '';
  const initialApi = searchParams.get('api') || '';

  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydratingCompat, setHydratingCompat] = useState(false);
  const [compatRevision, setCompatRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState(initialType);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [pumpkinVersion, setPumpkinVersion] = useState(initialPumpkin);
  const [apiVersion, setApiVersion] = useState(initialApi);

  const handlePumpkinVersionChange = (val: string) => {
    setPumpkinVersion(val);
    setSavedServerProfileId(val);
  };

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
        const list = Array.isArray(response.data) ? response.data : (response.data?.items || []);
        setPlugins(list);
      } catch (err: any) {
        console.error('Error fetching plugins:', err);
        setError('Failed to load plugins. Please try again.');
        setPlugins([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();
  }, [searchQuery, sort, category, type, minPrice, maxPrice]);

  // Update URL params when filters change
  useEffect(() => {
    const newParams: any = {};
    if (searchQuery) newParams.q = searchQuery;
    if (sort) newParams.sort = sort;
    if (category) newParams.category = category;
    if (type) newParams.type = type;
    if (minPrice) newParams.min_price = minPrice;
    if (maxPrice) newParams.max_price = maxPrice;
    if (pumpkinVersion) newParams.pumpkin = pumpkinVersion;
    if (apiVersion) newParams.api = apiVersion;
    setSearchParams(newParams, { replace: true });
  }, [searchQuery, sort, category, type, minPrice, maxPrice, pumpkinVersion, apiVersion, setSearchParams]);

  // Hydrate full version history when filtering by server/API compatibility so older releases are matched accurately
  useEffect(() => {
    if ((!pumpkinVersion && !apiVersion) || plugins.length === 0) return;
    let cancelled = false;
    setHydratingCompat(true);
    hydratePluginsVersionHistory(plugins, async (idOrPublicId) => {
      const res = await api.get(`/plugins/${idOrPublicId}`);
      return res.data;
    })
      .then(() => {
        if (!cancelled) {
          setCompatRevision((r) => r + 1);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydratingCompat(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pumpkinVersion, apiVersion, plugins]);

  const filteredPlugins = useMemo(() => {
    if (!pumpkinVersion && !apiVersion) return plugins;
    return plugins.filter((plugin) => {
      const match = evaluatePluginForServer(plugin, pumpkinVersion, apiVersion);
      return match.compatible;
    });
  }, [plugins, pumpkinVersion, apiVersion, compatRevision]);

  return (
    <div className="container">
      <SEO 
        title={searchQuery ? `${searchQuery} - Plugins` : "All Plugins"}
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
              handlePumpkinVersionChange('');
              setApiVersion('');
            }}>Clear All</button>
          </div>

          <div className="filter-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={14} color="var(--primary)" />
              Your Pumpkin Server
            </label>
            <select
              aria-label="Your Pumpkin Server"
              value={pumpkinVersion}
              onChange={e => handlePumpkinVersionChange(e.target.value)}
            >
              <option value="">All Server Versions</option>
              {PUMPKIN_SERVER_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.shortLabel}
                </option>
              ))}
            </select>
            {pumpkinVersion && (
              <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {PUMPKIN_SERVER_PROFILES.find(p => p.id === pumpkinVersion)?.description}
              </span>
            )}
          </div>

          <div className="filter-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cpu size={14} color="#38bdf8" />
              Plugin API (WIT)
            </label>
            <select
              aria-label="Plugin API (WIT)"
              value={apiVersion}
              onChange={e => setApiVersion(e.target.value)}
            >
              <option value="">All API Versions</option>
              {KNOWN_PLUGIN_API_VERSIONS.map((av) => (
                <option key={av} value={av}>
                  WIT API v{av}
                </option>
              ))}
            </select>
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
                id="searchMinPrice"
                name="minPrice"
                type="number" 
                inputMode="decimal"
                autoComplete="off"
                placeholder="Min" 
                value={minPrice} 
                onChange={e => setMinPrice(e.target.value)}
              />
              <span>-</span>
              <input 
                id="searchMaxPrice"
                name="maxPrice"
                type="number" 
                inputMode="decimal"
                autoComplete="off"
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
              <span>All</span> Plugins
              <small className="results-count">
                ({filteredPlugins.length} compatible{hydratingCompat ? ' • checking release history…' : ''})
              </small>
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
              {filteredPlugins.length > 0 ? (
                filteredPlugins.map((plugin) => (
                  <PluginCard key={plugin.id} plugin={plugin} selectedServer={pumpkinVersion} />
                ))
              ) : (
                <div className="empty-state">
                  <p>
                    {searchQuery || pumpkinVersion || apiVersion
                      ? `No plugins found matching your selected server version and filters.`
                      : 'No plugins available with these filters.'
                    }
                  </p>
                  <button className="btn btn-secondary" onClick={() => {
                    setCategory('');
                    setType('');
                    setMinPrice('');
                    setMaxPrice('');
                    handlePumpkinVersionChange('');
                    setApiVersion('');
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