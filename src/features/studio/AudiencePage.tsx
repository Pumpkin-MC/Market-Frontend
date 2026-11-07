import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { Server, Users, Globe, Activity } from 'lucide-react';
import { useAnalytics } from './useAnalytics';
import '../../styles/studio.css';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SCALE_MAX = { servers: 20, players: 100, visitors: 50, free_downloads: 50 };

const MAP_FILTERS = [
  { value: 'servers', label: 'audience.map.servers' },
  { value: 'players', label: 'audience.map.players' },
  { value: 'visitors', label: 'audience.map.visitors' },
  { value: 'free_downloads', label: 'audience.map.free_downloads' },
] as const;

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
        <span className="status"><span className="loading" />{t('audience.loading')}</span>
      </div>
    );
  }

  return (
    <div className="page page-wide st-page">
      <header className="st-head">
        <div className="st-head-text">
          <span className="sticker sticker-success">{t('developer.analytics.real_time_heartbeats')}</span>
          <h1 className="display-2">
            <Trans t={t} i18nKey="audience.title" components={{ mark: <span className="mark" /> }} />
          </h1>
          <p className="lede">{t('audience.lede')}</p>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="label st-an-label"><Server />{t('audience.stats.live_servers')}</span>
          <span className="stat-value st-an-value">{telemetry?.activeServers24h?.toLocaleString() ?? 0}</span>
          <span className="small">{t('audience.stats.active_past_week', { count: telemetry?.activeServers7d ?? 0 })}</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Users />{t('audience.stats.player_reach')}</span>
          <span className="stat-value st-an-value">{telemetry?.totalPlayersOnline?.toLocaleString() ?? 0}</span>
          <span className="small">{t('developer.analytics.player_reach_hint')}</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Activity />{t('developer.analytics.peak_24h_players')}</span>
          <span className="stat-value st-an-value">{telemetry?.peakPlayers24h?.toLocaleString() ?? 0}</span>
          <span className="small">{t('developer.analytics.peak_players_hint')}</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Globe />{t('audience.stats.locations')}</span>
          <span className="stat-value st-an-value pumpkin">{telemetry?.countries?.length ?? mapData.length}</span>
          <span className="small">{t('audience.stats.locations_hint')}</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head st-an-head">
          <div className="segmented" role="group" aria-label={t('audience.map.layer')}>
            {MAP_FILTERS.map(({ value, label }) => (
              <button key={value} type="button" className="st-an-cap" aria-pressed={mapFilter === value} onClick={() => setMapFilter(value)}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body stack">
          <div className="st-an-map">
            {hoveredInfo && (
              <div className="st-tip st-an-map-tip">
                <span className="label label-fg">{hoveredInfo.name}</span>
                <span className="st-tip-row"><span className="dot dot-pumpkin" />{t('audience.map.tip_servers', { count: hoveredInfo.servers })}</span>
                <span className="st-tip-row"><span className="dot st-an-dot-fg" />{t('audience.map.tip_players', { count: hoveredInfo.players })}</span>
                <span className="st-tip-row muted"><span className="dot" />{t('audience.map.tip_views', { count: hoveredInfo.visitors })}</span>
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
                            name: d?.countryName || geo.properties?.name || countryCode || t('audience.map.unknown'),
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
              <p className="small st-an-empty">{t('audience.map.empty')}</p>
            )}
          </div>

          {mapData.length > 0 && (
            <>
              <h4 className="h3">{t('audience.breakdown_title')}</h4>
              <div className="scroll-x">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>{t('audience.table.country')}</th>
                      <th className="end">{t('audience.table.servers')}</th>
                      <th className="end">{t('audience.table.players')}</th>
                      <th className="end">{t('audience.table.visitors')}</th>
                      <th className="end">{t('audience.table.downloads')}</th>
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
