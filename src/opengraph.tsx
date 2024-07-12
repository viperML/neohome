import type { ReactElement } from "react";
import React from "react";
import satori from "satori";

import font from "../public/TTF/iosevka-normal-regular.ttf?arraybuffer";
import { Resvg } from "@resvg/resvg-js";

interface Generate {
  title: string,
  description?: string
}

export function element(): ReactElement {
  return <div style={{ color: 'black' }}>hello, world</div>;
}


export async function mkPng(input: Generate): Promise<Buffer> {


  const svg = await satori(
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "white",
      width: "100%",
      height: "100%",
    }}>
      <span style={{
        fontSize: 100,
        color: "white",
        backgroundColor: "black",
        padding: "3rem",
        borderRadius: "1rem",
      }}>
        ayats.org
      </span>
    </div>, {
    width: 1200,
    height: 630,
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
