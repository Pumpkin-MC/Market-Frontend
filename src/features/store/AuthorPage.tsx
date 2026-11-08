import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import SEO from '../../components/SEO';
import PluginCard from '../../components/PluginCard';
import '../../styles/store.css';

const AuthorPage = () => {
  const { t } = useTranslation();
  const { username } = useParams();
  const [author, setAuthor] = useState<any>(null);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    api.get(`/user/public/${username}`)
      .then(res => {
        setAuthor(res.data);
        return api.get('/plugins', { params: { dev_name: res.data?.username || username, sort: 'newest' } });
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

  if (loading) return <div className="page-loader"><span className="loading" /></div>;
  if (error || !author) return (
    <div className="page sf-pad">
      <div className="blank"><h2 className="h2">{error || 'User not found'}</h2></div>
    </div>
  );

  return (
    <>
      <SEO
        title={`${author.username}'s Profile`}
        description={`Check out all Minecraft plugins created by ${author.username} on Pumpkin Market.`}
      />

      <section className="sf-hero">
        <div className="page row sf-profile">
          <span className="avatar">
            {author.avatar_url ? (
              <img src={author.avatar_url} alt={author.display_name || author.username} />
            ) : (
              (author.display_name || author.username || '?').charAt(0).toUpperCase()
            )}
          </span>
          <div className="stack">
            <h1 className="display-1 sf-profile-name">{author.display_name || author.username}</h1>
            <p className="small">
              {t('studio.author_page.member_since', {
                date: author.created_at ? new Date(author.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'N/A',
                defaultValue: 'Member since {{date}}',
              })}
            </p>
            <span className="sticker sticker-fg">
              {t('studio.author_page.plugins_published', { count: plugins.length, defaultValue: '{{count}} Plugins Published' })}
            </span>
          </div>
        </div>
      </section>

      <section className="band band-surface">
        <div className="page sect">
          <h2 className="sect-title">{t('studio.author_page.plugins_by', 'Plugins by')} <span className="mark">{author.display_name || author.username}</span></h2>
          {plugins.length > 0 ? (
            <div className="catalogue">
              {plugins.map((plugin) => (
                <PluginCard key={plugin.id} plugin={plugin} />
              ))}
            </div>
          ) : (
            <div className="blank">
              <p className="small">{t('studio.author_page.no_plugins', "This author hasn't published any plugins yet.")}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default AuthorPage;
