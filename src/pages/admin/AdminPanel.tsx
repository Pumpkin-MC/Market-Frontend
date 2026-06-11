import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../App';
import './AdminPanel.css';

const AdminPanel = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';

    const [activeTab, setActiveTab] = useState<'users' | 'plugins' | 'logs'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [plugins, setPlugins] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search and Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [logFilterAction, setLogFilterAction] = useState('all');
    const [logFilterModerator, setLogFilterModerator] = useState('all');

    // Details Modal state
    const [selectedItem, setSelectedItem] = useState<{type: 'user' | 'plugin' | 'log', data: any} | null>(null);

    useEffect(() => {
        fetchData();
        setSearchQuery(''); // Reset search on tab change
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'users') {
                const res = await api.get('/admin/users');
                setUsers(Array.isArray(res.data) ? res.data : []);
            } else if (activeTab === 'plugins') {
                const res = await api.get('/admin/plugins');
                setPlugins(Array.isArray(res.data) ? res.data : []);
            } else if (activeTab === 'logs') {
                const res = await api.get('/admin/logs');
                setLogs(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch data');
            setUsers([]);
            setPlugins([]);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (id: number) => {
        const reason = window.prompt('Enter reason for deactivation:');
        if (!reason) return;
        try {
            await api.delete(`/admin/users/${id}`, { data: { reason } });
            setUsers(users.map(u => u.id === id ? { ...u, deleted_at: new Date().toISOString() } : u));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete user');
        }
    };

    const changeRole = async (id: number, newRole: string) => {
        const reason = window.prompt(`Enter reason for changing role to ${newRole} (Optional):`);
        try {
            await api.put(`/admin/users/${id}/role`, { role: newRole, reason: reason || undefined });
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
            alert('Role updated successfully');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update role');
        }
    };

    const deletePlugin = async (id: number) => {
        const reason = window.prompt('Enter reason for removal:');
        if (!reason) return;
        try {
            await api.delete(`/admin/plugins/${id}`, { data: { reason } });
            setPlugins(plugins.map(p => p.id === id ? { ...p, deleted_at: new Date().toISOString() } : p));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete plugin');
        }
    };

    // Filtering logic
    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toString().includes(searchQuery)
    );

    const filteredPlugins = plugins.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.dev_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toString().includes(searchQuery)
    );

    const filteredLogs = logs.filter(l => {
        const matchesSearch = 
            l.moderator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.target_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.target_id.toString().includes(searchQuery);
        
        const matchesAction = logFilterAction === 'all' || l.action === logFilterAction;
        const matchesModerator = logFilterModerator === 'all' || l.moderator_name === logFilterModerator;

        return matchesSearch && matchesAction && matchesModerator;
    });

    // Unique moderators for the filter dropdown
    const uniqueModerators = Array.from(new Set(logs.map(l => l.moderator_name)));

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Staff <span>Panel</span></h1>
                <div className="admin-tabs">
                    <button 
                        className={activeTab === 'users' ? 'active' : ''} 
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </button>
                    <button 
                        className={activeTab === 'plugins' ? 'active' : ''} 
                        onClick={() => setActiveTab('plugins')}
                    >
                        Plugins
                    </button>
                    <button 
                        className={activeTab === 'logs' ? 'active' : ''} 
                        onClick={() => setActiveTab('logs')}
                    >
                        Logs
                    </button>
                </div>
            </header>

            <div className="admin-controls">
                <div className="admin-search">
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab}...`} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {activeTab === 'logs' && (
                    <div className="admin-filters">
                        <select value={logFilterAction} onChange={(e) => setLogFilterAction(e.target.value)}>
                            <option value="all">All Actions</option>
                            <option value="soft_delete">Soft Delete</option>
                            <option value="role_change">Role Change</option>
                        </select>
                        <select value={logFilterModerator} onChange={(e) => setLogFilterModerator(e.target.value)}>
                            <option value="all">All Moderators</option>
                            {uniqueModerators.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {error && <div className="admin-error">{error}</div>}

            <main className="admin-content">
                {loading ? (
                    <div className="admin-loading">Loading...</div>
                ) : activeTab === 'users' ? (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id} className={u.deleted_at ? 'row-deleted' : ''}>
                                    <td data-label="ID">{u.id}</td>
                                    <td data-label="Username">{u.username}</td>
                                    <td data-label="Email">{u.email}</td>
                                    <td data-label="Role">
                                        {isAdmin ? (
                                            <select 
                                                className={`role-badge ${u.role}`} 
                                                value={u.role} 
                                                onChange={(e) => changeRole(u.id, e.target.value)}
                                                disabled={!!u.deleted_at}
                                            >
                                                <option value="user">User</option>
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            <span className={`role-badge ${u.role}`}>{u.role}</span>
                                        )}
                                    </td>
                                    <td data-label="Status">{u.deleted_at ? <span className="status-deleted">Deleted</span> : <span className="status-active">Active</span>}</td>
                                    <td data-label="Actions">
                                        <div className="action-buttons">
                                            <button className="btn-view" onClick={() => setSelectedItem({type: 'user', data: u})}>View</button>
                                            {!u.deleted_at && <button className="btn-delete" onClick={() => deleteUser(u.id)}>Delete</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : activeTab === 'plugins' ? (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Price</th>
                                <th>Developer</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlugins.map(p => (
                                <tr key={p.id} className={p.deleted_at ? 'row-deleted' : ''}>
                                    <td data-label="ID">{p.id}</td>
                                    <td data-label="Name">{p.name}</td>
                                    <td data-label="Type"><span className={`type-badge ${p.type}`}>{p.type}</span></td>
                                    <td data-label="Price">€{(p.price_cents / 100).toFixed(2)}</td>
                                    <td data-label="Developer">{p.dev_name}</td>
                                    <td data-label="Status">{p.deleted_at ? <span className="status-deleted">Deleted</span> : <span className="status-active">Active</span>}</td>
                                    <td data-label="Actions">
                                        <div className="action-buttons">
                                            <button className="btn-view" onClick={() => setSelectedItem({type: 'plugin', data: p})}>View</button>
                                            {!p.deleted_at && <button className="btn-delete" onClick={() => deletePlugin(p.id)}>Delete</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Moderator</th>
                                <th>Action</th>
                                <th>Target</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(l => (
                                <tr key={l.id}>
                                    <td data-label="Date">{new Date(l.created_at).toLocaleString()}</td>
                                    <td data-label="Moderator">{l.moderator_name}</td>
                                    <td data-label="Action"><strong>{l.action.toUpperCase()}</strong></td>
                                    <td data-label="Target">{l.target_type} ({l.target_id})</td>
                                    <td data-label="Actions">
                                        <button className="btn-view" onClick={() => setSelectedItem({type: 'log', data: l})}>View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>

            {selectedItem && (
                <div className="admin-modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <h2>{selectedItem.type.toUpperCase()} Details</h2>
                            <button className="close-modal" onClick={() => setSelectedItem(null)}>&times;</button>
                        </header>
                        <div className="modal-body">
                            {selectedItem.type === 'user' && (
                                <div className="details-grid">
                                    <div className="detail-item"><strong>ID:</strong> {selectedItem.data.id}</div>
                                    <div className="detail-item"><strong>Username:</strong> {selectedItem.data.username}</div>
                                    <div className="detail-item"><strong>Email:</strong> {selectedItem.data.email}</div>
                                    <div className="detail-item"><strong>Role:</strong> {selectedItem.data.role}</div>
                                    <div className="detail-item"><strong>Stripe Ready:</strong> {selectedItem.data.stripe_ready ? 'Yes' : 'No'}</div>
                                    <div className="detail-item"><strong>2FA Enabled:</strong> {selectedItem.data.totp_enabled ? 'Yes' : 'No'}</div>
                                    <div className="detail-item"><strong>Created:</strong> {new Date(selectedItem.data.created_at).toLocaleString()}</div>
                                    <div className="detail-item"><strong>Status:</strong> {selectedItem.data.deleted_at ? `Deleted at ${new Date(selectedItem.data.deleted_at).toLocaleString()}` : 'Active'}</div>
                                </div>
                            )}
                            {selectedItem.type === 'plugin' && (
                                <div className="details-grid">
                                    <div className="detail-item"><strong>ID:</strong> {selectedItem.data.id}</div>
                                    <div className="detail-item"><strong>Name:</strong> {selectedItem.data.name}</div>
                                    <div className="detail-item"><strong>Developer:</strong> {selectedItem.data.dev_name}</div>
                                    <div className="detail-item"><strong>Type:</strong> {selectedItem.data.type}</div>
                                    <div className="detail-item"><strong>Category:</strong> {selectedItem.data.category}</div>
                                    <div className="detail-item"><strong>Price:</strong> €{(selectedItem.data.price_cents / 100).toFixed(2)}</div>
                                    <div className="detail-item"><strong>Downloads:</strong> {selectedItem.data.downloads}</div>
                                    <div className="detail-item"><strong>Views:</strong> {selectedItem.data.views}</div>
                                    <div className="detail-item"><strong>Created:</strong> {new Date(selectedItem.data.created_at).toLocaleString()}</div>
                                    <div className="detail-item"><strong>Status:</strong> {selectedItem.data.deleted_at ? `Deleted at ${new Date(selectedItem.data.deleted_at).toLocaleString()}` : 'Active'}</div>
                                </div>
                            )}
                            {selectedItem.type === 'log' && (
                                <div className="details-grid">
                                    <div className="detail-item"><strong>Date:</strong> {new Date(selectedItem.data.created_at).toLocaleString()}</div>
                                    <div className="detail-item"><strong>Moderator:</strong> {selectedItem.data.moderator_name}</div>
                                    <div className="detail-item"><strong>Action:</strong> {selectedItem.data.action}</div>
                                    <div className="detail-item"><strong>Target Type:</strong> {selectedItem.data.target_type}</div>
                                    <div className="detail-item"><strong>Target ID:</strong> {selectedItem.data.target_id}</div>
                                    <div className="detail-item full-width"><strong>Reason:</strong> {selectedItem.data.reason || 'No reason provided'}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
