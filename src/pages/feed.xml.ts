import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext): Promise<Response> {
  const blog = await getCollection('blog');
  return rss({
    title: 'ayats.org',
    description: 'Welcome to my personal blog.',
    site: (() => {
      if (context.site == null) {
        throw "Site not defined in astro config";
      } else {
        return context.site;
      }
    })(),
    stylesheet: '/rss/pretty-feed-v3.xsl',
    trailingSlash: false,
    // Array of `<item>`s in output xml
    // See "Generating items" section for examples using content collections and glob imports
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      customData: post.data.customData,
      // Compute RSS link from post `slug`
      // This example assumes all posts are rendered as `/blog/[slug]` routes
      link: `/blog/${post.slug}/`,
    })),
    // (optional) inject custom xml
    customData: `<language>en-us</language>`,
  });
}
