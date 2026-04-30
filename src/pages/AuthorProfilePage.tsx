import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const AuthorProfilePage = () => {
  const { username } = useParams();
  const { i18n } = useTranslation();
  const [author, setAuthor] = useState<any>(null);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Fetch author public info
    api.get(`/user/public/${username}`)
      .then(res => {
        setAuthor(res.data);
        // Fetch author plugins
        return api.get('/plugins', { params: { dev_name: username, sort: 'newest' } });
      })
      .then(res => {
        setPlugins(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError('User not found or failed to load plugins.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [username]);

  const getDescription = (translatedStr: string) => {
    try {
      const data = JSON.parse(translatedStr);
      const currentLang = i18n.language.split('-')[0];
      return data[currentLang] || data.en || Object.values(data)[0] || 'No description available.';
    } catch {
      return 'No description available.';
    }
  };

  const getAccentColor = (name: string) => {
    const colors = [
      '#4f7eff', '#ff6b6b', '#ffd166', '#06d6a0',
      '#a855f7', '#f97316', '#06b6d4', '#ec4899',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getEffectivePrice = (plugin: any): { display: string; isSale: boolean; originalDisplay: string } => {
    const base = plugin.price_cents ?? 0;
    const saleActive = plugin.sale_active && plugin.sale_discount_percent > 0;
    if (saleActive) {
      const saleCents = Math.round(base * (1 - plugin.sale_discount_percent / 100));
      return {
        display: `€${(saleCents / 100).toFixed(2)}`,
        isSale: true,
        originalDisplay: `€${(base / 100).toFixed(2)}`,
      };
    }
    return {
      display: `€${(base / 100).toFixed(2)}`,
      isSale: false,
      originalDisplay: '',
    };
  };

  if (loading) return <div className="container"><h2>LOADING...</h2></div>;
  if (error || !author) return <div className="container"><h2>{error || 'User not found'}</h2></div>;

  return (
    <div className="container">
      <SEO 
        title={`${author.username}'s Profile`} 
        description={`Check out all Minecraft plugins created by ${author.username} on Pumpkin Market.`} 
      />
      
      <div className="profile-header-v2" style={{
        background: 'var(--mp-surface, #16191f)',
        padding: '3rem 2rem',
        borderRadius: '16px',
        marginBottom: '3rem',
        border: '1px solid var(--mp-border, rgba(255,255,255,0.07))',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem'
      }}>
        <div className="author-avatar-large" style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${getAccentColor(author.username)} 0%, #0d0f12 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'white'
        }}>
          {author.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{author.username}</h1>
          <p style={{ color: 'var(--mp-text-3, #5a6070)', margin: '0.5rem 0 0' }}>
            Member since {author.created_at ? new Date(author.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'N/A'}
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <div className="stat-pill" style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <strong>{plugins.length}</strong> Plugins Published
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ marginBottom: '1.5rem' }}>Plugins by {author.username}</h2>
      
      <div className="home-plugin-grid">
        {plugins.map((plugin) => {
          const accent = getAccentColor(plugin.name);
          const desc = getDescription(plugin.translated_descriptions);
          const initial = plugin.name.charAt(0).toUpperCase();
          const priceInfo = getEffectivePrice(plugin);
          const isSale = plugin.type === 'paid' && priceInfo.isSale;
          const imageUrl = plugin.preview_path;

          return (
            <Link to={`/plugin/${plugin.id}`} key={plugin.id} className="plugin-card-link">
              <div className="plugin-card-v2">
                <div className="pcv2-preview">
                  {imageUrl ? (
                    <img className="pcv2-preview-img" src={imageUrl} alt={plugin.name} />
                  ) : (
                    <div className="pcv2-preview-fallback" style={{ background: `linear-gradient(135deg, ${accent}22 0%, #0d0f12 100%)` }}>
                      <span style={{ color: accent }}>{initial}</span>
                    </div>
                  )}
                  <div className="pcv2-preview-fade" />
                  <span className="pcv2-category-badge">{plugin.category}</span>
                  {plugin.type === 'free' ? (
                    <span className="pcv2-price-badge free">Free</span>
                  ) : isSale ? (
                    <span className="pcv2-price-badge sale">
                      <span className="pcv2-price-original">{priceInfo.originalDisplay}</span>
                      {priceInfo.display}
                      <span className="pcv2-sale-pct">-{plugin.sale_discount_percent}%</span>
                    </span>
                  ) : (
                    <span className="pcv2-price-badge paid">{priceInfo.display}</span>
                  )}
                </div>
                <div className="pcv2-info">
                  <p className="pcv2-name">{plugin.name}</p>
                  <p className="pcv2-dev">by {plugin.dev_name}</p>
                  <p className="pcv2-desc">{desc}</p>
                  <div className="pcv2-footer">
                    <span className="pcv2-stat">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      {(plugin.downloads ?? 0).toLocaleString()}
                    </span>
                    {plugin.version && (
                      <span className="pcv2-stat" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.65rem' }}>
                        v{plugin.version}
                      </span>
                    )}
                  </div>
                </div>
                {isSale && (
                  <div className="pcv2-sale-strip">🔥 Sale — {plugin.sale_discount_percent}% off</div>
                )}
                <div className="pcv2-accent-bar" style={{ background: `linear-gradient(90deg, ${isSale ? '#ff6b6b' : accent}, transparent)` }} />
              </div>
            </Link>
          );
        })}

        {plugins.length === 0 && (
          <div className="empty-state">
            <p>This author hasn't published any plugins yet.</p>
          </div>
        )}
      </div>

      <style>{`
        .stat-pill {
          background: rgba(255,255,255,0.05);
          padding: 0.4rem 1rem;
          border-radius: 20px;
          fontSize: 0.85rem;
          border: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
};

export default AuthorProfilePage;
