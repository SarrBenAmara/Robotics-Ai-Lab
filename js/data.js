/* =========================================================================
   Virtual Robotics & AI Lab — by Mrs Sarra Ben Amara
   data.js : hardware data, lessons, quiz, hints, challenges
   ========================================================================= */
window.VL = window.VL || {};

/* ---------- ESP32-DevKitC V4 (ESP32-WROOM-32), 38 pins ----------
   Order follows Espressif's DevKitC V4 header tables, pin 1 at the
   antenna end. J2 = left header, J3 = right header (board seen from above,
   antenna at the top, USB at the bottom). */
VL.BOARD_NAME = 'ESP32-DevKitC V4 (ESP32-WROOM-32)';
(function () {
  const L = [
    ['3V3', null, 'power'], ['EN', null, 'control'], ['VP', 36, 'input'], ['VN', 39, 'input'],
    ['IO34', 34, 'input'], ['IO35', 35, 'input'], ['IO32', 32, 'gpio'], ['IO33', 33, 'gpio'],
    ['IO25', 25, 'gpio'], ['IO26', 26, 'gpio'], ['IO27', 27, 'gpio'], ['IO14', 14, 'gpio'],
    ['IO12', 12, 'strap'], ['GND', null, 'ground'], ['IO13', 13, 'gpio'], ['SD2', 9, 'flash'],
    ['SD3', 10, 'flash'], ['CMD', 11, 'flash'], ['5V', null, 'power5']
  ];
  const R = [
    ['GND', null, 'ground'], ['IO23', 23, 'gpio'], ['IO22', 22, 'gpio'], ['TX', 1, 'serial'],
    ['RX', 3, 'serial'], ['IO21', 21, 'gpio'], ['GND', null, 'ground'], ['IO19', 19, 'gpio'],
    ['IO18', 18, 'gpio'], ['IO5', 5, 'strap'], ['IO17', 17, 'gpio'], ['IO16', 16, 'gpio'],
    ['IO4', 4, 'gpio'], ['IO0', 0, 'strap'], ['IO2', 2, 'strap'], ['IO15', 15, 'strap'],
    ['SD1', 8, 'flash'], ['SD0', 7, 'flash'], ['CLK', 6, 'flash']
  ];
  const extra = {
    36: ['ADC1_CH0', 'SENSOR_VP'], 39: ['ADC1_CH3', 'SENSOR_VN'], 34: ['ADC1_CH6'], 35: ['ADC1_CH7'],
    32: ['ADC1_CH4', 'TOUCH9'], 33: ['ADC1_CH5', 'TOUCH8'], 25: ['ADC2_CH8', 'DAC1'], 26: ['ADC2_CH9', 'DAC2'],
    27: ['ADC2_CH7', 'TOUCH7'], 14: ['ADC2_CH6', 'TOUCH6', 'HSPI CLK'], 12: ['ADC2_CH5', 'TOUCH5', 'HSPI MISO', 'MTDI strapping'],
    13: ['ADC2_CH4', 'TOUCH4', 'HSPI MOSI'], 23: ['VSPI MOSI'], 22: ['I2C SCL (default)'], 1: ['UART0 TX', 'USB serial'],
    3: ['UART0 RX', 'USB serial'], 21: ['I2C SDA (default)'], 19: ['VSPI MISO'], 18: ['VSPI SCK'], 5: ['VSPI CS', 'strapping'],
    17: ['UART2 TX'], 16: ['UART2 RX'], 4: ['ADC2_CH0', 'TOUCH0'], 0: ['ADC2_CH1', 'TOUCH1', 'BOOT button', 'strapping'],
    2: ['ADC2_CH2', 'TOUCH2', 'strapping'], 15: ['ADC2_CH3', 'TOUCH3', 'HSPI CS', 'MTDO strapping'],
    6: ['flash SCK'], 7: ['flash D0'], 8: ['flash D1'], 9: ['flash D2'], 10: ['flash D3'], 11: ['flash CMD']
  };
  const desc = {
    power: 'Regulated 3.3 V output from the on-board regulator. Everything on the ESP32 runs at 3.3 V, so its GPIO pins output 3.3 V when HIGH.',
    power5: '5 V comes straight from the USB cable. Never connect 5 V to a GPIO pin: the ESP32 is a 3.3 V chip and can be damaged.',
    ground: 'Ground (0 V) is the reference point and the return path for current. Every circuit must come back to GND. All GND pins are connected together.',
    control: 'EN (enable) is the reset line. Pulling it to GND resets the chip; the EN button does exactly that.',
    input: 'Input-only pin. It can read signals (it is an ADC1 analog input) but it cannot drive an LED, and it has no internal pull-up or pull-down resistor.',
    gpio: 'General Purpose Input/Output. Your program can set it HIGH (3.3 V) or LOW (0 V), or read it. A good choice for LEDs and buttons.',
    strap: 'Strapping pin: the ESP32 reads it at power-up to decide how to boot. It can be used as a GPIO, but what you connect must not hold it at the wrong level during boot.',
    flash: 'Connected to the SPI flash memory chip inside the module, where your program is stored. Never use it: the board will crash.',
    serial: 'Used by the USB serial connection (programming and the serial monitor). Avoid it for LEDs or you will interfere with uploads and print().'
  };
  const strapNote = {
    0: 'GPIO0 LOW at reset puts the chip into download (flash) mode. The BOOT button pulls it LOW.',
    2: 'GPIO2 must be LOW or floating at boot to allow flashing. An LED with a resistor to GND is fine, which is why many boards put an LED here.',
    5: 'GPIO5 sets SDIO timing at boot; it is pulled up internally. Usually safe for outputs.',
    12: 'GPIO12 (MTDI) selects the flash voltage at boot. If it is pulled HIGH at reset the module may fail to boot. Avoid it for beginners.',
    15: 'GPIO15 (MTDO) controls boot log messages. Pulled up internally; usually safe for outputs.'
  };
  const pins = [];
  const build = (arr, side) => arr.forEach((p, i) => {
    const [label, gpio, type] = p;
    const id = side + (i + 1);
    let note = desc[type];
    if (type === 'strap') note = desc.strap + ' ' + strapNote[gpio];
    const ledOK = (type === 'gpio') || (type === 'strap' && [2, 4, 5, 15].includes(gpio));
    pins.push({
      id, side, idx: i + 1, label, gpio, type,
      title: gpio !== null ? `GPIO${gpio}` : label,
      funcs: gpio !== null ? (extra[gpio] || []) : [],
      desc: note, ledOK
    });
  });
  build(L, 'L'); build(R, 'R');
  VL.PINS = pins;
  VL.pinById = Object.fromEntries(pins.map(p => [p.id, p]));
  VL.PIN_TYPES = {
    power: { name: '3.3 V power', color: '#ff4d6d' },
    power5: { name: '5 V power', color: '#ff8a3d' },
    ground: { name: 'Ground', color: '#9aa4b8' },
    gpio: { name: 'GPIO (safe)', color: '#22d3ee' },
    strap: { name: 'Strapping GPIO', color: '#facc15' },
    input: { name: 'Input only', color: '#a78bfa' },
    serial: { name: 'USB serial', color: '#34d399' },
    flash: { name: 'Flash: do not use', color: '#f43f5e' },
    control: { name: 'Reset / enable', color: '#fb923c' }
  };
  VL.VALID_GPIO = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39];
})();

