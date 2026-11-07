export type PluginLicenseType = 'free' | 'paid' | 'adwall';
export type ReleaseTrack = 'stable' | 'beta' | 'alpha';
export type PluginStatus = 'draft' | 'published' | 'under_review' | 'rejected' | 'suspended';

export interface PluginCommand {
  id?: number;
  plugin_id?: number;
  name: string;
  permission?: string;
  description?: Record<string, string> | string | null;
  aliases?: string[];
  display_order?: number;
  created_at?: string;
}

export interface PluginScreenshot {
  id: number;
  plugin_id: number;
  path: string;
  display_order?: number;
}

export interface PluginVersion {
  id: number;
  plugin_id: number;
  version: string;
  api_version?: string | null;
  release_notes?: string;
  track: ReleaseTrack;
  created_at: string;
}

export interface PluginReview {
  id: number;
  user_id: number;
  username: string;
  rating: number;
  comment: string;
  developer_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
}

export interface Plugin {
  id: number;
  public_id?: string;
  name: string;
  version?: string | null;
  api_version?: string | null;
  file_size?: number;
  dev_id?: number;
  price_cents?: number;
  type?: PluginLicenseType;
  category?: string;
  preview_path?: string | null;
  source_link?: string | null;
  keywords?: string | null;
  translated_descriptions?: Record<string, string> | string | null;
  description?: string | null;
  downloads?: number;
  views?: number;
  created_at?: string | null;
  updated_at?: string | null;
  sale_active?: boolean;
  sale_discount_percent?: number;
  is_early_access?: boolean;
  is_preorder?: boolean;
  preorder_release_date?: string | null;
  youtube_video_url?: string | null;
  status?: PluginStatus | string | null;
  rejection_reason?: string | null;
  deleted_at?: string | null;
  commands?: PluginCommand[];
  screenshots?: PluginScreenshot[];
  versions?: PluginVersion[];
  reviews?: PluginReview[];
}

export interface RuntimePermissionDetail {
  id: string;
  category: 'network' | 'filesystem' | 'system' | 'custom' | string;
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | string;
}

export interface WasmSecurityReport {
  has_binary: boolean;
  binary_format: string;
  is_component: boolean;
  api_version?: string | null;
  file_size?: number;
  sha256?: string | null;
  ed25519_signed: boolean;
  signature_standard: string;
  sandbox_level: 'strict' | 'elevated' | 'pending' | string;
  network_access: boolean;
  filesystem_access: boolean;
  system_access?: boolean;
  world_access: boolean;
  player_access: boolean;
  capabilities: string[];
  metadata_extracted?: boolean;
  plugin_metadata?: {
    name: string;
    version: string;
    authors: string[];
    description?: string | null;
    dependencies: string[];
    permissions: string[];
  };
  runtime_permissions?: RuntimePermissionDetail[];
  command_permissions?: string[];
  declared_permissions: string[];
  dependencies?: string[];
  authors?: string[];
  commands_count: number;
  imported_interfaces: string[];
  exported_interfaces: string[];
}

export interface PluginDetail extends Plugin {
  dev_name: string;
  dev_verified?: boolean;
  owned?: boolean | null;
  claimed_by_id?: number | null;
  claimed_by_name?: string | null;
  wasm_security?: WasmSecurityReport;
}
