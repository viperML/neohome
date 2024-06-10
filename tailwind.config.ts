import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // spacing: {
      //   '11': '4.75rem',
      // }
    },
  },
  plugins: [],
} satisfies Config

