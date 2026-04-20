import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Heart, ExternalLink, Github, Tag, Clock,
  RefreshCw, Star, ChevronRight, AlertCircle, Share2,
  Flag, Shield, Pickaxe
} from 'lucide-react';

const TABS = ['Description', 'Changelog', 'Versions', 'Dependencies'];

const VeinminerMockup = () => {
  const [activeTab, setActiveTab] = useState('Description');
  const [followed, setFollowed] = useState(false);

  return (
    <>
      <style>{`
        .vm-page { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem 4rem; }

        /* ── Hero ── */
        .vm-hero {
          position: relative;
          border-radius: 0 0 20px 20px;
          overflow: hidden;
          margin: 0 -1.5rem 0;
        }
        .vm-banner {
          width: 100%; height: 220px; object-fit: cover; display: block;
          background: linear-gradient(135deg, #1a0a00 0%, #3d1400 40%, #1a0800 100%);
        }
        .vm-banner-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 30%, rgba(10,10,10,0.95) 100%);
        }

        /* ── Header info ── */
        .vm-header {
          padding: 1.5rem 1.5rem 0;
          display: flex; gap: 1.25rem; align-items: flex-start;
          margin-top: -3rem; position: relative; z-index: 1;
        }
        .vm-icon {
          width: 96px; height: 96px; border-radius: 20px; flex-shrink: 0;
          background: linear-gradient(135deg, #8b2500, #d44000);
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; font-weight: 900; color: white;
          border: 3px solid #1e1e1e; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .vm-header-info { flex: 1; min-width: 0; padding-top: 0.5rem; }
        .vm-name {
          font-size: 2rem; font-weight: 800; color: #f0f0f0;
          letter-spacing: -0.04em; line-height: 1.1; margin: 0 0 4px;
        }
        .vm-author { font-size: 0.9rem; color: #888; margin: 0 0 10px; }
        .vm-author a { color: var(--primary, #ff6b00); text-decoration: none; font-weight: 500; }
        .vm-summary { color: #aaa; font-size: 0.92rem; margin: 0 0 12px; line-height: 1.5; }

        .vm-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .vm-tag {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
          background: #1e1e1e; border: 1px solid #2a2a2a; color: #aaa;
        }
        .vm-tag.category { background: rgba(255,107,0,0.1); border-color: rgba(255,107,0,0.25); color: #ff8c3a; }
        .vm-tag.loader   { background: rgba(100,200,100,0.08); border-color: rgba(100,200,100,0.2); color: #7dcc7d; }

        .vm-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .vm-btn-dl {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px; border-radius: 999px; border: none;
          background: var(--primary, #ff6b00); color: white;
          font-size: 0.9rem; font-weight: 700; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .vm-btn-dl:hover { background: #e85d00; transform: translateY(-1px); }

        .vm-btn-icon {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 999px;
          background: #1e1e1e; border: 1px solid #2a2a2a; color: #bbb;
          font-size: 0.85rem; font-weight: 500; cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .vm-btn-icon:hover { border-color: #444; color: #fff; }
        .vm-btn-icon.followed { color: #ff6b00; border-color: rgba(255,107,0,0.4); }

        /* ── Stats bar ── */
        .vm-stats {
          display: flex; gap: 24px; padding: 12px 0;
          border-top: 1px solid #1e1e1e; border-bottom: 1px solid #1e1e1e;
          margin-bottom: 1.5rem; flex-wrap: wrap;
        }
        .vm-stat { display: flex; align-items: center; gap: 7px; font-size: 0.85rem; color: #888; }
        .vm-stat strong { color: #ddd; font-weight: 600; }

        /* ── Tabs ── */
        .vm-tabs { display: flex; gap: 2px; margin-bottom: 1.5rem; border-bottom: 1px solid #1e1e1e; }
        .vm-tab {
          padding: 10px 18px; font-size: 0.88rem; font-weight: 600;
          color: #666; background: none; border: none; cursor: pointer;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          transition: color 0.15s;
        }
        .vm-tab:hover { color: #bbb; }
        .vm-tab.active { color: var(--primary, #ff6b00); border-bottom-color: var(--primary, #ff6b00); }

        /* ── Body layout ── */
        .vm-body { display: grid; grid-template-columns: minmax(0,1fr) 280px; gap: 1.5rem; }

        /* ── Description ── */
        .vm-description {
          background: #141414; border: 1px solid #1e1e1e;
          border-radius: 16px; padding: 1.75rem;
        }
        .vm-description h2 { font-size: 1.15rem; font-weight: 800; color: #f0f0f0; margin: 1.5rem 0 0.6rem; }
        .vm-description h2:first-child { margin-top: 0; }
        .vm-description p { color: #aaa; font-size: 0.9rem; line-height: 1.7; margin: 0 0 1rem; }
        .vm-description ul { color: #aaa; font-size: 0.9rem; line-height: 1.8; padding-left: 1.25rem; margin: 0 0 1rem; }
        .vm-description code {
          background: #1e1e1e; border: 1px solid #2a2a2a;
          padding: 1px 6px; border-radius: 4px; font-size: 0.85em; color: #ff8c3a;
        }
        .vm-description hr { border: none; border-top: 1px solid #1e1e1e; margin: 1.5rem 0; }
        .vm-description .warn {
          display: flex; gap: 10px; align-items: flex-start;
          background: rgba(255,200,0,0.06); border: 1px solid rgba(255,200,0,0.15);
          border-radius: 10px; padding: 12px 14px; margin-bottom: 1rem;
          color: #d4aa40; font-size: 0.88rem; line-height: 1.5;
        }

        /* ── Screenshots ── */
        .vm-screenshots { display: flex; gap: 10px; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 4px; }
        .vm-screenshot {
          width: 200px; height: 112px; flex-shrink: 0; border-radius: 10px;
          background: linear-gradient(135deg, #1a1a1a, #2a1000);
          border: 1px solid #2a2a2a; display: flex; align-items: center; justify-content: center;
          color: #333; font-size: 0.75rem; cursor: pointer; overflow: hidden;
        }
        .vm-screenshot img { width: 100%; height: 100%; object-fit: cover; }

        /* ── Sidebar ── */
        .vm-sidebar { display: flex; flex-direction: column; gap: 1rem; }
        .vm-sidebar-card {
          background: #141414; border: 1px solid #1e1e1e;
          border-radius: 16px; padding: 1.25rem;
        }
        .vm-sidebar-title {
          font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: #555; margin: 0 0 12px;
        }
        .vm-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; border-bottom: 1px solid #1a1a1a; font-size: 0.85rem;
        }
        .vm-info-row:last-child { border-bottom: none; }
        .vm-info-label { color: #555; }
        .vm-info-value { color: #ccc; font-weight: 500; text-align: right; }
        .vm-info-value a { color: var(--primary, #ff6b00); text-decoration: none; }

        .vm-link-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: 10px; font-size: 0.84rem; font-weight: 500;
          background: #1a1a1a; border: 1px solid #252525; color: #bbb;
          text-decoration: none; margin-bottom: 6px; transition: border-color 0.15s, color 0.15s;
        }
        .vm-link-btn:last-child { margin-bottom: 0; }
        .vm-link-btn:hover { border-color: #3a3a3a; color: #fff; }

        .vm-version-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 8px; font-size: 0.8rem; font-weight: 600;
          background: rgba(26,158,95,0.1); border: 1px solid rgba(26,158,95,0.2);
          color: #1a9e5f; margin: 3px;
        }
        .vm-version-pill.old {
          background: #1a1a1a; border-color: #252525; color: #555;
        }

        .vm-member {
          display: flex; align-items: center; gap: 10px; padding: 6px 0;
          font-size: 0.84rem; color: #ccc;
        }
        .vm-member-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #8b2500, #d44000);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .vm-member-role { font-size: 0.75rem; color: #555; }

        @media (max-width: 860px) {
          .vm-body { grid-template-columns: 1fr; }
          .vm-sidebar { order: -1; }
        }
      `}</style>

      <div className="vm-page">
        {/* Hero banner */}
        <div className="vm-hero">
          <div className="vm-banner" />
          <div className="vm-banner-overlay" />
        </div>

        {/* Header */}
        <div className="vm-header">
          <div className="vm-icon">V</div>
          <div className="vm-header-info">
            <h1 className="vm-name">Veinminer</h1>
            <p className="vm-author">by <a href="#">Miraculixx</a></p>
            <p className="vm-summary">Mine the whole vine on mining a single ore. Known feature by modpacks and pvp games like UHC (quick mine)</p>
            <div className="vm-tags">
              <span className="vm-tag category"><Tag size={11} />Equipment</span>
              <span className="vm-tag category"><Tag size={11} />Game Mechanics</span>
              <span className="vm-tag category"><Tag size={11} />Utility</span>
              <span className="vm-tag loader">Bukkit</span>
              <span className="vm-tag loader">Folia</span>
              <span className="vm-tag loader">Paper</span>
              <span className="vm-tag loader">Spigot</span>
            </div>
            <div className="vm-actions">
              <button className="vm-btn-dl"><Download size={15} /> Download</button>
              <button className="vm-btn-icon" onClick={() => setFollowed(f => !f)}>
                <Heart size={14} fill={followed ? 'currentColor' : 'none'} className={followed ? 'followed' : ''} />
                {followed ? 'Following' : 'Follow'}
              </button>
              <button className="vm-btn-icon"><Share2 size={14} /> Share</button>
              <button className="vm-btn-icon"><Flag size={14} /> Report</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="vm-stats">
          <div className="vm-stat"><Download size={14} /> <strong>44.3M</strong> downloads</div>
          <div className="vm-stat"><Heart size={14} /> <strong>4.5K</strong> followers</div>
          <div className="vm-stat"><Star size={14} /> <strong>4.7</strong> / 5 rating</div>
          <div className="vm-stat"><Clock size={14} /> Updated <strong>53 minutes ago</strong></div>
          <div className="vm-stat"><RefreshCw size={14} /> Created <strong>Mar 12, 2021</strong></div>
        </div>

        {/* Tabs */}
        <div className="vm-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`vm-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="vm-body">
          {/* Main */}
          <div>
            {/* Screenshots */}
            <div className="vm-screenshots">
              {[1,2,3,4].map(i => (
                <div key={i} className="vm-screenshot">
                  <Pickaxe size={32} color="#333" />
                </div>
              ))}
            </div>

            <div className="vm-description">
              {activeTab === 'Description' && <>
                <div className="warn">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  Make sure to check the config after each update — new options may be added.
                </div>

                <h2>What is Veinminer?</h2>
                <p>
                  Veinminer allows players to mine an entire vein of ores by breaking just one block.
                  It's a well-known feature from popular modpacks and PvP games like <code>UHC</code> (quick mine mode).
                </p>

                <h2>Features</h2>
                <ul>
                  <li>Mine entire ore veins with a single block break</li>
                  <li>Configurable per-ore settings</li>
                  <li>Works with custom tools and enchantments</li>
                  <li>Fully async — no TPS impact on large veins</li>
                  <li>Per-player toggle with <code>/veinminer toggle</code></li>
                  <li>Compatible with Folia for multi-threaded servers</li>
                </ul>

                <hr />

                <h2>Configuration</h2>
                <p>
                  The plugin generates a <code>config.yml</code> on first run. You can define which
                  blocks are vein-minable, max vein size, tool requirements and more.
                </p>

                <h2>Commands</h2>
                <ul>
                  <li><code>/veinminer toggle</code> — enable/disable for yourself</li>
                  <li><code>/veinminer reload</code> — reload configuration (op only)</li>
                </ul>

                <h2>Permissions</h2>
                <ul>
                  <li><code>veinminer.use</code> — allow veinmining</li>
                  <li><code>veinminer.toggle</code> — allow toggle command</li>
                  <li><code>veinminer.admin</code> — allow reload</li>
                </ul>
              </>}

              {activeTab === 'Changelog' && <>
                <h2>v2.4.1 — Latest</h2>
                <p>Released 53 minutes ago</p>
                <ul>
                  <li>Fixed async vein detection for Folia</li>
                  <li>Added <code>max-depth</code> config option</li>
                  <li>Performance improvements for large veins</li>
                </ul>
                <hr />
                <h2>v2.4.0</h2>
                <p>Released 2 weeks ago</p>
                <ul>
                  <li>Full Folia support</li>
                  <li>New per-tool configuration</li>
                </ul>
              </>}

              {activeTab === 'Versions' && <>
                <h2>Available versions</h2>
                <p style={{ color: '#888', fontSize: '0.88rem', marginBottom: '1rem' }}>
                  All releases for Veinminer sorted by date.
                </p>
                {['2.4.1','2.4.0','2.3.5','2.3.0','2.2.1'].map((v, i) => (
                  <div key={v} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #1e1e1e' }}>
                    <div>
                      <span style={{ fontWeight:700, color: i === 0 ? '#ff6b00' : '#ccc' }}>v{v}</span>
                      {i === 0 && <span style={{ marginLeft:8, fontSize:'0.72rem', background:'rgba(255,107,0,0.1)', color:'#ff6b00', padding:'2px 7px', borderRadius:999 }}>Latest</span>}
                      <div style={{ fontSize:'0.78rem', color:'#555', marginTop:2 }}>Minecraft 1.20 – 1.21 • Paper, Folia</div>
                    </div>
                    <button className="vm-btn-icon"><Download size={13} /> Download</button>
                  </div>
                ))}
              </>}

              {activeTab === 'Dependencies' && <>
                <h2>Dependencies</h2>
                <p style={{ color: '#888', fontSize: '0.88rem' }}>This plugin has no required dependencies.</p>
                <h2 style={{ marginTop: '1.5rem' }}>Optional dependencies</h2>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #1e1e1e' }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>⚡</div>
                  <div>
                    <div style={{ color:'#ccc', fontWeight:600 }}>WorldGuard</div>
                    <div style={{ color:'#555', fontSize:'0.78rem' }}>Region protection integration</div>
                  </div>
                </div>
              </>}
            </div>
          </div>

          {/* Sidebar */}
          <div className="vm-sidebar">
            <div className="vm-sidebar-card">
              <p className="vm-sidebar-title">Project info</p>
              <div className="vm-info-row">
                <span className="vm-info-label">License</span>
                <span className="vm-info-value">MIT</span>
              </div>
              <div className="vm-info-row">
                <span className="vm-info-label">Version</span>
                <span className="vm-info-value">2.4.1</span>
              </div>
              <div className="vm-info-row">
                <span className="vm-info-label">Downloads</span>
                <span className="vm-info-value">44,312,048</span>
              </div>
              <div className="vm-info-row">
                <span className="vm-info-label">Followers</span>
                <span className="vm-info-value">4,521</span>
              </div>
              <div className="vm-info-row">
                <span className="vm-info-label">Created</span>
                <span className="vm-info-value">Mar 12, 2021</span>
              </div>
              <div className="vm-info-row">
                <span className="vm-info-label">Updated</span>
                <span className="vm-info-value">53 min ago</span>
              </div>
            </div>

            <div className="vm-sidebar-card">
              <p className="vm-sidebar-title">Links</p>
              <a className="vm-link-btn" href="#"><Github size={14} /> Source code</a>
              <a className="vm-link-btn" href="#"><ExternalLink size={14} /> Wiki</a>
              <a className="vm-link-btn" href="#"><Shield size={14} /> Issue tracker</a>
            </div>

            <div className="vm-sidebar-card">
              <p className="vm-sidebar-title">Compatible versions</p>
              {['1.21.4','1.21.3','1.21','1.20.6','1.20.4'].map((v, i) => (
                <span key={v} className={`vm-version-pill${i > 2 ? ' old' : ''}`}>{v}</span>
              ))}
            </div>

            <div className="vm-sidebar-card">
              <p className="vm-sidebar-title">Team</p>
              <div className="vm-member">
                <div className="vm-member-avatar">MI</div>
                <div>
                  <div>Miraculixx</div>
                  <div className="vm-member-role">Owner</div>
                </div>
              </div>
            </div>

            <div className="vm-sidebar-card">
              <p className="vm-sidebar-title">Categories</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {['Equipment','Game Mechanics','Utility','Adventure'].map(c => (
                  <span key={c} className="vm-tag category" style={{ fontSize:'0.78rem' }}>
                    <Tag size={10} />{c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VeinminerMockup;
