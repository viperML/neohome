import { getCollection } from "astro:content";

function mkUrl(url: string): string {
    return `<url><loc>${url}</loc></url>`
}

export async function GET(): Promise<Response> {
    const site = import.meta.env.SITE;
    const posts = await getCollection("blog");



    const text = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${mkUrl(site)}
    ${mkUrl(`${site}/blog`)}
    ${posts.filter(p => !(p.data.draft ?? false)).map(p =>
        mkUrl(`${site}/blog/${p.slug}`)
    ).join("\n")}
</urlset>
`.trim();

    const resp = new Response(text);

    resp.headers.set("Content-Type", "application/xml");

    return resp;
}
