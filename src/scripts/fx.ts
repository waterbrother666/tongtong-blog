// 全站动效。用事件委托和 astro:page-load,页面转场后依然有效。
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ───────── 3D 倾斜 + 鼠标光晕 ─────────
document.addEventListener('pointermove', (e) => {
  const el = (e.target as HTMLElement).closest?.('.tilt') as HTMLElement | null;
  if (!el || e.pointerType === 'touch') return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--mx', x * 100 + '%');
  el.style.setProperty('--my', y * 100 + '%');
  el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 7}deg) translateY(-3px)`;
});
document.addEventListener('pointerout', (e) => {
  const el = (e.target as HTMLElement).closest?.('.tilt') as HTMLElement | null;
  if (el && !el.contains(e.relatedTarget as Node)) el.style.transform = '';
});

// ───────── 滚动渐显 ─────────
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('in'));
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach((e) => io.observe(e));
}

// ───────── 目录高亮 + 滑动标记 ─────────
let tocUpdate: (() => void) | null = null;
function initToc() {
  tocUpdate = null;
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc-link')];
  if (!links.length) return;
  const list = links[0].closest('ul') as HTMLElement;
  list.style.position = 'relative';
  let marker = list.querySelector<HTMLElement>('.toc-marker');
  if (!marker) { marker = document.createElement('span'); marker.className = 'toc-marker'; list.append(marker); }
  const pairs = links.map((l) => [l, document.getElementById(l.dataset.slug!)] as const).filter(([, h]) => h);
  let current: HTMLAnchorElement | null = null;
  // 当前章节 = 最后一个已经滚过导航栏下沿的小标题
  tocUpdate = () => {
    let l = pairs[0]?.[0] ?? null;
    for (const [link, h] of pairs) if (h!.getBoundingClientRect().top < 140) l = link;
    if (!l || l === current) return;
    current = l;
    links.forEach((x) => x.classList.toggle('active', x === l));
    marker!.style.opacity = '1';
    marker!.style.transform = `translateY(${l.offsetTop}px)`;
    marker!.style.height = `${l.offsetHeight}px`;
  };
}

// ───────── 背景光斑随鼠标缓慢偏移 ─────────
if (!calm) {
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const tick = () => {
    cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
    const b = document.querySelector<HTMLElement>('.blobs');
    b?.style.setProperty('--px', cx.toFixed(4));
    b?.style.setProperty('--py', cy.toFixed(4));
    const hw = document.querySelector<HTMLElement>('.hero-wall');
    hw?.style.setProperty('--px', cx.toFixed(4));
    hw?.style.setProperty('--py', cy.toFixed(4));
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5;
    if (!raf) raf = requestAnimationFrame(tick);
  });
}

// ───────── 滚动联动:导航栏收窄、阅读进度、回到顶部、时间线 ─────────
function onScroll() {
  const y = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.site-header')?.classList.toggle('scrolled', y > 24);
  const hw = document.querySelector<HTMLElement>('.hero-wall');
  if (hw) {
    hw.style.setProperty('--hs', (calm ? 0 : clamp(y / (hw.offsetHeight * 0.75))).toFixed(3));
    hw.style.setProperty('--hy', calm ? '0px' : `${(y * 0.22).toFixed(1)}px`);
  }

  const bar = document.getElementById('read-progress');
  const art = document.querySelector<HTMLElement>('article');
  if (bar) {
    if (art?.querySelector('.prose')) {
      const r = art.getBoundingClientRect();
      const p = clamp((120 - r.top) / Math.max(1, r.height - innerHeight + 120));
      bar.style.opacity = '1';
      bar.style.transform = `scaleX(${p})`;
    } else bar.style.opacity = '0';
  }

  const top = document.getElementById('to-top');
  if (top) {
    top.classList.toggle('show', y > 480);
    top.style.setProperty('--p', String(max > 0 ? clamp(y / max) : 0));
  }

  tocUpdate?.();
  ambUpdate?.();
  storyUpdate?.();
  flowUpdate();

  document.querySelectorAll<HTMLElement>('.timeline').forEach((el) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--draw', String(calm ? 1 : clamp((innerHeight * 0.82 - r.top) / Math.max(1, r.height))));
  });
}
let scrollRaf = 0;
const queueScroll = () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; onScroll(); }); };
addEventListener('scroll', queueScroll, { passive: true });
addEventListener('resize', queueScroll);

// ───────── 数字滚动(只在首页播放) ─────────
function initCount() {
  if (calm || location.pathname !== '/') return;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const n = Number(el.dataset.count);
    if (!n) return;
    const t0 = performance.now() + 250;
    el.textContent = '0';
    const step = (t: number) => {
      const k = clamp((t - t0) / 900);
      el.textContent = String(Math.round(n * (1 - Math.pow(1 - k, 3))));
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// ───────── 小标题锚点 ─────────
function initAnchors() {
  document.querySelectorAll<HTMLElement>('.prose :is(h2, h3)[id]').forEach((h) => {
    if (h.querySelector('.h-anchor')) return;
    const a = document.createElement('a');
    a.className = 'h-anchor';
    a.href = '#' + h.id;
    a.textContent = '#';
    a.setAttribute('aria-label', '复制本节链接');
    h.append(a);
  });
}
function toast(text: string) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), 1400);
  setTimeout(() => t.remove(), 1800);
}

// ───────── 图片点击放大 ─────────
let zoom: { img: HTMLImageElement; clone: HTMLImageElement; shade: HTMLElement } | null = null;
function openZoom(img: HTMLImageElement) {
  const r = img.getBoundingClientRect();
  const shade = document.createElement('div');
  shade.className = 'zoom-shade';
  const clone = img.cloneNode() as HTMLImageElement;
  clone.removeAttribute('loading');
  clone.className = 'zoom-img';
  Object.assign(clone.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.append(shade, clone);
  img.style.visibility = 'hidden';
  zoom = { img, clone, shade };
  const pad = innerWidth < 640 ? 12 : 40;
  const s = Math.min((innerWidth - pad * 2) / r.width, (innerHeight - pad * 2) / r.height, 4);
  const dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
  requestAnimationFrame(() => {
    shade.classList.add('on');
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
  });
}
function closeZoom() {
  if (!zoom) return;
  const { img, clone, shade } = zoom;
  zoom = null;
  // 页面可能滚动过,收回到图片现在的位置
  const r = img.getBoundingClientRect();
  Object.assign(clone.style, { left: r.left + 'px', top: r.top + 'px', transform: '' });
  shade.classList.remove('on');
  const done = () => { img.style.visibility = ''; clone.remove(); shade.remove(); };
  clone.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 500);
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeZoom(); });
addEventListener('wheel', () => closeZoom(), { passive: true });
addEventListener('touchmove', () => closeZoom(), { passive: true });

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (zoom) { e.preventDefault(); closeZoom(); return; }
  const img = t.closest?.('.prose img, .story-frame img') as HTMLImageElement | null;
  if (img && !img.closest('a')) { openZoom(img); return; }
  const flow = t.closest?.('.flow-svg') as SVGSVGElement | null;
  if (flow) { pickStep(flow, t.closest('[data-step]')); return; }
  const anchor = t.closest?.('.h-anchor') as HTMLAnchorElement | null;
  if (anchor) { navigator.clipboard?.writeText(anchor.href).then(() => toast('本节链接已复制'), () => {}); return; }
  if (t.closest?.('#to-top')) scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
});

// ───────── 归档热力图提示 ─────────
document.addEventListener('pointerover', (e) => {
  const cell = (e.target as HTMLElement).closest?.('.hm-cell[data-tip]') as HTMLElement | null;
  let tip = document.querySelector<HTMLElement>('.hm-tip');
  if (!cell) { tip?.classList.remove('on'); return; }
  if (!tip) { tip = document.createElement('div'); tip.className = 'hm-tip'; document.body.append(tip); }
  tip.replaceChildren();
  const d = document.createElement('b'); d.textContent = cell.dataset.date ?? '';
  tip.append(d);
  for (const line of (cell.dataset.tip ?? '').split('\n')) { const s = document.createElement('span'); s.textContent = line; tip.append(s); }
  const r = cell.getBoundingClientRect();
  tip.classList.add('on');
  const w = tip.offsetWidth;
  tip.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px';
  tip.style.top = r.top + scrollY - tip.offsetHeight - 8 + 'px';
});

// ───────── 章节氛围色:文章滚到不同章节,背景光斑换一种颜色 ─────────
let ambUpdate: (() => void) | null = null;
function initAmbient() {
  ambUpdate = null;
  const blobs = document.querySelector<HTMLElement>('.blobs');
  if (!blobs) return;
  const prose = document.querySelector<HTMLElement>('article .prose');
  if (!prose || calm) { blobs.style.removeProperty('--amb-a'); blobs.style.removeProperty('--amb-b'); return; }
  // 每篇文章按地址算出自己的主色,章节在主色上依次偏移
  let h = 0;
  for (const c of location.pathname) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const base = h % 360;
  const heads = [...prose.querySelectorAll<HTMLElement>('h2')];
  let cur = -2;
  ambUpdate = () => {
    let i = -1;
    heads.forEach((el, k) => { if (el.getBoundingClientRect().top < innerHeight * 0.5) i = k; });
    if (i === cur) return;
    cur = i;
    const hue = (base + (i + 1) * 47) % 360;
    blobs.style.setProperty('--amb-a', `hsl(${hue} 82% 62%)`);
    blobs.style.setProperty('--amb-b', `hsl(${(hue + 62) % 360} 82% 58%)`);
  };
}

// ───────── 项目详情滚动叙事:左边舞台固定,文字滚到哪张图,舞台就换哪张 ─────────
let storyUpdate: (() => void) | null = null;
function initStory() {
  storyUpdate = null;
  const root = document.querySelector<HTMLElement>('[data-story]');
  if (!root) return;
  const frames = root.querySelector<HTMLElement>('.story-frames')!;
  if (!root.dataset.built) {
    const imgs = [...root.querySelectorAll<HTMLImageElement>('article .prose img')];
    if (imgs.length < 2) return;
    root.dataset.built = '1';
    imgs.forEach((img, i) => {
      const fig = document.createElement('figure');
      fig.className = 'story-frame';
      const clone = img.cloneNode() as HTMLImageElement;
      clone.removeAttribute('loading');
      const cap = document.createElement('figcaption');
      cap.textContent = img.alt;
      fig.append(clone, cap);
      frames.append(fig);
      const mark = document.createElement('div');
      mark.className = 'story-mark';
      const b = document.createElement('b'); b.textContent = `图 ${i + 1}`;
      const t = document.createElement('span'); t.textContent = img.alt;
      mark.append(b, t);
      const src = (img.closest('p') ?? img) as HTMLElement;
      src.classList.add('story-src');
      src.before(mark);
    });
    root.classList.add('story-ready');
  }
  const figs = [...frames.children] as HTMLElement[];
  const marks = [...root.querySelectorAll<HTMLElement>('.story-mark')];
  const num = root.querySelector<HTMLElement>('.story-num')!;
  const bar = root.querySelector<HTMLElement>('.story-bar')!;
  let cur = -1;
  storyUpdate = () => {
    let idx = 0;
    marks.forEach((m, i) => { if (m.getBoundingClientRect().top < innerHeight * 0.55) idx = i; });
    if (idx === cur) return;
    cur = idx;
    figs.forEach((f, i) => { f.classList.toggle('on', i === idx); f.classList.toggle('past', i < idx); });
    marks.forEach((m, i) => m.classList.toggle('on', i === idx));
    num.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(figs.length).padStart(2, '0')}`;
    bar.style.setProperty('--sp', String((idx + 1) / figs.length));
  };
}

