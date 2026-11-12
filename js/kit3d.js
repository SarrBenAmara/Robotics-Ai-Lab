/* =========================================================================
   kit3d.js : 3D practice scene. The board (ESP32 / Arduino UNO / Pico /
   Raspberry Pi), a breadboard, the lesson's components and colour-coded
   jumper wires (GND black, power red, signals coloured), with labelled
   callouts and live animation (LEDs glow, servo turns, motor spins…).
   Units: millimetres.
   ========================================================================= */
(function () {
  const T = () => window.THREE;
  const SIG = ['#facc15', '#22c55e', '#3b82f6', '#f97316', '#a855f7', '#06b6d4', '#f472b6', '#e5e7eb'];
  VL.WIRE = { gnd: '#111827', vcc: '#dc2626', sig: SIG };
  /* Raspberry Pi 40-pin header (physical order) and Pico pinout */
  VL.RPI_HEADER = ['3V3', '5V', 'GPIO2 SDA', '5V', 'GPIO3 SCL', 'GND', 'GPIO4', 'GPIO14 TXD', 'GND', 'GPIO15 RXD', 'GPIO17', 'GPIO18 PWM0', 'GPIO27', 'GND', 'GPIO22', 'GPIO23', '3V3', 'GPIO24', 'GPIO10 MOSI', 'GND', 'GPIO9 MISO', 'GPIO25', 'GPIO11 SCLK', 'GPIO8 CE0', 'GND', 'GPIO7 CE1', 'GPIO0 ID_SD', 'GPIO1 ID_SC', 'GPIO5', 'GND', 'GPIO6', 'GPIO12 PWM0', 'GPIO13 PWM1', 'GND', 'GPIO19 PWM1', 'GPIO16', 'GPIO26', 'GPIO20', 'GND', 'GPIO21'];
  VL.PICO_PINS = ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7', 'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15', 'GP16', 'GP17', 'GND', 'GP18', 'GP19', 'GP20', 'GP21', 'GND', 'GP22', 'RUN', 'GP26', 'GP27', 'AGND', 'GP28', 'ADC_VREF', '3V3(OUT)', '3V3_EN', 'GND', 'VSYS', 'VBUS'];
  const BOARD_INFO = {
    esp32: { name: 'ESP32-DevKitC V4', specs: [['Chip', 'ESP32-WROOM-32, dual-core Xtensa LX6, 240 MHz'], ['Memory', '520 KB SRAM, 4 MB flash'], ['Wireless', 'Wi-Fi 802.11 b/g/n + Bluetooth 4.2/BLE'], ['Logic level', '3.3 V (pins are NOT 5 V tolerant)'], ['GPIO', '34 GPIO (some input-only), 18 ADC channels (12-bit), 2 DAC'], ['Interfaces', 'UART, SPI, I2C, PWM on any output pin, touch sensors'], ['Power', 'USB 5 V → on-board 3.3 V regulator']] },
    uno: { name: 'Arduino UNO R3', specs: [['Chip', 'ATmega328P, 8-bit AVR, 16 MHz'], ['Memory', '32 KB flash, 2 KB SRAM, 1 KB EEPROM'], ['Logic level', '5 V'], ['Digital I/O', '14 pins (6 with PWM: 3, 5, 6, 9, 10, 11)'], ['Analog in', '6 pins A0–A5, 10-bit (0–1023)'], ['Current', '20 mA recommended per pin (40 mA absolute max)'], ['Power', 'USB 5 V or 7–12 V on the DC jack']] },
    pico: { name: 'Raspberry Pi Pico', specs: [['Chip', 'RP2040, dual-core Arm Cortex-M0+, 133 MHz'], ['Memory', '264 KB SRAM, 2 MB flash'], ['Logic level', '3.3 V'], ['GPIO', '26 multi-function GPIO (GP0–GP28)'], ['Analog in', '3 ADC pins (GP26–28), 12-bit, plus internal temperature sensor'], ['Special', '8 programmable I/O (PIO) state machines'], ['On-board LED', 'GP25 (Pin("LED") on Pico W)']] },
    rpi: { name: 'Raspberry Pi 5', specs: [['Processor', 'Broadcom BCM2712, quad-core Cortex-A76, 2.4 GHz'], ['Memory', '2–16 GB LPDDR4X'], ['OS', 'Raspberry Pi OS (Linux)'], ['GPIO', '40-pin header, 3.3 V logic (NOT 5 V tolerant)'], ['Connectivity', 'Wi-Fi, Bluetooth 5.0, Gigabit Ethernet, 2× USB 3, 2× USB 2'], ['Video', '2× micro-HDMI (4K)'], ['Power', '5 V / 5 A USB-C']] }
  };
  VL.BOARD_INFO = BOARD_INFO;
  const DEV_INFO = {
    led: ['LED + 220 Ω resistor', 'The resistor limits the current. Long leg (anode) toward the signal, short leg (cathode) toward GND.'],
    button: ['Push button', 'Connects its legs while pressed. With a pull-up resistor the pin reads 1 when released and 0 when pressed.'],
    pot: ['Potentiometer', 'A knob that is a voltage divider: the middle pin (wiper) gives 0 V to 3.3 V/5 V depending on the position.'],
    servo: ['SG90 servo motor', 'Turns to an angle (0–180°) set by the length of a pulse sent every 20 ms. Brown = GND, red = power, orange = signal.'],
    motor: ['DC motor + H-bridge driver', 'The driver (like an L298N) switches the motor current. IN1/IN2 set the direction, EN (PWM) sets the speed.'],
    buzzer: ['Piezo buzzer', 'Vibrates at the frequency you send (tone/PWM) and makes a sound.'],
    oled: ['OLED display 128×64 (SSD1306)', 'A small screen controlled over I2C (address 0x3C). Draw text and shapes, then call show().'],
    i2c: ['TMP102 temperature sensor', 'An I2C sensor at address 0x48 that sends the temperature as two bytes.'],
    wifi: ['Wi-Fi router (virtual)', 'Network "VirtualLab", password "robotics123". A virtual cloud receives HTTP requests.'],
    dist: ['HC-SR04 ultrasonic sensor', 'TRIG sends a sound burst, ECHO stays HIGH for the echo time. distance = time × 0.0343 / 2 cm.'],
    touch: ['Touch pad', 'A copper pad connected to an ESP32 touch pin. touch.read() drops (≈120) when a finger touches it.'],
    rgb: ['RGB LED (common cathode)', 'Three LEDs (red, green, blue) in one package. Mix colours with PWM on each pin.'],
    robot: ['2-wheel robot', 'Two DC motors with a driver, an ultrasonic sensor or two line sensors. See the arena below.']
  };
  VL.DEV_INFO = DEV_INFO;

  class Kit3D extends VL.Explorer3D {
    constructor(host, opts = {}) {
      super(host, opts); this.labelsOn = true; this.dev = []; this.callouts = [];
      this.over = document.createElement('div'); this.over.className = 'k3-over'; host.appendChild(this.over);
      this.state = {};
    }
    dispose() { super.dispose(); this.over.remove(); }
    loop() { if (!this.alive) return; requestAnimationFrame(() => this.loop()); if (this.anim) this.anim(); if (this.liveAnim) this.liveAnim(); if (!this.needs || !this.over) return; this.needs = false; this.updateCam(); this.renderer.render(this.scene, this.camera); this.drawCallouts(); }
    /* ---------------- helpers ---------------- */
    mat(c, o) { return new (T().MeshStandardMaterial)(Object.assign({ color: c, roughness: 0.55, metalness: 0.08 }, o || {})); }
    box(w, h, d, c, x, y, z, o, parent) { const m = new (T().Mesh)(new (T().BoxGeometry)(w, h, d), this.mat(c, o)); m.position.set(x, y, z); (parent || this.root).add(m); return m; }
    cyl(r, h, c, x, y, z, o, parent, seg = 20) { const m = new (T().Mesh)(new (T().CylinderGeometry)(r, r, h, seg), this.mat(c, o)); m.position.set(x, y, z); (parent || this.root).add(m); return m; }
    tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new (T().CanvasTexture)(c); t.colorSpace = T().SRGBColorSpace; t.anisotropy = 4; return t; }
    world(obj, v) { obj.updateWorldMatrix(true, false); return obj.localToWorld(v.clone()); }
    wire(a, b, color, lift = 14) {
      const THREE = T(); const up = new THREE.Vector3(0, 1, 0);
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y = Math.max(a.y, b.y) + lift + a.distanceTo(b) * 0.12;
      const curve = new THREE.CatmullRomCurve3([a, a.clone().add(up.clone().multiplyScalar(4)), mid, b.clone().add(up.clone().multiplyScalar(4)), b]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.55, 8, false), this.mat(color, { roughness: 0.4 }));
      this.root.add(m); [a, b].forEach(p => { const tip = this.cyl(0.8, 2.4, '#d1d5db', p.x, p.y + 1, p.z, { metalness: 0.8 }); }); return m;
    }
    /* ---------------- scene ---------------- */
    setKit(board, kit) {
      this.clear(); this.dev = []; this.callouts = []; this.boardId = board; const THREE = T();
      this.baseR = 210; this.minR = 60; this.orbit.radius = 210; this.orbit.theta = -0.35; this.orbit.phi = 0.9; this.orbit.target.set(10, 0, 8);
      const g = this.buildBoard(board); this.boardG = g; this.boardG.updateWorldMatrix(true, true);
      const BBT = ['led', 'rgb', 'button', 'touch', 'pot', 'buzzer', 'servo', 'motor', 'oled', 'i2c', 'dist'];
      kit.forEach(d => { if (d.type === 'led' && this.onboard && this.onboard[d.pin] && (board === 'pico' || /on-?board|built/i.test(d.label || ''))) d.onboard = true; });
      const needBB = kit.some(d => BBT.includes(d.type) && !d.onboard);
      if (!needBB) { this.dev = kit.map((d, i) => ({ d, i, onboardPin: d.onboard ? d.pin : null })); this.callouts = this.boardCallouts.slice(); kit.forEach((d, i) => { if (d.type === 'wifi') { const p = new THREE.Vector3(40, 0, 10); this.dev[i].wifi = this.routerModel(p); this.callouts.push({ p: p.clone().add(new THREE.Vector3(0, 30, 0)), t: DEV_INFO.wifi[0], s: 'SSID VirtualLab', dev: i }); } if (d.type === 'robot') { const p = new THREE.Vector3(40, 0, 10); this.robotModel(p); this.callouts.push({ p: p.clone().add(new THREE.Vector3(0, 22, 0)), t: DEV_INFO.robot[0], s: 'See the arena', dev: i }); } if (d.onboard) this.callouts.push({ p: this.onboardPos(d.pin), t: d.label || 'On-board LED', s: this.pinName(d.pin), dev: i }); }); const extra = kit.some(d => d.type === 'wifi' || d.type === 'robot'); const gp = this.boardG.position; this.view('iso'); this.orbit.radius = extra ? 175 : (board === 'pico' || board === 'esp32' ? 95 : 155); this.orbit.target.set(extra ? (gp.x + 40) / 2 : gp.x, 0, extra ? 5 : 0); this.setupAnim(); this.needs = true; return; }
      // breadboard
      const bb = new THREE.Group(); bb.position.set(48, 0, 4); this.root.add(bb); this.bbG = bb;
      const bbTex = this.tex(820, 540, (x, w, h) => { x.fillStyle = '#f3f4f6'; x.fillRect(0, 0, w, h); x.fillStyle = '#d1d5db'; x.fillRect(0, h / 2 - 12, w, 24); [[34, '#dc2626'], [80, '#2563eb'], [h - 80, '#dc2626'], [h - 34, '#2563eb']].forEach(([y, c]) => { x.fillStyle = c; x.fillRect(20, y + (y < h / 2 ? -20 : 18), w - 40, 3); }); x.fillStyle = '#4b5563'; for (let c = 0; c < 30; c++) { for (let r = 0; r < 5; r++) { x.fillRect(30 + c * 26, 130 + r * 26, 10, 10); x.fillRect(30 + c * 26, 300 + r * 26, 10, 10); } [30, 64, h - 74, h - 40].forEach(y => { if (c % 6 !== 5) x.fillRect(30 + c * 26, y, 10, 10); }); } });
      const bbm = new THREE.Mesh(new THREE.BoxGeometry(82, 8, 54), [this.mat('#e5e7eb'), this.mat('#e5e7eb'), new THREE.MeshStandardMaterial({ map: bbTex, roughness: 0.7 }), this.mat('#e5e7eb'), this.mat('#e5e7eb'), this.mat('#e5e7eb')]);
      bbm.position.y = 4; bb.add(bbm); this.addPart(bbm, 'breadboard');
      const bbTop = 8;
      // ground / power rails on breadboard (connected to board)
      const railG = this.world(bb, new THREE.Vector3(-36, bbTop, 23)), railV = this.world(bb, new THREE.Vector3(-36, bbTop, 19));
      const gndPin = this.boardPin('GND'), vccPin = this.boardPin(board === 'uno' ? '5V' : '3V3');
      this.wire(gndPin, railG, VL.WIRE.gnd, 10); this.wire(vccPin, railV, VL.WIRE.vcc, 14);
      let slot = 0, out = 0, sigI = 0; const sigColor = () => SIG[sigI++ % SIG.length];
      const onBB = () => { const x = -30 + (slot++) * 15; return this.world(bb, new THREE.Vector3(x, bbTop, 0)); };
      const offBB = () => { const p = new THREE.Vector3(30 + (out % 2) * 52, 0, 62 + Math.floor(out / 2) * 34); out++; return p; };
      const gndRailAt = x => this.world(bb, new THREE.Vector3(x, bbTop, 23)), vccRailAt = x => this.world(bb, new THREE.Vector3(x, bbTop, 19));
      kit.forEach((d, i) => {
        const D = { d, i };
        const sp = this.boardPinGpio(d.pin);
        const local = p => bb.worldToLocal(p.clone());
        if (d.onboard) { D.onboardPin = d.pin; this.callouts.push({ p: this.onboardPos(d.pin), t: d.label || 'On-board LED', s: this.pinName(d.pin), dev: i }); this.dev.push(D); return; }
        if (d.type === 'led' || d.type === 'rgb') {
          const base = onBB(); const lx = local(base).x;
          if (d.type === 'led') { D.led = this.ledModel(base, d.color || 'red'); this.resistorModel(base.clone().add(new THREE.Vector3(0, 0, -12)));
            if (sp) this.wire(sp, base.clone().add(new THREE.Vector3(0, 0, -20)), d.wireColor || sigColor()); this.wire(base.clone().add(new THREE.Vector3(2.5, 0, 6)), gndRailAt(lx + 2.5), VL.WIRE.gnd, 4);
            D.anchor = base.clone().add(new THREE.Vector3(0, 12, 0)); }
          else { D.rgb = this.rgbModel(base); ['r', 'g', 'b'].forEach((k, j) => { const p = this.boardPinGpio(d.pins[k]); if (p) this.wire(p, base.clone().add(new THREE.Vector3(-3 + j * 3, 0, -14)), ['#ef4444', '#22c55e', '#3b82f6'][j]); }); this.wire(base.clone().add(new THREE.Vector3(1, 0, 6)), gndRailAt(lx + 1), VL.WIRE.gnd, 4); D.anchor = base.clone().add(new THREE.Vector3(0, 12, 0)); }
        } else if (d.type === 'button' || d.type === 'touch') {
          const base = onBB(); const lx = local(base).x;
          if (d.type === 'button') { D.btn = this.buttonModel(base); } else { D.btn = this.box(12, 0.6, 12, '#b45309', base.x, base.y + 0.3, base.z, { metalness: 0.9, roughness: 0.3 }); this.addPart(D.btn, 'dev' + i); }
          if (sp) this.wire(sp, base.clone().add(new THREE.Vector3(-4, 0, -9)), d.wireColor || sigColor());
          if (d.type === 'button') this.wire(base.clone().add(new THREE.Vector3(4, 0, 9)), d.wiring === 'vcc' ? vccRailAt(lx + 4) : gndRailAt(lx + 4), d.wiring === 'vcc' ? VL.WIRE.vcc : VL.WIRE.gnd, 4);
          D.anchor = base.clone().add(new THREE.Vector3(0, 8, 0));
        } else if (d.type === 'pot') {
          const base = onBB(); const lx = local(base).x; D.pot = d.look ? this.sensorModel(base, d.look) : this.potModel(base);
          if (sp) this.wire(sp, base.clone().add(new THREE.Vector3(0, 0, -11)), d.wireColor || sigColor());
          this.wire(base.clone().add(new THREE.Vector3(-5, 0, 8)), gndRailAt(lx - 5), VL.WIRE.gnd, 4); this.wire(base.clone().add(new THREE.Vector3(5, 0, 8)), vccRailAt(lx + 5), VL.WIRE.vcc, 6);
          D.anchor = base.clone().add(new THREE.Vector3(0, 14, 0));
        } else if (d.type === 'buzzer') {
          const base = onBB(); const lx = local(base).x; D.buz = this.cyl(6, 8, '#111827', base.x, base.y + 4, base.z, { roughness: 0.4 }); this.addPart(D.buz, 'dev' + i); this.cyl(1, 0.3, '#374151', base.x, base.y + 8.2, base.z);
          if (sp) this.wire(sp, base.clone().add(new THREE.Vector3(-3, 0, -9)), d.wireColor || sigColor()); this.wire(base.clone().add(new THREE.Vector3(3, 0, 8)), gndRailAt(lx + 3), VL.WIRE.gnd, 4);
          D.anchor = base.clone().add(new THREE.Vector3(0, 12, 0));
        } else {
          const p = offBB(); D.anchor = p.clone().add(new THREE.Vector3(0, 16, 0));
          if (d.type === 'servo') { D.servo = this.servoModel(p); const sg = this.boardPinGpio(d.pin); if (sg) this.wire(sg, p.clone().add(new THREE.Vector3(-14, 6, 0)), '#f97316'); this.wire(gndRailAt(30), p.clone().add(new THREE.Vector3(-14, 6, 2)), '#78350f', 6); this.wire(vccRailAt(32), p.clone().add(new THREE.Vector3(-14, 6, -2)), VL.WIRE.vcc, 8); }
          else if (d.type === 'motor') { D.motor = this.motorModel(p); [['in1', 0], ['in2', 1], ['en', 2]].forEach(([k, j]) => { const q = this.boardPinGpio(d.pins[k]); if (q) this.wire(q, p.clone().add(new THREE.Vector3(-18 + j * 4, 4, -10)), [SIG[0], SIG[1], SIG[2]][j]); }); this.wire(gndRailAt(34), p.clone().add(new THREE.Vector3(-6, 4, -10)), VL.WIRE.gnd, 6); }
          else if (d.type === 'oled') { D.oled = this.oledModel(p); const sda = this.boardPinGpio(d.sda || (board === 'uno' ? 18 : 21)), scl = this.boardPinGpio(d.scl || (board === 'uno' ? 19 : 22)); if (sda) this.wire(sda, p.clone().add(new THREE.Vector3(-4, 3, -12)), '#22c55e'); if (scl) this.wire(scl, p.clone().add(new THREE.Vector3(0, 3, -12)), '#3b82f6'); this.wire(gndRailAt(36), p.clone().add(new THREE.Vector3(4, 3, -12)), VL.WIRE.gnd, 6); this.wire(vccRailAt(38), p.clone().add(new THREE.Vector3(8, 3, -12)), VL.WIRE.vcc, 8); }
          else if (d.type === 'i2c') { this.i2cModel(p, i); const sda = this.boardPinGpio(d.sda), scl = this.boardPinGpio(d.scl); if (sda) this.wire(sda, p.clone().add(new THREE.Vector3(-3, 2, -8)), '#22c55e'); if (scl) this.wire(scl, p.clone().add(new THREE.Vector3(1, 2, -8)), '#3b82f6'); this.wire(gndRailAt(28), p.clone().add(new THREE.Vector3(5, 2, -8)), VL.WIRE.gnd, 6); this.wire(vccRailAt(26), p.clone().add(new THREE.Vector3(-7, 2, -8)), VL.WIRE.vcc, 8); }
          else if (d.type === 'dist') { this.distModel(p, i); const tr = this.boardPinGpio(d.pins.trig), ec = this.boardPinGpio(d.pins.echo); if (tr) this.wire(tr, p.clone().add(new THREE.Vector3(-2, 2, 4)), '#facc15'); if (ec) this.wire(ec, p.clone().add(new THREE.Vector3(2, 2, 4)), '#22c55e'); this.wire(gndRailAt(24), p.clone().add(new THREE.Vector3(6, 2, 4)), VL.WIRE.gnd, 6); this.wire(vccRailAt(22), p.clone().add(new THREE.Vector3(-6, 2, 4)), VL.WIRE.vcc, 8); }
          else if (d.type === 'wifi') { D.wifi = this.routerModel(p, i); }
          else if (d.type === 'robot') { this.robotModel(p, i); }
          else if (d.type === 'dashboard') { out--; D.anchor = null; }
        }
        if (D.anchor && DEV_INFO[d.type]) this.callouts.push({ p: D.anchor, t: d.label || DEV_INFO[d.type][0], s: this.pinText(d), dev: i });
        this.dev.push(D);
      });
      // board callouts
      (this.boardCallouts || []).forEach(c => this.callouts.push(c));
      this.view('iso'); this.orbit.radius = 185; this.orbit.target.set(8, 0, 16); this.setupAnim(); this.needs = true;
    }
    onboardPos(pin) { const m = this.onboard && this.onboard[pin]; if (!m) return new (T().Vector3)(); const v = new (T().Vector3)(); m.getWorldPosition(v); return v; }
    setupAnim() {
      const t0 = performance.now();
      this.liveAnim = () => { const t = (performance.now() - t0) / 1000; this.dev.forEach(D => { if (D.motor && D.motorSpeed) { D.motor.wheel.rotation.x += D.motorSpeed * 0.25; this.needs = true; } if (D.buz && D.tone) { D.buz.scale.setScalar(1 + 0.06 * Math.sin(t * 60)); this.needs = true; } if (D.wifi && D.wifiOn) { D.wifi.rings.forEach((r, j) => { const k = ((t * 0.8 + j / 3) % 1); r.scale.setScalar(0.5 + k * 1.6); r.material.opacity = 0.7 * (1 - k); }); this.needs = true; } }); };
    }
    pinText(d) { const n = p => this.pinName(p); if (d.type === 'led' || d.type === 'buzzer' || d.type === 'touch' || d.type === 'servo') return `${n(d.pin)} → ${d.type === 'led' ? '220 Ω → LED → GND' : d.type === 'servo' ? 'signal (orange)' : 'GND'}`; if (d.type === 'button') return `${n(d.pin)} → button → ${d.wiring === 'vcc' ? 'VCC' : 'GND'}`; if (d.type === 'pot') return `wiper → ${n(d.pin)}`; if (d.type === 'motor') return `IN1 ${n(d.pins.in1)} · IN2 ${n(d.pins.in2)}${d.pins.en !== undefined ? ' · EN ' + n(d.pins.en) : ''}`; if (d.type === 'rgb') return `R ${n(d.pins.r)} · G ${n(d.pins.g)} · B ${n(d.pins.b)}`; if (d.type === 'oled' || d.type === 'i2c') return `SDA ${n(d.sda || 21)} · SCL ${n(d.scl || 22)}`; if (d.type === 'dist') return `TRIG ${n(d.pins.trig)} · ECHO ${n(d.pins.echo)}`; return ''; }
    pinName(p) { const b = this.boardId; if (p === undefined || p === null) return '?'; if (b === 'uno') return p >= 14 ? 'A' + (p - 14) : 'D' + p; if (b === 'rpi') return 'GPIO' + p; if (b === 'pico') return 'GP' + p; return 'GPIO' + p; }

    /* ---------------- boards ---------------- */
    buildBoard(board) {
      const THREE = T(); this.pinPosMap = {}; this.boardCallouts = []; let g;
      if (board === 'esp32') {
        this.buildESP32(); g = this.root.children[this.root.children.length - 1]; g.position.set(-42, 2, 0); g.rotation.y = Math.PI / 2;
        VL.BOARDS.esp32.pins.forEach(p => { const m = this.pinMeshes[p.id]; if (m) this.pinPosMap[p.id] = { pos: m.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), pin: p }; });
        this.onboard = null;
        this.boardCallouts = [{ local: [0, 4, -17], t: 'ESP32-WROOM-32 module', s: 'Dual-core 240 MHz, Wi-Fi + Bluetooth' }, { local: [0, 3, 26], t: 'Micro-USB', s: 'Power + programming' }, { local: [-12.7, 3, -24.4], t: 'Header J2', s: 'Left pins: 3V3, EN, inputs…' }, { local: [12.7, 3, -24.4], t: 'Header J3', s: 'Right pins: GND, GPIO 23…' }];
      } else if (board === 'uno') {
        g = this.buildUNO(); g.position.set(-46, 0, 0);
        this.boardCallouts = [{ local: [-30, 13, -12], t: 'USB port', s: 'Programming + 5 V power' }, { local: [8, 6, 12], t: 'ATmega328P', s: 'Runs your sketch, 16 MHz' }, { local: [14, 11, -24], t: 'Digital pins D0–D13', s: '~ marks PWM pins' }, { local: [-30, 13, 18], t: 'Power jack', s: '7–12 V external power' }, { local: [-2, 11, 24], t: 'Power pins', s: '5V, 3.3V, GND, VIN' }, { local: [20, 11, 24], t: 'Analog pins A0–A5', s: 'analogRead 0–1023' }];
      } else if (board === 'pico') {
        g = new THREE.Group(); this.root.add(g); g.position.set(-40, 0, 0); g.rotation.y = Math.PI / 2;
        const pcbTex = this.tex(420, 1020, (x, w, h) => { x.fillStyle = '#15803d'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = 'bold 30px Arial'; x.save(); x.translate(w / 2, h / 2 + 140); x.rotate(-Math.PI / 2); x.fillText('Raspberry Pi Pico', -120, 0); x.restore(); x.font = '16px Arial'; VL.PICO_PINS.forEach((l, i) => { const left = i < 20; const yy = left ? 60 + i * 47 : 60 + (39 - i) * 47; x.textAlign = left ? 'left' : 'right'; x.fillText(l, left ? 40 : w - 40, yy + 5); }); });
        const pcb = new THREE.Mesh(new THREE.BoxGeometry(21, 1, 51), [this.mat('#14532d'), this.mat('#14532d'), new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.6 }), this.mat('#14532d'), this.mat('#14532d'), this.mat('#14532d')]); pcb.position.y = 0.5; g.add(pcb); this.addPart(pcb, 'pico-pcb');
        const chip = this.box(7, 1, 7, '#18181b', 0, 1.4, 4, {}, g); this.addPart(chip, 'pico-chip');
        const usb = this.box(8, 2.6, 5.6, '#c0c6ce', 0, 2.2, -24, { metalness: 0.85 }, g); this.addPart(usb, 'pico-usb');
        const bs = this.box(3, 1.6, 4, '#f8fafc', -4, 1.8, -15, {}, g); this.addPart(bs, 'pico-bootsel');
        this.onboard = { 25: this.box(1.4, 0.8, 2, '#22c55e', 4, 1.4, -20, { emissive: '#000' }, g) };
        VL.PICO_PINS.forEach((l, i) => { const left = i < 20; const z = left ? -24.13 + i * 2.54 : -24.13 + (39 - i) * 2.54; const x = left ? -8.89 : 8.89; this.cyl(0.9, 0.2, '#d4af37', x, 1.1, z, { metalness: 0.9 }, g); const gp = (l.match(/^GP(\d+)$/) || [])[1]; this.pinPosMap['P' + (i + 1)] = { pos: new THREE.Vector3(x, 1.3, z), pin: { label: l, gpio: gp !== undefined ? +gp : null, type: /GND/.test(l) ? 'ground' : /3V3/.test(l) ? 'power' : 'gpio' } }; });
        this.boardCallouts = [{ local: [0, 3, 4], t: 'RP2040 chip', s: 'Dual-core 133 MHz' }, { local: [0, 4, -24], t: 'Micro-USB', s: 'Power + MicroPython REPL' }];
      } else {
        g = this.buildRPI(); g.position.set(-50, 0, 0);
        this.boardCallouts = [{ local: [-6, 6, 6], t: 'BCM2712 processor', s: 'Quad-core 2.4 GHz, runs Linux' }, { local: [-6, 8, -23.5], t: 'GPIO header (40 pins)', s: 'Use BCM numbers in code' }, { local: [40, 18, 0], t: 'USB + Ethernet', s: 'Keyboard, mouse, network' }];
      }
      this.boardCallouts = this.boardCallouts.map(c => ({ p: this.world(g, new THREE.Vector3(...c.local)), t: c.t, s: c.s, board: true }));
      Object.values(this.pinPosMap).forEach(o => { o.world = this.world(g, o.pos); });
      return g;
    }
    /* realistic Arduino UNO R3 (68.6 × 53.3 mm, real header positions) */
    buildUNO() {
      const THREE = T(); this.pinPosMap = {}; this.boardCallouts = []; const g = new THREE.Group(); this.root.add(g);
      const W = 68.58, D = 53.34, S = 24; const X = x => (x + W / 2) * S, Z = z => (z + D / 2) * S;
      const dig = (i) => i < 10 ? -16.76 + i * 2.54 : 10.16 + (i - 10) * 2.54; // SCL..D8 then D7..D0
      const pwr = i => -5.08 + i * 2.54, ana = i => 15.24 + i * 2.54;
      const tex = this.tex(Math.round(W * S), Math.round(D * S), (x, w, h) => {
        x.fillStyle = '#0b67a8'; x.fillRect(0, 0, w, h);
        const gr = x.createRadialGradient(w * 0.6, h * 0.45, 50, w * 0.6, h * 0.45, w * 0.8); gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.15)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
        x.strokeStyle = 'rgba(120,190,255,0.22)'; x.lineWidth = 0.35 * S; // copper traces under the mask
        for (let i = 0; i < 46; i++) { x.beginPath(); const sx = X(-30 + (i * 37) % 60), sz = Z(-20 + (i * 23) % 40); x.moveTo(sx, sz); x.lineTo(sx + ((i % 3) - 1) * 8 * S, sz); x.lineTo(sx + ((i % 3) - 1) * 8 * S, sz + ((i % 2) ? 6 : -6) * S); x.stroke(); }
        x.fillStyle = '#f8fafc'; x.strokeStyle = '#f8fafc'; x.textAlign = 'center'; x.textBaseline = 'middle';
        const vt = (t, xx, zz, size, rot = -Math.PI / 2) => { x.save(); x.translate(X(xx), Z(zz)); x.rotate(rot); x.font = `bold ${size * S}px Arial`; x.fillText(t, 0, 0); x.restore(); };
        ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8', '7', '~6', '~5', '4', '~3', '2', 'TX→1', 'RX←0'].forEach((t, i) => vt(t, dig(i), -19.4, 1.25));
        ['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'].forEach((t, i) => vt(t, pwr(i), 19.6, 1.2));
        ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].forEach((t, i) => vt(t, ana(i), 20.2, 1.3));
        x.font = `bold ${1.6 * S}px Arial`; x.fillText('DIGITAL (PWM~)', X(14), Z(-15.6)); x.fillText('POWER', X(2.5), Z(15.2)); x.fillText('ANALOG IN', X(21.6), Z(15.2));
        // logo
        x.lineWidth = 0.9 * S; x.beginPath(); x.ellipse(X(14.5), Z(1.5), 3.2 * S, 2.6 * S, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(X(21), Z(1.5), 3.2 * S, 2.6 * S, 0, 0, Math.PI * 2); x.stroke();
        x.font = `bold ${2.6 * S}px Arial`; x.fillText('−', X(14.5), Z(1.3)); x.fillText('+', X(21), Z(1.5));
        x.font = `bold ${3.4 * S}px Arial Black, Arial`; x.fillText('ARDUINO', X(18), Z(6.8));
        x.lineWidth = 0.5 * S; x.strokeRect(X(10.5), Z(9.5), 15 * S, 5 * S); x.font = `bold ${3.6 * S}px Arial`; x.fillText('UNO', X(18), Z(12.1));
        x.font = `${1.1 * S}px Arial`; x.fillText('MADE IN ITALY', X(-12), Z(17.5)); x.fillText('ICSP', X(30.5), Z(-6.5));
        x.font = `bold ${1.1 * S}px Arial`; [['L', -7.5, -15.8], ['TX', -7.5, -11.6], ['RX', -7.5, -9.6], ['ON', 23, -7.4]].forEach(([t, a, b]) => x.fillText(t, X(a - 2.6), Z(b)));
        // mounting holes
        [[-19.1, -24.1], [32.5, -21.6], [32.5, 6.4], [-20.3, 24.1]].forEach(([a, b]) => { x.fillStyle = '#d4af37'; x.beginPath(); x.arc(X(a), Z(b), 2.2 * S, 0, Math.PI * 2); x.fill(); x.fillStyle = '#0b1020'; x.beginPath(); x.arc(X(a), Z(b), 1.6 * S, 0, Math.PI * 2); x.fill(); });
      });
      tex.anisotropy = 8;
      const edge = this.mat('#0a4f80', { roughness: 0.6 });
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(W, 1.6, D), [edge, edge, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.05 }), this.mat('#08395c'), edge, edge]);
      pcb.position.y = 0.8; g.add(pcb); this.addPart(pcb, 'uno-pcb');
      const box = (w, h, d, c, x, y, z, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(c, o)); m.position.set(x, y, z); g.add(m); return m; };
      const cyl = (r, h, c, x, y, z, o, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), this.mat(c, o)); m.position.set(x, y, z); g.add(m); return m; };
      // USB-B and DC jack (overhanging the left edge)
      const usb = box(16, 11, 12, '#c7ccd3', -31.5, 7.1, -11.4, { metalness: 0.92, roughness: 0.22 }); box(1, 7, 8, '#3f3f46', -39.6, 7.6, -11.4); box(0.6, 3, 5, '#e5e7eb', -40.0, 7.6, -11.4, { metalness: 0.5 });
      const jack = box(14.5, 11, 9, '#141414', -32, 7.1, 19.2, { roughness: 0.5 }); cyl(3.2, 1, '#050505', -39.3, 7.6, 19.2).rotation.z = Math.PI / 2;
      // ATmega328P (DIP-28) with legs and marking
      const chipTex = this.tex(720, 160, (x, w, h) => { x.fillStyle = '#18181b'; x.fillRect(0, 0, w, h); x.fillStyle = '#a1a1aa'; x.font = 'bold 34px Arial'; x.fillText('ATMEGA328P-PU', 60, 70); x.font = '26px Arial'; x.fillText('AU 1952  ◦  ARDUINO', 60, 115); x.beginPath(); x.arc(20, 80, 10, 0, 7); x.fill(); });
      const dip = new THREE.Mesh(new THREE.BoxGeometry(35.5, 3.6, 7.6), [this.mat('#18181b'), this.mat('#18181b'), new THREE.MeshStandardMaterial({ map: chipTex, roughness: 0.5 }), this.mat('#18181b'), this.mat('#18181b'), this.mat('#18181b')]);
      dip.position.set(9.6, 4.3, 10.4); g.add(dip); this.addPart(dip, 'uno-chip');
      box(37.5, 1.2, 10, '#111', 9.6, 2.1, 10.4);
      for (let i = 0; i < 14; i++) [-1, 1].forEach(sd => { const l = box(0.5, 3, 0.25, '#d4d4d8', -7 + i * 2.54, 3.1, 10.4 + sd * 4.1, { metalness: 0.9, roughness: 0.25 }); l.rotation.x = sd * 0.25; });
      // ATmega16U2, crystal, regulator, capacitors, reset, LEDs, ICSP
      box(5, 1, 5, '#18181b', -18, 2.1, -11.5); box(4, 1, 4, '#18181b', -10.5, 2.1, -3.5);
      const xt = cyl(1.8, 4.6, '#d4d4d8', 2.2, 2.6, -3.8, { metalness: 0.95, roughness: 0.15 }); xt.rotation.z = Math.PI / 2; xt.scale.set(1, 1, 2.1);
      box(6.5, 1.6, 3.6, '#1f1f1f', -22.5, 2.4, 12.2); box(6.5, 0.4, 2, '#c7ccd3', -22.5, 2.2, 14.8, { metalness: 0.9 });
      [[-17.5, 8.5], [-11.5, 8.5]].forEach(([a, b]) => { cyl(3.1, 5.6, '#c7ccd3', a, 4.4, b, { metalness: 0.85, roughness: 0.3 }); cyl(3.05, 0.25, '#1f2937', a, 7.25, b); });
      box(6, 3.2, 6, '#e5e7eb', -27.2, 3.2, -22.2, { roughness: 0.35 }); cyl(1.7, 1.2, '#ef4444', -27.2, 5.4, -22.2);
      this.onboard = { 13: box(2, 0.8, 1.2, '#fbbf24', -8, 2, -15.8, { emissive: '#000' }) };
      box(2, 0.8, 1.2, '#fbbf24', -8, 2, -11.6); box(2, 0.8, 1.2, '#fbbf24', -8, 2, -9.6);
      box(2, 0.8, 1.2, '#22c55e', 22, 2, -7.4, { emissive: '#22c55e', emissiveIntensity: 1.2 });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { box(2.54, 2.5, 2.54, '#111', 30.5 + j * 2.54 - 1.27, 2.85, -3.2 + i * 2.54); box(0.64, 6, 0.64, '#d4af37', 30.5 + j * 2.54 - 1.27, 4.6, -3.2 + i * 2.54, { metalness: 0.95, roughness: 0.2 }); }
      [[0.8, 3, 1.6, 4, -4], [0.8, 3, 1.6, 26, 2], [0.8, 3, 1.6, -2, 18]].forEach(([a, b, c, xx, zz]) => box(a * 2, 1, c, '#7c2d12', xx, 2, zz));
      // female headers with a square opening on top of every pin
      const holeTex = n => this.tex(64 * n, 64, (x, w) => { x.fillStyle = '#121212'; x.fillRect(0, 0, w, 64); for (let i = 0; i < n; i++) { x.fillStyle = '#000'; x.fillRect(i * 64 + 20, 20, 24, 24); x.fillStyle = '#3a3a3a'; x.fillRect(i * 64 + 26, 26, 12, 12); } });
      const header = (n, x0, z) => { const blk = this.mat('#151515', { roughness: 0.55 }); const m = new THREE.Mesh(new THREE.BoxGeometry(n * 2.54, 8.5, 2.54), [blk, blk, new THREE.MeshStandardMaterial({ map: holeTex(n), roughness: 0.6 }), blk, blk, blk]); m.position.set(x0 + (n - 1) * 1.27, 5.85, z); g.add(m); return m; };
      header(10, dig(0), -24.13); header(8, dig(10), -24.13); header(8, pwr(-1), 24.13); header(6, ana(0), 24.13);
      const R = VL.BOARDS.uno.pins.filter(p => p.side === 'R'), Lp = VL.BOARDS.uno.pins.filter(p => p.side === 'L');
      R.forEach((p, i) => { this.pinPosMap[p.id] = { pos: new THREE.Vector3(dig(i), 10.2, -24.13), pin: p }; });
      Lp.forEach((p, i) => { this.pinPosMap[p.id] = { pos: new THREE.Vector3(i < 7 ? pwr(i) : ana(i - 7), 10.2, 24.13), pin: p }; });
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return g;
    }
    /* Raspberry Pi 5 with a real 40-pin header */
    buildRPI() {
      const THREE = T(); this.pinPosMap = {}; this.boardCallouts = []; const g = new THREE.Group(); this.root.add(g);
      const W = 85, D = 56, S = 20; const X = x => (x + W / 2) * S, Z = z => (z + D / 2) * S;
      const tex = this.tex(W * S, D * S, (x, w, h) => {
        x.fillStyle = '#0f7a3a'; x.fillRect(0, 0, w, h);
        x.strokeStyle = 'rgba(180,255,200,0.16)'; x.lineWidth = 6; for (let i = 0; i < 40; i++) { x.beginPath(); x.moveTo(X(-40 + (i * 17) % 70), Z(-25 + (i * 11) % 45)); x.lineTo(X(-40 + (i * 17) % 70) + 160, Z(-25 + (i * 11) % 45)); x.lineTo(X(-40 + (i * 17) % 70) + 160, Z(-25 + (i * 11) % 45) + 120); x.stroke(); }
        x.fillStyle = '#f0fdf4'; x.font = `bold ${3 * S}px Arial`; x.fillText('Raspberry Pi 5', X(-22), Z(14)); x.font = `${1.4 * S}px Arial`; x.fillText('© Raspberry Pi Ltd · 2023', X(-22), Z(18));
        x.font = `bold ${1.1 * S}px Arial`; x.fillText('GPIO', X(-34), Z(-19.5)); x.fillText('1', X(-31.3), Z(-19.5)); x.fillText('39', X(16.3), Z(-19.5));
        [[-38.5, -24.5], [19.5, -24.5], [-38.5, 24.5], [19.5, 24.5]].forEach(([a, b]) => { x.fillStyle = '#d4af37'; x.beginPath(); x.arc(X(a), Z(b), 3.1 * S, 0, 7); x.fill(); x.fillStyle = '#0b1020'; x.beginPath(); x.arc(X(a), Z(b), 1.4 * S, 0, 7); x.fill(); });
      });
      const edge = this.mat('#0b5f2c');
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(W, 1.4, D), [edge, edge, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }), edge, edge, edge]); pcb.position.y = 0.7; g.add(pcb); this.addPart(pcb, 'rpi-pcb');
      const box = (w, h, d, c, x, y, z, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(c, o)); m.position.set(x, y, z); g.add(m); return m; };
      const socTex = this.tex(256, 256, (x) => { x.fillStyle = '#c7ccd3'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#52525b'; x.font = 'bold 30px Arial'; x.fillText('BROADCOM', 34, 110); x.font = '24px Arial'; x.fillText('BCM2712', 66, 150); });
      const soc = new THREE.Mesh(new THREE.BoxGeometry(14, 2.2, 14), [this.mat('#9ca3af'), this.mat('#9ca3af'), new THREE.MeshStandardMaterial({ map: socTex, metalness: 0.85, roughness: 0.3 }), this.mat('#9ca3af'), this.mat('#9ca3af'), this.mat('#9ca3af')]); soc.position.set(-14, 2.5, 2); g.add(soc); this.addPart(soc, 'rpi-soc');
      box(12, 1.3, 10, '#18181b', 4, 2, 2); box(9, 1.2, 9, '#18181b', 18, 2, 8);
      // USB 2/3 stacks and Ethernet on the right edge
      [[-10, '#111827'], [8, '#1d4ed8']].forEach(([z, c], k) => { const u = box(17.5, 16, 13.5, '#c7ccd3', 36.5, 8.7, z, { metalness: 0.9, roughness: 0.25 }); [4.5, 12.5].forEach(yy => box(1, 4, 11, c, 45.3, yy, z)); });
      const eth = box(21, 13.5, 16, '#c7ccd3', 35, 7.5, -26 + 8 + 30, { metalness: 0.9, roughness: 0.25 }); eth.position.set(34.5, 7.5, 21.5);
      box(1, 9, 12, '#111', 45.1, 7.5, 21.5);
      // USB-C and micro-HDMI on the near edge
      box(9, 3.3, 7.5, '#c7ccd3', -31, 2.9, 25, { metalness: 0.9 }); [[-17.5], [-4]].forEach(([x]) => box(7, 3, 7.5, '#c7ccd3', x, 2.8, 25, { metalness: 0.9 }));
      box(3, 2, 3, '#e5e7eb', -40, 2.3, 21); // power button
      // fan header and PCIe connector
      box(4, 3, 2, '#f5f5f4', 18, 2.6, -6); box(16, 1.5, 3, '#e7e5e4', -36, 1.9, 0);
      // 40-pin GPIO header (2 × 20) near the far edge
      box(51, 2.6, 5.08, '#111214', -6.1, 2.7, -23.5, { roughness: 0.5 });
      VL.RPI_HEADER.forEach((l, i) => { const col = Math.floor(i / 2), row = i % 2; const x = -6.1 - 24.13 + col * 2.54, z = -23.5 + (row ? -1.27 : 1.27); box(0.64, 6.4, 0.64, '#d4af37', x, 5.2, z, { metalness: 0.95, roughness: 0.2 }); const gp = (l.match(/GPIO(\d+)/) || [])[1]; this.pinPosMap['H' + (i + 1)] = { pos: new THREE.Vector3(x, 8.5, z), pin: { label: l, gpio: gp !== undefined ? +gp : null, type: /GND/.test(l) ? 'ground' : /3V3/.test(l) ? 'power' : /5V/.test(l) ? 'power5' : 'gpio' } }; });
      this.onboard = null;
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return g;
    }
    boardPin(label) {
      const ent = Object.values(this.pinPosMap).find(o => o.pin.label === label || (label === 'GND' && o.pin.type === 'ground') || (label === '3V3' && (o.pin.label === '3.3V' || /^3V3/.test(o.pin.label))));
      return ent ? ent.world.clone() : new (T().Vector3)(-40, 2, 0);
    }
    boardPinGpio(gp) {
      if (gp === undefined || gp === null) return null;
      const ent = Object.values(this.pinPosMap).find(o => o.pin.gpio === gp && o.pin.type !== 'i2c') || Object.values(this.pinPosMap).find(o => o.pin.gpio === gp);
      return ent ? ent.world.clone() : null;
    }
    /* ---------------- components ---------------- */
    ledModel(p, color) {
      const THREE = T(); const lt = VL.LED_TYPES[color] || VL.LED_TYPES.red; const col = new THREE.Color(lt.color);
      const g = new THREE.Group(); g.position.copy(p); this.root.add(g);
      const lens = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.6, roughness: 0.15, emissive: col, emissiveIntensity: 0.05 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 5, 24), lens); body.position.y = 9; g.add(body);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lens); dome.position.y = 11.5; g.add(dome);
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 1, 24), lens); fl.position.y = 6.5; g.add(fl);
      [[-1.27, 6.5], [1.27, 6]].forEach(([x, h]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, h, 6), this.mat('#cbd5e1', { metalness: 0.9 })); l.position.set(x, h / 2, 0); g.add(l); });
      const light = new THREE.PointLight(col, 0, 40, 1.8); light.position.y = 10; g.add(light);
      [body, dome, fl].forEach(m => { m.userData.pick = { kind: 'dev', id: 'led' }; this.pickables.push(m); });
      return { lens, light, col };
    }
    resistorModel(p) { const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); const b = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 4, 6, 12), this.mat('#d8c39a')); b.rotation.z = Math.PI / 2; b.position.y = 3; g.add(b); [[-1.2, '#d42020'], [-0.2, '#d42020'], [0.8, '#7b3f1d'], [2, '#c9a227']].forEach(([x, c]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.45, 16), this.mat(c)); r.rotation.z = Math.PI / 2; r.position.set(x, 3, 0); g.add(r); }); const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 10, 6), this.mat('#cbd5e1', { metalness: 0.9 })); lead.rotation.z = Math.PI / 2; lead.position.y = 3; g.add(lead); }
    rgbModel(p) { const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); const lens = new THREE.MeshStandardMaterial({ color: '#f8fafc', transparent: true, opacity: 0.55, emissive: '#000', roughness: 0.2 }); const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 5, 24), lens); body.position.y = 9; g.add(body); const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lens); dome.position.y = 11.5; g.add(dome); const light = new THREE.PointLight('#fff', 0, 40, 1.8); light.position.y = 10; g.add(light); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 6), this.mat('#cbd5e1', { metalness: 0.9 })); l.position.set(-1.9 + i * 1.27, 3, 0); g.add(l); } return { lens, light }; }
    buttonModel(p) { const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); const base = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 12), this.mat('#1f2937')); base.position.y = 1.75; g.add(base); const plate = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 12), this.mat('#d1d5db', { metalness: 0.8 })); plate.position.y = 3.7; g.add(plate); const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 3, 24), this.mat('#ef4444')); cap.position.y = 5.2; g.add(cap); [base, cap].forEach(m => { m.userData.pick = { kind: 'dev', id: 'button' }; this.pickables.push(m); }); return { cap }; }
    potModel(p) { const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); const body = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), this.mat('#1d4ed8')); body.position.y = 2.5; g.add(body); const knob = new THREE.Group(); knob.position.y = 5; g.add(knob); const k = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 6, 24), this.mat('#e5e7eb')); k.position.y = 3; knob.add(k); const mark = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 3), this.mat('#111827')); mark.position.set(0, 6.1, 1.5); knob.add(mark); [body, k].forEach(m => { m.userData.pick = { kind: 'dev', id: 'pot' }; this.pickables.push(m); }); return { knob }; }
    sensorModel(p, look) {
      const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); let parts = [];
      if (look === 'tmp36') { const b = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5, 24, 1, false, 0, Math.PI), this.mat('#111827')); b.position.y = 8; b.rotation.y = Math.PI / 2; g.add(b); const f = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5, 0.2), this.mat('#1f2937')); f.position.set(0, 8, 0); g.add(f); [-1.27, 0, 1.27].forEach(x => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 6), this.mat('#cbd5e1', { metalness: 0.9 })); l.position.set(x, 3, 0); g.add(l); }); parts = [b, f]; }
      else if (look === 'soil') { const pcb = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 40), this.mat('#111827')); pcb.position.set(0, 2, 18); g.add(pcb); const tip = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 6), this.mat('#d4af37', { metalness: 0.7 })); tip.position.set(0, 2, 40); g.add(tip); const soil = new THREE.Mesh(new THREE.CylinderGeometry(14, 11, 12, 28), this.mat('#78350f', { roughness: 0.95 })); soil.position.set(0, -4, 34); g.add(soil); parts = [pcb, soil]; }
      else { const b = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 1.5, 24), this.mat('#ef4444')); b.position.y = 7; g.add(b); const top = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.2, 24), this.mat('#facc15')); top.position.y = 7.8; g.add(top); [-1, 1].forEach(x => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 6), this.mat('#cbd5e1', { metalness: 0.9 })); l.position.set(x, 3.5, 0); g.add(l); }); parts = [b]; }
      parts.forEach(m => { m.userData.pick = { kind: 'dev', id: 'pot' }; this.pickables.push(m); });
      return { knob: new THREE.Group() };
    }
    servoModel(p) { const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); const body = new THREE.Mesh(new THREE.BoxGeometry(23, 22, 12.5), this.mat('#1d4ed8', { roughness: 0.4 })); body.position.y = 11; g.add(body); const tab = new THREE.Mesh(new THREE.BoxGeometry(32, 2.5, 12.5), this.mat('#1d4ed8')); tab.position.y = 16; g.add(tab); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 4, 16), this.mat('#f8fafc')); shaft.position.set(6, 24, 0); g.add(shaft); const horn = new THREE.Group(); horn.position.set(6, 26, 0); g.add(horn); const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 16), this.mat('#f8fafc')); arm.position.z = 6; horn.add(arm); body.userData.pick = { kind: 'dev', id: 'servo' }; this.pickables.push(body); return { horn }; }
    motorModel(p) { const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); const drv = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 22), this.mat('#b91c1c')); drv.position.set(-12, 1, -16); g.add(drv); const hs = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 4), this.mat('#111827', { metalness: 0.6 })); hs.position.set(-12, 7, -20); g.add(hs); const m = new THREE.Mesh(new THREE.BoxGeometry(22, 18, 19), this.mat('#facc15', { roughness: 0.5 })); m.position.set(8, 9, 0); g.add(m); const wheel = new THREE.Group(); wheel.position.set(24, 14, 0); g.add(wheel); const tire = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 7, 32), this.mat('#111827')); tire.rotation.z = Math.PI / 2; wheel.add(tire); const hub = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 7.4, 6), this.mat('#facc15')); hub.rotation.z = Math.PI / 2; wheel.add(hub); [drv, m, tire].forEach(x => { x.userData.pick = { kind: 'dev', id: 'motor' }; this.pickables.push(x); }); return { wheel }; }
    oledModel(p) { const THREE = T(); const g = new THREE.Group(); g.position.copy(p); this.root.add(g); const pcb = new THREE.Mesh(new THREE.BoxGeometry(27, 1.6, 28), this.mat('#1e3a8a')); pcb.position.y = 1; g.add(pcb); const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; const scr = new THREE.Mesh(new THREE.PlaneGeometry(24, 13), new THREE.MeshBasicMaterial({ map: t })); scr.rotation.x = -Math.PI / 2; scr.position.set(0, 1.9, 1); g.add(scr); const ctx = c.getContext('2d'); ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, 256, 128); t.needsUpdate = true; pcb.userData.pick = { kind: 'dev', id: 'oled' }; this.pickables.push(pcb, scr); return { c, ctx, t }; }
    i2cModel(p) { const THREE = T(); const b = this.box(14, 1.6, 12, '#7e22ce', p.x, p.y + 1, p.z); this.box(3, 1, 3, '#111827', p.x, p.y + 2.2, p.z); b.userData.pick = { kind: 'dev', id: 'i2c' }; this.pickables.push(b); }
    distModel(p) { const THREE = T(); const b = this.box(45, 1.6, 20, '#1d4ed8', p.x, p.y + 8, p.z); b.rotation.x = -Math.PI / 2.4; [-13, 13].forEach(x => { const c = this.cyl(8, 12, '#d1d5db', p.x + x, p.y + 12, p.z - 4, { metalness: 0.8 }); c.rotation.x = Math.PI / 2 - Math.PI / 2.4; }); b.userData.pick = { kind: 'dev', id: 'dist' }; this.pickables.push(b); }
    routerModel(p) { const THREE = T(); const b = this.box(36, 7, 22, '#0f172a', p.x, p.y + 3.5, p.z); [-12, 12].forEach(x => { const a = this.cyl(1, 22, '#111827', p.x + x, p.y + 17, p.z - 9); }); const led = this.box(14, 1, 1, '#22c55e', p.x, p.y + 6, p.z + 11, { emissive: '#22c55e', emissiveIntensity: 0.6 }); const rings = []; for (let j = 0; j < 3; j++) { const r = new THREE.Mesh(new THREE.TorusGeometry(10, 0.5, 6, 32, Math.PI), new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0 })); r.position.set(p.x, p.y + 30, p.z - 9); this.root.add(r); rings.push(r); } b.userData.pick = { kind: 'dev', id: 'wifi' }; this.pickables.push(b); return { rings }; }
    robotModel(p) { const THREE = T(); const ch = this.box(40, 4, 30, '#1e3a8a', p.x, p.y + 10, p.z); [-1, 1].forEach(s => { const w = this.cyl(10, 6, '#111827', p.x - 6, p.y + 10, p.z + s * 19); w.rotation.x = Math.PI / 2; this.cyl(6, 6.4, '#facc15', p.x - 6, p.y + 10, p.z + s * 19).rotation.x = Math.PI / 2; }); this.box(6, 12, 30, '#1d4ed8', p.x + 20, p.y + 16, p.z); [-7, 7].forEach(z => { const c = this.cyl(4, 6, '#d1d5db', p.x + 24, p.y + 18, p.z + z, { metalness: 0.8 }); c.rotation.z = Math.PI / 2; }); ch.userData.pick = { kind: 'dev', id: 'robot' }; this.pickables.push(ch); }

    /* ---------------- live state ---------------- */
    setLive(st) {
      // st: { led(i)->0..1, rgb(i)->[r,g,b], pressed(i)->bool, pot(i)->0..1, servo(i)->deg, motor(i)->speed(-1..1), tone(i)->Hz, oled(i)->ops, wifi(i)->bool, onboard {pin:0..1} }
      const THREE = T();
      this.dev.forEach((D, i) => {
        const s = st[i]; if (s === undefined) return;
        if (D.onboardPin != null && this.onboard && this.onboard[D.onboardPin]) { const m = this.onboard[D.onboardPin]; m.material.emissive.set(s > 0 ? m.material.color : '#000'); m.material.emissiveIntensity = s * 2.5; }
        if (D.led) { const b = Math.max(0, Math.min(1, s)); D.led.lens.emissiveIntensity = 0.05 + b * 2.2; D.led.lens.opacity = 0.6 + b * 0.35; D.led.light.intensity = b * 260; }
        if (D.rgb) { const [r, g, b] = s; const c = new THREE.Color(r, g, b); D.rgb.lens.emissive = c; D.rgb.lens.emissiveIntensity = 1.6; D.rgb.light.color = c; D.rgb.light.intensity = (r + g + b) * 120; }
        if (D.btn && D.btn.cap) { D.btn.cap.position.y = s ? 4.3 : 5.2; D.btn.cap.material.emissive && D.btn.cap.material.emissive.set(s ? '#22d3ee' : '#000'); D.btn.cap.material.emissiveIntensity = s ? 0.5 : 0; }
        else if (D.btn) { D.btn.material.emissive.set(s ? '#22d3ee' : '#000'); D.btn.material.emissiveIntensity = s ? 0.6 : 0; }
        if (D.pot) D.pot.knob.rotation.y = -(s * 270 - 135) * Math.PI / 180;
        if (D.servo) D.servo.horn.rotation.y = (s - 90) * Math.PI / 180;
        if (D.motor !== undefined && D.motor) D.motorSpeed = s;
        if (D.buz) D.tone = s;
        if (D.wifi) D.wifiOn = s;
        if (D.oled && s && s !== D._lastOps) { D._lastOps = s; this.drawOled(D.oled, s); }
      });
      if (this.onboard && st.onboard) Object.entries(this.onboard).forEach(([pin, m]) => { const b = st.onboard[pin] || 0; m.material.emissive.set(b > 0 ? m.material.color : '#000'); m.material.emissiveIntensity = b * 2; });
      this.needs = true;
    }
    drawOled(o, ops) {
      const x = o.ctx; const sx = 2, sy = 2; x.fillStyle = '#020617'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#7dd3fc'; x.strokeStyle = '#7dd3fc'; x.font = 'bold 17px "JetBrains Mono", monospace'; x.textBaseline = 'top';
      (ops || []).forEach(op => { const [k, ...a] = op; const c = a[a.length - 1];
        if (k === 'fill') { x.fillStyle = a[0] ? '#7dd3fc' : '#020617'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#7dd3fc'; }
        else if (k === 'text') { x.fillStyle = a[3] ? '#7dd3fc' : '#020617'; x.fillText(a[0], a[1] * sx, a[2] * sy); x.fillStyle = '#7dd3fc'; }
        else if (k === 'pixel') { x.fillStyle = a[2] ? '#7dd3fc' : '#020617'; x.fillRect(a[0] * sx, a[1] * sy, sx, sy); }
        else if (k === 'rect') { x.strokeStyle = c ? '#7dd3fc' : '#020617'; x.lineWidth = 2; x.strokeRect(a[0] * sx, a[1] * sy, a[2] * sx, a[3] * sy); }
        else if (k === 'fill_rect') { x.fillStyle = c ? '#7dd3fc' : '#020617'; x.fillRect(a[0] * sx, a[1] * sy, a[2] * sx, a[3] * sy); x.fillStyle = '#7dd3fc'; }
        else if (k === 'line') { x.strokeStyle = c ? '#7dd3fc' : '#020617'; x.lineWidth = 2; x.beginPath(); x.moveTo(a[0] * sx, a[1] * sy); x.lineTo(a[2] * sx, a[3] * sy); x.stroke(); } });
      o.t.needsUpdate = true;
    }
    /* ---------------- callouts ---------------- */
    drawCallouts() {
      const el = this.over; if (!el) return; if (!this.labelsOn) { el.innerHTML = ''; return; }
      const W = this.host.clientWidth, H = this.host.clientHeight; if (!W) return;
      const pts = this.callouts.map((c, i) => { const v = c.p.clone().project(this.camera); return { c, i, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, vis: v.z < 1 }; }).filter(p => p.vis);
      const left = pts.filter(p => p.x < W / 2).sort((a, b) => a.y - b.y), right = pts.filter(p => p.x >= W / 2).sort((a, b) => a.y - b.y);
      const place = (arr, side) => { const gap = Math.max(56, Math.min(80, (H - 40) / Math.max(1, arr.length))); let y0 = Math.max(16, (H - gap * arr.length) / 2); arr.forEach((p, j) => { p.ly = y0 + j * gap; p.lx = side === 'L' ? 12 : W - 202; p.side = side; }); };
      place(left, 'L'); place(right, 'R');
      const all = [...left, ...right];
      el.innerHTML = `<svg class="k3-lines" width="${W}" height="${H}">${all.map(p => { const ax = p.side === 'L' ? p.lx + 190 : p.lx; const ay = p.ly + 16; return `<path d="M${ax} ${ay} L${p.x} ${p.y}" class="${p.c.board ? 'b' : 'd'}"/><circle cx="${p.x}" cy="${p.y}" r="4" class="${p.c.board ? 'b' : 'd'}"/>`; }).join('')}</svg>` +
        all.map(p => `<div class="k3-call ${p.c.board ? 'b' : 'd'}" style="left:${p.lx}px;top:${p.ly}px" data-dev="${p.c.dev ?? ''}"><b>${VL.esc(p.c.t)}</b><span>${VL.esc(p.c.s || '')}</span></div>`).join('');
      el.querySelectorAll('[data-dev]').forEach(d => d.onclick = () => { if (d.dataset.dev !== '' && this.opts.onDev) this.opts.onDev(+d.dataset.dev); });
    }
  }
  VL.Kit3D = Kit3D;
})();
