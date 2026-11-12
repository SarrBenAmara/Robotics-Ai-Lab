/* =========================================================================
   widgets.js : interactive theory widgets (all values come from real
   formulas: Ohm's law, power, RC charging, diode model, voltage dividers,
   PWM averages, ultrasonic timing, image convolution…)
   Each widget: VL.W[name](host, opts) → optional cleanup function.
   Each calls opts.onUse() the first time the student interacts.
   ========================================================================= */
(function () {
  const esc = s => VL.esc(s);
  const W = VL.W = {};
  const used = (o) => { let d = false; return () => { if (!d) { d = true; o && o.onUse && o.onUse(); } }; };
  const slider = (label, min, max, val, step = 1, fmt = v => v) => `<label class="ws"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}"><b>${fmt(val)}</b></label>`;
  const bindSliders = (host, fmts, cb) => host.querySelectorAll('.ws').forEach((l, i) => { const inp = l.querySelector('input'); inp.oninput = () => { l.querySelector('b').textContent = fmts[i](+inp.value); cb(); }; });
  const vals = host => [...host.querySelectorAll('.ws input')].map(i => +i.value);
  const fI = v => VL.fmtI(v);
  const canvas = (host, h = 200) => { const c = document.createElement('canvas'); c.className = 'wcanvas'; c.style.height = h + 'px'; host.appendChild(c); return c; };
  const ctx2d = c => { const W = c.clientWidth, H = c.clientHeight, d = Math.min(2, devicePixelRatio || 1); if (c.width !== W * d) { c.width = W * d; c.height = H * d; } const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H); return [x, W, H]; };
  const plotAxes = (x, W, H, xl, yl) => { x.strokeStyle = '#334155'; x.lineWidth = 1; x.beginPath(); x.moveTo(40, 10); x.lineTo(40, H - 24); x.lineTo(W - 10, H - 24); x.stroke(); x.fillStyle = '#8fa0c8'; x.font = '11px Nunito'; x.fillText(xl, W - 120, H - 6); x.save(); x.translate(12, H / 2 + 30); x.rotate(-Math.PI / 2); x.fillText(yl, 0, 0); x.restore(); };
  const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82]; const e12 = i => E12[i % 12] * Math.pow(10, Math.floor(i / 12));

  /* ---------------- breadboard connections ---------------- */
  W.breadboard = (host, o) => {
    const u = used(o); const cols = 15; const rows = ['+', '−', '', 'a', 'b', 'c', 'd', 'e', '', 'f', 'g', 'h', 'i', 'j'];
    let s = `<svg viewBox="0 0 ${40 + cols * 22} ${rows.length * 20 + 20}" class="wbb">`;
    s += `<rect x="4" y="4" width="${32 + cols * 22}" height="${rows.length * 20 + 10}" rx="8" fill="#eef1f5"/>`;
    rows.forEach((r, ri) => { if (!r) return; s += `<text x="16" y="${ri * 20 + 24}" class="bbl" text-anchor="middle">${r}</text>`; for (let c = 1; c <= cols; c++) s += `<rect class="hh" data-r="${ri}" data-c="${c}" x="${28 + c * 22 - 5}" y="${ri * 20 + 14}" width="10" height="10" rx="2"/>`; });
    s += `</svg><p class="wnote">Click any hole: the holes that are <b>electrically connected</b> to it light up.</p>`;
    host.innerHTML = s;
    host.querySelectorAll('.hh').forEach(h => h.onclick = () => {
      u(); const r = +h.dataset.r, c = +h.dataset.c; host.querySelectorAll('.hh').forEach(x => x.classList.remove('on'));
      host.querySelectorAll('.hh').forEach(x => { const r2 = +x.dataset.r, c2 = +x.dataset.c; const rail = r <= 1; const same = rail ? r2 === r : (c2 === c && ((r <= 7 && r2 >= 3 && r2 <= 7) || (r >= 9 && r2 >= 9))); if (same) x.classList.add('on'); });
      host.querySelector('.wnote').innerHTML = r <= 1 ? `The whole <b>${rows[r]} rail</b> is one long strip: perfect for power and GND.` : `Column <b>${c}</b>, rows <b>${r <= 7 ? 'a–e' : 'f–j'}</b> are one metal strip. The centre gap separates a–e from f–j, so chips can straddle it.`;
    });
  };

  /* ---------------- resistor colour code ---------------- */
  W.colorcode = (host, o) => {
    const u = used(o); const st = { b: [2, 2, 1] };
    host.innerHTML = `<div class="cc"><svg viewBox="0 0 260 70" class="ccr"><line x1="0" y1="35" x2="260" y2="35" stroke="#b8bfca" stroke-width="5"/><rect x="60" y="15" width="140" height="40" rx="16" fill="#d8c39a"/><rect class="b0" x="80" y="15" width="12" height="40"/><rect class="b1" x="102" y="15" width="12" height="40"/><rect class="b2" x="124" y="15" width="12" height="40"/><rect x="166" y="15" width="12" height="40" fill="#c9a227"/></svg>
      <div class="ccsel">${['1st digit', '2nd digit', 'Multiplier'].map((n, i) => `<div><span>${n}</span><div class="sw-row">${VL.BAND.map((c, k) => (i < 2 && k === 0 && i === 0) ? '' : `<button class="ccb" data-i="${i}" data-k="${k}" style="--c:${c}" title="${VL.BAND_N[k]}"></button>`).join('')}</div></div>`).join('')}</div>
      <div class="ccv"></div><div class="cc-game"><b>Speed challenge:</b> <span class="cq"></span> <button class="btn-xs ccn">New resistor</button></div></div>`;
    const target = { v: 0 };
    const upd = () => { st.b.forEach((k, i) => host.querySelector('.b' + i).setAttribute('fill', VL.BAND[k])); const v = (st.b[0] * 10 + st.b[1]) * Math.pow(10, st.b[2]); host.querySelector('.ccv').innerHTML = `<span class="big">${VL.fmtOhm(v)}</span> = (${st.b[0]}${st.b[1]}) × 10<sup>${st.b[2]}</sup> <span class="muted">±5% (gold)</span>`; host.querySelectorAll('.ccb').forEach(b => b.classList.toggle('on', st.b[+b.dataset.i] === +b.dataset.k)); if (target.v && v === target.v) { host.querySelector('.cq').innerHTML = `✅ Correct: ${VL.fmtOhm(v)}!`; target.v = 0; o && o.onScore && o.onScore(); } };
    host.querySelectorAll('.ccb').forEach(b => b.onclick = () => { u(); st.b[+b.dataset.i] = +b.dataset.k; upd(); });
    const newQ = () => { const opts = [100, 220, 330, 470, 1000, 2200, 4700, 10000, 47000, 100000, 150, 680]; target.v = opts[Math.floor(Math.random() * opts.length)]; host.querySelector('.cq').innerHTML = `Set the bands for <b>${VL.fmtOhm(target.v)}</b>`; };
    host.querySelector('.ccn').onclick = () => { u(); newQ(); }; newQ(); upd();
  };

  /* ---------------- LED I–V curve ---------------- */
  W.ledcurve = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Voltage across LED', 0, 340, 200, 1, v => (v / 100).toFixed(2) + ' V')}</div><div class="wout"></div>`;
    const c = canvas(host, 220);
    const Ifor = (V, col) => { const t = VL.LED_TYPES[col]; const Is = 0.01 / (Math.exp((t.vf - 0.1) / (2 * 0.025852)) - 1); let lo = 0, hi = 1; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; const vd = 2 * 0.025852 * Math.log(m / Is + 1) + m * 10; if (vd > V) hi = m; else lo = m; } return lo; };
    const draw = () => {
      const V = vals(host)[0] / 100; const [x, Wd, H] = ctx2d(c); plotAxes(x, Wd, H, 'voltage (V) →', 'current (mA)');
      const X = v => 40 + v / 3.4 * (Wd - 50), Y = i => H - 24 - Math.min(1, i / 0.03) * (H - 40);
      Object.entries(VL.LED_TYPES).forEach(([k, t]) => { x.strokeStyle = t.color; x.lineWidth = 2; x.beginPath(); for (let v = 0; v <= 3.4; v += 0.02) { const i = Ifor(v, k); v ? x.lineTo(X(v), Y(i)) : x.moveTo(X(v), Y(i)); } x.stroke(); });
      x.strokeStyle = '#fff'; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(X(V), 10); x.lineTo(X(V), H - 24); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#8fa0c8'; x.font = '11px Nunito'; [0, 1, 2, 3].forEach(v => x.fillText(v + ' V', X(v) - 8, H - 10)); x.fillText('30 mA', 2, 16);
      host.querySelector('.wout').innerHTML = Object.entries(VL.LED_TYPES).map(([k, t]) => `<span class="pill2" style="--c:${t.color}">${t.name}: <b>${fI(Ifor(V, k))}</b></span>`).join(' ') + `<p class="wnote">Below its forward voltage an LED conducts almost nothing; just above it, the current shoots up. That's why the <b>resistor</b>, not the LED, must set the current.</p>`;
    };
    bindSliders(host, [v => (v / 100).toFixed(2) + ' V'], () => { u(); draw(); }); setTimeout(draw, 30);
  };

  /* ---------------- RC charging ---------------- */
  W.rc = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Resistance', 0, 36, 24, 1, i => VL.fmtOhm(e12(i)))}${slider('Capacitance', 0, 3, 2, 1, i => [1, 10, 100, 1000][i] + ' µF')}${slider('Supply', 1, 12, 5, 1, v => v + ' V')}</div><div class="wrow"><button class="btn-sm" data-m="c">⚡ Charge</button><button class="btn-sm" data-m="d">⏚ Discharge</button></div><div class="wout"></div>`;
    const c = canvas(host, 200); let mode = 'c';
    const draw = () => {
      const [ri, ci, V] = vals(host); const R = e12(ri), C = [1, 10, 100, 1000][ci] * 1e-6, tau = R * C;
      const [x, Wd, H] = ctx2d(c); plotAxes(x, Wd, H, 'time →', 'V across C'); const T = 5 * tau;
      x.strokeStyle = '#22d3ee'; x.lineWidth = 2.5; x.beginPath();
      for (let k = 0; k <= 200; k++) { const t = T * k / 200; const v = mode === 'c' ? V * (1 - Math.exp(-t / tau)) : V * Math.exp(-t / tau); const px = 40 + k / 200 * (Wd - 50), py = H - 24 - v / 12 * (H - 40); k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      x.fillStyle = '#8fa0c8'; x.font = '11px Nunito'; for (let k = 1; k <= 5; k++) { const px = 40 + k / 5 * (Wd - 50); x.fillText(k + 'τ', px - 8, H - 8); }
      const ft = t => t < 1 ? (t * 1000).toFixed(t < 0.01 ? 2 : 0) + ' ms' : t.toFixed(2) + ' s';
      host.querySelector('.wout').innerHTML = `<div class="formula">τ = R × C = ${VL.fmtOhm(R)} × ${(C * 1e6)} µF = <b>${ft(tau)}</b> · after 1τ: ${mode === 'c' ? '63%' : '37%'} · after 5τ: ${mode === 'c' ? 'fully charged (99%)' : 'empty (<1%)'} = ${ft(5 * tau)}</div>`;
    };
    bindSliders(host, [i => VL.fmtOhm(e12(i)), i => [1, 10, 100, 1000][i] + ' µF', v => v + ' V'], () => { u(); draw(); });
    host.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { u(); mode = b.dataset.m; draw(); }); setTimeout(draw, 30);
  };

  /* ---------------- NPN transistor switch ---------------- */
  W.transistor = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="tr"><svg viewBox="0 0 300 220" class="trs"><text x="10" y="120" class="tl">GPIO</text><path d="M48 116 H80" class="cw"/><rect x="80" y="106" width="44" height="18" rx="7" fill="#d8c39a"/><text x="102" y="100" class="tl rb" text-anchor="middle">Rb</text><path d="M124 115 H160" class="cw"/>
      <circle cx="180" cy="115" r="26" fill="none" stroke="#94a3b8" stroke-width="2"/><line x1="166" y1="98" x2="166" y2="132" stroke="#e2e8f0" stroke-width="4"/><line x1="160" y1="115" x2="166" y2="115" stroke="#e2e8f0" stroke-width="3"/><line x1="166" y1="106" x2="190" y2="88" stroke="#e2e8f0" stroke-width="3"/><line x1="166" y1="124" x2="190" y2="142" stroke="#e2e8f0" stroke-width="3"/><path d="M184 136 l7 7 l-9 1z" fill="#e2e8f0"/>
      <path d="M190 88 V60" class="cw cc1"/><circle cx="190" cy="48" r="11" class="tled" fill="#ff2b2b"/><circle cx="190" cy="48" r="24" class="tglow" fill="#ff3b3b" opacity="0" filter="url(#tb)"/><path d="M190 36 V18 H260" class="cw cc1"/><text x="230" y="14" class="tl">+5 V</text>
      <path d="M190 142 V196 H260" class="cw ce"/><text x="232" y="212" class="tl">GND</text><text x="200" y="80" class="tl">C</text><text x="150" y="108" class="tl">B</text><text x="200" y="160" class="tl">E</text><defs><filter id="tb"><feGaussianBlur stdDeviation="5"/></filter></defs></svg>
      <div><div class="wrow"><label class="tgl"><input type="checkbox" class="gin" checked> GPIO HIGH (3.3 V)</label></div>${slider('Base resistor Rb', 0, 36, 24, 1, i => VL.fmtOhm(e12(i)))}${slider('Gain β (hFE)', 50, 300, 100, 10, v => v)}<div class="wout"></div></div></div>`;
    const draw = () => {
      const on = host.querySelector('.gin').checked; const [ri, beta] = vals(host); const Rb = e12(ri);
      const Ib = on ? Math.max(0, (3.3 - 0.7) / Rb) : 0; const Rc = 150, Vled = 2.0, Vsat = 0.2; const IcSat = (5 - Vled - Vsat) / Rc; const Ic = Math.min(beta * Ib, IcSat);
      const sat = beta * Ib >= IcSat; host.querySelector('.rb').textContent = 'Rb ' + VL.fmtOhm(Rb);
      host.querySelector('.tglow').setAttribute('opacity', VL.Circuit.brightness(Ic).toFixed(2));
      host.querySelector('.wout').innerHTML = `<div class="formula">I<sub>B</sub> = (3.3 − 0.7) / ${VL.fmtOhm(Rb)} = <b>${fI(Ib)}</b><br>β × I<sub>B</sub> = ${fI(beta * Ib)} · max I<sub>C</sub> (LED + 150 Ω on 5 V) = ${fI(IcSat)}<br>I<sub>C</sub> = <b>${fI(Ic)}</b></div><div class="verdict ${!on ? 'dim' : sat ? 'good' : 'risky'}">${!on ? 'Cut-off: no base current → transistor OFF → LED off.' : sat ? 'Saturation: fully ON, like a closed switch. The tiny GPIO current controls a bigger LED/motor current.' : 'Active region: only partly on. Lower Rb to drive it into saturation.'}</div><p class="wnote">Simplified model: V<sub>BE</sub> = 0.7 V, V<sub>CE(sat)</sub> = 0.2 V, LED V<sub>f</sub> = 2.0 V.</p>`;
    };
    bindSliders(host, [i => VL.fmtOhm(e12(i)), v => v], () => { u(); draw(); }); host.querySelector('.gin').onchange = () => { u(); draw(); }; draw();
  };

  /* ---------------- pull-up / pull-down ---------------- */
  W.pullup = (host, o) => {
    const u = used(o); let mode = 'up', pressed = false, timer;
    host.innerHTML = `<div class="wrow"><button class="btn-sm" data-m="none">No resistor</button><button class="btn-sm on" data-m="up">Pull-up (to 3.3 V)</button><button class="btn-sm" data-m="down">Pull-down (to GND)</button></div>
      <div class="pu"><button class="bigbtn">PRESS</button><div class="pu-out"><div class="lvl"></div><div class="wnote pnote"></div></div></div>`;
    const draw = () => {
      let lv, note;
      if (mode === 'none') { lv = pressed ? 0 : (Math.random() > 0.5 ? 1 : 0); note = pressed ? 'Pressed: the button connects the pin to GND → LOW.' : 'Released with nothing connected: the pin is <b>floating</b>. It picks up noise and flickers randomly between 0 and 1!'; }
      else if (mode === 'up') { lv = pressed ? 0 : 1; note = pressed ? 'Pressed → pin connected to GND → reads <b>0 (LOW)</b>.' : 'Released → the pull-up resistor holds the pin at 3.3 V → reads <b>1 (HIGH)</b>. Pressed = LOW: "active low".'; }
      else { lv = pressed ? 1 : 0; note = pressed ? 'Pressed → the button (wired to 3.3 V) pulls the pin HIGH → reads <b>1</b>.' : 'Released → the pull-down resistor holds the pin at 0 V → reads <b>0</b>.'; }
      host.querySelector('.lvl').innerHTML = `pin reads <b class="${lv ? 'hi' : 'lo'}">${lv}</b> ${lv ? 'HIGH' : 'LOW'}`; host.querySelector('.pnote').innerHTML = note;
    };
    host.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { u(); mode = b.dataset.m; host.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    const bb = host.querySelector('.bigbtn'); bb.onpointerdown = () => { u(); pressed = true; bb.classList.add('down'); draw(); }; bb.onpointerup = bb.onpointerleave = () => { pressed = false; bb.classList.remove('down'); draw(); };
    timer = setInterval(() => { if (mode === 'none' && !pressed) draw(); }, 250); draw(); return () => clearInterval(timer);
  };

  /* ---------------- voltage divider / LDR ---------------- */
  W.divider = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Light level', 1, 1000, 200, 1, v => v + ' lux')}${slider('Fixed resistor', 12, 36, 24, 1, i => VL.fmtOhm(e12(i)))}</div><div class="dv"><svg viewBox="0 0 160 200"><text x="60" y="14" class="tl">3.3 V</text><path d="M80 18 V40" class="cw"/><rect x="66" y="40" width="28" height="50" rx="6" fill="#a16207"/><text x="100" y="70" class="tl">LDR</text><path d="M80 90 V110 H130" class="cw"/><circle cx="80" cy="110" r="4" fill="#22d3ee"/><text x="100" y="104" class="tl">Vout → ADC</text><path d="M80 110 V130" class="cw"/><rect x="66" y="130" width="28" height="44" rx="6" fill="#d8c39a"/><path d="M80 174 V190" class="cw"/><text x="64" y="198" class="tl">GND</text></svg><div class="wout"></div></div>`;
    const draw = () => { const [lux, ri] = vals(host); const R2 = e12(ri); const Rl = 10000 * Math.pow(lux / 10, -0.7); const V = 3.3 * R2 / (Rl + R2); host.querySelector('.wout').innerHTML = `<div class="formula">R<sub>LDR</sub> ≈ ${VL.fmtOhm(Math.round(Rl))} (darker → higher)<br>V<sub>out</sub> = 3.3 × R / (R<sub>LDR</sub> + R) = <b>${V.toFixed(2)} V</b><br>ESP32 ADC (11 dB, 12-bit, ideal) ≈ <b>${Math.round(Math.min(1, V / 3.6) * 4095)}</b> · UNO (5 V, 10-bit) ≈ <b>${Math.round(V * 5 / 3.3 / 5 * 1023)}</b> on a 5 V divider</div><p class="wnote">A voltage divider turns a changing resistance into a changing voltage that the ADC can read. LDR curve is a typical approximation.</p>`; };
    bindSliders(host, [v => v + ' lux', i => VL.fmtOhm(e12(i))], () => { u(); draw(); }); draw();
  };

  /* ---------------- H-bridge ---------------- */
  W.hbridge = (host, o) => {
    const u = used(o); const st = { a: 0, b: 0, en: 100 }; let ang = 0, raf;
    host.innerHTML = `<div class="hbw"><svg viewBox="0 0 260 200"><path d="M40 20 H220 M40 180 H220" class="cw"/><text x="120" y="14" class="tl">+V motor</text><text x="120" y="196" class="tl">GND</text>
      ${[['s1', 40, 20, 40, 90], ['s2', 220, 20, 220, 90], ['s3', 40, 110, 40, 180], ['s4', 220, 110, 220, 180]].map(([id, x1, y1, x2, y2]) => `<line class="hsw ${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('')}
      <path d="M40 100 H95 M165 100 H220" class="cw"/><circle cx="130" cy="100" r="34" fill="#334155"/><g class="mrot"><rect x="127" y="70" width="6" height="60" fill="#f59e0b"/><rect x="100" y="97" width="60" height="6" fill="#f59e0b"/></g><text x="130" y="150" class="tl" text-anchor="middle">M</text></svg>
      <div><div class="wrow"><label class="tgl"><input type="checkbox" class="ia"> IN1</label><label class="tgl"><input type="checkbox" class="ib"> IN2</label></div>${slider('Enable (PWM duty)', 0, 100, 100, 5, v => v + '%')}<div class="wout"></div></div></div>`;
    const draw = () => { st.a = host.querySelector('.ia').checked; st.b = host.querySelector('.ib').checked; st.en = vals(host)[0];
      const dir = st.a && !st.b ? 1 : (!st.a && st.b ? -1 : 0);
      ['s1', 's4'].forEach(k => host.querySelector('.' + k).classList.toggle('on', dir === 1)); ['s2', 's3'].forEach(k => host.querySelector('.' + k).classList.toggle('on', dir === -1));
      host.querySelector('.wout').innerHTML = `<div class="verdict ${dir ? 'good' : 'dim'}">${dir === 1 ? 'Forward: current flows left → right through the motor.' : dir === -1 ? 'Reverse: the bridge flips the current direction, so the motor spins the other way.' : st.a && st.b ? 'Both inputs HIGH: the driver brakes the motor (both terminals at the same voltage).' : 'Both LOW: motor stopped (coasting).'}</div><p class="wnote">Speed ≈ ${st.en}% (PWM on the enable pin). A GPIO pin can never power a motor directly: the H-bridge driver (L298N, TB6612, DRV8833…) switches the big current.</p>`; st.dir = dir; };
    host.querySelectorAll('input').forEach(i => i.oninput = i.onchange = () => { u(); draw(); }); bindSliders(host, [v => v + '%'], () => { u(); draw(); }); draw();
    const anim = () => { ang += (st.dir || 0) * st.en / 100 * 8; host.querySelector('.mrot').setAttribute('transform', `rotate(${ang} 130 100)`); raf = requestAnimationFrame(anim); }; anim(); return () => cancelAnimationFrame(raf);
  };

  /* ---------------- power & heat ---------------- */
  W.power = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Voltage across resistor', 1, 120, 50, 1, v => (v / 10).toFixed(1) + ' V')}${slider('Resistance', 0, 36, 12, 1, i => VL.fmtOhm(e12(i)))}</div><div class="pw"><div class="heat"><div class="res3"></div></div><div class="wout"></div></div>`;
    const draw = () => { const [v10, ri] = vals(host); const V = v10 / 10, R = e12(ri), I = V / R, P = V * I; const ratio = P / 0.25;
      host.querySelector('.res3').style.setProperty('--h', Math.min(1, ratio).toFixed(2)); host.querySelector('.res3').classList.toggle('smoke', ratio > 1);
      host.querySelector('.wout').innerHTML = `<div class="formula">I = V / R = ${V.toFixed(1)} / ${R} = ${fI(I)}<br>P = V × I = <b>${P < 1 ? (P * 1000).toFixed(1) + ' mW' : P.toFixed(2) + ' W'}</b> (= I² × R = V² / R)</div><div class="verdict ${ratio > 1 ? 'danger' : ratio > 0.5 ? 'risky' : 'good'}">${ratio > 1 ? `Too hot! A standard ¼ W resistor would overheat (${Math.round(ratio * 100)}% of its rating). Use a 1 W or larger resistor, or a bigger resistance.` : ratio > 0.5 ? 'Getting warm: above half of a ¼ W rating. Engineers keep a safety margin.' : 'Safe for a standard ¼ W (250 mW) resistor.'}</div>`; };
    bindSliders(host, [v => (v / 10).toFixed(1) + ' V', i => VL.fmtOhm(e12(i))], () => { u(); draw(); }); draw();
  };

  /* ---------------- series / parallel ---------------- */
  W.network = (host, o) => {
    const u = used(o); let mode = (o && o.mode) || 'series';
    host.innerHTML = `<div class="wrow"><button class="btn-sm" data-m="series">Series</button><button class="btn-sm" data-m="parallel">Parallel</button>${slider('Supply', 1, 12, 9, 1, v => v + ' V')}</div><div class="wrow">${slider('R1', 0, 36, 12, 1, i => VL.fmtOhm(e12(i)))}${slider('R2', 0, 36, 16, 1, i => VL.fmtOhm(e12(i)))}${slider('R3', 0, 36, 20, 1, i => VL.fmtOhm(e12(i)))}</div><div class="net-out"></div>`;
    const draw = () => {
      const [V, a, b, c] = vals(host); const R = [e12(a), e12(b), e12(c)];
      host.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x.dataset.m === mode));
      let rows, tot;
      if (mode === 'series') { tot = R[0] + R[1] + R[2]; const I = V / tot; rows = R.map((r, i) => ({ r, I, V: I * r })); }
      else { tot = 1 / (1 / R[0] + 1 / R[1] + 1 / R[2]); rows = R.map(r => ({ r, I: V / r, V })); }
      const It = V / tot; const maxV = Math.max(...rows.map(x => x.V)), maxI = Math.max(...rows.map(x => x.I));
      host.querySelector('.net-out').innerHTML = `<div class="formula">${mode === 'series' ? `R<sub>total</sub> = R1 + R2 + R3 = <b>${VL.fmtOhm(Math.round(tot))}</b>` : `1/R<sub>total</sub> = 1/R1 + 1/R2 + 1/R3 → R<sub>total</sub> = <b>${tot.toFixed(1)} Ω</b>`} · total current = ${fI(It)}</div>
        <table class="nt"><tr><th></th><th>Resistance</th><th>Voltage</th><th></th><th>Current</th><th></th></tr>${rows.map((x, i) => `<tr><td>R${i + 1}</td><td>${VL.fmtOhm(x.r)}</td><td>${x.V.toFixed(2)} V</td><td><div class="bar"><i style="width:${x.V / maxV * 100}%"></i></div></td><td>${fI(x.I)}</td><td><div class="bar"><i style="width:${x.I / maxI * 100}%;background:linear-gradient(90deg,#f59e0b,#ef4444)"></i></div></td></tr>`).join('')}</table>
        <p class="wnote">${mode === 'series' ? 'Series: the <b>same current</b> flows through every resistor; the voltages <b>add up</b> to the supply (' + rows.reduce((s, x) => s + x.V, 0).toFixed(2) + ' V).' : 'Parallel: every branch gets the <b>same voltage</b>; the currents <b>add up</b> (' + fI(rows.reduce((s, x) => s + x.I, 0)) + '). The total resistance is smaller than the smallest branch.'}</p>`;
    };
    host.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { u(); mode = b.dataset.m; draw(); });
    bindSliders(host, [v => v + ' V', i => VL.fmtOhm(e12(i)), i => VL.fmtOhm(e12(i)), i => VL.fmtOhm(e12(i))], () => { u(); draw(); }); draw();
  };

  /* ---------------- Ohm playground (embedded) ---------------- */
  W.ohm = (host, o) => { const u = used(o); const c = VL.renderOhmInto(host); host.addEventListener('input', u, { once: true }); return c; };

  /* ---------------- sorting games (safety / polarity / multimeter) ---------------- */
  const sortGame = (items, labels) => (host, o) => {
    const u = used(o); let done = 0;
    host.innerHTML = `<div class="sg">${items.map((it, i) => `<div class="sgi" data-i="${i}"><span>${it.t}</span><div>${labels.map((l, k) => `<button class="btn-xs" data-k="${k}">${l}</button>`).join('')}</div><em></em></div>`).join('')}</div><p class="wnote sgs"></p>`;
    host.querySelectorAll('.sgi').forEach(row => row.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      u(); const it = items[+row.dataset.i]; const ok = +b.dataset.k === it.a; row.classList.remove('ok', 'no'); row.classList.add(ok ? 'ok' : 'no'); row.querySelector('em').textContent = (ok ? '✅ ' : '❌ ') + it.why;
      done = host.querySelectorAll('.sgi.ok').length; host.querySelector('.sgs').textContent = `${done} / ${items.length} correct`; if (done === items.length && o && o.onScore) o.onScore();
    }));
  };
  W.safety = sortGame([
    { t: 'Connecting a 9 V battery directly to an ESP32 GPIO pin', a: 1, why: 'GPIOs accept max 3.3 V: 9 V destroys the chip.' },
    { t: 'Unplugging USB before changing the wiring', a: 0, why: 'Always rewire with the power off.' },
    { t: 'A wire straight from 5V to GND "to test it"', a: 1, why: 'That is a short circuit: huge current, heat, damage.' },
    { t: 'An LED with a 330 Ω resistor on a 5 V pin', a: 0, why: '(5 − 2) / 330 ≈ 9 mA: safe.' },
    { t: 'Driving a DC motor directly from a GPIO pin', a: 1, why: 'Motors need hundreds of mA and create voltage spikes: use a driver.' },
    { t: 'Touching a mains (230 V) socket circuit for a project', a: 1, why: 'Mains voltage can kill. Our projects stay at 3.3–12 V.' },
    { t: 'Checking LED polarity before powering', a: 0, why: 'Good habit: long leg (+) toward the positive side.' },
    { t: 'Leaving a lithium battery charging unattended on a carpet', a: 1, why: 'Lithium cells can overheat and catch fire.' }
  ], ['Safe ✓', 'Unsafe ✗']);
  W.polarity = sortGame([
    { t: 'LED: long leg toward +, short leg (flat side) toward GND', a: 0, why: 'Correct: anode +, cathode −.' },
    { t: 'Electrolytic capacitor: stripe side connected to +', a: 1, why: 'The stripe marks the NEGATIVE leg.' },
    { t: 'Resistor: either way round', a: 0, why: 'Resistors have no polarity.' },
    { t: 'Diode: stripe (cathode) toward the + supply to block current', a: 0, why: 'Reverse-biased diode: it blocks current. Used for protection.' },
    { t: 'Battery: red wire to GND, black to +', a: 1, why: 'Red = +, black = − (GND).' },
    { t: 'Ceramic 100 nF capacitor: either way round', a: 0, why: 'Ceramic capacitors are not polarised.' }
  ], ['Correct', 'Wrong']);
  W.meterquiz = sortGame([
    { t: 'Measure the voltage across an LED', a: 0, why: 'Voltage: V mode, probes across (in parallel with) the part.' },
    { t: 'Measure the current through an LED', a: 1, why: 'Current: A/mA mode, meter IN SERIES (break the circuit).' },
    { t: 'Check the value of a resistor', a: 2, why: 'Ω mode, with the resistor out of the powered circuit.' },
    { t: 'Check if a wire is broken (continuity)', a: 2, why: 'Ω/continuity mode: a good wire reads ≈ 0 Ω (beep).' },
    { t: 'Check a battery is still 9 V', a: 0, why: 'V mode across the terminals.' }
  ], ['V', 'mA', 'Ω']);

  /* ---------------- PWM ---------------- */
  W.pwm = (host, o) => {
    const u = used(o); let ph = 0, raf;
    host.innerHTML = `<div class="wrow">${slider('Duty cycle', 0, 100, 25, 1, v => v + '%')}${slider('Supply HIGH level', 0, 1, 0, 1, v => v ? '5 V (UNO)' : '3.3 V (ESP32/Pico)')}</div><div class="pwm-led"><div class="vled big" style="--c:#ff2b2b;--g:255,60,60"></div><div class="wout"></div></div>`;
    const c = canvas(host, 150);
    const draw = () => { const [d, b] = vals(host); const Vh = b ? 5 : 3.3; const [x, Wd, H] = ctx2d(c); x.strokeStyle = '#22d3ee'; x.lineWidth = 2; x.beginPath(); const per = 80; let px = 10; x.moveTo(px, H - 20);
      for (let k = 0; k < 8; k++) { const on = per * d / 100; x.lineTo(px, H - 20); if (on > 0) { x.lineTo(px, 20); x.lineTo(px + on, 20); } x.lineTo(px + on, H - 20); x.lineTo(px + per, H - 20); px += per; } x.stroke();
      x.strokeStyle = '#f59e0b'; x.setLineDash([6, 4]); const ya = H - 20 - (H - 40) * d / 100; x.beginPath(); x.moveTo(10, ya); x.lineTo(Wd - 10, ya); x.stroke(); x.setLineDash([]); x.fillStyle = '#f59e0b'; x.font = '12px Nunito'; x.fillText('average', Wd - 70, ya - 4);
      host.querySelector('.vled').style.setProperty('--b', (d / 100).toFixed(2));
      host.querySelector('.wout').innerHTML = `<div class="formula">V<sub>avg</sub> = duty × V<sub>HIGH</sub> = ${d}% × ${Vh} V = <b>${(d / 100 * Vh).toFixed(2)} V</b></div><p class="wnote">The pin is only ever fully ON or fully OFF, switching hundreds or thousands of times per second. Your eye averages it, so the LED looks ${d < 15 ? 'dim' : d > 80 ? 'bright' : 'medium'}.<br>ESP32: <code>PWM(Pin(4), freq=1000, duty_u16=${Math.round(d / 100 * 65535)})</code> · UNO: <code>analogWrite(9, ${Math.round(d / 100 * 255)})</code></p>`; };
    bindSliders(host, [v => v + '%', v => v ? '5 V (UNO)' : '3.3 V (ESP32/Pico)'], () => { u(); draw(); }); setTimeout(draw, 30);
  };

  /* ---------------- servo ---------------- */
  W.servo = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="sv"><svg viewBox="0 0 200 140"><rect x="40" y="60" width="120" height="60" rx="8" fill="#1d4ed8"/><circle cx="100" cy="70" r="12" fill="#e5e7eb"/><g class="horn2"><rect x="96" y="20" width="8" height="52" rx="4" fill="#f8fafc"/></g><path d="M40 70 A60 60 0 0 1 160 70" fill="none" stroke="#334155" stroke-dasharray="3 4"/></svg><div>${slider('Pulse width', 50, 250, 150, 1, v => (v / 100).toFixed(2) + ' ms')}<div class="wout"></div></div></div>`;
    const c = canvas(host, 110);
    const draw = () => { const pw = vals(host)[0] / 100; const ang = Math.max(0, Math.min(180, (pw - 0.5) / 2.0 * 180)); host.querySelector('.horn2').setAttribute('transform', `rotate(${ang - 90} 100 70)`);
      const [x, Wd, H] = ctx2d(c); x.strokeStyle = '#22d3ee'; x.lineWidth = 2; x.beginPath(); let px = 10; const sc = (Wd - 20) / 60; x.moveTo(px, H - 15); for (let k = 0; k < 3; k++) { x.lineTo(px, 15); x.lineTo(px + pw * sc, 15); x.lineTo(px + pw * sc, H - 15); x.lineTo(px + 20 * sc, H - 15); px += 20 * sc; } x.stroke(); x.fillStyle = '#8fa0c8'; x.font = '11px Nunito'; x.fillText('20 ms period (50 Hz)', 14, H - 2);
      host.querySelector('.wout').innerHTML = `<div class="formula">angle ≈ (pulse − 0.5 ms) / 2.0 ms × 180° = <b>${Math.round(ang)}°</b></div><p class="wnote">Hobby servos (SG90) read the <b>length</b> of a pulse sent every 20 ms. Typical range 0.5–2.5 ms (each model differs a little). Arduino's Servo library does this for you: <code>myServo.write(${Math.round(ang)});</code></p>`; };
    bindSliders(host, [v => (v / 100).toFixed(2) + ' ms'], () => { u(); draw(); }); setTimeout(draw, 30);
  };

  /* ---------------- ADC ---------------- */
  W.adc = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Input voltage', 0, 500, 165, 1, v => (v / 100).toFixed(2) + ' V')}</div><div class="adc-g"></div>`;
    const draw = () => { const V = vals(host)[0] / 100; const row = (n, bits, fs, txt) => { const max = Math.pow(2, bits) - 1; const val = Math.round(Math.max(0, Math.min(1, V / fs)) * max); return `<div class="adcr"><b>${n}</b><span>${bits}-bit, full scale ${fs} V</span><div class="bar"><i style="width:${val / max * 100}%"></i></div><code>${txt} → ${val}</code>${V > fs ? '<em class="no">clipped!</em>' : ''}</div>`; };
      host.querySelector('.adc-g').innerHTML = row('Arduino UNO', 10, 5, 'analogRead(A0)') + row('ESP32 (ATTN_11DB)', 12, 3.6, 'adc.read()') + row('ESP32 (default 0 dB)', 12, 1.0, 'adc.read()') + row('Pico / ESP32', 16, 3.3, 'adc.read_u16()') + `<p class="wnote">An ADC (analog-to-digital converter) turns a voltage into a number. More bits = finer steps: 10-bit has 1024 steps (≈ 4.9 mV each on 5 V). Ideal linear model; real ESP32 ADCs are a little non-linear near the ends. ${V > 3.3 ? '<b class="no">Never put more than 3.3 V on an ESP32 or Pico pin!</b>' : ''}</p>`; };
    bindSliders(host, [v => (v / 100).toFixed(2) + ' V'], () => { u(); draw(); }); draw();
  };

  /* ---------------- ultrasonic ---------------- */
  W.ultrasonic = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Distance to obstacle', 2, 400, 50, 1, v => v + ' cm')}</div><div class="us"><svg viewBox="0 0 400 80"><rect x="4" y="22" width="44" height="36" rx="4" fill="#1d4ed8"/><circle cx="16" cy="40" r="8" fill="#cbd5e1"/><circle cx="36" cy="40" r="8" fill="#cbd5e1"/><rect class="wall" x="300" y="6" width="14" height="68" fill="#f59e0b"/><path class="wave" d="" stroke="#22d3ee" fill="none" stroke-width="2" stroke-dasharray="4 4"/></svg><div class="wout"></div></div>`;
    const draw = () => { const d = vals(host)[0]; const wx = 50 + d / 400 * 330; host.querySelector('.wall').setAttribute('x', wx); host.querySelector('.wave').setAttribute('d', `M48 34 L${wx} 34 M${wx} 46 L48 46`); const t = 2 * d / 0.0343;
      host.querySelector('.wout').innerHTML = `<div class="formula">echo time = 2 × distance / speed of sound = 2 × ${d} / 0.0343 cm/µs = <b>${Math.round(t)} µs</b><br>distance = time × 0.0343 / 2</div><p class="wnote">The HC-SR04 sends a 40 kHz ultrasonic burst after a 10 µs trigger pulse; the echo pin stays HIGH for the round-trip time. Speed of sound ≈ 343 m/s at 20 °C. Range ≈ 2–400 cm. (Use a voltage divider on ECHO for 3.3 V boards.)</p>`; };
    bindSliders(host, [v => v + ' cm'], () => { u(); draw(); }); draw();
  };

  /* ---------------- I2C decoder ---------------- */
  W.i2c = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="i2"><svg viewBox="0 0 420 120"><path d="M20 30 H400" stroke="#22d3ee" stroke-width="3"/><path d="M20 60 H400" stroke="#a855f7" stroke-width="3"/><text x="4" y="34" class="tl">SDA</text><text x="4" y="64" class="tl">SCL</text>${[['ESP32', 40, '#14b8a6', 'controller'], ['TMP102', 170, '#f59e0b', '0x48'], ['OLED', 300, '#3b82f6', '0x3C']].map(([n, x, c, a]) => `<g><rect x="${x}" y="78" width="90" height="34" rx="6" fill="${c}33" stroke="${c}"/><text x="${x + 45}" y="94" text-anchor="middle" class="tl">${n}</text><text x="${x + 45}" y="107" text-anchor="middle" class="tl">${a}</text><path d="M${x + 30} 78 V30 M${x + 60} 78 V60" stroke="${c}" stroke-width="2"/></g>`).join('')}</svg>
      <div class="wrow"><label>MSB byte <input class="inp sm hb1" value="0x17"></label><label>LSB byte <input class="inp sm hb2" value="0x80"></label></div><div class="wout"></div></div>`;
    const draw = () => { const p = s => parseInt(s, s.trim().toLowerCase().startsWith('0x') ? 16 : 10) & 255; const a = p(host.querySelector('.hb1').value), b = p(host.querySelector('.hb2').value); const raw = (a << 4) | (b >> 4); const T = (raw & 0x800 ? raw - 4096 : raw) * 0.0625;
      host.querySelector('.wout').innerHTML = `<div class="formula">raw = (MSB &lt;&lt; 4) | (LSB &gt;&gt; 4) = (${a} × 16) + ${b >> 4} = ${raw}<br>temperature = raw × 0.0625 °C = <b>${T.toFixed(2)} °C</b></div><p class="wnote">I2C uses just two wires (SDA data, SCL clock) shared by many devices, each with its own address. The TMP102 sends its temperature as a 12-bit number in two bytes.</p>`; };
    host.querySelectorAll('input').forEach(i => i.oninput = () => { u(); draw(); }); draw();
  };

  /* ---------------- packet journey (Wi-Fi / IoT) ---------------- */
  W.wifi = (host, o) => {
    const u = used(o); const steps = [['📟 ESP32', 'Your board connects to the Wi-Fi router with the network name (SSID) and password. The router gives it an IP address (e.g. 192.168.4.23) using DHCP.'], ['📶 Router', 'The router forwards packets between your local network and the internet. Signal strength (RSSI) is shown in dBm: −50 is excellent, −80 is weak.'], ['🌍 Internet', 'Packets travel through many networks using IP addresses. DNS turns names like api.example.com into IP addresses.'], ['☁️ Server', 'The server receives an HTTP request (GET to read, POST to send data) or an MQTT message, and stores your sensor data.'], ['📊 Dashboard', 'Anyone with access can now see the live data on a web dashboard or phone app.']];
    host.innerHTML = `<div class="pj">${steps.map((s, i) => `<button class="pjs" data-i="${i}"><span>${s[0]}</span></button>${i < steps.length - 1 ? '<span class="pja">➜</span>' : ''}`).join('')}</div><div class="wout"><p class="wnote">Click each step to follow a packet from your ESP32 to a dashboard.</p></div>`;
    host.querySelectorAll('.pjs').forEach(b => b.onclick = () => { u(); host.querySelectorAll('.pjs').forEach(x => x.classList.toggle('on', x === b)); host.querySelector('.wout').innerHTML = `<div class="verdict good">${steps[+b.dataset.i][1]}</div>`; });
  };
  W.iot = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Temperature', 0, 500, 235, 1, v => (v / 10).toFixed(1) + ' °C')}${slider('Humidity', 0, 100, 45, 1, v => v + ' %')}</div><div class="iot"><pre class="qcode json"></pre><div class="iot-d"><div class="gauge2"><b class="gt"></b><span>temperature</span></div><div class="gauge2"><b class="gh"></b><span>humidity</span></div></div></div><p class="wnote">Devices usually send data as <b>JSON</b>: name/value pairs. Python: <code>json.dumps({"temp": 23.5})</code>. MQTT topics look like <code>school/lab1/temp</code>; HTTP uses POST to a URL.</p>`;
    const draw = () => { const [t, h] = vals(host); host.querySelector('.json').textContent = JSON.stringify({ device: 'esp32-lab1', temp: t / 10, hum: h }, null, 2); host.querySelector('.gt').textContent = (t / 10).toFixed(1) + '°C'; host.querySelector('.gh').textContent = h + '%'; };
    bindSliders(host, [v => (v / 10).toFixed(1) + ' °C', v => v + ' %'], () => { u(); draw(); }); draw();
  };

  /* ---------------- debounce ---------------- */
  W.debounce = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Debounce delay', 0, 50, 0, 1, v => v + ' ms')}<button class="btn-sm" data-again>Press again</button></div><div class="wout"></div>`;
    const c = canvas(host, 150); let seed = 1;
    const draw = () => { const del = vals(host)[0]; const [x, Wd, H] = ctx2d(c); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; seed = seed || 1; const bounces = []; let t = 10; for (let k = 0; k < 7; k++) { bounces.push(t); t += 0.5 + rnd() * 1.8; } const X = t => 40 + t / 60 * (Wd - 50);
      x.strokeStyle = '#94a3b8'; x.lineWidth = 2; x.beginPath(); let lv = 1; x.moveTo(X(0), 30); bounces.forEach((b, i) => { x.lineTo(X(b), lv ? 30 : 60); lv = i % 2 ? 1 : 0; x.lineTo(X(b), lv ? 30 : 60); }); x.lineTo(X(60), 60); x.stroke(); x.fillStyle = '#8fa0c8'; x.font = '11px Nunito'; x.fillText('raw', 6, 50);
      const edges = del === 0 ? bounces.filter((b, i) => i % 2 === 0).length : 1;
      x.strokeStyle = '#22d3ee'; x.beginPath(); x.moveTo(X(0), 100); const te = del === 0 ? bounces[0] : bounces[0] + del; x.lineTo(X(te), 100); x.lineTo(X(te), 130); x.lineTo(X(60), 130); x.stroke(); x.fillText('read', 6, 120);
      host.querySelector('.wout').innerHTML = `<div class="verdict ${edges > 1 ? 'risky' : 'good'}">${edges > 1 ? `Without debouncing your program might count <b>${edges} presses</b> for one push!` : `With a ${del} ms debounce, one push = <b>one press</b>.`}</div><p class="wnote">Metal contacts bounce for a few milliseconds. Fix it in code (wait ~20 ms and read again, or ignore changes for 20–50 ms) or with a small capacitor.</p>`; };
    bindSliders(host, [v => v + ' ms'], () => { u(); draw(); }); host.querySelector('[data-again]').onclick = () => { u(); seed = Math.floor(Math.random() * 1e6) + 1; draw(); }; setTimeout(draw, 30);
  };

  /* ---------------- sensors gallery ---------------- */
  W.sensors = (host, o) => {
    const u = used(o); const S = [['🌡', 'Temperature (TMP36)', 'Analog voltage: 10 mV per °C (0.5 V at 0 °C).'], ['💡', 'Light (LDR)', 'Resistance changes with light: use a voltage divider → analog.'], ['📏', 'Distance (HC-SR04)', 'Digital pulses: echo time ∝ distance.'], ['🚶', 'Motion (PIR)', 'Digital: HIGH when movement is detected.'], ['🌀', 'Potentiometer', 'Analog: a knob that is a voltage divider.'], ['🧭', 'IMU (MPU6050)', 'I2C: acceleration and rotation in 3 axes.'], ['💧', 'Humidity (DHT22)', 'Digital one-wire protocol: temperature + humidity.'], ['⚫', 'Line sensor (IR)', 'Digital/analog: reflects on white, not on black.']];
    host.innerHTML = `<div class="sgal">${S.map((s, i) => `<button class="sgc" data-i="${i}"><span>${s[0]}</span><b>${s[1]}</b></button>`).join('')}</div><div class="wout"><p class="wnote">Click a sensor to see what kind of signal it gives.</p></div>`;
    host.querySelectorAll('.sgc').forEach(b => b.onclick = () => { u(); host.querySelectorAll('.sgc').forEach(x => x.classList.toggle('on', x === b)); const s = S[+b.dataset.i]; host.querySelector('.wout').innerHTML = `<div class="verdict good">${s[0]} <b>${s[1]}</b>: ${s[2]}</div>`; });
  };

  /* ---------------- UNO pinout ---------------- */
  W['uno-pins'] = (host, o) => {
    const u = used(o); const pins = VL.BOARDS.uno.pins;
    const col = side => pins.filter(p => p.side === side).map(p => `<button class="up" data-id="${p.id}" style="--c:${VL.PIN_TYPES[p.type].color};margin-top:${p.row % 1 ? 10 : 0}px">${p.label}</button>`).join('');
    host.innerHTML = `<div class="unop"><div class="ucol">${col('L')}</div><div class="uboard"><span>UNO R3</span><small>ATmega328P · 16 MHz · 5 V · 32 KB flash · 2 KB RAM</small><div class="uchip"></div></div><div class="ucol">${col('R')}</div><div class="uinfo"><p class="wnote">Click a pin.</p></div></div>`;
    host.querySelectorAll('.up').forEach(b => b.onclick = () => { u(); const p = pins.find(x => x.id === b.dataset.id); host.querySelectorAll('.up').forEach(x => x.classList.toggle('on', x === b)); host.querySelector('.uinfo').innerHTML = `<h4 style="color:${VL.PIN_TYPES[p.type].color}">${p.label} · ${p.title}</h4><div class="chip static" style="--c:${VL.PIN_TYPES[p.type].color}">${VL.PIN_TYPES[p.type].name}</div>${p.funcs.length ? `<div class="funcs">${p.funcs.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}<p>${esc(p.desc)}</p>`; });
  };

  /* ---------------- Raspberry Pi 40-pin header ---------------- */
  const RPI = ['3V3', '5V', 'GPIO2 SDA', '5V', 'GPIO3 SCL', 'GND', 'GPIO4', 'GPIO14 TXD', 'GND', 'GPIO15 RXD', 'GPIO17', 'GPIO18 PWM0', 'GPIO27', 'GND', 'GPIO22', 'GPIO23', '3V3', 'GPIO24', 'GPIO10 MOSI', 'GND', 'GPIO9 MISO', 'GPIO25', 'GPIO11 SCLK', 'GPIO8 CE0', 'GND', 'GPIO7 CE1', 'GPIO0 ID_SD', 'GPIO1 ID_SC', 'GPIO5', 'GND', 'GPIO6', 'GPIO12 PWM0', 'GPIO13 PWM1', 'GND', 'GPIO19 PWM1', 'GPIO16', 'GPIO26', 'GPIO20', 'GND', 'GPIO21'];
  W['pi-header'] = (host, o) => {
    const u = used(o); const type = l => /^3V3/.test(l) ? 'power3' : /^5V/.test(l) ? 'power5' : /GND/.test(l) ? 'ground' : /ID_S/.test(l) ? 'flash' : /SDA|SCL|MOSI|MISO|SCLK|CE|TXD|RXD/.test(l) ? 'i2c' : 'gpio';
    host.innerHTML = `<div class="pih"><div class="pig">${RPI.map((l, i) => `<button class="pp" data-i="${i}" style="--c:${VL.PIN_TYPES[type(l)].color}" title="pin ${i + 1}: ${l}">${i + 1}</button>`).join('')}</div><div class="uinfo"><p class="wnote">40-pin header (same on Pi 3, 4 and 5). Odd pins on the left row, even on the right. Click a pin. Code uses the <b>BCM GPIO number</b>, not the physical pin number!</p></div></div>`;
    host.querySelectorAll('.pp').forEach(b => b.onclick = () => { u(); const i = +b.dataset.i, l = RPI[i], t = type(l); host.querySelectorAll('.pp').forEach(x => x.classList.toggle('on', x === b)); const g = (l.match(/GPIO(\d+)/) || [])[1];
      host.querySelector('.uinfo').innerHTML = `<h4 style="color:${VL.PIN_TYPES[t].color}">Physical pin ${i + 1}: ${l}</h4><p>${t === 'gpio' || t === 'i2c' ? `In Python use <b>${g}</b>: <code>LED(${g})</code> (gpiozero) or <code>GPIO.setup(${g}, GPIO.OUT)</code>. 3.3 V logic: never connect 5 V to a GPIO.` : t === 'ground' ? 'Ground (0 V).' : t === 'power5' ? '5 V straight from the power supply: for powering things, never into a GPIO.' : t === 'power3' ? '3.3 V output (limited current).' : 'Reserved for HAT identification EEPROM: avoid.'}${/SDA|SCL/.test(l) ? ' Also I2C.' : /PWM/.test(l) ? ' Hardware PWM capable.' : /MOSI|MISO|SCLK|CE/.test(l) ? ' Also SPI.' : /TXD|RXD/.test(l) ? ' Also serial UART.' : ''}</p>`; });
  };

  /* ---------------- Pi vs Pico ---------------- */
  W['pi-vs-pico'] = (host, o) => {
    const u = used(o); const rows = [['What is it?', 'A full computer (single-board computer)', 'A microcontroller board'], ['Brain', 'Quad-core ARM Cortex-A76 @ 2.4 GHz (Pi 5)', 'RP2040 dual-core Cortex-M0+ @ 133 MHz (Pico); RP2350 on Pico 2'], ['Memory', '2–16 GB RAM', '264 KB RAM, 2 MB flash'], ['Operating system', 'Linux (Raspberry Pi OS)', 'None: runs one program (MicroPython / C)'], ['Boots in', '~20–30 seconds', 'Instantly'], ['Power', '~3–12 W, needs a 5 V/5 A supply (Pi 5)', '< 0.1 W, can run on batteries'], ['Analog inputs', 'No (needs an external ADC)', 'Yes: 3 ADC pins (12-bit)'], ['Best for', 'Screens, cameras, AI, web servers, desktop apps', 'Real-time control: sensors, motors, LEDs'], ['Price', '~$45–120', '~$4–7']];
    host.innerHTML = `<table class="cmp"><tr><th></th><th>🍓 Raspberry Pi 5</th><th>🟢 Raspberry Pi Pico</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table><div class="wrow"><b>Which would you choose?</b></div><div class="sg">${[['A robot that recognises faces with a camera', 0], ['A battery-powered plant watering sensor', 1], ['A web server showing a school dashboard', 0], ['Precise timing for a servo and LEDs', 1]].map(([t, a], i) => `<div class="sgi" data-a="${a}"><span>${t}</span><div><button class="btn-xs" data-k="0">Pi</button><button class="btn-xs" data-k="1">Pico</button></div><em></em></div>`).join('')}</div>`;
    host.querySelectorAll('.sgi').forEach(r => r.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { u(); const ok = +b.dataset.k === +r.dataset.a; r.classList.remove('ok', 'no'); r.classList.add(ok ? 'ok' : 'no'); r.querySelector('em').textContent = ok ? '✅ Good choice!' : '❌ Think about power, speed and what the job needs.'; }));
  };

  /* ---------------- differential drive ---------------- */
  W.kinematics = (host, o) => {
    const u = used(o); let raf, st = { x: 100, y: 70, th: -Math.PI / 2, trail: [] };
    host.innerHTML = `<div class="wrow">${slider('Left wheel', -100, 100, 60, 5, v => v + '%')}${slider('Right wheel', -100, 100, 60, 5, v => v + '%')}<button class="btn-sm" data-rs>Reset</button></div><div class="wout"></div>`;
    const c = canvas(host, 220);
    const step = () => { const [l, r] = vals(host); const vl = l / 100 * 25, vr = r / 100 * 25; const v = (vl + vr) / 2, w = (vl - vr) / 12; const dt = 1 / 60; st.th += w * dt; st.x += v * Math.cos(st.th) * dt; st.y += v * Math.sin(st.th) * dt; st.x = (st.x + 200) % 200; st.y = (st.y + 140) % 140; st.trail.push([st.x, st.y]); if (st.trail.length > 400) st.trail.shift();
      const [x, Wd, H] = ctx2d(c); const s = Math.min(Wd / 200, H / 140); x.fillStyle = '#0f1b3a'; x.fillRect(0, 0, 200 * s, 140 * s); x.fillStyle = 'rgba(168,85,247,.6)'; st.trail.forEach(p => x.fillRect(p[0] * s, p[1] * s, 2, 2));
      x.save(); x.translate(st.x * s, st.y * s); x.rotate(st.th); x.fillStyle = '#3b82f6'; x.beginPath(); x.arc(0, 0, 8 * s, 0, 7); x.fill(); x.fillStyle = '#facc15'; x.beginPath(); x.moveTo(9 * s, 0); x.lineTo(4 * s, -3 * s); x.lineTo(4 * s, 3 * s); x.fill(); x.restore();
      host.querySelector('.wout').innerHTML = `<p class="wnote">${l === r ? (l ? 'Equal speeds → straight line.' : 'Stopped.') : l === -r ? 'Opposite speeds → spins on the spot.' : (l > r ? 'Left faster → turns right.' : 'Right faster → turns left.')} This is how 2-wheel robots steer ("differential drive").</p>`; raf = requestAnimationFrame(step); };
    bindSliders(host, [v => v + '%', v => v + '%'], u); host.querySelector('[data-rs]').onclick = () => { st = { x: 100, y: 70, th: -Math.PI / 2, trail: [] }; }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  };

  /* ---------------- image filters (AI vision) ---------------- */
  W.vision = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow"><button class="btn-sm on" data-k="none">Original</button><button class="btn-sm" data-k="gray">Greyscale</button><button class="btn-sm" data-k="blur">Blur</button><button class="btn-sm" data-k="edge">Edge detect (Sobel)</button><button class="btn-sm" data-k="thresh">Threshold</button><button class="btn-sm" data-k="red">Find red objects</button><label class="btn-sm">📁 Your image<input type="file" accept="image/*" hidden></label></div><div class="vis"><canvas class="v-in" width="240" height="180"></canvas><canvas class="v-out" width="240" height="180"></canvas></div><div class="wout"></div>`;
    const ci = host.querySelector('.v-in'), co = host.querySelector('.v-out'); const xi = ci.getContext('2d'), xo = co.getContext('2d');
    const scene = () => { xi.fillStyle = '#9ec5e8'; xi.fillRect(0, 0, 240, 180); xi.fillStyle = '#6aa84f'; xi.fillRect(0, 130, 240, 50); xi.fillStyle = '#e53935'; xi.beginPath(); xi.arc(70, 100, 28, 0, 7); xi.fill(); xi.fillStyle = '#1e3a8a'; xi.fillRect(130, 60, 60, 70); xi.fillStyle = '#fbc02d'; xi.beginPath(); xi.arc(200, 30, 16, 0, 7); xi.fill(); xi.fillStyle = '#c62828'; xi.fillRect(150, 140, 30, 20); };
    const apply = k => {
      const im = xi.getImageData(0, 0, 240, 180), d = im.data, out = xo.createImageData(240, 180), D = out.data; const g = new Float32Array(240 * 180);
      for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      const at = (x, y) => g[Math.min(179, Math.max(0, y)) * 240 + Math.min(239, Math.max(0, x))]; let count = 0;
      for (let y = 0; y < 180; y++) for (let x = 0; x < 240; x++) { const i = (y * 240 + x) * 4; let v;
        if (k === 'none') { D[i] = d[i]; D[i + 1] = d[i + 1]; D[i + 2] = d[i + 2]; D[i + 3] = 255; continue; }
        if (k === 'gray') v = g[y * 240 + x];
        if (k === 'blur') { v = 0; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) v += at(x + a, y + b); v /= 25; }
        if (k === 'edge') { const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1); const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1); v = Math.min(255, Math.hypot(gx, gy)); }
        if (k === 'thresh') v = g[y * 240 + x] > 128 ? 255 : 0;
        if (k === 'red') { const r = d[i], gg = d[i + 1], b = d[i + 2]; const red = r > 150 && gg < 90 && b < 90; if (red) count++; D[i] = red ? 255 : g[y * 240 + x] * 0.3; D[i + 1] = red ? 40 : g[y * 240 + x] * 0.3; D[i + 2] = red ? 40 : g[y * 240 + x] * 0.3; D[i + 3] = 255; continue; }
        D[i] = D[i + 1] = D[i + 2] = v; D[i + 3] = 255; }
      xo.putImageData(out, 0, 0);
      const T = { none: 'The camera gives a grid of pixels: each has red, green and blue values from 0 to 255.', gray: 'Greyscale: brightness = 0.299 R + 0.587 G + 0.114 B. Simpler data for the next steps.', blur: 'Blur: each pixel becomes the average of its 5×5 neighbours (a convolution). Removes noise.', edge: 'Sobel edge detection: two 3×3 kernels measure how fast brightness changes horizontally and vertically. Edges = outlines of objects. The first layers of a neural network learn filters like this!', thresh: 'Threshold: every pixel becomes black or white (brighter than 128 → white).', red: `Colour rule: pixel is "red" if R > 150, G < 90, B < 90. Found ${count} red pixels. A robot can steer toward the red object's centre.` };
      host.querySelector('.wout').innerHTML = `<p class="wnote">${T[k]}</p>`;
    };
    let cur = 'none';
    host.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { u(); cur = b.dataset.k; host.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); apply(cur); });
    host.querySelector('input[type=file]').onchange = e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => { xi.drawImage(img, 0, 0, 240, 180); apply(cur); u(); }; img.src = URL.createObjectURL(f); };
    scene(); apply('none');
  };

  /* ---------------- C++ vs Python ---------------- */

  /* ---------------- v3 widgets ---------------- */
  W.rgbmix = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Red duty', 0, 255, 255, 1, v => v)}${slider('Green duty', 0, 255, 0, 1, v => v)}${slider('Blue duty', 0, 255, 160, 1, v => v)}</div><div class="rgbm"><div class="rgbm-led"></div><div class="wout"></div></div>`;
    const draw = () => { const [r, g, b] = vals(host); const c = `rgb(${r},${g},${b})`; const el = host.querySelector('.rgbm-led'); el.style.background = c; el.style.boxShadow = `0 0 ${10 + (r + g + b) / 12}px ${c}`; host.querySelector('.wout').innerHTML = `<div class="formula">analogWrite(R, ${r}) → ${(r / 255 * 100).toFixed(0)}% on<br>analogWrite(G, ${g}) → ${(g / 255 * 100).toFixed(0)}% on<br>analogWrite(B, ${b}) → ${(b / 255 * 100).toFixed(0)}% on<br>Mixed colour <b>#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}</b></div><p class="wnote">Your eye averages the three tiny LEDs into one colour. Red + green = yellow, red + blue = magenta, all three = white.</p>`; };
    bindSliders(host, [v => v, v => v, v => v], () => { u(); draw(); }); draw();
  };
  W.seriespar = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('R1', 0, 36, 12, 1, i => VL.fmtOhm(e12(i)))}${slider('R2', 0, 36, 18, 1, i => VL.fmtOhm(e12(i)))}${slider('Supply', 1, 12, 5, 0.5, v => v + ' V')}</div><div class="wout"></div>`;
    const draw = () => { const [a, b, V] = vals(host); const R1 = e12(a), R2 = e12(b); const Rs = R1 + R2, Rp = R1 * R2 / (R1 + R2); host.querySelector('.wout').innerHTML = `<div class="sp2"><div class="formula"><b>Series</b> (one path)<br>R = R1 + R2 = <b>${VL.fmtOhm(Math.round(Rs))}</b><br>I = V / R = <b>${fI(V / Rs)}</b> (same in both)<br>V1 = ${(V * R1 / Rs).toFixed(2)} V · V2 = ${(V * R2 / Rs).toFixed(2)} V</div><div class="formula"><b>Parallel</b> (two paths)<br>R = R1·R2 / (R1+R2) = <b>${VL.fmtOhm(Math.round(Rp))}</b><br>I total = <b>${fI(V / Rp)}</b><br>I1 = ${fI(V / R1)} · I2 = ${fI(V / R2)} (same ${V} V across both)</div></div><p class="wnote">Series: resistances add, current is shared. Parallel: total resistance is smaller than the smallest one, voltage is shared.</p>`; };
    bindSliders(host, [i => VL.fmtOhm(e12(i)), i => VL.fmtOhm(e12(i)), v => v + ' V'], () => { u(); draw(); }); draw();
  };
  W.acdc = (host, o) => {
    const u = used(o);
    host.innerHTML = `<div class="wrow">${slider('Frequency', 1, 60, 50, 1, v => v + ' Hz')}${slider('Peak voltage', 1, 325, 325, 1, v => v + ' V')}</div>`; const c = canvas(host, 190); const out = document.createElement('div'); host.appendChild(out);
    let ph = 0, raf; const draw = () => { const [f, Vp] = vals(host); const [x, W, H] = ctx2d(c); const mid = H / 2; x.strokeStyle = '#334155'; x.beginPath(); x.moveTo(0, mid); x.lineTo(W, mid); x.stroke(); x.strokeStyle = '#22d3ee'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= W; i++) { const t = i / W * 0.1; const v = Math.sin(2 * Math.PI * f * t + ph); i ? x.lineTo(i, mid - v * (H / 2 - 14) * Vp / 325) : x.moveTo(i, mid - v * (H / 2 - 14) * Vp / 325); } x.stroke(); x.strokeStyle = '#f59e0b'; x.beginPath(); x.moveTo(0, mid - (H / 2 - 14) * 0.6 * 12 / 12 * 0.35); x.lineTo(W, mid - (H / 2 - 14) * 0.35); x.stroke(); x.fillStyle = '#f59e0b'; x.font = '12px Nunito'; x.fillText('DC (battery): constant', 8, mid - (H / 2 - 14) * 0.35 - 6); x.fillStyle = '#22d3ee'; x.fillText('AC: changes direction ' + (2 * f) + ' times per second (0.1 s shown)', 8, H - 6);
      out.innerHTML = `<div class="formula">V<sub>rms</sub> = V<sub>peak</sub> / √2 = <b>${(Vp / Math.SQRT2).toFixed(0)} V</b> · period T = 1 / f = <b>${(1000 / f).toFixed(1)} ms</b></div><p class="wnote">Mains electricity is AC (230 V rms, 50 Hz in Europe and North Africa). Electronics run on DC, so chargers convert AC to low-voltage DC.</p>`; };
    bindSliders(host, [v => v + ' Hz', v => v + ' V'], () => { u(); draw(); }); const anim = () => { ph += 0.04; draw(); raf = requestAnimationFrame(anim); }; anim(); return () => cancelAnimationFrame(raf);
  };
  W.cppvspy = (host, o) => {
    const u = used(o); const pairs = [['const int led = 13;', 'led = Pin(13, Pin.OUT)', 'Choose the pin'], ['void setup() {\n  pinMode(led, OUTPUT);\n}', '# setup code runs once at the top', 'Run once'], ['void loop() {', 'while True:', 'Repeat forever'], ['  digitalWrite(led, HIGH);', '    led.on()', 'Pin HIGH'], ['  delay(500);', '    sleep(0.5)', 'Wait (ms vs s!)'], ['}', '# indentation ends the block', 'End of block']];
    host.innerHTML = `<table class="cmp code">${pairs.map((p, i) => `<tr data-i="${i}"><td><pre>${VL.highlightPy(p[0].split('\n')[0], 'cpp')}${p[0].includes('\n') ? '\n' + p[0].split('\n').slice(1).map(l => VL.highlightPy(l, 'cpp')).join('\n') : ''}</pre></td><td class="mid">${p[2]}</td><td><pre>${VL.highlightPy(p[1])}</pre></td></tr>`).join('')}</table><p class="wnote">Hover a row. C++ uses <b>braces { }</b> and <b>semicolons ;</b>; Python uses <b>indentation</b>. C++ must declare types (<code>int</code>, <code>float</code>…).</p>`;
    host.querySelectorAll('tr').forEach(r => r.onmouseenter = u);
  };
})();
