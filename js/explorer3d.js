/* =========================================================================
   explorer3d.js : interactive 3D models (Three.js), dimensions in mm
   ESP32-DevKitC V4 · 5 mm LED · axial resistor with colour bands
   ========================================================================= */
(function () {
  const T = () => window.THREE;
  const BAND = ['#111111', '#7b3f1d', '#d42020', '#f07a12', '#f2d21b', '#1f9d43', '#1d5fd6', '#7d2fbf', '#8a8a8a', '#f4f4f4'];
  const BAND_N = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];
  VL.bandsFor = R => { const e = Math.floor(Math.log10(R)) - 1; const d = Math.round(R / Math.pow(10, e)); return [Math.floor(d / 10), d % 10, e]; };
  VL.BAND = BAND; VL.BAND_N = BAND_N;

  class Explorer3D {
    constructor(host, opts = {}) {
      const THREE = T();
      this.host = host; this.opts = opts; this.pickables = []; this.pinMeshes = {}; this.filter = null; this.sel = null;
      const w = host.clientWidth || 600, h = host.clientHeight || 420;
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); r.setSize(w, h);
      r.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(r.domElement); r.domElement.className = 'x3d-canvas';
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(35, w / h, 1, 2000);
      this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x0a1030, 1.6));
      const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(40, 90, 60); this.scene.add(d);
      const rim = new THREE.PointLight(0x22d3ee, 900, 0, 1.6); rim.position.set(-60, 30, -60); this.scene.add(rim);
      const rim2 = new THREE.PointLight(0xa855f7, 700, 0, 1.6); rim2.position.set(60, 20, 70); this.scene.add(rim2);
      const grid = new THREE.GridHelper(160, 32, 0x22d3ee, 0x1e3a8a); grid.material.transparent = true; grid.material.opacity = 0.22; grid.position.y = -12; this.scene.add(grid);
      this.root = new THREE.Group(); this.scene.add(this.root);
      this.orbit = { theta: -0.5, phi: 0.95, radius: 120, target: new THREE.Vector3(0, 0, 0) };
      this.ray = new THREE.Raycaster(); this.mouse = new THREE.Vector2();
      this.bindControls();
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
      this.needs = true; this.alive = true; this.loop();
    }
    dispose() { this.alive = false; this.ro.disconnect(); this.renderer.dispose(); this.renderer.domElement.remove(); }
    resize() { const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.needs = true; }
    loop() { if (!this.alive) return; requestAnimationFrame(() => this.loop()); if (this.anim) this.anim(); if (!this.needs) return; this.needs = false; this.updateCam(); this.renderer.render(this.scene, this.camera); }
    updateCam() { const o = this.orbit; const s = Math.sin(o.phi); this.camera.position.set(o.target.x + o.radius * s * Math.sin(o.theta), o.target.y + o.radius * Math.cos(o.phi), o.target.z + o.radius * s * Math.cos(o.theta)); this.camera.lookAt(o.target); }
    view(name) {
      const o = this.orbit, R = this.baseR || 120;
      if (name === 'top') { o.theta = 0; o.phi = 0.02; o.radius = R; }
      else if (name === 'front') { o.theta = 0; o.phi = 1.35; o.radius = R; }
      else if (name === 'bottom') { o.theta = 0; o.phi = 2.9; o.radius = R; }
      else { o.theta = -0.5; o.phi = 0.95; o.radius = R; }
      this.needs = true;
    }
    zoom(f) { this.orbit.radius = Math.max(this.minR || 25, Math.min(400, this.orbit.radius * f)); this.needs = true; }
    bindControls() {
      const el = this.renderer.domElement; let drag = null, moved = 0;
      el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, th: this.orbit.theta, ph: this.orbit.phi }; moved = 0; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', e => {
        if (drag) {
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
          this.orbit.theta = drag.th - dx * 0.008; this.orbit.phi = Math.max(0.02, Math.min(3.12, drag.ph - dy * 0.008)); this.needs = true;
        } else this.hover(e);
      });
      el.addEventListener('pointerup', e => { if (drag && moved < 5) this.click(e); drag = null; });
      el.addEventListener('pointerleave', () => { this.opts.onHover && this.opts.onHover(null); this.setHover(null); });
      el.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
    }
    pick(e) {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.mouse, this.camera);
      const hit = this.ray.intersectObjects(this.pickables, false)[0];
      return hit ? hit.object.userData.pick : null;
    }
    hover(e) { const p = this.pick(e); this.renderer.domElement.style.cursor = p ? 'pointer' : 'grab'; this.setHover(p); this.opts.onHover && this.opts.onHover(p, e); }
    click(e) { const p = this.pick(e); if (p) { this.select(p); this.opts.onPick && this.opts.onPick(p); } }
    setHover(p) {
      const id = p && p.kind === 'pin' ? p.id : null;
      if (this.hoverId === id) return; this.hoverId = id; this.paintPins();
    }
    select(p) { this.sel = p; this.paintPins(); this.paintParts(); }
    setFilter(type) { this.filter = type; this.paintPins(); }
    paintPins() {
      const THREE = T();
      Object.entries(this.pinMeshes).forEach(([id, m]) => {
        const pin = VL.pinById[id]; const col = VL.PIN_TYPES[pin.type].color;
        const isSel = this.sel && this.sel.kind === 'pin' && this.sel.id === id;
        const match = this.filter ? (this.filter === pin.type || (this.filter === 'power' && pin.type === 'power5')) : false;
        const on = isSel || this.hoverId === id || match;
        m.ring.material.color.set(on ? col : '#d4af37'); m.ring.material.emissive.set(on ? col : '#000000'); m.ring.material.emissiveIntensity = on ? (isSel ? 1.6 : 0.9) : 0;
        m.marker.visible = isSel || match; m.marker.material.color.set(col);
        m.marker.scale.setScalar(isSel ? 1.25 : 0.9);
      });
      this.needs = true;
    }
    paintParts() {
      (this.parts || []).forEach(m => { const on = this.sel && this.sel.kind === 'part' && this.sel.id === m.userData.pick.id; if (m.material.emissive) { m.material.emissive.set(on ? '#22d3ee' : (m.userData.baseEm || '#000000')); m.material.emissiveIntensity = on ? 0.6 : (m.userData.baseEi || 0); } });
      this.needs = true;
    }
    clear() { while (this.root.children.length) this.root.remove(this.root.children[0]); this.pickables = []; this.pinMeshes = {}; this.parts = []; this.sel = null; this.anim = null; }
    addPart(mesh, id) { mesh.userData.pick = { kind: 'part', id }; this.pickables.push(mesh); this.parts.push(mesh); return mesh; }
    setModel(name, arg) {
      this.clear(); this.model = name;
      if (name === 'esp32') this.buildESP32();
      else if (name === 'led') this.buildLED(arg || 'red');
      else if (name === 'resistor') this.buildResistor(arg || 220);
      this.view('iso');
    }

    /* ------------------------- ESP32-DevKitC ------------------------- */
    buildESP32() {
      const THREE = T(); const g = new THREE.Group(); this.root.add(g); this.baseR = 100; this.minR = 30; this.orbit.radius = 100;
      const W = 27.9, Lb = 54.4, H = 1.6;
      const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.1 }, o));
      const silk = this.silkTexture();
      const pcbSide = std('#0d0f14');
      const pcbTop = new THREE.MeshStandardMaterial({ map: silk, roughness: 0.6 });
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(W, H, Lb), [pcbSide, pcbSide, pcbTop, pcbSide, pcbSide, pcbSide]);
      pcb.position.y = H / 2; g.add(pcb); this.addPart(pcb, 'pcb');
      // module
      const mod = new THREE.Group(); g.add(mod);
      const modPcb = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 25.5), std('#18233a')); modPcb.position.set(0, H + 0.4, -17.45); mod.add(modPcb); this.addPart(modPcb, 'antenna');
      const ant = this.antennaTexture(); const antPlane = new THREE.Mesh(new THREE.PlaneGeometry(17, 6.5), new THREE.MeshStandardMaterial({ map: ant, transparent: true, roughness: 0.4, metalness: 0.6 }));
      antPlane.rotation.x = -Math.PI / 2; antPlane.position.set(0, H + 0.81, -26.7); mod.add(antPlane); antPlane.userData.pick = { kind: 'part', id: 'antenna' }; this.pickables.push(antPlane);
      const shieldMat = new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.9, roughness: 0.28 });
      const shieldTop = new THREE.MeshStandardMaterial({ map: this.shieldTexture(), metalness: 0.85, roughness: 0.3 });
      const shield = new THREE.Mesh(new THREE.BoxGeometry(15.8, 2.4, 17.6), [shieldMat, shieldMat, shieldTop, shieldMat, shieldMat, shieldMat]);
      shield.position.set(0, H + 0.8 + 1.2, -14.4); mod.add(shield); this.addPart(shield, 'module');
      // castellated module pads
      for (let i = 0; i < 14; i++) { const pd = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.82, 0.9), std('#d4af37', { metalness: 0.9, roughness: 0.3 })); pd.position.set(-9, H + 0.4, -22.6 + i * 1.27); mod.add(pd); const pd2 = pd.clone(); pd2.position.x = 9; mod.add(pd2); }
      // USB
      const usb = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.8, 5.6), std('#b8bec7', { metalness: 0.9, roughness: 0.25 })); usb.position.set(0, H + 1.4, 25.6); g.add(usb); this.addPart(usb, 'usb');
      const usbHole = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.6, 0.2), std('#05070a')); usbHole.position.set(0, H + 1.4, 28.45); g.add(usbHole);
      // buttons
      [['en', -9.6], ['boot', 9.6]].forEach(([id, x]) => {
        const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 6.2), std('#d9dde3', { metalness: 0.7, roughness: 0.3 })); base.position.set(x, H + 0.8, 24.2); g.add(base);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 3.0), std('#1b1b1f')); cap.position.set(x, H + 2.1, 24.2); g.add(cap); this.addPart(cap, id); this.addPart(base, id);
      });
      // regulator, bridge, LED, caps
      const reg = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 6.6), std('#16181d')); reg.position.set(-6.5, H + 0.8, 10.5); g.add(reg); this.addPart(reg, 'ldo');
      const tab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 1.4), std('#cfd4da', { metalness: 0.9 })); tab.position.set(-6.5, H + 0.1, 6.6); g.add(tab);
      const br = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 4), std('#1b1d22')); br.position.set(3.5, H + 0.45, 13.5); g.add(br); this.addPart(br, 'uart');
      const pled = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.8), new THREE.MeshStandardMaterial({ color: '#ff3b3b', emissive: '#ff2020', emissiveIntensity: 1.2 })); pled.userData.baseEm = '#ff2020'; pled.userData.baseEi = 1.2; pled.position.set(-6.5, H + 0.35, 4); g.add(pled); this.addPart(pled, 'pled');
      [[3, 6], [-1, 7.5], [6, 8], [-2, 17.5], [7, 18.5], [2, 20], [-6, 19]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.5), std(Math.random() > 0.5 ? '#a8876a' : '#2b2b2b')); c.position.set(x, H + 0.3, z); g.add(c); });
      // header pins
      const padMat = () => new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.95, roughness: 0.25 });
      const pinGeo = new THREE.BoxGeometry(0.64, 1.3, 0.64), legGeo = new THREE.BoxGeometry(0.64, 6, 0.64), ringGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.08, 20);
      const hitGeo = new THREE.SphereGeometry(1.2, 10, 8); const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const markerGeo = new THREE.TorusGeometry(1.5, 0.22, 8, 24);
      const goldLeg = new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.95, roughness: 0.3 });
      ['L', 'R'].forEach(side => {
        const x = side === 'L' ? -12.7 : 12.7;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 48.3), std('#111215')); strip.position.set(x, -1.25, -24.4 + 9 * 2.54); g.add(strip);
        for (let i = 1; i <= 19; i++) {
          const id = side + i, z = -24.4 + (i - 1) * 2.54;
          const ring = new THREE.Mesh(ringGeo, padMat()); ring.position.set(x, H + 0.04, z); g.add(ring);
          const stub = new THREE.Mesh(pinGeo, goldLeg); stub.position.set(x, H + 0.65, z); g.add(stub);
          const leg = new THREE.Mesh(legGeo, goldLeg); leg.position.set(x, -2.5 - 3, z); g.add(leg);
          const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: '#22d3ee' })); marker.rotation.x = Math.PI / 2; marker.position.set(x, H + 0.3, z); marker.visible = false; g.add(marker);
          const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.set(x, H + 0.6, z); hit.userData.pick = { kind: 'pin', id }; g.add(hit); this.pickables.push(hit);
          this.pinMeshes[id] = { ring, marker, pos: new THREE.Vector3(x, H + 0.6, z) };
        }
      });
      g.position.y = 2;
      let t0 = performance.now();
      this.anim = () => { const t = (performance.now() - t0) / 1000; if (this.filter || this.sel) { Object.values(this.pinMeshes).forEach(m => { if (m.marker.visible) m.marker.material.opacity = 1; }); } };
      this.paintPins();
    }
    silkTexture() {
      const THREE = T(); const W = 27.9, L = 54.4, s = 30; const cw = Math.round(W * s), ch = Math.round(L * s);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
      x.fillStyle = '#0b0d12'; x.fillRect(0, 0, cw, ch);
      // traces
      x.strokeStyle = 'rgba(40,60,90,0.55)'; x.lineWidth = 3;
      for (let i = 0; i < 26; i++) { x.beginPath(); const yy = 820 + i * 22; x.moveTo(60, yy); x.lineTo(160 + (i % 5) * 30, yy + 40); x.lineTo(cw - 170, yy + 40); x.lineTo(cw - 60, yy + 80); x.stroke(); }
      const X = mm => (mm + W / 2) * s, Y = mm => (mm + L / 2) * s;
      x.fillStyle = '#f2f4f8'; x.textBaseline = 'middle';
      VL.PINS.forEach(p => {
        const z = -24.4 + (p.idx - 1) * 2.54; const left = p.side === 'L';
        x.font = `bold ${p.label.length > 3 ? 25 : 28}px Arial`;
        x.textAlign = left ? 'left' : 'right';
        x.fillText(p.label, X(left ? -11.3 : 11.3), Y(z));
        x.strokeStyle = '#f2f4f8'; x.lineWidth = 2; x.beginPath(); x.arc(X(left ? -12.7 : 12.7), Y(z), 1.25 * s, 0, 7); x.stroke();
      });
      x.textAlign = 'center'; x.font = 'bold 30px Arial'; x.fillText('ESP32-DevKitC V4', X(1), Y(-1.5)); x.font = 'bold 26px Arial';
      x.fillText('EN', X(-9.6), Y(19.7)); x.fillText('BOOT', X(9.6), Y(19.7)); x.fillText('J2', X(-12.7), Y(-26.4)); x.fillText('J3', X(12.7), Y(-26.4));
      x.font = '22px Arial'; x.fillText('Virtual Robotics & AI Lab', X(1), Y(1.2));
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    }
    antennaTexture() {
      const THREE = T(); const c = document.createElement('canvas'); c.width = 512; c.height = 196; const x = c.getContext('2d');
      x.clearRect(0, 0, 512, 196); x.strokeStyle = '#e0b64a'; x.lineWidth = 12; x.beginPath(); let px = 40; x.moveTo(px, 160);
      for (let i = 0; i < 7; i++) { x.lineTo(px, 40); px += 30; x.lineTo(px, 40); x.lineTo(px, 150); px += 30; x.lineTo(px, 150); }
      x.lineTo(px + 40, 150); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    shieldTexture() {
      const THREE = T(); const c = document.createElement('canvas'); c.width = 474; c.height = 528; const x = c.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 474, 528); gr.addColorStop(0, '#dfe3e8'); gr.addColorStop(1, '#aeb4bd'); x.fillStyle = gr; x.fillRect(0, 0, 474, 528);
      x.fillStyle = '#3a3f47'; x.textAlign = 'center'; x.font = 'bold 50px Arial'; x.fillText('ESP32-WROOM-32', 237, 180);
      x.font = '32px Arial'; x.fillText('Wi-Fi + Bluetooth', 237, 250); x.fillText('Dual-core 240 MHz', 237, 300); x.fillText('4 MB flash', 237, 350);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }

    /* ------------------------- 5 mm LED ------------------------- */
    buildLED(color) {
      const THREE = T(); const g = new THREE.Group(); this.root.add(g); this.baseR = 70; this.minR = 18; this.orbit.radius = 70;
      const lt = VL.LED_TYPES[color]; const col = new THREE.Color(lt.color);
      const lensMat = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0, emissive: col, emissiveIntensity: 0.25, depthWrite: false });
      const S = 2.2; // display scale
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5 * S, 2.5 * S, 5.6 * S, 40, 1, true), lensMat); body.position.y = 2.8 * S + 1 * S; g.add(body); this.addPart(body, 'lens');
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5 * S, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), lensMat); dome.position.y = 6.6 * S; g.add(dome); this.addPart(dome, 'lens');
      // flange with flat side
      const sh = new THREE.Shape(); const r = 2.9 * S, flat = 2.4 * S; const a = Math.acos(flat / r);
      sh.absarc(0, 0, r, a, Math.PI * 2 - a, false); sh.lineTo(flat, r * Math.sin(a));
      const fl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1 * S, bevelEnabled: false, curveSegments: 40 }), lensMat.clone()); fl.material.opacity = 0.65;
      fl.rotation.x = -Math.PI / 2; fl.position.y = 0; g.add(fl); this.addPart(fl, 'flat');
      const metal = new THREE.MeshStandardMaterial({ color: '#c7ccd3', metalness: 0.9, roughness: 0.25 });
      // legs: anode on -x (long), cathode on +x (short, flat side is +x)
      const an = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * S, 0.25 * S, 27, 10), metal); an.position.set(-1.27 * S, -13.5 + 1.5 * S, 0); g.add(an); this.addPart(an, 'anode');
      const ca = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * S, 0.25 * S, 24, 10), metal.clone()); ca.position.set(1.27 * S, -12 + 1.5 * S, 0); g.add(ca); this.addPart(ca, 'cathode');
      // internal post (anode) and anvil (cathode)
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 3.4 * S, 0.5 * S), metal.clone()); post.position.set(-1.0 * S, 2.6 * S, 0); g.add(post); this.addPart(post, 'post');
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.6 * S, 0.9 * S, 0.8 * S), metal.clone()); anvil.position.set(0.9 * S, 4.3 * S, 0); g.add(anvil); this.addPart(anvil, 'anvil');
      const anvilStem = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 3.4 * S, 0.5 * S), metal); anvilStem.position.set(1.27 * S, 2.3 * S, 0); g.add(anvilStem);
      const die = new THREE.Mesh(new THREE.BoxGeometry(0.4 * S, 0.3 * S, 0.4 * S), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.5 })); die.userData.baseEm = lt.color; die.userData.baseEi = 2.5; die.position.set(0.9 * S, 4.95 * S, 0); g.add(die); this.addPart(die, 'die');
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.95 * S, 0.04 * S, 6, 20, Math.PI), metal); wire.position.set(-0.05 * S, 4.3 * S, 0); g.add(wire);
      const glow = new THREE.PointLight(col, 300, 60, 1.8); glow.position.set(0, 6 * S, 0); g.add(glow);
      g.position.y = 2; this.orbit.target.set(0, 6, 0);
      const t0 = performance.now(); this.lit = true;
      this.anim = () => { if (!this.lit) return; const t = (performance.now() - t0) / 1000; glow.intensity = 260 + 60 * Math.sin(t * 3); this.needs = true; };
      this.ledParts = { lensMat, glow, die };
    }
    setLit(on) { if (!this.ledParts) return; this.lit = on; this.ledParts.glow.intensity = on ? 280 : 0; this.ledParts.lensMat.emissiveIntensity = on ? 0.25 : 0; this.ledParts.die.material.emissiveIntensity = on ? 2.5 : 0; this.needs = true; }

    /* ------------------------- Resistor ------------------------- */
    buildResistor(R) {
      const THREE = T(); const g = new THREE.Group(); this.root.add(g); this.baseR = 75; this.minR = 18; this.orbit.radius = 75; this.orbit.target.set(0, 4, 0);
      const S = 2.6;
      const pts = []; const prof = [[0, -3.3], [0.9, -3.3], [1.2, -3.1], [1.25, -2.4], [1.0, -1.9], [1.0, 1.9], [1.25, 2.4], [1.2, 3.1], [0.9, 3.3], [0, 3.3]];
      prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r * S, y * S)));
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.7 }));
      body.rotation.z = Math.PI / 2; body.position.y = 6; g.add(body); this.addPart(body, 'body');
      const metal = new THREE.MeshStandardMaterial({ color: '#c7ccd3', metalness: 0.9, roughness: 0.25 });
      [-1, 1].forEach(s => { const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * S, 0.3 * S, 26, 10), metal); lead.rotation.z = Math.PI / 2; lead.position.set(s * (3.3 * S + 13), 6, 0); g.add(lead); this.addPart(lead, 'lead'); });
      const [d1, d2, m] = VL.bandsFor(R);
      const bands = [[d1, -2.5, 1.27, 'band1'], [d2, -1.2, 1.03, 'band2'], [m, 0, 1.03, 'band3'], [-1, 2.4, 1.27, 'band4']];
      bands.forEach(([v, y, rr, id]) => {
        const color = v === -1 ? '#c9a227' : (v < 0 ? '#c9a227' : BAND[v]);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(rr * S + 0.06, rr * S + 0.06, 0.55 * S, 40), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: v === -1 ? 0.8 : 0.05 }));
        b.rotation.z = Math.PI / 2; b.position.set(y * S, 6, 0); g.add(b); this.addPart(b, id);
      });
      this.bands = { d1, d2, m, R };
    }
  }
  VL.Explorer3D = Explorer3D;

  /* information for parts */
  VL.PART_INFO = {
    module: { t: 'ESP32-WROOM-32 module', d: 'The metal shield covers the ESP32 chip (two Xtensa LX6 cores up to 240 MHz, 520 KB of SRAM), a 40 MHz crystal and 4 MB of flash memory. The shield blocks radio interference.', diagram: true },
    antenna: { t: 'PCB antenna', d: 'The zig-zag copper trace is the Wi-Fi and Bluetooth antenna (2.4 GHz). Keep metal and your fingers away from it for the best signal.' },
    usb: { t: 'Micro-USB connector', d: 'Powers the board (5 V) and connects it to the computer for uploading programs and using the serial monitor.' },
    en: { t: 'EN (reset) button', d: 'Pressing EN pulls the enable line LOW and restarts the chip. Your program starts again from the beginning.' },
    boot: { t: 'BOOT button', d: 'Connected to GPIO0. Holding it while pressing EN puts the ESP32 into download mode for flashing firmware.' },
    ldo: { t: '3.3 V voltage regulator', d: 'Converts the 5 V from USB into the steady 3.3 V the ESP32 needs. The 3V3 pin is its output.' },
    uart: { t: 'USB-to-UART bridge', d: 'Translates USB from your computer into serial (UART) signals on GPIO1 (TX) and GPIO3 (RX). That is how print() reaches your screen.' },
    pled: { t: 'Power LED', d: 'Lights when the board has power. It cannot be controlled by your program. (Some other ESP32 boards have a user LED on GPIO2.)' },
    pcb: { t: 'Printed circuit board', d: 'Copper traces under the black solder mask connect every component. The white labels (silkscreen) name each pin.' },
    lens: { t: 'Epoxy lens', d: 'The coloured plastic body protects the chip and focuses the light. The colour of the light comes from the semiconductor material, not the plastic.' },
    flat: { t: 'Flat edge = cathode (−)', d: 'The rim of the LED has a flat side. The leg next to it is the cathode (−), which goes toward GND.' },
    anode: { t: 'Anode (+), long leg', d: 'Current enters the LED here. Connect it toward the GPIO pin (through the resistor or directly, with the resistor on the other side).' },
    cathode: { t: 'Cathode (−), short leg', d: 'Current leaves the LED here, toward GND. If the LED is reversed, no current flows and it stays dark: an LED is a diode.' },
    post: { t: 'Post (anode side)', d: 'Inside the LED, the thin post connects to the anode leg, with a hair-thin bond wire going to the chip.' },
    anvil: { t: 'Anvil (cathode side)', d: 'The larger metal piece is the anvil. It holds the tiny semiconductor chip and is connected to the cathode.' },
    die: { t: 'LED chip (die)', d: 'A tiny semiconductor P–N junction. When electrons cross it, they release energy as light. Red LEDs need about 2 V, blue and white about 3 V.' },
    body: { t: 'Resistor body', d: 'A ceramic core coated with a resistive film. It turns some electrical energy into heat (P = V × I), which limits the current.' },
    lead: { t: 'Leads', d: 'Resistors have no polarity: you can put them either way round.' }
  };
})();