// ───────── 流程图逐步点亮:把带 data-step 的 SVG 内联进来,随滚动一步步亮起 ─────────
async function initFlow() {
  if (calm) return;
  const imgs = document.querySelectorAll<HTMLImageElement>('article .prose img[src$=".svg"], .story-frame img[src$=".svg"]');
  for (const img of imgs) {
    try {
      const text = await (await fetch(img.src)).text();
      if (!text.includes('data-step') || !img.isConnected) continue;
      const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement as unknown as SVGSVGElement;
      if (svg.nodeName !== 'svg') continue;
      svg.classList.add('flow-svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', img.alt);
      svg.querySelectorAll('[data-arrow]').forEach((a) => a.setAttribute('pathLength', '100'));
      const cap = document.createElement('p');
      cap.className = 'flow-cap';
      cap.textContent = '往下滚动,流程会一步步亮起;点任意一步可以单独看。';
      const inStage = img.closest('.story-frame');
      if (inStage) inStage.querySelector('figcaption')?.replaceWith(cap);
      img.replaceWith(svg);
      if (!inStage) svg.after(cap);
    } catch { /* 取不到就保留原图 */ }
  }
  flowUpdate();
}
function flowUpdate() {
  document.querySelectorAll<SVGSVGElement>('.flow-svg').forEach((svg) => {
    const steps = svg.querySelectorAll('[data-step]');
    let p: number;
    const frame = svg.closest('.story-frame');
    if (frame) {
      // 舞台里的流程图:按读者在这一段文字里滚了多远来点亮
      const marks = [...document.querySelectorAll<HTMLElement>('.story-mark')];
      const i = [...frame.parentElement!.children].indexOf(frame);
      const top = marks[i]?.getBoundingClientRect().top ?? 0;
      const next = marks[i + 1]?.getBoundingClientRect().top ?? top + innerHeight;
      p = clamp(((innerHeight * 0.55 - top) / Math.max(1, next - top)) * 1.5);
    } else {
      const r = svg.getBoundingClientRect();
      p = clamp((innerHeight * 0.92 - r.top) / (innerHeight * 0.7));
    }
    if (document.documentElement.scrollHeight - innerHeight - scrollY < 4) p = 1;
    const n = Math.round(p * steps.length);
    steps.forEach((s) => s.classList.toggle('lit', Number((s as HTMLElement).dataset.step) <= n));
    svg.querySelectorAll<HTMLElement>('[data-arrow]').forEach((a) => a.classList.toggle('lit', Number(a.dataset.arrow) + 1 <= n));
  });
}
function pickStep(svg: SVGSVGElement, step: Element | null) {
  const cap = (svg.closest('.story-frame')?.querySelector('.flow-cap') ?? svg.nextElementSibling) as HTMLElement | null;
  const same = step?.classList.contains('pick');
  svg.querySelectorAll('.pick').forEach((s) => s.classList.remove('pick'));
  if (!step || same || !step.classList.contains('lit')) {
    svg.classList.remove('focus');
    if (cap?.classList.contains('flow-cap')) cap.textContent = '往下滚动,流程会一步步亮起;点任意一步可以单独看。';
    return;
  }
  step.classList.add('pick');
  svg.classList.add('focus');
  if (!cap?.classList.contains('flow-cap')) return;
  const texts = [...step.querySelectorAll('text')];
  const title = texts[0]?.textContent ?? '';
  const chip = texts.find((t) => t.getAttribute('text-anchor') === 'middle');
  const body = texts.slice(1).filter((t) => t !== chip).map((t) => t.textContent).join('');
  cap.replaceChildren();
  const b = document.createElement('b'); b.textContent = title;
  cap.append(b, `:${body}${chip ? `(${chip.textContent})` : ''}`);
}

