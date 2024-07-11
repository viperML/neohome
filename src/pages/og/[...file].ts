import { getCollection } from "astro:content";
// This is the function that returns the SVG code
// import generateArticleOG from "@utils/generateArticleOG";
import type { APIRoute } from "astro";

export async function GET(context: APIContext) {
    return new Response(
        // Simply return the SVG code as the body
        "" + context,
        {
            status: 200,
            // headers: { "Content-Type": "image/svg" },
        },
    );
}

export function getStaticPaths() {
  return [
    {params: {file: "val.png"}}
  ]
}
