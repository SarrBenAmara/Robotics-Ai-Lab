/* =========================================================================
   lab.js : the Virtual Engineering Workbench
   breadboard editor · wiring · code · run/replay · instruments · checks
   ========================================================================= */
(function () {
  const C = () => VL.Circuit;
  const P = 20, BX = 20, BY = 20, BBX = 300, BBY = 95;
  const pinXY = id => { const p = VL.pinById[id]; return { x: p.side === 'L' ? BX + 22 : BX + 218, y: BY + VL.BOARD.y0 - 20 + p.row * P }; };
  const holeXY = (x, y) => ({ x: BBX + 30 + (x - 1) * P, y: BBY + 30 + y * P });
  const keyXY = k => { const p = C().parseKey(k); return p.kind === 'H' ? holeXY(p.x, p.y) : pinXY(p.pin); };
  const keyName = k => { const p = C().parseKey(k); if (p.kind === 'H') return 'hole ' + C().holeName(p.x, p.y); const pin = VL.pinById[p.pin]; return pin.title + (pin.gpio !== null ? ` (${pin.label})` : ''); };
  const fmtI = I => { const a = Math.abs(I); if (a < 1e-6) return '0 mA'; if (a < 1e-3) return (a * 1e6).toFixed(0) + ' µA'; return (a * 1e3).toFixed(a < 0.01 ? 2 : 1) + ' mA'; };
  const fmtV = V => (V === null || V === undefined) ? '—' : V.toFixed(2) + ' V';
  const uid = () => 'c' + Math.random().toString(36).slice(2, 8);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  VL.fmtI = fmtI; VL.fmtV = fmtV; VL.esc = esc;

  class Workbench {
    constructor(host, opts = {}) {
      this.host = host; this.opts = Object.assign({ code: true, instruments: true, board: 'esp32' }, opts);
      VL.setBoard(this.opts.board); this.board = VL.BOARD; this.lang = this.board.lang; this.held = new Set();
      this.circ = { comps: [], wires: [] }; this.hist = []; this.fut = [];
      this.sel = null; this.wireStart = null; this.wireColor = VL.WIRE_COLORS[0]; this.probe = { mode: 'V', red: null, black: null, comp: null, on: false };
      this.play = null; this.lastRun = null; this.burnt = {}; this.pinStates = {}; this.testHigh = false;
      this.build();
      this.renderAll();
      this.raf = requestAnimationFrame(t => this.tick(t));
    }
    destroy() { cancelAnimationFrame(this.raf); this.dead = true; document.removeEventListener('keydown', this._key); }

    /* ------------------------------ DOM ------------------------------ */
    build() {
      const o = this.opts;
      this.host.innerHTML = `
      <div class="wb ${o.code ? '' : 'no-code'}">
        <aside class="wb-parts glass">
          <div class="wb-h">Parts bin <span class="muted">drag onto the breadboard</span></div>
          <div class="bin">
            ${Object.entries(VL.LED_TYPES).map(([k, t]) => `<button class="bin-item" data-add="led" data-color="${k}" title="${t.name} LED, Vf ≈ ${t.vf} V"><svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="9" fill="${t.color}" opacity=".9"/><rect x="10" y="22" width="20" height="3" rx="1" fill="${t.color}" opacity=".7"/><line x1="16" y1="25" x2="16" y2="38" stroke="#bbb" stroke-width="2"/><line x1="24" y1="25" x2="24" y2="35" stroke="#bbb" stroke-width="2"/></svg><span>${t.name} LED</span></button>`).join('')}
            <button class="bin-item" data-add="resistor" title="Resistor"><svg viewBox="0 0 40 40"><line x1="2" y1="20" x2="38" y2="20" stroke="#bbb" stroke-width="2"/><rect x="10" y="14" width="20" height="12" rx="4" fill="#d8c39a"/><rect x="13" y="14" width="2.5" height="12" fill="#d42020"/><rect x="18" y="14" width="2.5" height="12" fill="#d42020"/><rect x="23" y="14" width="2.5" height="12" fill="#7b3f1d"/></svg><span>Resistor</span></button>
            <button class="bin-item" data-add="button" title="Push button (normally open)"><svg viewBox="0 0 40 40"><line x1="4" y1="30" x2="36" y2="30" stroke="#bbb" stroke-width="2"/><rect x="10" y="12" width="20" height="20" rx="3" fill="#334155"/><circle cx="20" cy="22" r="6" fill="#111827" stroke="#64748b"/></svg><span>Push button</span></button>
          </div>
          <div class="wb-h">Wire colour</div>
          <div class="swatches">${VL.WIRE_COLORS.map((c, i) => `<button class="sw ${i ? '' : 'on'}" data-wc="${c}" style="--c:${c}" title="wire colour"></button>`).join('')}</div><p class="muted small wc-note">Auto colour code: wires on GND turn <b>black</b>, wires on 3V3/5V turn <b>red</b>, signal wires keep another colour.</p>
          <div class="wb-h">Inspector</div>
          <div class="inspector"></div>
          <div class="wb-tools">
            <button data-act="undo" title="Undo (Ctrl+Z)">↶ Undo</button><button data-act="redo" title="Redo (Ctrl+Y)">↷ Redo</button>
            <button data-act="save">💾 Save</button><button data-act="load">📂 Load</button>
            <button data-act="clear" class="danger">⟲ Reset</button>
          </div>
        </aside>
        <section class="wb-center glass">
          <div class="wb-bar">
            <div class="wb-status" aria-live="polite">Drag an LED and a resistor onto the breadboard, then click two holes or pins to connect a wire.</div>
            <div class="wb-bar-r">
              ${o.code ? '' : '<button class="btn-sm cyan" data-act="testhigh" title="Set the wired GPIO HIGH (3.3 V) to test the circuit">⚡ Test: GPIO HIGH</button>'}
              <label class="tgl"><input type="checkbox" data-act="flow" checked> current flow</label>
            </div>
          </div>
          <div class="svgwrap"><svg class="bb" viewBox="0 0 960 540" role="img" aria-label="Breadboard workspace"></svg><div class="tip" hidden></div></div>
          <div class="badge-model" title="How the numbers are produced">⚙️ Values: DC nodal analysis + LED diode model (educational calculation)</div>
        </section>
        ${o.code ? `<section class="wb-code glass">
          <div class="code-head">
            <div class="ttl"><span class="dot"></span> ${this.lang === 'cpp' ? 'sketch.ino' : 'main.py'} <span class="lang">${this.lang === 'cpp' ? 'Arduino C++' : 'MicroPython'}</span></div>
            <div class="runbar">
              <span class="pystat" title="Python engine status"></span>
              <select class="speed" title="Replay speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select>
              <button class="btn-run" data-act="run">▶ RUN</button><button class="btn-sm" data-act="stop" title="Stop">■</button><button class="btn-sm" data-act="reset" title="Reset board">↺</button>
            </div>
          </div>
          <div class="blocks">${(this.lang === 'cpp' ? VL.CODE_BLOCKS_CPP : VL.CODE_BLOCKS).map((b, i) => `<button data-blk="${i}" title="${esc(b.code)}">${esc(b.label)}</button>`).join('')}</div>
          <div class="editor-host"></div>
          <div class="code-foot"><button class="btn-sm" data-act="explain">🔍 Explain my code</button><span class="clock">t = 0.00 s</span></div>
          <div class="explain" hidden></div>
          <div class="wb-ser"><div class="wb-h">Serial monitor <span class="muted">${this.lang === 'cpp' ? '9600' : '115200'} baud</span></div><pre class="serial">Press RUN to upload your program.
</pre></div>
        </section>` : ''}
        ${o.instruments ? `<section class="wb-inst glass">
          <nav class="itabs">
            <button data-tab="checks" class="on">✅ Mission</button><button data-tab="meter">🔌 Multimeter</button><button data-tab="values">🧮 Values</button>${o.code ? '<button data-tab="timing">📈 Timing</button>' : ''}
          </nav>
          <div class="ipane" data-pane="checks"></div>
          <div class="ipane" data-pane="meter" hidden></div>
          <div class="ipane" data-pane="values" hidden></div>
          <div class="ipane" data-pane="timing" hidden><canvas class="timing"></canvas><div class="tnote"></div></div>
        </section>` : ''}
      </div>`;
      const q = s => this.host.querySelector(s);
      this.svg = q('svg.bb'); this.tip = q('.tip'); this.statusEl = q('.wb-status'); this.insp = q('.inspector');
      this.drawStatic();
      if (o.code) {
        this.editor = new VL.Editor(q('.editor-host'), { lang: this.lang, onChange: () => { this.code = this.editor.value; this.codeChanged(); }, onCursor: l => this.explainLine(l) });
        this.editor.value = o.initialCode || (this.lang === 'cpp' ? VL.STARTER_CPP : VL.STARTER_CODE); this.code = this.editor.value;
        VL.Py.onStatus((s, m) => { const el = q('.pystat'); if (!el) return; el.className = 'pystat ' + s; el.textContent = s === 'ready' ? '● engine ready' : s === 'loading' ? '◌ Loading Python…' : s === 'error' ? '⚠ Python unavailable' : '○ Python idle'; el.title = m || ''; });
        VL.Py.load().catch(() => { });
        this.host.querySelectorAll('[data-blk]').forEach(b => b.onclick = () => this.editor.insertLine((this.lang === 'cpp' ? VL.CODE_BLOCKS_CPP : VL.CODE_BLOCKS)[+b.dataset.blk].code));
      }
      this.host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => this.showTab(b.dataset.tab));
      this.host.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => { this.wireColor = b.dataset.wc; this.host.querySelectorAll('[data-wc]').forEach(x => x.classList.toggle('on', x === b)); if (this.sel && this.sel.wire !== undefined) { this.snap(); this.circ.wires[this.sel.wire].color = this.wireColor; this.changed(); } });
      this.host.querySelectorAll('[data-act]').forEach(b => { const a = b.dataset.act; if (b.tagName === 'INPUT') b.onchange = () => { this.flow = b.checked; this.renderWires(); }; else b.onclick = () => this.action(a); });
      this.flow = true;
      this.host.querySelectorAll('[data-add]').forEach(b => b.addEventListener('pointerdown', e => this.startPlacing(e, b)));
      this.bindSvg();
      this._key = e => this.key(e); document.addEventListener('keydown', this._key);
    }
    showTab(t) { this.tab = t; this.host.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); this.host.querySelectorAll('.ipane').forEach(p => p.hidden = p.dataset.pane !== t); this.probe.on = t === 'meter'; this.renderInstruments(); this.renderOverlay(); if (t === 'timing') this.drawTiming(); }
    status(msg, kind) { this.statusEl.innerHTML = msg; this.statusEl.className = 'wb-status ' + (kind || ''); }

    drawStatic() {
      let s = `<defs>
        <radialGradient id="glowG"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <linearGradient id="bbG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f3f6"/><stop offset="1" stop-color="#d9dde4"/></linearGradient>
        <linearGradient id="boardG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1f2b"/><stop offset="1" stop-color="#0b0e15"/></linearGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>`;
      s += this.boardSVG();
      // breadboard
      s += `<g class="bbg"><rect x="${BBX}" y="${BBY}" width="640" height="380" rx="10" fill="url(#bbG)" stroke="#b8bec9"/>
        <rect x="${BBX + 10}" y="${holeXY(1, 8).y - 6}" width="620" height="12" rx="3" fill="#c9ced8"/>`;
      [[0, '#e11d48'], [1, '#2563eb'], [15, '#e11d48'], [16, '#2563eb']].forEach(([r, c]) => { const y = holeXY(1, r).y; const yy = (r === 0 || r === 15) ? y - 10 : y + 10; s += `<line x1="${BBX + 20}" x2="${BBX + 620}" y1="${yy}" y2="${yy}" stroke="${c}" stroke-width="2"/><text x="${BBX + 10}" y="${y + 4}" class="bbl" fill="${c}" text-anchor="middle">${r === 0 || r === 15 ? '+' : '−'}</text><text x="${BBX + 630}" y="${y + 4}" class="bbl" fill="${c}" text-anchor="middle">${r === 0 || r === 15 ? '+' : '−'}</text>`; });
      for (let x = 1; x <= 30; x++) { if (x === 1 || x % 5 === 0) { s += `<text x="${holeXY(x, 3).x}" y="${holeXY(x, 3).y - 12}" class="bbl" text-anchor="middle">${x}</text><text x="${holeXY(x, 13).x}" y="${holeXY(x, 13).y + 20}" class="bbl" text-anchor="middle">${x}</text>`; } }
      Object.entries(C().ROWNAMES).forEach(([y, n]) => { y = +y; if (y >= 3 && y <= 13) s += `<text x="${BBX + 12}" y="${holeXY(1, y).y + 4}" class="bbl" text-anchor="middle">${n}</text><text x="${BBX + 628}" y="${holeXY(1, y).y + 4}" class="bbl" text-anchor="middle">${n}</text>`; });
      s += `<g class="holes">`;
      for (let y = 0; y <= 16; y++) for (let x = 1; x <= 30; x++) if (C().isHole(x, y)) { const h = holeXY(x, y); s += `<rect class="hole" data-h="${x}:${y}" x="${h.x - 4}" y="${h.y - 4}" width="8" height="8" rx="1.5"/>`; }
      s += `</g></g><g class="lay-wires"></g><g class="lay-comps"></g><g class="lay-over"></g>`;
      this.svg.innerHTML = s;
      this.gW = this.svg.querySelector('.lay-wires'); this.gC = this.svg.querySelector('.lay-comps'); this.gO = this.svg.querySelector('.lay-over');
    }

    boardSVG() {
      let s = '';
      if (this.board.id === 'uno') {
        s += `<g class="board"><rect x="${BX}" y="${BY}" width="240" height="500" rx="10" fill="#0b5aa0" stroke="#0a3d6e"/>
          <rect x="${BX + 70}" y="${BY - 10}" width="56" height="62" rx="4" fill="#b7bec8"/><rect x="${BX + 78}" y="${BY - 4}" width="40" height="40" rx="3" fill="#8b939e"/>
          <rect x="${BX + 150}" y="${BY - 6}" width="44" height="50" rx="6" fill="#141414"/><circle cx="${BX + 172}" cy="${BY + 18}" r="9" fill="#2b2b2b"/>
          <rect x="${BX + 92}" y="${BY + 230}" width="56" height="170" rx="4" fill="#1a1a1a"/><text x="${BX + 120}" y="${BY + 318}" class="silk" text-anchor="middle" transform="rotate(-90 ${BX + 120} ${BY + 318})">ATmega328P</text>
          ${Array.from({ length: 14 }, (_, i) => `<rect x="${BX + 86}" y="${BY + 238 + i * 11.5}" width="6" height="3" fill="#cfd4da"/><rect x="${BX + 148}" y="${BY + 238 + i * 11.5}" width="6" height="3" fill="#cfd4da"/>`).join('')}
          <text x="${BX + 120}" y="${BY + 130}" class="silk" text-anchor="middle" font-size="16">UNO R3</text><text x="${BX + 120}" y="${BY + 146}" class="silk small" text-anchor="middle">5 V logic · 16 MHz</text>
          <rect x="${BX + 124}" y="${BY + 160}" width="12" height="7" rx="1" fill="#5b4a12" class="lled"/><text x="${BX + 130}" y="${BY + 182}" class="silk small" text-anchor="middle">L (D13)</text>
          <circle cx="${BX + 150}" cy="${BY + 92}" r="8" fill="#e5e7eb"/><text x="${BX + 150}" y="${BY + 114}" class="silk small" text-anchor="middle">RESET</text>
          <circle cx="${BX + 100}" cy="${BY + 175}" r="4" fill="#22c55e" class="pwrled"/><text x="${BX + 100}" y="${BY + 192}" class="silk small" text-anchor="middle">ON</text>`;
      } else {
        s += `<g class="board"><rect x="${BX}" y="${BY}" width="240" height="500" rx="10" fill="url(#boardG)" stroke="#2c3546"/>
        <rect x="${BX + 72}" y="${BY - 8}" width="96" height="190" rx="4" fill="#1b2438"/>
        <rect x="${BX + 78}" y="${BY + 40}" width="84" height="136" rx="3" fill="#c3c8d0"/><text x="${BX + 120}" y="${BY + 100}" class="silk dark" text-anchor="middle">ESP32</text><text x="${BX + 120}" y="${BY + 114}" class="silk dark small" text-anchor="middle">WROOM-32</text><text x="${BX + 120}" y="${BY + 130}" class="silk dark small" text-anchor="middle">Wi-Fi · BT</text>
        <path d="M${BX + 80} ${BY + 20} h10 v-18 h10 v18 h10 v-18 h10 v18 h10 v-18 h10 v18 h10 v-18 h10 v18" fill="none" stroke="#d4a73a" stroke-width="3"/>
        <rect x="${BX + 92}" y="${BY + 478}" width="56" height="30" rx="3" fill="#aab1bb"/><rect x="${BX + 100}" y="${BY + 500}" width="40" height="6" fill="#222"/>
        <rect x="${BX + 52}" y="${BY + 474}" width="28" height="22" rx="3" fill="#ccd1d8"/><rect x="${BX + 59}" y="${BY + 478}" width="14" height="14" rx="2" fill="#111"/><text x="${BX + 66}" y="${BY + 506}" class="silk small" text-anchor="middle">EN</text>
        <rect x="${BX + 160}" y="${BY + 474}" width="28" height="22" rx="3" fill="#ccd1d8"/><rect x="${BX + 167}" y="${BY + 478}" width="14" height="14" rx="2" fill="#111"/><text x="${BX + 174}" y="${BY + 506}" class="silk small" text-anchor="middle">BOOT</text>
        <circle cx="${BX + 100}" cy="${BY + 240}" r="4" fill="#ff3b3b" class="pwrled"/><text x="${BX + 120}" y="${BY + 300}" class="silk" text-anchor="middle">DevKitC</text><text x="${BX + 120}" y="${BY + 314}" class="silk small" text-anchor="middle">V4</text>
        <text x="${BX + 22}" y="${BY + 46}" class="silk small" text-anchor="middle">J2</text><text x="${BX + 218}" y="${BY + 46}" class="silk small" text-anchor="middle">J3</text>`;
      }
      VL.PINS.forEach(p => {
        const { x, y } = pinXY(p.id); const col = VL.PIN_TYPES[p.type].color; const left = p.side === 'L';
        s += `<g class="pin" data-pin="${p.id}"><rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="2" fill="#0f1218" stroke="${col}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="3.2" fill="#d4af37"/>
          <text x="${left ? x + 13 : x - 13}" y="${y + 4}" class="silk" text-anchor="${left ? 'start' : 'end'}" fill="${col}">${p.label}</text></g>`;
      });
      s += `</g>`;
      return s;
    }

    /* --------------------------- rendering --------------------------- */
    renderAll() { this.renderWires(); this.renderComps(); this.renderOverlay(); this.renderInspector(); this.analyze(); }
    wirePath(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const sag = Math.min(46, d * 0.18);
      const mx = (a.x + b.x) / 2 - dy / d * sag * 0.3, my = (a.y + b.y) / 2 + sag; return `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
    }
    wireColors() {
      /* colour code: GND net = black, power net = red, signals = other colours */
      const SIG = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#f8fafc', '#ec4899', '#06b6d4'];
      let nets = null; try { nets = VL.Circuit.buildNets(this.circ); } catch (e) { }
      const isBR = c => /^#(111827|000000|111|000|ef4444|dc2626|f00|ff0000)$/i.test(c || '');
      let k = 0; return this.circ.wires.map(w => {
        if (!nets) return w.color;
        const r = nets.netOf(w.a), g = nets.root('GND'), v3 = nets.root('3V3'), v5 = nets.root('5V');
        if (r === g) return '#111827'; if (r === v3 || r === v5) return '#dc2626';
        return isBR(w.color) ? SIG[k++ % SIG.length] : w.color;
      });
    }
    renderWires() {
      let s = ''; const WC = this.wireColors();
      this.circ.wires.forEach((w, i) => {
        w = Object.assign({}, w, { color: WC[i] });
        const a = keyXY(w.a), b = keyXY(w.b); const d = this.wirePath(a, b); const sel = this.sel && this.sel.wire === i;
        s += `<g class="wire ${sel ? 'sel' : ''}" data-wire="${i}"><path d="${d}" class="w-hit"/><path d="${d}" class="w-out"/><path d="${d}" stroke="${w.color}" class="w-main"/><path d="${d}" class="w-flow" data-flow="${i}"/>
          <circle cx="${a.x}" cy="${a.y}" r="4.5" fill="${w.color}" stroke="#0008"/><circle cx="${b.x}" cy="${b.y}" r="4.5" fill="${w.color}" stroke="#0008"/></g>`;
      });
      this.gW.innerHTML = s;
    }
    compSVG(c, ghost) {
      const L = C().compLegs(c).map(l => holeXY(l.x, l.y)); const [A, B] = L; const sel = this.sel && this.sel.comp === c.id;
      const cls = `comp ${ghost ? 'ghost' + (ghost === 'bad' ? ' bad' : '') : ''} ${sel ? 'sel' : ''}`;
      if (c.type === 'led') {
        const t = VL.LED_TYPES[c.color]; const vert = !!c.rot; const pins = C().ledPins(c); const An = holeXY(pins.anode.x, pins.anode.y), Ca = holeXY(pins.cathode.x, pins.cathode.y);
        const cx = vert ? A.x - 18 : (A.x + B.x) / 2, cy = vert ? (A.y + B.y) / 2 : A.y - 18;
        const burnt = this.burnt[c.id];
        const flatX = vert ? cx + (Ca.y > An.y ? 0 : 0) : (Ca.x > An.x ? cx + 10 : cx - 10);
        const flatLine = vert ? `<line x1="${cx - 9}" x2="${cx + 9}" y1="${Ca.y > An.y ? cy + 11 : cy - 11}" y2="${Ca.y > An.y ? cy + 11 : cy - 11}" stroke="#0007" stroke-width="2.5"/>` : `<line x1="${flatX}" x2="${flatX}" y1="${cy - 9}" y2="${cy + 9}" stroke="#0007" stroke-width="2.5"/>`;
        const legA = vert ? `M${An.x} ${An.y} L${cx + 4} ${An.y} L${cx + 4} ${cy}` : `M${An.x} ${An.y} L${An.x} ${cy - 2} `;
        const legC = vert ? `M${Ca.x} ${Ca.y} L${cx + 4} ${Ca.y} L${cx + 4} ${cy}` : `M${Ca.x} ${Ca.y} L${Ca.x} ${cy}`;
        const plusX = vert ? An.x + 9 : An.x + (An.x < Ca.x ? -9 : 9), plusY = vert ? An.y - 4 : An.y - 6;
        return `<g class="${cls}" data-comp="${c.id}">
          <circle class="glow" data-glow="${c.id}" cx="${cx}" cy="${cy}" r="34" fill="rgb(${t.glow})" opacity="0" filter="url(#soft)"/>
          <path d="${legA}" class="leg"/><path d="${legC}" class="leg"/>
          <text x="${plusX}" y="${plusY}" class="pol">+</text>
          <circle cx="${cx}" cy="${cy}" r="12" class="hitc" />
          <circle cx="${cx}" cy="${cy}" r="11" fill="${burnt ? '#5b5b5b' : t.color}" class="lens" data-lens="${c.id}" opacity="${burnt ? 1 : .55}" stroke="#0005"/>
          <circle cx="${cx - 3.5}" cy="${cy - 4}" r="3" fill="#fff" opacity=".55"/>
          ${flatLine}
          ${burnt ? `<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="burnt">✕</text>` : ''}
        </g>`;
      }
      if (c.type === 'button') {
        const vert = !!c.rot; const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2; const down = this.isPressedNow(c.id);
        return `<g class="${cls} btn ${down ? 'down' : ''}" data-comp="${c.id}"><line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="leg"/>
          <rect x="${cx - 15}" y="${cy - 15}" width="30" height="30" rx="4" fill="#2b3446" stroke="#0007"/><circle cx="${cx}" cy="${cy}" r="${down ? 8 : 9}" fill="${down ? '#0f172a' : '#111827'}" stroke="${down ? '#22d3ee' : '#64748b'}" stroke-width="2"/>
          <text x="${cx}" y="${vert ? cy + 4 : cy - 19}" ${vert ? `dx="22"` : ''} class="rlabel" text-anchor="${vert ? 'start' : 'middle'}">${down ? 'pressed' : 'button'}</text></g>`;
      }
      if (c.type === 'resistor') {
        const vert = !!c.rot; const [d1, d2, m] = VL.bandsFor(c.value); const bands = [VL.BAND[d1], VL.BAND[d2], VL.BAND[m], '#c9a227'];
        let body;
        if (!vert) { const x0 = A.x + 18, w = B.x - A.x - 36; body = `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="leg"/><rect x="${x0}" y="${A.y - 8}" width="${w}" height="16" rx="7" class="rbody"/>` + bands.map((b, i) => `<rect x="${x0 + 8 + i * 9 + (i === 3 ? 6 : 0)}" y="${A.y - 8}" width="4.5" height="16" fill="${b}"/>`).join(''); }
        else { const y0 = A.y + 18, h = B.y - A.y - 36; body = `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="leg"/><rect x="${A.x - 8}" y="${y0}" width="16" height="${h}" rx="7" class="rbody"/>` + bands.map((b, i) => `<rect y="${y0 + 8 + i * 9 + (i === 3 ? 6 : 0)}" x="${A.x - 8}" height="4.5" width="16" fill="${b}"/>`).join(''); }
        return `<g class="${cls}" data-comp="${c.id}">${body}<text x="${vert ? A.x + 14 : (A.x + B.x) / 2}" y="${vert ? (A.y + B.y) / 2 + 4 : A.y - 13}" class="rlabel" text-anchor="${vert ? 'start' : 'middle'}">${VL.fmtOhm(c.value)}</text></g>`;
      }
      return '';
    }
    renderComps() { this.gC.innerHTML = this.circ.comps.map(c => this.compSVG(c)).join('') + (this.ghost ? this.compSVG(this.ghost.comp, this.ghost.ok ? 'ok' : 'bad') : ''); }
    renderOverlay() {
      let s = '';
      if (this.wireStart) { const a = keyXY(this.wireStart); s += `<circle cx="${a.x}" cy="${a.y}" r="8" class="wstart"/>`; if (this.rubber) s += `<path d="${this.wirePath(a, this.rubber)}" stroke="${this.wireColor}" class="rubber"/>`; }
      if (this.probe.on) {
        if (this.probe.red) { const p = keyXY(this.probe.red); s += `<g class="probe"><circle cx="${p.x}" cy="${p.y}" r="7" fill="#ef4444"/><text x="${p.x}" y="${p.y - 11}" text-anchor="middle" class="ptext">V+</text></g>`; }
        if (this.probe.black) { const p = keyXY(this.probe.black); s += `<g class="probe"><circle cx="${p.x}" cy="${p.y}" r="7" fill="#111827" stroke="#fff"/><text x="${p.x}" y="${p.y - 11}" text-anchor="middle" class="ptext">COM</text></g>`; }
      }
      if (this.hlStrip) this.hlStrip.forEach(k => { const p = keyXY(k); s += `<rect x="${p.x - 6}" y="${p.y - 6}" width="12" height="12" rx="3" class="strip-hl"/>`; });
      this.gO.innerHTML = s;
    }
    renderInspector() {
      const el = this.insp; if (!el) return;
      if (this.sel && this.sel.comp) {
        const c = this.circ.comps.find(x => x.id === this.sel.comp); if (!c) { el.innerHTML = ''; return; }
        if (c.type === 'led') {
          const P2 = C().ledPins(c);
          el.innerHTML = `<div class="ins-t">LED <span class="muted">${VL.LED_TYPES[c.color].name}, Vf ≈ ${VL.LED_TYPES[c.color].vf} V</span></div>
          <div class="ins-row">Anode (+) in <b>${C().holeName(P2.anode.x, P2.anode.y)}</b>, cathode (−) in <b>${C().holeName(P2.cathode.x, P2.cathode.y)}</b></div>
          <div class="ins-row"><select data-ins="color">${Object.entries(VL.LED_TYPES).map(([k, t]) => `<option value="${k}" ${k === c.color ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
          <div class="ins-btns"><button data-ins="flip">⇄ Flip (F)</button><button data-ins="rot">⟳ Rotate (R)</button><button data-ins="del" class="danger">🗑 Delete</button></div>`;
        } else if (c.type === 'button') {
          el.innerHTML = `<div class="ins-t">Push button <span class="muted">normally open</span></div>
          <div class="ins-row">Pressed during the run (seconds):<input class="inp sm" data-ins="sched" value="${esc(c.sched || '')}" placeholder="e.g. 1-3, 5-6"></div>
          <div class="ins-row"><label class="tgl"><input type="checkbox" data-ins="hold" ${this.held.has(c.id) ? 'checked' : ''}> hold pressed now (test)</label></div>
          <div class="ins-btns"><button data-ins="rot">⟳ Rotate (R)</button><button data-ins="del" class="danger">🗑 Delete</button></div>`;
          el.querySelector('[data-ins=sched]').onchange = e => { this.snap(); c.sched = e.target.value; this.changed(); };
          el.querySelector('[data-ins=hold]').onchange = e => { if (e.target.checked) this.held.add(c.id); else this.held.delete(c.id); this.renderComps(); this.analyze(); };
          el.querySelectorAll('button[data-ins]').forEach(b => b.onclick = () => this.compAction(b.dataset.ins));
          return;
        } else {
          el.innerHTML = `<div class="ins-t">Resistor <span class="muted">${VL.fmtOhm(c.value)}</span></div>
          <div class="ins-row"><select data-ins="value">${VL.RESISTOR_VALUES.map(v => `<option value="${v}" ${v === c.value ? 'selected' : ''}>${VL.fmtOhm(v)}</option>`).join('')}</select></div>
          <div class="ins-row bands">${VL.bandsFor(c.value).map((d, i) => `<span style="--b:${VL.BAND[d]}">${VL.BAND_N[d]}</span>`).join('')}<span style="--b:#c9a227">gold ±5%</span></div>
          <div class="ins-btns"><button data-ins="rot">⟳ Rotate (R)</button><button data-ins="del" class="danger">🗑 Delete</button></div>`;
        }
        el.querySelectorAll('[data-ins]').forEach(b => { const a = b.dataset.ins; if (b.tagName === 'SELECT') b.onchange = () => { this.snap(); c[a] = a === 'value' ? +b.value : b.value; this.changed(); }; else b.onclick = () => this.compAction(a); });
      } else if (this.sel && this.sel.wire !== undefined) {
        const w = this.circ.wires[this.sel.wire]; if (!w) { el.innerHTML = ''; return; }
        el.innerHTML = `<div class="ins-t">Jumper wire</div><div class="ins-row">${esc(keyName(w.a))} → ${esc(keyName(w.b))}</div><div class="ins-row muted">Pick a colour above to recolour it.</div><div class="ins-btns"><button data-ins="del" class="danger">🗑 Delete (Del)</button></div>`;
        el.querySelector('[data-ins]').onclick = () => this.compAction('del');
      } else el.innerHTML = `<div class="muted small">Select a part or a wire to edit it. Hover a hole to see which holes are connected to it.</div>`;
    }

    /* --------------------------- interaction --------------------------- */
    svgPt(e) { const pt = this.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(this.svg.getScreenCTM().inverse()); }
    nearestKey(p) {
      // pins
      for (const pin of VL.PINS) { const q = pinXY(pin.id); if (Math.abs(q.x - p.x) < 9 && Math.abs(q.y - p.y) < 9) return 'P:' + pin.id; }
      const x = Math.round((p.x - BBX - 30) / P) + 1, y = Math.round((p.y - BBY - 30) / P);
      if (C().isHole(x, y)) { const h = holeXY(x, y); if (Math.abs(h.x - p.x) < 10 && Math.abs(h.y - p.y) < 10) return `H:${x}:${y}`; }
      return null;
    }
    nearestHole(p) { const x = Math.round((p.x - BBX - 30) / P) + 1, y = Math.round((p.y - BBY - 30) / P); return { x, y }; }
    stripKeys(k) {
      const p = C().parseKey(k); if (p.kind !== 'H') return [k];
      const out = []; const net = C().holeNet(p.x, p.y);
      for (let y = 0; y <= 16; y++) for (let x = 1; x <= 30; x++) if (C().isHole(x, y) && C().holeNet(x, y) === net) out.push(`H:${x}:${y}`);
      return out;
    }
    bindSvg() {
      const svg = this.svg;
      svg.addEventListener('pointermove', e => {
        const p = this.svgPt(e);
        if (this.drag) return this.dragMove(p);
        const k = this.nearestKey(p);
        if (this.wireStart) { this.rubber = k ? keyXY(k) : p; }
        const strip = k && k.startsWith('H:') ? this.stripKeys(k) : null;
        const changed = JSON.stringify(strip) !== JSON.stringify(this.hlStrip); this.hlStrip = strip;
        if (this.wireStart || changed) this.renderOverlay();
        this.showTip(e, k);
      });
      svg.addEventListener('pointerleave', () => { this.hlStrip = null; this.tip.hidden = true; this.renderOverlay(); });
      svg.addEventListener('pointerdown', e => {
        const p = this.svgPt(e);
        const compEl = e.target.closest('[data-comp]'); const wireEl = e.target.closest('[data-wire]');
        const k = this.nearestKey(p);
        if (this.probe.on) { this.probeClick(k, compEl); return; }
        if (this.wireStart) { if (k) this.finishWire(k); else this.cancelWire(); return; }
        if (compEl) {
          const c = this.circ.comps.find(x => x.id === compEl.dataset.comp);
          this.select({ comp: c.id });
          const h = this.nearestHole(p); this.drag = { comp: c, ox: c.x - h.x, oy: c.y - h.y, moved: false, start: { x: c.x, y: c.y } };
          svg.setPointerCapture(e.pointerId); return;
        }
        if (k) {
          const occ = C().occupied(this.circ);
          if (occ[k]) {
            if (occ[k].startsWith('w')) { this.select({ wire: +occ[k].slice(1) }); this.status('That hole already has a wire. <b>Use another hole in the same column</b> to connect more things; all 5 holes are connected.'); }
            else { this.select({ comp: occ[k] }); this.status('A component leg is in that hole. Use another hole in the same strip to connect to it.'); }
            return;
          }
          this.wireStart = k; this.rubber = keyXY(k); this.select(null); this.renderOverlay();
          this.status(`Wire from <b>${esc(keyName(k))}</b>: now click where it should go (Esc to cancel).`);
          return;
        }
        if (wireEl) { this.select({ wire: +wireEl.dataset.wire }); return; }
        this.select(null);
      });
      svg.addEventListener('pointerup', e => { if (this.drag) this.dragEnd(); });
    }
    showTip(e, k) {
      if (!k) { this.tip.hidden = true; return; }
      let html;
      if (k.startsWith('P:')) { const pin = VL.pinById[k.slice(2)]; html = `<b style="color:${VL.PIN_TYPES[pin.type].color}">${pin.label}</b> · ${pin.title}<br><span>${VL.PIN_TYPES[pin.type].name}</span>`; }
      else { const p = C().parseKey(k); html = `<b>${C().holeName(p.x, p.y)}</b><br><span>${p.y <= 1 || p.y >= 15 ? 'whole rail is connected' : 'connected to its column (5 holes)'}</span>`; }
      if (this.lastSolve && this.lastSolve.res) { const v = this.lastSolve.res.netV(C().pointNet(k)); if (v !== null && this.lastSolve.powered) html += `<br><span class="v">${v.toFixed(2)} V</span>`; }
      const r = this.svg.parentElement.getBoundingClientRect();
      this.tip.innerHTML = html; this.tip.hidden = false; this.tip.style.left = (e.clientX - r.left + 14) + 'px'; this.tip.style.top = (e.clientY - r.top + 14) + 'px';
    }
    finishWire(k) {
      const a = this.wireStart;
      if (k === a) { this.cancelWire(); return; }
      const occ = C().occupied(this.circ);
      if (occ[k]) { this.status('That spot is already used. Pick a free hole in the same column/strip.', 'warn'); return; }
      if (k.startsWith('P:') && a.startsWith('P:')) { this.status('Connecting two ESP32 pins directly is not useful here (and can short them). Connect a pin to the breadboard instead.', 'warn'); }
      this.snap(); this.circ.wires.push({ a, b: k, color: this.wireColor });
      this.wireStart = null; this.rubber = null; this.status(`Wire added: ${esc(keyName(a))} → ${esc(keyName(k))}`); this.changed();
    }
    cancelWire() { this.wireStart = null; this.rubber = null; this.renderOverlay(); this.status('Wire cancelled.'); }
    dragMove(p) {
      const d = this.drag, h = this.nearestHole(p); const nx = h.x + d.ox, ny = h.y + d.oy;
      if (nx === d.comp.x && ny === d.comp.y) return;
      const test = Object.assign({}, d.comp, { x: nx, y: ny });
      if (C().canPlace(this.circ, test, d.comp.id)) { if (!d.moved) { this.snap(); d.moved = true; } d.comp.x = nx; d.comp.y = ny; this.renderComps(); }
    }
    dragEnd() { const d = this.drag; this.drag = null; if (d.moved) this.changed(); }
    startPlacing(e, btn) {
      e.preventDefault();
      const kind = btn.dataset.add;
      const comp = kind === 'led' ? { id: uid(), type: 'led', color: btn.dataset.color, x: 1, y: 3, rot: 0 } : kind === 'button' ? { id: uid(), type: 'button', x: 1, y: 7, rot: 0, sched: '1-3, 5-6' } : { id: uid(), type: 'resistor', value: 220, x: 1, y: 3, rot: 0 };
      this.ghost = { comp, ok: false };
      const move = ev => {
        const p = this.svgPt(ev); const h = this.nearestHole(p); comp.x = h.x; comp.y = h.y;
        if (comp.type === 'resistor') comp.x = h.x - 2;
        if (comp.type === 'button') comp.x = h.x - 1;
        this.ghost.ok = C().canPlace(this.circ, comp); this.renderComps();
      };
      const up = ev => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        const r = this.svg.getBoundingClientRect(); const inside = ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom;
        if (inside && this.ghost.ok) { this.snap(); this.circ.comps.push(comp); this.ghost = null; this.select({ comp: comp.id }); this.status(comp.type === 'button' ? 'Push button placed. It connects its two legs only while pressed. Set when it is pressed in the Inspector.' : comp.type === 'led' ? 'LED placed. The <b>+</b> marks the anode (long leg). Its legs sit in two different columns.' : `Resistor placed (${VL.fmtOhm(comp.value)}). Change its value in the Inspector.`); this.changed(); }
        else { this.ghost = null; this.renderComps(); if (inside) this.status('A part can only go where both legs land in free holes.', 'warn'); }
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    }
    select(s) { this.sel = s; this.renderComps(); this.renderWires(); this.renderInspector(); }
    compAction(a) {
      if (!this.sel) return;
      if (a === 'del') { this.snap(); if (this.sel.comp) this.circ.comps = this.circ.comps.filter(c => c.id !== this.sel.comp); else this.circ.wires.splice(this.sel.wire, 1); this.sel = null; this.changed(); return; }
      const c = this.circ.comps.find(x => x.id === this.sel.comp); if (!c) return;
      if (a === 'flip' && c.type === 'led') { this.snap(); c.flip = !c.flip; this.changed(); this.status('LED flipped: the anode (+) and cathode (−) swapped sides.'); }
      if (a === 'rot') { const t = Object.assign({}, c, { rot: c.rot ? 0 : 1 }); if (C().canPlace(this.circ, t, c.id)) { this.snap(); c.rot = t.rot; this.changed(); } else this.status('Not enough free holes to rotate it here. Move it first.', 'warn'); }
    }
    key(e) {
      if (!this.host.isConnected || this.host.offsetParent === null) return;
      if (e.target.closest('textarea, input, select')) return;
      if (e.key === 'Escape') { if (this.wireStart) this.cancelWire(); this.select(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.compAction('del'); }
      if (e.key === 'r' || e.key === 'R') this.compAction('rot');
      if (e.key === 'f' || e.key === 'F') this.compAction('flip');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
    }
    probeClick(k, compEl) {
      const pr = this.probe;
      if (pr.mode === 'V') { if (!k) return; if (!pr.red || (pr.red && pr.black)) { pr.red = k; pr.black = null; } else pr.black = k; }
      else if (pr.mode === 'A' || pr.mode === 'R') { if (compEl) pr.comp = compEl.dataset.comp; }
      this.renderOverlay(); this.renderInstruments();
    }

    /* history */
    snap() { this.hist.push(JSON.stringify(this.circ)); if (this.hist.length > 80) this.hist.shift(); this.fut = []; }
    undo() { if (!this.hist.length) return; this.fut.push(JSON.stringify(this.circ)); this.circ = JSON.parse(this.hist.pop()); this.sel = null; this.changed(true); }
    redo() { if (!this.fut.length) return; this.hist.push(JSON.stringify(this.circ)); this.circ = JSON.parse(this.fut.pop()); this.sel = null; this.changed(true); }
    setCircuit(c, code) { this.circ = JSON.parse(JSON.stringify(c)); this.hist = []; this.fut = []; this.sel = null; this.burnt = {}; if (code !== undefined && this.editor) { this.editor.value = code; this.code = code; } this.stopPlay(true); this.changed(true); }
    changed(silent) { this.burnt = {}; this.stopPlay(true); this.renderAll(); this.opts.onChange && this.opts.onChange(this); }
    codeChanged() { this.editor.setError(0); clearTimeout(this._ct); this._ct = setTimeout(() => { this.analyze(); this.opts.onChange && this.opts.onChange(this); }, 400); }

    action(a) {
      if (a === 'undo') this.undo(); else if (a === 'redo') this.redo();
      else if (a === 'clear') VL.ui.confirm('Reset the workbench?', 'This removes every part and wire (you can undo).', () => { this.snap(); this.circ = { comps: [], wires: [] }; this.changed(); });
      else if (a === 'save') this.saveDialog(); else if (a === 'load') this.loadDialog();
      else if (a === 'run') this.run(); else if (a === 'stop') this.stopPlay(); else if (a === 'reset') { this.stopPlay(true); this.burnt = {}; this.renderComps(); this.status('Board reset. All pins are LOW and the program is stopped.'); }
      else if (a === 'testhigh') { this.testHigh = !this.testHigh; this.host.querySelector('[data-act=testhigh]').classList.toggle('on', this.testHigh); this.analyze(); }
      else if (a === 'explain') this.explainAll();
    }
    saveDialog() {
      VL.ui.prompt('Save project', 'Give your project a name:', 'My LED project', name => {
        const S = VL.Store; S.p.projects = S.p.projects.filter(p => p.name !== name);
        S.p.projects.push({ name, circuit: this.circ, code: this.code || '', savedAt: Date.now() }); S.save();
        VL.ui.toast(`Saved “${esc(name)}”` + (S.mode === 'cloud' ? '' : ' on this computer'));
      });
    }
    loadDialog() {
      const list = VL.Store.p.projects.slice().reverse();
      if (!list.length) { VL.ui.toast('No saved projects yet. Press Save first.'); return; }
      VL.ui.modal({ title: 'Load a project', body: `<div class="plist">${list.map((p, i) => `<button class="pitem" data-i="${i}"><b>${esc(p.name)}</b><span>${new Date(p.savedAt).toLocaleString()} · ${p.circuit.comps.length} parts · ${p.circuit.wires.length} wires</span></button>`).join('')}</div>`, onOpen: m => m.querySelectorAll('.pitem').forEach(b => b.onclick = () => { const p = list[+b.dataset.i]; this.setCircuit(p.circuit, p.code || undefined); VL.ui.close(); VL.ui.toast('Loaded ' + esc(p.name)); }) });
    }

    /* ---------------------------- analysis ---------------------------- */
    analyze() {
      const codePins = this.editor ? VL.Py.staticPins(this.code || '') : null;
      this.diag = C().diagnose(this.circ, codePins);
      this.codeIssues = this.editor ? this.codeDiagnose() : [];
      // live DC state for idle display
      if (!this.play) {
        const states = {};
        if (this.testHigh && this.diag) { Object.keys(this.diag.resH ? this.diag.resH.src : {}).forEach(() => { }); C().wiredPins(this.circ).forEach(p => { if (p.gpio !== null && p.type !== 'flash' && p.type !== 'input') states[p.gpio] = 1; }); }
        this.applyState(states, true);
      }
      this.renderInstruments();
      this.opts.onAnalyze && this.opts.onAnalyze(this);
    }
    codeDiagnose() {
      const out = []; const code = this.code || ''; const r = this.lastRun;
      if (!VL.Py.staticPins(code).length && !/Pin\(|pinMode|LED\(/.test(code.replace(/#.*/g, ''))) out.push({ code: 'NO_PIN_CODE', level: 'todo' });
      if (r && r.code === code) {
        if (r.error) out.push({ code: r.error.syntax ? 'SYNTAX' : 'RUNTIME', level: 'error', detail: `${r.error.type} on line ${r.error.line}: ${r.error.msg}` });
        else if (r.ledStats) {
          r.ledStats.forEach(st => {
            if (st.transitions <= 1) out.push({ code: 'NO_TOGGLE', level: 'error' });
            else if (st.medianGap < 15) out.push({ code: 'TOO_FAST', level: 'error', detail: `switching every ${st.medianGap.toFixed(2)} ms` });
            else if (r.reason === 'complete' && st.transitions < 4 && this.lang !== 'cpp') out.push({ code: 'NO_LOOP', level: 'warn' });
          });
        }
      }
      const seen = {}; return out.filter(i => !seen[i.code] && (seen[i.code] = 1));
    }
    allIssues() { const ig = this.opts.ignore || []; return [...(this.diag ? this.diag.issues : []), ...(this.codeIssues || [])].filter(i => !ig.includes(i.code)); }

    /* solve + paint the board for a given pin state */
    isPressedNow(id) { return this.play && this.play.pressed ? this.play.pressed.has(id) : this.held.has(id); }
    pressedNow() { return this.play && this.play.pressed ? this.play.pressed : this.held; }
    applyState(states, powered, pressed) {
      pressed = pressed || this.pressedNow();
      const key = JSON.stringify(states) + '|' + [...pressed].sort().join(',');
      let res = this._cache && this._cache.circ === this.circ && this._cache.map[key];
      if (!this._cache || this._cache.circ !== this.circ || this._cache.ver !== this.ver()) this._cache = { circ: this.circ, ver: this.ver(), map: {} };
      if (!res) { const st2 = {}; Object.entries(states).forEach(([g, v]) => st2[g] = v > 0 ? 1 : 0); res = { res: C().solve(this.circ, st2, { pressed }), flow: C().solve(this.circ, st2, { wireR: true, pressed }) }; this._cache.map[key] = res; }
      this.lastSolve = { res: res.res, states, powered: powered !== false, key };
      this.pinStates = states;
      return res;
    }
    ver() { return JSON.stringify(this.circ).length + ':' + this.circ.comps.length + ':' + this.circ.wires.length + JSON.stringify(this.circ).slice(-40); }

    /* ------------------------------ RUN ------------------------------ */
    async run() {
      if (!this.editor) return;
      const code = this.editor.value; this.code = code; this.editor.setError(0);
      this.stopPlay(true);
      this.status('<span class="spin"></span> Running your program…');
      let r;
      const cfg = { board: this.board.id, inputs: this.inputSchedule() };
      try { r = this.lang === 'cpp' ? await VL.Arduino.run(code, 10000, cfg) : await VL.Py.run(code, 10000, cfg); }
      catch (e) { this.status('The simulator stopped unexpectedly. ' + esc(VL.Py.msg || ''), 'err'); return; }
      r.code = code; this.lastRun = r; VL.Store.p.runs++; VL.Store.save();
      const ser = this.host.querySelector('.serial'); if (ser) ser.textContent = (this.lang === 'cpp' ? 'Checking code…\nCompiling sketch…\n' : 'Checking code…\nCopying main.py to the board…\n') + (r.error && (r.error.syntax || r.error.type === 'TranslateError') ? '' : (this.lang === 'cpp' ? 'Done uploading.\n' : 'Done. Program started.\n'));
      if (r.error) {
        this.editor.setError(r.error.line);
        const msg = `<b>${r.error.type}</b> on line ${r.error.line}: ${esc(r.error.msg)}<br><span class="explainer">💡 ${esc(VL.Py.explainError(r.error))}</span>`;
        this.status('❌ ' + msg, 'err'); VL.Store.mistake(r.error.syntax ? 'SYNTAX' : 'RUNTIME');
        if (ser) ser.textContent += this.lang === 'cpp' ? `sketch.ino:${r.error.line}: ${r.error.type === 'TranslateError' ? 'error' : r.error.type}: ${r.error.msg}\n` : `Traceback (most recent call last):\n  File "main.py", line ${r.error.line}\n${r.error.type}: ${r.error.msg}\n`;
        if (r.events.length || r.serial.length) this.startPlay(r); else { this.analyze(); this.opts.onRun && this.opts.onRun(this, r); }
        return;
      }
      this.startPlay(r);
    }
    parseSched(txt) { return String(txt || '').split(/[,;]/).map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^([\d.]+)\s*(?:-|to|–)\s*([\d.]+)$/); return m ? [parseFloat(m[1]) * 1000, parseFloat(m[2]) * 1000] : null; }).filter(x => x && x[1] > x[0]); }
    btnTimes() {
      const btns = this.circ.comps.filter(c => c.type === 'button'); const times = new Set([0]);
      btns.forEach(b => this.parseSched(b.sched).forEach(([a, z]) => { times.add(a); times.add(z); }));
      return { btns, times: [...times].sort((a, b) => a - b) };
    }
    pressedAt(t) { const set = new Set(); this.circ.comps.filter(c => c.type === 'button').forEach(b => { if (this.parseSched(b.sched).some(([a, z]) => t >= a && t < z)) set.add(b.id); }); return set; }
    inputSchedule() {
      const { times } = this.btnTimes(); const out = {};
      times.forEach(t => { const lv = C().inputLevels(this.circ, this.pressedAt(t)); Object.entries(lv).forEach(([g, v]) => { (out[g] = out[g] || []).push([t, v]); }); });
      return out;
    }
    buildTimeline(r) {
      // segments of constant pin state and button state
      const segs = [{ t: 0, st: {}, pressed: this.pressedAt(0) }]; const st = {};
      const evs = r.events.map(e => ({ t: e.t, pin: e.pin, v: e.v }));
      this.btnTimes().times.forEach(t => { if (t > 0) evs.push({ t, btn: true }); });
      evs.sort((a, b) => a.t - b.t);
      evs.forEach(ev => { if (!ev.btn) st[ev.pin] = ev.v; const last = segs[segs.length - 1]; const sg = { t: ev.t, st: Object.assign({}, st), pressed: this.pressedAt(ev.t) }; if (Math.abs(last.t - ev.t) < 1e-9) { last.st = sg.st; last.pressed = sg.pressed; } else segs.push(sg); });
      const end = Math.max(r.end, 1);
      const leds = this.circ.comps.filter(c => c.type === 'led');
      const drv = {}; (this.diag && this.diag.ledInfo || []).forEach(i => drv[i.led.id] = i.gpios);
      segs.forEach(s => { const sol = this.applyState(s.st, true, s.pressed); s.short = sol.res.short; s.I = leds.map(l => { const e = sol.res.els.find(x => x.comp.id === l.id); let I = e ? Math.max(0, e.I) : 0; const g = (drv[l.id] || []).find(g => s.st[g] > 0 && s.st[g] < 1); if (g !== undefined) I *= s.st[g]; return I; }); });
      // cumulative charge for perceived brightness
      let acc = leds.map(() => 0); segs.forEach((s, i) => { s.cum = acc.slice(); const t1 = i + 1 < segs.length ? segs[i + 1].t : end; acc = acc.map((a, j) => a + s.I[j] * (t1 - s.t)); });
      // LED stats (driven GPIO transitions)
      const out = {}; r.events.forEach(ev => (out[ev.pin] = out[ev.pin] || []).push(ev));
      const ledG = new Set((this.diag && this.diag.ledInfo || []).flatMap(i => i.gpios));
      r.ledStats = [...ledG].filter(g => out[g]).map(g => { const evs = out[g]; const tr = []; for (let i = 1; i < evs.length; i++) if (evs[i].v !== evs[i - 1].v) tr.push(evs[i].t); const gaps = tr.slice(1).map((t, i) => t - tr[i]).sort((a, b) => a - b); return { gpio: g, transitions: tr.length, medianGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : Infinity }; });
      // pulses per LED (for challenges)
      r.pulses = leds.map((l, j) => { const ps = []; let on = null; segs.forEach((s, i) => { const lit = s.I[j] > 2e-4; if (lit && on === null) on = s.t; if (!lit && on !== null) { ps.push([on, s.t]); on = null; } }); if (on !== null) ps.push([on, end, true]); return { led: l, pulses: ps }; });
      return { segs, end, leds };
    }
    startPlay(r) {
      const tl = this.buildTimeline(r);
      this.play = { r, tl, t0: performance.now(), t: 0, speed: +(this.host.querySelector('.speed') || { value: 1 }).value, seg: 0, serialIdx: 0, loop: r.reason !== 'complete' && r.reason !== 'error', running: true };
      this.analyze();
      const notes = { time: 'Replaying the first 10 s of your program (it runs forever, so the replay loops).', events: `Your program switched pins more than 20,000 times in ${(r.end / 1000).toFixed(2)} s. That is far too fast to see; the replay loops this window.`, steps: 'Your program ran 600,000 lines without sleeping. It is stuck in a busy loop.', complete: `Program finished after ${(r.end / 1000).toFixed(2)} s.`, error: 'The program stopped because of an error.', reset: 'Program called machine.reset().' };
      this.status(`▶ Running · ${notes[r.reason] || ''}`, 'ok');
      if (!this.tab || this.tab === 'checks') { }
      this.opts.onRun && this.opts.onRun(this, r);
      this.drawTiming();
    }
    stopPlay(silent) { if (this.editor) { this.editor.setMark(0); this._mk = 0; }
      if (this.play) { this.play.running = false; this.play = null; this.renderComps(); }
      this.applyState({}, true); this.paintLive(0);
      const ck = this.host.querySelector('.clock'); if (ck) ck.textContent = 't = 0.00 s';
      if (!silent) this.status('■ Stopped. All pins returned to LOW.');
      this.renderInstruments();
    }
    tick(now) {
      if (this.dead) return; this.raf = requestAnimationFrame(t => this.tick(t));
      const dt = this._last ? Math.min(100, now - this._last) : 16; this._last = now;
      const pl = this.play;
      if (pl && pl.running) {
        pl.speed = +(this.host.querySelector('.speed') || { value: 1 }).value;
        pl.t += dt * pl.speed;
        if (pl.t >= pl.tl.end) { if (pl.loop) { pl.t = pl.t % pl.tl.end; pl.serialIdx = 0; this.appendSerialMark(); } else { pl.t = pl.tl.end; pl.running = false; this.status('✔ Program finished. ' + (pl.r.serial.length ? 'See the serial monitor.' : ''), 'ok'); } }
        const segs = pl.tl.segs; let lo = 0, hi = segs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].t <= pl.t) lo = m; else hi = m - 1; }
        const seg = segs[lo];
        if (seg.short) { pl.running = false; this.status('💥 <b>Short circuit!</b> Your program drove a pin that is wired straight to another power source or GND. In real life this can destroy the pin. Simulation stopped.', 'err'); VL.Store.mistake('SHORT'); }
        if (lo !== pl.seg || !this.lastSolve || this.lastSolve.states !== seg.st) {
          const btnChange = !pl.pressed || [...seg.pressed].join() !== [...pl.pressed].join();
          pl.seg = lo; pl.pressed = seg.pressed; this.applyState(seg.st, true, seg.pressed); this.renderInstruments(true);
          if (btnChange) this.renderComps();
          const L = this.svg.querySelector('.lled'); if (L) L.setAttribute('fill', seg.st[13] > 0 ? '#facc15' : '#5b4a12');
        }
        // perceived brightness: average current over the last 40 ms
        const W = 40; const F = (t) => { let a = 0, b = segs.length - 1; while (a < b) { const m = (a + b + 1) >> 1; if (segs[m].t <= t) a = m; else b = m - 1; } const s = segs[a]; return s.cum.map((c, j) => c + s.I[j] * (t - s.t)); };
        const t1 = pl.t, t0 = Math.max(0, pl.t - W); const f1 = F(t1), f0 = F(t0); const avg = f1.map((v, j) => (v - f0[j]) / Math.max(1, t1 - t0));
        pl.tl.leds.forEach((l, j) => { if (seg.I[j] > 0.05 && !this.burnt[l.id]) { this.burnt[l.id] = true; this.renderComps(); this.status(`🔥 The ${VL.LED_TYPES[l.color].name.toLowerCase()} LED had ${fmtI(seg.I[j])} flowing through it. A real LED would burn out and the board's pin could be damaged. <b>Add a resistor!</b> (calculated estimate)`, 'err'); VL.Store.mistake('OVERCURRENT'); } });
        this.paintLive(dt, avg);
        // serial
        const ser = this.host.querySelector('.serial'); if (ser) { while (pl.serialIdx < pl.r.serial.length && pl.r.serial[pl.serialIdx].t <= pl.t) { const s = pl.r.serial[pl.serialIdx++]; ser.textContent += `[${(s.t / 1000).toFixed(3)}s] ${s.text}`; if (ser.textContent.length > 20000) ser.textContent = ser.textContent.slice(-15000); ser.scrollTop = ser.scrollHeight; } }
        const ck = this.host.querySelector('.clock'); if (ck) ck.textContent = `t = ${(pl.t / 1000).toFixed(2)} s (virtual)`;
        const tr = pl.r.trace; if (tr && tr.length && this.editor && tr[0][0] <= pl.t) { let lo = 0, hi = tr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tr[m][0] <= pl.t) lo = m; else hi = m - 1; } if (tr[lo][1] !== this._mk) { this._mk = tr[lo][1]; this.editor.setMark(this._mk); } }
        if (this.tab === 'timing') this.drawTiming();
      } else this.paintLive(dt);
    }
    appendSerialMark() { const ser = this.host.querySelector('.serial'); if (ser) ser.textContent += '— replay restarts —\n'; }
    paintLive(dt, avgOverride) {
      const ls = this.lastSolve; if (!ls) return;
      const res = ls.res;
      this.circ.comps.forEach((c, j) => {
        if (c.type !== 'led') return;
        const g = this.svg.querySelector(`[data-glow="${c.id}"]`), lens = this.svg.querySelector(`[data-lens="${c.id}"]`); if (!g) return;
        let I; if (avgOverride && this.play) { const k = this.play.tl.leds.findIndex(l => l.id === c.id); I = k >= 0 ? avgOverride[k] : 0; } else { const e = res.els.find(x => x.comp.id === c.id); I = e && ls.powered ? Math.max(0, e.I) : 0; }
        const b = this.burnt[c.id] ? 0 : C().brightness(I);
        g.setAttribute('opacity', (b * 0.95).toFixed(3)); lens.setAttribute('opacity', this.burnt[c.id] ? 1 : (0.5 + b * 0.5).toFixed(3));
      });
      // current flow dashes
      this._flowOff = (this._flowOff || 0) + (dt || 16);
      const flowRes = ls.powered && this._cache && this._cache.map[ls.key] && this._cache.map[ls.key].flow;
      this.svg.querySelectorAll('[data-flow]').forEach(p => {
        const i = +p.dataset.flow; let I = 0;
        if (this.flow && flowRes && !flowRes.short) { const e = flowRes.els.find(x => x.wire === i); if (e) I = e.I; }
        if (Math.abs(I) < 5e-5) { p.style.opacity = 0; return; }
        const speed = 0.02 + 0.06 * Math.min(1, Math.log10(Math.abs(I) / 5e-5) / 3);
        p.style.opacity = 0.9; p.style.strokeDashoffset = (-Math.sign(I) * this._flowOff * speed).toFixed(1);
      });
    }

    /* ---------------------------- instruments ---------------------------- */
    renderInstruments(light) {
      const pane = n => this.host.querySelector(`[data-pane="${n}"]`);
      if (!pane('checks')) return;
      if (!light || this.tab === 'checks') this.renderChecks(pane('checks'));
      if (this.tab === 'meter' || !light) this.renderMeter(pane('meter'));
      if (this.tab === 'values' || !light) this.renderValues(pane('values'));
    }
    renderChecks(el) {
      const issues = this.allIssues();
      const html = this.opts.checksHTML ? this.opts.checksHTML(this) : '';
      const lv = { error: '⛔', warn: '⚠️', info: 'ℹ️', todo: '◻️' };
      el.innerHTML = html + (issues.length ? `<div class="diag-list">${issues.map(i => `<div class="diag ${i.level}"><span>${lv[i.level] || '•'} ${esc(VL.DIAG_TEXT[i.code] || i.code)}${i.detail ? ` <em>${esc(i.detail)}</em>` : ''}</span><button class="btn-xs" data-hint="${i.code}">Hint</button></div>`).join('')}</div>` : (this.circ.comps.length ? '<div class="diag ok">✅ No problems detected in the circuit' + (this.editor ? ' and code' : '') + '.</div>' : ''));
      el.querySelectorAll('[data-hint]').forEach(b => b.onclick = () => VL.Sarra.hint(b.dataset.hint, this));
      if (this.opts.afterChecks) this.opts.afterChecks(el, this);
    }
    renderMeter(el) {
      if (!el) return; const pr = this.probe; const ls = this.lastSolve; let reading = '— — —', unit = '', note = '';
      const powered = ls && ls.powered;
      if (pr.mode === 'V') {
        if (pr.red && pr.black && ls) { const a = ls.res.netV(C().pointNet(pr.red)), b = ls.res.netV(C().pointNet(pr.black)); if (a === null || b === null) { reading = 'OPEN'; note = 'One probe touches a point that is not connected to anything.'; } else { reading = (powered ? a - b : 0).toFixed(2); if (powered) this.recordMeas('V', { a: pr.red, b: pr.black, v: a - b }); unit = 'V'; note = `Between ${esc(keyName(pr.red))} (red) and ${esc(keyName(pr.black))} (black).` + (powered ? '' : ' The circuit is not powered: press RUN or Test.'); } }
        else note = pr.red ? 'Now click where the <b>black (COM)</b> probe goes, e.g. a GND pin.' : 'Click any hole or pin for the <b>red (+)</b> probe.';
      } else if (pr.mode === 'A') {
        const c = this.circ.comps.find(x => x.id === pr.comp);
        if (c && ls) { const e = ls.res.els.find(x => x.comp.id === c.id); const I = e && powered ? e.I : 0; reading = (Math.abs(I) * 1000).toFixed(2); unit = 'mA'; if (powered && Math.abs(I) > 1e-5) this.recordMeas('A', { comp: c.id, I: Math.abs(I) }); if (powered && Math.abs(I) > 1e-5 && this.play && !this.measuredA) { this.measuredA = true; VL.Store.skill('measure', 30); VL.Store.save(); setTimeout(() => this.opts.onAnalyze && this.opts.onAnalyze(this), 0); } note = `Current through the ${c.type === 'led' ? VL.LED_TYPES[c.color].name + ' LED' : VL.fmtOhm(c.value) + ' resistor'} (ideal ammeter in series).`; }
        else note = 'Click a component to measure the current flowing through it.';
      } else {
        const c = this.circ.comps.find(x => x.id === pr.comp);
        if (c && c.type === 'resistor') { reading = c.value >= 1000 ? (c.value / 1000).toFixed(2) : c.value.toFixed(1); unit = c.value >= 1000 ? 'kΩ' : 'Ω'; this.recordMeas('R', c.id); note = 'Resistance is measured with the power OFF. Colour code: ' + VL.bandsFor(c.value).map(d => VL.BAND_N[d]).join(', ') + ', gold.'; }
        else if (c) { reading = 'OL'; note = 'An LED is not a resistor: a meter shows "OL" (over limit) in Ω mode. Use diode mode on a real meter.'; }
        else note = 'Click a resistor to measure its resistance.';
      }
      el.innerHTML = `<div class="meter"><div class="mm"><div class="mm-lcd"><span class="mm-r">${reading}</span><span class="mm-u">${unit}</span></div>
        <div class="mm-modes">${[['V', 'V⎓ Volts'], ['A', 'mA Current'], ['R', 'Ω Ohms']].map(([m, l]) => `<button data-mm="${m}" class="${pr.mode === m ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="mm-note">${note}<div class="muted small">Calculated with the educational DC model: ideal 3.3 V GPIO, LED diode model. A real ESP32 pin sags a little under load.</div></div></div>`;
      el.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => { pr.mode = b.dataset.mm; pr.red = pr.black = pr.comp = null; this.renderOverlay(); this.renderMeter(el); });
    }
    recordMeas(kind, v) {
      this.meas = this.meas || { V: [], A: {}, R: {} };
      if (kind === 'V') { const l = this.meas.V[this.meas.V.length - 1]; if (!l || l.a !== v.a || l.b !== v.b || Math.abs(l.v - v.v) > 1e-3) this.meas.V.push(v); }
      else if (kind === 'A') this.meas.A[v.comp] = v.I; else this.meas.R[v] = true;
      clearTimeout(this._mt); this._mt = setTimeout(() => this.opts.onAnalyze && this.opts.onAnalyze(this), 0);
    }
    renderValues(el) {
      if (!el) return; const ls = this.lastSolve; if (!ls) return; const powered = ls.powered;
      const rows = ls.res.els.map(e => {
        const c = e.comp; const name = c.type === 'led' ? `${VL.LED_TYPES[c.color].name} LED` : c.type === 'button' ? 'Button (pressed)' : `Resistor ${VL.fmtOhm(c.value)}`;
        const V = powered ? Math.abs(e.Vab) : 0, I = powered ? Math.abs(e.I) : 0, Pw = V * I;
        return `<tr><td>${name}</td><td>${V.toFixed(2)} V</td><td>${fmtI(I)}</td><td>${(Pw * 1000).toFixed(1)} mW</td></tr>`;
      }).join('');
      let formula = '';
      const led = ls.res.els.find(e => e.kind === 'D' && powered && e.I > 2e-5); const R = led && ls.res.els.find(e => e.kind === 'R' && Math.abs(Math.abs(e.I) - led.I) < 1e-6);
      if (led && R) { const src = Math.abs(R.Vab) + Math.abs(led.Vab); formula = `<div class="formula">Ohm's law check: I = (V<sub>source</sub> − V<sub>LED</sub>) / R = (${src.toFixed(2)} − ${led.Vab.toFixed(2)}) / ${R.R} = <b>${fmtI(Math.abs(R.Vab) / R.R)}</b></div>`; }
      const pins = Object.entries(ls.states).map(([g, v]) => `GPIO${g}=${v ? 'HIGH 3.3 V' : 'LOW 0 V'}`).join(' · ');
      el.innerHTML = `<div class="vals"><div class="muted small">${powered ? (pins ? 'Pin state: ' + pins : '3V3 rail powered') : 'Not powered: press RUN' + (this.editor ? '' : ' or Test') + ' to see values.'}</div>
        <table><thead><tr><th>Component</th><th>Voltage</th><th>Current</th><th>Power</th></tr></thead><tbody>${rows || '<tr><td colspan=4 class="muted">No components yet</td></tr>'}</tbody></table>${formula}
        <div class="model-note">📐 <b>Educational calculation</b>, not a measurement: Modified Nodal Analysis with ideal sources and a Shockley diode model for each LED (n = 2, R<sub>s</sub> = 10 Ω).</div></div>`;
    }
    drawTiming() {
      const cv = this.host.querySelector('canvas.timing'); if (!cv || !cv.offsetParent) return;
      const r = this.lastRun, pl = this.play; const W = cv.clientWidth, H = cv.clientHeight; const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
      const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      const note = this.host.querySelector('.tnote');
      if (!r || !pl) { x.fillStyle = '#7d8bb0'; x.font = '13px Nunito, sans-serif'; x.fillText('Press RUN to record a timing diagram of your pins and LED current.', 14, 26); if (note) note.textContent = ''; return; }
      const tl = pl.tl; const pins = [...new Set(r.events.map(e => e.pin))].sort((a, b) => a - b);
      const span = Math.min(tl.end, Math.max(2000, Math.min(tl.end, 4000))); const tStart = Math.max(0, Math.min(pl.t - span * 0.75, tl.end - span));
      const lanes = pins.length + tl.leds.length; const lh = Math.max(26, Math.min(44, (H - 30) / Math.max(1, lanes))); const X = t => 90 + (t - tStart) / span * (W - 110);
      x.font = '12px "JetBrains Mono", monospace'; x.strokeStyle = '#1e2a4a'; x.fillStyle = '#7d8bb0';
      for (let k = 0; k <= 4; k++) { const t = tStart + span * k / 4; x.beginPath(); x.moveTo(X(t), 6); x.lineTo(X(t), H - 18); x.stroke(); x.fillText((t / 1000).toFixed(2) + 's', X(t) - 14, H - 4); }
      let lane = 0;
      pins.forEach(g => {
        const y0 = 10 + lane * lh, hi = y0 + 4, lo = y0 + lh - 8; x.fillStyle = '#22d3ee'; x.fillText('GPIO' + g, 8, y0 + lh / 2 + 3);
        const evs = r.events.filter(e => e.pin === g); x.strokeStyle = '#22d3ee'; x.lineWidth = 2; x.beginPath(); let v = 0, started = false; let dense = 0;
        const yv = v => v ? hi : lo;
        evs.forEach(e => { if (e.t < tStart) { v = e.v; return; } if (e.t > tStart + span) return; if (!started) { x.moveTo(X(tStart), yv(v)); started = true; } x.lineTo(X(e.t), yv(v)); x.lineTo(X(e.t), yv(e.v)); v = e.v; dense++; });
        if (!started) x.moveTo(X(tStart), yv(v)); x.lineTo(X(Math.min(tl.end, tStart + span)), yv(v)); x.stroke(); x.lineWidth = 1;
        lane++;
      });
      tl.leds.forEach((l, j) => {
        const y0 = 10 + lane * lh; x.fillStyle = VL.LED_TYPES[l.color].color; x.fillText(VL.LED_TYPES[l.color].name.slice(0, 6) + ' mA', 8, y0 + lh / 2 + 3);
        const maxI = Math.max(0.001, ...tl.segs.map(s => s.I[j])); x.strokeStyle = VL.LED_TYPES[l.color].color; x.lineWidth = 2; x.beginPath();
        let started = false; tl.segs.forEach((s, i) => { const t1 = i + 1 < tl.segs.length ? tl.segs[i + 1].t : tl.end; if (t1 < tStart || s.t > tStart + span) return; const a = Math.max(s.t, tStart), b = Math.min(t1, tStart + span); const y = y0 + lh - 8 - (s.I[j] / maxI) * (lh - 14); if (!started) { x.moveTo(X(a), y); started = true; } else x.lineTo(X(a), y); x.lineTo(X(b), y); });
        x.stroke(); x.lineWidth = 1; x.fillStyle = '#7d8bb0'; x.fillText(fmtI(maxI), W - 70, y0 + 10); lane++;
      });
      x.strokeStyle = '#f59e0b'; x.beginPath(); x.moveTo(X(pl.t), 4); x.lineTo(X(pl.t), H - 18); x.stroke();
      if (note) { const st = (r.ledStats || [])[0]; note.innerHTML = st && isFinite(st.medianGap) ? `Measured from your program: the LED pin changes every <b>${st.medianGap >= 1 ? st.medianGap.toFixed(0) + ' ms' : (st.medianGap * 1000).toFixed(0) + ' µs'}</b>${st.medianGap < 15 ? ', too fast for your eyes (they average anything faster than ~20 ms)' : ''}.` : 'Program output recorded from real Python execution against the virtual ESP32 clock.'; }
    }

    /* --------------------------- code explanations --------------------------- */
    explainLine(n) {
      const box = this.host.querySelector('.explain'); if (!box) return; const line = (this.editor.value.split('\n')[n - 1] || '');
      if (!line.trim()) { box.hidden = true; return; }
      const ex = VL.explainLine(line, this.lang); box.hidden = !ex; if (ex) box.innerHTML = `<b>Line ${n}:</b> <code>${esc(line.trim())}</code><br>${ex}`;
    }
    explainAll() {
      const lines = this.editor.value.split('\n');
      const rows = lines.map((l, i) => l.trim() ? `<tr><td class="ln">${i + 1}</td><td><code>${VL.highlightPy(l, this.lang)}</code></td><td>${VL.explainLine(l, this.lang) || '<span class="muted">—</span>'}</td></tr>` : '').join('');
      VL.ui.modal({ title: '🔍 What each line does', wide: true, body: `<table class="explain-t">${rows}</table><p class="muted small">Want a deeper explanation? Ask Mrs Sarra in the assistant panel.</p>` });
    }
  }
  VL.explainLine = (line, lang) => { for (const [re, txt] of (lang === 'cpp' ? VL.EXPLAIN_RULES_CPP : VL.EXPLAIN_RULES)) { const m = line.match(re); if (m) return typeof txt === 'function' ? txt(m) : txt; } return ''; };
  VL.Workbench = Workbench;

  /* -------------------- challenge checker -------------------- */
  VL.checkChallenge = (id, wb) => {
    const r = wb.lastRun; if (!r || r.error) return { ok: false, msg: 'Run your program first (without errors).' };
    const P = r.pulses || []; const lit = P.filter(p => p.pulses.length);
    const durs = ps => ps.filter(p => !p[2]).map(p => p[1] - p[0]);
    const near = (v, t, tol = 0.15) => Math.abs(v - t) <= t * tol;
    if (id === 'slow') { const p = lit[0]; if (!p) return { ok: false, msg: 'No LED lit up.' }; const on = durs(p.pulses); const offs = p.pulses.slice(1).map((q, i) => q[0] - p.pulses[i][1]); if (on.length >= 2 && on.every(d => near(d, 1000)) && offs.length && offs.every(d => near(d, 1000))) return { ok: true, msg: 'Perfect slow blink: 1 s on, 1 s off.' }; return { ok: false, msg: `Measured ON times: ${on.slice(0, 4).map(d => (d / 1000).toFixed(2) + 's').join(', ') || 'none'}; OFF times: ${offs.slice(0, 4).map(d => (d / 1000).toFixed(2) + 's').join(', ') || 'none'}. Both should be 1.00 s.` }; }
    if (id === 'gpio4') { const info = (wb.diag.ledInfo || []).find(i => i.gpios.includes(4)); const p = info && P.find(q => q.led.id === info.led.id); if (info && p && p.pulses.length >= 2) return { ok: true, msg: 'LED on GPIO 4 is blinking.' }; return { ok: false, msg: info ? 'The LED is wired to GPIO 4 but does not blink yet. Check your code uses Pin(4, Pin.OUT).' : 'No LED is wired to GPIO 4 (IO4 is on the right header, pin 13).' }; }
    if (id === 'heartbeat') { const p = lit[0]; if (!p) return { ok: false, msg: 'No LED lit up.' }; const ps = p.pulses; let beats = 0; for (let i = 0; i + 2 < ps.length; i++) { const a = ps[i], b = ps[i + 1], c = ps[i + 2]; if (a[1] - a[0] <= 220 && b[1] - b[0] <= 220 && b[0] - a[1] <= 450 && c[0] - b[1] >= 780) { beats++; i++; } } return beats >= 2 ? { ok: true, msg: `Heartbeat detected (${beats} beats).` } : { ok: false, msg: 'Expected two quick flashes (≤ 0.2 s) close together, then a pause of at least 0.8 s, repeated.' }; }
    if (id === 'sos') { const p = lit[0]; if (!p) return { ok: false, msg: 'No LED lit up.' }; const d = durs(p.pulses); for (let i = 0; i + 9 <= d.length; i++) { const w = d.slice(i, i + 9); const sh = [...w.slice(0, 3), ...w.slice(6, 9)], lg = w.slice(3, 6); const ms = Math.max(...sh), ml = Math.min(...lg); const avgS = sh.reduce((a, b) => a + b, 0) / 6; if (ml >= 2.5 * avgS && ml > ms * 1.8) return { ok: true, msg: 'SOS received loud and clear! · · · — — — · · ·' }; } return { ok: false, msg: `Flash lengths found: ${d.slice(0, 9).map(x => (x / 1000).toFixed(2)).join(', ')} s. Need 3 short, 3 long (≥ 3× short), 3 short.` }; }
    if (id === 'two') { const ls = lit.filter(p => p.pulses.length >= 2); const infos = wb.diag.ledInfo || []; const g = new Set(ls.map(p => (infos.find(i => i.led.id === p.led.id) || { gpios: [] }).gpios[0])); if (ls.length < 2 || g.size < 2) return { ok: false, msg: 'Need two LEDs on two different GPIOs, each blinking.' }; const ov = overlap(ls[0].pulses, ls[1].pulses); return ov < 5 ? { ok: true, msg: 'Alternating police lights!' } : { ok: false, msg: `The LEDs are on at the same time for ${(ov / 1000).toFixed(2)} s. They must alternate.` }; }
    if (id === 'traffic') { const col = c => lit.find(p => p.led.color === c); const R = col('red'), Y = col('yellow'), G = col('green'); if (!R || !Y || !G) return { ok: false, msg: 'Need a red, a yellow and a green LED that each light up.' }; const all = [[R, 'R'], [Y, 'Y'], [G, 'G']]; let ov = 0; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) ov += overlap(all[i][0].pulses, all[j][0].pulses); if (ov > 5) return { ok: false, msg: 'Two lights are on at the same time. Only one at a time!' }; const seq = all.flatMap(([p, n]) => p.pulses.map(q => [q[0], n])).sort((a, b) => a[0] - b[0]).map(x => x[1]).join(''); return /GYR/.test(seq) ? { ok: true, msg: 'Traffic light sequence G → Y → R works!' } : { ok: false, msg: `Order seen: ${seq.split('').join(' → ')}. Expected green → yellow → red.` }; }
    return { ok: false, msg: 'Unknown challenge.' };
  };
  function overlap(a, b) { let s = 0; a.forEach(x => b.forEach(y => { s += Math.max(0, Math.min(x[1], y[1]) - Math.max(x[0], y[0])); })); return s; }
})();
