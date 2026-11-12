/* =========================================================================
   terminal.js : practice Linux terminal (simulated Raspberry Pi OS shell)
   Virtual file system + common commands. Clearly labelled as practice.
   ========================================================================= */
(function () {
  const esc = s => VL.esc(s);
  class Terminal {
    constructor(host, o = {}) {
      this.host = host; this.o = o; this.hist = []; this.hi = 0; this.user = 'student'; this.hostn = 'raspberrypi';
      this.fs = { type: 'd', c: { home: { type: 'd', c: { student: { type: 'd', c: { 'Desktop': { type: 'd', c: {} }, 'Documents': { type: 'd', c: { 'notes.txt': { type: 'f', d: 'Robotics club meets on Wednesday.\n' } } }, 'hello.py': { type: 'f', d: 'print("Hello from the Raspberry Pi!")\n' }, 'readings.csv': { type: 'f', d: 'time,temp_c,light\n08:00,19.5,120\n09:00,21.0,340\n10:00,23.5,610\n11:00,25.0,880\n12:00,26.5,940\n13:00,26.0,910\n14:00,25.5,700\n15:00,24.0,520\n' }, 'log_temp.py': { type: 'f', d: 'temps = [22.5, 23.0, 23.4, 24.1]\nfor i, t in enumerate(temps):\n    print(f"{i},{t}")\n' } } } } }, etc: { type: 'd', c: { hostname: { type: 'f', d: 'raspberrypi\n' }, 'os-release': { type: 'f', d: 'PRETTY_NAME="Raspberry Pi OS (64-bit, Debian bookworm)"\n' } } }, tmp: { type: 'd', c: {} }, usr: { type: 'd', c: { bin: { type: 'd', c: {} } } } } };
      this.cwd = ['home', 'student'];
      host.innerHTML = `<div class="term"><div class="term-bar"><i></i><i></i><i></i><span>student@raspberrypi: ~ <em>practice terminal (simulated)</em></span></div><div class="term-out" tabindex="0"></div><div class="term-in"><span class="pr"></span><input spellcheck="false" autocomplete="off" aria-label="terminal command"></div></div>`;
      this.out = host.querySelector('.term-out'); this.inp = host.querySelector('input');
      this.inp.onkeydown = e => { if (e.key === 'Enter') { const c = this.inp.value; this.inp.value = ''; this.exec(c); } else if (e.key === 'ArrowUp') { e.preventDefault(); if (this.hi > 0) this.inp.value = this.hist[--this.hi] || ''; } else if (e.key === 'ArrowDown') { e.preventDefault(); this.inp.value = this.hist[++this.hi] || ''; if (this.hi > this.hist.length) this.hi = this.hist.length; } else if (e.key === 'Tab') { e.preventDefault(); this.complete(); } };
      host.querySelector('.term').onclick = () => this.inp.focus();
      this.print(`Welcome to the Raspberry Pi practice terminal 🍓\nType <b>help</b> to see the commands you can practise.\n`, true);
      this.prompt();
    }
    get path() { return '/' + this.cwd.join('/'); }
    pshort() { const p = this.path; return p.startsWith('/home/student') ? '~' + p.slice(13) : p; }
    prompt() { this.host.querySelector('.pr').innerHTML = `<b class="g">${this.user}@${this.hostn}</b>:<b class="b">${esc(this.pshort())}</b>$`; }
    print(t, html) { const d = document.createElement('div'); if (html) d.innerHTML = t; else d.textContent = t; this.out.appendChild(d); this.out.scrollTop = this.out.scrollHeight; }
    resolve(p) { if (!p) return this.cwd.slice(); let parts = p.startsWith('/') ? [] : this.cwd.slice(); if (p.startsWith('~')) { parts = ['home', 'student']; p = p.slice(1); } p.split('/').filter(Boolean).forEach(s => { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); }); return parts; }
    node(parts) { let n = this.fs; for (const s of parts) { if (!n || n.type !== 'd' || !n.c[s]) return null; n = n.c[s]; } return n; }
    parent(parts) { return this.node(parts.slice(0, -1)); }
    complete() { const v = this.inp.value; const m = v.match(/(\S*)$/); const word = m[1]; const dirp = word.includes('/') ? word.slice(0, word.lastIndexOf('/') + 1) : ''; const n = this.node(this.resolve(dirp || '.')); if (!n || n.type !== 'd') return; const opts = Object.keys(n.c).filter(k => k.startsWith(word.slice(dirp.length))); if (opts.length === 1) this.inp.value = v.slice(0, v.length - word.length) + dirp + opts[0] + (n.c[opts[0]].type === 'd' ? '/' : ''); else if (opts.length) this.print(opts.join('  ')); }
    exec(line) {
      this.print(`<b class="g">${this.user}@${this.hostn}</b>:<b class="b">${esc(this.pshort())}</b>$ ${esc(line)}`, true);
      if (line.trim()) { this.hist.push(line); this.hi = this.hist.length; }
      let redir = null, app = false; const m = line.match(/^(.*?)\s*(>>?)\s*(\S+)\s*$/); if (m && !/^\s*echo\s+["'].*>/.test(line.replace(/>>?\s*\S+\s*$/, ''))) { line = m[1]; app = m[2] === '>>'; redir = m[3]; }
      const args = (line.match(/"[^"]*"|'[^']*'|\S+/g) || []).map(a => a.replace(/^["']|["']$/g, ''));
      let cmd = args.shift(); let sudo = false; if (cmd === 'sudo') { sudo = true; cmd = args.shift(); }
      let out = '';
      const err = s => { out += s + '\n'; };
      const C = {
        help: () => { out += 'pwd  ls [-l] [dir]  cd <dir>  mkdir <dir>  touch <file>  cat <file>  echo <text> [> file]\nrm <file>  rm -r <dir>  cp <a> <b>  mv <a> <b>  nano <file>  python3 <file.py>  clear\nwhoami  hostname [-I]  date  uname -a  history  df -h  free -h  sudo apt update  pinout\nping [-c 4] <host>  ip a  ifconfig  ssh user@host  exit  chmod +x <file>  head/tail [-n N] <file>  wc -l <file>  grep <word> <file>\n'; },
        pwd: () => { out += this.path + '\n'; },
        ls: () => { const long = args.includes('-l') || args.includes('-la'); const p = args.find(a => !a.startsWith('-')); const n = this.node(this.resolve(p)); if (!n) return err(`ls: cannot access '${p}': No such file or directory`); if (n.type === 'f') { out += p + '\n'; return; } const ks = Object.keys(n.c).sort(); out += long ? ks.map(k => `${n.c[k].type === 'd' ? 'drwxr-xr-x' : (n.c[k].mode && /x/.test(n.c[k].mode) ? '-rwxr-xr-x' : '-rw-r--r--')+''} 1 student student ${String(n.c[k].type === 'd' ? 4096 : n.c[k].d.length).padStart(5)} Nov 11 10:00 ${k}${n.c[k].type === 'd' ? '/' : ''}`).join('\n') + (ks.length ? '\n' : '') : ks.map(k => n.c[k].type === 'd' ? k + '/' : k).join('  ') + (ks.length ? '\n' : ''); },
        cd: () => { const t = this.resolve(args[0] || '~'); const n = this.node(t); if (!n) return err(`cd: ${args[0]}: No such file or directory`); if (n.type !== 'd') return err(`cd: ${args[0]}: Not a directory`); this.cwd = t; },
        mkdir: () => { if (!args.length) return err('mkdir: missing operand'); args.filter(a => !a.startsWith('-')).forEach(a => { const t = this.resolve(a), p = this.parent(t); if (!p) return err(`mkdir: cannot create directory '${a}': No such file or directory`); if (p.c[t[t.length - 1]]) return err(`mkdir: cannot create directory '${a}': File exists`); p.c[t[t.length - 1]] = { type: 'd', c: {} }; }); },
        touch: () => { args.forEach(a => { const t = this.resolve(a), p = this.parent(t); if (!p) return err(`touch: cannot touch '${a}': No such file or directory`); if (!p.c[t[t.length - 1]]) p.c[t[t.length - 1]] = { type: 'f', d: '' }; }); },
        cat: () => { args.forEach(a => { const n = this.node(this.resolve(a)); if (!n) return err(`cat: ${a}: No such file or directory`); if (n.type === 'd') return err(`cat: ${a}: Is a directory`); out += n.d; }); },
        echo: () => { out += args.join(' ') + '\n'; },
        rm: () => { const rec = args.includes('-r') || args.includes('-rf'); args.filter(a => !a.startsWith('-')).forEach(a => { const t = this.resolve(a), p = this.parent(t), n = this.node(t); if (!n) return err(`rm: cannot remove '${a}': No such file or directory`); if (n.type === 'd' && !rec) return err(`rm: cannot remove '${a}': Is a directory (use rm -r)`); delete p.c[t[t.length - 1]]; }); },
        cp: () => { const [a, b] = args; const n = this.node(this.resolve(a)); if (!n || n.type !== 'f') return err(`cp: cannot stat '${a}': No such file`); let t = this.resolve(b); const tn = this.node(t); if (tn && tn.type === 'd') t = t.concat(t.length ? [this.resolve(a).pop()] : []); const p = this.parent(t); if (!p) return err('cp: target directory does not exist'); p.c[t[t.length - 1]] = { type: 'f', d: n.d }; },
        mv: () => { const [a, b] = args; const sa = this.resolve(a), n = this.node(sa); if (!n) return err(`mv: cannot stat '${a}': No such file or directory`); let t = this.resolve(b); const tn = this.node(t); if (tn && tn.type === 'd') t = t.concat([sa[sa.length - 1]]); const p = this.parent(t); if (!p) return err('mv: target directory does not exist'); p.c[t[t.length - 1]] = n; delete this.parent(sa).c[sa[sa.length - 1]]; },
        clear: () => { this.out.innerHTML = ''; },
        whoami: () => { out += (sudo ? 'root' : this.user) + '\n'; },
        hostname: () => { out += (args[0] === '-I' ? '192.168.4.37' : this.hostn) + '\n'; if (args[0] === '-I') this.sawIP = true; },
        date: () => { out += new Date().toString() + '\n'; },
        uname: () => { out += args.includes('-a') ? 'Linux raspberrypi 6.6.51+rpt-rpi-2712 #1 SMP PREEMPT Debian aarch64 GNU/Linux\n' : 'Linux\n'; },
        history: () => { out += this.hist.map((h, i) => `  ${i + 1}  ${h}`).join('\n') + '\n'; },
        df: () => { out += 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/mmcblk0p2   29G  6.1G   22G  22% /\n'; },
        free: () => { out += '               total        used        free\nMem:           7.9Gi       1.2Gi       6.1Gi\n'; },
        apt: () => { if (!sudo) return err('E: Could not open lock file - are you root? (try: sudo apt ' + args.join(' ') + ')'); out += args[0] === 'update' ? 'Hit:1 http://deb.debian.org/debian bookworm InRelease\nReading package lists... Done\n(practice terminal: no real download)\n' : args[0] === 'install' ? `Reading package lists... Done\n${args.slice(1).join(' ')} is already the newest version (practice).\n` : 'apt: try "sudo apt update" or "sudo apt install <package>"\n'; },
        pinout: () => { out += 'Raspberry Pi 5 · 40-pin header: 3V3(1) 5V(2) GPIO2(3) 5V(4) GPIO3(5) GND(6) GPIO4(7) GPIO14(8) …\nOpen the header explorer in this lesson for the full map.\n'; },
        nano: () => { const a = args[0]; if (!a) return err('nano: give a file name'); const t = this.resolve(a), p = this.parent(t); if (!p) return err('nano: directory does not exist'); const n = p.c[t[t.length - 1]] || { type: 'f', d: '' };
          VL.ui.modal({ title: `GNU nano (practice) · ${esc(a)}`, wide: true, body: `<textarea class="inp nano" rows="12" spellcheck="false">${esc(n.d)}</textarea><p class="muted small">In real nano: Ctrl+O saves, Ctrl+X exits.</p>`, buttons: [{ label: 'Exit without saving' }, { label: 'Save (Ctrl+O)', primary: true, onClick: r => { n.d = r.querySelector('.nano').value; if (!n.d.endsWith('\n')) n.d += '\n'; p.c[t[t.length - 1]] = n; this.print(`[ Wrote ${n.d.split('\n').length - 1} lines ]`); this.check(); } }] }); },
        python3: async () => { const a = args[0]; if (!a || a === '--version') { out += 'Python 3.11.2\n'; return; } const n = this.node(this.resolve(a)); if (!n) return err(`python3: can't open file '${a}': [Errno 2] No such file or directory`); if (!redir) this.print('(running with the lab Python engine…)'); try { const r = await VL.Py.runPlain(n.d, []); const txt = r.serial.map(s => s.text).join(''); const tb = r.error ? `Traceback (most recent call last):\n  File "${a}", line ${r.error.line}\n${r.error.type}: ${r.error.msg}\n` : ''; if (redir && txt) { const t = this.resolve(redir), p = this.parent(t); if (p) { const f = p.c[t[t.length - 1]]; p.c[t[t.length - 1]] = { type: 'f', d: (app && f && f.type === 'f' ? f.d : '') + txt }; } if (tb) this.print(tb); } else this.print(txt + tb); this.ran = (this.ran || []).concat([a]); this.check(); } catch (e) { this.print('Python engine unavailable.'); } }
      };
      const fileOf = a => { const n = a && this.node(this.resolve(a)); return n && n.type === 'f' ? n : null; };
      Object.assign(C, {
        ping: () => { let a = args.filter(x => !/^-/.test(x)); const host = a[a.length - 1]; if (!host) return err('ping: usage error: Destination address required'); const ip = /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : host === 'localhost' ? '127.0.0.1' : '192.168.4.' + (10 + (host.length * 7) % 200); const n = +(args[args.indexOf('-c') + 1]) || 4; out += `PING ${host} (${ip}) 56(84) bytes of data.\n`; const ts = []; for (let i = 0; i < Math.min(n, 10); i++) { const t = +(host === 'localhost' ? 0.05 + i * 0.01 : 2.1 + ((i * 37) % 9) / 10).toFixed(2); ts.push(t); out += `64 bytes from ${ip}: icmp_seq=${i + 1} ttl=64 time=${t} ms\n`; } out += `\n--- ${host} ping statistics ---\n${ts.length} packets transmitted, ${ts.length} received, 0% packet loss\nrtt min/avg/max = ${Math.min(...ts)}/${(ts.reduce((x, y) => x + y, 0) / ts.length).toFixed(2)}/${Math.max(...ts)} ms\n`; this.pinged = (this.pinged || []).concat(host); },
        ip: () => { out += '1: lo: <LOOPBACK,UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: wlan0: <BROADCAST,MULTICAST,UP> mtu 1500\n    link/ether d8:3a:dd:12:34:56\n    inet 192.168.4.37/24 brd 192.168.4.255 scope global wlan0\n'; this.sawIP = true; },
        ifconfig: () => { out += 'wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 192.168.4.37  netmask 255.255.255.0  broadcast 192.168.4.255\n'; this.sawIP = true; },
        ssh: () => { const t = args.find(x => !/^-/.test(x)); if (!t) return err('usage: ssh user@host'); out += `${t.includes('@') ? '' : 'student@'}${t}'s password: ********\nLinux ${t.split('@').pop()} 6.6.31-v8+ aarch64\n(simulated) You are now logged in remotely. Type exit to come back.\n`; this.sshTo = t; },
        exit: () => { out += this.sshTo ? 'Connection closed.\n' : 'logout\n'; this.sshTo = null; },
        chmod: () => { const [mode, f] = args; const n = fileOf(f); if (!mode || !n) return err(`chmod: cannot access '${f || ''}': No such file or directory`); n.mode = mode; this.chmodded = (this.chmodded || []).concat(f); },
        head: () => { const k = args.indexOf('-n'); const nn = k >= 0 ? +args[k + 1] : 10; const f = fileOf(args.filter((x, i) => i !== k && i !== k + 1)[0]); if (!f) return err('head: cannot open file'); out += f.d.split('\n').slice(0, nn).join('\n') + '\n'; },
        tail: () => { const k = args.indexOf('-n'); const nn = k >= 0 ? +args[k + 1] : 10; const f = fileOf(args.filter((x, i) => i !== k && i !== k + 1)[0]); if (!f) return err('tail: cannot open file'); const L = f.d.replace(/\n$/, '').split('\n'); out += L.slice(-nn).join('\n') + '\n'; },
        wc: () => { const f = fileOf(args.filter(x => !/^-/.test(x))[0]); if (!f) return err('wc: cannot open file'); const L = f.d.replace(/\n$/, '').split('\n').length; out += args.includes('-l') ? `${L} ${args.filter(x => !/^-/.test(x))[0]}\n` : `${L} ${f.d.split(/\s+/).filter(Boolean).length} ${f.d.length}\n`; this.counted = true; },
        grep: () => { const [pat, fn] = args; const f = fileOf(fn); if (!pat || !f) return err('usage: grep <word> <file>'); out += f.d.split('\n').filter(l => l.includes(pat)).join('\n') + '\n'; this.grepped = pat; }
      });
      C.python = C.python3;
      if (!cmd) { this.prompt(); return; }
      if (!C[cmd]) err(`${cmd}: command not found${/^(dir|cls|copy|del|move|type)$/.test(cmd) ? ' (that is a Windows command; try ' + { dir: 'ls', cls: 'clear', copy: 'cp', del: 'rm', move: 'mv', type: 'cat' }[cmd] + ')' : ''}`);
      else { const r = C[cmd](); if (r && r.then) { r.then(() => this.prompt()); return; } }
      if (redir && out) { const t = this.resolve(redir), p = this.parent(t); if (!p) err(`bash: ${redir}: No such file or directory`); else { const f = p.c[t[t.length - 1]]; if (f && f.type === 'd') err(`bash: ${redir}: Is a directory`); else p.c[t[t.length - 1]] = { type: 'f', d: (app && f ? f.d : '') + out }; out = ''; } }
      if (out) this.print(out.replace(/\n$/, ''));
      this.prompt(); this.check();
    }
    check() { this.o.onChange && this.o.onChange(this); }
    exists(path, type) { const n = this.node(this.resolve(path)); return !!n && (!type || n.type === type); }
    read(path) { const n = this.node(this.resolve(path)); return n && n.type === 'f' ? n.d : null; }
  }
  VL.Terminal = Terminal;
})();
