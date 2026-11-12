/* =========================================================================
   codelab.js : Code Lab with a pre-wired virtual kit
   Devices: LEDs, buttons (press schedule), potentiometer / light sensor,
   servo, DC motor (H-bridge), Wi-Fi, I2C sensor, IoT dashboard, robot arena.
   The student's code really runs (Python / MicroPython / Arduino C++);
   the recorded timeline is replayed in real time.
   ========================================================================= */
(function () {
  const esc = s => VL.esc(s);
  const LANG = { micropython: { file: 'main.py', name: 'MicroPython' }, cpp: { file: 'sketch.ino', name: 'Arduino C++' }, python: { file: 'main.py', name: 'Python 3' }, gpiozero: { file: 'main.py', name: 'Python + gpiozero' } };
  const parseSched = txt => String(txt || '').split(/[,;]/).map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^([\d.]+)\s*(?:-|to|–)\s*([\d.]+)$/); return m ? [parseFloat(m[1]) * 1000, parseFloat(m[2]) * 1000] : null; }).filter(x => x && x[1] > x[0]);

  class CodeLab {
    constructor(host, o) {
      this.host = host; this.o = Object.assign({ lang: 'micropython', board: 'esp32', kit: [], limit: 10000 }, o);
      this.kit = JSON.parse(JSON.stringify(this.o.kit)); this.lang = this.o.lang === 'cpp' ? 'cpp' : 'py';
      const L = LANG[this.o.lang]; this.L = L; const I = VL.icon;
      const hasRobot = this.kit.some(d => d.type === 'robot'), hasDash = this.kit.some(d => d.type === 'dashboard');
      const consoleOnly = this.o.lang === 'python';
      host.innerHTML = `<div class="cl2 ${hasRobot ? 'with-robot' : ''}">
        <section class="cl2-stage glass">
          <div class="st-head"><div class="st-t">${I('cube')}<b>${esc(this.boardFull())}</b><span class="muted">${this.kit.length ? 'pre-wired kit · drag to rotate · scroll to zoom' : 'drag to rotate · scroll to zoom'}</span></div>
            <div class="st-tools"><button class="chip on" data-k3="labels" title="Show or hide the labels">${I('tag')} Labels</button><button class="chip" data-k3="iso">3D</button><button class="chip" data-k3="top">Top</button><button class="chip" data-k3="front">Front</button></div></div>
          <div class="k3host"><div class="k3-fallback" hidden>The 3D view needs WebGL, which is not available in this browser. The simulation still works: see the kit list below.</div></div>
          <div class="wlegend"><span><i style="background:${VL.WIRE ? VL.WIRE.gnd : '#111'}"></i>GND (black)</span><span><i style="background:${VL.WIRE ? VL.WIRE.vcc : '#d00'}"></i>Power ${this.o.board === 'uno' ? '5 V' : '3.3 V'} (red)</span><span><i class="sig"></i>Signals (other colours)</span></div>
          <div class="devs"></div>
          ${hasDash ? '<div class="wb-h">IoT dashboard <span class="muted">virtual cloud</span></div><canvas class="dash-c"></canvas>' : ''}
          ${hasRobot ? '<div class="wb-h">Robot arena <span class="muted">top view · 200 × 140 cm · kinematic model</span></div><canvas class="arena"></canvas><div class="arena-info muted small"></div>' : ''}
        </section>
        <section class="cl2-info glass">
          <div class="ctabs"><button data-tab="ov" class="on">${I('info')} Overview</button><button data-tab="wi">${I('pin')} Wiring</button><button data-tab="hw">${I('code')} How the code works</button><button data-tab="sp">${I('list')} Specs</button></div>
          <div class="ctab-body"></div>
        </section>
        <section class="cl2-code glass">
          <div class="code-head"><div class="ttl">${I('code')} <b>Try it yourself</b> <span class="lang">${L.file}</span><span class="lang">${L.name}</span></div>
            <div class="runbar"><span class="pystat"></span><select class="speed" title="Replay speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select><button class="btn-run">${I('play')} ${this.o.lang === 'cpp' ? 'Upload &amp; run' : 'Run'}</button><button class="btn-sm stop" title="Stop">${I('stop')} Stop</button><button class="btn-sm reset" title="Restore the starting code">${I('reset')}</button></div></div>
          ${this.o.blocks ? `<div class="blocks">${this.o.blocks.map((b, i) => `<button data-blk="${i}" title="${esc(b.code)}">${esc(b.label)}</button>`).join('')}</div>` : ''}
          <div class="editor-host"></div>
          ${consoleOnly ? '<label class="kbd">Keyboard input for input() (one answer per line)<textarea class="kin" rows="2">' + esc((this.o.inputs || []).join('\n')) + '</textarea></label>' : ''}
          <div class="cl-status"></div>
          <div class="cl-check"></div>
          <div class="code-foot"><button class="btn-sm explain-b">${I('eye')} Explain every line</button><span class="clock">t = 0.00 s</span></div>
        </section>
        <section class="cl2-ser glass">
          <div class="ser-head"><div class="ttl">${I('terminal')} <b>Serial monitor</b> <span class="muted">${this.o.board === 'uno' ? '9600 baud' : '115200 baud'}</span></div>
            <div class="ser-tools"><label class="tog"><input type="checkbox" class="pinact" ${consoleOnly ? '' : 'checked'}> pin activity</label><label class="tog"><input type="checkbox" class="autoscroll" checked> autoscroll</label><button class="btn-sm ser-clear">Clear</button></div></div>
          <pre class="serial cl-ser"></pre>
          ${consoleOnly ? '' : '<div class="wb-h">Pin timeline</div><canvas class="cl-tim"></canvas>'}
        </section>
      </div>`;
      const q = s => host.querySelector(s); this.q = q;
      this.ed = new VL.Editor(q('.editor-host'), { lang: this.lang, onChange: () => { this.code = this.ed.value; clearTimeout(this._hw); this._hw = setTimeout(() => { if (this.tab === 'hw') this.renderTab(); }, 500); } });
      this.ed.value = this.o.code || ''; this.code = this.ed.value;
      if (this.o.blocks) host.querySelectorAll('[data-blk]').forEach(b => b.onclick = () => this.ed.insertLine(this.o.blocks[+b.dataset.blk].code));
      q('.btn-run').onclick = () => this.run(); q('.stop').onclick = () => this.stop();
      q('.reset').onclick = () => VL.ui.confirm('Restore the starting code?', 'Your changes will be lost.', () => { this.ed.value = this.o.code || ''; this.renderTab(); });
      q('.explain-b').onclick = () => this.explain();
      q('.ser-clear').onclick = () => { q('.cl-ser').textContent = ''; };
      host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { host.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); this.tab = b.dataset.tab; this.renderTab(); });
      VL.Py.onStatus(s => { const el = q('.pystat'); if (!el) return; el.className = 'pystat ' + s; el.textContent = s === 'ready' ? '● engine ready' : s === 'loading' ? '◌ starting…' : s === 'error' ? 'engine unavailable' : ''; });
      this.tab = 'ov'; this.renderTab();
      this.serLine('Board: ' + this.boardFull() + (this.kit.length ? ' · kit pre-wired' : '') + '\nPress ' + (this.o.lang === 'cpp' ? 'Upload & run' : 'Run') + ' to send your program to the board.\n', 'sys');
      // 3D scene
      try {
        if (!window.THREE || !VL.Kit3D) throw new Error('no three');
        const t = document.createElement('canvas'); if (!(t.getContext('webgl2') || t.getContext('webgl'))) throw new Error('no webgl');
        this.k3 = new VL.Kit3D(q('.k3host'), { onDev: i => this.focusDev(i), onPick: p => { if (p && p.kind === 'dev') this.focusType(p.id); } });
        this.k3.setKit(this.o.board, this.kit);
        host.querySelectorAll('[data-k3]').forEach(b => b.onclick = () => { const k = b.dataset.k3; if (k === 'labels') { this.k3.labelsOn = !this.k3.labelsOn; b.classList.toggle('on', this.k3.labelsOn); this.k3.needs = true; } else { this.k3.view(k); if (k === 'iso') this.k3.orbit.radius = this.k3.kitR || this.k3.orbit.radius; this.k3.needs = true; } });
        this.k3.kitR = this.k3.orbit.radius; this.k3.baseR = this.k3.orbit.radius;
      } catch (e) { q('.k3-fallback').hidden = false; host.querySelectorAll('[data-k3]').forEach(b => b.disabled = true); }
      this.renderDevs(); this.status(this.o.goal ? `<b>Goal:</b> ${this.o.goal}` : 'Write your program and press Run.');
      this.raf = requestAnimationFrame(t => this.tick(t));
    }
    boardName() { return { esp32: 'ESP32', pico: 'Raspberry Pi Pico', rpi: 'Raspberry Pi', uno: 'Arduino UNO' }[this.o.board] || this.o.board; }
    boardFull() { return (VL.BOARD_INFO && VL.BOARD_INFO[this.o.board] || {}).name || this.boardName(); }
    destroy() { cancelAnimationFrame(this.raf); this.dead = true; if (this.k3) { try { this.k3.dispose(); } catch (e) { } } }
    focusDev(i) { const d = this.kit[i]; if (!d) return; this.q('[data-tab="wi"]').click(); const row = this.host.querySelector(`.wrow[data-dev="${i}"]`); if (row) { row.classList.add('flash'); row.scrollIntoView({ block: 'nearest' }); setTimeout(() => row.classList.remove('flash'), 1200); } }
    focusType(type) { const i = this.kit.findIndex(d => d.type === type || (type === 'button' && d.type === 'touch')); if (i >= 0) this.focusDev(i); }
    /* ----- wiring list (same colours as the 3D wires) ----- */
    wiring() {
      const W = VL.WIRE || { gnd: '#111827', vcc: '#dc2626', sig: ['#facc15', '#22c55e', '#3b82f6', '#f97316', '#a855f7', '#06b6d4'] };
      const P = p => this.pinName(p), V = this.o.board === 'uno' ? '5V' : '3V3'; let si = 0; const sig = () => W.sig[si++ % W.sig.length];
      const rows = [];
      const bb = this.kit.some(d => ['led', 'rgb', 'button', 'touch', 'pot', 'buzzer', 'servo', 'motor', 'oled', 'i2c', 'dist'].includes(d.type) && !(d.type === 'led' && this.isOnboard(d.pin)));
      if (bb) { rows.push([-1, 'Breadboard', '− rail (blue line)', 'GND', W.gnd]); rows.push([-1, 'Breadboard', '+ rail (red line)', V, W.vcc]); }
      this.kit.forEach((d, i) => {
        const nm = d.label || (VL.DEV_INFO && VL.DEV_INFO[d.type] ? VL.DEV_INFO[d.type][0] : d.type);
        if (d.type === 'led') { if (this.isOnboard(d.pin)) { rows.push([i, nm, 'on-board LED', P(d.pin) + ' (internal)', null]); return; } rows.push([i, nm, '220 Ω → anode (long leg)', P(d.pin), sig()]); rows.push([i, nm, 'cathode (short leg)', '− rail → GND', W.gnd]); }
        else if (d.type === 'button') { rows.push([i, nm, 'leg 1', P(d.pin), sig()]); rows.push([i, nm, 'leg 2', d.wiring === 'vcc' ? '+ rail → ' + V : '− rail → GND', d.wiring === 'vcc' ? W.vcc : W.gnd]); }
        else if (d.type === 'touch') rows.push([i, nm, 'copper pad', P(d.pin), sig()]);
        else if (d.type === 'pot') { rows.push([i, nm, 'left pin', 'GND', W.gnd]); rows.push([i, nm, 'wiper (middle)', P(d.pin), sig()]); rows.push([i, nm, 'right pin', V, W.vcc]); }
        else if (d.type === 'buzzer') { rows.push([i, nm, '+', P(d.pin), sig()]); rows.push([i, nm, '−', 'GND', W.gnd]); }
        else if (d.type === 'rgb') { rows.push([i, nm, 'R', P(d.pins.r), '#ef4444']); rows.push([i, nm, 'G', P(d.pins.g), '#22c55e']); rows.push([i, nm, 'B', P(d.pins.b), '#3b82f6']); rows.push([i, nm, 'common cathode', 'GND', W.gnd]); }
        else if (d.type === 'servo') { rows.push([i, nm, 'brown wire', 'GND', '#78350f']); rows.push([i, nm, 'red wire', V === '3V3' ? '5V / VIN' : '5V', W.vcc]); rows.push([i, nm, 'orange wire (signal)', P(d.pin), '#f97316']); }
        else if (d.type === 'motor') { rows.push([i, nm, 'IN1', P(d.pins.in1), W.sig[0]]); rows.push([i, nm, 'IN2', P(d.pins.in2), W.sig[1]]); if (d.pins.en !== undefined) rows.push([i, nm, 'EN (speed, PWM)', P(d.pins.en), W.sig[2]]); rows.push([i, nm, 'GND', 'GND', W.gnd]); }
        else if (d.type === 'oled' || d.type === 'i2c') { rows.push([i, nm, 'VCC', V, W.vcc]); rows.push([i, nm, 'GND', 'GND', W.gnd]); rows.push([i, nm, 'SDA (data)', P(d.sda ?? (this.o.board === 'uno' ? 18 : 21)), '#22c55e']); rows.push([i, nm, 'SCL (clock)', P(d.scl ?? (this.o.board === 'uno' ? 19 : 22)), '#3b82f6']); }
        else if (d.type === 'dist') { rows.push([i, nm, 'VCC', V, W.vcc]); rows.push([i, nm, 'TRIG', P(d.pins.trig), '#facc15']); rows.push([i, nm, 'ECHO', P(d.pins.echo), '#22c55e']); rows.push([i, nm, 'GND', 'GND', W.gnd]); }
        else if (d.type === 'robot') { const p = d.pins; rows.push([i, nm, 'left motor', P(p.l1) + ' / ' + P(p.l2), W.sig[0]]); rows.push([i, nm, 'right motor', P(p.r1) + ' / ' + P(p.r2), W.sig[1]]); if (p.trig !== undefined) rows.push([i, nm, 'ultrasonic TRIG / ECHO', P(p.trig) + ' / ' + P(p.echo), W.sig[2]]); if (p.sl !== undefined) rows.push([i, nm, 'line sensors L / R', P(p.sl) + ' / ' + P(p.sr), W.sig[3]]); }
        else if (d.type === 'wifi') rows.push([i, 'Wi-Fi', 'wireless', 'SSID VirtualLab · password robotics123', null]);
      });
      return rows;
    }
    isOnboard(pin) { return (this.o.board === 'pico' && pin === 25) || (this.o.board === 'uno' && pin === 13 && this.kit.some(d => d.type === 'led' && d.pin === 13 && /on-?board|built/i.test(d.label || ''))); }
    renderTab() {
      const body = this.q('.ctab-body'), I = VL.icon;
      if (this.tab === 'ov') {
        const parts = this.kit.filter(d => d.type !== 'dashboard').map(d => d.label || (VL.DEV_INFO[d.type] || [d.type])[0]);
        body.innerHTML = `<div class="ov">${this.o.title ? `<h3>${esc(this.o.title)}</h3>` : ''}${this.o.goal ? `<div class="ov-goal">${I('target')}<div><b>Your mission</b><p>${this.o.goal}</p></div></div>` : ''}
          <div class="ov-row"><div><span class="k">Board</span><b>${esc(this.boardFull())}</b></div><div><span class="k">Language</span><b>${this.L.name}</b></div><div><span class="k">Logic level</span><b>${this.o.board === 'uno' ? '5 V' : '3.3 V'}</b></div></div>
          ${parts.length ? `<p class="k">On the bench</p><ul class="ov-parts">${parts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '<p class="muted">No external parts: this program talks to you through the serial monitor.</p>'}
          <ol class="ov-steps"><li>Read the mission and look at the wiring in 3D (click a label to see its connections).</li><li>Write or fix the code in <b>Try it yourself</b>.</li><li>Press <b>${this.o.lang === 'cpp' ? 'Upload &amp; run' : 'Run'}</b>, then watch the board and the serial monitor.</li><li>Open <b>How the code works</b> to follow each command while it runs.</li></ol></div>`;
      } else if (this.tab === 'wi') {
        const rows = this.wiring();
        body.innerHTML = rows.length ? `<table class="wtable"><thead><tr><th>Component</th><th>Its pin</th><th>Board pin</th><th>Wire</th></tr></thead><tbody>${rows.map(([i, c, cp, bp, col]) => `<tr class="wrow" data-dev="${i}"><td>${esc(c)}</td><td>${esc(cp)}</td><td><code>${esc(bp)}</code></td><td>${col ? `<i class="wsw" style="background:${col}"></i>` : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table>
          <p class="muted small">Colour code: <b>black = GND</b>, <b>red = power</b>, any other colour = a signal wire. Real kits follow the same habit so mistakes are easy to spot.</p>` : '<p class="muted">Nothing is wired to the board in this practice. Your program only uses the serial monitor.</p>';
      } else if (this.tab === 'hw') {
        const lines = this.ed.value.split('\n'); const items = [];
        lines.forEach((l, i) => { if (!l.trim()) return; const ex = this.explainMulti(l); if (!ex) return; items.push([i + 1, l, ex]); });
        body.innerHTML = items.length ? `<p class="muted small">Each command of your program, in order. While it runs, the line being executed lights up.</p><ol class="hw">${items.map(([n, l, ex]) => `<li data-ln="${n}"><div class="hw-c"><span class="ln">line ${n}</span><code>${VL.highlightPy(l.trim(), this.lang)}</code></div><p>${ex}</p></li>`).join('')}</ol>` : '<p class="muted">Write some code and its explanation appears here.</p>';
        this.hwLast = 0;
      } else {
        const bi = VL.BOARD_INFO[this.o.board] || { name: this.boardName(), specs: [] };
        const devs = [...new Set(this.kit.map(d => d.type))].filter(t => VL.DEV_INFO[t]);
        body.innerHTML = `<h4>${esc(bi.name)}</h4><table class="spec">${bi.specs.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>${devs.map(t => `<h4>${esc(VL.DEV_INFO[t][0])}</h4><p class="small">${esc(VL.DEV_INFO[t][1])}</p>`).join('')}`;
      }
    }
    explainMulti(l) {
      const parts = this.lang === 'cpp' ? l.split(/;|\{|\}/).map(x => x.trim()).filter(Boolean) : [l];
      const out = []; const first = VL.explainLine(l, this.lang);
      if (first && !/^A brace/.test(first)) out.push(first);
      if (this.lang === 'cpp' && !/^\s*for\s*\(/.test(l)) parts.forEach(x => { if (x === l.trim()) return; const e = VL.explainLine(x, 'cpp'); if (e && !/^A brace/.test(e) && !out.includes(e)) out.push(e); });
      return out.join(' ');
    }
    serLine(txt, cls) { const ser = this.q('.cl-ser'); if (!ser) return; const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = txt; ser.appendChild(s); if (ser.childNodes.length > 1500) for (let k = 0; k < 300; k++) ser.removeChild(ser.firstChild); if (this.q('.autoscroll').checked) ser.scrollTop = ser.scrollHeight; }
    status(h, k) { const el = this.host.querySelector('.cl-status'); el.innerHTML = h; el.className = 'cl-status ' + (k || ''); }
    pinName(p) { if (this.o.board === 'uno') return p >= 14 ? 'A' + (p - 14) : 'D' + p; if (this.o.board === 'rpi') return 'GPIO' + p; if (this.o.board === 'pico') return p === 25 ? 'GP25 (LED)' : 'GP' + p; return 'GPIO' + p; }
    renderDevs() {
      const box = this.host.querySelector('.devs');
      box.innerHTML = this.kit.map((d, i) => {
        if (d.type === 'led') { const c = VL.LED_TYPES[d.color || 'red']; return `<div class="dev led-dev"><div class="vled" data-i="${i}" style="--c:${c.color};--g:${c.glow}"></div><div><b>${esc(d.label || c.name + ' LED')}</b><small>${this.isOnboard(d.pin) ? 'built into the board, driven by ' + this.pinName(d.pin) : `${this.pinName(d.pin)} → ${d.res || 220} Ω → LED → GND`}</small></div></div>`; }
        if (d.type === 'button') return `<div class="dev"><div class="vbtn" data-i="${i}"></div><div><b>${esc(d.label || 'Button')}</b><small>${this.pinName(d.pin)} → button → ${d.wiring === 'vcc' ? '3V3/5V' : 'GND'}${d.wiring === 'vcc' ? ' (+ pull-down)' : ' (use a pull-up)'}</small><label class="sch">pressed at (s) <input class="inp sm" data-sch="${i}" value="${esc(d.sched || '')}"></label></div></div>`;
        if (d.type === 'pot') return `<div class="dev"><div class="vpot" data-i="${i}" style="--a:${(d.value ?? 0.5) * 270 - 135}deg"></div><div><b>${esc(d.label || 'Potentiometer')}</b><small>wiper → ${this.pinName(d.pin)} · ${(d.value ?? 0.5) * (d.vref || 3.3) >= 0 ? ((d.value ?? 0.5) * (d.vref || 3.3)).toFixed(2) : ''} V</small><input type="range" min="0" max="100" value="${Math.round((d.value ?? 0.5) * 100)}" data-pot="${i}"></div></div>`;
        if (d.type === 'servo') return `<div class="dev"><svg class="vservo" viewBox="0 0 80 50" data-i="${i}"><rect x="10" y="20" width="60" height="26" rx="4" fill="#1d4ed8"/><circle cx="40" cy="26" r="6" fill="#e5e7eb"/><g class="horn" transform="rotate(0 40 26)"><rect x="38" y="4" width="4" height="22" rx="2" fill="#f8fafc"/></g></svg><div><b>${esc(d.label || 'Servo (SG90)')}</b><small>signal ${this.pinName(d.pin)} · <span class="sang">—</span></small></div></div>`;
        if (d.type === 'motor') return `<div class="dev"><svg class="vmotor" viewBox="0 0 50 50" data-i="${i}"><circle cx="25" cy="25" r="20" fill="#334155"/><g class="rot"><rect x="23" y="7" width="4" height="36" fill="#f59e0b"/><rect x="7" y="23" width="36" height="4" fill="#f59e0b"/></g></svg><div><b>${esc(d.label || 'DC motor + H-bridge')}</b><small>IN1 ${this.pinName(d.pins.in1)} · IN2 ${this.pinName(d.pins.in2)}${d.pins.en !== undefined ? ' · EN ' + this.pinName(d.pins.en) : ''} · <span class="mst">stopped</span></small></div></div>`;
        if (d.type === 'wifi') return `<div class="dev"><div class="vicon">${VL.icon('globe')}</div><div><b>Virtual Wi-Fi</b><small>network <code>VirtualLab</code> · password <code>robotics123</code> (no real internet)</small></div></div>`;
        if (d.type === 'i2c') return `<div class="dev"><div class="vicon">${VL.icon('chip')}</div><div><b>I2C bus</b><small>SDA ${this.pinName(d.sda)} · SCL ${this.pinName(d.scl)} · TMP102 sensor at 0x48 · OLED at 0x3C</small></div></div>`;
        if (d.type === 'robot') return `<div class="dev"><div class="vicon">${VL.icon('arm')}</div><div><b>2-wheel robot</b><small>left motor ${this.pinName(d.pins.l1)}/${this.pinName(d.pins.l2)} · right motor ${this.pinName(d.pins.r1)}/${this.pinName(d.pins.r2)}${d.pins.trig !== undefined ? ` · ultrasonic TRIG ${this.pinName(d.pins.trig)} ECHO ${this.pinName(d.pins.echo)}` : ''}${d.pins.sl !== undefined ? ` · line sensors L ${this.pinName(d.pins.sl)} R ${this.pinName(d.pins.sr)} (1 = black line)` : ''}</small></div></div>`;
        if (d.type === 'rgb') return `<div class="dev"><div class="vled" data-i="${i}" style="--c:#f8fafc;--g:#fff"></div><div><b>${esc(d.label || 'RGB LED')}</b><small>R ${this.pinName(d.pins.r)} · G ${this.pinName(d.pins.g)} · B ${this.pinName(d.pins.b)}</small></div></div>`;
        if (d.type === 'buzzer') return `<div class="dev"><div class="vicon">${VL.icon('volume')}</div><div><b>${esc(d.label || 'Buzzer')}</b><small>${this.pinName(d.pin)} → buzzer → GND · <span class="bst" data-i="${i}">silent</span></small></div></div>`;
        if (d.type === 'oled') return `<div class="dev"><div class="vicon">${VL.icon('chip')}</div><div><b>${esc(d.label || 'OLED 128×64')}</b><small>I2C 0x3C · SDA ${this.pinName(d.sda ?? 21)} · SCL ${this.pinName(d.scl ?? 22)} · shown on the 3D board</small></div></div>`;
        if (d.type === 'touch') return `<div class="dev"><div class="vbtn" data-i="${i}"></div><div><b>${esc(d.label || 'Touch pad')}</b><small>pad → ${this.pinName(d.pin)}</small><label class="sch">touched at (s) <input class="inp sm" data-sch="${i}" value="${esc(d.sched || '')}"></label></div></div>`;
        if (d.type === 'dist') return `<div class="dev"><div class="vicon">${VL.icon('target')}</div><div><b>${esc(d.label || 'Ultrasonic sensor')}</b><small>TRIG ${this.pinName(d.pins.trig)} · ECHO ${this.pinName(d.pins.echo)} · obstacle at <span class="dcm" data-i="${i}">${d.cm ?? 25}</span> cm</small><input type="range" min="3" max="200" value="${d.cm ?? 25}" data-dist="${i}"></div></div>`;
        if (d.type === 'dashboard') return '';
        return '';
      }).join('');
      box.querySelectorAll('[data-dist]').forEach(inp => inp.oninput = () => { const d = this.kit[+inp.dataset.dist]; d.cm = +inp.value; box.querySelector(`.dcm[data-i="${inp.dataset.dist}"]`).textContent = d.cm; });
      box.querySelectorAll('[data-sch]').forEach(inp => inp.onchange = () => { this.kit[+inp.dataset.sch].sched = inp.value; });
      box.querySelectorAll('[data-pot]').forEach(inp => inp.oninput = () => { const d = this.kit[+inp.dataset.pot]; d.value = inp.value / 100; const v = box.querySelector(`.vpot[data-i="${inp.dataset.pot}"]`); v.style.setProperty('--a', (d.value * 270 - 135) + 'deg'); v.nextElementSibling.querySelector('small').textContent = `wiper → ${this.pinName(d.pin)} · ${(d.value * (d.vref || 3.3)).toFixed(2)} V`; });
      this.drawArena(0);
    }
    cfg() {
      const inputs = {}, analog = {}; let robot = null, distance = null;
      this.kit.forEach(d => {
        if (d.type === 'button') { const seq = [[0, null]]; parseSched(d.sched).forEach(([a, z]) => { seq.push([a, d.wiring === 'vcc' ? 1 : 0]); seq.push([z, null]); }); seq.sort((a, b) => a[0] - b[0]); inputs[d.pin] = seq; }
        if (d.type === 'pot') analog[d.pin] = (d.value ?? 0.5) * (d.vref || (this.o.board === 'uno' ? 5 : 3.3));
        if (d.type === 'touch') { const seq = [[0, null]]; parseSched(d.sched).forEach(([a, z]) => { seq.push([a, 1]); seq.push([z, null]); }); inputs[d.pin] = seq; }
        if (d.type === 'dist') distance = { echo: d.pins.echo, cm: d.cm ?? 25 };
        if (d.type === 'robot') robot = { arena: d.arena, pins: d.pins };
      });
      return { board: this.o.board, inputs, analog, robot, distance };
    }
    async run() {
      this.stop(true); this.ed.setError(0); this.ed.setMark(0);
      const ser = this.q('.cl-ser'); ser.textContent = '';
      const cpp = this.o.lang === 'cpp', plain = this.o.lang === 'python';
      this.serLine(cpp ? 'Checking code…\nCompiling sketch for ' + this.boardFull() + '…\n' : plain ? '$ python3 ' + this.L.file + '\n' : 'Checking code…\nCopying ' + this.L.file + ' to the ' + this.boardName() + '…\n', 'sys');
      this.status('<span class="spin"></span> Running your program…');
      const code = this.ed.value; let r;
      try {
        if (cpp) r = await VL.Arduino.run(code, this.o.limit, this.cfg());
        else if (plain) r = await VL.Py.runPlain(code, this.host.querySelector('.kin').value.split('\n').filter(x => x !== ''));
        else r = await VL.Py.run(code, this.o.limit, this.cfg());
      } catch (e) { this.serLine('Upload failed: the simulator stopped unexpectedly.\n', 'err'); this.status('The simulator stopped unexpectedly: ' + esc(e && e.message || e), 'err'); return; }
      r.events = r.events || []; r.servo = r.servo || []; r.serial = r.serial || []; r.warnings = r.warnings || []; r.code = code; this.last = r; VL.Store.p.runs++; VL.Store.save();
      if (r.error) {
        this.ed.setError(r.error.line);
        const ce = r.error.type === 'TranslateError' || r.error.syntax;
        if (!plain) this.serLine(ce ? (cpp ? 'Compilation error.\n' : 'Upload stopped: the program has an error.\n') : (cpp ? 'Done uploading.\n' : 'Done. Program started.\n'), ce ? 'err' : 'ok');
        this.status(`<b>${r.error.type === 'TranslateError' ? 'Compile error' : r.error.type}</b>${r.error.line ? ' on line ' + r.error.line : ''}: ${esc(r.error.msg)}<br><span class="explainer">${VL.icon('bulb')} ${esc(VL.Py.explainError(r.error))}</span>`, 'err');
        VL.Store.mistake(r.error.syntax ? 'SYNTAX' : 'RUNTIME');
      } else {
        if (!plain) this.serLine(cpp ? 'Done uploading.\n' : 'Done. Program started.\n', 'ok');
        const notes = { time: `Showing the first ${this.o.limit / 1000} s (your program keeps running, so the replay loops).`, complete: `Program finished after ${(r.end / 1000).toFixed(2)} s.`, events: 'Pins changed more than 20,000 times: far too fast to see.', steps: 'Your program is stuck in a busy loop (no pause).', serial: 'Too much serial output.' };
        this.status((notes[r.reason] || 'Running.') + (r.warnings.length ? `<br><span class="warn">${r.warnings.map(esc).join('<br>')}</span>` : ''), r.warnings.length ? 'warn' : 'ok');
      }
      this.prepare(r);
      const chk = this.host.querySelector('.cl-check');
      if (this.o.check && !r.error) {
        const res = this.o.check(r, this); chk.innerHTML = `<div class="fb ${res.ok ? 'ok' : 'no'}">${res.ok ? VL.icon('check') + ' ' : VL.icon('target') + ' '}${res.msg}</div>`;
        if (res.ok && this.o.onPass) this.o.onPass(r);
        if (!res.ok) VL.Store.mistake('PRACTICE');
      } else chk.innerHTML = '';
      if (this.tab !== 'hw' && r.trace && r.trace.length && !r.error) { /* keep the student's tab */ }
      this.o.onRun && this.o.onRun(r, this);
    }
    prepare(r) {
      const end = Math.max(r.end, 1);
      const byPin = {}; r.events.forEach(e => (byPin[e.pin] = byPin[e.pin] || []).push(e));
      this.play = { r, t: 0, end, byPin, si: 0, loop: r.reason === 'time' || r.reason === 'events' || r.reason === 'steps', running: !r.error || r.events.length > 0 };
      // cumulative "on" integral per pin for perceived brightness
      this.play.cum = {}; Object.entries(byPin).forEach(([p, ev]) => { let acc = 0; const c = []; ev.forEach((e, i) => { c.push(acc); const t1 = i + 1 < ev.length ? ev[i + 1].t : end; acc += e.v * (t1 - e.t); }); this.play.cum[p] = c; });
      this.dash = [];
      (r.serial || []).forEach(s => { const m = s.text.trim(); if (/^\{.*\}$/.test(m)) { try { const o = JSON.parse(m); this.dash.push({ t: s.t, o }); } catch (e) { } } });
      (r.http || []).forEach(([t, url, o]) => { if (o && typeof o === 'object') this.dash.push({ t, o }); });
    }
    stop(silent) { if (this.play) this.play.running = false; this.play = null; this.paint(0); if (!silent) this.status('■ Stopped.'); }
    valAt(pin, t) { const ev = this.play.byPin[pin]; if (!ev) return 0; let lo = 0, hi = ev.length - 1; if (ev[0].t > t) return 0; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ev[m].t <= t) lo = m; else hi = m - 1; } return ev[lo].v; }
    avgAt(pin, t, W = 40) {
      const ev = this.play.byPin[pin]; if (!ev) return 0; const c = this.play.cum[pin];
      const F = x => { if (x < ev[0].t) return 0; let lo = 0, hi = ev.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ev[m].t <= x) lo = m; else hi = m - 1; } return c[lo] + ev[lo].v * (x - ev[lo].t); };
      const a = Math.max(0, t - W); return (F(t) - F(a)) / Math.max(1, t - a);
    }
    tick(now) {
      if (this.dead) return; this.raf = requestAnimationFrame(t => this.tick(t));
      const dt = this._l ? Math.min(100, now - this._l) : 16; this._l = now;
      const pl = this.play; if (!pl || !pl.running) return;
      const prevT = pl.t;
      pl.t += dt * +(this.host.querySelector('.speed').value);
      if (pl.t >= pl.end) { if (pl.loop) { this.flushSer(pl, pl.end); pl.t %= pl.end; pl.si = 0; pl.ei = 0; pl.lastAct = {}; this.serLine('— replay restarts —\n', 'sys'); } else { pl.t = pl.end; pl.running = false; } }
      this.flushSer(pl, pl.t);
      this.paint(pl.t);
      // current line (How the code works + editor marker)
      const tr = pl.r.trace; if (tr && tr.length) { let lo = 0, hi = tr.length - 1; if (tr[0][0] <= pl.t) { while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tr[m][0] <= pl.t) lo = m; else hi = m - 1; } const ln = tr[lo][1]; if (ln !== this.curLn) { this.curLn = ln; this.ed.setMark(ln); if (this.tab === 'hw') { const box = this.q('.ctab-body'); box.querySelectorAll('.hw li.on').forEach(x => x.classList.remove('on')); const li = box.querySelector(`.hw li[data-ln="${ln}"]`); if (li) { li.classList.add('on'); const bt = box.getBoundingClientRect(), lt = li.getBoundingClientRect(); if (lt.top < bt.top || lt.bottom > bt.bottom) box.scrollTop += lt.top - bt.top - 40; } } } } }
      this.host.querySelector('.clock').textContent = `t = ${(pl.t / 1000).toFixed(2)} s (virtual)`;
      if (!pl.running) this.ed.setMark(0);
    }
    flushSer(pl, t) {
      const act = this.q('.pinact') && this.q('.pinact').checked; const S = pl.r.serial; const E = pl.r.events;
      pl.ei = pl.ei || 0; pl.lastAct = pl.lastAct || {};
      while ((pl.si < S.length && S[pl.si].t <= t) || (act && pl.ei < E.length && E[pl.ei].t <= t)) {
        const st = pl.si < S.length ? S[pl.si].t : Infinity, et = act && pl.ei < E.length ? E[pl.ei].t : Infinity;
        if (st <= et) { this.serLine(S[pl.si++].text); }
        else { const e = E[pl.ei++]; const la = pl.lastAct[e.pin]; if (la && la.v === e.v) continue; const fast = la && e.t - la.t < 40; pl.lastAct[e.pin] = { t: e.t, v: e.v, n: fast ? (la.n || 0) + 1 : 0 };
          if (fast && pl.lastAct[e.pin].n > 2) continue;
          const val = e.v === 1 ? 'HIGH' : e.v === 0 ? 'LOW' : `PWM ${Math.round(e.v * 100)}%`;
          this.serLine(`[${(e.t / 1000).toFixed(2)} s] ${this.pinName(e.pin)} → ${val}\n`, 'act'); }
        if (!act) pl.ei = E.length;
      }
      if (!act) { while (pl.ei < E.length && E[pl.ei].t <= t) pl.ei++; }
    }
    live(t) {
      if (!this.k3) return; const pl = this.play; const st = {};
      this.kit.forEach((d, i) => {
        if (d.type === 'led') st[i] = pl ? Math.min(1, this.avgAt(d.pin, t)) : 0;
        else if (d.type === 'rgb') st[i] = ['r', 'g', 'b'].map(k => pl ? Math.min(1, this.avgAt(d.pins[k], t)) : 0);
        else if (d.type === 'button') st[i] = !!(pl && (d.held || parseSched(d.sched).some(([a, z]) => t >= a && t < z))) || !!d.held;
        else if (d.type === 'touch') st[i] = !!(pl && parseSched(d.sched).some(([a, z]) => t >= a && t < z));
        else if (d.type === 'pot') st[i] = d.value ?? 0.5;
        else if (d.type === 'servo') st[i] = d._sang ?? 90;
        else if (d.type === 'motor') st[i] = d._sp || 0;
        else if (d.type === 'buzzer') { let f = 0; if (pl) { (pl.r.tones || []).forEach(x => { if (x[1] === d.pin && x[0] <= t) f = x[2]; }); if (!f && (pl.r.pwmf || {})[d.pin] && this.valAt(d.pin, t) > 0) f = pl.r.pwmf[d.pin]; } st[i] = f; }
        else if (d.type === 'oled') { let ops = null; if (pl && pl.r.oled) for (const o of pl.r.oled) { if (o[0] <= t) ops = o[1]; else break; } st[i] = ops || []; }
        else if (d.type === 'wifi') st[i] = !!(pl && !pl.r.error && t > 1500 && /network|WLAN/.test(pl.r.code || ''));
      });
      this.k3.setLive(st);
    }
    paint(t) {
      const pl = this.play; const box = this.host.querySelector('.devs');
      this.kit.forEach((d, i) => {
        const el = box.querySelector(`[data-i="${i}"]`); if (!el) return;
        if (d.type === 'led') { const b = pl ? Math.min(1, this.avgAt(d.pin, t)) : 0; el.style.setProperty('--b', b.toFixed(3)); }
        if (d.type === 'rgb') { const c = ['r', 'g', 'b'].map(k => pl ? Math.min(1, this.avgAt(d.pins[k], t)) : 0); const col = `rgb(${c.map(v => Math.round(40 + v * 215)).join(',')})`; el.style.setProperty('--c', col); el.style.setProperty('--g', col); el.style.setProperty('--b', Math.max(...c).toFixed(3)); }
        if (d.type === 'touch') { const on = pl && parseSched(d.sched).some(([a, z]) => t >= a && t < z); el.classList.toggle('down', !!on); }
        if (d.type === 'button') { const on = pl && parseSched(d.sched).some(([a, z]) => t >= a && t < z); el.classList.toggle('down', !!on); }
        if (d.type === 'servo') {
          let ang = null;
          if (pl) { const sv = pl.r.servo.filter(s => s.pin === d.pin && s.t <= t); if (sv.length) ang = sv[sv.length - 1].a; else { const f = (pl.r.pwmf || {})[d.pin]; const v = this.valAt(d.pin, t); if (f && Math.abs(f - 50) < 5 && v > 0 && v < 1) { const pulse = v * 20; ang = Math.max(0, Math.min(180, (pulse - 0.5) / 2.0 * 180)); } } }
          d._sang = ang === null ? 90 : ang; el.querySelector('.horn').setAttribute('transform', `rotate(${ang === null ? 0 : ang - 90} 40 26)`); el.parentElement.querySelector('.sang').textContent = ang === null ? 'no signal' : Math.round(ang) + '°';
        }
        if (d.type === 'motor') {
          const a = pl ? this.valAt(d.pins.in1, t) : 0, b = pl ? this.valAt(d.pins.in2, t) : 0, en = d.pins.en !== undefined ? (pl ? this.valAt(d.pins.en, t) : 0) : 1;
          const dir = a > 0 && !b ? 1 : b > 0 && !a ? -1 : 0; const sp = dir * en; d._sp = sp;
          d._ang = (d._ang || 0) + sp * 0.6 * 16; el.querySelector('.rot').setAttribute('transform', `rotate(${d._ang % 360} 25 25)`);
          el.parentElement.querySelector('.mst').textContent = sp === 0 ? (a > 0 && b > 0 ? 'brake (both HIGH)' : 'stopped') : `${dir > 0 ? 'forward' : 'reverse'} · ${Math.round(Math.abs(sp) * 100)}% speed`;
        }
      });
      this.drawArena(t); this.drawTiming(t); this.drawDash(t); this.live(t);
    }
    drawTiming(t) {
      const cv = this.host.querySelector('.cl-tim'); if (!cv || !cv.offsetParent) return; const W = cv.clientWidth, H = cv.clientHeight; const d = Math.min(2, devicePixelRatio || 1); if (cv.width !== W * d) { cv.width = W * d; cv.height = H * d; }
      const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H);
      const pl = this.play; if (!pl) { x.fillStyle = '#7d8bb0'; x.font = '12px Nunito'; x.fillText('Run your program to see the output pins over time.', 8, 18); return; }
      const pins = Object.keys(pl.byPin).map(Number).sort((a, b) => a - b).slice(0, 6); const span = Math.min(pl.end, 3000); const t0 = Math.max(0, Math.min(t - span * 0.7, pl.end - span)); const lh = (H - 6) / Math.max(1, pins.length);
      const X = tt => 70 + (tt - t0) / span * (W - 76);
      pins.forEach((p, k) => { const y0 = 3 + k * lh; x.fillStyle = '#22d3ee'; x.font = '11px JetBrains Mono, monospace'; x.fillText(this.pinName(p), 4, y0 + lh / 2 + 4); x.strokeStyle = '#22d3ee'; x.lineWidth = 1.6; x.beginPath(); let v = this.valAt(p, t0); const yv = v => y0 + lh - 4 - v * (lh - 8); x.moveTo(X(t0), yv(v)); pl.byPin[p].forEach(e => { if (e.t <= t0 || e.t > t0 + span) return; x.lineTo(X(e.t), yv(v)); x.lineTo(X(e.t), yv(e.v)); v = e.v; }); x.lineTo(X(Math.min(pl.end, t0 + span)), yv(v)); x.stroke(); });
      x.strokeStyle = '#f59e0b'; x.beginPath(); x.moveTo(X(t), 0); x.lineTo(X(t), H); x.stroke();
    }
    drawDash(t) {
      const cv = this.host.querySelector('.dash-c'); if (!cv) return; const W = cv.clientWidth, H = cv.clientHeight; const d = Math.min(2, devicePixelRatio || 1); if (cv.width !== W * d) { cv.width = W * d; cv.height = H * d; }
      const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H);
      const pts = (this.dash || []).filter(p => p.t <= t);
      if (!pts.length) { x.fillStyle = '#7d8bb0'; x.font = '12px Nunito'; x.fillText('Print JSON like {"temp": 23.5} or POST it with urequests to plot it here.', 8, 18); return; }
      const keys = [...new Set(pts.flatMap(p => Object.keys(p.o).filter(k => typeof p.o[k] === 'number')))].slice(0, 3); const cols = ['#22d3ee', '#f59e0b', '#a855f7'];
      keys.forEach((k, j) => { const vals = pts.map(p => p.o[k]).filter(v => typeof v === 'number'); const mn = Math.min(...vals), mx = Math.max(...vals); const rng = mx - mn || 1; x.strokeStyle = cols[j]; x.lineWidth = 2; x.beginPath(); pts.forEach((p, i) => { if (typeof p.o[k] !== 'number') return; const px = 8 + (p.t / (this.play.end || 1)) * (W - 16), py = H - 14 - ((p.o[k] - mn) / rng) * (H - 34); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); x.fillStyle = cols[j]; x.font = '12px JetBrains Mono, monospace'; x.fillText(`${k}: ${vals[vals.length - 1]}`, 8 + j * 120, 14); });
    }
    drawArena(t) {
      const cv = this.host.querySelector('.arena'); if (!cv) return; const rb = this.kit.find(d => d.type === 'robot');
      const W = cv.clientWidth, H = cv.clientHeight; const d = Math.min(2, devicePixelRatio || 1); if (cv.width !== W * d) { cv.width = W * d; cv.height = H * d; }
      const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H);
      const s = Math.min(W / 210, H / 150); const ox = (W - 200 * s) / 2, oy = (H - 140 * s) / 2; const X = v => ox + v * s, Y = v => oy + v * s;
      x.fillStyle = rb.arena === 'line' ? '#e5e7eb' : '#0f1b3a'; x.fillRect(X(0), Y(0), 200 * s, 140 * s); x.strokeStyle = '#22d3ee'; x.lineWidth = 2; x.strokeRect(X(0), Y(0), 200 * s, 140 * s);
      if (rb.arena === 'line') { x.strokeStyle = '#111'; x.lineWidth = 2.6 * s; x.beginPath(); x.ellipse(X(100), Y(70), 75 * s, 45 * s, 0, 0, 7); x.stroke(); }
      else { x.fillStyle = '#f59e0b'; [[80, 55, 24, 30], [128, 96, 32, 26], [150, 18, 18, 24]].forEach(([a, b, w, h]) => { x.fillRect(X(a), Y(b), w * s, h * s); }); }
      const log = this.play && this.play.r.robot; let pose = rb.arena === 'line' ? [0, 100, 25, 0, 0] : [0, 30, 70, 0, 0];
      if (log && log.length) {
        let lo = 0, hi = log.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (log[m][0] <= t) lo = m; else hi = m - 1; }
        const a = log[lo], b = log[Math.min(log.length - 1, lo + 1)]; const f = b[0] > a[0] ? Math.min(1, (t - a[0]) / (b[0] - a[0])) : 0;
        pose = [t, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f, a[4]];
        x.strokeStyle = 'rgba(168,85,247,.7)'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= lo; i++) { i ? x.lineTo(X(log[i][1]), Y(log[i][2])) : x.moveTo(X(log[i][1]), Y(log[i][2])); } x.stroke();
      }
      const [, rx, ry, th, bump] = pose;
      x.save(); x.translate(X(rx), Y(ry)); x.rotate(th);
      if (rb.pins.trig !== undefined) { x.strokeStyle = 'rgba(34,211,238,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(8 * s, 0); x.lineTo(60 * s, -12 * s); x.moveTo(8 * s, 0); x.lineTo(60 * s, 12 * s); x.stroke(); }
      x.fillStyle = bump ? '#ef4444' : '#3b82f6'; x.beginPath(); x.arc(0, 0, 8 * s, 0, 7); x.fill();
      x.fillStyle = '#111827'; x.fillRect(-4 * s, -9.5 * s, 8 * s, 3 * s); x.fillRect(-4 * s, 6.5 * s, 8 * s, 3 * s);
      x.fillStyle = '#facc15'; x.beginPath(); x.moveTo(9 * s, 0); x.lineTo(4 * s, -3 * s); x.lineTo(4 * s, 3 * s); x.fill();
      if (rb.pins.sl !== undefined) { x.fillStyle = '#22c55e'; x.fillRect(7 * s, -3.5 * s, 2 * s, 2 * s); x.fillRect(7 * s, 1.5 * s, 2 * s, 2 * s); }
      x.restore();
      const info = this.host.querySelector('.arena-info'); if (info && this.play && this.play.r.robot) { const L = this.play.r.robot; let dist = 0; for (let i = 1; i < L.length && L[i][0] <= t; i++) dist += Math.hypot(L[i][1] - L[i - 1][1], L[i][2] - L[i - 1][2]); info.textContent = `Distance travelled: ${dist.toFixed(0)} cm · collisions: ${L.filter((e, i) => e[4] && (!i || !L[i - 1][4]) && e[0] <= t).length}`; }
    }
    explain() {
      const lines = this.ed.value.split('\n');
      const rows = lines.map((l, i) => l.trim() ? `<tr><td class="ln">${i + 1}</td><td><code>${VL.highlightPy(l, this.lang)}</code></td><td>${VL.explainLine(l, this.lang) || '<span class="muted">—</span>'}</td></tr>` : '').join('');
      VL.ui.modal({ title: '🔍 What each line does', wide: true, body: `<table class="explain-t">${rows}</table><p class="muted small">Want more detail? Ask Mrs Sarra.</p>` });
    }
    describe() { return { board: this.boardName(), language: LANG[this.o.lang].name, kit: this.kit.map(d => ({ type: d.type, pin: d.pin, pins: d.pins, sched: d.sched, value: d.value })), code: this.ed.value.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'), lastRun: this.last ? { reason: this.last.reason, error: this.last.error, warnings: this.last.warnings, serialFirst: (this.last.serial || []).slice(0, 6).map(s => s.text.trim()), pinChanges: Object.entries((this.last.events || []).reduce((a, e) => (a[e.pin] = (a[e.pin] || 0) + 1, a), {})).map(([p, n]) => `${this.pinName(+p)}: ${n}`) } : 'not run yet', goal: this.o.goal }; }
  }
  VL.CodeLab = CodeLab;

  /* helpers for practice checks */
  VL.chk = {
    pulses(r, pin) { const ev = r.events.filter(e => e.pin === pin); const ps = []; let on = null; ev.forEach(e => { if (e.v > 0 && on === null) on = e.t; if (e.v === 0 && on !== null) { ps.push([on, e.t]); on = null; } }); return ps; },
    toggles(r, pin) { const ev = r.events.filter(e => e.pin === pin); let n = 0; for (let i = 1; i < ev.length; i++) if (ev[i].v !== ev[i - 1].v) n++; return n; },
    valAt(r, pin, t) { let v = 0; r.events.forEach(e => { if (e.pin === pin && e.t <= t) v = e.v; }); return v; },
    serial(r) { return (r.serial || []).map(s => s.text).join(''); },
    duties(r, pin) { return [...new Set(r.events.filter(e => e.pin === pin).map(e => e.v))]; },
    sched(lab, type = 'button') { const d = lab.kit.find(k => k.type === type); return d ? parseSched(d.sched) : []; },
    pressed(lab, t) { return VL.chk.sched(lab).some(([a, z]) => t >= a && t < z); },
    numbers(r) { return (VL.chk.serial(r).match(/-?\d+(?:\.\d+)?/g) || []).map(Number); },
    potV(lab) { const d = lab.kit.find(k => k.type === 'pot'); return (d.value ?? 0.5) * (d.vref || (lab.o.board === 'uno' ? 5 : 3.3)); },
    dist(r) { const L = r.robot || []; let d = 0; for (let i = 1; i < L.length; i++) d += Math.hypot(L[i][1] - L[i - 1][1], L[i][2] - L[i - 1][2]); return d; },
    hits(r) { const L = r.robot || []; return L.filter((e, i) => e[4] && (!i || !L[i - 1][4])).length; }
  };
})();
