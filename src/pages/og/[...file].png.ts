import { getCollection } from "astro:content";
import type { APIContext } from "astro";

import { mkPng } from "../../opengraph";

export async function GET(context: APIContext): Promise<Response> {
  const file = context.params.file;
  if (file === undefined) {
    throw new Error("file was undefined");
  }

  const r = new Response(await mkPng({
    title: "Hello",
    description: "bar",
  }));

  r.headers.set("Content-Type", "image/png");

  return r;
}


export function getStaticPaths() {
  return [
    { params: { file: "foo" } }
  ]
}
