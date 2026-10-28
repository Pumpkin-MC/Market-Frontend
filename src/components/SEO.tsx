import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
  description,
  keywords,
  canonical,
  ogType = "website",
  ogImage = "/icon.png",
}: SEOProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const siteName = t('seo.site_name');
  const resolvedDescription = description ?? t('seo.default_description');
  const resolvedKeywords = keywords ?? t('seo.keywords');
  const fullTitle = title ? t('seo.title_suffix', { title, site: siteName }) : t('seo.home_title');
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
    metaDescription.setAttribute('content', resolvedDescription);

    // Update Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', resolvedKeywords);

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
    updateOG('og:description', resolvedDescription);
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
    updateTwitter('twitter:description', resolvedDescription);
    updateTwitter('twitter:image', ogImage);

  }, [fullTitle, resolvedDescription, resolvedKeywords, url, ogType, ogImage]);

  return null; // This component doesn't render anything
};

export default SEO;
