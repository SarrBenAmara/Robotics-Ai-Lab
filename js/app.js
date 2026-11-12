/* =========================================================================
   app.js : router, pages, dashboards, UI helpers
   Virtual Robotics & AI Lab, by Mrs Sarra Ben Amara
   ========================================================================= */
(function () {
  const esc = s => VL.esc(s);
  const $ = (s, el = document) => el.querySelector(s);
  const S = () => VL.Store;

  /* ------------------------------ UI helpers ------------------------------ */
  const ui = VL.ui = {};
  ui.modal = ({ title, body, wide, onOpen, buttons }) => {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-bg"><div class="modal glass ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><h3>${title}</h3><button class="x" aria-label="Close">✕</button></div><div class="modal-b">${body}</div>${buttons ? `<div class="modal-f">${buttons.map((b, i) => `<button class="${b.primary ? 'btn-primary' : 'btn-sm'}" data-mb="${i}">${b.label}</button>`).join('')}</div>` : ''}</div></div>`;
    root.hidden = false;
    $('.x', root).onclick = ui.close; $('.modal-bg', root).onclick = e => { if (e.target.classList.contains('modal-bg')) ui.close(); };
    if (buttons) root.querySelectorAll('[data-mb]').forEach(b => b.onclick = () => { const fn = buttons[+b.dataset.mb].onClick; if (!fn || fn(root) !== false) ui.close(); });
    onOpen && onOpen(root);
  };
  ui.close = () => { const r = $('#modal-root'); r.hidden = true; r.innerHTML = ''; };
  ui.confirm = (title, text, ok) => ui.modal({ title, body: `<p>${text}</p>`, buttons: [{ label: 'Cancel' }, { label: 'Yes', primary: true, onClick: ok }] });
  ui.prompt = (title, text, def, ok) => ui.modal({ title, body: `<p>${text}</p><input class="inp" value="${esc(def || '')}" maxlength="60">`, onOpen: r => { const i = $('input', r); i.focus(); i.select(); i.onkeydown = e => { if (e.key === 'Enter') { const v = i.value.trim(); if (v) { ui.close(); ok(v); } } }; }, buttons: [{ label: 'Cancel' }, { label: 'OK', primary: true, onClick: r => { const v = $('input', r).value.trim(); if (!v) return false; ok(v); } }] });
  ui.toast = (html) => { const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2800); setTimeout(() => t.remove(), 3300); };
  const ago = t => { if (!t) return '—'; const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return Math.floor(s / 86400) + ' d ago'; };

  /* ------------------------------ icons ------------------------------ */
  const ICON = {
    electronics: `<svg viewBox="0 0 120 90"><rect x="8" y="46" width="104" height="34" rx="5" fill="#e8ebf1"/><g fill="#9aa3b2">${Array.from({ length: 12 }, (_, i) => `<rect x="${16 + i * 8}" y="54" width="3" height="3"/><rect x="${16 + i * 8}" y="62" width="3" height="3"/><rect x="${16 + i * 8}" y="70" width="3" height="3"/>`).join('')}</g><line x1="30" y1="56" x2="30" y2="30" stroke="#bbb" stroke-width="2"/><line x1="38" y1="56" x2="38" y2="30" stroke="#bbb" stroke-width="2"/><rect x="26" y="20" width="16" height="12" rx="3" fill="#3b82f6"/><line x1="58" y1="56" x2="58" y2="36" stroke="#bbb" stroke-width="2"/><line x1="72" y1="56" x2="72" y2="36" stroke="#bbb" stroke-width="2"/><rect x="54" y="18" width="22" height="9" rx="4" fill="#d8c39a" transform="rotate(90 65 22) translate(-5 -12)"/><line x1="90" y1="56" x2="90" y2="34" stroke="#bbb" stroke-width="2"/><line x1="98" y1="56" x2="98" y2="38" stroke="#bbb" stroke-width="2"/><circle cx="94" cy="24" r="10" fill="#ff2b2b"/><circle cx="94" cy="24" r="18" fill="#ff3b3b" opacity=".35"/></svg>`,
    electricity: `<svg viewBox="0 0 120 90"><path d="M44 6 L18 50 h20 l-8 34 L62 36 H42 l12 -30z" fill="#ffd21f" stroke="#ff9f1c" stroke-width="2"/><rect x="62" y="20" width="48" height="64" rx="8" fill="#f59e0b" stroke="#7c2d12" stroke-width="2"/><rect x="68" y="26" width="36" height="16" rx="3" fill="#cfe6a8"/><text x="86" y="38" font-size="11" text-anchor="middle" font-family="monospace" fill="#1b3a0e">5.00</text><circle cx="86" cy="62" r="11" fill="#1f2937"/><line x1="86" y1="62" x2="92" y2="54" stroke="#e5e7eb" stroke-width="2"/></svg>`,
    arduino: `<svg viewBox="0 0 120 90"><rect x="8" y="18" width="104" height="62" rx="6" fill="#1d6fd6" stroke="#0b3f86" stroke-width="2"/><rect x="18" y="24" width="84" height="5" fill="#111"/><rect x="40" y="70" width="64" height="5" fill="#111"/><rect x="50" y="42" width="42" height="14" rx="2" fill="#111"/><rect x="2" y="34" width="20" height="16" rx="2" fill="#c9ced6"/><rect x="2" y="56" width="16" height="12" rx="2" fill="#222"/><circle cx="30" cy="62" r="3" fill="#fff"/><text x="70" y="40" font-size="8" fill="#fff" text-anchor="middle" font-family="Arial" font-weight="bold">MICROCONTROLLER</text></svg>`,
    esp32: `<svg viewBox="0 0 120 90"><rect x="22" y="30" width="78" height="54" rx="4" fill="#141821" stroke="#2c3546"/><rect x="34" y="22" width="54" height="44" rx="3" fill="#1b2438"/><rect x="38" y="32" width="46" height="32" rx="2" fill="#c3c8d0"/><text x="61" y="52" font-size="9" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#333">ESP32</text><g fill="#d4af37">${Array.from({ length: 9 }, (_, i) => `<rect x="${26}" y="${36 + i * 5}" width="4" height="2.5"/><rect x="${92}" y="${36 + i * 5}" width="4" height="2.5"/>`).join('')}</g><path d="M86 18 a14 14 0 0 1 20 0" stroke="#22d3ee" stroke-width="3.5" fill="none"/><path d="M80 12 a22 22 0 0 1 32 0" stroke="#22d3ee" stroke-width="3.5" fill="none" opacity=".7"/><path d="M74 6 a30 30 0 0 1 44 0" stroke="#22d3ee" stroke-width="3.5" fill="none" opacity=".45"/><circle cx="96" cy="24" r="3" fill="#22d3ee"/></svg>`,
    rpi: `<svg viewBox="0 0 120 90"><rect x="8" y="22" width="104" height="60" rx="6" fill="#1f8a4c" stroke="#0f5a2e" stroke-width="2"/><g fill="#d4af37">${Array.from({ length: 16 }, (_, i) => `<rect x="${18 + i * 5.5}" y="26" width="3" height="3"/><rect x="${18 + i * 5.5}" y="31" width="3" height="3"/>`).join('')}</g><rect x="40" y="44" width="26" height="22" rx="2" fill="#2b2b2b"/><rect x="88" y="40" width="26" height="16" rx="2" fill="#c9ced6"/><rect x="88" y="60" width="26" height="16" rx="2" fill="#c9ced6"/><rect x="16" y="66" width="16" height="10" rx="2" fill="#c9ced6"/><circle cx="76" cy="16" r="9" fill="#ec4899"/><circle cx="68" cy="10" r="6" fill="#ec4899" opacity=".8"/><path d="M76 7 q4 -6 10 -4" stroke="#22c55e" stroke-width="3" fill="none"/></svg>`
  };
  const ROBOT = `<svg viewBox="0 0 160 190" class="robot"><defs><radialGradient id="rbH" cx=".4" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9d6ea"/></radialGradient></defs>
    <line x1="80" y1="12" x2="80" y2="30" stroke="#94a3b8" stroke-width="4"/><circle cx="80" cy="10" r="7" fill="#22d3ee" class="ant"/>
    <rect x="26" y="28" width="108" height="84" rx="40" fill="url(#rbH)"/><rect x="40" y="44" width="80" height="50" rx="24" fill="#0b1630"/>
    <ellipse cx="64" cy="68" rx="9" ry="11" fill="#22d3ee" class="eye"/><ellipse cx="96" cy="68" rx="9" ry="11" fill="#22d3ee" class="eye"/><path d="M68 84 q12 8 24 0" stroke="#22d3ee" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="18" y="58" width="10" height="24" rx="5" fill="#93c5fd"/><rect x="132" y="58" width="10" height="24" rx="5" fill="#93c5fd"/>
    <rect x="46" y="116" width="68" height="56" rx="22" fill="url(#rbH)"/><circle cx="80" cy="140" r="10" fill="#0b1630"/><circle cx="80" cy="140" r="5" fill="#22d3ee"/>
    <g class="arm"><rect x="112" y="118" width="40" height="13" rx="6.5" fill="#c9d6ea" transform="rotate(-50 114 124)"/><circle cx="146" cy="88" r="9" fill="#fff"/></g>
    <rect x="22" y="124" width="28" height="13" rx="6.5" fill="#c9d6ea" transform="rotate(30 48 130)"/></svg>`;
  VL.ICON = ICON;

  /* ------------------------------ router ------------------------------ */
  const routes = {
    home: renderHome, learn: renderLearn, lesson: renderLesson, lab: renderLab, projects: renderProjects,
    assistant: renderAssistant, progress: renderProgress, teacher: renderTeacher, explorer: renderExplorer, ohm: renderOhm,
    glesson: (v, id) => { VL.GLesson.mount(v, id); return () => VL.GLesson.unmount(); }
  };
  let current = null, cleanup = null;
  function route() {
    const h = (location.hash || '#home').slice(1);
    let name = h, arg = null;
    if (h.startsWith('world-')) { name = 'learn'; arg = h.slice(6); }
    if (h.startsWith('lesson-')) { name = 'glesson'; arg = h.slice(7); }
    VL.setBoard('esp32');
    if (!routes[name]) name = 'home';
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    current = name;
    if (['glesson', 'lesson', 'learn', 'lab', 'projects'].includes(name) && S().p.key && S().p.lastRoute !== '#' + h) { S().p.lastRoute = '#' + h; S().save(); }
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === name || ((name === 'lesson' || name === 'glesson') && a.dataset.r === 'learn') || ((name === 'explorer' || name === 'ohm') && a.dataset.r === 'learn')));
    document.body.dataset.page = name;
    const view = $('#view'); view.innerHTML = ''; view.className = 'view page-' + name;
    VL.Sarra.setContext(() => ({ page: name })); VL.Sarra.wbGetter(() => null);
    cleanup = routes[name](view, arg) || null;
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ------------------------------ header ------------------------------ */
  function renderHeader() {
    const p = S().p; const nm = p.name || S().meName || 'Student';
    $('#who').innerHTML = `<span class="av">${esc(nm.slice(0, 1).toUpperCase())}</span><span class="nm">${esc(nm)}</span>`;
    $('#sync').className = 'sync ' + S().mode; $('#sync').title = S().mode === 'cloud' ? 'Progress saved and shared with your teacher' : 'Progress saved on this computer only';
    $('.nav [data-r=teacher]').hidden = !S().isTeacher;
    const cc = S().classChallenge; const done = cc && p.challenges[cc.id];
    $('#bell').classList.toggle('dot', !!cc && !done); $('#bell').title = cc ? 'Class challenge: ' + cc.title : 'No class challenge yet';
  }

  /* ------------------------------ HOME ------------------------------ */
  function renderHome(v) {
    const p = S().p; const nx = VL.nextLesson() || { id: 'esp32-1', title: VL.LESSON1.title }; const pct = VL.lessonPct(nx.id); const n = pct; const nxW = VL.WORLDS.find(w => w.id === (VL.lessonById(nx.id) || { world: 'esp32' }).world);
    const lessonsDone = Object.values(p.lessons).filter(x => x.completed).length;
    const nm = p.name || S().meName || '';
    v.innerHTML = `
    <section class="hero">
      <div class="hero-left">
        <img src="img/sarra.webp" alt="Mrs Sarra Ben Amara, your robotics instructor" class="persona">
        <div class="greet glass">
          <h3>👋 Hello${nm ? ', ' + esc(nm.split(' ')[0]) : ', young engineers'}!</h3>
          <p>Welcome to your Virtual Robotics & AI Lab! Choose a learning path to explore, build, code, simulate and create your own robotic projects. Are you ready?</p>
          <div class="greet-b"><a class="btn-primary" href="${VL.lessonHref(nx.id)}">${n ? 'Continue my lesson' : 'Start my next lesson'} →</a><button class="btn-sm tts-only" data-say ${VL.Sarra.tts ? '' : 'hidden'}>🔊 Listen</button></div>
        </div>
      </div>
      <div class="hero-center">
        <canvas class="globe" aria-hidden="true"></canvas>
        <div class="title-wrap">
          <div class="pill">Your Window to the World of</div>
          <h1 class="mega">Robotics <span>&</span> AI</h1>
          <div class="sub">Electronics <i>•</i> Programming <i>•</i> Embedded Systems <i>•</i> Robotics <i>•</i> Artificial Intelligence</div>
          <p class="welcome">“Welcome to your Window to the World of Robotics!”</p>
        </div>
        <div class="worlds">
          ${VL.WORLDS.map((w, i) => `<a class="world" href="#world-${w.id}" style="--c:${w.color};--c2:${w.color2};--d:${i * 70}ms"><div class="w-ic">${ICON[w.icon]}</div><h3>${w.name}</h3><p>${w.tag}</p><span class="w-go">›</span><span class="w-live">${allWorldLessons(w.id).length} LESSONS</span></a>`).join('')}
        </div>
        <div class="platform"></div>
      </div>
      <div class="hero-right">${ROBOT}</div>
    </section>
    <section class="features glass">
      ${[['🛠', 'Build', 'Circuits', '#lesson'], ['▶️', 'Simulate', '& Test', '#lab'], ['&lt;/&gt;', 'Code', '(MicroPython)', '#lab'], ['〰', 'Measure', 'Voltage · Current · Signals', '#lab'], ['🧠', 'AI', 'Ask Mrs Sarra', '#assistant'], ['🤖', 'Robotics', 'Plan & Innovate', '#projects']].map(([i, a, b, h]) => `<a href="${h}" class="feat"><span class="fi">${i}</span><b>${a}</b><small>${b}</small></a>`).join('')}
    </section>
    <section class="home-bottom">
      <a class="hb glass" href="#projects"><div class="hb-t">Featured Project</div><div class="hb-row"><span class="hb-ic">🚗</span><div><b>Plan an Obstacle-Avoiding Robot</b><small>Design it step by step with Mrs Sarra</small></div><span class="play">▶</span></div></a>
      <a class="hb glass" href="${VL.lessonHref(nx.id)}"><div class="hb-t">Continue Learning</div><div class="hb-row"><span class="hb-ic">${ICON[nxW.icon]}</span><div><b>${nxW.name} · ${esc(nx.title)}</b><div class="pbar"><i style="width:${pct}%"></i></div></div><span class="pct">${pct}%</span><span class="play">▶</span></div></a>
      <a class="hb glass" href="#progress"><div class="hb-t">Your Journey</div><div class="hb-row"><span class="hb-ic">🏅</span><div><b>${lessonsDone} Lesson${lessonsDone === 1 ? '' : 's'} Completed</b><small>${p.projects.length} project${p.projects.length === 1 ? '' : 's'} saved · ${Object.keys(p.challenges).length} challenge${Object.keys(p.challenges).length === 1 ? '' : 's'} solved</small></div><span class="bars">▂▅▇</span></div></a>
    </section>`;
    const say = $('[data-say]', v); if (say) say.onclick = () => VL.Sarra.speak('Hello, young engineers! Welcome to your Virtual Robotics and AI Lab! Choose a learning path to explore, build, code, simulate and create your own robotic projects. Are you ready?');
    return globe($('.globe', v));
  }
  function globe(cv) {
    const ctx = cv.getContext('2d'); let raf, a = 0; const pts = [];
    for (let lat = -80; lat <= 80; lat += 8) { const n = Math.max(6, Math.round(46 * Math.cos(lat * Math.PI / 180))); for (let i = 0; i < n; i++) pts.push([lat * Math.PI / 180, i / n * Math.PI * 2, Math.random()]); }
    const draw = () => {
      const W = cv.clientWidth, H = cv.clientHeight, d = Math.min(2, devicePixelRatio || 1); if (cv.width !== W * d) { cv.width = W * d; cv.height = H * d; }
      ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
      const R = Math.min(W * 0.36, H * 0.46), cx = W / 2, cy = H * 0.5;
      const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25); g.addColorStop(0, 'rgba(34,211,238,0.16)'); g.addColorStop(0.7, 'rgba(59,130,246,0.08)'); g.addColorStop(1, 'rgba(59,130,246,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(56,189,248,0.25)'; ctx.lineWidth = 1;
      for (let m = 0; m < 12; m++) { const lon = m / 12 * Math.PI + a; ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(R * Math.cos(lon)), R, 0, 0, 7); ctx.stroke(); }
      for (let lat = -60; lat <= 60; lat += 30) { const y = cy - R * Math.sin(lat * Math.PI / 180), rr = R * Math.cos(lat * Math.PI / 180); ctx.beginPath(); ctx.ellipse(cx, y, rr, rr * 0.18, 0, 0, 7); ctx.stroke(); }
      pts.forEach(([la, lo, r]) => { const L = lo + a; const z = Math.cos(la) * Math.cos(L); if (z < -0.1) return; const x = cx + R * Math.cos(la) * Math.sin(L), y = cy - R * Math.sin(la); ctx.fillStyle = `rgba(${r > 0.93 ? '250,204,21' : '125,211,252'},${0.25 + z * 0.65})`; ctx.fillRect(x - 1, y - 1, r > 0.93 ? 2.6 : 1.8, r > 0.93 ? 2.6 : 1.8); });
      ctx.strokeStyle = 'rgba(168,85,247,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.05, R * 1.18, R * 0.28, -0.25, 0, 7); ctx.stroke();
      const t = a * 3; ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(cx + R * 1.18 * Math.cos(t), cy + R * 0.05 + R * 0.28 * Math.sin(t) - 0.25 * R * 1.18 * Math.cos(t) * 0.25, 3, 0, 7); ctx.fill();
      a += 0.0025; raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }

  /* ------------------------------ LEARN ------------------------------ */
  const allWorldLessons = wid => { const wl = VL.worldLessons(wid).map(l => ({ id: l.id, n: l.n, title: l.title, minutes: l.minutes, level: l.level })); return wid === 'esp32' ? [{ id: 'esp32-1', n: 1, title: VL.LESSON1.title, minutes: VL.LESSON1.minutes, level: 'Beginner' }, ...wl] : wl; };
  VL.allWorldLessons = allWorldLessons;
  VL.worldPct = wid => { const ls = allWorldLessons(wid); return ls.length ? Math.round(ls.reduce((a, l) => a + VL.lessonPct(l.id), 0) / ls.length) : 0; };
  VL.nextLesson = () => { for (const w of ['esp32', 'electronics', 'electricity', 'arduino', 'raspberrypi']) { const l = allWorldLessons(w).find(x => !VL.lessonDone(x.id)); if (l) return l; } return null; };
  function renderLearn(v, wid) {
    const w = VL.WORLDS.find(x => x.id === (wid || 'esp32')) || VL.WORLDS[3];
    const ls = allWorldLessons(w.id); const wp = VL.worldPct(w.id); const doneN = ls.filter(l => VL.lessonDone(l.id)).length;
    const l1 = S().lesson('esp32-1'); const st = VL.LESSON1.steps; const nd = st.filter(s => l1.steps[s.id]).length;
    const lessonRows = ls.map(l => { const pct = VL.lessonPct(l.id), dn = VL.lessonDone(l.id); return `<a class="lrow live ${dn ? 'done' : ''}" href="${VL.lessonHref(l.id)}">${dn ? '<span class="st ok">✓</span>' : pct ? '<span class="st go">▶</span>' : '<span class="st idle">' + l.n + '</span>'}<span>${l.n}. ${esc(l.title)}</span><em>${dn ? 'done' : pct ? pct + '%' : l.minutes + ' min'}</em></a>`; }).join('');
    const cards = ls.filter(l => w.id !== 'esp32' || l.id !== 'esp32-1').map(l => { const L = VL.lessonById(l.id); const pct = VL.lessonPct(l.id), dn = VL.lessonDone(l.id); const pr = L.practice; const kind = { code: '💻 Code lab', bench: '🧩 Breadboard lab', terminal: '⌨ Terminal', widget: '🎯 Challenge', predict: '🧠 Thinking task' }[pr.type]; return `<a class="lcard glass ${dn ? 'done' : ''}" href="${VL.lessonHref(l.id)}" style="--c:${w.color}"><div class="lc-n">${dn ? '✓' : l.n}</div><div class="lc-b"><b>${esc(l.title)}</b><small>${esc(L.objectives[0])}</small><div class="lc-tags"><span>${kind}</span><span>📝 Quiz</span><span>⏱ ${l.minutes} min</span><span>📶 ${l.level}</span></div><div class="pbar"><i style="width:${pct}%"></i></div></div></a>`; }).join('');
    v.innerHTML = `<div class="learn">
      <aside class="learn-side">
        <div class="sarra-mini glass"><img src="img/sarra-icon.webp" alt=""><p>“Welcome to the Learning Academy! 👋 Choose a learning world and start your journey step by step. I'll be with you in every lesson!”<br><i>Mrs Sarra</i></p></div>
        <div class="glass worldlist"><h3>Learning Worlds</h3>${VL.WORLDS.map(x => `<a href="#world-${x.id}" class="wl ${x.id === w.id ? 'on' : ''}" style="--c:${x.color}"><span class="wl-ic">${ICON[x.icon]}</span><span><b>${x.name}</b><small>${allWorldLessons(x.id).length} lessons · ${VL.worldPct(x.id)}%</small></span><span>›</span></a>`).join('')}</div>
        <div class="glass myprog"><h3>${w.name} progress</h3><div class="ring" style="--p:${wp}"><span>${wp}%</span></div><p>${doneN} / ${ls.length} lessons completed</p><a href="#progress" class="btn-xs">Open dashboard</a></div>
      </aside>
      <section class="learn-main">
        <div class="path-head glass" style="--c:${w.color}"><div class="ph-ic">${ICON[w.icon]}</div><div><div class="crumbs">Learn › ${w.name}</div><h1>${w.name} Learning Path</h1><p>${w.tag} · ${ls.length} lessons</p></div>${S().p.badges.includes('world-' + w.id) ? '<div class="wbadge">🏆 Master</div>' : ''}</div>
        ${w.id === 'esp32' ? `
        <div class="lesson-card glass">
          <div class="lc-top"><div><span class="tag">Module 1 · Lesson 1</span><h2>${esc(VL.LESSON1.title)}</h2><p>Discover the ESP32 board, explore its pins, learn GPIO, power and ground, then build, program, measure and troubleshoot a blinking LED.</p>
          <div class="obj"><h4>🎯 Learning objectives</h4>${VL.LESSON1.objectives.map(o => `<div>✓ ${esc(o)}</div>`).join('')}</div></div>
          <div class="lc-art">${ICON.esp32}</div></div>
          <div class="flow">${st.filter(s => s.id !== 'results').map((s, i) => `<a href="#lesson" data-step="${s.id}" class="fl ${l1.steps[s.id] ? 'done' : ''}"><span class="fn">${i + 1}</span><b>${s.name}</b><small>${s.desc}</small>${l1.steps[s.id] ? '<span class="ck">✓</span>' : ''}</a>`).join('<span class="farr">➜</span>')}</div>
          <div class="lc-foot"><a class="btn-primary" href="#lesson">▶ ${nd ? 'Continue lesson' : 'Start lesson'}</a><span class="meta">⏱ Estimated time: ${VL.LESSON1.minutes} min</span><span class="meta">📶 Difficulty: Beginner</span><span class="meta badge-m">🏅 Earn a badge: ESP32 Explorer</span></div>
        </div>` : ''}
        <div class="lcards">${cards}</div>
        <div class="glass live-tools"><h3>Also available</h3><a href="#explorer" class="btn-sm">🧊 3D Component Explorer</a> <a href="#lab" class="btn-sm">🧪 Free lab & challenges</a> <a href="#ohm" class="btn-sm">⚡ Ohm's Law Playground</a></div>
      </section>
      <aside class="learn-path glass"><h3>${w.name} Learning Path</h3><div class="pbar"><i style="width:${wp}%"></i></div>${lessonRows}</aside>
    </div>`;
    v.querySelectorAll('[data-step]').forEach(a => a.onclick = e => { e.preventDefault(); S().p.lastStep = Object.assign({}, S().p.lastStep, { 'esp32-1': a.dataset.step }); S().save(); location.hash = '#lesson'; });
  }
  function renderLesson(v) { VL.Lesson.mount(v); return () => VL.Lesson.unmount(); }

  /* ------------------------------ FREE LAB ------------------------------ */
  function renderLab(v) {
    const p = S().p; let board = p.labBoard3 || 'uno';
    const tabs = [['uno', 'Arduino UNO', 'C++'], ['esp32', 'ESP32', 'MicroPython'], ['rpi', 'Raspberry Pi', 'Python']];
    v.innerHTML = `<div class="lab"><div class="lab-head glass"><div><h1>${VL.icon('flask')} Engineering Lab</h1><p class="muted">A real bench for each board: place parts leg by leg in any hole, wire them, program the board and test. Mrs Sarra checks your circuit when you ask for a hint.</p>
      <div class="btabs">${tabs.map(([id, n, l]) => `<button class="btab ${id === board ? 'on' : ''}" data-b="${id}"><b>${n}</b><small>${l}</small></button>`).join('')}</div></div>
      <div class="chal"><div class="chal-cur"></div><div class="chal-row"><select class="chal-sel">${VL.CHALLENGES.map(c => `<option value="${c.id}">${c.level} · ${c.title}</option>`).join('')}</select><button class="btn-sm cyan" data-check>${VL.icon('check')} Check my solution</button></div><div class="chal-res"></div></div></div>
      <div class="l3host"></div></div>`;
    const sel = $('.chal-sel', v);
    const showCur = () => {
      const cc = S().classChallenge; const id = sel.value; const ch = (cc && cc.id === id) ? cc : VL.CHALLENGES.find(c => c.id === id);
      $('.chal-cur', v).innerHTML = `${cc && cc.id === id ? '<span class="from">From your teacher</span>' : ''}<b>${esc(ch.title)}</b> ${p.challenges[id] ? '<span class="ok">solved</span>' : ''}<p>${esc(ch.text)}</p>${cc && cc.note ? `<p class="note">“${esc(cc.note)}”</p>` : ''}`;
    };
    const cc = S().classChallenge; if (cc && VL.CHALLENGES.find(c => c.id === cc.id)) sel.value = cc.id;
    sel.onchange = () => { $('.chal-res', v).innerHTML = ''; showCur(); }; showCur();
    const lab = new VL.Lab3D($('.l3host', v), { board });
    v.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { p.labBoard3 = b.dataset.b; S().save(); route(); });
    $('[data-check]', v).onclick = () => {
      const r = VL.checkChallenge(sel.value, lab); const box = $('.chal-res', v);
      box.innerHTML = `<div class="fb ${r.ok ? 'ok' : 'no'}">${VL.icon(r.ok ? 'trophy' : 'target')} ${esc(r.msg)}</div>`;
      if (r.ok) { const firstSolve = !p.challenges[sel.value]; p.challenges[sel.value] = { at: Date.now(), code: lab.ed.value, board, circuit: lab.bench.toJSON() }; if (firstSolve) S().event('challenge', `${p.name || 'A student'} solved the challenge "${(VL.CHALLENGES.find(c => c.id === sel.value) || {}).title || sel.value}"`, true); S().skill('code', 8); S().save(); showCur(); }
      else S().mistake('CHAL_' + sel.value);
    };
    VL.Sarra.setContext(() => ({ page: 'Engineering Lab (' + board + ')', challenge: VL.CHALLENGES.find(c => c.id === sel.value), lab: lab.describe() }));
    VL.Sarra.wbGetter(() => lab);
    return () => lab.destroy();
  }

  /* ------------------------------ PROJECTS ------------------------------ */
  function renderProjects(v) {
    const p = S().p;
    const ideas = [
      { ic: '🚗', t: 'Obstacle-avoiding robot', d: 'Ultrasonic sensor + 2 motors + motor driver. Plan it with Mrs Sarra; motors and sensors are not simulated yet.', q: 'I want to create a robot that detects obstacles and changes direction.', state: 'Plan with AI' },
      { ic: '🚦', t: 'Traffic light', d: 'Three LEDs, three GPIOs, timed sequence. Fully buildable and testable in the lab today.', q: null, chal: 'traffic', state: 'Build in lab' },
      { ic: '🌙', t: 'Smart night light', d: 'Light sensor (LDR) + LED with PWM brightness. Plan it now; sensors arrive in a later lab update.', q: 'I want to build a smart night light that turns on an LED when it gets dark.', state: 'Plan with AI' },
      { ic: '🚨', t: 'Police lights', d: 'Two LEDs blinking alternately. Fully buildable and testable in the lab today.', chal: 'two', state: 'Build in lab' }
    ];
    v.innerHTML = `<div class="projects"><h1>🤖 Projects</h1>
      <h2>My saved projects</h2><div class="pgrid">${p.projects.length ? p.projects.slice().reverse().map((x, i) => `<div class="pc glass"><b>${esc(x.name)}</b><small>${new Date(x.savedAt).toLocaleString()}</small><span>${x.circuit.comps.length} parts · ${x.circuit.wires.length} wires · ${(x.code || '').split('\n').length} lines</span><div class="row"><button class="btn-xs" data-open="${p.projects.length - 1 - i}">Open in lab</button><button class="btn-xs danger" data-del="${p.projects.length - 1 - i}">Delete</button></div></div>`).join('') : '<p class="muted">No saved projects yet. In the lab, press 💾 Save.</p>'}</div>
      <h2>Project ideas</h2><div class="pgrid ideas">${ideas.map((x, i) => `<div class="pc glass idea"><span class="pic">${x.ic}</span><b>${x.t}</b><span>${x.d}</span><button class="btn-sm ${x.q ? 'ai-only' : 'cyan'}" data-idea="${i}">${x.state} →</button></div>`).join('')}</div>
      <h2>Challenges solved</h2><div class="pgrid">${VL.CHALLENGES.map(c => `<div class="pc glass ${p.challenges[c.id] ? 'solved' : ''}"><b>${p.challenges[c.id] ? '✅' : '◻️'} ${c.title}</b><span>${c.text}</span><small>${c.level}${p.challenges[c.id] ? ' · solved ' + ago(p.challenges[c.id].at) : ''}</small></div>`).join('')}</div></div>`;
    v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const x = p.projects[+b.dataset.open]; const bd = /void\s+setup/.test(x.code || '') ? 'uno' : 'esp32'; p.labBoard = bd; p.labWorks = p.labWorks || {}; p.labWorks[bd] = { circuit: x.circuit, code: x.code || VL.STARTER_CODE }; S().save(); location.hash = '#lab'; });
    v.querySelectorAll('[data-del]').forEach(b => b.onclick = () => ui.confirm('Delete project?', esc(p.projects[+b.dataset.del].name), () => { p.projects.splice(+b.dataset.del, 1); S().save(); renderProjects(v); }));
    v.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { const x = ideas[+b.dataset.idea]; if (x.q) { VL.Sarra.open(); $('#sarra-panel [data-mode=planner]').click(); VL.Sarra.ask(x.q, { mode: 'planner' }); } else { location.hash = '#lab'; setTimeout(() => { const s = $('.chal-sel'); if (s) { s.value = x.chal; s.onchange(); } }, 50); } });
  }

  /* ------------------------------ ASSISTANT ------------------------------ */
  function renderAssistant(v) {
    v.innerHTML = `<div class="assistant"><div class="as-hero glass"><img src="img/sarra.webp" alt="Mrs Sarra"><div><h1>Mrs Sarra · AI Robotics Instructor</h1>
      <p>I'm not just a picture: I read your <b>real circuit, code and simulation results</b> to help you think like an engineer. I'll never just hand you the answer: I guide you with progressive hints.</p>
      <div class="as-grid">
        <div class="glass"><h3>📚 Learning mode</h3><p>Explain concepts, guide exercises, and explain quiz answers.</p><button class="btn-sm ai-only" data-q="Can you explain what a GPIO pin is, with a simple example?">Explain GPIO to me</button></div>
        <div class="glass"><h3>🛠 Engineering lab mode</h3><p>Tell me what you want to create. I'll guide you from the idea to wiring, code and testing.</p><button class="btn-sm ai-only" data-plan>Plan a robot with me</button></div>
        <div class="glass"><h3>💡 Progressive hints</h3><p>Hint 1 asks a question, Hint 2 shows where to look, Hint 3 explains the fix. They work even offline.</p><a class="btn-sm" href="#lesson">Go to the lesson</a></div>
      </div>
      <p class="muted small ai-note-page" ${VL.Sarra.sample ? 'hidden' : ''}>Mrs Sarra answers from her built-in knowledge (no internet needed): acronyms, wiring for every sensor and board, lessons. Hints work everywhere.</p>
      <button class="btn-primary" data-open>Open the chat →</button></div></div></div>`;
    $('[data-open]', v).onclick = VL.Sarra.open;
    $('[data-plan]', v).onclick = () => { VL.Sarra.open(); $('#sarra-panel [data-mode=planner]').click(); const ta = $('#sarra-panel textarea'); ta.value = 'I want to create a robot that detects obstacles and changes direction.'; ta.focus(); };
    v.querySelectorAll('[data-q]').forEach(b => b.onclick = () => VL.Sarra.ask(b.dataset.q));
    VL.Sarra.open();
  }

  /* ------------------------------ STUDENT DASHBOARD ------------------------------ */
  function renderProgress(v) {
    const p = S().p; const l = S().lesson('esp32-1'); const st = VL.LESSON1.steps; const nd = st.filter(s => l.steps[s.id]).length;
    const nextStep = st.find(s => !l.steps[s.id]);
    const badges = [['esp32-explorer', '🏅', 'ESP32 Explorer', 'Complete ESP32 Lesson 1'], ['challenger', '🏆', 'Challenger', 'Solve 3 lab challenges'], ...VL.WORLDS.map(w => ['world-' + w.id, '🏆', w.name + ' Master', 'Complete every ' + w.name + ' lesson'])];
    const nx = VL.nextLesson(); const allL = VL.WORLDS.flatMap(w => VL.allWorldLessons(w.id)); const doneL = allL.filter(x => VL.lessonDone(x.id)).length;
    const qs = allL.map(x => (p.lessons[x.id] || {}).quiz).filter(q => q && q.best != null); const avgQ = qs.length ? Math.round(qs.reduce((a, q) => a + q.best, 0) / qs.length) : null;
    const mist = Object.entries(p.mistakes).filter(([k]) => VL.DIAG_TEXT[k]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    v.innerHTML = `<div class="dash"><div class="dash-head glass"><div class="av-big">${esc((p.name || S().meName || 'S').slice(0, 1).toUpperCase())}</div><div><h1>${esc(p.name || S().meName || 'My')} dashboard</h1><p class="muted">${S().mode === 'cloud' ? '☁️ Your progress is saved and shared with your teacher.' : '💾 Your progress is saved in this browser only.'} <button class="btn-xs" data-name>✏️ ${p.name ? 'Change name' : 'Set my name'}</button></p></div></div>
      <div class="dgrid">
        <div class="glass dcard"><h3>Learning worlds</h3>${VL.WORLDS.map(w => { const pc = VL.worldPct(w.id); return `<a href="#world-${w.id}" class="dw" style="--c:${w.color}"><span>${w.name}</span><div class="bar"><i style="width:${pc}%"></i></div><b>${pc}%</b></a>`; }).join('')}</div>
        <div class="glass dcard"><h3>Current lesson</h3>${nx ? `<b>${esc(nx.title)}</b><div class="pbar"><i style="width:${VL.lessonPct(nx.id)}%"></i></div><p>${VL.lessonPct(nx.id)}% done · ${doneL}/${allL.length} lessons completed overall</p><a class="btn-sm cyan" href="${VL.lessonHref(nx.id)}">Continue →</a>` : '<b>🎓 Every lesson completed!</b>'}</div>
        <div class="glass dcard"><h3>Quiz scores</h3><div class="big">${avgQ === null ? '—' : avgQ + '%'}</div><p class="muted">average best score over ${qs.length} quiz${qs.length === 1 ? '' : 'zes'}</p>${qs.length ? `<div class="qmini">${allL.filter(x => (p.lessons[x.id] || {}).quiz && p.lessons[x.id].quiz.best != null).slice(-6).map(x => `<div class="li">${esc(x.title)} <small>${p.lessons[x.id].quiz.best}%</small></div>`).join('')}</div>` : ''}</div>
        <div class="glass dcard"><h3>Practical skills</h3>${VL.SKILLS.map(s => `<div class="skill"><span>${s.name}</span><div class="bar"><i style="width:${p.skills[s.id] || 0}%"></i></div><b>${p.skills[s.id] || 0}</b></div>`).join('')}</div>
        <div class="glass dcard"><h3>Badges</h3><div class="badges">${badges.map(([id, ic, n, d]) => `<div class="bdg ${p.badges.includes(id) ? 'got' : ''}"><span>${ic}</span><b>${n}</b><small>${d}</small></div>`).join('')}</div></div>
        <div class="glass dcard"><h3>Saved projects</h3>${p.projects.length ? p.projects.slice(-4).reverse().map(x => `<div class="li">📁 ${esc(x.name)} <small>${ago(x.savedAt)}</small></div>`).join('') : '<p class="muted">None yet.</p>'}<a href="#projects" class="btn-xs">All projects</a></div>
        <div class="glass dcard"><h3>Things to practise</h3>${mist.length ? mist.map(([k, n]) => `<div class="li">⚠️ ${esc(VL.DIAG_TEXT[k])} <small>×${n}</small></div>`).join('') : '<p class="muted">Nothing yet. Keep experimenting!</p>'}<p class="muted small">Hints used: ${p.hints} · program runs: ${p.runs}</p></div>
        <div class="glass dcard rec"><h3>Recommended next</h3>${nx ? `<a class="rec" href="${VL.lessonHref(nx.id)}">▶ Next lesson: <b>${esc(nx.title)}</b></a>` : ''}${S().classChallenge && !p.challenges[S().classChallenge.id] ? `<a class="rec" href="#lab">📣 Teacher challenge: <b>${esc(S().classChallenge.title)}</b></a>` : ''}<a class="rec" href="#lab">🧪 Try a lab challenge (${Object.keys(p.challenges).length}/${VL.CHALLENGES.length} solved)</a><a class="rec" href="#explorer">🧊 Explore the LED and resistor in 3D</a></div>
      </div>
      <p class="muted small reset-p"><button class="btn-xs danger" data-reset>Reset my progress</button></p></div>`;
    $('[data-name]', v).onclick = () => VL.Register.ask({ title: 'My registration', cancel: 'Cancel' });
    $('[data-reset]', v).onclick = () => ui.confirm('Reset all progress?', 'This deletes your lesson progress, scores and projects. It cannot be undone.', () => { S().reset(); renderProgress(v); });
  }

  /* ------------------------------ TEACHER DASHBOARD ------------------------------ */
  function renderTeacher(v) {
    if (!S().isTeacher) { v.innerHTML = `<div class="glass planned-box"><h2>👩‍🏫 Teacher dashboard</h2><p>This area is only visible to the page owner (the teacher).</p></div>`; return; }
    v.innerHTML = `<div class="teacher"><div class="t-head glass"><div><h1>👩‍🏫 Teacher dashboard</h1><p class="muted">Monitor progress, spot difficulties and set class challenges.</p></div><div class="t-sync"></div></div>
      <div class="tgrid">
        <div class="glass tcard t-chal"><h3>📣 Class challenge</h3><div class="cur"></div>
          <label>Challenge <select class="tsel">${VL.CHALLENGES.map(c => `<option value="${c.id}">${c.level} · ${c.title}</option>`).join('')}</select></label>
          <label>Note to students (optional) <input class="inp tnote" maxlength="200" placeholder="e.g. Due Friday. Use GPIO 4!"></label>
          <div class="row"><button class="btn-primary" data-pub>Publish to class</button><button class="btn-sm" data-clear>Clear</button></div>
          <p class="muted small">Students see it in the Lab and on their dashboard. The lab checks their solution automatically from the real run.</p></div>
        <div class="glass tcard t-kpi"></div>
        <div class="glass tcard t-diff"><h3>Most common difficulties</h3><div class="body"></div></div>
        <div class="glass tcard t-quiz"><h3>ESP32 Lesson 1 quiz: % correct per question</h3><div class="body"></div></div>
        <div class="glass tcard t-funnel"><h3>ESP32 Lesson 1 step completion</h3><div class="body"></div></div>
        <div class="glass tcard t-lessons"><h3>Lesson completion (all worlds)</h3><div class="body"></div></div>
        <div class="glass tcard t-reg"></div>
      </div>
      <div class="glass t-table"><h3>Students</h3><div class="tbl"></div></div></div>`;
    const cur = () => { const c = S().classChallenge; $('.cur', v).innerHTML = c ? `<div class="fb ok">Live: <b>${esc(c.title)}</b>${c.note ? ' · “' + esc(c.note) + '”' : ''} <small>(${ago(c.at)})</small></div>` : '<p class="muted">No challenge published.</p>'; };
    S().onClass(() => { if (current === 'teacher') cur(); });
    $('[data-pub]', v).onclick = async () => { const ch = VL.CHALLENGES.find(c => c.id === $('.tsel', v).value); try { await S().setClassChallenge({ id: ch.id, title: ch.title, text: ch.text, level: ch.level, note: $('.tnote', v).value.trim(), at: Date.now() }); ui.toast('Challenge published to the class'); } catch (e) { ui.toast('⚠️ Could not publish: shared class data is not available in this view.'); } };
    $('[data-clear]', v).onclick = async () => { try { await S().db.doc('class/current').delete(); ui.toast('Challenge cleared'); } catch (e) { ui.toast('⚠️ Not available in this view.'); } };
    const draw = async list => {
      if (current !== 'teacher') return;
      const sync = $('.t-sync', v);
      if (!S().db) { sync.innerHTML = '<span class="warn">Class data needs the shared database (open this page on claude.ai). Showing your own progress as a preview.</span>'; list = [{ id: 'me', data: S().p, preview: true }]; }
      else sync.innerHTML = `<span class="ok">● Live: ${list.length} student${list.length === 1 ? '' : 's'}</span>`;
      list = list.flatMap(s => [s].concat(Object.entries((s.data && s.data.profiles) || {}).map(([k, d]) => ({ id: s.id + ':' + k, data: d, sub: true }))));
      VL.Register.teacherCard($('.t-reg', v), list);
      const names = await S().names(list.filter(s => !s.preview && !s.sub).map(s => s.id));
      const st = VL.LESSON1.steps;
      const rows = list.map(s => { const d = s.data || {}; const l = (d.lessons || {})['esp32-1'] || { steps: {}, quiz: {} }; return { s, d, l, name: (d.reg && d.reg.name) || d.name || (names[s.id] && names[s.id].name) || 'Student', nSteps: st.filter(x => (l.steps || {})[x.id]).length }; });
      // KPIs
      const n = rows.length; const quizzes = rows.map(r => r.l.quiz && r.l.quiz.best).filter(x => x !== null && x !== undefined);
      const avgQ = quizzes.length ? Math.round(quizzes.reduce((a, b) => a + b, 0) / quizzes.length) : null;
      $('.t-kpi', v).innerHTML = `<h3>Class overview</h3><div class="kpis"><div><b>${n}</b><span>students</span></div><div><b>${rows.filter(r => r.l.completed).length}</b><span>completed L1</span></div><div><b>${avgQ === null ? '—' : avgQ + '%'}</b><span>avg best quiz</span></div><div><b>${rows.reduce((a, r) => a + (r.d.hints || 0), 0)}</b><span>hints used</span></div><div><b>${rows.reduce((a, r) => a + Object.keys(r.d.challenges || {}).length, 0)}</b><span>challenges solved</span></div></div>`;
      // difficulties
      const agg = {}; rows.forEach(r => Object.entries(r.d.mistakes || {}).forEach(([k, c]) => { if (VL.DIAG_TEXT[k]) agg[k] = (agg[k] || 0) + c; }));
      const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 7); const mx = top.length ? top[0][1] : 1;
      $('.t-diff .body', v).innerHTML = top.length ? top.map(([k, c]) => `<div class="hb2"><span>${esc(VL.DIAG_TEXT[k])}</span><div class="bar"><i style="width:${c / mx * 100}%"></i></div><b>${c}</b></div>`).join('') : '<p class="muted">No data yet.</p>';
      // quiz per question
      const qn = VL.QUIZ.length; const right = Array(qn).fill(0), tot = Array(qn).fill(0);
      rows.forEach(r => (r.l.quiz && r.l.quiz.answers || []).forEach((a, i) => { tot[i]++; if (a) right[i]++; }));
      $('.t-quiz .body', v).innerHTML = tot.some(x => x) ? VL.QUIZ.map((q, i) => `<div class="hb2" title="${esc(q.q.split('\n')[0])}"><span>Q${i + 1} · ${esc(q.q.split('\n')[0].slice(0, 46))}…</span><div class="bar ${tot[i] && right[i] / tot[i] < 0.5 ? 'low' : ''}"><i style="width:${tot[i] ? right[i] / tot[i] * 100 : 0}%"></i></div><b>${tot[i] ? Math.round(right[i] / tot[i] * 100) + '%' : '—'}</b></div>`).join('') : '<p class="muted">No quiz attempts yet.</p>';
      $('.t-funnel .body', v).innerHTML = st.map(x => { const c = rows.filter(r => (r.l.steps || {})[x.id]).length; return `<div class="hb2"><span>${x.name}</span><div class="bar"><i style="width:${n ? c / n * 100 : 0}%"></i></div><b>${c}/${n}</b></div>`; }).join('');
      $('.t-lessons .body', v).innerHTML = VL.WORLDS.map(w => `<div class="tl-w" style="--c:${w.color}"><b>${w.name}</b>${VL.allWorldLessons(w.id).map(l => { const c = rows.filter(r => ((r.d.lessons || {})[l.id] || {}).completed).length; const qb = rows.map(r => (((r.d.lessons || {})[l.id] || {}).quiz || {}).best).filter(x => x != null); return `<div class="hb2" title="${esc(l.title)}"><span>${l.n}. ${esc(l.title)}</span><div class="bar"><i style="width:${n ? c / n * 100 : 0}%;background:${w.color}"></i></div><b>${c}/${n}${qb.length ? ' · ' + Math.round(qb.reduce((a, b) => a + b, 0) / qb.length) + '%' : ''}</b></div>`; }).join('')}</div>`).join('');
      // table
      $('.tbl', v).innerHTML = n ? `<table><thead><tr><th>Student</th><th>Lessons done</th><th>ESP32 L1 steps</th><th>Quiz (best · tries)</th><th>Bugs</th><th>Hints</th><th>Challenges</th><th>Main difficulty</th><th>Last active</th><th></th></tr></thead><tbody>${rows.sort((a, b) => (b.d.lastActive || 0) - (a.d.lastActive || 0)).map((r, i) => { const md = Object.entries(r.d.mistakes || {}).filter(([k]) => VL.DIAG_TEXT[k]).sort((a, b) => b[1] - a[1])[0]; const nl = Object.values(r.d.lessons || {}).filter(x => x.completed).length; return `<tr><td><b class="nmcell"></b>${r.s.preview ? ' <em>(you, preview)</em>' : ''}</td><td>${nl}/${VL.WORLDS.reduce((a, w) => a + VL.allWorldLessons(w.id).length, 0)}</td><td><div class="steps-dots sm">${st.map(x => `<span class="${(r.l.steps || {})[x.id] ? 'ok' : ''}" title="${x.name}"></span>`).join('')}</div></td><td>${r.l.quiz && r.l.quiz.best != null ? r.l.quiz.best + '% · ' + r.l.quiz.attempts : '—'}</td><td>${Object.keys(r.d.bugs || {}).length}/3</td><td>${r.d.hints || 0}</td><td>${Object.keys(r.d.challenges || {}).length}</td><td>${md ? esc(VL.DIAG_TEXT[md[0]]) : '—'}</td><td>${ago(r.d.lastActive)}</td><td><button class="btn-xs" data-st="${i}">Details</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">No student data yet. Share this page with your students as <b>Contributors</b> so they can save progress. Their work will appear here live.</p>';
      const sorted = rows; v.querySelectorAll('.nmcell').forEach((el, i) => el.textContent = sorted[i].name);
      v.querySelectorAll('[data-st]').forEach(b => b.onclick = () => studentDetail(sorted[+b.dataset.st]));
    };
    if (S().db) S().watchStudents(draw); else draw([]);
    cur();
  }
  function studentDetail(r) {
    const d = r.d; const ch = Object.entries(d.challenges || {});
    const work = ((d.lessons || {})['esp32-1'] || {}).work;
    const codeBlock = c => `<pre class="qcode">${(c || '').split('\n').map(l => VL.highlightPy(l)).join('\n')}</pre>`;
    ui.modal({
      title: '', wide: true, body: `<h2 class="sd-name"></h2>
      <div class="grid2"><div><h4>Skills</h4>${VL.SKILLS.map(s => `<div class="skill"><span>${s.name}</span><div class="bar"><i style="width:${(d.skills || {})[s.id] || 0}%"></i></div><b>${(d.skills || {})[s.id] || 0}</b></div>`).join('')}</div>
      <div><h4>Difficulties & hints</h4>${Object.entries(d.mistakes || {}).filter(([k]) => VL.DIAG_TEXT[k]).sort((a, b) => b[1] - a[1]).map(([k, c]) => `<div class="li">${esc(VL.DIAG_TEXT[k])} <small>×${c}${(d.hintLog || {})[k] ? ' · hint level ' + d.hintLog[k] : ''}</small></div>`).join('') || '<p class="muted">None recorded.</p>'}</div></div>
      <h4>Challenge submissions</h4>${ch.length ? ch.map(([id, s]) => `<details><summary>✅ ${esc((VL.CHALLENGES.find(c => c.id === id) || { title: id }).title)} · ${ago(s.at)}</summary>${codeBlock(s.code)}<p class="muted small">${s.circuit ? s.circuit.comps.length + ' parts, ' + s.circuit.wires.length + ' wires' : ''}</p></details>`).join('') : '<p class="muted">None yet.</p>'}
      <h4>Lesson 1 work (latest)</h4>${work ? codeBlock(work.code) + `<p class="muted small">${work.circuit.comps.length} parts, ${work.circuit.wires.length} wires</p>` : '<p class="muted">Not started.</p>'}`,
      onOpen: m => { m.querySelector('.sd-name').textContent = r.name; }
    });
  }

  /* ------------------------------ 3D EXPLORER PAGE ------------------------------ */
  function renderExplorer(v) {
    v.innerHTML = `<div class="xpage"><div class="xp-head glass"><h1>🧊 3D Component Explorer</h1><div class="tabs"><button data-m="esp32" class="on">ESP32 board</button><button data-m="led">LED</button><button data-m="resistor">Resistor</button></div><div class="xopt"></div></div>
      <div class="explore"><div class="x3d-wrap glass"><div class="x3d"></div><div class="x3d-ui"><div class="x3d-btns"><button data-v="iso">3D</button><button data-v="top">Top</button><button data-v="front">Side</button><button data-z="0.8">＋</button><button data-z="1.25">－</button></div></div><div class="x3d-help">🖱 Drag to rotate · scroll to zoom · click parts</div></div>
      <aside class="x-side"><div class="card glass info"><p class="muted">Click any part of the model.</p></div></aside></div></div>`;
    if (!window.THREE) { $('.info', v).innerHTML = '<p>3D needs WebGL, which this computer does not support.</p>'; return; }
    const info = $('.info', v); let model = 'esp32', arg = null;
    const x = new VL.Explorer3D($('.x3d', v), { onPick: p => {
      if (p.kind === 'pin') { const pin = VL.pinById[p.id]; info.innerHTML = `<h3 style="color:${VL.PIN_TYPES[pin.type].color}">${pin.label} ${pin.gpio !== null ? '· GPIO' + pin.gpio : ''}</h3><div class="chip static" style="--c:${VL.PIN_TYPES[pin.type].color}">${VL.PIN_TYPES[pin.type].name}</div><p>${esc(pin.desc)}</p>${pin.funcs.length ? `<div class="funcs">${pin.funcs.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}`; return; }
      if (/^band/.test(p.id)) { const b = x.bands; const n = +p.id.slice(4); const txt = n === 1 ? `1st digit: <b>${VL.BAND_N[b.d1]}</b> = ${b.d1}` : n === 2 ? `2nd digit: <b>${VL.BAND_N[b.d2]}</b> = ${b.d2}` : n === 3 ? `Multiplier: <b>${VL.BAND_N[b.m]}</b> = ×10<sup>${b.m}</sup> (×${Math.pow(10, b.m)})` : 'Tolerance: <b>gold</b> = ±5%'; info.innerHTML = `<h3>Colour band ${n}</h3><p>${txt}</p><div class="formula">${b.d1}${b.d2} × ${Math.pow(10, b.m)} = <b>${VL.fmtOhm(b.R)}</b></div>`; return; }
      const pi = VL.PART_INFO[p.id]; if (pi) info.innerHTML = `<h3>${pi.t}</h3><p>${pi.d}</p>`;
    } });
    const setOpt = () => {
      const o = $('.xopt', v);
      if (model === 'led') { o.innerHTML = `<select>${Object.entries(VL.LED_TYPES).map(([k, t]) => `<option value="${k}" ${k === arg ? 'selected' : ''}>${t.name} LED</option>`).join('')}</select> <label class="tgl"><input type="checkbox" checked> lit</label>`; $('select', o).onchange = e => { arg = e.target.value; x.setModel('led', arg); }; $('input', o).onchange = e => x.setLit(e.target.checked); }
      else if (model === 'resistor') { o.innerHTML = `<select>${VL.RESISTOR_VALUES.map(r => `<option value="${r}" ${r === arg ? 'selected' : ''}>${VL.fmtOhm(r)}</option>`).join('')}</select> <span class="muted small">Click the colour bands</span>`; $('select', o).onchange = e => { arg = +e.target.value; x.setModel('resistor', arg); }; }
      else o.innerHTML = '';
    };
    v.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { v.querySelectorAll('[data-m]').forEach(z => z.classList.toggle('on', z === b)); model = b.dataset.m; arg = model === 'led' ? 'red' : model === 'resistor' ? 220 : null; x.setModel(model, arg); setOpt(); info.innerHTML = '<p class="muted">Click any part of the model.</p>'; });
    v.querySelectorAll('[data-v]').forEach(b => b.onclick = () => x.view(b.dataset.v)); v.querySelectorAll('[data-z]').forEach(b => b.onclick = () => x.zoom(+b.dataset.z));
    x.setModel('esp32'); setOpt();
    return () => x.dispose();
  }

  /* ------------------------------ OHM PLAYGROUND ------------------------------ */
  function renderOhm(v) { return VL.renderOhmInto(v); }
  VL.renderOhmInto = function (v) {
    v.innerHTML = `<div class="ohm"><div class="glass oh-head"><h1>⚡ Ohm's Law Playground</h1><p class="muted">Electricity world · Change the voltage and resistance and watch the current. <b>V = I × R</b></p></div>
      <div class="oh-grid"><div class="glass oh-circ"><svg viewBox="0 0 420 260"><defs><filter id="ob"><feGaussianBlur stdDeviation="8"/></filter></defs>
        <path d="M60 60 H360 V200 H60 Z" fill="none" stroke="#3b4c75" stroke-width="6" stroke-linejoin="round"/>
        <path id="oloop" d="M60 130 V60 H360 V200 H60 Z" fill="none"/>
        <g transform="translate(40 105)"><rect width="40" height="56" rx="6" fill="#f59e0b"/><rect x="12" y="-6" width="16" height="7" rx="2" fill="#f59e0b"/><text x="20" y="34" text-anchor="middle" class="ovt">V</text></g>
        <rect x="170" y="48" width="80" height="24" rx="10" fill="#d8c39a"/><text x="210" y="38" text-anchor="middle" class="olab or">220 Ω</text>
        <g class="oled" transform="translate(360 130)"><circle r="40" class="og" filter="url(#ob)" opacity="0"/><circle r="16" class="ol" fill="#ff2b2b"/></g>
        <g class="dots"></g></svg></div>
      <div class="glass oh-ctl">
        <label>Voltage <b class="vv">3.3 V</b><input type="range" min="0" max="90" value="33" data-v></label>
        <label>Resistance <b class="rr">220 Ω</b><input type="range" min="0" max="36" value="16" data-r></label>
        <label class="tgl"><input type="checkbox" data-led checked> include an LED <select data-col>${Object.entries(VL.LED_TYPES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('')}</select></label>
        <div class="tri"><div class="t-v">V</div><div class="t-i">I</div><div class="t-r">R</div></div>
        <div class="oh-out"><div><span>Current</span><b class="oi">—</b></div><div><span>Power in R</span><b class="op">—</b></div><div><span>LED voltage</span><b class="olv">—</b></div></div>
        <div class="formula of"></div><div class="muted small">Without an LED: exact Ohm's law. With an LED: Shockley diode model, solved numerically.</div></div></div></div>`;
    let raf, ph = 0; const st = { V: 3.3, R: 220, led: true, col: 'red' };
    const path = $('#oloop', v); const len = path.getTotalLength(); const dots = $('.dots', v); dots.innerHTML = Array.from({ length: 18 }, () => '<circle r="3.5" fill="#facc15"/>').join('');
    const upd = () => {
      const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82]; const ri = +$('[data-r]', v).value; st.R = E12[ri % 12] * Math.pow(10, Math.floor(ri / 12)); st.V = +$('[data-v]', v).value / 10; st.led = $('[data-led]', v).checked; st.col = $('[data-col]', v).value;
      let I, Vl = 0; if (st.led) { const r = VL.Circuit.seriesLED(st.V, st.R, st.col); I = r.I; Vl = r.Vled; } else I = st.V / st.R;
      $('.vv', v).textContent = st.V.toFixed(1) + ' V'; $('.rr', v).textContent = VL.fmtOhm(st.R); $('.or', v).textContent = VL.fmtOhm(st.R); $('.ovt', v).textContent = st.V.toFixed(1) + 'V';
      $('.oi', v).textContent = VL.fmtI(I); $('.op', v).textContent = (I * I * st.R * 1000).toFixed(1) + ' mW'; $('.olv', v).textContent = st.led ? Vl.toFixed(2) + ' V' : '—';
      $('.oled', v).style.display = st.led ? '' : 'none'; const t = VL.LED_TYPES[st.col]; $('.ol', v).setAttribute('fill', t.color); $('.og', v).setAttribute('fill', t.color); $('.og', v).setAttribute('opacity', VL.Circuit.brightness(I).toFixed(2));
      $('.of', v).innerHTML = st.led ? `I = (V − V<sub>LED</sub>) / R = (${st.V.toFixed(2)} − ${Vl.toFixed(2)}) / ${st.R} = <b>${VL.fmtI(I)}</b>${I > 0.025 ? ' <span class="no">⚠ too much for an LED!</span>' : ''}` : `I = V / R = ${st.V.toFixed(2)} / ${st.R} = <b>${VL.fmtI(I)}</b>`;
      st.I = I;
    };
    v.querySelectorAll('input,select').forEach(i => i.oninput = i.onchange = upd); upd();
    const anim = () => { ph += Math.min(6, 0.3 + Math.log10(1 + st.I * 1e5) * 1.2) * (st.I > 1e-6 ? 1 : 0); [...dots.children].forEach((c, k) => { const p = path.getPointAtLength((ph + k * len / 18) % len); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.style.opacity = st.I > 1e-6 ? 1 : 0.15; }); raf = requestAnimationFrame(anim); }; anim();
    return () => cancelAnimationFrame(raf);
  }

  /* ------------------------------ boot ------------------------------ */
  async function boot() {
    VL.Sarra.bindPanel();
    S().on(() => renderHeader());
    $('#bell').onclick = () => { const c = S().classChallenge; if (c) ui.modal({ title: '📣 Class challenge', body: `<h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.note ? `<p class="note">“${esc(c.note)}”</p>` : ''}`, buttons: [{ label: 'Close' }, { label: 'Open the lab', primary: true, onClick: () => { location.hash = '#lab'; } }] }); else ui.toast('No class challenge right now.'); };
    $('#who').onclick = () => { if (S().isTeacher) { location.hash = '#progress'; return; } VL.Register.gate({ switch: true }); };
    $('#gear').onclick = () => { const reg = S().p.reg; ui.modal({ title: 'Settings', body: `<div class="settings"><div class="set-row"><div><b>My registration</b><small>${reg ? esc(reg.name) + (reg.group ? ' · ' + esc(reg.group) : '') : 'Not registered yet'}</small></div><button class="btn-sm" data-s="reg">${reg ? 'Edit' : 'Register'}</button></div>
      <div class="set-row"><div><b>Progress dashboard</b><small>Badges, scores and lessons</small></div><button class="btn-sm" data-s="prog">Open</button></div>
      ${S().isTeacher ? '<div class="set-row"><div><b>Teacher dashboard</b><small>Class progress, registrations, challenges</small></div><button class="btn-sm" data-s="teach">Open</button></div>' : ''}
      <div class="set-row"><div><b>Storage</b><small>${S().mode === 'cloud' ? 'Saved in the class database' : 'Saved in this browser'}</small></div></div></div>`, onOpen: r => { r.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const k = b.dataset.s; ui.close(); if (k === 'reg') VL.Register.ask({ title: 'My registration', cancel: 'Cancel' }); else location.hash = k === 'prog' ? '#progress' : '#teacher'; }); } }); };
    route();
    try { if (!sessionStorage.getItem('vl-logged')) VL.Register.gate(); } catch (e) { VL.Register.gate(); }
    await Promise.all([S().init(), VL.Sarra.init()]);
    S().onClass(() => renderHeader());
    renderHeader();
    if (current === 'home' || current === 'progress' || current === 'learn') route();
    VL.Register.load();
    const gate = document.getElementById('login-gate');
    if (S().isTeacher || (VL.Register.cloud() && !VL.Register.needsLogin())) { if (gate) { gate.remove(); document.body.classList.remove('gated'); } }
    else if (gate && !gate.querySelector('.lg-n').value && VL.Register.needsLogin()) VL.Register.gate();
    else if (!gate && VL.Register.needsLogin()) VL.Register.gate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
