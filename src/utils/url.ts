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

export const getPluginUrl = (plugin: { id?: number | string; public_id?: string; name?: string }): string => {
  const identifier = plugin.public_id || plugin.id;
  const slug = plugin.name ? slugify(plugin.name) : '';
  return slug ? `/plugin/${identifier}-${slug}` : `/plugin/${identifier}`;
};
