import React, { useState } from 'react';
import {
  Download, Heart, Bookmark, MoreHorizontal, Tag, Crown,
  AlertCircle, Bug, Code2, BookOpen, MessageCircle, Server,
  Monitor, MonitorSmartphone, Calendar, RefreshCw, FileText,
  ExternalLink, Pickaxe, Flag, ClipboardCopy
} from 'lucide-react';

const TABS = ['Description', 'Gallery', 'Changelog', 'Versions'];

const MC_VERSIONS = [
  '26.2-snapshot-3', '26.1.x', '1.21.x', '1.20.x', '1.19.x',
  '1.18.x', '1.17.x', '1.16.x', '1.12.x', '1.8.8'
];

const ENVIRONMENTS = [
  { label: 'Client-side', icon: Monitor },
  { label: 'Server-side', icon: Server },
  { label: 'Client and server', icon: MonitorSmartphone },
];

const PROJECT_LINKS = [
  { label: 'Report issues', icon: Bug },
  { label: 'View source', icon: Code2 },
  { label: 'Visit wiki', icon: BookOpen },
  { label: 'Join Discord server', icon: MessageCircle },
];

const TAGS = ['Adventure', 'Social', 'Utility'];

const CREATORS = [
  { name: 'henkelmax', role: 'Owner', initials: 'HE', isOwner: true },
  { name: 'Stridey', role: 'Artist', initials: 'ST', isOwner: false },
  { name: 'BreadLoaf', role: 'Developer', initials: 'BL', isOwner: false },
];

const TOP_LINKS = ['Modrinth', 'CurseForge', 'Discord', 'Wiki', 'FAQ', 'Credits', 'API'];

