/* =========================================================================
   cloud.js : student accounts and synced progress with Firebase
   (Authentication + Firestore). Used when the site is hosted outside
   claude.ai (e.g. GitHub Pages) and js/firebase-config.js is filled in.
   Usernames are turned into a private e-mail form: <username>@students.vlab
   ========================================================================= */
(function () {
  const V = '10.12.2';
  const SDK = ['app', 'auth', 'firestore'].map(n => `https://www.gstatic.com/firebasejs/${V}/firebase-${n}-compat.js`);
  const DOMAIN = '@students.vlab';
  const Cloud = VL.Cloud = { mode: 'none', user: null, ready: null };
  const load = src => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  Cloud.enabled = () => !!window.FIREBASE_CONFIG && !(window.claude && window.claude.use);
  Cloud.clean = u => String(u || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  Cloud.init = () => {
    if (Cloud.ready) return Cloud.ready;
    Cloud.ready = (async () => {
      if (!Cloud.enabled()) return false;
      try { for (const s of SDK) await load(s); } catch (e) { console.warn('Firebase SDK could not load', e); return false; }
      firebase.initializeApp(window.FIREBASE_CONFIG); Cloud.auth = firebase.auth(); Cloud.fs = firebase.firestore();
      Cloud.mode = 'firebase';
      /* school computers are shared: the login ends when the browser tab is closed */
      try { await Cloud.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION); } catch (e) { }
      Cloud.user = await new Promise(res => { const un = Cloud.auth.onAuthStateChanged(u => { un(); res(u); }); });
      return true;
    })();
    return Cloud.ready;
  };
  Cloud.username = () => Cloud.user && Cloud.user.email ? Cloud.user.email.replace(DOMAIN, '') : '';
  Cloud.isTeacher = () => (window.VLAB_TEACHERS || []).map(x => x.toLowerCase()).includes(Cloud.username());
  const why = e => { const c = (e && e.code) || ''; return c.includes('wrong-password') || c.includes('invalid-credential') || c.includes('invalid-login') ? 'Wrong username or password.' : c.includes('user-not-found') ? 'No account with this username. Create one first.' : c.includes('email-already-in-use') ? 'This username is already taken.' : c.includes('weak-password') ? 'The password must have at least 6 characters.' : c.includes('network') ? 'No internet connection.' : c.includes('too-many-requests') ? 'Too many attempts. Wait a minute and try again.' : (e && e.message) || 'Something went wrong.'; };
  Cloud.signIn = async (username, password) => { try { const r = await Cloud.auth.signInWithEmailAndPassword(Cloud.clean(username) + DOMAIN, password); Cloud.user = r.user; return { ok: true }; } catch (e) { return { ok: false, msg: why(e) }; } };
  Cloud.create = async (username, password) => { try { const r = await Cloud.auth.createUserWithEmailAndPassword(Cloud.clean(username) + DOMAIN, password); Cloud.user = r.user; return { ok: true }; } catch (e) { return { ok: false, msg: why(e) }; } };
  Cloud.signOut = async () => { try { await Cloud.auth.signOut(); } catch (e) { } Cloud.user = null; };
  /* the same small interface as the claude.ai database: doc(path).get/set/delete/onSnapshot, collection(path).onSnapshot */
  const wrapSnap = s => ({ exists: s.exists, id: s.id, data: () => s.data() });
  Cloud.db = () => ({
    doc: path => { const r = Cloud.fs.doc(path); return { get: async () => wrapSnap(await r.get()), set: v => r.set(JSON.parse(JSON.stringify(v))), delete: () => r.delete(), onSnapshot: (cb, err) => r.onSnapshot(s => cb(wrapSnap(s)), err) }; },
    collection: path => ({ onSnapshot: (cb, err) => Cloud.fs.collection(path).onSnapshot(q => cb({ docs: q.docs.map(d => ({ id: d.id, data: () => d.data() })) }), err) })
  });
})();
