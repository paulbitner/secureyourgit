import { Head } from 'vite-react-ssg';
import { site } from '../config/site';

interface Props {
  title: string;
  description: string;
  /** Path with leading and trailing slash, e.g. `/rules/`. */
  path: string;
  type?: 'website' | 'article';
  jsonLd?: object;
  noindex?: boolean;
}

/** JSON for a <script> data block; `<` is escaped so content can never close the tag. */
const safeJson = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');

export function Seo({ title, description, path, type = 'website', jsonLd, noindex }: Props) {
  const url = `${site.url}${path}`;
  const image = `${site.url}/og-image.png`;
  return (
    <Head>
      <html lang="en" />
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={url} />}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${site.name}: ${site.tagline}`} />
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd && <script type="application/ld+json">{safeJson(jsonLd)}</script>}
    </Head>
  );
}
