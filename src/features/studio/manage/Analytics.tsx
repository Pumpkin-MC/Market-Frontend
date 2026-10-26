import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, DollarSign,
  Download, MousePointer2, Star, Globe,
  Server, Users, Radio, Cpu, Layers, Activity
} from 'lucide-react';
import { useAnalytics } from '../useAnalytics';
import '../../../styles/studio.css';

type Props = {
  pluginId: number;
  pluginName: string;
};

export const formatValue = (val: number) => {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toString();
};

export const AXIS = { axisLine: false, tickLine: false, tick: { fill: 'var(--muted)', fontSize: 12 } } as const;

export const GRID = <CartesianGrid stroke="var(--line)" vertical={false} />;

export const CURSOR = { stroke: 'var(--fg)', strokeWidth: 1 };

export const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="st-tip">
      <span className="label label-fg">{label}</span>
      {payload.map((entry: any, index: number) => (
        <span key={index} className="st-tip-row">
          <span className="dot" style={{ background: entry.color }} />
          {entry.name}: {entry.dataKey === 'earnings' ? `€${entry.value.toLocaleString()}` : entry.value}
        </span>
      ))}
    </div>
  );
};

const MiniChart = ({ data, color, dataKey }: any) => (
  <div className="st-an-spark">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line type="linear" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} animationDuration={1000} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const KpiCard = ({ title, value, comparison, icon: Icon, chartData, dataKey }: any) => {
  const trendValue = parseFloat(comparison) || 0;
  const isPositive = trendValue > 0;
  const isNeutral = trendValue === 0;
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="stat">
      <span className="label st-an-label"><Icon />{title}</span>
      <span className="stat-value st-an-value">{value}</span>
      <span className={`stat-delta st-an-delta ${isNeutral ? '' : isPositive ? 'up' : 'down'}`}>
        <TrendIcon />{isNeutral ? '0%' : `${trendValue}%`}
      </span>
      <MiniChart data={chartData} dataKey={dataKey} color={isNeutral ? 'var(--pumpkin)' : isPositive ? 'var(--success)' : 'var(--danger)'} />
    </div>
  );
};

export const RatingBars = ({ summary }: { summary: any }) => (
  <div className="st-an-bars">
    {summary.breakdown?.map((b: any) => {
      const pct = summary.totalReviews > 0 ? (b.count / summary.totalReviews) * 100 : 0;
      return (
        <div key={b.stars}>
          <span className="small">{b.stars} Stars</span>
          <div className="meter meter-pumpkin"><span style={{ width: `${pct}%` }} /></div>
          <span className="small num">{b.count}</span>
        </div>
      );
    })}
  </div>
);

const Telemetry = ({ icon: Icon, label, value, hint, text }: any) => (
  <div className="stat">
    <span className="label st-an-label"><Icon />{label}</span>
    <span className={`stat-value st-an-value${text ? ' st-an-text' : ''}`}>{value}</span>
    <span className="small">{hint}</span>
  </div>
);

