import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { scaleLinear } from "d3-scale";
import { useAnalytics } from './useAnalytics';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const DashboardAudience = () => {
  const { mapData, loading } = useAnalytics(); 
  const [mapFilter, setMapFilter] = useState<'visitors' | 'free_downloads' | 'buyers'>('visitors');

  // Memoize scales to prevent recalculation on every render
  const colorScales = useMemo(() => ({
    visitors: scaleLinear<string>().domain([0, 50]).range(["#1a1a2e", "#8884d8"]),
    free_downloads: scaleLinear<string>().domain([0, 50]).range(["#1a1a2e", "#82ca9d"]),
    buyers: scaleLinear<string>().domain([0, 50]).range(["#1a1a2e", "#FF7518"]),
  }), []);

  if (loading || !mapData) {
    return (
      <div className="loader-container" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="pumpkin-spinner"></div>
        <p>Analyzing Global Distribution...</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="charts-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>Geographic <span>Distribution</span></h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Visualizing user activity across the globe</p>
            </div>
            <div className="map-filters" style={{ display: 'flex', gap: '8px' }}>
              {(['visitors', 'free_downloads', 'buyers'] as const).map(type => (
                <button 
                   key={type}
                   className={`btn-sm ${mapFilter === type ? 'active' : ''}`} 
                   onClick={() => setMapFilter(type)}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div className="map-wrapper" style={{ background: '#0f0f1a', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
            <ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }} width={800} height={400}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    // Try different property keys used by various GeoJSON versions
                    const countryCode = geo.properties.ISO_A2 || geo.properties.iso_a2 || geo.properties.IS_A2;
                    const d = mapData.find((s: any) => s.country === countryCode);
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={d ? colorScales[mapFilter](d[mapFilter] || 0) : "#1a1a2e"}
                        stroke="#2a2a40"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "var(--primary)", outline: "none", cursor: 'pointer' },
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
                No geographic data captured yet. (Note: Localhost/VPN IPs may appear as 'Unknown')
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAudience;