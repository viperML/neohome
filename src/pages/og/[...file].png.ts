import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import satori from "satori";
import React from "react";

import { Resvg } from "@resvg/resvg-js";

import font from "../../../public/TTF/iosevka-normal-regular.ttf?arraybuffer";

interface Params {
  file: string,
}

interface Generate {
  title: string,
  description?: string
}

export async function mkPng(input: Generate): Promise<Buffer> {
  const elem = React.createElement('div', {
    style: "color: black",
  },
    `hello from ${input}`
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

  return pngBuffer;
}

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
