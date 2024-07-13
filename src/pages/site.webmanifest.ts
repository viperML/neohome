import type { WebAppManifest } from "web-app-manifest";

export async function GET(): Promise<Response> {
    const manifest: WebAppManifest = {
        name: "",
        short_name: "",
        icons: [],
        theme_color: "",
        background_color: "",
        display: "standalone",
    };

    const resp = new Response(JSON.stringify(manifest));

    resp.headers.set("Content-Type", "application/manifest+json");

    return resp;
}
