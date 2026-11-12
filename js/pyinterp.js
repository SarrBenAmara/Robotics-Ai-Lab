/* =========================================================================
   pyinterp.js : a built-in Python 3 interpreter (MicroPython-style subset)
   Written for the lab so student code runs instantly, offline, on any
   school computer (no downloads, no WebAssembly).
   Supports: ints/floats/bools/None/str/list/tuple/dict/bytes, f-strings,
   if/elif/else, while, for, break/continue, def (defaults, keywords),
   lambda, return, global, try/except/finally, raise, assert, del,
   list comprehensions, slicing, chained comparisons, import/from-import.
   ========================================================================= */
(function () {
  /* ------------------------------ values ------------------------------ */
  class PyFloat { constructor(v) { this.v = v; } }
  const F = v => new PyFloat(v);
  const isInt = x => typeof x === 'number';
  const isNum = x => typeof x === 'number' || x instanceof PyFloat || typeof x === 'boolean';
  const num = x => typeof x === 'number' ? x : x instanceof PyFloat ? x.v : typeof x === 'boolean' ? (x ? 1 : 0) : NaN;
  class PyErr extends Error { constructor(type, msg, line) { super(msg); this.type = type; this.pmsg = msg; this.line = line; } }
  const err = (type, msg) => { throw new PyErr(type, msg); };
  const mkTuple = a => { a.__tuple = true; return a; };
  const isTuple = a => Array.isArray(a) && a.__tuple;
  class PyBytes { constructor(arr) { this.a = Uint8Array.from(arr); } }
  const NAT = fn => { fn.__nat = true; return fn; };
  class PyFunc { constructor(name, params, body, closure, isLambda) { this.name = name; this.params = params; this.body = body; this.closure = closure; this.isLambda = isLambda; } }
  class PyModule { constructor(name, attrs) { this.__name = name; Object.assign(this, attrs); } }

  const typeName = v => v === null ? 'NoneType' : typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'int' : v instanceof PyFloat ? 'float' : typeof v === 'string' ? 'str' : isTuple(v) ? 'tuple' : Array.isArray(v) ? 'list' : v instanceof Map ? 'dict' : v instanceof PyBytes ? 'bytes' : v instanceof PyFunc ? 'function' : typeof v === 'function' ? (v.__type ? 'type' : 'builtin_function') : v instanceof PyModule ? 'module' : (v && v.__class__) || 'object';

  function floatRepr(x) {
    if (!isFinite(x)) return isNaN(x) ? 'nan' : (x > 0 ? 'inf' : '-inf');
    if (Number.isInteger(x) && Math.abs(x) < 1e16) return x.toFixed(1);
    if (x !== 0 && (Math.abs(x) < 1e-4 || Math.abs(x) >= 1e16)) return x.toExponential().replace(/e([+-])(\d)$/, 'e$10$2').replace('e+', 'e+');
    let s = String(x);
    if (/e/.test(s)) { s = s.replace(/e([+-])(\d)$/, 'e$10$2'); }
    return s;
  }
  function repr(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True'; if (v === false) return 'False';
    if (typeof v === 'number') return String(v);
    if (v instanceof PyFloat) return floatRepr(v.v);
    if (typeof v === 'string') { const q = v.includes("'") && !v.includes('"') ? '"' : "'"; return q + v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(q === "'" ? /'/g : /"/g, '\\' + q) + q; }
    if (isTuple(v)) return '(' + v.map(repr).join(', ') + (v.length === 1 ? ',' : '') + ')';
    if (Array.isArray(v)) return '[' + v.map(repr).join(', ') + ']';
    if (v instanceof Map) return '{' + [...v.entries()].map(([k, x]) => repr(k) + ': ' + repr(x)).join(', ') + '}';
    if (v instanceof PyBytes) return "b'" + [...v.a].map(b => b >= 32 && b < 127 && b !== 39 && b !== 92 ? String.fromCharCode(b) : '\\x' + b.toString(16).padStart(2, '0')).join('') + "'";
    if (v instanceof PyFunc) return `<function ${v.name}>`;
    if (v instanceof PyModule) return `<module '${v.__name}'>`;
    if (typeof v === 'function') return `<built-in function ${v.__name || 'function'}>`;
    if (v.__repr__) return v.__repr__();
    return `<${v.__class__ || 'object'} object>`;
  }
  const str = v => typeof v === 'string' ? v : (v && v.__str__ ? v.__str__() : repr(v));
  function truthy(v) {
    if (v === null || v === undefined || v === false) return false;
    if (v === true) return true;
    if (typeof v === 'number') return v !== 0;
    if (v instanceof PyFloat) return v.v !== 0;
    if (typeof v === 'string' || Array.isArray(v)) return v.length > 0;
    if (v instanceof Map) return v.size > 0;
    if (v instanceof PyBytes) return v.a.length > 0;
    return true;
  }
  const keyOf = k => typeof k === 'number' ? k : k instanceof PyFloat ? (Number.isInteger(k.v) ? k.v : 'f' + k.v) : typeof k === 'boolean' ? (k ? 1 : 0) : isTuple(k) ? 't' + JSON.stringify(k.map(keyOf)) : k;
  class PyDict extends Map { }
  // dicts: use Map with normalized keys stored as original; for simplicity keys: str/int/tuple
  function dictGet(d, k) { const nk = keyOf(k); for (const [kk, v] of d) if (keyOf(kk) === nk) return { found: true, v }; return { found: false }; }
  function dictSet(d, k, v) { const nk = keyOf(k); for (const kk of d.keys()) if (keyOf(kk) === nk) { d.set(kk, v); return; } d.set(k, v); }
  function dictDel(d, k) { const nk = keyOf(k); for (const kk of d.keys()) if (keyOf(kk) === nk) { d.delete(kk); return true; } return false; }

  function eq(a, b) {
    if (isNum(a) && isNum(b)) return num(a) === num(b);
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    if (Array.isArray(a) && Array.isArray(b)) return isTuple(a) === isTuple(b) && a.length === b.length && a.every((x, i) => eq(x, b[i]));
    if (a instanceof Map && b instanceof Map) { if (a.size !== b.size) return false; for (const [k, v] of a) { const r = dictGet(b, k); if (!r.found || !eq(v, r.v)) return false; } return true; }
    if (a instanceof PyBytes && b instanceof PyBytes) return a.a.length === b.a.length && a.a.every((x, i) => x === b.a[i]);
    return a === b || (a === null && b === undefined) || (a === undefined && b === null);
  }
  function cmp(a, b, op) {
    if (isNum(a) && isNum(b)) { const x = num(a), y = num(b); return op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y; }
    if (typeof a === 'string' && typeof b === 'string') return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
    if (Array.isArray(a) && Array.isArray(b)) { for (let i = 0; i < Math.min(a.length, b.length); i++) { if (!eq(a[i], b[i])) return cmp(a[i], b[i], op); } return cmp(a.length, b.length, op); }
    err('TypeError', `'${op}' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`);
  }
  function contains(c, x) {
    if (typeof c === 'string') { if (typeof x !== 'string') err('TypeError', "'in <string>' requires string as left operand"); return c.includes(x); }
    if (Array.isArray(c)) return c.some(y => eq(x, y));
    if (c instanceof Map) return dictGet(c, x).found;
    if (c instanceof PyBytes) return [...c.a].includes(num(x));
    if (c && c.__range) { const v = num(x); const { start, stop, step } = c; if (step > 0 ? (v < start || v >= stop) : (v > start || v <= stop)) return false; return (v - start) % step === 0; }
    err('TypeError', `argument of type '${typeName(c)}' is not iterable`);
  }
  function pyMod(a, b) { const r = a % b; return r !== 0 && (r < 0) !== (b < 0) ? r + b : r; }
  function binop(op, a, b) {
    if (op === '+') {
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (Array.isArray(a) && Array.isArray(b)) { if (isTuple(a) !== isTuple(b)) err('TypeError', `can only concatenate ${typeName(a)} (not "${typeName(b)}") to ${typeName(a)}`); const r = a.concat(b); return isTuple(a) ? mkTuple(r) : r; }
    }
    if (op === '*') {
      if (typeof a === 'string' && isInt(num(b)) && typeof b !== 'string') return a.repeat(Math.max(0, num(b)));
      if (typeof b === 'string' && isNum(a)) return b.repeat(Math.max(0, num(a)));
      if (Array.isArray(a) && isNum(b)) { let r = []; for (let i = 0; i < num(b); i++) r = r.concat(a); return isTuple(a) ? mkTuple(r) : r; }
      if (Array.isArray(b) && isNum(a)) return binop('*', b, a);
    }
    if (op === '%' && typeof a === 'string') return pyFormatPercent(a, b);
    if (!isNum(a) || !isNum(b)) err('TypeError', `unsupported operand type(s) for ${op}: '${typeName(a)}' and '${typeName(b)}'`);
    const fl = a instanceof PyFloat || b instanceof PyFloat; const x = num(a), y = num(b);
    switch (op) {
      case '+': return fl ? F(x + y) : x + y;
      case '-': return fl ? F(x - y) : x - y;
      case '*': return fl ? F(x * y) : x * y;
      case '/': if (y === 0) err('ZeroDivisionError', 'division by zero'); return F(x / y);
      case '//': if (y === 0) err('ZeroDivisionError', 'integer division or modulo by zero'); return fl ? F(Math.floor(x / y)) : Math.floor(x / y);
      case '%': if (y === 0) err('ZeroDivisionError', 'integer modulo by zero'); return fl ? F(pyMod(x, y)) : pyMod(x, y);
      case '**': { const r = Math.pow(x, y); return (fl || y < 0) ? F(r) : r; }
      case '<<': return x << y; case '>>': return x >> y; case '&': return x & y; case '|': return x | y; case '^': return x ^ y;
    }
    err('TypeError', 'bad operand');
  }
  function fmtSpec(v, spec) {
    if (!spec) return str(v);
    const m = spec.match(/^([<>^]?)(0?)(\d*)(,?)(?:\.(\d+))?([dfxXbeos%]?)$/); if (!m) return str(v);
    const [, align, zero, width, comma, prec, type] = m; let s;
    if (type === 'f' || (prec !== undefined && type === '')) s = num(v).toFixed(prec === undefined ? 6 : +prec);
    else if (type === 'd') s = String(Math.trunc(num(v)));
    else if (type === 'x') s = Math.trunc(num(v)).toString(16); else if (type === 'X') s = Math.trunc(num(v)).toString(16).toUpperCase();
    else if (type === 'b') s = Math.trunc(num(v)).toString(2); else if (type === 'e') s = num(v).toExponential(prec === undefined ? 6 : +prec).replace(/e([+-])(\d)$/, 'e$10$2');
    else if (type === '%') s = (num(v) * 100).toFixed(prec === undefined ? 6 : +prec) + '%';
    else s = str(v);
    if (comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/, ',');
    const w = +width || 0;
    if (s.length < w) { if (zero && !align) s = (s[0] === '-' ? '-' + s.slice(1).padStart(w - 1, '0') : s.padStart(w, '0')); else if (align === '<') s = s.padEnd(w); else if (align === '^') { const p = w - s.length; s = ' '.repeat(Math.floor(p / 2)) + s + ' '.repeat(Math.ceil(p / 2)); } else s = (isNum(v) || align === '>') ? s.padStart(w) : s.padEnd(w); }
    return s;
  }
  function pyFormatPercent(fmt, args) {
    const a = isTuple(args) ? args.slice() : [args]; let i = 0;
    return fmt.replace(/%([-0]?)(\d*)(?:\.(\d+))?([sdifxXr%])/g, (m, flag, w, p, t) => {
      if (t === '%') return '%'; const v = a[i++]; let s;
      if (t === 's') s = str(v); else if (t === 'r') s = repr(v); else if (t === 'd' || t === 'i') s = String(Math.trunc(num(v))); else if (t === 'f') s = num(v).toFixed(p === undefined ? 6 : +p); else if (t === 'x') s = Math.trunc(num(v)).toString(16); else s = Math.trunc(num(v)).toString(16).toUpperCase();
      if (w) s = flag === '-' ? s.padEnd(+w) : flag === '0' ? s.padStart(+w, '0') : s.padStart(+w);
      return s;
    });
  }

  /* ------------------------------ tokenizer ------------------------------ */
  const KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);
  const OPS = ['**=', '//=', '>>=', '<<=', '==', '!=', '<=', '>=', '**', '//', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', ':=', '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', '{', '}', ',', ':', '.', ';', '@', '&', '|', '^', '~'];
  function tokenize(src) {
    const toks = []; const lines = src.replace(/\r\n?/g, '\n').split('\n'); const indents = [0]; let depth = 0; let contLine = false;
    const push = (t, v, line, col) => toks.push({ t, v, line, col });
    let li = 0; let pendingStr = null;
    for (li = 0; li < lines.length; li++) {
      let line = lines[li]; const ln = li + 1; let i = 0;
      if (depth === 0 && !contLine) {
        // indentation
        let ind = 0; while (i < line.length && (line[i] === ' ' || line[i] === '\t')) { ind += line[i] === '\t' ? 8 - (ind % 8) : 1; i++; }
        if (i >= line.length || line[i] === '#') continue; // blank / comment
        if (ind > indents[indents.length - 1]) { indents.push(ind); push('INDENT', '', ln, 0); }
        else { while (ind < indents[indents.length - 1]) { indents.pop(); push('DEDENT', '', ln, 0); } if (ind !== indents[indents.length - 1]) throw new PyErr('IndentationError', 'unindent does not match any outer indentation level', ln); }
      }
      contLine = false;
      while (i < line.length) {
        const c = line[i];
        if (c === ' ' || c === '\t') { i++; continue; }
        if (c === '#') break;
        if (c === '\\' && i === line.length - 1) { contLine = true; i++; break; }
        // strings
        const sm = line.slice(i).match(/^([rRbBfF]{0,2})('''|"""|'|")/);
        if (sm && (sm[1] === '' || /^[rbf]{1,2}$/i.test(sm[1]))) {
          const pre = sm[1].toLowerCase(), q = sm[2]; let j = i + sm[0].length; let val = ''; const startLn = ln;
          if (q.length === 3) {
            let text = line.slice(j); let lj = li; let endIdx = text.indexOf(q);
            while (endIdx < 0) { val += text + '\n'; lj++; if (lj >= lines.length) throw new PyErr('SyntaxError', 'unterminated triple-quoted string literal', startLn); text = lines[lj]; endIdx = text.indexOf(q); }
            val += text.slice(0, endIdx); li = lj; line = lines[li]; i = endIdx + 3; if (lj !== startLn - 1) { i = endIdx + 3; } else i = j + endIdx + 3;
            if (lj !== startLn - 1) { /* continued */ }
          } else {
            let k = j; let out = '';
            while (k < line.length && line[k] !== q) { if (line[k] === '\\' && !pre.includes('r')) { k++; const e = line[k]; out += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e === '0' ? '\0' : e === 'x' ? String.fromCharCode(parseInt(line.substr(k + 1, 2), 16)) : e; if (e === 'x') k += 2; k++; continue; } out += line[k]; k++; }
            if (k >= line.length) throw new PyErr('SyntaxError', 'unterminated string literal (missing quote)', ln);
            val = out; i = k + 1;
          }
          push(pre.includes('f') ? 'FSTR' : pre.includes('b') ? 'BYTES' : 'STR', val, startLn, i);
          continue;
        }
        const nm = line.slice(i).match(/^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?)/);
        if (nm && /[\d.]/.test(c) && !(c === '.' && !/\d/.test(line[i + 1] || ''))) {
          const s = nm[0].replace(/_/g, ''); let v;
          if (/^0[xX]/.test(s)) v = parseInt(s, 16); else if (/^0[bB]/.test(s)) v = parseInt(s.slice(2), 2); else if (/^0[oO]/.test(s)) v = parseInt(s.slice(2), 8); else if (/[.eE]/.test(s)) v = F(parseFloat(s)); else v = parseInt(s, 10);
          push('NUM', v, ln, i); i += nm[0].length; continue;
        }
        const idm = line.slice(i).match(/^[A-Za-z_\u00c0-\uffff][\w\u00c0-\uffff]*/);
        if (idm) { push(KEYWORDS.has(idm[0]) ? 'KW' : 'NAME', idm[0], ln, i); i += idm[0].length; continue; }
        const op = OPS.find(o => line.startsWith(o, i));
        if (op) { if ('([{'.includes(op)) depth++; if (')]}'.includes(op)) depth = Math.max(0, depth - 1); push('OP', op, ln, i); i += op.length; continue; }
        throw new PyErr('SyntaxError', `invalid character '${c}'`, ln);
      }
      if (depth === 0 && !contLine) { if (toks.length && toks[toks.length - 1].t !== 'NEWLINE' && toks[toks.length - 1].t !== 'INDENT' && toks[toks.length - 1].t !== 'DEDENT') push('NEWLINE', '', ln, i); }
    }
    if (depth > 0) throw new PyErr('SyntaxError', "'(' was never closed", lines.length);
    if (toks.length && toks[toks.length - 1].t !== 'NEWLINE') push('NEWLINE', '', lines.length, 0);
    while (indents.length > 1) { indents.pop(); push('DEDENT', '', lines.length, 0); }
    push('EOF', '', lines.length + 1, 0);
    return toks;
  }

  /* ------------------------------ parser ------------------------------ */
  function parse(src) {
    const T = tokenize(src); let p = 0;
    const peek = (k = 0) => T[p + k]; const next = () => T[p++];
    const at = (v, t) => T[p].v === v && (t ? T[p].t === t : (T[p].t === 'OP' || T[p].t === 'KW'));
    const eat = (v) => { if (at(v)) { p++; return true; } return false; };
    const syn = (msg, tok) => { throw new PyErr('SyntaxError', msg, (tok || T[p]).line); };
    const expect = (v) => { if (!at(v)) { const tk = T[p]; if (v === ':' ) syn("expected ':'", tk); syn(tk.t === 'NEWLINE' ? `invalid syntax (expected '${v}')` : `invalid syntax: expected '${v}' but found '${tk.v || tk.t}'`); } return next(); };
    const N = (type, tok, o) => Object.assign({ type, line: tok.line }, o);

    function file() { const body = []; while (T[p].t !== 'EOF') { if (T[p].t === 'NEWLINE') { p++; continue; } if (T[p].t === 'INDENT') syn('unexpected indent'); body.push(...statement()); } return body; }
    function block() {
      expect(':');
      if (T[p].t !== 'NEWLINE') return simpleStmts();
      p++; if (T[p].t !== 'INDENT') throw new PyErr('IndentationError', 'expected an indented block', T[p].line);
      p++; const body = []; while (T[p].t !== 'DEDENT' && T[p].t !== 'EOF') { if (T[p].t === 'NEWLINE') { p++; continue; } body.push(...statement()); } p++; return body;
    }
    function statement() {
      const t = T[p];
      if (t.t === 'KW') {
        if (t.v === 'if') { p++; const test = expr(); const body = block(); const node = N('If', t, { test, body, orelse: [] }); let cur = node;
          while (at('elif')) { const e = next(); const tst = expr(); const b = block(); const n2 = N('If', e, { test: tst, body: b, orelse: [] }); cur.orelse = [n2]; cur = n2; }
          if (at('else')) { p++; cur.orelse = block(); } return [node]; }
        if (t.v === 'while') { p++; const test = expr(); const body = block(); let orelse = []; if (at('else')) { p++; orelse = block(); } return [N('While', t, { test, body, orelse })]; }
        if (t.v === 'for') { p++; const target = targetList(); expect('in'); const iter = exprList(); const body = block(); let orelse = []; if (at('else')) { p++; orelse = block(); } return [N('For', t, { target, iter, body, orelse })]; }
        if (t.v === 'def') { p++; const name = T[p].t === 'NAME' ? next().v : syn('expected a function name'); expect('('); const params = paramList(')'); expect(')'); if (eat('->')) expr(); const body = block(); return [N('Def', t, { name, params, body })]; }
        if (t.v === 'try') { p++; const body = block(); const handlers = []; let orelse = [], fin = [];
          while (at('except')) { const e = next(); let etype = null, name = null; if (!at(':')) { etype = expr(); if (eat('as')) name = next().v; } handlers.push({ etype, name, body: block(), line: e.line }); }
          if (at('else')) { p++; orelse = block(); } if (at('finally')) { p++; fin = block(); } if (!handlers.length && !fin.length) syn("expected 'except' or 'finally' block"); return [N('Try', t, { body, handlers, orelse, fin })]; }
        if (t.v === 'class') syn('classes are not supported in the virtual lab yet: use functions and variables');
        if (t.v === 'with') syn('"with" blocks are not supported in the virtual lab');
      }
      return simpleStmts();
    }
    function simpleStmts() { const out = [small()]; while (eat(';')) { if (T[p].t === 'NEWLINE') break; out.push(small()); } if (T[p].t !== 'NEWLINE' && T[p].t !== 'EOF') syn('invalid syntax'); if (T[p].t === 'NEWLINE') p++; return out; }
    function small() {
      const t = T[p];
      if (t.t === 'KW') {
        switch (t.v) {
          case 'pass': p++; return N('Pass', t);
          case 'break': p++; return N('Break', t);
          case 'continue': p++; return N('Continue', t);
          case 'return': p++; return N('Return', t, { value: (T[p].t === 'NEWLINE' || at(';')) ? null : exprList() });
          case 'global': case 'nonlocal': { p++; const names = [next().v]; while (eat(',')) names.push(next().v); return N('Global', t, { names }); }
          case 'import': { p++; const names = []; do { let n = next().v; while (eat('.')) n += '.' + next().v; let as = null; if (eat('as')) as = next().v; names.push({ name: n, as }); } while (eat(',')); return N('Import', t, { names }); }
          case 'from': { p++; let mod = next().v; while (eat('.')) mod += '.' + next().v; expect('import'); const names = []; if (eat('*')) names.push({ name: '*' }); else { const par = eat('('); do { if (par && at(')')) break; const n = next().v; let as = null; if (eat('as')) as = next().v; names.push({ name: n, as }); } while (eat(',')); if (par) expect(')'); } return N('ImportFrom', t, { mod, names }); }
          case 'raise': { p++; return N('Raise', t, { exc: T[p].t === 'NEWLINE' ? null : expr() }); }
          case 'assert': { p++; const test = expr(); let msg = null; if (eat(',')) msg = expr(); return N('Assert', t, { test, msg }); }
          case 'del': { p++; return N('Del', t, { targets: exprList() }); }
          case 'yield': syn('generators (yield) are not supported in the virtual lab');
        }
      }
      const e = exprList();
      if (at('=')) { const targets = [e]; let value; while (eat('=')) { value = exprList(); targets.push(value); } targets.pop(); targets.forEach(checkTarget); return N('Assign', t, { targets, value }); }
      const aug = ['+=', '-=', '*=', '/=', '//=', '%=', '**=', '>>=', '<<=', '&=', '|=', '^='].find(o => at(o));
      if (aug) { p++; checkTarget(e); return N('AugAssign', t, { target: e, op: aug.slice(0, -1), value: exprList() }); }
      if (at(':')) { p++; expr(); if (eat('=')) return N('Assign', t, { targets: [e], value: exprList() }); return N('Pass', t); }
      return N('Expr', t, { value: e });
    }
    function checkTarget(e) { if (e.type === 'Name' || e.type === 'Attribute' || e.type === 'Subscript') return; if (e.type === 'Tuple' || e.type === 'List') { e.elts.forEach(checkTarget); return; } throw new PyErr('SyntaxError', e.type === 'Call' ? "cannot assign to function call here. Maybe you meant '==' instead of '='?" : 'cannot assign to expression here', e.line); }
    function paramList(end) {
      const ps = []; while (!at(end)) { let star = 0; if (eat('*')) star = 1; else if (eat('**')) star = 2; const n = next(); if (n.t !== 'NAME') syn('invalid parameter'); let def = null; if (at(':') && end === ')') { p++; expr(); } if (eat('=')) def = expr(); ps.push({ name: n.v, def, star }); if (!eat(',')) break; }
      return ps;
    }
    function targetList() { const t = T[p]; const first = bitor(); if (!at(',')) return first; const elts = [first]; while (eat(',')) { if (at('in') || at('=')) break; elts.push(bitor()); } return N('Tuple', t, { elts }); }
    function exprList() { const t = T[p]; const first = expr(); if (!at(',')) return first; const elts = [first]; while (eat(',')) { if (T[p].t === 'NEWLINE' || at('=') || at(')') || at(';') || T[p].t === 'EOF') break; elts.push(expr()); } return N('Tuple', t, { elts }); }
    function expr() {
      const t = T[p];
      if (at('lambda')) { p++; const params = paramList(':'); expect(':'); const body = expr(); return N('Lambda', t, { params, body }); }
      const e = orExpr();
      if (at('if') && T[p].t === 'KW') { p++; const test = orExpr(); expect('else'); const orelse = expr(); return N('IfExp', t, { test, body: e, orelse }); }
      return e;
    }
    function orExpr() { const t = T[p]; let e = andExpr(); while (at('or')) { p++; e = N('BoolOp', t, { op: 'or', a: e, b: andExpr() }); } return e; }
    function andExpr() { const t = T[p]; let e = notExpr(); while (at('and')) { p++; e = N('BoolOp', t, { op: 'and', a: e, b: notExpr() }); } return e; }
    function notExpr() { const t = T[p]; if (at('not')) { p++; return N('Not', t, { e: notExpr() }); } return comparison(); }
    function comparison() {
      const t = T[p]; const first = bitor(); const ops = [], rest = [];
      while (true) { let op = null; if (['<', '>', '==', '>=', '<=', '!='].includes(T[p].v) && T[p].t === 'OP') op = next().v; else if (at('in')) { p++; op = 'in'; } else if (at('not') && T[p + 1].v === 'in') { p += 2; op = 'not in'; } else if (at('is')) { p++; op = eat('not') ? 'is not' : 'is'; } else if (T[p].v === '=' && T[p].t === 'OP' && false) { } if (!op) break; ops.push(op); rest.push(bitor()); }
      return ops.length ? N('Compare', t, { first, ops, rest }) : first;
    }
    const binLevel = (ops, nextFn) => () => { const t = T[p]; let e = nextFn(); while (T[p].t === 'OP' && ops.includes(T[p].v)) { const op = next().v; e = N('BinOp', t, { op, a: e, b: nextFn() }); } return e; };
    function factor() { const t = T[p]; if (T[p].t === 'OP' && ['-', '+', '~'].includes(T[p].v)) { const op = next().v; return N('Unary', t, { op, e: factor() }); } return power(); }
    function power() { const t = T[p]; const e = atomExpr(); if (at('**')) { p++; return N('BinOp', t, { op: '**', a: e, b: factor() }); } return e; }
    const term = binLevel(['*', '/', '//', '%', '@'], factor); const arith = binLevel(['+', '-'], term); const shift = binLevel(['<<', '>>'], arith);
    const bitand = binLevel(['&'], shift); const bitxor = binLevel(['^'], bitand); const bitor = binLevel(['|'], bitxor);
    function atomExpr() {
      let e = atom();
      while (true) {
        const t = T[p];
        if (at('(')) { p++; const args = [], kw = []; let starArgs = null;
          while (!at(')')) { if (eat('*')) { starArgs = expr(); } else if (T[p].t === 'NAME' && T[p + 1].v === '=' && T[p + 1].t === 'OP') { const k = next().v; p++; kw.push({ k, v: expr() }); } else { const a = expr(); if (at('for')) { args.push(compFor(a, t, 'GenList')); } else args.push(a); } if (!eat(',')) break; }
          expect(')'); e = N('Call', t, { func: e, args, kw, starArgs }); }
        else if (at('[')) { p++; const idx = subscript(); expect(']'); e = N('Subscript', t, { value: e, index: idx }); }
        else if (at('.')) { p++; const n = next(); if (n.t !== 'NAME' && n.t !== 'KW') syn('invalid syntax after "."'); e = N('Attribute', t, { value: e, attr: n.v }); }
        else break;
      }
      return e;
    }
    function subscript() {
      const t = T[p]; const part = () => (at(':') || at(']') || at(',')) ? null : expr();
      const a = part(); if (!at(':')) { if (at(',')) { const elts = [a]; while (eat(',')) { if (at(']')) break; elts.push(expr()); } return N('Tuple', t, { elts }); } return a; }
      p++; const b = part(); let c = null; if (eat(':')) c = part(); return N('Slice', t, { lower: a, upper: b, step: c });
    }
    function compFor(elt, t, kind) { const gens = []; while (at('for')) { p++; const target = targetList(); expect('in'); const iter = orExpr(); const ifs = []; while (at('if') && T[p].t === 'KW') { p++; ifs.push(orExprNoCond()); } gens.push({ target, iter, ifs }); } return N(kind, t, { elt, gens }); }
    function orExprNoCond() { return orExpr(); }
    function atom() {
      const t = T[p];
      if (t.t === 'NUM') { p++; return N('Const', t, { v: t.v }); }
      if (t.t === 'STR' || t.t === 'FSTR' || t.t === 'BYTES') {
        const parts = []; while (['STR', 'FSTR', 'BYTES'].includes(T[p].t)) { const s = next(); parts.push(s.t === 'FSTR' ? fstring(s) : N('Const', s, { v: s.t === 'BYTES' ? new PyBytes([...s.v].map(c => c.charCodeAt(0))) : s.v })); }
        return parts.length === 1 ? parts[0] : N('JoinedStr', t, { parts });
      }
      if (t.t === 'NAME') { p++; return N('Name', t, { id: t.v }); }
      if (t.t === 'KW') { if (t.v === 'None') { p++; return N('Const', t, { v: null }); } if (t.v === 'True') { p++; return N('Const', t, { v: true }); } if (t.v === 'False') { p++; return N('Const', t, { v: false }); } }
      if (at('(')) { p++; if (eat(')')) return N('Tuple', t, { elts: [] }); const e = expr(); if (at('for')) { const g = compFor(e, t, 'GenList'); expect(')'); return g; } if (at(',')) { const elts = [e]; while (eat(',')) { if (at(')')) break; elts.push(expr()); } expect(')'); return N('Tuple', t, { elts }); } expect(')'); return e; }
      if (at('[')) { p++; if (eat(']')) return N('List', t, { elts: [] }); const e = expr(); if (at('for')) { const c = compFor(e, t, 'ListComp'); expect(']'); return c; } const elts = [e]; while (eat(',')) { if (at(']')) break; elts.push(expr()); } expect(']'); return N('List', t, { elts }); }
      if (at('{')) { p++; const keys = [], vals = []; if (eat('}')) return N('Dict', t, { keys, vals }); const k = expr(); if (!at(':')) { const elts = [k]; while (eat(',')) { if (at('}')) break; elts.push(expr()); } expect('}'); return N('List', t, { elts, isSet: true }); } p++; const v = expr(); if (at('for')) { const c = compFor({ k, v }, t, 'DictComp'); expect('}'); return c; } keys.push(k); vals.push(v); while (eat(',')) { if (at('}')) break; keys.push(expr()); expect(':'); vals.push(expr()); } expect('}'); return N('Dict', t, { keys, vals }); }
      if (t.t === 'NEWLINE' || t.t === 'EOF') syn('invalid syntax: the line ends too early (missing value?)', t);
      if (t.t === 'INDENT') throw new PyErr('IndentationError', 'unexpected indent', t.line);
      syn(`invalid syntax near '${t.v}'`);
    }
    function fstring(tok) {
      const s = tok.v; const parts = []; let i = 0, buf = '';
      while (i < s.length) {
        if (s[i] === '{' && s[i + 1] === '{') { buf += '{'; i += 2; continue; }
        if (s[i] === '}' && s[i + 1] === '}') { buf += '}'; i += 2; continue; }
        if (s[i] === '{') {
          if (buf) { parts.push(N('Const', tok, { v: buf })); buf = ''; }
          let d = 1, j = i + 1, inner = ''; let q = null;
          while (j < s.length && d > 0) { const c = s[j]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '{' || c === '[' || c === '(') d++; else if (c === '}' || c === ']' || c === ')') { d--; if (d === 0) break; } inner += c; j++; }
          let spec = ''; let conv = null; let dd = 0; let cut = -1; for (let k = 0; k < inner.length; k++) { const c = inner[k]; if ('([{'.includes(c)) dd++; else if (')]}'.includes(c)) dd--; else if (c === ':' && dd === 0) { cut = k; break; } }
          let exprSrc = cut >= 0 ? inner.slice(0, cut) : inner; if (cut >= 0) spec = inner.slice(cut + 1);
          if (/!r$/.test(exprSrc)) { conv = 'r'; exprSrc = exprSrc.slice(0, -2); } else if (/!s$/.test(exprSrc)) exprSrc = exprSrc.slice(0, -2);
          let self = false; if (/=\s*$/.test(exprSrc) && !/[=!<>]=\s*$/.test(exprSrc)) { self = true; exprSrc = exprSrc.replace(/=\s*$/, ''); }
          let sub; try { const tt = parse(exprSrc.trim() + '\n'); sub = tt[0] && tt[0].value; } catch (e) { throw new PyErr('SyntaxError', 'f-string: invalid expression {' + exprSrc + '}', tok.line); }
          if (!sub) throw new PyErr('SyntaxError', 'f-string: empty expression not allowed', tok.line);
          const fix = n => { if (n && typeof n === 'object') { if (n.line !== undefined) n.line = tok.line; Object.values(n).forEach(v => Array.isArray(v) ? v.forEach(fix) : fix(v)); } }; fix(sub);
          if (self) parts.push(N('Const', tok, { v: exprSrc + '=' }));
          parts.push(N('FormattedValue', tok, { value: sub, spec, conv: self && !spec ? 'r' : conv }));
          i = j + 1; continue;
        }
        buf += s[i]; i++;
      }
      if (buf) parts.push(N('Const', tok, { v: buf }));
      return N('JoinedStr', tok, { parts });
    }
    return file();
  }

  /* ------------------------------ evaluator ------------------------------ */
  class Env { constructor(parent, isGlobal) { this.vars = new Map(); this.parent = parent; this.isGlobal = isGlobal; this.globals = null; } }
  const BREAK = { s: 'break' }, CONTINUE = { s: 'continue' };
  class ReturnSig { constructor(v) { this.v = v; } }
  class StopSig { constructor(r) { this.reason = r; } }

  function Interp(hooks) {
    const H = hooks || {}; const G = new Env(null, true); const builtins = new Map();
    let curLine = 0; let depth = 0;
    const step = (line) => { curLine = line; if (H.step) H.step(line); };

    function lookup(env, name, line) {
      let e = env; while (e) { if (e.vars.has(name)) return e.vars.get(name); if (e.globalNames && e.globalNames.has(name)) { e = G; continue; } e = e.parent; }
      if (builtins.has(name)) return builtins.get(name);
      const suggestion = { true: 'True', false: 'False', none: 'None', null: 'None', pin: 'Pin', Print: 'print' }[name];
      throw new PyErr('NameError', `name '${name}' is not defined` + (suggestion ? `. Did you mean '${suggestion}'?` : ''), line);
    }
    function assignName(env, name, v) { if (env.globalNames && env.globalNames.has(name)) G.vars.set(name, v); else env.vars.set(name, v); }

    function iterate(v) {
      if (Array.isArray(v)) return v.slice();
      if (typeof v === 'string') return [...v];
      if (v instanceof Map) return [...v.keys()];
      if (v instanceof PyBytes) return [...v.a];
      if (v && v.__range) return v;
      if (v && v.__iter__) return v.__iter__();
      err('TypeError', `'${typeName(v)}' object is not iterable`);
    }
    function* rangeGen(r) { if (r.step > 0) for (let i = r.start; i < r.stop; i += r.step) yield i; else for (let i = r.start; i > r.stop; i += r.step) yield i; }
    function forEach(v, fn) { const it = iterate(v); if (it && it.__range) { for (const x of rangeGen(it)) { if (fn(x) === BREAK) return BREAK; } return; } for (const x of it) { if (fn(x) === BREAK) return BREAK; } }
    const toList = v => { const out = []; forEach(v, x => { out.push(x); }); return out; };

    function getattr(obj, name) {
      if (obj === null || obj === undefined) err('AttributeError', `'NoneType' object has no attribute '${name}'`);
      if (typeof obj === 'string') { const m = STR_METHODS[name]; if (m) return NAT((a, k) => m(obj, a, k)); }
      else if (Array.isArray(obj)) { const m = (isTuple(obj) ? TUPLE_METHODS : LIST_METHODS)[name]; if (m) return NAT((a, k) => m(obj, a, k)); }
      else if (obj instanceof Map) { const m = DICT_METHODS[name]; if (m) return NAT((a, k) => m(obj, a, k)); }
      else if (obj instanceof PyBytes) { if (name === 'decode') return NAT(() => String.fromCharCode(...obj.a)); }
      else if (typeof obj === 'object' || typeof obj === 'function') {
        if (name in obj && !name.startsWith('__')) { const v = obj[name]; if (typeof v === 'function' && v.__nat && !v.__type && !(obj instanceof PyModule)) { const b = NAT((a, k) => v.call(obj, a, k)); b.__name = name; return b; } if (v !== undefined) return v; }
      }
      if (isNum(obj) && name === 'real') return obj;
      err('AttributeError', `'${typeName(obj) === 'module' ? obj.__name : typeName(obj)}' ${obj instanceof PyModule ? 'module' : 'object'} has no attribute '${name}'`);
    }
    function setattr(obj, name, v) {
      if (obj === null || typeof obj !== 'object' && typeof obj !== 'function') err('AttributeError', `'${typeName(obj)}' object attribute '${name}' is read-only`);
      if (obj.__setattr__) { obj.__setattr__(name, v); return; }
      obj[name] = v;
    }
    function getitem(o, k) {
      if (k && k.type === '__slice') return slice(o, k);
      if (Array.isArray(o) || typeof o === 'string' || o instanceof PyBytes) {
        if (!isNum(k)) err('TypeError', `${typeName(o)} indices must be integers, not ${typeName(k)}`);
        const a = o instanceof PyBytes ? o.a : o; let i = num(k); if (i < 0) i += a.length; if (i < 0 || i >= a.length) err('IndexError', `${typeName(o)} index out of range`); return a[i];
      }
      if (o instanceof Map) { const r = dictGet(o, k); if (!r.found) err('KeyError', repr(k)); return r.v; }
      if (o && o.__getitem__) return o.__getitem__(k);
      err('TypeError', `'${typeName(o)}' object is not subscriptable`);
    }
    function slice(o, s) {
      const a = o instanceof PyBytes ? [...o.a] : typeof o === 'string' ? [...o] : o; const n = a.length; const step = s.step === null ? 1 : num(s.step);
      if (step === 0) err('ValueError', 'slice step cannot be zero');
      const norm = (v, d) => { if (v === null) return d; v = num(v); if (v < 0) v += n; return step > 0 ? Math.max(0, Math.min(n, v)) : Math.max(-1, Math.min(n - 1, v)); };
      const lo = norm(s.lower, step > 0 ? 0 : n - 1), hi = norm(s.upper, step > 0 ? n : -1); const out = [];
      if (step > 0) for (let i = lo; i < hi; i += step) out.push(a[i]); else for (let i = lo; i > hi; i += step) out.push(a[i]);
      if (typeof o === 'string') return out.join(''); if (o instanceof PyBytes) return new PyBytes(out); return isTuple(o) ? mkTuple(out) : out;
    }
    function setitem(o, k, v) {
      if (Array.isArray(o) && !isTuple(o)) { if (k && k.type === '__slice') { const lo = k.lower === null ? 0 : num(k.lower), hi = k.upper === null ? o.length : num(k.upper); o.splice(lo, hi - lo, ...toList(v)); return; } let i = num(k); if (i < 0) i += o.length; if (i < 0 || i >= o.length) err('IndexError', 'list assignment index out of range'); o[i] = v; return; }
      if (o instanceof Map) { dictSet(o, k, v); return; }
      if (o && o.__setitem__) return o.__setitem__(k, v);
      err('TypeError', `'${typeName(o)}' object does not support item assignment`);
    }

    function call(f, args, kw, line) {
      kw = kw || {};
      if (f instanceof PyFunc) return callUser(f, args, kw, line);
      if (f && typeof f === 'object' && f.__call__) return call(f.__call__, args, kw, line);
      if (typeof f === 'function' && f.__nat) { if (++depth > 400) { depth = 0; err('RecursionError', 'maximum recursion depth exceeded'); } try { const r = f(args, kw); return r === undefined ? null : r; } finally { depth--; } }
      err('TypeError', `'${typeName(f)}' object is not callable`);
    }
    function callUser(f, args, kw, line) {
      const env = new Env(f.closure, false); env.globalNames = f.globalNames || null;
      const ps = f.params; let ai = 0;
      for (const prm of ps) {
        if (prm.star === 1) { env.vars.set(prm.name, mkTuple(args.slice(ai))); ai = args.length; continue; }
        if (prm.star === 2) { const m = new Map(); Object.entries(kw).forEach(([k, v]) => m.set(k, v)); env.vars.set(prm.name, m); kw = {}; continue; }
        if (ai < args.length) env.vars.set(prm.name, args[ai++]);
        else if (prm.name in kw) { env.vars.set(prm.name, kw[prm.name]); }
        else if (prm.defVal !== undefined) env.vars.set(prm.name, prm.defVal);
        else err('TypeError', `${f.name}() missing required argument: '${prm.name}'`);
      }
      if (ai < args.length) err('TypeError', `${f.name}() takes ${ps.length} positional argument${ps.length === 1 ? '' : 's'} but ${args.length} ${args.length === 1 ? 'was' : 'were'} given`);
      for (const k of Object.keys(kw)) if (!ps.some(p => p.name === k)) err('TypeError', `${f.name}() got an unexpected keyword argument '${k}'`);
      if (++depth > 200) { depth = 0; err('RecursionError', 'maximum recursion depth exceeded'); }
      try {
        if (f.isLambda) return evalE(f.body, env);
        execBlock(f.body, env); return null;
      } catch (e) { if (e instanceof ReturnSig) return e.v; throw e; } finally { depth--; }
    }
    function makeFunc(node, env) {
      const params = node.params.map(p => ({ name: p.name, star: p.star, defVal: p.def ? evalE(p.def, env) : undefined }));
      const f = new PyFunc(node.name || '<lambda>', params, node.type === 'Lambda' ? node.body : node.body, env, node.type === 'Lambda');
      if (node.type !== 'Lambda') { const g = new Set(); (function scan(b) { b.forEach(s => { if (s.type === 'Global') s.names.forEach(n => g.add(n)); ['body', 'orelse', 'fin'].forEach(k => s[k] && Array.isArray(s[k]) && scan(s[k])); if (s.handlers) s.handlers.forEach(h => scan(h.body)); }); })(node.body); f.globalNames = g.size ? g : null; }
      return f;
    }

    function assign(t, v, env) {
      if (t.type === 'Name') return assignName(env, t.id, v);
      if (t.type === 'Attribute') return setattr(evalE(t.value, env), t.attr, v);
      if (t.type === 'Subscript') return setitem(evalE(t.value, env), evalIndex(t.index, env), v);
      if (t.type === 'Tuple' || t.type === 'List') { const vs = toList(v); if (vs.length !== t.elts.length) err('ValueError', vs.length > t.elts.length ? `too many values to unpack (expected ${t.elts.length})` : `not enough values to unpack (expected ${t.elts.length}, got ${vs.length})`); t.elts.forEach((e, i) => assign(e, vs[i], env)); return; }
      err('SyntaxError', 'cannot assign');
    }
    function evalIndex(ix, env) { if (ix.type === 'Slice') return { type: '__slice', lower: ix.lower ? evalE(ix.lower, env) : null, upper: ix.upper ? evalE(ix.upper, env) : null, step: ix.step ? evalE(ix.step, env) : null }; return evalE(ix, env); }

    function execBlock(stmts, env) { for (const s of stmts) exec(s, env); }
    function exec(s, env) {
      step(s.line);
      try { return execInner(s, env); }
      catch (e) { if (e instanceof PyErr && !e.line) e.line = s.line; throw e; }
    }
    function execInner(s, env) {
      switch (s.type) {
        case 'Expr': evalE(s.value, env); return;
        case 'Assign': { const v = evalE(s.value, env); s.targets.forEach(t => assign(t, v, env)); return; }
        case 'AugAssign': { const t = s.target; let cur, obj, idx;
          if (t.type === 'Name') cur = lookup(env, t.id, s.line); else if (t.type === 'Attribute') { obj = evalE(t.value, env); cur = getattr(obj, t.attr); } else { obj = evalE(t.value, env); idx = evalIndex(t.index, env); cur = getitem(obj, idx); }
          const rhs = evalE(s.value, env); let nv;
          if (s.op === '+' && Array.isArray(cur) && !isTuple(cur)) { cur.push(...toList(rhs)); nv = cur; } else nv = binop(s.op, cur, rhs);
          if (t.type === 'Name') assignName(env, t.id, nv); else if (t.type === 'Attribute') setattr(obj, t.attr, nv); else setitem(obj, idx, nv); return; }
        case 'If': { if (truthy(evalE(s.test, env))) execBlock(s.body, env); else if (s.orelse.length) execBlock(s.orelse, env); return; }
        case 'While': { while (true) { step(s.line); if (!truthy(evalE(s.test, env))) { execBlock(s.orelse, env); return; } try { execBlock(s.body, env); } catch (e) { if (e === BREAK) return; if (e === CONTINUE) continue; throw e; } } }
        case 'For': { const it = evalE(s.iter, env); let broke = false;
          const r = forEach(it, x => { step(s.line); assign(s.target, x, env); try { execBlock(s.body, env); } catch (e) { if (e === BREAK) { broke = true; return BREAK; } if (e === CONTINUE) return; throw e; } });
          if (!broke && r !== BREAK) execBlock(s.orelse, env); return; }
        case 'Break': throw BREAK; case 'Continue': throw CONTINUE; case 'Pass': return;
        case 'Return': throw new ReturnSig(s.value ? evalE(s.value, env) : null);
        case 'Def': { assignName(env, s.name, makeFunc(s, env)); return; }
        case 'Global': return;
        case 'Import': for (const n of s.names) { const m = H.importModule(n.name, s.line); if (n.as) assignName(env, n.as, m); else { const top = n.name.split('.')[0]; assignName(env, top, n.name.includes('.') ? H.importModule(top, s.line) : m); } } return;
        case 'ImportFrom': { const m = H.importModule(s.mod, s.line); for (const n of s.names) { if (n.name === '*') { Object.keys(m).filter(k => !k.startsWith('_')).forEach(k => assignName(env, k, m[k])); continue; } if (!(n.name in m)) throw new PyErr('ImportError', `cannot import name '${n.name}' from '${s.mod}'`, s.line); assignName(env, n.as || n.name, m[n.name]); } return; }
        case 'Raise': { if (!s.exc) throw new PyErr('RuntimeError', 'No active exception to re-raise', s.line); const v = evalE(s.exc, env); if (v && v.__exc) throw new PyErr(v.__exc, v.msg, s.line); if (typeof v === 'function' && v.__exctype) throw new PyErr(v.__exctype, '', s.line); throw new PyErr('TypeError', 'exceptions must derive from BaseException', s.line); }
        case 'Assert': if (!truthy(evalE(s.test, env))) throw new PyErr('AssertionError', s.msg ? str(evalE(s.msg, env)) : '', s.line); return;
        case 'Del': { const ts = s.targets.type === 'Tuple' ? s.targets.elts : [s.targets]; ts.forEach(t => { if (t.type === 'Name') { env.vars.delete(t.id); } else if (t.type === 'Subscript') { const o = evalE(t.value, env), k = evalIndex(t.index, env); if (Array.isArray(o)) { let i = num(k); if (i < 0) i += o.length; o.splice(i, 1); } else if (o instanceof Map) { if (!dictDel(o, k)) err('KeyError', repr(k)); } } }); return; }
        case 'Try': {
          try { try { execBlock(s.body, env); } catch (e) {
            if (!(e instanceof PyErr)) throw e;
            const h = s.handlers.find(h => { if (!h.etype) return true; const et = evalE(h.etype, env); const types = Array.isArray(et) ? et : [et]; return types.some(tp => tp && excMatches(e.type, tp.__exctype)); });
            if (!h) throw e; if (h.name) assignName(env, h.name, { __exc: e.type, msg: e.pmsg, __class__: e.type, __str__: () => e.pmsg, args: mkTuple([e.pmsg]) }); execBlock(h.body, env); return; }
            execBlock(s.orelse, env);
          } finally { if (s.fin.length) execBlock(s.fin, env); }
          return; }
      }
      err('SyntaxError', 'unsupported statement ' + s.type);
    }
    const EXC_PARENT = { ZeroDivisionError: 'ArithmeticError', ArithmeticError: 'Exception', KeyError: 'LookupError', IndexError: 'LookupError', LookupError: 'Exception', IndentationError: 'SyntaxError', ImportError: 'Exception', ModuleNotFoundError: 'ImportError', RecursionError: 'RuntimeError', NotImplementedError: 'RuntimeError' };
    function excMatches(type, want) { if (want === 'BaseException' || (want === 'Exception' && type !== 'KeyboardInterrupt')) return true; let t = type; while (t) { if (t === want) return true; t = EXC_PARENT[t] || (t !== 'Exception' ? 'Exception' : null); if (t === 'Exception' && want !== 'Exception') return false; } return false; }

    function evalE(e, env) {
      switch (e.type) {
        case 'Const': return e.v;
        case 'Name': return lookup(env, e.id, e.line);
        case 'JoinedStr': return e.parts.map(p => p.type === 'FormattedValue' ? (() => { const v = evalE(p.value, env); return p.conv === 'r' ? repr(v) : fmtSpec(v, p.spec); })() : (p.type === 'Const' ? (p.v instanceof PyBytes ? repr(p.v) : p.v) : str(evalE(p, env)))).join('');
        case 'BinOp': return binop(e.op, evalE(e.a, env), evalE(e.b, env));
        case 'Unary': { const v = evalE(e.e, env); if (!isNum(v)) err('TypeError', `bad operand type for unary ${e.op}: '${typeName(v)}'`); if (e.op === '-') return v instanceof PyFloat ? F(-v.v) : -num(v); if (e.op === '+') return v; return ~num(v); }
        case 'Not': return !truthy(evalE(e.e, env));
        case 'BoolOp': { const a = evalE(e.a, env); if (e.op === 'and') return truthy(a) ? evalE(e.b, env) : a; return truthy(a) ? a : evalE(e.b, env); }
        case 'Compare': { let left = evalE(e.first, env); for (let i = 0; i < e.ops.length; i++) { const right = evalE(e.rest[i], env); const op = e.ops[i]; let r;
          if (op === '==') r = eq(left, right); else if (op === '!=') r = !eq(left, right); else if (op === 'in') r = contains(right, left); else if (op === 'not in') r = !contains(right, left); else if (op === 'is') r = left === right || (left == null && right == null); else if (op === 'is not') r = !(left === right || (left == null && right == null)); else r = cmp(left, right, op);
          if (!r) return false; left = right; } return true; }
        case 'IfExp': return truthy(evalE(e.test, env)) ? evalE(e.body, env) : evalE(e.orelse, env);
        case 'Call': { const f = evalE(e.func, env); let args = e.args.map(a => evalE(a, env)); if (e.starArgs) args = args.concat(toList(evalE(e.starArgs, env))); const kw = {}; e.kw.forEach(k => kw[k.k] = evalE(k.v, env)); return call(f, args, kw, e.line); }
        case 'Attribute': return getattr(evalE(e.value, env), e.attr);
        case 'Subscript': return getitem(evalE(e.value, env), evalIndex(e.index, env));
        case 'Tuple': return mkTuple(e.elts.map(x => evalE(x, env)));
        case 'List': { const l = e.elts.map(x => evalE(x, env)); if (e.isSet) { const u = []; l.forEach(x => { if (!u.some(y => eq(x, y))) u.push(x); }); return u; } return l; }
        case 'Dict': { const m = new Map(); e.keys.forEach((k, i) => dictSet(m, evalE(k, env), evalE(e.vals[i], env))); return m; }
        case 'Lambda': return makeFunc(e, env);
        case 'ListComp': case 'GenList': { const out = []; const cenv = new Env(env, false); compLoop(e.gens, 0, cenv, () => out.push(evalE(e.elt, cenv))); return out; }
        case 'DictComp': { const m = new Map(); const cenv = new Env(env, false); compLoop(e.gens, 0, cenv, () => dictSet(m, evalE(e.elt.k, cenv), evalE(e.elt.v, cenv))); return m; }
        case 'Slice': return evalIndex(e, env);
      }
      err('SyntaxError', 'unsupported expression ' + e.type);
    }
    function compLoop(gens, i, env, fn) { if (i >= gens.length) return fn(); const g = gens[i]; forEach(evalE(g.iter, env), x => { step(g.iter.line); assign(g.target, x, env); if (g.ifs.every(c => truthy(evalE(c, env)))) compLoop(gens, i + 1, env, fn); }); }

    /* ------------------------------ builtins ------------------------------ */
    const B = (name, fn) => { const f = NAT(fn); f.__name = name; builtins.set(name, f); return f; };
    const excType = name => { const f = NAT((a) => ({ __exc: name, msg: a.length ? str(a[0]) : '', __class__: name, args: mkTuple(a), __str__() { return this.msg; } })); f.__exctype = name; f.__type = true; f.__name = name; builtins.set(name, f); };
    ['Exception', 'BaseException', 'ValueError', 'TypeError', 'NameError', 'KeyError', 'IndexError', 'ZeroDivisionError', 'OSError', 'RuntimeError', 'NotImplementedError', 'AttributeError', 'ImportError', 'AssertionError', 'KeyboardInterrupt', 'StopIteration', 'ArithmeticError', 'LookupError'].forEach(excType);
    B('print', (a, k) => { const sep = k.sep === undefined ? ' ' : (k.sep === null ? ' ' : str(k.sep)); const end = k.end === undefined ? '\n' : (k.end === null ? '\n' : str(k.end)); H.print(a.map(str).join(sep) + end); });
    B('range', (a) => { const n = a.map(x => { if (!isInt(x) && typeof x !== 'boolean') err('TypeError', `'${typeName(x)}' object cannot be interpreted as an integer`); return num(x); }); let start = 0, stop, stp = 1; if (n.length === 1) stop = n[0]; else { start = n[0]; stop = n[1]; if (n.length > 2) stp = n[2]; } if (stp === 0) err('ValueError', 'range() arg 3 must not be zero'); return { __range: true, start, stop, step: stp, __class__: 'range', __repr__: () => `range(${start}, ${stop}${stp !== 1 ? ', ' + stp : ''})`, get length() { return Math.max(0, Math.ceil((stop - start) / stp)); } }; });
    B('len', (a) => { const v = a[0]; if (typeof v === 'string' || Array.isArray(v)) return v.length; if (v instanceof Map) return v.size; if (v instanceof PyBytes) return v.a.length; if (v && v.__range) return v.length; err('TypeError', `object of type '${typeName(v)}' has no len()`); });
    B('int', (a) => { if (!a.length) return 0; const v = a[0]; if (typeof v === 'string') { const base = a[1] ? num(a[1]) : 10; const s = v.trim().replace(/_/g, ''); const r = base === 16 ? (/^(0x)?[0-9a-f]+$/i.test(s) ? parseInt(s, 16) : NaN) : base === 2 ? (/^(0b)?[01]+$/i.test(s) ? parseInt(s.replace(/^0b/i, ''), 2) : NaN) : (/^[+-]?\d+$/.test(s) ? parseInt(s, 10) : NaN); if (isNaN(r)) err('ValueError', `invalid literal for int() with base ${base}: ${repr(v)}`); return r; } if (isNum(v)) return Math.trunc(num(v)); err('TypeError', `int() argument must be a string or a number, not '${typeName(v)}'`); });
    B('float', (a) => { if (!a.length) return F(0); const v = a[0]; if (typeof v === 'string') { const r = parseFloat(v); if (isNaN(r) || !/^\s*[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?\s*$/i.test(v)) err('ValueError', `could not convert string to float: ${repr(v)}`); return F(r); } return F(num(v)); });
    B('str', (a) => a.length ? str(a[0]) : '');
    B('repr', (a) => repr(a[0]));
    B('bool', (a) => a.length ? truthy(a[0]) : false);
    B('abs', (a) => { const v = a[0]; return v instanceof PyFloat ? F(Math.abs(v.v)) : Math.abs(num(v)); });
    const minmax = (isMax) => (a, k) => { let items = a.length === 1 ? toList(a[0]) : a; if (!items.length) { if ('default' in k) return k.default; err('ValueError', `${isMax ? 'max' : 'min'}() arg is an empty sequence`); } const key = k.key; let best = items[0], bk = key ? call(key, [best]) : best; items.slice(1).forEach(x => { const xk = key ? call(key, [x]) : x; if (isMax ? cmp(xk, bk, '>') : cmp(xk, bk, '<')) { best = x; bk = xk; } }); return best; };
    B('max', minmax(true)); B('min', minmax(false));
    B('round', (a) => { const x = num(a[0]); if (a.length < 2 || a[1] === null) { const f = Math.floor(x), d = x - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); } const n = num(a[1]); const m = Math.pow(10, n); const r = Math.round((x + Math.sign(x) * Number.EPSILON) * m) / m; return isInt(a[0]) ? r : F(r); });
    B('sum', (a) => { let s = a.length > 1 ? a[1] : 0; forEach(a[0], x => { s = binop('+', s, x); }); return s; });
    B('hex', (a) => (num(a[0]) < 0 ? '-0x' : '0x') + Math.abs(num(a[0])).toString(16));
    B('bin', (a) => (num(a[0]) < 0 ? '-0b' : '0b') + Math.abs(num(a[0])).toString(2));
    B('oct', (a) => '0o' + num(a[0]).toString(8));
    B('chr', (a) => String.fromCharCode(num(a[0]))); B('ord', (a) => { if (typeof a[0] !== 'string' || a[0].length !== 1) err('TypeError', 'ord() expected a character'); return a[0].charCodeAt(0); });
    B('list', (a) => a.length ? toList(a[0]) : []);
    B('tuple', (a) => mkTuple(a.length ? toList(a[0]) : []));
    B('dict', (a, k) => { const m = new Map(); if (a.length) { if (a[0] instanceof Map) a[0].forEach((v, kk) => m.set(kk, v)); else toList(a[0]).forEach(p => { const q = toList(p); dictSet(m, q[0], q[1]); }); } Object.entries(k).forEach(([kk, v]) => dictSet(m, kk, v)); return m; });
    B('set', (a) => { const u = []; if (a.length) toList(a[0]).forEach(x => { if (!u.some(y => eq(x, y))) u.push(x); }); return u; });
    B('enumerate', (a, k) => { const st = a.length > 1 ? num(a[1]) : (k.start ? num(k.start) : 0); return toList(a[0]).map((x, i) => mkTuple([i + st, x])); });
    B('zip', (a) => { const ls = a.map(toList); const n = Math.min(...ls.map(l => l.length)); const out = []; for (let i = 0; i < n; i++) out.push(mkTuple(ls.map(l => l[i]))); return out; });
    B('sorted', (a, k) => { const l = toList(a[0]); const key = k.key; l.sort((x, y) => { const xk = key ? call(key, [x]) : x, yk = key ? call(key, [y]) : y; return cmp(xk, yk, '<') ? -1 : eq(xk, yk) ? 0 : 1; }); if (k.reverse && truthy(k.reverse)) l.reverse(); return l; });
    B('reversed', (a) => toList(a[0]).reverse());
    B('map', (a) => toList(a[1]).map(x => call(a[0], [x])));
    B('filter', (a) => toList(a[1]).filter(x => a[0] === null ? truthy(x) : truthy(call(a[0], [x]))));
    B('any', (a) => toList(a[0]).some(truthy)); B('all', (a) => toList(a[0]).every(truthy));
    B('isinstance', (a) => { const tn = typeName(a[0]); const types = Array.isArray(a[1]) ? a[1] : [a[1]]; return types.some(t => t && (t.__name === tn || (t.__name === 'int' && tn === 'bool') || (t.__name === 'float' && false))); });
    B('type', (a) => { const tn = typeName(a[0]); return builtins.get(tn) || { __class__: 'type', __repr__: () => `<class '${tn}'>` }; });
    B('input', (a) => H.input ? H.input(a.length ? str(a[0]) : '') : err('RuntimeError', 'input() is not available on a microcontroller'));
    B('pow', (a) => binop('**', a[0], a[1])); B('divmod', (a) => mkTuple([binop('//', a[0], a[1]), binop('%', a[0], a[1])]));
    B('id', (a) => 1); B('hash', (a) => 1);
    B('help', () => { H.print('Help is not available on this board: ask Mrs Sarra!\n'); });
    builtins.set('None', null); builtins.set('True', true); builtins.set('False', false);
    builtins.get('int').__name = 'int'; builtins.get('float').__name = 'float'; builtins.get('str').__name = 'str'; builtins.get('list').__name = 'list'; builtins.get('bool').__name = 'bool'; builtins.get('dict').__name = 'dict'; builtins.get('tuple').__name = 'tuple';

    return {
      G, builtins, run(src) { const ast = parse(src); execBlock(ast, G); },
      call, getattr, curLine: () => curLine
    };
  }

  /* ------------------------------ str/list/dict methods ------------------------------ */
  const sOf = v => str(v);
  const STR_METHODS = {
    upper: s => s.toUpperCase(), lower: s => s.toLowerCase(), title: s => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()), capitalize: s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    strip: (s, a) => a.length && a[0] !== null ? s.replace(new RegExp(`^[${a[0].replace(/[\]\\^-]/g, '\\$&')}]+|[${a[0].replace(/[\]\\^-]/g, '\\$&')}]+$`, 'g'), '') : s.trim(), lstrip: s => s.replace(/^\s+/, ''), rstrip: (s, a) => a.length ? s.replace(new RegExp(`[${a[0].replace(/[\]\\^-]/g, '\\$&')}]+$`), '') : s.replace(/\s+$/, ''),
    split: (s, a) => { if (!a.length || a[0] === null) return s.trim() ? s.trim().split(/\s+/) : []; const parts = s.split(a[0]); if (a.length > 1 && num(a[1]) >= 0) { const n = num(a[1]); return parts.slice(0, n).concat(parts.length > n ? [parts.slice(n).join(a[0])] : []); } return parts; },
    join: (s, a) => { const items = Array.isArray(a[0]) ? a[0] : typeof a[0] === 'string' ? [...a[0]] : a[0] instanceof Map ? [...a[0].keys()] : []; if (items.some(x => typeof x !== 'string')) throw new PyErr('TypeError', 'sequence item: expected str instance'); return items.join(s); },
    replace: (s, a) => s.split(sOf(a[0])).join(sOf(a[1])), startswith: (s, a) => s.startsWith(a[0]), endswith: (s, a) => s.endsWith(a[0]),
    find: (s, a) => s.indexOf(a[0]), index: (s, a) => { const i = s.indexOf(a[0]); if (i < 0) throw new PyErr('ValueError', 'substring not found'); return i; }, count: (s, a) => s.split(a[0]).length - 1,
    isdigit: s => /^\d+$/.test(s), isalpha: s => /^[A-Za-z]+$/.test(s), isalnum: s => /^[A-Za-z0-9]+$/.test(s), isspace: s => /^\s+$/.test(s), isupper: s => s === s.toUpperCase() && /[A-Z]/.test(s), islower: s => s === s.toLowerCase() && /[a-z]/.test(s),
    format: (s, a, k) => { let i = 0; return s.replace(/\{\{|\}\}|\{([^{}:!]*)(?:![rs])?(?::([^{}]*))?\}/g, (m, name, spec) => { if (m === '{{') return '{'; if (m === '}}') return '}'; let v; if (name === '' || name === undefined) v = a[i++]; else if (/^\d+$/.test(name)) v = a[+name]; else v = k[name]; return fmtSpec(v, spec); }); },
    encode: s => new PyBytes([...s].map(c => c.charCodeAt(0))), zfill: (s, a) => s.padStart(num(a[0]), '0'), center: (s, a) => { const w = num(a[0]); const p = Math.max(0, w - s.length); return ' '.repeat(Math.floor(p / 2)) + s + ' '.repeat(Math.ceil(p / 2)); }, ljust: (s, a) => s.padEnd(num(a[0])), rjust: (s, a) => s.padStart(num(a[0]))
  };
  const LIST_METHODS = {
    append: (l, a) => { l.push(a[0]); return null; }, extend: (l, a) => { l.push(...(Array.isArray(a[0]) ? a[0] : typeof a[0] === 'string' ? [...a[0]] : [])); return null; },
    insert: (l, a) => { l.splice(num(a[0]), 0, a[1]); return null; }, pop: (l, a) => { if (!l.length) throw new PyErr('IndexError', 'pop from empty list'); let i = a.length ? num(a[0]) : l.length - 1; if (i < 0) i += l.length; return l.splice(i, 1)[0]; },
    remove: (l, a) => { const i = l.findIndex(x => eq(x, a[0])); if (i < 0) throw new PyErr('ValueError', 'list.remove(x): x not in list'); l.splice(i, 1); return null; },
    index: (l, a) => { const i = l.findIndex(x => eq(x, a[0])); if (i < 0) throw new PyErr('ValueError', `${repr(a[0])} is not in list`); return i; }, count: (l, a) => l.filter(x => eq(x, a[0])).length,
    reverse: l => { l.reverse(); return null; }, clear: l => { l.length = 0; return null; }, copy: l => l.slice(),
    sort: (l, a, k) => { l.sort((x, y) => cmp(x, y, '<') ? -1 : eq(x, y) ? 0 : 1); if (k.reverse && truthy(k.reverse)) l.reverse(); return null; }
  };
  const TUPLE_METHODS = { index: LIST_METHODS.index, count: LIST_METHODS.count };
  const DICT_METHODS = {
    get: (d, a) => { const r = dictGet(d, a[0]); return r.found ? r.v : (a.length > 1 ? a[1] : null); }, keys: d => [...d.keys()], values: d => [...d.values()], items: d => [...d.entries()].map(e => mkTuple(e)),
    pop: (d, a) => { const r = dictGet(d, a[0]); if (r.found) { dictDel(d, a[0]); return r.v; } if (a.length > 1) return a[1]; throw new PyErr('KeyError', repr(a[0])); }, update: (d, a) => { a[0].forEach((v, k) => dictSet(d, k, v)); return null; }, clear: d => { d.clear(); return null; }, copy: d => new Map(d), setdefault: (d, a) => { const r = dictGet(d, a[0]); if (r.found) return r.v; dictSet(d, a[0], a.length > 1 ? a[1] : null); return a.length > 1 ? a[1] : null; }
  };

  VL.PyCore = { Interp, parse, tokenize, PyErr, PyFloat, F, num, isNum, isInt, str, repr, truthy, mkTuple, isTuple, PyBytes, PyModule, NAT, StopSig, typeName, dictGet, dictSet, eq };
})();
