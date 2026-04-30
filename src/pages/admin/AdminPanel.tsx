import { useState, useEffect } from 'react';
import api from '../../api';
import './AdminPanel.css';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'plugins'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [plugins, setPlugins] = useState<any[]>([]);
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
            } else {
                const res = await api.get('/admin/plugins');
                setPlugins(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch data');
            setUsers([]);
            setPlugins([]);
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this user and all their plugins?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete user');
        }
    };

    const deletePlugin = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this plugin?')) return;
        try {
            await api.delete(`/admin/plugins/${id}`);
            setPlugins(plugins.filter(p => p.id !== id));
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
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td data-label="ID">{u.id}</td>
                                    <td data-label="Username">{u.username}</td>
                                    <td data-label="Email">{u.email}</td>
                                    <td data-label="Role"><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                                    <td data-label="Stripe">{u.stripe_ready ? '✅' : '❌'}</td>
                                    <td data-label="Created">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                                    <td data-label="Actions">
                                        <button className="btn-delete" onClick={() => deleteUser(u.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Price</th>
                                <th>Developer</th>
                                <th>Downloads</th>
                                <th>Views</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plugins.map(p => (
                                <tr key={p.id}>
                                    <td data-label="ID">{p.id}</td>
                                    <td data-label="Name">{p.name}</td>
                                    <td data-label="Type"><span className={`type-badge ${p.type}`}>{p.type}</span></td>
                                    <td data-label="Price">€{(p.price_cents / 100).toFixed(2)}</td>
                                    <td data-label="Developer">{p.dev_name}</td>
                                    <td data-label="Downloads">{p.downloads}</td>
                                    <td data-label="Views">{p.views}</td>
                                    <td data-label="Actions">
                                        <button className="btn-delete" onClick={() => deletePlugin(p.id)}>Delete</button>
                                    </td>
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
