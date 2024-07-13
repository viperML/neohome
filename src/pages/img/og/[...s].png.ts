import { getCollection, getEntry } from "astro:content";
import type { APIContext } from "astro";

import { mkPng } from "../../../card";



export async function GET(context: APIContext): Promise<Response> {
  const s: string | undefined = context.params.s;
  if (s === undefined) {
    throw new Error("file was undefined");
  }

  const post = await getEntry('blog', s);

  const r = new Response(await mkPng({
    title: post?.data.title,
  }));

  r.headers.set("Content-Type", "image/png");

  return r;
}


export async function getStaticPaths() {
  const allBlogPosts = Array.from(await getCollection("blog"));

  const og_blog = allBlogPosts.map(elem => ({
    params: { s: elem.slug }
  }));

  return [
    {
      params: { s: "_base" }
    }
  ].concat(og_blog);
}
