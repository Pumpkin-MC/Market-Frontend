import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Backpack,
  Banknote,
  Blocks,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Clock3,
  CookingPot,
  Download,
  Heart,
  Image as ImageIcon,
  Leaf,
  LayoutList,
  Map,
  Package,
  Pickaxe,
  Search,
  ShieldAlert,
  Smile,
  Sparkles,
  Swords,
  Telescope,
  Truck,
  Users,
  Wrench,
  Check,
  CircleOff,
} from 'lucide-react';
import api from '../../api';
import SEO from '../SEO';
import './DiscoverCatalog.css';

type Plugin = {
  id: number;
  name: string;
  dev_name?: string;
  category?: string;
  keywords?: string;
  translated_descriptions?: string;
  preview_path?: string;
  type?: 'free' | 'paid' | 'adwall' | string;
  price_cents?: number;
  sale_active?: boolean;
  sale_discount_percent?: number;
  downloads?: number;
  rating?: number;
  likes?: number;
  version?: string;
  created_at?: string;
  mock_tags?: Array<{ label: string; tone?: 'default' | 'orange' | 'yellow' | 'green' | 'red' }>;
  mock_extra_count?: number;
  mock_banner?: string;
};

type DiscoverCatalogProps = {
  initialSearchQuery?: string;
  heading: string;
  subheading: string;
  seoTitle: string;
  seoDescription: string;
};

type CategoryMode = 'include' | 'exclude';
type SortOption = { value: string; label: string };

const sortOptions: SortOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'downloads', label: 'Downloads' },
  { value: 'rating', label: 'Rating' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'price-asc', label: 'Price low-high' },
  { value: 'price-desc', label: 'Price high-low' },
];

const viewOptions = ['20', '40', '60'];

const modrinthPluginCategories = [
  'Adventure',
  'Cursed',
  'Decoration',
  'Economy',
  'Equipment',
  'Food',
  'Game Mechanics',
  'Library',
  'Magic',
  'Management',
  'Minigame',
  'Mobs',
  'Optimization',
  'Social',
  'Storage',
  'Technology',
  'Transportation',
  'Utility',
  'World Generation',
];

const modrinthPluginVersions = [
  '26.1.2', '26.1.1', '26.1', '1.21.11', '1.21.10', '1.21.9', '1.21.8', '1.21.7',
  '1.21.6', '1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21', '1.20.6',
  '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20', '1.19.4', '1.19.3',
  '1.19.2', '1.19.1', '1.19', '1.18.2', '1.18.1', '1.18', '1.17.1', '1.17',
  '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16', '1.15.2', '1.15.1',
  '1.15', '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14', '1.13.2', '1.13.1',
  '1.13', '1.12.2', '1.12.1', '1.12', '1.11.2', '1.11.1', '1.11', '1.10.2',
  '1.10.1', '1.10', '1.9.4', '1.9.3', '1.9.2', '1.9.1', '1.9', '1.8.9', '1.8.8',
  '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8', '1.7.10',
  '1.7.9', '1.7.8', '1.7.7', '1.7.6', '1.7.5', '1.7.4', '1.7.3', '1.7.2', '1.6.4',
  '1.6.2', '1.6.1', '1.5.2', '1.5.1', '1.4.7', '1.4.6', '1.4.5', '1.4.4', '1.4.2',
  '1.3.2', '1.3.1', '1.2.5', '1.2.4', '1.2.3', '1.2.2', '1.2.1', '1.1', '1.0',
];

