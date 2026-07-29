import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, DollarSign, 
  Download, MousePointer2, Star, BarChart3, Globe
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
  const { processedData, totals, ratingSummary, referrers, timeframe, setTimeframe, loading } = useAnalytics(pluginId);
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
            value={ratingSummary?.averageRating ? `★ ${ratingSummary.averageRating.toFixed(1)}` : '★ --'}
            comparison={0}
            icon={Star}
            chartData={processedData}
            dataKey="avgRating"
          />
        </div>
      </div>

      {/* Grid: Charts & Rating Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Revenue & Download Growth */}
          <div className="mp-card">
            <div className="mp-card-title">
              <BarChart3 size={16} />
              Downloads & Revenue Over Time
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={formatValue} />
                <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                <Area type="monotone" dataKey="downloads" name="Downloads" stroke="#3ecf8e" strokeWidth={3} fillOpacity={1} fill="url(#dlGradient)" animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Rating History */}
          <div className="mp-card">
            <div className="mp-card-title">
              <Star size={16} color="#f59e0b" />
              Rating Trend Over Time
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis domain={[1, 5]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                <Line type="monotone" dataKey="avgRating" name="Rating" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} animationDuration={1200} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar: Rating Histogram & Traffic Sources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {ratingSummary && (
            <div className="mp-card">
              <div className="mp-card-title">
                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                Rating Breakdown
              </div>

              <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--mp-text)' }}>
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
                      <span style={{ width: '32px', color: 'var(--mp-text-2)' }}>{b.stars} ★</span>
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
