import { defineConfig } from 'astro/config'
import tailwind from "@astrojs/tailwind";
import remarkLesetid from "remark-lesetid/astro";
import mdx from '@astrojs/mdx';
import { remarkCode } from './src/remark';

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
        enabled: true
    },
    output: 'static',
    site: "https://ayats.org",
    markdown: {
        remarkPlugins: [
            remarkLesetid,
            remarkCode
        ],
        shikiConfig: {
            // theme: 'ayu-dark'
            themes: {
                light: 'github-light',
                dark: "vesper",
            }
        }
    },
})
