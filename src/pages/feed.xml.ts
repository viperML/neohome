import type { APIContext } from "astro";

// Workaround because feed_fake.astro can't return XML
export function GET(context: APIContext) {
    return context.rewrite("/feed_fake")
}