// ───────── 首页顶部壁纸:和开场同一套粒子——小方块拼成流动的光带,鼠标像风一样吹散 ─────────
const PALETTES: Record<string, string[]> = {
  night: ['#8ea2ff', '#5fd4e8', '#a994ff'],
  day: ['#a994ff', '#6beaff', '#8ea2ff'],
  dawn: ['#ff9db5', '#ffc46b', '#a994ff'],
  dusk: ['#c9a0ff', '#ff9d66', '#ff7ac8'],
};
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// 光带:6 条带子沿 S 形曲线从左下爬向右上,宽度忽粗忽细
function ribbon(k: number, u: number, t: number) {
  const c = 0.2 + 0.56 * u + 0.085 * Math.sin(u * 6 + t * 0.32 + k * 1.7) + 0.04 * Math.sin(u * 13 - t * 0.47 + k * 2.3) + (k - 2.5) * 0.034;
  const s = 0.5 + 0.5 * Math.sin(u * 7 + k * 2 - t * 0.38);
  return { c, hw: 0.009 + 0.032 * s * s };
}

type HP = { rs: number; dr: number; kind: number; k: number; u: number; v: number; s: number; ph: number; sp: number; x: number; y: number; vx: number; vy: number; t: number; al: number; edge: number; hx: number; hy: number };
let heroStop: (() => void) | null = null;
function initHero() {
  heroStop?.(); heroStop = null;
  const wall = document.querySelector<HTMLElement>('.hero-wall');
  if (!wall) return;
  const cv = wall.querySelector<HTMLCanvasElement>('.hero-fx')!;
  const ctx = cv.getContext('2d')!;
  const dark = () => document.documentElement.classList.contains('dark');
  let W = 0, H = 0, dpr = 1, raf = 0, visible = true;

  // 颜色:每个时段一组,16 档渐变 + 16 档点缀色,预先算好
  let ramp: string[] = [];
  const buildRamp = () => {
    const pal = (PALETTES[document.documentElement.dataset.time || 'night'] || PALETTES.night).map(hexRgb);
    const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
    ramp = [];
    for (let i = 0; i < 16; i++) ramp.push(mix(pal[0], pal[1], i / 15));
    for (let i = 0; i < 16; i++) ramp.push(mix(pal[2], pal[1], i / 15));
  };

  let parts: HP[] = [];
  const build = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = wall.clientWidth; H = wall.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const n = W < 640 ? 3200 : 9000;
    const old = parts;
    parts = Array.from({ length: n }, (_, i) => {
      const k = i % 6;
      // 偏向右侧;左边留给标题
      const u = 0.1 + 0.9 * Math.pow(Math.random(), 0.8);
      // 三种粒子:最亮最细的光芯、两条亮边、带子里面淡淡的填充——这样才看得出一束一束的光
      const r = Math.random();
      const kind = r < 0.4 ? 0 : r < 0.72 ? 1 : 2;
      const v = kind === 0 ? (Math.random() * 2 - 1) * 0.14 : kind === 1 ? (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.16) : (Math.random() * 2 - 1) * 0.85;
      const prev = old[i];
      return {
        rs: 0.6 + Math.random() * 0.9, dr: 0.992 + Math.random() * 0.0055,
        kind, k, u, v, s: (W < 640 ? 1.2 : 1.35) + Math.random() * (kind === 2 ? 0.9 : 1.2), ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4,
        x: prev ? prev.x : Math.random() * W, y: prev ? prev.y : Math.random() * H, vx: 0, vy: 0, t: 0, al: 0, edge: kind === 1 ? 1 : 0, hx: 0, hy: 0,
      };
    });
  };
  const home = (p: HP, t: number) => {
    const r = ribbon(p.k, p.u, t);
    p.hx = p.u * W; p.hy = (1 - (r.c + p.v * r.hw)) * H;
    // 亮边更亮;左边压暗
    p.al = (p.kind === 0 ? 0.95 : p.kind === 1 ? 0.7 : 0.24) * (0.1 + 0.9 * smooth(0.06, 0.55, p.u));
  };

  // ── 鼠标:和开场同一套「风」,按住时聚拢,松手炸开 ──
  const P = { cx: -1e4, cy: -1e4, sx: -1e4, sy: -1e4, strT: 0, str: 0, mvx: 0, mvy: 0, holdT: 0, hold: 0, blast: 0, bx: 0, by: 0, lx: 0, ly: 0 };
  const cells = [...document.querySelectorAll<HTMLElement>('.hero-cell')];
  const glow = cells.map(() => 0);
  const inWall = (e: PointerEvent) => { const r = wall.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.top + r.height; };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (P.sx < -1e3) { P.sx = e.clientX; P.sy = e.clientY; P.lx = e.clientX; P.ly = e.clientY; }
    P.mvx += (e.clientX - P.lx - P.mvx) * 0.5; P.mvy += (e.clientY - P.ly - P.mvy) * 0.5;
    P.lx = e.clientX; P.ly = e.clientY; P.cx = e.clientX; P.cy = e.clientY;
    P.strT = inWall(e) ? 1 : 0;
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.pointerType === 'touch' || !inWall(e)) return;
    if ((e.target as Element | null)?.closest?.('a, button, input, textarea, select, summary, label, [role="button"], .glass')) return;
    P.holdT = 1;
  };
  const onUp = () => { if (P.hold > 0.35) { P.blast = 1; P.bx = P.sx; P.by = P.sy; } P.holdT = 0; };
  const onLeave = () => { P.strT = 0; P.holdT = 0; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  addEventListener('pointerup', onUp, { passive: true });
  addEventListener('pointercancel', onUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  addEventListener('blur', onLeave);

  // ── 开场接力:名字的粒子炸开后,直接汇进光带 ──
  let rampAt: number | null = document.documentElement.classList.contains('intro-on') ? null : performance.now();
  const onBurst = (e: Event) => {
    const d = (e as CustomEvent<{ n: number; data: Float32Array }>).detail;
    const cr = cv.getBoundingClientRect();
    parts.forEach((p, i) => {
      const j = (i % d.n) * 4;
      p.x = d.data[j] - cr.left + (Math.random() - 0.5) * 6; p.y = d.data[j + 1] - cr.top + (Math.random() - 0.5) * 6;
      p.vx = d.data[j + 2]; p.vy = d.data[j + 3]; p.t = 1;
    });
    rampAt = performance.now() - 150;
  };
  addEventListener('intro:burst', onBurst);

  buildRamp(); build();
  const T0 = performance.now();
  const dtc = Math.PI * 2;
  void dtc;

  // 物理按固定步长走(每秒 60 步),高刷新率屏幕上速度也一样
  const step = (t: number) => {
    // 沙子:影响范围大、推得远,每颗沙粒反应不同,被吹散后各自慢慢飘回原位
    const R = W < 640 ? 130 : 230, R2 = R * R;
    const wind = P.str > 0.02;
    const speed = Math.hypot(P.mvx, P.mvy);
    const mx = P.sx - cvLeft, my = P.sy - cvTop;
    const bx = P.bx - cvLeft, by = P.by - cvTop;
    const blast = P.blast > 0;
    for (const p of parts) {
      home(p, t);
      if (wind) {
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / R) * (1 - d / R * 0.4) * P.str * (1 - P.hold) * p.rs;
          // 顺着鼠标的方向被带走,再向两边散开,带一点旋涡
          p.vx += P.mvx * f * 0.5 + (-dy / d) * f * speed * 0.09 + (dx / d) * f * 1.5 + (Math.random() - 0.5) * f * 1.2;
          p.vy += P.mvy * f * 0.5 + (dx / d) * f * speed * 0.09 + (dy / d) * f * 1.5 + (Math.random() - 0.5) * f * 1.2;
          p.t = Math.min(1, p.t + f * 0.8);
        }
        if (P.hold > 0.02 && d2 < 320 * 320) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / 320) * P.hold * P.str * p.rs;
          p.vx -= (dx / d) * f * 0.75; p.vy -= (dy / d) * f * 0.75; p.t = Math.min(1, p.t + f * 0.35);
        }
      }
      if (blast) {
        const dx = p.x - bx, dy = p.y - by, d = Math.hypot(dx, dy) || 1;
        if (d < 420) { const f = (1 - d / 420) * p.rs; p.vx += (dx / d) * f * 22; p.vy += (dy / d) * f * 22; p.t = 1; }
      }
      // 飘散的沙粒:轻轻下坠、微微抖动;返回得很慢,每颗的节奏不一样
      if (p.t > 0.03) { p.vy += 0.03 * p.t; p.vx += (Math.random() - 0.5) * 0.12 * p.t; p.vy += (Math.random() - 0.5) * 0.12 * p.t; }
      const k = 0.0028 + (1 - p.t) * (1 - p.t) * 0.03;
      p.vx += (p.hx - p.x) * k; p.vy += (p.hy - p.y) * k;
      p.vx *= 0.94; p.vy *= 0.94;
      p.t *= p.dr;
      p.x += p.vx; p.y += p.vy;
    }
    P.mvx *= 0.85; P.mvy *= 0.85;
    if (blast) P.blast = 0;
  };
  let cvLeft = 0, cvTop = 0;

  // 按颜色和亮度分桶再画,几千个粒子也只需要很少的状态切换
  const NA = 6;
  const buckets: number[][] = Array.from({ length: 32 * NA }, () => []);
  const draw = (t: number, now: number) => {
    const a0 = rampAt === null ? 0 : clamp((now - rampAt) / 900);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (a0 <= 0) return;
    const isDark = dark();
    ctx.globalCompositeOperation = isDark ? 'lighter' : 'source-over';
    const mx = P.sx - cvLeft, my = P.sy - cvTop;
    const base = (isDark ? 0.9 : 0.85) * a0;
    for (const b of buckets) b.length = 0;
    for (const p of parts) {
      const near = P.str > 0.02 ? Math.max(0, 1 - Math.hypot(p.x - mx, p.y - my) / 150) * P.str : 0;
      const tw = 0.8 + 0.2 * Math.sin(t * p.sp + p.ph);
      const a = Math.min(1, p.al * tw + near * 0.45);
      if (a < 0.04) continue;
      const m = 0.5 + 0.5 * Math.sin(p.u * 5 + p.k + t * 0.25);
      const ci = Math.min(15, (m * 16) | 0) + (p.k % 3 === 2 ? 16 : 0);
      const aq = Math.min(NA - 1, (a * NA) | 0);
      const s = p.s * (1 + p.t * 0.5);
      buckets[ci * NA + aq].push(p.x - s / 2, p.y - s / 2, s);
    }
    for (let ci = 0; ci < 32; ci++) {
      for (let aq = 0; aq < NA; aq++) {
        const b = buckets[ci * NA + aq];
        if (!b.length) continue;
        ctx.fillStyle = ramp[ci];
        ctx.globalAlpha = ((aq + 1) / NA) * base;
        for (let i = 0; i < b.length; i += 3) ctx.fillRect(b[i], b[i + 1], b[i + 2], b[i + 2]);
      }
    }
  };

  if (calm) {
    // 减少动态效果:画一帧静止的光带就好
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rampAt = 0;
    parts.forEach((p) => { home(p, 6); p.x = p.hx; p.y = p.hy; });
    draw(6, 1e6);
    return;
  }

  let last = 0, acc = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) { last = 0; return; }
    const t = (now - T0) / 1000;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60); last = now;
    const ease = (k: number) => 1 - Math.exp(-dt * k);
    P.sx += (P.cx - P.sx) * ease(9); P.sy += (P.cy - P.sy) * ease(9);
    P.str += (P.strT - P.str) * ease(P.strT ? 4 : 2.5);
    P.hold += (P.holdT - P.hold) * ease(P.holdT ? 5 : 8);
    const cr = cv.getBoundingClientRect(); cvLeft = cr.left; cvTop = cr.top;
    acc += dt;
    for (let i = 0; acc >= 1 / 60 && i < 6; i++) { step(t); acc -= 1 / 60; }
    if (acc > 0.2) acc = 0;
    draw(t, now);
    // 标题:鼠标靠近、按住时,文字边缘泛起光泽
    cells.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(P.sx - (r.left + r.width / 2), P.sy - (r.top + r.height / 2));
      const target = Math.min(1, Math.max(0, 1 - d / 280) * P.str + P.hold * 0.5 * P.str);
      glow[i] += (target - glow[i]) * ease(6);
      el.style.setProperty('--glow', glow[i].toFixed(3));
    });
  };
  raf = requestAnimationFrame(loop);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(wall);
  const onTheme = () => buildRamp();
  addEventListener('themechange', onTheme);
  addEventListener('resize', build);
  heroStop = () => {
    cancelAnimationFrame(raf); io.disconnect();
    removeEventListener('themechange', onTheme); removeEventListener('resize', build); removeEventListener('intro:burst', onBurst);
    removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
    removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
    document.documentElement.removeEventListener('pointerleave', onLeave); removeEventListener('blur', onLeave);
    cells.forEach((el) => el.style.removeProperty('--glow'));
  };
}
document.addEventListener('astro:before-swap', () => { heroStop?.(); heroStop = null; });

