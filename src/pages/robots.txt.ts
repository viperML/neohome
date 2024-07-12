export async function GET(): Promise<Response> {

    const resp = new Response((`User-agent: *
Allow: /

Sitemap: ${import.meta.env.SITE}/sitemap-index.xml`).trim());

    resp.headers.set("Content-Type", "text/plain; charset=utf-8");

    return resp;
}
