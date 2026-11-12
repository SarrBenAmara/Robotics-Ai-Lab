/* =========================================================================
   arduino.js : translates an Arduino C++ sketch (beginner subset) into
   Python so it can run on the virtual Arduino UNO (python.js).
   Supported: global/local variables, const, #define, arrays, functions,
   if/else, for, while, do-while, switch, break/continue/return,
   pinMode, digitalWrite/Read, analogRead/Write, delay(Microseconds),
   millis/micros, Serial.begin/print/println, map, constrain, random,
   pulseIn, Servo (attach/write/read).
   Unsupported constructs produce a clear "TranslateError" for the student.
   ========================================================================= */
(function () {
  const TYPES = new Set(['void', 'int', 'long', 'short', 'float', 'double', 'bool', 'boolean', 'byte', 'char', 'String', 'word', 'size_t', 'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t', 'unsigned', 'signed', 'const', 'static', 'volatile', 'Servo']);
  const PYKW = new Set(['and', 'as', 'assert', 'async', 'await', 'class', 'def', 'del', 'elif', 'except', 'finally', 'from', 'global', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'try', 'with', 'yield', 'None', 'True', 'False']);
  class TErr extends Error { constructor(msg, line) { super(msg); this.line = line; } }

  function tokenize(src) {
    // strip comments, keep newlines
    src = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');
    const toks = []; let i = 0, line = 1;
    const ops = ['<<=', '>>=', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '->', '::'];
    while (i < src.length) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === '#') { let j = src.indexOf('\n', i); if (j < 0) j = src.length; toks.push({ t: 'pp', v: src.slice(i, j).trim(), line }); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /\w/.test(src[j])) j++; toks.push({ t: 'id', v: src.slice(i, j), line }); i = j; continue; }
      if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1]))) { let j = i; if (src.slice(i, i + 2).toLowerCase() === '0x') { j += 2; while (/[0-9a-fA-F]/.test(src[j])) j++; } else if (src.slice(i, i + 2).toLowerCase() === '0b') { j += 2; while (/[01]/.test(src[j])) j++; } else { while (/[\d.]/.test(src[j])) j++; if (/[eE]/.test(src[j])) { j++; if (/[+-]/.test(src[j])) j++; while (/\d/.test(src[j])) j++; } } let v = src.slice(i, j); while (/[uUlLfF]/.test(src[j])) j++; toks.push({ t: 'num', v, line }); i = j; continue; }
      if (c === '"') { let j = i + 1; while (j < src.length && src[j] !== '"') { if (src[j] === '\\') j++; if (src[j] === '\n') throw new TErr('A text string is missing its closing quote "', line); j++; } toks.push({ t: 'str', v: src.slice(i, j + 1), line }); i = j + 1; continue; }
      if (c === "'") { let j = i + 1; while (j < src.length && src[j] !== "'") { if (src[j] === '\\') j++; j++; } toks.push({ t: 'chr', v: src.slice(i, j + 1), line }); i = j + 1; continue; }
      const op = ops.find(o => src.startsWith(o, i));
      if (op) { toks.push({ t: 'op', v: op, line }); i += op.length; continue; }
      toks.push({ t: 'op', v: c, line }); i++;
    }
    toks.push({ t: 'eof', v: '', line });
    return toks;
  }

  function translate(src) {
    const toks = tokenize(src); let p = 0;
    const out = []; // {ind, s, line}
    const globals = new Set(); const funcs = new Set(); const defines = [];
    const peek = (k = 0) => toks[p + k]; const next = () => toks[p++];
    const is = (v, k = 0) => toks[p + k] && toks[p + k].v === v && toks[p + k].t !== 'str';
    const expect = v => { const t = next(); if (t.v !== v) throw new TErr(`Expected "${v}" but found "${t.v || 'end of file'}"` + (v === ';' ? ' (did you forget a semicolon at the end of the previous line?)' : ''), v === ';' ? (toks[p - 2] || t).line : t.line); return t; };
    const emit = (ind, s, line) => out.push({ ind, s, line });
    const isTypeStart = (k = 0) => { const t = peek(k); return t.t === 'id' && TYPES.has(t.v); };
    const nm = v => PYKW.has(v) ? v + '_' : v;

    // ---------- expressions ----------
    function readUntil(stops, depth0 = 0) {
      // collect tokens until one of stops at depth 0
      const res = []; let d = 0;
      while (true) {
        const t = peek(); if (t.t === 'eof') throw new TErr('Unexpected end of the sketch: is a bracket or brace missing?', t.line);
        if (d === 0 && t.t === 'op' && stops.includes(t.v)) break;
        if (t.v === '(' || t.v === '[' || t.v === '{') d++;
        if (t.v === ')' || t.v === ']' || t.v === '}') { if (d === 0) break; d--; }
        res.push(next());
      }
      return res;
    }
    function expr(ts) {
      if (!ts.length) return '';
      // ternary at top level
      let d = 0, q = -1, col = -1;
      ts.forEach((t, i) => { if (t.v === '(' || t.v === '[') d++; else if (t.v === ')' || t.v === ']') d--; else if (d === 0 && t.v === '?' && q < 0) q = i; else if (d === 0 && t.v === ':' && q >= 0 && col < 0) col = i; });
      if (q >= 0 && col > q) return `(${expr(ts.slice(q + 1, col))} if ${expr(ts.slice(0, q))} else ${expr(ts.slice(col + 1))})`;
      let s = '';
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i], n = ts[i + 1];
        if (t.t === 'op' && (t.v === '++' || t.v === '--')) throw new TErr(`"${t.v}" can only be used as a statement on its own here (write x = x + 1 or x++; on its own line)`, t.line);
        if (t.v === '(' && n && n.t === 'id' && TYPES.has(n.v) && ts[i + 2] && ts[i + 2].v === ')') {
          const ty = n.v; const f = /float|double/.test(ty) ? 'float' : 'int'; i += 2;
          if (ts[i + 1] && ts[i + 1].v === '(') { s += f; } else { s += f + '(' + tokText(ts[i + 1]) + ')'; i++; }
          continue;
        }
        if ((t.v === '(' || t.v === '[') && !(n && n.t === 'id' && TYPES.has(n.v) && ts[i + 2] && ts[i + 2].v === ')')) {
          const close = t.v === '(' ? ')' : ']'; let d2 = 0, j = i;
          for (; j < ts.length; j++) { if (ts[j].v === '(' || ts[j].v === '[') d2++; else if (ts[j].v === ')' || ts[j].v === ']') { d2--; if (d2 === 0) break; } }
          const inner = ts.slice(i + 1, j); const parts = []; let cur = [], d3 = 0;
          inner.forEach(x => { if (x.v === '(' || x.v === '[') d3++; if (x.v === ')' || x.v === ']') d3--; if (d3 === 0 && x.v === ',') { parts.push(cur); cur = []; } else cur.push(x); });
          if (cur.length || parts.length) parts.push(cur);
          s += t.v + parts.map(expr).join(', ') + close; i = j;
          const nn = ts[i + 1]; if (nn && (nn.t === 'id' || nn.t === 'num')) s += ' ';
          continue;
        }
        if (t.v === '/' && isIntTok(ts[i - 1]) && isIntTok(n)) { s += ' // '; continue; }
        if (t.t === 'id') {
          if (t.v === 'true') s += 'True'; else if (t.v === 'false') s += 'False'; else if (t.v === 'NULL') s += 'None';
          else if (t.v === 'String' && n && n.v === '(') s += 'str';
          else if (t.v === 'sizeof') throw new TErr('sizeof() is not supported in the virtual lab: write the number of elements directly', t.line);
          else s += nm(t.v);
          if (n && (n.t === 'id' || n.t === 'num')) s += ' ';
          continue;
        }
        if (t.t === 'num') { s += /^0b/i.test(t.v) ? t.v : t.v.replace(/^0(\d+)$/, '$1'); if (n && n.t === 'id') s += ' '; continue; }
        if (t.t === 'str' || t.t === 'chr') { s += t.v; continue; }
        if (t.v === '&&') s += ' and '; else if (t.v === '||') s += ' or ';
        else if (t.v === '!') s += ' not '; else if (t.v === '->') s += '.';
        else if (t.v === '&' && (!ts[i - 1] || ts[i - 1].t === 'op' && ts[i - 1].v !== ')' && ts[i - 1].v !== ']')) throw new TErr('Pointers and "&" references are not supported in the virtual lab', t.line);
        else if (t.v === '{') throw new TErr('Unexpected "{" inside an expression', t.line);
        else s += (/[=<>!+\-*\/%&|^]/.test(t.v) && t.v.length >= 1 && !['(', ')', '[', ']', ',', '.'].includes(t.v)) ? ' ' + t.v + ' ' : t.v + (t.v === ',' ? ' ' : '');
      }
      return s.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();
    }
    const tokText = t => t ? (t.t === 'id' ? nm(t.v) : t.v) : '';
    const intVars = new Set(['HIGH', 'LOW']);
    const isIntTok = t => !!t && ((t.t === 'num' && !/[.eE]/.test(t.v)) || (t.t === 'id' && intVars.has(t.v)));

    // ---------- declarations ----------
    function readType() {
      const parts = []; while (isTypeStart()) parts.push(next().v);
      return parts;
    }
    function declarators(type, ind, line, isGlobal) {
      // name [= expr] [, name [= expr]] ;   also arrays and Servo
      while (true) {
        const t = next(); if (t.t !== 'id') throw new TErr(`Expected a variable name after the type, found "${t.v}"`, t.line);
        const name = nm(t.v); if (isGlobal) globals.add(name);
        if (type.some(x => /^(int|long|short|byte|word|size_t|u?int\d+_t|unsigned|signed)$/.test(x)) && !type.some(x => /float|double/.test(x))) intVars.add(t.v);
        let isArr = false, size = '';
        if (is('[')) { next(); size = expr(readUntil([']'])); expect(']'); isArr = true; }
        let val = null;
        if (is('=')) {
          next();
          if (is('{')) { next(); const items = []; while (!is('}')) { items.push(expr(readUntil([',', '}']))); if (is(',')) next(); } next(); val = '[' + items.join(', ') + ']'; }
          else val = expr(readUntil([',', ';']));
          if (!isArr && type.includes('int') && !type.includes('unsigned') && /\//.test(val)) val = `int(${val})`;
        }
        if (type.includes('Servo')) val = 'Servo()';
        if (val === null) val = isArr ? `[0] * (${size || 0})` : (type.some(x => /float|double/.test(x)) ? '0.0' : type.includes('String') ? '""' : type.some(x => /bool/.test(x)) ? 'False' : '0');
        if (isArr && val && val.startsWith('"')) val = `list(${val})`;
        emit(ind, `${name} = ${val}`, line);
        if (is(',')) { next(); continue; }
        expect(';'); break;
      }
    }

    // ---------- statements ----------
    const loops = []; // stack of {step:[lines]} for continue handling
    function block(ind) {
      if (is('{')) {
        next(); const start = out.length;
        while (!is('}')) { if (peek().t === 'eof') throw new TErr('A "}" is missing: every "{" needs a matching "}"', peek().line); stmt(ind); }
        next(); if (out.length === start) emit(ind, 'pass', peek(-1) ? toks[p - 1].line : 0);
      } else { const start = out.length; stmt(ind); if (out.length === start) emit(ind, 'pass', toks[p - 1].line); }
    }
    function simple(ts, ind, line) {
      // assignment / call / ++ / --
      if (!ts.length) return;
      if (ts.length === 2 && ts[0].t === 'id' && (ts[1].v === '++' || ts[1].v === '--')) return emit(ind, `${nm(ts[0].v)} ${ts[1].v === '++' ? '+=' : '-='} 1`, line);
      if (ts.length === 2 && ts[1].t === 'id' && (ts[0].v === '++' || ts[0].v === '--')) return emit(ind, `${nm(ts[1].v)} ${ts[0].v === '++' ? '+=' : '-='} 1`, line);
      // x[i]++ etc
      const last = ts[ts.length - 1];
      if (last.v === '++' || last.v === '--') return emit(ind, `${expr(ts.slice(0, -1))} ${last.v === '++' ? '+=' : '-='} 1`, line);
      // chained/simple assignment: find top-level '=' or compound op
      let d = 0, ai = -1;
      ts.forEach((t, i) => { if (t.v === '(' || t.v === '[') d++; else if (t.v === ')' || t.v === ']') d--; else if (d === 0 && ai < 0 && t.t === 'op' && /^([+\-*\/%&|^]|<<|>>)?=$/.test(t.v)) ai = i; });
      if (ai > 0) {
        const lhs = expr(ts.slice(0, ai)), op = ts[ai].v, rhs = expr(ts.slice(ai + 1));
        if (op === '/=') return emit(ind, `${lhs} = ${lhs} / (${rhs})`, line);
        return emit(ind, `${lhs} ${op} ${rhs}`, line);
      }
      emit(ind, expr(ts), line);
    }
    function stmt(ind) {
      const t = peek(); const line = t.line;
      if (t.v === ';') { next(); return; }
      if (t.v === '{') { block(ind); return; }
      if (t.t === 'id' && isTypeStart() && !(peek(1).v === '(')) { const ty = readType(); declarators(ty, ind, line, false); return; }
      if (t.v === 'if') {
        next(); expect('('); const c = expr(readUntil([')'])); expect(')');
        emit(ind, `if ${c}:`, line); block(ind + 1);
        while (is('else')) {
          const el = next();
          if (is('if')) { next(); expect('('); const c2 = expr(readUntil([')'])); expect(')'); emit(ind, `elif ${c2}:`, el.line); block(ind + 1); }
          else { emit(ind, 'else:', el.line); block(ind + 1); break; }
        }
        return;
      }
      if (t.v === 'while') { next(); expect('('); const c = expr(readUntil([')'])); expect(')'); emit(ind, `while ${c || 'True'}:`, line); loops.push({ step: null }); block(ind + 1); loops.pop(); return; }
      if (t.v === 'do') { next(); emit(ind, 'while True:', line); loops.push({ step: null, dow: true }); block(ind + 1); loops.pop(); expect('while'); expect('('); const c = expr(readUntil([')'])); expect(')'); expect(';'); emit(ind + 1, `if not (${c}):`, line); emit(ind + 2, 'break', line); return; }
      if (t.v === 'for') {
        next(); expect('(');
        // init
        let initTs = readUntil([';']); expect(';'); const condTs = readUntil([';']); expect(';'); const stepTs = readUntil([')']); expect(')');
        const initTy = []; while (initTs.length && initTs[0].t === 'id' && TYPES.has(initTs[0].v)) initTy.push(initTs.shift());
        // range() fast path
        const v = initTs[0] && initTs[0].t === 'id' ? initTs[0].v : null;
        const ok = v && initTs[1] && initTs[1].v === '=' && condTs[0] && condTs[0].v === v && ['<', '<=', '>', '>='].includes(condTs[1] && condTs[1].v);
        let stepN = null;
        if (ok && stepTs.length === 2 && stepTs[0].v === v && (stepTs[1].v === '++' || stepTs[1].v === '--')) stepN = stepTs[1].v === '++' ? '1' : '-1';
        if (ok && stepTs.length === 2 && stepTs[1].v === v && (stepTs[0].v === '++' || stepTs[0].v === '--')) stepN = stepTs[0].v === '++' ? '1' : '-1';
        if (ok && stepTs.length >= 3 && stepTs[0].v === v && (stepTs[1].v === '+=' || stepTs[1].v === '-=')) stepN = (stepTs[1].v === '-=' ? '-' : '') + '(' + expr(stepTs.slice(2)) + ')';
        if (ok && stepN !== null) {
          const a = expr(initTs.slice(2)), op = condTs[1].v; let b = expr(condTs.slice(2));
          const up = !stepN.startsWith('-');
          if ((up && (op === '<' || op === '<=')) || (!up && (op === '>' || op === '>='))) {
            if (op === '<=') b = `(${b}) + 1`; if (op === '>=') b = `(${b}) - 1`;
            emit(ind, `for ${nm(v)} in range(${a}, ${b}${stepN === '1' ? '' : ', ' + stepN}):`, line);
            loops.push({ step: null }); block(ind + 1); loops.pop(); return;
          }
        }
        if (initTs.length) simple(initTs, ind, line);
        emit(ind, `while ${condTs.length ? expr(condTs) : 'True'}:`, line);
        const L = { step: stepTs }; loops.push(L); const start = out.length; block(ind + 1); loops.pop();
        if (stepTs.length) simple(stepTs, ind + 1, line);
        return;
      }
      if (t.v === 'switch') {
        next(); expect('('); const c = expr(readUntil([')'])); expect(')'); expect('{');
        const sv = `_sw${ind}`; emit(ind, `${sv} = ${c}`, line); let first = true; let hadAny = false;
        loops.push({ step: null, sw: true });
        while (!is('}')) {
          const ct = next(); let cond;
          if (ct.v === 'case') { const vals = [expr(readUntil([':']))]; expect(':'); while (is('case')) { next(); vals.push(expr(readUntil([':']))); expect(':'); } cond = vals.map(v => `${sv} == ${v}`).join(' or '); }
          else if (ct.v === 'default') { expect(':'); cond = null; }
          else throw new TErr('Inside switch, expected "case" or "default"', ct.line);
          emit(ind, cond === null ? (first ? 'if True:' : 'else:') : `${first ? 'if' : 'elif'} ${cond}:`, ct.line); first = false; hadAny = true;
          const start = out.length;
          while (!is('case') && !is('default') && !is('}')) { if (is('break') && is(';', 1)) { next(); next(); continue; } stmt(ind + 1); }
          if (out.length === start) emit(ind + 1, 'pass', ct.line);
        }
        next(); loops.pop(); return;
      }
      if (t.v === 'break') { next(); expect(';'); const L = loops[loops.length - 1]; if (L && L.sw) return; emit(ind, 'break', line); return; }
      if (t.v === 'continue') { next(); expect(';'); const L = [...loops].reverse().find(l => !l.sw); if (L && L.step && L.step.length) simple(L.step, ind, line); emit(ind, 'continue', line); return; }
      if (t.v === 'return') { next(); const e = expr(readUntil([';'])); expect(';'); emit(ind, e ? `return ${e}` : 'return', line); return; }
      if (t.v === 'goto') throw new TErr('goto is not supported', line);
      const ts = readUntil([';']); expect(';'); simple(ts, ind, line);
    }

    // ---------- top level ----------
    const fnBodies = [];
    while (peek().t !== 'eof') {
      const t = peek();
      if (t.t === 'pp') {
        next(); const m = t.v.match(/^#define\s+(\w+)\s+(.+)$/);
        if (m) { emit(0, `${nm(m[1])} = ${m[2].replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False')}`, t.line); globals.add(nm(m[1])); }
        else if (/^#include/.test(t.v)) { if (!/Servo\.h|Arduino\.h/.test(t.v)) throw new TErr(`The library ${t.v.replace('#include', '').trim()} is not available on the virtual UNO (only Servo.h is)`, t.line); }
        continue;
      }
      if (t.v === ';') { next(); continue; }
      if (!isTypeStart()) throw new TErr(`Unexpected "${t.v}" outside a function. Code must go inside setup(), loop() or another function.`, t.line);
      const ty = readType();
      if (peek().t === 'id' && is('(', 1)) {
        const fn = next(); expect('(');
        const params = []; while (!is(')')) { const pt = readType(); if (!pt.length && is('void')) next(); const pn = next(); if (pn.v === ')') { p--; break; } params.push(nm(pn.v)); if (is('[')) { next(); expect(']'); } if (is('=')) throw new TErr('Default parameter values are not supported', pn.line); if (is(',')) next(); }
        expect(')');
        if (is(';')) { next(); continue; } // prototype
        funcs.add(fn.v);
        const start = out.length;
        emit(0, `def ${nm(fn.v)}(${params.join(', ')}):`, fn.line);
        const gi = out.length; emit(1, '__GLOBALS__', fn.line);
        fnBodies.push({ gi, params });
        block(1);
        continue;
      }
      declarators(ty, 0, t.line, true);
    }
    if (!funcs.has('setup') || !funcs.has('loop')) throw new TErr('An Arduino sketch needs both void setup() { … } and void loop() { … }', 1);
    // fill globals lines
    fnBodies.forEach(f => { const g = [...globals].filter(x => !f.params.includes(x)); out[f.gi].s = g.length ? `global ${g.join(', ')}` : 'pass'; });
    const lines = ['def F(s): return s'], map = [0];
    out.forEach(o => { lines.push('    '.repeat(o.ind) + o.s); map.push(o.line); });
    lines.push('setup()'); map.push(0); lines.push('while True:'); map.push(0); lines.push('    loop()'); map.push(0);
    return { py: lines.join('\n') + '\n', map };
  }

  VL.Arduino = {
    translate(src) {
      try { return translate(src); }
      catch (e) { if (e instanceof TErr) return { error: { type: 'TranslateError', msg: e.message, line: e.line, syntax: true } }; return { error: { type: 'TranslateError', msg: 'Could not read this sketch: ' + e.message, line: 0, syntax: true } }; }
    },
    async run(src, limitMs, cfg) {
      const tr = this.translate(src);
      if (tr.error) return { events: [], serial: [], servo: [], pins: {}, end: 0, reason: 'error', error: tr.error, warnings: [], http: [], pwmf: {} };
      const r = await VL.Py.run(tr.py, limitMs, Object.assign({}, cfg, { board: 'uno', arduino: true, lineMap: tr.map }));
      if (r.error && !r.error.line) r.error.line = 0;
      return r;
    }
  };
})();
