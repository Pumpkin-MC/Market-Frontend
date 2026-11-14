import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Bed,
  Blocks,
  BookOpen,
  Boxes,
  CalendarHeart,
  Castle,
  Cloud,
  Coins,
  Compass,
  Cpu,
  Crown,
  Flame,
  Footprints,
  Gamepad2,
  Globe2,
  Heart,
  HeartHandshake,
  Lock,
  Mic,
  Mountain,
  Palette,
  Pickaxe,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Tent,
  Theater,
  Trophy,
  Users,
} from 'lucide-react';

export type ServerTagCategory = 'core' | 'gamemode' | 'gameplay' | 'community';

export interface ServerTagDefinition {
  value: string;
  label: string;
  category: ServerTagCategory;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
}

export const MAX_SERVER_TAGS = 8;

export const SERVER_TAG_CATEGORIES: {
  id: ServerTagCategory;
  label: string;
}[] = [
  { id: 'core', label: 'Core Modes' },
  { id: 'gamemode', label: 'Gamemodes' },
  { id: 'gameplay', label: 'Gameplay & RPG' },
  { id: 'community', label: 'Community & Tech' },
];

export const SERVER_TAGS: ServerTagDefinition[] = [
  // Core Modes (8)
  {
    value: 'vanilla',
    label: 'Vanilla',
    category: 'core',
    description: 'Pure unaltered Minecraft gameplay',
    icon: Blocks,
    featured: true,
  },
  {
    value: 'semi-vanilla',
    label: 'Semi-Vanilla',
    category: 'core',
    description: 'Classic survival with light quality-of-life enhancements',
    icon: Pickaxe,
    featured: true,
  },
  {
    value: 'survival',
    label: 'Survival',
    category: 'core',
    description: 'Gather, build, and survive together',
    icon: Compass,
    featured: true,
  },
  {
    value: 'smp',
    label: 'SMP',
    category: 'core',
    description: 'Community-driven Survival Multiplayer world',
    icon: Tent,
    featured: true,
  },
  {
    value: 'hardcore',
    label: 'Hardcore',
    category: 'core',
    description: 'High-stakes survival with death bans or permadeath',
    icon: Skull,
  },
  {
    value: 'creative',
    label: 'Creative',
    category: 'core',
    description: 'Freebuild plots, megabuilds, and world creation',
    icon: Palette,
  },
  {
    value: 'adventure',
    label: 'Adventure',
    category: 'core',
    description: 'Curated worlds, dungeons, and exploration maps',
    icon: Mountain,
  },
  {
    value: 'anarchy',
    label: 'Anarchy',
    category: 'core',
    description: 'No rules, unrestricted world with permanent history',
    icon: Flame,
  },

  // Gamemodes (12)
  {
    value: 'skyblock',
    label: 'Skyblock',
    category: 'gamemode',
    description: 'Expand from a floating island in the void',
    icon: Cloud,
    featured: true,
  },
  {
    value: 'oneblock',
    label: 'OneBlock',
    category: 'gamemode',
    description: 'Infinite progression starting from a single regenerating block',
    icon: Boxes,
  },
  {
    value: 'factions',
    label: 'Factions',
    category: 'gamemode',
    description: 'Team territory claiming, raiding, and base warfare',
    icon: Castle,
  },
  {
    value: 'towny',
    label: 'Towny',
    category: 'gamemode',
    description: 'Player-run towns, mayors, nations, and peaceful land claims',
    icon: Crown,
  },
  {
    value: 'prison',
    label: 'Prison',
    category: 'gamemode',
    description: 'Mine, rank up through tiers, and prestige',
    icon: Award,
  },
  {
    value: 'minigames',
    label: 'Minigames',
    category: 'gamemode',
    description: 'Fast-paced arcade games and party modes',
    icon: Gamepad2,
    featured: true,
  },
  {
    value: 'bedwars',
    label: 'BedWars',
    category: 'gamemode',
    description: 'Protect your bed and eliminate rival island teams',
    icon: Bed,
  },
  {
    value: 'skywars',
    label: 'SkyWars',
    category: 'gamemode',
    description: 'Loot sky islands and battle to be last standing',
    icon: Trophy,
  },
  {
    value: 'parkour',
    label: 'Parkour',
    category: 'gamemode',
    description: 'Precision movement courses, speedruns, and leaderboards',
    icon: Footprints,
  },
  {
    value: 'lifesteal',
    label: 'LifeSteal',
    category: 'gamemode',
    description: 'Steal permanent hearts when defeating other players',
    icon: Heart,
    featured: true,
  },
  {
    value: 'boxpvp',
    label: 'BoxPvP',
    category: 'gamemode',
    description: 'Compact arena mining, gear progression, and constant combat',
    icon: Shield,
  },
  {
    value: 'uhc',
    label: 'UHC',
    category: 'gamemode',
    description: 'Ultra Hardcore competitive matches with no natural regen',
    icon: Swords,
  },

  // Gameplay & RPG (7)
  {
    value: 'pvp',
    label: 'PvP',
    category: 'gameplay',
    description: 'Competitive player-versus-player combat and duels',
    icon: Swords,
    featured: true,
  },
  {
    value: 'pve',
    label: 'PvE',
    category: 'gameplay',
    description: 'Cooperative boss fights, mob arenas, and survival',
    icon: Users,
  },
  {
    value: 'rpg',
    label: 'RPG',
    category: 'gameplay',
    description: 'Classes, skills, custom loot, and leveling progression',
    icon: Sparkles,
    featured: true,
  },
  {
    value: 'economy',
    label: 'Economy',
    category: 'gameplay',
    description: 'Player shops, auction house, jobs, and trading',
    icon: Coins,
    featured: true,
  },
  {
    value: 'quests',
    label: 'Quests & Lore',
    category: 'gameplay',
    description: 'Storylines, NPCs, and custom worldbuilding',
    icon: BookOpen,
  },
  {
    value: 'earth',
    label: 'Earth',
    category: 'gameplay',
    description: 'Real-world Earth map with nations and geopolitics',
    icon: Globe2,
  },
  {
    value: 'roleplay',
    label: 'Roleplay',
    category: 'gameplay',
    description: 'In-character storytelling and immersive communities',
    icon: Theater,
  },

  // Community & Tech (5)
  {
    value: 'whitelist',
    label: 'Whitelisted',
    category: 'community',
    description: 'Application or invite-only vetted community',
    icon: Lock,
  },
  {
    value: 'family-friendly',
    label: 'Family Friendly',
    category: 'community',
    description: 'Safe, moderated chat welcoming players of all ages',
    icon: HeartHandshake,
  },
  {
    value: 'events',
    label: 'Events',
    category: 'community',
    description: 'Scheduled tournaments, build battles, and community nights',
    icon: CalendarHeart,
  },
  {
    value: 'voice-chat',
    label: 'Voice Chat',
    category: 'community',
    description: 'Proximity voice chat enabled for immersive multiplayer',
    icon: Mic,
    featured: true,
  },
  {
    value: 'wasm-plugins',
    label: 'WASM Plugins',
    category: 'community',
    description: 'Powered by custom sandboxed WebAssembly plugins',
    icon: Cpu,
    featured: true,
  },
];

