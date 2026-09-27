// Real Chromium key events via CDP. Start an isolated agent-browser session first.
// Usage: node scripts/browser-smoke.mjs <browser-websocket-url> [site-url]
import assert from "node:assert/strict";
const endpoint = process.argv[2];
const base = process.argv[3] ?? "http://127.0.0.1:3001";
if (!endpoint) throw new Error("Pass an isolated browser CDP websocket URL.");
const browser = new WebSocket(endpoint);
await new Promise((resolve) =>
  browser.addEventListener("open", resolve, { once: true }),
);
let id = 0;
const pending = new Map();
browser.addEventListener("message", ({ data }) => {
  const message = JSON.parse(String(data));
  const request = pending.get(message.id);
  if (request) {
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  }
});
function command(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    browser.send(JSON.stringify({ id: requestId, method, params, sessionId }));
  });
}
const { targetInfos } = await command("Target.getTargets");
const target = targetInfos.find(
  (t) => t.type === "page" && t.url.startsWith(base),
);
assert(target, "Open the app in the isolated browser first");
const { sessionId } = await command("Target.attachToTarget", {
  targetId: target.targetId,
  flatten: true,
});
const send = (method, params = {}) => command(method, params, sessionId);
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timeout: ${expression}`);
}
async function click(selector) {
  await until(`!!document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await delay(150);
}
async function button(text) {
  await until(
    `Array.from(document.querySelectorAll('button')).some(b=>!b.disabled && b.textContent.trim().includes(${JSON.stringify(text)}))`,
  );
  await evaluate(
    `Array.from(document.querySelectorAll('button')).find(b=>!b.disabled && b.textContent.trim().includes(${JSON.stringify(text)})).click()`,
  );
  await delay(150);
}
async function key(key, type = "both", modifiers = 0) {
  const params = {
    key,
    code:
      key.length === 1
        ? key === " "
          ? "Space"
          : `Key${key.toUpperCase()}`
        : key,
    modifiers,
    windowsVirtualKeyCode:
      key.length === 1
        ? key.toUpperCase().charCodeAt(0)
        : ({ Backspace: 8, Escape: 27, Enter: 13, Tab: 9 }[key] ?? 0),
    text: key.length === 1 && modifiers === 0 ? key : undefined,
  };
  if (type !== "up")
    await send("Input.dispatchKeyEvent", { type: "keyDown", ...params });
  if (type !== "down")
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
}
async function fill(selector, value) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key("a", "both", 2);
  await send("Input.insertText", { text: String(value) });
}
async function home() {
  await click(".brand");
  await until(`!!document.querySelector('.activity-card')`);
}
async function start(activity, exercise, count) {
  await home();
  await click(`a[href='/practice/${activity}']`);
  await click(`a[href='/practice/${activity}/${exercise}']`);
  await until(`!!document.querySelector('form')`);
  if (count) await fill("input[type=number]", count);
  await button("Start practice");
  await until(`!!document.querySelector('.practice-surface')`);
}
async function results() {
  await until(
    `document.querySelector('h1')?.textContent === 'Practice complete'`,
  );
  await until(
    `document.querySelector('.save-status')?.textContent === 'Saved on this device'`,
  );
}
async function historyCount() {
  return evaluate(
    `new Promise((resolve,reject)=>{const r=indexedDB.open('keyboard-trainer',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('sessions').objectStore('sessions').count();q.onsuccess=()=>{resolve(q.result);db.close()};q.onerror=()=>reject(q.error)}})`,
  );
}
try {
  await evaluate(`localStorage.removeItem('keyboard-trainer.settings')`);
  await send("Page.navigate", { url: base });
  await until(
    `document.documentElement?.lang === 'en' && !!document.querySelector('.activity-card')`,
  );
  const baseline = (await evaluate(
    `indexedDB.databases().then(d=>d.some(x=>x.name==='keyboard-trainer'))`,
  ))
    ? await historyCount()
    : 0;
  await start("keyboard", "words");
  const text = await evaluate(
    `document.querySelector('.word-target').textContent`,
  );
  const before = await evaluate(
    `document.querySelector('.progress-label').textContent`,
  );
  await key("Backspace");
  await key("a", "both", 2);
  assert.equal(
    await evaluate(`document.querySelector('.progress-label').textContent`),
    before,
    "ignored controls/shortcuts",
  );
  for (const char of text) await key(char);
  await results();
  console.log("PASS Home → Keyboard → Words → Results, shortcuts ignored");
  await button("Practice again");
  await until(`!!document.querySelector('.word-target')`);
  await key("Escape");
  assert.equal(
    await evaluate(`document.querySelector('h1').textContent`),
    "Choose an exercise",
  );
  console.log("PASS Repeat and cancellation");
  await start("keyboard", "random", 2);
  const first = await evaluate(
    `document.querySelector('.single-target').textContent`,
  );
  await key(first === "x" ? "z" : "x");
  assert.equal(
    await evaluate(`document.querySelector('.single-target').textContent`),
    first,
  );
  await key(first);
  await key(
    await evaluate(`document.querySelector('.single-target').textContent`),
  );
  await results();
  console.log("PASS Random Keys errors retain target → Results");
  await start("guitar", "manual", 2);
  await button("Mark practiced");
  await button("Skip");
  await results();
  console.log("PASS Manual guitar practiced + skipped → Results");
  await start("guitar", "laptop", 2);
  let keys = await evaluate(
    `Array.from(document.querySelectorAll('.expected-combo kbd')).map(e=>e.textContent.toLowerCase())`,
  );
  await key(keys[0], "down");
  assert(
    await evaluate(
      `document.querySelectorAll('.fret-grid .pressed-key').length > 0`,
    ),
  );
  // A second real browser tab changes document visibility and focus while a key is held.
  const other = await command("Target.createTarget", { url: "about:blank" });
  await command("Target.activateTarget", { targetId: other.targetId });
  await delay(200);
  await command("Target.activateTarget", { targetId: target.targetId });
  await until(
    `document.querySelectorAll('.fret-grid .pressed-key').length === 0`,
  );
  await key(keys[0], "up");
  for (const k of keys) await key(k, "down");
  assert(
    await evaluate(
      `document.querySelector('.progress-label').textContent.includes('1 / 2')`,
    ),
  );
  for (const k of keys) await key(k, "up");
  keys = await evaluate(
    `Array.from(document.querySelectorAll('.expected-combo kbd')).map(e=>e.textContent.toLowerCase())`,
  );
  for (const k of keys) await key(k, "down");
  for (const k of keys) await key(k, "up");
  await results();
  await command("Target.closeTarget", { targetId: other.targetId });
  console.log(
    "PASS Laptop simultaneous keys, actual tab switch/held-key reset → Results",
  );
  const saved = await historyCount();
  assert.equal(saved, baseline + 4);
  await click("a.button[href='/statistics']");
  await until(`!!document.querySelector('table')`);
  await send("Page.reload");
  await until(`!!document.querySelector('table')`);
  assert.equal(await historyCount(), baseline + 4);
  console.log("PASS Results → Statistics → reload preserves all four sessions");
  await click("nav a[href='/settings']");
  await until(`!!document.querySelector('.settings-form')`);
  await fill("input[type=number]", 7);
  await evaluate(
    `const select=document.querySelector('select');select.value='es';select.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('input[type=checkbox]').click()`,
  );
  await button("Save settings");
  await send("Page.reload");
  await until(`document.documentElement?.lang === 'es'`);
  assert.equal(
    await evaluate(`document.querySelector('input[type=number]').value`),
    "7",
  );
  assert.equal(
    await evaluate(`document.documentElement.dataset.reduceMotion`),
    "true",
  );
  console.log("PASS Settings language/count/reduce-motion → reload preserved");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert(await evaluate(`document.documentElement.scrollWidth <= innerWidth`));
  await home();
  assert(await evaluate(`document.documentElement.scrollWidth <= innerWidth`));
  console.log("PASS Mobile home/settings without horizontal overflow");
  await send("Emulation.clearDeviceMetricsOverride");
  await evaluate(
    `localStorage.setItem('keyboard-trainer.settings','{invalid')`,
  );
  await send("Page.navigate", { url: base + "/statistics" });
  await until(
    `document.documentElement?.lang === 'en' && !!document.querySelector('table')`,
  );
  await evaluate(
    `new Promise((resolve,reject)=>{const r=indexedDB.open('keyboard-trainer',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put({id:'smoke-corrupt-entry',version:99});tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>reject(tx.error)}})`,
  );
  await send("Page.reload");
  await until(
    `document.body?.textContent.includes('Some unreadable history entries were ignored.')`,
  );
  assert(await evaluate(`!!document.querySelector('table')`));
  await evaluate(
    `new Promise(resolve=>{const r=indexedDB.open('keyboard-trainer',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').delete('smoke-corrupt-entry');tx.oncomplete=()=>{db.close();resolve(true)}}})`,
  );
  console.log(
    "PASS Corrupted settings fall back; corrupted IndexedDB entry is ignored without losing history",
  );
  await start("keyboard", "random", 1);
  await evaluate(
    `window.__smokeDB=indexedDB;Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined});true`,
  );
  await key(
    await evaluate(`document.querySelector('.single-target').textContent`),
  );
  await until(
    `document.querySelector('.save-status')?.textContent.includes('Local storage is unavailable')`,
  );
  await evaluate(
    `Object.defineProperty(window,'indexedDB',{configurable:true,value:window.__smokeDB});delete window.__smokeDB`,
  );
  await button("Retry saving");
  await results();
  console.log(
    "PASS Unavailable storage keeps results usable; retry saves successfully",
  );
  console.log("All browser smoke flows passed.");
} finally {
  browser.close();
}
