import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, DollarSign, 
  Download, MousePointer2, Clock, User 
} from 'lucide-react';
import { useAnalytics } from './useAnalytics';

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
        <p className="value">${payload[0].value.toLocaleString()}</p>
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
  // Logic Fix: Handle 0% as neutral
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
  const { processedData, totals, timeframe, setTimeframe, recentActivity, trends } = useAnalytics();
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
          <div className="kpi-row">
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
          </div>

          <div className="chart-container-v2">
            <div className="chart-header">
              <h3>Revenue Growth</h3>
              <div className="chart-legend">
                <span className="legend-item earnings">Earnings ($)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
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
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </main>

        <aside className="activity-sidebar-v2">
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
