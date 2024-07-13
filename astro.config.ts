import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import remarkLesetid from "remark-lesetid/astro";
import { rehypeTitles, rehypeCodeCopy, rehypePreClass } from './src/rehype';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import { remarkAlert } from 'remark-github-blockquote-alert';
import react from "@astrojs/react";
import arraybuffer from "vite-plugin-arraybuffer";

import sitemap from "@astrojs/sitemap";
import { remarkCodeMeta } from './src/remark';

// https://astro.build/config
export default defineConfig({
  // your configuration options here...
  // https://docs.astro.build/en/reference/configuration-reference/
  integrations: [tailwind({
    applyBaseStyles: false
  }), react(), sitemap()],
  devToolbar: {
    enabled: false
  },
  output: 'static',
  // site: "https://ayats.org",
  site: "https://preview.neohome.pages.dev",
  markdown: {
    syntaxHighlight: false,
    remarkPlugins: [remarkAlert, remarkLesetid, remarkCodeMeta],
    rehypePlugins: [rehypeHeadingIds, rehypeTitles, rehypeCodeCopy, rehypePreClass],
  },
  build: {
    format: "file"
  },
  vite: {
    plugins: [arraybuffer()]
  }
});
