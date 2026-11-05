import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    category: z.string().default('技术笔记'),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    repo: z.string().url().optional(), // 私有项目不要填
    cover: z.string().optional(), // 封面截图,放在 public/ 下,如 /projects/xxx/cover.png
    order: z.number().default(99),
    private: z.boolean().default(false),
  }),
});

// 教程:按系列分组,每章一个文件,放在 src/content/tutorials/<系列>/<章节>.md
const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tutorials' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    series: z.string(), // 系列标识,与文件夹名一致,如 agent-intro
    seriesTitle: z.string(), // 系列显示名
    seriesDescription: z.string().optional(), // 系列简介,写在第 1 章即可
    order: z.number(), // 章节序号
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, projects, tutorials };
