import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET(context) {
  const posts = (await getCollection('posts', (p) => !p.data.draft)).sort((a, b) => +b.data.date - +a.data.date);
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((p) => ({ title: p.data.title, description: p.data.description, pubDate: p.data.date, link: `/blog/${p.id}/` })),
  });
}