export const Analytics: React.FC<Props> = ({ pluginId, pluginName }) => {
  const { processedData, totals, ratingSummary, referrers, telemetry, timeframe, setTimeframe, loading } = useAnalytics(pluginId);
  const timeframes = ['Today', '7 Days', '1 Month', '1 Year', 'Lifetime'];

  if (loading) {
    return (
      <div className="page-loader">
        <span className="status"><span className="loading" />Loading analytics for {pluginName}…</span>
      </div>
    );
  }

  return (
    <div className="st-tab">
      <header className="st-head">
        <div className="st-tab-head">
          <h2 className="h1">Analytics & Performance</h2>
          <p className="small">Track unique downloads, revenue, conversion rates, and review ratings specifically for <strong>{pluginName}</strong>.</p>
        </div>
        <div className="segmented" role="group" aria-label="Timeframe">
          {timeframes.map((tf) => (
            <button key={tf} type="button" aria-pressed={tf === timeframe} onClick={() => setTimeframe(tf)}>{tf}</button>
          ))}
        </div>
      </header>

      <div className="stats st-an-stats">
        <KpiCard
          title="Revenue"
          value={`€${totals.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
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

      <section className="panel">
        <div className="panel-head st-an-head">
          <Server className="st-an-icon" />
          <h3 className="h3">Live Server Telemetry & Installations</h3>
          <span className="tag tag-solid tag-success">Real-Time Heartbeats</span>
        </div>
        <div className="panel-body stack st-an-gap">
          <p className="small">
            Direct metrics reported by Minecraft production servers running <strong>{pluginName}</strong> on Pumpkin & Vine.
          </p>

          <div className="stats">
            <Telemetry
              icon={Server}
              label="Active Servers (24h)"
              value={telemetry?.activeServers24h?.toLocaleString() ?? 0}
              hint={`${telemetry?.activeServers7d ?? 0} weekly active servers (7d)`}
            />
            <Telemetry
              icon={Users}
              label="Total Player Reach"
              value={telemetry?.totalPlayersOnline?.toLocaleString() ?? 0}
              hint="Concurrent players on active servers"
            />
            <Telemetry
              icon={Activity}
              label="Peak 24h Players"
              value={telemetry?.peakPlayers24h?.toLocaleString() ?? 0}
              hint="Highest server player concurrency"
            />
            <Telemetry
              icon={Radio}
              label="Primary Platform"
              value={telemetry?.serverTypes?.[0]?.label || 'Pumpkin'}
              hint={telemetry?.serverTypes?.[0]?.percentage ? `${telemetry.serverTypes[0].percentage}% of instances` : 'Awaiting heartbeats'}
              text
            />
          </div>

          <div className="st-an-trio">
            <div className="st-an-box">
              <span className="label label-fg st-an-label"><Layers />Installed Version Adoption</span>
              {telemetry?.versions && telemetry.versions.length > 0 ? (
                <div className="stack st-an-tight">
                  {telemetry.versions.map((ver, idx) => (
                    <div key={idx} className="st-an-version">
                      <div className="row">
                        <span className="mono">v{ver.label.replace(/^v/, '')}</span>
                        <span className="spacer" />
                        <span className="small num">{ver.count} {ver.count === 1 ? 'server' : 'servers'} ({ver.percentage}%)</span>
                      </div>
                      <div className={`meter${idx === 0 ? ' meter-pumpkin' : ''}`}><span style={{ width: `${Math.min(ver.percentage, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="small st-an-empty">Awaiting version heartbeats from active servers.</p>
              )}
            </div>

            <div className="st-an-box">
              <span className="label label-fg st-an-label"><Cpu />Server Runtime Environment</span>

              {telemetry?.serverTypes && telemetry.serverTypes.length > 0 && (
                <div className="stack st-an-tight">
                  <span className="label">Server Software</span>
                  <div className="row st-an-tight">
                    {telemetry.serverTypes.map((st, i) => (
                      <span key={i} className="tag tag-fg">{st.label}: {st.count} ({st.percentage}%)</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="stack st-an-tight">
                <span className="label">Minecraft Versions</span>
                {telemetry?.minecraftVersions && telemetry.minecraftVersions.length > 0 ? (
                  <div className="row st-an-tight">
                    {telemetry.minecraftVersions.slice(0, 4).map((mc, i) => (
                      <span key={i} className="tag tag-pumpkin">MC {mc.label} ({mc.percentage}%)</span>
                    ))}
                  </div>
                ) : (
                  <span className="small">MC 1.21.x</span>
                )}
              </div>

              <div className="stack st-an-tight">
                <span className="label">Server Host OS</span>
                {telemetry?.operatingSystems && telemetry.operatingSystems.length > 0 ? (
                  <div className="row st-an-tight">
                    {telemetry.operatingSystems.slice(0, 3).map((os, i) => (
                      <span key={i} className="tag">{os.label} ({os.percentage}%)</span>
                    ))}
                  </div>
                ) : (
                  <span className="small">Linux / Bare Metal</span>
                )}
              </div>
            </div>

            <div className="st-an-box">
              <span className="label label-fg st-an-label"><Globe />Active Server Locations</span>
              {telemetry?.countries && telemetry.countries.length > 0 ? (
                <dl className="specs st-an-scroll">
                  {telemetry.countries.slice(0, 6).map((c, i) => (
                    <React.Fragment key={i}>
                      <dt className="st-an-clip" title={c.countryName}>{c.countryName}</dt>
                      <dd className="small">
                        <strong className="pumpkin">{c.servers}</strong> {c.servers === 1 ? 'server' : 'servers'} • {c.players} players
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              ) : (
                <p className="small st-an-empty">Global server distribution will appear here as instances connect.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="st-an-split">
        <div className="stack st-an-gap">
          <section className="panel">
            <div className="panel-head st-an-head">
              <TrendingUp className="st-an-icon" />
              <h3 className="h3">Performance Trends</h3>
              <span className="spacer" />
              <span className="status small"><span className="dot st-an-dot-fg" />Downloads</span>
              <span className="status small"><span className="dot dot-pumpkin" />Revenue (€)</span>
            </div>
            <div className="panel-body">
              <div className="st-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    {GRID}
                    <XAxis dataKey="date" {...AXIS} dy={8} />
                    <YAxis {...AXIS} tickFormatter={formatValue} />
                    <Tooltip content={<ChartTip />} cursor={CURSOR} />
                    <Area type="linear" dataKey="downloads" name="Downloads" stroke="var(--fg)" strokeWidth={3} fill="var(--fg)" fillOpacity={0.06} />
                    <Area type="linear" dataKey="earnings" name="Revenue (€)" stroke="var(--pumpkin)" strokeWidth={3} fill="var(--pumpkin)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head st-an-head">
              <Star className="st-an-icon" />
              <h3 className="h3">Rating Trend (1-5)</h3>
            </div>
            <div className="panel-body">
              <div className="st-chart st-chart-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    {GRID}
                    <XAxis dataKey="date" {...AXIS} dy={8} />
                    <YAxis domain={[1, 5]} {...AXIS} />
                    <Tooltip content={<ChartTip />} cursor={CURSOR} />
                    <Line type="linear" dataKey="avgRating" name="Avg Rating" stroke="var(--pumpkin)" strokeWidth={3} dot={{ r: 3, fill: 'var(--pumpkin)', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        <div className="stack st-an-gap">
          {ratingSummary && (
            <section className="panel">
              <div className="panel-head st-an-head">
                <Star className="st-an-icon" />
                <h3 className="h3">Rating Breakdown</h3>
              </div>
              <div className="panel-body stack">
                <div className="st-an-score">
                  <span className="stat-value">{ratingSummary.averageRating.toFixed(1)}</span>
                  <span className="small">{ratingSummary.totalReviews} customer reviews</span>
                </div>
                <RatingBars summary={ratingSummary} />
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head st-an-head">
              <Globe className="st-an-icon" />
              <h3 className="h3">Traffic Sources & CTR</h3>
            </div>
            <div className="panel-body">
              {referrers && referrers.length > 0 ? (
                <ul className="st-an-list">
                  {referrers.map((r: any, idx: number) => (
                    <li key={idx}>
                      <span className="st-an-clip">
                        <strong>{r.referrer}</strong>
                        <span className="ledger-sub">{r.views} views • {r.downloads} downloads</span>
                      </span>
                      <span className="tag tag-success">{r.ctr}% CTR</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small st-an-empty">No referrer traffic recorded yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
