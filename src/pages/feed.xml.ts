import type { APIContext } from 'astro';
import sanitizeHtml from 'sanitize-html';

// import { experimental_AstroContainer as AstroContainer } from "astro/container";
// import { getContainerRenderer as getMDXRenderer } from "@astrojs/mdx";
// import { loadRenderers } from "astro:container";
import { getCollection } from "astro:content";
import rss from '@astrojs/rss';

async function amap<A, B>(arr: A[], fun: (arg0: A) => B) {
  return await Promise.all(arr.map(async v => await fun(v)))
}

export async function GET(context: APIContext): Promise<Response> {
  const blog = (await getCollection('blog')).filter(post => {
    return !(post.data.draft ?? false);
  });

  // https://github.com/withastro/roadmap/discussions/419

  return rss({
    title: 'ayats.org',
    description: 'Welcome to my personal blog.',
    site: (() => {
      const s = context.site?.origin;
      if (s !== undefined) {
        return s;
      } else {
        throw new Error("Bad RSS site");
      }
    })(),
    stylesheet: '/rss/pretty-feed-v3.xsl',
    trailingSlash: false,
    items: (await amap(blog, async (post) => {
      // https://blog.damato.design/posts/astro-rss-mdx
      // No idea about this
      // const renderers = await loadRenderers([getMDXRenderer()]);
      // const container = await AstroContainer.create({ renderers });
      // const render = await post.render();
      // container.renderToString(render.Content);
      return {
        link: `/blog/${post.slug}`,
        // content: sanitizeHtml(await container.renderToString(render.Content)),
        ...post.data,
      };
    })),
  });
}
