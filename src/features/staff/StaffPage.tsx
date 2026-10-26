import { useState, useEffect, Fragment } from 'react';
import { Check, CircleAlert, Search, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { Select } from '../../components/Select';
import '../../styles/store.css';

const StaffPage = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';

    const [activeTab, setActiveTab] = useState<'users' | 'plugins' | 'logs'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [plugins, setPlugins] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [logFilterAction, setLogFilterAction] = useState('all');
    const [logFilterModerator, setLogFilterModerator] = useState('all');

    const [selectedItem, setSelectedItem] = useState<{type: 'user' | 'plugin' | 'log', data: any} | null>(null);

    useEffect(() => {
        fetchData();
        setSearchQuery('');
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

    const uniqueModerators = Array.from(new Set(logs.map(l => l.moderator_name)));

    const status = (deletedAt?: string) => deletedAt
        ? <span className="status"><span className="mark-box mark-box-danger"><X /></span>Deleted</span>
        : <span className="status"><span className="mark-box mark-box-success"><Check /></span>Active</span>;

    const roleTone: Record<string, string> = { admin: 'tag-pumpkin', moderator: 'tag-info', user: 'tag-fg' };
    const typeTone: Record<string, string> = { free: 'tag-success', paid: 'tag-pumpkin', adwall: 'tag-info' };

    const details: [string, any][] = !selectedItem ? [] : selectedItem.type === 'user' ? [
        ['ID', selectedItem.data.id],
        ['Username', selectedItem.data.username],
        ['Email', selectedItem.data.email],
        ['Role', selectedItem.data.role],
        ['Stripe Ready', selectedItem.data.stripe_ready ? 'Yes' : 'No'],
        ['2FA Enabled', selectedItem.data.totp_enabled ? 'Yes' : 'No'],
        ['Created', new Date(selectedItem.data.created_at).toLocaleString()],
        ['Status', selectedItem.data.deleted_at ? `Deleted at ${new Date(selectedItem.data.deleted_at).toLocaleString()}` : 'Active'],
    ] : selectedItem.type === 'plugin' ? [
        ['ID', selectedItem.data.id],
        ['Name', selectedItem.data.name],
        ['Developer', selectedItem.data.dev_name],
        ['Type', selectedItem.data.type],
        ['Category', selectedItem.data.category],
        ['Price', `€${(selectedItem.data.price_cents / 100).toFixed(2)}`],
        ['Downloads', selectedItem.data.downloads],
        ['Views', selectedItem.data.views],
        ['Created', new Date(selectedItem.data.created_at).toLocaleString()],
        ['Status', selectedItem.data.deleted_at ? `Deleted at ${new Date(selectedItem.data.deleted_at).toLocaleString()}` : 'Active'],
    ] : [
        ['Date', new Date(selectedItem.data.created_at).toLocaleString()],
        ['Moderator', selectedItem.data.moderator_name],
        ['Action', selectedItem.data.action],
        ['Target Type', selectedItem.data.target_type],
        ['Target ID', selectedItem.data.target_id],
        ['Reason', selectedItem.data.reason || 'No reason provided'],
    ];

    const tabs: [typeof activeTab, string][] = [['users', 'Users'], ['plugins', 'Plugins'], ['logs', 'Logs']];

    return (
        <div className="page stack sf-pad sf-staff">
            <header className="stack">
                <h1 className="display-2">Staff <span className="mark">Panel</span></h1>
                <div className="tabs" role="tablist">
                    {tabs.map(([id, label]) => (
                        <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="row sf-staff-controls">
                <label className="search">
                    <Search />
                    <input
                        id="adminSearchInput"
                        name="adminSearch"
                        className="input"
                        type="search"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </label>
                {activeTab === 'logs' && (
                    <>
                        <Select
                            options={[
                                { value: 'all', label: 'All Actions' },
                                { value: 'soft_delete', label: 'Soft Delete' },
                                { value: 'role_change', label: 'Role Change' },
                            ]}
                            value={logFilterAction}
                            onChange={setLogFilterAction}
                            aria-label="All Actions"
                        />
                        <Select
                            options={[{ value: 'all', label: 'All Moderators' }, ...uniqueModerators]}
                            value={logFilterModerator}
                            onChange={setLogFilterModerator}
                            aria-label="All Moderators"
                        />
                    </>
                )}
            </div>

            {error && (
                <div className="notice notice-danger">
                    <span className="mark-box mark-box-danger"><CircleAlert /></span>
                    <p className="notice-text">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="sf-loader">
                    <span className="loading" />
                    <p className="small">Loading...</p>
                </div>
            ) : activeTab === 'users' ? (
                <div className="scroll-x">
                    <table className="ledger">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th className="end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id} className={u.deleted_at ? 'sf-row-off' : undefined}>
                                    <td className="mono">{u.id}</td>
                                    <td><strong>{u.username}</strong></td>
                                    <td>{u.email}</td>
                                    <td>
                                        {isAdmin && !u.deleted_at ? (
                                            <Select
                                                options={[
                                                    { value: 'user', label: 'User' },
                                                    { value: 'moderator', label: 'Moderator' },
                                                    { value: 'admin', label: 'Admin' },
                                                ]}
                                                value={u.role}
                                                onChange={(role) => role !== u.role && changeRole(u.id, role)}
                                                aria-label="Role"
                                            />
                                        ) : (
                                            <span className={`tag ${roleTone[u.role] || ''}`}>{u.role}</span>
                                        )}
                                    </td>
                                    <td>{status(u.deleted_at)}</td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({type: 'user', data: u})}>View</button>
                                            {!u.deleted_at && <button className="button button-danger button-sm" onClick={() => deleteUser(u.id)}>Delete</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : activeTab === 'plugins' ? (
                <div className="scroll-x">
                    <table className="ledger">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th className="end">Price</th>
                                <th>Developer</th>
                                <th>Status</th>
                                <th className="end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlugins.map(p => (
                                <tr key={p.id} className={p.deleted_at ? 'sf-row-off' : undefined}>
                                    <td className="mono">{p.id}</td>
                                    <td><strong>{p.name}</strong></td>
                                    <td><span className={`tag ${typeTone[p.type] || ''}`}>{p.type}</span></td>
                                    <td className="end">€{(p.price_cents / 100).toFixed(2)}</td>
                                    <td>{p.dev_name}</td>
                                    <td>{status(p.deleted_at)}</td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({type: 'plugin', data: p})}>View</button>
                                            {!p.deleted_at && <button className="button button-danger button-sm" onClick={() => deletePlugin(p.id)}>Delete</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="scroll-x">
                    <table className="ledger">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Moderator</th>
                                <th>Action</th>
                                <th>Target</th>
                                <th className="end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(l => (
                                <tr key={l.id}>
                                    <td className="muted">{new Date(l.created_at).toLocaleString()}</td>
                                    <td><strong>{l.moderator_name}</strong></td>
                                    <td><span className="tag tag-fg">{l.action.toUpperCase()}</span></td>
                                    <td>{l.target_type} <span className="mono muted">({l.target_id})</span></td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({type: 'log', data: l})}>View</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedItem && (
                <div className="overlay sf-modal" onClick={() => setSelectedItem(null)}>
                    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sf-staff-details" onClick={e => e.stopPropagation()}>
                        <div className="sheet-head">
                            <div className="stack">
                                <span className="sticker sticker-sm">{selectedItem.type}</span>
                                <h2 className="h1" id="sf-staff-details">{selectedItem.type.toUpperCase()} Details</h2>
                            </div>
                            <button className="button button-ghost button-icon" aria-label="Close" onClick={() => setSelectedItem(null)}><X /></button>
                        </div>
                        <div className="sheet-body">
                            <dl className="specs">
                                {details.map(([label, value]) => (
                                    <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffPage;
