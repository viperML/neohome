import { defineCollection } from 'astro:content';
import { rssSchema } from '@astrojs/rss';
import { z } from 'astro/zod';

const blog = defineCollection({
  schema: rssSchema.extend({
    draft: z.boolean().optional(),
    summary: z.string(),
  }),
});

export const collections = { blog };
