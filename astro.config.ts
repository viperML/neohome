import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import remarkLesetid from "remark-lesetid/astro";
import { rehypeTitles, rehypeCodeCopy, rehypePreClass, rehypeTreeSitter } from './src/rehype';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import { remarkAlert } from 'remark-github-blockquote-alert';
import react from "@astrojs/react";
import arraybuffer from "vite-plugin-arraybuffer";
import mdx from '@astrojs/mdx';
import { remarkMark } from 'remark-mark-highlight'

import sitemap from "@astrojs/sitemap";
import { remarkCodeMeta } from './src/remark';

// https://astro.build/config
export default defineConfig({
  // your configuration options here...
  // https://docs.astro.build/en/reference/configuration-reference/
  integrations: [
    tailwind({
      applyBaseStyles: false
    }),
    react(),
    sitemap(),
    mdx()
  ],
  devToolbar: {
    enabled: false
  },
  output: 'static',
  site: "https://ayats.org",
  markdown: {
    gfm: true,
    syntaxHighlight: false,
    remarkPlugins: [
      remarkMark,
      remarkAlert,
      remarkLesetid,
      remarkCodeMeta
    ],
    rehypePlugins: [
      rehypeHeadingIds,
      rehypeTitles,
      rehypeCodeCopy,
      rehypePreClass,
      rehypeTreeSitter,
    ],
  },
  build: {
    format: "file"
  },
  vite: {
    assetsInclude: [
      "**/*.node"
    ],
    plugins: [
      arraybuffer()
    ],
    ssr: {
      external: ["neohome-rs"]
    }
  },
  trailingSlash: "never",
});
