import { getCollection } from "astro:content";
import type { APIContext } from "astro";

import { mkPng } from "../../../card";



export async function GET(context: APIContext): Promise<Response> {
  const r = new Response(await mkPng({
    title: context.props.title,
    withSite: (context.props.withSite === "false") ? false : true,
  }));

  r.headers.set("Content-Type", "image/png");

  return r;
}


export async function getStaticPaths() {
  const allBlogPosts = Array.from(await getCollection("blog"));

  const og_blog = allBlogPosts.map(elem => ({
    params: {
      slug: elem.slug
    },
    props: {
      title: elem.data.title,
      withSite: "true",
    }
  }));

  const res = [
    {
      params: { slug: "_base" }
    },
    {
      params: {
        slug: "404",
      },
      props: {
        title: "404",
        withSite: "false"
      }
    }
  ].concat(og_blog);

  return res;
}
