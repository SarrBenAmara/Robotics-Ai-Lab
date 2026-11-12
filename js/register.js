/* =========================================================================
   register.js : student login / registration gate (mandatory), automatic
   resume of each student's saved progress, teacher activity view and
   optional automatic notifications through the teacher's Google Form.
   ========================================================================= */
(function () {
  const R = VL.Register = { settings: null };
  const S = () => VL.Store, esc = s => VL.esc(s);
  const when = t => t ? new Date(t).toLocaleString() : '—';
  const ago = t => { if (!t) return '—'; const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
  R.load = async () => {
    const db = S().db; if (!db) { R.settings = {}; return R.settings; }
    try { const snap = await Promise.race([db.doc('class/settings').get(), new Promise(r => setTimeout(() => r(null), 8000))]); R.settings = snap && snap.exists ? snap.data() : {}; } catch (e) { R.settings = {}; }
    return R.settings;
  };
  R.saveSettings = async data => { await S().db.doc('class/settings').set(Object.assign({}, R.settings || {}, data)); R.settings = Object.assign({}, R.settings || {}, data); };

  /* ---------- automatic notification through the teacher's Google Form ---------- */
  R.notify = async (type, text) => {
    if (R.settings === null) await R.load();
    const u0 = (R.settings || {}).formUrl; if (!u0) return false;
    const reg = S().p.reg || {}; const date = new Date().toLocaleString();
    const hasEvent = /EVENT/.test(u0);
    const link = u0.replace(/NAME/g, encodeURIComponent(reg.name || S().p.name || 'Student')).replace(/GROUP/g, encodeURIComponent(reg.group || '')).replace(/DATE/g, encodeURIComponent(hasEvent ? date : date + ' · ' + text)).replace(/EVENT/g, encodeURIComponent(text));
    try {
      const u = new URL(link); if (!/docs\.google\.com$/.test(u.hostname) || !/\/forms\//.test(u.pathname)) return false;
      const action = u.origin + u.pathname.replace(/\/viewform.*$/, '/formResponse');
      let fr = document.getElementById('reg-frame'); if (!fr) { fr = document.createElement('iframe'); fr.name = fr.id = 'reg-frame'; fr.hidden = true; document.body.appendChild(fr); }
      const f = document.createElement('form'); f.method = 'POST'; f.action = action; f.target = 'reg-frame'; f.hidden = true;
      u.searchParams.forEach((v, k) => { if (!/^entry\./.test(k)) return; const i = document.createElement('input'); i.name = k; i.value = v; f.appendChild(i); });
      document.body.appendChild(f); f.submit(); setTimeout(() => f.remove(), 3000); return true;
    } catch (e) { return false; }
  };

  /* ---------- account gate (GitHub Pages + Firebase): username + password ---------- */
  R.cloud = () => !!(VL.Cloud && VL.Cloud.enabled());
  R.accountGate = (opts = {}) => {
    const old = document.getElementById('login-gate'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'login-gate'; let mode = 'in';
    el.innerHTML = `<div class="lg-card glass" role="dialog" aria-modal="true" aria-labelledby="lg-t">
      <img src="img/sarra-badge.webp" alt="Mrs Sarra" class="lg-av">
      <h2 id="lg-t">Welcome to the lab!</h2>
      <div class="lg-tabs"><button class="lg-tab on" data-m="in">Log in</button><button class="lg-tab" data-m="new">Create my account</button></div>
      <p class="lg-say">Log in with your username and password. Your lessons, badges and projects come back on any computer, tablet or phone.</p>
      <label>Username<input class="inp lg-n lg-u" maxlength="24" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="e.g. yasmine.b"></label>
      <label>Password<input class="inp lg-pw" type="password" maxlength="60" autocomplete="current-password" placeholder="at least 6 characters"></label>
      <div class="lg-newf" hidden>
        <label>Repeat the password<input class="inp lg-pw2" type="password" maxlength="60" autocomplete="new-password"></label>
        <label>First and last name<input class="inp lg-full" maxlength="60" autocomplete="off" placeholder="e.g. Yasmine Ben Ali"></label>
        <label>Class / group<input class="inp lg-g" maxlength="40" autocomplete="off" placeholder="e.g. 2nd year, group B"></label>
      </div>
      <div class="lg-err" hidden></div>
      <button class="btn-primary lg-go">Log in</button>
      ${opts.switch ? '<div class="row lg-alt"><button class="btn-sm lg-out">Log out</button><button class="btn-sm lg-cancel">Cancel</button></div>' : ''}
      <p class="muted small">Forgot your password? Ask your teacher.</p>
    </div>`;
    document.body.appendChild(el); document.body.classList.add('gated');
    const q = c => el.querySelector(c), u = q('.lg-u'), pw = q('.lg-pw'), er = q('.lg-err'), go = q('.lg-go');
    const err = (t, f) => { er.hidden = false; er.textContent = t; if (f) { f.classList.add('bad'); f.focus(); } };
    const setMode = m => { mode = m; el.querySelectorAll('.lg-tab').forEach(b => b.classList.toggle('on', b.dataset.m === m)); q('.lg-newf').hidden = m !== 'new'; go.textContent = m === 'new' ? 'Create my account and start' : 'Log in'; pw.autocomplete = m === 'new' ? 'new-password' : 'current-password'; q('.lg-say').textContent = m === 'new' ? 'Choose a username and a password you will remember. Write them down: you need them on every device.' : 'Log in with your username and password. Your lessons, badges and projects come back on any computer, tablet or phone.'; er.hidden = true; };
    el.querySelectorAll('.lg-tab').forEach(b => b.onclick = () => setMode(b.dataset.m));
    setTimeout(() => u.focus(), 50);
    const submit = async () => {
      el.querySelectorAll('.bad').forEach(x => x.classList.remove('bad')); er.hidden = true;
      const name = VL.Cloud.clean(u.value), pass = pw.value;
      if (name.length < 3 || name !== u.value.trim().toLowerCase()) return err('Username: at least 3 characters, only letters, numbers, dot, dash or underscore (no spaces).', u);
      if (pass.length < 6) return err('The password must have at least 6 characters.', pw);
      let full = '', group = '';
      if (mode === 'new') {
        if (q('.lg-pw2').value !== pass) return err('The two passwords are different.', q('.lg-pw2'));
        full = q('.lg-full').value.trim().replace(/\s+/g, ' '); group = q('.lg-g').value.trim();
        if (full.length < 3 || !/[a-zA-ZÀ-ɏ؀-ۿ]/.test(full)) return err('Please type your real first and last name.', q('.lg-full'));
        if (!group) return err('Please type your class or group.', q('.lg-g'));
      }
      go.disabled = true; go.textContent = 'Please wait…';
      const ready = await VL.Cloud.init();
      if (!ready) { go.disabled = false; setMode(mode); return err('Cannot reach the class database. Check the internet connection and try again.'); }
      try { await S().flush(); } catch (e) { }
      const r = mode === 'new' ? await VL.Cloud.create(name, pass) : await VL.Cloud.signIn(name, pass);
      if (!r.ok) { go.disabled = false; setMode(mode); return err(r.msg, pw); }
      await S().attachCloudUser();
      const P = S().p, now = Date.now();
      if (mode === 'new' || !P.reg) P.reg = Object.assign({ at: now }, P.reg || {}, { name: full || P.name || name, group: group || (P.reg || {}).group || '' });
      P.key = name; P.name = P.reg.name; P.lastLogin = now; P.logins = (P.logins || 0) + 1;
      S().event('login', `${P.name} logged in`); S().save(); await S().flush();
      try { sessionStorage.setItem('vl-logged', P.key); } catch (e) { }
      el.remove(); document.body.classList.remove('gated');
      const first = esc(P.name.split(' ')[0]);
      VL.ui.toast(mode === 'new' ? `Welcome, ${first}! Your account is ready and your progress is saved online.` : `Welcome back, ${first}! Continuing where you stopped.`);
      const last = P.lastRoute; if (last && last !== location.hash) location.hash = last; else window.dispatchEvent(new HashChangeEvent('hashchange'));
      opts.onDone && opts.onDone();
    };
    go.onclick = submit;
    el.querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') submit(); });
    const c = q('.lg-cancel'); if (c) c.onclick = () => { el.remove(); document.body.classList.remove('gated'); };
    const o = q('.lg-out'); if (o) o.onclick = async () => { try { await S().flush(); } catch (e) { } await VL.Cloud.signOut(); S().logoutCloud(); try { sessionStorage.removeItem('vl-logged'); } catch (e) { } R.accountGate(); };
  };
  /* edit name / class of the logged-in account */
  R.editAccount = () => {
    const P = S().p, reg = P.reg || {};
    VL.ui.modal({ title: 'My account', body: `<div class="settings"><p class="muted small">Username: <b>${esc(VL.Cloud.username())}</b></p><label>First and last name<input class="inp ea-n" maxlength="60" value="${esc(reg.name || '')}"></label><label>Class / group<input class="inp ea-g" maxlength="40" value="${esc(reg.group || '')}"></label></div>`,
      buttons: [{ label: 'Log out', onClick: () => R.accountGate({ switch: true }) }, { label: 'Cancel' }, { label: 'Save', primary: true, onClick: () => { const n = document.querySelector('.ea-n'), g = document.querySelector('.ea-g'); if (n && n.value.trim().length >= 3) { P.reg = Object.assign({}, reg, { name: n.value.trim(), group: g ? g.value.trim() : reg.group }); P.name = P.reg.name; S().save(); VL.ui.toast('Saved'); } } }] });
  };

  /* ---------- mandatory login gate ---------- */
  R.gate = (opts = {}) => {
    if (R.cloud()) return R.accountGate(opts);
    const old = document.getElementById('login-gate'); if (old) old.remove();
    const p = S().p; const known = Object.values(S().allProfiles()).filter(d => d.name).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)).slice(0, 8);
    const el = document.createElement('div'); el.id = 'login-gate';
    el.innerHTML = `<div class="lg-card glass" role="dialog" aria-modal="true" aria-labelledby="lg-t">
      <img src="img/sarra-badge.webp" alt="Mrs Sarra" class="lg-av">
      <h2 id="lg-t">${opts.switch ? 'Change student' : 'Welcome to the lab!'}</h2>
      <p>Type your name to start. If you have been here before, Mrs Sarra brings you back exactly where you stopped.</p>
      ${known.length ? `<div class="lg-known"><span class="muted small">Already registered on this computer:</span>${known.map(d => `<button class="chip" data-nm="${esc(d.name)}" data-gr="${esc((d.reg || {}).group || '')}">${esc(d.name)}</button>`).join('')}</div>` : ''}
      <label>First and last name<input class="inp lg-n" maxlength="60" autocomplete="off" value="${esc(opts.switch ? '' : (p.reg && p.reg.name) || p.name || '')}" placeholder="e.g. Yasmine Ben Ali"></label>
      <label>Class / group<input class="inp lg-g" maxlength="40" autocomplete="off" value="${esc(opts.switch ? '' : (p.reg && p.reg.group) || '')}" placeholder="e.g. 2nd year, group B"></label>
      <div class="lg-err" hidden></div>
      <button class="btn-primary lg-go">Register and start</button>
      ${opts.switch ? '<button class="btn-sm lg-cancel">Cancel</button>' : ''}
    </div>`;
    document.body.appendChild(el); document.body.classList.add('gated');
    const n = el.querySelector('.lg-n'), g = el.querySelector('.lg-g'), er = el.querySelector('.lg-err');
    setTimeout(() => n.focus(), 50);
    const go = () => {
      const name = n.value.trim().replace(/\s+/g, ' '), group = g.value.trim();
      if (name.length < 3 || !/[a-zA-ZÀ-ɏ؀-ۿ]/.test(name)) { er.hidden = false; er.textContent = 'Please type your real first and last name.'; n.classList.add('bad'); n.focus(); return; }
      if (!group) { er.hidden = false; er.textContent = 'Please type your class or group.'; g.classList.add('bad'); g.focus(); return; }
      const resumed = S().login(name, group);
      try { sessionStorage.setItem('vl-logged', S().p.key); } catch (e) { }
      el.remove(); document.body.classList.remove('gated');
      VL.ui.toast(resumed ? `Welcome back, ${esc(name.split(' ')[0])}! Continuing where you stopped.` : `Welcome, ${esc(name.split(' ')[0])}! Your progress will be saved.`);
      const last = S().p.lastRoute;
      if (resumed && last && last !== location.hash) location.hash = last; else window.dispatchEvent(new HashChangeEvent('hashchange'));
      opts.onDone && opts.onDone();
    };
    el.querySelector('.lg-go').onclick = go;
    [n, g].forEach(i => i.onkeydown = e => { if (e.key === 'Enter') go(); });
    el.querySelectorAll('[data-nm]').forEach(b => b.onclick = () => { n.value = b.dataset.nm; g.value = b.dataset.gr; go(); });
    const c = el.querySelector('.lg-cancel'); if (c) c.onclick = () => { el.remove(); document.body.classList.remove('gated'); };
  };
  R.needsLogin = () => { if (S().isTeacher) return false; if (R.cloud()) return !VL.Cloud.user || !S().p.reg; let k = null; try { k = sessionStorage.getItem('vl-logged'); } catch (e) { } return !k || k !== S().p.key || !S().p.reg; };
  // older code paths
  R.ask = () => R.cloud() && VL.Cloud.user ? R.editAccount() : R.gate({ switch: !!S().p.reg });

  /* ---------- teacher card ---------- */
  R.teacherCard = async (el, students) => {
    if (R.settings === null) await R.load();
    const st = R.settings || {};
    const rows = (students || []).map(s => { const d = s.data || {}; const g = d.reg || {}; return { name: g.name || d.name || '', group: g.group || '', at: g.at || null, login: d.lastLogin || null, last: d.lastActive || null, logins: d.logins || 0, events: d.events || [], teacher: !!d.username && (window.VLAB_TEACHERS || []).includes(d.username) }; }).filter(r => r.name && !r.teacher).sort((a, b) => (b.last || 0) - (a.last || 0));
    const online = r => r.last && Date.now() - r.last < 5 * 60000;
    const feed = rows.flatMap(r => r.events.map(e => Object.assign({ who: r.name }, e))).sort((a, b) => b.t - a.t).slice(0, 40);
    const icon = { login: 'user', quiz: 'list', challenge: 'trophy', lesson: 'book' };
    el.innerHTML = `<h3>${VL.icon('user')} Students and activity</h3>
      <div class="reg-grid"><div><div class="rg-list">${rows.length ? `<table class="ttable"><thead><tr><th></th><th>Name</th><th>Class</th><th>Registered</th><th>Last login</th><th>Logins</th></tr></thead><tbody>${rows.map(r => `<tr><td><i class="dot-on ${online(r) ? 'on' : ''}" title="${online(r) ? 'Online now' : 'Offline'}"></i></td><td>${esc(r.name)}</td><td>${esc(r.group || '—')}</td><td>${when(r.at)}</td><td>${ago(r.login)}</td><td>${r.logins}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No student has logged in yet.</p>'}</div>
        <div class="row"><button class="btn-sm rg-csv">${VL.icon('copy')} Copy list as CSV</button><span class="muted small">${rows.filter(online).length} online now</span></div></div>
        <div><h4>Recent activity</h4><div class="feed">${feed.length ? feed.map(e => `<div class="fd fd-${e.type}">${VL.icon(icon[e.type] || 'info')}<div><span>${esc(e.text)}</span><small>${ago(e.t)}</small></div></div>`).join('') : '<p class="muted">Logins, finished quizzes and solved challenges appear here.</p>'}</div></div></div>
      <details class="rg-mail"><summary>${VL.icon('mail')} Receive an email when a student finishes a quiz or solves a challenge</summary>
        <ol class="small reg-steps"><li>Create a Google Form with 4 short-answer questions: <i>Name</i>, <i>Class</i>, <i>Date</i>, <i>Event</i>. In <b>Responses → ⋮</b>, turn on <b>Get email notifications for new responses</b>.</li><li>In <b>⋮ → Get pre-filled link</b>, type <code>NAME</code>, <code>GROUP</code>, <code>DATE</code> and <code>EVENT</code> as the answers, then copy the link.</li><li>Paste it below and save. From then on the lab submits the form automatically in the background (students see nothing and send nothing).</li></ol>
        <div class="row"><input class="inp rg-url" placeholder="https://docs.google.com/forms/d/e/…/viewform?usp=pp_url&entry.…=NAME…" value="${esc(st.formUrl || '')}"><button class="btn-sm rg-save">Save</button><button class="btn-sm rg-test">Send a test</button></div></details>`;
    el.querySelector('.rg-save').onclick = async () => { const u = el.querySelector('.rg-url').value.trim(); if (u && !/^https:\/\/docs\.google\.com\/forms\//.test(u)) { VL.ui.toast('Paste a Google Forms link (https://docs.google.com/forms/…)'); return; } try { await R.saveSettings({ formUrl: u }); VL.ui.toast('Notification form saved'); } catch (e) { VL.ui.toast('Could not save: the class database is not available in this view.'); } };
    el.querySelector('.rg-test').onclick = async () => { const ok = await R.notify('test', 'Test notification from the Virtual Robotics & AI Lab'); VL.ui.toast(ok ? 'Test sent: check the form responses and your inbox.' : 'Save a Google Forms link first.'); };
    el.querySelector('.rg-csv').onclick = () => { const csv = 'Name,Class,Registered,Last login,Logins\n' + rows.map(r => [r.name, r.group, when(r.at), when(r.login), r.logins].map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'); const fallback = () => VL.ui.modal({ title: 'CSV', body: `<textarea class="inp" rows="10">${esc(csv)}</textarea>` }); try { navigator.clipboard.writeText(csv).then(() => VL.ui.toast('Copied ' + rows.length + ' rows'), fallback); } catch (e) { fallback(); } };
  };
})();
