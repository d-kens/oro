/* robots.txt: let every crawler in and point it at the sitemap */
import { SITE } from '../lib/site.js';

export function GET() {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
}
