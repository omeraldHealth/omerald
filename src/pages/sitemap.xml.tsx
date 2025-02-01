import { GetServerSideProps } from 'next';
import fs from 'fs';
import path from 'path';

const Sitemap = () => {};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const env = process.env.NODE_ENV || 'development';
  const baseUrl = (env === 'production' ? 'https://omerald.com' : 'https://omerald-dev.vercel.app/');

  const pagesDirectory = path.join(process.cwd(), 'src/pages');
  const staticPages = fs
    .readdirSync(pagesDirectory)
    .filter((staticPage) => {
      return ![
        '_app.tsx',
        '_document.tsx',
        '_error.tsx',
        'sitemap.xml.tsx',
        '404.tsx',
        'api',
        'info',
      ].includes(staticPage);
    })
    .map((staticPagePath) => {
      return `${baseUrl}${staticPagePath.replace('.tsx', '').replace('.ts', '')}`;
    });

  // Add info pages
  const infoDirectory = path.join(pagesDirectory, 'info');
  if (fs.existsSync(infoDirectory)) {
    const infoPages = fs
      .readdirSync(infoDirectory)
      .filter((page) => page.endsWith('.tsx') || page.endsWith('.ts'))
      .map((page) => {
        return `${baseUrl}info/${page.replace('.tsx', '').replace('.ts', '')}`;
      });
    staticPages.push(...infoPages);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticPages
        .map((url) => {
          return `
            <url>
              <loc>${url}</loc>
              <lastmod>${new Date().toISOString()}</lastmod>
              <changefreq>monthly</changefreq>
              <priority>1.0</priority>
            </url>
          `;
        })
        .join('')}
    </urlset>
  `;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default Sitemap;

