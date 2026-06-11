import { useState, useEffect } from 'react';
import api from '../../api';
import './AdminPanel.css';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'plugins' | 'logs'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [plugins, setPlugins] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
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
        const reason = window.prompt(`Enter reason for changing role to ${newRole}:`);
        if (!reason) return;
        try {
            await api.put(`/admin/users/${id}/role`, { role: newRole, reason });
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

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Admin <span>Panel</span></h1>
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
                                <th>Stripe</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className={u.deleted_at ? 'row-deleted' : ''}>
                                    <td data-label="ID">{u.id}</td>
                                    <td data-label="Username">{u.username}</td>
                                    <td data-label="Email">{u.email}</td>
                                    <td data-label="Role">
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
                                    </td>
                                    <td data-label="Stripe">{u.stripe_ready ? '✅' : '❌'}</td>
                                    <td data-label="Status">{u.deleted_at ? <span className="status-deleted">Deleted</span> : <span className="status-active">Active</span>}</td>
                                    <td data-label="Actions">
                                        {!u.deleted_at && <button className="btn-delete" onClick={() => deleteUser(u.id)}>Delete</button>}
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
                            {plugins.map(p => (
                                <tr key={p.id} className={p.deleted_at ? 'row-deleted' : ''}>
                                    <td data-label="ID">{p.id}</td>
                                    <td data-label="Name">{p.name}</td>
                                    <td data-label="Type"><span className={`type-badge ${p.type}`}>{p.type}</span></td>
                                    <td data-label="Price">€{(p.price_cents / 100).toFixed(2)}</td>
                                    <td data-label="Developer">{p.dev_name}</td>
                                    <td data-label="Status">{p.deleted_at ? <span className="status-deleted">Deleted</span> : <span className="status-active">Active</span>}</td>
                                    <td data-label="Actions">
                                        {!p.deleted_at && <button className="btn-delete" onClick={() => deletePlugin(p.id)}>Delete</button>}
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
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(l => (
                                <tr key={l.id}>
                                    <td data-label="Date">{new Date(l.created_at).toLocaleString()}</td>
                                    <td data-label="Moderator">{l.moderator_name}</td>
                                    <td data-label="Action"><strong>{l.action.toUpperCase()}</strong></td>
                                    <td data-label="Target">{l.target_type} ({l.target_id})</td>
                                    <td data-label="Reason">{l.reason || 'No reason provided'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};

export default AdminPanel;
