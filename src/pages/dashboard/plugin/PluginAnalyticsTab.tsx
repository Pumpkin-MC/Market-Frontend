import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, DollarSign, 
  Download, MousePointer2, Star, Globe,
  Server, Users, Radio, Cpu, Layers, Activity
} from 'lucide-react';
import { useAnalytics } from '../useAnalytics';

type Props = {
  pluginId: number;
  pluginName: string;
};

const formatValue = (val: number) => {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip-v2">
        <p className="label">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="value" style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey === 'earnings' ? `$${entry.value.toLocaleString()}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MiniChart = ({ data, color, dataKey }: any) => (
  <div style={{ width: '80px', height: '40px' }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2} 
            dot={false} 
            animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const KpiCard = ({ title, value, comparison, icon: Icon, chartData, dataKey }: any) => {
  const trendValue = parseFloat(comparison) || 0;
  const isPositive = trendValue > 0;
  const isNeutral = trendValue === 0;
  const trendColor = isNeutral ? '#94a3b8' : (isPositive ? '#10b981' : '#ef4444');

  const TrendIcon = () => {
    if (isNeutral) return <Minus size={14} />;
    return isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
  };

  return (
    <div className="kpi-card-v2">
      <div className="kpi-header">
        <div className="kpi-icon-wrapper"><Icon size={16} /></div>
        <span className="kpi-title">{title}</span>
      </div>
      <div className="kpi-body">
        <div className="kpi-main">
          <h2 className="kpi-value">{value}</h2>
          <div 
            className={`kpi-trend ${isNeutral ? 'neutral' : (isPositive ? 'up' : 'down')}`}
            style={{ color: trendColor }}
          >
            <TrendIcon />
            <span>{isNeutral ? '0%' : `${trendValue}%`}</span>
          </div>
        </div>
        <MiniChart data={chartData} dataKey={dataKey} color={trendColor} />
      </div>
    </div>
  );
};

export const PluginAnalyticsTab: React.FC<Props> = ({ pluginId, pluginName }) => {
  const { processedData, totals, ratingSummary, referrers, telemetry, timeframe, setTimeframe, loading } = useAnalytics(pluginId);
  const timeframes = ['Today', '7 Days', '1 Month', '1 Year', 'Lifetime'];

  if (loading) {
    return (
      <div className="mp-loading">
        <div className="mp-loading-spinner" />
        <span>Loading analytics for {pluginName}…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mp-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Analytics & Performance</h2>
          <p>Track unique downloads, revenue, conversion rates, and review ratings specifically for <strong>{pluginName}</strong>.</p>
        </div>
        <div className="segment-control">
          {timeframes.map((tf) => (
            <button
              key={tf}
              className={tf === timeframe ? 'active' : ''}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="mp-card" style={{ padding: '1.25rem' }}>
        <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          <KpiCard
            title="Revenue"
            value={`$${totals.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            comparison={0}
            icon={DollarSign}
            chartData={processedData}
            dataKey="earnings"
          />
          <KpiCard
            title="Unique Downloads"
            value={totals.downloads.toLocaleString()}
            comparison={0}
            icon={Download}
            chartData={processedData}
            dataKey="downloads"
          />
          <KpiCard
            title="Views"
            value={totals.views.toLocaleString()}
            comparison={0}
            icon={MousePointer2}
            chartData={processedData}
            dataKey="views" 
          />
          <KpiCard
            title="Conversion Rate"
            value={`${totals.conversionRate || 0}%`}
            comparison={0}
            icon={MousePointer2}
            chartData={processedData}
            dataKey="conversionRate"
          />
          <KpiCard
            title="Avg Rating"
            value={ratingSummary?.averageRating ? `${ratingSummary.averageRating.toFixed(1)} / 5.0` : '--'}
            comparison={0}
            icon={Star}
            chartData={processedData}
            dataKey="avgRating"
          />
        </div>
      </div>

      {/* ── Live Game Server Telemetry (Pumpkin & Vine) ── */}
      <div className="mp-card" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--mp-text-1, #f8fafc)' }}>
                Live Server Telemetry & Installations
              </h3>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.72rem', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                Real-Time Heartbeats
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--mp-text-3, #94a3b8)' }}>
              Direct metrics reported by Minecraft production servers running <strong>{pluginName}</strong> on Pumpkin & Vine.
            </p>
          </div>
        </div>

        {/* 4 Telemetry Metric Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Server size={14} />
              Active Servers (24h)
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--mp-text-1, #fff)', marginTop: '4px', lineHeight: 1.1 }}>
              {telemetry?.activeServers24h?.toLocaleString() ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--mp-text-3, #94a3b8)', marginTop: '4px' }}>
              {telemetry?.activeServers7d ?? 0} weekly active servers (7d)
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Users size={14} />
              Total Player Reach
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--mp-text-1, #fff)', marginTop: '4px', lineHeight: 1.1 }}>
              {telemetry?.totalPlayersOnline?.toLocaleString() ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--mp-text-3, #94a3b8)', marginTop: '4px' }}>
              Concurrent players on active servers
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Activity size={14} />
              Peak 24h Players
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--mp-text-1, #fff)', marginTop: '4px', lineHeight: 1.1 }}>
              {telemetry?.peakPlayers24h?.toLocaleString() ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--mp-text-3, #94a3b8)', marginTop: '4px' }}>
              Highest server player concurrency
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a855f7', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Radio size={14} />
              Primary Platform
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--mp-text-1, #fff)', marginTop: '4px', lineHeight: 1.1, textTransform: 'capitalize' }}>
              {telemetry?.serverTypes?.[0]?.label || 'Pumpkin'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--mp-text-3, #94a3b8)', marginTop: '4px' }}>
              {telemetry?.serverTypes?.[0]?.percentage ? `${telemetry.serverTypes[0].percentage}% of instances` : 'Awaiting heartbeats'}
            </div>
          </div>
        </div>

        {/* Breakdown sub-grid: Installed Versions, Runtime Environment, Active Server Geography */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Installed Version Adoption */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mp-text-1, #fff)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="#10b981" />
              Installed Version Adoption
            </div>
            {telemetry?.versions && telemetry.versions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {telemetry.versions.map((ver, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--mp-text-1, #fff)', fontFamily: 'monospace' }}>
                        v{ver.label.replace(/^v/, '')}
                      </span>
                      <span style={{ color: 'var(--mp-text-3, #94a3b8)', fontSize: '0.75rem' }}>
                        {ver.count} {ver.count === 1 ? 'server' : 'servers'} ({ver.percentage}%)
                      </span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(ver.percentage, 100)}%`, background: idx === 0 ? '#10b981' : '#3b82f6', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--mp-text-3, #94a3b8)', padding: '1.5rem 0', textAlign: 'center' }}>
                Awaiting version heartbeats from active servers.
              </div>
            )}
          </div>

          {/* Runtime Environment: Engine, Minecraft Version & OS */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mp-text-1, #fff)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={16} color="#06b6d4" />
              Server Runtime Environment
            </div>

            {/* Platform engines */}
            {telemetry?.serverTypes && telemetry.serverTypes.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--mp-text-3, #94a3b8)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                  Server Software
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {telemetry.serverTypes.map((st, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--mp-text-1, #fff)' }}>
                      <strong>{st.label}</strong>: {st.count} ({st.percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Minecraft versions */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--mp-text-3, #94a3b8)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                Minecraft Versions
              </div>
              {telemetry?.minecraftVersions && telemetry.minecraftVersions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {telemetry.minecraftVersions.slice(0, 4).map((mc, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)', color: '#06b6d4' }}>
                      MC {mc.label} ({mc.percentage}%)
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--mp-text-3, #94a3b8)' }}>MC 1.21.x</span>
              )}
            </div>

            {/* Operating System */}
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--mp-text-3, #94a3b8)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                Server Host OS
              </div>
              {telemetry?.operatingSystems && telemetry.operatingSystems.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {telemetry.operatingSystems.slice(0, 3).map((os, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--mp-text-2, #cbd5e1)' }}>
                      {os.label} ({os.percentage}%)
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--mp-text-3, #94a3b8)' }}>Linux / Bare Metal</span>
              )}
            </div>
          </div>

          {/* Active Server Geography */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mp-text-1, #fff)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} color="#f59e0b" />
              Active Server Locations
            </div>
            {telemetry?.countries && telemetry.countries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {telemetry.countries.slice(0, 6).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '3px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <span style={{ color: 'var(--mp-text-1, #fff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }} title={c.countryName}>
                      {c.countryName}
                    </span>
                    <span style={{ color: 'var(--mp-text-3, #94a3b8)', fontSize: '0.75rem' }}>
                      <strong style={{ color: '#f59e0b' }}>{c.servers}</strong> {c.servers === 1 ? 'server' : 'servers'} • {c.players} players
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--mp-text-3, #94a3b8)', padding: '1.5rem 0', textAlign: 'center' }}>
                Global server distribution will appear here as instances connect.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Charts & Rating Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Performance Trends */}
          <div className="mp-card">
            <div className="mp-card-title">
              <TrendingUp size={16} />
              Performance Trends
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={formatValue} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="downloads" name="Downloads" stroke="#3b82f6" strokeWidth={2} fill="url(#dlGrad)" />
                <Area type="monotone" dataKey="revenue" name="Revenue (€)" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Rating Trend Line Chart */}
          <div className="mp-card">
            <div className="mp-card-title">
              <Star size={16} />
              Rating Trend (1-5)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={processedData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis domain={[1, 5]} stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avgRating" name="Avg Rating" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          {/* Rating Breakdown */}
          {ratingSummary && (
            <div className="mp-card" style={{ marginBottom: '1.25rem' }}>
              <div className="mp-card-title">
                <Star size={16} />
                Rating Breakdown
              </div>
              <div style={{ textAlign: 'center', margin: '1.25rem 0' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--mp-text-1)', lineHeight: 1 }}>
                  {ratingSummary.averageRating.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--mp-text-2)' }}>
                  {ratingSummary.totalReviews} customer reviews
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1.25rem' }}>
                {ratingSummary.breakdown?.map((b: any) => {
                  const pct = ratingSummary.totalReviews > 0 ? (b.count / ratingSummary.totalReviews) * 100 : 0;
                  return (
                    <div key={b.stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <span style={{ width: '48px', color: 'var(--mp-text-2)' }}>{b.stars} Stars</span>
                      <div style={{ flex: 1, height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }} />
                      </div>
                      <span style={{ width: '28px', textAlign: 'right', color: 'var(--mp-text-3)' }}>{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Traffic Referrers & CTR */}
          <div className="mp-card">
            <div className="mp-card-title">
              <Globe size={16} />
              Traffic Sources & CTR
            </div>
            {referrers && referrers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.75rem' }}>
                {referrers.map((r: any, idx: number) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--mp-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.referrer}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--mp-text-3)' }}>
                        {r.views} views • {r.downloads} downloads
                      </span>
                    </div>
                    <div style={{
                      background: 'rgba(62, 207, 142, 0.12)', color: '#3ecf8e',
                      padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.75rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {r.ctr}% CTR
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--mp-text-3)', fontSize: '0.83rem' }}>
                No referrer traffic recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginAnalyticsTab;
