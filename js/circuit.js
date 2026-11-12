/* =========================================================================
   circuit.js : breadboard model, netlist, DC solver, diagnostics
   -------------------------------------------------------------------------
   ELECTRICAL MODEL (educational, clearly labelled in the UI):
   • ESP32 output pins, 3V3 and 5V are ideal voltage sources.
   • Resistors are ideal.
   • LEDs = Shockley diode (n = 2) + 10 Ω series resistance, with the
     saturation current chosen so the LED drops its typical Vf at 10 mA.
   • The circuit is solved with Modified Nodal Analysis + Newton–Raphson.
   This is a real DC calculation, not a SPICE simulation of the ESP32
   silicon (the real pin driver has its own resistance and current limits).
   ========================================================================= */
(function () {
  const Vt = 0.025852, N_LED = 2.0, RS_LED = 10, GMIN = 1e-12;
  const C = {};
  C.COLS = 30;
  C.ROWNAMES = { 0: '+', 1: '−', 3: 'a', 4: 'b', 5: 'c', 6: 'd', 7: 'e', 9: 'f', 10: 'g', 11: 'h', 12: 'i', 13: 'j', 15: '+', 16: '−' };
  C.isHole = (x, y) => x >= 1 && x <= C.COLS && C.ROWNAMES[y] !== undefined;
  C.holeNet = (x, y) => {
    if (y >= 3 && y <= 7) return 'S' + x + 'T';
    if (y >= 9 && y <= 13) return 'S' + x + 'B';
    if (y === 0) return 'RT+'; if (y === 1) return 'RT-';
    if (y === 15) return 'RB+'; if (y === 16) return 'RB-';
    return null;
  };
  C.holeName = (x, y) => {
    const r = C.ROWNAMES[y];
    if (y === 0 || y === 1) return `top ${r} rail`;
    if (y === 15 || y === 16) return `bottom ${r} rail`;
    return `${r}${x}`;
  };
  C.SPAN = { led: 1, resistor: 4, button: 2 };
  C.compLegs = c => {
    const s = C.SPAN[c.type] || 1;
    const dx = c.rot ? 0 : s, dy = c.rot ? s : 0;
    return [{ x: c.x, y: c.y }, { x: c.x + dx, y: c.y + dy }];
  };
  C.ledPins = c => { const L = C.compLegs(c); return c.flip ? { anode: L[1], cathode: L[0] } : { anode: L[0], cathode: L[1] }; };
  C.hkey = (p) => 'H:' + p.x + ':' + p.y;
  C.parseKey = k => { const s = k.split(':'); return s[0] === 'H' ? { kind: 'H', x: +s[1], y: +s[2] } : { kind: 'P', pin: s[1] }; };

  /* which point keys are occupied (one item per hole / per header pin) */
  C.occupied = (circ, ignoreComp, ignoreWire) => {
    const occ = {};
    circ.comps.forEach(c => { if (c.id === ignoreComp) return; C.compLegs(c).forEach(l => occ[C.hkey(l)] = c.id); });
    circ.wires.forEach((w, i) => { if (i === ignoreWire) return; occ[w.a] = occ[w.a] || 'w' + i; occ[w.b] = occ[w.b] || 'w' + i; });
    return occ;
  };
  C.canPlace = (circ, c, ignoreId) => {
    const legs = C.compLegs(c);
    if (!legs.every(l => C.isHole(l.x, l.y))) return false;
    const occ = C.occupied(circ, ignoreId);
    return legs.every(l => !occ[C.hkey(l)]);
  };

  /* ---------- netlist ---------- */
  function UF() { const p = {}; const f = k => { if (p[k] === undefined) p[k] = k; while (p[k] !== k) { p[k] = p[p[k]]; k = p[k]; } return k; }; return { f, u: (a, b) => { a = f(a); b = f(b); if (a !== b) p[a] = b; }, keys: () => Object.keys(p) }; }

  C.pinNetKey = pinId => {
    const p = VL.pinById[pinId];
    if (!p) return null;
    if (p.net) return p.net;
    if (p.type === 'ground') return 'GND';
    if (p.label === '3V3') return '3V3';
    if (p.label === '5V') return '5V';
    if (p.label === 'EN') return 'EN';
    return 'G' + p.gpio;
  };
  C.pointNet = k => { const p = C.parseKey(k); return p.kind === 'H' ? C.holeNet(p.x, p.y) : C.pinNetKey(p.pin); };

  C.buildNets = (circ, noWires) => {
    const uf = UF();
    const touch = k => uf.f(C.pointNet(k));
    circ.wires.forEach(w => { touch(w.a); touch(w.b); if (!noWires) uf.u(C.pointNet(w.a), C.pointNet(w.b)); });
    circ.comps.forEach(c => C.compLegs(c).forEach(l => touch(C.hkey(l))));
    ['GND', '3V3', '5V'].forEach(k => uf.f(k));
    const netOf = k => uf.f(C.pointNet(k));
    // members of each net
    const members = {};
    uf.keys().forEach(k => { const r = uf.f(k); (members[r] = members[r] || []).push(k); });
    return { netOf, members, root: k => uf.f(k) };
  };

  /* ---------- elements ---------- */
  C.elements = (circ, nets, wireR, pressed) => {
    const els = [];
    circ.comps.forEach(c => { if (c.type === 'button' && pressed && pressed.has(c.id)) { const L = C.compLegs(c); els.push({ comp: c, kind: 'R', sw: true, a: nets.netOf(C.hkey(L[0])), b: nets.netOf(C.hkey(L[1])), R: 1e-3 }); } });
    if (wireR) circ.wires.forEach((w, i) => els.push({ comp: { id: 'w' + i, type: 'wire' }, wire: i, kind: 'R', a: nets.netOf(w.a), b: nets.netOf(w.b), R: 1e-3 }));
    circ.comps.forEach(c => {
      if (c.type === 'resistor') {
        const L = C.compLegs(c);
        els.push({ comp: c, kind: 'R', a: nets.netOf(C.hkey(L[0])), b: nets.netOf(C.hkey(L[1])), R: c.value });
      } else if (c.type === 'led') {
        const P = C.ledPins(c), t = VL.LED_TYPES[c.color] || VL.LED_TYPES.red;
        const Is = 0.01 / (Math.exp((t.vf - 0.01 * RS_LED) / (N_LED * Vt)) - 1);
        els.push({ comp: c, kind: 'D', a: nets.netOf(C.hkey(P.anode)), b: nets.netOf(C.hkey(P.cathode)), Is, vf: t.vf });
      }
    });
    return els;
  };

  /* sources for a given pin-state map {gpio: 0|1} (only pins configured as outputs) */
  C.sources = (nets, pinStates) => {
    const src = {}; const conflicts = [];
    const add = (key, v, label) => {
      const r = nets.root(key);
      if (src[r] && Math.abs(src[r].v - v) > 1e-9) conflicts.push({ net: r, a: src[r].label, b: label });
      if (!src[r]) src[r] = { v, label }; else src[r].label += ' + ' + label;
    };
    add('GND', 0, 'GND'); add('3V3', 3.3, '3V3'); add('5V', 5.0, '5V');
    Object.entries(pinStates || {}).forEach(([g, val]) => {
      const key = 'G' + g;
      add(key, val ? (VL.BOARD ? VL.BOARD.vHigh : 3.3) : 0, 'GPIO' + g);
    });
    return { src, conflicts };
  };

  /* ---------- Modified Nodal Analysis + Newton ---------- */
  C.solve = (circ, pinStates, opts = {}) => {
    const nets = C.buildNets(circ, opts.wireR);
    const els = C.elements(circ, nets, opts.wireR, opts.pressed);
    if (opts.flipLed) els.forEach(e => { if (e.kind === 'D' && e.comp.id === opts.flipLed) { const t = e.a; e.a = e.b; e.b = t; } });
    const { src, conflicts } = C.sources(nets, pinStates);
    const res = { nets, els, src, conflicts, V: {}, ok: true };
    if (conflicts.length) { res.ok = false; res.short = true; }
    // nodes: every net root used by elements + internal LED nodes
    const nodeSet = new Set();
    els.forEach(e => { nodeSet.add(e.a); nodeSet.add(e.b); });
    Object.keys(src).forEach(k => nodeSet.add(k));
    els.forEach((e, i) => { if (e.kind === 'D') { e.mid = '__d' + i; nodeSet.add(e.mid); } });
    const unknown = [...nodeSet].filter(n => !src[n]);
    const idx = Object.fromEntries(unknown.map((n, i) => [n, i]));
    const V = {}; nodeSet.forEach(n => V[n] = src[n] ? src[n].v : 0);
    const n = unknown.length;
    const stampG = (A, b, p, q, g) => {
      const ip = idx[p], iq = idx[q];
      if (ip !== undefined) { A[ip][ip] += g; if (iq !== undefined) A[ip][iq] -= g; else b[ip] += g * V[q]; }
      if (iq !== undefined) { A[iq][iq] += g; if (ip !== undefined) A[iq][ip] -= g; else b[iq] += g * V[p]; }
    };
    const stampI = (b, p, q, I) => { // current I flowing from p to q through element (leaves p)
      if (idx[p] !== undefined) b[idx[p]] -= I;
      if (idx[q] !== undefined) b[idx[q]] += I;
    };
    const diodeIV = (e, vd) => {
      const nv = N_LED * Vt, x = vd / nv, XMAX = 60;
      if (x > XMAX) { const ex = Math.exp(XMAX); const I = e.Is * (ex * (1 + x - XMAX) - 1); return { I, G: e.Is * ex / nv }; }
      const ex = Math.exp(x); return { I: e.Is * (ex - 1), G: e.Is * ex / nv + GMIN };
    };
    let iter = 0, conv = n === 0;
    if (!res.short) {
      for (iter = 0; iter < 300 && !conv; iter++) {
        const A = Array.from({ length: n }, () => new Float64Array(n)); const b = new Float64Array(n);
        for (let i = 0; i < n; i++) A[i][i] += GMIN;
        els.forEach(e => {
          if (e.kind === 'R') stampG(A, b, e.a, e.b, 1 / e.R);
          else {
            stampG(A, b, e.a, e.mid, 1 / RS_LED);
            const vd = V[e.mid] - V[e.b]; const { I, G } = diodeIV(e, vd);
            stampG(A, b, e.mid, e.b, G);
            stampI(b, e.mid, e.b, I - G * vd);
          }
        });
        const x = gauss(A, b);
        if (!x) break;
        let maxd = 0;
        unknown.forEach((nd, i) => { let d = x[i] - V[nd]; if (d > 0.25) d = 0.25; if (d < -0.25) d = -0.25; maxd = Math.max(maxd, Math.abs(d)); V[nd] += d; });
        if (maxd < 1e-10) conv = true;
      }
    }
    res.converged = conv; res.iter = iter; res.V = V;
    // element results
    els.forEach(e => {
      if (res.short) { e.I = 0; e.Vab = 0; e.P = 0; return; }
      if (e.kind === 'R') { e.Vab = V[e.a] - V[e.b]; e.I = e.Vab / e.R; }
      else { e.Vab = V[e.a] - V[e.b]; e.I = (V[e.a] - V[e.mid]) / RS_LED; }
      e.P = e.Vab * e.I;
    });
    // current delivered by each source net
    res.srcCurrent = {};
    Object.keys(src).forEach(s => {
      let I = 0; els.forEach(e => { if (e.a === s) I += e.I; if (e.b === s) I -= e.I; });
      res.srcCurrent[s] = I;
    });
    res.netV = k => { const r = nets.root(k); return (r in V) ? V[r] : null; };
    return res;
  };

  function gauss(A, b) {
    const n = b.length; const M = A.map((r, i) => { const a = Array.from(r); a.push(b[i]); return a; });
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-30) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
    return x;
  }

  /* ---------- wired GPIOs (pins with a wire) ---------- */
  C.wiredPins = circ => {
    const out = [];
    circ.wires.forEach(w => [w.a, w.b].forEach(k => { if (k.startsWith('P:')) out.push(VL.pinById[k.slice(2)]); }));
    return out.filter(Boolean);
  };

  /* graph reachability over elements (treating R and LEDs as conductive) */
  function reach(els, start) {
    const seen = new Set([start]); const q = [start];
    while (q.length) { const n = q.shift(); els.forEach(e => { const o = e.a === n ? e.b : e.b === n ? e.a : null; if (o && !seen.has(o)) { seen.add(o); q.push(o); } }); }
    return seen;
  }

  /* logic level seen by each wired GPIO (inputs) for a given set of pressed buttons.
     null = floating (no DC path to a power rail or GND) -> the program's pull resistor decides */
  C.inputLevels = (circ, pressed) => {
    const res = C.solve(circ, {}, { pressed }); const nets = res.nets; const out = {};
    const vh = VL.BOARD ? VL.BOARD.vHigh : 3.3;
    const conductive = res.els.filter(e => e.kind === 'R');
    const srcRoots = new Set(Object.keys(res.src));
    C.wiredPins(circ).forEach(p => {
      if (p.gpio === null || p.gpio === undefined) return;
      const r = nets.root('G' + p.gpio);
      let connected = srcRoots.has(r);
      if (!connected) { const seen = reach(conductive, r); connected = [...seen].some(n => srcRoots.has(n)); }
      if (!connected) { out[p.gpio] = null; return; }
      const v = res.netV('G' + p.gpio); out[p.gpio] = v === null ? null : (v > vh / 2 ? 1 : 0);
    });
    return out;
  };
  /* LED brightness 0..1 from current (A) */
  C.brightness = I => { if (I <= 2e-5) return 0; return Math.max(0, Math.min(1, Math.log10(I / 2e-5) / Math.log10(0.015 / 2e-5))); };

  /* ---------- Static diagnostics for the circuit ----------
     Returns issues: [{code, level:'error'|'warn'|'info', comp?, detail}] and a summary
     of which GPIO drives which LED. */
  C.diagnose = (circ, codePins) => {
    const allBtn = new Set(circ.comps.filter(c => c.type === 'button').map(c => c.id));
    const SV = (st, o) => C.solve(circ, st, Object.assign({ pressed: allBtn }, o || {}));
    const issues = []; const add = (code, level, extra = {}) => { if (!issues.find(i => i.code === code)) issues.push({ code, level, ...extra }); };
    const leds = circ.comps.filter(c => c.type === 'led');
    const res0 = SV({});
    const nets = res0.nets;
    const wired = C.wiredPins(circ);
    wired.forEach(p => {
      if (p.type === 'flash') add('FLASH_PIN', 'error', { pin: p });
      if (p.type === 'power5') add('FIVE_V', 'error', { pin: p });
    });
    if (res0.short) add('SHORT', 'error', { detail: res0.conflicts.map(c => c.a + ' ↔ ' + c.b).join(', ') });
    if (!leds.length) { add('NO_LED', 'todo'); return { issues, ledInfo: [], res0 }; }

    // which GPIO nets are connected to something (candidates to drive)
    const gpioNets = {};
    wired.forEach(p => { if (p.gpio !== null && p.type !== 'flash') gpioNets[p.gpio] = nets.root('G' + p.gpio); });
    const allHigh = {}; Object.keys(gpioNets).forEach(g => { const r = gpioNets[g]; if (r !== nets.root('GND') && r !== nets.root('3V3') && r !== nets.root('5V')) allHigh[g] = 1; });
    const resH = SV(allHigh);
    const ledInfo = [];
    leds.forEach(led => {
      const e0 = res0.els.find(e => e.comp.id === led.id), eH = resH.els.find(e => e.comp.id === led.id);
      const info = { led, gpios: [], on3v3: false, I: eH ? eH.I : 0 };
      if (e0.a === e0.b) { add('LED_SHORTED', 'error', { comp: led }); ledInfo.push(info); return; }
      if (!res0.short && e0.I > 2e-5) { info.on3v3 = true; add(nets.root('5V') && reach(res0.els, e0.a).has(nets.root('5V')) ? 'FIVE_V' : 'POWER_PIN', 'warn', { comp: led }); }
      // which GPIO lights it? test each wired gpio individually
      Object.keys(allHigh).forEach(g => {
        const r = SV({ [g]: 1 }); const e = r.els.find(x => x.comp.id === led.id);
        if (!r.short && e.I > 2e-5 + (info.on3v3 ? e0.I : 0)) info.gpios.push(+g);
      });
      if (!info.gpios.length && !info.on3v3 && !resH.short) {
        // reversed?
        const rf = SV(allHigh, { flipLed: led.id }); const ef = rf.els.find(x => x.comp.id === led.id);
        let rev = !rf.short && ef.I > 2e-5;
        if (!rev) { const rf3 = SV({}, { flipLed: led.id }); const ef3 = rf3.els.find(x => x.comp.id === led.id); rev = !rf3.short && ef3.I > 2e-5; }
        if (rev) add('LED_REVERSED', 'error', { comp: led });
        else {
          const R = reach(res0.els, e0.a); const R2 = reach(res0.els, e0.b); const all = new Set([...R, ...R2]);
          const gnd = nets.root('GND');
          const hasSrc = [...all].some(n => Object.values(gpioNets).includes(n) || n === nets.root('3V3'));
          const hasGnd = all.has(gnd);
          if (!hasSrc) add('NO_GPIO', 'todo', { comp: led });
          else if (!hasGnd) add('NO_GND', 'todo', { comp: led });
          else add('OPEN_CIRCUIT', 'error', { comp: led });
        }
      }
      // current level checks (with the gpio that drives it)
      const Ion = info.gpios.length ? (SV(Object.fromEntries(info.gpios.map(g => [g, 1]))).els.find(x => x.comp.id === led.id).I) : (info.on3v3 ? e0.I : 0);
      info.Ion = Ion;
      if (Ion > 0.03) {
        // is there any resistor in its path?
        const hasR = res0.els.some(e => e.kind === 'R' && !e.sw && (e.a === e0.a || e.b === e0.a || e.a === e0.b || e.b === e0.b) && e.a !== e.b);
        add(hasR ? 'OVERCURRENT' : 'NO_RES', 'error', { comp: led });
      } else if (Ion > 0 && Ion < 0.0008) add('DIM', 'info', { comp: led });
      info.gpios.forEach(g => { const p = VL.PINS.find(pp => pp.gpio === g); if (p && p.type === 'input') add('INPUT_ONLY', 'error', { pin: p }); if (g === 12) add('STRAP12', 'warn', { pin: p }); });
      ledInfo.push(info);
    });
    circ.comps.filter(c => c.type === 'resistor').forEach(r => { const e = res0.els.find(x => x.comp.id === r.id); if (e.a === e.b && wired.length) add('RES_SHORTED', 'warn', { comp: r }); });
    if (codePins && codePins.length) {
      const ledGpios = new Set(ledInfo.flatMap(i => i.gpios));
      if (ledGpios.size && !codePins.some(g => ledGpios.has(g))) add('PIN_MISMATCH', 'error', { detail: `code: GPIO ${codePins.join(', ')} · wired: GPIO ${[...ledGpios].join(', ')}` });
    }
    return { issues, ledInfo, res0, resH };
  };

  /* series loop: source V, resistor R, optional LED (for the Ohm's law playground) */
  C.seriesLED = (V, R, color) => {
    const t = VL.LED_TYPES[color] || VL.LED_TYPES.red; const Is = 0.01 / (Math.exp((t.vf - 0.01 * RS_LED) / (N_LED * Vt)) - 1);
    const vd = I => N_LED * Vt * Math.log(I / Is + 1);
    let lo = 0, hi = V / (R + RS_LED) + 1e-9; if (V <= 0) return { I: 0, Vled: 0 };
    for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (m * (R + RS_LED) + vd(m) > V) hi = m; else lo = m; }
    const I = (lo + hi) / 2; return { I, Vled: vd(I) + I * RS_LED };
  };
  VL.Circuit = C;
})();
