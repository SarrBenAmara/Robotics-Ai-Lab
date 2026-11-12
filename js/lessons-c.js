/* =========================================================================
   lessons-c.js : ELECTRONICS 9–15 and ELECTRICITY 9–15
   Every code practice has a reference solution (checked by the test suite).
   ========================================================================= */
(function () {
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const adcRaw = V => Math.round(Math.min(1, V / 3.6) * 4095);

  VL.LESSONS.push(
  /* ============================== ELECTRONICS ============================== */
  {
    id: 'electronics-9', world: 'electronics', n: 9, title: 'Potentiometers', minutes: 30, level: 'Beginner', skill: 'measure',
    objectives: ['Explain how a potentiometer divides a voltage', 'Wire the three pins correctly', 'Read a knob position with the ADC'],
    intro: 'A potentiometer (or "pot") is a resistor with a sliding contact. Turn the knob and the voltage on the middle pin changes: the perfect volume knob for your robot!',
    theory: [
      { h: 'Inside the knob', p: '<p>A track of resistive material connects the two outer pins. The middle pin, the <b>wiper</b>, slides along the track when you turn the knob.</p>' },
      { h: 'A voltage divider', p: '<p>Outer pins go to <b style="color:#ef4444">3.3 V</b> and <b>GND</b>. The wiper then gives any voltage between 0 V and 3.3 V:</p><div class="formula">V<sub>wiper</sub> = 3.3 V × position (0 … 1)</div>' },
      { h: 'Reading it', p: '<p>Connect the wiper to an <b>ADC pin</b> (GPIO 32–39 on the ESP32). With 11 dB attenuation, <code>read()</code> gives 0 … 4095 for about 0 … 3.6 V.</p>', code: 'pot = ADC(Pin(34))\npot.atten(ADC.ATTN_11DB)\nraw = pot.read()          # 0 … 4095\nvolts = raw / 4095 * 3.6' },
      { h: 'Common values', p: '<p>10 kΩ is the classic choice: big enough to waste little current (0.33 mA), small enough for the ADC to read it reliably.</p>' }
    ],
    widget: 'divider', widgetTitle: 'voltage divider',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Read the knob', kit: [{ type: 'pot', pin: 34, value: 0.55, label: 'Potentiometer on GPIO 34' }],
      goal: 'Every 0.5 s, print the wiper voltage in volts, rounded to 2 decimals (e.g. <code>1.81</code>). Move the knob slider and run again.',
      code: 'from machine import Pin, ADC\nfrom time import sleep\n\npot = ADC(Pin(34))\npot.atten(ADC.ATTN_11DB)\n\nwhile True:\n    raw = pot.read()\n    volts = 0   # convert raw to volts\n    print(round(volts, 2))\n    sleep(0.5)\n',
      solution: 'from machine import Pin, ADC\nfrom time import sleep\npot = ADC(Pin(34))\npot.atten(ADC.ATTN_11DB)\nwhile True:\n    raw = pot.read()\n    volts = raw / 4095 * 3.6\n    print(round(volts, 2))\n    sleep(0.5)\n',
      hints: ['The ADC gives a number from 0 to 4095. How do you turn it into volts?', 'Full scale (4095) is about 3.6 V with 11 dB attenuation.', 'volts = raw / 4095 * 3.6'],
      check: (r, lab, c) => { const V = c.potV(lab); const n = c.numbers(r); return n.length >= 3 && n.some(x => near(x, V, 0.06)) ? { ok: true, msg: `${V.toFixed(2)} V measured. Your program reads the knob like a real ADC.` } : { ok: false, msg: `The wiper is at ${V.toFixed(2)} V. You printed: ${n.slice(0, 5).join(', ') || 'nothing'}.` }; }
    },
    quiz: [
      { q: 'Which pin of a potentiometer is the wiper?', o: ['The left pin', 'The middle pin', 'The right pin', 'The metal case'], a: 1, e: 'The middle pin slides along the track.' },
      { q: 'Outer pins on 3.3 V and GND, knob in the middle: the wiper gives about…', o: ['0 V', '1.65 V', '3.3 V', '5 V'], a: 1, e: 'Half of 3.3 V.' },
      { tf: true, q: 'A potentiometer is a voltage divider.', a: true, e: 'The wiper splits the track into two resistors.' },
      { q: 'On the ESP32, which pins can read an analog voltage?', o: ['Any pin', 'ADC pins such as GPIO 32–39', 'Only GPIO 2', 'Only 3V3'], a: 1, e: 'Use an ADC-capable pin.' },
      { q: 'A raw reading of 2048 (11 dB) is about…', o: ['0.9 V', '1.8 V', '3.3 V', '2048 V'], a: 1, e: '2048 / 4095 × 3.6 ≈ 1.8 V.' }
    ]
  },
  {
    id: 'electronics-10', world: 'electronics', n: 10, title: 'Buzzers and sound', minutes: 30, level: 'Beginner', skill: 'code',
    objectives: ['Tell an active buzzer from a passive one', 'Produce notes with tone()', 'Relate frequency to pitch'],
    intro: 'Robots beep, alarms ring, games play tunes. A small piezo buzzer and one function, tone(), are all you need.',
    theory: [
      { h: 'Piezo buzzer', p: '<p>A thin ceramic disc bends when a voltage is applied. Switching it on and off hundreds of times per second makes the air vibrate: <b>sound</b>.</p>' },
      { h: 'Active or passive?', p: '<ul><li><b>Active</b>: has its own oscillator, just give it HIGH and it beeps (one pitch).</li><li><b>Passive</b>: you send the frequency, so it can play any note.</li></ul>' },
      { h: 'Frequency = pitch', p: '<p>More vibrations per second = higher note. Middle C is 262 Hz, E is 330 Hz, G is 392 Hz, A is 440 Hz.</p>', code: 'tone(8, 262);   // play C on pin 8\ndelay(300);\nnoTone(8);      // silence', lang: 'cpp' },
      { h: 'Wiring', p: '<p>Buzzer <b>+</b> to a digital pin, <b>−</b> to GND. A 100 Ω resistor in series makes it quieter and protects the pin.</p>' }
    ],
    widget: 'pwm', widgetTitle: 'square waves',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Three-note jingle', kit: [{ type: 'buzzer', pin: 8, label: 'Piezo buzzer on D8' }],
      goal: 'Play <b>C (262 Hz), E (330 Hz) and G (392 Hz)</b> on pin 8, 300 ms each, then be silent for 1 s, forever.',
      code: 'void setup() {\n}\n\nvoid loop() {\n  tone(8, 262);\n  delay(300);\n  // play E then G\n  noTone(8);\n  delay(1000);\n}\n',
      solution: 'void setup() {\n}\nvoid loop() {\n  tone(8, 262);\n  delay(300);\n  tone(8, 330);\n  delay(300);\n  tone(8, 392);\n  delay(300);\n  noTone(8);\n  delay(1000);\n}\n',
      hints: ['Each note is tone(pin, frequency) followed by a delay.', 'Copy the C note twice and change the frequency.', 'tone(8, 330); delay(300); tone(8, 392); delay(300);'],
      check: r => { const f = (r.tones || []).filter(t => t[1] === 8).map(t => Math.round(t[2])); const has = x => f.includes(x); return has(262) && has(330) && has(392) && f.includes(0) ? { ok: true, msg: 'C, E, G: a C-major chord played as a jingle!' } : { ok: false, msg: `Frequencies played on pin 8: ${[...new Set(f)].join(', ') || 'none'}. Need 262, 330, 392 and a pause (noTone).` }; }
    },
    quiz: [
      { q: 'Which buzzer can play different notes?', o: ['Active', 'Passive', 'Both only play one note', 'Neither'], a: 1, e: 'A passive buzzer follows the frequency you send.' },
      { q: 'A higher frequency sounds…', o: ['Lower', 'Higher', 'Louder', 'The same'], a: 1, e: 'More vibrations per second = higher pitch.' },
      { q: 'What does noTone(8) do?', o: ['Plays 8 Hz', 'Stops the sound on pin 8', 'Sets pin 8 HIGH', 'Resets the board'], a: 1, e: 'It stops the square wave.' },
      { tf: true, q: 'The note A (above middle C) is 440 Hz.', a: true, e: 'A4 = 440 Hz is the tuning reference.' },
      { q: 'Why add a resistor in series with a buzzer?', o: ['To make it louder', 'To make it quieter and protect the pin', 'To change the note', 'It is not allowed'], a: 1, e: 'It limits current.' }
    ]
  },
  {
    id: 'electronics-11', world: 'electronics', n: 11, title: 'RGB LEDs and colour mixing', minutes: 30, level: 'Intermediate', skill: 'code',
    objectives: ['Describe the 4 pins of an RGB LED', 'Mix colours with three PWM channels', 'Use duty_u16()'],
    intro: 'One LED, three colours inside, millions of mixes. Let\'s paint with light!',
    theory: [
      { h: 'Three LEDs in one', p: '<p>An RGB LED contains a red, a green and a blue LED. In a <b>common cathode</b> LED the longest leg goes to GND, and each colour gets its own pin (with its own 220 Ω resistor).</p>' },
      { h: 'Mixing light', p: '<p>Red + green = <b style="color:#facc15">yellow</b>, red + blue = <b style="color:#e879f9">magenta</b>, green + blue = <b style="color:#22d3ee">cyan</b>, all three = <b>white</b>.</p>' },
      { h: 'PWM per colour', p: '<p>Each colour is dimmed with PWM. On the ESP32, <code>duty_u16()</code> goes from 0 (off) to 65535 (fully on).</p>', code: 'r = PWM(Pin(25), freq=1000)\nr.duty_u16(65535)   # red fully on\nb = PWM(Pin(27), freq=1000)\nb.duty_u16(32768)   # blue half' },
      { h: 'Common anode', p: '<p>Some RGB LEDs have a common <b>anode</b> (to 3.3 V). Then the logic is inverted: 0 = fully on.</p>' }
    ],
    widget: 'rgbmix', widgetTitle: 'colour mixer',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Make purple', kit: [{ type: 'rgb', pins: { r: 25, g: 26, b: 27 }, label: 'RGB LED (common cathode)' }],
      goal: 'Make the LED <b>purple</b>: red <b>fully on</b>, blue <b>half</b> (duty ≈ 32768), green <b>off</b>.',
      code: 'from machine import Pin, PWM\nfrom time import sleep\n\nr = PWM(Pin(25), freq=1000)\ng = PWM(Pin(26), freq=1000)\nb = PWM(Pin(27), freq=1000)\n\nr.duty_u16(0)\ng.duty_u16(0)\nb.duty_u16(0)\n\nwhile True:\n    sleep(1)\n',
      solution: 'from machine import Pin, PWM\nfrom time import sleep\nr = PWM(Pin(25), freq=1000)\ng = PWM(Pin(26), freq=1000)\nb = PWM(Pin(27), freq=1000)\nr.duty_u16(65535)\ng.duty_u16(0)\nb.duty_u16(32768)\nwhile True:\n    sleep(1)\n',
      hints: ['Which numbers are "fully on" and "half" for duty_u16?', 'Fully on = 65535. Half = 32768.', 'r.duty_u16(65535) and b.duty_u16(32768); keep g at 0.'],
      check: (r, lab, c) => { const R = c.valAt(r, 25, r.end || 1), G = c.valAt(r, 26, r.end || 1), B = c.valAt(r, 27, r.end || 1); return R > 0.95 && G < 0.05 && near(B, 0.5, 0.06) ? { ok: true, msg: 'Purple! 100% red + 50% blue.' } : { ok: false, msg: `Now: red ${Math.round(R * 100)}%, green ${Math.round(G * 100)}%, blue ${Math.round(B * 100)}%. Target: 100%, 0%, 50%.` }; }
    },
    quiz: [
      { q: 'Red + green light makes…', o: ['Brown', 'Yellow', 'Purple', 'White'], a: 1, e: 'Adding light: red + green = yellow.' },
      { q: 'How many pins does an RGB LED have?', o: ['2', '3', '4', '6'], a: 2, e: 'Three colours + one common pin.' },
      { q: 'duty_u16(65535) means…', o: ['Off', 'Half', 'Fully on', 'Error'], a: 2, e: '65535 is the maximum.' },
      { tf: true, q: 'Each colour needs its own resistor.', a: true, e: 'Each LED has its own forward voltage and current.' },
      { q: 'On a common-anode RGB LED, duty 0 means…', o: ['Off', 'Fully on', 'Blinking', 'Burnt'], a: 1, e: 'The logic is inverted: the pin pulls the cathode low.' }
    ]
  },
  {
    id: 'electronics-12', world: 'electronics', n: 12, title: 'Transistors as switches', minutes: 35, level: 'Intermediate', skill: 'ohm',
    objectives: ['Explain why a GPIO pin cannot drive a motor directly', 'Use an NPN transistor as a switch', 'Calculate a base resistor'],
    intro: 'A GPIO pin gives about 20 mA. A motor needs hundreds. The transistor is the tiny muscle that lets a small signal control a big current.',
    theory: [
      { h: 'Three legs', p: '<p>An NPN transistor (like the 2N2222 or BC547) has a <b>collector</b>, a <b>base</b> and an <b>emitter</b>. A small current into the base lets a big current flow from collector to emitter.</p>' },
      { h: 'Low-side switch', p: '<p>Load (motor, LED strip) between the supply and the collector, emitter to GND, base to the GPIO through a resistor. Pin HIGH → transistor ON → load ON.</p>' },
      { h: 'Base resistor', p: '<div class="formula">R<sub>B</sub> ≈ (3.3 V − 0.7 V) / I<sub>B</sub></div><p>For 1 mA base current: 2.6 V / 1 mA ≈ <b>2.7 kΩ</b> (1 kΩ is also common).</p>' },
      { h: 'Flyback diode', p: '<p>Motors and relays are coils: when switched off they create a voltage spike. A diode across the coil (backwards) protects the transistor.</p>' }
    ],
    widget: 'transistor', widgetTitle: 'transistor switch',
    practice: {
      type: 'predict', title: 'Switch it right', goal: 'Answer the four design questions. The 3D kit shows a motor with its driver board, which contains transistors.',
      scene: { board: 'uno', kit: [{ type: 'motor', pins: { in1: 7, in2: 8, en: 9 }, label: 'DC motor + driver' }] },
      items: [
        { q: 'A motor needs 300 mA. Can you connect it directly to an UNO pin?', o: ['Yes', 'No: a pin gives about 20 mA', 'Only with a long wire', 'Only on pin 13'], a: 1, e: 'Right: you need a transistor or a driver.' },
        { q: 'Which leg of an NPN transistor receives the GPIO signal (through a resistor)?', o: ['Collector', 'Base', 'Emitter', 'None'], a: 1, e: 'Yes, the base controls the switch.' },
        { q: 'Base resistor for 1 mA from 3.3 V (Vbe 0.7 V)?', o: ['26 Ω', '260 Ω', '2.6 kΩ', '26 kΩ'], a: 2, e: 'Correct: (3.3 − 0.7) / 0.001 = 2600 Ω.' },
        { q: 'Why add a diode across a motor or relay coil?', o: ['To make it faster', 'To absorb the voltage spike when it switches off', 'To light it up', 'To change direction'], a: 1, e: 'The flyback diode protects the transistor.' }
      ]
    },
    quiz: [
      { q: 'The three legs of an NPN transistor are…', o: ['Anode, cathode, gate', 'Collector, base, emitter', 'Plus, minus, signal', 'Source, drain, gate'], a: 1, e: 'C, B, E.' },
      { q: 'In a low-side switch the emitter goes to…', o: ['The motor', 'GND', '5 V', 'The GPIO'], a: 1, e: 'The emitter is on GND.' },
      { tf: true, q: 'A small base current controls a much larger collector current.', a: true, e: 'That is the amplification.' },
      { q: 'Typical voltage between base and emitter when ON:', o: ['0.1 V', '0.7 V', '3.3 V', '12 V'], a: 1, e: 'About 0.7 V for silicon.' },
      { q: 'What protects a transistor driving a coil?', o: ['A capacitor on the base', 'A flyback diode', 'A longer wire', 'A bigger LED'], a: 1, e: 'The diode clamps the spike.' }
    ]
  },
  {
    id: 'electronics-13', world: 'electronics', n: 13, title: 'Relays: switching big loads', minutes: 30, level: 'Intermediate', skill: 'code',
    objectives: ['Explain how a relay isolates two circuits', 'Read NO / NC / COM terminals', 'Control a relay module safely'],
    intro: 'Want your robot to switch a lamp or a pump? A relay is a switch flipped by an electromagnet, so your 5 V board never touches the big circuit.',
    theory: [
      { h: 'How it works', p: '<p>Current in the <b>coil</b> makes a magnet that pulls a metal contact. The contact closes a completely separate circuit. Click!</p>' },
      { h: 'Terminals', p: '<ul><li><b>COM</b>: common.</li><li><b>NO</b>: normally open (connected to COM only when the relay is ON).</li><li><b>NC</b>: normally closed (connected when OFF).</li></ul>' },
      { h: 'Relay modules', p: '<p>Modules include the transistor, the flyback diode and an LED. Connect <b>VCC</b> (red), <b>GND</b> (black) and <b>IN</b> to a pin. Some modules are "active LOW": IN = LOW turns them ON.</p>' },
      { h: 'Safety first', p: '<p class="warn">Never work on mains (230 V) wiring in class. In this lab the relay switches a safe 12 V lamp only.</p>' }
    ],
    widget: 'transistor', widgetTitle: 'the driver inside a relay module',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Lamp timer', kit: [{ type: 'led', pin: 7, color: 'blue', label: 'Relay module IN on D7 (its LED shows the coil)' }],
      goal: 'Turn the relay on D7 <b>ON for 2 s, then OFF for 2 s</b>, forever (active HIGH module).',
      code: 'const int RELAY = 7;\n\nvoid setup() {\n  pinMode(RELAY, OUTPUT);\n}\n\nvoid loop() {\n  // ON 2 s, OFF 2 s\n}\n',
      solution: 'const int RELAY = 7;\nvoid setup() {\n  pinMode(RELAY, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(RELAY, HIGH);\n  delay(2000);\n  digitalWrite(RELAY, LOW);\n  delay(2000);\n}\n',
      hints: ['It is a blink program with longer delays.', 'digitalWrite(RELAY, HIGH) then wait, then LOW then wait.', 'digitalWrite(RELAY, HIGH); delay(2000); digitalWrite(RELAY, LOW); delay(2000);'],
      check: (r, lab, c) => { const p = c.pulses(r, 7); const okP = p.length >= 2 && p.every(([a, b]) => near(b - a, 2000, 60)); return okP ? { ok: true, msg: `${p.length} switching cycles of 2 s ON / 2 s OFF. Click… click…` } : { ok: false, msg: p.length ? `ON times: ${p.slice(0, 3).map(([a, b]) => Math.round(b - a) + ' ms').join(', ')}. Need 2000 ms.` : 'The relay never switched ON.' }; }
    },
    quiz: [
      { q: 'What moves the contact inside a relay?', o: ['A motor', 'An electromagnet', 'A spring only', 'Light'], a: 1, e: 'The coil becomes a magnet.' },
      { q: 'NO means…', o: ['Not OK', 'Normally open', 'No output', 'Negative output'], a: 1, e: 'Connected to COM only when ON.' },
      { tf: true, q: 'A relay electrically isolates the control circuit from the load circuit.', a: true, e: 'Only the magnetic field links them.' },
      { q: 'An "active LOW" module turns ON when IN is…', o: ['HIGH', 'LOW', 'Floating', 'PWM'], a: 1, e: 'LOW = ON.' },
      { q: 'Which part protects against the coil\'s voltage spike?', o: ['LED', 'Flyback diode', 'Fuse', 'Wire'], a: 1, e: 'The diode.' }
    ]
  },
  {
    id: 'electronics-14', world: 'electronics', n: 14, title: 'Light sensors (LDR)', minutes: 30, level: 'Intermediate', skill: 'measure',
    objectives: ['Explain how an LDR reacts to light', 'Build an LDR voltage divider', 'Turn a reading into a decision'],
    intro: 'Robots that follow light, street lamps that switch on at night: they all measure light. The simplest sensor is the LDR.',
    theory: [
      { h: 'Light-dependent resistor', p: '<p>An LDR\'s resistance <b>drops</b> when light hits it: about 1 MΩ in the dark, a few kΩ in daylight.</p>' },
      { h: 'Divider', p: '<p>LDR from 3.3 V to the ADC pin, a 10 kΩ resistor from the ADC pin to GND. More light → lower LDR resistance → <b>higher</b> voltage.</p>' },
      { h: 'Threshold', p: '<p>Pick a number between the dark and bright readings and compare:</p>', code: 'if raw < 1500:\n    print("dark")\nelse:\n    print("bright")' },
      { h: 'Hysteresis', p: '<p>Near the threshold the reading flickers. Real projects use two thresholds (e.g. ON below 1400, OFF above 1600).</p>' }
    ],
    widget: 'divider', widgetTitle: 'LDR divider',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Day or night?', kit: [{ type: 'pot', pin: 34, value: 0.25, label: 'LDR divider on GPIO 34 (slider = light)' }],
      goal: 'Every 0.5 s print the raw reading, then <b>dark</b> if it is below 1500 or <b>bright</b> otherwise. Try both by moving the light slider.',
      code: 'from machine import Pin, ADC\nfrom time import sleep\n\nldr = ADC(Pin(34))\nldr.atten(ADC.ATTN_11DB)\n\nwhile True:\n    raw = ldr.read()\n    print(raw)\n    # print "dark" or "bright"\n    sleep(0.5)\n',
      solution: 'from machine import Pin, ADC\nfrom time import sleep\nldr = ADC(Pin(34))\nldr.atten(ADC.ATTN_11DB)\nwhile True:\n    raw = ldr.read()\n    print(raw)\n    if raw < 1500:\n        print("dark")\n    else:\n        print("bright")\n    sleep(0.5)\n',
      hints: ['You need an if / else.', 'Compare raw with 1500.', 'if raw < 1500: print("dark")  else: print("bright")'],
      check: (r, lab, c) => { const raw = adcRaw(c.potV(lab)); const want = raw < 1500 ? 'dark' : 'bright', other = want === 'dark' ? 'bright' : 'dark'; const s = c.serial(r); return s.includes(want) && !s.includes(other) ? { ok: true, msg: `Reading ≈ ${raw} → "${want}". Move the slider across 1500 to test the other branch.` } : { ok: false, msg: `Reading ≈ ${raw}, so the program should print "${want}" (and never "${other}").` }; }
    },
    quiz: [
      { q: 'When light increases, an LDR\'s resistance…', o: ['Increases', 'Decreases', 'Stays the same', 'Becomes negative'], a: 1, e: 'More light = lower resistance.' },
      { q: 'Why put the LDR in a divider?', o: ['To make light', 'Because the ADC measures voltage, not resistance', 'To protect the LED', 'No reason'], a: 1, e: 'The divider converts resistance into voltage.' },
      { tf: true, q: 'Hysteresis uses two thresholds to stop flickering.', a: true, e: 'One to turn ON, another to turn OFF.' },
      { q: 'LDR to 3.3 V, 10 kΩ to GND. More light gives…', o: ['A lower voltage', 'A higher voltage', '0 V', 'No change'], a: 1, e: 'The LDR resistance drops, so the output rises.' },
      { q: 'A typical LDR in total darkness is about…', o: ['1 Ω', '100 Ω', '1 MΩ', '0 Ω'], a: 2, e: 'Hundreds of kΩ to MΩ.' }
    ]
  },
  {
    id: 'electronics-15', world: 'electronics', n: 15, title: 'Project: automatic night light', minutes: 45, level: 'Intermediate', skill: 'code',
    objectives: ['Combine a sensor, a decision and an output', 'Test both cases', 'Document a small project'],
    intro: 'Time to put it all together: when it gets dark, the light turns on by itself. Exactly what a street lamp does!',
    theory: [
      { h: 'Input → process → output', p: '<p>Every robot follows this pattern: <b>sense</b> (LDR), <b>decide</b> (if dark), <b>act</b> (LED on).</p>' },
      { h: 'The circuit', p: '<p>LDR divider on GPIO 34, LED with 220 Ω on GPIO 4. Black wires to GND, red to 3.3 V: the 3D view shows the colour code.</p>' },
      { h: 'The program', p: '', code: 'while True:\n    raw = ldr.read()\n    led.value(1 if raw < 1500 else 0)\n    sleep(0.5)' },
      { h: 'Test plan', p: '<ul><li>Dark (slider low): LED ON?</li><li>Bright (slider high): LED OFF?</li><li>Serial monitor shows the readings.</li></ul>' }
    ],
    widget: 'sensors', widgetTitle: 'sensor explorer',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Night light', kit: [{ type: 'pot', pin: 34, value: 0.2, label: 'LDR divider on GPIO 34 (slider = light)' }, { type: 'led', pin: 4, color: 'yellow', label: 'Night light LED on GPIO 4' }],
      goal: 'Every 0.5 s: read the LDR, print the reading, and switch the LED on GPIO 4 <b>ON when the reading is below 1500</b>, OFF otherwise.',
      code: 'from machine import Pin, ADC\nfrom time import sleep\n\nldr = ADC(Pin(34))\nldr.atten(ADC.ATTN_11DB)\nled = Pin(4, Pin.OUT)\n\nwhile True:\n    raw = ldr.read()\n    print(raw)\n    # decide and switch the LED\n    sleep(0.5)\n',
      solution: 'from machine import Pin, ADC\nfrom time import sleep\nldr = ADC(Pin(34))\nldr.atten(ADC.ATTN_11DB)\nled = Pin(4, Pin.OUT)\nwhile True:\n    raw = ldr.read()\n    print(raw)\n    led.value(1 if raw < 1500 else 0)\n    sleep(0.5)\n',
      hints: ['Use the reading to choose 1 or 0 for the LED.', 'led.value(1) when raw < 1500, else led.value(0).', 'led.value(1 if raw < 1500 else 0)'],
      check: (r, lab, c) => { const raw = adcRaw(c.potV(lab)); const want = raw < 1500 ? 1 : 0; const v = c.valAt(r, 4, Math.min(r.end || 0, 2000)); const n = c.numbers(r); return v === want && n.length >= 2 ? { ok: true, msg: `Reading ≈ ${raw} → LED ${want ? 'ON' : 'OFF'}. Now try the other light level!` } : { ok: false, msg: `Reading ≈ ${raw}: the LED should be ${want ? 'ON' : 'OFF'} and the readings printed.` }; }
    },
    quiz: [
      { q: 'In this project the LDR is the…', o: ['Output', 'Input (sensor)', 'Power supply', 'Program'], a: 1, e: 'It senses light.' },
      { q: 'If the reading is 900 and the threshold is 1500, the LED is…', o: ['ON', 'OFF', 'Blinking', 'Burnt'], a: 0, e: '900 < 1500 → dark → ON.' },
      { tf: true, q: 'Testing both cases (dark and bright) is part of a good test plan.', a: true, e: 'Always test every branch.' },
      { q: 'Which wire colour should GND use?', o: ['Red', 'Black', 'Yellow', 'Any'], a: 1, e: 'Black for GND, red for power.' },
      { q: 'What does sleep(0.5) do in the loop?', o: ['Turns the LED off', 'Waits half a second between readings', 'Resets the board', 'Reads the sensor'], a: 1, e: 'It sets the reading rate.' }
    ]
  },

  /* ============================== ELECTRICITY ============================== */
  {
    id: 'electricity-9', world: 'electricity', n: 9, title: 'Kirchhoff\'s laws', minutes: 35, level: 'Intermediate', skill: 'ohm',
    objectives: ['Apply the current law at a junction', 'Apply the voltage law around a loop', 'Check a circuit with both laws'],
    intro: 'Two simple rules let you analyse any circuit, from a torch to a robot. They were found by Gustav Kirchhoff in 1845.',
    theory: [
      { h: 'Current law (KCL)', p: '<p>At any junction, <b>current in = current out</b>. Charge does not disappear.</p><div class="formula">I<sub>1</sub> = I<sub>2</sub> + I<sub>3</sub></div>' },
      { h: 'Voltage law (KVL)', p: '<p>Around any closed loop, the voltages add up to zero: the battery\'s rise equals the sum of the drops.</p><div class="formula">V<sub>supply</sub> = V<sub>R</sub> + V<sub>LED</sub></div>' },
      { h: 'Example', p: '<p>3.3 V supply, red LED (2.0 V): the resistor gets 3.3 − 2.0 = <b>1.3 V</b>. With 220 Ω, I = 1.3 / 220 ≈ <b>5.9 mA</b>.</p>' },
      { h: 'Why it matters', p: '<p>These laws are exactly what the lab\'s simulator solves (nodal analysis) to give you honest voltages and currents.</p>' }
    ],
    widget: 'seriespar', widgetTitle: 'series and parallel',
    practice: {
      type: 'predict', title: 'Apply the laws', goal: 'Use KCL and KVL to answer.', scene: { board: 'esp32', kit: [{ type: 'led', pin: 4, color: 'red', label: 'LED + 220 Ω' }] },
      items: [
        { q: '120 mA enters a junction; one branch takes 50 mA. The other branch carries…', o: ['50 mA', '70 mA', '120 mA', '170 mA'], a: 1, e: 'KCL: 120 − 50 = 70 mA.' },
        { q: '5 V supply, LED drop 2 V. Voltage across the series resistor?', o: ['2 V', '3 V', '5 V', '7 V'], a: 1, e: 'KVL: 5 − 2 = 3 V.' },
        { q: '3.3 V supply, green LED 2.2 V, 100 Ω resistor. Current?', o: ['1.1 mA', '11 mA', '33 mA', '110 mA'], a: 1, e: '(3.3 − 2.2) / 100 = 11 mA.' },
        { q: 'Three resistors in series drop 1 V, 2 V and 3 V. The supply is…', o: ['2 V', '3 V', '6 V', '1 V'], a: 2, e: 'KVL: drops add to the supply.' }
      ]
    },
    quiz: [
      { q: 'KCL says that at a junction…', o: ['Voltages are equal', 'Current in = current out', 'Resistance doubles', 'Power is lost'], a: 1, e: 'Charge is conserved.' },
      { q: 'KVL says that around a loop…', o: ['Currents add to zero', 'Voltage rises = voltage drops', 'Resistances cancel', 'Nothing'], a: 1, e: 'Energy is conserved.' },
      { tf: true, q: 'In a series circuit the same current flows through every part.', a: true, e: 'There is only one path.' },
      { q: '9 V battery, resistor drop 6 V. The LED drop is…', o: ['15 V', '3 V', '6 V', '9 V'], a: 1, e: '9 − 6 = 3 V.' },
      { q: 'Who stated these laws?', o: ['Ohm', 'Kirchhoff', 'Volta', 'Tesla'], a: 1, e: 'Gustav Kirchhoff, 1845.' }
    ]
  },
  {
    id: 'electricity-10', world: 'electricity', n: 10, title: 'Series and parallel circuits', minutes: 30, level: 'Beginner', skill: 'ohm',
    objectives: ['Compute series and parallel resistance', 'Predict how current divides', 'Choose series or parallel for LEDs'],
    intro: 'Christmas lights that all go dark when one bulb fails? That is series. Lamps in your house that work independently? Parallel.',
    theory: [
      { h: 'Series', p: '<p>One path. Resistances <b>add</b>; the same current flows everywhere; voltages share.</p><div class="formula">R = R<sub>1</sub> + R<sub>2</sub></div>' },
      { h: 'Parallel', p: '<p>Several paths. The same <b>voltage</b> is across each branch; currents add; total resistance is smaller than the smallest branch.</p><div class="formula">1/R = 1/R<sub>1</sub> + 1/R<sub>2</sub></div>' },
      { h: 'Two equal resistors', p: '<p>Two 1 kΩ in series = 2 kΩ. Two 1 kΩ in parallel = <b>500 Ω</b>.</p>' },
      { h: 'LEDs', p: '<p>Each LED in parallel should have <b>its own</b> resistor, otherwise one LED hogs the current.</p>' }
    ],
    widget: 'seriespar', widgetTitle: 'series and parallel calculator',
    practice: {
      type: 'predict', title: 'Calculate', goal: 'Four quick calculations.', scene: { board: 'uno', kit: [{ type: 'led', pin: 9, color: 'green', label: 'LED A' }, { type: 'led', pin: 10, color: 'red', label: 'LED B' }] },
      items: [
        { q: '220 Ω + 330 Ω in series =', o: ['132 Ω', '550 Ω', '110 Ω', '726 Ω'], a: 1, e: 'They add: 550 Ω.' },
        { q: 'Two 1 kΩ in parallel =', o: ['2 kΩ', '1 kΩ', '500 Ω', '250 Ω'], a: 2, e: 'Half of one: 500 Ω.' },
        { q: '6 V across two parallel branches. Each branch has…', o: ['3 V', '6 V', '12 V', '0 V'], a: 1, e: 'Same voltage across parallel branches.' },
        { q: 'Branch currents 20 mA and 30 mA in parallel. Total current?', o: ['10 mA', '25 mA', '50 mA', '600 mA'], a: 2, e: 'Currents add: 50 mA.' }
      ]
    },
    quiz: [
      { q: 'In series, resistances…', o: ['Add', 'Multiply', 'Divide', 'Cancel'], a: 0, e: 'R = R1 + R2.' },
      { q: 'Total resistance in parallel is…', o: ['Larger than the largest', 'Smaller than the smallest', 'Always 0', 'Equal to the sum'], a: 1, e: 'More paths = less resistance.' },
      { tf: true, q: 'In parallel, every branch has the same voltage.', a: true, e: 'They are connected to the same two nodes.' },
      { q: 'If one bulb fails in a series string…', o: ['Others get brighter', 'All go out', 'Nothing happens', 'Only that one goes out'], a: 1, e: 'The single path is broken.' },
      { q: 'Three 300 Ω resistors in parallel =', o: ['900 Ω', '300 Ω', '150 Ω', '100 Ω'], a: 3, e: '300 / 3 = 100 Ω.' }
    ]
  },
  {
    id: 'electricity-11', world: 'electricity', n: 11, title: 'Batteries and power supplies', minutes: 30, level: 'Beginner', skill: 'power',
    objectives: ['Combine cells in series and parallel', 'Read mAh capacity', 'Estimate battery life'],
    intro: 'A robot is only as good as its battery. How do we get the right voltage, and how long will it last?',
    theory: [
      { h: 'Cells in series', p: '<p>Voltages <b>add</b>: 4 × 1.5 V AA = 6 V. Capacity stays the same.</p>' },
      { h: 'Cells in parallel', p: '<p>Voltage stays the same, <b>capacity adds</b>: two 2000 mAh cells in parallel = 4000 mAh. Only connect identical cells in parallel.</p>' },
      { h: 'Capacity', p: '<div class="formula">life (h) ≈ capacity (mAh) / current (mA)</div><p>A 2000 mAh pack powering a 100 mA robot lasts about <b>20 h</b> (less in practice).</p>' },
      { h: 'Li-ion safety', p: '<p>Li-ion cells (3.7 V) store a lot of energy: never short-circuit, puncture or overcharge them. Use a protection board and the right charger.</p>' }
    ],
    widget: 'power', widgetTitle: 'power calculator',
    practice: {
      type: 'predict', title: 'Power the robot', goal: 'Choose the right battery set-up.', scene: { board: 'esp32', kit: [{ type: 'robot', arena: 'obstacles', pins: { l1: 25, l2: 26, r1: 27, r2: 14 } }] },
      items: [
        { q: 'Four 1.5 V AA cells in series give…', o: ['1.5 V', '3 V', '6 V', '12 V'], a: 2, e: '4 × 1.5 = 6 V.' },
        { q: 'Two 2000 mAh cells in parallel give…', o: ['2000 mAh', '4000 mAh', '1000 mAh', '8000 mAh'], a: 1, e: 'Capacity adds in parallel.' },
        { q: 'A 1500 mAh battery and a 150 mA robot: about how long?', o: ['1 h', '10 h', '100 h', '15 min'], a: 1, e: '1500 / 150 = 10 h.' },
        { q: 'Two 3.7 V Li-ion cells in series =', o: ['3.7 V', '7.4 V', '1.85 V', '11.1 V'], a: 1, e: '2 × 3.7 = 7.4 V.' }
      ]
    },
    quiz: [
      { q: 'Cells in series add their…', o: ['Capacity', 'Voltage', 'Weight only', 'Nothing'], a: 1, e: 'Voltage adds.' },
      { q: 'mAh measures…', o: ['Voltage', 'Capacity (charge stored)', 'Resistance', 'Power'], a: 1, e: 'Milliamp-hours of charge.' },
      { tf: true, q: 'You may mix old and new cells in parallel safely.', a: false, e: 'Mixed cells push current into each other.' },
      { q: 'A Li-ion cell\'s nominal voltage is…', o: ['1.2 V', '1.5 V', '3.7 V', '9 V'], a: 2, e: '3.7 V nominal.' },
      { q: '3000 mAh at 300 mA lasts about…', o: ['1 h', '10 h', '30 h', '0.1 h'], a: 1, e: '3000 / 300 = 10 h.' }
    ]
  },
  {
    id: 'electricity-12', world: 'electricity', n: 12, title: 'AC and DC', minutes: 30, level: 'Beginner', skill: 'power',
    objectives: ['Tell AC from DC', 'Read frequency and rms values', 'Explain what a charger does'],
    intro: 'The wall socket and the battery both give electricity, but in very different ways.',
    theory: [
      { h: 'DC', p: '<p><b>Direct current</b> always flows in the same direction at a steady voltage: batteries, USB, solar cells. All our boards need DC.</p>' },
      { h: 'AC', p: '<p><b>Alternating current</b> changes direction many times per second. Mains in Tunisia and Europe: <b>230 V rms, 50 Hz</b>.</p>' },
      { h: 'rms and peak', p: '<div class="formula">V<sub>rms</sub> = V<sub>peak</sub> / √2 → 325 V peak ≈ 230 V rms</div>' },
      { h: 'Chargers', p: '<p>A phone charger <b>transforms</b> 230 V AC to a low voltage, <b>rectifies</b> it to DC and <b>regulates</b> it to 5 V.</p><p class="warn">Mains is dangerous: never open a charger or touch mains wiring.</p>' }
    ],
    widget: 'acdc', widgetTitle: 'AC vs DC',
    practice: {
      type: 'predict', title: 'AC or DC?', goal: 'Answer the four questions.', scene: { board: 'rpi', kit: [] },
      items: [
        { q: 'A Raspberry Pi is powered from a USB-C charger. The Pi itself uses…', o: ['AC', 'DC', 'Both', 'Neither'], a: 1, e: 'The charger delivers 5 V DC.' },
        { q: '50 Hz means the current changes direction…', o: ['50 times per second', '100 times per second', 'Once per minute', 'Never'], a: 1, e: 'Twice per cycle: 100 times.' },
        { q: '230 V rms has a peak of about…', o: ['230 V', '325 V', '115 V', '460 V'], a: 1, e: '230 × √2 ≈ 325 V.' },
        { q: 'Which converts AC to DC?', o: ['A rectifier', 'A resistor', 'An LED', 'A switch'], a: 0, e: 'Diodes in a rectifier.' }
      ]
    },
    quiz: [
      { q: 'A battery provides…', o: ['AC', 'DC', '50 Hz AC', 'Radio waves'], a: 1, e: 'Steady DC.' },
      { q: 'Mains frequency in Tunisia is…', o: ['50 Hz', '60 Hz', '100 Hz', '5 Hz'], a: 0, e: '50 Hz.' },
      { tf: true, q: 'rms voltage is the peak voltage divided by √2 (for a sine wave).', a: true, e: 'Vrms = Vp / √2.' },
      { q: 'Inside a charger, which step comes first?', o: ['Regulate', 'Transform (step down)', 'Light up', 'Amplify'], a: 1, e: 'Transform, rectify, regulate.' },
      { q: 'Why is mains AC dangerous?', o: ['It is cold', 'High voltage can drive deadly currents through the body', 'It is magnetic', 'It is not dangerous'], a: 1, e: 'Respect mains: never touch it.' }
    ]
  },
  {
    id: 'electricity-13', world: 'electricity', n: 13, title: 'Electromagnetism and motors', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Explain how a current makes a magnetic field', 'Describe how a DC motor spins', 'Reverse a motor with an H-bridge'],
    intro: 'Current + magnet = motion. This simple discovery drives every robot wheel.',
    theory: [
      { h: 'Current makes magnetism', p: '<p>A wire carrying current is surrounded by a magnetic field. Coil the wire and the field gets much stronger: an <b>electromagnet</b>.</p>' },
      { h: 'DC motor', p: '<p>Coils on the rotor are pushed by permanent magnets. The <b>commutator</b> flips the current every half turn so the push continues: rotation!</p>' },
      { h: 'Direction', p: '<p>Reverse the current → reverse the rotation. An <b>H-bridge</b> (L298N, TB6612) does it with four switches controlled by IN1 and IN2.</p><table class="spec"><tr><td>IN1 1, IN2 0</td><td>forward</td></tr><tr><td>IN1 0, IN2 1</td><td>reverse</td></tr><tr><td>both 0</td><td>stop</td></tr></table>' },
      { h: 'Speed', p: '<p>PWM on the <b>EN</b> pin sets the average voltage, so the speed.</p>' }
    ],
    widget: 'hbridge', widgetTitle: 'H-bridge',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Forward, stop, reverse', kit: [{ type: 'motor', pins: { in1: 25, in2: 26, en: 27 }, label: 'DC motor + H-bridge' }],
      goal: 'Set EN (GPIO 27) HIGH. Then forever: <b>forward 2 s</b>, <b>stop 1 s</b>, <b>reverse 2 s</b>, <b>stop 1 s</b>.',
      code: 'from machine import Pin\nfrom time import sleep\n\nin1 = Pin(25, Pin.OUT)\nin2 = Pin(26, Pin.OUT)\nen = Pin(27, Pin.OUT)\nen.value(1)\n\nwhile True:\n    in1.value(1); in2.value(0)   # forward\n    sleep(2)\n    # stop 1 s, reverse 2 s, stop 1 s\n',
      solution: 'from machine import Pin\nfrom time import sleep\nin1 = Pin(25, Pin.OUT)\nin2 = Pin(26, Pin.OUT)\nen = Pin(27, Pin.OUT)\nen.value(1)\nwhile True:\n    in1.value(1)\n    in2.value(0)\n    sleep(2)\n    in1.value(0)\n    in2.value(0)\n    sleep(1)\n    in1.value(0)\n    in2.value(1)\n    sleep(2)\n    in1.value(0)\n    in2.value(0)\n    sleep(1)\n',
      hints: ['Look at the table in the theory: which IN values mean stop and reverse?', 'Stop = both 0. Reverse = IN1 0, IN2 1.', 'Add: in1.value(0); in2.value(0); sleep(1); in1.value(0); in2.value(1); sleep(2); then stop again.'],
      check: (r, lab, c) => { const v = (p, t) => c.valAt(r, p, t); const ok = v(27, 500) === 1 && v(25, 1000) === 1 && v(26, 1000) === 0 && v(25, 2500) === 0 && v(26, 2500) === 0 && v(25, 4000) === 0 && v(26, 4000) === 1 && v(25, 5500) === 0 && v(26, 5500) === 0; return ok ? { ok: true, msg: 'Forward, stop, reverse, stop: perfect H-bridge control.' } : { ok: false, msg: `At 1 s IN1/IN2 = ${v(25, 1000)}/${v(26, 1000)} (want 1/0), at 2.5 s = ${v(25, 2500)}/${v(26, 2500)} (0/0), at 4 s = ${v(25, 4000)}/${v(26, 4000)} (0/1). EN at 0.5 s = ${v(27, 500)}.` }; }
    },
    quiz: [
      { q: 'A coil carrying current becomes…', o: ['A battery', 'An electromagnet', 'A resistor only', 'A light'], a: 1, e: 'Current creates a magnetic field.' },
      { q: 'To reverse a DC motor you…', o: ['Reverse the current', 'Increase the voltage', 'Use a bigger wheel', 'Add a capacitor'], a: 0, e: 'Swap the polarity.' },
      { q: 'IN1 = 0 and IN2 = 1 on an H-bridge means…', o: ['Forward', 'Reverse', 'Stop', 'Brake and smoke'], a: 1, e: 'Reverse.' },
      { tf: true, q: 'PWM on EN controls the motor speed.', a: true, e: 'It sets the average voltage.' },
      { q: 'What flips the current in a brushed DC motor?', o: ['The commutator', 'The battery', 'The wheel', 'The code'], a: 0, e: 'The commutator and brushes.' }
    ]
  },
  {
    id: 'electricity-14', world: 'electricity', n: 14, title: 'Energy, power and efficiency', minutes: 30, level: 'Intermediate', skill: 'power',
    objectives: ['Distinguish power (W) and energy (Wh, J)', 'Compute efficiency', 'Reduce the energy use of a robot'],
    intro: 'Watts, watt-hours, joules… Let\'s understand what your electricity bill and your robot battery really measure.',
    theory: [
      { h: 'Power', p: '<div class="formula">P = V × I (watts)</div><p>How fast energy is used. A 5 V, 0.5 A USB device uses 2.5 W.</p>' },
      { h: 'Energy', p: '<div class="formula">E = P × t (Wh or J, 1 Wh = 3600 J)</div><p>2.5 W for 2 h = 5 Wh.</p>' },
      { h: 'Efficiency', p: '<div class="formula">η = useful power out / power in × 100%</div><p>A motor taking 10 W and giving 7 W of motion is 70% efficient; the other 3 W become heat.</p>' },
      { h: 'Saving energy', p: '<ul><li>Turn off unused LEDs and sensors.</li><li>Use sleep modes (ESP32 deep sleep ≈ 10 µA).</li><li>Choose efficient regulators.</li></ul>' }
    ],
    widget: 'power', widgetTitle: 'power calculator',
    practice: {
      type: 'predict', title: 'Energy detective', goal: 'Four energy questions.', scene: { board: 'uno', kit: [{ type: 'motor', pins: { in1: 7, in2: 8, en: 9 }, label: 'DC motor + driver' }] },
      items: [
        { q: '12 V × 0.5 A =', o: ['6 W', '24 W', '12.5 W', '0.6 W'], a: 0, e: 'P = V × I = 6 W.' },
        { q: '6 W for 3 hours =', o: ['2 Wh', '18 Wh', '9 Wh', '0.5 Wh'], a: 1, e: 'E = P × t = 18 Wh.' },
        { q: 'A motor takes 20 W and delivers 15 W of motion. Efficiency?', o: ['50%', '75%', '133%', '5%'], a: 1, e: '15 / 20 = 75%.' },
        { q: 'Where do the lost watts go?', o: ['They disappear', 'Mostly heat', 'Back to the battery', 'Into the code'], a: 1, e: 'Heat (and a little noise).' }
      ]
    },
    quiz: [
      { q: 'The unit of power is the…', o: ['Volt', 'Watt', 'Ohm', 'Joule'], a: 1, e: 'Watt.' },
      { q: '1 Wh equals…', o: ['60 J', '1000 J', '3600 J', '1 J'], a: 2, e: '1 W × 3600 s.' },
      { tf: true, q: 'Efficiency can be more than 100%.', a: false, e: 'Never: energy cannot be created.' },
      { q: 'A 5 V device draws 200 mA. Its power is…', o: ['1 W', '25 W', '0.04 W', '200 W'], a: 0, e: '5 × 0.2 = 1 W.' },
      { q: 'Which saves the most battery on an idle ESP32?', o: ['Brighter LED', 'Deep sleep', 'Faster loop', 'More Wi-Fi'], a: 1, e: 'Deep sleep uses microamps.' }
    ]
  },
  {
    id: 'electricity-15', world: 'electricity', n: 15, title: 'Fault finding', minutes: 35, level: 'Intermediate', skill: 'measure',
    objectives: ['Follow a step-by-step fault-finding method', 'Use voltage and continuity tests', 'Recognise the most common faults'],
    intro: 'Your circuit does not work. Don\'t panic: engineers follow a method, step by step, with a multimeter.',
    theory: [
      { h: '1. Look', p: '<p>Power on? Parts in the right holes? LED the right way round? Wire colours make it easier: <b>black = GND</b>, <b>red = power</b>.</p>' },
      { h: '2. Measure voltages', p: '<p>Black probe on GND. Check the supply first (3.3 V?), then follow the signal: pin, after the resistor, LED anode…</p>' },
      { h: '3. Continuity', p: '<p>With the power <b>off</b>, the continuity mode beeps when two points are connected. Great for broken wires.</p>' },
      { h: 'Top faults', p: '<ul><li>LED reversed</li><li>Both legs in the same strip</li><li>Missing GND wire</li><li>Wrong pin number in the code</li><li>Resistor value 100× too big</li></ul>' }
    ],
    widget: 'meterquiz', widgetTitle: 'which multimeter mode?',
    practice: {
      type: 'predict', title: 'Diagnose', goal: 'For each symptom, pick the most likely fault.', scene: { board: 'esp32', kit: [{ type: 'led', pin: 4, color: 'red', off: true, label: 'LED (not lighting!)' }, { type: 'button', pin: 15, wiring: 'gnd', label: 'Push button' }] },
      items: [
        { q: 'GPIO 4 measures 3.3 V, the LED anode 3.3 V, the cathode 3.3 V. The LED is off.', o: ['LED reversed', 'The cathode is not connected to GND', 'Too much current', 'Code error'], a: 1, e: 'Both sides at 3.3 V: no path to GND.' },
        { q: 'The LED glows very faintly. You used a brown-black-orange resistor.', o: ['10 kΩ: too big', '10 Ω: too small', 'Reversed LED', 'No power'], a: 0, e: '10 kΩ gives only about 0.13 mA.' },
        { q: 'The pin measures 0 V even though the code says pin 4 ON. The wire is on GPIO 2.', o: ['Wrong pin', 'Burnt LED', 'Battery flat', 'Breadboard broken'], a: 0, e: 'The code and the wiring must use the same GPIO.' },
        { q: 'The button reading is random when not pressed.', o: ['Missing pull-up', 'LED reversed', 'Too much voltage', 'Wrong colour wire'], a: 0, e: 'A floating input needs a pull-up (Pin.PULL_UP).' }
      ]
    },
    quiz: [
      { q: 'Where does the black probe usually go?', o: ['3.3 V', 'GND', 'The LED', 'Anywhere'], a: 1, e: 'GND is the reference.' },
      { q: 'Continuity tests must be done with power…', o: ['On', 'Off', 'Doubled', 'It does not matter'], a: 1, e: 'Always off.' },
      { tf: true, q: 'Measuring the supply voltage first is a good habit.', a: true, e: 'No power, nothing works.' },
      { q: 'Both LED legs read 3.3 V. Likely cause?', o: ['No GND connection', 'LED too bright', 'Code too fast', 'Too many wires'], a: 0, e: 'No voltage drop = no current path.' },
      { q: 'A floating input is fixed by…', o: ['A pull-up or pull-down resistor', 'A longer delay', 'A brighter LED', 'More code'], a: 0, e: 'It sets a known default level.' }
    ]
  }
  );
})();
