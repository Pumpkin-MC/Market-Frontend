import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';

const getAccentColor = (name: string) => {
  const colors = [
    '#4f7eff', '#ff6b6b', '#ffd166', '#06d6a0',
    '#a855f7', '#f97316', '#06b6d4', '#ec4899',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const AuthorProfilePage = () => {
  const { username } = useParams();
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
        {plugins.map((plugin) => (
          <PluginCard key={plugin.id} plugin={plugin} />
        ))}

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
