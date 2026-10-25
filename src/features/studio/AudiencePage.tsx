import { useState } from 'react';
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { Server, Users, Globe, Activity } from 'lucide-react';
import { useAnalytics } from './useAnalytics';
import '../../styles/studio.css';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SCALE_MAX = { servers: 20, players: 100, visitors: 50, free_downloads: 50 };

const shade = (val: number, max: number) =>
  `color-mix(in srgb, var(--pumpkin) ${Math.round(20 + Math.min(val / max, 1) * 80)}%, var(--surface))`;

const AudiencePage = () => {
  const { mapData, telemetry, loading } = useAnalytics();
  const [mapFilter, setMapFilter] = useState<'servers' | 'players' | 'visitors' | 'free_downloads'>('servers');
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; servers: number; players: number; visitors: number } | null>(null);

  if (loading || !mapData) {
    return (
      <div className="page-loader">
        <span className="status"><span className="loading" />Analyzing Global Telemetry & Distribution...</span>
      </div>
    );
  }

  return (
    <div className="page page-wide st-page">
      <header className="st-head">
        <div className="st-head-text">
          <span className="sticker sticker-success">Real-Time Heartbeats</span>
          <h1 className="display-2">Plugin <span className="mark">Audience</span> & Server Geography</h1>
          <p className="lede">Visualizing active Minecraft servers and player reach reported via telemetry</p>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="label st-an-label"><Server />Live Game Servers (24h)</span>
          <span className="stat-value st-an-value">{telemetry?.activeServers24h?.toLocaleString() ?? 0}</span>
          <span className="small">{telemetry?.activeServers7d ?? 0} active past 7 days</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Users />Online Player Reach</span>
          <span className="stat-value st-an-value">{telemetry?.totalPlayersOnline?.toLocaleString() ?? 0}</span>
          <span className="small">Concurrent players on servers running your plugins</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Activity />Peak 24h Players</span>
          <span className="stat-value st-an-value">{telemetry?.peakPlayers24h?.toLocaleString() ?? 0}</span>
          <span className="small">Max player concurrency</span>
        </div>
        <div className="stat">
          <span className="label st-an-label"><Globe />Server Locations</span>
          <span className="stat-value st-an-value pumpkin">{telemetry?.countries?.length ?? mapData.length}</span>
          <span className="small">Countries with deployed servers</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head st-an-head">
          <div className="segmented" role="group" aria-label="Map layer">
            {(['servers', 'players', 'visitors', 'free_downloads'] as const).map(type => (
              <button key={type} type="button" className="st-an-cap" aria-pressed={mapFilter === type} onClick={() => setMapFilter(type)}>
                {type === 'servers' ? 'Live Servers' : type === 'players' ? 'Online Players' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body stack">
          <div className="st-an-map">
            {hoveredInfo && (
              <div className="st-tip st-an-map-tip">
                <span className="label label-fg">{hoveredInfo.name}</span>
                <span className="st-tip-row"><span className="dot dot-pumpkin" />{hoveredInfo.servers} active servers</span>
                <span className="st-tip-row"><span className="dot st-an-dot-fg" />{hoveredInfo.players} online players</span>
                <span className="st-tip-row muted"><span className="dot" />{hoveredInfo.visitors} web views</span>
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
              <p className="small st-an-empty">No server telemetry or geographic data captured yet.</p>
            )}
          </div>

          {mapData.length > 0 && (
            <>
              <h4 className="h3">Country Telemetry Breakdown</h4>
              <div className="scroll-x">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Country</th>
                      <th className="end">Game Servers</th>
                      <th className="end">Online Players</th>
                      <th className="end">Web Visitors</th>
                      <th className="end">Downloads</th>
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
