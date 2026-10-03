/* ==========================================================================
   GET /sparsha — behaviour
   Plain script, no dependencies. Everything here is progressive enhancement:
   without JS the page is a complete, readable document.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const reduced = () => mqReduce.matches;
  const scrollBehavior = () => (reduced() ? 'auto' : 'smooth');
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const ms = (min, max) => (min + Math.random() * (max - min)).toFixed(1);
  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
    },
  };

  const EMAIL = 'imailsparsha@gmail.com';
  const startedAt = performance.now();

  /* ------------------------------------------------------------------------
     Kathmandu time (UTC+05:45)
     ------------------------------------------------------------------------ */

  const npFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  function npParts() {
    const parts = {};
    for (const { type, value } of npFormat.formatToParts(new Date())) parts[type] = value;
    return parts;
  }
  const npStamp = () => {
    const p = npParts();
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} +0545`;
  };
  const npClock = () => {
    const p = npParts();
    return `${p.hour}:${p.minute}`;
  };

  function initClock() {
    const stamp = $('[data-np-stamp]');
    const clock = $('[data-np-clock]');
    if (stamp) {
      stamp.textContent = npStamp();
      stamp.dateTime = new Date().toISOString();
      if (stamp.parentElement) stamp.parentElement.hidden = false;
    }
    if (!clock) return;
    clock.hidden = false;
    const tick = () => { clock.textContent = npClock(); };
    tick();
    setInterval(tick, 15000);
  }

  /* ------------------------------------------------------------------------
     Server log: a queue of lines typed into the corner panel.
     Lines use a tiny markup: {r:ruby} {g:green} {m:muted} {b:bold}.
     ------------------------------------------------------------------------ */

  const Log = (() => {
    const panel = $('.log');
    const body = $('#log-body');
    const tab = $('[data-log-open]');
    const followBtn = $('[data-log-follow]');
    const sizeBtn = $('[data-log-size]');
    const closeBtn = $('[data-log-close]');
    const TOKEN = /\{([rgmb]):([^{}]*)\}/g;
    const MAX_LINES = 80;
    const queue = [];
    let busy = false;
    let follow = true;

    if (!panel || !body) return { push() {}, show() {}, toggle() {} };

    function segments(line) {
      const out = [];
      let last = 0;
      let match;
      TOKEN.lastIndex = 0;
      while ((match = TOKEN.exec(line))) {
        if (match.index > last) out.push(['', line.slice(last, match.index)]);
        out.push([match[1], match[2]]);
        last = TOKEN.lastIndex;
      }
      if (last < line.length) out.push(['', line.slice(last)]);
      return out;
    }

    const isOpen = () => !panel.hidden;
    const scrollToEnd = () => { if (follow) body.scrollTop = body.scrollHeight; };

    function next() {
      const line = queue.shift();
      if (line === undefined) { busy = false; return; }
      busy = true;

      const li = document.createElement('div');
      li.className = 'log__line';
      const parts = segments(line).map(([cls, text]) => {
        const span = document.createElement('span');
        if (cls) span.className = `t-${cls}`;
        li.appendChild(span);
        return { span, text };
      });
      body.appendChild(li);
      while (body.children.length > MAX_LINES) body.firstElementChild.remove();

      const total = parts.reduce((n, p) => n + p.text.length, 0);
      if (reduced() || !isOpen() || document.hidden || total === 0) {
        parts.forEach((p) => { p.span.textContent = p.text; });
        scrollToEnd();
        setTimeout(next, 16);
        return;
      }

      const duration = Math.min(380, 60 + total * 5);
      const t0 = performance.now();
      const frame = (now) => {
        const k = Math.min(1, (now - t0) / duration);
        let budget = Math.ceil(total * k);
        for (const p of parts) {
          const n = Math.min(p.text.length, budget);
          p.span.textContent = p.text.slice(0, n);
          budget -= n;
        }
        scrollToEnd();
        if (k < 1) requestAnimationFrame(frame);
        else setTimeout(next, 70);
      };
      requestAnimationFrame(frame);
    }

    function push(...lines) {
      lines.flat().forEach((l) => queue.push(l));
      if (queue.length > 24) queue.splice(0, queue.length - 24);
      if (!busy) next();
    }

    function setState(state) {
      const closed = state === 'closed';
      panel.hidden = closed;
      tab.hidden = !closed;
      if (!closed) {
        panel.dataset.state = state;
        sizeBtn.textContent = state === 'full' ? 'less' : 'more';
        sizeBtn.setAttribute('aria-expanded', String(state === 'full'));
        sizeBtn.title = state === 'full' ? 'Shrink log' : 'Expand log';
        scrollToEnd();
      }
      store.set('log', closed ? 'closed' : 'open');
    }

    followBtn.addEventListener('click', () => {
      follow = !follow;
      followBtn.setAttribute('aria-pressed', String(follow));
      scrollToEnd();
    });
    sizeBtn.addEventListener('click', () => setState(panel.dataset.state === 'full' ? 'mini' : 'full'));
    closeBtn.addEventListener('click', () => { setState('closed'); tab.focus(); });
    tab.addEventListener('click', () => { setState('mini'); sizeBtn.focus(); });
    body.addEventListener('click', () => { if (panel.dataset.state === 'mini') setState('full'); });

    // Desktop: the mini log never blocks the page under it. Only its buttons take
    // the pointer; everywhere else events pass through and the panel fades.
    if (mqFine.matches) {
      panel.classList.add('is-passthrough');
      let frame = 0;
      let px = -1;
      let py = -1;
      let onButton = false;
      document.addEventListener('pointermove', (ev) => {
        if (ev.pointerType !== 'mouse') return;
        px = ev.clientX;
        py = ev.clientY;
        onButton = ev.target instanceof Element && Boolean(ev.target.closest('.log__btn'));
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (panel.hidden || panel.dataset.state !== 'mini') {
            panel.classList.remove('is-see-through');
            return;
          }
          const r = panel.getBoundingClientRect();
          const inside = px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
          panel.classList.toggle('is-see-through', inside && !onButton);
        });
      }, { passive: true });
    }

    return {
      push,
      show() { setState(store.get('log') === 'closed' ? 'closed' : 'mini'); },
      toggle() { setState(panel.hidden ? 'mini' : 'closed'); },
    };
  })();

  /* ------------------------------------------------------------------------
     What the log says when the request reaches each layer.
     ------------------------------------------------------------------------ */

  let elapsedText = null;
  function elapsed() {
    if (elapsedText === null) {
      elapsedText = Math.round(performance.now() - startedAt).toLocaleString('en-US');
      const el = $('[data-elapsed]');
      if (el) el.textContent = `${elapsedText}ms`;
    }
    return elapsedText;
  }

  const LAYER_LINES = {
    top: {
      first: () => [],
      again: () => ['{m:Rewinding to "/". The request starts over.}'],
    },
    routes: {
      first: () => ['{m:Routing} GET "/sparsha" {m:→} {b:humans#show}'],
      again: () => ['{m:Routing (cached): 6 routes}'],
    },
    story: {
      first: () => [
        'Processing by {b:HumansController#show} as HTML',
        '  Parameters: {"curious"=>"true", "from"=>"Kathmandu"}',
        '  {m:7 before_action callbacks} {g:✓}',
      ],
      again: () => ['  {m:CACHE} Human Load (0.0ms)  {m:name = "Sparsha"}'],
    },
    work: {
      first: () => [
        `  Project Load (${ms(0.3, 0.9)}ms)  SELECT "projects".* FROM "projects" WHERE "featured" = {r:TRUE}`,
        '  {m:↳ app/controllers/projects_controller.rb:4}',
      ],
      again: () => ['  {m:CACHE} Project Load (0.0ms)'],
    },
    oss: {
      first: () => [
        `  Contribution Count (${ms(0.2, 0.6)}ms)  SELECT COUNT(*) FROM "contributions" WHERE "state" = {r:'merged'}  {m:=> 15}`,
      ],
      again: () => ['  {m:CACHE} Contribution Count (0.0ms)  {m:=> still 15}'],
    },
    offline: {
      first: () => [
        '  Rendered collection of {b:humans/_hobby.html.erb} [4 times] (Duration: {r:∞}ms | Allocations: weekends)',
      ],
      again: () => ['  {m:Rendered humans/_offline.html.erb (cached)}'],
    },
    hello: {
      first: () => [`{g:Completed 200 OK} in ${elapsed()}ms (Views: 1 human | ActiveRecord: 15 PRs)`],
      again: () => ["{g:Completed 304 Not Modified} {m:you've been here before}"],
    },
  };

  /* ------------------------------------------------------------------------
     Rail: the ruby travels down the stack as you scroll. Also drives the
     "current section" state for the nav and the log narration.
     ------------------------------------------------------------------------ */

  const Rail = (() => {
    const rail = $('.rail');
    const nodesWrap = $('.rail__nodes');
    const fill = $('.rail__fill');
    const gem = $('.rail__gem');
    const header = $('.site-header');
    const heroSlot = $('.hero__gem');
    const heroArt = $('.hero__gem-art');
    const sections = $$('main [data-layer]');
    const navLinks = $$('.site-nav a, .sheet__list a');
    const visits = new Map();

    let stops = [];
    let railTop = 0;
    let railLen = 0;
    let railX = 0;
    let maxScroll = 1;
    let active = -1;
    let ticking = false;
    let started = false;
    let docked = false;
    let resizeFrame = 0;

    const nodes = sections.map((section) => {
      const node = document.createElement('span');
      node.className = 'rail__node';
      const label = document.createElement('span');
      label.className = 'rail__label';
      label.textContent = section.dataset.layer;
      node.appendChild(label);
      node.addEventListener('click', () => section.scrollIntoView({ behavior: scrollBehavior() }));
      nodesWrap.appendChild(node);
      return node;
    });

    const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

    function measure() {
      const r = rail.getBoundingClientRect();
      railTop = r.top;
      railLen = r.height;
      railX = r.left;
      maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      stops = sections.map((s, i) => (i === 0 ? 0 : clamp((docTop(s) - window.innerHeight * 0.4) / maxScroll, 0, 1)));
      nodes.forEach((n, i) => { n.style.transform = `translateY(${(stops[i] * railLen).toFixed(1)}px)`; });
      docked = false;
      update();
    }

    function narrate(section) {
      const lines = LAYER_LINES[section.id];
      if (!lines) return;
      const count = (visits.get(section.id) || 0) + 1;
      visits.set(section.id, count);
      Log.push(count === 1 ? lines.first() : lines.again());
    }

    function setActive(idx) {
      const previous = active;
      active = idx;
      nodes.forEach((n, i) => {
        n.classList.toggle('is-passed', i <= idx);
        n.classList.toggle('is-active', i === idx);
      });
      const id = sections[idx].id;
      navLinks.forEach((a) => {
        const on = a.getAttribute('href') === `#${id}`;
        a.classList.toggle('is-current', on);
        if (on) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
      if (!started) return;
      if (previous !== -1 && !reduced()) {
        gem.classList.remove('is-pulse');
        void gem.offsetWidth;
        gem.classList.add('is-pulse');
      }
      narrate(sections[idx]);
    }

    // The big hero gem shrinks into the rail as the hero scrolls away.
    function morph(y, gemY) {
      if (!heroArt || !heroSlot || reduced()) {
        gem.style.opacity = '1';
        return;
      }
      const m = clamp(y / (window.innerHeight * 0.55), 0, 1);
      if (m >= 1 && docked) return;
      const e = easeInOut(m);
      const es = 1 - Math.pow(1 - m, 3); // shrink early, travel later
      const slot = heroSlot.getBoundingClientRect();
      const cx = slot.left + heroArt.offsetLeft + heroArt.offsetWidth / 2;
      const cy = slot.top + heroArt.offsetTop + heroArt.offsetHeight / 2;
      const dx = (railX + 0.5 - cx) * e;
      const dy = (railTop + gemY - cy) * e;
      const scale = lerp(1, gem.offsetWidth / heroArt.offsetWidth, es);
      heroArt.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      const fade = clamp((m - 0.86) / 0.14, 0, 1);
      heroArt.style.opacity = String(1 - fade);
      gem.style.opacity = String(fade);
      docked = m >= 1;
    }

    function update() {
      ticking = false;
      const y = window.scrollY;
      const p = clamp(y / maxScroll, 0, 1);
      const gemY = p * railLen;
      gem.style.transform = `translateY(${gemY.toFixed(1)}px)`;
      fill.style.transform = `scaleY(${p.toFixed(4)})`;
      header.classList.toggle('is-scrolled', y > 8);

      let idx = 0;
      for (let i = 0; i < stops.length; i += 1) if (p + 0.0005 >= stops[i]) idx = i;
      if (idx !== active) setActive(idx);
      morph(y, gemY);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    function onResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(measure);
    }

    function init() {
      if (!rail || !sections.length) return;
      measure();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
      window.addEventListener('load', onResize);
      if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(document.body);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    }

    function start() {
      started = true;
      visits.set(sections[0].id, 1);
      measure();
      if (active > 0) narrate(sections[active]);
    }

    // j / k navigation for vim mode.
    function go(dir) {
      const probe = window.scrollY + window.innerHeight * 0.4 + 2;
      let idx = 0;
      sections.forEach((s, i) => { if (docTop(s) <= probe) idx = i; });
      let target = idx + dir;
      if (dir < 0 && sections[idx].getBoundingClientRect().top < -40) target = idx;
      target = clamp(target, 0, sections.length - 1);
      sections[target].scrollIntoView({ behavior: scrollBehavior() });
    }

    return { init, start, measure, go };
  })();

  /* ------------------------------------------------------------------------
     Theme: day / night, follows the OS until the visitor picks one.
     ------------------------------------------------------------------------ */

  function initTheme() {
    const btn = $('[data-theme-toggle]');
    const label = $('[data-theme-label]');
    const metas = $$('meta[name="theme-color"]');
    const current = () => doc.dataset.theme || (mqDark.matches ? 'night' : 'day');

    const sync = () => {
      const t = current();
      const next = t === 'day' ? 'night' : 'day';
      if (label) label.textContent = t;
      if (btn) btn.setAttribute('aria-label', `Theme: ${t}. Switch to ${next}.`);
      if (doc.dataset.theme) metas.forEach((m) => m.setAttribute('content', t === 'night' ? '#121110' : '#F5F3EE'));
    };

    const set = (t) => {
      doc.dataset.theme = t;
      store.set('theme', t);
      sync();
      Log.push(`{m:$} RAILS_ENV={b:${t}} bin/rails restart`, '{m:=> Puma restarted. Same code, different lighting.}');
    };
    const toggle = () => set(current() === 'day' ? 'night' : 'day');

    if (btn) btn.addEventListener('click', toggle);
    mqDark.addEventListener('change', sync);
    sync();
    return { set, toggle };
  }

  /* ------------------------------------------------------------------------
     Boot overlay: a short `rails server` start-up, once per session.
     ------------------------------------------------------------------------ */

  const BOOT_LINES = [
    '=> Booting Puma',
    '=> Rails application starting in production',
    '=> Run `bin/rails server --help` for more startup options',
    'Puma starting in single mode...',
    '*  Environment: production',
    '*     Timezone: Asia/Kathmandu (+05:45)',
    '* Listening on http://kathmandu.np:3000',
    'Use Ctrl-C to stop',
  ];

  function runBoot(done) {
    const overlay = $('.boot');
    const out = $('.boot__screen code');
    if (!doc.classList.contains('is-booting') || !overlay || !out) {
      done();
      return;
    }

    const skipEvents = ['keydown', 'pointerdown', 'wheel', 'touchstart'];
    const command = '$ bin/rails server';
    let finished = false;
    let timer = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      skipEvents.forEach((type) => window.removeEventListener(type, finish));
      try { sessionStorage.setItem('booted', '1'); } catch (e) { /* ignore */ }
      overlay.classList.add('is-leaving');
      done();
      setTimeout(() => {
        doc.classList.remove('is-booting');
        overlay.classList.remove('is-leaving');
      }, 780);
    };

    let c = 0;
    const typeCommand = () => {
      c += 1;
      out.textContent = command.slice(0, c);
      if (c < command.length) timer = setTimeout(typeCommand, 14);
      else timer = setTimeout(printLines, 140);
    };
    let i = 0;
    const printLines = () => {
      if (i >= BOOT_LINES.length) {
        timer = setTimeout(finish, 260);
        return;
      }
      out.textContent += `\n${BOOT_LINES[i]}`;
      i += 1;
      timer = setTimeout(printLines, 48);
    };

    skipEvents.forEach((type) => window.addEventListener(type, finish, { passive: true }));
    typeCommand();
  }

  /* ------------------------------------------------------------------------
     Scroll reveals
     ------------------------------------------------------------------------ */

  function initReveal() {
    const targets = $$('.reveal, .mask').filter((el) => !el.closest('.hero'));
    if (!('IntersectionObserver' in window) || reduced()) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    targets.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     Hero gem: facets catch the light (pointer, or a slow idle sweep).
     ------------------------------------------------------------------------ */

  function initHeroGem() {
    const svg = $('.gem-big');
    const hero = $('.hero');
    if (!svg || !hero || reduced()) return;

    const facets = $$('.facet', svg).map((poly) => {
      const pts = poly.getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return { poly, angle: Math.atan2(cy - 42, cx - 50) };
    });

    let angle = -Math.PI * 0.75;
    let target = angle;
    let pointing = false;
    let visible = true;
    let frame = 0;

    const paint = () => {
      facets.forEach((f) => {
        const d = Math.cos(f.angle - angle);
        const b = 0.08 + 0.86 * Math.pow((d + 1) / 2, 2.4);
        f.poly.style.fillOpacity = b.toFixed(3);
      });
    };

    const loop = () => {
      frame = 0;
      if (!visible) return;
      if (pointing) {
        const diff = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
        angle += diff * 0.12;
      } else {
        angle += 0.006;
      }
      paint();
      frame = requestAnimationFrame(loop);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !frame) frame = requestAnimationFrame(loop);
      }).observe(hero);
    }
    frame = requestAnimationFrame(loop);

    if (mqFine.matches) {
      hero.addEventListener('pointermove', (ev) => {
        const r = svg.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        target = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        pointing = true;
        const nx = clamp((ev.clientX - cx) / (window.innerWidth / 2), -1, 1);
        const ny = clamp((ev.clientY - cy) / (window.innerHeight / 2), -1, 1);
        svg.style.transform = `rotateY(${(nx * 18).toFixed(2)}deg) rotateX(${(-ny * 14).toFixed(2)}deg)`;
      });
      hero.addEventListener('pointerleave', () => {
        pointing = false;
        svg.style.transform = '';
      });
    }
  }

  /* ------------------------------------------------------------------------
     Projects: scope filters, GlowCart's LCD.
     ------------------------------------------------------------------------ */

  function initScopes() {
    const buttons = $$('[data-scope]');
    if (!buttons.length) return;
    const items = $$('.records [data-tags], .more__list [data-tags]');
    const empty = $('.more__empty');
    const count = $('[data-scope-count]');
    const status = $('[data-scope-status]');
    const moreCount = $('[data-more-count]');
    const plural = (n) => `${n} row${n === 1 ? '' : 's'}`;

    buttons.forEach((btn) => btn.addEventListener('click', () => {
      const scope = btn.dataset.scope;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));

      let shown = 0;
      let moreShown = 0;
      items.forEach((item) => {
        const match = scope === 'all' || item.dataset.tags.split(' ').includes(scope);
        const wasHidden = item.hidden;
        item.hidden = !match;
        if (!match) return;
        shown += 1;
        if (item.closest('.more__list')) moreShown += 1;
        if (wasHidden && !reduced()) {
          item.classList.remove('is-entering');
          void item.offsetWidth;
          item.classList.add('is-entering');
        }
      });

      if (empty) empty.hidden = moreShown > 0;
      if (count) count.textContent = plural(shown);
      if (moreCount) moreCount.textContent = `# => ${plural(moreShown)}`;
      if (status) status.textContent = `Showing ${shown} of ${items.length} projects${scope === 'all' ? '' : ` tagged ${scope}`}.`;

      const sql = scope === 'all'
        ? 'SELECT "projects".* FROM "projects"'
        : `SELECT "projects".* FROM "projects" WHERE {r:'${scope}'} = ANY("tags")`;
      Log.push(`  Project Load (${ms(0.2, 0.8)}ms)  ${sql}  {m:[${plural(shown)}]}`);
      Rail.measure();
    }));
  }

  // Mirrors the real sketch: an order switches the indicator on for 7 seconds.
  function initGlowCart() {
    const card = $('.record--glowcart');
    const cover = card && $('.record__cover', card);
    if (!cover) return;
    let timer = 0;
    const order = () => {
      if (!card.classList.contains('is-order')) {
        Log.push('  Arduino  Serial.write("1")  {m:→ LED on for} {r:7000ms}');
      }
      card.classList.add('is-order');
      clearTimeout(timer);
      timer = setTimeout(() => card.classList.remove('is-order'), 7000);
    };
    cover.addEventListener('pointerenter', order);
    cover.addEventListener('click', order);
  }

  /* ------------------------------------------------------------------------
     Small narrations: callbacks, links.
     ------------------------------------------------------------------------ */

  // Hovering a before_action highlights its row in the timeline (and back).
  function initCallbacks() {
    $$('.cb').forEach((link) => {
      const row = document.getElementById(link.dataset.cb);
      if (!row) return;
      const lightRow = (on) => () => row.classList.toggle('is-lit', on);
      const lightLink = (on) => () => link.classList.toggle('is-lit', on);
      link.addEventListener('pointerenter', lightRow(true));
      link.addEventListener('pointerleave', lightRow(false));
      link.addEventListener('focus', lightRow(true));
      link.addEventListener('blur', lightRow(false));
      row.addEventListener('pointerenter', lightLink(true));
      row.addEventListener('pointerleave', lightLink(false));
      link.addEventListener('click', () => {
        const sym = $('.sym', link);
        Log.push(`  {m:before_action} {r:${sym ? sym.textContent : link.dataset.cb}} {g:✓}`);
      });
    });
  }

  function initHoverLog() {
    const seen = new WeakMap();
    const handle = (ev) => {
      const el = ev.target instanceof Element ? ev.target.closest('[data-log]') : null;
      if (!el) return;
      const now = performance.now();
      if (now - (seen.get(el) || -Infinity) < 5000) return;
      seen.set(el, now);
      Log.push(el.dataset.log);
    };
    document.addEventListener('pointerover', (ev) => { if (ev.pointerType === 'mouse') handle(ev); });
    document.addEventListener('focusin', handle);
  }

  /* ------------------------------------------------------------------------
     Off-duty tiles: a card with photos follows the pointer, and tiles with
     audio stream Apple Music's official 30-second previews. Sound is opt-in:
     nothing plays until the visitor flips the toggle or clicks a tile.
     Content lives in the #peek-data JSON block in index.html.
     ------------------------------------------------------------------------ */

  function initPeeks() {
    const tiles = $$('[data-peek]');
    const dataEl = $('#peek-data');
    if (!tiles.length || !dataEl) return;
    let data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

    const toggle = $('[data-sound-toggle]');
    const toggleLabel = $('[data-sound-label]');
    const status = $('[data-peek-status]');
    const config = (tile) => data[tile.dataset.peek] || { items: [] };
    const hasSound = (tile) => config(tile).items.some((item) => item.audio || item.vim);

    /* ---- Audio: one shared element for previews, Web Audio for key clicks ---- */

    const player = new Audio();
    player.preload = 'none';
    player.loop = true;
    const resumeAt = new Map();
    let soundOn = false;
    let unlocked = false;
    let currentSrc = '';
    let wantPlaying = false;
    let fadeFrame = 0;
    let ctx = null;
    let noise = null;

    function fadeTo(target, duration, done) {
      cancelAnimationFrame(fadeFrame);
      const from = player.volume;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / duration);
        player.volume = clamp(from + (target - from) * k, 0, 1);
        if (k < 1) fadeFrame = requestAnimationFrame(step);
        else if (done) done();
      };
      fadeFrame = requestAnimationFrame(step);
    }

    async function playPreview(item) {
      wantPlaying = true;
      if (currentSrc !== item.audio) {
        if (currentSrc) resumeAt.set(currentSrc, player.currentTime);
        currentSrc = item.audio;
        player.src = item.audio;
        const at = resumeAt.get(item.audio);
        if (at) player.addEventListener('loadedmetadata', () => { player.currentTime = at; }, { once: true });
      }
      player.volume = 0;
      try {
        await player.play();
      } catch (e) {
        return false; // blocked until a click, or interrupted by a newer request
      }
      if (!wantPlaying) {
        player.pause();
        return false;
      }
      fadeTo(0.75, 450);
      return true;
    }

    function stopPreview() {
      wantPlaying = false;
      if (player.paused) return;
      fadeTo(0, 300, () => { if (!wantPlaying) player.pause(); });
    }

    // A tiny silent WAV: playing it inside a click "unlocks" the element in Safari,
    // so later hovers can start previews without another click.
    function silentWav() {
      const samples = 800;
      const buf = new ArrayBuffer(44 + samples * 2);
      const v = new DataView(buf);
      const str = (offset, text) => { for (let i = 0; i < text.length; i += 1) v.setUint8(offset + i, text.charCodeAt(i)); };
      str(0, 'RIFF');
      v.setUint32(4, 36 + samples * 2, true);
      str(8, 'WAVE');
      str(12, 'fmt ');
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true);
      v.setUint32(28, 16000, true);
      v.setUint16(32, 2, true);
      v.setUint16(34, 16, true);
      str(36, 'data');
      v.setUint32(40, samples * 2, true);
      return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    }

    function unlock(realPlayFollows) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !ctx) ctx = new AC();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (unlocked) return;
      unlocked = true;
      if (realPlayFollows || currentSrc) return;
      player.src = silentWav();
      player.play().then(() => player.pause()).catch(() => {});
    }

    // Synthesised mechanical key: a short filtered noise click plus a low "thock".
    function keyClick(heavy) {
      if (!soundOn || !ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      if (!noise) {
        noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      }
      const click = ctx.createBufferSource();
      click.buffer = noise;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = heavy ? 1600 : 2400 + Math.random() * 900;
      band.Q.value = 0.8;
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(heavy ? 0.55 : 0.4, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      click.connect(band);
      band.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(t);

      const thock = ctx.createOscillator();
      thock.frequency.setValueAtTime(heavy ? 110 : 160, t);
      thock.frequency.exponentialRampToValueAtTime(55, t + 0.06);
      const thockGain = ctx.createGain();
      thockGain.gain.setValueAtTime(0.22, t);
      thockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      thock.connect(thockGain);
      thockGain.connect(ctx.destination);
      thock.start(t);
      thock.stop(t + 0.08);
    }

    /* ---- The card ---- */

    const peek = document.createElement('div');
    peek.className = 'peek';
    peek.setAttribute('aria-hidden', 'true');
    peek.innerHTML = '<div class="peek__inner"><div class="peek__frame"></div>'
      + '<p class="peek__cap"><span class="peek__kicker"></span><span class="eq"><i></i><i></i><i></i></span>'
      + '<span class="peek__title"></span><span class="peek__hint"></span></p></div>';
    document.body.appendChild(peek);
    const inner = $('.peek__inner', peek);
    const frame = $('.peek__frame', peek);
    const kickerEl = $('.peek__kicker', peek);
    const titleEl = $('.peek__title', peek);
    const hintEl = $('.peek__hint', peek);

    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let follow = 0;

    function aim(px, py) {
      const w = peek.offsetWidth;
      const h = peek.offsetHeight;
      let nx = px + 28;
      if (nx + w > window.innerWidth - 12) nx = px - 28 - w;
      tx = clamp(nx, 12, Math.max(12, window.innerWidth - w - 12));
      ty = clamp(py - h * 0.55, 12, Math.max(12, window.innerHeight - h - 12));
    }

    function glide() {
      follow = 0;
      const k = reduced() ? 1 : 0.2;
      x += (tx - x) * k;
      y += (ty - y) * k;
      peek.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (!reduced()) inner.style.setProperty('--r', `${clamp((tx - x) * 0.05, -8, 8).toFixed(2)}deg`);
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) follow = requestAnimationFrame(glide);
    }
    const kick = () => { if (!follow) follow = requestAnimationFrame(glide); };

    let activeTile = null;
    let activeSource = 'mouse';
    let imageIndex = 0;
    let images = []; // [{ src, title? }] for the item on the card
    let travel = 0;
    let lastX = 0;
    let lastY = 0;
    let vimTimer = 0;
    const itemIndex = new Map();
    const loggedAt = new Map();
    const currentItem = (tile) => config(tile).items[itemIndex.get(tile) || 0] || {};

    function vimCard() {
      const el = document.createElement('div');
      el.className = 'vimcard';
      el.innerHTML = [
        '<div class="vimcard__buf">',
        '<p><span class="ln">1</span><span class="k">class</span> <span class="c">Human</span></p>',
        '<p><span class="ln">2</span>  <span class="k">def</span> hobbies</p>',
        '<p><span class="ln">3</span>    <span class="s">%w[music games design vim]</span></p>',
        '<p><span class="ln">4</span>  <span class="k">end</span></p>',
        '<p><span class="ln">5</span><span class="k">end</span></p>',
        '<p class="tilde">~</p><p class="tilde">~</p><p class="tilde">~</p>',
        '</div>',
        '<p class="vimcard__status"><span class="vimcard__mode">NORMAL</span>human.rb</p>',
        '<p class="vimcard__cmd"><span data-vim-cmd></span><span class="vimcard__cursor"></span></p>',
      ].join('');
      return el;
    }

    function runVim() {
      clearTimeout(vimTimer);
      const cmd = $('[data-vim-cmd]', frame);
      if (!cmd) return;
      const written = '"human.rb" 5L, 67B written';
      if (reduced()) {
        cmd.textContent = written;
        return;
      }
      const keys = [':', 'w', 'q'];
      let i = 0;
      cmd.textContent = '';
      const type = () => {
        if (i < keys.length) {
          cmd.textContent += keys[i];
          keyClick(i === 0);
          i += 1;
          vimTimer = setTimeout(type, 160 + Math.random() * 120);
          return;
        }
        keyClick(true); // Enter
        cmd.textContent = written;
        vimTimer = setTimeout(() => {
          i = 0;
          cmd.textContent = '';
          vimTimer = setTimeout(type, 500);
        }, 1800);
      };
      vimTimer = setTimeout(type, 380);
    }

    function hint(tile) {
      const item = currentItem(tile);
      let text = '';
      if (item.audio && !soundOn) text = activeSource === 'touch' ? 'tap to play' : 'click to play';
      else if (config(tile).items.length > 1) text = activeSource === 'touch' ? 'tap for next' : 'click for next';
      else if ((item.images || []).length > 1) text = activeSource === 'mouse' ? 'move to flip' : 'tap for next';
      hintEl.textContent = text;
    }

    function render(tile) {
      const item = currentItem(tile);
      frame.textContent = '';
      imageIndex = 0;
      clearTimeout(vimTimer);
      if (item.vim) frame.appendChild(vimCard());
      // An image is a path, or { "src": path, "title": caption } to caption it.
      images = (item.images || []).map((img) => (typeof img === 'string' ? { src: img } : img));
      images.forEach(({ src }, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.decoding = 'async';
        if (i === 0) img.className = 'is-shown';
        frame.appendChild(img);
      });
      kickerEl.textContent = item.kicker ? `# ${item.kicker}` : '';
      titleEl.textContent = (images[0] && images[0].title) || item.title || '';
      peek.classList.toggle('has-audio', Boolean(item.audio));
      hint(tile);
      if (item.vim) runVim();
    }

    function flip(step) {
      const imgs = frame.querySelectorAll('img');
      if (imgs.length < 2) return;
      imageIndex = (imageIndex + step + imgs.length) % imgs.length;
      imgs.forEach((img, i) => img.classList.toggle('is-shown', i === imageIndex));
      const caption = images[imageIndex] && images[imageIndex].title;
      if (caption) titleEl.textContent = caption;
    }

    // state: 'off' | 'loading' | 'playing'
    function nowPlaying(tile, state) {
      const item = currentItem(tile);
      const label = item.track || item.title || '';
      const playing = state === 'playing';
      peek.classList.toggle('is-playing', playing);
      const line = $('.obj__now', tile);
      if (line) {
        line.hidden = state === 'off';
        line.classList.toggle('is-playing', playing);
        const title = $('[data-now-title]', line);
        const link = $('[data-now-link]', line);
        if (title) title.textContent = label;
        if (link && item.link) link.href = item.link;
      }
      if (status) status.textContent = playing ? `Playing a 30-second preview: ${label}.` : '';
      if (playing) Log.push(`  Rendered humans/{b:${tile.dataset.partial}}  {m:♪} ${label} {m:(preview)}`);
    }

    async function startAudio(tile) {
      const item = currentItem(tile);
      if (!soundOn || !item.audio) {
        nowPlaying(tile, 'off');
        return;
      }
      nowPlaying(tile, 'loading');
      const ok = await playPreview(item);
      if (activeTile === tile && currentItem(tile) === item) nowPlaying(tile, ok ? 'playing' : 'off');
    }

    function activate(tile, px, py, source) {
      if (activeTile && activeTile !== tile) deactivate();
      activeTile = tile;
      activeSource = source;
      tile.classList.add('is-active');
      render(tile);
      aim(px, py);
      x = tx;
      y = ty;
      glide();
      peek.classList.add('is-on');
      travel = 0;
      lastX = px;
      lastY = py;
      const now = performance.now();
      if (!currentItem(tile).audio && now - (loggedAt.get(tile) || -Infinity) > 4000) {
        loggedAt.set(tile, now);
        Log.push(`  Rendered humans/{b:${tile.dataset.partial}} (Duration: ${ms(0.2, 1.4)}ms)`);
      }
      startAudio(tile);
    }

    function deactivate() {
      if (!activeTile) return;
      const tile = activeTile;
      activeTile = null;
      tile.classList.remove('is-active');
      const line = $('.obj__now', tile);
      if (line) line.hidden = true;
      peek.classList.remove('is-on', 'is-playing');
      clearTimeout(vimTimer);
      stopPreview();
      if (status) status.textContent = '';
    }

    function advance(tile) {
      const items = config(tile).items;
      const item = currentItem(tile);
      if (items.length > 1) {
        itemIndex.set(tile, ((itemIndex.get(tile) || 0) + 1) % items.length);
        render(tile);
        startAudio(tile);
      } else if ((item.images || []).length > 1) {
        flip(1);
      } else if (item.vim) {
        runVim();
      } else if (item.audio) {
        if (wantPlaying) {
          stopPreview();
          nowPlaying(tile, 'off');
        } else {
          startAudio(tile);
        }
      }
    }

    function setSound(on) {
      soundOn = on;
      if (toggle) toggle.setAttribute('aria-pressed', String(on));
      if (toggleLabel) toggleLabel.textContent = `sound: ${on ? 'on' : 'off'}`;
      const item = activeTile ? currentItem(activeTile) : null;
      if (on) {
        unlock(Boolean(item && item.audio));
        if (activeTile) {
          hint(activeTile);
          startAudio(activeTile);
        }
      } else {
        stopPreview();
        if (activeTile) {
          nowPlaying(activeTile, 'off');
          hint(activeTile);
        }
      }
      Log.push(`  {m:Rails.application.config.}sound = {b:${on}}`);
    }

    if (toggle) toggle.addEventListener('click', () => setSound(!soundOn));

    /* ---- Input: mouse hover, touch taps, keyboard focus ---- */

    let lastPointer = 'mouse';
    const anchor = (tile) => {
      const r = tile.getBoundingClientRect();
      return [r.left + r.width * 0.62, r.top + r.height * 0.4];
    };

    document.addEventListener('pointerdown', (ev) => {
      lastPointer = ev.pointerType || 'mouse';
      if (activeTile && activeSource !== 'mouse' && !activeTile.contains(ev.target)) deactivate();
    }, true);

    tiles.forEach((tile) => {
      const btn = $('.obj__btn', tile);

      tile.addEventListener('pointerenter', (ev) => {
        if (ev.pointerType === 'mouse') activate(tile, ev.clientX, ev.clientY, 'mouse');
      });
      tile.addEventListener('pointermove', (ev) => {
        if (ev.pointerType !== 'mouse' || activeTile !== tile) return;
        aim(ev.clientX, ev.clientY);
        kick();
        travel += Math.hypot(ev.clientX - lastX, ev.clientY - lastY);
        lastX = ev.clientX;
        lastY = ev.clientY;
        if (travel > 160) {
          travel = 0;
          flip(1);
        }
      });
      tile.addEventListener('pointerleave', (ev) => {
        if (ev.pointerType === 'mouse' && activeTile === tile && activeSource === 'mouse') deactivate();
      });

      if (!btn) return;
      btn.addEventListener('click', (ev) => {
        let fresh = false;
        if (activeTile !== tile) {
          const keyboard = ev.detail === 0;
          const [ax, ay] = anchor(tile);
          const source = keyboard ? 'keyboard' : (lastPointer === 'mouse' ? 'mouse' : 'touch');
          activate(tile, keyboard ? ax : ev.clientX, keyboard ? ay : ev.clientY, source);
          fresh = true;
        }
        if (!soundOn && hasSound(tile)) {
          setSound(true);
          return;
        }
        if (!fresh) advance(tile);
      });
      btn.addEventListener('focus', () => {
        if (activeTile === tile || !btn.matches(':focus-visible')) return;
        const [ax, ay] = anchor(tile);
        activate(tile, ax, ay, 'keyboard');
      });
      // Keyboard: stay open while focus moves inside the tile (e.g. to its Apple Music link).
      tile.addEventListener('focusout', (ev) => {
        if (activeTile === tile && activeSource === 'keyboard' && !tile.contains(ev.relatedTarget)) deactivate();
      });
    });

    // Touch and keyboard cards stay pinned to their tile while the page scrolls.
    window.addEventListener('scroll', () => {
      if (!activeTile || activeSource === 'mouse') return;
      const [ax, ay] = anchor(activeTile);
      aim(ax, ay);
      kick();
    }, { passive: true });

    const section = $('#offline');
    if (section && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) deactivate(); }).observe(section);
    }
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') deactivate(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) deactivate(); });
    player.addEventListener('error', () => {
      if (!activeTile || !wantPlaying || !currentSrc) return;
      hintEl.textContent = 'preview unavailable';
      nowPlaying(activeTile, 'off');
      Log.push('  {r:ActionController::MissingFile} preview unavailable');
    });
  }

  /* ------------------------------------------------------------------------
     Contact: copy email, compose via mailto.
     ------------------------------------------------------------------------ */

  function initCopy() {
    $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      btn.textContent = ok ? 'copied ✓' : 'copy failed';
      Log.push(ok ? `  {m:Clipboard} wrote {b:${text}} {g:✓}` : '  {r:Clipboard blocked.} Select the address instead.');
      setTimeout(() => { btn.textContent = 'copy'; }, 2200);
    }));
  }

  function initComposer() {
    const form = $('[data-composer]');
    if (!form) return;
    const error = $('#msg-error');
    const bodyField = form.elements.body;
    const fromField = form.elements.from;

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const from = fromField.value.trim();
      const body = bodyField.value.trim();
      if (!body) {
        error.textContent = "ActiveRecord::RecordInvalid: Body can't be blank";
        bodyField.setAttribute('aria-invalid', 'true');
        bodyField.focus();
        Log.push("{r:ActiveRecord::RecordInvalid} Validation failed: Body can't be blank", 'Completed {r:422 Unprocessable Content}');
        return;
      }
      error.textContent = '';
      bodyField.removeAttribute('aria-invalid');
      const subject = from ? `Hello from ${from}` : 'Hello from your site';
      const text = from ? `${body}\n\n— ${from}` : body;
      Log.push(
        `{r:Started} POST "/hello" for you at ${npStamp()}`,
        '  Parameters: {"message"=>{"from"=>"[FILTERED]", "body"=>"[FILTERED]"}}',
        `Redirected to {b:mailto:${EMAIL}}`,
        `Completed {g:302 Found} in ${ms(2, 9)}ms`,
      );
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    });

    bodyField.addEventListener('input', () => {
      if (!error.textContent) return;
      error.textContent = '';
      bodyField.removeAttribute('aria-invalid');
    });
  }

  /* ------------------------------------------------------------------------
     Small-screen routes sheet
     ------------------------------------------------------------------------ */

  function initSheet() {
    const sheet = $('#routes-sheet');
    const btn = $('.menu-toggle');
    if (!sheet || !btn) return;
    if (typeof sheet.showModal !== 'function') {
      btn.addEventListener('click', () => $('#routes').scrollIntoView());
      return;
    }
    btn.addEventListener('click', () => {
      sheet.showModal();
      btn.setAttribute('aria-expanded', 'true');
      Log.push('{m:$} bin/rails routes');
    });
    sheet.addEventListener('close', () => btn.setAttribute('aria-expanded', 'false'));
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) sheet.close(); });
    $('[data-sheet-close]', sheet).addEventListener('click', () => sheet.close());
    $$('a', sheet).forEach((a) => a.addEventListener('click', () => sheet.close()));
  }

  /* ------------------------------------------------------------------------
     Vim mode: j/k sections, gg/G, and a `:` command line.
     Single-key shortcuts can be switched off (footer button or :set novim).
     ------------------------------------------------------------------------ */

  function initVim(theme) {
    const bar = $('.cmdline');
    const input = $('#cmd-input');
    const msg = $('.cmdline__msg');
    const toggle = $('[data-vim-toggle]');
    if (!bar || !input || !msg) return;

    const SECTIONS = ['top', 'routes', 'story', 'work', 'oss', 'offline', 'hello'];
    const HELP = ':story :work :oss :offline :hello :top · j/k gg G · :theme · :log · :set novim';
    let enabled = store.get('vim') !== 'off';
    let lastG = -Infinity;
    let msgTimer = 0;

    const syncToggle = () => {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.textContent = `vim keys: ${enabled ? 'on' : 'off'}`;
    };
    const setEnabled = (on) => {
      enabled = on;
      store.set('vim', on ? 'on' : 'off');
      syncToggle();
    };
    if (toggle) {
      toggle.addEventListener('click', () => {
        setEnabled(!enabled);
        Log.push(`{m::set} ${enabled ? 'vim' : 'novim'}`);
      });
    }
    syncToggle();

    const close = () => {
      clearTimeout(msgTimer);
      bar.hidden = true;
      bar.classList.remove('is-msg');
    };
    const open = () => {
      clearTimeout(msgTimer);
      bar.classList.remove('is-msg');
      bar.hidden = false;
      input.value = '';
      input.focus();
    };
    const say = (text, isError = false) => {
      clearTimeout(msgTimer);
      bar.hidden = false;
      bar.classList.add('is-msg');
      msg.textContent = text;
      msg.classList.toggle('is-err', isError);
      if (document.activeElement === input) input.blur();
      msgTimer = setTimeout(close, 3200);
    };
    const goTo = (id) => {
      close();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: scrollBehavior() });
    };

    const run = (raw) => {
      const cmd = raw.trim().replace(/^:+/, '');
      if (!cmd) { close(); return; }
      Log.push(`{m::}${cmd}`);
      const [name, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(' ');
      if (SECTIONS.includes(name)) { goTo(name); return; }
      switch (name) {
        case 'q':
        case 'quit':
          say('E37: No write since last change (add ! to override)', true);
          break;
        case 'q!':
        case 'qa!':
          say('Nice try. Closing the tab is your job.');
          break;
        case 'w':
          say('"sparsha.html" written. (Nothing was written.)');
          break;
        case 'wq':
        case 'x':
          say('Saved and quit. Just kidding, still here.');
          break;
        case 'h':
        case 'help':
          say(HELP);
          break;
        case 'theme':
          close();
          theme.toggle();
          break;
        case 'log':
          close();
          Log.toggle();
          break;
        case 'e':
        case 'edit':
          if (SECTIONS.includes(arg)) goTo(arg);
          else say(`E492: No such section: ${arg || '(none)'}`, true);
          break;
        case 'set':
          if (/^(bg|background)=(dark|light)$/.test(arg)) {
            close();
            theme.set(arg.endsWith('dark') ? 'night' : 'day');
          } else if (arg === 'novim') {
            setEnabled(false);
            say('Vim keys off. The footer button turns them back on.');
          } else if (arg === 'vim') {
            setEnabled(true);
            say('Vim keys on.');
          } else {
            say(`E518: Unknown option: ${arg || '(none)'}`, true);
          }
          break;
        default:
          say(`E492: Not an editor command: ${cmd}`, true);
      }
    };

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        run(input.value);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        close();
      }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== input && !bar.classList.contains('is-msg')) close();
      }, 120);
    });

    document.addEventListener('keydown', (ev) => {
      if (!enabled || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (doc.classList.contains('is-booting')) return;
      const t = ev.target;
      if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return;

      switch (ev.key) {
        case 'j':
          ev.preventDefault();
          Rail.go(1);
          break;
        case 'k':
          ev.preventDefault();
          Rail.go(-1);
          break;
        case 'G':
          ev.preventDefault();
          window.scrollTo({ top: doc.scrollHeight, behavior: scrollBehavior() });
          break;
        case 'g': {
          const now = performance.now();
          if (now - lastG < 450) {
            ev.preventDefault();
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
            lastG = -Infinity;
          } else {
            lastG = now;
          }
          break;
        }
        case ':':
          ev.preventDefault();
          open();
          break;
        case '?':
          ev.preventDefault();
          say(HELP);
          break;
        case 'Escape':
          if (!bar.hidden) close();
          break;
        default:
          break;
      }
    });
  }

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */

  function ready() {
    doc.classList.add('is-ready');
    Log.show();
    Log.push(`{r:Started} GET "/sparsha" for you at ${npStamp()}`);
    initReveal();
    Rail.start();
  }

  function init() {
    initClock();
    const theme = initTheme();
    initSheet();
    initScopes();
    initGlowCart();
    initPeeks();
    initCallbacks();
    initCopy();
    initComposer();
    initHoverLog();
    initHeroGem();
    initVim(theme);
    Rail.init();
    runBoot(ready);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
