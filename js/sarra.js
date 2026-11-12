/* =========================================================================
   sarra.js : Mrs Sarra, the AI robotics instructor
   • Progressive 3-level hints (work offline, driven by real diagnostics)
   • AI chat (Claude via the artifact `sample` capability) that receives
     the student's real circuit, code, run log and diagnostics
   • Optional voice (artifact `tts` capability)
   ========================================================================= */
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = s => {
    let h = esc(s).replace(/```(?:\w+)?\n([\s\S]*?)```/g, (_, c) => `<pre class="mdpre">${c}</pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const lines = h.split('\n'); let out = '', inList = false;
    lines.forEach(l => { const m = l.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)/); if (m && !l.includes('<pre')) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${m[1]}</li>`; } else { if (inList) { out += '</ul>'; inList = false; } out += l.trim() ? `<p>${l}</p>` : ''; } });
    if (inList) out += '</ul>'; return out;
  };
  VL.md = md;

  const S = { msgs: [], level: {}, busy: false, sample: undefined, tts: undefined, mode: 'lesson', ctx: null };
  S.init = async () => {
    if (!window.claude || !window.claude.use) { S.sample = null; S.tts = null; S.updateAvail(); return; }
    try { S.sample = await window.claude.use('sample'); } catch (e) { S.sample = null; }
    try { S.tts = await window.claude.use('tts'); if (S.tts) S.tts.onState(({ state }) => document.body.classList.toggle('speaking', state === 'speaking')); } catch (e) { S.tts = null; }
    S.updateAvail();
  };
  S.updateAvail = () => {
    document.querySelectorAll('.ai-only').forEach(el => el.classList.toggle('unavail', !S.sample));
    document.querySelectorAll('.tts-only').forEach(el => el.hidden = !S.tts);
    const note = document.querySelector('#sarra-panel .ai-note'); if (note) note.hidden = !!S.sample;
  };
  S.speak = async text => {
    if (!S.tts) return;
    try { await S.tts.speak(text.replace(/[*`#]/g, '').slice(0, 1900), { voice: 'airy', language: 'en' }); } catch (e) { if (e && e.code === 'not_granted') { S.tts = null; S.updateAvail(); } }
  };
  S.stopSpeak = () => { try { S.tts && S.tts.stop(); } catch (e) { } };

  /* ---------------- panel ---------------- */
  S.panel = () => document.getElementById('sarra-panel');
  S.open = () => { S.panel().classList.add('open'); document.body.classList.add('sarra-open'); setTimeout(() => { const i = S.panel().querySelector('textarea'); i && i.focus(); }, 250); };
  S.close = () => { S.panel().classList.remove('open'); document.body.classList.remove('sarra-open'); };
  S.toggle = () => S.panel().classList.contains('open') ? S.close() : S.open();
  S.setContext = fn => { S.ctx = fn; };
  S.push = (role, html, opts = {}) => {
    const m = { role, html, text: opts.text || '', kind: opts.kind || '' }; S.msgs.push(m); S.renderMsgs(); return m;
  };
  S.renderMsgs = () => {
    const box = S.panel().querySelector('.msgs');
    box.innerHTML = S.msgs.map((m, i) => `<div class="msg ${m.role} ${m.kind}">${m.role === 'sarra' ? '<img src="img/sarra-icon.webp" alt="" class="av">' : ''}<div class="bubble">${m.html}${m.role === 'sarra' && m.text ? `<button class="say tts-only" data-say="${i}" title="Read aloud" ${S.tts ? '' : 'hidden'}>🔊</button>` : ''}</div></div>`).join('') + (S.busy ? '<div class="msg sarra"><img src="img/sarra-icon.webp" alt="" class="av"><div class="bubble typing"><i></i><i></i><i></i></div></div>' : '');
    box.querySelectorAll('[data-say]').forEach(b => b.onclick = () => S.speak(S.msgs[+b.dataset.say].text));
    box.querySelectorAll('[data-more]').forEach(b => b.onclick = () => S.hint(b.dataset.more, S._wb, true));
    box.querySelectorAll('[data-askai]').forEach(b => b.onclick = () => S.ask(b.dataset.askai));
    box.scrollTop = box.scrollHeight;
  };

  /* ---------------- progressive hints ---------------- */
  S.hint = (code, wb, more) => {
    S._wb = wb; const H = VL.HINTS[code]; if (!H) return;
    const lv = Math.min(3, (S.level[code] || 0) + 1); S.level[code] = lv;
    VL.Store.hint(code, lv); VL.Store.mistake(code);
    const label = ['', 'Hint 1 · think about it', 'Hint 2 · where to look', 'Hint 3 · the fix'][lv];
    const txt = H[lv - 1];
    S.push('sarra', `<div class="hint-lv l${lv}">${label}</div><p>${esc(txt)}</p>${lv < 3 ? `<button class="btn-xs" data-more="${code}">I need more help →</button>` : ''} <button class="btn-xs ai-only ${S.sample ? '' : 'unavail'}" data-askai="Can you help me understand this problem: ${esc(VL.DIAG_TEXT[code] || code)}">Ask me a question</button>`, { text: txt, kind: 'hint' });
    S.open();
  };
  /* pick the most important issue for the current step */
  S.autoHint = (wb, prefer) => {
    if (wb && wb.isLab3d) { wb.hint(); return; }
    const iss = wb ? wb.allIssues() : [];
    const order = ['SHORT', 'FIVE_V', 'FLASH_PIN', 'SYNTAX', 'RUNTIME', 'NO_LED', 'LED_SHORTED', 'NO_RES', 'OVERCURRENT', 'LED_REVERSED', 'NO_GPIO', 'NO_GND', 'OPEN_CIRCUIT', 'POWER_PIN', 'INPUT_ONLY', 'PIN_MISMATCH', 'NO_PIN_CODE', 'TOO_FAST', 'NO_TOGGLE', 'NO_LOOP', 'RES_SHORTED', 'STRAP12', 'DIM'];
    const pool = prefer ? iss.filter(i => prefer.includes(i.code)) : iss;
    const top = (pool.length ? pool : iss).slice().sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))[0];
    if (top) S.hint(top.code, wb);
    else { S.push('sarra', `<p>I can't see any problem right now. Great work! 🎉 Try running the simulation, or ask me anything.</p>`, { text: 'I cannot see any problem right now. Great work!' }); S.open(); }
  };

  /* ---------------- describe lab state for the AI ---------------- */
  S.describeLab = wb => {
    if (wb && wb.isLab3d) return wb.describe();
    if (!wb) return null;
    const C = VL.Circuit; const nets = C.buildNets(wb.circ); const name = k => { const p = C.parseKey(k); return p.kind === 'H' ? 'hole ' + C.holeName(p.x, p.y) : (VL.pinById[p.pin].title + ' header pin ' + VL.pinById[p.pin].label); };
    const comps = wb.circ.comps.map(c => {
      if (c.type === 'led') { const P = C.ledPins(c); return `${VL.LED_TYPES[c.color].name} LED (Vf≈${VL.LED_TYPES[c.color].vf}V): anode in ${C.holeName(P.anode.x, P.anode.y)}, cathode in ${C.holeName(P.cathode.x, P.cathode.y)}`; }
      const L = C.compLegs(c); return `Resistor ${c.value} ohm: legs in ${C.holeName(L[0].x, L[0].y)} and ${C.holeName(L[1].x, L[1].y)}`;
    });
    const wires = wb.circ.wires.map(w => `${name(w.a)} -> ${name(w.b)}`);
    const run = wb.lastRun && wb.lastRun.code === wb.code ? {
      reason: wb.lastRun.reason, error: wb.lastRun.error, virtualTimeMs: Math.round(wb.lastRun.end),
      pinChanges: Object.entries(wb.lastRun.events.reduce((a, e) => (a[e.pin] = (a[e.pin] || 0) + 1, a), {})).map(([p, n]) => `GPIO${p}: ${n} writes`),
      ledStats: wb.lastRun.ledStats, serialFirstLines: wb.lastRun.serial.slice(0, 5).map(s => s.text.trim())
    } : 'not run since last edit';
    const ls = wb.lastSolve; const values = ls && ls.powered ? ls.res.els.map(e => `${e.comp.type === 'led' ? VL.LED_TYPES[e.comp.color].name + ' LED' : e.comp.value + ' ohm resistor'}: ${Math.abs(e.Vab).toFixed(2)} V, ${(Math.abs(e.I) * 1000).toFixed(2)} mA (calculated)`) : 'not powered';
    return {
      board: VL.BOARD_NAME, components: comps, wires, code: (wb.code || '').split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'),
      lastRun: run, calculatedValues: values,
      detectedIssues: wb.allIssues().map(i => `${i.code}: ${VL.DIAG_TEXT[i.code]}${i.detail ? ' (' + i.detail + ')' : ''}`),
      hintLevelsAlreadyGiven: S.level
    };
  };

  const SYSTEM = `You are "Mrs Sarra", the AI robotics instructor inside the Virtual Robotics & AI Lab created by teacher Mrs Sarra Ben Amara. You talk with secondary-school students learning electronics, electricity, ESP32 and MicroPython.
STYLE: warm, encouraging, curious and technically accurate. Simple English, short paragraphs, at most ~140 words unless the student asks for more. You may use **bold**, \`code\`, short bullet lists and small code blocks. Address the student directly. Never use emojis excessively (max 1).
TEACHING POLICY (very important):
- Encourage independent thinking. Use progressive help: start with a guiding question, then point to where to look, and only give the full correction if the student explicitly asks for the answer or hint levels for that problem have already reached 2 or more.
- Never write the complete solution program for the lesson exercise or a challenge unless the student has clearly tried and asks for it; prefer explaining one line or giving a skeleton with blanks.
- Base feedback on the LAB STATE you are given (components, wires, code with line numbers, run log, calculated values, detected issues). Quote line numbers and hole names. Do NOT invent readings: only use numbers present in the data, and say they come from the lab's educational calculation (DC nodal analysis + LED diode model, ideal 3.3 V GPIO), not a real measurement.
- The lab simulates ESP32, Arduino UNO, Raspberry Pi and Pico boards with LEDs, resistors, buttons, potentiometers and sensors, buzzers, RGB LEDs, servos, DC motors with H-bridges, OLED screens, I2C sensors, ultrasonic sensors, a virtual Wi-Fi network and robots, running MicroPython, Python and Arduino C++.
- Always answer general electronics, electricity, programming and robotics questions fully and clearly, even when they are not about the current exercise.
- Safety facts: ESP32 GPIO is 3.3 V (never connect 5 V to a GPIO); keep LED current around 5-15 mA; GPIO 34-39 are input-only; GPIO 6-11 are reserved for flash.
- If the student asks something off-topic, answer briefly and kindly steer back to robotics.`;

  const PLANNER = `ENGINEERING LAB MODE: the student describes a project idea. Guide them step by step like a mentor, one stage per reply, asking them a question at the end of each reply so they think: 1) understand the idea and its goal, 2) recommend hardware (board, sensors, actuators, power) explaining the purpose of each part, 3) check compatibility (3.3 V logic, current, motor drivers), 4) wiring plan (pin by pin, using safe ESP32 GPIOs), 5) program structure (pseudo-code first, then help them write the real MicroPython), 6) testing and troubleshooting, 7) improvements and extra challenges. Be explicit about which parts they can already build and simulate in this lab (LEDs and resistors on an ESP32) and which are for the real bench or future lab updates.`;

  /* ---------- offline knowledge: answers from the lessons when the AI is busy or unavailable ---------- */
  const STOP = new Set('a an the is are was were be to of in on at for and or but what why how does do did can could should would i my me you your it its this that these those with without from by as about which who when where use using used make get there their them we our explain please tell whats'.split(' '));
  const stem = w => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/eus$/, 'e');
  const words = t => (t.toLowerCase().replace(/<[^>]+>/g, ' ').match(/[a-z0-9]+/g) || []).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
  const FAQ = [
    { k: 'circuit work not working broken problem doesnt dont fix', a: '<p>Let\'s find the problem step by step, like an engineer:</p><ol><li><b>Power</b>: is 3V3 (red wire) on the + rail and GND (black wire) on the − rail?</li><li><b>LED direction</b>: long leg (anode) toward the pin, short leg (cathode) toward GND.</li><li><b>Same strip?</b> The two legs of a part must be in <b>different</b> columns.</li><li><b>Pin number</b>: does the GPIO in your code match the pin your wire is on?</li><li><b>Resistor</b>: about 220–330 Ω for an LED (red-red-brown or orange-orange-brown).</li></ol><p>Then press <b>Hint</b>: I will check your real circuit and code.</p>' },
    { k: 'led light emitting diode', a: '<p>An <b>LED</b> (light-emitting diode) is a tiny lamp that only lets current flow <b>one way</b>.</p><ul><li><b>Anode</b> (long leg) goes toward + (your GPIO pin).</li><li><b>Cathode</b> (short leg, flat side) goes toward GND.</li><li>It needs about <b>2 V</b> (red) to 3 V (blue/white) and around <b>5–15 mA</b>.</li><li>It <b>always needs a resistor</b> in series, otherwise too much current flows and it burns.</li></ul><p>Question for you: which leg of your LED is longer? 🙂</p>' },
    { k: 'resistor resistance why need series limit current', a: '<p>A <b>resistor</b> limits the current. An LED has almost no resistance once it turns on, so without a resistor the current would shoot up and burn the LED (and stress the GPIO pin).</p><div class="formula">R = (V<sub>supply</sub> − V<sub>LED</sub>) / I</div><p>Example: (3.3 V − 2.0 V) / 0.006 A ≈ <b>220 Ω</b> → about 6 mA, bright and safe.</p><p>Try it: what current do you get with 330 Ω?</p>' },
    { k: 'ohm law voltage current resistance formula', a: '<p><b>Ohm\'s law</b>: <span class="formula">V = I × R</span></p><ul><li>V = voltage (volts, V): the "push".</li><li>I = current (amperes, A): the flow of charge.</li><li>R = resistance (ohms, Ω): how hard it is to flow.</li></ul><p>So I = V / R and R = V / I. Example: 5 V across 1000 Ω gives 5 mA.</p>' },
    { k: 'breadboard hole connected rail strip', a: '<p>On a breadboard each <b>column of 5 holes</b> (a–e, and f–j) is one metal strip, so parts in the same column are connected. The centre gap separates the two halves. The long <b style="color:#ef4444">+</b> and <b style="color:#3b82f6">−</b> rails run along the edges for power (red) and GND (black).</p>' },
    { k: 'gpio pin output input esp32 3v3 voltage', a: '<p>A <b>GPIO</b> (general-purpose input/output) pin can be an <b>output</b> (the code sets it to 3.3 V or 0 V) or an <b>input</b> (the code reads HIGH or LOW). On the ESP32 the logic level is <b>3.3 V</b>: never connect 5 V to a GPIO. GPIO 34–39 are input-only and GPIO 6–11 are used by the flash memory.</p>' },
    { k: 'ground gnd', a: '<p><b>GND</b> (ground) is the 0 V reference: every current that leaves a pin must come back to GND to complete the circuit. In the lab GND wires are <b>black</b>. No GND connection = no current = nothing works!</p>' },
    { k: 'pwm brightness duty cycle analogwrite', a: '<p><b>PWM</b> switches a pin on and off very fast. The <b>duty cycle</b> is the % of time it is ON: 50 % duty gives an average of half the voltage, so an LED looks half as bright. ESP32: <code>PWM(Pin(4)).duty_u16(32768)</code>. Arduino: <code>analogWrite(9, 128)</code>.</p>' },
    { k: 'servo motor angle', a: '<p>A <b>servo</b> turns to an angle (0–180°). It receives a pulse every 20 ms: about 1 ms = 0°, 1.5 ms = 90°, 2 ms = 180°. Wires: brown = GND, red = power, orange = signal.</p>' },
    { k: 'capacitor charge', a: '<p>A <b>capacitor</b> stores electric charge, like a tiny fast battery. It smooths voltages and, with a resistor, makes delays: the time constant is <b>τ = R × C</b>.</p>' },
    { k: 'transistor switch', a: '<p>A <b>transistor</b> is an electronic switch: a small base current lets a big current flow from collector to emitter. Use it when a load (motor, LED strip) needs more current than a GPIO pin can give (~20 mA).</p>' },
    { k: 'voltage volt', a: '<p><b>Voltage</b> (V) is the electrical "push" or pressure difference between two points. A battery or a GPIO pin creates it; the voltage pushes current through the circuit. Measure it across a part with a voltmeter.</p>' },
    { k: 'current ampere amp flow', a: '<p><b>Current</b> (A) is the flow of electric charge, like water flowing in a pipe. It is measured in amperes; small circuits use milliamperes (1 mA = 0.001 A). Measure it by putting an ammeter <b>in series</b>.</p>' }
  ];
  S.localAnswer = q => {
    const qw = words(q); if (!qw.length) return null; const qs = new Set(qw);
    let best = null, bs = 0;
    FAQ.forEach(f => { const ks = new Set(words(f.k)); let sc = 0; qs.forEach(w => { if (ks.has(w)) sc += 2; }); if (sc > bs) { bs = sc; best = f.a; } });
    const hits = [];
    (VL.LESSONS || []).forEach(L => (L.theory || []).forEach(t => { const tw = words(t.h + ' ' + t.p); const hw = new Set(words(t.h + ' ' + L.title)); let sc = 0; qs.forEach(w => { if (hw.has(w)) sc += 3; else if (tw.includes(w)) sc += 1; }); if (sc > 0) hits.push({ sc, L, t }); }));
    hits.sort((a, b) => b.sc - a.sc);
    const top = hits.filter(h => h.sc >= 3).slice(0, 2);
    if (!best && !top.length) return null;
    let html = best && bs >= 2 ? best : '';
    if (top.length) html += `<p class="muted small">From the lessons:</p>` + top.map(h => `<div class="sl-card"><b>${esc(h.t.h)}</b> <span class="muted small">· ${esc(h.L.title)}</span>${h.t.p || ''}${h.t.code ? `<pre class="qcode">${esc(h.t.code)}</pre>` : ''}<a class="btn-xs" href="${VL.lessonHref ? VL.lessonHref(h.L.id) : '#lesson-' + h.L.id}">Open the lesson →</a></div>`).join('');
    return html;
  };

  let coolUntil = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const KBQ = { 'led-polarity': 'Which leg of the LED is positive?', 'resistor-where': 'Where do I plug the resistor?', 'resistor-value': 'Which resistor value should I use?', 'resistor-why': 'Why does an LED need a resistor?', 'resistor-colour': 'How do I read the resistor colours?', 'led-not-on': 'My LED does not light up', 'gnd': 'What is GND?', 'positive-pin': 'Which pin is positive on the board?', 'breadboard': 'How does a breadboard work?', 'gpio-led-which': 'Which GPIO pin can I use for an LED?', 'button': 'How do I connect a button?', 'pwm': 'What is PWM?', 'servo': 'How do I wire a servo?', 'motor': 'How do I connect a motor?', 'ultrasonic': 'How do I wire the ultrasonic sensor?', 'potentiometer': 'How do I wire a potentiometer?', 'ohm': "What is Ohm's law?", 'i2c': 'Which pins are SDA and SCL?' };
  S.ask = async (text, opts = {}) => {
    if (!text || !text.trim()) return;
    S.open();
    S.push('me', esc(text));
    const mode = opts.mode || S.mode;
    const kb = VL.SarraKB ? VL.SarraKB.find(text) : { best: null, partial: [] };
    // 1) a clear, verified answer from Mrs Sarra's own knowledge: answer at once
    if (kb.best && mode !== 'planner' && !opts.forceAI) {
      const m = S.push('sarra', kb.best.a + (S.sample ? `<button class="btn-xs kb-more" data-more-ai="${esc(text)}">Explain more</button>` : ''), { text: kb.best.a.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
      m.offline = true; S.renderMsgs(); return;
    }
    Object.assign(KBQ, VL.SarraKB.chips || {});
    const sugg = () => { const seen = new Set(); return kb.partial.filter(e => KBQ[e.id]).concat(['kb-help', 'ac-pwm', 'wire-led', 'wire-hcsr04', 'led-not-on', 'board-diff'].map(id => VL.SarraKB.list.find(e => e.id === id))).filter(e => e && !seen.has(KBQ[e.id]) && seen.add(KBQ[e.id])).slice(0, 5); };
    const chips = () => `<div class="kb-chips">${sugg().filter(Boolean).map(e => `<button class="chip" data-kbq="${esc(KBQ[e.id] || '')}">${esc(KBQ[e.id] || '')}</button>`).join('')}</div>`;
    if (!S.sample) {
      const la = S.localAnswer ? S.localAnswer(text) : null;
      const m = la ? S.push('sarra', `${la}<p class="muted small">You can also ask:</p>${chips()}`, { text: la.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() })
        : S.push('sarra', `<p>I don't have an answer for that one yet. Try asking it another way (for example "what is PWM?" or "how do I wire a PIR on the ESP32?"), or pick one of these:</p>${chips()}`, { text: '' });
      m.offline = true; S.renderMsgs(); return;
    }
    const ctx = S.ctx ? S.ctx() : {};
    const history = S.msgs.filter(m => m.role !== 'sys' && m.kind !== 'hint' && !m.offline).slice(-8, -1).map(m => ({ role: m.role === 'me' ? 'user' : 'assistant', content: (m.text || m.html.replace(/<[^>]+>/g, ' ')).slice(0, 1200) })).filter(m => m.content.trim());
    while (history.length && history[0].role !== 'user') history.shift();
    const ctxTxt = JSON.stringify(ctx); const prompt = `${SYSTEM}\n${mode === 'planner' ? PLANNER : ''}\n\nCURRENT CONTEXT (JSON):\n${ctxTxt.length > 4000 ? ctxTxt.slice(0, 4000) + '…' : ctxTxt}\n\nSTUDENT MESSAGE (answer it directly and clearly first):\n${text}`;
    const msgs = [...history, { role: 'user', content: prompt }];
    const m = S.push('sarra', '<p class="muted">Thinking…</p>', { text: '' });
    const show = (html, offline) => { m.html = html; m.offline = !!offline; S.renderMsgs(); };
    const busyMsg = () => `<p>My AI brain is busy for a moment, so I couldn't answer that one yet. Ask again in a minute, or pick one of these questions: I can answer them right away.</p>${chips()}`;
    if (Date.now() < coolUntil) { show(busyMsg(), true); return; }
    const delays = [0, 4000, 12000];
    for (let k = 0; k < delays.length; k++) {
      if (delays[k]) { show(`<p class="muted">Thinking… (the AI is busy, trying again in ${delays[k] / 1000} s)</p>`); await wait(delays[k]); }
      try {
        const res = await S.sample(msgs, { cache: false, modelTier: k ? 'quick' : 'default', onText: ({ text: t }) => { if (t) { m.text = t; m.html = md(t); S.renderMsgs(); } } });
        m.text = res.text; show(md(res.text));
        VL.Store.p.aiQuestions = (VL.Store.p.aiQuestions || 0) + 1; VL.Store.save();
        return;
      } catch (e) {
        if (e && e.code === 'not_granted') { S.sample = null; S.updateAvail(); show(`<p>The AI chat is not allowed in this view. Here are questions I can answer right away:</p>${chips()}`, true); return; }
        if (e && e.code === 'rate_limited' && k < delays.length - 1) continue;
        if (e && e.text) { m.text = e.text; show(md(e.text)); return; }
        coolUntil = Date.now() + 45000; show(busyMsg(), true); return;
      }
    }
  };

  S.bindPanel = () => {
    const p = S.panel();
    p.querySelector('.msgs').addEventListener('click', e => { const c = e.target.closest('[data-kbq]'); if (c && c.dataset.kbq) { S.ask(c.dataset.kbq); return; } const mo = e.target.closest('[data-more-ai]'); if (mo) S.ask(mo.dataset.moreAi, { forceAI: true }); });
    p.querySelector('.x').onclick = S.close;
    const ta = p.querySelector('textarea');
    const send = () => { const v = ta.value; ta.value = ''; S.ask(v); };
    p.querySelector('.send').onclick = send;
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    p.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { S.mode = b.dataset.mode; p.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); ta.placeholder = S.mode === 'planner' ? 'Describe the robot or project you want to create…' : 'Ask Mrs Sarra about your circuit, code or lesson…'; });
    p.querySelector('.hintbtn').onclick = () => S.autoHint(S._wbGetter && S._wbGetter());
    p.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (b.dataset.q === 'planner') { p.querySelector('[data-mode=planner]').click(); ta.value = 'I want to create a robot that detects obstacles and changes direction.'; ta.focus(); } else S.ask(b.dataset.q); });
    document.getElementById('sarra-fab').onclick = S.toggle;
    S.push('sarra', `<p>Hello, young engineer! I'm <b>Mrs Sarra</b>. Click <b>Hint</b> any time you're stuck: I'll guide you step by step. You can also ask me questions, or switch to <b>Project planner</b> to design your own robot.</p>`, { text: "Hello, young engineer! I'm Mrs Sarra. Click Hint any time you're stuck." });
  };
  S.wbGetter = fn => { S._wbGetter = fn; };
  VL.Sarra = S;
})();
