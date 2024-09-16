import type { ReactElement } from "react";
import satori from "satori";

import { Resvg } from "@resvg/resvg-js";

import font_500 from "@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff?arraybuffer";
import font_700 from "@fontsource/geist-sans/files/geist-sans-latin-700-normal.woff?arraybuffer";

interface Generate {
  title?: string | undefined,
  withSite?: boolean | undefined
}

export const WIDTH = 1200;
export const HEIGHT = 630;

export async function mkPng(input: Generate): Promise<Buffer> {
  // https://staxmanade.com/CssToReact/
  const css = {
    "main": {
      "width": `${WIDTH}px`,
      "height": `${HEIGHT}px`,
      "display": "flex",
      "alignItems": "center",
      "justifyContent": "center",
      // "background": "black",
      // "background": "linear-gradient(45deg, rgba(103,165,191,1) 0%, rgba(252,230,101,1) 100%)",
      "background": "linear-gradient(30deg, rgba(0,0,0,1) 0%, rgba(30,30,30,1) 100%)",
      "fontSize": "80px",
      "fontWeight": "500",
      "textAlign": "center" as const,
      "color": "white",
    },
    "card": {
      "backgroundColor": "black",
      "width": `${WIDTH - 50}px`,
      "height": `${HEIGHT - 50}px`,
      "borderRadius": "2rem",
      "boxShadow": "0px 10px 15px -3px rgba(0,0,0,0.3)",
      "display": "flex",
      "flexDirection": "column" as const,
      "gap": "30px",
      "alignItems": "center",
      "justifyContent": "center",
      "border": "10px solid rgb(62, 62, 62)",
    },
    "sub": {
      // "color": "white",
      "fontSize": "90px",
      "fontWeight": "700",
      // "marginTop": "30px",
      "maxWidth": `${WIDTH - 150}`,
    }
  };

  const withSite = input.withSite ?? true;

  const html = <div style={css.main}>
    <div style={css.card}>
      <span style={css.sub}>{input.title}</span>
      {
        (() => withSite ? <span>ayats.org</span> : null)()
      }
    </div>
  </div>;

  const svg = await satori(html, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: 'Geist Sans',
        data: font_500,
        weight: 500,
      },
      {
        name: 'Geist Sans',
        data: font_700,
        weight: 700,
      }
    ],
  });

  const resvg = new Resvg(svg, {
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 0,
  })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  return pngBuffer;
}
