/* =========================================================================
   lessons-a.js : shared helpers + ELECTRONICS and ELECTRICITY worlds
   ========================================================================= */
(function () {
  VL.LESSONS = VL.LESSONS || [];
  const C = () => VL.Circuit;
  /* ---- helpers for breadboard checks ---- */
  const LC = VL.LC = {
    root: (wb, k) => wb.diag && wb.diag.res0 ? wb.diag.res0.nets.root(C().pointNet(k)) : null,
    legNets: (wb, c) => C().compLegs(c).map(l => LC.root(wb, C().hkey(l))),
    pinWireRoots: (wb, label) => wb.circ.wires.flatMap(w => [w.a, w.b].includes('P:' + (VL.PINS.find(p => p.label === label) || {}).id) ? [w.a, w.b] : []).map(k => LC.root(wb, k)),
    railHas: (wb, label, rails) => { const pin = VL.PINS.find(p => p.label === label); if (!pin) return false; const pr = LC.root(wb, 'P:' + pin.id); return rails.some(r => { const y = { 'RT+': 0, 'RT-': 1, 'RB+': 15, 'RB-': 16 }[r]; return LC.root(wb, `H:5:${y}`) === pr; }); },
    lit: (wb, min = 0.0005) => (wb.diag && wb.diag.ledInfo || []).filter(i => i.Ion > min),
    issues: wb => (wb.allIssues ? wb.allIssues() : []).filter(i => i.level === 'error').map(i => i.code),
    measuredAcross: (wb, comp) => { if (!wb.meas || !comp) return null; const n = LC.legNets(wb, comp); const m = [...wb.meas.V].reverse().find(v => { const a = LC.root(wb, v.a), b = LC.root(wb, v.b); return (a === n[0] && b === n[1]) || (a === n[1] && b === n[0]); }); return m ? Math.abs(m.v) : null; },
    comps: (wb, type) => wb.circ.comps.filter(c => c.type === type)
  };
  const ESP_LED = { type: 'led', pin: 4, color: 'red', label: 'Red LED' };
  const ESP_BTN = { type: 'button', pin: 15, wiring: 'gnd', sched: '1-3, 5-6', label: 'Push button' };
  const reversed3v3 = { comps: [{ id: 'r1', type: 'resistor', value: 330, x: 8, y: 5, rot: 0 }, { id: 'l1', type: 'led', color: 'red', x: 12, y: 4, rot: 0, flip: true }], wires: [{ a: 'P:L1', b: 'H:8:3', color: '#ef4444' }, { a: 'P:L14', b: 'H:13:3', color: '#111827' }] };
  const ok3v3 = { comps: [{ id: 'r1', type: 'resistor', value: 330, x: 8, y: 5, rot: 0 }, { id: 'l1', type: 'led', color: 'red', x: 12, y: 4, rot: 0 }], wires: [{ a: 'P:L1', b: 'H:8:3', color: '#ef4444' }, { a: 'P:L14', b: 'H:13:3', color: '#111827' }] };

  /* ============================== ELECTRONICS ============================== */
  VL.LESSONS.push(
  {
    id: 'electronics-1', world: 'electronics', n: 1, title: 'Meet the breadboard', minutes: 30, level: 'Beginner', skill: 'wiring',
    objectives: ['Explain how the holes of a breadboard are connected inside', 'Use the + and − power rails', 'Build a powered LED circuit without soldering'],
    intro: 'A breadboard lets you build circuits <b>without soldering</b>. The secret is the metal strips hidden inside. Let\'s discover which holes are connected!',
    theory: [
      { h: 'Terminal strips', p: '<p>In the middle area, every <b>column of 5 holes</b> (a–e, and separately f–j) is one metal clip. Two legs in the same column are connected. Two legs in different columns are not.</p>' },
      { h: 'The centre gap', p: '<p>The groove in the middle separates a–e from f–j. Chips (ICs) sit across it so each of their pins gets its own strip.</p>' },
      { h: 'Power rails', p: '<p>The long rows marked <b style="color:#ef4444">+</b> (red) and <b style="color:#3b82f6">−</b> (blue) run along the whole board. Connect them once to power and GND, then plug parts in anywhere along them.</p>' },
      { h: 'Golden rules', p: '<ul><li>Never put both legs of a part in the same strip (it is short-circuited).</li><li>One leg or wire per hole.</li><li>Turn the power off while changing wires.</li></ul>' }
    ],
    widget: 'breadboard', widgetTitle: 'find the hidden connections',
    practice: {
      type: 'bench', title: 'Power the rails', board: 'esp32', ignore: ['POWER_PIN'],
      goal: 'Wire <b>3V3 → the + rail</b> and <b>GND → the − rail</b>. Then build <b>+ rail → resistor → LED → − rail</b> so the LED lights. (No code needed: 3V3 is always on.)',
      hints: ['Where do the long red and blue lines run on the breadboard?', 'Click the 3V3 pin, then a hole in the top + row. Do the same for GND and the − row. Parts can then reach the rails with short wires.', 'Place a 330 Ω resistor, connect one end to the + rail with a wire, put the LED anode in the resistor\'s other column, and wire the LED cathode column to the − rail.'],
      check: wb => [['3V3 is connected to a + rail', LC.railHas(wb, '3V3', ['RT+', 'RB+'])], ['GND is connected to a − rail', LC.railHas(wb, 'GND', ['RT-', 'RB-'])], ['A resistor and an LED are on the board', LC.comps(wb, 'resistor').length > 0 && LC.comps(wb, 'led').length > 0], ['The LED lights safely (0.5–15 mA)', LC.lit(wb).some(i => i.Ion <= 0.015)]]
    },
    quiz: [
      { q: 'Which holes are connected together in the middle of a breadboard?', o: ['All holes in a row a1–a30', 'The 5 holes of one column (a–e)', 'Every hole on the board', 'None: each hole is separate'], a: 1, e: 'Each column of five holes (a–e or f–j) is one metal strip.' },
      { tf: true, q: 'Holes c10 and h10 are connected.', a: false, e: 'False: the centre gap separates a–e from f–j.' },
      { q: 'What happens if both LED legs go in the same column?', o: ['It is brighter', 'It is short-circuited and stays off', 'It blinks', 'Nothing changes'], a: 1, e: 'Both legs touch the same strip, so current bypasses the LED.' },
      { q: 'What are the long + and − rows for?', o: ['Decoration', 'Distributing power and GND along the board', 'Holding chips', 'Measuring current'], a: 1, e: 'The rails carry power and ground everywhere on the board.' },
      { q: 'Why do chips sit across the centre gap?', o: ['So each pin gets its own strip', 'To keep them cool', 'Because they are too big', 'To connect all pins together'], a: 0, e: 'Straddling the gap gives every pin its own column.' }
    ]
  },
  {
    id: 'electronics-2', world: 'electronics', n: 2, title: 'Resistors and the colour code', minutes: 30, level: 'Beginner', skill: 'ohm',
    objectives: ['Explain what a resistor does', 'Read a 4-band colour code', 'Choose standard resistor values'],
    intro: 'Resistors control how much current flows. Each one carries a tiny colour code. Learn to read it like an engineer!',
    theory: [
      { h: 'What a resistor does', p: '<p>A resistor <b>limits current</b>. Its value is in ohms (Ω): 1 kΩ = 1000 Ω, 1 MΩ = 1 000 000 Ω. Bigger value → less current for the same voltage.</p>' },
      { h: 'The 4-band code', p: '<p>Band 1 = first digit, band 2 = second digit, band 3 = multiplier (how many zeros), band 4 = tolerance (gold ±5%).</p><p><b>Black 0, Brown 1, Red 2, Orange 3, Yellow 4, Green 5, Blue 6, Violet 7, Grey 8, White 9.</b></p>' },
      { h: 'Example', p: '<p><b>Red–Red–Brown–Gold</b> = 2, 2, ×10 = <b>220 Ω ±5%</b>.<br><b>Brown–Black–Orange</b> = 1, 0, ×1000 = <b>10 kΩ</b>.</p><p class="muted small">Memory trick: "Black Bears Rarely Order Yellow Gloves, But Vultures Get Wings".</p>' },
      { h: 'Power rating', p: '<p>Small through-hole resistors are usually <b>¼ W</b>. If P = V × I is larger, the resistor overheats (see the Electricity world).</p>' }
    ],
    widget: 'colorcode', widgetTitle: 'colour code decoder',
    practice: { type: 'widget', widget: 'colorcode', need: 3, title: 'Speed challenge', goal: 'Set the bands correctly for <b>3 different resistors</b> in the challenge (press "New resistor" each time).', hints: ['First two bands are digits, the third tells you how many zeros to add.', '470 Ω = 4, 7 and ONE zero → yellow, violet, brown.', 'For 4.7 kΩ = 4700 = 4, 7 and two zeros → yellow, violet, red.'] },
    quiz: [
      { q: 'What are the colours of a 220 Ω resistor?', o: ['Red, red, brown', 'Red, red, red', 'Brown, red, red', 'Red, brown, red'], a: 0, e: '2, 2 and one zero (brown) = 220.' },
      { q: 'Brown, black, orange means…', o: ['103 Ω', '1 kΩ', '10 kΩ', '100 kΩ'], a: 2, e: '1, 0 and three zeros = 10 000 Ω = 10 kΩ.' },
      { q: 'What does the gold band mean?', o: ['×10', 'Tolerance ±5%', 'It is broken', 'Power 1 W'], a: 1, e: 'Gold in the 4th band = ±5% tolerance.' },
      { tf: true, q: 'A bigger resistance lets more current flow (same voltage).', a: false, e: 'False: I = V / R, so more resistance means less current.' },
      { q: '4.7 kΩ equals…', o: ['47 Ω', '470 Ω', '4700 Ω', '47 000 Ω'], a: 2, e: 'k = ×1000: 4.7 × 1000 = 4700 Ω.' }
    ]
  },
  {
    id: 'electronics-3', world: 'electronics', n: 3, title: 'LEDs and diodes', minutes: 35, level: 'Beginner', skill: 'wiring',
    objectives: ['Explain how a diode lets current flow one way', 'Identify LED anode and cathode', 'Describe forward voltage'],
    intro: 'Diodes are one-way streets for current. LEDs are diodes that glow! Let\'s look at their surprising current curve.',
    theory: [
      { h: 'One-way street', p: '<p>A diode conducts when its <b>anode (+)</b> is more positive than its <b>cathode (−)</b> by about its forward voltage. Reversed, it blocks current.</p>' },
      { h: 'LED legs', p: '<p>Long leg = <b>anode (+)</b>. Short leg and flat edge = <b>cathode (−)</b>. Inside, the bigger metal piece (anvil) is usually the cathode.</p>' },
      { h: 'Forward voltage (Vf)', p: '<p>Red ≈ 2.0 V, yellow ≈ 2.1 V, green 2.2–3.0 V, blue/white ≈ 3.0 V. Above Vf the current rises extremely fast, so a <b>resistor</b> must limit it.</p>' },
      { h: 'Choosing the resistor', p: '<div class="formula">R = (V<sub>supply</sub> − V<sub>f</sub>) / I</div><p>For 5 V, red LED, 10 mA: R = (5 − 2) / 0.01 = 300 Ω → use 330 Ω.</p>' }
    ],
    widget: 'ledcurve', widgetTitle: 'LED current vs voltage',
    practice: { type: 'bench', title: 'Rescue the dark LED', board: 'esp32', ignore: ['POWER_PIN'], circuit: reversed3v3, goal: 'This LED circuit on 3V3 stays dark. Find out why and fix it so the LED shines safely.', hints: ['Is the current allowed to flow through the LED in this direction?', 'Look for the + sign: is the anode toward 3V3 or toward GND?', 'Select the LED and press F (Flip) so the anode faces the resistor/3V3 side.'], check: wb => [['LED lights', LC.lit(wb).length > 0], ['Current between 1 and 15 mA', LC.lit(wb, 0.001).some(i => i.Ion <= 0.015)]] },
    quiz: [
      { q: 'Which LED leg is the cathode?', o: ['The long leg', 'The short leg by the flat edge', 'The middle leg', 'Either'], a: 1, e: 'Short leg and flat side = cathode (−).' },
      { q: 'Typical forward voltage of a red LED?', o: ['0.7 V', '2.0 V', '5 V', '12 V'], a: 1, e: 'Red LEDs drop about 1.8–2.2 V.' },
      { q: 'Resistor for a red LED (2 V) at 10 mA from 5 V?', o: ['30 Ω', '300 Ω (use 330 Ω)', '3 kΩ', '30 kΩ'], a: 1, e: '(5 − 2) / 0.01 = 300 Ω.' },
      { tf: true, q: 'A reversed LED conducts but is dimmer.', a: false, e: 'False: a reversed diode blocks current, so the LED stays off.' },
      { q: 'Why is a blue LED dim on 3.3 V with 220 Ω?', o: ['Blue is a dark colour', 'It needs ~3 V, leaving only ~0.3 V for the resistor', 'Blue LEDs need AC', 'The resistor is too small'], a: 1, e: '(3.3 − 3.0) / 220 ≈ 1.4 mA: very little current.' }
    ]
  },
  {
    id: 'electronics-4', world: 'electronics', n: 4, title: 'Capacitors', minutes: 30, level: 'Intermediate', skill: 'ohm',
    objectives: ['Explain how a capacitor stores charge', 'Calculate the RC time constant', 'Know the uses of capacitors'],
    intro: 'Capacitors are tiny, super-fast rechargeable charge tanks. With a resistor, they create time delays.',
    theory: [
      { h: 'Storing charge', p: '<p>Two metal plates separated by an insulator. Capacitance is in farads: µF (micro, 10⁻⁶), nF (nano), pF (pico).</p>' },
      { h: 'RC time constant', p: '<div class="formula">τ = R × C</div><p>After 1τ a capacitor charges to <b>63%</b>; after 5τ it is practically full. 10 kΩ × 100 µF = 1 s.</p>' },
      { h: 'Types and polarity', p: '<p><b>Ceramic</b> (small, no polarity, e.g. 100 nF). <b>Electrolytic</b> (big values, <b>polarised</b>: the stripe marks −). Reversing an electrolytic can make it burst.</p>' },
      { h: 'Uses', p: '<ul><li>Smoothing power supplies (decoupling 100 nF next to chips)</li><li>Timing (RC delays)</li><li>Debouncing buttons</li><li>Filtering noise</li></ul>' }
    ],
    widget: 'rc', widgetTitle: 'RC charging lab',
    practice: { type: 'predict', title: 'Timing calculations', goal: 'Answer all four timing questions using τ = R × C.', items: [
      { q: 'R = 10 kΩ, C = 100 µF. What is τ?', o: ['0.1 s', '1 s', '10 s', '100 s'], a: 1, e: '10 000 × 0.0001 = 1 s.' },
      { q: 'With τ = 1 s, about how long until the capacitor is practically full?', o: ['1 s', '2 s', '5 s', '60 s'], a: 2, e: '5τ = 5 s (≈ 99%).' },
      { q: 'To make the delay twice as long you can…', o: ['Halve R', 'Double C', 'Halve C', 'Use a smaller voltage'], a: 1, e: 'τ = R × C: doubling C (or R) doubles τ.' },
      { q: 'A capacitor charging to 5 V: voltage after exactly 1τ?', o: ['1 V', '2.5 V', '3.2 V (63%)', '5 V'], a: 2, e: '63% of 5 V ≈ 3.16 V.' }
    ] },
    quiz: [
      { q: 'Unit of capacitance?', o: ['Ohm', 'Farad', 'Henry', 'Watt'], a: 1, e: 'Farads (usually µF, nF, pF).' },
      { q: 'τ for 1 kΩ and 1000 µF?', o: ['1 ms', '1 s', '10 s', '0.1 s'], a: 1, e: '1000 × 0.001 = 1 s.' },
      { tf: true, q: 'Electrolytic capacitors can be connected either way round.', a: false, e: 'False: they are polarised; the stripe marks the negative leg.' },
      { q: 'After 5τ a charging capacitor is at…', o: ['50%', '63%', '86%', 'about 99%'], a: 3, e: '5τ ≈ 99.3%.' },
      { q: 'Why put 100 nF capacitors next to chips?', o: ['To store programs', 'To smooth tiny supply voltage dips (decoupling)', 'To make them faster', 'To measure temperature'], a: 1, e: 'Decoupling capacitors supply quick bursts of current and filter noise.' }
    ]
  },
  {
    id: 'electronics-5', world: 'electronics', n: 5, title: 'Transistors as switches', minutes: 35, level: 'Intermediate', skill: 'wiring',
    objectives: ['Explain why a GPIO cannot drive big loads', 'Use an NPN transistor as a switch', 'Calculate the base resistor'],
    intro: 'A GPIO pin gives only a few milliamps. A transistor lets that tiny current control a much bigger one, like a remote-controlled tap.',
    theory: [
      { h: 'Three legs', p: '<p>NPN transistor (e.g. 2N2222, BC547): <b>B</b>ase, <b>C</b>ollector, <b>E</b>mitter. A small current into the base allows a large current from collector to emitter.</p>' },
      { h: 'Gain β', p: '<div class="formula">I<sub>C</sub> ≈ β × I<sub>B</sub> (until saturation)</div><p>β (hFE) is typically 100–300.</p>' },
      { h: 'As a switch', p: '<p>We want <b>saturation</b>: fully ON. Choose R<sub>B</sub> so β × I<sub>B</sub> is comfortably bigger than the load current. I<sub>B</sub> = (V<sub>GPIO</sub> − 0.7) / R<sub>B</sub>.</p>' },
      { h: 'Low-side switching', p: '<p>Load between + supply and collector, emitter to GND. Always add a <b>flyback diode</b> across motors and relays.</p>' }
    ],
    widget: 'transistor', widgetTitle: 'NPN switch simulator',
    practice: { type: 'predict', title: 'Design the switch', goal: 'Calculate like an engineer: answer the four design questions.', items: [
      { q: 'GPIO 3.3 V, R<sub>B</sub> = 1 kΩ. Base current I<sub>B</sub> ≈ ?', o: ['3.3 mA', '2.6 mA', '0.7 mA', '26 mA'], a: 1, e: '(3.3 − 0.7) / 1000 = 2.6 mA.' },
      { q: 'β = 100 and I<sub>B</sub> = 2.6 mA. Maximum collector current?', o: ['26 mA', '260 mA', '2.6 A', '0.26 mA'], a: 1, e: '100 × 2.6 mA = 260 mA.' },
      { q: 'The load needs 100 mA. Is the transistor saturated with I<sub>B</sub> = 2.6 mA and β = 100?', o: ['Yes: 260 mA possible > 100 mA needed', 'No', 'Only at night', 'It depends on the LED colour'], a: 0, e: 'β × I<sub>B</sub> exceeds the load current, so it is fully on.' },
      { q: 'Which part protects the transistor when switching a motor off?', o: ['A capacitor on the base', 'A flyback diode across the motor', 'A bigger LED', 'A fuse on GND'], a: 1, e: 'The motor coil makes a voltage spike when switched off; the diode absorbs it.' }
    ] },
    quiz: [
      { q: 'The three legs of a BJT are…', o: ['Anode, cathode, gate', 'Base, collector, emitter', 'Source, drain, gate', 'Plus, minus, signal'], a: 1, e: 'BJT = base, collector, emitter.' },
      { q: 'Why not drive a motor directly from a GPIO?', o: ['Motors need more current than a pin can give', 'Motors only work at night', 'GPIO is AC', 'It is fine'], a: 0, e: 'A pin gives ~10–20 mA; motors need hundreds.' },
      { q: 'A transistor fully ON is in…', o: ['Cut-off', 'Saturation', 'Breakdown', 'Reverse'], a: 1, e: 'Saturation = like a closed switch.' },
      { tf: true, q: 'With no base current, an NPN transistor is OFF.', a: true, e: 'True: cut-off.' },
      { q: 'V<sub>BE</sub> of a silicon transistor is about…', o: ['0.1 V', '0.7 V', '3.3 V', '5 V'], a: 1, e: 'About 0.6–0.7 V.' }
    ]
  },
  {
    id: 'electronics-6', world: 'electronics', n: 6, title: 'Switches and buttons', minutes: 35, level: 'Beginner', skill: 'code',
    objectives: ['Explain floating inputs', 'Use pull-up and pull-down resistors', 'Read a button in code'],
    intro: 'A button is just two metal contacts. To read it reliably, a pin must never be left floating. Let\'s see why!',
    theory: [
      { h: 'Floating inputs', p: '<p>An input pin connected to nothing picks up electrical noise and reads random 0s and 1s.</p>' },
      { h: 'Pull-up', p: '<p>A resistor to 3.3 V keeps the pin HIGH; the button connects it to GND → LOW when pressed ("active low"). The ESP32 has internal pull-ups: <code>Pin(15, Pin.IN, Pin.PULL_UP)</code>.</p>' },
      { h: 'Pull-down', p: '<p>A resistor to GND keeps the pin LOW; the button connects it to 3.3 V → HIGH when pressed.</p>' },
      { h: 'Reading it', p: '', code: 'button = Pin(15, Pin.IN, Pin.PULL_UP)\nled = Pin(4, Pin.OUT)\nwhile True:\n    if button.value() == 0:   # pressed (active low)\n        led.on()\n    else:\n        led.off()\n    sleep(0.02)' }
    ],
    widget: 'pullup', widgetTitle: 'pull-up / pull-down explorer',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [ESP_LED, ESP_BTN], title: 'Press to light', goal: 'Make the LED on <b>GPIO 4</b> light <b>only while the button on GPIO 15 is pressed</b>. The button goes to GND, so use the internal pull-up. Edit the press times if you like, then RUN.',
      code: 'from machine import Pin\nfrom time import sleep\n\nled = Pin(4, Pin.OUT)\nbutton = Pin(15, Pin.IN)   # <- add the pull-up!\n\nwhile True:\n    # read the button and switch the LED\n    sleep(0.02)\n',
      hints: ['When the button is not pressed, what voltage is on GPIO 15 right now?', 'Add Pin.PULL_UP so the pin reads 1 when released and 0 when pressed.', 'Inside the loop: if button.value() == 0: led.on() else: led.off()'],
      check: (r, lab, c) => { const ts = [0.5, 2, 4, 5.5, 7.5].map(x => x * 1000); const bad = ts.filter(t => (c.valAt(r, 4, t) > 0) !== c.pressed(lab, t)); return bad.length ? { ok: false, msg: `At ${bad.map(t => (t / 1000) + ' s').join(', ')} the LED is ${c.valAt(r, 4, bad[0]) > 0 ? 'on' : 'off'} but the button is ${c.pressed(lab, bad[0]) ? 'pressed' : 'released'}.${r.warnings.length ? ' Check the warnings above.' : ''}` } : { ok: true, msg: 'The LED follows the button exactly.' }; } },
    quiz: [
      { q: 'What is a floating input?', o: ['A pin connected to nothing that reads random values', 'A pin in water', 'An output at 3.3 V', 'A button that sticks'], a: 0, e: 'Unconnected inputs pick up noise.' },
      { q: 'With a pull-up and a button to GND, pressed reads…', o: ['1', '0', '3.3', 'random'], a: 1, e: 'Pressed connects the pin to GND → 0 ("active low").' },
      { q: 'MicroPython for an internal pull-up on GPIO 15?', o: ['Pin(15, Pin.OUT)', 'Pin(15, Pin.IN, Pin.PULL_UP)', 'Pin(15, Pin.PULL_DOWN)', 'PullUp(15)'], a: 1, e: 'Mode IN plus pull PULL_UP.' },
      { tf: true, q: 'A pull-down resistor makes the pin read HIGH when nothing is pressed.', a: false, e: 'False: pull-down holds it LOW.' },
      { q: 'Why do buttons "bounce"?', o: ['The metal contacts vibrate for a few ms', 'They are made of rubber', 'The code is too fast', 'Static electricity'], a: 0, e: 'Contacts bounce, causing several quick transitions.' }
    ]
  },
  {
    id: 'electronics-7', world: 'electronics', n: 7, title: 'Sensors', minutes: 35, level: 'Intermediate', skill: 'measure',
    objectives: ['Classify sensors as digital, analog or bus', 'Use a voltage divider', 'Read an analog sensor with the ADC'],
    intro: 'Sensors are a robot\'s senses. Some give ON/OFF signals, some give a varying voltage, some talk over a data bus.',
    theory: [
      { h: 'Three families', p: '<ul><li><b>Digital</b>: HIGH/LOW (PIR motion, button).</li><li><b>Analog</b>: voltage that varies (LDR, potentiometer, TMP36).</li><li><b>Bus</b>: data messages (I2C, SPI, one-wire).</li></ul>' },
      { h: 'Voltage divider', p: '<div class="formula">V<sub>out</sub> = V<sub>in</sub> × R2 / (R1 + R2)</div><p>Turns a changing resistance (LDR, thermistor) into a changing voltage.</p>' },
      { h: 'Reading it on an ESP32', p: '', code: 'from machine import ADC, Pin\nadc = ADC(Pin(34))\nadc.atten(ADC.ATTN_11DB)   # full range ~3.6 V\nraw = adc.read()            # 0 … 4095' },
      { h: 'Thresholds', p: '<p>Programs often compare a reading to a <b>threshold</b>: "if light &lt; 1500: turn on the lamp".</p>' }
    ],
    widget: 'divider', widgetTitle: 'light sensor divider',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [{ type: 'pot', pin: 34, value: 0.7, label: 'Sensor (potentiometer)' }, ESP_LED], title: 'Sensor with a threshold', goal: 'Read the sensor on <b>GPIO 34</b> (with <code>ATTN_11DB</code>), <b>print the reading</b> every 0.5 s, and turn the LED on GPIO 4 <b>on when the reading is above 2000</b>. Try different knob positions.',
      code: 'from machine import ADC, Pin\nfrom time import sleep\n\nadc = ADC(Pin(34))\n# set the attenuation for the full 0–3.3 V range\nled = Pin(4, Pin.OUT)\n\nwhile True:\n    raw = adc.read()\n    print(raw)\n    # LED on if raw > 2000\n    sleep(0.5)\n',
      check: (r, lab, c) => { const V = c.potV(lab); const exp = Math.floor(Math.min(1, V / 3.6) * 4095); const nums = c.numbers(r); if (!nums.some(n => Math.abs(n - exp) <= exp * 0.03 + 2)) return { ok: false, msg: `Expected readings near ${exp} for ${V.toFixed(2)} V with ATTN_11DB. You printed: ${nums.slice(0, 4).join(', ') || 'nothing'}.` }; const want = exp > 2000; const got = c.valAt(r, 4, r.end) > 0; return got === want ? { ok: true, msg: `Reading ${exp} → LED ${want ? 'ON' : 'OFF'}. Correct! Move the knob across 2000 and run again.` } : { ok: false, msg: `Reading is ${exp}, so the LED should be ${want ? 'ON' : 'OFF'}.` }; } },
    quiz: [
      { q: 'An LDR is which kind of sensor?', o: ['Digital', 'Analog (resistance changes)', 'I2C', 'Wi-Fi'], a: 1, e: 'Its resistance changes with light: read it through a divider.' },
      { q: 'Divider: 3.3 V, R1 = R2 = 10 kΩ. V<sub>out</sub>?', o: ['0 V', '1.65 V', '3.3 V', '6.6 V'], a: 1, e: 'Equal resistors split the voltage in half.' },
      { q: 'ESP32 adc.read() range (12-bit)?', o: ['0–255', '0–1023', '0–4095', '0–65535'], a: 2, e: '12 bits = 4096 steps.' },
      { tf: true, q: 'A PIR motion sensor gives a digital HIGH/LOW output.', a: true, e: 'True.' },
      { q: 'Why use ATTN_11DB on the ESP32 ADC?', o: ['To read voltages up to ~3.3 V instead of ~1 V', 'To save power', 'To use Wi-Fi', 'It is required for digital pins'], a: 0, e: 'Default 0 dB only covers about 0–1 V.' }
    ]
  },
  {
    id: 'electronics-8', world: 'electronics', n: 8, title: 'Motors and drivers', minutes: 40, level: 'Intermediate', skill: 'code',
    objectives: ['Explain how an H-bridge reverses a motor', 'Control direction with two pins', 'Control speed with PWM'],
    intro: 'Motors make robots move! But they need lots of current and must turn both ways. Meet the H-bridge.',
    theory: [
      { h: 'DC motors', p: '<p>Swap the + and − wires and a DC motor spins the other way. More voltage (or more PWM duty) → faster.</p>' },
      { h: 'The H-bridge', p: '<p>Four switches arranged like the letter H. Closing opposite pairs sends current through the motor one way or the other. Driver chips: L298N, L9110S, TB6612FNG, DRV8833.</p>' },
      { h: 'Truth table', p: '<table class="nt"><tr><th>IN1</th><th>IN2</th><th>Motor</th></tr><tr><td>1</td><td>0</td><td>Forward</td></tr><tr><td>0</td><td>1</td><td>Reverse</td></tr><tr><td>0</td><td>0</td><td>Stop (coast)</td></tr><tr><td>1</td><td>1</td><td>Brake</td></tr></table>' },
      { h: 'Power', p: '<p>Use a <b>separate battery</b> for motors and connect its GND to the board\'s GND (common ground).</p>' }
    ],
    widget: 'hbridge', widgetTitle: 'H-bridge simulator',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [{ type: 'motor', pins: { in1: 25, in2: 26, en: 27 }, label: 'DC motor via H-bridge' }], title: 'Forward, stop, reverse', goal: 'Program the motor: <b>forward for 2 s, stop for 1 s, reverse for 2 s</b>, then stop. Use PWM on EN (GPIO 27) for speed.',
      code: 'from machine import Pin, PWM\nfrom time import sleep\n\nin1 = Pin(25, Pin.OUT)\nin2 = Pin(26, Pin.OUT)\nen = PWM(Pin(27), freq=1000, duty_u16=50000)   # ~76% speed\n\n# forward 2 s\n\n# stop 1 s\n\n# reverse 2 s\n\n# stop\n',
      check: (r, lab, c) => { const st = t => { const a = c.valAt(r, 25, t), b = c.valAt(r, 26, t); return a > 0 && !b ? 'F' : !a && b > 0 ? 'R' : 'S'; }; const s = [1000, 2500, 4000, 5600].map(st); const want = ['F', 'S', 'R', 'S']; const en = c.valAt(r, 27, 1000); return s.join('') === want.join('') && en > 0 ? { ok: true, msg: 'Perfect sequence: forward → stop → reverse → stop.' } : { ok: false, msg: `At 1 s, 2.5 s, 4 s and 5.6 s the motor was: ${s.map(x => ({ F: 'forward', R: 'reverse', S: 'stopped' }[x])).join(', ')}${en > 0 ? '' : ' (EN duty is 0!)'}.` }; } },
    quiz: [
      { q: 'IN1 = 0, IN2 = 1 makes the motor…', o: ['Go forward', 'Go in reverse', 'Brake', 'Explode'], a: 1, e: 'Current flows the opposite way.' },
      { q: 'Why can\'t a GPIO pin power a motor?', o: ['Too little current (and spikes)', 'Motors need AC', 'Motors use I2C', 'It can'], a: 0, e: 'Use a driver.' },
      { q: 'How do you control motor speed?', o: ['PWM duty on the enable pin', 'Changing the GPIO number', 'Using a bigger LED', 'Serial.print'], a: 0, e: 'PWM changes the average voltage.' },
      { tf: true, q: 'Motor battery GND must be connected to the board GND.', a: true, e: 'True: a common ground is needed for the control signals.' },
      { q: 'An H-bridge has how many switches?', o: ['1', '2', '4', '8'], a: 2, e: 'Four, arranged like an H.' }
    ]
  });

  /* ============================== ELECTRICITY ============================== */
  VL.LESSONS.push(
  {
    id: 'electricity-1', world: 'electricity', n: 1, title: 'Voltage, current and resistance', minutes: 30, level: 'Beginner', skill: 'ohm',
    objectives: ['Define voltage, current and resistance with units', 'Use the water analogy', 'Relate the three quantities'],
    intro: 'Every circuit is about three quantities. Let\'s picture electricity as water in pipes.',
    theory: [
      { h: 'Voltage (V, volts)', p: '<p>The electrical "push" or pressure difference between two points. Like the height of a water tank. Batteries and power pins provide voltage.</p>' },
      { h: 'Current (I, amperes)', p: '<p>How much charge flows per second. Like the flow rate of water. 1 A = 1000 mA. An LED uses about 5–20 mA.</p>' },
      { h: 'Resistance (R, ohms)', p: '<p>How much a component opposes the flow. Like a narrow pipe. Measured in Ω.</p>' },
      { h: 'Closed loops', p: '<p>Current only flows in a <b>complete loop</b> from + back to −. Any gap (open circuit) stops it everywhere.</p>' }
    ],
    widget: 'ohm', widgetTitle: 'voltage, resistance and current',
    practice: { type: 'predict', title: 'Think in volts and amps', goal: 'Answer the four concept checks.', items: [
      { q: 'You double the voltage and keep the same resistance. The current…', o: ['halves', 'doubles', 'stays the same', 'drops to zero'], a: 1, e: 'I = V / R: twice V gives twice I.' },
      { q: 'You double the resistance and keep the same voltage. The current…', o: ['halves', 'doubles', 'stays the same', 'is negative'], a: 0, e: 'Twice R gives half I.' },
      { q: '0.025 A equals…', o: ['2.5 mA', '25 mA', '250 mA', '0.25 mA'], a: 1, e: '× 1000 → 25 mA.' },
      { q: 'One wire of a working circuit is cut. What happens?', o: ['Only part stops', 'Current stops everywhere in that loop', 'Current doubles', 'Voltage disappears from the battery'], a: 1, e: 'An open circuit stops the loop.' }
    ] },
    quiz: [
      { q: 'Unit of current?', o: ['Volt', 'Ampere', 'Ohm', 'Watt'], a: 1, e: 'Amperes (A).' },
      { q: 'In the water analogy, voltage is like…', o: ['Pipe width', 'Water pressure', 'Water colour', 'Flow rate'], a: 1, e: 'Pressure pushes the flow.' },
      { q: '1 kΩ =', o: ['10 Ω', '100 Ω', '1000 Ω', '1 000 000 Ω'], a: 2, e: 'k = 1000.' },
      { tf: true, q: 'Current can flow in an open circuit.', a: false, e: 'False: it needs a closed loop.' },
      { q: 'Which is measured BETWEEN two points?', o: ['Current', 'Voltage', 'Charge', 'Mass'], a: 1, e: 'Voltage is a difference between two points.' }
    ]
  },
  {
    id: 'electricity-2', world: 'electricity', n: 2, title: "Ohm's law", minutes: 35, level: 'Beginner', skill: 'ohm',
    objectives: ['Use V = I × R in all three forms', 'Measure voltage and current', 'Check a calculation with measurements'],
    intro: "One small formula explains most of what happens in your circuits. Let's prove it with a measurement!",
    theory: [
      { h: 'The law', p: '<div class="formula">V = I × R &nbsp;·&nbsp; I = V / R &nbsp;·&nbsp; R = V / I</div><p>Cover the quantity you want in the V–I–R triangle.</p>' },
      { h: 'Example', p: '<p>9 V across 450 Ω: I = 9 / 450 = 0.02 A = 20 mA.</p>' },
      { h: 'Units matter', p: '<p>Use volts, amps and ohms together. 5 mA = 0.005 A; 2.2 kΩ = 2200 Ω.</p>' },
      { h: 'With an LED', p: '<p>Only the voltage <b>across the resistor</b> drives its current: I = (V<sub>supply</sub> − V<sub>LED</sub>) / R.</p>' }
    ],
    widget: 'ohm', widgetTitle: "Ohm's law playground",
    practice: { type: 'bench', title: 'Prove Ohm\'s law', board: 'esp32', ignore: ['POWER_PIN'], circuit: ok3v3, goal: 'The circuit is ready (3V3 → 330 Ω → LED → GND). In the <b>Multimeter</b> tab: 1) measure the <b>current</b> (mA mode, click the resistor), 2) measure the <b>voltage across the resistor</b> (V mode: red probe on one resistor column, black probe on the other). Then check V ÷ I ≈ 330 Ω.',
      hints: ['The multimeter is in the bottom panel. Which mode measures current?', 'In V mode, click a hole in the resistor\'s left column, then one in its right column.', 'Current mode: click the resistor. V mode: column 8 then column 12 (the resistor legs).'],
      check: wb => { const r = LC.comps(wb, 'resistor')[0]; const I = wb.meas && r ? wb.meas.A[r.id] || Object.values(wb.meas.A)[0] : null; const V = LC.measuredAcross(wb, r); const R = I && V ? V / I : null; return [['LED is lit', LC.lit(wb).length > 0], ['Current measured', !!I], ['Voltage across the resistor measured', !!V], [`V ÷ I = ${R ? Math.round(R) + ' Ω' : '?'} (should be ≈ ${r ? r.value : 330} Ω)`, !!R && Math.abs(R - (r ? r.value : 330)) < 0.05 * (r ? r.value : 330)]]; } },
    quiz: [
      { q: '12 V across 600 Ω gives…', o: ['2 mA', '20 mA', '200 mA', '7.2 A'], a: 1, e: '12 / 600 = 0.02 A.' },
      { q: 'A resistor has 2 V across it and 10 mA through it. R = ?', o: ['20 Ω', '200 Ω', '2 kΩ', '0.2 Ω'], a: 1, e: '2 / 0.01 = 200 Ω.' },
      { q: '5 mA through 1 kΩ: voltage?', o: ['0.5 V', '5 V', '50 V', '5000 V'], a: 1, e: '0.005 × 1000 = 5 V.' },
      { tf: true, q: 'Ohm\'s law says current is proportional to voltage for a resistor.', a: true, e: 'True: I = V / R.' },
      { q: 'Red LED (2 V), 5 V supply, 300 Ω. Current?', o: ['10 mA', '16.7 mA', '6.7 mA', '25 mA'], a: 0, e: '(5 − 2) / 300 = 0.01 A.' }
    ]
  },
  {
    id: 'electricity-3', world: 'electricity', n: 3, title: 'Power and heat', minutes: 30, level: 'Intermediate', skill: 'ohm',
    objectives: ['Calculate electrical power', 'Check resistor power ratings', 'Estimate battery life'],
    intro: 'Electrical energy turns into light, motion and heat. Too much heat in a small part means smoke! Let\'s calculate power.',
    theory: [
      { h: 'Power', p: '<div class="formula">P = V × I = I² × R = V² / R</div><p>Measured in watts (W). 1 W = 1000 mW.</p>' },
      { h: 'Ratings', p: '<p>A small resistor is rated ¼ W. Engineers keep a <b>safety margin</b>: use at most about half the rating.</p>' },
      { h: 'Energy and batteries', p: '<p>Battery capacity in mAh: a 2000 mAh battery powers a 100 mA circuit for about 20 hours (ideal).</p>' },
      { h: 'Example', p: '<p>5 V across 100 Ω: I = 50 mA, P = 5 × 0.05 = 0.25 W: right at the limit of a ¼ W resistor. Too hot!</p>' }
    ],
    widget: 'power', widgetTitle: 'resistor heat meter',
    practice: { type: 'predict', title: 'Power checks', goal: 'Answer the four power questions.', items: [
      { q: '3.3 V × 20 mA = ?', o: ['6.6 mW', '66 mW', '660 mW', '0.66 mW'], a: 1, e: '3.3 × 0.02 = 0.066 W = 66 mW.' },
      { q: '12 V across 100 Ω. Power?', o: ['0.12 W', '1.44 W', '14.4 W', '0.0144 W'], a: 1, e: 'V²/R = 144 / 100 = 1.44 W: a ¼ W resistor would burn.' },
      { q: 'A 2000 mAh battery and a 250 mA robot: ideal run time?', o: ['2 h', '8 h', '20 h', '80 h'], a: 1, e: '2000 / 250 = 8 h.' },
      { q: 'Which resistor rating for 0.3 W?', o: ['⅛ W', '¼ W', '½ W or more (1 W is safer)', 'Any'], a: 2, e: 'Choose a rating comfortably above 0.3 W.' }
    ] },
    quiz: [
      { q: 'Unit of power?', o: ['Joule', 'Watt', 'Volt', 'Ampere'], a: 1, e: 'Watts.' },
      { q: 'P = I² × R for 0.1 A and 10 Ω?', o: ['0.1 W', '1 W', '10 W', '0.01 W'], a: 0, e: '0.01 × 10 = 0.1 W.' },
      { tf: true, q: 'A ¼ W resistor is safe at 0.5 W.', a: false, e: 'False: it would overheat.' },
      { q: 'Where does wasted electrical energy usually go?', o: ['Sound only', 'Heat', 'Light only', 'It disappears'], a: 1, e: 'Mostly heat.' },
      { q: 'P = V² / R for 5 V and 1 kΩ?', o: ['5 mW', '25 mW', '250 mW', '2.5 W'], a: 1, e: '25 / 1000 = 0.025 W.' }
    ]
  },
  {
    id: 'electricity-4', world: 'electricity', n: 4, title: 'Series circuits', minutes: 35, level: 'Beginner', skill: 'wiring',
    objectives: ['Recognise a series circuit', 'Add resistances in series', 'Explain how voltage divides'],
    intro: 'In a series circuit, components are connected one after another, like beads on a string. One path, one current.',
    theory: [
      { h: 'One path', p: '<p>Same current everywhere. If one part breaks, everything stops.</p>' },
      { h: 'Total resistance', p: '<div class="formula">R<sub>total</sub> = R1 + R2 + R3 …</div>' },
      { h: 'Voltage divides', p: '<p>Each resistor gets a share of the supply voltage proportional to its resistance. The shares add up to the supply (Kirchhoff\'s voltage law).</p>' },
      { h: 'Uses', p: '<p>Current limiting (resistor + LED), voltage dividers for sensors.</p>' }
    ],
    widget: 'network', widgetOpts: { mode: 'series' }, widgetTitle: 'series circuit lab',
    practice: { type: 'bench', title: 'Two resistors in series', board: 'esp32', ignore: ['POWER_PIN', 'DIM'], goal: 'Build <b>3V3 → resistor → resistor → LED → GND</b> (all in one chain). The LED must light. Then measure the voltage across each resistor.',
      hints: ['Series means one single path for the current.', 'The second resistor\'s first leg must share a column with the first resistor\'s last leg.', 'Chain: 3V3 wire → R1 (cols 3–7) → R2 (cols 7–11, another row) → LED (cols 11–12) → GND wire on col 12.'],
      check: wb => { const rs = LC.comps(wb, 'resistor'); const res = wb.diag && wb.diag.res0; const Is = rs.map(r => { const e = res && res.els.find(x => x.comp.id === r.id); return e ? Math.abs(e.I) : 0; }); const series = rs.length >= 2 && Is[0] > 2e-4 && Is.every(i => Math.abs(i - Is[0]) < 1e-6); const meas = rs.filter(r => LC.measuredAcross(wb, r) !== null).length; return [['At least two resistors', rs.length >= 2], ['LED lights', LC.lit(wb, 2e-4).length > 0], ['Same current through both resistors (series)', series], ['Voltage measured across both resistors', meas >= 2]]; } },
    quiz: [
      { q: '100 Ω + 220 Ω + 330 Ω in series =', o: ['650 Ω', '220 Ω', '55 Ω', '6.5 kΩ'], a: 0, e: 'Add them.' },
      { tf: true, q: 'In series, the current is the same through every component.', a: true, e: 'True: one path.' },
      { q: 'Two equal resistors in series on 6 V: voltage on each?', o: ['6 V', '3 V', '12 V', '0 V'], a: 1, e: 'The voltage splits equally.' },
      { q: 'One bulb in a series string fails open. The others…', o: ['stay on', 'go out', 'get brighter', 'blink'], a: 1, e: 'The single path is broken.' },
      { q: '9 V across 1 kΩ + 2 kΩ in series. Current?', o: ['3 mA', '9 mA', '4.5 mA', '27 mA'], a: 0, e: '9 / 3000 = 3 mA.' }
    ]
  },
  {
    id: 'electricity-5', world: 'electricity', n: 5, title: 'Parallel circuits', minutes: 35, level: 'Beginner', skill: 'wiring',
    objectives: ['Recognise parallel branches', 'Calculate parallel resistance', 'Explain how currents add'],
    intro: 'In parallel, each component gets its own path. That\'s how your home is wired: switch off one lamp and the others stay on.',
    theory: [
      { h: 'Same voltage', p: '<p>Every branch is connected across the same two points, so each gets the full supply voltage.</p>' },
      { h: 'Currents add', p: '<p>Total current = sum of branch currents (Kirchhoff\'s current law).</p>' },
      { h: 'Total resistance', p: '<div class="formula">1/R<sub>total</sub> = 1/R1 + 1/R2 + …</div><p>Two equal resistors in parallel = half the value.</p>' },
      { h: 'LEDs in parallel', p: '<p>Give <b>each LED its own resistor</b>. Sharing one resistor makes the currents unequal.</p>' }
    ],
    widget: 'network', widgetOpts: { mode: 'parallel' }, widgetTitle: 'parallel circuit lab',
    practice: { type: 'bench', title: 'Two LEDs in parallel', board: 'esp32', ignore: ['POWER_PIN'], goal: 'Use the rails: 3V3 → + rail, GND → − rail. Build <b>two separate branches</b>, each <b>+ rail → resistor → LED → − rail</b>. Both LEDs must light.',
      hints: ['Each LED needs its own complete path from + to −.', 'Wire 3V3 to the top + rail and GND to the top − rail, then build two identical LED + resistor chains in different columns.', 'Branch 1 in columns 3–8, branch 2 in columns 15–20, each with a wire from the + rail and a wire to the − rail.'],
      check: wb => { const lit = LC.lit(wb); return [['3V3 on a + rail', LC.railHas(wb, '3V3', ['RT+', 'RB+'])], ['GND on a − rail', LC.railHas(wb, 'GND', ['RT-', 'RB-'])], ['Two LEDs light', lit.length >= 2], ['Each LED has its own resistor (no overcurrent)', lit.length >= 2 && !LC.issues(wb).includes('NO_RES') && !LC.issues(wb).includes('OVERCURRENT')]]; } },
    quiz: [
      { q: 'Two 1 kΩ in parallel =', o: ['2 kΩ', '1 kΩ', '500 Ω', '250 Ω'], a: 2, e: 'Equal resistors: half.' },
      { tf: true, q: 'In parallel, each branch has the same voltage.', a: true, e: 'True.' },
      { q: 'Branch currents 10 mA and 15 mA. Total from the supply?', o: ['5 mA', '15 mA', '25 mA', '150 mA'], a: 2, e: 'Currents add.' },
      { q: 'One branch breaks. The other branches…', o: ['keep working', 'stop', 'explode', 'reverse'], a: 0, e: 'They have their own paths.' },
      { q: 'Total resistance in parallel is always…', o: ['larger than the largest branch', 'smaller than the smallest branch', 'equal to the average', 'zero'], a: 1, e: 'More paths = less total resistance.' }
    ]
  },
  {
    id: 'electricity-6', world: 'electricity', n: 6, title: 'Using a multimeter', minutes: 35, level: 'Beginner', skill: 'measure',
    objectives: ['Choose the right multimeter mode', 'Measure voltage in parallel and current in series', 'Measure resistance safely'],
    intro: 'The multimeter is an engineer\'s best friend. Used correctly it finds almost any fault.',
    theory: [
      { h: 'Voltage (V⎓)', p: '<p>Probes <b>across</b> the part (in parallel). Red on the higher-voltage side, black (COM) on the lower.</p>' },
      { h: 'Current (A / mA)', p: '<p>The meter must be <b>in series</b>: break the circuit and let the current flow through the meter. Move the red lead to the mA socket. Never put an ammeter across a battery!</p>' },
      { h: 'Resistance (Ω) and continuity', p: '<p>Measure with the <b>power off</b>, ideally with the part removed. Continuity mode beeps when a wire is good.</p>' },
      { h: 'In this lab', p: '<p>The virtual meter computes values with the lab\'s circuit model. In mA mode, clicking a part acts like an ideal ammeter in series with it.</p>' }
    ],
    widget: 'meterquiz', widgetTitle: 'which mode?',
    practice: { type: 'bench', title: 'Full inspection', board: 'esp32', ignore: ['POWER_PIN'], circuit: ok3v3, goal: 'Using the Multimeter tab, measure: <b>1)</b> the voltage across the LED, <b>2)</b> the current through the LED, <b>3)</b> the resistance of the resistor.',
      hints: ['Three different modes: V, mA and Ω.', 'For the LED voltage, put the probes on the LED\'s two columns (12 and 13).', 'V: column 12 then column 13. mA: click the LED. Ω: click the resistor.'],
      check: wb => { const led = LC.comps(wb, 'led')[0], r = LC.comps(wb, 'resistor')[0]; const v = LC.measuredAcross(wb, led); return [['LED voltage measured (≈ 1.9 V)', v !== null && v > 1.5 && v < 2.3], ['LED current measured', !!(wb.meas && led && wb.meas.A[led.id])], ['Resistor value measured', !!(wb.meas && r && wb.meas.R[r.id])]]; } },
    quiz: [
      { q: 'To measure current, the meter goes…', o: ['in parallel', 'in series', 'anywhere', 'across the battery'], a: 1, e: 'Current must flow through the meter.' },
      { q: 'To measure an LED\'s voltage, the probes go…', o: ['across the LED', 'in series', 'on the same leg', 'on the battery only'], a: 0, e: 'Voltage is measured across.' },
      { tf: true, q: 'Measure resistance with the circuit powered on.', a: false, e: 'False: power off, or the reading is wrong and the meter can be damaged.' },
      { q: 'A meter shows "OL" in Ω mode on a wire. The wire is…', o: ['perfect', 'broken (open)', 'shorted', 'hot'], a: 1, e: 'OL = over limit = open circuit.' },
      { q: 'Which lead goes in COM?', o: ['Red', 'Black', 'Either', 'Both'], a: 1, e: 'Black → COM.' }
    ]
  },
  {
    id: 'electricity-7', world: 'electricity', n: 7, title: 'Polarity', minutes: 25, level: 'Beginner', skill: 'debug',
    objectives: ['Identify + and − on components', 'Recognise polarised and non-polarised parts', 'Fix reversed components'],
    intro: 'Some parts don\'t care which way round they go. Others work only one way, or get damaged. Let\'s learn the signs!',
    theory: [
      { h: 'Polarised parts', p: '<p>LEDs, diodes, electrolytic capacitors, batteries, many sensors and ICs. Check markings before powering.</p>' },
      { h: 'Non-polarised', p: '<p>Resistors, ceramic capacitors, most push buttons.</p>' },
      { h: 'Markings', p: '<ul><li>LED: long leg +, flat side −</li><li>Diode: stripe = cathode</li><li>Electrolytic: stripe = −</li><li>Wires: red +, black −/GND</li></ul>' },
      { h: 'Reverse protection', p: '<p>A diode in series with a power input blocks current if the battery is connected backwards.</p>' }
    ],
    widget: 'polarity', widgetTitle: 'right way round?',
    practice: { type: 'bench', title: 'Fix the polarity', board: 'esp32', ignore: ['POWER_PIN'], circuit: reversed3v3, goal: 'This LED doesn\'t light. Use your polarity knowledge to fix it.', hints: ['Which components here are polarised?', 'The resistor can go either way. What about the LED?', 'Select the LED and flip it (F).'], check: wb => [['LED lights', LC.lit(wb).length > 0]] },
    quiz: [
      { q: 'The stripe on a diode marks…', o: ['the anode', 'the cathode', 'the value', 'nothing'], a: 1, e: 'Stripe = cathode.' },
      { tf: true, q: 'A resistor is polarised.', a: false, e: 'False.' },
      { q: 'The stripe on an electrolytic capacitor marks…', o: ['+', '−', 'the value', 'the voltage'], a: 1, e: 'Negative.' },
      { q: 'A reversed LED…', o: ['blocks current and stays off', 'is brighter', 'turns green', 'shorts the battery'], a: 0, e: 'Reverse-biased diode.' },
      { q: 'Usual colour for GND wires?', o: ['Red', 'Black (or blue)', 'Yellow', 'Green only'], a: 1, e: 'Black for GND by convention.' }
    ]
  },
  {
    id: 'electricity-8', world: 'electricity', n: 8, title: 'Circuit safety', minutes: 25, level: 'Beginner', skill: 'debug',
    objectives: ['Recognise dangerous situations', 'Avoid short circuits', 'Work safely with batteries and boards'],
    intro: 'Engineers are careful. Most damage, to boards and to people, comes from a few avoidable mistakes.',
    theory: [
      { h: 'Short circuits', p: '<p>A direct path from + to − with almost no resistance. Huge current, heat, melted wires, damaged boards.</p>' },
      { h: 'Voltage limits', p: '<p>ESP32 and Pico pins: max 3.3 V. Arduino UNO pins: 5 V. Never connect higher voltages to I/O pins.</p>' },
      { h: 'Batteries', p: '<p>Lithium batteries can catch fire if shorted, punctured or charged wrongly. Use proper chargers and never leave them charging unattended.</p>' },
      { h: 'Mains is forbidden', p: '<p>Never work on 230 V / 110 V mains circuits. Our projects stay at low, safe voltages.</p>' }
    ],
    widget: 'safety', widgetTitle: 'safe or unsafe?',
    practice: { type: 'widget', widget: 'safety', need: 1, title: 'Safety inspector', goal: 'Classify <b>all 8 situations</b> correctly as safe or unsafe.' },
    quiz: [
      { q: 'A short circuit causes…', o: ['very low current', 'very high current and heat', 'no change', 'brighter LEDs only'], a: 1, e: 'Almost zero resistance → huge current.' },
      { tf: true, q: 'You should change wiring while the board is powered.', a: false, e: 'False: unplug first.' },
      { q: 'Maximum voltage on an ESP32 GPIO?', o: ['3.3 V', '5 V', '9 V', '12 V'], a: 0, e: '3.3 V.' },
      { q: 'What should you do if a component gets very hot?', o: ['Touch it to check', 'Disconnect power immediately', 'Add more batteries', 'Ignore it'], a: 1, e: 'Cut the power first.' },
      { q: 'Working on mains (230 V) circuits in this course is…', o: ['allowed', 'forbidden', 'only on Fridays', 'safe with gloves'], a: 1, e: 'Never: low-voltage only.' }
    ]
  });
})();
