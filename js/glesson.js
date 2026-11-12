/* =========================================================================
   glesson.js : generic lesson engine for every lesson after ESP32 Lesson 1
   Steps: 1 Learn (theory + interactive widget) · 2 Practice (lab / code /
   terminal / challenge) · 3 Quiz · 4 Results
   ========================================================================= */
(function () {
  const esc = s => VL.esc(s);
  const S = () => VL.Store;
  const STEPS = [{ id: 'learn', name: 'Learn', icon: 'book' }, { id: 'practice', name: 'Practice', icon: 'flask' }, { id: 'quiz', name: 'Quiz', icon: 'list' }, { id: 'results', name: 'Results', icon: 'trophy' }];
  const G = { L: null, step: null, el: null, inst: null, cleanup: null };
  VL.LESSONS = VL.LESSONS || [];
  VL.lessonById = id => VL.LESSONS.find(l => l.id === id);
  VL.worldLessons = w => VL.LESSONS.filter(l => l.world === w).sort((a, b) => a.n - b.n);
  VL.lessonDone = id => { const l = S().p.lessons[id]; return !!(l && l.completed); };
  VL.lessonPct = id => { const l = S().p.lessons[id]; if (!l) return 0; const steps = id === 'esp32-1' ? VL.LESSON1.steps : STEPS; return Math.round(steps.filter(s => l.steps && l.steps[s.id]).length / steps.length * 100); };
  VL.lessonHref = id => id === 'esp32-1' ? '#lesson' : '#lesson-' + id;
  const sarraSays = (html, text) => `<div class="sarra-says"><img src="img/sarra-icon.webp" alt="Mrs Sarra"><div class="bubble"><b>Mrs Sarra</b>${html}${text ? `<button class="say tts-only" data-say-text="${esc(text)}" ${VL.Sarra.tts ? '' : 'hidden'} title="Read aloud">🔊</button>` : ''}</div></div>`;
  const bindSay = el => el.querySelectorAll('[data-say-text]').forEach(b => b.onclick = () => VL.Sarra.speak(b.dataset.sayText));
  const done = st => !!S().lesson(G.L.id).steps[st];
  const finish = (st, skill, amt) => { if (!done(st)) { S().markStep(G.L.id, st); if (skill) S().skill(skill, amt); S().save(); VL.ui.toast(`✅ ${STEPS.find(s => s.id === st).name} complete`); renderStepper(); checkComplete(); } };
  function checkComplete() {
    const l = S().lesson(G.L.id); if (l.completed) return;
    if (['learn', 'practice', 'quiz'].every(s => l.steps[s])) {
      l.completed = Date.now(); S().event('lesson', `${S().p.name || 'A student'} completed the lesson "${G.L.title}"`); S().markStep(G.L.id, 'results');
      const wl = VL.worldLessons(G.L.world); const all = wl.every(x => VL.lessonDone(x.id)) && (G.L.world !== 'esp32' || VL.lessonDone('esp32-1'));
      if (all && S().badge('world-' + G.L.world)) VL.ui.toast(`🏆 World badge earned: ${VL.WORLDS.find(w => w.id === G.L.world).name} Master!`);
      S().save();
    }
  }

  VL.GLesson = {
    mount(el, id) {
      const L = VL.lessonById(id); if (!L) { el.innerHTML = '<div class="glass planned-box"><h2>Lesson not found</h2><a href="#learn">Back to Learn</a></div>'; return; }
      G.L = L; G.el = el; const w = VL.WORLDS.find(x => x.id === L.world);
      const last = (S().p.lastStep || {})[id];
      el.innerHTML = `<div class="lesson"><div class="lesson-head glass" style="--c:${w.color}"><div class="crumbs"><a href="#learn">Learn</a> › <a href="#world-${w.id}">${w.name}</a> › Lesson ${L.n}</div>
        <div class="lh-row"><h1>${esc(L.title)}</h1><span class="meta">${VL.icon('clock')} ${L.minutes} min</span><span class="meta">${VL.icon('chart')} ${L.level}</span></div><div class="stepper"></div></div><div class="lesson-body"></div>
        <div class="lnav">${prevNext(L)}</div></div>`;
      renderStepper(); go(last || 'learn');
    },
    inst: () => G.inst, go: st => go(st),
    unmount() { if (G.k3) { try { G.k3.dispose(); } catch (e) { } G.k3 = null; } if (G.cleanup) { try { G.cleanup(); } catch (e) { } G.cleanup = null; } if (G.inst && G.inst.destroy) G.inst.destroy(); G.inst = null; }
  };
  function prevNext(L) {
    const wl = VL.worldLessons(L.world); const all = L.world === 'esp32' ? [{ id: 'esp32-1', title: VL.LESSON1.title, n: 1 }, ...wl] : wl;
    const i = all.findIndex(x => x.id === L.id); const p = all[i - 1], n = all[i + 1];
    return `${p ? `<a class="btn-sm" href="${VL.lessonHref(p.id)}">← Lesson ${p.n}: ${esc(p.title)}</a>` : '<span></span>'}${n ? `<a class="btn-sm" href="${VL.lessonHref(n.id)}">Lesson ${n.n}: ${esc(n.title)} →</a>` : `<a class="btn-sm" href="#world-${L.world}">Back to the ${esc(VL.WORLDS.find(w => w.id === L.world).name)} path</a>`}`;
  }
  function renderStepper() {
    const el = G.el && G.el.querySelector('.stepper'); if (!el) return;
    el.innerHTML = STEPS.map((s, i) => `<button class="stp ${s.id === G.step ? 'on' : ''} ${done(s.id) ? 'done' : ''}" data-st="${s.id}"><span class="n">${done(s.id) ? '✓' : i + 1}</span><span class="t">${VL.icon(s.icon)} ${s.name}</span></button>`).join('<span class="arr">›</span>');
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => go(b.dataset.st));
  }
  const nextBtn = (st, label) => { const i = STEPS.findIndex(s => s.id === st); const n = STEPS[i + 1]; return n ? `<button class="btn-primary next" data-next="${n.id}">${label || 'Next: ' + n.name} →</button>` : ''; };
  function go(st) {
    VL.GLesson.unmount(); G.step = st; S().p.lastStep = Object.assign({}, S().p.lastStep, { [G.L.id]: st }); S().save(); renderStepper();
    const body = G.el.querySelector('.lesson-body'); ({ learn, practice, quiz, results })[st](body);
    body.querySelectorAll('[data-next]').forEach(b => b.onclick = () => { if (st === 'learn') finish('learn', G.L.skill, 10); go(b.dataset.next); });
    bindSay(body);
    VL.Sarra.setContext(() => ({ lesson: G.L.title, world: G.L.world, step: st, objectives: G.L.objectives, practiceGoal: G.L.practice && G.L.practice.goal, lab: G.inst && G.inst.describe ? G.inst.describe() : (G.inst && G.inst.circ ? VL.Sarra.describeLab(G.inst) : null) }));
    VL.Sarra.wbGetter(() => (G.inst && G.inst.circ ? G.inst : null));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------ LEARN ------------------------------ */
  function learn(el) {
    const L = G.L;
    el.innerHTML = `<div class="glearn">
      ${sarraSays(`<p>${L.intro}</p>`, L.intro.replace(/<[^>]+>/g, ''))}
      <div class="card glass obj"><h4>🎯 In this lesson you will</h4>${L.objectives.map(o => `<div>✓ ${esc(o)}</div>`).join('')}</div>
      <div class="theory-grid">${L.theory.map(t => `<div class="card glass tcard2"><h3>${t.h}</h3>${t.p}${t.code ? `<pre class="qcode">${t.code.split('\n').map(l => VL.highlightPy(l, t.lang === 'cpp' ? 'cpp' : 'py')).join('\n')}</pre>` : ''}</div>`).join('')}</div>
      ${L.widget ? `<div class="card glass wcard"><h3>🧪 Try it: ${esc(L.widgetTitle || 'interactive explorer')}</h3><div class="whost"></div></div>` : ''}
    </div><div class="step-foot"><span class="muted small">${L.widget ? 'Play with the explorer, then continue.' : ''}</span>${nextBtn('learn', 'I understand: Practice')}</div>`;
    if (L.widget) { const c = VL.W[L.widget](el.querySelector('.whost'), Object.assign({}, L.widgetOpts || {}, { onUse: () => { } })); if (typeof c === 'function') G.cleanup = c; }
  }

  /* ------------------------------ PRACTICE ------------------------------ */
  function practice(el) {
    const L = G.L, P = L.practice; let hintLv = 0;
    el.innerHTML = `<div class="gpractice">${sarraSays(`<p><b>${esc(P.title || 'Practice')}:</b> ${P.goal}</p>`, (P.title || '') + '. ' + P.goal.replace(/<[^>]+>/g, ''))}<div class="phost"></div><div class="pdone"></div></div>
      <div class="step-foot"><button class="btn-sm hintb">${VL.icon('bulb')} Hint</button>${P.solutionNote ? '' : ''}${nextBtn('practice')}</div>`;
    const host = el.querySelector('.phost'); const pass = (msg) => { finish('practice', L.skill, 25); el.querySelector('.pdone').innerHTML = `<div class="fb ok">🎉 Practice complete! ${msg || ''}</div>`; };
    if (done('practice')) el.querySelector('.pdone').innerHTML = '<div class="fb ok">✅ You already completed this practice. You can keep experimenting!</div>';
    const hints = P.hints || ['What exactly does the goal ask for? Break it into small steps.', 'Compare your program with the examples in the Learn step.', 'Ask Mrs Sarra to look at your code: she can see your program and the simulation results.'];
    el.querySelector('.hintb').onclick = () => {
      if (P.type === 'bench' && G.inst && G.inst.allIssues && G.inst.allIssues().length) { VL.Sarra.autoHint(G.inst); return; }
      hintLv = Math.min(3, hintLv + 1); S().hint('L:' + L.id, hintLv);
      VL.Sarra.push('sarra', `<div class="hint-lv l${hintLv}">${['', 'Hint 1 · think about it', 'Hint 2 · where to look', 'Hint 3 · the fix'][hintLv]}</div><p>${hints[hintLv - 1]}</p>`, { text: hints[hintLv - 1].replace(/<[^>]+>/g, ''), kind: 'hint' }); VL.Sarra.open();
    };
    if (P.type === 'code') {
      G.inst = new VL.CodeLab(host, { lang: P.lang, board: P.board, kit: P.kit || [], code: P.code, goal: P.goal, blocks: P.blocks, limit: P.limit || 10000, inputs: P.inputs, check: (r, lab) => P.check(r, lab, VL.chk), onPass: () => pass() });
    } else if (P.type === 'bench') {
      const items = wb => P.check(wb, VL.chk);
      G.inst = new VL.Workbench(host, {
        board: P.board || 'esp32', code: !!P.code, initialCode: P.code || undefined, ignore: P.ignore,
        checksHTML: wb => `<div class="mission"><div class="m-t">${esc(P.title || 'Mission')}</div>${items(wb).map(([t, ok]) => `<div class="mi ${ok ? 'ok' : ''}"><span>${ok ? '✅' : '◻️'}</span>${t}</div>`).join('')}</div>`,
        onAnalyze: wb => { if (items(wb).every(x => x[1])) pass(); }
      });
      if (P.circuit) G.inst.setCircuit(P.circuit, P.code);
    } else if (P.type === 'terminal') {
      const box = document.createElement('div'); box.className = 'tasks card glass';
      const term = document.createElement('div'); host.append(term, box);
      const draw = t => { const res = P.tasks.map(k => [k.t, !!k.ok(t)]); box.innerHTML = `<div class="m-t">Tasks</div>${res.map(([x, ok]) => `<div class="mi ${ok ? 'ok' : ''}"><span>${ok ? '✅' : '◻️'}</span><span>${x}</span></div>`).join('')}`; if (res.every(x => x[1])) pass(); };
      G.inst = new VL.Terminal(term, { onChange: draw }); draw(G.inst); host.classList.add('termwrap');
      G.inst.describe = () => ({ terminalHistory: G.inst.hist.slice(-15), cwd: G.inst.path });
    } else if (P.type === 'widget') {
      let score = 0; const need = P.need || 1; host.innerHTML = `<div class="card glass"><div class="whost"></div><div class="wscore muted small"></div></div>`;
      const upd = () => host.querySelector('.wscore').textContent = `Progress: ${Math.min(score, need)} / ${need}`; upd();
      const c = VL.W[P.widget](host.querySelector('.whost'), Object.assign({}, P.widgetOpts || {}, { onScore: () => { score++; upd(); if (score >= need) pass(); } })); if (typeof c === 'function') G.cleanup = c;
    } else if (P.type === 'predict') {
      const ok = new Set();
      const sc = P.scene || ({ electronics: { board: 'esp32', kit: [{ type: 'led', pin: 4, color: 'red', label: 'LED + 220 Ω' }] }, electricity: { board: 'esp32', kit: [{ type: 'led', pin: 4, color: 'red', label: 'LED + 220 Ω' }] }, arduino: { board: 'uno', kit: [] }, esp32: { board: 'esp32', kit: [] }, raspberrypi: { board: 'rpi', kit: [] } })[G.L.world];
      const sceneHTML = sc ? `<div class="pscene glass"><div class="st-head"><div class="st-t">${VL.icon('cube')}<b>${esc((VL.BOARD_INFO[sc.board] || {}).name || sc.board)}</b><span class="muted">${sc.kit.length ? 'the parts in these questions · drag to rotate' : 'drag to rotate · scroll to zoom'}</span></div></div><div class="k3host"></div></div>` : '';
      host.innerHTML = sceneHTML + `<div class="predict">${P.items.map((it, i) => `<div class="card glass pq" data-i="${i}"><p><b>${i + 1}.</b> ${it.q}</p>${it.code ? `<pre class="qcode">${it.code.split('\n').map(l => VL.highlightPy(l, it.lang === 'cpp' ? 'cpp' : 'py')).join('\n')}</pre>` : ''}<div class="opts">${it.o.map((o, k) => `<button class="opt" data-k="${k}">${o}</button>`).join('')}</div><div class="pfb"></div></div>`).join('')}</div>`;
      host.querySelectorAll('.pq').forEach(card => card.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const it = P.items[+card.dataset.i]; const right = +b.dataset.k === it.a; card.querySelectorAll('.opt').forEach(x => x.classList.remove('right', 'wrong')); b.classList.add(right ? 'right' : 'wrong');
        card.querySelector('.pfb').innerHTML = `<div class="fb ${right ? 'ok' : 'no'}">${right ? '✅ ' : '❌ '}${right ? it.e : (it.hint || 'Not quite: think again.')}</div>`;
        if (right) ok.add(card.dataset.i); else S().mistake('PRACTICE');
        if (ok.size === P.items.length) pass('All answers correct.');
      }));
      if (sc && window.THREE && VL.Kit3D) { try { const kh = host.querySelector('.pscene .k3host'); G.k3 = new VL.Kit3D(kh, {}); G.k3.setKit(sc.board, JSON.parse(JSON.stringify(sc.kit))); const lit = {}; sc.kit.forEach((d, i) => { if (d.type === 'led' && !d.off) lit[i] = 1; if (d.type === 'motor') lit[i] = 0.6; if (d.type === 'wifi') lit[i] = true; }); G.k3.setLive(lit); } catch (e) { const ph = host.querySelector('.pscene'); if (ph) ph.remove(); } }
    }
  }

  /* ------------------------------ QUIZ ------------------------------ */
  function quiz(el) {
    const qs = G.L.quiz; let i = 0, score = 0; const answers = []; const Q = S().lesson(G.L.id).quiz;
    const render = () => {
      if (i >= qs.length) return fin();
      const q = qs[i]; const opts = q.tf ? ['True', 'False'] : q.o; const ans = q.tf ? (q.a ? 0 : 1) : q.a;
      el.innerHTML = `<div class="quiz card glass"><div class="qhead"><span class="qtype">${q.tf ? 'True / False' : q.code ? 'Code interpretation' : 'Multiple choice'}</span><span>Question ${i + 1} / ${qs.length}</span><span>Score ${score}</span></div><div class="prog"><i style="width:${i / qs.length * 100}%"></i></div>
        <p>${q.q}</p>${q.code ? `<pre class="qcode">${q.code.split('\n').map(l => VL.highlightPy(l, q.lang === 'cpp' ? 'cpp' : 'py')).join('\n')}</pre>` : ''}<div class="opts ${q.tf ? 'tf' : ''}">${opts.map((o, k) => `<button class="opt" data-k="${k}">${o}</button>`).join('')}</div><div class="qfb"></div></div>`;
      el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const right = +b.dataset.k === ans; answers.push(right); if (right) score++; else S().mistake('QUIZ:' + G.L.id + ':' + i);
        el.querySelectorAll('.opt').forEach(x => x.disabled = true); b.classList.add(right ? 'right' : 'wrong'); el.querySelector(`.opt[data-k="${ans}"]`).classList.add('right');
        el.querySelector('.qfb').innerHTML = sarraSays(`<p><b>${right ? 'Correct!' : 'Not quite.'}</b> ${q.e}</p>`, q.e.replace(/<[^>]+>/g, '')) + `<button class="btn-primary qnext">${i + 1 < qs.length ? 'Next question →' : 'See my results →'}</button>`;
        bindSay(el); el.querySelector('.qnext').onclick = () => { i++; render(); };
      });
    };
    const fin = () => {
      const pct = Math.round(score / qs.length * 100); Q.attempts++; Q.last = pct; Q.best = Math.max(Q.best || 0, pct); Q.answers = answers; Q.at = Date.now(); S().event('quiz', `${S().p.name || 'A student'} finished the quiz "${G.L.title}": ${score}/${qs.length} (${pct}%)`, true);
      if (pct >= 70) finish('quiz', G.L.skill, 15); S().save();
      el.innerHTML = `<div class="quiz card glass done"><h2>${pct >= 70 ? '🎉' : '💪'} You scored ${score} / ${qs.length} (${pct}%)</h2><p>${pct >= 70 ? 'Great work: quiz passed!' : 'You need 70% to pass. Read the explanations and try again.'}</p><div class="qsum">${answers.map((a, k) => `<span class="${a ? 'ok' : 'no'}">${k + 1}</span>`).join('')}</div><div class="row"><button class="btn-sm" data-retry>↺ Try again</button>${nextBtn('quiz', 'See my results')}</div></div>`;
      el.querySelector('[data-retry]').onclick = () => quiz(el); el.querySelectorAll('[data-next]').forEach(b => b.onclick = () => go(b.dataset.next)); renderStepper();
    };
    el.innerHTML = `<div class="quiz card glass intro"><h2>📝 Quiz: ${esc(G.L.title)}</h2><p>${qs.length} questions. Mrs Sarra explains every answer. You need 70% to pass.</p><p class="muted">Best: ${Q.best == null ? '—' : Q.best + '%'} · attempts: ${Q.attempts}</p><button class="btn-primary start">Start</button></div>`;
    el.querySelector('.start').onclick = render;
  }

  /* ------------------------------ RESULTS ------------------------------ */
  function results(el) {
    const L = G.L, l = S().lesson(L.id); checkComplete();
    const missing = ['learn', 'practice', 'quiz'].filter(s => !l.steps[s]);
    const wl = L.world === 'esp32' ? [{ id: 'esp32-1' }, ...VL.worldLessons('esp32')] : VL.worldLessons(L.world);
    const wdone = wl.filter(x => VL.lessonDone(x.id)).length; const w = VL.WORLDS.find(x => x.id === L.world);
    const next = wl.find(x => !VL.lessonDone(x.id) && x.id !== L.id);
    el.innerHTML = `<div class="results"><div class="card glass res-main"><div class="medal ${l.completed ? 'won' : ''}"><div class="m-in">${l.completed ? '✅' : '⏳'}</div><div class="m-t">Lesson ${L.n}</div></div>
      <div><h2>${l.completed ? 'Lesson complete!' : 'Almost there'}</h2><p>${l.completed ? `You finished <b>${esc(L.title)}</b>.` : `Still to do: ${missing.map(s => `<a href="javascript:void 0" data-go="${s}">${STEPS.find(x => x.id === s).name}</a>`).join(', ')}.`}</p>
      <div class="kpis"><div><b>${l.quiz.best == null ? '—' : l.quiz.best + '%'}</b><span>best quiz</span></div><div><b>${l.quiz.attempts}</b><span>attempts</span></div><div><b>${wdone}/${wl.length}</b><span>${w.name} lessons done</span></div></div></div></div>
      <div class="card glass"><h3>${w.name} world progress</h3><div class="bar big"><i style="width:${wdone / wl.length * 100}%;background:${w.color}"></i></div><p class="muted">${wdone === wl.length ? `🏆 You completed the whole ${w.name} world!` : `Complete all ${wl.length} lessons to earn the ${w.name} Master badge.`}</p>
      ${next ? `<a class="btn-primary" href="${VL.lessonHref(next.id)}">Next: ${esc(VL.lessonById(next.id) ? VL.lessonById(next.id).title : VL.LESSON1.title)} →</a>` : ''} <button class="btn-sm ai-only ${VL.Sarra.sample ? '' : 'unavail'}" data-ai>✨ Ask Mrs Sarra for feedback</button></div></div>`;
    el.querySelectorAll('[data-go]').forEach(a => a.onclick = () => go(a.dataset.go));
    el.querySelector('[data-ai]').onclick = () => VL.Sarra.ask(`Give me short personal feedback on the lesson "${L.title}". My quiz: ${JSON.stringify(l.quiz)}. Steps: ${Object.keys(l.steps).join(', ')}. Suggest one extra challenge.`);
  }
})();
