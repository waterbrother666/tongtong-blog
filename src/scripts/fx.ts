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
  const img = t.closest?.('.prose img') as HTMLImageElement | null;
  if (img && !img.closest('a')) { openZoom(img); return; }
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
  const img = [...art.querySelectorAll<HTMLImageElement>('.prose img')].find((i) => i.getAttribute('src') === art.dataset.coverSrc);
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
  tagCover();
  initReveal();
  initToc();
  initAnchors();
  initCount();
  onScroll();
  setTimeout(clearNames, 700);
});
