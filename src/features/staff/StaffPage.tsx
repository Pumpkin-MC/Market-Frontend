import { useState, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, Search, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { Select } from '../../components/Select';
import '../../styles/store.css';

const StaffPage = () => {
    const { t } = useTranslation();
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
            setError(err.response?.data?.error || t('staff.messages.fetch_failed'));
            setUsers([]);
            setPlugins([]);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (id: number) => {
        const reason = window.prompt(t('staff.prompts.deactivation_reason'));
        if (!reason) return;
        try {
            await api.delete(`/admin/users/${id}`, { data: { reason } });
            setUsers(users.map(u => u.id === id ? { ...u, deleted_at: new Date().toISOString() } : u));
        } catch (err: any) {
            alert(err.response?.data?.error || t('staff.messages.delete_user_failed'));
        }
    };

    const roleLabels: Record<string, string> = {
        user: t('staff.roles.user'),
        moderator: t('staff.roles.moderator'),
        admin: t('staff.roles.admin'),
    };

    const changeRole = async (id: number, newRole: string) => {
        const reason = window.prompt(t('staff.prompts.role_reason', { role: roleLabels[newRole] ?? newRole }));
        try {
            await api.put(`/admin/users/${id}/role`, { role: newRole, reason: reason || undefined });
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
            alert(t('staff.messages.role_updated'));
        } catch (err: any) {
            alert(err.response?.data?.error || t('staff.messages.role_update_failed'));
        }
    };

    const deletePlugin = async (id: number) => {
        const reason = window.prompt(t('staff.prompts.removal_reason'));
        if (!reason) return;
        try {
            await api.delete(`/admin/plugins/${id}`, { data: { reason } });
            setPlugins(plugins.map(p => p.id === id ? { ...p, deleted_at: new Date().toISOString() } : p));
        } catch (err: any) {
            alert(err.response?.data?.error || t('staff.messages.delete_plugin_failed'));
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
        ? <span className="status"><span className="mark-box mark-box-danger"><X /></span>{t('staff.status.deleted')}</span>
        : <span className="status"><span className="mark-box mark-box-success"><Check /></span>{t('staff.status.active')}</span>;

    const roleTone: Record<string, string> = { admin: 'tag-pumpkin', moderator: 'tag-info', user: 'tag-fg' };
    const typeTone: Record<string, string> = { free: 'tag-success', paid: 'tag-pumpkin', adwall: 'tag-info' };

    const entityLabels: Record<'user' | 'plugin' | 'log', string> = {
        user: t('staff.entity.user'),
        plugin: t('staff.entity.plugin'),
        log: t('staff.entity.log'),
    };

    const details: [string, any][] = !selectedItem ? [] : selectedItem.type === 'user' ? [
        [t('staff.fields.id'), selectedItem.data.id],
        [t('staff.fields.username'), selectedItem.data.username],
        [t('staff.fields.email'), selectedItem.data.email],
        [t('staff.fields.role'), selectedItem.data.role],
        [t('staff.fields.stripe_ready'), selectedItem.data.stripe_ready ? t('common.yes') : t('common.no')],
        [t('staff.fields.tfa_enabled'), selectedItem.data.totp_enabled ? t('common.yes') : t('common.no')],
        [t('staff.fields.created'), new Date(selectedItem.data.created_at).toLocaleString()],
        [t('staff.fields.status'), selectedItem.data.deleted_at ? t('staff.fields.deleted_at', { date: new Date(selectedItem.data.deleted_at).toLocaleString() }) : t('staff.status.active')],
    ] : selectedItem.type === 'plugin' ? [
        [t('staff.fields.id'), selectedItem.data.id],
        [t('staff.fields.name'), selectedItem.data.name],
        [t('staff.fields.developer'), selectedItem.data.dev_name],
        [t('staff.fields.type'), selectedItem.data.type],
        [t('staff.fields.category'), selectedItem.data.category],
        [t('staff.fields.price'), `€${(selectedItem.data.price_cents / 100).toFixed(2)}`],
        [t('staff.fields.downloads'), selectedItem.data.downloads],
        [t('staff.fields.views'), selectedItem.data.views],
        [t('staff.fields.created'), new Date(selectedItem.data.created_at).toLocaleString()],
        [t('staff.fields.status'), selectedItem.data.deleted_at ? t('staff.fields.deleted_at', { date: new Date(selectedItem.data.deleted_at).toLocaleString() }) : t('staff.status.active')],
    ] : [
        [t('staff.fields.date'), new Date(selectedItem.data.created_at).toLocaleString()],
        [t('staff.fields.moderator'), selectedItem.data.moderator_name],
        [t('staff.fields.action'), selectedItem.data.action],
        [t('staff.fields.target_type'), selectedItem.data.target_type],
        [t('staff.fields.target_id'), selectedItem.data.target_id],
        [t('staff.fields.reason'), selectedItem.data.reason || t('staff.fields.no_reason')],
    ];

    const tabs: [typeof activeTab, string][] = [
        ['users', t('staff.tabs.users')],
        ['plugins', t('staff.tabs.plugins')],
        ['logs', t('staff.tabs.logs')],
    ];

    const searchPlaceholder = activeTab === 'users'
        ? t('staff.search_users')
        : activeTab === 'plugins'
            ? t('staff.search_plugins')
            : t('staff.search_logs');

    return (
        <div className="page stack sf-pad sf-staff">
            <header className="stack">
                <h1 className="display-2">{t('staff.title')} <span className="mark">{t('staff.title_highlight')}</span></h1>
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
                        placeholder={searchPlaceholder}
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
                                { value: 'all', label: t('staff.filters.all_actions') },
                                { value: 'soft_delete', label: t('staff.filters.soft_delete') },
                                { value: 'role_change', label: t('staff.filters.role_change') },
                            ]}
                            value={logFilterAction}
                            onChange={setLogFilterAction}
                            aria-label={t('staff.filters.all_actions')}
                        />
                        <Select
                            options={[
                                { value: 'all', label: t('staff.filters.all_moderators') },
                                ...uniqueModerators.map(name => ({ value: name, label: name })),
                            ]}
                            value={logFilterModerator}
                            onChange={setLogFilterModerator}
                            aria-label={t('staff.filters.all_moderators')}
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
                    <p className="small">{t('common.loading')}</p>
                </div>
            ) : activeTab === 'users' ? (
                <div className="scroll-x">
                    <table className="ledger">
                        <thead>
                            <tr>
                                <th>{t('staff.fields.id')}</th>
                                <th>{t('staff.fields.username')}</th>
                                <th>{t('staff.fields.email')}</th>
                                <th>{t('staff.fields.role')}</th>
                                <th>{t('staff.fields.status')}</th>
                                <th className="end">{t('common.actions')}</th>
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
                                                    { value: 'user', label: t('staff.roles.user') },
                                                    { value: 'moderator', label: t('staff.roles.moderator') },
                                                    { value: 'admin', label: t('staff.roles.admin') },
                                                ]}
                                                value={u.role}
                                                onChange={(role) => role !== u.role && changeRole(u.id, role)}
                                                aria-label={t('staff.filters.role')}
                                            />
                                        ) : (
                                            <span className={`tag ${roleTone[u.role] || ''}`}>{u.role}</span>
                                        )}
                                    </td>
                                    <td>{status(u.deleted_at)}</td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({type: 'user', data: u})}>{t('staff.actions.view')}</button>
                                            {!u.deleted_at && <button className="button button-danger button-sm" onClick={() => deleteUser(u.id)}>{t('staff.actions.delete')}</button>}
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
                                <th>{t('staff.fields.id')}</th>
                                <th>{t('staff.fields.name')}</th>
                                <th>{t('staff.fields.type')}</th>
                                <th className="end">{t('staff.fields.price')}</th>
                                <th>{t('staff.fields.developer')}</th>
                                <th>{t('staff.fields.status')}</th>
                                <th className="end">{t('common.actions')}</th>
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
                                            <button className="button button-sm" onClick={() => setSelectedItem({type: 'plugin', data: p})}>{t('staff.actions.view')}</button>
                                            {!p.deleted_at && <button className="button button-danger button-sm" onClick={() => deletePlugin(p.id)}>{t('staff.actions.delete')}</button>}
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
                                <th>{t('staff.fields.date')}</th>
                                <th>{t('staff.fields.moderator')}</th>
                                <th>{t('staff.fields.action')}</th>
                                <th>{t('staff.fields.target')}</th>
                                <th className="end">{t('common.actions')}</th>
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
                                            <button className="button button-sm" onClick={() => setSelectedItem({type: 'log', data: l})}>{t('staff.actions.view')}</button>
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
                                <span className="sticker sticker-sm">{entityLabels[selectedItem.type]}</span>
                                <h2 className="h1" id="sf-staff-details">{t('staff.details_title', { type: entityLabels[selectedItem.type] })}</h2>
                            </div>
                            <button className="button button-ghost button-icon" aria-label={t('common.close')} onClick={() => setSelectedItem(null)}><X /></button>
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
