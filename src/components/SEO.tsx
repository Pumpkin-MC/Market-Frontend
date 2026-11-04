import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  ogTitle?: string;
  description?: string;
  ogDescription?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterLabels?: {
    label1?: string;
    data1?: string;
    label2?: string;
    data2?: string;
  };
}

const SITE_ORIGIN = 'https://market.pumpkinmc.org';

const SEO = ({
  title,
  ogTitle,
  description = "Discover, download, and publish high-performance WebAssembly plugins for PumpkinMC Minecraft servers.",
  ogDescription,
  keywords = "minecraft, plugins, wasm, marketplace, mc plugins, development",
  canonical,
  ogType = "website",
  ogImage = "/icon.png",
  twitterCard = "summary_large_image",
  twitterLabels,
}: SEOProps) => {
  const location = useLocation();
  const siteName = "Pumpkin Market";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const resolvedOgTitle = ogTitle || fullTitle;
  const resolvedOgDesc = ogDescription || description;
  const url = canonical || `${SITE_ORIGIN}${location.pathname}`;
  const resolvedOgImage =
    ogImage.startsWith('http://') || ogImage.startsWith('https://')
      ? ogImage
      : `${SITE_ORIGIN}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;

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

    updateOG('og:title', resolvedOgTitle);
    updateOG('og:description', resolvedOgDesc);
    updateOG('og:url', url);
    updateOG('og:type', ogType);
    updateOG('og:image', resolvedOgImage);
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

    updateTwitter('twitter:card', twitterCard);
    updateTwitter('twitter:title', resolvedOgTitle);
    updateTwitter('twitter:description', resolvedOgDesc);
    updateTwitter('twitter:image', resolvedOgImage);

    if (twitterLabels?.label1 && twitterLabels?.data1) {
      updateTwitter('twitter:label1', twitterLabels.label1);
      updateTwitter('twitter:data1', twitterLabels.data1);
    }
    if (twitterLabels?.label2 && twitterLabels?.data2) {
      updateTwitter('twitter:label2', twitterLabels.label2);
      updateTwitter('twitter:data2', twitterLabels.data2);
    }
  }, [
    fullTitle,
    resolvedOgTitle,
    description,
    resolvedOgDesc,
    keywords,
    url,
    ogType,
    resolvedOgImage,
    twitterCard,
    twitterLabels?.label1,
    twitterLabels?.data1,
    twitterLabels?.label2,
    twitterLabels?.data2,
  ]);

  return null;
};

export default SEO;
