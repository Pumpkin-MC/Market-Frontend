import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { Server, Users, Globe, Activity } from 'lucide-react';
import { useAnalytics } from './useAnalytics';
import '../../styles/studio.css';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SCALE_MAX = { servers: 20, players: 100, visitors: 50, free_downloads: 50 };

const shade = (val: number, max: number) =>
  `color-mix(in srgb, var(--pumpkin) ${Math.round(20 + Math.min(val / max, 1) * 80)}%, var(--surface))`;

const AudiencePage = () => {
  const { t } = useTranslation();
  const { mapData, telemetry, loading } = useAnalytics();
  const [mapFilter, setMapFilter] = useState<'servers' | 'players' | 'visitors' | 'free_downloads'>('servers');
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; servers: number; players: number; visitors: number } | null>(null);

  if (loading || !mapData) {
    return (
      <div className="page-loader">
        <span className="status"><span className="loading" />{t('studio.audience.loading')}</span>
      </div>
    );
  }

  return (
    <div className="page page-wide st-page">
      <header className="st-head">
        <div className="st-head-text">
          <span className="sticker sticker-success">{t('studio.audience.badge')}</span>
          <h1 className="display-2">{t('studio.audience.title_lead')} <span className="mark">{t('studio.audience.title_mark')}</span> {t('studio.audience.title_rest')}</h1>
          <p className="lede">{t('studio.audience.subtitle')}</p>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="label st-an-label"><Server />{t('studio.audience.live_servers_24h')}</span>
          <span className="stat-value st-an-value">{telemetry?.activeServers24h?.toLocaleString() ?? 0}</span>
          <span className="small">{t('studio.audience.active_past_7d', { count: telemetry?.activeServers7d ?? 0 })}</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Users />{t('studio.audience.online_player_reach')}</span>
          <span className="stat-value st-an-value">{telemetry?.totalPlayersOnline?.toLocaleString() ?? 0}</span>
          <span className="small">{t('studio.audience.concurrent_players_desc')}</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Activity />{t('studio.audience.peak_24h_players')}</span>
          <span className="stat-value st-an-value">{telemetry?.peakPlayers24h?.toLocaleString() ?? 0}</span>
          <span className="small">{t('studio.audience.max_concurrency_desc')}</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Globe />{t('studio.audience.server_locations')}</span>
          <span className="stat-value st-an-value pumpkin">{telemetry?.countries?.length ?? mapData.length}</span>
          <span className="small">{t('studio.audience.countries_deployed_desc')}</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head st-an-head">
          <div className="segmented" role="group" aria-label={t('studio.audience.server_locations')}>
            {([
              ['servers', t('studio.audience.layer_servers')],
              ['players', t('studio.audience.layer_players')],
              ['visitors', t('studio.audience.layer_visitors')],
              ['free_downloads', t('studio.audience.layer_free_downloads')],
            ] as const).map(([type, label]) => (
              <button key={type} type="button" className="st-an-cap" aria-pressed={mapFilter === type} onClick={() => setMapFilter(type)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body stack">
          <div className="st-an-map">
            {hoveredInfo && (
              <div className="st-tip st-an-map-tip">
                <span className="label label-fg">{hoveredInfo.name}</span>
                <span className="st-tip-row"><span className="dot dot-pumpkin" />{t('studio.audience.tip_active_servers', { count: hoveredInfo.servers })}</span>
                <span className="st-tip-row"><span className="dot st-an-dot-fg" />{t('studio.audience.tip_online_players', { count: hoveredInfo.players })}</span>
                <span className="st-tip-row muted"><span className="dot" />{t('studio.audience.tip_web_views', { count: hoveredInfo.visitors })}</span>
              </div>
            )}

            <ComposableMap projectionConfig={{ rotate: [-10, 0, 0] as any, scale: 147 }} width={800} height={400}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryCode = geo.properties?.ISO_A2 || geo.properties?.iso_a2 || geo.properties?.IS_A2;
                    const d: any = mapData.find((s: any) => s.country === countryCode);
                    const val = d ? (d[mapFilter === 'free_downloads' ? 'freeDownloads' : mapFilter] || 0) : 0;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        stroke="var(--line)"
                        strokeWidth={0.5}
                        onMouseEnter={() => {
                          setHoveredInfo({
                            name: d?.countryName || geo.properties?.name || countryCode || 'Unknown',
                            servers: d?.servers || 0,
                            players: d?.players || 0,
                            visitors: d?.visitors || 0,
                          });
                        }}
                        onMouseLeave={() => setHoveredInfo(null)}
                        style={{
                          default: { fill: val > 0 ? shade(val, SCALE_MAX[mapFilter]) : 'var(--surface)', outline: 'none' },
                          hover: { fill: 'var(--fg)', outline: 'none', cursor: 'pointer' },
                          pressed: { outline: 'none' }
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>

            {mapData.length === 0 && (
              <p className="small st-an-empty">{t('studio.audience.empty_telemetry')}</p>
            )}
          </div>

          {mapData.length > 0 && (
            <>
              <h4 className="h3">{t('studio.audience.breakdown_title')}</h4>
              <div className="scroll-x">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>{t('studio.audience.col_country')}</th>
                      <th className="end">{t('studio.audience.col_servers')}</th>
                      <th className="end">{t('studio.audience.col_players')}</th>
                      <th className="end">{t('studio.audience.col_visitors')}</th>
                      <th className="end">{t('studio.audience.col_downloads')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapData.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td><strong>{row.countryName}</strong> <span className="muted mono">({row.country})</span></td>
                        <td className="end"><strong className="pumpkin">{row.servers}</strong></td>
                        <td className="end">{row.players}</td>
                        <td className="end muted">{row.visitors}</td>
                        <td className="end muted">{row.freeDownloads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AudiencePage;
