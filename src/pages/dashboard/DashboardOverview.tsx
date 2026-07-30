import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, DollarSign, 
  Download, MousePointer2, Clock, User, Star
} from 'lucide-react';
import { useAnalyticsContext } from './AnalyticsContext';

// Helper for formatting large numbers
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

const DashboardOverview = () => {
  const { processedData, totals, ratingSummary, timeframe, setTimeframe, recentActivity, trends } = useAnalyticsContext();
  const timeframes = ['Today', '7 Days', '1 Month', '1 Year'];

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-top-nav">
        <div>
          <h1>Overview</h1>
          <p className="subtitle">Real-time performance for the <strong>{timeframe}</strong> period</p>
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
      </header>

      <div className="dashboard-grid-v2">
        <main className="main-stats">
          <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <KpiCard
              title="Revenue"
              value={`$${totals.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              comparison={trends?.earnings}
              icon={DollarSign}
              chartData={processedData}
              dataKey="earnings"
            />
            <KpiCard
              title="Downloads"
              value={totals.downloads.toLocaleString()}
              comparison={trends?.downloads}
              icon={Download}
              chartData={processedData}
              dataKey="downloads"
            />
            <KpiCard
              title="Conversion"
              value={`${totals.conversionRate || 0}%`}
              comparison={trends?.conversion}
              icon={MousePointer2}
              chartData={processedData}
              dataKey="conversion" 
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

          <div className="chart-container-v2" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-header">
              <h3>Revenue Growth</h3>
              <div className="chart-legend">
                <span className="legend-item earnings">Earnings ($)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                    dy={10} 
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    tickFormatter={formatValue}
                />
                <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  name="Earnings ($)"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Rating Over Time Chart ── */}
          <div className="chart-container-v2">
            <div className="chart-header">
              <h3>Rating Over Time</h3>
              <div className="chart-legend">
                <span className="legend-item" style={{ color: '#f59e0b' }}>★ Daily Rating (1-5)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                    dy={10} 
                />
                <YAxis 
                    domain={[1, 5]}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                />
                <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                <Line
                  type="monotone"
                  dataKey="avgRating"
                  name="Rating"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b' }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </main>

        <aside className="activity-sidebar-v2">
          {/* Rating Breakdown Widget */}
          {ratingSummary && (
            <div className="rating-breakdown-card" style={{ background: '#0f0f1a', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={16} fill="#f59e0b" color="#f59e0b" /> Rating Breakdown
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text)' }}>
                    {ratingSummary.averageRating.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {ratingSummary.totalReviews} total reviews
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ratingSummary.breakdown?.map((b: any) => {
                    const pct = ratingSummary.totalReviews > 0 ? (b.count / ratingSummary.totalReviews) * 100 : 0;
                    return (
                      <div key={b.stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                        <span style={{ width: '32px', color: 'var(--text-muted)' }}>{b.stars} ★</span>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                        </div>
                        <span style={{ width: '24px', textAlign: 'right', color: 'var(--text-muted)' }}>{b.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="sidebar-header">
            <h3>Live Activity</h3>
            <span className="live-indicator"></span>
          </div>
          <div className="feed-list">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity: any) => (
                <div key={activity.id} className="feed-item-v2">
                  <div className="feed-avatar">
                    {activity.userInitials || <User size={14} />}
                  </div>
                  <div className="feed-content">
                    <p><strong>{activity.userName}</strong> {activity.action} <strong>{activity.productName}</strong></p>
                    <span className="feed-time"><Clock size={10} /> {activity.timeAgo}</span>
                  </div>
                  <div className={`feed-amount ${activity.type === 'sale' ? 'positive' : ''}`}>
                    {activity.amount ? `+$${activity.amount}` : '--'}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-feed">
                <p>No activity in this period.</p>
              </div>
            )}
          </div>
          <button className="view-all-btn">View full history</button>
        </aside>
      </div>
    </div>
  );
};

export default DashboardOverview;
