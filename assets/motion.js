/* Motion layer: scroll progress, staggered reveals, hero dot field, card tilt, magnetic buttons.
   Everything is skipped under prefers-reduced-motion. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  if (reduce) { root.classList.add('mo-off'); return; }
  root.classList.add('mo');

  // 1. Scroll progress bar
  const bar = document.createElement('div');
  bar.className = 'mo-progress';
  document.body.appendChild(bar);
  const setBar = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
  };
  addEventListener('scroll', setBar, { passive: true }); addEventListener('resize', setBar); setBar();

  // 2. Staggered reveal for lists and cards
  const groups = [
    '.home-ext .paper-items > .item', '.home-ext .blog-prev', '.note-row', '.pl-item', '.event-row',
    '.paper-card'
  ];
  const targets = [];
  groups.forEach(sel => document.querySelectorAll(sel).forEach((el, i) => {
    el.classList.add('mo-rise'); el.style.setProperty('--mo-i', i % 6); targets.push(el);
  }));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('mo-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach(el => io.observe(el));

  // 3. Hero headline: line-by-line rise
  const h1 = document.querySelector('.hero h1');
  if (h1) {
    h1.querySelectorAll(':scope > span').forEach((s, i) => { s.classList.add('mo-line'); s.style.setProperty('--mo-i', i); });
    requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add('mo-go')));
  }

  // 4. Hero dot field that bends around the cursor
  const hero = document.querySelector('.hero');
  if (hero) {
    const cv = document.createElement('canvas');
    cv.className = 'mo-field'; cv.setAttribute('aria-hidden', 'true');
    hero.insertBefore(cv, hero.firstChild);
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, dots = [], mx = -9999, my = -9999, tx = -9999, ty = -9999, visible = true;
    const GAP = 28;
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) dots.push({ x, y, ox: x, oy: y });
    }
    size(); addEventListener('resize', size);
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { tx = ty = -9999; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    let t0 = performance.now();
    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible) return;
      const time = (t - t0) / 1000;
      mx += (tx - mx) * 0.12; my += (ty - my) * 0.12;
      ctx.clearRect(0, 0, w, h);
      const R = 170;
      for (const d of dots) {
        // slow ambient drift wave
        const wave = Math.sin(d.ox * 0.012 + time * 0.9) * Math.cos(d.oy * 0.014 + time * 0.7);
        let x = d.ox, y = d.oy + wave * 2.2, a = 0.10 + (wave + 1) * 0.035, r = 1;
        const dx = x - mx, dy = y - my, dist = Math.hypot(dx, dy);
        if (dist < R) {
          const f = 1 - dist / R, push = f * f * 18;
          x += (dx / (dist || 1)) * push; y += (dy / (dist || 1)) * push;
          a += f * 0.45; r += f * 1.3;
        }
        // fade toward the bottom so it melts into the page
        a *= Math.min(1, (h - y) / 160);
        if (a <= 0.01) continue;
        ctx.fillStyle = 'rgba(17,17,17,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  if (!fine) return;

  // 5. Card tilt with a moving sheen
  document.querySelectorAll('.home-ext .blog-prev, .paper-card').forEach(card => {
    card.classList.add('mo-tilt');
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
      card.style.setProperty('--sx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--sy', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  });

  // 6. Magnetic hero buttons
  document.querySelectorAll('.hero-cta .btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px)';
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
})();
