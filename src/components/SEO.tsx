import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ACCOUNTS_ORIGIN,
  IS_ACCOUNTS_SURFACE,
  IS_SERVERS_SURFACE,
  MARKET_ORIGIN,
  SERVERS_ORIGIN,
} from '../lib/domains';

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

const SITE_ORIGIN = IS_ACCOUNTS_SURFACE
  ? ACCOUNTS_ORIGIN
  : IS_SERVERS_SURFACE
    ? SERVERS_ORIGIN
    : MARKET_ORIGIN;

const SITE_NAME = IS_ACCOUNTS_SURFACE
  ? 'Pumpkin Account'
  : IS_SERVERS_SURFACE
    ? 'Pumpkin Servers'
    : 'Pumpkin Market';

const SEO = ({
  title,
  ogTitle,
  description,
  ogDescription,
  keywords,
  canonical,
  ogType = 'website',
  ogImage = '/icon.png',
  twitterCard,
  twitterLabels,
}: SEOProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const siteName = IS_ACCOUNTS_SURFACE
    ? t('seo.accounts.site_name')
    : IS_SERVERS_SURFACE
      ? t('seo.servers.site_name')
      : t('seo.site_name');
  const resolvedDescription = description ?? (
    IS_ACCOUNTS_SURFACE
      ? t('seo.accounts.default_description')
      : IS_SERVERS_SURFACE
        ? t('seo.servers.default_description')
        : t('seo.default_description')
  );
  const resolvedKeywords = keywords ?? (
    IS_ACCOUNTS_SURFACE
      ? t('seo.accounts.keywords')
      : IS_SERVERS_SURFACE
        ? t('seo.servers.keywords')
        : t('seo.keywords')
  );
  const fullTitle =
    !title || title === SITE_NAME || title === siteName || title.endsWith(`| ${SITE_NAME}`) || title.endsWith(`| ${siteName}`) || title.endsWith(`— ${SITE_NAME}`) || title.endsWith(`— ${siteName}`)
      ? title || siteName
      : t('seo.title_suffix', { title, site: siteName });
  const resolvedOgTitle = ogTitle || fullTitle;
  const resolvedOgDesc = ogDescription || resolvedDescription;
  const resolvedTwitterCard =
    twitterCard ?? (ogImage === '/icon.png' ? 'summary' : 'summary_large_image');
  const url = canonical || `${SITE_ORIGIN}${location.pathname}`;
  const resolvedOgImage =
    ogImage.startsWith('http://') || ogImage.startsWith('https://')
      ? ogImage
      : `${SITE_ORIGIN}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;

  useEffect(() => {
    document.title = fullTitle;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', resolvedDescription);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', resolvedKeywords);

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', url);

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

    const updateTwitter = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateTwitter('twitter:card', resolvedTwitterCard);
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
    resolvedDescription,
    resolvedOgDesc,
    resolvedKeywords,
    url,
    ogType,
    resolvedOgImage,
    resolvedTwitterCard,
    twitterLabels,
    siteName,
  ]);

  return null;
};

export default SEO;