const accentColors = ['#1bd96a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

const mockPlugins: Plugin[] = [
  {
    id: 900001,
    name: 'Simple Voice Chat',
    dev_name: 'henkelmax',
    category: 'Adventure',
    translated_descriptions: JSON.stringify({ en: 'A working voice chat in Minecraft!' }),
    downloads: 44_400_000,
    likes: 11_400,
    version: '1.21.4',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'free',
    mock_tags: [
      { label: 'Adventure' },
      { label: 'Social' },
      { label: 'Utility' },
      { label: 'Bukkit', tone: 'orange' },
      { label: 'BungeeCord', tone: 'yellow' },
      { label: 'Folia', tone: 'green' },
    ],
    mock_extra_count: 9,
    mock_banner: 'linear-gradient(180deg, #7fb0ff 0%, #7fc86e 45%, #456b2f 100%)',
  },
  {
    id: 900002,
    name: 'Veinminer',
    dev_name: 'Miraculixx',
    category: 'Equipment',
    translated_descriptions: JSON.stringify({ en: 'Mine the whole vine on mining a single ore. Known feature by modpacks and pvp games like UHC (quick mine)' }),
    downloads: 44_270_000,
    likes: 4_489,
    version: '1.21.4',
    created_at: new Date(Date.now() - 43 * 60 * 1000).toISOString(),
    type: 'free',
    mock_tags: [
      { label: 'Equipment' },
      { label: 'Game Mechanics' },
      { label: 'Utility' },
      { label: 'Bukkit', tone: 'orange' },
      { label: 'Folia', tone: 'green' },
      { label: 'Paper', tone: 'red' },
    ],
    mock_extra_count: 7,
    mock_banner: 'linear-gradient(180deg, #3a3f49 0%, #5d7e3f 36%, #8c6a45 36%, #8c6a45 48%, #6f6f6f 48%, #6f6f6f 100%)',
  },
  {
    id: 900003,
    name: 'Let Me Despawn',
    dev_name: 'frikinjay',
    category: 'Optimization',
    translated_descriptions: JSON.stringify({ en: 'Improves performance by tweaking mob despawn rules. Say bye to pesky unintentional persistent mobs.' }),
    downloads: 16_600_000,
    likes: 1_920,
    version: '1.21.3',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'free',
    mock_tags: [
      { label: 'Optimization' },
      { label: 'Bukkit', tone: 'orange' },
      { label: 'Paper', tone: 'red' },
      { label: 'Purpur', tone: 'default' },
    ],
    mock_extra_count: 4,
    mock_banner: 'linear-gradient(180deg, #343740 0%, #4a6f35 35%, #735c43 35%, #735c43 47%, #5a5a5a 47%, #5a5a5a 100%)',
  },
  {
    id: 900004,
    name: 'Veinminer Enchantment',
    dev_name: 'Miraculixx',
    category: 'Equipment',
    translated_descriptions: JSON.stringify({ en: 'Veinminer Addon - Adds veinminer enchantment to enchanting tables. Only tools with the enchantment can veinmine' }),
    downloads: 13_380_000,
    likes: 1_007,
    version: '1.20.6',
    created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    type: 'free',
    mock_tags: [
      { label: 'Equipment' },
      { label: 'Game Mechanics' },
      { label: 'Utility' },
      { label: 'Folia', tone: 'green' },
      { label: 'Paper', tone: 'red' },
      { label: 'Purpur', tone: 'default' },
    ],
    mock_extra_count: 3,
    mock_banner: 'linear-gradient(180deg, #40434c 0%, #58844c 34%, #7d6548 34%, #7d6548 48%, #666 48%, #666 100%)',
  },
];

const categoryIcons: Record<string, typeof Map> = {
  Adventure: Map,
  Cursed: ShieldAlert,
  Decoration: Sparkles,
  Economy: Banknote,
  Equipment: Swords,
  Food: CookingPot,
  'Game Mechanics': Wrench,
  Library: BookOpen,
  Magic: Sparkles,
  Management: BriefcaseBusiness,
  Minigame: Telescope,
  Mobs: Smile,
  Optimization: Pickaxe,
  Social: Users,
  Storage: Package,
  Technology: Blocks,
  Transportation: Truck,
  Utility: Backpack,
  'World Generation': Leaf,
};

const getDescription = (plugin: Plugin) => {
  try {
    const parsed = JSON.parse(plugin.translated_descriptions || '{}') as Record<string, string>;
    return parsed['en-US'] || parsed.en || Object.values(parsed)[0] || 'No description provided.';
  } catch {
    return 'No description provided.';
  }
};

const getAccentColor = (name: string) => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return accentColors[Math.abs(hash) % accentColors.length];
};

const getPriceInfo = (plugin: Plugin) => {
  const base = plugin.price_cents ?? 0;
  const isSale = Boolean(plugin.sale_active && (plugin.sale_discount_percent ?? 0) > 0);

  if (plugin.type === 'free') {
    return { label: 'Free', tone: 'free', isSale: false, originalLabel: '' };
  }

  if (plugin.type === 'adwall') {
    return { label: 'Ad supported', tone: 'adwall', isSale: false, originalLabel: '' };
  }

  if (isSale) {
    const saleCents = Math.round(base * (1 - (plugin.sale_discount_percent ?? 0) / 100));
    return {
      label: `€${(saleCents / 100).toFixed(2)}`,
      tone: 'sale',
      isSale: true,
      originalLabel: `€${(base / 100).toFixed(2)}`,
    };
  }

  return {
    label: `€${(base / 100).toFixed(2)}`,
    tone: 'paid',
    isSale: false,
    originalLabel: '',
  };
};

const formatCompactNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
};

const formatRelativeDate = (value?: string) => {
  if (!value) return 'Recently';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Recently';

  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `${Math.max(minutes, 1)} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;

  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const normalizedTag = (value?: string) => {
  if (!value) return undefined;
  return value.startsWith('v') ? value : `v${value}`;
};

const sortPlugins = (plugins: Plugin[], sort: string) => {
  const sorted = [...plugins];

  switch (sort) {
    case 'name-asc':
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      break;
    case 'name-desc':
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      break;
    case 'price-asc':
      sorted.sort((left, right) => (left.price_cents ?? 0) - (right.price_cents ?? 0));
      break;
    case 'price-desc':
      sorted.sort((left, right) => (right.price_cents ?? 0) - (left.price_cents ?? 0));
      break;
    case 'downloads':
      sorted.sort((left, right) => (right.downloads ?? 0) - (left.downloads ?? 0));
      break;
    case 'rating':
      sorted.sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
      break;
    case 'newest':
    default:
      sorted.sort((left, right) => {
        const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightDate - leftDate;
      });
      break;
  }

  return sorted;
};

const DiscoverCatalog = ({
  initialSearchQuery = '',
  heading,
  subheading,
  seoTitle,
  seoDescription,
}: DiscoverCatalogProps) => {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchQuery);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<Record<string, CategoryMode>>({});
  const [versionFilter, setVersionFilter] = useState<string | null>(null);
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('20');
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list');
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const [versionsCollapsed, setVersionsCollapsed] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
    setDebouncedQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsTransitioning(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const closeDropdowns = () => {
      setSortOpen(false);
      setViewOpen(false);
    };

    window.addEventListener('click', closeDropdowns);
    return () => window.removeEventListener('click', closeDropdowns);
  }, []);

  useEffect(() => {
    const fetchPlugins = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/plugins', {
          params: {
            sort: ['newest', 'name-asc', 'name-desc', 'price-asc', 'price-desc'].includes(sort)
              ? sort
              : undefined,
          },
        });
        setPlugins(Array.isArray(response.data) ? response.data : []);
      } catch (fetchError) {
        console.error('Error fetching plugins:', fetchError);
        setPlugins([]);
        setError('Failed to load plugins. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();
  }, [sort]);

  const categories = modrinthPluginCategories;
  const visibleVersions = showAllVersions ? modrinthPluginVersions : modrinthPluginVersions.slice(0, 24);

  const displayPlugins = plugins.length > 0 ? plugins : mockPlugins;

  const filteredPlugins = sortPlugins(
    displayPlugins.filter((plugin) => {
      const query = debouncedQuery.trim().toLowerCase();
      const description = getDescription(plugin).toLowerCase();
      const matchesQuery = !query || [
        plugin.name,
        plugin.dev_name,
        plugin.category,
        plugin.keywords,
        description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const includedCategories = Object.entries(categoryFilters)
        .filter(([, mode]) => mode === 'include')
        .map(([category]) => category);
      const excludedCategories = Object.entries(categoryFilters)
        .filter(([, mode]) => mode === 'exclude')
        .map(([category]) => category);
      const matchesIncludedCategories = includedCategories.length === 0 || includedCategories.includes(plugin.category || '');
      const matchesExcludedCategories = !excludedCategories.includes(plugin.category || '');
      const normalizedVersion = plugin.version?.replace(/^v/i, '').trim() || '';
      const matchesVersion = versionFilter == null || normalizedVersion === versionFilter;

      return matchesQuery
        && matchesIncludedCategories
        && matchesExcludedCategories
        && matchesVersion;
    }),
    sort,
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    navigate(trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : '/');
  };

  const setCategoryMode = (category: string, mode: CategoryMode) => {
    setCategoryFilters((current) => {
      const next = { ...current };
      if (next[category] === mode) {
        delete next[category];
      } else {
        next[category] = mode;
      }
      return next;
    });
  };

  const toggleCategoryRow = (category: string) => {
    setCategoryFilters((current) => {
      if (!(category in current)) {
        return { ...current, [category]: 'include' };
      }

      const next = { ...current };
      delete next[category];
      return next;
    });
  };

  return (
    <div className="discover-shell">
      <SEO title={seoTitle} description={seoDescription} />

      <section className="discover-panel">
        <aside className="discover-sidebar">
          <div className="discover-filter-block">
            <button
              type="button"
              className="discover-filter-heading"
              onClick={() => setCategoriesCollapsed((current) => !current)}
              aria-expanded={!categoriesCollapsed}
            >
              <p className="discover-filter-label">Category</p>
              <ChevronDown size={18} className={categoriesCollapsed ? 'discover-chevron collapsed' : 'discover-chevron'} />
            </button>
            <div className={categoriesCollapsed ? 'discover-filter-content collapsed' : 'discover-filter-content'}>
              <div className="discover-category-list">
                {categories.map((category) => (
                  <div
                    key={category}
                    className={[
                      'discover-category-row',
                      categoryFilters[category] === 'include' ? 'include' : '',
                      categoryFilters[category] === 'exclude' ? 'exclude' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <button
                      type="button"
                      className="discover-category-item"
                      onClick={() => toggleCategoryRow(category)}
                    >
                      {(() => {
                        const Icon = categoryIcons[category] || Map;
                        return <Icon size={18} className="discover-category-icon" />;
                      })()}
                      <span>{category}</span>
                    </button>

                    <div className="discover-category-actions">
                      <button
                        type="button"
                        className={[
                          'discover-category-mode',
                          categoryFilters[category] === 'include' ? 'active include persist-visible' : '',
                        ].join(' ')}
                        aria-label={`Include ${category}`}
                        onClick={() => setCategoryMode(category, 'include')}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        className={[
                          'discover-category-mode',
                          categoryFilters[category] === 'exclude' ? 'active exclude' : '',
                        ].join(' ')}
                        aria-label={`Exclude ${category}`}
                        onClick={() => setCategoryMode(category, 'exclude')}
                      >
                        <CircleOff size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="discover-filter-block">
            <button
              type="button"
              className="discover-filter-heading"
              onClick={() => setVersionsCollapsed((current) => !current)}
              aria-expanded={!versionsCollapsed}
            >
              <p className="discover-filter-label">Game version</p>
              <ChevronDown size={18} className={versionsCollapsed ? 'discover-chevron collapsed' : 'discover-chevron'} />
            </button>
            <div className={versionsCollapsed ? 'discover-filter-content collapsed' : 'discover-filter-content'}>
              <div>
                <div className="discover-version-list">
                  {visibleVersions.map((version) => (
                    <div
                      key={version}
                      className={[
                        'discover-version-row',
                        versionFilter === version ? 'include' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <button
                        type="button"
                        className="discover-version-item"
                        onClick={() => setVersionFilter((current) => current === version ? null : version)}
                      >
                        <span>{version}</span>
                      </button>
                    </div>
                  ))}
                </div>
                {modrinthPluginVersions.length > 24 && (
                  <button
                    type="button"
                    className="discover-show-more"
                    onClick={() => setShowAllVersions((current) => !current)}
                  >
                    {showAllVersions ? 'Show fewer versions' : 'Show all versions'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="discover-results">
          <form className="discover-searchbar discover-searchbar-top" onSubmit={handleSearchSubmit}>
            <div className="discover-searchbox">
              <Search size={24} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search plugins..."
              />
            </div>
          </form>

          <div className="discover-toolbar">
            <div className="discover-toolbar-controls">
              <div
                className={sortOpen ? 'discover-dropdown open' : 'discover-dropdown'}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="discover-toolbar-pill"
                  onClick={() => {
                    setSortOpen((current) => !current);
                    setViewOpen(false);
                  }}
                >
                  <span>Sort by:</span>
                  <strong>{sortOptions.find((option) => option.value === sort)?.label || 'Newest'}</strong>
                  <ChevronDown size={18} />
                </button>
                {sortOpen && (
                  <div className="discover-dropdown-menu">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={option.value === sort ? 'discover-dropdown-item active' : 'discover-dropdown-item'}
                        onClick={() => {
                          setSort(option.value);
                          setSortOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className={viewOpen ? 'discover-dropdown open' : 'discover-dropdown'}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="discover-toolbar-pill discover-toolbar-pill-static"
                  onClick={() => {
                    setViewOpen((current) => !current);
                    setSortOpen(false);
                  }}
                >
                <span>View:</span>
                  <strong>{view}</strong>
                  <ChevronDown size={18} />
                </button>
                {viewOpen && (
                  <div className="discover-dropdown-menu">
                    {viewOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={option === view ? 'discover-dropdown-item active' : 'discover-dropdown-item'}
                        onClick={() => {
                          setView(option);
                          setViewOpen(false);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={layoutMode === 'grid' ? 'discover-layout-button active' : 'discover-layout-button'}
                aria-label="Toggle grid view"
                onClick={() => setLayoutMode((current) => current === 'list' ? 'grid' : 'list')}
              >
                {layoutMode === 'grid' ? <LayoutList size={22} /> : <ImageIcon size={22} />}
              </button>
            </div>

            <div className="discover-toolbar-pages">
              <span className="discover-page-current">1</span>
              <span>2</span>
              <span>...</span>
              <span>656</span>
              <ChevronRight size={18} />
            </div>
          </div>

          {error && <div className="discover-feedback error">{error}</div>}
          {loading && <div className="discover-feedback">Loading plugins...</div>}

          {!loading && !error && (
            <div className={[layoutMode === 'grid' ? 'discover-card-list grid-mode' : 'discover-card-list', isTransitioning ? 'transitioning' : ''].join(' ')}>
              {filteredPlugins.length > 0 ? (
                filteredPlugins.map((plugin) => {
                  const accent = getAccentColor(plugin.name);
                  const description = getDescription(plugin);
                  const price = getPriceInfo(plugin);
                  const baseTags = plugin.mock_tags ?? [
                    ...(plugin.category ? [{ label: plugin.category, tone: 'default' as const }] : []),
                    ...(plugin.version ? [{ label: normalizedTag(plugin.version)!, tone: 'default' as const }] : []),
                  ];
                  const extraTags = (plugin.keywords || '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((label) => ({ label, tone: 'default' as const }));
                  const tags = [...baseTags, ...extraTags];
                  const visibleTags = tags.slice(0, 6);
                  const hiddenTagCount = plugin.mock_extra_count ?? Math.max(tags.length - visibleTags.length, 0);
                  const likes = plugin.likes ?? Math.round((plugin.rating ?? 0) * 1000);

                  return (
                    <Link
                      key={plugin.id}
                      to={`/plugin/${plugin.id}`}
                      className={layoutMode === 'grid' ? 'discover-card grid-card' : 'discover-card'}
                    >
                      {layoutMode === 'grid' && (
                        <div className="discover-card-banner" style={{ background: plugin.mock_banner || `${accent}33` }}>
                          {plugin.preview_path && <img src={plugin.preview_path} alt={plugin.name} />}
                        </div>
                      )}
                      <div className="discover-card-icon" style={{ background: `${accent}22`, color: accent }}>
                        {plugin.preview_path ? (
                          <img src={plugin.preview_path} alt={plugin.name} />
                        ) : (
                          <span>{plugin.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="discover-card-main">
                        <div className="discover-card-title-row">
                          <h2>{plugin.name}</h2>
                          <p>by {plugin.dev_name || 'Unknown developer'}</p>
                        </div>

                        <p className="discover-card-description">{description}</p>

                        <div className="discover-card-tags">
                          {visibleTags.map((tag, index) => (
                            <span
                              key={`${plugin.id}-${tag.label}-${index}`}
                              className={[
                                index === 0 ? 'discover-tag' : 'discover-tag muted',
                                tag.tone ? `tone-${tag.tone}` : '',
                              ].join(' ')}
                            >
                              {tag.label}
                            </span>
                          ))}
                          {hiddenTagCount > 0 && <span className="discover-tag muted">+{hiddenTagCount}</span>}
                          {plugin.type === 'paid' && (
                            <span className={`discover-price-pill ${price.tone}`}>
                            {price.isSale && <span className="discover-price-strike">{price.originalLabel}</span>}
                            <span>{price.label}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="discover-card-stats">
                        <div className="discover-stat-row">
                          <span><Download size={18} /> {formatCompactNumber(plugin.downloads ?? 0)}</span>
                          <span><Heart size={18} /> {formatCompactNumber(likes)}</span>
                        </div>
                        <div className="discover-stat-row muted">
                          <span><Clock3 size={18} /> {formatRelativeDate(plugin.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="discover-empty">
                  <h2>Nothing matched these filters</h2>
                  <p>Try another keyword, category, or game version.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DiscoverCatalog;
