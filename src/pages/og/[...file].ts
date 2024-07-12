import { getCollection } from "astro:content";
// This is the function that returns the SVG code
// import generateArticleOG from "@utils/generateArticleOG";
import type { APIRoute } from "astro";
import type { APIContext } from "astro";
import satori from "satori";
import React from "react";

import Font from "@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff2";
import { Resvg } from "@resvg/resvg-js";

export async function GET(context: APIContext) {
  console.log(context);
  const Roboto = await fetch('https://fonts.cdnfonts.com/s/19795/Inter-Regular.woff').then(res => res.arrayBuffer())

  const elem = React.createElement('div', {
    style: "color: black",
  },
    "Hello World!"
  )


  const svg = await satori(elem, {
    width: 600,
    height: 400,
    fonts: [
      {
        name: 'Roboto',
        data: Roboto,
      }
    ],
  });

  const resvg = new Resvg(svg)
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  //     const svg = await satori(
  //   <div style={{ color: 'black' }}>hello, world</div>,
  //   {
  //   },
  // )

  const r = new Response(pngBuffer);

  r.headers.set("Content-Type", "image/png");

  return r;
}



export function getStaticPaths() {
  return [
    { params: { file: "foo.png" } }
  ]
}
