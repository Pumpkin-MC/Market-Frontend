import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
}

const SEO = ({
  title,
  description = "Explore powerful, performance-optimized Minecraft plugins at Pumpkin Market. The one-stop marketplace for WASM-powered MC plugins.",
  keywords = "minecraft, plugins, wasm, marketplace, mc plugins, development",
  canonical,
  ogType = "website",
  ogImage = "/icon.png",
}: SEOProps) => {
  const location = useLocation();
  const siteName = "Pumpkin Market";
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - WASM Minecraft Plugin Marketplace`;
  const url = canonical || `https://pumpkinmc.org${location.pathname}`;

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Update Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);

    // Update Canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', url);

    // Update Open Graph tags
    const updateOG = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateOG('og:title', fullTitle);
    updateOG('og:description', description);
    updateOG('og:url', url);
    updateOG('og:type', ogType);
    updateOG('og:image', ogImage);
    updateOG('og:site_name', siteName);

    // Update Twitter Card tags
    const updateTwitter = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateTwitter('twitter:card', 'summary_large_image');
    updateTwitter('twitter:title', fullTitle);
    updateTwitter('twitter:description', description);
    updateTwitter('twitter:image', ogImage);

  }, [fullTitle, description, keywords, url, ogType, ogImage]);

  return null; // This component doesn't render anything
};

export default SEO;
