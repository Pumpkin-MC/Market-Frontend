import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

const DEFAULT_DESCRIPTION = IS_ACCOUNTS_SURFACE
  ? 'Single sign-on, passkeys, 2FA security, and server management across PumpkinMC services.'
  : IS_SERVERS_SURFACE
    ? 'Explore community Minecraft servers powered by Pumpkin, with live player counts and zero fake slots.'
    : 'Discover, download, and publish high-performance WebAssembly plugins for PumpkinMC Minecraft servers.';

const DEFAULT_KEYWORDS = IS_ACCOUNTS_SURFACE
  ? 'pumpkinmc, pumpkin account, minecraft sso, passkeys, server telemetry'
  : IS_SERVERS_SURFACE
    ? 'minecraft servers, pumpkin servers, pumpkinmc server list, rust minecraft server'
    : 'minecraft, plugins, wasm, marketplace, mc plugins, development';

const SEO = ({
  title,
  ogTitle,
  description = DEFAULT_DESCRIPTION,
  ogDescription,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogType = 'website',
  ogImage = '/icon.png',
  twitterCard,
  twitterLabels,
}: SEOProps) => {
  const location = useLocation();
  const fullTitle =
    !title || title === SITE_NAME || title.endsWith(`| ${SITE_NAME}`) || title.endsWith(`— ${SITE_NAME}`)
      ? title || SITE_NAME
      : `${title} | ${SITE_NAME}`;
  const resolvedOgTitle = ogTitle || fullTitle;
  const resolvedOgDesc = ogDescription || description;
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
    metaDescription.setAttribute('content', description);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);

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
    updateOG('og:site_name', SITE_NAME);

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
    description,
    resolvedOgDesc,
    keywords,
    url,
    ogType,
    resolvedOgImage,
    resolvedTwitterCard,
    twitterLabels,
  ]);

  return null;
};

export default SEO;
