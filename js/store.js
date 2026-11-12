/* =========================================================================
   store.js : student progress, saved projects, class challenge.
   Uses the artifact database when available (shared with the teacher),
   with a local copy in this browser as a fallback.
   ========================================================================= */
(function () {
  const LS_KEY = 'vlab-progress-v1';
  const blank = () => ({
    v: 1, name: '', lessons: {}, skills: {}, badges: [], hints: 0, hintLog: {}, mistakes: {},
    projects: [], challenges: {}, pinHunt: 0, runs: 0, minutes: 0, lastActive: Date.now(), lastStep: null, bugs: {}
  });
  const S = {
    p: blank(), db: null, user: null, uid: null, isTeacher: false, mode: 'local', listeners: [], classChallenge: null,
    classListeners: [], students: null, studentListeners: [], saving: false, dirty: false, writeOK: true
  };
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } };
  const lsSet = v => { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (e) { } };
  S.emit = () => S.listeners.forEach(f => { try { f(S.p); } catch (e) { console.error(e); } });
  S.on = f => { S.listeners.push(f); };

  S.lesson = id => { S.p.lessons[id] = S.p.lessons[id] || { steps: {}, quiz: { best: null, attempts: 0, last: null, answers: [] }, completed: false, started: Date.now() }; return S.p.lessons[id]; };
  S.markStep = (lid, step) => { const L = S.lesson(lid); if (!L.steps[step]) { L.steps[step] = Date.now(); S.save(); } };
  S.skill = (id, amount) => { S.p.skills[id] = Math.min(100, (S.p.skills[id] || 0) + amount); };
  S.badge = id => { if (!S.p.badges.includes(id)) { S.p.badges.push(id); return true; } return false; };
  S.mistake = code => { S.p.mistakes[code] = (S.p.mistakes[code] || 0) + 1; };
  S.hint = (code, level) => { S.p.hints++; S.p.hintLog[code] = Math.max(S.p.hintLog[code] || 0, level); S.save(); };

  let timer = null;
  S.save = () => {
    S.p.lastActive = Date.now();
    lsSet(S.p); S.stash(); S.emit();
    clearTimeout(timer); timer = setTimeout(S.flush, 1200);
  };
  S.flush = async () => {
    if (!S.db || !S.uid || !S.writeOK) return;
    if (S.saving) { S.dirty = true; return; }
    S.saving = true;
    try {
      const body = JSON.parse(JSON.stringify(S.p));
      // keep the document small: only the last 12 projects
      body.projects = body.projects.slice(-12);
      if (!S.cloudAccounts) body.profiles = S.otherProfiles();
      await S.db.doc('progress/' + S.uid).set(body);
      S.mode = 'cloud';
    } catch (e) {
      if (e && e.code === 'invalid_argument') { S.writeOK = false; S.mode = 'local'; }
      console.warn('save failed', e);
    }
    S.saving = false;
    if (S.dirty) { S.dirty = false; S.flush(); }
    S.emit();
  };

  S.init = async () => {
    const local = lsGet(); if (local) S.p = Object.assign(blank(), local);
    S.emit();
    if (VL.Cloud && VL.Cloud.enabled()) { await S.initFirebase(local); return; }
    if (!window.claude || !window.claude.use) return;
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      S.user = user; S.db = db;
      if (user) {
        S.isTeacher = (await user.isOwner()) || (await user.canEdit());
        S.uid = await user.id();
        const me = await user.me(); S.meName = me.name || '';
      }
      if (db && S.uid) {
        const snap = await withTimeout(db.doc('progress/' + S.uid).get(), 10000);
        if (snap && snap.exists) {
          const remote = snap.data(); S.remoteProfiles = remote.profiles || {}; delete remote.profiles;
          if (!local || (remote.lastActive || 0) >= (S.p.lastActive || 0)) S.p = Object.assign(blank(), JSON.parse(JSON.stringify(remote)));
          S.mode = 'cloud';
        } else if (snap) {
          S.mode = 'cloud'; S.flush();
        }
      }
      if (db) {
        db.doc('class/current').onSnapshot(s => { S.classChallenge = s.exists ? s.data() : null; S.classListeners.forEach(f => f(S.classChallenge)); }, () => { });
      }
    } catch (e) { console.warn('cloud init', e); }
    S.emit();
  };
  /* GitHub Pages + Firebase: one account per student, synced on every device */
  S.initFirebase = async (local) => {
    const ok = await VL.Cloud.init(); if (!ok) return;
    S.mode = 'local'; S.cloudAccounts = true;
    if (VL.Cloud.user) await S.attachCloudUser(local);
  };
  S.attachCloudUser = async (local) => {
    const C = VL.Cloud; S.db = C.db(); S.uid = C.user.uid; S.isTeacher = C.isTeacher(); S.user = null;
    try {
      const snap = await withTimeout(S.db.doc('progress/' + S.uid).get(), 10000);
      if (snap && snap.exists) { const remote = snap.data(); S.remoteProfiles = {}; delete remote.profiles; S.p = Object.assign(blank(), JSON.parse(JSON.stringify(remote))); }
      else { const keep = S.p; S.p = blank(); if (keep && keep.username === C.username()) S.p = keep; S.p.username = C.username(); }
      S.p.username = C.username(); S.mode = 'cloud';
      try { localStorage.setItem(LS_KEY, JSON.stringify(S.p)); } catch (e) { }
      S.db.doc('class/current').onSnapshot(s => { S.classChallenge = s.exists ? s.data() : null; S.classListeners.forEach(f => f(S.classChallenge)); }, () => { });
    } catch (e) { console.warn('cloud load', e); }
    S.emit();
  };
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

  S.onClass = f => { S.classListeners.push(f); f(S.classChallenge); };
  S.setClassChallenge = async (data) => {
    if (!S.db) throw new Error('no db');
    await S.db.doc('class/current').set(data);
  };
  /* teacher: subscribe to every student's progress */
  let unsubStudents = null;
  S.watchStudents = (cb) => {
    S.studentListeners.push(cb);
    if (S.students) cb(S.students);
    if (unsubStudents || !S.db) return;
    unsubStudents = S.db.collection('progress').onSnapshot(q => {
      S.students = q.docs.map(d => ({ id: d.id, data: d.data() }));
      S.studentListeners.forEach(f => f(S.students));
    }, e => { S.studentError = e; S.studentListeners.forEach(f => f(S.students || [])); });
  };
  S.names = async ids => {
    if (!S.user || !ids.length) return {};
    try { return await S.user.profiles(ids); } catch (e) { return {}; }
  };
  /* ---------- named student profiles (several students may share one computer/account) ---------- */
  const PK = 'vlab-profiles-v1';
  const keyOf = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
  S.keyOf = keyOf; S.remoteProfiles = {};
  S.localProfiles = () => { try { return JSON.parse(localStorage.getItem(PK) || '{}'); } catch (e) { return {}; } };
  const saveLocalProfiles = m => { try { localStorage.setItem(PK, JSON.stringify(m)); } catch (e) { } };
  const slim = d => { const c = JSON.parse(JSON.stringify(d)); delete c.profiles; c.projects = (c.projects || []).slice(-6); return c; };
  S.allProfiles = () => { const m = Object.assign({}, S.remoteProfiles); Object.entries(S.localProfiles()).forEach(([k, d]) => { if (!m[k] || (d.lastActive || 0) > (m[k].lastActive || 0)) m[k] = d; }); return m; };
  S.otherProfiles = () => { const m = S.allProfiles(); delete m[S.p.key]; const out = {}; Object.entries(m).sort((a, b) => (b[1].lastActive || 0) - (a[1].lastActive || 0)).slice(0, 30).forEach(([k, d]) => out[k] = slim(d)); return out; };
  S.stash = () => { if (!S.p.key) return; const m = S.localProfiles(); m[S.p.key] = slim(S.p); saveLocalProfiles(m); };
  /* log in by name: resume that student's saved progress, or start a fresh one */
  S.login = (name, group) => {
    const key = keyOf(name); const now = Date.now(); let resumed = false;
    if (S.p.key !== key) {
      S.stash();
      const saved = S.allProfiles()[key];
      if (saved) { S.p = Object.assign(blank(), JSON.parse(JSON.stringify(saved))); resumed = true; }
      else if (!S.p.key && (!S.p.name || keyOf(S.p.name) === key)) { resumed = Object.keys(S.p.lessons || {}).length > 0; }
      else S.p = blank();
    } else resumed = true;
    S.p.key = key; S.p.name = name.trim();
    S.p.reg = Object.assign({ at: now }, S.p.reg || {}, { name: name.trim(), group: group || (S.p.reg || {}).group || '' });
    S.p.lastLogin = now; S.p.logins = (S.p.logins || 0) + 1;
    S.event('login', `${S.p.name} logged in`);
    S.save(); S.stash(); S.flush();
    return resumed;
  };
  /* activity log (shown on the teacher dashboard, optionally sent to the teacher's form) */
  S.event = (type, text, notify) => {
    S.p.events = (S.p.events || []).concat([{ t: Date.now(), type, text }]).slice(-60);
    if (notify && VL.Register && VL.Register.notify) VL.Register.notify(type, text);
  };
  S.logoutCloud = () => { S.db = null; S.uid = null; S.isTeacher = false; S.mode = 'local'; S.p = blank(); try { localStorage.removeItem(LS_KEY); } catch (e) { } S.emit(); };
  S.reset = () => { const n = S.p.name, k = S.p.key, r = S.p.reg; S.p = blank(); S.p.name = n; S.p.key = k; S.p.reg = r; S.save(); };
  VL.Store = S;
})();
