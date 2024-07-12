import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import satori from "satori";
import React from "react";

import { Resvg } from "@resvg/resvg-js";

import font from "../../../public/TTF/iosevka-normal-regular.ttf?arraybuffer";


export async function GET(context: APIContext) {
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
        name: 'iosevka-normal',
        data: font,
      }
    ],
  });

  const resvg = new Resvg(svg)
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  const r = new Response(pngBuffer);

  r.headers.set("Content-Type", "image/png");

  return r;
}



export function getStaticPaths() {
  return [
    { params: { file: "foo.png" } }
  ]
}
