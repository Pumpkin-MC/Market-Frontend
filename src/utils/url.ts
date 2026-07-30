export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_\.\-]+/g, '-')     // Replace spaces, underscores, dots, and hyphens with a single -
    .replace(/[^\w\-]+/g, '')        // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')          // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')              // Trim hyphens from start
    .replace(/-+$/, '');             // Trim hyphens from end
};

export const getPluginUrl = (plugin: { id: number | string; name?: string }): string => {
  const slug = plugin.name ? slugify(plugin.name) : '';
  return slug ? `/plugin/${plugin.id}-${slug}` : `/plugin/${plugin.id}`;
};
