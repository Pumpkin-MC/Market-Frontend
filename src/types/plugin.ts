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
  name: string;
  version?: string | null;
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
  deleted_at?: string | null;
  commands?: PluginCommand[];
  screenshots?: PluginScreenshot[];
  versions?: PluginVersion[];
  reviews?: PluginReview[];
}

export interface PluginDetail extends Plugin {
  dev_name: string;
  owned?: boolean | null;
}