/* ---------- Components ---------- */
// LED forward voltage at 10 mA (typical 5 mm through-hole parts)
VL.LED_TYPES = {
  red: { name: 'Red', vf: 2.0, color: '#ff2b2b', glow: '255,60,60' },
  yellow: { name: 'Yellow', vf: 2.1, color: '#ffd21f', glow: '255,215,40' },
  green: { name: 'Green', vf: 2.2, color: '#2bff6a', glow: '60,255,120' },
  blue: { name: 'Blue', vf: 3.0, color: '#3b82ff', glow: '80,140,255' },
  white: { name: 'White', vf: 3.0, color: '#f4f7ff', glow: '230,240,255' }
};
VL.RESISTOR_VALUES = [10, 47, 100, 150, 220, 330, 470, 1000, 2200, 4700, 10000];
VL.fmtOhm = r => r >= 1000 ? (r / 1000).toString().replace('.', ',').replace(',', '.') + ' kΩ' : r + ' Ω';
VL.WIRE_COLORS = ['#ef4444', '#111827', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#f8fafc', '#ec4899'];

/* ---------- Learning worlds ---------- */
VL.WORLDS = [
  {
    id: 'electronics', name: 'Electronics', tag: 'Components, circuits and prototyping', color: '#a855f7', color2: '#7c3aed', icon: 'electronics',
    lessons: ['Meet the breadboard', 'Resistors and the colour code', 'LEDs and diodes', 'Capacitors', 'Transistors as switches', 'Switches and buttons', 'Sensors', 'Motors and drivers'],
    live: [{ label: 'Component Explorer (3D LED & resistor)', go: '#explorer' }]
  },
  {
    id: 'electricity', name: 'Electricity', tag: 'Voltage, current, resistance and power', color: '#f59e0b', color2: '#ea580c', icon: 'electricity',
    lessons: ['Voltage, current, resistance', "Ohm's law", 'Power and heat', 'Series circuits', 'Parallel circuits', 'Using a multimeter', 'Polarity', 'Circuit safety'],
    live: [{ label: "Ohm's Law Playground", go: '#ohm' }]
  },
  {
    id: 'arduino', name: 'Arduino', tag: 'Learn, code and build real projects', color: '#3b82f6', color2: '#1d4ed8', icon: 'arduino',
    lessons: ['Meet the Arduino UNO', 'Arduino C++ basics', 'Digital outputs', 'Digital inputs', 'Analog inputs', 'PWM', 'Servo motors', 'Project: line follower'],
    live: []
  },
  {
    id: 'esp32', name: 'ESP32', tag: 'IoT, sensors, connectivity and smart systems', color: '#14b8a6', color2: '#0d9488', icon: 'esp32',
    lessons: ['Meet the ESP32 and build your first LED circuit', 'Digital inputs and buttons', 'Analog inputs and sensors', 'PWM and LED brightness', 'Mini project: smart LED', 'Wi-Fi basics', 'I2C and sensors', 'IoT dashboard', 'Robotics with ESP32'],
    live: [{ label: 'Lesson 1: Meet the ESP32', go: '#lesson' }]
  },
  {
    id: 'raspberrypi', name: 'Raspberry Pi', tag: 'Linux, Python, GPIO and AI projects', color: '#ec4899', color2: '#be185d', icon: 'rpi',
    lessons: ['Raspberry Pi vs Pico', 'Linux command line', 'Python on the Pi', 'GPIO with gpiozero', 'Pico and MicroPython', 'Camera and AI vision'],
    live: []
  }
];

/* ---------- Lesson 1 structure ---------- */
VL.LESSON1 = {
  id: 'esp32-1',
  world: 'esp32',
  title: 'Meet the ESP32 and Build Your First LED Circuit',
  minutes: 45,
  objectives: [
    'Identify the main parts and pins of the ESP32',
    'Explain the difference between GPIO, power and ground pins',
    'Choose a suitable resistor for an LED using Ohm\'s law',
    'Build an LED circuit on a breadboard',
    'Write and run a MicroPython blink program',
    'Measure voltage and current, and fix wiring and code bugs'
  ],
  steps: [
    { id: 'explore', name: 'Explore', icon: 'cube', desc: 'Explore the ESP32 in 3D and find its pins' },
    { id: 'theory', name: 'Understand', icon: 'bolt', desc: 'GPIO, power, ground and Ohm\'s law' },
    { id: 'build', name: 'Build', icon: 'board', desc: 'Wire the LED circuit on the breadboard' },
    { id: 'code', name: 'Code & Run', icon: 'code', desc: 'Write MicroPython and run the simulation' },
    { id: 'debug', name: 'Bug Hunt', icon: 'bug', desc: 'Find and fix three broken projects' },
    { id: 'quiz', name: 'Quiz', icon: 'quiz', desc: 'Check your understanding' },
    { id: 'results', name: 'Results', icon: 'medal', desc: 'Your badge and feedback' }
  ]
};

/* Pin hunt in the Explore step */
VL.PIN_HUNT = [
  { q: 'Find a GND pin, the return path for current.', ok: p => p.type === 'ground', why: 'GND is 0 V. All three GND pins are connected together.' },
  { q: 'Find the pin that gives a steady 3.3 V.', ok: p => p.type === 'power', why: '3V3 is the regulated supply. It is always on, so it cannot blink an LED.' },
  { q: 'Find GPIO 2.', ok: p => p.gpio === 2, why: 'GPIO 2 is labelled IO2. Many ESP32 boards connect a small LED to it.' },
  { q: 'Find a pin that is INPUT ONLY (it can never light an LED).', ok: p => p.type === 'input', why: 'GPIO 34, 35, 36 (VP) and 39 (VN) are input-only.' },
  { q: 'Find a pin you must NEVER use because it talks to the flash memory.', ok: p => p.type === 'flash', why: 'GPIO 6 to 11 (CLK, SD0 to SD3, CMD) are wired to the flash chip that stores your program.' }
];

/* ---------- Default code ---------- */
VL.STARTER_CODE = `# My first ESP32 program: blink an LED
from machine import Pin
from time import sleep

led = Pin(  , Pin.OUT)   # <- which GPIO did you wire the LED to?

while True:
    led.on()        # 3.3 V on the pin: the LED lights
    sleep(0.5)      # wait half a second
    led.off()       # 0 V on the pin: the LED goes dark
    sleep(0.5)
`;

VL.CODE_BLOCKS = [
  { label: 'import Pin', code: 'from machine import Pin' },
  { label: 'import sleep', code: 'from time import sleep' },
  { label: 'output pin', code: 'led = Pin(4, Pin.OUT)' },
  { label: 'forever loop', code: 'while True:' },
  { label: 'LED on', code: '    led.on()' },
  { label: 'LED off', code: '    led.off()' },
  { label: 'wait', code: '    sleep(0.5)' },
  { label: 'toggle', code: '    led.value(not led.value())' },
  { label: 'print', code: '    print("LED is on")' },
  { label: 'repeat 5×', code: 'for i in range(5):' }
];

/* ---------- Line explanations (offline "explain my code") ---------- */
VL.EXPLAIN_RULES = [
  [/^\s*from\s+machine\s+import\s+Pin/, 'Imports the Pin class from the machine module, which controls the ESP32 hardware.'],
  [/^\s*import\s+machine/, 'Imports the whole machine module (hardware control). You then write machine.Pin(...).'],
  [/^\s*from\s+time\s+import\s+sleep/, 'Imports sleep() so the program can pause.'],
  [/^\s*import\s+u?time/, 'Imports the time module (sleep, sleep_ms, ticks_ms).'],
  [/Pin\(\s*(\d+)\s*,\s*(machine\.)?Pin\.OUT/, m => `Configures GPIO ${m[1]} as an OUTPUT so the program can set it to 3.3 V (HIGH) or 0 V (LOW).`],
  [/Pin\(\s*(\d+)\s*,\s*(machine\.)?Pin\.IN/, m => `Configures GPIO ${m[1]} as an INPUT so the program can read whether it is HIGH or LOW.`],
  [/^\s*while\s+True\s*:/, 'Starts a loop that repeats forever. Everything indented below it runs again and again.'],
  [/^\s*for\s+(\w+)\s+in\s+range\((\d+)\)/, m => `Repeats the indented block ${m[2]} times (${m[1]} counts 0 to ${+m[2] - 1}).`],
  [/\.on\(\)/, 'Sets the pin HIGH (3.3 V). Current flows through the resistor and LED to GND, and the LED lights.'],
  [/\.off\(\)/, 'Sets the pin LOW (0 V). No voltage difference means no current, so the LED is off.'],
  [/\.value\(\s*not\s/, 'Reads the pin\'s current value and writes the opposite, which toggles the LED.'],
  [/\.value\(\s*1\s*\)/, 'Writes 1 (HIGH, 3.3 V) to the pin.'],
  [/\.value\(\s*0\s*\)/, 'Writes 0 (LOW, 0 V) to the pin.'],
  [/\.toggle\(\)/, 'Flips the pin: HIGH becomes LOW and LOW becomes HIGH.'],
  [/sleep_ms\(\s*([\d.]+)/, m => `Pauses for ${m[1]} milliseconds (${(+m[1] / 1000)} s).`],
  [/sleep\(\s*([\d.]+)/, m => `Pauses for ${m[1]} second(s). The LED keeps its current state while the program waits.`],
  [/^\s*print\(/, 'Sends text to the serial monitor, which is useful for checking what your program is doing.'],
  [/^\s*#/, 'A comment: Python ignores it. It is a note for humans.'],
  [/^\s*if\s/, 'Runs the indented block only when the condition is true.'],
  [/^\s*else\s*:/, 'Runs when the if condition was false.'],
  [/^\s*def\s+(\w+)/, m => `Defines a function called ${m[1]}, a reusable block of code.`],
  [/^\s*(\w+)\s*=\s*/, m => `Stores a value in the variable "${m[1]}".`]
];

/* ---------- Diagnostics: 3-level hints ---------- */
VL.HINTS = {
  NO_LED: ['What is the one component that will produce light in this project?', 'Drag an LED from the parts bin onto the breadboard. Each leg must sit in a different numbered column.', 'Drag an LED onto the breadboard horizontally so its two legs are in two neighbouring columns (for example columns 10 and 11). The longer leg (anode, +) is the one marked with a "+".'],
  NO_RES: ['What limits how much current flows through the LED?', 'Every LED needs a resistor in series. Without it, nothing stops the current from becoming dangerously large.', 'Add a 220 Ω resistor in series. With a 3.3 V GPIO and a red LED (~2.0 V): I = (3.3 − 2.0) / 220 ≈ 5.9 mA, which is safe for both the LED and the pin.'],
  LED_SHORTED: ['Look at the two LED legs. Which breadboard holes are electrically connected?', 'In each numbered column, holes a–e are connected to each other (and f–j too). If both legs are in the same column, the LED is short-circuited.', 'Move the LED so its legs are in two different columns, for example anode in column 10 and cathode in column 11. Current must go through the LED, not around it.'],
  RES_SHORTED: ['Both resistor legs are in holes that are connected together. Where does the current go?', 'A resistor with both legs on the same strip (or connected by a wire) is bypassed: no current flows through it.', 'Place the resistor across two different columns so that one leg shares a column with the LED and the other leg goes to the GPIO or GND column.'],
  LED_REVERSED: ['An LED is a diode: does current flow through it in both directions?', 'Current must enter the anode (+, long leg) and leave through the cathode (−, short leg, flat side). Check which side points toward the GPIO pin.', 'Your LED is backwards: its cathode faces the GPIO and its anode faces GND. Select the LED and press "Flip" (or the F key) so the anode (+) connects toward the GPIO pin.'],
  NO_GPIO: ['Where does the energy for your LED come from?', 'Your LED circuit is not connected to any ESP32 output pin. A jumper wire must go from a GPIO pin to the LED/resistor path.', 'Click a GPIO pin on the ESP32 header (for example IO4), then click a hole in the same column as the free end of your resistor or LED to make a wire.'],
  NO_GND: ['Current flows in a loop. Where does your current go after the LED?', 'The other end of your LED circuit must connect back to a GND pin on the ESP32, directly or through the blue (−) rail.', 'Make a wire from a GND pin (J2-14, J3-1 or J3-7) to a hole in the same column as the LED\'s cathode (−). Or wire GND to the − rail and connect the cathode column to the rail.'],
  OPEN_CIRCUIT: ['Trace the path with your finger from the GPIO pin to GND. Is there a gap?', 'Each part must share a column (strip) with the next part. A leg alone in a column is not connected to anything.', 'Check that the resistor and LED share one column, the GPIO wire lands in the resistor\'s other column, and the GND wire lands in the LED cathode\'s column. Use the multimeter: a broken path shows 0 mA.'],
  POWER_PIN: ['Your LED is on, but can your program switch it off?', '3V3 is always 3.3 V and your program cannot control it. The LED will never blink.', 'Move the wire from the 3V3 pin to a GPIO pin such as IO4, then use the same number in Pin(4, Pin.OUT).'],
  FIVE_V: ['How many volts does the 5V pin provide, and what voltage does the ESP32 work at?', 'The ESP32 is a 3.3 V chip. Connecting 5 V to a GPIO can permanently damage it.', 'Remove the wire from the 5V pin. For an LED, use a GPIO pin (3.3 V when HIGH) as the source.'],
  INPUT_ONLY: ['Is every ESP32 pin able to output a voltage?', 'GPIO 34, 35, 36 and 39 are input-only: they have no output driver.', 'Move your wire to an output-capable GPIO such as IO4, IO13 or IO23, and change the number in Pin(...).'],
  FLASH_PIN: ['What is connected to GPIO 6 to 11 inside the module?', 'Those pins talk to the flash memory chip that stores your program. Using them crashes the ESP32.', 'Move the wire to a safe GPIO such as IO4, IO18 or IO23.'],
  STRAP12: ['What happens at boot if GPIO 12 is held HIGH?', 'GPIO12 sets the flash voltage at power-up. Driving it can stop the board booting.', 'Choose a safer pin such as IO4 or IO13 for your LED.'],
  SHORT: ['Is there a path from a power pin directly to GND with nothing in between?', 'A wire or strip connects two different voltage sources directly. That is a short circuit: huge current, heat and damage.', 'Find the wire that joins power (3V3, 5V or an active GPIO) directly to GND, or to another driven pin, and delete it.'],
  OVERCURRENT: ['How big is the current through your LED compared with its safe limit (about 20 mA)?', 'The current is too high. The resistor is too small (or missing) for this LED.', 'Use a larger resistor. Aim for 3–10 mA: R = (3.3 V − Vf) / I. For a red LED, 220 Ω or 330 Ω is perfect.'],
  DIM: ['The LED barely glows. What sets the current?', 'Your resistor is very large, or the LED needs almost all of the 3.3 V (blue and white LEDs need about 3.0 V).', 'For a red LED, try 220 Ω. Blue and white LEDs will always be dim on 3.3 V because only ~0.3 V is left for the resistor.'],
  PIN_MISMATCH: ['Which GPIO number did you wire, and which number is in your code?', 'Your program drives one GPIO but your LED is wired to a different one.', 'Make the numbers match: if the wire goes to IO4, the code must say Pin(4, Pin.OUT).'],
  NO_PIN_CODE: ['How does the ESP32 know which pin is the LED?', 'Your code never creates an output pin. You need led = Pin(number, Pin.OUT).', 'Add: from machine import Pin, then led = Pin(4, Pin.OUT) (use your wired GPIO), then led.on() / led.off().'],
  NO_LOOP: ['How many times does your LED blink? How do you make it repeat?', 'Without a loop, the program runs once and then stops.', 'Put the on/off/sleep lines inside "while True:" and indent them by 4 spaces.'],
  TOO_FAST: ['How long does the LED stay on? Can your eyes see it?', 'Without a pause between on() and off(), the LED switches millions of times per second and looks permanently dim, or off.', 'Add sleep(0.5) after led.on() and after led.off(), so each state lasts half a second.'],
  NO_TOGGLE: ['Does your program ever turn the LED off again?', 'The pin is set once and never changes, so the LED cannot blink.', 'Inside the loop, alternate led.on(), sleep(0.5), led.off(), sleep(0.5).'],
  SYNTAX: ['Read the error line carefully. What does Python expect there?', 'A syntax error means Python cannot understand the shape of the code: missing ":", wrong indentation or a missing bracket.', 'Check the highlighted line: lines after "while True:" must be indented by 4 spaces, every "(" needs ")", and "while"/"for"/"if" lines end with ":".'],
  RUNTIME: ['The program started but stopped with an error. What does the message say?', 'Look at the error type (NameError, ValueError, TypeError…) and the line number.', 'NameError usually means a misspelt name or a missing import. ValueError on Pin() means the pin number is invalid for output.']
};

VL.DIAG_TEXT = {
  NO_LED: 'No LED on the breadboard yet.',
  NO_RES: 'The LED has no current-limiting resistor.',
  LED_SHORTED: 'The LED is short-circuited (both legs on the same strip).',
  RES_SHORTED: 'The resistor is bypassed (both legs on the same strip).',
  LED_REVERSED: 'The LED is connected backwards.',
  NO_GPIO: 'The LED circuit is not connected to an ESP32 output pin.',
  NO_GND: 'The LED circuit does not return to GND.',
  OPEN_CIRCUIT: 'There is a gap in the circuit path.',
  POWER_PIN: 'The LED is powered from 3V3: it cannot be switched by code.',
  FIVE_V: '5 V is connected into the circuit: dangerous for an ESP32 GPIO.',
  INPUT_ONLY: 'An input-only pin (GPIO 34–39) is used as an output.',
  FLASH_PIN: 'A flash-memory pin (GPIO 6–11) is used.',
  STRAP12: 'GPIO 12 is a risky strapping pin.',
  SHORT: 'Short circuit between power sources!',
  OVERCURRENT: 'Current is above the safe LED/pin limit.',
  DIM: 'The LED current is very small: it will be dim.',
  PIN_MISMATCH: 'Your code drives a different GPIO from the one you wired.',
  NO_PIN_CODE: 'Your code never configures an output pin.',
  NO_LOOP: 'Your program has no loop: it blinks once at most.',
  TOO_FAST: 'The LED switches too fast to see.',
  NO_TOGGLE: 'The LED never changes state.',
  SYNTAX: 'Python syntax error.',
  RUNTIME: 'Python runtime error.'
};

/* ---------- Bug hunts (troubleshooting) ---------- */
VL.BUGHUNTS = [
  {
    id: 'bug1', title: 'The silent LED',
    story: 'Yasmine built her circuit and the code runs, but the LED never lights. Find the bug!',
    circuit: { comps: [{ id: 'c1', type: 'resistor', value: 220, x: 8, y: 5, rot: 0 }, { id: 'c2', type: 'led', color: 'red', x: 12, y: 4, rot: 0, flip: true }], wires: [{ a: 'P:R13', b: 'H:8:3', color: '#22c55e' }, { a: 'P:R1', b: 'H:13:3', color: '#111827' }] },
    code: 'from machine import Pin\nfrom time import sleep\n\nled = Pin(4, Pin.OUT)\n\nwhile True:\n    led.on()\n    sleep(0.5)\n    led.off()\n    sleep(0.5)\n',
    expect: 'LED_REVERSED'
  },
  {
    id: 'bug2', title: 'Wrong number',
    story: 'Adam wired everything correctly, but his LED stays dark while the program runs. Compare the wiring and the code.',
    circuit: { comps: [{ id: 'c1', type: 'resistor', value: 220, x: 8, y: 5, rot: 0 }, { id: 'c2', type: 'led', color: 'green', x: 12, y: 4, rot: 0 }], wires: [{ a: 'P:R13', b: 'H:8:3', color: '#f59e0b' }, { a: 'P:R1', b: 'H:13:3', color: '#111827' }] },
    code: 'from machine import Pin\nfrom time import sleep\n\nled = Pin(2, Pin.OUT)\n\nwhile True:\n    led.on()\n    sleep(0.5)\n    led.off()\n    sleep(0.5)\n',
    expect: 'PIN_MISMATCH'
  },
  {
    id: 'bug3', title: 'Always on?',
    story: 'Lina says her LED "doesn\'t blink, it just glows a bit". Investigate the code with the timing diagram.',
    circuit: { comps: [{ id: 'c1', type: 'resistor', value: 330, x: 8, y: 5, rot: 0 }, { id: 'c2', type: 'led', color: 'yellow', x: 12, y: 4, rot: 0 }], wires: [{ a: 'P:R13', b: 'H:8:3', color: '#3b82f6' }, { a: 'P:R1', b: 'H:13:3', color: '#111827' }] },
    code: 'from machine import Pin\nfrom time import sleep\n\nled = Pin(4, Pin.OUT)\n\nwhile True:\n    led.on()\n    led.off()\n',
    expect: 'TOO_FAST'
  }
];

/* ---------- Teacher challenges (auto-checked) ---------- */
VL.CHALLENGES = [
  { id: 'slow', title: 'Slow blink', text: 'Make the LED blink slowly: ON for 1 second, OFF for 1 second.', level: 'Beginner' },
  { id: 'gpio4', title: 'Move to GPIO 4', text: 'Wire your LED to GPIO 4 (IO4) and make it blink.', level: 'Beginner' },
  { id: 'heartbeat', title: 'Heartbeat', text: 'Make a heartbeat: two quick flashes (≤ 0.2 s each), then a longer pause (≥ 0.8 s). Repeat.', level: 'Intermediate' },
  { id: 'sos', title: 'Morse SOS', text: 'Blink SOS in Morse code: 3 short, 3 long, 3 short flashes. A long flash lasts at least 3× a short one.', level: 'Intermediate' },
  { id: 'two', title: 'Police lights', text: 'Use TWO LEDs on two different GPIOs that blink alternately (never both on together).', level: 'Advanced' },
  { id: 'traffic', title: 'Traffic light', text: 'Build a traffic light with red, yellow and green LEDs on three GPIOs. Only one LED on at a time; cycle green → yellow → red.', level: 'Advanced' }
];

/* ---------- Quiz ---------- */
VL.QUIZ = [
  { type: 'mc', q: 'What voltage does an ESP32 GPIO pin output when it is set HIGH?', opts: ['5 V', '3.3 V', '12 V', '1.5 V'], a: 1, exp: 'The ESP32 is a 3.3 V microcontroller, so a HIGH output is 3.3 V. That is also why you must never connect 5 V to a GPIO.' },
  { type: 'tf', q: 'True or false: GPIO 34 can be used to switch an LED on and off.', a: false, exp: 'False. GPIO 34, 35, 36 and 39 are input-only: they have no output driver.' },
  { type: 'pin', q: 'Click any GND pin on the board.', ok: p => p.type === 'ground', exp: 'GND appears three times: J2 pin 14, and J3 pins 1 and 7. They are all connected together.' },
  { type: 'mc', q: 'Why do we put a resistor in series with an LED?', opts: ['To make the LED brighter', 'To limit the current so the LED and the pin are not damaged', 'To store energy', 'To change the LED colour'], a: 1, exp: 'An LED has almost no resistance once it conducts. The resistor sets the current: I = (V − Vf) / R.' },
  { type: 'calc', q: 'A red LED (Vf = 2.0 V) is driven by a 3.3 V GPIO through a 220 Ω resistor. What is the current, approximately?', opts: ['0.6 mA', '5.9 mA', '15 mA', '59 mA'], a: 1, exp: 'I = (3.3 − 2.0) / 220 = 1.3 / 220 ≈ 0.0059 A = 5.9 mA. That is safe and clearly visible.' },
  { type: 'mc', q: 'Which LED leg is the anode (+)?', opts: ['The shorter leg, next to the flat side', 'The longer leg', 'Either leg', 'The leg closest to the resistor'], a: 1, exp: 'The longer leg is the anode (+). The cathode (−) is shorter and sits by the flat edge of the LED body.' },
  { type: 'code', q: 'What does this program do?\n\nled = Pin(4, Pin.OUT)\nwhile True:\n    led.on()\n    sleep(1)\n    led.off()\n    sleep(1)', opts: ['Turns the LED on once', 'Blinks the LED on GPIO 4: 1 s on, 1 s off, forever', 'Blinks the LED 4 times', 'Nothing, because there is an error'], a: 1, exp: 'Pin(4, Pin.OUT) selects GPIO 4 as an output; the while True loop repeats on → wait 1 s → off → wait 1 s forever.' },
  { type: 'trouble', q: 'Your LED stays off. The multimeter shows 3.3 V on the GPIO but 0 mA through the LED, and the LED\'s long leg goes to GND. What is the most likely problem?', opts: ['The code is wrong', 'The LED is connected backwards', 'The resistor is too small', 'The ESP32 is broken'], a: 1, exp: 'The GPIO gives 3.3 V, so the code works. 0 mA with the long leg (anode) on GND means the diode is reverse-biased: flip the LED.' },
  { type: 'tf', q: 'True or false: all the holes in one numbered column (a–e) of a breadboard are connected together.', a: true, exp: 'True. Each column of five holes (a–e, and separately f–j) is one metal strip. That is how parts in the same column connect.' },
  { type: 'code', q: 'In this code, what is wrong?\n\nfrom machine import Pin\nled = Pin(2, Pin.OUT)\nwhile True:\nled.on()', opts: ['Pin 2 does not exist', 'led.on() is not indented inside the loop', 'Missing "import time"', 'Nothing is wrong'], a: 1, exp: 'Python uses indentation to know what is inside the loop. led.on() must be indented by 4 spaces under "while True:". Python raises an IndentationError.' }
];

VL.SKILLS = [
  { id: 'pins', name: 'Pin identification' },
  { id: 'ohm', name: "Ohm's law" },
  { id: 'wiring', name: 'Breadboard wiring' },
  { id: 'code', name: 'MicroPython' },
  { id: 'measure', name: 'Measurement' },
  { id: 'debug', name: 'Troubleshooting' }
];

/* ---------- Board registry (ESP32 + Arduino UNO for the breadboard lab) ---------- */
(function () {
  const esp = { id: 'esp32', name: VL.BOARD_NAME, vHigh: 3.3, lang: 'micropython', pins: VL.PINS, y0: 92, color: '#0b0e15' };
  VL.PINS.forEach(p => { p.row = p.idx - 1; });
  // Arduino UNO R3: left column = power + analog header, right column = digital header (board drawn with USB at the top)
  const L = [['IOREF', null, 'power', '5V'], ['RESET', null, 'control', 'EN'], ['3.3V', null, 'power3', '3V3'], ['5V', null, 'power', '5V'], ['GND', null, 'ground', 'GND'], ['GND', null, 'ground', 'GND'], ['VIN', null, 'vin', 'VIN'], null,
    ['A0', 14, 'analog'], ['A1', 15, 'analog'], ['A2', 16, 'analog'], ['A3', 17, 'analog'], ['A4', 18, 'analog'], ['A5', 19, 'analog']];
  const R = [['SCL', 19, 'i2c'], ['SDA', 18, 'i2c'], ['AREF', null, 'aref', 'AREF'], ['GND', null, 'ground', 'GND'], ['D13', 13, 'gpio'], ['D12', 12, 'gpio'], ['~D11', 11, 'gpio'], ['~D10', 10, 'gpio'], ['~D9', 9, 'gpio'], ['D8', 8, 'gpio'], null,
    ['D7', 7, 'gpio'], ['~D6', 6, 'gpio'], ['~D5', 5, 'gpio'], ['D4', 4, 'gpio'], ['~D3', 3, 'gpio'], ['D2', 2, 'gpio'], ['TX→D1', 1, 'serial'], ['RX←D0', 0, 'serial']];
  const D = {
    power: 'Power output. 5V comes from USB or the regulator; IOREF tells shields the logic voltage (5 V on the UNO).',
    power3: '3.3 V output from a small regulator (max ~50 mA). Useful for 3.3 V sensors.',
    ground: 'Ground (0 V): the return path for current. All GND pins are connected.',
    control: 'RESET: pulling it LOW restarts the sketch from setup().',
    vin: 'VIN: the raw input voltage from the DC jack (7–12 V). Not a 5 V output when powered by USB.',
    aref: 'AREF: optional reference voltage for analogRead(). Leave unconnected for the default 5 V reference.',
    gpio: 'Digital pin: OUTPUT gives 5 V (HIGH) or 0 V (LOW); INPUT reads HIGH/LOW. Pins marked ~ can also do PWM with analogWrite().',
    analog: 'Analog input: analogRead() gives 0–1023 for 0–5 V (10-bit ADC). Can also be used as a digital pin.',
    i2c: 'I2C pin (connected to A4 = SDA and A5 = SCL on the UNO R3).',
    serial: 'USB serial (Serial.print and uploads). Avoid using D0/D1 for LEDs or buttons.'
  };
  const pins = [];
  const build = (arr, side) => { let row = 0, idx = 0; arr.forEach(e => { if (!e) { row += 0.6; return; } idx++; const [label, gpio, type, net] = e; const pwm = /~/.test(label); pins.push({ id: side + idx, side, idx, row, label: label.replace('TX→', '').replace('RX←', ''), gpio, type, net: net || null, title: gpio !== null ? (gpio >= 14 ? 'A' + (gpio - 14) + ' (pin ' + gpio + ')' : 'D' + gpio) : label, funcs: [pwm ? 'PWM ~ (analogWrite)' : '', gpio === 13 ? 'on-board LED "L"' : '', gpio === 2 || gpio === 3 ? 'interrupt' : ''].filter(Boolean), desc: D[type], ledOK: (type === 'gpio' || type === 'analog') }); row++; }); };
  build(L, 'L'); build(R, 'R');
  const uno = { id: 'uno', name: 'Arduino UNO R3 (ATmega328P, 5 V)', vHigh: 5.0, lang: 'cpp', pins, y0: 72, color: '#0b4f8a' };
  VL.BOARDS = { esp32: esp, uno };
  VL.PIN_TYPES.analog = { name: 'Analog input', color: '#a3e635' };
  VL.PIN_TYPES.power3 = { name: '3.3 V power', color: '#fb7185' };
  VL.PIN_TYPES.vin = { name: 'VIN (raw input)', color: '#fdba74' };
  VL.PIN_TYPES.aref = { name: 'Analog reference', color: '#94a3b8' };
  VL.PIN_TYPES.i2c = { name: 'I2C', color: '#2dd4bf' };
  VL.setBoard = id => {
    const b = VL.BOARDS[id] || esp; VL.BOARD = b; VL.PINS = b.pins; VL.pinById = Object.fromEntries(b.pins.map(p => [p.id, p]));
  };
  VL.setBoard('esp32');
})();

VL.STARTER_CPP = `// My first Arduino sketch: blink an LED
const int ledPin = 13;      // <- which pin is your LED on?

void setup() {
  pinMode(ledPin, OUTPUT);  // the pin will give 5 V or 0 V
}

void loop() {
  digitalWrite(ledPin, HIGH);  // 5 V: LED on
  delay(500);                  // wait 500 ms
  digitalWrite(ledPin, LOW);   // 0 V: LED off
  delay(500);
}
`;
VL.CODE_BLOCKS_CPP = [
  { label: 'setup()', code: 'void setup() {\n  \n}' }, { label: 'loop()', code: 'void loop() {\n  \n}' },
  { label: 'pinMode OUT', code: '  pinMode(13, OUTPUT);' }, { label: 'pinMode PULLUP', code: '  pinMode(2, INPUT_PULLUP);' },
  { label: 'HIGH', code: '  digitalWrite(13, HIGH);' }, { label: 'LOW', code: '  digitalWrite(13, LOW);' },
  { label: 'delay', code: '  delay(500);' }, { label: 'read pin', code: '  int b = digitalRead(2);' },
  { label: 'analogRead', code: '  int v = analogRead(A0);' }, { label: 'analogWrite', code: '  analogWrite(9, 128);' },
  { label: 'Serial', code: '  Serial.println(v);' }, { label: 'if', code: '  if (b == LOW) {\n    \n  }' }
];
VL.EXPLAIN_RULES_CPP = [
  [/^\s*void\s+setup\s*\(/, 'setup() runs ONCE when the board powers up or resets. Configure your pins here.'],
  [/^\s*void\s+loop\s*\(/, 'loop() runs again and again forever, right after setup().'],
  [/pinMode\(\s*(\w+)\s*,\s*OUTPUT/, m => `Makes pin ${m[1]} an OUTPUT: the board can set it to 5 V (HIGH) or 0 V (LOW).`],
  [/pinMode\(\s*(\w+)\s*,\s*INPUT_PULLUP/, m => `Makes pin ${m[1]} an INPUT with the internal pull-up resistor: it reads HIGH until a button connects it to GND.`],
  [/pinMode\(\s*(\w+)\s*,\s*INPUT/, m => `Makes pin ${m[1]} an INPUT so digitalRead() can read it.`],
  [/digitalWrite\(\s*(\w+)\s*,\s*HIGH/, m => `Sets pin ${m[1]} HIGH (5 V).`],
  [/digitalWrite\(\s*(\w+)\s*,\s*LOW/, m => `Sets pin ${m[1]} LOW (0 V).`],
  [/digitalRead\(\s*(\w+)/, m => `Reads pin ${m[1]}: HIGH (1) or LOW (0).`],
  [/analogRead\(\s*(\w+)/, m => `Reads the voltage on ${m[1]} as a number from 0 (0 V) to 1023 (5 V).`],
  [/analogWrite\(\s*(\w+)\s*,\s*([^)]+)\)/, m => `Sends PWM to pin ${m[1]}: duty ${m[2]} out of 255 (0 = always off, 255 = always on).`],
  [/delay\(\s*(\w+)/, m => `Waits ${m[1]} milliseconds. Nothing else happens meanwhile.`],
  [/Serial\.begin/, 'Starts the serial connection to the computer (9600 bits per second).'],
  [/Serial\.print/, 'Sends text or a number to the Serial Monitor.'],
  [/^\s*#define/, 'Creates a named constant: the name is replaced by the value before compiling.'],
  [/^\s*const\s+int\s+(\w+)\s*=\s*(\w+)/, m => `A constant named ${m[1]} with the value ${m[2]}. Using names makes code easier to read and change.`],
  [/^\s*(int|long|float|bool|byte|unsigned)/, 'Declares a variable (a named box that stores a value).'],
  [/^\s*for\s*\(/, 'A for loop: repeats the block a set number of times.'],
  [/^\s*if\s*\(/, 'Runs the block only if the condition is true.'],
  [/^\s*else/, 'Runs when the if condition was false.'],
  [/^\s*\/\//, 'A comment: ignored by the compiler, written for humans.'],
  [/^\s*[{}]\s*$/, 'A brace opens or closes a block of code.']
];
/* ---------- extra line explanations (specific commands first) ---------- */
VL.EXPLAIN_RULES.unshift(
  [/^\s*import\s+network/, 'Imports the network module, which controls the Wi-Fi radio of the board.'],
  [/^\s*import\s+urequests|^\s*import\s+requests/, 'Imports urequests, a small library to send HTTP requests (GET/POST) to web servers.'],
  [/^\s*import\s+u?json/, 'Imports json, used to turn Python dictionaries into text and back.'],
  [/^\s*import\s+math/, 'Imports math (sqrt, sin, pi…).'],
  [/^\s*import\s+u?random|^\s*from\s+random/, 'Imports random, to generate random numbers.'],
  [/^\s*import\s+ssd1306|^\s*from\s+ssd1306/, 'Imports the driver for the SSD1306 OLED screen.'],
  [/^\s*from\s+machine\s+import\s+(.+)/, m => `Imports ${m[1].trim()} from the machine module, the classes that control the board's hardware.`],
  [/^\s*from\s+gpiozero\s+import\s+(.+)/, m => `Imports ${m[1].trim()} from gpiozero, the beginner-friendly Raspberry Pi GPIO library.`],
  [/^\s*import\s+RPi\.GPIO|^\s*from\s+RPi\s+import/, 'Imports RPi.GPIO, the classic low-level library for the Raspberry Pi pins.'],
  [/^\s*from\s+signal\s+import\s+pause/, 'Imports pause(), which keeps the program alive waiting for events (like button presses).'],
  [/network\.WLAN\(\s*network\.STA_IF/, 'Creates the Wi-Fi interface in station mode (the board joins an existing network, like a phone does).'],
  [/\.active\(\s*True/, 'Switches the Wi-Fi radio on.'],
  [/\.connect\(\s*["']([^"']+)["']/, m => `Asks to join the Wi-Fi network "${m[1]}" with the password. Connecting takes a moment.`],
  [/\.isconnected\(\)/, 'Checks whether the board is connected to Wi-Fi yet (True or False).'],
  [/\.ifconfig\(\)/, 'Returns the network settings; the first value is the board\'s IP address on the network.'],
  [/urequests\.post\(/, 'Sends an HTTP POST request: it uploads data (here as JSON) to a web server, like submitting a form.'],
  [/urequests\.get\(/, 'Sends an HTTP GET request to download data from a web server.'],
  [/\.status_code/, 'The HTTP status code returned by the server: 200 means OK.'],
  [/\.close\(\)/, 'Closes the connection and frees its memory (important on small boards).'],
  [/json\.dumps\(/, 'Turns a Python dictionary into JSON text that can be sent or printed.'],
  [/json\.loads\(/, 'Turns JSON text back into a Python dictionary.'],
  [/I2C\(\s*\d*\s*,?\s*(?:scl|sda)=/, 'Creates the I2C bus on the SDA (data) and SCL (clock) pins. Many sensors can share these two wires.'],
  [/\.scan\(\)/, 'Asks every device on the I2C bus to answer and returns their addresses (e.g. 0x48 = 72).'],
  [/\.readfrom_mem\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)/, m => `Reads ${m[3]} byte(s) from register ${m[2]} of the I2C device at address ${m[1]}.`],
  [/\.writeto\(/, 'Sends bytes to an I2C device.'],
  [/<<\s*\d+.*>>\s*\d+|>>\s*\d+.*<</, 'Joins the two bytes from the sensor into one number using bit shifts, then scales it to °C.'],
  [/PWM\(\s*Pin\(\s*(\d+)\s*\)\s*(?:,\s*freq\s*=\s*(\d+))?/, m => `Starts PWM on GPIO ${m[1]}: the pin switches on and off very fast${m[2] ? ` (${m[2]} times per second)` : ''} to fake an in-between voltage.`],
  [/\.freq\(\s*(\d+)/, m => `Sets the PWM frequency to ${m[1]} Hz (on/off cycles per second).`],
  [/\.duty_u16\(\s*([^)]+)\)/, m => `Sets the PWM duty cycle to ${m[1]} out of 65535 (0 = always off, 65535 = always on).`],
  [/\.duty\(\s*([^)]+)\)/, m => `Sets the PWM duty cycle to ${m[1]} out of 1023.`],
  [/ADC\(\s*4\s*\)/, 'ADC channel 4 of the Pico is its internal temperature sensor (inside the RP2040 chip).'],
  [/ADC\(\s*Pin\(\s*(\d+)/, m => `Creates an analog input (ADC) on GPIO ${m[1]} to measure a voltage.`],
  [/\.atten\(\s*ADC\.ATTN_11DB/, 'Sets the input range to about 0–3.3 V (11 dB attenuation).'],
  [/\.read_u16\(\)/, 'Reads the analog voltage as a number from 0 to 65535.'],
  [/\.read\(\)/, 'Reads the sensor now and returns its value.'],
  [/\.irq\(/, 'Attaches an interrupt: the handler function runs automatically the moment the pin changes, even in the middle of other code.'],
  [/Pin\.PULL_UP/, 'Turns on the internal pull-up resistor, so the input reads 1 until the button connects it to GND.'],
  [/Timer\(/, 'Creates a hardware timer that can call a function regularly without blocking the program.'],
  [/\.init\(\s*period\s*=\s*(\d+)/, m => `Starts the timer: the callback runs every ${m[1]} ms.`],
  [/TouchPad\(\s*Pin\(\s*(\d+)/, m => `Uses GPIO ${m[1]} as a capacitive touch sensor (it senses a finger).`],
  [/deepsleep\(\s*(\d*)/, m => `Puts the ESP32 in deep sleep${m[1] ? ` for ${m[1]} ms` : ''} to save battery; it restarts from the beginning when it wakes.`],
  [/time_pulse_us\(/, 'Measures how long the ECHO pin stays HIGH, in microseconds (the time the sound took to come back).'],
  [/0\.0343|0\.034\b|\/\s*58/, 'Converts the echo time to centimetres: sound travels 0.0343 cm per µs, and the sound goes there and back (÷2).'],
  [/SSD1306_I2C\(/, 'Creates the OLED screen object: 128 × 64 pixels, connected on I2C.'],
  [/\.fill\(\s*0/, 'Clears the screen buffer (all pixels off).'],
  [/\.text\(/, 'Draws text in the screen buffer at (x, y).'],
  [/\.show\(\)/, 'Sends the buffer to the screen: nothing appears until show() is called.'],
  [/ticks_ms\(\)/, 'Reads a millisecond counter: useful to measure time without stopping the program.'],
  [/ticks_diff\(/, 'Computes how many milliseconds passed between two ticks_ms() readings.'],
  [/LED\(\s*(\d+)\s*\)/, m => `gpiozero: an LED connected to GPIO ${m[1]}.`],
  [/PWMLED\(\s*(\d+)/, m => `gpiozero: an LED on GPIO ${m[1]} whose brightness can change (PWM).`],
  [/Button\(\s*(\d+)/, m => `gpiozero: a button on GPIO ${m[1]} (pull-up enabled, pressed = connected to GND).`],
  [/\.when_pressed\s*=/, 'Tells gpiozero which function to call automatically when the button is pressed.'],
  [/\.when_released\s*=/, 'Function called automatically when the button is released.'],
  [/\.blink\(/, 'Makes the LED blink by itself in the background.'],
  [/\.pulse\(/, 'Makes the LED fade in and out smoothly (breathing).'],
  [/\.is_pressed/, 'True while the button is held down.'],
  [/pause\(\)/, 'Waits forever so the program keeps reacting to events.'],
  [/\.angle\s*=|\.write\(\s*\w+\s*\)/, 'Turns the servo to the given angle.'],
  [/^\s*except/, 'Runs if an error happened inside the try block, so the program does not crash.'],
  [/^\s*try\s*:/, 'Tries the indented code; if it fails, the except block handles the error.'],
  [/^\s*elif\s/, 'Checks another condition when the previous ones were false.'],
  [/^\s*return\b/, 'Sends a value back to the code that called the function.'],
  [/^\s*break\b/, 'Leaves the loop immediately.'],
  [/^\s*global\s/, 'Lets the function change a variable defined outside it.'],
  [/input\(/, 'Asks the user to type something and waits for Enter. The answer is always text (a string).'],
  [/int\(\s*input/, 'Asks a question and converts the typed answer into a whole number.'],
  [/^\s*while\s+(?!True)(.+):/, m => `Repeats the indented block as long as ${m[1].trim()} is true.`],
  [/^\s*for\s+(\w+)\s+in\s+range\(([^)]*)\)/, m => `Repeats the indented block, with ${m[1]} taking each value of range(${m[2]}).`],
  [/^\s*for\s+(\w+)\s+in\s+(.+):/, m => `Repeats the indented block once for each item of ${m[2].trim()}, calling it ${m[1]}.`],
  [/\.value\(\)/, 'Reads the pin: 1 (HIGH) or 0 (LOW).'],
  [/\.append\(/, 'Adds an item at the end of the list.'],
  [/f["']/, 'An f-string: values in {braces} are inserted into the text.']
);
// friendlier generic sleep text
VL.EXPLAIN_RULES = VL.EXPLAIN_RULES.map(r => String(r[0]) === String(/sleep\(\s*([\d.]+)/) ? [r[0], m => `Pauses for ${m[1]} second(s). Outputs keep their current state while the program waits.`] : r);
VL.EXPLAIN_RULES_CPP.unshift(
  [/^\s*#include\s*<Servo\.h>/, 'Includes the Servo library, which generates the control pulses for servo motors.'],
  [/^\s*#include/, 'Includes a library: ready-made code you can use in your sketch.'],
  [/^\s*Servo\s+(\w+)/, m => `Creates a servo object called ${m[1]}.`],
  [/\.attach\(\s*(\w+)/, m => `Connects the servo object to pin ${m[1]}.`],
  [/\.write\(\s*([^)]+)\)/, m => `Turns the servo to ${m[1]}°.`],
  [/Serial\.begin\(\s*(\d+)/, m => `Starts the serial connection at ${m[1]} bits per second. The Serial Monitor must use the same speed.`],
  [/Serial\.println\(/, 'Prints the value to the Serial Monitor, then starts a new line.'],
  [/Serial\.print\(/, 'Prints the value to the Serial Monitor (same line).'],
  [/millis\(\)/, 'millis() returns how many milliseconds passed since the board started: lets you time things without delay().'],
  [/pulseIn\(\s*(\w+)/, m => `Measures how long pin ${m[1]} stays HIGH, in microseconds (used for the ultrasonic echo).`],
  [/map\(\s*([^,]+),/, m => `Converts ${m[1].trim()} from one range to another (e.g. 0–1023 → 0–255).`],
  [/constrain\(/, 'Keeps a value between a minimum and a maximum.'],
  [/tone\(\s*(\w+)\s*,\s*(\w+)/, m => `Plays a ${m[2]} Hz square wave on pin ${m[1]}: a buzzer makes it a sound.`],
  [/noTone\(/, 'Stops the sound.'],
  [/digitalWrite\(\s*(\w+)\s*,\s*!\s*digitalRead/, m => `Writes the opposite of what pin ${m[1]} currently is: toggles it.`],
  [/^\s*for\s*\(\s*int\s+(\w+)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)/, m => `A for loop: ${m[1]} starts at ${m[2].trim()}, the loop runs while ${m[3].trim()}, and ${m[4].trim()} after each round.${/analogWrite/.test(m.input) ? ' Inside: analogWrite sets the PWM duty to ' + m[1] + '.' : ''}${/delay\((\w+)/.test(m.input) ? ' delay waits a little each step.' : ''}`],
  [/^\s*while\s*\(/, 'A while loop: repeats the block as long as the condition is true.'],
  [/^\s*switch\s*\(/, 'Chooses which case block to run depending on the value.'],
  [/^\s*case\s/, 'One possible value for the switch.'],
  [/^\s*return\b/, 'Sends a value back from the function.'],
  [/^\s*(?:void|int|float|long|bool)\s+(?!setup\b|loop\b)(\w+)\s*\([^)]*\)\s*\{/, m => `Defines a function called ${m[1]}: a reusable block of code.`]
);
