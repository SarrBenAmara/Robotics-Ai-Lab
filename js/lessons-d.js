/* =========================================================================
   lessons-d.js : ARDUINO 9–15, ESP32 10–15, RASPBERRY PI 7–15
   Every code practice has a reference solution (checked by the test suite).
   ========================================================================= */
(function () {
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const lines = r => VL.chk.serial(r).split('\n').map(s => s.trim()).filter(Boolean);
  const distCm = lab => { const d = lab.kit.find(k => k.type === 'dist'); return d ? (d.cm ?? 25) : 25; };
  const CPP = VL.CODE_BLOCKS_CPP;

  VL.LESSONS.push(
  /* ============================== ARDUINO ============================== */
  {
    id: 'arduino-9', world: 'arduino', n: 9, title: 'Serial communication', minutes: 30, level: 'Beginner', skill: 'code',
    objectives: ['Open the serial port with Serial.begin', 'Print text and numbers', 'Use the serial monitor to debug'],
    intro: 'The serial monitor is your robot\'s voice: it tells you what the program is thinking. Every engineer uses it to debug.',
    theory: [
      { h: 'Opening the line', p: '<p>The UNO talks to the computer over USB using <b>serial</b> communication: bits sent one after the other. Both sides must agree on the speed (baud rate).</p>', code: 'Serial.begin(9600);', lang: 'cpp' },
      { h: 'print vs println', p: '<p><code>Serial.print(x)</code> stays on the same line; <code>Serial.println(x)</code> adds a new line after.</p>', code: 'Serial.print("Speed: ");\nSerial.println(120);   // Speed: 120', lang: 'cpp' },
      { h: 'Debugging', p: '<p>Print the values of your variables at key moments: you will see immediately where the program goes wrong.</p>' },
      { h: 'Baud rate', p: '<p>9600 baud ≈ 960 characters per second. Faster rates (115200) are common for ESP32.</p>' }
    ],
    widget: 'cppvspy', widgetTitle: 'C++ vs Python',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', kit: [], title: 'Table of squares', blocks: CPP,
      goal: 'In <b>setup()</b>, print the numbers 1 to 5 with their squares, one pair per line: <code>1 1</code>, <code>2 4</code>, <code>3 9</code>, <code>4 16</code>, <code>5 25</code>.',
      code: 'void setup() {\n  Serial.begin(9600);\n  for (int i = 1; i <= 5; i++) {\n    // print i, a space, then i * i\n  }\n}\n\nvoid loop() {\n}\n',
      solution: 'void setup() {\n  Serial.begin(9600);\n  for (int i = 1; i <= 5; i++) {\n    Serial.print(i);\n    Serial.print(" ");\n    Serial.println(i * i);\n  }\n}\nvoid loop() {\n}\n',
      hints: ['Use print for the first number and the space, println for the last one.', 'Serial.print(i); Serial.print(" "); …', 'Serial.println(i * i);'],
      check: r => { const L = lines(r); const want = ['1 1', '2 4', '3 9', '4 16', '5 25']; return want.every((w, i) => L[i] === w) ? { ok: true, msg: 'Perfect table! You can now debug any program with Serial.' } : { ok: false, msg: `Expected the lines 1 1 / 2 4 / 3 9 / 4 16 / 5 25. Got: ${L.slice(0, 5).join(' / ') || 'nothing'}.` }; }
    },
    quiz: [
      { q: 'What does Serial.begin(9600) do?', o: ['Waits 9600 ms', 'Opens serial at 9600 baud', 'Prints 9600', 'Sets pin 9'], a: 1, e: 'It starts the serial port.' },
      { q: 'Which adds a new line?', o: ['Serial.print', 'Serial.println', 'Serial.begin', 'delay'], a: 1, e: 'println = print + line.' },
      { tf: true, q: 'The serial monitor speed must match Serial.begin.', a: true, e: 'Otherwise you see garbage characters.' },
      { q: 'Serial.print("A"); Serial.println("B"); shows…', o: ['A then B on two lines', 'AB on one line', 'BA', 'Nothing'], a: 1, e: 'A and B on the same line, then a new line.' },
      { q: 'Main use of the serial monitor:', o: ['Powering the board', 'Seeing values to debug', 'Driving motors', 'Charging'], a: 1, e: 'Debugging and communication.' }
    ]
  },
  {
    id: 'arduino-10', world: 'arduino', n: 10, title: 'Timing with millis()', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Explain why delay() blocks', 'Measure time with millis()', 'Run tasks without blocking'],
    intro: 'delay() freezes everything: a robot that blinks with delay() cannot read its sensors at the same time. millis() fixes that.',
    theory: [
      { h: 'The problem', p: '<p>During <code>delay(1000)</code> the board does <b>nothing else</b>: no button reading, no sensor.</p>' },
      { h: 'millis()', p: '<p>Returns the number of milliseconds since the board started. Compare it with a saved time to know when it is time to act.</p>', code: 'unsigned long last = 0;\nvoid loop() {\n  if (millis() - last >= 250) {\n    last = millis();\n    // do the task\n  }\n  // other tasks run freely here\n}', lang: 'cpp' },
      { h: 'Why unsigned long?', p: '<p>millis() grows big (4 billion before wrapping after ~49 days). <code>millis() - last</code> still works when it wraps.</p>' },
      { h: 'Several tasks', p: '<p>Use one "last" variable per task: blink every 250 ms, read a sensor every 100 ms, print every second… all at once.</p>' }
    ],
    widget: 'debounce', widgetTitle: 'timing explorer',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Blink without delay', kit: [{ type: 'led', pin: 13, color: 'yellow', label: 'On-board LED (D13)' }], blocks: CPP,
      goal: 'Toggle the on-board LED (pin 13) <b>every 250 ms using millis()</b>. Do not use delay().',
      code: 'unsigned long last = 0;\nbool on = false;\n\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  // if 250 ms have passed: save the time, flip on, write it to pin 13\n}\n',
      solution: 'unsigned long last = 0;\nbool on = false;\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  if (millis() - last >= 250) {\n    last = millis();\n    on = !on;\n    digitalWrite(13, on);\n  }\n}\n',
      hints: ['Compare millis() - last with 250.', 'Inside the if: last = millis(); on = !on;', 'digitalWrite(13, on);'],
      check: (r, lab, c) => { if (/\bdelay\s*\(/.test(r.code)) return { ok: false, msg: 'No delay() allowed in this challenge: use millis().' }; const p = c.pulses(r, 13); return p.length >= 5 && p.every(([a, b]) => near(b - a, 250, 15)) ? { ok: true, msg: `${p.length} blinks at 250 ms without blocking. The loop is free for other tasks!` } : { ok: false, msg: p.length ? `ON times: ${p.slice(0, 3).map(([a, b]) => Math.round(b - a) + ' ms').join(', ')}. Need 250 ms.` : 'The LED never turned on.' }; }
    },
    quiz: [
      { q: 'What is the problem with delay()?', o: ['It is too precise', 'It blocks everything else', 'It uses too much power', 'It only works on pin 13'], a: 1, e: 'Nothing else runs during delay.' },
      { q: 'millis() returns…', o: ['Seconds since 1970', 'Milliseconds since the board started', 'The CPU speed', 'A random number'], a: 1, e: 'Time since start.' },
      { q: 'Which type should store millis() values?', o: ['int', 'unsigned long', 'bool', 'char'], a: 1, e: 'They get large.' },
      { tf: true, q: 'With millis() you can blink an LED and read a button at the same time.', a: true, e: 'The loop never blocks.' },
      { q: '"if (millis() - last >= 500)" is true…', o: ['Every loop', 'When 500 ms have passed since last', 'Never', 'Only at start'], a: 1, e: 'That is the time check.' }
    ]
  },
  {
    id: 'arduino-11', world: 'arduino', n: 11, title: 'RGB LED and functions', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Write and call your own function', 'Pass parameters', 'Cycle colours on an RGB LED'],
    intro: 'Functions are reusable blocks with a name. Write setColor() once, use it everywhere: your code gets shorter and clearer.',
    theory: [
      { h: 'A function', p: '', code: 'void setColor(int r, int g, int b) {\n  analogWrite(9, r);\n  analogWrite(10, g);\n  analogWrite(11, b);\n}', lang: 'cpp' },
      { h: 'Calling it', p: '', code: 'setColor(255, 0, 0);   // red\nsetColor(0, 0, 255);   // blue', lang: 'cpp' },
      { h: 'Parameters', p: '<p>r, g, b are <b>parameters</b>: values given to the function each time you call it. <code>void</code> means it returns nothing.</p>' },
      { h: 'PWM pins', p: '<p>RGB colours need PWM: on the UNO use pins with a <b>~</b>: 3, 5, 6, 9, 10, 11.</p>' }
    ],
    widget: 'rgbmix', widgetTitle: 'colour mixer',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Traffic of colours', kit: [{ type: 'rgb', pins: { r: 9, g: 10, b: 11 }, label: 'RGB LED on ~9 ~10 ~11' }], blocks: CPP,
      goal: 'Write <b>setColor(r, g, b)</b> and use it to show <b>red, green, blue</b> for 1 s each, forever.',
      code: 'void setup() {\n  pinMode(9, OUTPUT);\n  pinMode(10, OUTPUT);\n  pinMode(11, OUTPUT);\n}\n\nvoid setColor(int r, int g, int b) {\n  // analogWrite each pin\n}\n\nvoid loop() {\n  setColor(255, 0, 0);\n  delay(1000);\n  // green, then blue\n}\n',
      solution: 'void setup() {\n  pinMode(9, OUTPUT);\n  pinMode(10, OUTPUT);\n  pinMode(11, OUTPUT);\n}\nvoid setColor(int r, int g, int b) {\n  analogWrite(9, r);\n  analogWrite(10, g);\n  analogWrite(11, b);\n}\nvoid loop() {\n  setColor(255, 0, 0);\n  delay(1000);\n  setColor(0, 255, 0);\n  delay(1000);\n  setColor(0, 0, 255);\n  delay(1000);\n}\n',
      hints: ['setColor must call analogWrite three times.', 'analogWrite(9, r); analogWrite(10, g); analogWrite(11, b);', 'In loop: setColor(0, 255, 0); delay(1000); setColor(0, 0, 255); delay(1000);'],
      check: (r, lab, c) => { const v = (p, t) => c.valAt(r, p, t); const ok = v(9, 500) > 0.9 && v(10, 500) < 0.1 && v(10, 1500) > 0.9 && v(9, 1500) < 0.1 && v(11, 2500) > 0.9 && v(10, 2500) < 0.1; return ok ? { ok: true, msg: 'Red → green → blue, all through your own function.' } : { ok: false, msg: `At 0.5 s R/G/B = ${[9, 10, 11].map(p => Math.round(v(p, 500) * 100) + '%').join('/')}; at 1.5 s = ${[9, 10, 11].map(p => Math.round(v(p, 1500) * 100) + '%').join('/')}; at 2.5 s = ${[9, 10, 11].map(p => Math.round(v(p, 2500) * 100) + '%').join('/')}.` }; }
    },
    quiz: [
      { q: 'void in "void setColor(...)" means…', o: ['The function is empty', 'It returns no value', 'It is private', 'It loops'], a: 1, e: 'No return value.' },
      { q: 'In setColor(255, 0, 0), 255 is…', o: ['A parameter value', 'A pin', 'A delay', 'An error'], a: 0, e: 'It is passed into r.' },
      { tf: true, q: 'A function can be called many times.', a: true, e: 'That is the point!' },
      { q: 'Which UNO pins support analogWrite?', o: ['All', '3, 5, 6, 9, 10, 11', 'A0–A5', '0 and 1'], a: 1, e: 'Pins marked ~.' },
      { q: 'setColor(255, 255, 0) shows…', o: ['White', 'Yellow', 'Cyan', 'Magenta'], a: 1, e: 'Red + green.' }
    ]
  },
  {
    id: 'arduino-12', world: 'arduino', n: 12, title: 'Ultrasonic distance sensor', minutes: 40, level: 'Intermediate', skill: 'measure',
    objectives: ['Explain echo timing', 'Trigger the HC-SR04 and read the echo', 'Convert microseconds to centimetres'],
    intro: 'Bats see with sound. So can your robot! The HC-SR04 sends an ultrasonic "click" and listens for the echo.',
    theory: [
      { h: 'How it works', p: '<p>A 10 µs pulse on <b>TRIG</b> makes the sensor send 8 bursts at 40 kHz. <b>ECHO</b> stays HIGH until the sound comes back.</p>' },
      { h: 'Distance', p: '<div class="formula">d (cm) = t (µs) × 0.0343 / 2</div><p>Sound travels 343 m/s, and the time covers the trip there <b>and back</b>.</p>' },
      { h: 'Code', p: '', code: 'digitalWrite(7, HIGH);\ndelayMicroseconds(10);\ndigitalWrite(7, LOW);\nlong t = pulseIn(6, HIGH);\nfloat cm = t * 0.0343 / 2;', lang: 'cpp' },
      { h: 'Wiring', p: '<p>VCC red to 5 V, GND black, TRIG and ECHO to two digital pins. On 3.3 V boards, ECHO needs a voltage divider.</p>' }
    ],
    widget: 'ultrasonic', widgetTitle: 'echo timing',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Measure the wall', kit: [{ type: 'dist', pins: { trig: 7, echo: 6 }, cm: 25, label: 'HC-SR04 (TRIG D7, ECHO D6)' }], blocks: CPP,
      goal: 'Every 500 ms, trigger the sensor and print the distance in <b>cm</b>. Change the obstacle distance and run again.',
      code: 'void setup() {\n  Serial.begin(9600);\n  pinMode(7, OUTPUT);\n  pinMode(6, INPUT);\n}\n\nvoid loop() {\n  digitalWrite(7, LOW);\n  delayMicroseconds(2);\n  digitalWrite(7, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(7, LOW);\n  long t = pulseIn(6, HIGH);\n  // convert t to cm and print it\n  delay(500);\n}\n',
      solution: 'void setup() {\n  Serial.begin(9600);\n  pinMode(7, OUTPUT);\n  pinMode(6, INPUT);\n}\nvoid loop() {\n  digitalWrite(7, LOW);\n  delayMicroseconds(2);\n  digitalWrite(7, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(7, LOW);\n  long t = pulseIn(6, HIGH);\n  float cm = t * 0.0343 / 2;\n  Serial.println(cm);\n  delay(500);\n}\n',
      hints: ['Use the formula from the theory.', 'float cm = t * 0.0343 / 2;', 'Serial.println(cm);'],
      check: (r, lab, c) => { const D = distCm(lab); const n = c.numbers(r); return n.length >= 3 && n.some(x => near(x, D, 1)) ? { ok: true, msg: `${D} cm measured. Your robot can now "see" walls.` } : { ok: false, msg: `The obstacle is at ${D} cm. You printed: ${n.slice(0, 5).join(', ') || 'nothing'}.` }; }
    },
    quiz: [
      { q: 'How long is the TRIG pulse?', o: ['10 µs', '10 ms', '1 s', '40 kHz'], a: 0, e: '10 microseconds.' },
      { q: 'Why divide by 2?', o: ['Two sensors', 'The sound goes there and back', 'Rounding', 'Half speed'], a: 1, e: 'Round trip.' },
      { q: 'An echo of 1000 µs means about…', o: ['3.4 cm', '17 cm', '34 cm', '343 cm'], a: 1, e: '1000 × 0.0343 / 2 ≈ 17 cm.' },
      { tf: true, q: 'pulseIn measures how long a pin stays HIGH.', a: true, e: 'In microseconds.' },
      { q: 'Speed of sound in air:', o: ['34 m/s', '343 m/s', '3430 m/s', '300 000 km/s'], a: 1, e: 'About 343 m/s.' }
    ]
  },
  {
    id: 'arduino-13', world: 'arduino', n: 13, title: 'Arrays and LED chasers', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Store several values in an array', 'Loop over an array with an index', 'Build a running-light effect'],
    intro: 'Three LEDs, ten LEDs, a hundred: with an array and a loop, the code stays the same size.',
    theory: [
      { h: 'Arrays', p: '<p>An array holds several values under one name. Indexes start at <b>0</b>.</p>', code: 'int pins[] = {2, 3, 4};\n// pins[0] = 2, pins[1] = 3, pins[2] = 4', lang: 'cpp' },
      { h: 'Looping', p: '', code: 'for (int i = 0; i < 3; i++) {\n  pinMode(pins[i], OUTPUT);\n}', lang: 'cpp' },
      { h: 'Chaser', p: '<p>Turn each LED on, wait, turn it off, move to the next: the light "runs".</p>' },
      { h: 'Careful', p: '<p>Reading <code>pins[3]</code> in a 3-element array is a bug: there is no 4th element! C++ will not warn you.</p>' }
    ],
    widget: 'cppvspy', widgetTitle: 'C++ vs Python',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Running light', kit: [{ type: 'led', pin: 2, color: 'red', label: 'LED on D2' }, { type: 'led', pin: 3, color: 'yellow', label: 'LED on D3' }, { type: 'led', pin: 4, color: 'green', label: 'LED on D4' }], blocks: CPP,
      goal: 'Using the array <code>pins</code>, light D2, then D3, then D4, <b>300 ms each</b> (only one on at a time), forever.',
      code: 'int pins[] = {2, 3, 4};\n\nvoid setup() {\n  for (int i = 0; i < 3; i++) {\n    pinMode(pins[i], OUTPUT);\n  }\n}\n\nvoid loop() {\n  for (int i = 0; i < 3; i++) {\n    // on, wait 300 ms, off\n  }\n}\n',
      solution: 'int pins[] = {2, 3, 4};\nvoid setup() {\n  for (int i = 0; i < 3; i++) {\n    pinMode(pins[i], OUTPUT);\n  }\n}\nvoid loop() {\n  for (int i = 0; i < 3; i++) {\n    digitalWrite(pins[i], HIGH);\n    delay(300);\n    digitalWrite(pins[i], LOW);\n  }\n}\n',
      hints: ['Use pins[i] as the pin number.', 'digitalWrite(pins[i], HIGH); delay(300);', 'Then digitalWrite(pins[i], LOW);'],
      check: (r, lab, c) => { const P = [2, 3, 4].map(p => c.pulses(r, p)); const ok = P.every(ps => ps.length >= 2 && ps.every(([a, b]) => near(b - a, 300, 15))) && P[0][0][0] < P[1][0][0] && P[1][0][0] < P[2][0][0] && near(P[1][0][0] - P[0][0][0], 300, 15); return ok ? { ok: true, msg: 'The light runs D2 → D3 → D4. Add more pins to the array and it still works!' } : { ok: false, msg: 'Each LED should be ON 300 ms, one after the other: D2, then D3, then D4.' }; }
    },
    quiz: [
      { q: 'The first element of an array has index…', o: ['1', '0', '-1', 'It depends'], a: 1, e: 'Indexes start at 0.' },
      { q: 'int a[] = {5, 7, 9}; a[2] is…', o: ['5', '7', '9', 'error'], a: 2, e: 'Index 2 = third value.' },
      { tf: true, q: 'C++ always warns you when you read past the end of an array.', a: false, e: 'It does not: be careful!' },
      { q: 'for (int i = 0; i < 3; i++) runs…', o: ['2 times', '3 times', '4 times', 'forever'], a: 1, e: 'i = 0, 1, 2.' },
      { q: 'Why use an array of pins?', o: ['It is faster electricity', 'The code stays short when adding LEDs', 'It is required', 'To save power'], a: 1, e: 'Loops scale.' }
    ]
  },
  {
    id: 'arduino-14', world: 'arduino', n: 14, title: 'Temperature sensor TMP36', minutes: 35, level: 'Intermediate', skill: 'measure',
    objectives: ['Read an analog temperature sensor', 'Convert volts to °C with a formula', 'Print floating-point values'],
    intro: 'The TMP36 gives a voltage that rises 10 mV per °C. One analogRead and a formula: you have a thermometer.',
    theory: [
      { h: 'The sensor', p: '<p>Three legs: <b>+Vs</b> (red to 5 V), <b>Vout</b> (to A0), <b>GND</b> (black). Flat side facing you: left = +Vs.</p>' },
      { h: 'The formula', p: '<div class="formula">T (°C) = (V − 0.5) × 100</div><p>0.5 V means 0 °C; 0.75 V means 25 °C.</p>' },
      { h: 'Code', p: '', code: 'int raw = analogRead(A0);\nfloat v = raw * 5.0 / 1023.0;\nfloat t = (v - 0.5) * 100.0;', lang: 'cpp' },
      { h: 'Floats', p: '<p>Write <code>5.0</code>, not <code>5</code>: with only integers, C++ throws away the decimals.</p>' }
    ],
    widget: 'adc', widgetTitle: 'ADC converter',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Thermometer', kit: [{ type: 'pot', pin: 14, value: 0.15, vref: 5, look: 'tmp36', label: 'TMP36 on A0 (slider = temperature)' }], blocks: CPP,
      goal: 'Every second, print the temperature in °C: <code>Temp: 24.8</code>. Move the slider to heat the sensor.',
      code: 'void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int raw = analogRead(A0);\n  float v = raw * 5.0 / 1023.0;\n  // compute t and print "Temp: " then t\n  delay(1000);\n}\n',
      solution: 'void setup() {\n  Serial.begin(9600);\n}\nvoid loop() {\n  int raw = analogRead(A0);\n  float v = raw * 5.0 / 1023.0;\n  float t = (v - 0.5) * 100.0;\n  Serial.print("Temp: ");\n  Serial.println(t);\n  delay(1000);\n}\n',
      hints: ['Use the formula T = (V − 0.5) × 100.', 'float t = (v - 0.5) * 100.0;', 'Serial.print("Temp: "); Serial.println(t);'],
      check: (r, lab, c) => { const V = c.potV(lab); const raw = Math.floor(V / 5 * 1023); const T = (raw * 5 / 1023 - 0.5) * 100; const n = c.numbers(r); return n.length >= 2 && n.some(x => near(x, T, 0.6)) ? { ok: true, msg: `${T.toFixed(1)} °C. Your thermometer works!` } : { ok: false, msg: `The sensor gives ${V.toFixed(2)} V → about ${T.toFixed(1)} °C. You printed: ${n.slice(0, 4).join(', ') || 'nothing'}.` }; }
    },
    quiz: [
      { q: 'TMP36 output at 25 °C:', o: ['0.25 V', '0.5 V', '0.75 V', '2.5 V'], a: 2, e: '0.5 + 25 × 0.01 = 0.75 V.' },
      { q: 'The TMP36 changes by…', o: ['1 mV/°C', '10 mV/°C', '100 mV/°C', '1 V/°C'], a: 1, e: '10 mV per degree.' },
      { q: '1.0 V means…', o: ['10 °C', '50 °C', '100 °C', '0 °C'], a: 1, e: '(1.0 − 0.5) × 100 = 50 °C.' },
      { tf: true, q: 'raw * 5 / 1023 with only integers can lose the decimals.', a: true, e: 'Use 5.0 to force float maths.' },
      { q: 'The TMP36 middle pin goes to…', o: ['5 V', 'GND', 'An analog input', 'D13'], a: 2, e: 'Vout to A0.' }
    ]
  },
  {
    id: 'arduino-15', world: 'arduino', n: 15, title: 'Project: parking sensor', minutes: 50, level: 'Advanced', skill: 'code',
    objectives: ['Combine a sensor and two outputs', 'Use thresholds to decide', 'Test with different distances'],
    intro: 'Cars beep when you get close to a wall. Build the same system: ultrasonic sensor, warning LED and buzzer.',
    theory: [
      { h: 'Plan', p: '<ol><li>Measure the distance.</li><li>If it is <b>less than 30 cm</b>: LED ON and beep (1000 Hz).</li><li>Otherwise: LED OFF and silence.</li></ol>' },
      { h: 'Reuse', p: '<p>Put the measuring code in a function <code>float readCm()</code>: loop() then reads like the plan.</p>', code: 'float readCm() {\n  digitalWrite(7, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(7, LOW);\n  return pulseIn(6, HIGH) * 0.0343 / 2;\n}', lang: 'cpp' },
      { h: 'Wiring', p: '<p>Sensor TRIG D7 / ECHO D6, LED on D13, buzzer on D8. All GND wires black, 5 V wires red.</p>' },
      { h: 'Improve it', p: '<p>Real parking sensors beep <b>faster</b> when closer: the delay can depend on the distance.</p>' }
    ],
    widget: 'ultrasonic', widgetTitle: 'echo timing',
    practice: {
      type: 'code', lang: 'cpp', board: 'uno', title: 'Beep when close', limit: 6000, kit: [{ type: 'dist', pins: { trig: 7, echo: 6 }, cm: 18, label: 'HC-SR04 (TRIG D7, ECHO D6)' }, { type: 'led', pin: 13, color: 'red', label: 'Warning LED (D13)' }, { type: 'buzzer', pin: 8, label: 'Buzzer on D8' }], blocks: CPP,
      goal: 'Every 300 ms: measure and print the distance. If it is <b>below 30 cm</b>, LED ON and <code>tone(8, 1000)</code>; otherwise LED OFF and <code>noTone(8)</code>.',
      code: 'void setup() {\n  Serial.begin(9600);\n  pinMode(7, OUTPUT);\n  pinMode(6, INPUT);\n  pinMode(13, OUTPUT);\n}\n\nfloat readCm() {\n  digitalWrite(7, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(7, LOW);\n  return pulseIn(6, HIGH) * 0.0343 / 2;\n}\n\nvoid loop() {\n  float d = readCm();\n  Serial.println(d);\n  // if close: LED on + tone, else LED off + noTone\n  delay(300);\n}\n',
      solution: 'void setup() {\n  Serial.begin(9600);\n  pinMode(7, OUTPUT);\n  pinMode(6, INPUT);\n  pinMode(13, OUTPUT);\n}\nfloat readCm() {\n  digitalWrite(7, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(7, LOW);\n  return pulseIn(6, HIGH) * 0.0343 / 2;\n}\nvoid loop() {\n  float d = readCm();\n  Serial.println(d);\n  if (d < 30) {\n    digitalWrite(13, HIGH);\n    tone(8, 1000);\n  } else {\n    digitalWrite(13, LOW);\n    noTone(8);\n  }\n  delay(300);\n}\n',
      hints: ['You need an if / else on d.', 'if (d < 30) { digitalWrite(13, HIGH); tone(8, 1000); }', 'else { digitalWrite(13, LOW); noTone(8); }'],
      check: (r, lab, c) => { const D = distCm(lab); const close = D < 30; const led = c.valAt(r, 13, 1000); const tones = (r.tones || []).filter(t => t[1] === 8); const beep = tones.length ? tones.filter(t => t[0] <= 1000).pop() : null; const beeping = !!(beep && beep[2] > 0); const n = c.numbers(r); const ok = led === (close ? 1 : 0) && beeping === close && n.some(x => near(x, D, 1)); return ok ? { ok: true, msg: `${D} cm → ${close ? 'LED ON + beep' : 'quiet'}. Now test the other case by changing the distance!` } : { ok: false, msg: `Obstacle at ${D} cm: expected LED ${close ? 'ON' : 'OFF'} and ${close ? 'a 1000 Hz tone' : 'no tone'}, with the distance printed.` }; }
    },
    quiz: [
      { q: 'In this project the buzzer is…', o: ['A sensor', 'An output', 'A power supply', 'A resistor'], a: 1, e: 'It is an actuator/output.' },
      { q: 'Distance 45 cm, threshold 30 cm: the LED is…', o: ['ON', 'OFF', 'Blinking', 'Burnt'], a: 1, e: '45 is not below 30.' },
      { tf: true, q: 'Putting the measurement in a function makes loop() easier to read.', a: true, e: 'Clear structure.' },
      { q: 'What does readCm() return?', o: ['Nothing', 'A distance in cm', 'The pin', 'A tone'], a: 1, e: 'A float distance.' },
      { q: 'To beep faster when closer, change…', o: ['The LED colour', 'The delay according to the distance', 'The baud rate', 'Nothing'], a: 1, e: 'Shorter delay when closer.' }
    ]
  },

  /* ============================== ESP32 ============================== */
  {
    id: 'esp32-10', world: 'esp32', n: 10, title: 'Touch sensors', minutes: 30, level: 'Intermediate', skill: 'code',
    objectives: ['Explain capacitive touch sensing', 'Read TouchPad values', 'Use a threshold to detect a finger'],
    intro: 'The ESP32 can feel your finger with no button at all: just a wire or a piece of copper tape.',
    theory: [
      { h: 'Capacitive sensing', p: '<p>Your body adds a little capacitance to the pad. The ESP32 measures it: the reading <b>drops</b> when touched (≈ 600 → ≈ 100).</p>' },
      { h: 'Touch pins', p: '<p>GPIO 0, 2, 4, 12, 13, 14, 15, 27, 32 and 33 are touch-capable (T0–T9).</p>' },
      { h: 'Code', p: '', code: 'from machine import TouchPad, Pin\nt = TouchPad(Pin(4))\nif t.read() < 300:\n    print("touched")' },
      { h: 'Calibrate', p: '<p>Values change with wire length and humidity: print them first, then pick a threshold in the middle.</p>' }
    ],
    widget: 'sensors', widgetTitle: 'sensor explorer',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Touch lamp', kit: [{ type: 'touch', pin: 4, sched: '1-3, 5-6', label: 'Touch pad on GPIO 4' }, { type: 'led', pin: 16, color: 'blue', label: 'LED on GPIO 16' }],
      goal: 'Every 0.1 s, read the touch pad and switch the LED on GPIO 16 <b>ON while it is touched</b> (reading below 300), OFF otherwise.',
      code: 'from machine import Pin, TouchPad\nfrom time import sleep\n\npad = TouchPad(Pin(4))\nled = Pin(16, Pin.OUT)\n\nwhile True:\n    v = pad.read()\n    # LED on if v < 300\n    sleep(0.1)\n',
      solution: 'from machine import Pin, TouchPad\nfrom time import sleep\npad = TouchPad(Pin(4))\nled = Pin(16, Pin.OUT)\nwhile True:\n    v = pad.read()\n    led.value(1 if v < 300 else 0)\n    sleep(0.1)\n',
      hints: ['Compare v with 300.', 'led.value(1) when v < 300.', 'led.value(1 if v < 300 else 0)'],
      check: (r, lab, c) => { const S = c.sched(lab, 'touch'); if (!S.length) return { ok: false, msg: 'Add touch times in the kit (e.g. 1-3).' }; const inT = t => S.some(([a, b]) => t >= a && t < b); const pts = [500, 1500, 2500, 3500, 5500, 7000].filter(t => t < (r.end || 10000)); const bad = pts.filter(t => c.valAt(r, 16, t) !== (inT(t - 150) && inT(t) ? 1 : 0) && inT(t - 150) === inT(t)); return !bad.length ? { ok: true, msg: 'The LED follows your finger. No button needed!' } : { ok: false, msg: `At ${(bad[0] / 1000).toFixed(1)} s the pad was ${inT(bad[0]) ? 'touched' : 'free'} but the LED was ${c.valAt(r, 16, bad[0]) ? 'ON' : 'OFF'}.` }; }
    },
    quiz: [
      { q: 'When a finger touches the pad, the reading…', o: ['Rises', 'Drops', 'Stays the same', 'Becomes negative'], a: 1, e: 'Capacitance increases, the count drops.' },
      { q: 'Which is a touch pin?', o: ['GPIO 4', 'GPIO 34', 'GPIO 6', 'GND'], a: 0, e: 'GPIO 4 = T0.' },
      { tf: true, q: 'You should print the readings before choosing a threshold.', a: true, e: 'Calibrate first.' },
      { q: 'Touch sensing needs…', o: ['A push button', 'Only a conductive pad or wire', 'A motor', '5 V'], a: 1, e: 'No moving parts.' },
      { q: 'Reading 620 with threshold 300 means…', o: ['Touched', 'Not touched', 'Error', 'Wi-Fi'], a: 1, e: '620 > 300.' }
    ]
  },
  {
    id: 'esp32-11', world: 'esp32', n: 11, title: 'Timers and interrupts', minutes: 35, level: 'Advanced', skill: 'code',
    objectives: ['Run code periodically with a hardware Timer', 'Write a callback function', 'React to a pin change with an interrupt'],
    intro: 'Instead of checking the clock in a loop, let the hardware call you: timers and interrupts make programs that react instantly.',
    theory: [
      { h: 'Timer', p: '<p>A hardware timer calls a function (a <b>callback</b>) at a fixed period, while the main program does something else.</p>', code: 'from machine import Timer\ndef tick(t):\n    led.value(not led.value())\ntim = Timer(0)\ntim.init(period=500, mode=Timer.PERIODIC, callback=tick)' },
      { h: 'Interrupt on a pin', p: '', code: 'btn = Pin(15, Pin.IN, Pin.PULL_UP)\nbtn.irq(trigger=Pin.IRQ_FALLING, handler=pressed)' },
      { h: 'Keep callbacks short', p: '<p>Do the minimum in a callback (set a flag, toggle a pin). Long work belongs in the main loop.</p>' },
      { h: 'ONE_SHOT', p: '<p><code>mode=Timer.ONE_SHOT</code> calls the function once after the period: a software alarm clock.</p>' }
    ],
    widget: 'pwm', widgetTitle: 'periodic signals',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Timer blink', kit: [{ type: 'led', pin: 4, color: 'green', label: 'LED on GPIO 4' }],
      goal: 'Without any loop or sleep, make a <b>Timer</b> toggle the LED on GPIO 4 every <b>500 ms</b>.',
      code: 'from machine import Pin, Timer\n\nled = Pin(4, Pin.OUT)\n\ndef tick(t):\n    pass   # toggle the LED here\n\ntim = Timer(0)\n# tim.init(...)\n',
      solution: 'from machine import Pin, Timer\nled = Pin(4, Pin.OUT)\ndef tick(t):\n    led.value(not led.value())\ntim = Timer(0)\ntim.init(period=500, mode=Timer.PERIODIC, callback=tick)\n',
      hints: ['The callback must flip the LED.', 'led.value(not led.value())', 'tim.init(period=500, mode=Timer.PERIODIC, callback=tick)'],
      check: (r, lab, c) => { if (/\bsleep/.test(r.code) || /while\s+True/.test(r.code)) return { ok: false, msg: 'Use only the Timer: no while loop, no sleep.' }; const p = c.pulses(r, 4); return p.length >= 4 && p.every(([a, b]) => near(b - a, 500, 20)) ? { ok: true, msg: `${p.length} blinks driven by the hardware timer. The main program is free!` } : { ok: false, msg: p.length ? `ON times: ${p.slice(0, 3).map(([a, b]) => Math.round(b - a) + ' ms').join(', ')}. Need 500 ms.` : 'The LED never turned on: is the timer started with init()?' }; }
    },
    quiz: [
      { q: 'A callback is…', o: ['A phone call', 'A function called by the system when an event happens', 'A loop', 'A pin'], a: 1, e: 'You give it; the system calls it.' },
      { q: 'Timer.PERIODIC means…', o: ['Once', 'Again and again', 'Never', 'On button press'], a: 1, e: 'Repeats every period.' },
      { tf: true, q: 'Callbacks should be short.', a: true, e: 'They interrupt other code.' },
      { q: 'IRQ_FALLING triggers when a pin goes…', o: ['LOW → HIGH', 'HIGH → LOW', 'Stays HIGH', 'Is PWM'], a: 1, e: 'A falling edge.' },
      { q: 'period=250 calls the function…', o: ['4 times per second', '250 times per second', 'Once', 'Every 25 s'], a: 0, e: '1000 / 250 = 4.' }
    ]
  },
  {
    id: 'esp32-12', world: 'esp32', n: 12, title: 'OLED display', minutes: 35, level: 'Intermediate', skill: 'code',
    objectives: ['Connect an SSD1306 OLED over I2C', 'Draw text at coordinates', 'Refresh the screen with show()'],
    intro: 'Give your project a face: a tiny 128 × 64 screen to show readings, messages, even little drawings.',
    theory: [
      { h: 'The screen', p: '<p>The SSD1306 OLED has 128 × 64 pixels that light up themselves (no backlight). It talks I2C at address <b>0x3C</b>: SDA (green) GPIO 21, SCL (blue) GPIO 22.</p>' },
      { h: 'Buffer and show()', p: '<p>Drawing commands change a buffer in memory. Nothing appears until you call <b>show()</b>.</p>', code: 'import ssd1306\noled = ssd1306.SSD1306_I2C(128, 64, i2c)\noled.fill(0)\noled.text("Hello", 0, 0)\noled.show()' },
      { h: 'Coordinates', p: '<p>(0, 0) is the top-left corner. Each text character is 8 × 8 pixels, so lines are 8 or 10 pixels apart.</p>' },
      { h: 'Shapes', p: '<p><code>pixel(x, y, 1)</code>, <code>line(x1, y1, x2, y2, 1)</code>, <code>rect(x, y, w, h, 1)</code>, <code>fill_rect(…)</code>.</p>' }
    ],
    widget: 'i2c', widgetTitle: 'I2C bus',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Hello screen', kit: [{ type: 'oled', sda: 21, scl: 22, label: 'OLED 128×64 (I2C 0x3C)' }],
      goal: 'Show <b>two lines</b> on the OLED: <code>Hello</code> on the first line (y = 0) and your <b>name</b> on the second (y = 16), then call show().',
      code: 'from machine import Pin, I2C\nimport ssd1306\n\ni2c = I2C(0, scl=Pin(22), sda=Pin(21))\noled = ssd1306.SSD1306_I2C(128, 64, i2c)\n\noled.fill(0)\noled.text("Hello", 0, 0)\n# second line + show\n',
      solution: 'from machine import Pin, I2C\nimport ssd1306\ni2c = I2C(0, scl=Pin(22), sda=Pin(21))\noled = ssd1306.SSD1306_I2C(128, 64, i2c)\noled.fill(0)\noled.text("Hello", 0, 0)\noled.text("Yasmine", 0, 16)\noled.show()\n',
      hints: ['Use oled.text("…", x, y) with y = 16.', 'Do not forget oled.show() at the end.', 'oled.text("Yasmine", 0, 16) then oled.show()'],
      check: r => { const f = (r.oled || []).slice(-1)[0]; if (!f) return { ok: false, msg: 'Nothing was displayed: did you call oled.show()?' }; const T = f[1].filter(o => o[0] === 'text'); const hello = T.find(o => /hello/i.test(o[1]) && o[3] === 0); const second = T.find(o => o[3] >= 8 && String(o[1]).trim().length >= 2); return hello && second ? { ok: true, msg: `The screen shows "${hello[1]}" and "${second[1]}". Look at the 3D OLED!` } : { ok: false, msg: 'Need "Hello" at y = 0 and a second text line lower down (y = 16).' }; }
    },
    quiz: [
      { q: 'The usual I2C address of an SSD1306 is…', o: ['0x48', '0x3C', '0x27', '0x00'], a: 1, e: '0x3C.' },
      { q: 'Text does not appear. You probably forgot…', o: ['fill(1)', 'show()', 'sleep()', 'print()'], a: 1, e: 'show() sends the buffer.' },
      { q: '(0, 0) is…', o: ['The centre', 'The top-left corner', 'The bottom-right', 'Off-screen'], a: 1, e: 'Top-left.' },
      { tf: true, q: 'An OLED needs a backlight.', a: false, e: 'Each pixel emits its own light.' },
      { q: 'fill(0) does what?', o: ['Clears the buffer (all off)', 'Lights every pixel', 'Turns the screen off forever', 'Resets the ESP32'], a: 0, e: 'All pixels off.' }
    ]
  },
  {
    id: 'esp32-13', world: 'esp32', n: 13, title: 'Deep sleep and batteries', minutes: 30, level: 'Intermediate', skill: 'power',
    objectives: ['Compare active and sleep currents', 'Put the ESP32 in deep sleep', 'Design a battery-friendly sensor'],
    intro: 'A weather station on a battery must last months. The trick: wake up, measure, send, sleep. Most of the time the ESP32 is asleep.',
    theory: [
      { h: 'Currents', p: '<table class="spec"><tr><td>Wi-Fi transmitting</td><td>≈ 160–240 mA</td></tr><tr><td>Active, no radio</td><td>≈ 40 mA</td></tr><tr><td>Light sleep</td><td>≈ 0.8 mA</td></tr><tr><td>Deep sleep</td><td>≈ 10 µA</td></tr></table>' },
      { h: 'Deep sleep', p: '<p>Almost everything switches off; only a tiny timer stays awake. When it wakes up, the program <b>restarts from the beginning</b>.</p>', code: 'import machine\nmachine.deepsleep(60000)   # sleep 60 s' },
      { h: 'Duty cycling', p: '<p>Awake 2 s every 10 min at 50 mA, asleep the rest at 10 µA: average ≈ <b>0.18 mA</b>. A 2000 mAh battery lasts over a year!</p>' },
      { h: 'Remember', p: '<p>Variables are lost in deep sleep. Store what you need in RTC memory or flash.</p>' }
    ],
    widget: 'power', widgetTitle: 'power calculator',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Measure then sleep', kit: [{ type: 'led', pin: 4, color: 'green', label: 'Status LED on GPIO 4' }],
      goal: 'Light the LED for 0.5 s (we are awake), print <code>Measuring…</code>, turn the LED off, then go to <b>deep sleep for 10 s</b>.',
      code: 'import machine\nfrom machine import Pin\nfrom time import sleep\n\nled = Pin(4, Pin.OUT)\nled.value(1)\nprint("Measuring...")\nsleep(0.5)\n# LED off, then deep sleep 10 s\n',
      solution: 'import machine\nfrom machine import Pin\nfrom time import sleep\nled = Pin(4, Pin.OUT)\nled.value(1)\nprint("Measuring...")\nsleep(0.5)\nled.value(0)\nmachine.deepsleep(10000)\n',
      hints: ['Turn the LED off with led.value(0).', 'machine.deepsleep takes milliseconds.', 'machine.deepsleep(10000)'],
      check: (r, lab, c) => { const s = c.serial(r); const p = c.pulses(r, 4); return r.reason === 'deepsleep' && /Measuring/.test(s) && p.length === 1 && near(p[0][1] - p[0][0], 500, 30) && /10000/.test(s) ? { ok: true, msg: 'Awake 0.5 s, asleep 10 s: this sensor could run for months on a battery.' } : { ok: false, msg: r.reason !== 'deepsleep' ? 'The board never went to deep sleep.' : 'Check: LED on 0.5 s, "Measuring..." printed, LED off, deepsleep(10000).' }; }
    },
    quiz: [
      { q: 'Deep sleep current of an ESP32 is about…', o: ['10 µA', '10 mA', '100 mA', '1 A'], a: 0, e: 'Microamps.' },
      { q: 'After waking from deep sleep the program…', o: ['Continues the next line', 'Restarts from the beginning', 'Stops', 'Erases itself'], a: 1, e: 'It is like a reset.' },
      { tf: true, q: 'Wi-Fi is the most power-hungry part of the ESP32.', a: true, e: 'Hundreds of mA when transmitting.' },
      { q: 'machine.deepsleep(5000) sleeps…', o: ['5 ms', '5 s', '5 min', 'forever'], a: 1, e: 'Milliseconds: 5000 ms = 5 s.' },
      { q: 'Best strategy for a battery sensor:', o: ['Always on', 'Wake, measure, send, sleep', 'Never sleep', 'Blink fast'], a: 1, e: 'Duty cycling.' }
    ]
  },
  {
    id: 'esp32-14', world: 'esp32', n: 14, title: 'Web APIs: getting data', minutes: 40, level: 'Advanced', skill: 'iot',
    objectives: ['Explain HTTP GET and JSON', 'Download data with urequests', 'Extract a value from a JSON response'],
    intro: 'Your ESP32 can ask the internet questions: the weather, the time, a message from the teacher. Servers answer in JSON.',
    theory: [
      { h: 'HTTP GET', p: '<p>The ESP32 sends a request to a URL; the server answers with a status code (<b>200 = OK</b>) and data.</p>' },
      { h: 'JSON', p: '<p>JSON is text that looks like a Python dictionary:</p>', code: '{"temperature": 21.5, "city": "Tunis"}' },
      { h: 'Code', p: '', code: 'r = urequests.get("http://dashboard.virtuallab/api")\ndata = r.json()\nprint(data["temperature"])\nr.close()' },
      { h: 'Virtual cloud', p: '<p>In this lab the server is virtual: no real internet, but the same code works on a real ESP32 with a real URL.</p>' }
    ],
    widget: 'network', widgetTitle: 'network explorer',
    practice: {
      type: 'code', lang: 'micropython', board: 'esp32', title: 'Today\'s temperature', kit: [{ type: 'wifi' }],
      goal: 'Connect to <b>VirtualLab</b> (password robotics123), GET <code>http://dashboard.virtuallab/api</code> and print <code>Temperature: 21.5</code> using the JSON value.',
      code: 'import network, urequests, time\n\nwlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect("VirtualLab", "robotics123")\nwhile not wlan.isconnected():\n    time.sleep(0.2)\n\nr = urequests.get("http://dashboard.virtuallab/api")\n# data = r.json() then print the temperature\nr.close()\n',
      solution: 'import network, urequests, time\nwlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect("VirtualLab", "robotics123")\nwhile not wlan.isconnected():\n    time.sleep(0.2)\nr = urequests.get("http://dashboard.virtuallab/api")\ndata = r.json()\nprint("Temperature:", data["temperature"])\nr.close()\n',
      hints: ['r.json() turns the answer into a dictionary.', 'data["temperature"]', 'print("Temperature:", data["temperature"])'],
      check: (r, lab, c) => /Temperature:?\s*21\.5/.test(c.serial(r)) && /\[\s*["']temperature["']\s*\]/.test(r.code) ? { ok: true, msg: 'You read live data from a web API. That is how weather stations and smart homes work!' } : { ok: false, msg: 'Print "Temperature: 21.5" using data["temperature"] from r.json().' }
    },
    quiz: [
      { q: 'Status code 200 means…', o: ['Not found', 'OK', 'Server error', 'Forbidden'], a: 1, e: '200 OK.' },
      { q: 'JSON looks like…', o: ['A Python dictionary', 'Binary', 'An image', 'Assembly'], a: 0, e: 'Keys and values.' },
      { q: 'GET is used to…', o: ['Download data', 'Delete the server', 'Turn on Wi-Fi', 'Sleep'], a: 0, e: 'Read data from a server.' },
      { tf: true, q: 'You should close the response to free memory.', a: true, e: 'r.close().' },
      { q: 'data["city"] on {"city": "Tunis"} gives…', o: ['city', 'Tunis', 'None', 'an error'], a: 1, e: 'The value.' }
    ]
  },
  {
    id: 'esp32-15', world: 'esp32', n: 15, title: 'Bluetooth Low Energy', minutes: 30, level: 'Advanced', skill: 'iot',
    objectives: ['Compare Wi-Fi and BLE', 'Describe advertising, services and characteristics', 'Choose the right radio for a project'],
    intro: 'Your fitness band talks to your phone with Bluetooth Low Energy. The ESP32 speaks BLE too.',
    theory: [
      { h: 'BLE vs Wi-Fi', p: '<table class="spec"><tr><td>Wi-Fi</td><td>fast, long range, internet, power-hungry</td></tr><tr><td>BLE</td><td>small data, ~10 m, phone-friendly, very low power</td></tr></table>' },
      { h: 'Advertising', p: '<p>A BLE device shouts its name a few times per second so phones can find it.</p>' },
      { h: 'Services and characteristics', p: '<p>Data is organised in <b>services</b> (e.g. "Environmental sensing") containing <b>characteristics</b> (e.g. "Temperature" = 21.5). A phone can <b>read</b>, <b>write</b> or <b>subscribe</b> (notify).</p>' },
      { h: 'In MicroPython', p: '<p>The <code>bluetooth</code> module (or <code>aioble</code>) gives access to BLE on a real ESP32. The virtual lab explains the concepts only.</p>' }
    ],
    widget: 'wifi', widgetTitle: 'radio explorer',
    practice: {
      type: 'predict', title: 'Wi-Fi or BLE?', goal: 'Pick the best radio for each project.', scene: { board: 'esp32', kit: [{ type: 'wifi' }] },
      items: [
        { q: 'A heart-rate band sending one number per second to a phone.', o: ['Wi-Fi', 'BLE'], a: 1, e: 'BLE: tiny data, low power, phone.' },
        { q: 'A camera streaming video to a web page.', o: ['Wi-Fi', 'BLE'], a: 0, e: 'Wi-Fi: lots of data.' },
        { q: 'A phone reads the "Temperature" value of a sensor. In BLE that value is a…', o: ['Service', 'Characteristic', 'Router', 'Pin'], a: 1, e: 'Characteristics hold values.' },
        { q: 'The device repeatedly broadcasts its name so phones can find it. This is…', o: ['Advertising', 'Deep sleep', 'PWM', 'I2C'], a: 0, e: 'Advertising.' }
      ]
    },
    quiz: [
      { q: 'BLE is best for…', o: ['Video streaming', 'Small data at very low power', 'Long-distance internet', 'Charging'], a: 1, e: 'Low energy.' },
      { q: 'Typical BLE range:', o: ['10 cm', '~10 m', '10 km', 'unlimited'], a: 1, e: 'About 10 metres.' },
      { tf: true, q: 'A phone can subscribe to a characteristic to get notified of changes.', a: true, e: 'Notify.' },
      { q: 'A group of related characteristics is a…', o: ['Service', 'Router', 'Packet', 'Pin'], a: 0, e: 'Service.' },
      { q: 'Does the ESP32 support both Wi-Fi and Bluetooth?', o: ['Yes', 'No'], a: 0, e: 'Both radios are built in.' }
    ]
  },

  /* ============================== RASPBERRY PI ============================== */
  {
    id: 'raspberrypi-7', world: 'raspberrypi', n: 7, title: 'Python lists and loops', minutes: 30, level: 'Beginner', skill: 'code',
    objectives: ['Store data in a list', 'Loop over a list', 'Compute an average, a minimum and a maximum'],
    intro: 'Sensors produce many values. Lists keep them together, and loops process them in a few lines.',
    theory: [
      { h: 'Lists', p: '', code: 'temps = [21.5, 23.0, 24.5]\nprint(temps[0])    # 21.5\ntemps.append(22.0)' },
      { h: 'Looping', p: '', code: 'for t in temps:\n    print(t)' },
      { h: 'Built-ins', p: '<p><code>len()</code>, <code>sum()</code>, <code>min()</code>, <code>max()</code>, <code>sorted()</code> work on lists.</p>', code: 'avg = sum(temps) / len(temps)' },
      { h: 'f-strings', p: '', code: 'print(f"Average: {avg:.1f}")   # 1 decimal' }
    ],
    widget: 'cppvspy', widgetTitle: 'C++ vs Python',
    practice: {
      type: 'code', lang: 'python', board: 'rpi', kit: [], title: 'Weather statistics',
      goal: 'For <code>temps = [21.5, 23.0, 24.5, 22.0, 26.0]</code>, print <code>Average: 23.4</code>, <code>Min: 21.5</code> and <code>Max: 26.0</code>.',
      code: 'temps = [21.5, 23.0, 24.5, 22.0, 26.0]\n\navg = 0   # compute the average\nprint(f"Average: {avg:.1f}")\n# print Min and Max\n',
      solution: 'temps = [21.5, 23.0, 24.5, 22.0, 26.0]\navg = sum(temps) / len(temps)\nprint(f"Average: {avg:.1f}")\nprint("Min:", min(temps))\nprint("Max:", max(temps))\n',
      hints: ['sum() and len() give the average.', 'avg = sum(temps) / len(temps)', 'print("Min:", min(temps)) and print("Max:", max(temps))'],
      check: (r, lab, c) => { const s = c.serial(r); return /Average:?\s*23\.4/.test(s) && /Min:?\s*21\.5/.test(s) && /Max:?\s*26(\.0)?/.test(s) ? { ok: true, msg: 'Statistics done in five lines of Python.' } : { ok: false, msg: 'Expected: Average: 23.4, Min: 21.5, Max: 26.0.' }; }
    },
    quiz: [
      { q: 'temps[0] is…', o: ['The last item', 'The first item', 'The length', 'An error'], a: 1, e: 'Index 0.' },
      { q: 'len([3, 5, 7]) =', o: ['2', '3', '15', '7'], a: 1, e: 'Three items.' },
      { tf: true, q: 'append() adds an item at the end of a list.', a: true, e: 'Yes.' },
      { q: 'sum([1, 2, 3]) / 3 =', o: ['1', '2.0', '3', '6'], a: 1, e: '6 / 3 = 2.0.' },
      { q: 'f"{3.14159:.1f}" gives…', o: ['3', '3.1', '3.14', '3.14159'], a: 1, e: 'One decimal.' }
    ]
  },
  {
    id: 'raspberrypi-8', world: 'raspberrypi', n: 8, title: 'Python functions', minutes: 30, level: 'Beginner', skill: 'code',
    objectives: ['Define a function with def', 'Return a value', 'Reuse a function in a loop'],
    intro: 'A function is a mini-program with a name. Write it once, call it a hundred times.',
    theory: [
      { h: 'def', p: '', code: 'def c_to_f(c):\n    return c * 9 / 5 + 32' },
      { h: 'Calling', p: '', code: 'print(c_to_f(100))   # 212.0' },
      { h: 'return', p: '<p><code>return</code> sends a value back. Without it, the function returns <code>None</code>.</p>' },
      { h: 'Good names', p: '<p>Name functions with verbs: <code>read_sensor()</code>, <code>move_forward()</code>, <code>c_to_f()</code>.</p>' }
    ],
    widget: 'cppvspy', widgetTitle: 'C++ vs Python',
    practice: {
      type: 'code', lang: 'python', board: 'rpi', kit: [], title: 'Conversion table',
      goal: 'Write <code>c_to_f(c)</code> and print a table for 0, 10, 20, 30, 40 °C: <code>0 32.0</code>, <code>10 50.0</code>, … <code>40 104.0</code>.',
      code: 'def c_to_f(c):\n    return 0   # fix the formula\n\nfor c in range(0, 50, 10):\n    print(c, c_to_f(c))\n',
      solution: 'def c_to_f(c):\n    return c * 9 / 5 + 32\nfor c in range(0, 50, 10):\n    print(c, c_to_f(c))\n',
      hints: ['F = C × 9 / 5 + 32.', 'return c * 9 / 5 + 32', 'The loop is already written.'],
      check: (r, lab, c) => { const L = lines(r); const want = ['0 32.0', '10 50.0', '20 68.0', '30 86.0', '40 104.0']; return want.every((w, i) => L[i] === w) ? { ok: true, msg: 'Your function converts every value correctly.' } : { ok: false, msg: `Expected 0 32.0 / 10 50.0 / … Got: ${L.slice(0, 5).join(' / ')}.` }; }
    },
    quiz: [
      { q: 'Which keyword defines a function?', o: ['func', 'def', 'function', 'void'], a: 1, e: 'def.' },
      { q: 'What does return do?', o: ['Prints', 'Sends a value back', 'Stops Python', 'Repeats'], a: 1, e: 'It gives the result.' },
      { q: 'c_to_f(100) =', o: ['100', '180', '212.0', '32'], a: 2, e: '100 × 9/5 + 32 = 212.' },
      { tf: true, q: 'A function without return gives None.', a: true, e: 'Yes.' },
      { q: 'A good function name:', o: ['x1', 'read_sensor', 'aaaa', 'f'], a: 1, e: 'Descriptive verbs.' }
    ]
  },
  {
    id: 'raspberrypi-9', world: 'raspberrypi', n: 9, title: 'Files and data logs', minutes: 30, level: 'Intermediate', skill: 'linux',
    objectives: ['Read a CSV data file', 'Inspect files with head, tail, wc and grep', 'Save program output to a file'],
    intro: 'Robots and sensors produce data logs. On a Raspberry Pi, a few terminal commands tell you what is inside.',
    theory: [
      { h: 'CSV', p: '<p>Comma-separated values: one line per record, first line = column names.</p>', code: 'time,temp_c,light\n08:00,19.5,120\n09:00,21.0,340' },
      { h: 'Looking inside', p: '<table class="spec"><tr><td><code>head -n 3 file</code></td><td>first 3 lines</td></tr><tr><td><code>tail -n 2 file</code></td><td>last 2 lines</td></tr><tr><td><code>wc -l file</code></td><td>count lines</td></tr><tr><td><code>grep 26 file</code></td><td>lines containing 26</td></tr></table>' },
      { h: 'Redirect', p: '<p><code>&gt;</code> saves output to a file (overwrites), <code>&gt;&gt;</code> appends.</p>', code: 'python3 log_temp.py > temps.csv' },
      { h: 'Permissions', p: '<p><code>chmod +x script.py</code> makes a file executable; <code>ls -l</code> shows <code>-rwxr-xr-x</code>.</p>' }
    ],
    widget: 'pi-header', widgetTitle: 'GPIO header',
    practice: {
      type: 'terminal', title: 'Explore the data log', goal: 'Complete the tasks in the terminal. The file <code>readings.csv</code> is in your home folder.',
      tasks: [
        { t: 'Show the first lines of <code>readings.csv</code> with <code>head</code>', ok: t => t.hist.some(h => /^\s*head\b.*readings\.csv/.test(h)) },
        { t: 'Count its lines with <code>wc -l</code>', ok: t => t.hist.some(h => /^\s*wc\s+-l\s+.*readings\.csv/.test(h)) },
        { t: 'Find the rows at 26 °C with <code>grep</code>', ok: t => t.hist.some(h => /^\s*grep\s+["']?26/.test(h)) },
        { t: 'Run <code>log_temp.py</code> and save its output into <code>temps.csv</code>', ok: t => /22\.5/.test(t.read('~/temps.csv') || '') },
        { t: 'Make <code>log_temp.py</code> executable with <code>chmod +x</code>', ok: t => (t.chmodded || []).some(f => /log_temp\.py/.test(f)) }
      ],
      hints: ['Try: head readings.csv', 'wc -l readings.csv · grep 26 readings.csv', 'python3 log_temp.py > temps.csv · chmod +x log_temp.py']
    },
    quiz: [
      { q: 'CSV stands for…', o: ['Comma-separated values', 'Computer system version', 'Common serial voltage', 'Code source file'], a: 0, e: 'Values separated by commas.' },
      { q: 'Which shows the last lines?', o: ['head', 'tail', 'cat -first', 'wc'], a: 1, e: 'tail.' },
      { q: 'wc -l counts…', o: ['Words', 'Lines', 'Bytes', 'Files'], a: 1, e: 'Lines.' },
      { tf: true, q: '>> appends to a file instead of overwriting it.', a: true, e: '> overwrites, >> appends.' },
      { q: 'chmod +x makes a file…', o: ['Hidden', 'Executable', 'Bigger', 'Deleted'], a: 1, e: 'It can be run.' }
    ]
  },
  {
    id: 'raspberrypi-10', world: 'raspberrypi', n: 10, title: 'PWM with gpiozero', minutes: 30, level: 'Intermediate', skill: 'code',
    objectives: ['Dim an LED with PWMLED', 'Set brightness from 0 to 1', 'Use pulse() for a breathing effect'],
    intro: 'gpiozero makes PWM almost too easy: brightness is just a number between 0 and 1.',
    theory: [
      { h: 'PWMLED', p: '', code: 'from gpiozero import PWMLED\nled = PWMLED(18)\nled.value = 0.25   # 25 % brightness' },
      { h: 'Effects', p: '<p><code>led.pulse()</code> fades in and out in the background; <code>led.blink()</code> blinks.</p>' },
      { h: 'PWM pins', p: '<p>Any GPIO can do software PWM; GPIO 12, 13, 18, 19 have hardware PWM (smoother).</p>' },
      { h: 'Loops', p: '', code: 'for i in range(11):\n    led.value = i / 10\n    sleep(0.1)' }
    ],
    widget: 'pwm', widgetTitle: 'PWM explorer',
    practice: {
      type: 'code', lang: 'gpiozero', board: 'rpi', title: 'Fade in', kit: [{ type: 'led', pin: 18, color: 'white', label: 'LED on GPIO18' }],
      goal: 'Fade the LED on GPIO 18 from <b>0 to 1 in 11 steps</b> (0, 0.1, … 1.0), 0.2 s per step, then keep it on.',
      code: 'from gpiozero import PWMLED\nfrom time import sleep\n\nled = PWMLED(18)\n\nfor i in range(11):\n    # set led.value\n    sleep(0.2)\n',
      solution: 'from gpiozero import PWMLED\nfrom time import sleep\nled = PWMLED(18)\nfor i in range(11):\n    led.value = i / 10\n    sleep(0.2)\n',
      hints: ['Brightness = i / 10.', 'led.value = i / 10', 'Indent it inside the for loop.'],
      check: (r, lab, c) => { const d = c.duties(r, 18).map(x => Math.round(x * 10) / 10); const need = [0.1, 0.3, 0.5, 0.7, 0.9, 1]; return need.every(x => d.includes(x)) ? { ok: true, msg: `${new Set(d).size} brightness levels: a smooth fade-in.` } : { ok: false, msg: `Brightness levels seen: ${[...new Set(d)].join(', ') || 'none'}.` }; }
    },
    quiz: [
      { q: 'led.value = 0.5 means…', o: ['Off', 'Half brightness', 'Full', 'Blinking'], a: 1, e: '50 % duty.' },
      { q: 'Which class dims an LED?', o: ['LED', 'PWMLED', 'Button', 'Servo'], a: 1, e: 'PWMLED.' },
      { tf: true, q: 'pulse() runs in the background.', a: true, e: 'Your program can continue.' },
      { q: 'Hardware PWM pin on the Pi:', o: ['GPIO 18', 'GPIO 2', 'GND', '3V3'], a: 0, e: 'GPIO 18 (PWM0).' },
      { q: 'range(11) gives…', o: ['1 … 11', '0 … 10', '0 … 11', '11 numbers starting at 1'], a: 1, e: '0 to 10.' }
    ]
  },
  {
    id: 'raspberrypi-11', world: 'raspberrypi', n: 11, title: 'Servos with gpiozero', minutes: 30, level: 'Intermediate', skill: 'code',
    objectives: ['Control a servo with min(), mid(), max()', 'Explain the servo pulse', 'Power servos safely'],
    intro: 'A robot arm is a chain of servos. gpiozero moves them with one line each.',
    theory: [
      { h: 'Servo class', p: '', code: 'from gpiozero import Servo\ns = Servo(17)\ns.min()   # one end\ns.mid()   # centre\ns.max()   # other end' },
      { h: 'Value', p: '<p><code>s.value</code> goes from −1 (min) to +1 (max).</p>' },
      { h: 'Pulses', p: '<p>Every 20 ms the servo gets a 1 ms (min) to 2 ms (max) pulse.</p>' },
      { h: 'Power', p: '<p>Servo current spikes can reset the Pi: power servos from a separate 5 V supply, with <b>GND shared</b> (black wire).</p>' }
    ],
    widget: 'servo', widgetTitle: 'servo pulses',
    practice: {
      type: 'code', lang: 'gpiozero', board: 'rpi', title: 'Arm wave', kit: [{ type: 'servo', pin: 17, label: 'Servo on GPIO17' }],
      goal: 'Forever: <b>min</b> for 1 s, <b>mid</b> for 1 s, <b>max</b> for 1 s.',
      code: 'from gpiozero import Servo\nfrom time import sleep\n\ns = Servo(17)\n\nwhile True:\n    s.min()\n    sleep(1)\n    # mid, then max\n',
      solution: 'from gpiozero import Servo\nfrom time import sleep\ns = Servo(17)\nwhile True:\n    s.min()\n    sleep(1)\n    s.mid()\n    sleep(1)\n    s.max()\n    sleep(1)\n',
      hints: ['Two more positions with a sleep after each.', 's.mid(); sleep(1)', 's.max(); sleep(1)'],
      check: r => { const a = r.servo.filter(s => s.pin === 17); const at = t => { const x = a.filter(s => s.t <= t).pop(); return x ? x.a : null; }; return at(500) === 0 && at(1500) === 90 && at(2500) === 180 && at(3500) === 0 ? { ok: true, msg: 'Min → mid → max: your arm waves!' } : { ok: false, msg: `Angles at 0.5 / 1.5 / 2.5 s: ${[500, 1500, 2500].map(at).join(' / ')}. Want 0 / 90 / 180.` }; }
    },
    quiz: [
      { q: 's.mid() puts the servo…', o: ['At one end', 'In the centre', 'Off', 'Spinning'], a: 1, e: 'Centre.' },
      { q: 'Servo pulses repeat every…', o: ['1 ms', '20 ms', '1 s', '10 s'], a: 1, e: '50 Hz = 20 ms.' },
      { tf: true, q: 'Servos and the Pi must share GND.', a: true, e: 'Common reference.' },
      { q: 's.value = 1 is the same as…', o: ['s.min()', 's.mid()', 's.max()', 's.off()'], a: 2, e: '+1 = max.' },
      { q: 'Why a separate supply for servos?', o: ['Colour', 'Current spikes can reset the Pi', 'Speed', 'Noise only'], a: 1, e: 'Protect the Pi.' }
    ]
  },
  {
    id: 'raspberrypi-12', world: 'raspberrypi', n: 12, title: 'Pico: PWM in MicroPython', minutes: 30, level: 'Intermediate', skill: 'code',
    objectives: ['Create a PWM output on the Pico', 'Set frequency and duty_u16', 'Make a smooth fade'],
    intro: 'The Pico has 16 hardware PWM channels. Let\'s make an LED glow smoothly.',
    theory: [
      { h: 'PWM object', p: '', code: 'from machine import Pin, PWM\npwm = PWM(Pin(15))\npwm.freq(1000)\npwm.duty_u16(32768)   # 50 %' },
      { h: 'duty_u16', p: '<p>0 = always off, 65535 = always on.</p>' },
      { h: 'Fading', p: '', code: 'for d in range(0, 65536, 4096):\n    pwm.duty_u16(d)\n    sleep(0.05)' },
      { h: 'Pin numbers', p: '<p>Use GP numbers (GP15 = <code>Pin(15)</code>), not the physical pin numbers printed on the board edge.</p>' }
    ],
    widget: 'pwm', widgetTitle: 'PWM explorer',
    practice: {
      type: 'code', lang: 'micropython', board: 'pico', title: 'Pico glow', kit: [{ type: 'led', pin: 15, color: 'red', label: 'LED on GP15' }],
      goal: 'Fade the LED on GP15 up from 0 in <b>at least 10 steps</b> (step 4096, 0.05 s), forever.',
      code: 'from machine import Pin, PWM\nfrom time import sleep\n\npwm = PWM(Pin(15))\npwm.freq(1000)\n\nwhile True:\n    for d in range(0, 65536, 4096):\n        # set the duty\n        sleep(0.05)\n',
      solution: 'from machine import Pin, PWM\nfrom time import sleep\npwm = PWM(Pin(15))\npwm.freq(1000)\nwhile True:\n    for d in range(0, 65536, 4096):\n        pwm.duty_u16(d)\n        sleep(0.05)\n',
      hints: ['Use duty_u16 with d.', 'pwm.duty_u16(d)', 'Indent it inside the for loop.'],
      check: (r, lab, c) => { const d = c.duties(r, 15); return d.length >= 10 ? { ok: true, msg: `${d.length} brightness levels on GP15. Smooth!` } : { ok: false, msg: `Only ${d.length} brightness level(s) seen on GP15.` }; }
    },
    quiz: [
      { q: 'duty_u16(65535) =', o: ['Off', '50 %', 'Fully on', 'Error'], a: 2, e: 'Max.' },
      { q: 'GP15 in code is…', o: ['Pin(20)', 'Pin(15)', 'Pin("GP")', 'Pin(1)'], a: 1, e: 'GP number.' },
      { tf: true, q: 'pwm.freq(1000) sets 1000 cycles per second.', a: true, e: '1 kHz.' },
      { q: 'range(0, 65536, 4096) has how many steps?', o: ['8', '16', '4096', '65536'], a: 1, e: '65536 / 4096 = 16.' },
      { q: 'How many PWM channels on the RP2040?', o: ['2', '8', '16', '40'], a: 2, e: '16 channels.' }
    ]
  },
  {
    id: 'raspberrypi-13', world: 'raspberrypi', n: 13, title: 'Pico: analog inputs', minutes: 30, level: 'Intermediate', skill: 'measure',
    objectives: ['Read the Pico ADC pins', 'Convert read_u16 to volts', 'Use a potentiometer as an input'],
    intro: 'The Pico has three ADC pins (GP26, GP27, GP28). Let\'s read a knob.',
    theory: [
      { h: 'ADC pins', p: '<p>GP26 = ADC0, GP27 = ADC1, GP28 = ADC2. ADC4 is the internal temperature sensor.</p>' },
      { h: 'Reading', p: '', code: 'from machine import ADC\npot = ADC(26)\nraw = pot.read_u16()          # 0 … 65535\nvolts = raw * 3.3 / 65535' },
      { h: 'Wiring', p: '<p>Pot outer pins to <b>3V3</b> (red) and <b>AGND/GND</b> (black), wiper to GP26.</p>' },
      { h: 'Noise', p: '<p>Readings jitter a little: average several samples for a stable value.</p>' }
    ],
    widget: 'adc', widgetTitle: 'ADC converter',
    practice: {
      type: 'code', lang: 'micropython', board: 'pico', title: 'Pico knob', kit: [{ type: 'pot', pin: 26, value: 0.4, label: 'Potentiometer on GP26' }],
      goal: 'Every 0.5 s print the voltage on GP26 rounded to 2 decimals.',
      code: 'from machine import ADC\nfrom time import sleep\n\npot = ADC(26)\n\nwhile True:\n    raw = pot.read_u16()\n    volts = 0   # convert\n    print(round(volts, 2))\n    sleep(0.5)\n',
      solution: 'from machine import ADC\nfrom time import sleep\npot = ADC(26)\nwhile True:\n    raw = pot.read_u16()\n    volts = raw * 3.3 / 65535\n    print(round(volts, 2))\n    sleep(0.5)\n',
      hints: ['Full scale 65535 = 3.3 V.', 'volts = raw * 3.3 / 65535', 'It is already printed.'],
      check: (r, lab, c) => { const V = c.potV(lab); const n = c.numbers(r); return n.length >= 3 && n.some(x => near(x, V, 0.03)) ? { ok: true, msg: `${V.toFixed(2)} V read on GP26.` } : { ok: false, msg: `The wiper is at ${V.toFixed(2)} V. You printed: ${n.slice(0, 4).join(', ') || 'nothing'}.` }; }
    },
    quiz: [
      { q: 'Which Pico pin is ADC0?', o: ['GP0', 'GP26', 'GP25', 'GP15'], a: 1, e: 'GP26.' },
      { q: 'read_u16() returns…', o: ['0 … 1023', '0 … 4095', '0 … 65535', 'volts'], a: 2, e: '16-bit scaled.' },
      { q: '32768 is about…', o: ['0.8 V', '1.65 V', '3.3 V', '5 V'], a: 1, e: 'Half of 3.3 V.' },
      { tf: true, q: 'ADC(4) is the internal temperature sensor.', a: true, e: 'Yes.' },
      { q: 'To reduce noise you can…', o: ['Average several readings', 'Use a longer wire', 'Print faster', 'Use 5 V'], a: 0, e: 'Averaging.' }
    ]
  },
  {
    id: 'raspberrypi-14', world: 'raspberrypi', n: 14, title: 'Networking and SSH', minutes: 30, level: 'Intermediate', skill: 'linux',
    objectives: ['Find the Pi\'s IP address', 'Test a connection with ping', 'Log in remotely with SSH'],
    intro: 'Robots are rarely next to a keyboard. With the network you can control your Pi from anywhere in the room.',
    theory: [
      { h: 'IP address', p: '<p>Every device on the network has an address like <b>192.168.4.37</b>. Find it with <code>hostname -I</code> or <code>ip a</code>.</p>' },
      { h: 'ping', p: '<p><code>ping -c 4 host</code> sends 4 small packets and measures the round trip in ms.</p>' },
      { h: 'SSH', p: '<p><b>S</b>ecure <b>Sh</b>ell: a terminal on another computer, encrypted.</p>', code: 'ssh student@192.168.4.37' },
      { h: 'Security', p: '<p>Change the default password, and only enable SSH on networks you trust.</p>' }
    ],
    widget: 'network', widgetTitle: 'network explorer',
    practice: {
      type: 'terminal', title: 'Remote robot', goal: 'Complete the tasks in the terminal (simulated network).',
      tasks: [
        { t: 'Show your IP address (<code>hostname -I</code> or <code>ip a</code>)', ok: t => !!t.sawIP },
        { t: 'Ping the router <code>192.168.4.1</code>', ok: t => (t.pinged || []).includes('192.168.4.1') },
        { t: 'Ping <code>robot.local</code>', ok: t => (t.pinged || []).includes('robot.local') },
        { t: 'Connect with <code>ssh student@robot.local</code>', ok: t => /robot\.local/.test(t.sshTo || '') || t.hist.some(h => /^\s*ssh\s+\S*robot\.local/.test(h)) }
      ],
      hints: ['hostname -I prints the IP.', 'ping -c 4 192.168.4.1', 'ssh student@robot.local']
    },
    quiz: [
      { q: 'Which command shows the Pi\'s IP?', o: ['hostname -I', 'ls', 'pwd', 'cat'], a: 0, e: 'hostname -I.' },
      { q: 'ping measures…', o: ['Disk space', 'Round-trip time to a host', 'CPU temperature', 'Battery'], a: 1, e: 'Latency.' },
      { q: 'SSH stands for…', o: ['Super Shell', 'Secure Shell', 'System Startup Host', 'Serial Shell'], a: 1, e: 'Secure Shell.' },
      { tf: true, q: 'You should keep the default password on a networked Pi.', a: false, e: 'Change it!' },
      { q: '192.168.4.37 is an…', o: ['IP address', 'MAC address', 'URL', 'Pin number'], a: 0, e: 'IPv4 address.' }
    ]
  },
  {
    id: 'raspberrypi-15', world: 'raspberrypi', n: 15, title: 'Project: smart plant monitor', minutes: 45, level: 'Advanced', skill: 'code',
    objectives: ['Read a soil-moisture sensor', 'Decide and signal with an LED', 'Log readings for the dashboard'],
    intro: 'Plants cannot ask for water… unless you give them a Pico! Build a monitor that warns you when the soil is dry.',
    theory: [
      { h: 'Moisture sensor', p: '<p>A capacitive moisture probe outputs a voltage: <b>low when dry</b>, higher when wet (it behaves like the knob in the kit).</p>' },
      { h: 'Decision', p: '<p>Below <b>1.0 V</b>: "water me" and LED ON. Otherwise: "ok" and LED OFF.</p>' },
      { h: 'Program', p: '', code: 'v = sensor.read_u16() * 3.3 / 65535\nif v < 1.0:\n    led.value(1)\n    print("water me", round(v, 2))\nelse:\n    led.value(0)\n    print("ok", round(v, 2))' },
      { h: 'Going further', p: '<p>Add a Pico W and send readings to a dashboard, or drive a small pump with a transistor.</p>' }
    ],
    widget: 'sensors', widgetTitle: 'sensor explorer',
    practice: {
      type: 'code', lang: 'micropython', board: 'pico', title: 'Water me!', kit: [{ type: 'pot', pin: 26, value: 0.2, look: 'soil', label: 'Soil sensor on GP26 (slider = moisture)' }, { type: 'led', pin: 15, color: 'red', label: 'Alarm LED on GP15' }],
      goal: 'Every second: read GP26 in volts. Below <b>1.0 V</b>: LED on GP15 ON and print <code>water me</code>; otherwise LED OFF and print <code>ok</code>.',
      code: 'from machine import Pin, ADC\nfrom time import sleep\n\nsensor = ADC(26)\nled = Pin(15, Pin.OUT)\n\nwhile True:\n    v = sensor.read_u16() * 3.3 / 65535\n    # decide, light the LED and print\n    sleep(1)\n',
      solution: 'from machine import Pin, ADC\nfrom time import sleep\nsensor = ADC(26)\nled = Pin(15, Pin.OUT)\nwhile True:\n    v = sensor.read_u16() * 3.3 / 65535\n    if v < 1.0:\n        led.value(1)\n        print("water me", round(v, 2))\n    else:\n        led.value(0)\n        print("ok", round(v, 2))\n    sleep(1)\n',
      hints: ['if v < 1.0: … else: …', 'led.value(1) and print("water me") in the if.', 'led.value(0) and print("ok") in the else.'],
      check: (r, lab, c) => { const V = c.potV(lab); const dry = V < 1.0; const s = c.serial(r); const led = c.valAt(r, 15, 500); return led === (dry ? 1 : 0) && s.includes(dry ? 'water me' : 'ok') && !s.includes(dry ? 'ok' : 'water me') ? { ok: true, msg: `${V.toFixed(2)} V → ${dry ? 'dry: water me!' : 'ok'}. Move the slider to test the other case.` } : { ok: false, msg: `${V.toFixed(2)} V means ${dry ? 'dry' : 'wet'}: expected LED ${dry ? 'ON' : 'OFF'} and "${dry ? 'water me' : 'ok'}".` }; }
    },
    quiz: [
      { q: 'The moisture sensor is…', o: ['An output', 'An input', 'A power supply', 'A motor'], a: 1, e: 'It senses.' },
      { q: '0.6 V with a 1.0 V threshold means…', o: ['Wet', 'Dry: water me', 'Error', 'Nothing'], a: 1, e: 'Below threshold → dry.' },
      { tf: true, q: 'A Pico W could send the readings over Wi-Fi.', a: true, e: 'Pico W has Wi-Fi.' },
      { q: 'Which GP pin reads the sensor?', o: ['GP15', 'GP26', 'GP25', 'GP0'], a: 1, e: 'ADC0 = GP26.' },
      { q: 'To water automatically you would add…', o: ['A pump with a transistor', 'Another LED', 'A longer delay', 'A screen only'], a: 0, e: 'Driver + pump.' }
    ]
  }
  );
  /* keep the world summaries (home cards, counts) in sync with the lessons */
  VL.WORLDS.forEach(w => { const T = VL.worldLessons(w.id).map(l => l.title); if (w.id === 'esp32' && !VL.lessonById('esp32-1')) T.unshift(w.lessons[0]); if (T.length) w.lessons = T; });
})();
