// 按标题生成稳定的靛紫→天青渐变封面
export function coverStyle(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = 250 + (h % 40); // 靛紫
  const b = 185 + ((h >> 3) % 35); // 青
  const angle = 110 + ((h >> 5) % 100);
  return `background: linear-gradient(${angle}deg, hsl(${a} 80% 62%), hsl(${b} 80% 55%));`;
}
export const fmtDate = (d: Date) =>
  d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
export function readInfo(body = '') {
  const chars = body.replace(/\s/g, '').length;
  return { chars, min: Math.max(1, Math.ceil(chars / 450)) };
}
