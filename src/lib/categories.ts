import type { TFunction } from 'i18next';

const CATEGORY_KEY_MAP: Record<string, string> = {
  'Admin Tools': 'developer.categories.admin_tools',
  'Economy': 'developer.categories.economy',
  'Fun': 'developer.categories.fun',
  'World Management': 'developer.categories.world_management',
  'Utilities': 'developer.categories.utilities',
  'Chat': 'developer.categories.chat',
  'Other': 'developer.categories.other',
};

export function translateCategory(t: TFunction, category: string | null | undefined): string {
  if (!category) return '';
  const key = CATEGORY_KEY_MAP[category];
  return key ? t(key as any) : category;
}

export function getCategoryOptions(t: TFunction): { value: string; label: string }[] {
  return Object.entries(CATEGORY_KEY_MAP).map(([value, key]) => ({
    value,
    label: t(key as any),
  }));
}
