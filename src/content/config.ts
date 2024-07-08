import { defineCollection } from 'astro:content';
import { rssSchema } from '@astrojs/rss';
import { z } from 'astro/zod';

const blog = defineCollection({
  schema: rssSchema.extend({
    draft: z.boolean().optional(),
    title: z.string(),
    summary: z.string(),
    pubDate: z.date(),
  }),
});

export const collections = { blog };
