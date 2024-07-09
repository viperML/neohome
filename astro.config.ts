import { defineConfig } from 'astro/config'
import tailwind from "@astrojs/tailwind";
import remarkLesetid from "remark-lesetid/astro";
import mdx from '@astrojs/mdx';
import { rehypeTitles, rehypeCodeCopy } from './src/rehype';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import { remarkAlert } from 'remark-github-blockquote-alert'

export default defineConfig({
    // your configuration options here...
    // https://docs.astro.build/en/reference/configuration-reference/
    integrations: [
        tailwind({
            applyBaseStyles: false,
        }),
        mdx()
    ],
    devToolbar: {
        enabled: false,
    },
    output: 'static',
    site: "https://ayats.org",
    markdown: {
        remarkPlugins: [
            remarkAlert,
            remarkLesetid,
        ],
        rehypePlugins: [
            rehypeHeadingIds,
            rehypeTitles,
            rehypeCodeCopy,
        ],
        shikiConfig: {
            // theme: 'ayu-dark'
            themes: {
                light: 'github-light',
                dark: "vesper",
            }
        }
    },
    build: {
        format: "file",
    }
})
