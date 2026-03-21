import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('');

  // Fetch ALL plugins whenever sort changes — no search filter sent to API
  useEffect(() => {
    const fetchPlugins = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/plugins', {
          params: { sort: sort || undefined },
        });
        setPlugins(response.data);
      } catch (err: any) {
        console.error('Error fetching plugins:', err);
        setError('Failed to load plugins. Please try again.');
        setPlugins([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();
  }, [sort]);

  // Client-side filter by search query
  const getDescription = (plugin: any): string => {
    try {
      const descriptions = JSON.parse(plugin.translated_descriptions || '{}');
      return descriptions['en-US'] || descriptions.en || Object.values(descriptions)[0] as string || '';
    } catch {
      return '';
    }
  };

  const visiblePlugins = searchQuery.trim()
    ? plugins.filter(p => {
        const q = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.dev_name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.keywords?.toLowerCase().includes(q) ||
          getDescription(p).toLowerCase().includes(q)
        );
      })
    : plugins;

  return (
    <div className="container">
      <h1 className="section-title">
        {searchQuery
          ? <>Search Results <span>for "{searchQuery}"</span></>
          : 'All Plugins'
        }
      </h1>

      <div className="search-controls">
        <label htmlFor="sort-by">Sort by:</label>
        <select id="sort-by" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Relevance</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p>Loading results...</p>
      ) : (
        <div className="plugin-grid">
          {visiblePlugins.length > 0 ? (
            visiblePlugins.map((plugin) => (
              <Link to={`/plugin/${plugin.id}`} key={plugin.id} className="plugin-card-link">
                <div className="plugin-card">
                  <div className="plugin-card-header">
                    <div
                      className="plugin-icon"
                      style={{ backgroundImage: plugin.preview_path ? `url(${plugin.preview_path})` : 'none' }}
                    >
                      {!plugin.preview_path && plugin.name.charAt(0)}
                    </div>
                    <div>
                      <h3>{plugin.name}</h3>
                      <p className="dev-name">by {plugin.dev_name}</p>
                    </div>
                  </div>
                  <p>
                    {(() => {
                      const desc = getDescription(plugin);
                      return desc.length > 100 ? desc.substring(0, 100) + '…' : desc || 'No description provided.';
                    })()}
                  </p>
                  <div className="card-footer">
                    <span className="plugin-category">{plugin.category}</span>
                    <span className={`badge badge-${plugin.type}`}>
                      {plugin.type === 'paid' ? `$${plugin.price}` : plugin.type}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <p>
                {searchQuery
                  ? `No plugins found for "${searchQuery}". Try a different search term!`
                  : 'No plugins available yet.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;