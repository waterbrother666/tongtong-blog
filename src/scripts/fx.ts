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

// ───────── 首页顶部壁纸:WebGL 实时画出的流光(玻璃光带),再叠一层漂浮的光点 ─────────
const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
// 6 条带子沿 S 形曲线从左下爬向右上,宽度忽粗忽细,边缘亮、内部半透明;右下角是透视网格
const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
uniform vec2 uPtr; uniform vec2 uBP; uniform float uStr; uniform float uVel; uniform float uHold; uniform float uBurst;
float th(float x){ float e = exp(2.0 * clamp(x, -8.0, 8.0)); return (e - 1.0) / (e + 1.0); }
void main(){
  float ar = uRes.x / uRes.y;
  vec2 p = gl_FragCoord.xy / uRes.y;
  float xn = p.x / ar;
  float t = uTime;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float k = float(i);
    float xs = xn + uMouse.x * 0.02 * (1.0 + k * 0.15);
    float c = 0.20 + 0.56 * xs
            + 0.085 * sin(xs * 6.0 + t * 0.32 + k * 1.7)
            + 0.040 * sin(xs * 13.0 - t * 0.47 + k * 2.3)
            + (k - 2.5) * 0.034 + uMouse.y * 0.015;
    // 鼠标:光带被拨开;按住时被吸过去;松手时一圈涟漪弹开
    float dx = p.x - uPtr.x;
    float w = exp(-dx * dx * 26.0) * uStr;
    float rel = c - uPtr.y;
    float push = th(rel * 10.0) * 0.06 * exp(-abs(rel) * 4.0);
    c += mix(push, -rel * 0.5, uHold) * w;
    c += sin(dx * 34.0 - t * 5.0 + k) * 0.008 * uVel * w;
    float rr = length(vec2(p.x - uBP.x, c - uBP.y));
    c += th(c - uBP.y) * 0.035 * uBurst * exp(-pow((rr - (1.0 - uBurst) * 0.55) / 0.07, 2.0));
    float hw = 0.010 + 0.034 * pow(0.5 + 0.5 * sin(xs * 7.0 + k * 2.0 - t * 0.38), 2.0);
    float d = abs(p.y - c);
    float edge = exp(-pow((d - hw) / (hw * 0.22 + 0.002), 2.0));
    float fill = smoothstep(hw, 0.0, d) * 0.20;
    float halo = exp(-d / (hw * 3.2 + 0.01)) * 0.16;
    float mixv = 0.5 + 0.5 * sin(xs * 5.0 + k + t * 0.25);
    vec3 tint = mix(uA, uB, mixv);
    tint = mix(tint, uC, 0.35 * step(1.5, mod(k, 3.0)));
    float hot = smoothstep(0.03, 0.045, hw) * edge;
    col += tint * (edge * 0.9 + fill + halo) + vec3(hot * 0.35);
  }
  // 右下角透视网格
  float gy = 0.34 - p.y;
  if (gy > 0.0) {
    float z = 1.0 / (gy * 5.5 + 0.28);
    float lx = abs(fract((xn - 0.82) * z * 1.6) - 0.5);
    float lz = abs(fract(z * 1.3 + t * 0.04) - 0.5);
    float g = max(smoothstep(0.025 * z, 0.0, lx * 0.5), smoothstep(0.02, 0.0, lz * 0.5));
    col += uB * g * 0.22 * smoothstep(0.4, 1.0, xn) * (1.0 - smoothstep(0.0, 0.34, gy) * 0.7);
  }
  // 右侧的空气感光晕
  col += mix(uA, uB, 0.5) * exp(-length(vec2(xn - 0.82, (p.y - 0.62) * 1.4)) * 3.2) * 0.16;
  // 按住时,鼠标附近的光变亮
  col *= 1.0 + uHold * 0.7 * exp(-pow(length(p - uPtr) * 4.5, 2.0));
  // 左边留给标题,保持安静
  col *= mix(1.0, smoothstep(0.08, 0.58, xn), smoothstep(0.18, 0.5, p.y));
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(min(col, vec3(a)), a);
}`;
const PALETTES: Record<string, string[]> = {
  night: ['#8ea2ff', '#5fd4e8', '#a994ff'],
  day: ['#a994ff', '#6beaff', '#8ea2ff'],
  dawn: ['#ff9db5', '#ffc46b', '#a994ff'],
  dusk: ['#c9a0ff', '#ff9d66', '#ff7ac8'],
};
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

type Ptr = { x: number; y: number; str: number; vel: number; hold: number; burst: number; bx: number; by: number };
function startShader(cv: HTMLCanvasElement, wall: HTMLElement, time: string) {
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const pal = (PALETTES[time] || PALETTES.night).map(hex);
  gl.uniform3fv(U('uA'), pal[0]); gl.uniform3fv(U('uB'), pal[1]); gl.uniform3fv(U('uC'), pal[2]);
  gl.clearColor(0, 0, 0, 0);
  let mx = 0, my = 0;
  const resize = () => {
    // 光带本来就是柔和的,用较低分辨率渲染,手机上也流畅
    const k = Math.min(1, 1100 / Math.max(1, cv.clientWidth)) * Math.min(1, devicePixelRatio || 1) * 0.9 + 0.1;
    cv.width = Math.max(2, Math.round(cv.clientWidth * k)); cv.height = Math.max(2, Math.round(cv.clientHeight * k));
    gl.viewport(0, 0, cv.width, cv.height);
  };
  resize();
  return {
    resize,
    draw(t: number, ptr?: Ptr) {
      const px = parseFloat(wall.style.getPropertyValue('--px')) || 0, py = parseFloat(wall.style.getPropertyValue('--py')) || 0;
      mx += (px - mx) * 0.2; my += (py - my) * 0.2;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U('uRes'), cv.width, cv.height);
      gl.uniform1f(U('uTime'), t);
      gl.uniform2f(U('uMouse'), mx, -my);
      const ar = cv.width / cv.height;
      gl.uniform2f(U('uPtr'), (ptr?.x ?? 0.5) * ar, ptr?.y ?? 0.5);
      gl.uniform2f(U('uBP'), (ptr?.bx ?? 0.5) * ar, ptr?.by ?? 0.5);
      gl.uniform1f(U('uStr'), ptr?.str ?? 0);
      gl.uniform1f(U('uVel'), ptr?.vel ?? 0);
      gl.uniform1f(U('uHold'), ptr?.hold ?? 0);
      gl.uniform1f(U('uBurst'), ptr?.burst ?? 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

let heroStop: (() => void) | null = null;
function initHero() {
  heroStop?.(); heroStop = null;
  const wall = document.querySelector<HTMLElement>('.hero-wall');
  if (!wall) return;
  const time = document.documentElement.dataset.time || 'night';
  const glCv = wall.querySelector<HTMLCanvasElement>('.hero-gl')!;
  const shader = startShader(glCv, wall, time);
  if (shader) {
    shader.draw(calm ? 6 : 0);
    requestAnimationFrame(() => glCv.classList.add('ready'));
  }
  if (calm) return;

  // 光点:偏向右侧的流体区域,慢慢向右上飘,忽明忽暗,会被鼠标吹开
  const cv = wall.querySelector<HTMLCanvasElement>('.hero-fx')!;
  const ctx = cv.getContext('2d')!;
  let W = 0, H = 0, dpr = 1, raf = 0, visible = true;
  let cols = ['#a994ff', '#6beaff'];
  const readCols = () => {
    const cs = getComputedStyle(document.documentElement);
    cols = [cs.getPropertyValue('--violet').trim() || cols[0], cs.getPropertyValue('--cyan').trim() || cols[1]];
  };
  type D = { x: number; y: number; r: number; vx: number; vy: number; ph: number; sp: number; c: number; ex: number; ey: number };
  let dots: D[] = [];
  const spawn = (first: boolean): D => ({
    x: W * (first ? 0.25 + Math.random() * 0.75 : 0.2 + Math.random() * 0.5),
    y: H * (first ? Math.random() : 0.5 + Math.random() * 0.5),
    r: 0.6 + Math.random() * 1.7, vx: 0.08 + Math.random() * 0.22, vy: -(0.05 + Math.random() * 0.2),
    ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4, c: Math.random() < 0.55 ? 1 : 0, ex: 0, ey: 0,
  });
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = wall.clientWidth; H = wall.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    dots = Array.from({ length: W < 640 ? 26 : 64 }, () => spawn(true));
    shader?.resize();
  };
  readCols(); size();

  // ── 鼠标互动:光带被拨开、按住吸引、松手涟漪;光点被吹开;标题跟着发亮 ──
  const P = { cx: -1e4, cy: -1e4, sx: -1e4, sy: -1e4, strT: 0, str: 0, vel: 0, holdT: 0, hold: 0, burst: 0, bcx: 0, bcy: 0, lx: 0, ly: 0 };
  const cells = [...document.querySelectorAll<HTMLElement>('.hero-cell')];
  const glow = cells.map(() => 0);
  const inWall = (e: PointerEvent) => { const r = wall.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.top + r.height * 0.9; };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (P.sx < -1e3) { P.sx = e.clientX; P.sy = e.clientY; }
    P.vel = Math.min(1, P.vel + Math.hypot(e.clientX - P.lx, e.clientY - P.ly) / 90);
    P.lx = e.clientX; P.ly = e.clientY; P.cx = e.clientX; P.cy = e.clientY;
    P.strT = inWall(e) ? 1 : 0;
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.pointerType === 'touch' || !inWall(e)) return;
    if ((e.target as Element | null)?.closest?.('a, button, input, textarea, select, summary, label, [role="button"], .glass')) return;
    P.holdT = 1;
  };
  const onUp = () => { if (P.hold > 0.35) { P.burst = 1; P.bcx = P.sx; P.bcy = P.sy; } P.holdT = 0; };
  const onLeave = () => { P.strT = 0; P.holdT = 0; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  addEventListener('pointerup', onUp, { passive: true });
  addEventListener('pointercancel', onUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  addEventListener('blur', onLeave);

  const t0 = performance.now();
  let tPrev = t0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now;
    const ease = (k: number) => 1 - Math.exp(-dt * k);
    // 克制:位置跟得慢一点,强度渐进,离开后很快平静
    P.sx += (P.cx - P.sx) * ease(9); P.sy += (P.cy - P.sy) * ease(9);
    P.str += (P.strT - P.str) * ease(P.strT ? 4 : 2.5);
    P.hold += (P.holdT - P.hold) * ease(P.holdT ? 5 : 8);
    P.vel *= Math.exp(-dt * 3.2);
    P.burst = Math.max(0, P.burst - dt * 0.9);
    const gr = glCv.getBoundingClientRect(), wr = wall.getBoundingClientRect();
    shader?.draw(t, {
      x: (P.sx - gr.left) / gr.width, y: 1 - (P.sy - gr.top) / gr.height,
      str: P.str, vel: P.vel, hold: P.hold, burst: P.burst,
      bx: (P.bcx - gr.left) / gr.width, by: 1 - (P.bcy - gr.top) / gr.height,
    });
    // 标题:鼠标靠近、按住时,文字边缘泛起光泽
    cells.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(P.sx - (r.left + r.width / 2), P.sy - (r.top + r.height / 2));
      const target = Math.min(1, Math.max(0, 1 - d / 280) * P.str + P.hold * 0.5 * P.str);
      glow[i] += (target - glow[i]) * ease(6);
      el.style.setProperty('--glow', glow[i].toFixed(3));
    });
    const mx = P.sx - wr.left, my = P.sy - wr.top;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (P.str > 0.02) {
        const dx = d.x - mx, dy = d.y - my, dd = Math.hypot(dx, dy) || 1;
        if (dd < 130) { const f = (1 - dd / 130) * P.str; d.ex += (dx / dd) * f * 1.6 * (1 - P.hold); d.ey += (dy / dd) * f * 1.6 * (1 - P.hold); }
        if (P.hold > 0.02 && dd < 260) { const f = (1 - dd / 260) * P.hold; d.ex -= (dx / dd) * f * 0.9; d.ey -= (dy / dd) * f * 0.9; }
      }
      d.ex *= 0.93; d.ey *= 0.93;
      d.x += d.vx + d.ex; d.y += d.vy + d.ey;
      if (d.x > W + 10 || d.y < -10 || d.x < -40 || d.y > H + 40) dots[i] = spawn(false);
      const near = P.str > 0.02 ? Math.max(0, 1 - Math.hypot(d.x - mx, d.y - my) / 150) * P.str : 0;
      const a = Math.min(1, (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * d.sp + d.ph))) + near * 0.6);
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 5);
      g.addColorStop(0, cols[d.c]); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 5, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 0.7, 0, 6.2832); ctx.fill();
    }
  };
  raf = requestAnimationFrame(loop);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(wall);
  const onTheme = () => readCols();
  addEventListener('themechange', onTheme);
  addEventListener('resize', size);
  heroStop = () => {
    cancelAnimationFrame(raf); io.disconnect();
    removeEventListener('themechange', onTheme); removeEventListener('resize', size);
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
