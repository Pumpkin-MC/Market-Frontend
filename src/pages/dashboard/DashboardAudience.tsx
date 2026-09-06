import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { scaleLinear } from "d3-scale";
import { Server, Users, Globe, Activity } from 'lucide-react';
import { useAnalytics } from './useAnalytics';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const DashboardAudience = () => {
  const { mapData, telemetry, loading } = useAnalytics(); 
  const [mapFilter, setMapFilter] = useState<'servers' | 'players' | 'visitors' | 'free_downloads'>('servers');
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; servers: number; players: number; visitors: number } | null>(null);

  // Memoize scales to prevent recalculation on every render
  const colorScales = useMemo(() => ({
    servers: scaleLinear<string>().domain([0, 20]).range(["#1a1a2e", "#10b981"]),
    players: scaleLinear<string>().domain([0, 100]).range(["#1a1a2e", "#06b6d4"]),
    visitors: scaleLinear<string>().domain([0, 50]).range(["#1a1a2e", "#8884d8"]),
    free_downloads: scaleLinear<string>().domain([0, 50]).range(["#1a1a2e", "#82ca9d"]),
    buyers: scaleLinear<string>().domain([0, 50]).range(["#1a1a2e", "#FF7518"]),
  }), []);

  if (loading || !mapData) {
    return (
      <div className="loader-container" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="pumpkin-spinner"></div>
        <p>Analyzing Global Telemetry & Distribution...</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* ── Top Telemetry Audience KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--dash-surface, #13131f)', border: '1px solid var(--dash-border, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <Server size={14} />
            Live Game Servers (24h)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text, #fff)', marginTop: '4px' }}>
            {telemetry?.activeServers24h?.toLocaleString() ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
            {telemetry?.activeServers7d ?? 0} active past 7 days
          </div>
        </div>

        <div style={{ background: 'var(--dash-surface, #13131f)', border: '1px solid var(--dash-border, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <Users size={14} />
            Online Player Reach
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text, #fff)', marginTop: '4px' }}>
            {telemetry?.totalPlayersOnline?.toLocaleString() ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
            Concurrent players on servers running your plugins
          </div>
        </div>

        <div style={{ background: 'var(--dash-surface, #13131f)', border: '1px solid var(--dash-border, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <Activity size={14} />
            Peak 24h Players
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text, #fff)', marginTop: '4px' }}>
            {telemetry?.peakPlayers24h?.toLocaleString() ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
            Max player concurrency
          </div>
        </div>

        <div style={{ background: 'var(--dash-surface, #13131f)', border: '1px solid var(--dash-border, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a855f7', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <Globe size={14} />
            Server Locations
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text, #fff)', marginTop: '4px' }}>
            {telemetry?.countries?.length ?? mapData.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
            Countries with deployed servers
          </div>
        </div>
      </div>

      {/* ── Global Interactive Map ── */}
      <div className="charts-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>Plugin <span>Audience & Server Geography</span></h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Visualizing active Minecraft servers and player reach reported via telemetry
              </p>
            </div>
            <div className="map-filters" style={{ display: 'flex', gap: '8px' }}>
              {(['servers', 'players', 'visitors', 'free_downloads'] as const).map(type => (
                <button 
                   key={type}
                   className={`btn-sm ${mapFilter === type ? 'active' : ''}`} 
                   onClick={() => setMapFilter(type)}
                   style={{
                     padding: '6px 12px',
                     borderRadius: '6px',
                     border: '1px solid var(--dash-border, rgba(255,255,255,0.1))',
                     background: mapFilter === type ? 'var(--primary, #f97316)' : 'rgba(255,255,255,0.04)',
                     color: mapFilter === type ? '#fff' : 'var(--text-muted, #94a3b8)',
                     fontWeight: 600,
                     fontSize: '0.78rem',
                     cursor: 'pointer',
                     textTransform: 'capitalize'
                   }}
                >
                  {type === 'servers' ? 'Live Servers' : type === 'players' ? 'Online Players' : type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div className="map-wrapper" style={{ background: '#0f0f1a', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)', position: 'relative' }}>
            {hoveredInfo && (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(20, 20, 35, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.82rem',
                color: '#fff',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{hoveredInfo.name}</div>
                <div style={{ color: '#10b981' }}>🖥️ {hoveredInfo.servers} active servers</div>
                <div style={{ color: '#06b6d4' }}>👥 {hoveredInfo.players} online players</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>🌐 {hoveredInfo.visitors} web views</div>
              </div>
            )}

            <ComposableMap projectionConfig={{ rotate: [-10, 0, 0] as any, scale: 147 }} width={800} height={400}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryCode = geo.properties.ISO_A2 || geo.properties.iso_a2 || geo.properties.IS_A2;
                    const d: any = mapData.find((s: any) => s.country === countryCode);
                    const val = d ? (d[mapFilter === 'free_downloads' ? 'freeDownloads' : mapFilter] || 0) : 0;
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={val > 0 ? colorScales[mapFilter](val) : "#1a1a2e"}
                        stroke="#2a2a40"
                        strokeWidth={0.5}
                        onMouseEnter={() => {
                          setHoveredInfo({
                            name: d?.countryName || geo.properties.name || countryCode || 'Unknown',
                            servers: d?.servers || 0,
                            players: d?.players || 0,
                            visitors: d?.visitors || 0,
                          });
                        }}
                        onMouseLeave={() => setHoveredInfo(null)}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "#f97316", outline: "none", cursor: 'pointer' },
                          pressed: { outline: "none" }
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
            
            {mapData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No server telemetry or geographic data captured yet.
              </div>
            )}
          </div>

          {/* Table of Top Geographic Locations */}
          {mapData.length > 0 && (
            <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', color: 'var(--text, #fff)' }}>
                Country Telemetry Breakdown
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted, #94a3b8)' }}>
                    <th style={{ padding: '8px 12px' }}>Country</th>
                    <th style={{ padding: '8px 12px' }}>Game Servers</th>
                    <th style={{ padding: '8px 12px' }}>Online Players</th>
                    <th style={{ padding: '8px 12px' }}>Web Visitors</th>
                    <th style={{ padding: '8px 12px' }}>Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {mapData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text, #fff)' }}>
                        {row.countryName} ({row.country})
                      </td>
                      <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: 700 }}>
                        {row.servers}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#06b6d4' }}>
                        {row.players}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted, #94a3b8)' }}>
                        {row.visitors}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted, #94a3b8)' }}>
                        {row.freeDownloads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardAudience;