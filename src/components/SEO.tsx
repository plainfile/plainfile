import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title: string;
  description: string;
  path: string;
  noSuffix?: boolean;
  ogImage?: string;
  jsonLd?: object | object[];
}

const DOMAIN = 'https://plainfile.io';
const DEFAULT_OG = '/og/default.png';

export function SEO({
  title,
  description,
  path,
  noSuffix = false,
  ogImage = DEFAULT_OG,
  jsonLd,
}: SEOProps) {
  const fullTitle = noSuffix ? title : `${title} — PlainFile`;
  const canonical = `${DOMAIN}${path}`;
  const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${DOMAIN}${ogImage}`;
  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {jsonLdItems.map((item, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
