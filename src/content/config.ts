import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const blog = defineCollection({
  type: "content",
  schema: z.object({
    draft: z.boolean().optional(),
    title: z.string(),
    summary: z.string(),
    pubDate: z.date(),
  })
})

export const collections = { blog };
