import { Trans, useTranslation } from 'react-i18next';
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

export const RatingBars = ({ summary }: { summary: any }) => {
  const { t } = useTranslation();
  return (
  <div className="st-an-bars">
    {summary.breakdown?.map((b: any) => {
      const pct = summary.totalReviews > 0 ? (b.count / summary.totalReviews) * 100 : 0;
      return (
        <div key={b.stars}>
          <span className="small">{t('developer.analytics.stars', { count: b.stars })}</span>
          <div className="meter meter-pumpkin"><span style={{ width: `${pct}%` }} /></div>
          <span className="small num">{b.count}</span>
        </div>
      );
    })}
  </div>
  );
};

const Telemetry = ({ icon: Icon, label, value, hint, text }: any) => (
  <div className="stat">
    <span className="label st-an-label"><Icon />{label}</span>
    <span className={`stat-value st-an-value${text ? ' st-an-text' : ''}`}>{value}</span>
    <span className="small">{hint}</span>
  </div>
);

export const Analytics: React.FC<Props> = ({ pluginId, pluginName }) => {
    const { t } = useTranslation();
  const { processedData, totals, ratingSummary, referrers, telemetry, timeframe, setTimeframe, loading } = useAnalytics(pluginId);
  const timeframes = [
    { value: 'Today', label: t('developer.analytics.timeframe_today') },
    { value: '7 Days', label: t('developer.analytics.timeframe_week') },
    { value: '1 Month', label: t('developer.analytics.timeframe_month') },
    { value: '1 Year', label: t('developer.analytics.timeframe_year') },
    { value: 'Lifetime', label: t('developer.analytics.timeframe_lifetime') },
  ];

  if (loading) {
    return (
      <div className="page-loader">
        <span className="status"><span className="loading" />{t('developer.analytics.loading', { plugin: pluginName })}</span>
      </div>
    );
  }

  return (
    <div className="st-tab">
      <header className="st-head">
        <div className="st-tab-head">
          <h2 className="h1">{t('developer.analytics.title')}</h2>
          <p className="small"><Trans t={t} i18nKey="developer.analytics.description" components={{ plugin: <strong>{pluginName}</strong> }} /></p>
        </div>
        <div className="segmented" role="group" aria-label={t('developer.analytics.timeframe')}>
          {timeframes.map((tf) => (
            <button key={tf.value} type="button" aria-pressed={tf.value === timeframe} onClick={() => setTimeframe(tf.value)}>{tf.label}</button>
          ))}
        </div>
      </header>

      <div className="stats st-an-stats">
        <KpiCard
          title={t('developer.analytics.revenue')}
          value={`€${totals.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          comparison={0}
          icon={DollarSign}
          chartData={processedData}
          dataKey="earnings"
        />
        <KpiCard
          title={t('developer.analytics.unique_downloads')}
          value={totals.downloads.toLocaleString()}
          comparison={0}
          icon={Download}
          chartData={processedData}
          dataKey="downloads"
        />
        <KpiCard
          title={t('plugin.views')}
          value={totals.views.toLocaleString()}
          comparison={0}
          icon={MousePointer2}
          chartData={processedData}
          dataKey="views"
        />
        <KpiCard
          title={t('developer.analytics.conversion_rate')}
          value={`${totals.conversionRate || 0}%`}
          comparison={0}
          icon={MousePointer2}
          chartData={processedData}
          dataKey="conversionRate"
        />
        <KpiCard
          title={t('developer.analytics.avg_rating')}
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
          <h3 className="h3">{t('developer.analytics.telemetry_title')}</h3>
          <span className="tag tag-solid tag-success">{t('developer.analytics.real_time_heartbeats')}</span>
        </div>
        <div className="panel-body stack st-an-gap">
          <p className="small">
            <Trans t={t} i18nKey="developer.analytics.telemetry_description" components={{ plugin: <strong>{pluginName}</strong> }} />
          </p>

          <div className="stats">
            <Telemetry
              icon={Server}
              label={t('developer.analytics.active_servers_24h')}
              value={telemetry?.activeServers24h?.toLocaleString() ?? 0}
              hint={t('developer.analytics.weekly_active_servers', { count: telemetry?.activeServers7d ?? 0 })}
            />
            <Telemetry
              icon={Users}
              label={t('developer.analytics.total_player_reach')}
              value={telemetry?.totalPlayersOnline?.toLocaleString() ?? 0}
              hint={t('developer.analytics.player_reach_hint')}
            />
            <Telemetry
              icon={Activity}
              label={t('developer.analytics.peak_24h_players')}
              value={telemetry?.peakPlayers24h?.toLocaleString() ?? 0}
              hint={t('developer.analytics.peak_players_hint')}
            />
            <Telemetry
              icon={Radio}
              label={t('developer.analytics.primary_platform')}
              value={telemetry?.serverTypes?.[0]?.label || 'Pumpkin'}
              hint={telemetry?.serverTypes?.[0]?.percentage ? t('developer.analytics.instance_percentage', { percentage: telemetry.serverTypes[0].percentage }) : t('developer.analytics.awaiting_heartbeats')}
              text
            />
          </div>

          <div className="st-an-trio">
            <div className="st-an-box">
              <span className="label label-fg st-an-label"><Layers />{t('developer.analytics.installed_version_adoption')}</span>
              {telemetry?.versions && telemetry.versions.length > 0 ? (
                <div className="stack st-an-tight">
                  {telemetry.versions.map((ver, idx) => (
                    <div key={idx} className="st-an-version">
                      <div className="row">
                        <span className="mono">{t('developer.analytics.v')}{ver.label.replace(/^v/, '')}</span>
                        <span className="spacer" />
                        <span className="small num">{t('developer.analytics.version_servers', { count: ver.count, percentage: ver.percentage })}</span>
                      </div>
                      <div className={`meter${idx === 0 ? ' meter-pumpkin' : ''}`}><span style={{ width: `${Math.min(ver.percentage, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="small st-an-empty">{t('developer.analytics.versions_empty')}</p>
              )}
            </div>

            <div className="st-an-box">
              <span className="label label-fg st-an-label"><Cpu />{t('developer.analytics.server_runtime_environment')}</span>

              {telemetry?.serverTypes && telemetry.serverTypes.length > 0 && (
                <div className="stack st-an-tight">
                  <span className="label">{t('developer.analytics.server_software')}</span>
                  <div className="row st-an-tight">
                    {telemetry.serverTypes.map((st, i) => (
                      <span key={i} className="tag tag-fg">{st.label}: {st.count} ({st.percentage}%)</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="stack st-an-tight">
                <span className="label">{t('developer.analytics.minecraft_versions')}</span>
                {telemetry?.minecraftVersions && telemetry.minecraftVersions.length > 0 ? (
                  <div className="row st-an-tight">
                    {telemetry.minecraftVersions.slice(0, 4).map((mc, i) => (
                      <span key={i} className="tag tag-pumpkin">{t('developer.analytics.mc')}{' '}{mc.label} ({mc.percentage}%)</span>
                    ))}
                  </div>
                ) : (
                  <span className="small">MC 1.21.x</span>
                )}
              </div>

              <div className="stack st-an-tight">
                <span className="label">{t('developer.analytics.server_host_os')}</span>
                {telemetry?.operatingSystems && telemetry.operatingSystems.length > 0 ? (
                  <div className="row st-an-tight">
                    {telemetry.operatingSystems.slice(0, 3).map((os, i) => (
                      <span key={i} className="tag">{os.label} ({os.percentage}%)</span>
                    ))}
                  </div>
                ) : (
                  <span className="small">{t('developer.analytics.linux_bare_metal')}</span>
                )}
              </div>
            </div>

            <div className="st-an-box">
              <span className="label label-fg st-an-label"><Globe />{t('developer.analytics.active_server_locations')}</span>
              {telemetry?.countries && telemetry.countries.length > 0 ? (
                <dl className="specs st-an-scroll">
                  {telemetry.countries.slice(0, 6).map((c, i) => (
                    <React.Fragment key={i}>
                      <dt className="st-an-clip" title={c.countryName}>{c.countryName}</dt>
                      <dd className="small">
                        <Trans t={t} i18nKey="developer.analytics.location_servers" count={c.servers} components={{ servers: <strong className="pumpkin">{c.servers}</strong> }} />{' • '}{t('developer.analytics.players', { count: c.players })}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              ) : (
                <p className="small st-an-empty">{t('developer.analytics.locations_empty')}</p>
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
              <h3 className="h3">{t('developer.analytics.performance_trends')}</h3>
              <span className="spacer" />
              <span className="status small"><span className="dot st-an-dot-fg" />{t('plugin.downloads')}</span>
              <span className="status small"><span className="dot dot-pumpkin" />{t('developer.analytics.revenue_label')}</span>
            </div>
            <div className="panel-body">
              <div className="st-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    {GRID}
                    <XAxis dataKey="date" {...AXIS} dy={8} />
                    <YAxis {...AXIS} tickFormatter={formatValue} />
                    <Tooltip content={<ChartTip />} cursor={CURSOR} />
                    <Area type="linear" dataKey="downloads" name={t('plugin.downloads')} stroke="var(--fg)" strokeWidth={3} fill="var(--fg)" fillOpacity={0.06} />
                    <Area type="linear" dataKey="earnings" name={t('developer.analytics.revenue_label')} stroke="var(--pumpkin)" strokeWidth={3} fill="var(--pumpkin)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head st-an-head">
              <Star className="st-an-icon" />
              <h3 className="h3">{t('developer.analytics.rating_trend')}</h3>
            </div>
            <div className="panel-body">
              <div className="st-chart st-chart-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    {GRID}
                    <XAxis dataKey="date" {...AXIS} dy={8} />
                    <YAxis domain={[1, 5]} {...AXIS} />
                    <Tooltip content={<ChartTip />} cursor={CURSOR} />
                    <Line type="linear" dataKey="avgRating" name={t('developer.analytics.avg_rating')} stroke="var(--pumpkin)" strokeWidth={3} dot={{ r: 3, fill: 'var(--pumpkin)', strokeWidth: 0 }} />
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
                <h3 className="h3">{t('developer.analytics.rating_breakdown')}</h3>
              </div>
              <div className="panel-body stack">
                <div className="st-an-score">
                  <span className="stat-value">{ratingSummary.averageRating.toFixed(1)}</span>
                  <span className="small">{t('developer.analytics.customer_reviews', { count: ratingSummary.totalReviews })}</span>
                </div>
                <RatingBars summary={ratingSummary} />
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head st-an-head">
              <Globe className="st-an-icon" />
              <h3 className="h3">{t('developer.analytics.traffic_sources_ctr')}</h3>
            </div>
            <div className="panel-body">
              {referrers && referrers.length > 0 ? (
                <ul className="st-an-list">
                  {referrers.map((r: any, idx: number) => (
                    <li key={idx}>
                      <span className="st-an-clip">
                        <strong>{r.referrer}</strong>
                        <span className="ledger-sub">{t('developer.analytics.views_count', { count: r.views })}{' • '}{t('developer.analytics.downloads_count', { count: r.downloads })}</span>
                      </span>
                      <span className="tag tag-success">{t('developer.analytics.clickthrough_rate', { rate: r.ctr })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small st-an-empty">{t('developer.analytics.referrers_empty')}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
