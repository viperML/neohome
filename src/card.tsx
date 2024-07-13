import type { ReactElement } from "react";
import satori from "satori";

import font_500 from "../public/TTF/iosevka-normal-medium.ttf?arraybuffer";
import font_700 from "../public/TTF/iosevka-normal-bold.ttf?arraybuffer";
import { Resvg } from "@resvg/resvg-js";

interface Generate {
  title?: string | undefined,
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
      // "background": "linear-gradient(45deg, rgba(103,165,191,1) 0%, rgba(252,230,101,1) 100%)",
      "background": "linear-gradient(43deg, rgba(130,113,177,1) 0%, rgba(193,116,115,1) 100%)",
      "fontSize": "120px",
      "fontWeight": "700",
      "textAlign": "center" as const,
    },
    "card": {
      "backgroundColor": "rgb(239, 239, 239)",
      "width": "1000px",
      "height": "500px",
      "borderRadius": "1rem",
      "boxShadow": "0px 10px 15px -3px rgba(0,0,0,0.3)",
      "display": "flex",
      "flexDirection": "column" as const,
      "alignItems": "center",
      "justifyContent": "center",
    },
    "sub": {
      "fontSize": "80px",
      "fontWeight": "500",
      "marginTop": "30px",
      "maxWidth": "900px",
    }
  };


  const html = <div style={css.main}>
    <div style={css.card}>
      <span>ayats.org</span>
      <span style={css.sub}>{input.title}</span>
    </div>
  </div>;

  const svg = await satori(html, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: 'iosevka-normal',
        data: font_500,
        weight: 500,
      },
      {
        name: 'iosevka-normal',
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
