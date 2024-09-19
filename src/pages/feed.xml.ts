import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const endpoint = new URL('/feed', context.url.origin);
  const xml = await fetch(endpoint).then((res) => res.text());
  return new Response(xml, {
    status: 200,
    headers: new Headers({ 'Content-type': 'text/xml;charset=UTF-8' })
  });
}
