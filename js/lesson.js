/* =========================================================================
   lesson.js : ESP32 Lesson 1, "Meet the ESP32 and Build Your First LED Circuit"
   ========================================================================= */
(function () {
  const esc = s => VL.esc(s);
  const LID = 'esp32-1';
  const L = { step: null, wb: null, x3d: null };
  const S = () => VL.Store;
  const work = () => { const l = S().lesson(LID); l.work = l.work || { circuit: { comps: [], wires: [] }, code: VL.STARTER_CODE }; return l.work; };
  const done = st => !!S().lesson(LID).steps[st];
  const finish = (st, skill, amt) => { if (!done(st)) { S().markStep(LID, st); if (skill) { S().skill(skill, amt); S().save(); } VL.ui.toast(`✅ Step complete: ${VL.LESSON1.steps.find(s => s.id === st).name}`); renderStepper(); } };
  const icon = n => VL.icon({ cube: 'cube', bolt: 'bolt', board: 'chip', code: 'code', bug: 'target', quiz: 'list', medal: 'trophy' }[n] || 'info');

  VL.Lesson = {
    mount(el, step) {
      L.el = el; const last = S().p.lastStep && S().p.lastStep[LID];
      L.step = step || last || 'explore';
      el.innerHTML = `<div class="lesson">
        <div class="lesson-head glass">
          <div class="crumbs"><a href="#learn">Learn</a> › <a href="#world-esp32">ESP32</a> › Module 1 · Lesson 1</div>
          <h1>${esc(VL.LESSON1.title)}</h1>
          <div class="stepper"></div>
        </div>
        <div class="lesson-body"></div>
      </div>`;
      renderStepper(); go(L.step);
    },
    unmount() { if (L.wb) { saveWork(); L.wb.destroy(); L.wb = null; } if (L.x3d) { L.x3d.dispose(); L.x3d = null; } },
    wb: () => L.wb,
    x3d: () => L.x3d
  };
  function renderStepper() {
    const el = L.el && L.el.querySelector('.stepper'); if (!el) return;
    el.innerHTML = VL.LESSON1.steps.map((s, i) => `<button class="stp ${s.id === L.step ? 'on' : ''} ${done(s.id) ? 'done' : ''}" data-st="${s.id}"><span class="n">${done(s.id) ? '✓' : i + 1}</span><span class="t">${icon(s.icon)} ${s.name}</span></button>`).join('<span class="arr">›</span>');
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => go(b.dataset.st));
  }
  function saveWork() { if (!L.wb) return; const w = work(); if (L.wbKind === 'main') { w.circuit = JSON.parse(JSON.stringify(L.wb.circ)); if (L.wb.editor) w.code = L.wb.editor.value; S().save(); } }
  function go(st) {
    VL.Lesson.unmount();
    L.step = st; S().p.lastStep = Object.assign({}, S().p.lastStep, { [LID]: st }); S().save(); renderStepper();
    const body = L.el.querySelector('.lesson-body');
    ({ explore, theory, build, code, debug, quiz, results })[st](body);
    VL.Sarra.setContext(() => ({ lesson: VL.LESSON1.title, step: VL.LESSON1.steps.find(s => s.id === L.step).desc, lab: VL.Sarra.describeLab(L.wb) }));
    VL.Sarra.wbGetter(() => L.wb);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const nextBtn = (st, label) => { const i = VL.LESSON1.steps.findIndex(s => s.id === st); const n = VL.LESSON1.steps[i + 1]; return n ? `<button class="btn-primary next" data-next="${n.id}">${label || 'Next: ' + n.name} →</button>` : ''; };
  const bindNext = el => el.querySelectorAll('[data-next]').forEach(b => b.onclick = () => go(b.dataset.next));
  const sarraSays = (html, text) => `<div class="sarra-says"><img src="img/sarra-icon.webp" alt="Mrs Sarra"><div class="bubble"><b>Mrs Sarra</b>${html}${text ? `<button class="say tts-only" data-say-text="${esc(text)}" ${VL.Sarra.tts ? '' : 'hidden'} title="Read aloud">🔊</button>` : ''}</div></div>`;
  const bindSay = el => el.querySelectorAll('[data-say-text]').forEach(b => b.onclick = () => VL.Sarra.speak(b.dataset.sayText));

  /* ============================ 1. EXPLORE ============================ */
  function explore(el) {
    el.innerHTML = `<div class="explore">
      <div class="x3d-wrap glass">
        <div class="x3d" id="x3d"></div>
        <div class="x3d-ui">
          <div class="x3d-btns"><button data-v="iso" title="3D view">3D</button><button data-v="top" title="Top view">Top</button><button data-v="front">Side</button><button data-v="bottom">Under</button><button data-z="0.8">＋</button><button data-z="1.25">－</button></div>
          <div class="chips">${['gpio', 'power', 'ground', 'strap', 'input', 'serial', 'flash'].map(t => `<button class="chip" data-f="${t}" style="--c:${VL.PIN_TYPES[t].color}">${VL.PIN_TYPES[t].name}</button>`).join('')}</div>
        </div>
        <div class="x3d-tip" hidden></div>
        <div class="x3d-help">🖱 Drag to rotate · scroll to zoom · click a pin or a part</div>
        <div class="noweb" hidden>3D view needs WebGL, which this computer does not support. You can still use the 2D board in the Build step.</div>
      </div>
      <aside class="x-side">
        ${sarraSays(`<p>This is the <b>${VL.BOARD_NAME}</b>. It has <b>38 pins</b> on two headers, J2 on the left and J3 on the right. Click pins and parts to discover what they do, then complete my <b>pin hunt</b>!</p>`, 'This is the ESP32 DevKitC. It has 38 pins on two headers. Click pins and parts to discover what they do, then complete my pin hunt!')}
        <div class="card glass pin-card"><div class="muted">Click a pin or a component on the board.</div></div>
        <div class="card glass hunt"></div>
        <div class="muted small compare">🔭 Board comparison (Arduino UNO, Raspberry Pi Pico) is planned for the Arduino and Raspberry Pi worlds.</div>
      </aside>
    </div>
    <div class="step-foot">${nextBtn('explore')}</div>`;
    bindNext(el); bindSay(el);
    const card = el.querySelector('.pin-card'), hunt = el.querySelector('.hunt'), tip = el.querySelector('.x3d-tip');
    const host = el.querySelector('#x3d');
    if (!window.THREE || !hasWebGL()) { el.querySelector('.noweb').hidden = false; }
    else {
      L.x3d = new VL.Explorer3D(host, {
        onPick: p => { if (p.kind === 'pin') { showPin(card, VL.pinById[p.id]); huntCheck(VL.pinById[p.id]); } else showPart(card, p.id); },
        onHover: (p, e) => { if (!p) { tip.hidden = true; return; } const r = host.getBoundingClientRect(); tip.hidden = false; tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; if (p.kind === 'pin') { const pin = VL.pinById[p.id]; tip.innerHTML = `<b style="color:${VL.PIN_TYPES[pin.type].color}">${pin.label}</b> ${pin.gpio !== null ? '· GPIO' + pin.gpio : ''}`; } else tip.innerHTML = `<b>${(VL.PART_INFO[p.id] || { t: p.id }).t}</b>`; }
      });
      L.x3d.setModel('esp32');
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => L.x3d.view(b.dataset.v));
      el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => L.x3d.zoom(+b.dataset.z));
      el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const on = !b.classList.contains('on'); el.querySelectorAll('[data-f]').forEach(x => x.classList.remove('on')); if (on) b.classList.add('on'); L.x3d.setFilter(on ? b.dataset.f : null); });
    }
    let hi = S().p.pinHunt || 0; let tries = 0;
    const renderHunt = (msg, ok) => {
      if (hi >= VL.PIN_HUNT.length) { hunt.innerHTML = `<h3>🎯 Pin hunt complete!</h3><p>You found all ${VL.PIN_HUNT.length} pins. You can now tell power, ground and GPIO pins apart.</p>${msg ? `<div class="fb ok">${msg}</div>` : ''}<button class="btn-sm" data-rehunt>Play again</button>`; hunt.querySelector('[data-rehunt]').onclick = () => { hi = 0; renderHunt(); }; return; }
      hunt.innerHTML = `<h3>🎯 Pin hunt <span class="muted">${hi + 1} / ${VL.PIN_HUNT.length}</span></h3><div class="prog"><i style="width:${hi / VL.PIN_HUNT.length * 100}%"></i></div><p class="q">${VL.PIN_HUNT[hi].q}</p>${msg ? `<div class="fb ${ok ? 'ok' : 'no'}">${msg}</div>` : '<div class="muted small">Click the pin on the 3D board.</div>'}`;
    };
    const huntCheck = pin => {
      if (hi >= VL.PIN_HUNT.length) return; const H = VL.PIN_HUNT[hi];
      if (H.ok(pin)) { hi++; tries = 0; S().p.pinHunt = Math.max(S().p.pinHunt || 0, hi); S().skill('pins', 8); S().save(); renderHunt(`✅ Yes! ${H.why}`, true); if (hi >= VL.PIN_HUNT.length) finish('explore', 'pins', 20); }
      else { tries++; S().mistake('PIN_ID'); renderHunt(`❌ That is <b>${pin.label}</b> (${VL.PIN_TYPES[pin.type].name}). ${tries >= 2 ? 'Tip: use the coloured filter buttons above the board.' : 'Try again!'}`, false); }
    };
    renderHunt();
  }
  function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  function showPin(card, p) {
    const t = VL.PIN_TYPES[p.type]; const safe = p.ledOK ? '<span class="ok">✅ Good for an LED</span>' : p.type === 'strap' ? '<span class="warn">⚠️ Use with care</span>' : '<span class="no">⛔ Not for an LED</span>';
    card.innerHTML = `<div class="pin-title"><span class="pdot" style="--c:${t.color}"></span><div><h3>${p.label}${p.gpio !== null && p.label !== 'GPIO' + p.gpio ? ` <span class="muted">· GPIO${p.gpio}</span>` : ''}</h3><div class="muted small">Header ${p.side === 'L' ? 'J2 (left)' : 'J3 (right)'} · pin ${p.idx}</div></div></div>
      <div class="chip static" style="--c:${t.color}">${t.name}</div>
      ${p.funcs.length ? `<div class="funcs">${p.funcs.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
      <p>${esc(p.desc)}</p><div class="safe">${safe}</div>`;
  }
  function showPart(card, id) {
    const info = VL.PART_INFO[id]; if (!info) return;
    card.innerHTML = `<h3>${info.t}</h3><p>${info.d}</p>${info.diagram ? blockDiagram() : ''}`;
  }
  function blockDiagram() {
    const b = (x, y, w, h, t, c) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}22" stroke="${c}"/><text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle">${t}</text></g>`;
    return `<div class="bd-title">Inside the ESP32 chip (functional diagram)</div><svg class="blockdiag" viewBox="0 0 320 230">
      ${b(10, 10, 95, 34, 'CPU core 0', '#22d3ee')}${b(115, 10, 95, 34, 'CPU core 1', '#22d3ee')}${b(220, 10, 90, 34, 'SRAM 520 KB', '#a855f7')}
      ${b(10, 58, 95, 34, 'Wi-Fi radio', '#14b8a6')}${b(115, 58, 95, 34, 'Bluetooth', '#3b82f6')}${b(220, 58, 90, 34, 'ROM', '#a855f7')}
      ${b(10, 106, 140, 34, 'GPIO matrix', '#facc15')}${b(160, 106, 150, 34, 'ADC · DAC · Touch', '#f59e0b')}
      ${b(10, 154, 140, 34, 'UART · SPI · I2C · PWM', '#ec4899')}${b(160, 154, 150, 34, 'RTC + ULP (low power)', '#34d399')}
      ${b(60, 198, 200, 26, 'External 4 MB flash ← GPIO 6–11', '#f43f5e')}
    </svg><p class="muted small">This is why GPIO 6–11 are never used: they carry your program from the flash chip.</p>`;
  }

  /* ============================ 2. THEORY ============================ */
  function theory(el) {
    el.innerHTML = `<div class="theory">
      ${sarraSays(`<p>Before we build, let's understand <b>three kinds of pins</b> and why every LED needs a <b>resistor</b>. Play with the controls: the numbers come from the same electrical model the lab uses.</p>`, "Before we build, let's understand three kinds of pins and why every LED needs a resistor.")}
      <div class="grid3">
        <div class="card glass kind"><div class="kicon" style="--c:#ff4d6d">⚡</div><h3>Power pins</h3><p><b>3V3</b> always gives 3.3 V. <b>5V</b> comes from USB. Your program <em>cannot</em> switch them.</p><div class="volt">3V3 → <b>3.3 V</b> always</div></div>
        <div class="card glass kind"><div class="kicon" style="--c:#9aa4b8">⏚</div><h3>Ground (GND)</h3><p>0 V, the <b>return path</b>. Current leaves the source, flows through your parts and comes back to GND.</p><div class="volt">GND → <b>0 V</b></div></div>
        <div class="card glass kind gpio-demo"><div class="kicon" style="--c:#22d3ee">⇅</div><h3>GPIO pins</h3><p>Your program decides: <b>HIGH = 3.3 V</b> or <b>LOW = 0 V</b>. That's how code controls hardware.</p><div class="volt">GPIO4 → <b class="gv">0 V (LOW)</b> <button class="btn-xs" data-tg>Toggle</button></div></div>
      </div>
      <div class="card glass calc">
        <div class="calc-l">
          <h3>🧪 LED current lab</h3>
          <svg viewBox="0 0 300 170" class="mini-circ">
            <rect x="10" y="30" width="70" height="110" rx="8" fill="#141a28" stroke="#22d3ee"/><text x="45" y="62" text-anchor="middle" class="tlbl">GPIO4</text><text x="45" y="84" text-anchor="middle" class="tval gvv">3.3 V</text><text x="45" y="124" text-anchor="middle" class="tlbl">GND</text>
            <path d="M80 60 H130" class="cw"/><rect x="130" y="50" width="56" height="20" rx="8" fill="#d8c39a"/><text x="158" y="44" text-anchor="middle" class="tlbl rlab">220 Ω</text>
            <path d="M186 60 H240 V75" class="cw"/><circle cx="240" cy="88" r="13" class="mled" fill="#ff2b2b"/><circle cx="240" cy="88" r="30" class="mglow" fill="#ff3b3b" opacity="0" filter="url(#mblur)"/>
            <path d="M240 101 V124 H80" class="cw"/><defs><filter id="mblur"><feGaussianBlur stdDeviation="6"/></filter></defs>
            <circle r="3" class="e1" fill="#facc15"><animateMotion dur="2s" repeatCount="indefinite" path="M80 60 H240 V124 H80"/></circle>
          </svg>
          <div class="ctl"><label>LED colour <select data-c="color">${Object.entries(VL.LED_TYPES).map(([k, t]) => `<option value="${k}">${t.name} (Vf ≈ ${t.vf} V)</option>`).join('')}</select></label>
          <label>Resistor <input type="range" min="0" max="${VL.RESISTOR_VALUES.length - 1}" value="4" data-c="r"><b class="rv">220 Ω</b></label></div>
        </div>
        <div class="calc-r">
          <div class="big-i"><span class="iv">—</span><small>current through the LED</small></div>
          <div class="gauge"><div class="zones"><i class="z1"></i><i class="z2"></i><i class="z3"></i><i class="z4"></i></div><div class="needle"></div><div class="gl"><span>dim</span><span>good 3–15 mA</span><span>risky</span><span>danger</span></div></div>
          <div class="verdict"></div>
          <div class="formula f1"></div>
          <div class="muted small">Calculated with the lab's educational model (ideal 3.3 V source, LED diode model).</div>
        </div>
      </div>
      <div class="card glass yourturn"><h3>✍️ Your turn</h3>
        <div class="q1"><p>A <b>yellow LED</b> (Vf = 2.1 V) is connected to a 3.3 V GPIO through a <b>330 Ω</b> resistor. Using I = (V − Vf) / R, what is the current in mA?</p><div class="row"><input type="number" step="0.01" placeholder="mA" class="a1"><button class="btn-sm" data-ck="1">Check</button><span class="fb1"></span></div></div>
        <div class="q2"><p>Which resistor keeps a <b>red LED</b> (Vf ≈ 2.0 V) close to 6 mA on a 3.3 V pin?</p><div class="opts">${['22 Ω', '220 Ω', '2.2 kΩ', '22 kΩ'].map((o, i) => `<button class="opt" data-o="${i}">${o}</button>`).join('')}</div><span class="fb2"></span></div>
      </div>
    </div><div class="step-foot">${nextBtn('theory')}</div>`;
    bindNext(el); bindSay(el);
    let hi = 0; el.querySelector('[data-tg]').onclick = () => { hi = 1 - hi; el.querySelector('.gv').textContent = hi ? '3.3 V (HIGH)' : '0 V (LOW)'; el.querySelector('.gpio-demo').classList.toggle('hi', !!hi); };
    const st = { color: 'red', r: 4 };
    const upd = () => {
      const R = VL.RESISTOR_VALUES[st.r]; el.querySelector('.rv').textContent = VL.fmtOhm(R); el.querySelector('.rlab').textContent = VL.fmtOhm(R);
      const circ = { comps: [{ id: 'r', type: 'resistor', value: R, x: 8, y: 5, rot: 0 }, { id: 'l', type: 'led', color: st.color, x: 12, y: 4, rot: 0 }], wires: [{ a: 'P:R13', b: 'H:8:3' }, { a: 'P:R1', b: 'H:13:3' }] };
      const res = VL.Circuit.solve(circ, { 4: 1 }); const led = res.els.find(e => e.kind === 'D'); const I = led.I;
      const t = VL.LED_TYPES[st.color]; el.querySelector('.mled').setAttribute('fill', t.color); const g = el.querySelector('.mglow'); g.setAttribute('fill', t.color); g.setAttribute('opacity', VL.Circuit.brightness(I).toFixed(2));
      el.querySelector('.iv').textContent = VL.fmtI(I);
      const pos = Math.min(1, I / 0.03); el.querySelector('.needle').style.left = (pos * 100) + '%';
      const v = I < 0.001 ? ['dim', 'Very dim: the resistor is too big' + (t.vf >= 3 ? ', and this LED needs ~3 V, leaving little for the resistor.' : '.')] : I < 0.015 ? ['good', 'Great choice: bright enough and safe for the LED and the ESP32 pin.'] : I < 0.025 ? ['risky', 'Risky: above the ~15 mA we recommend for an ESP32 pin.'] : ['danger', 'Danger! This current can burn the LED and damage the pin.'];
      const vd = el.querySelector('.verdict'); vd.className = 'verdict ' + v[0]; vd.textContent = v[1];
      el.querySelector('.f1').innerHTML = `I = (3.3 V − ${led.Vab.toFixed(2)} V) / ${R} Ω = <b>${VL.fmtI((3.3 - led.Vab) / R)}</b>`;
      el.querySelector('.e1').style.display = I > 1e-4 ? '' : 'none';
    };
    el.querySelector('[data-c=color]').onchange = e => { st.color = e.target.value; upd(); };
    el.querySelector('[data-c=r]').oninput = e => { st.r = +e.target.value; upd(); };
    upd();
    let ok1 = false, ok2 = false; const chk = () => { if (ok1 && ok2) finish('theory', 'ohm', 35); };
    el.querySelector('[data-ck="1"]').onclick = () => { const v = parseFloat(el.querySelector('.a1').value); const right = 1000 * (3.3 - 2.1) / 330; const fb = el.querySelector('.fb1'); if (Math.abs(v - right) <= right * 0.1) { ok1 = true; fb.innerHTML = `<span class="ok">✅ Correct: (3.3 − 2.1) / 330 = 0.00364 A ≈ 3.6 mA</span>`; chk(); } else { S().mistake('OHM_CALC'); fb.innerHTML = `<span class="no">❌ Not quite. Subtract first: 3.3 − 2.1 = 1.2 V. Then divide by 330 Ω and multiply by 1000 for mA.</span>`; } };
    el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const i = +b.dataset.o; const fb = el.querySelector('.fb2'); el.querySelectorAll('[data-o]').forEach(x => x.classList.remove('right', 'wrong')); if (i === 1) { b.classList.add('right'); ok2 = true; fb.innerHTML = '<span class="ok">✅ Yes: (3.3 − 2.0) / 220 ≈ 5.9 mA.</span>'; chk(); } else { b.classList.add('wrong'); S().mistake('OHM_CALC'); fb.innerHTML = `<span class="no">❌ ${i === 0 ? '22 Ω gives ~59 mA: far too much!' : i === 2 ? '2.2 kΩ gives ~0.6 mA: very dim.' : '22 kΩ gives ~0.06 mA: almost invisible.'}</span>`; } });
  }

  /* ============================ 3. BUILD ============================ */
  function buildChecks(wb) {
    const d = wb.diag || { issues: [], ledInfo: [] }; const iss = d.issues.map(i => i.code);
    const leds = wb.circ.comps.filter(c => c.type === 'led'), rs = wb.circ.comps.filter(c => c.type === 'resistor');
    const res0 = d.res0; let series = false;
    if (res0) res0.els.filter(e => e.kind === 'D').forEach(l => res0.els.filter(e => e.kind === 'R' && e.a !== e.b).forEach(r => { if ([r.a, r.b].some(n => n === l.a || n === l.b)) series = true; }));
    const info = d.ledInfo.find(i => i.gpios.length) || {};
    const pin = info.gpios ? VL.PINS.find(p => p.gpio === info.gpios[0]) : null;
    const lit = wb.testHigh && info.Ion > 2e-4;
    return [
      ['Place an LED on the breadboard', leds.length > 0],
      ['Place a resistor (220 Ω or 330 Ω is ideal)', rs.length > 0],
      ['Connect the resistor and the LED in series (share a column)', series && !iss.includes('LED_SHORTED')],
      ['Wire a safe GPIO pin to the circuit', !!pin && pin.ledOK],
      ['Connect the LED cathode (−) side to GND', !!pin && !iss.includes('NO_GND')],
      ['Keep the current safe (1–15 mA)', info.Ion > 0.001 && info.Ion <= 0.015],
      ['Press “⚡ Test: GPIO HIGH” and see the LED light', lit]
    ];
  }
  const checksHTML = (items, title) => `<div class="mission"><div class="m-t">${title}</div>${items.map(([t, ok]) => `<div class="mi ${ok ? 'ok' : ''}"><span>${ok ? '✅' : '◻️'}</span>${t}</div>`).join('')}</div>`;
  function build(el) {
    el.innerHTML = `<div class="build">${sarraSays(`<p><b>Mission:</b> build an LED circuit. GPIO pin → resistor → LED anode (+, long leg) → LED cathode (−) → GND. Hover over a hole to see which holes are connected. Use <b>⚡ Test</b> to try it without code.</p>`, 'Mission: build an LED circuit. GPIO pin, then resistor, then the LED anode, then the LED cathode, then ground.')}<div class="wbhost"></div></div><div class="step-foot"><button class="btn-sm hintb">💡 Ask Mrs Sarra for a hint</button>${nextBtn('build')}</div>`;
    bindNext(el); bindSay(el);
    L.wbKind = 'main';
    L.wb = new VL.Workbench(el.querySelector('.wbhost'), {
      code: false,
      checksHTML: wb => checksHTML(buildChecks(wb), 'Build mission'),
      onChange: () => saveWork(),
      onAnalyze: wb => { const c = buildChecks(wb); if (c.every(x => x[1])) { finish('build', 'wiring', 35); } }
    });
    L.wb.setCircuit(work().circuit);
    el.querySelector('.hintb').onclick = () => VL.Sarra.autoHint(L.wb);
  }

  /* ============================ 4. CODE & RUN ============================ */
  function codeChecks(wb) {
    const d = wb.diag || { issues: [], ledInfo: [] }; const info = d.ledInfo.find(i => i.gpios.length);
    const code = (wb.code || '').replace(/#.*/g, ''); const pins = VL.Py.staticPins(wb.code || '');
    const r = wb.lastRun && wb.lastRun.code === wb.code ? wb.lastRun : null;
    const st = r && r.ledStats && r.ledStats.find(s => info && s.gpio === info.gpios[0]);
    const blinked = !!(st && st.transitions >= 4 && st.medianGap >= 50 && r.pulses && r.pulses.some(p => p.pulses.length >= 2));
    return [
      ['Your circuit from the Build step is wired to a GPIO', !!info],
      [`Code creates the output pin you wired${info ? ` (Pin(${info.gpios[0]}, Pin.OUT))` : ''}`, !!info && pins.includes(info.gpios[0])],
      ['Use a loop so it repeats', /while\s+True\s*:|for\s+\w+\s+in/.test(code)],
      ['Add a pause with sleep()', /sleep(_ms|_us)?\s*\(/.test(code)],
      ['RUN without errors', !!r && !r.error],
      ['See the LED blink (changes at least 4 times, slowly enough to see)', blinked],
      ['Measure the LED current with the multimeter (mA mode, while running)', !!wb.measuredA]
    ];
  }
  function code(el) {
    el.innerHTML = `<div class="codestep">${sarraSays(`<p>Now let's give your circuit a brain! Complete the program: put your GPIO number in <code>Pin(  , Pin.OUT)</code>, press <b>▶ RUN</b> and watch the LED. Your code really runs in Python on a virtual ESP32 clock. Then open the <b>Multimeter</b> tab, choose <b>mA</b> and click the LED.</p>`, "Now let's give your circuit a brain! Complete the program, press run and watch the LED.")}<div class="wbhost"></div></div><div class="step-foot"><button class="btn-sm hintb">💡 Ask Mrs Sarra for a hint</button>${nextBtn('code')}</div>`;
    bindNext(el); bindSay(el);
    L.wbKind = 'main';
    L.wb = new VL.Workbench(el.querySelector('.wbhost'), {
      code: true, initialCode: work().code,
      checksHTML: wb => checksHTML(codeChecks(wb), 'Code mission'),
      onChange: () => saveWork(),
      onAnalyze: wb => { if (codeChecks(wb).every(x => x[1])) finish('code', 'code', 35); },
      onRun: (wb, r) => { if (!r.error) S().skill('code', 4); S().save(); }
    });
    L.wb.setCircuit(work().circuit, work().code);
    el.querySelector('.hintb').onclick = () => VL.Sarra.autoHint(L.wb);
  }

  /* ============================ 5. BUG HUNT ============================ */
  function debug(el) {
    const solved = S().p.bugs || {};
    el.innerHTML = `<div class="debug">${sarraSays(`<p>Real engineers spend a lot of time <b>troubleshooting</b>. Three students sent me broken projects. Pick one, investigate with the <b>multimeter</b>, the <b>timing diagram</b> and the checks, fix it, then press <b>RUN</b>.</p>`, 'Real engineers spend a lot of time troubleshooting. Pick a broken project, investigate, fix it and run it.')}
      <div class="bugs">${VL.BUGHUNTS.map((b, i) => `<button class="bug card glass ${solved[b.id] ? 'solved' : ''}" data-b="${i}"><span class="bn">Bug #${i + 1}</span><b>${b.title}</b><span>${b.story}</span><em>${solved[b.id] ? '✅ Fixed' : '🔎 Investigate'}</em></button>`).join('')}</div>
      <div class="wbhost"></div></div><div class="step-foot"><button class="btn-sm hintb" hidden>${VL.icon('bulb')} Hint</button>${nextBtn('debug')}</div>`;
    bindNext(el); bindSay(el);
    el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => openBug(el, +b.dataset.b));
  }
  function openBug(el, i) {
    const bug = VL.BUGHUNTS[i]; if (L.wb) { L.wb.destroy(); L.wb = null; }
    el.querySelectorAll('[data-b]').forEach(b => b.classList.toggle('on', +b.dataset.b === i));
    L.wbKind = 'bug';
    const host = el.querySelector('.wbhost'); host.innerHTML = '';
    const solvedNow = wb => { const r = wb.lastRun; const iss = wb.allIssues().filter(x => x.level === 'error'); return r && r.code === wb.code && !r.error && !iss.length && r.ledStats && r.ledStats.some(s => s.transitions >= 4 && s.medianGap >= 50) && r.pulses.some(p => p.pulses.length >= 2); };
    L.wb = new VL.Workbench(host, {
      code: true, initialCode: bug.code,
      checksHTML: wb => `<div class="mission"><div class="m-t">🐞 ${bug.title}</div><p class="small">${bug.story}</p>${solvedNow(wb) ? '<div class="mi ok">✅ Fixed! The LED blinks correctly.</div>' : '<div class="mi">◻️ Fix the project, then press RUN to prove the LED blinks.</div>'}</div>`,
      onAnalyze: wb => { if (solvedNow(wb)) { const b = S().p.bugs = S().p.bugs || {}; if (!b[bug.id]) { b[bug.id] = Date.now(); S().skill('debug', 12); S().save(); VL.ui.toast(`🐞 Bug #${i + 1} fixed!`); el.querySelectorAll('[data-b]')[i].classList.add('solved'); el.querySelectorAll('[data-b]')[i].querySelector('em').textContent = '✅ Fixed'; if (VL.BUGHUNTS.every(x => b[x.id])) finish('debug', 'debug', 20); } } }
    });
    L.wb.setCircuit(bug.circuit, bug.code);
    const hb = el.querySelector('.hintb'); hb.hidden = false; hb.onclick = () => VL.Sarra.autoHint(L.wb, [bug.expect]);
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ============================ 6. QUIZ ============================ */
  function quiz(el) {
    const qs = VL.QUIZ; let i = 0, score = 0; const answers = [];
    const Q = S().lesson(LID).quiz;
    const render = () => {
      if (i >= qs.length) return finishQuiz();
      const q = qs[i];
      let body = '';
      if (q.type === 'tf') body = `<div class="opts tf"><button class="opt" data-a="true">True</button><button class="opt" data-a="false">False</button></div>`;
      else if (q.type === 'pin') body = pinPicker();
      else body = `<div class="opts">${q.opts.map((o, k) => `<button class="opt" data-a="${k}">${esc(o)}</button>`).join('')}</div>`;
      const qtxt = q.q.includes('\n') ? `<p>${esc(q.q.split('\n')[0])}</p><pre class="qcode">${VL.highlightPy ? q.q.split('\n').slice(2).map(l => VL.highlightPy(l)).join('\n') : esc(q.q)}</pre>` : `<p>${esc(q.q)}</p>`;
      el.innerHTML = `<div class="quiz card glass"><div class="qhead"><span class="qtype">${{ mc: 'Multiple choice', tf: 'True / False', pin: 'Pin identification', calc: 'Calculation', code: 'Code interpretation', trouble: 'Troubleshooting' }[q.type]}</span><span>Question ${i + 1} / ${qs.length}</span><span>Score ${score}</span></div><div class="prog"><i style="width:${i / qs.length * 100}%"></i></div>${qtxt}${body}<div class="qfb"></div></div>`;
      const answer = (correct, btn) => {
        answers.push(correct); if (correct) score++; else S().mistake('QUIZ_' + i);
        el.querySelectorAll('.opt, .ppin').forEach(b => b.disabled = true); if (btn) btn.classList.add(correct ? 'right' : 'wrong');
        if (!correct && q.type !== 'pin') { const r = el.querySelector(`[data-a="${q.type === 'tf' ? String(q.a) : q.a}"]`); r && r.classList.add('right'); }
        el.querySelector('.qfb').innerHTML = sarraSays(`<p><b>${correct ? 'Correct!' : 'Not quite.'}</b> ${esc(q.exp)}</p>`, q.exp) + `<button class="btn-primary qnext">${i + 1 < qs.length ? 'Next question →' : 'See my results →'}</button>`;
        bindSay(el); el.querySelector('.qnext').onclick = () => { i++; render(); };
      };
      if (q.type === 'pin') el.querySelectorAll('.ppin').forEach(b => b.onclick = () => answer(q.ok(VL.pinById[b.dataset.p]), b));
      else el.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(q.type === 'tf' ? (b.dataset.a === 'true') === q.a : +b.dataset.a === q.a, b));
    };
    const finishQuiz = () => {
      const pct = Math.round(score / qs.length * 100);
      Q.attempts++; Q.last = pct; Q.best = Math.max(Q.best || 0, pct); Q.answers = answers; Q.at = Date.now(); S().event('quiz', `${S().p.name || 'A student'} finished the quiz "ESP32 Lesson 1": ${score}/${qs.length} (${pct}%)`, true);
      if (pct >= 70) { S().markStep(LID, 'quiz'); }
      S().skill('pins', answers[2] ? 10 : 0); S().skill('ohm', (answers[3] ? 5 : 0) + (answers[4] ? 10 : 0)); S().skill('code', (answers[6] ? 8 : 0) + (answers[9] ? 8 : 0)); S().skill('debug', answers[7] ? 10 : 0); S().skill('wiring', (answers[5] ? 5 : 0) + (answers[8] ? 5 : 0));
      S().save();
      el.innerHTML = `<div class="quiz card glass done"><h2>${pct >= 70 ? '🎉' : '💪'} You scored ${score} / ${qs.length} (${pct}%)</h2><p>${pct >= 70 ? 'Brilliant! You passed the quiz.' : 'You need 70% to pass. Review the explanations and try again: every attempt makes you stronger.'}</p><div class="qsum">${answers.map((a, k) => `<span class="${a ? 'ok' : 'no'}" title="${esc(qs[k].q.split('\n')[0])}">${k + 1}</span>`).join('')}</div><div class="row"><button class="btn-sm" data-retry>↺ Try again</button>${nextBtn('quiz', 'See my results')}</div></div>`;
      el.querySelector('[data-retry]').onclick = () => quiz(el); bindNext(el); renderStepper();
    };
    el.innerHTML = `<div class="quiz card glass intro"><h2>📝 Final quiz</h2><p>10 questions: multiple choice, true/false, pin identification, calculation, code interpretation and troubleshooting. Mrs Sarra explains every answer.</p><p class="muted">Best score: ${Q.best === null ? '—' : Q.best + '%'} · Attempts: ${Q.attempts}</p><button class="btn-primary start">Start the quiz</button></div>`;
    el.querySelector('.start').onclick = render;
  }
  function pinPicker() {
    const col = side => VL.PINS.filter(p => p.side === side).map(p => `<button class="ppin" data-p="${p.id}">${p.label}</button>`).join('');
    return `<div class="pinpick"><div class="pcol">${col('L')}</div><div class="pboard"><span>ESP32</span></div><div class="pcol">${col('R')}</div></div>`;
  }

  /* ============================ 7. RESULTS ============================ */
  function results(el) {
    const l = S().lesson(LID); const steps = VL.LESSON1.steps.filter(s => s.id !== 'results'); const nd = steps.filter(s => done(s.id)).length;
    const passed = (l.quiz.best || 0) >= 70;
    const complete = nd === steps.length;
    if (complete && !l.completed) { l.completed = Date.now(); S().event('lesson', `${S().p.name || 'A student'} completed the lesson "Meet the ESP32"`); S().badge('esp32-explorer'); S().save(); }
    const mist = Object.entries(S().p.mistakes).filter(([k]) => VL.DIAG_TEXT[k]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const skills = VL.SKILLS.map(s => [s, S().p.skills[s.id] || 0]);
    const strong = skills.filter(([, v]) => v >= 50).map(([s]) => s.name);
    const advice = { NO_RES: 'Always put a resistor in series with an LED.', LED_REVERSED: 'Check LED polarity: long leg (+) toward the GPIO.', PIN_MISMATCH: 'Make sure the GPIO number in your code matches your wiring.', NO_GND: 'Every circuit needs a path back to GND.', TOO_FAST: 'Remember sleep() between on() and off().', SYNTAX: 'Watch indentation and colons in Python.', OPEN_CIRCUIT: 'Parts connect only when they share a breadboard column.', NO_GPIO: 'Connect your circuit to a GPIO pin with a jumper wire.', OVERCURRENT: 'Use Ohm\'s law to choose the resistor before powering up.', RUNTIME: 'Read error messages: they tell you the line and the reason.' };
    el.innerHTML = `<div class="results">
      <div class="card glass res-main">
        <div class="medal ${complete ? 'won' : ''}"><div class="m-in">🏅</div><div class="m-t">ESP32 Explorer</div></div>
        <div><h2>${complete ? 'Congratulations, you earned the ESP32 Explorer badge!' : `You've completed ${nd} of ${steps.length} steps`}</h2>
        <p>${complete ? 'You explored the board, calculated a resistor, built a real LED circuit, programmed it in MicroPython, measured it and fixed three bugs.' : 'Finish the remaining steps to earn your badge: ' + steps.filter(s => !done(s.id)).map(s => `<a href="javascript:void 0" data-go="${s.id}">${s.name}</a>`).join(', ') + '.'}</p>
        <div class="kpis"><div><b>${l.quiz.best === null ? '—' : l.quiz.best + '%'}</b><span>best quiz</span></div><div><b>${l.quiz.attempts}</b><span>quiz attempts</span></div><div><b>${Object.keys(S().p.bugs || {}).length}/3</b><span>bugs fixed</span></div><div><b>${S().p.hints}</b><span>hints used</span></div><div><b>${S().p.runs}</b><span>program runs</span></div></div></div>
      </div>
      <div class="grid2">
        <div class="card glass"><h3>Skills developed</h3>${skills.map(([s, v]) => `<div class="skill"><span>${s.name}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('')}</div>
        <div class="card glass"><h3>Personal feedback</h3>
          ${sarraSays(`<p>${strong.length ? `You're getting strong at <b>${strong.join(', ')}</b>. ` : 'You have made a great start. '}${mist.length ? 'Here is what to focus on next:' : 'You made very few mistakes. Impressive!'}</p>${mist.length ? `<ul>${mist.map(([k]) => `<li>${esc(advice[k] || VL.DIAG_TEXT[k])}</li>`).join('')}</ul>` : ''}<p>${S().p.hints > 6 ? 'Try to solve the next problem with fewer hints: think first, then ask.' : 'You used hints wisely. That is how engineers learn!'}</p>`)}
          <button class="btn-sm ai-only ${VL.Sarra.sample ? '' : 'unavail'}" data-aifb>✨ Ask Mrs Sarra for a detailed review</button>
        </div>
      </div>
      <div class="card glass next-up"><h3>Recommended next</h3><div class="recs">
        <a class="rec" href="#lab"><b>🧪 Free lab challenges</b><span>Slow blink, heartbeat, SOS, police lights, traffic light</span></a>
        <a class="rec" href="#ohm"><b>⚡ Ohm's Law Playground</b><span>Electricity world</span></a>
        <div class="rec planned"><b>🔒 Lesson 2: Digital inputs & buttons</b><span>Planned: needs the button simulator</span></div>
      </div></div>
    </div>`;
    el.querySelectorAll('[data-go]').forEach(a => a.onclick = () => go(a.dataset.go));
    const ai = el.querySelector('[data-aifb]'); if (ai) ai.onclick = () => VL.Sarra.ask(`Please give me personal feedback on my work in this lesson. My data: ${JSON.stringify({ steps: Object.keys(l.steps), quiz: l.quiz, mistakes: S().p.mistakes, hints: S().p.hintLog, skills: S().p.skills })}. Tell me 2 strengths, 2 things to practise and 1 challenge to try next.`);
  }
  VL.Lesson.go = go;
})();
