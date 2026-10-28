import { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
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
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);

    api.get(`/user/public/${username}`)
      .then(res => {
        setAuthor(res.data);
        return api.get('/plugins', { params: { dev_name: username, sort: 'newest' } });
      })
      .then(res => {
        setPlugins(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setLoadFailed(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [username]);

  if (loading) return <div className="page-loader"><span className="loading" /></div>;
  if (loadFailed || !author) return (
    <div className="page sf-pad">
      <div className="blank"><h2 className="h2">{loadFailed ? t('profile.author.load_failed') : t('profile.author.not_found')}</h2></div>
    </div>
  );

  return (
    <>
      <SEO
        title={t('profile.author.page_title', { username: author.username })}
        description={t('profile.author.page_description', { username: author.username })}
      />

      <section className="sf-hero">
        <div className="page row sf-profile">
          <span className="avatar">{author.username.charAt(0).toUpperCase()}</span>
          <div className="stack">
            <h1 className="display-1 sf-profile-name">{author.username}</h1>
            <p className="small">
              {t('profile.author.member_since', { date: author.created_at ? new Date(author.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : t('common.not_available') })}
            </p>
            <span className="sticker sticker-fg"><Trans t={t} i18nKey="profile.author.published_plugins" values={{ count: plugins.length }} components={{ total: <span className="num" /> }} /></span>
          </div>
        </div>
      </section>

      <section className="band band-surface">
        <div className="page sect">
          <h2 className="sect-title"><Trans t={t} i18nKey="profile.author.plugins_by" components={{ author: <span className="mark">{author.username}</span> }} /></h2>
          {plugins.length > 0 ? (
            <div className="catalogue">
              {plugins.map((plugin) => (
                <PluginCard key={plugin.id} plugin={plugin} />
              ))}
            </div>
          ) : (
            <div className="blank">
              <p className="small">{t('profile.author.no_plugins')}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default AuthorPage;
