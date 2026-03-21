import React, { useState } from 'react';
import { Trash2, EyeOff, AlertTriangle } from 'lucide-react';
import api from '../../../api';
import type { PluginData } from './ManagePlugin';
import { useNavigate } from 'react-router-dom';

type Props = { plugin: PluginData };

const DangerZone = ({ plugin }: Props) => {
    const navigate = useNavigate();
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [unpublishing, setUnpublishing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleUnpublish = async () => {
        if (!window.confirm('Unpublish this plugin? It will be hidden from the store but not deleted.')) return;
        setUnpublishing(true);
        try {
            const fd = new FormData();
            fd.append('status', 'draft');
            await api.put(`/plugins/${plugin.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert('Plugin unpublished.');
        } catch {
            alert('Failed to unpublish.');
        } finally {
            setUnpublishing(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirm !== plugin.name) return;
        setDeleting(true);
        try {
            await api.delete(`/plugins/${plugin.id}`);
            navigate('/dashboard/plugins');
        } catch {
            alert('Failed to delete plugin.');
            setDeleting(false);
        }
    };

    return (
        <div>
            <div className="mp-tab-header">
                <h2>Danger Zone</h2>
                <p>Irreversible actions live here. Proceed carefully.</p>
            </div>

            {/* ── Unpublish ──
            <div className="mp-card" style={{borderColor:'rgba(245,166,35,0.3)'}}>
                <div className="mp-card-title">
                    <EyeOff size={14} style={{color:'var(--mp-warn)'}} />
                    <span style={{color:'var(--mp-warn)'}}>Unpublish Plugin</span>
                </div>
                <p style={{fontSize:'0.85rem', color:'var(--mp-text-2)', lineHeight:1.6, marginBottom:'1.25rem'}}>
                    Hides the plugin from the store. Existing users who have already installed it are
                    <strong> not affected</strong> — they can continue using it. You can re-publish at any time.
                </p>
                <button
                    className="mp-btn mp-btn-outline"
                    onClick={handleUnpublish}
                    disabled={unpublishing}
                    style={{borderColor:'var(--mp-warn)', color:'var(--mp-warn)'}}
                >
                    <EyeOff size={15} />
                    {unpublishing ? 'Unpublishing…' : 'Unpublish Plugin'}
                </button>
            </div> */}

            {/* ── Delete ── */}
            <div className="mp-card" style={{borderColor:'rgba(242,65,90,0.3)'}}>
                <div className="mp-card-title">
                    <Trash2 size={14} style={{color:'var(--mp-error)'}} />
                    <span style={{color:'var(--mp-error)'}}>Delete Plugin</span>
                </div>

                <div className="mp-banner danger">
                    <AlertTriangle size={16} style={{flexShrink:0, marginTop:1}} />
                    <div>
                        <strong>This is permanent and cannot be undone.</strong> All user installs,
                        purchase records, screenshots, and binaries will be erased. Active subscribers
                        will be refunded automatically.
                    </div>
                </div>

                <p style={{fontSize:'0.85rem', color:'var(--mp-text-2)', lineHeight:1.6, marginBottom:'1rem'}}>
                    To confirm, type the plugin name <strong style={{color:'var(--mp-text)', fontFamily:'var(--font-mono)'}}>
                    {plugin.name}</strong> below:
                </p>

                <div className="mp-danger-input-row">
                    <div className="mp-form-group">
                        <input
                            className="mp-input"
                            type="text"
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            placeholder={plugin.name}
                            style={{fontFamily:'var(--font-mono)'}}
                        />
                    </div>
                    <button
                        className="mp-btn mp-btn-danger"
                        onClick={handleDelete}
                        disabled={deleteConfirm !== plugin.name || deleting}
                        style={{flexShrink:0}}
                    >
                        <Trash2 size={15} />
                        {deleting ? 'Deleting…' : 'Delete Forever'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DangerZone;
