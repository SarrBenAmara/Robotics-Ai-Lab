/* =========================================================================
   lab3d.js : the 3D Engineering Lab. A different bench for each board
   (Arduino UNO / ESP32 / Raspberry Pi): realistic board, full breadboard,
   real parts and sensors placed leg by leg in ANY hole, jumper wires in
   any order, a nodal circuit solver (honest voltages and currents), code
   that runs on the board, and Mrs Sarra's hints about the real circuit.
   ========================================================================= */
(function () {
  const T = () => window.THREE;
  const esc = s => VL.esc(s);
  const P = 2.54, COLS = 60, MIDC = (COLS + 1) / 2, BBX = 86, BBZ = 0, BBTOP = 8;
  /* a full-size breadboard (60 columns) for the lab */
  const isHole = (x, y) => x >= 1 && x <= COLS && VL.Circuit.ROWNAMES[y] !== undefined;
  const C = VL.Circuit;
  const LEDT = VL.LED_TYPES;
  const BOARD = {
    uno: { name: 'Arduino UNO R3', lang: 'cpp', vHigh: 5, file: 'sketch.ino', runtime: 'uno' },
    esp32: { name: 'ESP32 DevKitC', lang: 'micropython', vHigh: 3.3, file: 'main.py', runtime: 'esp32' },
    rpi: { name: 'Raspberry Pi 5', lang: 'gpiozero', vHigh: 3.3, file: 'main.py', runtime: 'rpi' }
  };
  const STARTER = {
    uno: '// Blink an LED on pin 8\nconst int LED = 8;\n\nvoid setup() {\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED, HIGH);\n  delay(500);\n  digitalWrite(LED, LOW);\n  delay(500);\n}\n',
    esp32: '# Blink an LED on GPIO 4\nfrom machine import Pin\nfrom time import sleep\n\nled = Pin(4, Pin.OUT)\n\nwhile True:\n    led.on()\n    sleep(0.5)\n    led.off()\n    sleep(0.5)\n',
    rpi: '# Blink an LED on GPIO17 (physical pin 11)\nfrom gpiozero import LED\nfrom time import sleep\n\nled = LED(17)\n\nwhile True:\n    led.on()\n    sleep(0.5)\n    led.off()\n    sleep(0.5)\n'
  };
  /* ---------------- part catalogue ---------------- */
  const PARTS = {
    led: { name: 'LED', legs: 2, legNames: ['anode (+, long leg)', 'cathode (−, short leg)'], props: { color: 'red' } },
    resistor: { name: 'Resistor', legs: 2, legNames: ['leg 1', 'leg 2'], props: { r: 220 } },
    button: { name: 'Push button', legs: 2, legNames: ['leg 1', 'leg 2'], props: { sched: '1-2.5', held: false } },
    buzzer: { name: 'Buzzer', legs: 2, legNames: ['+ (long leg)', '−'], props: {} },
    ldr: { name: 'Light sensor (LDR)', legs: 2, legNames: ['leg 1', 'leg 2'], props: { light: 0.7 } },
    rgb: { name: 'RGB LED', legs: 4, row: true, legNames: ['R', 'GND (common, longest)', 'G', 'B'], props: {} },
    pot: { name: 'Potentiometer 10 kΩ', legs: 3, row: true, legNames: ['end 1', 'wiper', 'end 2'], props: { pos: 0.5 } },
    tmp36: { name: 'TMP36 temperature', legs: 3, row: true, legNames: ['+Vs', 'Vout', 'GND'], props: { temp: 24 } },
    pir: { name: 'PIR motion sensor', legs: 3, row: true, legNames: ['VCC', 'OUT', 'GND'], props: { sched: '2-4' } },
    hcsr04: { name: 'Ultrasonic HC-SR04', legs: 4, row: true, legNames: ['VCC', 'TRIG', 'ECHO', 'GND'], props: { cm: 25 } },
    servo: { name: 'Servo SG90', legs: 3, offboard: true, legNames: ['GND (brown)', '5V (red)', 'signal (orange)'], props: {} }
  };
  VL.LAB_PARTS = PARTS;
  const SIGC = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#e5e7eb', '#ec4899', '#06b6d4', '#f97316'];
  const parseSched = txt => String(txt || '').split(/[,;]/).map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^([\d.]+)\s*(?:-|to|–)\s*([\d.]+)$/); return m ? [parseFloat(m[1]) * 1000, parseFloat(m[2]) * 1000] : null; }).filter(x => x && x[1] > x[0]);
  const ledVth = c => (LEDT[c] || LEDT.red).vf - 0.2;

  /* ---------------- board pin rails ---------------- */
  function pinRail(pin) {
    if (!pin) return null;
    if (pin.type === 'ground' || /^GND|AGND/.test(pin.label)) return 'GND';
    if (pin.type === 'power3' || /^(3V3|3\.3V)/.test(pin.label)) return '3V3';
    if (pin.type === 'power5' || pin.type === 'vin' || /^(5V|VIN|IOREF|VBUS|VSYS)$/.test(pin.label)) return '5V';
    if (pin.type === 'power') return /5/.test(pin.label) ? '5V' : '3V3';
    if (pin.gpio !== null && pin.gpio !== undefined) return 'G' + pin.gpio;
    return 'X' + pin.label;
  }

  /* ======================= circuit model & solver ======================= */
  class Bench {
    constructor(board) { this.board = board; this.parts = []; this.wires = []; this.nid = 1; this.pins = {}; }
    occupied(key, ignore) { return this.parts.some(p => p !== ignore && p.legs.includes(key)) || this.wires.some(w => w !== ignore && (w.a === key || w.b === key)); }
    netOf(key, uf) { return uf.f(this.baseNet(key)); }
    baseNet(key) {
      if (key.startsWith('H:')) { const [, x, y] = key.split(':'); return 'h' + C.holeNet(+x, +y); }
      if (key.startsWith('P:')) { const pin = this.pins[key.slice(2)]; return pinRail(pin) || key; }
      return key; // servo sockets 'S:id:k'
    }
    nets() {
      const p = {}; const f = k => { if (p[k] === undefined) p[k] = k; while (p[k] !== k) { p[k] = p[p[k]]; k = p[k]; } return k; };
      const uf = { f, u: (a, b) => { const A = f(a), B = f(b); if (A !== B) p[A] = B; } };
      this.wires.forEach(w => uf.u(this.baseNet(w.a), this.baseNet(w.b)));
      // the GND rail name must win so it stays the reference
      return { f: k => f(k), net: key => f(this.baseNet(key)), uf };
    }
    /* solve the DC circuit. outs: {gpio: level 0..1}; st: sensor/button states */
    solve(outs, st = {}) {
      const N = this.nets(); const vH = BOARD[this.board].vHigh;
      const idx = {}; let n = 0; const gnd = N.f('GND');
      const node = net => { if (net === gnd) return -1; if (idx[net] === undefined) idx[net] = n++; return idx[net]; };
      const els = []; // {a,b,g} conductances, {a,v,g} sources, {a,c,vth,rd,id} diodes
      const R = (a, b, ohm, tag) => els.push({ k: 'r', a: node(a), b: node(b), g: 1 / Math.max(1e-3, ohm), tag, na: a, nb: b });
      const V = (a, v, rint, tag) => els.push({ k: 'v', a: node(a), v, g: 1 / rint, tag, na: a });
      const D = (a, c, vth, rd, tag) => els.push({ k: 'd', a: node(a), c: node(c), vth, gd: 1 / rd, tag, na: a, nc: c, on: false });
      const leg = (p, i) => N.net(p.legs[i]);
      // supplies
      V(N.f('5V'), 5, 0.3, 'sup5'); V(N.f('3V3'), 3.3, 0.5, 'sup3');
      Object.entries(outs || {}).forEach(([g, lv]) => V(N.f('G' + g), vH * lv, 30, 'gpio' + g));
      (st.pulls || []).forEach(([net, v]) => V(net, v, 1e6, 'probe'));
      this.parts.forEach(p => {
        if (p.legs.some(l => !l)) return;
        const s = st[p.id] || {};
        if (p.type === 'resistor') R(leg(p, 0), leg(p, 1), p.props.r, p.id);
        else if (p.type === 'led') { if (!p.burnt) D(leg(p, 0), leg(p, 1), ledVth(p.props.color), 22, p.id); }
        else if (p.type === 'button') { if (s.pressed) R(leg(p, 0), leg(p, 1), 0.05, p.id); }
        else if (p.type === 'buzzer') R(leg(p, 0), leg(p, 1), 150, p.id);
        else if (p.type === 'ldr') R(leg(p, 0), leg(p, 1), Math.pow(10, 6 - 3.3 * (p.props.light ?? 0.5)), p.id);
        else if (p.type === 'pot') { const q = p.props.pos ?? 0.5; R(leg(p, 0), leg(p, 1), Math.max(1, 10000 * q), p.id + 'a'); R(leg(p, 1), leg(p, 2), Math.max(1, 10000 * (1 - q)), p.id + 'b'); }
        else if (p.type === 'rgb') { ['r', 'g', 'b'].forEach((c, j) => { const li = [0, 2, 3][j]; D(leg(p, li), leg(p, 1), c === 'r' ? 1.8 : 2.8, 30, p.id + c); }); }
        else if (p.type === 'tmp36' || p.type === 'pir' || p.type === 'hcsr04' || p.type === 'servo') {
          const vi = p.type === 'servo' ? [1, 0] : p.type === 'hcsr04' ? [0, 3] : [0, 2];
          R(leg(p, vi[0]), leg(p, vi[1]), p.type === 'servo' ? 1000 : 20000, p.id + 'load');
          if (s.vout !== undefined) { const on = p.type === 'tmp36' ? 1 : p.type === 'pir' ? 1 : 2; V(leg(p, on), s.vout, 100, p.id + 'out'); }
        }
      });
      const run = () => {
        for (let it = 0; it < 30; it++) {
          const G = Array.from({ length: n }, () => new Float64Array(n)); const I = new Float64Array(n);
          for (let i = 0; i < n; i++) G[i][i] += 1e-9;
          const st2 = (a, b, g) => { if (a >= 0) G[a][a] += g; if (b >= 0) G[b][b] += g; if (a >= 0 && b >= 0) { G[a][b] -= g; G[b][a] -= g; } };
          els.forEach(e => {
            if (e.k === 'r') st2(e.a, e.b, e.g);
            else if (e.k === 'v') { if (e.a >= 0) { G[e.a][e.a] += e.g; I[e.a] += e.v * e.g; } }
            else if (e.k === 'd') { if (e.on) { st2(e.a, e.c, e.gd); if (e.a >= 0) I[e.a] += e.gd * e.vth; if (e.c >= 0) I[e.c] -= e.gd * e.vth; } else st2(e.a, e.c, 1e-9); }
          });
          const x = gauss(G, I); const vv = i => i < 0 ? 0 : x[i];
          let changed = false;
          els.forEach(e => { if (e.k === 'd') { const on = vv(e.a) - vv(e.c) > e.vth; if (on !== e.on) { e.on = on; changed = true; } } });
          if (!changed || it === 29) return vv;
        }
      };
      const vv = run();
      const volt = net => { const i = net === gnd ? -1 : idx[net]; return i === undefined ? null : vv(i); };
      const cur = {};
      els.forEach(e => {
        if (e.k === 'd') { const vd = vv(e.a) - vv(e.c); const i = e.on ? (vd - e.vth) * e.gd : 0; cur[e.tag] = Math.max(0, i); }
        else if (e.k === 'r') cur[e.tag] = (vv(e.a) - vv(e.b)) * e.g;
        else if (e.k === 'v') cur[e.tag] = (e.v - vv(e.a)) * e.g;
      });
      return { volt, cur, N, gnd };
    }
    /* full solve with sensor modules (two passes: power check, then outputs) */
    solveAll(outs, st = {}) {
      let s1 = this.solve(outs, st);
      const st2 = Object.assign({}, st); let need = false;
      this.parts.forEach(p => {
        const vd = (i, j) => { const a = s1.volt(s1.N.net(p.legs[i])), b = s1.volt(s1.N.net(p.legs[j])); return a === null || b === null ? 0 : a - b; };
        if (p.type === 'tmp36') { const vs = vd(0, 2); if (vs > 2.6) { st2[p.id] = Object.assign({}, st2[p.id], { vout: (s1.volt(s1.N.net(p.legs[2])) || 0) + 0.5 + 0.01 * (p.props.temp ?? 24) }); need = true; } }
        if (p.type === 'pir') { const vs = vd(0, 2); const mo = st[p.id] && st[p.id].motion; if (vs > 3) { st2[p.id] = Object.assign({}, st2[p.id], { vout: mo ? 3.3 : 0 }); need = true; } }
      });
      if (need) s1 = this.solve(outs, st2);
      s1.st = st2; return s1;
    }
    powered(p, sol) {
      const vi = p.type === 'servo' ? [1, 0] : p.type === 'hcsr04' ? [0, 3] : [0, 2];
      const a = sol.volt(sol.N.net(p.legs[vi[0]])), b = sol.volt(sol.N.net(p.legs[vi[1]]));
      return a === null || b === null ? 0 : a - b;
    }
    toJSON() { return { parts: this.parts.map(p => ({ id: p.id, type: p.type, legs: p.legs, props: p.props })), wires: this.wires.map(w => ({ a: w.a, b: w.b, color: w.color })) }; }
  }
  function gauss(A, b) {
    const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]]; const d = M[c][c] || 1e-18;
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / d; if (!f) continue; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / (M[r][r] || 1e-18); }
    return x;
  }
  VL.Bench = Bench;

  /* ======================= the 3D scene ======================= */
  class Lab3DView extends VL.Kit3D {
    constructor(host, lab) { super(host, {}); this.lab = lab; this.labelsOn = false; this.partMeshes = {}; this.wireMeshes = []; this.setupLook(); }
    setupLook() {
      const THREE = T(); const r = this.renderer;
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.92;
      // studio environment for real reflections (metal, plastic)
      const pm = new THREE.PMREMGenerator(r); const es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(200, 16, 8), new THREE.MeshBasicMaterial({ color: 0x9aa7c7, side: THREE.BackSide })));
      [[0, 150, 0, 0xffffff, 160], [120, 60, 80, 0xfff1d6, 70], [-120, 50, -60, 0xc7e0ff, 70]].forEach(([x, y, z, c, s]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); });
      this.scene.environment = pm.fromScene(es, 0.04).texture;
      this.scene.children.filter(o => o.isGridHelper).forEach(o => o.visible = false);
      const sun = new THREE.DirectionalLight(0xfff4e0, 2.4); sun.position.set(60, 160, 90); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      const sc = sun.shadow.camera; sc.left = -170; sc.right = 170; sc.top = 130; sc.bottom = -130; sc.near = 10; sc.far = 400; sun.shadow.bias = -0.0004; this.scene.add(sun);
      // light drafting-paper table (like a clean technical illustration)
      this.scene.background = new THREE.Color('#efe7d8');
      const tex = this.tex(1024, 1024, (x, w, h) => { x.fillStyle = '#f3ecdf'; x.fillRect(0, 0, w, h); for (let i = 0; i <= 64; i++) { x.strokeStyle = i % 8 ? 'rgba(120,100,70,.10)' : 'rgba(120,100,70,.22)'; x.lineWidth = i % 8 ? 1 : 2; x.beginPath(); x.moveTo(i * w / 64, 0); x.lineTo(i * w / 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * h / 64); x.lineTo(w, i * h / 64); x.stroke(); } });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3);
      const desk = new THREE.Mesh(new THREE.PlaneGeometry(900, 700), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
      desk.rotation.x = -Math.PI / 2; desk.position.y = -6.2; desk.receiveShadow = true; this.scene.add(desk);
      this.scene.fog = new THREE.Fog('#efe7d8', 420, 900);
    }
    /* ---- static scene: board + breadboard ---- */
    build(board) {
      const THREE = T(); this.clear(); this.boardId = board; this.partMeshes = {}; this.wireMeshes = [];
      this.buildBoard(board); this.boardG = this.root.children[this.root.children.length - 1];
      if (board === 'esp32') this.boardG.position.set(-40, 2, 0);
      if (board === 'uno') this.boardG.position.set(-52, 0, 0);
      if (board === 'rpi') this.boardG.position.set(-62, 0, 0);
      this.boardG.updateWorldMatrix(true, true);
      Object.values(this.pinPosMap).forEach(o => { o.world = this.world(this.boardG, o.pos); });
      this.outline(this.boardG, '#0f172a');
      this.buildBreadboard();
      this.points = {};
      Object.entries(this.pinPosMap).forEach(([id, o]) => { this.points['P:' + id] = o.world.clone(); });
      for (let x = 1; x <= COLS; x++) for (let y = 0; y <= 16; y++) if (isHole(x, y)) this.points['H:' + x + ':' + y] = this.holePos(x, y);
      // hover marker
      this.marker = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.28, 8, 24), new THREE.MeshBasicMaterial({ color: '#22d3ee' })); this.marker.rotation.x = Math.PI / 2; this.marker.visible = false; this.scene.add(this.marker);
      this.ghost = new THREE.Group(); this.scene.add(this.ghost);
      this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.home(); this.baseR = 200; this.minR = 30; this.needs = true;
    }
    zoom(f) { this.orbit.radius = Math.max(this.minR || 30, Math.min(650, this.orbit.radius * f)); this.needs = true; }
    home() { const gx = this.boardG ? this.boardG.position.x : -50; const lx = this.boardG ? new (T().Box3)().setFromObject(this.boardG).min.x : gx - 36; this.orbit.target.set((lx + BBX + COLS * P / 2 + 5) / 2, 0, 0); this.orbit.radius = (BBX + COLS * P / 2 + 5 - lx) * 1.3; this.orbit.theta = -0.06; this.orbit.phi = 0.7; this.needs = true; }
    holePos(x, y) { return new (T().Vector3)(BBX + (x - MIDC) * P, BBTOP, BBZ + (y - 8) * P); }
    buildBreadboard() {
      const THREE = T(); const W = COLS * P + 10, D = 17 * P + 6.5, S = 12;
      const tex = this.tex(Math.round(W * S), Math.round(D * S), (x, w, h) => {
        x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, w, h);
        const px = col => (W / 2 + (col - MIDC) * P) * S, pz = y => (D / 2 + (y - 8) * P) * S;
        x.fillStyle = '#e2e2dc'; x.fillRect(0, pz(8) - 1.4 * S, w, 2.8 * S); // centre channel
        [[0, '#d42020'], [1, '#1d4ed8'], [15, '#d42020'], [16, '#1d4ed8']].forEach(([y, c]) => { x.fillStyle = c; const zz = pz(y) + (y === 0 || y === 15 ? -1.6 : 1.6) * S; x.fillRect(px(1) - 1.5 * S, zz - 0.25 * S, (COLS - 1) * P * S + 3 * S, 0.5 * S); });
        x.font = `bold ${1.5 * S}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
        [[0, '+', '#d42020'], [1, '−', '#1d4ed8'], [15, '+', '#d42020'], [16, '−', '#1d4ed8']].forEach(([y, t, c]) => { x.fillStyle = c; x.fillText(t, px(1) - 2.6 * S, pz(y)); x.fillText(t, px(COLS) + 2.6 * S, pz(y)); });
        x.fillStyle = '#6b7280'; x.font = `${1.15 * S}px Arial`;
        for (let c = 1; c <= COLS; c++) if (c === 1 || c % 5 === 0) { x.fillText(c, px(c), pz(2.6)); x.fillText(c, px(c), pz(13.4)); }
        'abcde'.split('').forEach((l, i) => { x.fillText(l, px(1) - 2.4 * S, pz(3 + i)); x.fillText(l, px(COLS) + 2.4 * S, pz(3 + i)); });
        'fghij'.split('').forEach((l, i) => { x.fillText(l, px(1) - 2.4 * S, pz(9 + i)); x.fillText(l, px(COLS) + 2.4 * S, pz(9 + i)); });
        for (let c = 1; c <= COLS; c++) for (let y = 0; y <= 16; y++) if (isHole(c, y)) { x.fillStyle = '#3f3f46'; x.fillRect(px(c) - 0.5 * S, pz(y) - 0.5 * S, S, S); x.fillStyle = '#18181b'; x.fillRect(px(c) - 0.32 * S, pz(y) - 0.32 * S, 0.64 * S, 0.64 * S); }
      });
      const side = new THREE.MeshStandardMaterial({ color: '#ecece6', roughness: 0.55 });
      const bb = new THREE.Mesh(new THREE.BoxGeometry(W, BBTOP, D), [side, side, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), side, side, side]);
      bb.position.set(BBX, BBTOP / 2, BBZ); this.root.add(bb); this.bbMesh = bb; this.outline(bb, '#8a8170');
    }
    /* ---- dynamic: parts and wires ---- */
    redraw(bench) {
      const THREE = T();
      Object.values(this.partMeshes).forEach(g => this.root.remove(g)); this.wireMeshes.forEach(g => this.root.remove(g));
      this.partMeshes = {}; this.wireMeshes = []; this.pickables = this.pickables.filter(m => !m.userData.dyn);
      bench.parts.forEach(p => { const g = this.partModel(p); this.outline(g); g.traverse(o => { if (o.isMesh && !o.userData.noPick) { o.castShadow = true; o.userData.dyn = true; o.userData.pick = { kind: 'part', id: p.id }; this.pickables.push(o); } }); this.root.add(g); this.partMeshes[p.id] = g; });
      bench.wires.forEach((w, i) => { const a = this.ptOf(w.a), b = this.ptOf(w.b); if (!a || !b) return; const g = this.jumper(a, b, w.color, w.a, w.b); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.dyn = true; o.userData.pick = { kind: 'wire', id: i }; this.pickables.push(o); } }); this.root.add(g); this.wireMeshes.push(g); });
      this.paintSel(); this.needs = true;
    }
    outline(g, col = '#1e293b') {
      const THREE = T(); const add = [];
      g.traverse(o => { if (o.isMesh && o.geometry && !o.userData.noLine && o.geometry.type !== 'TubeGeometry') add.push(o); });
      add.forEach(o => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 35), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 })); l.userData.line = true; l.raycast = () => { }; o.add(l); });
    }
    ptOf(key) { if (this.points[key]) return this.points[key].clone(); if (key.startsWith('S:')) { const [, id, k] = key.split(':'); const s = this.servoSockets && this.servoSockets[id]; return s ? s[+k].clone() : null; } return null; }
    jumper(a, b, color, ka, kb) {
      const THREE = T(); const g = new THREE.Group();
      const up = (k, p) => k.startsWith('P:') && this.boardId !== 'uno' ? 2 : 0;
      const pa = a.clone(), pb = b.clone(); const lift = 8 + a.distanceTo(b) * 0.18;
      const mid = pa.clone().add(pb).multiplyScalar(0.5); mid.y = Math.max(pa.y, pb.y) + lift;
      const curve = new THREE.CatmullRomCurve3([pa.clone().add(new THREE.Vector3(0, 5, 0)), pa.clone().lerp(mid, 0.5).setY(Math.max(pa.y, pb.y) + lift * 0.8), mid, pb.clone().lerp(mid, 0.5).setY(Math.max(pa.y, pb.y) + lift * 0.8), pb.clone().add(new THREE.Vector3(0, 5, 0))]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.62, 10, false), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.0 })));
      [[pa, ka], [pb, kb]].forEach(([p, k]) => {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6, 2.4), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })); housing.position.copy(p).add(new THREE.Vector3(0, 3 + up(k), 0)); g.add(housing);
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 3, 6), new THREE.MeshStandardMaterial({ color: '#d1d5db', metalness: 0.95, roughness: 0.25 })); pin.position.copy(p).add(new THREE.Vector3(0, -0.2 + up(k), 0)); g.add(pin);
      });
      return g;
    }
    mat(c, o) { return new (T().MeshStandardMaterial)(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {})); }
    leg(g, from, to, col = '#cbd5e1') {
      const THREE = T(); const a = from.clone(), b = to.clone(); const bend = b.clone(); bend.y = a.y;
      const c = new THREE.CatmullRomCurve3([a, a.clone().lerp(bend, 0.7), bend.clone().setY((a.y + b.y) / 2 + 1.5), b.clone().setY(b.y + 2), b.clone().setY(b.y - 1.2)], false, 'catmullrom', 0.2);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.26, 6, false), this.mat(col, { metalness: 0.95, roughness: 0.22 })));
    }
    partModel(p) {
      const THREE = T(); const g = new THREE.Group(); const L = p.legs.map(k => this.ptOf(k)).filter(Boolean);
      if (L.length < p.legs.length && !PARTS[p.type].offboard) return g;
      const mid = L.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, L.length));
      const dir = L.length > 1 ? L[L.length - 1].clone().sub(L[0]).setY(0).normalize() : new THREE.Vector3(1, 0, 0);
      const ang = Math.atan2(-dir.z, dir.x);
      const at = (h, off = 0) => mid.clone().add(dir.clone().multiplyScalar(off)).setY(BBTOP + h);
      if (p.type === 'led' || p.type === 'rgb') {
        const col = p.type === 'rgb' ? new THREE.Color('#f1f5f9') : new THREE.Color((LEDT[p.props.color] || LEDT.red).color);
        const lens = new THREE.MeshPhysicalMaterial({ color: col, transparent: true, opacity: p.burnt ? 0.95 : 0.55, roughness: 0.12, transmission: 0.2, thickness: 2, emissive: col, emissiveIntensity: 0.04, clearcoat: 1 });
        if (p.burnt) { lens.color.set('#3f3f46'); lens.emissive.set('#000'); }
        const b = at(12); const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 5, 28), lens); body.position.copy(b); g.add(body);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), lens); dome.position.copy(b).add(new THREE.Vector3(0, 2.5, 0)); g.add(dome);
        const fl = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 1, 28), lens); fl.position.copy(b).add(new THREE.Vector3(0, -2.5, 0)); g.add(fl);
        const light = new THREE.PointLight(col, 0, 60, 1.6); light.position.copy(b).add(new THREE.Vector3(0, 2, 0)); g.add(light);
        const n = L.length; L.forEach((h, i) => { const off = (i - (n - 1) / 2) * 1.27; this.leg(g, b.clone().add(dir.clone().multiplyScalar(off)).setY(b.y - 3), h); });
        g.userData.led = { lens, light };
      } else if (p.type === 'resistor') {
        const b = at(4); const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 4.2, 6, 14), this.mat('#d9c49b', { roughness: 0.6 })); body.rotation.z = Math.PI / 2; const holder = new THREE.Group(); holder.position.copy(b); holder.rotation.y = ang; holder.add(body);
        const bands = VL.bandsFor(p.props.r); [[-1.4, VL.BAND[bands[0]]], [-0.4, VL.BAND[bands[1]]], [0.6, VL.BAND[bands[2]]], [1.9, '#c9a227']].forEach(([x, c]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 18), this.mat(c)); r.rotation.z = Math.PI / 2; r.position.x = x; holder.add(r); });
        g.add(holder);
        const e1 = b.clone().add(dir.clone().multiplyScalar(-3.4)), e2 = b.clone().add(dir.clone().multiplyScalar(3.4));
        this.leg(g, e1, L[0]); this.leg(g, e2, L[1]);
      } else if (p.type === 'button') {
        const b = at(5); const base = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 12), this.mat('#1f2937')); base.position.copy(b); g.add(base);
        const plate = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 12), this.mat('#d1d5db', { metalness: 0.9, roughness: 0.3 })); plate.position.copy(b).add(new THREE.Vector3(0, 1.9, 0)); g.add(plate);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 3.2, 24), this.mat('#ef4444', { roughness: 0.35 })); cap.position.copy(b).add(new THREE.Vector3(0, 3.6, 0)); g.add(cap);
        L.forEach((h, i) => this.leg(g, b.clone().add(dir.clone().multiplyScalar(i ? 4 : -4)).setY(b.y - 1.7), h));
        g.userData.btn = { cap, y: cap.position.y };
      } else if (p.type === 'buzzer') {
        const b = at(7); const body = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 8, 32), this.mat('#111827', { roughness: 0.35 })); body.position.copy(b); g.add(body);
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 16), this.mat('#000')); hole.position.copy(b).add(new THREE.Vector3(0, 4.05, 0)); g.add(hole);
        L.forEach((h, i) => this.leg(g, b.clone().add(dir.clone().multiplyScalar(i ? 1.9 : -1.9)).setY(b.y - 4), h));
        g.userData.buz = body;
      } else if (p.type === 'ldr') {
        const b = at(6); const disk = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.6, 24), this.mat('#b45309', { roughness: 0.3 })); disk.position.copy(b); disk.rotation.x = Math.PI / 2; disk.rotation.z = ang; g.add(disk);
        const face = new THREE.Mesh(new THREE.CircleGeometry(2.3, 24), new THREE.MeshStandardMaterial({ map: this.tex(64, 64, (x) => { x.fillStyle = '#e7d3a8'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#7c2d12'; x.lineWidth = 4; x.beginPath(); for (let i = 0; i < 6; i++) { x.moveTo(12, 8 + i * 9); x.lineTo(52, 8 + i * 9); } x.stroke(); }), roughness: 0.3 }));
        face.position.copy(b).add(new THREE.Vector3(0, 0, 0.85)); face.rotation.y = ang; g.add(face);
        L.forEach((h, i) => this.leg(g, b.clone().add(dir.clone().multiplyScalar(i ? 1 : -1)).setY(b.y - 2.5), h));
      } else if (p.type === 'pot') {
        const b = at(4); const body = new THREE.Mesh(new THREE.BoxGeometry(9.5, 6, 9.5), this.mat('#1d4ed8', { roughness: 0.4 })); body.position.copy(b); body.rotation.y = ang; g.add(body);
        const knob = new THREE.Group(); knob.position.copy(b).add(new THREE.Vector3(0, 3, 0)); g.add(knob);
        const k = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 5, 24), this.mat('#f8fafc', { roughness: 0.3 })); k.position.y = 2.5; knob.add(k);
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 3.2), this.mat('#111827')); mark.position.set(0, 5.1, 1.4); knob.add(mark);
        knob.rotation.y = -((p.props.pos ?? 0.5) * 270 - 135) * Math.PI / 180;
        L.forEach((h, i) => this.leg(g, b.clone().add(dir.clone().multiplyScalar((i - 1) * 2.54)).setY(b.y - 3), h));
      } else if (p.type === 'tmp36') {
        const b = at(9); const holder = new THREE.Group(); holder.position.copy(b); holder.rotation.y = ang; g.add(holder);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5, 24, 1, false, -Math.PI / 2, Math.PI), this.mat('#111827', { roughness: 0.35 })); holder.add(body);
        const flat = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 5), new THREE.MeshStandardMaterial({ map: this.tex(96, 100, (x) => { x.fillStyle = '#18181b'; x.fillRect(0, 0, 96, 100); x.fillStyle = '#d4d4d8'; x.font = 'bold 20px Arial'; x.textAlign = 'center'; x.fillText('TMP', 48, 42); x.fillText('36', 48, 68); }), roughness: 0.4, side: THREE.DoubleSide }));
        flat.rotation.y = Math.PI; holder.add(flat);
        L.forEach((h, i) => this.leg(g, b.clone().add(dir.clone().multiplyScalar((i - 1) * 1.27)).setY(b.y - 2.5), h));
      } else if (p.type === 'pir') {
        const b = at(13); const holder = new THREE.Group(); holder.position.copy(b); holder.rotation.y = ang; g.add(holder);
        const pcb = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, 24), this.mat('#166534')); holder.add(pcb);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#f8fafc', roughness: 0.45, transmission: 0.3, thickness: 2 })); dome.position.y = 0.8; holder.add(dome);
        const led = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), this.mat('#7f1d1d', { emissive: '#000' })); led.position.set(9, 1.6, 9); holder.add(led);
        L.forEach((h, i) => this.leg(g, b.clone().add(dir.clone().multiplyScalar((i - 1) * 2.54)).setY(b.y - 1), h, '#d4af37'));
        g.userData.pir = led;
      } else if (p.type === 'hcsr04') {
        const b = at(13); const holder = new THREE.Group(); holder.position.copy(b); holder.rotation.y = ang; g.add(holder);
        const pcb = new THREE.Mesh(new THREE.BoxGeometry(45, 20, 1.6), this.mat('#1d4ed8')); holder.add(pcb);
        [-13, 13].forEach(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 12, 32, 1, true), this.mat('#d1d5db', { metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide })); c.rotation.x = Math.PI / 2; c.position.set(x, 0, -6.8); holder.add(c); const mesh = new THREE.Mesh(new THREE.CircleGeometry(7.6, 32), this.mat('#27272a', { roughness: 0.9 })); mesh.position.set(x, 0, -12.6); mesh.rotation.y = Math.PI; holder.add(mesh); });
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), new THREE.MeshStandardMaterial({ map: this.tex(140, 40, (x) => { x.fillStyle = '#1d4ed8'; x.fillRect(0, 0, 140, 40); x.fillStyle = '#fff'; x.font = 'bold 22px Arial'; x.textAlign = 'center'; x.fillText('HC-SR04', 70, 28); }) })); lbl.position.set(0, 6, 0.85); holder.add(lbl);
        L.forEach((h, i) => this.leg(g, b.clone().add(dir.clone().multiplyScalar((i - 1.5) * 2.54)).setY(b.y - 9), h, '#d4af37'));
        // the obstacle in front of the sensor
        const wall = new THREE.Mesh(new THREE.BoxGeometry(34, 26, 2), new THREE.MeshStandardMaterial({ color: '#64748b', transparent: true, opacity: 0.28, roughness: 0.8, depthWrite: false })); wall.userData.noLine = wall.userData.noPick = true;
        const fwd = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(-1);
        wall.position.copy(b).add(fwd.clone().multiplyScalar(14 + (p.props.cm ?? 25) * 1.2)); wall.rotation.y = ang; g.add(wall);
      } else if (p.type === 'servo') {
        const base = new THREE.Vector3(BBX + 20, 0, 52 + (this.servoIndex(p) * 26));
        const body = new THREE.Mesh(new THREE.BoxGeometry(23, 22, 12.5), this.mat('#1d4ed8', { roughness: 0.35 })); body.position.copy(base).add(new THREE.Vector3(0, 11, 0)); g.add(body);
        const tab = new THREE.Mesh(new THREE.BoxGeometry(32, 2.5, 12.5), this.mat('#1d4ed8')); tab.position.copy(base).add(new THREE.Vector3(0, 16, 0)); g.add(tab);
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 4, 16), this.mat('#f8fafc')); sh.position.copy(base).add(new THREE.Vector3(6, 24, 0)); g.add(sh);
        const horn = new THREE.Group(); horn.position.copy(base).add(new THREE.Vector3(6, 26.5, 0)); g.add(horn);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 17), this.mat('#f8fafc')); arm.position.z = 6.5; horn.add(arm);
        g.userData.horn = horn;
        // cable to a 3-pin socket (wires plug into the socket pins)
        this.servoSockets = this.servoSockets || {};
        const sockBase = base.clone().add(new THREE.Vector3(-26, 0, 0));
        const sock = [0, 1, 2].map(k => sockBase.clone().add(new THREE.Vector3(0, 3, (k - 1) * 2.54)));
        this.servoSockets[p.id] = sock;
        const shell = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6, 7.8), this.mat('#111')); shell.position.copy(sockBase).add(new THREE.Vector3(0, 0, 0)); g.add(shell);
        ['#78350f', '#dc2626', '#f97316'].forEach((c, k) => { const from = base.clone().add(new THREE.Vector3(-11.5, 6, (k - 1) * 1.2)); const to = sock[k].clone().add(new THREE.Vector3(1.4, -2, 0)); const cv = new THREE.CatmullRomCurve3([from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -3, 0)), to]); g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 16, 0.5, 6, false), this.mat(c))); });
        sock.forEach(s => { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2, 6), this.mat('#d4af37', { metalness: 0.9 })); pin.position.copy(s); g.add(pin); });
        Object.assign(this.points, { ['S:' + p.id + ':0']: sock[0], ['S:' + p.id + ':1']: sock[1], ['S:' + p.id + ':2']: sock[2] });
      }
      return g;
    }
    drawCallouts() {
      const el = this.over; if (!el || !this.lab) return; const W = this.host.clientWidth, H = this.host.clientHeight; if (!W) return;
      const THREE = T(); const sel = this.lab.sel;
      const tags = this.lab.bench.parts.map(p => { const g = this.partMeshes[p.id]; if (!g) return ''; const bx = new THREE.Box3().setFromObject(g); if (bx.isEmpty()) return ''; const c = bx.getCenter(new THREE.Vector3()); c.y = bx.max.y + 3; c.add(g.position.clone().multiplyScalar(0)); const v = c.project(this.camera); if (v.z > 1) return ''; const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; const on = sel && sel.kind === 'part' && sel.id === p.id; return `<div class="l3-tag${on ? ' on' : ''}" style="left:${x}px;top:${y}px">${VL.esc(this.lab.tagOf(p))}</div>`; }).join('');
      el.innerHTML = tags;
    }
    /* the part under the mouse, if it is in front of the nearest hole/pin */
    partFront(e) {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.mouse, this.camera);
      const hit = this.ray.intersectObjects(this.pickables, false).find(h => h.object.userData.pick && h.object.userData.pick.kind === 'part'); if (!hit) return null;
      const k = this.nearestPoint(e); if (!k) return hit.object.userData.pick;
      const dp = this.camera.position.distanceTo(this.ptOf(k));
      return hit.distance < dp - 0.8 || this.lab.bench.occupied(k) ? hit.object.userData.pick : null;
    }
    planeHole(e) {
      const THREE = T(); const r = this.renderer.domElement.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.mouse, this.camera); const hit = new THREE.Vector3();
      if (!this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -BBTOP), hit)) return null;
      return { x: (hit.x - BBX) / P + MIDC, y: (hit.z - BBZ) / P + 8 };
    }
    servoIndex(p) { return this.lab.bench.parts.filter(q => q.type === 'servo').indexOf(p); }
    /* live state from the simulation */
    live(state) {
      Object.entries(this.partMeshes).forEach(([id, g]) => {
        const s = state[id]; if (!s) return; const u = g.userData;
        if (u.led) { if (s.rgb) { const c = new (T().Color)(s.rgb[0], s.rgb[1], s.rgb[2]); u.led.lens.emissive.copy(c); u.led.lens.emissiveIntensity = Math.max(...s.rgb) * 2.2 + 0.04; u.led.light.color.copy(c); u.led.light.intensity = (s.rgb[0] + s.rgb[1] + s.rgb[2]) * 160; } else { const b = s.b || 0; u.led.lens.emissiveIntensity = 0.04 + b * 2.4; u.led.light.intensity = b * 320; } }
        if (u.btn) u.btn.cap.position.y = u.btn.y - (s.pressed ? 1 : 0);
        if (u.buz) u.buz.scale.setScalar(s.on ? 1 + 0.05 * Math.sin(performance.now() / 15) : 1);
        if (u.pir) { u.pir.material.emissive.set(s.motion ? '#ef4444' : '#000'); u.pir.material.emissiveIntensity = s.motion ? 2 : 0; }
        if (u.horn && s.angle !== undefined) u.horn.rotation.y = (s.angle - 90) * Math.PI / 180;
      });
      this.needs = true;
    }
    /* ---- picking connection points ---- */
    nearestPoint(e) {
      const THREE = T(); const r = this.renderer.domElement.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.mouse, this.camera); const ray = this.ray.ray;
      let best = null, bd = 1.7;
      Object.entries(this.points).forEach(([k, p]) => { const d = ray.distanceToPoint(p); if (d < bd) { bd = d; best = k; } });
      return best;
    }
    hover(e) {
      const k = this.nearestPoint(e); this.hoverKey = k;
      if (k) { this.marker.visible = true; this.marker.position.copy(this.ptOf(k)).add(new (T().Vector3)(0, 0.4, 0)); this.marker.material.color.set(this.lab.bench.occupied(k) ? '#f59e0b' : '#22d3ee'); }
      else this.marker.visible = false;
      const pk = this.pick(e); const onPart = this.lab.mode === 'select' && !this.lab.wireStart && this.partFront(e);
      if (onPart) { this.marker.visible = false; this.renderer.domElement.style.cursor = 'move'; this.lab.onHover(null, e); this.needs = true; return; }
      this.renderer.domElement.style.cursor = k ? 'crosshair' : (pk ? 'pointer' : 'grab');
      this.lab.onHover(k, e); this.needs = true;
    }
    click(e) {
      const k0 = this.nearestPoint(e); const k = k0 && this.lab.mode === 'select' && !this.lab.wireStart && this.partFront(e) ? null : k0;
      if (k && this.lab.mode !== 'select-only') { this.lab.onPoint(k); return; }
      const p = this.pick(e); this.lab.onPick(p);
    }
    paintSel() {
      const sel = this.lab && this.lab.sel;
      Object.entries(this.partMeshes).forEach(([id, g]) => g.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !(g.userData.led && (o.material === g.userData.led.lens))) { if (o.userData.baseEm === undefined) o.userData.baseEm = o.material.emissive.getHex(); o.material.emissive.setHex(sel && sel.kind === 'part' && sel.id === id ? 0x0e7490 : o.userData.baseEm); } }));
      this.wireMeshes.forEach((g, i) => g.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.setHex(sel && sel.kind === 'wire' && sel.id === i ? 0x0891b2 : 0); }));
      this.needs = true;
    }
    bindControls() {
      const el = this.renderer.domElement; let drag = null, moved = 0;
      el.addEventListener('contextmenu', e => e.preventDefault());
      let pd = null;
      el.addEventListener('pointerdown', e => {
        if (e.button === 0 && !e.shiftKey && this.lab) {
          const pk = this.lab.mode === 'select' && !this.lab.wireStart ? this.partFront(e) : null; const part = pk && this.lab.bench.parts.find(p => p.id === pk.id);
          if (part && !PARTS[part.type].offboard) { const h = this.planeHole(e); if (h) { pd = { id: part.id, h, dx: 0, dy: 0, moved: 0, x: e.clientX, y: e.clientY }; this.lab.onPick(pk); el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; return; } }
        }
        drag = { x: e.clientX, y: e.clientY, th: this.orbit.theta, ph: this.orbit.phi, pan: e.button === 2 || e.shiftKey, t: this.orbit.target.clone() }; moved = 0; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', e => {
        if (pd) {
          pd.moved = Math.max(pd.moved, Math.abs(e.clientX - pd.x) + Math.abs(e.clientY - pd.y)); const h = this.planeHole(e); if (!h) return;
          const dx = Math.round(h.x - pd.h.x), dy = Math.round(h.y - pd.h.y); if (dx === pd.dx && dy === pd.dy) return; pd.dx = dx; pd.dy = dy;
          const g = this.partMeshes[pd.id]; if (g) { g.position.set(dx * P, 0, dy * P); const ok = this.lab.canShift(pd.id, dx, dy); g.traverse(o => { if (o.userData.line) o.material.color.set(ok ? '#0e7490' : '#dc2626'); }); }
          this.needs = true; return;
        }
        if (drag) {
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
          if (drag.pan) { const THREE = T(); const s = this.orbit.radius / 600; const right = new THREE.Vector3(Math.cos(this.orbit.theta), 0, -Math.sin(this.orbit.theta)); const fwd = new THREE.Vector3(Math.sin(this.orbit.theta), 0, Math.cos(this.orbit.theta)); this.orbit.target.copy(drag.t).add(right.multiplyScalar(-dx * s)).add(fwd.multiplyScalar(-dy * s)); }
          else { this.orbit.theta = drag.th - dx * 0.007; this.orbit.phi = Math.max(0.05, Math.min(1.5, drag.ph - dy * 0.007)); }
          this.needs = true;
        } else this.hover(e);
      });
      el.addEventListener('pointerup', e => {
        if (pd) { const d = pd; pd = null; el.style.cursor = 'grab'; if (d.moved > 4 && (d.dx || d.dy)) this.lab.shiftPart(d.id, d.dx, d.dy); else { const g = this.partMeshes[d.id]; if (g) g.position.set(0, 0, 0); this.redraw(this.lab.bench); } return; }
        if (drag && moved < 5 && e.button !== 2) this.click(e); drag = null; });
      el.addEventListener('pointerleave', () => { if (this.marker) this.marker.visible = false; this.lab && this.lab.onHover(null); this.needs = true; });
      el.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
      el.addEventListener('dblclick', e => { const pk = this.pick(e); if (pk && pk.kind === 'part') this.focusPart(pk.id); });
    }
    focusPart(id) { const g = this.partMeshes[id]; if (!g) return; const c = new (T().Box3)().setFromObject(g).getCenter(new (T().Vector3)()); this.orbit.target.set(c.x, 0, c.z); this.orbit.radius = 95; this.needs = true; }
  }

  /* ======================= the Lab page component ======================= */
  class Lab3D {
    constructor(host, o = {}) {
      this.host = host; this.o = o; this.isLab3d = true; VL._lab = this; const S = VL.Store; this.boardId = o.board || 'uno'; this.mode = 'select'; this.sel = null; this.pending = null; this.wireColor = 'auto';
      const saved = (S.p.lab3d || {})[this.boardId];
      this.bench = new Bench(this.boardId);
      const B = BOARD[this.boardId]; const I = VL.icon;
      host.innerHTML = `<div class="l3">
        <aside class="l3-bin glass">
          <div class="l3-h">${I('chip')} Parts</div>
          <div class="l3-parts">${Object.entries(PARTS).map(([k, d]) => `<button class="l3-part" data-part="${k}" title="${esc(d.name)}"><span class="l3-ico" data-ico="${k}"></span><span>${esc(d.name)}</span></button>`).join('')}</div>
          <div class="l3-h">${I('pin')} Jumper wires</div>
          <div class="l3-wc"><button class="sw on" data-wc="auto" title="Automatic colour code">Auto</button>${['#dc2626', '#111827', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#e5e7eb'].map(c => `<button class="sw" data-wc="${c}" style="--c:${c}"></button>`).join('')}</div>
          <p class="muted small">Auto: GND = black, 5V/3V3 = red, signals = other colours.</p>
          <div class="l3-h">${I('info')} Inspector</div>
          <div class="l3-insp"><p class="muted small">Click a hole or a pin to start a wire. Click a part above: it appears on the breadboard. Drag it to move it.</p></div>
        </aside>
        <section class="l3-stage glass">
          <div class="st-head"><div class="st-t">${I('cube')}<b>${esc(B.name)}</b><span class="l3-status muted"></span></div>
            <div class="st-tools"><button class="chip" data-v="iso">3D</button><button class="chip" data-v="top">Top</button><button class="chip" data-v="front">Front</button><button class="chip" data-v="board">Board</button><button class="chip" data-v="bb">Breadboard</button><button class="chip" data-act="undo">Undo</button><button class="chip" data-act="clear">Clear</button></div></div>
          <div class="k3host l3-host"><div class="l3-tip" hidden></div><div class="k3-fallback" hidden>The 3D lab needs WebGL, which is not available in this browser.</div></div>
          <p class="muted small l3-help">Drag a part: move it · drag the background: rotate · right-drag or Shift-drag: pan · wheel: zoom · Esc: cancel · Delete: remove the selected part or wire</p>
          <div class="l3-sensors"></div>
        </section>
        <section class="l3-code glass">
          <div class="code-head"><div class="ttl">${I('code')} <b>${B.file}</b><span class="lang">${B.lang === 'cpp' ? 'Arduino C++' : B.lang === 'gpiozero' ? 'Python · gpiozero' : 'MicroPython'}</span></div>
            <div class="runbar"><select class="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button class="btn-run">${I('play')} ${B.lang === 'cpp' ? 'Upload & run' : 'Run'}</button><button class="btn-sm stop">${I('stop')}</button><button class="btn-sm l3-hint" title="Mrs Sarra checks your circuit and code">${I('bulb')} Hint from Mrs Sarra</button></div></div>
          <div class="editor-host"></div>
          <div class="cl-status"></div>
          <div class="ser-head"><div class="ttl">${I('terminal')} <b>Serial monitor</b> <span class="muted">${B.lang === 'cpp' ? '9600' : '115200'} baud</span></div><span class="clock muted">t = 0.00 s</span></div>
          <pre class="serial l3-ser">Press ${B.lang === 'cpp' ? 'Upload & run' : 'Run'} to send your program to the ${esc(B.name)}.\n</pre>
        </section></div>`;
      const q = s => host.querySelector(s); this.q = q;
      this.ed = new VL.Editor(q('.editor-host'), { lang: B.lang === 'cpp' ? 'cpp' : 'py', onChange: () => this.save() });
      this.ed.value = (saved && saved.code) || STARTER[this.boardId];
      host.querySelectorAll('[data-ico]').forEach(el => el.innerHTML = partIcon(el.dataset.ico));
      try {
        if (!window.THREE || !VL.Kit3D) throw 0;
        this.view = new Lab3DView(q('.l3-host'), this); this.view.build(this.boardId);
        this.bench.pins = Object.fromEntries(Object.entries(this.view.pinPosMap).map(([id, o]) => [id, o.pin]));
      } catch (e) { q('.k3-fallback').hidden = false; this.view = null; this.bench.pins = {}; }
      if (saved && saved.circ) this.load(saved.circ);
      this.redraw();
      host.querySelectorAll('[data-part]').forEach(b => b.onclick = () => this.startPlace(b.dataset.part));
      host.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => { this.wireColor = b.dataset.wc; host.querySelectorAll('[data-wc]').forEach(x => x.classList.toggle('on', x === b)); });
      host.querySelectorAll('[data-v]').forEach(b => b.onclick = () => this.camView(b.dataset.v));
      q('[data-act=undo]').onclick = () => this.undo(); q('[data-act=clear]').onclick = () => VL.ui.confirm('Clear the bench?', 'All parts and wires will be removed.', () => { this.snapshot(); this.bench.parts = []; this.bench.wires = []; this.sel = null; this.redraw(); });
      q('.btn-run').onclick = () => this.run(); q('.stop').onclick = () => this.stop();
      q('.l3-hint').onclick = () => this.hint();
      this.keyH = e => { if (!host.isConnected) return; if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) return; if (e.key === 'Escape') this.cancel(); if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.removeSel(); } };
      document.addEventListener('keydown', this.keyH);
      this.history = []; this.status('Click a part on the left to add it, drag it to move it, click two points to add a jumper wire.');
      this.raf = requestAnimationFrame(t => this.tick(t));
    }
    destroy() { cancelAnimationFrame(this.raf); this.dead = true; document.removeEventListener('keydown', this.keyH); if (this.view) this.view.dispose(); this.stopSound(); }
    status(t) { const el = this.q('.l3-status'); if (el) el.textContent = t; }
    camView(v) { const o = this.view && this.view.orbit; if (!o) return; const cx = (this.view.boardG.position.x - 36 + BBX + COLS * P / 2 + 5) / 2; if (v === 'top') { o.theta = 0; o.phi = 0.05; o.radius = 300; o.target.set(cx, 0, 6); } else if (v === 'front') { o.theta = 0; o.phi = 1.2; o.radius = 300; o.target.set(cx, 0, 6); } else if (v === 'board') { const g = this.view.boardG.position; o.target.set(g.x, 0, g.z); o.radius = 110; o.theta = -0.2; o.phi = 0.75; } else if (v === 'bb') { o.target.set(BBX, 0, 0); o.radius = 230; o.theta = -0.25; o.phi = 0.8; } else this.view.home(); this.view.needs = true; }
    snapshot() { this.history.push(JSON.stringify(this.bench.toJSON())); if (this.history.length > 40) this.history.shift(); }
    undo() { const s = this.history.pop(); if (!s) return; this.load(JSON.parse(s)); this.sel = null; this.redraw(); }
    load(c) { this.bench.parts = (c.parts || []).map(p => ({ id: p.id, type: p.type, legs: p.legs.slice(), props: Object.assign({}, PARTS[p.type] ? PARTS[p.type].props : {}, p.props) })); this.bench.wires = (c.wires || []).map(w => Object.assign({}, w)); this.bench.nid = 1 + Math.max(0, ...this.bench.parts.map(p => +String(p.id).replace(/\D/g, '') || 0)); }
    save() { const S = VL.Store; S.p.lab3d = S.p.lab3d || {}; S.p.lab3d[this.boardId] = { circ: this.bench.toJSON(), code: this.ed.value }; S.save(); }
    redraw() { if (this.view) this.view.redraw(this.bench); this.renderInspector(); this.renderSensors(); this.save(); this.applyIdle(); }
    /* ---------- placing ---------- */
    startPlace(type) {
      this.cancel(); const d = PARTS[type];
      if (d.offboard) { if (this.bench.parts.filter(p => p.type === 'servo').length >= 2) { VL.ui.toast('Two servos maximum on this bench.'); return; } this.snapshot(); const p = { id: 'p' + this.bench.nid++, type, legs: [null, null, null], props: Object.assign({}, d.props) }; p.legs = ['S:' + p.id + ':0', 'S:' + p.id + ':1', 'S:' + p.id + ':2']; this.bench.parts.push(p); this.sel = { kind: 'part', id: p.id }; this.redraw(); this.status('Servo added: connect its 3 socket pins with jumper wires (brown = GND, red = 5V, orange = signal).'); return; }
      const legs = this.findSpot(type);
      if (!legs) { VL.ui.toast('The breadboard is full: remove or move a part first.'); return; }
      this.addPart(type, legs, true);
      this.status(`${d.name} placed on the breadboard. Drag it to move it, or move one leg from the Inspector. Then wire it to the board.`);
      VL.ui.toast(`${esc(d.name)} added: drag it anywhere on the breadboard.`);
    }
    /* first free spot on the breadboard, away from other parts so nothing connects by accident */
    shape(type) {
      const d = PARTS[type];
      if (d.row) return { offs: Array.from({ length: d.legs }, (_, i) => [i, 0]), rows: [4, 10, 5, 11, 3, 9] };
      if (type === 'button') return { offs: [[0, 0], [2, 2]], rows: [7] };
      if (type === 'resistor') return { offs: [[0, 0], [4, 0]], rows: [6, 12, 5, 11, 4, 10] };
      if (type === 'led') return { offs: [[0, 0], [1, 0]], rows: [5, 11, 4, 10, 6, 12] };
      return { offs: [[0, 0], [2, 0]], rows: [5, 11, 4, 10] };
    }
    usedStrips(ignore) { const s = new Set(); this.bench.parts.forEach(p => { if (p !== ignore) p.legs.forEach(l => l && l.startsWith('H:') && s.add(this.bench.baseNet(l))); }); this.bench.wires.forEach(w => [w.a, w.b].forEach(k => k.startsWith('H:') && s.add(this.bench.baseNet(k)))); return s; }
    /* columns a part really covers (big modules overhang their pins) */
    span(type, legs) {
      const xs = legs.filter(l => l && l.startsWith('H:')).map(l => +l.split(':')[1]); if (!xs.length) return null;
      const foot = { pir: 13, hcsr04: 18, pot: 5, buzzer: 5, button: 3 }[type] || 0; const lo = Math.min(...xs), hi = Math.max(...xs), c = (lo + hi) / 2;
      const ys = legs.filter(l => l && l.startsWith('H:')).map(l => +l.split(':')[2]);
      return { lo: Math.min(lo, c - foot / 2) - 1, hi: Math.max(hi, c + foot / 2) + 1, top: ys.some(y => y <= 8), bot: ys.some(y => y >= 8) };
    }
    findSpot(type) {
      const { offs, rows } = this.shape(type); const used = this.usedStrips(); const w = Math.max(...offs.map(o => o[0]));
      const spans = this.bench.parts.map(p => this.span(p.type, p.legs)).filter(Boolean);
      for (const y0 of rows) for (let x0 = 3; x0 + w <= COLS - 2; x0++) {
        const keys = offs.map(([dx, dy]) => [x0 + dx, y0 + dy]);
        if (!keys.every(([x, y]) => isHole(x, y) && !this.bench.occupied('H:' + x + ':' + y))) continue;
        if (keys.some(([x, y]) => used.has('h' + C.holeNet(x, y)))) continue;
        const me = this.span(type, keys.map(([x, y]) => 'H:' + x + ':' + y));
        if (me.lo < 0 || me.hi > COLS + 1) continue;
        if (spans.some(o => ((o.top && me.top) || (o.bot && me.bot)) && me.lo <= o.hi && o.lo <= me.hi)) continue;
        return keys.map(([x, y]) => 'H:' + x + ':' + y);
      }
      // crowded: accept any free, unconnected place
      for (const y0 of rows) for (let x0 = 2; x0 + w <= COLS - 1; x0++) { const keys = offs.map(([dx, dy]) => [x0 + dx, y0 + dy]); if (keys.every(([x, y]) => isHole(x, y) && !this.bench.occupied('H:' + x + ':' + y) && !used.has('h' + C.holeNet(x, y)))) return keys.map(([x, y]) => 'H:' + x + ':' + y); }
      return null;
    }
    shifted(p, dx, dy) { return p.legs.map(l => { const [, x, y] = l.split(':').map(Number); return [x + dx, y + dy]; }); }
    canShift(id, dx, dy) {
      const p = this.bench.parts.find(x => x.id === id); if (!p) return false; const d = PARTS[p.type];
      const ks = this.shifted(p, dx, dy);
      return ks.every(([x, y]) => isHole(x, y) && !(d.row && (y <= 1 || y >= 15)) && !this.bench.occupied('H:' + x + ':' + y, p));
    }
    shiftPart(id, dx, dy) {
      const p = this.bench.parts.find(x => x.id === id);
      if (!this.canShift(id, dx, dy)) { VL.ui.toast('It cannot go there: a hole is used or it falls off the breadboard.'); this.redraw(); return; }
      this.snapshot(); p.legs = this.shifted(p, dx, dy).map(([x, y]) => 'H:' + x + ':' + y); this.recolour(); this.redraw();
      this.status(`${PARTS[p.type].name} moved to ${p.legs.map(l => this.pointName(l).replace('Breadboard ', '')).join(', ')}.`);
    }
    tagOf(p) { const d = PARTS[p.type]; const n = this.bench.parts.filter(q => q.type === p.type); const short = { led: 'LED', resistor: (p.props.r >= 1000 ? (p.props.r / 1000) + 'k' : p.props.r) + ' Ω', button: 'BUTTON', buzzer: 'BUZZER', ldr: 'LDR', rgb: 'RGB LED', pot: 'POT', tmp36: 'TMP36', pir: 'PIR', hcsr04: 'HC-SR04', servo: 'SERVO' }[p.type] || d.name; return n.length > 1 && p.type !== 'resistor' ? short + ' ' + (n.indexOf(p) + 1) : short; }
    cancel() { this.mode = 'select'; this.pending = null; this.wireStart = null; this.host.querySelectorAll('[data-part]').forEach(b => b.classList.remove('on')); if (this.view) { this.view.ghost.clear(); this.view.needs = true; } this.status('Click a part on the left to add it, drag it to move it, click two points to add a jumper wire.'); }
    onHover(k) {
      const tip = this.q('.l3-tip'); if (!tip) return;
      if (!k) { tip.hidden = true; return; }
      tip.hidden = false; tip.textContent = this.pointName(k) + (this.bench.occupied(k) ? ' (used)' : '');
      if (this.view) { const v = this.view.ptOf(k).project(this.view.camera); const W = this.view.host.clientWidth, H = this.view.host.clientHeight; tip.style.left = ((v.x + 1) / 2 * W + 14) + 'px'; tip.style.top = ((1 - v.y) / 2 * H - 10) + 'px'; }
    }
    pointName(k) {
      if (k.startsWith('H:')) return 'Breadboard ' + C.holeName(...k.slice(2).split(':').map(Number));
      if (k.startsWith('P:')) { const p = this.bench.pins[k.slice(2)]; const ph = this.boardId === 'rpi' ? ` (pin ${k.slice(3)})` : ''; return (p ? p.label : k) + ph; }
      if (k.startsWith('S:')) { const [, id, i] = k.split(':'); return 'Servo ' + PARTS.servo.legNames[+i]; }
      return k;
    }
    onPoint(k) {
      if (this.mode === 'place') return this.placeLeg(k);
      if (this.mode === 'moveleg') return this.moveLeg(k);
      // wiring
      if (!this.wireStart) {
        if (this.bench.occupied(k)) { const p = this.bench.parts.find(p => p.legs.includes(k)); const w = this.bench.wires.findIndex(w => w.a === k || w.b === k); this.sel = p ? { kind: 'part', id: p.id } : { kind: 'wire', id: w }; this.renderInspector(); this.view && this.view.paintSel(); return; }
        this.wireStart = k; this.status(`Wire from ${this.pointName(k)}: now click where it should go. (Esc to cancel)`); this.ghostAt(k); return;
      }
      if (k === this.wireStart) { this.cancel(); return; }
      if (this.bench.occupied(k)) { VL.ui.toast('That hole or pin is already used. One wire or leg per hole.'); return; }
      this.snapshot(); this.bench.wires.push({ a: this.wireStart, b: k, color: this.wireColor });
      this.wireStart = null; this.cancel(); this.recolour(); this.redraw();
    }
    ghostAt(k) { if (!this.view) return; const THREE = T(); this.view.ghost.clear(); const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ color: '#22d3ee' })); m.position.copy(this.view.ptOf(k)).add(new THREE.Vector3(0, 1, 0)); this.view.ghost.add(m); this.view.needs = true; }
    placeLeg(k) {
      const pd = this.pending; const d = PARTS[pd.type];
      if (!k.startsWith('H:')) { VL.ui.toast('Parts go into breadboard holes. Use a jumper wire to reach the board pins.'); return; }
      if (d.row) {
        const [x, y] = k.slice(2).split(':').map(Number); const keys = [];
        for (let i = 0; i < d.legs; i++) { const kk = 'H:' + (x + i) + ':' + y; if (!isHole(x + i, y)) { VL.ui.toast('Not enough room: the pins go to the right of this hole.'); return; } if (this.bench.occupied(kk)) { VL.ui.toast(`Hole ${C.holeName(x + i, y)} is already used.`); return; } keys.push(kk); }
        if (y <= 1 || y >= 15) { VL.ui.toast('Put modules in the main area (rows a–j), not on the power rails.'); return; }
        this.addPart(pd.type, keys); return;
      }
      if (this.bench.occupied(k)) { VL.ui.toast('That hole is already used.'); return; }
      if (pd.legs.length === 1) {
        const [x0, y0] = pd.legs[0].slice(2).split(':').map(Number), [x1, y1] = k.slice(2).split(':').map(Number);
        if (k === pd.legs[0]) return;
        if (Math.hypot(x1 - x0, y1 - y0) > 9) { VL.ui.toast('Too far: the legs only reach about 9 holes.'); return; }
        this.addPart(pd.type, [pd.legs[0], k]); return;
      }
      pd.legs.push(k); this.ghostAt(k); this.status(`Now click a hole for the ${d.legNames[1]}.`);
    }
    moveLeg(k) {
      const { id, i } = this.pending; const p = this.bench.parts.find(x => x.id === id); if (!p) return this.cancel();
      if (!k.startsWith('H:')) { VL.ui.toast('Legs go into breadboard holes. Use a jumper wire to reach the board pins.'); return; }
      if (p.legs[i] === k) return this.cancel();
      if (this.bench.occupied(k, p) || p.legs.includes(k)) { VL.ui.toast('That hole is already used.'); return; }
      const o = p.legs[1 - i]; const [x0, y0] = o.slice(2).split(':').map(Number), [x1, y1] = k.slice(2).split(':').map(Number);
      if (Math.hypot(x1 - x0, y1 - y0) > 9) { VL.ui.toast('Too far: the legs only reach about 9 holes.'); return; }
      this.snapshot(); p.legs[i] = k; this.cancel(); this.recolour(); this.redraw();
      if (this.bench.baseNet(p.legs[0]) === this.bench.baseNet(p.legs[1])) VL.ui.toast('Careful: both legs are in the same connected strip, so no current will go through this part.');
    }
    addPart(type, legs) {
      this.snapshot(); const p = { id: 'p' + this.bench.nid++, type, legs, props: Object.assign({}, PARTS[type].props) };
      this.bench.parts.push(p); this.sel = { kind: 'part', id: p.id }; this.cancel(); this.recolour(); this.redraw();
      const sameNet = new Set(legs.map(l => this.bench.baseNet(l))).size < legs.length;
      if (sameNet && PARTS[type].legs === 2) VL.ui.toast('Careful: both legs are in the same connected strip, so no current will go through this part.');
    }
    onPick(p) { this.sel = p && (p.kind === 'part' || p.kind === 'wire') ? p : null; this.renderInspector(); this.view && this.view.paintSel(); }
    removeSel() {
      if (!this.sel) return; this.snapshot();
      if (this.sel.kind === 'part') { const p = this.bench.parts.find(x => x.id === this.sel.id); this.bench.parts = this.bench.parts.filter(x => x.id !== this.sel.id); if (p && p.type === 'servo') this.bench.wires = this.bench.wires.filter(w => !w.a.startsWith('S:' + p.id) && !w.b.startsWith('S:' + p.id)); }
      else this.bench.wires.splice(this.sel.id, 1);
      this.sel = null; this.redraw();
    }
    recolour() {
      const N = this.bench.nets(); let k = 0;
      this.bench.wires.forEach(w => {
        if (w.color !== 'auto' && w.fixed) return;
        if (w.color !== 'auto' && !w.auto) { w.fixed = true; return; }
        const n = N.net(w.a); w.auto = true;
        w.color = n === N.f('GND') ? '#111827' : (n === N.f('5V') || n === N.f('3V3')) ? '#dc2626' : SIGC[k++ % SIGC.length];
      });
    }
    /* ---------- inspector & sensor controls ---------- */
    renderInspector() {
      const box = this.q('.l3-insp'); if (!box) return; const sel = this.sel;
      if (!sel) { box.innerHTML = `<p class="muted small">Click a hole or a pin to start a wire. Click a part above: it appears on the breadboard. Drag it to move it.</p>${this.lastSol ? '' : ''}`; return; }
      if (sel.kind === 'part') setTimeout(() => box.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { this.mode = 'moveleg'; this.pending = { id: sel.id, i: +b.dataset.mv }; this.status(`Click the new hole for the ${PARTS[this.bench.parts.find(x => x.id === sel.id).type].legNames[+b.dataset.mv]}. (Esc to cancel)`); }), 0);
      if (sel.kind === 'wire') { const w = this.bench.wires[sel.id]; if (!w) { box.innerHTML = ''; return; } box.innerHTML = `<b>Jumper wire</b><p class="small">${esc(this.pointName(w.a))} → ${esc(this.pointName(w.b))}</p><div class="row"><button class="btn-sm l3-del">Remove wire</button></div>`; box.querySelector('.l3-del').onclick = () => this.removeSel(); return; }
      const p = this.bench.parts.find(x => x.id === sel.id); if (!p) { box.innerHTML = ''; return; } const d = PARTS[p.type];
      let html = `<b>${esc(d.name)}</b><ul class="l3-legs">${p.legs.map((l, i) => `<li><span>${esc(d.legNames[i])}</span><code>${esc(l ? this.pointName(l).replace('Breadboard ', '') : '—')}</code>${d.legs === 2 && !d.offboard ? `<button class="btn-xs" data-mv="${i}">Move</button>` : ''}</li>`).join('')}</ul>${d.offboard ? '' : '<p class="muted small">Drag the part in 3D to move it.</p>'}`;
      if (p.type === 'led') html += `<label>Colour <select class="inp sm" data-prop="color">${Object.entries(LEDT).map(([k, v]) => `<option value="${k}" ${p.props.color === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label><button class="btn-xs" data-flip>Turn the LED around</button>${p.burnt ? '<p class="warn small">This LED burnt out (too much current). Add a resistor, then click Repair.</p><button class="btn-xs" data-repair>Repair</button>' : ''}`;
      if (p.type === 'resistor') html += `<label>Value <select class="inp sm" data-prop="r">${VL.RESISTOR_VALUES.map(r => `<option value="${r}" ${p.props.r === r ? 'selected' : ''}>${VL.fmtOhm(r)}</option>`).join('')}</select></label>`;
      const m = this.measure(p); if (m) html += `<p class="small l3-meas">${m}</p>`;
      html += `<div class="row"><button class="btn-sm l3-del">Remove part</button></div>`;
      box.innerHTML = html;
      box.querySelectorAll('[data-prop]').forEach(s => s.onchange = () => { this.snapshot(); const k = s.dataset.prop; p.props[k] = k === 'r' ? +s.value : s.value; this.redraw(); });
      const fl = box.querySelector('[data-flip]'); if (fl) fl.onclick = () => { this.snapshot(); p.legs.reverse(); this.redraw(); };
      const rp = box.querySelector('[data-repair]'); if (rp) rp.onclick = () => { p.burnt = false; this.redraw(); };
      box.querySelector('.l3-del').onclick = () => this.removeSel();
    }
    measure(p) {
      const s = this.lastSol; if (!s) return '';
      const v = i => { const x = s.volt(s.N.net(p.legs[i])); return x === null ? null : x; };
      const fv = x => x === null ? 'not connected' : x.toFixed(2) + ' V';
      const fi = i => i < 1e-6 ? '0 mA' : (i * 1000).toFixed(i < 0.001 ? 2 : 1) + ' mA';
      if (p.type === 'led') return `Voltage across: ${v(0) !== null && v(1) !== null ? (v(0) - v(1)).toFixed(2) + ' V' : '—'} · current: ${fi(s.cur[p.id] || 0)}`;
      if (p.type === 'resistor') return `Voltage across: ${v(0) !== null && v(1) !== null ? Math.abs(v(0) - v(1)).toFixed(2) + ' V' : '—'} · current: ${fi(Math.abs(s.cur[p.id] || 0))}`;
      if (p.type === 'pot') return `Wiper voltage: ${fv(v(1))}`;
      if (p.type === 'ldr' || p.type === 'button' || p.type === 'buzzer') return `Leg voltages: ${fv(v(0))} / ${fv(v(1))}`;
      if (['tmp36', 'pir', 'hcsr04', 'servo'].includes(p.type)) { const pw = this.bench.powered(p, s); return `Supply: ${pw.toFixed(2)} V ${p.type === 'hcsr04' && pw < 4.5 ? '(needs 5 V!)' : pw < 2.7 ? '(not powered)' : ''}${p.type === 'tmp36' ? ` · Vout: ${fv(v(1))}` : ''}`; }
      return '';
    }
    renderSensors() {
      const box = this.q('.l3-sensors'); if (!box) return;
      const ctl = this.bench.parts.filter(p => ['button', 'pot', 'ldr', 'tmp36', 'pir', 'hcsr04'].includes(p.type));
      if (!ctl.length) { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="l3-h">${VL.icon('target')} Sensor controls <span class="muted small">(the program reads these values)</span></div><div class="l3-sgrid">${ctl.map(p => {
        const n = PARTS[p.type].name;
        if (p.type === 'button') return `<div class="l3-s"><b>${n}</b><label>pressed during (s) <input class="inp sm" data-s="${p.id}" data-k="sched" value="${esc(p.props.sched || '')}" placeholder="1-2.5, 4-5"></label><label class="tog"><input type="checkbox" data-s="${p.id}" data-k="held" ${p.props.held ? 'checked' : ''}> held down all the time</label></div>`;
        if (p.type === 'pot') return `<div class="l3-s"><b>${n}</b><label>knob <input type="range" min="0" max="1" step="0.01" value="${p.props.pos}" data-s="${p.id}" data-k="pos"> <span>${Math.round(p.props.pos * 100)}%</span></label></div>`;
        if (p.type === 'ldr') return `<div class="l3-s"><b>${n}</b><label>light <input type="range" min="0" max="1" step="0.01" value="${p.props.light}" data-s="${p.id}" data-k="light"> <span>${p.props.light < 0.3 ? 'dark' : p.props.light < 0.7 ? 'room' : 'bright'}</span></label></div>`;
        if (p.type === 'tmp36') return `<div class="l3-s"><b>${n}</b><label>temperature <input type="range" min="-10" max="60" step="0.5" value="${p.props.temp}" data-s="${p.id}" data-k="temp"> <span>${p.props.temp} °C</span></label></div>`;
        if (p.type === 'pir') return `<div class="l3-s"><b>${n}</b><label>motion during (s) <input class="inp sm" data-s="${p.id}" data-k="sched" value="${esc(p.props.sched || '')}"></label></div>`;
        if (p.type === 'hcsr04') return `<div class="l3-s"><b>${n}</b><label>obstacle <input type="range" min="3" max="200" step="1" value="${p.props.cm}" data-s="${p.id}" data-k="cm"> <span>${p.props.cm} cm</span></label></div>`;
        return '';
      }).join('')}</div>`;
      box.querySelectorAll('[data-s]').forEach(el => { const ev = el.type === 'range' ? 'input' : 'change'; el.addEventListener(ev, () => { const p = this.bench.parts.find(x => x.id === el.dataset.s); const k = el.dataset.k; p.props[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; const sp = el.parentElement.querySelector('span'); if (sp) sp.textContent = k === 'pos' ? Math.round(p.props.pos * 100) + '%' : k === 'light' ? (p.props.light < 0.3 ? 'dark' : p.props.light < 0.7 ? 'room' : 'bright') : k === 'temp' ? p.props.temp + ' °C' : k === 'cm' ? p.props.cm + ' cm' : ''; if (k === 'pos' || k === 'cm') { if (this.view) this.view.redraw(this.bench); } this.save(); this.applyIdle(); }); });
    }
    /* ---------- simulation ---------- */
    sensorState(t) {
      const st = {};
      this.bench.parts.forEach(p => {
        if (p.type === 'button') st[p.id] = { pressed: !!p.props.held || parseSched(p.props.sched).some(([a, b]) => t >= a && t < b) };
        if (p.type === 'pir') st[p.id] = { motion: parseSched(p.props.sched).some(([a, b]) => t >= a && t < b) };
      });
      return st;
    }
    gpioPins() { const out = []; Object.values(this.bench.pins).forEach(p => { if (p && p.gpio !== null && p.gpio !== undefined) out.push(p.gpio); }); return [...new Set(out)]; }
    /* what does each GPIO read? (digital level or null = floating, analog voltage) */
    readInputs(st) {
      const vH = BOARD[this.boardId].vHigh; const N = this.bench.nets(); const res = {};
      const used = this.gpioPins().filter(g => { const net = N.f('G' + g); return this.bench.wires.some(w => N.net(w.a) === net || N.net(w.b) === net) || this.bench.parts.some(p => p.legs.some(l => l && N.net(l) === net)); });
      used.forEach(g => {
        const net = N.f('G' + g);
        const lo = this.bench.solveAll({}, Object.assign({}, st, { pulls: [[net, 0]] })), hi = this.bench.solveAll({}, Object.assign({}, st, { pulls: [[net, vH]] }));
        const a = lo.volt(net) || 0, b = hi.volt(net) || 0;
        res[g] = { v: (a + b) / 2, level: Math.abs(b - a) > vH / 2 ? null : ((a + b) / 2 > vH / 2 ? 1 : 0) };
      });
      return res;
    }
    buildCfg() {
      const cfg = { board: BOARD[this.boardId].runtime, inputs: {}, analog: {} };
      const times = new Set([0]); this.bench.parts.forEach(p => { if (p.type === 'button' || p.type === 'pir') parseSched(p.props.sched).forEach(([a, b]) => { times.add(a); times.add(b); }); });
      const T0 = [...times].sort((a, b) => a - b);
      T0.forEach(t => { const r = this.readInputs(this.sensorState(t)); Object.entries(r).forEach(([g, o]) => { (cfg.inputs[g] = cfg.inputs[g] || []).push([t, o.level]); if (t === 0) cfg.analog[g] = o.v; }); });
      const s0 = this.bench.solveAll({}, this.sensorState(0)); const N = s0.N;
      const sonar = this.bench.parts.find(p => p.type === 'hcsr04');
      if (sonar && this.bench.powered(sonar, s0) > 4.4) { const echoNet = N.net(sonar.legs[2]); const g = this.gpioPins().find(x => N.f('G' + x) === echoNet); if (g !== undefined) cfg.distance = { echo: g, cm: sonar.props.cm }; }
      return cfg;
    }
    applyIdle() { if (this.play && this.play.running) return; this.frameAt(null); }
    frameAt(t) {
      const outs = {}; const r = this.play && this.play.r; const stt = this.sensorState(t || 0);
      if (r) Object.keys(this.play.byPin).forEach(g => { outs[g] = this.avgAt(+g, t); });
      const key = JSON.stringify([outs, stt].map(o => JSON.stringify(o))) + this.bench.parts.length;
      let sol = this.cache && this.cache.k === key ? this.cache.s : null;
      if (!sol) { const ro = {}; Object.entries(outs).forEach(([g, v]) => ro[g] = Math.round(v * 20) / 20); sol = this.bench.solveAll(ro, stt); this.cache = { k: key, s: sol }; }
      this.lastSol = sol;
      const live = {}; let burnt = false;
      this.bench.parts.forEach(p => {
        if (p.type === 'led') { const I = sol.cur[p.id] || 0; if (I > 0.06 && !p.burnt && r) { p.burnt = true; burnt = p; } live[p.id] = { b: C.brightness(I) }; }
        if (p.type === 'rgb') live[p.id] = { rgb: ['r', 'g', 'b'].map(c => C.brightness(sol.cur[p.id + c] || 0)) };
        if (p.type === 'button') live[p.id] = { pressed: stt[p.id] && stt[p.id].pressed };
        if (p.type === 'pir') live[p.id] = { motion: stt[p.id] && stt[p.id].motion && this.bench.powered(p, sol) > 3 };
        if (p.type === 'buzzer') { const I = Math.abs(sol.cur[p.id] || 0); live[p.id] = { on: I > 0.002 }; }
        if (p.type === 'servo' && r) { const N = sol.N; const sig = N.net(p.legs[2]); const g = Object.keys(this.play.servoPins).find(x => N.f('G' + x) === sig); if (g !== undefined && this.bench.powered(p, sol) > 4) { let a = 90; for (const s of this.play.servoPins[g]) { if (s.t <= t) a = s.a; else break; } live[p.id] = { angle: a }; } }
      });
      if (burnt) { this.view && this.view.redraw(this.bench); this.sarraSay(`<p><b>Oh no, your ${LEDT[burnt.props.color].name.toLowerCase()} LED burnt out!</b> More than 60 mA went through it. An LED always needs a <b>resistor in series</b> (220–330 Ω) to limit the current.</p><p>Add a resistor between the pin and the LED's long leg, then click <b>Repair</b> in the inspector.</p>`); }
      if (this.view) this.view.live(live);
      const buzzOn = Object.values(live).some(x => x.on) && r && this.play.running; this.sound(buzzOn);
      if (this.sel && this.sel.kind === 'part' && (!this._mt || performance.now() - this._mt > 250)) { this._mt = performance.now(); const el = this.q('.l3-meas'); const p = this.bench.parts.find(x => x.id === this.sel.id); if (el && p) el.innerHTML = this.measure(p); }
      return { sol, live };
    }
    valAt(pin, t) { const ev = this.play.byPin[pin]; if (!ev) return 0; let v = 0; for (const e of ev) { if (e.t <= t) v = e.v; else break; } return v; }
    avgAt(pin, t) { const ev = this.play.byPin[pin]; if (!ev) return 0; const w = 40; let acc = 0, last = t - w, v = this.valAt(pin, t - w); for (const e of ev) { if (e.t <= t - w) continue; if (e.t > t) break; acc += v * (e.t - last); last = e.t; v = e.v; } acc += v * (t - last); return acc / w; }
    async run() {
      this.stop(true); this.ed.setError(0); const B = BOARD[this.boardId]; const ser = this.q('.l3-ser');
      ser.textContent = B.lang === 'cpp' ? 'Checking code…\nCompiling sketch for Arduino UNO…\n' : `Checking code…\nCopying main.py to the ${B.name}…\n`;
      this.bench.parts.forEach(p => { if (p.type === 'led') p.burnt = false; });
      const cfg = this.buildCfg(); const code = this.ed.value; let r;
      try { r = B.lang === 'cpp' ? await VL.Arduino.run(code, 10000, cfg) : await VL.Py.run(code, 10000, cfg); }
      catch (e) { ser.textContent += 'The simulator stopped unexpectedly.\n'; return; }
      r.events = r.events || []; r.serial = r.serial || []; r.servo = r.servo || [];
      const st = this.q('.cl-status');
      if (r.error) {
        this.ed.setError(r.error.line); const ce = r.error.type === 'TranslateError' || r.error.syntax;
        ser.textContent += ce ? 'Compilation error.\n' : (B.lang === 'cpp' ? 'Done uploading.\n' : 'Done. Program started.\n');
        st.className = 'cl-status err'; st.innerHTML = `<b>${r.error.type === 'TranslateError' ? 'Compile error' : esc(r.error.type)}</b>${r.error.line ? ' on line ' + r.error.line : ''}: ${esc(r.error.msg)}<br><span class="explainer">${VL.icon('bulb')} ${esc(VL.Py.explainError(r.error))}</span>`;
        VL.Store.mistake('RUNTIME');
      } else { ser.textContent += B.lang === 'cpp' ? 'Done uploading.\n' : 'Done. Program started.\n'; st.className = 'cl-status ok'; st.innerHTML = r.reason === 'time' ? 'Running: showing the first 10 s (the replay loops).' : r.reason === 'complete' ? `Program finished after ${(r.end / 1000).toFixed(2)} s.` : esc(r.reason || ''); if ((r.warnings || []).length) st.innerHTML += `<br><span class="warn">${r.warnings.map(esc).join('<br>')}</span>`; }
      const byPin = {}; r.events.forEach(e => (byPin[e.pin] = byPin[e.pin] || []).push(e));
      const servoPins = {}; r.servo.forEach(s => (servoPins[s.pin] = servoPins[s.pin] || []).push(s));
      this.cache = null;
      this.play = { r, byPin, servoPins, t: 0, end: Math.max(r.end || 0, 1), si: 0, running: !r.error || (r.events.length > 0), loop: r.reason === 'time' };
      this.lastRun = this.summarise(r, byPin); this.diag = { ledInfo: this.ledInfo(byPin) };
      VL.Store.p.runs++; VL.Store.save(); this.o.onRun && this.o.onRun(this);
    }
    stop(silent) { if (this.play) this.play.running = false; this.play = null; this.cache = null; this.stopSound(); this.frameAt(null); if (!silent) this.q('.clock').textContent = 't = 0.00 s'; }
    tick(now) {
      if (this.dead) return; this.raf = requestAnimationFrame(t => this.tick(t));
      const dt = this._l ? Math.min(100, now - this._l) : 16; this._l = now; const pl = this.play; if (!pl || !pl.running) return;
      pl.t += dt * +this.q('.speed').value;
      if (pl.t >= pl.end) { if (pl.loop) { pl.t %= pl.end; pl.si = 0; this.q('.l3-ser').textContent += '— replay restarts —\n'; } else { pl.t = pl.end; pl.running = false; } }
      const S = pl.r.serial; const ser = this.q('.l3-ser'); let add = '';
      while (pl.si < S.length && S[pl.si].t <= pl.t) add += S[pl.si++].text;
      if (add) { ser.textContent += add; if (ser.textContent.length > 20000) ser.textContent = ser.textContent.slice(-12000); ser.scrollTop = ser.scrollHeight; }
      this.frameAt(pl.t);
      const tr = pl.r.trace; if (tr && tr.length && tr[0][0] <= pl.t) { let lo = 0, hi = tr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tr[m][0] <= pl.t) lo = m; else hi = m - 1; } if (tr[lo][1] !== this._mk) { this._mk = tr[lo][1]; this.ed.setMark(this._mk); } }
      this.q('.clock').textContent = `t = ${(pl.t / 1000).toFixed(2)} s (virtual)`;
      if (!pl.running) this.ed.setMark(0);
    }
    /* LED on/off intervals (used by the challenges) */
    summarise(r, byPin) {
      const times = new Set([0, r.end || 0]); r.events.forEach(e => times.add(e.t)); const T0 = [...times].sort((a, b) => a - b);
      const leds = this.bench.parts.filter(p => p.type === 'led'); const pulses = leds.map(l => ({ led: { id: l.id, color: l.props.color }, pulses: [] }));
      const prevOn = leds.map(() => null);
      const step = T0.length > 400 ? Math.ceil(T0.length / 400) : 1;
      for (let i = 0; i < T0.length; i += step) {
        const t = T0[i]; const outs = {}; Object.keys(byPin).forEach(g => { outs[g] = Math.round(this.valAtR(byPin, +g, t) * 20) / 20; });
        const s = this.bench.solve(outs, this.sensorState(t));
        leds.forEach((l, j) => { const on = (s.cur[l.id] || 0) > 0.0005; if (on && prevOn[j] === null) prevOn[j] = t; if (!on && prevOn[j] !== null) { pulses[j].pulses.push([prevOn[j], t, false]); prevOn[j] = null; } });
      }
      leds.forEach((l, j) => { if (prevOn[j] !== null) pulses[j].pulses.push([prevOn[j], r.end || 0, false]); });
      return Object.assign({}, r, { pulses });
    }
    valAtR(byPin, pin, t) { const ev = byPin[pin]; if (!ev) return 0; let v = 0; for (const e of ev) { if (e.t <= t) v = e.v; else break; } return v; }
    ledInfo(byPin) {
      const leds = this.bench.parts.filter(p => p.type === 'led'); const pins = Object.keys(byPin).map(Number).concat(this.gpioPins()).filter((v, i, a) => a.indexOf(v) === i);
      return leds.map(l => ({ led: { id: l.id, color: l.props.color }, gpios: pins.filter(g => { const s = this.bench.solve({ [g]: 1 }, {}); return (s.cur[l.id] || 0) > 0.0005; }) }));
    }
    /* ---------- sound for the buzzer ---------- */
    sound(on) {
      if (!on) { this.stopSound(); return; }
      try { if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)(); if (!this.osc) { this.osc = this.ac.createOscillator(); this.gain = this.ac.createGain(); this.gain.gain.value = 0.04; this.osc.type = 'square'; this.osc.connect(this.gain).connect(this.ac.destination); this.osc.start(); }
        const tones = (this.play && this.play.r.tones) || []; let f = 880; for (const x of tones) { if (x[0] <= this.play.t) f = x[2] || 880; else break; } this.osc.frequency.value = f || 880; } catch (e) { }
    }
    stopSound() { try { if (this.osc) { this.osc.stop(); this.osc.disconnect(); } } catch (e) { } this.osc = null; }
    /* ---------- Mrs Sarra's hints ---------- */
    sarraSay(html) { if (!VL.Sarra) return; VL.Sarra.open(); const m = VL.Sarra.push('sarra', html, { kind: 'hint', text: html.replace(/<[^>]+>/g, ' ') }); if (m) m.offline = true; VL.Sarra.renderMsgs && VL.Sarra.renderMsgs(); }
    codePins() {
      const code = this.ed.value.split('\n').map(l => l.replace(/#.*/, '').replace(/\/\/.*/, '')).join('\n'); const pins = { out: new Set(), in: new Set(), pullup: false, analog: new Set() };
      const consts = {}; let m; const cre = /(?:const\s+)?(?:int|byte)\s+(\w+)\s*=\s*(A?\d+)\s*;|#define\s+(\w+)\s+(A?\d+)|^(\w+)\s*=\s*(\d+)\s*$/gm;
      while ((m = cre.exec(code))) consts[m[1] || m[3] || m[5]] = m[2] || m[4] || m[6];
      const val = x => { x = consts[x] !== undefined ? consts[x] : x; if (/^A\d$/.test(x)) return 14 + +x.slice(1); if (x === 'LED_BUILTIN') return 13; return /^\d+$/.test(x) ? +x : null; };
      const add = (set, x) => { const v = val(x); if (v !== null) set.add(v); };
      const R = (re, set) => { while ((m = re.exec(code))) add(set, m[1]); };
      R(/Pin\(\s*(\w+)\s*,\s*Pin\.OUT/g, pins.out); R(/PWM\(\s*Pin\(\s*(\w+)/g, pins.out); R(/pinMode\(\s*(\w+)\s*,\s*OUTPUT/g, pins.out); R(/(?:PWM)?LED\(\s*(\w+)/g, pins.out); R(/(?:Buzzer|Servo|AngularServo)\(\s*(\w+)/g, pins.out); R(/\.attach\(\s*(\w+)/g, pins.out); R(/tone\(\s*(\w+)/g, pins.out);
      R(/Pin\(\s*(\w+)\s*,\s*Pin\.IN/g, pins.in); R(/pinMode\(\s*(\w+)\s*,\s*INPUT/g, pins.in); R(/(?:Button|MotionSensor|LineSensor)\(\s*(\w+)/g, pins.in); R(/digitalRead\(\s*(\w+)/g, pins.in); R(/pulseIn\(\s*(\w+)/g, pins.in);
      R(/ADC\(\s*(?:Pin\()?\s*(\w+)/g, pins.analog); R(/analogRead\(\s*(\w+)/g, pins.analog);
      pins.pullup = /PULL_UP|INPUT_PULLUP|Button\(/.test(code);
      return pins;
    }
    issues() {
      const b = this.bench, B = BOARD[this.boardId], vH = B.vHigh, out = []; const cp = this.codePins(); const N = b.nets();
      const pinName = g => { const e = Object.entries(b.pins).find(([, p]) => p && p.gpio === g); return e ? e[1].label + (this.boardId === 'rpi' ? ` (pin ${e[0].slice(1)})` : '') : 'GPIO ' + g; };
      const netHas = (net) => b.wires.some(w => N.net(w.a) === net || N.net(w.b) === net) || b.parts.some(p => p.legs.some(l => l && N.net(l) === net));
      if (!b.parts.length && !b.wires.length) return [{ q: 'Your bench is empty. What do you want the board to control?', h: 'Start with the classic circuit: an LED and a resistor on the breadboard.', fix: `Click <b>LED</b> in the parts list and place its long leg (+) and short leg (−) in two different columns. Add a <b>Resistor</b> from a free hole in the LED's long-leg column to another column. Then wire that column to ${pinName([...cp.out][0] ?? (this.boardId === 'uno' ? 8 : this.boardId === 'rpi' ? 17 : 4))} and the LED's short-leg column to <b>GND</b>.` }];
      const outs = {}; cp.out.forEach(g => outs[g] = 1);
      const s = b.solveAll(outs, this.sensorState(0));
      b.parts.forEach(p => {
        const d = PARTS[p.type]; const nets = p.legs.map(l => l ? N.net(l) : null);
        if (d.legs === 2 && nets[0] === nets[1]) out.push({ q: `Look at the two legs of the ${d.name}: are they in the same column of 5 holes?`, h: 'The 5 holes of a column (a–e or f–j) are connected inside the breadboard, so both legs are joined.', fix: `Move one leg of the ${d.name} to another column (currently ${p.legs.map(l => this.pointName(l).replace('Breadboard ', '')).join(' and ')}).` });
      });
      cp.out.forEach(g => { const net = N.f('G' + g); if (!netHas(net)) out.push({ q: `Your code uses ${pinName(g)}. Is anything connected to that pin?`, h: `Follow the wire from the pin in your code: in the 3D view, ${pinName(g)} has no wire.`, fix: `Draw a jumper wire from <b>${pinName(g)}</b> on the board to the column of your resistor (or change the pin number in the code to the pin you wired).` }); });
      b.parts.filter(p => p.type === 'led').forEach(p => {
        const a = s.volt(N.net(p.legs[0])), c = s.volt(N.net(p.legs[1])); const I = s.cur[p.id] || 0; const name = `${LEDT[p.props.color].name.toLowerCase()} LED`;
        if (a !== null && c !== null && c - a > 1) out.push({ q: `Which leg of the ${name} is longer, and where does it go?`, h: 'An LED only lets current flow one way: from the long leg (+) to the short leg (−).', fix: `The ${name} is the wrong way round. Select it and click <b>Turn the LED around</b>, or swap its legs: long leg towards the pin, short leg towards GND.` });
        else if (I > 0.03) out.push({ q: `How much current flows through the ${name}?`, h: `About ${(I * 1000).toFixed(0)} mA: much more than the safe 10–20 mA. Something limits the current in a good LED circuit...`, fix: `Add a <b>220–330 Ω resistor</b> in series with the ${name} (pin → resistor → long leg). Without it the LED burns.` });
        else if (cp.out.size && I < 0.0003 && !p.burnt) {
          const cathodeToGnd = s.volt(N.net(p.legs[1])) !== null && N.net(p.legs[1]) === N.f('GND');
          const pathG = this.reachesGnd(p.legs[1]);
          if (!pathG) out.push({ q: `Where does the current go after the ${name}?`, h: 'Current needs a complete loop: from the pin, through the LED, and back to GND.', fix: `Connect the column of the LED's <b>short leg</b> to a <b>GND</b> pin with a black wire${cathodeToGnd ? '' : ' (or to the blue − rail, and the rail to GND)'}.` });
          else out.push({ q: `With the pin ON, does current reach the ${name}'s long leg?`, h: 'The long leg must be connected (through the resistor) to the pin used in your code.', fix: `Check that the resistor shares a column with the LED's long leg, and that a wire goes from the resistor's other column to <b>${pinName([...cp.out][0])}</b>.` });
        }
      });
      b.parts.filter(p => ['tmp36', 'pir', 'hcsr04', 'servo'].includes(p.type)).forEach(p => {
        const pw = b.powered(p, s); const d = PARTS[p.type];
        if (pw < 2.5) out.push({ q: `Does the ${d.name} have power?`, h: `Every sensor module needs two power connections: VCC (+) and GND (−).`, fix: `Wire the ${d.name}'s <b>${d.legNames[p.type === 'servo' ? 1 : 0]}</b> to ${p.type === 'hcsr04' || p.type === 'servo' ? '<b>5V</b>' : '<b>5V or 3V3</b>'} (red wire) and its <b>${d.legNames[p.type === 'servo' ? 0 : d.legs - 1]}</b> to <b>GND</b> (black wire).` });
        else if (p.type === 'hcsr04' && pw < 4.4) out.push({ q: 'What voltage does the HC-SR04 need?', h: 'The HC-SR04 is a 5 V sensor: at 3.3 V it does not measure.', fix: 'Move its VCC wire to the <b>5V</b> pin.' });
      });
      if (this.boardId !== 'uno') Object.entries(b.pins).forEach(([id, pin]) => { if (!pin || pin.gpio === null || pin.gpio === undefined) return; const v = s.volt(N.f('G' + pin.gpio)); if (v !== null && v > 3.6 && netHas(N.f('G' + pin.gpio))) out.push({ q: `What is the maximum voltage on a ${B.name} pin?`, h: 'This board works at 3.3 V: 5 V on a GPIO can destroy it.', fix: `${pin.label} is connected to 5 V. Use a voltage divider (e.g. 1 kΩ + 2 kΩ) or power the sensor from 3V3.` }); });
      const btn = b.parts.find(p => p.type === 'button');
      if (btn && cp.in.size && !cp.pullup) { const inp = this.readInputs({}); const fl = [...cp.in].find(g => inp[g] && inp[g].level === null); if (fl !== undefined) out.push({ q: 'What does your input pin read when the button is NOT pressed?', h: 'An input connected to nothing "floats": it reads random 0s and 1s.', fix: this.boardId === 'uno' ? 'Use <code>pinMode(pin, INPUT_PULLUP)</code>: the pin reads HIGH when released and LOW when pressed (button to GND).' : 'Use <code>Pin(n, Pin.IN, Pin.PULL_UP)</code> (or gpiozero <code>Button(n)</code>): released = 1, pressed = 0, with the button between the pin and GND.' }); }
      if (cp.in.size) [...cp.in].forEach(g => { if (!netHas(N.f('G' + g))) out.push({ q: `Your code reads ${pinName(g)}. What is connected to it?`, h: 'The program reads a pin that has no wire.', fix: `Wire the sensor or button to <b>${pinName(g)}</b>, or change the pin number in your code.` }); });
      return out;
    }
    reachesGnd(key) { const N = this.bench.nets(); const start = N.net(key); const gnd = N.f('GND'); const seen = new Set([start]); const st = [start]; while (st.length) { const n = st.pop(); if (n === gnd) return true; this.bench.parts.forEach(p => { const ns = p.legs.map(l => l && N.net(l)); if (ns.includes(n)) ns.forEach(x => { if (x && !seen.has(x)) { seen.add(x); st.push(x); } }); }); } return false; }
    hint() {
      const list = this.issues(); this.hintLevel = this.hintLevel || {};
      if (!list.length) { this.sarraSay(`<p><b>Your circuit looks right!</b> ${VL.icon('check')} Every part is powered and connected the right way.</p><p>Press <b>${BOARD[this.boardId].lang === 'cpp' ? 'Upload & run' : 'Run'}</b> and watch the board. Then try changing a value in the code: what happens?</p>`); return; }
      const it = list[0]; const k = it.fix.slice(0, 40); const lvl = this.hintLevel[k] = Math.min(3, (this.hintLevel[k] || 0) + 1);
      const lab = ['Think about it', 'A clue', 'Here is the fix'][lvl - 1];
      this.sarraSay(`<p class="hint-l">${VL.icon('bulb')} <b>Hint ${lvl}/3 · ${lab}</b></p><p>${lvl === 1 ? it.q : lvl === 2 ? it.h : it.fix}</p>${lvl < 3 ? '<p class="muted small">Press the hint button again if you need more help.</p>' : (list.length > 1 ? `<p class="muted small">After this, there ${list.length - 1 === 1 ? 'is 1 more thing' : 'are ' + (list.length - 1) + ' more things'} to check.</p>` : '')}`);
      VL.Store.hint('LAB3D', lvl);
    }
    describe() { return { board: BOARD[this.boardId].name, parts: this.bench.parts.map(p => ({ type: p.type, legs: p.legs.map(l => l && this.pointName(l)), props: p.props })), wires: this.bench.wires.map(w => [this.pointName(w.a), this.pointName(w.b)]), code: this.ed.value, issues: this.issues().map(i => i.fix.replace(/<[^>]+>/g, '')) }; }
  }
  /* small part icons for the parts list */
  function partIcon(k) {
    const s = { led: '<path d="M8 20V12a4 4 0 0 1 8 0v8z" fill="#ef4444"/><path d="M10 20v3M14 20v2" stroke="#cbd5e1" stroke-width="1.5"/>', resistor: '<rect x="6" y="9" width="12" height="6" rx="3" fill="#d9c49b"/><path d="M2 12h4M18 12h4" stroke="#cbd5e1" stroke-width="1.5"/><path d="M9 9v6M11.5 9v6M14 9v6" stroke="#b91c1c" stroke-width="1.4"/>', button: '<rect x="5" y="8" width="14" height="10" rx="1.5" fill="#1f2937"/><circle cx="12" cy="11" r="3.5" fill="#ef4444"/>', buzzer: '<circle cx="12" cy="12" r="8" fill="#111827" stroke="#475569"/><circle cx="12" cy="12" r="1.5" fill="#000"/>', ldr: '<circle cx="12" cy="11" r="6" fill="#b45309"/><path d="M8 9h8M8 11h8M8 13h8" stroke="#fde68a" stroke-width="1"/>', rgb: '<path d="M8 20V12a4 4 0 0 1 8 0v8z" fill="url(#rg)"/><defs><linearGradient id="rg"><stop offset="0" stop-color="#ef4444"/><stop offset=".5" stop-color="#22c55e"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>', pot: '<rect x="5" y="10" width="14" height="10" fill="#1d4ed8"/><circle cx="12" cy="9" r="4" fill="#f8fafc"/>', tmp36: '<path d="M8 18V10a4 4 0 0 1 8 0v8z" fill="#111827"/><path d="M10 18v4M12 18v4M14 18v4" stroke="#cbd5e1"/>', pir: '<rect x="4" y="14" width="16" height="4" fill="#166534"/><path d="M5 14a7 7 0 0 1 14 0z" fill="#f8fafc"/>', hcsr04: '<rect x="2" y="7" width="20" height="10" rx="1" fill="#1d4ed8"/><circle cx="7.5" cy="12" r="3.3" fill="#d1d5db"/><circle cx="16.5" cy="12" r="3.3" fill="#d1d5db"/>', servo: '<rect x="4" y="8" width="13" height="10" fill="#1d4ed8"/><rect x="11" y="4" width="10" height="2.5" rx="1.2" fill="#f8fafc"/>' }[k] || '';
    return `<svg viewBox="0 0 24 24" width="30" height="30">${s}</svg>`;
  }
  VL.Lab3D = Lab3D;
})();
