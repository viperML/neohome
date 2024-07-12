import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import remarkLesetid from "remark-lesetid/astro";
import mdx from '@astrojs/mdx';
import { rehypeTitles, rehypeCodeCopy } from './src/rehype';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import { remarkAlert } from 'remark-github-blockquote-alert';
import react from "@astrojs/react";
import arraybuffer from "vite-plugin-arraybuffer";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // your configuration options here...
  // https://docs.astro.build/en/reference/configuration-reference/
  integrations: [tailwind({
    applyBaseStyles: false
  }), mdx(), react(), sitemap()],
  devToolbar: {
    enabled: false
  },
  output: 'static',
  // site: "https://ayats.org",
  site: "https://preview.neohome.pages.dev",
  markdown: {
    remarkPlugins: [remarkAlert, remarkLesetid],
    rehypePlugins: [rehypeHeadingIds, rehypeTitles, rehypeCodeCopy],
    shikiConfig: {
      // theme: 'ayu-dark'
      themes: {
        light: 'github-light',
        dark: "vesper"
      }
    }
  },
  build: {
    format: "file"
  },
  vite: {
    plugins: [arraybuffer()]
  }
});