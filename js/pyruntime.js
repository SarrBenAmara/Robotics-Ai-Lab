/* =========================================================================
   pyruntime.js : virtual hardware for the built-in interpreter
   machine (Pin, PWM, ADC, I2C, Timer, TouchPad, time_pulse_us), time,
   network (virtual Wi-Fi), urequests (virtual cloud), json, math, random,
   ssd1306 (OLED), gpiozero, RPi.GPIO, signal, and the Arduino API.
   Virtual clock: sleep() advances time; every pin change is recorded.
   ========================================================================= */
(function () {
  const P = VL.PyCore; const { F, num, NAT, PyErr, PyBytes, PyModule, mkTuple, str, repr, truthy } = P;
  class Stop { constructor(r) { this.reason = r; } }
  const VALID = { esp32: new Set([0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39]), pico: new Set([...Array(29).keys()]), rpi: new Set([...Array(26).keys()].map(i => i + 2)), uno: new Set([...Array(20).keys()]) };
  const INPUT_ONLY = new Set([34, 35, 36, 39]);
  const arg = (a, k, i, name, def) => i < a.length ? a[i] : (name in k ? k[name] : def);

  function run(src, limitMs, cfg, extra) {
    cfg = cfg || {}; extra = extra || {};
    const board = cfg.board || 'esp32';
    const VM = { t: 0, limit: limitMs || 10000, lineCost: 0.01, events: [], serial: [], servo: [], pwmf: {}, pwmfEv: [], http: [], warnings: [], pins: {}, state: {}, steps: 0, maxSteps: 2000000, maxEvents: 20000, reason: 'complete', irqs: [], timers: [], future: {}, trace: [], oled: [], tones: [], inHandler: false, lastLine: 0, lastTraceT: -1 };
    const warn = w => { if (!VM.warnings.includes(w)) VM.warnings.push(w); };
    /* ---------------- robot ---------------- */
    const R = { on: !!cfg.robot, x: 30, y: 70, th: 0, t: 0, log: [], bumps: 0, inb: false, P: {}, W: 200, H: 140, boxes: [], line: [] };
    if (R.on) { R.P = cfg.robot.pins || {}; if (cfg.robot.arena === 'line') { for (let k = 0; k < 240; k++) R.line.push([100 + 75 * Math.cos(2 * Math.PI * k / 240), 70 + 45 * Math.sin(2 * Math.PI * k / 240)]); R.x = 100; R.y = 25; } else { R.boxes = [[80, 55, 24, 30], [128, 96, 32, 26], [150, 18, 18, 24]]; } R.log.push([0, R.x, R.y, R.th, 0]); }
    const pv = p => p === undefined || p === null ? 0 : (VM.state[p] || 0);
    const wheel = (a, b) => { const va = pv(a), vb = pv(b); if (va > 0 && !vb) return 25 * va; if (vb > 0 && !va) return -25 * vb; return 0; };
    const hit = (x, y) => { const r = 8; if (x < r || y < r || x > R.W - r || y > R.H - r) return true; return R.boxes.some(([bx, by, bw, bh]) => { const cx = Math.min(Math.max(x, bx), bx + bw), cy = Math.min(Math.max(y, by), by + bh); return (x - cx) ** 2 + (y - cy) ** 2 < r * r; }); };
    function robotTo(t) {
      if (!R.on) return; const Pn = R.P;
      while (R.t < t - 1e-9) {
        const dt = Math.min(5, t - R.t); const vl = wheel(Pn.l1, Pn.l2), vr = wheel(Pn.r1, Pn.r2); const v = (vl + vr) / 2, w = (vl - vr) / 12, s = dt / 1000;
        const nth = R.th + w * s, nx = R.x + v * Math.cos(R.th) * s, ny = R.y + v * Math.sin(R.th) * s; let bump = 0;
        if (hit(nx, ny)) { bump = 1; if (!R.inb) R.bumps++; R.inb = true; } else { R.x = nx; R.y = ny; R.inb = false; }
        R.th = nth; R.t += dt; const last = R.log[R.log.length - 1];
        if (R.t - last[0] >= 40 || bump !== last[4]) R.log.push([+R.t.toFixed(2), +R.x.toFixed(2), +R.y.toFixed(2), +R.th.toFixed(4), bump]);
      }
    }
    function robotDistance() {
      const fx = R.x + 8 * Math.cos(R.th), fy = R.y + 8 * Math.sin(R.th), dx = Math.cos(R.th), dy = Math.sin(R.th); let best = 1e9;
      const slab = (x0, y0, x1, y1, inside) => { let tmin = -1e9, tmax = 1e9; for (const [o, d, lo, hi] of [[fx, dx, x0, x1], [fy, dy, y0, y1]]) { if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) return null; } else { let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); } } if (tmin > tmax) return null; return inside ? tmax : (tmin > 0 ? tmin : null); };
      const w = slab(0, 0, R.W, R.H, true); if (w !== null) best = w; R.boxes.forEach(([bx, by, bw, bh]) => { const d = slab(bx, by, bx + bw, by + bh, false); if (d !== null && d < best) best = d; }); return Math.min(best, 400);
    }
    function robotOnline(side) { const sg = side === 'l' ? 1 : -1; const px = R.x + 8 * Math.cos(R.th) + sg * 2.5 * Math.sin(R.th), py = R.y + 8 * Math.sin(R.th) - sg * 2.5 * Math.cos(R.th); if (!R.line.length) return 0; let d = 1e9; R.line.forEach(([a, b]) => { d = Math.min(d, (px - a) ** 2 + (py - b) ** 2); }); return d < 1.8 * 1.8 ? 1 : 0; }

    /* ---------------- time ---------------- */
    function levelFrom(lv, pin, pull) {
      if (lv === null || lv === undefined) {
        if (board === 'esp32' && INPUT_ONLY.has(pin) && pull !== null && pull !== -1 && pull !== undefined) { warn(`GPIO${pin} has no internal pull resistor (GPIO 34-39): the input is floating`); return 0; }
        if (pull === 2) return 1; if (pull === 1) return 0;
        warn(`GPIO${pin} input is floating (nothing connected and no pull resistor): readings are unreliable`); return 0;
      }
      return lv ? 1 : 0;
    }
    function levelAt(pin, t, pull) {
      if (R.on) { if (pin === R.P.sl) return robotOnline('l'); if (pin === R.P.sr) return robotOnline('r'); }
      const seq = (cfg.inputs || {})[pin]; let lv = null; if (seq) for (const [ts, v] of seq) { if (ts <= t) lv = v; else break; }
      return levelFrom(lv, pin, pull);
    }
    function fireHandlers(target) {
      if (VM.inHandler) return; const evs = [];
      VM.irqs.forEach(q => { const seq = (cfg.inputs || {})[q.pin]; if (!seq) return; let prev = levelAt(q.pin, VM.t, q.pull); seq.forEach(([ts, lv]) => { if (ts > VM.t && ts <= target) { const nv = levelFrom(lv, q.pin, q.pull); if (nv !== prev) { if ((nv === 1 && (q.trig & 1)) || (nv === 0 && (q.trig & 2))) evs.push({ t: ts, fn: q.fn, obj: q.obj }); prev = nv; } } }); });
      VM.timers.forEach(tm => { if (!tm.active) return; let nt = tm.next; while (nt <= target) { evs.push({ t: nt, fn: tm.cb, obj: tm.obj, tm }); if (tm.oneShot) break; nt += tm.period; } });
      evs.sort((a, b) => a.t - b.t);
      for (const e of evs) { if (e.tm) { if (!e.tm.active) continue; e.tm.next = e.t + e.tm.period; if (e.tm.oneShot) e.tm.active = false; } VM.t = e.t; robotTo(e.t); VM.inHandler = true; try { if (e.fn) I.call(e.fn, [e.obj]); } finally { VM.inHandler = false; } }
      VM.timers.forEach(tm => { if (tm.active && tm.next <= target) { while (tm.next <= target) tm.next += tm.period; } });
    }
    function adv(ms) {
      ms = num(ms); if (!(ms >= 0)) throw new PyErr('ValueError', 'sleep length must be non-negative');
      let target = Math.min(VM.t + ms, VM.limit); fireHandlers(target); robotTo(target); VM.t = target;
      if (VM.t >= VM.limit) { VM.reason = 'time'; throw new Stop('time'); }
    }
    function out(pin, v) {
      v = typeof v === 'number' ? v : num(v); if (v !== 0 && v !== 1) v = Math.round(v * 10000) / 10000;
      if (VM.future[pin]) VM.future[pin] = VM.future[pin].filter(e => e[0] <= VM.t);
      if (VM.state[pin] === v && VM.events.length && VM.events.slice(-50).some(e => e[1] === pin)) return;
      VM.state[pin] = v; VM.events.push([+VM.t.toFixed(4), pin, v]);
      if (VM.events.length > VM.maxEvents) { VM.reason = 'events'; throw new Stop('events'); }
    }
    const intArg = (v, what) => { if (typeof v === 'boolean' || (typeof v !== 'number')) throw new PyErr('TypeError', `${what} must be an integer GPIO number, e.g. Pin(4, Pin.OUT)`); return v; };

    /* ---------------- machine ---------------- */
    const Pin = NAT((a, k) => {
      let id = arg(a, k, 0, 'id');
      if (board === 'pico' && id === 'LED') id = 25;
      intArg(id, 'Pin id');
      if (board === 'esp32' && id >= 6 && id <= 11) throw new PyErr('ValueError', `invalid pin: GPIO${id} is used by the flash memory (GPIO6-11 are reserved)`);
      if (!(VALID[board] || VALID.esp32).has(id)) throw new PyErr('ValueError', `invalid pin: this board has no GPIO${id}`);
      const o = { __class__: 'Pin', _id: id, _mode: null, _pull: arg(a, k, 2, 'pull', -1), __repr__: () => `Pin(${id})` };
      o.init = NAT((a2, k2) => { const mode = arg(a2, k2, 0, 'mode', -1), pull = arg(a2, k2, 1, 'pull', -1), value = arg(a2, k2, 2, 'value', null);
        if (pull !== -1) o._pull = pull;
        if (mode === 3 || mode === 7) { if (board === 'esp32' && INPUT_ONLY.has(id)) throw new PyErr('ValueError', `pin can only be input: GPIO${id} has no output driver`); o._mode = 'out'; VM.pins[id] = 'out'; out(id, value !== null ? (truthy(value) ? 1 : 0) : (VM.state[id] || 0)); }
        else if (mode === 1) { o._mode = 'in'; VM.pins[id] = 'in'; } else if (mode !== -1) throw new PyErr('ValueError', 'invalid pin mode'); return null; });
      o.value = NAT((a2) => { if (!a2.length) return o._mode === 'out' ? (VM.state[id] ? 1 : 0) : levelAt(id, VM.t, o._pull); if (o._mode !== 'out') { warn(`Writing to GPIO${id}, which is not configured as Pin.OUT`); return null; } out(id, truthy(a2[0]) ? 1 : 0); return null; });
      o.on = NAT(() => o.value([1])); o.off = NAT(() => o.value([0])); o.high = o.on; o.low = o.off;
      o.toggle = NAT(() => o.value([VM.state[id] ? 0 : 1]));
      o.irq = NAT((a2, k2) => { const handler = 'handler' in k2 ? k2.handler : (a2.length ? a2[0] : null); const trig = 'trigger' in k2 ? k2.trigger : (a2.length > 1 ? a2[1] : 3); VM.irqs.push({ pin: id, trig: typeof trig === 'number' ? trig : 3, fn: handler, obj: o, pull: o._pull }); return null; });
      o.__call__ = o.value;
      const mode = arg(a, k, 1, 'mode', -1); if (mode !== -1) o.init([mode, o._pull, arg(a, k, 3, 'value', null)], {});
      return o;
    });
    Object.assign(Pin, { IN: 1, OUT: 3, OPEN_DRAIN: 7, PULL_UP: 2, PULL_DOWN: 1, IRQ_RISING: 1, IRQ_FALLING: 2, __type: true, __name: 'Pin' });
    const pid = p => (p && p._id !== undefined) ? p._id : num(p);
    const PWM = NAT((a, k) => {
      const pin = a[0] && a[0]._id !== undefined ? a[0] : I.call(Pin, [a[0]], {}); const id = pin._id;
      if (board === 'esp32' && INPUT_ONLY.has(id)) throw new PyErr('ValueError', 'pin can only be input');
      const o = { __class__: 'PWM', _id: id, _f: num(arg(a, k, 1, 'freq', board === 'esp32' ? 5000 : 1000)), _d: board === 'esp32' ? 0.5 : 0 };
      VM.pins[id] = 'pwm'; VM.pwmf[id] = o._f; VM.pwmfEv.push([VM.t, id, o._f]);
      if ('duty' in k) o._d = num(k.duty) / 1023; if ('duty_u16' in k) o._d = num(k.duty_u16) / 65535; if ('duty_ns' in k) o._d = num(k.duty_ns) / (1e9 / o._f);
      const apply = () => { o._d = Math.max(0, Math.min(1, o._d)); out(id, o._d); };
      o.freq = NAT(a2 => { if (!a2.length) return o._f; o._f = num(a2[0]); VM.pwmf[id] = o._f; VM.pwmfEv.push([VM.t, id, o._f]); if (VM.state[id] !== undefined) { VM.events.push([+VM.t.toFixed(4), id, VM.state[id]]); } return null; });
      o.duty = NAT(a2 => { if (!a2.length) return Math.round(o._d * 1023); o._d = num(a2[0]) / 1023; apply(); return null; });
      o.duty_u16 = NAT(a2 => { if (!a2.length) return Math.round(o._d * 65535); o._d = num(a2[0]) / 65535; apply(); return null; });
      o.duty_ns = NAT(a2 => { if (!a2.length) return Math.round(o._d * 1e9 / o._f); o._d = num(a2[0]) / (1e9 / o._f); apply(); return null; });
      o.deinit = NAT(() => { o._d = 0; out(id, 0); return null; });
      apply(); return o;
    }); PWM.__type = true;
    const FS = { 0: 1.0, 1: 1.34, 2: 2.0, 3: 3.6 };
    const ADC = NAT((a, k) => {
      let id = pid(a[0]); if (board === 'pico' && id >= 0 && id <= 4 && !(a[0] && a[0]._id !== undefined)) id = { 0: 26, 1: 27, 2: 28, 3: 29, 4: 'temp' }[id];
      if (board === 'esp32' && ![32, 33, 34, 35, 36, 39, 0, 2, 4, 12, 13, 14, 15, 25, 26, 27].includes(id)) throw new PyErr('ValueError', `invalid Pin for ADC: GPIO${id} has no analog input`);
      const o = { __class__: 'ADC', _a: num(arg(a, k, 1, 'atten', 0)) };
      const V = () => id === 'temp' ? 0.706 - (24 - 27) * 0.001721 : num((cfg.analog || {})[id] || 0);
      o.atten = NAT(a2 => { o._a = num(a2[0]); return null; }); o.width = NAT(() => null);
      o.read_uv = NAT(() => Math.round(V() * 1e6));
      o.read = NAT(() => { if (board !== 'esp32') throw new PyErr('AttributeError', "'ADC' object has no attribute 'read' (use read_u16())"); return Math.floor(Math.max(0, Math.min(4095, V() / FS[o._a] * 4095))); });
      o.read_u16 = NAT(() => { const fs = board === 'esp32' ? FS[o._a] : 3.3; return Math.floor(Math.max(0, Math.min(65535, V() / fs * 65535))); });
      return o;
    }); Object.assign(ADC, { ATTN_0DB: 0, ATTN_2_5DB: 1, ATTN_6DB: 2, ATTN_11DB: 3, WIDTH_9BIT: 0, WIDTH_10BIT: 1, WIDTH_11BIT: 2, WIDTH_12BIT: 3, __type: true });
    const tempBytes = () => { const T = 23.5 + 1.5 * Math.sin(VM.t / 5000); const raw = Math.round(T / 0.0625) & 0xFFF; return [raw >> 4, (raw & 0xF) << 4]; };
    const I2C = NAT(() => {
      const o = { __class__: 'I2C' }; const chk = addr => { addr = num(addr); if (addr !== 0x3C && addr !== 0x48) throw new PyErr('OSError', `[Errno 19] ENODEV: no device at address 0x${addr.toString(16).toUpperCase().padStart(2, '0')}`); return addr; };
      o.scan = NAT(() => [0x3C, 0x48]);
      o.readfrom_mem = NAT(a => { const addr = chk(a[0]); adv(0.2); const n = num(a[2]); return new PyBytes(addr === 0x48 && num(a[1]) === 0 ? tempBytes().slice(0, n) : new Array(n).fill(0)); });
      o.readfrom = NAT(a => { const addr = chk(a[0]); adv(0.2); return new PyBytes(addr === 0x48 ? tempBytes().slice(0, num(a[1])) : new Array(num(a[1])).fill(0)); });
      o.writeto = NAT(a => { chk(a[0]); adv(0.2); return a[1] && a[1].a ? a[1].a.length : 1; }); o.writeto_mem = NAT(a => { chk(a[0]); adv(0.2); return null; });
      return o;
    }); I2C.__type = true;
    const time_pulse_us = NAT((a) => { const p = pid(a[0]); const timeout = a.length > 2 ? num(a[2]) : 1000000;
      let d = null; if (R.on && p === R.P.echo) d = robotDistance(); else if (cfg.distance && p === cfg.distance.echo) d = num(cfg.distance.cm);
      if (d !== null) { const us = Math.round(2 * d / 0.0343); if (us > timeout) { adv(timeout / 1000); return -1; } adv(us / 1000); return us; }
      adv(timeout / 1000); return -1; });
    const Timer = NAT((a, k) => {
      const o = { __class__: 'Timer' }; const tm = { active: false, period: 1000, next: 0, cb: null, oneShot: false, obj: o };
      o.init = NAT((a2, k2) => { const per = k2.period !== undefined ? num(k2.period) : (k2.freq !== undefined ? 1000 / num(k2.freq) : 1000); tm.period = Math.max(1, per); tm.oneShot = num(k2.mode !== undefined ? k2.mode : 1) === 0; tm.cb = k2.callback || null; tm.next = VM.t + tm.period; tm.active = true; if (!VM.timers.includes(tm)) VM.timers.push(tm); return null; });
      o.deinit = NAT(() => { tm.active = false; return null; });
      if ('period' in k || 'freq' in k || 'callback' in k) o.init([], k);
      return o;
    }); Object.assign(Timer, { PERIODIC: 1, ONE_SHOT: 0, __type: true });
    const TouchPad = NAT((a) => { const id = pid(a[0]); if (![0, 2, 4, 12, 13, 14, 15, 27, 32, 33].includes(id)) throw new PyErr('ValueError', `GPIO${id} is not a touch pin`); return { __class__: 'TouchPad', read: NAT(() => { const seq = (cfg.inputs || {})[id]; let lv = null; if (seq) for (const [ts, v] of seq) { if (ts <= VM.t) lv = v; else break; } return lv === 0 || lv === 1 ? 120 + Math.round(Math.random() * 20) : 620 + Math.round(Math.random() * 30); }), config: NAT(() => null) }; }); TouchPad.__type = true;
    const notYet = name => NAT(() => { throw new PyErr('NotImplementedError', `${name} is not simulated in this virtual lab yet`); });
    const machine = new PyModule('machine', { Pin, PWM, ADC, I2C, SoftI2C: I2C, Timer, TouchPad, time_pulse_us, SPI: notYet('machine.SPI'), UART: notYet('machine.UART'),
      freq: NAT(() => board === 'esp32' ? 160000000 : 125000000), reset: NAT(() => { VM.reason = 'reset'; throw new Stop('reset'); }),
      deepsleep: NAT(a => { VM.serial.push([VM.t, `(deep sleep for ${a.length ? num(a[0]) : '∞'} ms: the board would now use ~10 µA and restart afterwards)\n`]); VM.reason = 'deepsleep'; throw new Stop('deepsleep'); }),
      lightsleep: NAT(a => { adv(a.length ? num(a[0]) : 1000); return null; }), unique_id: NAT(() => new PyBytes([0x24, 0x0a, 0xc4, 0x12, 0x34, 0x56])), disable_irq: NAT(() => 0), enable_irq: NAT(() => null) });
    const time = new PyModule('time', {
      sleep: NAT(a => { adv(num(a[0]) * 1000); return null; }), sleep_ms: NAT(a => { adv(num(a[0])); return null; }), sleep_us: NAT(a => { adv(num(a[0]) / 1000); return null; }),
      ticks_ms: NAT(() => Math.floor(VM.t)), ticks_us: NAT(() => Math.floor(VM.t * 1000)), ticks_diff: NAT(a => num(a[0]) - num(a[1])), ticks_add: NAT(a => num(a[0]) + num(a[1])),
      time: NAT(() => board === 'rpi' ? F(VM.t / 1000) : Math.floor(VM.t / 1000)), monotonic: NAT(() => F(VM.t / 1000)), localtime: NAT(() => mkTuple([2026, 11, 11, 10, 0, Math.floor(VM.t / 1000) % 60, 2, 315]))
    });
    /* ---------------- network ---------------- */
    let wifi = null;
    const WLAN = NAT(() => { if (wifi) return wifi; const o = { __class__: 'WLAN', _act: false, _ok: null };
      o.active = NAT(a => { if (a.length) o._act = truthy(a[0]); return o._act; });
      o.scan = NAT(() => { if (!o._act) throw new PyErr('OSError', 'Wifi Not Started: call wlan.active(True) first'); adv(800); return [mkTuple([new PyBytes([...'VirtualLab'].map(c => c.charCodeAt(0))), new PyBytes([36, 10, 196, 0, 0, 1]), 6, -48, 3, false]), mkTuple([new PyBytes([...'School-Guest'].map(c => c.charCodeAt(0))), new PyBytes([36, 10, 196, 0, 0, 2]), 11, -71, 0, false]), mkTuple([new PyBytes([...'Robotics-Club'].map(c => c.charCodeAt(0))), new PyBytes([36, 10, 196, 0, 0, 3]), 1, -80, 3, false])]; });
      o.connect = NAT((a, k) => { if (!o._act) throw new PyErr('OSError', 'Wifi Internal State Error: call wlan.active(True) first'); const ssid = arg(a, k, 0, 'ssid'), key = arg(a, k, 1, 'key'); if (ssid === 'VirtualLab' && key === 'robotics123') o._ok = VM.t + 1500; else { o._ok = null; warn('Wi-Fi: wrong network name or password (use VirtualLab / robotics123)'); } return null; });
      o.isconnected = NAT(() => o._ok !== null && VM.t >= o._ok);
      o.status = NAT(a => a.length && a[0] === 'rssi' ? -48 : (o._ok !== null && VM.t >= o._ok ? 1010 : o._ok !== null ? 1001 : 1000));
      o.ifconfig = NAT(() => mkTuple(o._ok !== null && VM.t >= o._ok ? ['192.168.4.23', '255.255.255.0', '192.168.4.1', '8.8.8.8'] : ['0.0.0.0', '0.0.0.0', '0.0.0.0', '0.0.0.0']));
      o.config = NAT(a => a[0] === 'mac' ? new PyBytes([36, 10, 196, 18, 52, 86]) : null); o.disconnect = NAT(() => { o._ok = null; return null; });
      wifi = o; return o; });
    const network = new PyModule('network', { STA_IF: 0, AP_IF: 1, WLAN });
    const toJS = v => v instanceof Map ? Object.fromEntries([...v.entries()].map(([k, x]) => [str(k), toJS(x)])) : Array.isArray(v) ? v.map(toJS) : v instanceof P.PyFloat ? v.v : v;
    const fromJS = v => Array.isArray(v) ? v.map(fromJS) : v && typeof v === 'object' ? new Map(Object.entries(v).map(([k, x]) => [k, fromJS(x)])) : typeof v === 'number' && !Number.isInteger(v) ? F(v) : v;
    const http = (method, url, payload) => { if (!wifi || !(wifi._ok !== null && VM.t >= wifi._ok)) throw new PyErr('OSError', '[Errno 113] EHOSTUNREACH: not connected to Wi-Fi'); adv(120);
      if (method === 'POST') VM.http.push([+VM.t.toFixed(2), str(url), toJS(payload)]);
      const text = method === 'POST' ? '{"ok": true}' : '{"temperature": 21.5, "city": "Tunis", "source": "virtual cloud"}';
      return { __class__: 'Response', status_code: 200, text, json: NAT(() => fromJS(JSON.parse(text))), close: NAT(() => null) }; };
    const urequests = new PyModule('urequests', { get: NAT(a => http('GET', a[0])), post: NAT((a, k) => http('POST', a[0], k.json !== undefined ? k.json : k.data)) });
    const pyJson = v => { if (v === null) return 'null'; if (v === true) return 'true'; if (v === false) return 'false'; if (typeof v === 'number') return String(v); if (v instanceof P.PyFloat) return (Number.isInteger(v.v) ? v.v.toFixed(1) : String(v.v)); if (typeof v === 'string') return JSON.stringify(v); if (Array.isArray(v)) return '[' + v.map(pyJson).join(', ') + ']'; if (v instanceof Map) return '{' + [...v.entries()].map(([k, x]) => JSON.stringify(str(k)) + ': ' + pyJson(x)).join(', ') + '}'; throw new PyErr('TypeError', `Object of type ${P.typeName(v)} is not JSON serializable`); };
    const json = new PyModule('json', { dumps: NAT(a => pyJson(a[0])), loads: NAT(a => { try { return fromJS(JSON.parse(str(a[0]))); } catch (e) { throw new PyErr('ValueError', 'syntax error in JSON'); } }) });
    const mathM = new PyModule('math', { pi: F(Math.PI), e: F(Math.E), inf: F(Infinity), sqrt: NAT(a => { if (num(a[0]) < 0) throw new PyErr('ValueError', 'math domain error'); return F(Math.sqrt(num(a[0]))); }), sin: NAT(a => F(Math.sin(num(a[0])))), cos: NAT(a => F(Math.cos(num(a[0])))), tan: NAT(a => F(Math.tan(num(a[0])))), atan2: NAT(a => F(Math.atan2(num(a[0]), num(a[1])))), atan: NAT(a => F(Math.atan(num(a[0])))), floor: NAT(a => Math.floor(num(a[0]))), ceil: NAT(a => Math.ceil(num(a[0]))), fabs: NAT(a => F(Math.abs(num(a[0])))), pow: NAT(a => F(Math.pow(num(a[0]), num(a[1])))), log: NAT(a => F(a.length > 1 ? Math.log(num(a[0])) / Math.log(num(a[1])) : Math.log(num(a[0])))), log10: NAT(a => F(Math.log10(num(a[0])))), exp: NAT(a => F(Math.exp(num(a[0])))), radians: NAT(a => F(num(a[0]) * Math.PI / 180)), degrees: NAT(a => F(num(a[0]) * 180 / Math.PI)), hypot: NAT(a => F(Math.hypot(...a.map(num)))), trunc: NAT(a => Math.trunc(num(a[0]))), isclose: NAT(a => Math.abs(num(a[0]) - num(a[1])) < 1e-9) });
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const random = new PyModule('random', { random: NAT(() => F(rnd())), randint: NAT(a => num(a[0]) + Math.floor(rnd() * (num(a[1]) - num(a[0]) + 1))), randrange: NAT(a => a.length > 1 ? num(a[0]) + Math.floor(rnd() * (num(a[1]) - num(a[0]))) : Math.floor(rnd() * num(a[0]))), choice: NAT(a => a[0][Math.floor(rnd() * a[0].length)]), uniform: NAT(a => F(num(a[0]) + rnd() * (num(a[1]) - num(a[0])))), seed: NAT(a => { seed = num(a[0]) || 1; return null; }), getrandbits: NAT(a => Math.floor(rnd() * Math.pow(2, num(a[0])))) });
    /* ---------------- OLED (ssd1306) ---------------- */
    const SSD1306 = NAT((a) => { const w = num(a[0]), h = num(a[1]); let ops = [];
      const o = { __class__: 'SSD1306_I2C', width: w, height: h };
      const add = op => { ops.push(op); if (ops.length > 400) ops = ops.slice(-400); return null; };
      o.fill = NAT(a2 => { ops = [['fill', num(a2[0])]]; return null; }); o.text = NAT(a2 => add(['text', str(a2[0]), num(a2[1]), num(a2[2]), a2.length > 3 ? num(a2[3]) : 1]));
      o.pixel = NAT(a2 => add(['pixel', num(a2[0]), num(a2[1]), a2.length > 2 ? num(a2[2]) : 1])); o.rect = NAT(a2 => add(['rect', ...a2.slice(0, 5).map(num)])); o.fill_rect = NAT(a2 => add(['fill_rect', ...a2.slice(0, 5).map(num)]));
      o.hline = NAT(a2 => add(['fill_rect', num(a2[0]), num(a2[1]), num(a2[2]), 1, num(a2[3])])); o.vline = NAT(a2 => add(['fill_rect', num(a2[0]), num(a2[1]), 1, num(a2[2]), num(a2[3])])); o.line = NAT(a2 => add(['line', ...a2.slice(0, 5).map(num)]));
      o.show = NAT(() => { adv(25); VM.oled.push([+VM.t.toFixed(2), ops.slice()]); if (VM.oled.length > 3000) VM.oled.shift(); return null; }); o.invert = NAT(() => null); o.contrast = NAT(() => null); o.poweroff = NAT(() => null); o.poweron = NAT(() => null);
      return o; }); SSD1306.__type = true;
    const ssd1306 = new PyModule('ssd1306', { SSD1306_I2C: SSD1306 });
    /* ---------------- gpiozero / RPi.GPIO ---------------- */
    const rpiPin = p => { const n = typeof p === 'string' ? parseInt(p.replace(/GPIO|BCM/i, ''), 10) : num(p); if (!VALID.rpi.has(n)) throw new PyErr('ValueError', `GPIO${n} is not a valid BCM GPIO number on the Raspberry Pi (use 2-27)`); return n; };
    const gzLED = (pwm) => NAT((a, k) => { const pin = rpiPin(a[0]); VM.pins[pin] = pwm ? 'pwm' : 'out'; out(pin, truthy(k.initial_value) ? 1 : 0);
      const o = { __class__: pwm ? 'PWMLED' : 'LED', pin };
      o.on = NAT(() => { out(pin, 1); return null; }); o.off = NAT(() => { out(pin, 0); return null; }); o.toggle = NAT(() => { out(pin, VM.state[pin] ? 0 : 1); return null; });
      Object.defineProperty(o, 'is_lit', { get: () => !!VM.state[pin], enumerable: true }); Object.defineProperty(o, 'value', { get: () => pwm ? F(VM.state[pin] || 0) : (VM.state[pin] ? 1 : 0), set: v => out(pin, pwm ? Math.max(0, Math.min(1, num(v))) : (truthy(v) ? 1 : 0)), enumerable: true });
      o.blink = NAT((a2, k2) => { const on = num(arg(a2, k2, 0, 'on_time', 1)), off = num(arg(a2, k2, 1, 'off_time', 1)), n = arg(a2, k2, 2, 'n', null), bg = truthy(arg(a2, k2, 3, 'background', true)); let t = VM.t, c = 0; const fut = []; while (t < VM.limit && (n === null || c < num(n))) { fut.push([+t.toFixed(4), pin, 1]); fut.push([+(t + on * 1000).toFixed(4), pin, 0]); t += (on + off) * 1000; c++; } VM.future[pin] = fut; if (!bg) adv(t - VM.t); return null; });
      if (pwm) o.pulse = NAT((a2, k2) => { const fi = num(arg(a2, k2, 0, 'fade_in_time', 1)), fo = num(arg(a2, k2, 1, 'fade_out_time', 1)); let t = VM.t; const fut = []; while (t < VM.limit) { for (let i = 0; i <= 10; i++) fut.push([+(t + i * fi * 100).toFixed(4), pin, i / 10]); t += fi * 1000; for (let i = 10; i >= 0; i--) fut.push([+(t + (10 - i) * fo * 100).toFixed(4), pin, i / 10]); t += fo * 1000; } VM.future[pin] = fut; return null; });
      o.close = NAT(() => null); return o; });
    const gzButton = NAT((a, k) => { const pin = rpiPin(a[0]); const pullUp = k.pull_up === undefined ? true : truthy(k.pull_up); VM.pins[pin] = 'in'; const pull = pullUp ? 2 : 1;
      const o = { __class__: 'Button', pin, _wp: null, _wr: null };
      const pressed = () => { const v = levelAt(pin, VM.t, pull); return pullUp ? v === 0 : v === 1; };
      Object.defineProperty(o, 'is_pressed', { get: pressed, enumerable: true }); Object.defineProperty(o, 'value', { get: () => pressed() ? 1 : 0, enumerable: true });
      o.wait_for_press = NAT((a2) => { const end = a2.length && a2[0] !== null ? VM.t + num(a2[0]) * 1000 : VM.limit; while (!pressed() && VM.t < end) adv(5); return pressed(); });
      o.wait_for_release = NAT((a2) => { const end = a2.length && a2[0] !== null ? VM.t + num(a2[0]) * 1000 : VM.limit; while (pressed() && VM.t < end) adv(5); return null; });
      const reg = (kind, fn) => { if (!fn) return; const trig = (kind === 'p') === pullUp ? 2 : 1; VM.irqs.push({ pin, trig, fn: NAT(() => I.call(fn, [], {})), obj: o, pull }); };
      Object.defineProperty(o, 'when_pressed', { get: () => o._wp, set: f => { o._wp = f; reg('p', f); }, enumerable: true });
      Object.defineProperty(o, 'when_released', { get: () => o._wr, set: f => { o._wr = f; reg('r', f); }, enumerable: true });
      o.close = NAT(() => null); return o; });
    const gzDist = NAT((a, k) => { const o = { __class__: 'DistanceSensor' }; Object.defineProperty(o, 'distance', { get: () => F(Math.min(1, num((cfg.distance || { cm: 50 }).cm) / 100)), enumerable: true }); return o; });
    const gzServo = NAT((a) => { const pin = rpiPin(a[0]); VM.pins[pin] = 'servo'; const o = { __class__: 'Servo' }; let val = 0; const set = v => { val = Math.max(-1, Math.min(1, num(v))); VM.servo.push([+VM.t.toFixed(3), pin, Math.round((val + 1) * 90)]); };
      o.min = NAT(() => set(-1)); o.mid = NAT(() => set(0)); o.max = NAT(() => set(1)); Object.defineProperty(o, 'value', { get: () => F(val), set, enumerable: true }); return o; });
    const gpiozero = new PyModule('gpiozero', { LED: gzLED(false), PWMLED: gzLED(true), Buzzer: gzLED(false), Button: gzButton, DistanceSensor: gzDist, Servo: gzServo, Motor: notYet('gpiozero.Motor') });
    const gpioSt = { mode: null, setup: {} };
    const RPiGPIO = new PyModule('RPi.GPIO', { BCM: 11, BOARD: 10, OUT: 0, IN: 1, HIGH: 1, LOW: 0, PUD_UP: 22, PUD_DOWN: 21, PUD_OFF: 20,
      setmode: NAT(a => { gpioSt.mode = a[0]; return null; }), setwarnings: NAT(() => null), cleanup: NAT(() => null),
      setup: NAT((a, k) => { if (gpioSt.mode !== 11) throw new PyErr('RuntimeError', 'Please set pin numbering mode using GPIO.setmode(GPIO.BCM)'); const p = rpiPin(a[0]); const d = num(a[1]); gpioSt.setup[p] = [d, k.pull_up_down || 20]; VM.pins[p] = d === 0 ? 'out' : 'in'; if (d === 0) out(p, k.initial ? 1 : 0); return null; }),
      output: NAT(a => { const p = num(a[0]); if (!gpioSt.setup[p] || gpioSt.setup[p][0] !== 0) throw new PyErr('RuntimeError', 'The GPIO channel has not been set up as an OUTPUT'); out(p, truthy(a[1]) ? 1 : 0); return null; }),
      input: NAT(a => { const p = num(a[0]); const s = gpioSt.setup[p] || [1, 20]; if (s[0] === 0) return VM.state[p] ? 1 : 0; return levelAt(p, VM.t, s[1] === 22 ? 2 : s[1] === 21 ? 1 : -1); }) });
    const RPi = new PyModule('RPi', { GPIO: RPiGPIO });
    const signal = new PyModule('signal', { pause: NAT(() => { adv(VM.limit); return null; }) });
    /* ---------------- Arduino API ---------------- */
    const AM = {};
    const chkU = p => { p = num(p); if (!VALID.uno.has(p)) throw new PyErr('ValueError', `pin ${p} does not exist on the Arduino UNO`); return p; };
    let serialOn = false;
    const sfmt = (x, a) => { if (a.length && P.isNum(x) && [16, 8, 2].includes(num(a[0]))) return Math.trunc(num(x)).toString(num(a[0])).toUpperCase(); if (typeof x === 'boolean') return x ? '1' : '0'; if (x instanceof P.PyFloat) return num(x).toFixed(a.length ? num(a[0]) : 2); return str(x); };
    const swrite = s => { if (!serialOn) warn('Serial.print used before Serial.begin()'); VM.serial.push([+VM.t.toFixed(3), s]); if (VM.serial.length > 3000) { VM.reason = 'serial'; throw new Stop('serial'); } };
    const Serial = { __class__: 'Serial', begin: NAT(() => { serialOn = true; return null; }), print: NAT(a => { swrite(sfmt(a.length ? a[0] : '', a.slice(1))); return null; }), println: NAT(a => { swrite(sfmt(a.length ? a[0] : '', a.slice(1)) + '\n'); return null; }), available: NAT(() => 0), read: NAT(() => -1), write: NAT(a => { swrite(str(a[0])); return null; }) };
    const ServoC = NAT(() => { const o = { __class__: 'Servo', _p: null, _a: 90 }; o.attach = NAT(a => { o._p = num(a[0]); VM.pins[o._p] = 'servo'; return 1; }); o.write = NAT(a => { const v = Math.max(0, Math.min(180, Math.trunc(num(a[0])))); o._a = v; if (o._p === null) { warn('Servo.write() called before attach()'); return null; } VM.servo.push([+VM.t.toFixed(3), o._p, v]); return null; }); o.writeMicroseconds = NAT(a => o.write([Math.round((num(a[0]) - 544) / (2400 - 544) * 180)])); o.read = NAT(() => o._a); o.attached = NAT(() => o._p !== null); o.detach = NAT(() => { o._p = null; return null; }); return o; }); ServoC.__type = true;
    const ard = {
      HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2, LED_BUILTIN: 13, A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, Serial, Servo: ServoC,
      pinMode: NAT(a => { const p = chkU(a[0]); const m = num(a[1]); AM[p] = m; VM.pins[p] = m === 1 ? 'out' : 'in'; if (m === 1) out(p, VM.state[p] || 0); return null; }),
      digitalWrite: NAT(a => { const p = chkU(a[0]); if (AM[p] !== 1) { warn(`digitalWrite(${p}) on a pin that is not OUTPUT: call pinMode(${p}, OUTPUT) in setup()`); return null; } out(p, truthy(a[1]) ? 1 : 0); return null; }),
      digitalRead: NAT(a => { const p = chkU(a[0]); if (AM[p] === 1) return VM.state[p] ? 1 : 0; return levelAt(p, VM.t, AM[p] === 2 ? 2 : -1); }),
      analogRead: NAT(a => { let p = num(a[0]); if (p >= 0 && p <= 5) p += 14; if (p < 14 || p > 19) throw new PyErr('ValueError', 'analogRead needs A0-A5'); adv(0.1); return Math.floor(Math.max(0, Math.min(1023, num((cfg.analog || {})[p] || 0) / 5 * 1023))); }),
      analogWrite: NAT(a => { const p = chkU(a[0]); const v = Math.max(0, Math.min(255, Math.trunc(num(a[1])))); AM[p] = 1; VM.pins[p] = 'pwm'; if ([3, 5, 6, 9, 10, 11].includes(p)) { VM.pwmf[p] = [5, 6].includes(p) ? 980 : 490; out(p, v / 255); } else { warn(`pin ${p} has no PWM (~ only on 3, 5, 6, 9, 10, 11): analogWrite acts as digitalWrite`); out(p, v >= 128 ? 1 : 0); } return null; }),
      delay: NAT(a => { adv(num(a[0])); return null; }), delayMicroseconds: NAT(a => { adv(num(a[0]) / 1000); return null; }),
      millis: NAT(() => Math.floor(VM.t)), micros: NAT(() => Math.floor(VM.t * 1000)),
      pulseIn: NAT(a => Math.max(0, num(time_pulse_us([a[0], a[1], a.length > 2 ? a[2] : 1000000], {})))),
      map: NAT(a => { const [x, i0, i1, o0, o1] = a.map(num); return i1 === i0 ? o0 : Math.trunc((x - i0) * (o1 - o0) / (i1 - i0) + o0); }),
      constrain: NAT(a => { const [x, lo, hi] = a.map(num); const r = Math.max(lo, Math.min(hi, x)); return a[0] instanceof P.PyFloat ? F(r) : r; }),
      random: NAT(a => a.length > 1 ? num(a[0]) + Math.floor(rnd() * (num(a[1]) - num(a[0]))) : Math.floor(rnd() * num(a[0]))), randomSeed: NAT(() => null),
      tone: NAT(a => { const p = chkU(a[0]); const f = num(a[1]); VM.tones.push([+VM.t.toFixed(3), p, f]); out(p, 0.5); if (a.length > 2) { const end = VM.t + num(a[2]); VM.future[p] = [[+end.toFixed(3), p, 0]]; VM.tones.push([+end.toFixed(3), p, 0]); } return null; }),
      noTone: NAT(a => { const p = chkU(a[0]); VM.tones.push([+VM.t.toFixed(3), p, 0]); out(p, 0); return null; }),
      F: NAT(a => a[0])
    };
    /* ---------------- interpreter ---------------- */
    const inputs = extra.inputs ? extra.inputs.slice() : null;
    const I = VL.PyCore.Interp({
      step(line) {
        VM.steps++; VM.t += VM.lineCost;
        if (R.on && VM.t - R.t > 5) robotTo(VM.t);
        if (line !== VM.lastLine || VM.t - VM.lastTraceT > 50) { if (VM.trace.length < 40000) VM.trace.push([+VM.t.toFixed(3), line]); VM.lastLine = line; VM.lastTraceT = VM.t; }
        if (VM.t >= VM.limit) { VM.t = VM.limit; VM.reason = 'time'; throw new Stop('time'); }
        if (VM.steps > VM.maxSteps) { VM.reason = 'steps'; throw new Stop('steps'); }
      },
      print(s) { VM.serial.push([+VM.t.toFixed(3), s]); if (VM.serial.length > 3000) { VM.reason = 'serial'; throw new Stop('serial'); } },
      input(prompt) { if (!inputs) throw new PyErr('RuntimeError', 'input() is not available on a microcontroller'); const v = inputs.length ? String(inputs.shift()) : ''; VM.serial.push([VM.t, prompt + v + '\n']); return v; },
      importModule(name, line) {
        const mods = { machine, time, utime: time, network, urequests, requests: urequests, json, ujson: json, math: mathM, random, urandom: random, ssd1306, gpiozero, 'RPi.GPIO': RPiGPIO, RPi, signal, micropython: new PyModule('micropython', { const: NAT(a => a[0]) }), sys: new PyModule('sys', { platform: board, version: '3.4.0 (virtual)', exit: NAT(() => { VM.reason = 'complete'; throw new Stop('exit'); }) }) };
        if (mods[name]) return mods[name];
        throw new PyErr('ModuleNotFoundError', `no module named '${name}'` + (name === 'numpy' || name === 'cv2' ? ' (not available in the virtual lab)' : ''), line);
      }
    });
    if (cfg.arduino) Object.entries(ard).forEach(([k, v]) => I.G.vars.set(k, v));
    let err = null;
    const lmap = cfg.lineMap;
    const mapLine = l => lmap && l > 0 && l <= lmap.length ? lmap[l - 1] : l;
    try { I.run(src); if (!cfg.arduino && (VM.timers.some(t => t.active) || VM.irqs.length)) adv(VM.limit); robotTo(VM.t); }
    catch (e) {
      if (e instanceof Stop) { if (e.reason === 'exit') VM.reason = 'complete'; }
      else if (e instanceof PyErr) { err = { type: e.type, msg: e.pmsg, line: mapLine(e.line || I.curLine()), syntax: e.type === 'SyntaxError' || e.type === 'IndentationError' }; VM.reason = err.syntax ? 'complete' : 'error'; }
      else if (e && (e.s === 'break' || e.s === 'continue')) { err = { type: 'SyntaxError', msg: `'${e.s}' outside loop`, line: mapLine(I.curLine()), syntax: true }; }
      else if (e && e.constructor && e.constructor.name === 'ReturnSig') { err = { type: 'SyntaxError', msg: "'return' outside function", line: mapLine(I.curLine()), syntax: true }; }
      else if (e instanceof RangeError) { err = { type: 'RecursionError', msg: 'maximum recursion depth exceeded', line: mapLine(I.curLine()), syntax: false }; VM.reason = 'error'; }
      else { console.error(e); err = { type: 'RuntimeError', msg: String(e && e.message || e), line: mapLine(I.curLine()), syntax: false }; VM.reason = 'error'; }
    }
    const ev = VM.events.slice(); Object.values(VM.future).forEach(f => f.forEach(e => { if (e[0] <= VM.t) ev.push(e); })); ev.sort((a, b) => a[0] - b[0]);
    return {
      events: ev.map(([t, pin, v]) => ({ t, pin, v })), serial: VM.serial.map(([t, text]) => ({ t, text })), servo: VM.servo.map(([t, pin, a]) => ({ t, pin, a })),
      pins: VM.pins, end: VM.t, reason: VM.reason, error: err, steps: VM.steps, pwmf: VM.pwmf, pwmfEv: VM.pwmfEv, http: VM.http, warnings: VM.warnings,
      robot: R.on ? R.log : null, bumps: R.bumps, trace: lmap ? VM.trace.map(([t, l]) => [t, mapLine(l)]) : VM.trace, oled: VM.oled, tones: VM.tones
    };
  }
  VL.PyRun = { run };
})();
