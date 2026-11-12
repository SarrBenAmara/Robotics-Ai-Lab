/* =========================================================================
   python.js : front door to the built-in Python engine
   Student code is parsed and executed by the lab's own interpreter
   (pyinterp.js) against virtual boards (pyruntime.js) with a virtual clock.
   ========================================================================= */
(function () {
  /* Code runs on the built-in engine (pyinterp.js + pyruntime.js): no download,
     no WebAssembly, works on every school computer and offline. */
  const Py = { status: 'ready', msg: 'Built-in engine ready', listeners: [] };
  Py.onStatus = f => { Py.listeners.push(f); f('ready', Py.msg); };
  Py.load = () => Promise.resolve(true);
  Py.run = async (code, limitMs = 10000, cfg = {}) => VL.PyRun.run(code, limitMs, cfg);
  Py.runPlain = async (code, inputs = []) => VL.PyRun.run(code, 10000, { board: 'rpi' }, { inputs });
  Py.staticPins = code => {
    const pins = [];
    const noComments = code.split('\n').map(l => l.replace(/#.*/, '').replace(/\/\/.*/, '')).join('\n');
    const res = [/Pin\(\s*(\d+)\s*,\s*(?:machine\.)?Pin\.(?:OUT|OPEN_DRAIN)/g, /PWM\(\s*(?:machine\.)?Pin\(\s*(\d+)/g, /pinMode\(\s*(\d+)\s*,\s*OUTPUT/g, /analogWrite\(\s*(\d+)/g];
    res.forEach(re => { let m; while ((m = re.exec(noComments))) pins.push(+m[1]); });
    // Arduino: const int ledPin = 13; pinMode(ledPin, OUTPUT)
    const consts = {}; let m; const cre = /(?:const\s+)?(?:int|byte|uint8_t)\s+(\w+)\s*=\s*(\d+)\s*;|#define\s+(\w+)\s+(\d+)/g;
    while ((m = cre.exec(noComments))) consts[m[1] || m[3]] = +(m[2] || m[4]);
    const pre = /pinMode\(\s*(\w+)\s*,\s*OUTPUT|analogWrite\(\s*(\w+)/g; while ((m = pre.exec(noComments))) { const n = m[1] || m[2]; if (consts[n] !== undefined) pins.push(consts[n]); if (n === 'LED_BUILTIN') pins.push(13); }
    return [...new Set(pins)];
  };

  Py.explainError = err => {
    if (!err) return '';
    const m = err.msg || '';
    if (err.type === 'TranslateError') return m;
    if (err.type === 'IndentationError' || /indent/i.test(m)) return 'Indentation problem: in Python, the lines inside a loop (after "while True:") must be indented by the same number of spaces, usually 4.';
    if (err.type === 'SyntaxError' && /expected ':'/.test(m)) return 'Python expected a colon ":" at the end of this line (after while, for, if, def…).';
    if (err.type === 'SyntaxError' && /never closed|unmatched|was not closed/.test(m)) return 'A bracket is not closed: every "(" needs a matching ")".';
    if (err.type === 'SyntaxError' && /invalid syntax/.test(m)) return 'This line could not be understood. Check for missing numbers, commas, brackets or semicolons.';
    if (err.type === 'NameError') { const n = (m.match(/'(\w+)'/) || [])[1]; return `The name "${n}" is unknown. Check the spelling (names are case-sensitive) and that it was imported, declared or created earlier.`; }
    if (err.type === 'ValueError' && /only be input/.test(m)) return 'This GPIO is input-only and cannot drive an LED. Choose an output pin such as 4, 13 or 23.';
    if (err.type === 'ValueError' && /invalid pin/.test(m)) return 'That pin number is not usable on this board. ' + m.replace('invalid pin: ', '');
    if (err.type === 'AttributeError') return 'You called something that does not exist on this object. Check the spelling and capital letters.';
    if (err.type === 'TypeError') return 'A function received the wrong kind or number of values. ' + m;
    if (err.type === 'ModuleNotFoundError' || err.type === 'ImportError') return 'That module is not available on this virtual board.';
    if (err.type === 'OSError') return m;
    if (err.type === 'NotImplementedError') return m;
    if (err.type === 'RuntimeError') return m;
    if (err.type === 'ZeroDivisionError') return 'Division by zero: check the values you divide by.';
    return m;
  };
  VL.Py = Py;
})();
