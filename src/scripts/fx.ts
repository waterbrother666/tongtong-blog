// 3D 倾斜 + 鼠标光晕(事件委托,页面转场后依然有效)
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

// 滚动渐显
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('in'));
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach((e) => io.observe(e));
}
document.addEventListener('astro:page-load', initReveal);

// 目录高亮
document.addEventListener('astro:page-load', () => {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc-link')];
  if (!links.length) return;
  const map = new Map(links.map((l) => [l.dataset.slug!, l]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach((l) => l.classList.remove('active'));
      map.get(e.target.id)?.classList.add('active');
    }
  }, { rootMargin: '-90px 0px -70% 0px' });
  map.forEach((_, slug) => { const el = document.getElementById(slug); if (el) io.observe(el); });
});

// 鼠标视差:流动光球随鼠标轻微偏移
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('pointermove', (e) => {
    const root = document.documentElement;
    root.style.setProperty('--px', String(e.clientX / innerWidth - 0.5));
    root.style.setProperty('--py', String(e.clientY / innerHeight - 0.5));
  });
}
