/**
 * Converts a Markdown string into single-line plain text, suitable for short
 * previews (e.g. line-clamped teasers) where block elements cannot be rendered.
 */
export const markdownToPlainText = (markdown: string): string =>
    markdown
        // fenced code blocks and HTML comments/tags
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
        // images are dropped entirely, links keep their label
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        // headings, blockquotes, list markers, horizontal rules, table pipes
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s*([-*+]|\d+\.)\s+/gm, '')
        .replace(/^\s*([-*_]\s*){3,}$/gm, ' ')
        .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
        .replace(/\|/g, ' ')
        // inline emphasis and code, keeping the text
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(\*|_)(.+?)\1/g, '$2')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        // inline headings that were flattened onto one line ("... ## Heading")
        .replace(/\s#{1,6}\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
