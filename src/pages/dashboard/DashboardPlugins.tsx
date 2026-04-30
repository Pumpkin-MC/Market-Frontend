import { useMemo } from 'react';
import { useAnalytics } from './useAnalytics';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, ExternalLink } from 'lucide-react'; // Added some icons for a cleaner UI

// --- Main Component ---
const DashboardPlugins = () => {
    const { timeSeries } = useAnalytics();
    const navigate = useNavigate();

    // Grouping analytics data by plugin ID
    const plugins = useMemo(() => {
        return Object.values(timeSeries.reduce((acc, curr) => {
            // Ensure we use curr.plugin_id or curr.id depending on your hook's structure
            const id = curr.plugin_id || curr.id; 
            if (!acc[id]) {
                acc[id] = { 
                    id: id, 
                    name: curr.name, 
                    downloads: 0, 
                    earnings: 0,
                    created_at: curr.created_at,
                    updated_at: curr.updated_at
                };
            }
            acc[id].downloads += (curr.downloads || 0);
            acc[id].earnings += (curr.earnings || 0);
            return acc;
        }, {} as Record<string, any>));
    }, [timeSeries]);

    const formatDate = (dateStr: string) => {
        if (!dateStr || typeof dateStr !== 'string') return 'N/A';
        const normalized = dateStr.toLowerCase().trim();
        if (normalized === 'none' || normalized === 'null' || normalized === 'undefined') return 'N/A';
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="dashboard-grid-layout">
            <div className="data-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>My Active Plugins</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard/add-plugin')}>
                        <Plus size={18} style={{ marginRight: '8px' }} />
                        Add New Plugin
                    </button>
                </div>
                
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Downloads</th>
                            <th>Earnings</th>
                            <th>Dates</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plugins.map((p: any) => (
                            <tr key={p.id}>
                                <td data-label="Name">
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <strong>{p.name}</strong>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--dash-text-muted)' }}>ID: {p.id}</span>
                                    </div>
                                </td>
                                <td data-label="Downloads" className="mono">{p.downloads.toLocaleString()}</td>
                                <td data-label="Earnings" className="mono" style={{ color: 'var(--success)' }}>
                                    +${p.earnings.toFixed(2)}
                                </td>
                                <td data-label="Dates">
                                    <div style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>
                                        <div>Created: {formatDate(p.created_at)}</div>
                                        <div>Updated: {formatDate(p.updated_at)}</div>
                                    </div>
                                </td>
                                <td data-label="Actions" style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        {/* View on Marketplace */}
                                        <button 
                                            className="btn btn-icon-only" 
                                            onClick={() => navigate(`/plugin/${p.id}`)}
                                            title="View in Store"
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                        
                                        {/* Manage/Edit Plugin */}
                                        <button 
                                            className="btn btn-secondary" 
                                            onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Settings size={16} />
                                            Manage
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        
                        {plugins.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                                    <div style={{ opacity: 0.6 }}>
                                        <p>No plugins published yet.</p>
                                        <small>Click "Add New Plugin" to get started</small>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardPlugins;