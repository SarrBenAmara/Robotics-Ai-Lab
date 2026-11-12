/* =========================================================================
   lessons-b.js : ARDUINO, ESP32 (lessons 2–9) and RASPBERRY PI worlds
   ========================================================================= */
(function () {
  const LC = VL.LC;
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const ESP_LED = { type: 'led', pin: 4, color: 'red', label: 'Red LED' };
  const ESP_BTN = { type: 'button', pin: 15, wiring: 'gnd', sched: '1-3, 5-6', label: 'Push button' };
  const UNO_ROBOT = { type: 'robot', arena: 'line', pins: { l1: 5, l2: 6, r1: 9, r2: 10, sl: 2, sr: 3 } };
  const ESP_ROBOT = { type: 'robot', arena: 'obstacles', pins: { l1: 25, l2: 26, r1: 27, r2: 14, trig: 5, echo: 18 } };
  const benchPulses = wb => { const r = wb.lastRun; if (!r || r.code !== wb.code || r.error || !r.pulses) return []; return r.pulses.find(p => p.pulses.length) ? r.pulses.find(p => p.pulses.length).pulses : []; };
  const benchPressed = wb => { const b = wb.circ.comps.find(c => c.type === 'button'); return b ? wb.parseSched(b.sched) : []; };
  const inPulse = (ps, t) => ps.some(p => t >= p[0] && t < p[1]);
  const ledGpio = wb => ((wb.diag && wb.diag.ledInfo || []).find(i => i.gpios.length) || { gpios: [] }).gpios[0];

  /* ============================== ARDUINO ============================== */
  VL.LESSONS.push(
  {
    id: 'arduino-1', world: 'arduino', n: 1, title: 'Meet the Arduino UNO', minutes: 25, level: 'Beginner', skill: 'pins',
    objectives: ['Identify the main parts of the UNO', 'Know digital, analog, PWM and power pins', 'Compare the UNO with the ESP32'],
    intro: 'The Arduino UNO is the most famous board for learning electronics. Simple, tough and 5 V. Let\'s explore its pins.',
    theory: [
      { h: 'The brain', p: '<p><b>ATmega328P</b> microcontroller: 16 MHz, 32 KB flash for your program, 2 KB RAM. Simple and reliable.</p>' },
      { h: 'Digital pins D0–D13', p: '<p>INPUT or OUTPUT at <b>5 V</b> logic. Pins marked <b>~</b> (3, 5, 6, 9, 10, 11) can do PWM. D0/D1 are used by USB serial. D13 has the built-in LED "L".</p>' },
      { h: 'Analog pins A0–A5', p: '<p>10-bit ADC: <code>analogRead()</code> returns 0–1023 for 0–5 V. A4/A5 are also I2C (SDA/SCL).</p>' },
      { h: 'UNO vs ESP32', p: '<table class="nt"><tr><th></th><th>UNO</th><th>ESP32</th></tr><tr><td>Logic</td><td>5 V</td><td>3.3 V</td></tr><tr><td>Speed</td><td>16 MHz</td><td>240 MHz, 2 cores</td></tr><tr><td>Wi-Fi/BT</td><td>No</td><td>Yes</td></tr><tr><td>ADC</td><td>10-bit</td><td>12-bit</td></tr></table>' }
    ],
    widget: 'uno-pins', widgetTitle: 'UNO pin explorer',
    practice: { type: 'predict', title: 'Pin detective', goal: 'Answer the four pin questions (use the explorer above).', items: [
      { q: 'Which pin has the built-in LED?', o: ['D0', 'D7', 'D13', 'A0'], a: 2, e: 'LED "L" is on D13.' },
      { q: 'Which of these can do PWM (analogWrite)?', o: ['D2', 'D9', 'D12', 'A1'], a: 1, e: 'D9 is marked ~.' },
      { q: 'analogRead(A0) with 2.5 V on A0 gives about…', o: ['255', '512', '1023', '4095'], a: 1, e: '2.5 / 5 × 1023 ≈ 511.' },
      { q: 'Why avoid D0 and D1 for buttons?', o: ['They are broken', 'They are used by USB serial', 'They are 3.3 V', 'They are analog only'], a: 1, e: 'They carry Serial RX/TX.' }
    ] },
    quiz: [
      { q: 'UNO logic voltage?', o: ['1.8 V', '3.3 V', '5 V', '12 V'], a: 2, e: '5 V.' },
      { q: 'UNO microcontroller?', o: ['ESP32', 'ATmega328P', 'RP2040', 'BCM2712'], a: 1, e: 'ATmega328P.' },
      { tf: true, q: 'The UNO has built-in Wi-Fi.', a: false, e: 'False: the ESP32 has Wi-Fi.' },
      { q: 'analogRead returns values from…', o: ['0–255', '0–1023', '0–4095', '−5 to 5'], a: 1, e: '10-bit.' },
      { q: 'PWM pins are marked with…', o: ['*', '~', '#', '!'], a: 1, e: 'A tilde ~.' }
    ]
  },
  {
    id: 'arduino-2', world: 'arduino', n: 2, title: 'Arduino C++ basics', minutes: 35, level: 'Beginner', skill: 'code',
    objectives: ['Explain setup() and loop()', 'Use variables, types and semicolons', 'Print to the Serial Monitor'],
    intro: 'Arduino programs, called sketches, are written in C++. It looks a little different from Python, but the ideas are the same.',
    theory: [
      { h: 'setup() and loop()', p: '<p><code>setup()</code> runs once at power-up; <code>loop()</code> repeats forever.</p>', code: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  Serial.println("Hello!");\n  delay(1000);\n}', lang: 'cpp' },
      { h: 'Variables and types', p: '<p><code>int</code> whole numbers, <code>float</code> decimals, <code>bool</code> true/false, <code>const</code> for values that never change.</p>', code: 'const int ledPin = 13;\nint count = 0;\nfloat volts = 3.3;', lang: 'cpp' },
      { h: 'Syntax rules', p: '<ul><li>Every statement ends with <b>;</b></li><li>Blocks use <b>{ }</b></li><li>Comments: <code>// …</code></li><li>Names are case-sensitive</li></ul>' },
      { h: 'Loops', p: '', code: 'for (int i = 1; i <= 5; i++) {\n  Serial.println(i);\n}', lang: 'cpp' }
    ],
    widget: 'cppvspy', widgetTitle: 'C++ vs Python',
    practice: { type: 'code', lang: 'cpp', board: 'uno', kit: [], title: 'Count to ten', goal: 'In <b>setup()</b>, print the numbers <b>1 to 10</b> (one per line) with a for loop, then print <b>Done</b>. Leave loop() empty.',
      code: 'void setup() {\n  Serial.begin(9600);\n  // print 1 to 10 with a for loop\n\n  Serial.println("Done");\n}\n\nvoid loop() {\n}\n', limit: 3000, blocks: VL.CODE_BLOCKS_CPP,
      hints: ['Which loop repeats a block a fixed number of times?', 'for (int i = 1; i <= 10; i++) { … } runs with i = 1, 2, … 10.', 'Inside the loop: Serial.println(i);'],
      check: (r, lab, c) => { const lines = c.serial(r).split('\n').map(x => x.trim()).filter(Boolean); const want = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Done']; return JSON.stringify(lines.slice(0, 11)) === JSON.stringify(want) ? { ok: true, msg: 'Perfect output!' } : { ok: false, msg: `Your output starts with: ${lines.slice(0, 12).join(' · ') || '(nothing)'}` }; } },
    quiz: [
      { q: 'How many times does setup() run?', o: ['Never', 'Once', 'Forever', '10 times'], a: 1, e: 'Once, at start-up.' },
      { q: 'Missing semicolon gives…', o: ['A compile error', 'A faster program', 'A warning only', 'Nothing'], a: 0, e: 'C++ needs ; after statements.' },
      { q: 'Type for 3.14?', o: ['int', 'float', 'bool', 'char'], a: 1, e: 'Decimal → float.' },
      { tf: true, q: 'delay(1000) waits one second.', a: true, e: 'Milliseconds: 1000 ms = 1 s.' },
      { q: 'What prints?', code: 'int x = 7;\nSerial.println(x / 2);', lang: 'cpp', o: ['3.5', '3', '4', 'error'], a: 1, e: 'Integer division drops the decimal: 3.' }
    ]
  },
  {
    id: 'arduino-3', world: 'arduino', n: 3, title: 'Digital outputs', minutes: 35, level: 'Beginner', skill: 'wiring',
    objectives: ['Configure a pin with pinMode', 'Use digitalWrite and delay', 'Wire an LED to a digital pin'],
    intro: 'Time to control the real world! On the UNO, a HIGH pin gives 5 V. Let\'s wire and blink an LED.',
    theory: [
      { h: 'pinMode', p: '', code: 'pinMode(8, OUTPUT);', lang: 'cpp' },
      { h: 'digitalWrite', p: '<p><code>HIGH</code> = 5 V, <code>LOW</code> = 0 V.</p>', code: 'digitalWrite(8, HIGH);\ndelay(1000);\ndigitalWrite(8, LOW);', lang: 'cpp' },
      { h: 'Resistor for 5 V', p: '<p>Red LED: (5 − 2) / 220 ≈ 13.6 mA. Fine for the UNO (≤ 20 mA recommended per pin, 40 mA absolute maximum).</p>' },
      { h: 'Wiring', p: '<p>D8 → 220 Ω → LED anode (long leg) → LED cathode → GND.</p>' }
    ],
    widget: 'uno-pins', widgetTitle: 'find D8 and GND',
    practice: { type: 'bench', title: 'Blink on D8', board: 'uno', code: 'const int ledPin = 8;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  // LED on for 1 second, off for 1 second\n}\n',
      goal: 'Wire an LED with a 220 Ω resistor to <b>D8</b> and GND, then write code that blinks it <b>1 s on, 1 s off</b>. Press RUN.',
      hints: ['What two things are needed: wiring and code?', 'Wire D8 (right header) to the resistor column, LED after it, cathode column to a GND pin. Code: digitalWrite + delay.', 'loop(): digitalWrite(ledPin, HIGH); delay(1000); digitalWrite(ledPin, LOW); delay(1000);'],
      check: wb => { const g = ledGpio(wb); const ps = benchPulses(wb).filter(p => !p[2]); const offs = ps.slice(1).map((p, i) => p[0] - ps[i][1]); return [['LED wired to D8 with a resistor', g === 8 && !LC.issues(wb).includes('NO_RES')], ['Program runs without errors', !!(wb.lastRun && wb.lastRun.code === wb.code && !wb.lastRun.error)], ['On for ≈ 1 s each time', ps.length >= 2 && ps.every(p => near(p[1] - p[0], 1000, 150))], ['Off for ≈ 1 s each time', offs.length >= 1 && offs.every(d => near(d, 1000, 150))]]; } },
    quiz: [
      { q: 'pinMode(8, OUTPUT) means…', o: ['pin 8 reads', 'pin 8 can be set HIGH/LOW', 'pin 8 is analog', 'pin 8 is off'], a: 1, e: 'Output mode.' },
      { q: 'digitalWrite(8, HIGH) on a UNO gives…', o: ['3.3 V', '5 V', '1 V', '0 V'], a: 1, e: '5 V logic.' },
      { q: 'Current with 5 V, red LED (2 V), 330 Ω?', o: ['9 mA', '15 mA', '1.5 mA', '90 mA'], a: 0, e: '3 / 330 ≈ 9 mA.' },
      { tf: true, q: 'delay(500) waits half a second.', a: true, e: 'True.' },
      { q: 'What happens?', code: 'void loop() {\n  digitalWrite(13, HIGH);\n  digitalWrite(13, LOW);\n}', lang: 'cpp', o: ['Slow blink', 'Too fast to see: looks dim', 'LED always off', 'Error'], a: 1, e: 'No delays: it switches thousands of times a second.' }
    ]
  },
  {
    id: 'arduino-4', world: 'arduino', n: 4, title: 'Digital inputs', minutes: 35, level: 'Beginner', skill: 'code',
    objectives: ['Read a button with digitalRead', 'Use INPUT_PULLUP', 'Make decisions with if/else'],
    intro: 'Outputs act, inputs sense. Let\'s give the UNO a button and make it react.',
    theory: [
      { h: 'INPUT_PULLUP', p: '<p>Enables the internal ~20–50 kΩ pull-up. Wire the button between the pin and GND: <b>pressed = LOW</b>.</p>', code: 'pinMode(2, INPUT_PULLUP);\nint b = digitalRead(2);', lang: 'cpp' },
      { h: 'Decisions', p: '', code: 'if (digitalRead(2) == LOW) {\n  digitalWrite(13, HIGH);\n} else {\n  digitalWrite(13, LOW);\n}', lang: 'cpp' },
      { h: 'Debouncing', p: '<p>A short <code>delay(10)</code> in the loop or checking the time between changes avoids counting bounces.</p>' },
      { h: 'Plan your presses', p: '<p>In the virtual lab you set <b>when</b> the button is pressed (Inspector → "pressed during the run"), then RUN.</p>' }
    ],
    widget: 'pullup', widgetTitle: 'pull-up explorer',
    practice: { type: 'bench', title: 'Button-controlled LED', board: 'uno', code: 'void setup() {\n  pinMode(2, INPUT_PULLUP);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  // LED on D13 while the button on D2 is pressed\n\n  delay(10);\n}\n',
      goal: 'Put a <b>push button</b> between <b>D2</b> and <b>GND</b>, and an LED + 220 Ω on <b>D13</b>. The LED must be ON only while the button is pressed (default presses: 1–3 s and 5–6 s).',
      hints: ['With INPUT_PULLUP, what does digitalRead(2) return when the button is pressed?', 'Button: one leg column wired to D2, the other leg column wired to GND. Code: if (digitalRead(2) == LOW) …', 'if (digitalRead(2) == LOW) { digitalWrite(13, HIGH); } else { digitalWrite(13, LOW); }'],
      check: wb => { const ps = benchPulses(wb); const pr = benchPressed(wb); const ok = pr.length && pr.every(([a, z]) => inPulse(ps, (a + z) / 2)) && [500, ...pr.map(p => p[1] + 300)].every(t => !inPulse(ps, t) || pr.some(([a, z]) => t >= a && t < z)); return [['Button on the board', wb.circ.comps.some(c => c.type === 'button')], ['LED wired to D13', ledGpio(wb) === 13], ['Program runs without errors', !!(wb.lastRun && wb.lastRun.code === wb.code && !wb.lastRun.error)], ['LED lights only while pressed', !!ok]]; } },
    quiz: [
      { q: 'With INPUT_PULLUP, an unpressed button reads…', o: ['LOW', 'HIGH', 'random', '512'], a: 1, e: 'The pull-up holds it HIGH.' },
      { q: 'digitalRead returns…', o: ['0–1023', 'HIGH or LOW', 'a voltage', 'a string'], a: 1, e: 'Digital: HIGH/LOW (1/0).' },
      { tf: true, q: '"==" compares, "=" assigns.', a: true, e: 'True: a classic beginner bug!' },
      { q: 'Without a pull-up, an open button input is…', o: ['always HIGH', 'floating (random)', 'always LOW', 'analog'], a: 1, e: 'Floating.' },
      { q: 'What does it do?', code: 'if (digitalRead(2) == LOW) {\n  count++;\n}', lang: 'cpp', o: ['Counts once per press exactly', 'Adds 1 every loop while held', 'Never counts', 'Resets count'], a: 1, e: 'It adds every loop while LOW: detect the change (edge) to count presses.' }
    ]
  },
  {
    id: 'arduino-5', world: 'arduino', n: 5, title: 'Analog inputs', minutes: 35, level: 'Intermediate', skill: 'measure',
    objectives: ['Read voltages with analogRead', 'Convert readings to volts and percent', 'Use map()'],
    intro: 'Analog inputs let the UNO measure a voltage: knobs, light, temperature…',
    theory: [
      { h: 'analogRead', p: '<div class="formula">value = V / 5 V × 1023</div>', code: 'int v = analogRead(A0);   // 0 … 1023', lang: 'cpp' },
      { h: 'To volts', p: '', code: 'float volts = v * 5.0 / 1023.0;', lang: 'cpp' },
      { h: 'map()', p: '<p>Rescales a range (integer maths):</p>', code: 'int pct = map(v, 0, 1023, 0, 100);', lang: 'cpp' },
      { h: 'Potentiometer', p: '<p>A knob that is a voltage divider: outer legs to 5 V and GND, middle (wiper) to A0.</p>' }
    ],
    widget: 'adc', widgetTitle: 'ADC converter',
    practice: { type: 'code', lang: 'cpp', board: 'uno', kit: [{ type: 'pot', pin: 14, value: 0.42, vref: 5, label: 'Potentiometer on A0' }], title: 'Knob to percent', goal: 'Every 500 ms, print the <b>raw reading</b> of A0 and the knob position in <b>percent</b> (use map). Example line: <code>430 42</code>.',
      code: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int v = analogRead(A0);\n  // int pct = map(…);\n  Serial.print(v);\n  Serial.print(" ");\n  // print pct with println\n  delay(500);\n}\n', blocks: VL.CODE_BLOCKS_CPP,
      check: (r, lab, c) => { const V = c.potV(lab); const raw = Math.floor(V / 5 * 1023); const pct = Math.floor(raw * 100 / 1023); const n = c.numbers(r); const okRaw = n.some(x => Math.abs(x - raw) <= 1); const okPct = n.some(x => x !== raw && Math.abs(x - pct) <= 1); return okRaw && okPct ? { ok: true, msg: `Raw ${raw} → ${pct}%. Move the knob and run again!` } : { ok: false, msg: `For ${V.toFixed(2)} V expect raw ≈ ${raw} and ≈ ${pct}%. You printed: ${n.slice(0, 6).join(', ') || 'nothing'}.` }; } },
    quiz: [
      { q: '5 V on A0 gives…', o: ['5', '255', '1023', '4095'], a: 2, e: 'Full scale.' },
      { q: 'map(512, 0, 1023, 0, 100) ≈', o: ['5', '50', '100', '512'], a: 1, e: 'Middle → 50.' },
      { q: 'Each step of a 10-bit 5 V ADC is about…', o: ['0.5 V', '4.9 mV', '1 V', '50 mV'], a: 1, e: '5 / 1024 ≈ 4.9 mV.' },
      { tf: true, q: 'A potentiometer\'s middle pin is the wiper.', a: true, e: 'True.' },
      { q: 'Which pins can analogRead on the UNO?', o: ['D0–D13', 'A0–A5', 'Only D9', 'GND'], a: 1, e: 'A0–A5.' }
    ]
  },
  {
    id: 'arduino-6', world: 'arduino', n: 6, title: 'PWM', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Explain duty cycle', 'Use analogWrite on ~ pins', 'Fade an LED smoothly'],
    intro: 'Digital pins are only ON or OFF, but switch them fast enough and you get "in-between" brightness. That\'s PWM!',
    theory: [
      { h: 'Duty cycle', p: '<p>The percentage of time the pin is HIGH. 25% duty on 5 V ≈ 1.25 V average.</p>' },
      { h: 'analogWrite', p: '<p>Only on pins <b>3, 5, 6, 9, 10, 11</b>. Value 0–255.</p>', code: 'analogWrite(9, 64);    // 25%', lang: 'cpp' },
      { h: 'Fading', p: '', code: 'for (int b = 0; b <= 255; b += 5) {\n  analogWrite(9, b);\n  delay(20);\n}', lang: 'cpp' },
      { h: 'Frequency', p: '<p>UNO PWM ≈ 490 Hz (980 Hz on pins 5 and 6): far too fast to see flicker.</p>' }
    ],
    widget: 'pwm', widgetTitle: 'PWM visualiser',
    practice: { type: 'code', lang: 'cpp', board: 'uno', kit: [{ type: 'led', pin: 9, color: 'green', label: 'Green LED on ~D9' }], title: 'Breathing LED', goal: 'Make the LED on <b>D9</b> fade <b>up from 0 to 255 and back down</b>, smoothly, again and again.',
      code: 'void setup() {\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  // fade up\n\n  // fade down\n\n}\n', blocks: VL.CODE_BLOCKS_CPP,
      check: (r, lab, c) => { const d = c.duties(r, 9); return d.length >= 8 && Math.max(...d) >= 0.9 && Math.min(...d) <= 0.05 ? { ok: true, msg: `${d.length} brightness levels from ${Math.round(Math.min(...d) * 255)} to ${Math.round(Math.max(...d) * 255)}: lovely breathing!` } : { ok: false, msg: `Found ${d.length} brightness levels (need ≥ 8, reaching ≤ 12 and ≥ 230).` }; } },
    quiz: [
      { q: 'analogWrite(9, 255) gives…', o: ['0%', '50%', '100% duty', 'an error'], a: 2, e: 'Fully on.' },
      { q: '50% duty on 5 V ≈ average', o: ['1 V', '2.5 V', '5 V', '0 V'], a: 1, e: 'Half of 5 V.' },
      { tf: true, q: 'analogWrite works on every digital pin.', a: false, e: 'Only ~ pins: 3, 5, 6, 9, 10, 11.' },
      { q: 'analogWrite(9, 128) ≈ duty', o: ['12.8%', '50%', '75%', '100%'], a: 1, e: '128/255 ≈ 50%.' },
      { q: 'Why don\'t we see flicker?', o: ['It switches ~490 times per second', 'It is analog', 'The LED is slow', 'We do see it'], a: 0, e: 'Too fast for the eye.' }
    ]
  },
  {
    id: 'arduino-7', world: 'arduino', n: 7, title: 'Servo motors', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Explain how servo pulses set an angle', 'Use the Servo library', 'Sweep a servo'],
    intro: 'Servos turn to a precise angle and hold it: perfect for robot arms, grippers and steering.',
    theory: [
      { h: 'How it works', p: '<p>A pulse every 20 ms. Its width (≈ 0.5–2.5 ms) sets the angle 0–180°. Inside: motor, gears, and a position sensor.</p>' },
      { h: 'Servo library', p: '', code: '#include <Servo.h>\nServo arm;\n\nvoid setup() {\n  arm.attach(9);\n}\n\nvoid loop() {\n  arm.write(90);   // degrees\n}', lang: 'cpp' },
      { h: 'Wiring', p: '<p>Brown/black = GND, red = 5 V, orange/yellow = signal. Big servos need their own supply.</p>' },
      { h: 'Speed', p: '<p>An SG90 turns 60° in about 0.1 s: give it time with <code>delay()</code>.</p>' }
    ],
    widget: 'servo', widgetTitle: 'servo pulse lab',
    practice: { type: 'code', lang: 'cpp', board: 'uno', kit: [{ type: 'servo', pin: 9, label: 'SG90 servo on D9' }], title: 'Sweep', goal: 'Sweep the servo from <b>0° to 180°</b> and back in steps (use a for loop), with a short delay between steps.',
      code: '#include <Servo.h>\nServo s;\n\nvoid setup() {\n  s.attach(9);\n}\n\nvoid loop() {\n  // 0 → 180\n\n  // 180 → 0\n\n}\n', blocks: VL.CODE_BLOCKS_CPP,
      check: (r) => { const a = r.servo.filter(s => s.pin === 9).map(s => s.a); return a.length >= 10 && Math.min(...a) <= 10 && Math.max(...a) >= 170 ? { ok: true, msg: `Swept from ${Math.min(...a)}° to ${Math.max(...a)}° in ${a.length} steps.` } : { ok: false, msg: `Servo commands seen: ${a.length} (range ${a.length ? Math.min(...a) + '°–' + Math.max(...a) + '°' : 'none'}). Need ≥ 10 steps covering ≤ 10° and ≥ 170°.` }; } },
    quiz: [
      { q: 'Servo pulse period?', o: ['1 ms', '20 ms', '1 s', '490 Hz'], a: 1, e: '50 Hz → 20 ms.' },
      { q: '~1.5 ms pulse →', o: ['0°', '90°', '180°', 'spin forever'], a: 1, e: 'Middle position.' },
      { q: 'Which wire is the signal (typical SG90)?', o: ['Brown', 'Red', 'Orange', 'Black'], a: 2, e: 'Orange (or yellow) = signal.' },
      { tf: true, q: 's.write(180) sets the angle to 180°.', a: true, e: 'True.' },
      { q: 'Why add delay() between steps?', o: ['To give the servo time to move', 'To save memory', 'It is required by C++', 'To reset the board'], a: 0, e: 'The motor needs time.' }
    ]
  },
  {
    id: 'arduino-8', world: 'arduino', n: 8, title: 'Project: line follower', minutes: 50, level: 'Advanced', skill: 'debug',
    objectives: ['Read two IR line sensors', 'Steer with differential drive', 'Tune a control rule'],
    intro: 'Your first autonomous robot! It follows a black line using two infrared sensors and two motors.',
    theory: [
      { h: 'Line sensors', p: '<p>IR sensors detect the black line (dark surfaces reflect less IR). In this kit each sensor reads <b>1 on the line</b>, 0 on white.</p>' },
      { h: 'Steering', p: '<ul><li>Neither sensor on the line → go straight (the line is between them)</li><li>Left sensor on the line → turn left</li><li>Right sensor on the line → turn right</li></ul>' },
      { h: 'Motor pins', p: '<p>Left motor: D5 (forward), D6 (back). Right motor: D9 (forward), D10 (back). Sensors: left D2, right D3.</p>' },
      { h: 'Turning', p: '<p>To turn left, slow or stop the <b>left</b> wheel while the right one keeps going.</p>' }
    ],
    widget: 'kinematics', widgetTitle: 'differential drive',
    practice: { type: 'code', lang: 'cpp', board: 'uno', kit: [UNO_ROBOT], title: 'Follow the line', limit: 15000, goal: 'Make the robot follow the oval track for the whole run (≥ 150 cm) without losing the line.',
      code: 'const int L1 = 5, L2 = 6, R1 = 9, R2 = 10;\nconst int SL = 2, SR = 3;\n\nvoid setup() {\n  pinMode(L1, OUTPUT); pinMode(L2, OUTPUT);\n  pinMode(R1, OUTPUT); pinMode(R2, OUTPUT);\n  pinMode(SL, INPUT); pinMode(SR, INPUT);\n}\n\nvoid loop() {\n  int left = digitalRead(SL);\n  int right = digitalRead(SR);\n  // decide: straight, turn left or turn right\n\n  delay(10);\n}\n', blocks: VL.CODE_BLOCKS_CPP,
      hints: ['What should each wheel do when neither sensor sees the line?', 'Left sensor on the line: stop the left wheel (L1 LOW) and keep the right wheel forward (R1 HIGH).', 'if (left == 1 && right == 0) { L1 LOW, R1 HIGH } else if (right == 1 && left == 0) { L1 HIGH, R1 LOW } else { both HIGH }. Keep L2 and R2 LOW.'],
      check: (r, lab, c) => { const L = r.robot || []; const dev = L.length ? Math.max(...L.map(e => Math.abs(Math.pow((e[1] - 100) / 75, 2) + Math.pow((e[2] - 70) / 45, 2) - 1))) : 9; const d = c.dist(r); return d >= 150 && dev < 0.3 ? { ok: true, msg: `Travelled ${d.toFixed(0)} cm on the track. Your robot follows the line!` } : { ok: false, msg: `Travelled ${d.toFixed(0)} cm${dev >= 0.3 ? ' and left the line' : ''}. Need ≥ 150 cm staying on the track.` }; } },
    quiz: [
      { q: 'Both sensors off the line (line between them):', o: ['Turn left', 'Go straight', 'Stop forever', 'Reverse'], a: 1, e: 'The line is centred.' },
      { q: 'To turn left, you…', o: ['speed up the left wheel', 'slow/stop the left wheel', 'stop both wheels', 'reverse both'], a: 1, e: 'The faster right wheel pushes the robot left.' },
      { tf: true, q: 'Black surfaces reflect more infrared than white ones.', a: false, e: 'False: black absorbs more IR.' },
      { q: 'Why add delay(10) in loop()?', o: ['It is mandatory', 'Small, regular update steps', 'To stop the motors', 'To save the battery'], a: 1, e: 'Controls update ~100 times per second.' },
      { q: 'The robot zig-zags a lot. A good fix is…', o: ['Turn more gently (slow, not stop, the inner wheel)', 'Remove a sensor', 'Use delay(5000)', 'Unplug a motor'], a: 0, e: 'Softer corrections reduce oscillation.' }
    ]
  });

  /* ============================== ESP32 (2–9) ============================== */
  VL.LESSONS.push(
  {
    id: 'esp32-2', world: 'esp32', n: 2, title: 'Digital inputs and buttons', minutes: 40, level: 'Beginner', skill: 'code',
    objectives: ['Read a button with Pin.IN and PULL_UP', 'Detect a press (edge) instead of a level', 'Use interrupts (irq)'],
    intro: 'Let\'s make a light switch: each press toggles the LED. To do that, we must detect the moment the button goes down.',
    theory: [
      { h: 'Reading', p: '', code: 'button = Pin(15, Pin.IN, Pin.PULL_UP)\nbutton.value()   # 1 released, 0 pressed' },
      { h: 'Edges', p: '<p>A press is the change from 1 to 0 (a <b>falling edge</b>). Remember the previous value and compare.</p>', code: 'last = 1\nwhile True:\n    now = button.value()\n    if last == 1 and now == 0:\n        led.toggle()\n    last = now\n    sleep(0.02)' },
      { h: 'Interrupts', p: '<p>The ESP32 can call a function automatically on an edge:</p>', code: 'def pressed(pin):\n    led.toggle()\nbutton.irq(trigger=Pin.IRQ_FALLING, handler=pressed)' },
      { h: 'Debounce', p: '<p>Waiting 20 ms between reads, or ignoring edges for 50 ms, avoids double counts.</p>' }
    ],
    widget: 'debounce', widgetTitle: 'bouncing contacts',
    practice: { type: 'bench', title: 'Toggle switch', board: 'esp32', code: 'from machine import Pin\nfrom time import sleep\n\nled = Pin(4, Pin.OUT)\nbutton = Pin(15, Pin.IN, Pin.PULL_UP)\n\nlast = 1\nwhile True:\n    now = button.value()\n    # toggle the LED when the button goes from 1 to 0\n\n    last = now\n    sleep(0.02)\n',
      goal: 'Wire a <b>button between GPIO 15 and GND</b> and an <b>LED + 220 Ω on GPIO 4</b>. Each press must <b>toggle</b> the LED (on → off → on…). Default presses: 1–3 s and 5–6 s.',
      hints: ['How do you know the exact moment the button gets pressed?', 'A press is last == 1 and now == 0. Toggle only then.', 'if last == 1 and now == 0:\n        led.toggle()'],
      check: wb => { const r = wb.lastRun; const pr = benchPressed(wb); let tr = 0, ok = true; if (r && r.code === wb.code && !r.error) { const ev = r.events.filter(e => e.pin === 4); for (let i = 1; i < ev.length; i++) if (ev[i].v !== ev[i - 1].v) { tr++; if (!pr.some(([a]) => ev[i].t >= a && ev[i].t < a + 200)) ok = false; } } const lit = (r && r.pulses || []).some(p => p.pulses.length); return [['Button between GPIO 15 and GND', wb.circ.comps.some(c => c.type === 'button')], ['LED on GPIO 4', ledGpio(wb) === 4], ['Program runs without errors', !!(r && r.code === wb.code && !r.error)], [`LED toggles once per press (${tr}/${pr.length})`, ok && lit && tr === pr.length && pr.length > 0]]; } },
    quiz: [
      { q: 'A falling edge on a pull-up button means…', o: ['released', 'just pressed', 'floating', 'broken'], a: 1, e: '1 → 0 = press.' },
      { q: 'IRQ_FALLING calls the handler when…', o: ['the pin goes 1 → 0', 'the pin goes 0 → 1', 'every 10 ms', 'never'], a: 0, e: 'Falling edge.' },
      { tf: true, q: 'Checking button.value() == 0 in a loop toggles once per press.', a: false, e: 'It would toggle every loop while held: detect the edge.' },
      { q: 'led.toggle() …', o: ['turns it on', 'turns it off', 'switches to the opposite state', 'blinks forever'], a: 2, e: 'Flips the state.' },
      { q: 'Why sleep(0.02) in the loop?', o: ['Debounce and save CPU', 'Required by Python', 'To blink', 'To reset'], a: 0, e: 'Reads every 20 ms: ignores bounce.' }
    ]
  },
  {
    id: 'esp32-3', world: 'esp32', n: 3, title: 'Analog inputs and sensors', minutes: 35, level: 'Intermediate', skill: 'measure',
    objectives: ['Read the ESP32 ADC', 'Set attenuation', 'Convert to volts'],
    intro: 'The ESP32\'s 12-bit ADC turns a voltage into 0–4095. Set it up right and you can measure the world.',
    theory: [
      { h: 'ADC pins', p: '<p>Use <b>ADC1</b> pins (GPIO 32–39) when Wi-Fi is on: ADC2 is shared with the radio.</p>' },
      { h: 'Attenuation', p: '<p>Default range is only about 0–1 V. <code>ATTN_11DB</code> extends it (≈ 3.6 V full-scale in this lab\'s ideal model).</p>', code: 'adc = ADC(Pin(34))\nadc.atten(ADC.ATTN_11DB)\nraw = adc.read()          # 0–4095\nvolts = raw / 4095 * 3.6' },
      { h: 'read_u16 / read_uv', p: '<p><code>read_u16()</code> gives 0–65535 on every port; <code>read_uv()</code> gives microvolts (calibrated on real boards).</p>' },
      { h: 'Accuracy', p: '<p>Real ESP32 ADCs are a little non-linear near 0 V and the top of the range. Average several readings for stability.</p>' }
    ],
    widget: 'adc', widgetTitle: 'ADC converter',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [{ type: 'pot', pin: 34, value: 0.55, label: 'Potentiometer on GPIO 34' }], title: 'Digital voltmeter', goal: 'Print the <b>voltage</b> on GPIO 34 (in volts, 2 decimals) every second. Use <code>ATTN_11DB</code> and volts = raw / 4095 × 3.6.',
      code: 'from machine import ADC, Pin\nfrom time import sleep\n\nadc = ADC(Pin(34))\nadc.atten(ADC.ATTN_11DB)\n\nwhile True:\n    raw = adc.read()\n    # volts = …\n    # print(round(volts, 2))\n    sleep(1)\n',
      check: (r, lab, c) => { const V = c.potV(lab); const n = c.numbers(r).filter(x => x < 10); return n.some(x => Math.abs(x - V) < 0.05) ? { ok: true, msg: `Measured ${V.toFixed(2)} V. Your voltmeter works!` } : { ok: false, msg: `The knob gives ${V.toFixed(2)} V. Your printed values: ${c.numbers(r).slice(0, 4).join(', ') || 'none'}.` }; } },
    quiz: [
      { q: 'ESP32 adc.read() maximum?', o: ['1023', '4095', '255', '65535'], a: 1, e: '12-bit.' },
      { q: 'Which pins to use with Wi-Fi on?', o: ['ADC2 pins', 'ADC1 pins (32–39)', 'GPIO 6–11', 'Any'], a: 1, e: 'ADC2 conflicts with Wi-Fi.' },
      { tf: true, q: 'Without setting attenuation, the ESP32 ADC measures up to about 1 V.', a: true, e: 'True: 0 dB attenuation.' },
      { q: 'raw = 2048 with ATTN_11DB (3.6 V full-scale) ≈', o: ['0.9 V', '1.8 V', '2.5 V', '3.6 V'], a: 1, e: '2048 / 4095 × 3.6 ≈ 1.8 V.' },
      { q: 'read_u16() range?', o: ['0–1023', '0–4095', '0–65535', '0–100'], a: 2, e: '16-bit scale.' }
    ]
  },
  {
    id: 'esp32-4', world: 'esp32', n: 4, title: 'PWM and LED control', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Create PWM on the ESP32', 'Use duty_u16 and freq', 'Make smooth effects'],
    intro: 'The ESP32 can generate PWM on almost any output pin, with adjustable frequency. Let\'s make an LED breathe.',
    theory: [
      { h: 'PWM in MicroPython', p: '', code: 'from machine import Pin, PWM\nled = PWM(Pin(4), freq=1000)\nled.duty_u16(32768)   # 50%' },
      { h: 'Duty scale', p: '<p><code>duty_u16</code>: 0–65535 (all ports). Older ESP32 code uses <code>duty(0–1023)</code>.</p>' },
      { h: 'Frequency', p: '<p>LEDs: ≥ 500 Hz (no flicker). Servos: 50 Hz. Motors: 1–20 kHz.</p>' },
      { h: 'Perceived brightness', p: '<p>Eyes are non-linear: small duties look brighter than expected. Squaring the value ("gamma") gives smoother fades.</p>' }
    ],
    widget: 'pwm', widgetTitle: 'PWM visualiser',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [ESP_LED], title: 'Breathing LED', goal: 'Make the LED on GPIO 4 <b>fade up to full and back down to off</b>, smoothly and repeatedly, using PWM.',
      code: 'from machine import Pin, PWM\nfrom time import sleep\n\nled = PWM(Pin(4), freq=1000, duty_u16=0)\n\nwhile True:\n    for d in range(0, 65536, 4096):\n        # set the duty\n        sleep(0.03)\n    # now fade down\n',
      check: (r, lab, c) => { const d = c.duties(r, 4); return d.length >= 8 && Math.max(...d) > 0.9 && Math.min(...d) < 0.1 ? { ok: true, msg: `${d.length} brightness levels from ${Math.round(Math.min(...d) * 100)}% to ${Math.round(Math.max(...d) * 100)}%.` } : { ok: false, msg: `Found ${d.length} levels between ${d.length ? Math.round(Math.min(...d) * 100) : 0}% and ${d.length ? Math.round(Math.max(...d) * 100) : 0}%. Need ≥ 8 levels from below 10% to above 90%.` }; } },
    quiz: [
      { q: 'duty_u16(65535) =', o: ['0%', '50%', '100%', 'error'], a: 2, e: 'Maximum.' },
      { q: 'Servo PWM frequency?', o: ['50 Hz', '1 kHz', '5 kHz', '1 MHz'], a: 0, e: '20 ms period.' },
      { tf: true, q: 'Higher PWM frequency changes the average voltage.', a: false, e: 'Only the duty changes the average.' },
      { q: 'What does it set?', code: 'p = PWM(Pin(4), freq=1000)\np.duty_u16(16384)', o: ['25%', '50%', '16%', '75%'], a: 0, e: '16384 / 65536 = 25%.' },
      { q: 'Why ≥ 500 Hz for LEDs?', o: ['No visible flicker', 'More current', 'Required by Wi-Fi', 'Cooler LED'], a: 0, e: 'Eyes won\'t see the switching.' }
    ]
  },
  {
    id: 'esp32-5', world: 'esp32', n: 5, title: 'Mini project: smart LED', minutes: 45, level: 'Intermediate', skill: 'debug',
    objectives: ['Combine input, PWM and state', 'Use a list of levels', 'Design a small product'],
    intro: 'Let\'s build a real product: a lamp whose brightness changes each time you press the button.',
    theory: [
      { h: 'States', p: '<p>Keep a variable for the current mode and a list of brightness levels.</p>', code: 'levels = [0, 8000, 30000, 65535]\nmode = 0' },
      { h: 'On each press', p: '', code: 'mode = (mode + 1) % len(levels)\nled.duty_u16(levels[mode])' },
      { h: 'Edge detection', p: '<p>Use the falling-edge pattern from Lesson 2 (or an interrupt).</p>' },
      { h: 'Engineering thinking', p: '<p>Products need predictable behaviour: after the last level, wrap back to off. Test every press.</p>' }
    ],
    widget: 'pwm', widgetTitle: 'brightness levels',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [ESP_LED, Object.assign({}, ESP_BTN, { sched: '1-1.3, 3-3.3, 5-5.3, 7-7.3' })], title: 'Smart lamp', goal: 'Each press of the button (GPIO 15, to GND) moves to the next brightness: <b>off → low → medium → high → off…</b> using PWM on GPIO 4.',
      code: 'from machine import Pin, PWM\nfrom time import sleep\n\nled = PWM(Pin(4), freq=1000, duty_u16=0)\nbutton = Pin(15, Pin.IN, Pin.PULL_UP)\nlevels = [0, 8000, 30000, 65535]\nmode = 0\nlast = 1\n\nwhile True:\n    now = button.value()\n    # on a press: next mode, set the duty\n\n    last = now\n    sleep(0.02)\n',
      check: (r, lab, c) => { const ts = [500, 2000, 4000, 6000, 8000]; const v = ts.map(t => c.valAt(r, 4, t)); const distinct = new Set(v.map(x => x.toFixed(3))).size; const changes = v.slice(1).every((x, i) => x !== v[i]); return distinct >= 3 && changes ? { ok: true, msg: `Brightness after each press: ${v.map(x => Math.round(x * 100) + '%').join(' → ')}` } : { ok: false, msg: `Brightness at 0.5, 2, 4, 6, 8 s: ${v.map(x => Math.round(x * 100) + '%').join(' → ')}. Each press should change it.` }; } },
    quiz: [
      { q: '(3 + 1) % 4 =', o: ['0', '1', '3', '4'], a: 0, e: 'Modulo wraps around.' },
      { q: 'levels[2] in [0, 8000, 30000, 65535] =', o: ['8000', '30000', '65535', '0'], a: 1, e: 'Lists start at index 0.' },
      { tf: true, q: 'Without edge detection, holding the button would cycle through modes rapidly.', a: true, e: 'True.' },
      { q: 'Best place to store the current mode?', o: ['A variable', 'The LED', 'A comment', 'The Wi-Fi'], a: 0, e: 'Program state lives in variables.' },
      { q: 'Why test every press in sequence?', o: ['To check wrap-around and each state', 'For fun only', 'It is required by MicroPython', 'To charge the battery'], a: 0, e: 'Test all states and transitions.' }
    ]
  },
  {
    id: 'esp32-6', world: 'esp32', n: 6, title: 'Wi-Fi basics', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Connect the ESP32 to Wi-Fi', 'Read the IP address and signal strength', 'Handle connection waiting'],
    intro: 'The ESP32\'s superpower is Wi-Fi. Let\'s connect it to a network and get an IP address.',
    theory: [
      { h: 'Station mode', p: '', code: 'import network\nwlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect("SSID", "password")' },
      { h: 'Wait for it', p: '', code: 'while not wlan.isconnected():\n    sleep(0.5)\nprint(wlan.ifconfig()[0])   # IP address' },
      { h: 'Scanning', p: '<p><code>wlan.scan()</code> lists nearby networks with their signal strength (RSSI, in dBm).</p>' },
      { h: 'Good practice', p: '<p>Never publish real passwords in shared code. Add a timeout so your program doesn\'t wait forever.</p>' }
    ],
    widget: 'wifi', widgetTitle: 'packet journey',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [{ type: 'wifi' }], title: 'Get online', goal: 'Connect to the virtual network <b>VirtualLab</b> (password <b>robotics123</b>), wait until connected, then <b>print the IP address</b>.',
      code: 'import network\nfrom time import sleep\n\nwlan = network.WLAN(network.STA_IF)\n# activate, connect, wait, print the IP\n',
      hints: ['Which method turns the Wi-Fi radio on?', 'wlan.active(True), then wlan.connect("VirtualLab", "robotics123"), then a while loop on isconnected().', 'print(wlan.ifconfig()[0]) prints the IP address.'],
      check: (r, lab, c) => /192\.168\.4\.23/.test(c.serial(r)) ? { ok: true, msg: 'Connected! IP 192.168.4.23.' } : { ok: false, msg: 'No IP address printed yet.' + (r.warnings.length ? ' ' + r.warnings[0] : '') } },
    quiz: [
      { q: 'STA_IF means the ESP32 is…', o: ['a client joining a network', 'a router', 'Bluetooth', 'offline'], a: 0, e: 'Station = client.' },
      { q: 'wlan.ifconfig()[0] is…', o: ['the password', 'the IP address', 'the SSID', 'the MAC'], a: 1, e: 'First item = IP.' },
      { tf: true, q: 'RSSI −50 dBm is a stronger signal than −80 dBm.', a: true, e: 'Closer to 0 = stronger.' },
      { q: 'Why add a timeout to the connection loop?', o: ['So it doesn\'t wait forever', 'To go faster', 'For security', 'It is required'], a: 0, e: 'Handle failures gracefully.' },
      { q: 'Which ADC can\'t be used reliably while Wi-Fi is on?', o: ['ADC1', 'ADC2', 'Both', 'Neither'], a: 1, e: 'ADC2 is shared with the radio.' }
    ]
  },
  {
    id: 'esp32-7', world: 'esp32', n: 7, title: 'I2C and sensors', minutes: 40, level: 'Advanced', skill: 'code',
    objectives: ['Explain the I2C bus', 'Scan for devices', 'Read and decode sensor bytes'],
    intro: 'Many smart sensors talk over I2C: two wires, many devices. Let\'s read a temperature sensor.',
    theory: [
      { h: 'Two wires', p: '<p><b>SDA</b> (data) and <b>SCL</b> (clock). ESP32 defaults: SDA = GPIO 21, SCL = GPIO 22. Pull-up resistors (often on the module) are required.</p>' },
      { h: 'Addresses', p: '<p>Each device has a 7-bit address, e.g. 0x48 for a TMP102 temperature sensor, 0x3C for an OLED.</p>', code: 'from machine import I2C, Pin\ni2c = I2C(0, sda=Pin(21), scl=Pin(22))\nprint(i2c.scan())   # [60, 72]' },
      { h: 'Reading registers', p: '', code: 'data = i2c.readfrom_mem(0x48, 0, 2)\nraw = (data[0] << 4) | (data[1] >> 4)\ntemp = raw * 0.0625' },
      { h: 'hex()', p: '<p><code>hex(72)</code> → <code>"0x48"</code>. Datasheets use hexadecimal.</p>' }
    ],
    widget: 'i2c', widgetTitle: 'I2C byte decoder',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [{ type: 'i2c', sda: 21, scl: 22 }], title: 'Thermometer', goal: 'Scan the bus and print the addresses <b>in hex</b>, then print the <b>temperature</b> from the TMP102 (0x48) every second.',
      code: 'from machine import I2C, Pin\nfrom time import sleep\n\ni2c = I2C(0, sda=Pin(21), scl=Pin(22))\nprint([hex(a) for a in i2c.scan()])\n\nwhile True:\n    data = i2c.readfrom_mem(0x48, 0, 2)\n    # decode and print the temperature\n    sleep(1)\n',
      check: (r, lab, c) => { const s = c.serial(r); const t = c.numbers(r).filter(x => x > 20 && x < 27 && x % 1 !== 0); return /0x48/i.test(s) && t.length >= 2 ? { ok: true, msg: `Found 0x48 and read ${t.length} temperatures (e.g. ${t[0]} °C).` } : { ok: false, msg: `${/0x48/i.test(s) ? 'Scan OK. ' : 'Print the scan in hex (0x48). '}${t.length ? '' : 'No temperatures (like 23.5) printed yet.'}` }; } },
    quiz: [
      { q: 'I2C uses which lines?', o: ['TX/RX', 'SDA/SCL', 'MOSI/MISO', 'A0/A1'], a: 1, e: 'Data + clock.' },
      { q: 'hex(72) =', o: ['0x72', '0x48', '0x24', '0x84'], a: 1, e: '4 × 16 + 8 = 72.' },
      { tf: true, q: 'Several I2C devices can share the same two wires.', a: true, e: 'Each has its own address.' },
      { q: 'raw = 376, TMP102 resolution 0.0625 °C → temp?', o: ['23.5 °C', '37.6 °C', '6 °C', '3.76 °C'], a: 0, e: '376 × 0.0625 = 23.5.' },
      { q: 'ESP32 default I2C pins?', o: ['SDA 21, SCL 22', 'SDA 2, SCL 4', 'SDA 34, SCL 35', 'SDA 6, SCL 7'], a: 0, e: '21 and 22.' }
    ]
  },
  {
    id: 'esp32-8', world: 'esp32', n: 8, title: 'IoT dashboard', minutes: 45, level: 'Advanced', skill: 'code',
    objectives: ['Format data as JSON', 'Send data with HTTP POST', 'Build a live dashboard'],
    intro: 'The Internet of Things: your sensor talks to the cloud and anyone can see the data live. Let\'s publish temperature readings!',
    theory: [
      { h: 'JSON', p: '', code: 'import json\nmsg = {"temp": 23.5, "room": "lab1"}\nprint(json.dumps(msg))' },
      { h: 'HTTP POST', p: '', code: 'import urequests\nr = urequests.post("http://dashboard.virtuallab/api", json=msg)\nr.close()' },
      { h: 'MQTT', p: '<p>Another popular IoT protocol: devices <b>publish</b> to topics (school/lab1/temp) and dashboards <b>subscribe</b>. Lightweight and fast.</p>' },
      { h: 'Rate', p: '<p>Don\'t flood servers: one reading every few seconds is plenty for temperature.</p>' }
    ],
    widget: 'iot', widgetTitle: 'JSON message builder',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [{ type: 'wifi' }, { type: 'i2c', sda: 21, scl: 22 }, { type: 'dashboard' }], title: 'Live temperature dashboard', limit: 12000, goal: 'Connect to Wi-Fi, then every 2 s read the TMP102 and <b>POST</b> <code>{"temp": …}</code> to <code>http://dashboard.virtuallab/api</code>. Watch the dashboard fill up!',
      code: 'import network, urequests\nfrom machine import I2C, Pin\nfrom time import sleep\n\nwlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect("VirtualLab", "robotics123")\nwhile not wlan.isconnected():\n    sleep(0.5)\n\ni2c = I2C(0, sda=Pin(21), scl=Pin(22))\n\nwhile True:\n    d = i2c.readfrom_mem(0x48, 0, 2)\n    temp = ((d[0] << 4) | (d[1] >> 4)) * 0.0625\n    # POST {"temp": temp}\n    sleep(2)\n',
      check: (r) => { const p = (r.http || []).filter(h => h[2] && typeof h[2] === 'object' && Object.values(h[2]).some(v => typeof v === 'number')); return p.length >= 3 ? { ok: true, msg: `${p.length} readings published to the virtual cloud.` } : { ok: false, msg: `${p.length} JSON readings posted (need ≥ 3).` }; } },
    quiz: [
      { q: 'JSON stands for…', o: ['Java Serial Object Net', 'JavaScript Object Notation', 'Just Send Our Numbers', 'JSON is not an acronym'], a: 1, e: 'JavaScript Object Notation.' },
      { q: 'Which HTTP method sends data to a server?', o: ['GET', 'POST', 'PING', 'SCAN'], a: 1, e: 'POST.' },
      { tf: true, q: 'In MQTT, devices publish to topics and dashboards subscribe.', a: true, e: 'True.' },
      { q: 'json.dumps({"a": 1}) returns…', o: ['a dict', 'the string \'{"a": 1}\'', 'a number', 'an error'], a: 1, e: 'A JSON string.' },
      { q: 'Why not post 100 times per second?', o: ['Wastes energy and overloads servers', 'It is illegal', 'JSON forbids it', 'It is faster'], a: 0, e: 'Choose a sensible rate.' }
    ]
  },
  {
    id: 'esp32-9', world: 'esp32', n: 9, title: 'Robotics with ESP32', minutes: 50, level: 'Advanced', skill: 'debug',
    objectives: ['Measure distance with an ultrasonic sensor', 'Drive two motors', 'Program obstacle avoidance'],
    intro: 'Final mission: an autonomous robot that explores the arena without crashing. Everything you learned comes together!',
    theory: [
      { h: 'Ultrasonic distance', p: '', code: 'trig.on(); sleep_us(10); trig.off()\nt = time_pulse_us(echo, 1, 30000)\nd = t * 0.0343 / 2      # cm' },
      { h: 'Motors', p: '<p>Left: GPIO 25 (forward) / 26 (back). Right: GPIO 27 (forward) / 14 (back).</p>' },
      { h: 'Behaviour', p: '<ul><li>Path clear → forward</li><li>Obstacle closer than ~25 cm → turn on the spot for a moment</li><li>Repeat</li></ul>' },
      { h: 'Robot thinking', p: '<p>Sense → Think → Act, many times per second. Tune the distance threshold and turn time.</p>' }
    ],
    widget: 'ultrasonic', widgetTitle: 'ultrasonic echo timer',
    practice: { type: 'code', lang: 'micropython', board: 'esp32', kit: [ESP_ROBOT], title: 'Obstacle avoider', limit: 15000, goal: 'Make the robot explore: drive <b>at least 200 cm</b> in 15 s with <b>at most 2 collisions</b>.',
      code: 'from machine import Pin, time_pulse_us\nfrom time import sleep, sleep_us\n\nl1, l2, r1, r2 = [Pin(p, Pin.OUT) for p in (25, 26, 27, 14)]\ntrig = Pin(5, Pin.OUT)\necho = Pin(18, Pin.IN)\n\ndef forward():\n    l1.on(); l2.off(); r1.on(); r2.off()\n\ndef turn():\n    l1.on(); l2.off(); r1.off(); r2.on()   # spin right\n\ndef distance():\n    trig.on(); sleep_us(10); trig.off()\n    t = time_pulse_us(echo, 1, 30000)\n    return t * 0.0343 / 2\n\nwhile True:\n    d = distance()\n    # obstacle? turn for a while. Otherwise go forward.\n    sleep(0.05)\n',
      hints: ['What should the robot do when distance() is small?', 'if d < 25: turn() then sleep(0.4) so it turns enough; else: forward().', 'Try a threshold of 30 cm and a turn time of 0.5 s, then tune.'],
      check: (r, lab, c) => { const d = c.dist(r), h = c.hits(r); return d >= 200 && h <= 2 ? { ok: true, msg: `Explored ${d.toFixed(0)} cm with ${h} collision${h === 1 ? '' : 's'}. Autonomous!` } : { ok: false, msg: `Distance ${d.toFixed(0)} cm (need ≥ 200), collisions ${h} (need ≤ 2).` }; } },
    quiz: [
      { q: 'Echo time 1000 µs → distance ≈', o: ['17 cm', '34 cm', '1 m', '3.4 cm'], a: 0, e: '1000 × 0.0343 / 2 ≈ 17 cm.' },
      { q: 'Why divide by 2?', o: ['The sound goes there and back', 'Two sensors', 'Half speed', 'Units'], a: 0, e: 'Round trip.' },
      { tf: true, q: 'To spin on the spot, the wheels turn in opposite directions.', a: true, e: 'True.' },
      { q: 'Robot loop order:', o: ['Sense → Think → Act', 'Act → Sleep → Stop', 'Think → Wi-Fi → Act', 'Random'], a: 0, e: 'The classic robotics loop.' },
      { q: 'The robot turns too little and still hits walls. Fix?', o: ['Turn for longer or detect earlier', 'Remove the sensor', 'Go faster', 'Use delay(0)'], a: 0, e: 'Tune threshold and turn time.' }
    ]
  });

  /* ============================== RASPBERRY PI ============================== */
  VL.LESSONS.push(
  {
    id: 'raspberrypi-1', world: 'raspberrypi', n: 1, title: 'Raspberry Pi vs Pico', minutes: 25, level: 'Beginner', skill: 'pins',
    objectives: ['Explain the difference between a computer and a microcontroller', 'Choose the right board for a project', 'Know their main features'],
    intro: 'Same family name, very different machines! One is a full Linux computer, the other a tiny microcontroller.',
    theory: [
      { h: 'Raspberry Pi (4/5)', p: '<p>A complete computer: Linux, desktop, USB, HDMI, camera, Wi-Fi. Runs many programs at once.</p>' },
      { h: 'Raspberry Pi Pico', p: '<p>A microcontroller board (RP2040): runs one program, starts instantly, uses tiny power, precise timing. Programmed in MicroPython or C.</p>' },
      { h: 'Together', p: '<p>Robots often use both: the Pi for vision and AI, the Pico (or ESP32) for motors and sensors.</p>' },
      { h: 'Both use 3.3 V', p: '<p>GPIO logic is 3.3 V on both. Never connect 5 V signals directly.</p>' }
    ],
    widget: 'pi-vs-pico', widgetTitle: 'compare and choose',
    practice: { type: 'predict', title: 'Pick the board', goal: 'Answer four design questions.', items: [
      { q: 'A device that must run for months on 2 AA batteries:', o: ['Raspberry Pi 5', 'Raspberry Pi Pico'], a: 1, e: 'Microcontrollers sip power.' },
      { q: 'A smart camera recognising objects with a neural network:', o: ['Raspberry Pi 5', 'Raspberry Pi Pico'], a: 0, e: 'Needs a powerful CPU and lots of RAM.' },
      { q: 'Which one has a built-in analog input (ADC)?', o: ['Raspberry Pi 5', 'Raspberry Pi Pico'], a: 1, e: 'The Pico has 3 ADC pins.' },
      { q: 'Which one runs an operating system?', o: ['Raspberry Pi 5', 'Raspberry Pi Pico'], a: 0, e: 'Raspberry Pi OS (Linux).' }
    ] },
    quiz: [
      { q: 'The Pico\'s chip is…', o: ['BCM2712', 'RP2040', 'ATmega328P', 'ESP32'], a: 1, e: 'RP2040 (RP2350 on Pico 2).' },
      { q: 'Which boots instantly?', o: ['Pi 5', 'Pico', 'both take 30 s', 'neither'], a: 1, e: 'No OS to load.' },
      { tf: true, q: 'The Raspberry Pi GPIO pins are 5 V tolerant.', a: false, e: 'False: 3.3 V only.' },
      { q: 'Best for a web dashboard server?', o: ['Pico', 'Raspberry Pi', 'A resistor', 'An LED'], a: 1, e: 'Needs Linux and networking.' },
      { q: 'Pico programming languages?', o: ['MicroPython or C/C++', 'Only Scratch', 'Only Java', 'Excel'], a: 0, e: 'MicroPython and the C/C++ SDK.' }
    ]
  },
  {
    id: 'raspberrypi-2', world: 'raspberrypi', n: 2, title: 'Linux command line', minutes: 40, level: 'Beginner', skill: 'code',
    objectives: ['Navigate folders', 'Create, read and move files', 'Use sudo responsibly'],
    intro: 'Engineers control the Raspberry Pi with text commands. Fast, powerful, and it works over the network too.',
    theory: [
      { h: 'Where am I?', p: '<p><code>pwd</code> prints the current folder. <code>ls</code> lists it. <code>cd folder</code> enters, <code>cd ..</code> goes up, <code>cd ~</code> goes home.</p>' },
      { h: 'Files', p: '<p><code>mkdir</code> new folder · <code>touch</code> new empty file · <code>cat</code> show a file · <code>cp</code> copy · <code>mv</code> move/rename · <code>rm</code> delete (careful: no recycle bin!).</p>' },
      { h: 'Writing text', p: '<p><code>echo "hello" &gt; file.txt</code> writes; <code>&gt;&gt;</code> appends. <code>nano file.txt</code> opens an editor.</p>' },
      { h: 'sudo', p: '<p>Runs a command as administrator, e.g. <code>sudo apt update</code>. Use it only when needed.</p>' }
    ],
    widget: 'pi-header', widgetTitle: '40-pin header (bonus)',
    practice: { type: 'terminal', title: 'Organise your robot project', goal: 'Complete the tasks in the practice terminal. Type <b>help</b> for commands.', tasks: [
      { t: 'Create a folder named <code>robot</code> in your home folder', ok: t => t.exists('~/robot', 'd') },
      { t: 'Inside it, create <code>notes.txt</code> containing the word <code>motors</code>', ok: t => /motors/.test(t.read('~/robot/notes.txt') || '') },
      { t: 'Copy <code>hello.py</code> into the robot folder', ok: t => t.exists('~/robot/hello.py', 'f') },
      { t: 'Run it with <code>python3</code>', ok: t => (t.ran || []).some(x => /hello\.py/.test(x)) },
      { t: 'Run <code>sudo apt update</code>', ok: t => t.hist.some(h => /^\s*sudo\s+apt\s+update/.test(h)) }
    ], hints: ['Start with mkdir. Use ls to check.', 'echo "motors" > robot/notes.txt · cp hello.py robot/', 'cd robot then python3 hello.py'] },
    quiz: [
      { q: 'Command to show the current folder?', o: ['ls', 'pwd', 'cd', 'cat'], a: 1, e: 'Print working directory.' },
      { q: 'cd .. means…', o: ['go home', 'go up one folder', 'delete', 'list'], a: 1, e: 'Parent folder.' },
      { tf: true, q: 'rm moves files to a recycle bin.', a: false, e: 'False: deleted for good.' },
      { q: 'echo "hi" >> log.txt…', o: ['overwrites', 'appends', 'deletes', 'prints only'], a: 1, e: '>> appends.' },
      { q: 'sudo means…', o: ['run as administrator', 'super slow', 'undo', 'shutdown'], a: 0, e: 'superuser do.' }
    ]
  },
  {
    id: 'raspberrypi-3', world: 'raspberrypi', n: 3, title: 'Python on the Pi', minutes: 35, level: 'Beginner', skill: 'code',
    objectives: ['Use variables, input and print', 'Convert text to numbers', 'Use f-strings'],
    intro: 'Python is the Raspberry Pi\'s favourite language. Let\'s write a small interactive program.',
    theory: [
      { h: 'Input and output', p: '', code: 'name = input("Your name? ")\nprint("Hello", name)' },
      { h: 'Numbers', p: '<p><code>input()</code> always returns text: convert with <code>int()</code> or <code>float()</code>.</p>', code: 'age = int(input("Age? "))\nprint(age + 10)' },
      { h: 'f-strings', p: '', code: 'print(f"In 10 years you will be {age + 10}")' },
      { h: 'Running scripts', p: '<p>On the Pi: save as <code>main.py</code> and run <code>python3 main.py</code> (or press Run in Thonny).</p>' }
    ],
    widget: null,
    practice: { type: 'code', lang: 'python', board: 'rpi', kit: [], inputs: ['Yasmine', '14'], title: 'Future me', goal: 'Ask for a <b>name</b> and an <b>age</b>, then print: <code>Hello Yasmine! In 10 years you will be 24.</code> (with the typed values).',
      code: 'name = input("What is your name? ")\nage = input("How old are you? ")\n# convert age to a number and print the message\n',
      hints: ['What type does input() return?', 'age = int(age) before adding 10.', 'print(f"Hello {name}! In 10 years you will be {age + 10}.")'],
      check: (r, lab, c) => { const ins = lab.host.querySelector('.kin').value.split('\n').filter(Boolean); const name = ins[0] || '', age = parseInt(ins[1] || '0'); const s = c.serial(r); return s.includes(name) && s.includes(String(age + 10)) ? { ok: true, msg: 'Correct output!' } : { ok: false, msg: `Output should contain "${name}" and ${age + 10}.` }; } },
    quiz: [
      { q: 'input() returns…', o: ['an int', 'a string', 'a float', 'a list'], a: 1, e: 'Always text.' },
      { q: 'What prints?', code: 'x = "3"\nprint(x * 2)', o: ['6', '33', 'error', '3'], a: 1, e: 'String repetition: "33".' },
      { tf: true, q: 'int("12") + 1 gives 13.', a: true, e: 'True.' },
      { q: 'f"{2 + 3}" →', o: ['"2 + 3"', '"5"', 'error', '"{5}"'], a: 1, e: 'Expressions inside braces are evaluated.' },
      { q: 'Command to run main.py on the Pi?', o: ['run main.py', 'python3 main.py', 'cat main.py', 'sudo main'], a: 1, e: 'python3.' }
    ]
  },
  {
    id: 'raspberrypi-4', world: 'raspberrypi', n: 4, title: 'GPIO with gpiozero', minutes: 35, level: 'Beginner', skill: 'code',
    objectives: ['Use BCM pin numbers', 'Control an LED with gpiozero', 'React to a button with callbacks'],
    intro: 'gpiozero makes Raspberry Pi electronics delightfully simple: an LED is just LED(17).',
    theory: [
      { h: 'BCM numbers', p: '<p>gpiozero uses <b>GPIO numbers</b> (BCM), not physical pin positions. GPIO17 = physical pin 11.</p>' },
      { h: 'LED', p: '', code: 'from gpiozero import LED\nled = LED(17)\nled.on(); led.off(); led.blink()' },
      { h: 'Button', p: '<p><code>Button(2)</code> uses the internal pull-up by default: wire it between GPIO2 and GND.</p>', code: 'from gpiozero import Button\nbutton = Button(2)\nbutton.when_pressed = led.on\nbutton.when_released = led.off' },
      { h: 'pause()', p: '', code: 'from signal import pause\npause()   # keep the program alive, waiting for events' }
    ],
    widget: 'pi-header', widgetTitle: '40-pin header',
    practice: { type: 'code', lang: 'gpiozero', board: 'rpi', kit: [{ type: 'led', pin: 17, color: 'green', label: 'Green LED on GPIO17' }, { type: 'button', pin: 2, wiring: 'gnd', sched: '1-3, 5-6', label: 'Button on GPIO2' }], title: 'Event-driven LED', goal: 'Use <b>when_pressed</b> and <b>when_released</b> so the LED on GPIO17 is on only while the button on GPIO2 is pressed.',
      code: 'from gpiozero import LED, Button\nfrom signal import pause\n\nled = LED(17)\nbutton = Button(2)\n\n# connect the button events to the LED\n\npause()\n',
      check: (r, lab, c) => { const bad = [500, 2000, 4000, 5500, 7500].filter(t => (c.valAt(r, 17, t) > 0) !== c.pressed(lab, t)); return bad.length ? { ok: false, msg: `Mismatch at ${bad.map(t => t / 1000 + ' s').join(', ')}.` } : { ok: true, msg: 'The LED follows the button using events.' }; } },
    quiz: [
      { q: 'LED(17) uses…', o: ['physical pin 17', 'GPIO17 (BCM)', 'pin 11 by name', 'A17'], a: 1, e: 'BCM numbering.' },
      { q: 'Button(2) pull resistor by default?', o: ['pull-up', 'pull-down', 'none', 'external only'], a: 0, e: 'pull_up=True.' },
      { tf: true, q: 'button.when_pressed = led.on calls led.on() every time the button is pressed.', a: true, e: 'True: a callback.' },
      { q: 'pause() …', o: ['stops the Pi', 'keeps the program waiting for events', 'pauses the LED', 'deletes the program'], a: 1, e: 'It waits forever.' },
      { q: 'led.blink() blinks…', o: ['once', 'in the background, by default forever', 'only when pressed', 'never'], a: 1, e: 'Background blinking.' }
    ]
  },
  {
    id: 'raspberrypi-5', world: 'raspberrypi', n: 5, title: 'Pico and MicroPython', minutes: 35, level: 'Beginner', skill: 'code',
    objectives: ['Program the Pico with MicroPython', 'Use the on-board LED', 'Read the internal temperature sensor'],
    intro: 'The Pico speaks MicroPython, just like the ESP32. Let\'s blink its on-board LED and read its built-in thermometer.',
    theory: [
      { h: 'On-board LED', p: '<p>Pico: GPIO 25 (on Pico W use <code>Pin("LED")</code>).</p>', code: 'from machine import Pin\nled = Pin(25, Pin.OUT)\nled.toggle()' },
      { h: 'GP numbers', p: '<p>Pins are named GP0–GP28. ADC on GP26, GP27, GP28.</p>' },
      { h: 'Temperature sensor', p: '', code: 'from machine import ADC\nsensor = ADC(4)\nv = sensor.read_u16() * 3.3 / 65535\ntemp = 27 - (v - 0.706) / 0.001721' },
      { h: 'Same skills', p: '<p>Everything from the ESP32 world (Pin, PWM, ADC, sleep) works almost identically on the Pico.</p>' }
    ],
    widget: 'adc', widgetTitle: 'ADC on the Pico',
    practice: { type: 'code', lang: 'micropython', board: 'pico', kit: [{ type: 'led', pin: 25, color: 'green', label: 'On-board LED (GP25)' }], title: 'Heartbeat and thermometer', goal: 'Blink the on-board LED every 0.5 s and print the chip <b>temperature</b> (°C) each time.',
      code: 'from machine import Pin, ADC\nfrom time import sleep\n\nled = Pin(25, Pin.OUT)\nsensor = ADC(4)\n\nwhile True:\n    led.toggle()\n    # read the temperature and print it\n    sleep(0.5)\n',
      check: (r, lab, c) => { const tg = c.toggles(r, 25); const t = c.numbers(r).filter(x => x > 15 && x < 35); return tg >= 4 && t.length >= 2 ? { ok: true, msg: `Blinking (${tg} toggles) and reading ${t[0].toFixed ? t[0].toFixed(1) : t[0]} °C.` } : { ok: false, msg: `${tg} LED toggles, ${t.length} temperatures printed (need ≥ 4 and ≥ 2).` }; } },
    quiz: [
      { q: 'Pico on-board LED pin?', o: ['GP0', 'GP13', 'GP25', 'GP28'], a: 2, e: 'GP25 (Pin("LED") on Pico W).' },
      { q: 'Pico ADC pins?', o: ['GP0–2', 'GP26–28', 'GP10–12', 'none'], a: 1, e: 'GP26, 27, 28.' },
      { tf: true, q: 'read_u16() returns 0–65535.', a: true, e: 'True.' },
      { q: 'ADC(4) on the Pico reads…', o: ['GP4', 'the internal temperature sensor', 'the LED', 'Wi-Fi'], a: 1, e: 'Channel 4 = temperature.' },
      { q: 'Pico logic level?', o: ['3.3 V', '5 V', '12 V', '1.8 V'], a: 0, e: '3.3 V.' }
    ]
  },
  {
    id: 'raspberrypi-6', world: 'raspberrypi', n: 6, title: 'Camera and AI vision', minutes: 45, level: 'Advanced', skill: 'code',
    objectives: ['Explain how images are stored as pixels', 'Apply filters (blur, edges, threshold)', 'Process pixel data in Python'],
    intro: 'Robots see with cameras and AI. Under the hood, an image is just a grid of numbers. Let\'s process one!',
    theory: [
      { h: 'Pixels', p: '<p>Each pixel stores red, green and blue (0–255). Greyscale images store one brightness value per pixel.</p>' },
      { h: 'Filters', p: '<p>A small grid of numbers (a <b>kernel</b>) slides over the image: blur, sharpen, edge detection. This is called <b>convolution</b>.</p>' },
      { h: 'Neural networks', p: '<p>A CNN learns its own kernels from thousands of labelled images. Early layers find edges; deeper layers find shapes, then objects.</p>' },
      { h: 'On the Pi', p: '<p>Picamera2 captures images; OpenCV and TensorFlow Lite (or the Raspberry Pi AI Kit) run vision models.</p>' }
    ],
    widget: 'vision', widgetTitle: 'image filter lab',
    practice: { type: 'code', lang: 'python', board: 'rpi', kit: [], title: 'Count the bright pixels', goal: 'The image is a list of rows of brightness values. Count the pixels <b>brighter than 128</b> and print the number. Then print <code>OBJECT</code> if more than 10 bright pixels are found.',
      code: 'image = [\n    [10, 20, 30, 40, 30, 20, 10, 10],\n    [10, 200, 210, 220, 205, 30, 10, 10],\n    [20, 190, 255, 250, 200, 40, 20, 10],\n    [20, 180, 240, 245, 210, 35, 20, 10],\n    [10, 30, 200, 190, 40, 30, 10, 10],\n    [10, 10, 20, 30, 20, 10, 10, 10],\n]\n\ncount = 0\n# loop over every row and every pixel\n\nprint(count)\n',
      hints: ['You need two loops: one for rows, one for pixels in a row.', 'for row in image:\n    for p in row:\n        if p > 128: …', 'count += 1 inside the if. After the loops: if count > 10: print("OBJECT")'],
      check: (r, lab, c) => { const s = c.serial(r); return /\b14\b/.test(s) && /OBJECT/.test(s) ? { ok: true, msg: '14 bright pixels: object detected!' } : { ok: false, msg: `Expected 14 and OBJECT. Your output: ${s.trim().slice(0, 80) || '(nothing)'}` }; } },
    quiz: [
      { q: 'An RGB pixel (255, 0, 0) is…', o: ['black', 'red', 'white', 'green'], a: 1, e: 'Full red, no green or blue.' },
      { q: 'Edge detection finds…', o: ['places where brightness changes quickly', 'the brightest pixel', 'the image size', 'colours only'], a: 0, e: 'Edges = big changes.' },
      { tf: true, q: 'Neural networks learn their own filters from examples.', a: true, e: 'True.' },
      { q: 'A threshold filter turns each pixel into…', o: ['black or white', 'blurry', 'red', 'nothing'], a: 0, e: 'Binary image.' },
      { q: 'How many values does a 640 × 480 greyscale image hold?', o: ['640', '1120', '307 200', '921 600'], a: 2, e: '640 × 480 = 307 200.' }
    ]
  });
})();