// ───────── 卡片到详情的共享转场 ─────────
// 元素用 data-vt 标出名字;只给「点的那一个」和新页面里对得上的那个起名,其余照常淡入淡出。
type VT = HTMLElement & { style: CSSStyleDeclaration & { viewTransitionName: string; viewTransitionClass: string } };
const nameEl = (el: VT) => {
  const n = el.dataset.vt!;
  el.style.viewTransitionName = n;
  el.style.viewTransitionClass = n.startsWith('cover') ? 'vt-cover' : 'vt-title';
};
const clearNames = () => document.querySelectorAll<VT>('[data-vt]').forEach((el) => { el.style.viewTransitionName = ''; el.style.viewTransitionClass = ''; });
// 详情页正文里的封面图(和卡片封面是同一张)
function tagCover() {
  const art = document.querySelector<HTMLElement>('[data-cover-vt]');
  if (!art) return;
  document.querySelectorAll<HTMLElement>('img[data-vt]').forEach((i) => { delete i.dataset.vt; delete i.dataset.vtAlways; });
  const story = matchMedia('(min-width: 1024px)').matches && document.querySelector('.story-ready');
  const pool = document.querySelectorAll<HTMLImageElement>(story ? '.story-frame img' : 'article .prose img');
  const img = [...pool].find((i) => i.getAttribute('src') === art.dataset.coverSrc);
  if (img) { img.dataset.vt = art.dataset.coverVt; img.dataset.vtAlways = ''; }
}
let oldNames = new Set<string>();
document.addEventListener('astro:before-preparation', (e: any) => {
  clearNames();
  oldNames = new Set();
  if (calm) return;
  const src = e.sourceElement as HTMLElement | undefined;
  let els: VT[] = src ? [...(src.matches('[data-vt]') ? [src as VT] : []), ...src.querySelectorAll<VT>('[data-vt]')] : [];
  if (!els.length) els = [...document.querySelectorAll<VT>('[data-vt][data-vt-always]')];
  for (const el of els) { if (oldNames.has(el.dataset.vt!)) continue; nameEl(el); oldNames.add(el.dataset.vt!); }
});
document.addEventListener('astro:after-swap', () => {
  initStory();
  storyUpdate?.();
  tagCover();
  const used = new Set<string>();
  document.querySelectorAll<VT>('[data-vt]').forEach((el) => {
    const n = el.dataset.vt!;
    if (!oldNames.has(n) || used.has(n)) return;
    used.add(n);
    nameEl(el);
    // 配对的元素不能藏在还没渐显的容器里,否则转场结束会闪一下
    el.closest('.reveal')?.classList.add('in', 'instant');
  });
});

document.addEventListener('astro:page-load', () => {
  initHero();
  initStory();
  initFlow();
  initAmbient();
  tagCover();
  initReveal();
  initToc();
  initAnchors();
  initCount();
  onScroll();
  setTimeout(clearNames, 700);
});