const VeinminerMockup = () => {
  const [activeTab, setActiveTab] = useState('Description');
  const [saved, setSaved] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  React.useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  return (
    <>
      <style>{`
        .vm-page { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1.5rem 4rem; }

        /* ── Header ── */
        .vm-header {
          display: flex; gap: 1.1rem; align-items: flex-start;
          padding-bottom: 1rem;
        }
        .vm-icon {
          width: 96px; height: 96px; border-radius: 16px; flex-shrink: 0;
          background: linear-gradient(135deg, #2a8540, #1a5a2a);
          display: flex; align-items: center; justify-content: center;
          color: white; box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }
        .vm-header-info { flex: 1; min-width: 0; }
        .vm-name {
          font-size: 1.85rem; font-weight: 800; color: #f0f0f0;
          letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 6px;
        }
        .vm-summary { color: #999; font-size: 0.92rem; margin: 0 0 10px; line-height: 1.5; }

        .vm-meta-row {
          display: flex; flex-wrap: wrap; align-items: center; gap: 14px;
          font-size: 0.83rem; color: #777; margin-bottom: 12px;
        }
        .vm-meta-row .vm-meta-stat {
          display: inline-flex; align-items: center; gap: 6px;
        }
        .vm-meta-row strong { color: #ddd; font-weight: 600; }

        .vm-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .vm-tag {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
          background: #1e1e1e; border: 1px solid #2a2a2a; color: #aaa;
        }
        .vm-tag.cat { background: rgba(255,107,0,0.08); border-color: rgba(255,107,0,0.2); color: #ff8c3a; }

        /* ── Header actions ── */
        .vm-actions {
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0; padding-top: 0.4rem;
        }
        .vm-btn-dl {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 22px; border-radius: 999px; border: none;
          background: #2a8540; color: white;
          font-size: 0.92rem; font-weight: 700; font-family: inherit; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .vm-btn-dl:hover { background: #2f9248; transform: translateY(-1px); }
        .vm-icon-btn {
          width: 42px; height: 42px; border-radius: 999px;
          background: #1a1a1a; border: 1px solid #262626; color: #bbb;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color 0.15s, color 0.15s;
        }
        .vm-icon-btn:hover { border-color: #3a3a3a; color: #fff; }
        .vm-icon-btn.active { color: #ff6b00; border-color: rgba(255,107,0,0.4); }

        /* ── Dropdown menu ── */
        .vm-menu-wrap { position: relative; }
        .vm-menu {
          position: absolute; top: calc(100% + 8px); right: 0;
          min-width: 240px; z-index: 100;
          background: #1a1a1a; border: 1px solid #2a2a2a;
          border-radius: 12px; padding: 6px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.4);
          animation: vm-menu-in 0.12s ease-out;
        }
        @keyframes vm-menu-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vm-menu-item {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 10px 12px;
          background: transparent; border: none; cursor: pointer;
          color: #ccc; font-family: inherit; font-size: 0.92rem; font-weight: 500;
          text-align: left; border-radius: 8px;
          transition: background 0.12s, color 0.12s;
        }
        .vm-menu-item:hover { background: #232323; color: #fff; }
        .vm-menu-item.danger { color: #ff5878; }
        .vm-menu-item.danger:hover { background: rgba(255,88,120,0.08); color: #ff5878; }
        .vm-menu-item svg { flex-shrink: 0; opacity: 0.85; }

        /* ── Divider + tabs ── */
        .vm-divider { height: 1px; background: #1c1c1c; margin: 0; }

        .vm-tabs {
          display: flex; gap: 0;
          border-bottom: 1px solid #1c1c1c;
          overflow-x: auto; -webkit-overflow-scrolling: touch;
          margin-bottom: 1.25rem;
        }
        .vm-tabs::-webkit-scrollbar { display: none; }
        .vm-tab {
          padding: 12px 16px; font-size: 0.88rem; font-weight: 600; white-space: nowrap;
          color: #555; background: none; border: none; cursor: pointer; font-family: inherit;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          transition: color 0.15s;
        }
        .vm-tab:hover { color: #bbb; }
        .vm-tab.active { color: var(--primary, #ff6b00); border-bottom-color: var(--primary, #ff6b00); }

        /* ── Body ── */
        .vm-body { display: grid; grid-template-columns: minmax(0,1fr) 280px; gap: 1.5rem; }

        /* ── Top links row ── */
        .vm-toplinks {
          display: flex; flex-wrap: wrap; gap: 0;
          font-size: 0.85rem; margin-bottom: 1.25rem;
          color: #888;
        }
        .vm-toplink {
          color: var(--primary, #ff6b00); text-decoration: none; font-weight: 500;
          padding: 0 10px; border-right: 1px solid #2a2a2a;
        }
        .vm-toplink:first-child { padding-left: 0; }
        .vm-toplink:last-child { border-right: none; }
        .vm-toplink:hover { text-decoration: underline; }

        /* ── Gallery ── */
        .vm-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }
        .vm-gallery-card {
          background: #141414; border: 1px solid #1c1c1c;
          border-radius: 12px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color 0.15s, transform 0.15s;
        }
        .vm-gallery-card:hover { border-color: #2a2a2a; transform: translateY(-2px); }
        .vm-gallery-image {
          aspect-ratio: 16 / 9;
          background: linear-gradient(135deg, #1a3a1a, #0d2010);
          display: flex; align-items: center; justify-content: center;
          color: #2d4a2d;
        }
        .vm-gallery-meta {
          padding: 14px 16px 16px;
        }
        .vm-gallery-title {
          font-size: 1.05rem; font-weight: 800; color: #f0f0f0;
          margin: 0 0 6px; letter-spacing: -0.01em;
        }
        .vm-gallery-date {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 0.85rem; color: #777;
        }
        .vm-gallery-date svg { color: #666; }

        @media (max-width: 768px) {
          .vm-gallery-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .vm-gallery-meta { padding: 10px 12px 12px; }
          .vm-gallery-title { font-size: 0.92rem; }
          .vm-gallery-date { font-size: 0.78rem; }
        }
        @media (max-width: 480px) {
          .vm-gallery-grid { grid-template-columns: 1fr; }
        }

        /* ── Changelog ── */
        .vm-changelog {
          background: #141414; border: 1px solid #1c1c1c;
          border-radius: 12px; padding: 1.4rem 1.5rem;
        }
        .vm-cl-entry { display: flex; gap: 16px; }
        .vm-cl-marker {
          position: relative; flex-shrink: 0;
          width: 14px; display: flex; flex-direction: column; align-items: center;
          padding-top: 6px;
        }
        .vm-cl-dot {
          width: 14px; height: 14px; border-radius: 50%;
          flex-shrink: 0; z-index: 1;
        }
        .vm-cl-marker.release .vm-cl-dot { background: #2ecc71; box-shadow: 0 0 0 3px rgba(46,204,113,0.15); }
        .vm-cl-marker.snapshot .vm-cl-dot { background: #ff5878; box-shadow: 0 0 0 3px rgba(255,88,120,0.15); }
        .vm-cl-line {
          flex: 1; width: 0; min-height: 24px;
          margin-top: 2px; margin-bottom: -2px;
          border-left: 2px dashed #2ecc71;
        }
        .vm-cl-line.snapshot { border-left-color: #ff5878; }
        .vm-cl-line.release { border-left-color: #2ecc71; }
        .vm-cl-body { flex: 1; min-width: 0; padding-bottom: 18px; }
        .vm-cl-entry.last .vm-cl-body { padding-bottom: 0; }
        .vm-cl-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; margin-bottom: 4px;
        }
        .vm-cl-title {
          font-size: 1.1rem; font-weight: 800; color: #f0f0f0;
          letter-spacing: -0.01em; line-height: 1.35;
          flex: 1; min-width: 0;
        }
        .vm-cl-meta { font-size: 0.85rem; font-weight: 500; color: #777; letter-spacing: 0; }
        .vm-cl-meta a { color: #5fa8ff; text-decoration: none; }
        .vm-cl-meta a:hover { text-decoration: underline; }
        .vm-cl-dl {
          display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
          padding: 8px 16px; border-radius: 999px;
          background: #232323; border: 1px solid #2c2c2c; color: #ddd;
          font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .vm-cl-dl:hover { background: #2c2c2c; border-color: #3a3a3a; }
        .vm-cl-notes {
          color: #888; font-size: 0.9rem; line-height: 1.6;
          padding-left: 1.2rem; margin: 6px 0 0;
        }

        /* ── Versions table ── */
        .vm-versions-table {
          background: #141414; border: 1px solid #1c1c1c;
          border-radius: 12px; padding: 0.5rem 1rem;
          overflow-x: auto;
        }
        .vm-vt-head, .vm-vt-row {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) auto 110px 100px 60px;
          gap: 16px; align-items: center;
          padding: 14px 8px;
        }
        .vm-vt-head > *, .vm-vt-row > * { min-width: 0; }
        .vm-vt-name-main {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vm-vt-name-sub {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vm-vt-head {
          font-size: 0.92rem; font-weight: 700; color: #e8e8e8;
          border-bottom: 1px solid #1c1c1c;
        }
        .vm-vt-row { border-bottom: 1px solid #1c1c1c; }
        .vm-vt-row:last-child { border-bottom: none; }
        .vm-vt-status {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; color: #fff;
        }
        .vm-vt-status.release { background: #1a4a2a; color: #4ade80; }
        .vm-vt-status.alpha { background: #4a1a2a; color: #ff5878; }
        .vm-vt-status.beta { background: #4a3a1a; color: #fbbf24; }
        .vm-vt-name-main { font-size: 0.95rem; font-weight: 700; color: #f0f0f0; }
        .vm-vt-name-sub { font-size: 0.82rem; color: #666; margin-top: 2px; }
        .vm-vt-versions { display: flex; flex-wrap: wrap; gap: 5px; }
        .vm-vt-pill {
          padding: 4px 10px; border-radius: 999px;
          background: #1f1f1f; border: 1px solid #2a2a2a;
          font-size: 0.78rem; color: #aaa; font-weight: 500;
          white-space: nowrap; flex-shrink: 0;
        }
        .vm-vt-cell { font-size: 0.88rem; color: #bbb; }
        .vm-vt-meta-mobile { display: none; }
        .vm-vt-actions { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
        .vm-vt-dl-btn {
          width: 36px; height: 36px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; cursor: pointer;
          color: #2ecc71; transition: background 0.15s;
        }
        .vm-vt-dl-btn:hover { background: rgba(46,204,113,0.1); }
        .vm-vt-more {
          width: 28px; height: 28px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; cursor: pointer;
          color: #666; transition: color 0.15s, background 0.15s;
        }
        .vm-vt-more:hover { color: #ddd; background: #1f1f1f; }

        @media (max-width: 960px) {
          .vm-versions-table { padding: 0.4rem 0.6rem; }
          .vm-vt-head { display: none; }
          .vm-vt-row {
            display: grid;
            grid-template-columns: 36px minmax(0, 1fr) auto;
            grid-template-areas:
              "status name     actions"
              "status versions versions"
              "status meta     meta";
            column-gap: 12px;
            row-gap: 6px;
            padding: 14px 4px;
            align-items: start;
          }
          .vm-vt-status {
            grid-area: status;
            width: 32px; height: 32px;
            font-size: 0.74rem;
            margin-top: 2px;
          }
          .vm-vt-name { grid-area: name; min-width: 0; }
          .vm-vt-name-main { font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .vm-vt-name-sub { font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .vm-vt-versions {
            grid-area: versions;
            display: flex; flex-wrap: wrap; gap: 4px;
          }
          .vm-vt-pill { padding: 3px 8px; font-size: 0.72rem; }
          .vm-vt-actions { grid-area: actions; align-self: start; margin-top: -2px; }
          .vm-vt-cell { display: none; }
          .vm-vt-meta-mobile {
            grid-area: meta;
            display: block;
            font-size: 0.78rem; color: #888;
          }
          .vm-vt-dl-btn { width: 32px; height: 32px; }
          .vm-vt-dl-btn svg { width: 16px; height: 16px; }
        }

        @media (max-width: 768px) {
          .vm-changelog { padding: 1rem 1rem; }
          .vm-cl-header { flex-direction: column; gap: 8px; }
          .vm-cl-title { font-size: 0.95rem; }
          .vm-cl-meta { display: block; margin-top: 2px; font-size: 0.8rem; }
          .vm-cl-dl { padding: 7px 14px; font-size: 0.8rem; align-self: flex-start; }
          .vm-cl-notes { font-size: 0.85rem; }
        }

        /* ── Content box ── */
        .vm-content-box {
          background: #141414; border: 1px solid #1c1c1c;
          border-radius: 12px; padding: 1.4rem 1.5rem;
        }

        /* ── Main content body ── */
        .vm-main h2 { font-size: 1.3rem; font-weight: 800; color: #f0f0f0; margin: 1.6rem 0 0.6rem; }
        .vm-main h2:first-child { margin-top: 0; }
        .vm-main p { color: #b0b0b0; font-size: 0.93rem; line-height: 1.65; margin: 0 0 0.9rem; }
        .vm-main ul { color: #b0b0b0; font-size: 0.93rem; line-height: 1.7; padding-left: 1.2rem; margin: 0 0 0.9rem; }
        .vm-main code {
          background: #1e1e1e; border: 1px solid #2a2a2a;
          padding: 1px 6px; border-radius: 4px; font-size: 0.85em; color: #ff8c3a;
        }
        .vm-main hr { border: none; border-top: 1px solid #1c1c1c; margin: 1.5rem 0; }

        .vm-note {
          display: flex; gap: 10px; align-items: flex-start;
          background: rgba(255,200,0,0.05); border-left: 3px solid #d4aa40;
          border-radius: 6px; padding: 12px 14px; margin: 1rem 0;
          color: #c9a040; font-size: 0.88rem; line-height: 1.55;
        }

        .vm-image-block {
          background: linear-gradient(135deg, #1a1a1a, #221318);
          border: 1px solid #232323; border-radius: 10px;
          height: 220px; display: flex; align-items: center; justify-content: center;
          color: #444; margin: 1rem 0;
        }

        .vm-download-list { display: flex; flex-direction: column; gap: 8px; margin: 0.5rem 0 1rem; }
        .vm-download-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; background: #141414;
          border: 1px solid #1e1e1e; border-radius: 10px;
        }
        .vm-download-item:hover { border-color: #2a2a2a; }
        .vm-download-name {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.9rem; color: #ddd; font-weight: 600;
        }
        .vm-download-name svg { color: var(--primary, #ff6b00); }
        .vm-download-meta { font-size: 0.78rem; color: #666; }

        /* ── Sidebar ── */
        .vm-sidebar { display: flex; flex-direction: column; gap: 0.85rem; }
        .vm-sidebar-card {
          background: #141414; border: 1px solid #1c1c1c;
          border-radius: 12px; padding: 1.05rem 1.1rem;
        }
        .vm-sidebar-title {
          font-size: 0.92rem; font-weight: 700; color: #e8e8e8;
          margin: 0 0 12px;
        }
        .vm-sidebar-sub {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.78rem; color: #666; margin: 0 0 8px;
        }
        .vm-sidebar-sub svg { color: #888; }

        .vm-pill-row { display: flex; flex-wrap: wrap; gap: 5px; }
        .vm-mc-pill {
          padding: 4px 9px; border-radius: 6px; font-size: 0.76rem; font-weight: 600;
          background: #1a1a1a; border: 1px solid #262626; color: #aaa;
        }

        .vm-platform-list { display: flex; flex-direction: column; gap: 2px; }
        .vm-platform-row {
          display: flex; align-items: center; gap: 9px;
          padding: 5px 0; font-size: 0.86rem; color: #ccc;
        }
        .vm-platform-icon {
          width: 18px; height: 18px; border-radius: 4px;
          background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.6rem; font-weight: 800; color: #888;
          flex-shrink: 0;
        }

        .vm-link-btn {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 0; font-size: 0.86rem; color: #ccc;
          text-decoration: none; transition: color 0.15s;
        }
        .vm-link-btn:hover { color: var(--primary, #ff6b00); }
        .vm-link-btn svg { color: #888; }

        .vm-creators { display: flex; flex-direction: column; gap: 10px; }
        .vm-creator {
          display: flex; align-items: center; gap: 10px;
        }
        .vm-creator-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #444, #222);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .vm-creator-name {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.88rem; color: #ddd; font-weight: 600;
        }
        .vm-creator-name svg { color: #d4a040; }
        .vm-creator-role { font-size: 0.76rem; color: #666; }

        .vm-detail-row {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 0; font-size: 0.85rem; color: #bbb;
        }
        .vm-detail-row svg { color: #777; flex-shrink: 0; }
        .vm-detail-row strong { color: #ddd; font-weight: 600; }

        /* ── Mobile ── */
        @media (max-width: 960px) {
          .vm-body { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .vm-page { padding: 1rem 1rem 3rem; }

          .vm-header {
            flex-wrap: wrap;
            gap: 0.85rem;
          }
          .vm-icon { width: 72px; height: 72px; border-radius: 14px; }
          .vm-icon svg { width: 38px; height: 38px; }
          .vm-name { font-size: 1.4rem; }
          .vm-summary { font-size: 0.86rem; }
          .vm-meta-row { gap: 10px; font-size: 0.78rem; }

          .vm-actions {
            order: 3; width: 100%;
            padding-top: 0; justify-content: flex-start;
          }
          .vm-btn-dl { padding: 9px 14px; font-size: 0.84rem; }
          .vm-icon-btn { width: 38px; height: 38px; }

          .vm-tabs { margin-bottom: 1rem; }
          .vm-tab { padding: 10px 13px; font-size: 0.84rem; }

          .vm-toplinks { font-size: 0.8rem; }
          .vm-toplink { padding: 0 7px; }

          .vm-main h2 { font-size: 1.15rem; }
          .vm-main p, .vm-main ul { font-size: 0.88rem; }
          .vm-content-box { padding: 1.1rem 1.15rem; }

          .vm-image-block { height: 160px; }
        }

        @media (max-width: 480px) {
          .vm-actions { gap: 6px; flex-wrap: nowrap; }
          .vm-btn-dl { padding: 8px 12px; font-size: 0.8rem; gap: 6px; }
          .vm-btn-dl svg { width: 14px; height: 14px; }
          .vm-icon-btn { width: 36px; height: 36px; flex-shrink: 0; }
          .vm-icon-btn svg { width: 15px; height: 15px; }
          .vm-meta-row { font-size: 0.74rem; gap: 8px; }
          .vm-menu { min-width: 220px; }
        }
      `}</style>

      <div className="vm-page">
        {/* Header */}
        <div className="vm-header">
          <div className="vm-icon">
            <Pickaxe size={48} />
          </div>
          <div className="vm-header-info">
            <h1 className="vm-name">Simple Voice Chat</h1>
            <p className="vm-summary">A working voice chat in Minecraft!</p>
            <div className="vm-meta-row">
              <span className="vm-meta-stat"><Download size={13} /> <strong>34M</strong> downloads</span>
              <span className="vm-meta-stat"><Heart size={13} /> <strong>16,221</strong> followers</span>
              <span className="vm-meta-stat"><Calendar size={13} /> Created 4 years ago</span>
            </div>
            <div className="vm-tags">
              <span className="vm-tag cat"><Tag size={9} /> Adventure</span>
              <span className="vm-tag cat"><Tag size={9} /> Social</span>
              <span className="vm-tag cat"><Tag size={9} /> Utility</span>
            </div>
          </div>
          <div className="vm-actions">
            <button className="vm-btn-dl"><Download size={16} /> Download</button>
            <button className={`vm-icon-btn${hearted ? ' active' : ''}`} onClick={() => setHearted(h => !h)} aria-label="Like">
              <Heart size={17} fill={hearted ? 'currentColor' : 'none'} />
            </button>
            <button className={`vm-icon-btn${saved ? ' active' : ''}`} onClick={() => setSaved(s => !s)} aria-label="Save">
              <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <div className="vm-menu-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                className={`vm-icon-btn${menuOpen ? ' active' : ''}`}
                aria-label="More"
                onClick={() => setMenuOpen(o => !o)}
              >
                <MoreHorizontal size={17} />
              </button>
              {menuOpen && (
                <div className="vm-menu">
                  <button className="vm-menu-item danger">
                    <Flag size={16} /> Report
                  </button>
                  <button className="vm-menu-item">
                    <ClipboardCopy size={16} /> Copy ID
                  </button>
                  <button className="vm-menu-item">
                    <ClipboardCopy size={16} /> Copy permanent link
                  </button>
                </div>
              )}
            </div>
          </div>
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
          <div className="vm-main">
            {activeTab === 'Description' && (
              <div className="vm-content-box">
                <div className="vm-toplinks">
                  {TOP_LINKS.map(l => (
                    <a key={l} className="vm-toplink" href="#">{l}</a>
                  ))}
                </div>

                <h2>Simple Voice Chat</h2>
                <p>
                  A working voice chat for Minecraft! Talk to your friends in proximity, on
                  groups or in private. Works on Forge, Fabric, NeoForge, Quilt, Paper, Spigot,
                  Folia, Bukkit and more.
                </p>

                <div className="vm-note">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div><strong>NOTE:</strong> Simple Voice Chat needs to be installed on the server and on every client that wants to use it.</div>
                </div>

                <div className="vm-image-block">
                  <MessageCircle size={48} />
                </div>

                <h2>Features</h2>
                <ul>
                  <li>Proximity voice chat with realistic 3D positional audio</li>
                  <li>Group chats — talk privately with selected players</li>
                  <li>Whisper mode for quiet talking nearby</li>
                  <li>End-to-end encrypted communication</li>
                  <li>Works completely standalone — no third-party services required</li>
                  <li>Push-to-talk and voice activation</li>
                  <li>Customizable audio quality and codec</li>
                </ul>

                <h2>Icons</h2>
                <p>
                  Icons by <a href="#" style={{ color: 'var(--primary, #ff6b00)', textDecoration: 'none' }}>Stridey</a> — used with permission.
                </p>
              </div>
            )}

            {activeTab === 'Gallery' && (
              <div className="vm-gallery-grid">
                {[
                  { title: null, date: 'January 12, 2023' },
                  { title: null, date: 'January 12, 2023' },
                  { title: 'Creating a group', date: 'December 23, 2022' },
                  { title: 'Voice chat menu', date: 'December 23, 2022' },
                  { title: 'Voice chat settings', date: 'December 23, 2022' },
                  { title: 'Group menu', date: 'December 23, 2022' },
                ].map((item, i) => (
                  <div key={i} className="vm-gallery-card">
                    <div className="vm-gallery-image">
                      <MessageCircle size={36} />
                    </div>
                    <div className="vm-gallery-meta">
                      {item.title && <div className="vm-gallery-title">{item.title}</div>}
                      <div className="vm-gallery-date">
                        <Calendar size={13} />{item.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Changelog' && (
              <div className="vm-changelog">
                {[
                  { title: 'Simple Voice Chat 2.6.16+26.2-snapshot-3', author: 'henkelmax', date: 'Apr 15, 2026', type: 'snapshot', notes: ['Updated to 26.2-snapshot-3'] },
                  { title: 'Simple Voice Chat 2.6.16+26.2-snapshot-2', author: 'henkelmax', date: 'Apr 10, 2026', type: 'snapshot', notes: [] },
                  { title: 'Simple Voice Chat 2.6.16+26.1.2', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: [] },
                  { title: 'Simple Voice Chat 2.6.16+26.1.2', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: [] },
                  { title: 'Simple Voice Chat 2.6.16+26.1.2', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: [] },
                  { title: 'Simple Voice Chat 2.6.16', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: ['Added support for bukkit/spigot 26.1.2', 'Added support for paper 26.1.2'] },
                  { title: 'Simple Voice Chat 1.21.11-2.6.16', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: [] },
                  { title: 'Simple Voice Chat 1.21.11-2.6.16', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: [] },
                  { title: 'Simple Voice Chat 1.21.11-2.6.16', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: [] },
                  { title: 'Simple Voice Chat 1.21.10-2.6.16', author: 'henkelmax', date: 'Apr 10, 2026', type: 'release', notes: [] },
                ].map((entry, i, arr) => (
                  <div key={i} className={`vm-cl-entry ${i === arr.length - 1 ? 'last' : ''}`}>
                    <div className={`vm-cl-marker ${entry.type}`}>
                      <span className="vm-cl-dot" />
                      {i < arr.length - 1 && <span className={`vm-cl-line ${arr[i+1].type}`} />}
                    </div>
                    <div className="vm-cl-body">
                      <div className="vm-cl-header">
                        <div className="vm-cl-title">
                          {entry.title}
                          <span className="vm-cl-meta"> by <a href="#">{entry.author}</a> on {entry.date}</span>
                        </div>
                        <button className="vm-cl-dl"><Download size={14} /> Download</button>
                      </div>
                      {entry.notes.length > 0 && (
                        <ul className="vm-cl-notes">
                          {entry.notes.map((n, j) => <li key={j}>{n}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Versions' && (
              <div className="vm-versions-table">
                <div className="vm-vt-head">
                  <div />
                  <div>Name</div>
                  <div>Game version</div>
                  <div>Published</div>
                  <div>Downloads</div>
                  <div />
                </div>
                {[
                  { letter: 'A', color: 'alpha', name: 'fabric-2.6.16+26.2-snapshot-3', sub: 'Simple Voice Chat 2.6.16+26.2-snapshot-3', versions: ['26.2-snapshot-3'], published: '6 days ago', downloads: '4,101' },
                  { letter: 'A', color: 'alpha', name: 'fabric-2.6.16+26.2-snapshot-2', sub: 'Simple Voice Chat 2.6.16+26.2-snapshot-2', versions: ['26.2-snapshot-2'], published: 'last week', downloads: '3,519' },
                  { letter: 'R', color: 'release', name: 'fabric-2.6.16+26.1.2', sub: 'Simple Voice Chat 2.6.16+26.1.2', versions: ['26.1.x'], published: 'last week', downloads: '119.7K' },
                  { letter: 'R', color: 'release', name: 'neoforge-2.6.16+26.1.2', sub: 'Simple Voice Chat 2.6.16+26.1.2', versions: ['26.1.x'], published: 'last week', downloads: '2,615' },
                  { letter: 'R', color: 'release', name: 'forge-2.6.16+26.1.2', sub: 'Simple Voice Chat 2.6.16+26.1.2', versions: ['26.1.x'], published: 'last week', downloads: '4,810' },
                  { letter: 'R', color: 'release', name: 'bukkit-2.6.16', sub: 'Simple Voice Chat 2.6.16', versions: ['26.1.x','1.21.x','1.20.x','1.19.x','1.18.x','1.17.x','+3'], published: 'last week', downloads: '36.5K' },
                ].map((row, i) => (
                  <div key={i} className="vm-vt-row">
                    <div className={`vm-vt-status ${row.color}`}>{row.letter}</div>
                    <div className="vm-vt-name">
                      <div className="vm-vt-name-main">{row.name}</div>
                      <div className="vm-vt-name-sub">{row.sub}</div>
                    </div>
                    <div className="vm-vt-versions">
                      {row.versions.map(v => <span key={v} className="vm-vt-pill">{v}</span>)}
                    </div>
                    <div className="vm-vt-cell">{row.published}</div>
                    <div className="vm-vt-cell">{row.downloads}</div>
                    <div className="vm-vt-meta-mobile">{row.published} · {row.downloads}</div>
                    <div className="vm-vt-actions">
                      <button className="vm-vt-dl-btn" aria-label="Download"><Download size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="vm-sidebar">
            {/* Compatibility */}
            <div className="vm-sidebar-card">
              <h3 className="vm-sidebar-title">Compatibility</h3>
              <div className="vm-sidebar-sub">Minecraft: Java Edition</div>
              <div className="vm-pill-row">
                {MC_VERSIONS.map(v => <span key={v} className="vm-mc-pill">{v}</span>)}
              </div>
            </div>

            {/* Environments */}
            <div className="vm-sidebar-card">
              <h3 className="vm-sidebar-title">Supported environments</h3>
              <div className="vm-platform-list">
                {ENVIRONMENTS.map(({ label, icon: Icon }) => (
                  <div key={label} className="vm-platform-row">
                    <Icon size={15} style={{ color: '#888' }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="vm-sidebar-card">
              <h3 className="vm-sidebar-title">Links</h3>
              {PROJECT_LINKS.map(({ label, icon: Icon }) => (
                <a key={label} href="#" className="vm-link-btn">
                  <Icon size={15} />
                  {label}
                  <ExternalLink size={11} style={{ marginLeft: 'auto', color: '#555' }} />
                </a>
              ))}
            </div>

            {/* Tags */}
            <div className="vm-sidebar-card">
              <h3 className="vm-sidebar-title">Tags</h3>
              <div className="vm-pill-row">
                {TAGS.map(t => (
                  <span key={t} className="vm-tag cat"><Tag size={9} /> {t}</span>
                ))}
              </div>
            </div>

            {/* Creators */}
            <div className="vm-sidebar-card">
              <h3 className="vm-sidebar-title">Creators</h3>
              <div className="vm-creators">
                {CREATORS.map(c => (
                  <div key={c.name} className="vm-creator">
                    <div className="vm-creator-avatar">{c.initials}</div>
                    <div>
                      <div className="vm-creator-name">
                        {c.name}
                        {c.isOwner && <Crown size={12} />}
                      </div>
                      <div className="vm-creator-role">{c.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="vm-sidebar-card">
              <h3 className="vm-sidebar-title">Details</h3>
              <div className="vm-detail-row">
                <FileText size={14} />
                Licensed <strong>ARR</strong>
              </div>
              <div className="vm-detail-row">
                <Calendar size={14} />
                Published <strong>4 years ago</strong>
              </div>
              <div className="vm-detail-row">
                <RefreshCw size={14} />
                Updated <strong>6 days ago</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default VeinminerMockup;
