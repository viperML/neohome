import { defineConfig } from 'astro/config'
import tailwind from "@astrojs/tailwind";

export default defineConfig({
    // your configuration options here...
    // https://docs.astro.build/en/reference/configuration-reference/
    integrations: [
        tailwind()
    ],
    devToolbar: {
        enabled: true
    },
    output: 'static',
    site: "https://ayats.org",
})
