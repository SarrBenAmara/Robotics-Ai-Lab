/* =========================================================================
   editor.js : lightweight Python code editor (syntax highlighting,
   line numbers, auto-indent, autocomplete, error-line marking).
   Built in-house so it loads instantly on school computers.
   ========================================================================= */
(function () {
  const KW = new Set(['False', 'None', 'True', 'and', 'as', 'break', 'class', 'continue', 'def', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'not', 'or', 'pass', 'return', 'try', 'while', 'with', 'yield']);
  const BI = new Set(['print', 'range', 'len', 'int', 'float', 'str', 'abs', 'min', 'max', 'round', 'Pin', 'sleep', 'sleep_ms', 'sleep_us', 'machine', 'time', 'utime', 'ticks_ms', 'ticks_diff']);
  const SUGG = ['from machine import Pin', 'from time import sleep', 'import machine', 'import time', 'Pin.OUT', 'Pin.IN', 'Pin.PULL_UP', 'while True:', 'sleep(0.5)', 'sleep_ms(500)', 'print()', 'range()', 'value()', 'on()', 'off()', 'toggle()', 'for i in range(5):', 'if', 'else:', 'def'];
  const KWC = new Set(['void', 'int', 'long', 'float', 'double', 'bool', 'boolean', 'byte', 'char', 'const', 'unsigned', 'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'true', 'false', 'static', 'String', 'struct', 'class']);
  const BIC = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'millis', 'micros', 'Serial', 'map', 'constrain', 'random', 'pulseIn', 'Servo', 'setup', 'loop']);
  const SUGGC = ['pinMode()', 'digitalWrite()', 'digitalRead()', 'analogRead()', 'analogWrite()', 'delay()', 'millis()', 'Serial.begin(9600);', 'Serial.println()', 'Serial.print()', 'OUTPUT', 'INPUT', 'INPUT_PULLUP', 'HIGH', 'LOW', 'void setup() {', 'void loop() {', 'for (int i = 0; i < 10; i++) {', 'if () {', 'else {', 'const int', 'map()', 'constrain()'];
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function highlight(line, lang) {
    let out = '', i = 0;
    const cpp = lang === 'cpp'; const K = cpp ? KWC : KW, B = cpp ? BIC : BI;
    const re = cpp ? /(\/\/.*$|^\s*#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d"'\/#]+|\/)/g : /(#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d"'#]+)/g; let m;
    while ((m = re.exec(line))) {
      if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="t-str">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="t-num">${m[3]}</span>`;
      else if (m[4]) {
        const w = m[4], next = line.slice(re.lastIndex).match(/^\s*\(/);
        if (K.has(w)) out += `<span class="t-kw">${w}</span>`;
        else if (B.has(w)) out += `<span class="t-bi">${w}</span>`;
        else if (/^[A-Z_]+$/.test(w) && w.length > 1) out += `<span class="t-const">${w}</span>`;
        else if (next) out += `<span class="t-fn">${w}</span>`;
        else out += esc(w);
      } else out += esc(m[0]);
      if (re.lastIndex === i) break; i = re.lastIndex;
    }
    return out;
  }
  class Editor {
    constructor(host, opts = {}) {
      this.host = host; this.opts = opts;
      host.classList.add('ed');
      host.innerHTML = `<div class="ed-gutter"></div><div class="ed-main"><pre class="ed-hl" aria-hidden="true"></pre><textarea class="ed-ta" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code editor"></textarea><div class="ed-ac" hidden></div></div>`;
      this.g = host.querySelector('.ed-gutter'); this.hl = host.querySelector('.ed-hl'); this.ta = host.querySelector('.ed-ta'); this.ac = host.querySelector('.ed-ac');
      this.errLine = 0; this.markLine = 0;
      this.ta.addEventListener('input', () => { this.render(); this.autocomplete(); opts.onChange && opts.onChange(this.value); });
      this.ta.addEventListener('scroll', () => { this.hl.scrollTop = this.ta.scrollTop; this.hl.scrollLeft = this.ta.scrollLeft; this.g.scrollTop = this.ta.scrollTop; });
      this.ta.addEventListener('keydown', e => this.key(e));
      this.ta.addEventListener('blur', () => setTimeout(() => this.ac.hidden = true, 150));
      this.ta.addEventListener('click', () => { this.ac.hidden = true; opts.onCursor && opts.onCursor(this.cursorLine()); });
      this.ta.addEventListener('keyup', e => { if (/Arrow|Home|End|Page/.test(e.key)) opts.onCursor && opts.onCursor(this.cursorLine()); });
    }
    get value() { return this.ta.value; }
    set value(v) { this.ta.value = v; this.errLine = 0; this.render(); }
    cursorLine() { return this.ta.value.slice(0, this.ta.selectionStart).split('\n').length; }
    setError(line) { this.errLine = line || 0; this.render(); }
    setMark(line) { this.markLine = line || 0; this.render(); }
    render() {
      const lines = this.ta.value.split('\n');
      this.hl.innerHTML = lines.map((l, i) => `<div class="ed-line${i + 1 === this.errLine ? ' err' : ''}${i + 1 === this.markLine ? ' mark' : ''}">${highlight(l, this.opts.lang) || ' '}</div>`).join('');
      this.g.innerHTML = lines.map((_, i) => `<div class="${i + 1 === this.errLine ? 'err' : ''}">${i + 1}</div>`).join('');
    }
    insertText(t) {
      const ta = this.ta; ta.focus();
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.setRangeText(t, s, e, 'end');
      this.render(); this.opts.onChange && this.opts.onChange(this.value);
    }
    insertLine(code) {
      const ta = this.ta; const v = ta.value; let pos = ta.selectionStart;
      // insert at end of current line as a new line
      let eol = v.indexOf('\n', pos); if (eol === -1) eol = v.length;
      const lineStart = v.lastIndexOf('\n', pos - 1) + 1; const cur = v.slice(lineStart, eol);
      let txt = code;
      if (cur.trim() === '') { ta.setSelectionRange(lineStart, eol); ta.setRangeText(txt, lineStart, eol, 'end'); }
      else { ta.setSelectionRange(eol, eol); ta.setRangeText('\n' + txt, eol, eol, 'end'); }
      ta.focus(); this.render(); this.opts.onChange && this.opts.onChange(this.value);
    }
    key(e) {
      const ta = this.ta;
      if (!this.ac.hidden) {
        const items = [...this.ac.querySelectorAll('button')]; let i = items.findIndex(b => b.classList.contains('on'));
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[i] && items[i].classList.remove('on'); i = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[i].classList.add('on'); return; }
        if (e.key === 'Enter' || e.key === 'Tab') { if (items[i]) { e.preventDefault(); items[i].click(); return; } }
        if (e.key === 'Escape') { this.ac.hidden = true; return; }
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) { this.dedent(); return; }
        this.insertText(this.opts.lang === 'cpp' ? '  ' : '    '); return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = ta.value, s = ta.selectionStart; const ls = v.lastIndexOf('\n', s - 1) + 1; const line = v.slice(ls, s);
        let ind = (line.match(/^\s*/) || [''])[0];
        if (this.opts.lang === 'cpp' ? /\{\s*(\/\/.*)?$/.test(line) : /:\s*(#.*)?$/.test(line)) ind += this.opts.lang === 'cpp' ? '  ' : '    ';
        this.insertText('\n' + ind); return;
      }
      if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
        const v = ta.value, s = ta.selectionStart; const ls = v.lastIndexOf('\n', s - 1) + 1; const before = v.slice(ls, s);
        if (before.length && /^ +$/.test(before) && before.length % 4 === 0) { e.preventDefault(); ta.setRangeText('', s - 4, s, 'end'); this.render(); this.opts.onChange && this.opts.onChange(this.value); }
      }
    }
    dedent() {
      const ta = this.ta, v = ta.value, s = ta.selectionStart; const ls = v.lastIndexOf('\n', s - 1) + 1;
      const m = v.slice(ls).match(/^ {1,4}/); if (m) { ta.setRangeText('', ls, ls + m[0].length, 'end'); this.render(); }
    }
    autocomplete() {
      const ta = this.ta, v = ta.value, s = ta.selectionStart; const ls = v.lastIndexOf('\n', s - 1) + 1; const before = v.slice(ls, s);
      const m = before.match(/([A-Za-z_][\w.]*)$/);
      if (!m || m[1].length < 2) { this.ac.hidden = true; return; }
      const word = m[1]; const short = word.split('.').pop();
      const list = (this.opts.lang === 'cpp' ? SUGGC : SUGG).filter(x => (x.toLowerCase().startsWith(word.toLowerCase()) || (word.includes('.') && x.toLowerCase().startsWith(short.toLowerCase()))) && x !== word).slice(0, 6);
      if (!list.length) { this.ac.hidden = true; return; }
      const line = before.split('\n').length; const row = v.slice(0, s).split('\n').length - 1;
      const cw = this.charW || (this.charW = this.measure());
      this.ac.style.top = (row * 21 + 30 - ta.scrollTop) + 'px'; this.ac.style.left = Math.min(before.length * cw + 12, 260) + 'px';
      this.ac.innerHTML = list.map((x, i) => `<button type="button" class="${i ? '' : 'on'}">${esc(x)}</button>`).join('');
      this.ac.hidden = false;
      [...this.ac.querySelectorAll('button')].forEach((b, i) => b.onmousedown = ev => {
        ev.preventDefault(); const rep = list[i];
        const start = word.includes('.') && !rep.toLowerCase().startsWith(word.toLowerCase()) ? s - short.length : s - word.length;
        ta.setRangeText(rep, start, s, 'end'); this.ac.hidden = true; this.render(); this.opts.onChange && this.opts.onChange(this.value); ta.focus();
      });
    }
    measure() { const sp = document.createElement('span'); sp.textContent = 'MMMMMMMMMM'; sp.style.font = getComputedStyle(this.ta).font; sp.style.position = 'absolute'; sp.style.visibility = 'hidden'; document.body.appendChild(sp); const w = sp.getBoundingClientRect().width / 10; sp.remove(); return w || 8.4; }
  }
  VL.Editor = Editor;
  VL.highlightPy = highlight;
})();
