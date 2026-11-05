import { getCollection } from 'astro:content';

export type Chapter = Awaited<ReturnType<typeof getCollection<'tutorials'>>>[number];
export const chapterSlug = (c: Chapter) => c.id.split('/').pop()!;

/** 按系列分组,章节按 order 排序 */
export async function getSeries() {
  const all = (await getCollection('tutorials', (t) => !t.data.draft)).sort((a, b) => a.data.order - b.data.order);
  const map = new Map<string, Chapter[]>();
  for (const c of all) map.set(c.data.series, [...(map.get(c.data.series) ?? []), c]);
  return [...map].map(([series, chapters]) => ({
    series,
    title: chapters[0].data.seriesTitle,
    description: chapters.find((c) => c.data.seriesDescription)?.data.seriesDescription ?? chapters[0].data.description,
    cover: chapters.find((c) => c.data.cover)?.data.cover,
    tags: [...new Set(chapters.flatMap((c) => c.data.tags))],
    updated: new Date(Math.max(...chapters.map((c) => +c.data.date))),
    chapters,
  }));
}
