# Virtual Robotics & AI Lab — by Mrs Sarra Ben Amara

A complete website: 5 worlds × 15 lessons, a realistic 3D lab for **Arduino UNO**, **ESP32** and **Raspberry Pi** (free breadboard wiring, sensors, simulator, serial monitor), Mrs Sarra the tutor (works **without internet or AI**), and student accounts that keep progress on every device.

---

## 1. Put the site on GitHub Pages (10 minutes)

1. Create a free account on <https://github.com> and click **New repository**. Name it e.g. `robotics-lab`, choose **Public**, click **Create repository**.
2. Click **uploading an existing file**, then drag **all the files and folders from this zip** (`index.html`, `firestore.rules`, `README.md` and the folders `css`, `js`, `img`). Click **Commit changes**.
3. Go to **Settings → Pages**. Under *Branch* choose **main** and **/ (root)**, click **Save**.
4. After 1–2 minutes your site is at `https://YOUR-NAME.github.io/robotics-lab/`.

Without step 2 below the site already works, but progress is only saved in each browser.

## 2. Student accounts with Firebase (free, 15 minutes)

Students choose a **username + password**. Their lessons, badges, projects and lab circuits are stored online, so they find them on any computer, tablet or phone. No e-mail address is ever asked or shown.

1. Go to <https://console.firebase.google.com>, sign in with your Google account, click **Create a project** (any name, Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. Still in Authentication: **Settings → Authorized domains → Add domain** → `YOUR-NAME.github.io`.
4. **Build → Firestore Database → Create database** → choose a location near you (e.g. `europe-west`) → *Start in production mode*.
5. In Firestore open the **Rules** tab, delete everything, paste the content of **`firestore.rules`** (in this zip) and click **Publish**.
6. Click the ⚙️ **Project settings → General → Your apps → `</>` (Web)**, give it a name, click **Register app**. Copy the `firebaseConfig = { … }` values.
7. On GitHub open **`js/firebase-config.js`** → ✏️ edit, and replace `window.FIREBASE_CONFIG = null;` with your values:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIza…",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
window.VLAB_TEACHERS = ['sarra'];
```

8. **Commit changes**. Wait 1 minute and open your site.
9. **Create your teacher account first**: on the login screen click *Create my account* with the username **`sarra`** (or the name you put in `VLAB_TEACHERS` *and* in `firestore.rules`). This account opens the **Teacher dashboard** (all students, logins, activity, class challenge).

> The Firebase "apiKey" is not a secret: it only identifies your project. The security comes from `firestore.rules` (each student can only read and change their own progress; only the teacher sees everyone).

### Good to know
- **Forgotten password**: in Firebase → Authentication → Users, delete the student's account; the student creates it again with the same username. (Their old progress stays under the old user id, so ask them to write their password down.)
- **Shared school computers**: the login ends when the browser tab is closed, so the next student cannot open someone else's account.
- To add another teacher: add the username to `VLAB_TEACHERS` in `js/firebase-config.js` **and** `'username@students.vlab'` to the list in `firestore.rules`.
- The free Firebase plan (Spark) is plenty for a class: 50 000 reads and 20 000 writes per day.

## 3. Mrs Sarra

She answers instantly from her built-in knowledge, with **no internet and no paid AI**:
- acronyms: PWM, GPIO, ADC, DAC, I2C, SPI, UART, LDR, PIR, IoT, VCC, GND, MCU, SBC, IDE, RGB, SDA/SCL, MOSI/MISO, OLED/LCD, IR, BLE, Wi-Fi, RAM/Flash/EEPROM, MQTT, baud, Hz, mA… ("what does PWM stand for?")
- wiring for LED, button, potentiometer, LDR, TMP36, DHT11, PIR, HC-SR04, servo, buzzer, RGB LED, OLED, DC motor (L298N), relay, line sensor, joystick — **for each board** ("how do I wire a PIR on the ESP32?")
- pinouts of the three boards, Ohm's law, resistors, pull-ups, voltage dividers, common ground, troubleshooting…
- In the Lab, **Hint from Mrs Sarra** checks the student's real circuit and code and gives 3 levels of hints.

To add your own answers, edit `js/sarra-kb2.js` (each entry: patterns + answer in HTML).

## 4. Files
| File | What it does |
|---|---|
| `index.html` | the page |
| `js/firebase-config.js` | **your Firebase settings** |
| `firestore.rules` | security rules to paste in Firebase |
| `js/lab3d.js`, `js/kit3d.js` | the 3D lab, boards, breadboard, sensors, circuit simulator |
| `js/sarra*.js` | Mrs Sarra and her knowledge |
| `js/cloud.js`, `js/store.js`, `js/register.js` | accounts, saving, teacher dashboard |
| `js/lessons-*.js` | the 75 lessons |