export const SERVER_TAG_MAP: Record<string, ServerTagDefinition> = Object.fromEntries(
  SERVER_TAGS.map((t) => [t.value, t])
);

export const SERVER_TAG_LABELS: Record<string, string> = Object.fromEntries(
  SERVER_TAGS.map((t) => [t.value, t.label])
);

export interface PublicDirectoryStats {
  totalServers: number;
  onlineServers: number;
  onlinePlayers: number;
}

export interface PublicServerCard {
  publicId: string;
  slug: string;
  name: string;
  tagline: string;
  iconUrl: string | null;
  javaAddress: string;
  bedrockAddress: string | null;
  tags: string[];
  isOnline: boolean;
  onlinePlayers: number;
  maxPlayers: number;
  serverType: string;
  serverVersion: string | null;
  minecraftVersion: string | null;
  country: string | null;
  countryName: string | null;
  ownerUsername: string;
  upvotesCount: number;
  hasUpvoted: boolean;
  publishedAt: string | null;
  lastPing: string | null;
}

export interface PublicServersListResponse {
  stats: PublicDirectoryStats;
  tagCounts?: Record<string, number>;
  servers: PublicServerCard[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicPlayerHistoryPoint {
  timestamp: string;
  onlinePlayers: number;
  maxPlayers: number;
}

export interface PublicMarketPluginEntry {
  publicId: string;
  pluginId: number;
  name: string;
  version: string | null;
  language: string | null;
  category: string | null;
  previewUrl: string | null;
}

export interface PublicServerDetailResponse {
  server: PublicServerCard;
  description: string;
  websiteUrl: string | null;
  discordUrl: string | null;
  ownerAvatarUrl: string | null;
  peakPlayers24h: number;
  samples: PublicPlayerHistoryPoint[];
  marketPlugins: PublicMarketPluginEntry[];
}

export interface OwnerServerListingResponse {
  serverId: number;
  publicId: string | null;
  slug: string;
  isListed: boolean;
  javaAddress: string;
  bedrockAddress: string | null;
  tagline: string;
  description: string;
  iconUrl: string | null;
  tags: string[];
  websiteUrl: string | null;
  discordUrl: string | null;
  moderationStatus: 'active' | 'hidden' | 'banned' | string;
  moderationReason: string | null;
  upvotesCount: number;
  isOnline: boolean;
  hasTelemetry: boolean;
  publishedAt: string | null;
}
