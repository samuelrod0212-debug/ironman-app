(function(){
"use strict";
const KEY = "ironman140.app.v1";
const SPORT = {swim:"Swim", bike:"Bike", run:"Run", brick:"Brick", strength:"Strength", race:"Race", rest:"Rest"};
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---- State (saved on this phone only) ----
try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && typeof s === "object") state = Object.assign(state, s); } catch(e) {}
if (!state.done || typeof state.done !== "object") state.done = {};
migrate(state);
const save = () => { state.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} };
save();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

buildPlan();

let tab = "today", weekIdx = clampWeek(curWeek()), openKeys = new Set();
function curWeek(){ return Math.floor(dayDiff(START, today0()) / 7); }
function clampWeek(i){ return Math.max(0, Math.min(plan.length - 1, i)); }
const view = document.getElementById("view");
const isDone = k => !!state.done[k];
const wkKeys = wk => keysOf(wk);
const wkDone = wk => wkKeys(wk).filter(isDone).length;

// ---- Rendering helpers ----
function woHTML(w){
  if (!checkable(w)) return `<li class="wo rest s-rest"><div class="wo-h"><div class="wo-main"><span class="wo-t"><span class="tag">${/^Gym/.test(w.t) ? "Gym" : "Rest"}</span>${esc(w.t)}</span><span class="wo-m">${esc(w.d)}</span></div></div></li>`;
  const open = openKeys.has(w.key), done = isDone(w.key);
  const meta = [w.when, w.dist, w.min ? dur(w.min) : ""].filter(Boolean).join(" · ");
  return `<li class="wo s-${w.s}${done ? " done" : ""}" data-key="${w.key}">
    <div class="wo-h">
      <button class="wo-main" data-open="${w.key}" aria-expanded="${open}">
        <span class="wo-t"><span class="tag">${SPORT[w.s]}</span>${esc(w.t)}</span>
        <span class="wo-m num">${meta}${badges(w)}</span>
      </button>
      <button class="chk" data-key="${w.key}" aria-pressed="${done}" aria-label="Mark ${esc(w.t)} done">${CHECK}</button>
    </div>
    ${open ? `<div class="wo-b"><span class="wo-z">${esc(w.z)}</span><p class="wo-d">${esc(w.d)}</p>${w.fuel ? `<span class="fuel">${esc(w.fuel)}</span>` : ""}${extrasBody(w)}</div>` : ""}
  </li>`;
}
function pctBar(p){ return `<div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div>`; }

// ---- Today ----
function renderToday(){
  const t0 = today0(), i = curWeek(), di = dayDiff(START, t0) - i * 7;
  if (i < 0) return `<section class="card hero"><span class="label">Coming up</span><h2>Plan starts ${fmtLong(START)}</h2></section>`;
  if (i >= plan.length) return `<section class="card hero"><span class="label">Finished</span><h2>Race done. You're an Ironman.</h2></section>`;
  const wk = plan[i], items = wk.days[di], ch = items.filter(checkable);
  const dn = ch.filter(w => isDone(w.key)).length, tot = ch.reduce((a, w) => a + w.min, 0);
  const next = di < 6 ? wk.days[di + 1] : plan[i + 1] ? plan[i + 1].days[0] : null;
  const missed = [];
  if (i < plan.length) for (let d = 0; d < di; d++) wk.days[d].filter(checkable).forEach(w => { if (!isDone(w.key)) missed.push(w); });
  return `
  <section class="card hero">
    <div class="row"><span class="label">${fmtLong(t0)}</span><span class="label">Week ${wk.n} · ${wk.phase}${wk.rec ? " · Recovery" : ""}</span></div>
    <h2>${ch.length ? (dn === ch.length ? "Done for today 💪" : "Today's training") : items[0].t}</h2>
    ${ch.length ? `<div class="dayprog"><span class="label num">${dn}/${ch.length}</span>${pctBar(ch.length ? dn / ch.length : 0)}<span class="label num">${dur(tot)}</span></div>` : ""}
  </section>
  <ul class="wos">${items.map(woHTML).join("")}</ul>
  ${next ? `<section class="card"><span class="label">Tomorrow</span><p class="hint" style="margin-top:4px">${next.map(w => esc(w.t) + (w.min ? " (" + dur(w.min) + ")" : "")).join(" · ")}</p></section>` : ""}
  ${missed.length ? `<section class="card"><div class="row"><span class="label">Not checked off this week</span></div><ul class="wos" style="margin-top:10px">${missed.map(woHTML).join("")}</ul></section>` : ""}
  <section class="card"><span class="label">This week's focus</span><p class="focus" style="margin:4px 0 0">${wk.focus}</p></section>
  ${installCard()}`;
}

// ---- Week ----
function renderWeek(){
  const wk = plan[weekIdx], t0 = today0(), ci = curWeek();
  const keys = wkKeys(wk), dn = wkDone(wk);
  const days = wk.days.map((items, di) => {
    const d = addDays(wk.start, di), isT = +d === +t0;
    return `<div class="day${isT ? " today" : ""}"><div class="day-h"><b>${DN[di]}</b><span>${fmt(d)}${isT ? " · today" : ""}</span></div><ul class="wos">${items.map(woHTML).join("")}</ul></div>`;
  }).join("");
  return `
  <div class="weeknav">
    <button data-wk="-1" aria-label="Previous week" ${weekIdx === 0 ? "disabled" : ""}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <div class="mid"><b>Week ${wk.n} of ${plan.length}</b><span>${fmt(wk.start)} – ${fmt(addDays(wk.start, 6))} · ${hrs(wk.min)}</span>
      <div class="chips"><span class="chip">${wk.phase}</span>${wk.rec ? '<span class="chip">Recovery</span>' : ""}${wk.race ? '<span class="chip">Race week</span>' : ""}${weekIdx === ci ? '<span class="chip now">This week</span>' : ""}</div></div>
    <button data-wk="1" aria-label="Next week" ${weekIdx === plan.length - 1 ? "disabled" : ""}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
  </div>
  <section class="card"><div class="dayprog"><span class="label num">${dn}/${keys.length}</span>${pctBar(keys.length ? dn / keys.length : 0)}${weekIdx !== ci && ci >= 0 && ci < plan.length ? '<button class="btn small" data-wkjump="1">This week</button>' : ""}</div>
    <p class="focus" style="margin:10px 0 0">${wk.focus}</p></section>
  ${days}
  ${wk.race ? raceHTML() : ""}`;
}

// ---- Plan (all weeks) ----
function renderPlan(){
  const ci = curWeek();
  let out = "", ph = "";
  plan.forEach((wk, i) => {
    if (wk.phase !== ph) {
      ph = wk.phase;
      const n = plan.filter(w => w.phase === ph).length;
      out += `<div class="phase-h"><h3>${ph}</h3><span class="label">${n} weeks</span></div>`;
    }
    const keys = wkKeys(wk), dn = wkDone(wk), complete = keys.length && dn === keys.length;
    out += `<button class="wk${i === ci ? " cur" : ""}${complete ? " complete" : ""}" data-goto="${i}">
      <span class="wk-n num">${wk.n}</span>
      <span class="wk-i"><span class="row"><b>${fmt(wk.start)} – ${fmt(addDays(wk.start, 6))}</b><small class="num">${hrs(wk.min)}</small></span>
      <small>${wk.race ? "Race week" : wk.rec ? "Recovery week" : stripTags(wk.focus).split(".")[0]}</small>
      ${pctBar(keys.length ? dn / keys.length : 0)}</span></button>`;
  });
  return out + raceHTML();
}
const stripTags = s => s.replace(/<[^>]+>/g, "");

function raceHTML(){
  const legs = LEGS.map(([n, dist, txt, a, b]) => `<div class="leg"><div class="row"><b>${n}${dist ? " · " + dist : ""}</b></div><small class="num">Sub-13: ${a} · Sub-12: ${b}</small><p>${txt}</p></div>`).join("");
  const ck = CHECKLIST.map(([g, items], gi) => `<span class="label" style="margin-top:6px">${g}</span>` + items.map((t, i) => {
    const k = "chk#" + gi + "-" + i, d = isDone(k);
    return `<button class="cl-i${d ? " done" : ""}" data-key="${k}"><span class="chk" aria-pressed="${d}">${CHECK}</span><span>${esc(t)}</span></button>`;
  }).join("")).join("");
  return `<div class="phase-h"><h3>Race day plan</h3><span class="label">May 16</span></div>
  <section class="card"><div class="legs">${legs}</div></section>
  <section class="card"><span class="label">Race-day checklist</span><div class="cl" style="margin-top:6px">${ck}</div></section>`;
}

// ---- Progress ----
function renderProgress(){
  const all = plan.flatMap(wk => wk.days.flat().filter(checkable));
  const t0 = today0();
  const toDate = all.filter(w => parseISO(w.key.split("#")[0]) <= t0);
  const done = all.filter(w => isDone(w.key));
  const pct = all.length ? done.length / all.length : 0;
  const hDone = done.reduce((a, w) => a + w.min, 0), hDue = toDate.reduce((a, w) => a + w.min, 0);
  const comp = toDate.length ? Math.round(toDate.filter(w => isDone(w.key)).length / toDate.length * 100) : 0;
  // streak: consecutive training days fully done, counting back from today (today counts only if done)
  let streak = 0;
  for (let d = new Date(t0); d >= START; d = addDays(d, -1)) {
    const items = dayItems(d).filter(checkable);
    if (!items.length) continue;
    if (items.every(w => isDone(w.key))) streak++;
    else if (+d === +t0) continue;
    else break;
  }
  const sports = ["swim", "bike", "run", "brick", "strength"].map(s => {
    const p = all.filter(w => w.s === s).reduce((a, w) => a + w.min, 0), d = done.filter(w => w.s === s).reduce((a, w) => a + w.min, 0);
    return `<div class="sport s-${s}"><span>${SPORT[s]}</span>${pctBar(p ? d / p : 0)}<span>${hrs(d)} / ${hrs(p)}</span></div>`;
  }).join("");
  const max = Math.max(...plan.map(w => w.min)), ci = curWeek();
  const bars = plan.map((wk, i) => {
    const d = wk.days.flat().filter(checkable).filter(w => isDone(w.key)).reduce((a, w) => a + w.min, 0);
    return `<div class="${i === ci ? "cur" : ""}" style="height:${wk.min / max * 100}%" title="Week ${wk.n}: ${hrs(d)} of ${hrs(wk.min)}"><i style="height:${wk.min ? d / wk.min * 100 : 0}%"></i></div>`;
  }).join("");
  const R = 48, C = 2 * Math.PI * R;
  return `
  <section class="card"><div class="ringwrap">
    <div class="ring"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="${R}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="10"/>
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" opacity="${pct ? 1 : 0}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg><b class="num">${Math.round(pct * 100)}%</b></div>
    <div><span class="label">Whole plan</span><p class="hint" style="margin-top:4px"><b style="color:var(--ink)">${done.length}</b> of ${all.length} workouts done. ${ci >= 0 && ci < plan.length ? `You're in week ${ci + 1} of ${plan.length}.` : ""}</p></div>
  </div></section>
  <div class="stats">
    <div class="stat"><span class="label">Hours trained</span><b>${hrs(hDone)}</b><small>of ${hrs(hDue)} scheduled so far</small></div>
    <div class="stat"><span class="label">On-plan rate</span><b>${comp}%</b><small>of workouts due so far</small></div>
    <div class="stat"><span class="label">Day streak</span><b>${streak}</b><small>training days fully done</small></div>
    <div class="stat"><span class="label">Race day</span><b>${Math.max(0, dayDiff(t0, parseISO(state.raceDate)))}</b><small>days to go</small></div>
  </div>
  <section class="card"><span class="label">Hours by week (done vs planned)</span><div class="chart">${bars}</div><div class="axis"><span>Wk 1</span><span>Build</span><span>Peak</span><span>Race</span></div></section>
  <section class="card" style="display:flex;flex-direction:column;gap:10px"><span class="label">By sport</span>${sports}</section>
  ${extrasSettings()}
  <section class="card settings"><span class="label">Your data</span>
    <p class="hint">Everything is saved on this phone only. Export a backup now and then, and import it if you switch phones or clear Safari data.</p>
    <div class="btns"><button class="btn" data-act="export">Export backup</button><button class="btn" data-act="import">Import backup</button></div>
    <p class="hint">Last saved ${state.updatedAt ? new Date(state.updatedAt).toLocaleString() : "never"}.</p>
  </section>`;
}
function dayItems(d){
  const i = Math.floor(dayDiff(START, d) / 7), di = dayDiff(START, d) - i * 7;
  return plan[i] ? plan[i].days[di] : [];
}

function installCard(){
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  let hidden = false; try { hidden = localStorage.getItem(KEY + ".hideInstall") === "1"; } catch(e) {}
  if (standalone || hidden) return "";
  return `<section class="card install"><div class="row"><span class="label">Install on your phone</span><button class="btn small" data-act="hideinstall">Hide</button></div>
    <p class="hint" style="margin-top:6px">iPhone: tap Share in Safari, then <b style="color:var(--ink)">Add to Home Screen</b>. Android: Chrome menu, then <b style="color:var(--ink)">Install app</b>. It then opens full screen and works offline.</p></section>`;
}

// ======== Extras: how it felt, reminders, Strava ========
if (!state.log || typeof state.log !== "object") state.log = {};       // key -> {rpe, note}
if (!state.strava || typeof state.strava !== "object") state.strava = {}; // key -> matched activity
if (!state.stravaUsed || typeof state.stravaUsed !== "object") state.stravaUsed = {}; // activity id -> key
if (!state.remind || typeof state.remind !== "object") state.remind = {wk:"03:45", we:"06:00", lead:0};
const SKEY = KEY + ".strava"; // Strava keys and tokens: this phone only, never in backups
let sv = {}; try { sv = JSON.parse(localStorage.getItem(SKEY) || "{}") || {}; } catch(e) {}
const saveSv = () => { try { localStorage.setItem(SKEY, JSON.stringify(sv)); } catch(e) {} };

const miles = m => (m / 1609.344).toFixed(m < 16093 ? 2 : 1) + " mi";
const yards = m => Math.round(m * 1.09361).toLocaleString("en-US") + " yd";
const hms = s => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? h + "h " + String(m).padStart(2, "0") + "m" : m + " min"; };
function actSummary(a){
  const dist = a.d ? (a.g === "swim" ? yards(a.d) : miles(a.d)) : "";
  let pace = "";
  if (a.d && a.t) {
    if (a.g === "run") { const s = a.t / (a.d / 1609.344); pace = Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0") + "/mi"; }
    else if (a.g === "bike") pace = (a.d / 1609.344 / (a.t / 3600)).toFixed(1) + " mph";
    else if (a.g === "swim") { const s = a.t / (a.d * 1.09361 / 100); pace = Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0") + "/100yd"; }
  }
  return [dist, a.t ? hms(a.t) : "", pace, a.hr ? Math.round(a.hr) + " bpm" : ""].filter(Boolean).join(" · ");
}
function badges(w){
  const L = state.log[w.key], A = state.strava[w.key];
  return (A ? ` · <span class="badge">Strava</span>` : "") + (L && L.rpe ? ` · <span class="badge">RPE ${L.rpe}</span>` : "") + (L && L.note ? ` · <span class="badge">📝</span>` : "");
}
function extrasBody(w){
  const L = state.log[w.key] || {}, A = state.strava[w.key];
  const rpe = Array.from({length:10}, (_, i) => `<button class="rpe${L.rpe === i + 1 ? " on" : ""}" data-rpe="${i + 1}" data-for="${w.key}" aria-label="Effort ${i + 1}">${i + 1}</button>`).join("");
  return `${A ? `<a class="act" href="https://www.strava.com/activities/${A.id}" target="_blank" rel="noopener"><span class="label">From Strava</span><b>${esc(A.name)}</b><span class="num">${actSummary(A)}</span></a>` : ""}
    <div class="feel"><span class="label">How did it feel? (effort 1–10)</span><div class="rpes">${rpe}</div>
    <textarea class="note" data-note="${w.key}" rows="2" placeholder="Notes: legs, sleep, pace, fueling, anything worth remembering">${esc(L.note || "")}</textarea></div>`;
}
function setRpe(k, v){
  const L = state.log[k] || (state.log[k] = {});
  L.rpe = L.rpe === v ? undefined : v;
  if (!L.rpe && !L.note) delete state.log[k];
  if (L.rpe && !state.done[k]) state.done[k] = Date.now();
  save(); render(true);
}
let noteT;
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.note) {
    const k = t.dataset.note, L = state.log[k] || (state.log[k] = {});
    L.note = t.value.trim() ? t.value : undefined;
    if (!L.rpe && !L.note) delete state.log[k];
    clearTimeout(noteT); noteT = setTimeout(save, 400);
  } else if (t.dataset.rem) { state.remind[t.dataset.rem] = t.type === "number" ? Number(t.value) : t.value; save(); }
  else if (t.dataset.sv) { sv[t.dataset.sv] = t.value.trim(); saveSv(); }
});

// ---- Morning reminders: a calendar file with one alert per training day ----
function icsEsc(s){ return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
function fold(line){ const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = " " + line.slice(74); } out.push(line); return out.join("\r\n"); }
function remindersICS(){
  const t0 = today0(), stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ironman140//reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Ironman reminders"];
  let n = 0;
  plan.forEach(wk => wk.days.forEach((items, di) => {
    const d = addDays(wk.start, di); if (d < t0) return;
    const ch = items.filter(checkable); if (!ch.length) return;
    const weekend = di >= 5, [hh, mm] = (weekend ? state.remind.we : state.remind.wk).split(":").map(Number);
    const ds = iso(d).replace(/-/g, ""), ts = String(hh).padStart(2, "0") + String(mm).padStart(2, "0") + "00";
    const end = new Date(d); end.setHours(hh, mm + 10);
    const te = String(end.getHours()).padStart(2, "0") + String(end.getMinutes()).padStart(2, "0") + "00";
    const tot = ch.reduce((a, w) => a + w.min, 0);
    const title = ch.map(w => w.t).join(" + ");
    const desc = `Week ${wk.n} · ${wk.phase}\n` + ch.map(w => `• ${SPORT[w.s]}: ${w.t}${w.min ? " (" + dur(w.min) + ")" : ""}${w.when ? " · " + w.when : ""}\n  ${w.z}`).join("\n") + `\nTotal ${dur(tot)}`;
    L.push("BEGIN:VEVENT", "UID:remind-" + ds + "@ironman140", "DTSTAMP:" + stamp, "DTSTART:" + ds + "T" + ts, "DTEND:" + iso(end).replace(/-/g, "") + "T" + te,
      fold("SUMMARY:" + icsEsc("Today: " + title)), fold("DESCRIPTION:" + icsEsc(desc)), "TRANSP:TRANSPARENT",
      "BEGIN:VALARM", "ACTION:DISPLAY", fold("DESCRIPTION:" + icsEsc(title)), "TRIGGER:-PT" + (state.remind.lead || 0) + "M", "END:VALARM", "END:VEVENT");
    n++;
  }));
  L.push("END:VCALENDAR");
  return {text: L.join("\r\n") + "\r\n", n};
}
function downloadReminders(){
  const {text, n} = remindersICS();
  shareFile(text, "ironman-reminders.ics", "text/calendar");
  toast(n + " reminders created");
}
function shareFile(text, name, type){
  const blob = new Blob([text], {type});
  const file = new File([blob], name, {type});
  if (navigator.canShare && navigator.canShare({files:[file]})) { navigator.share({files:[file], title:name}).catch(() => {}); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---- Strava ----
const SPORT_GROUP = t => /Run|Walk|Hike/.test(t) ? "run" : /Ride|Velomobile|Handcycle/.test(t) ? "bike" : /Swim/.test(t) ? "swim" : /Weight|Workout|Crossfit|Yoga|Pilates|Elliptical|StairStepper|Rowing/.test(t) ? "strength" : null;
const PLAN_GROUP = {run:"run", brick:"run", bike:"bike", swim:"swim", strength:"strength"};
const redirectURI = () => location.origin + location.pathname;
let syncing = false;

function stravaConnect(){
  if (!sv.id || !sv.secret) { toast("Add your Strava Client ID and Secret first"); return; }
  const st = Math.random().toString(36).slice(2); sv.oauthState = st; saveSv();
  location.href = "https://www.strava.com/oauth/mobile/authorize?" + new URLSearchParams({client_id:sv.id, redirect_uri:redirectURI(), response_type:"code", approval_prompt:"auto", scope:"activity:read_all", state:st});
}
async function tokenCall(params){
  const r = await fetch("https://www.strava.com/oauth/token", {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:new URLSearchParams(Object.assign({client_id:sv.id, client_secret:sv.secret}, params))});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error((j && j.message) || "Strava sign-in failed (" + r.status + ")");
  sv.access = j.access_token; sv.refresh = j.refresh_token || sv.refresh; sv.expires = j.expires_at;
  if (j.athlete) sv.athlete = [j.athlete.firstname, j.athlete.lastname].filter(Boolean).join(" ");
  saveSv();
}
async function stravaCallback(){
  const q = new URLSearchParams(location.search);
  if (!q.has("code") && !q.has("error")) return false;
  history.replaceState(null, "", location.pathname);
  if (q.get("error")) { toast("Strava connection cancelled"); return true; }
  if (!/activity:read/.test(q.get("scope") || "")) { toast("Allow activity access so the app can read your workouts"); return true; }
  if (!sv.secret || q.get("state") !== sv.oauthState) {
    // iPhone: Strava sent us back to Safari, which can't see the home-screen app's storage. Hand the code over by copy-paste.
    showCode(q.get("code"));
    return true;
  }
  await finishConnect(q.get("code"));
  return true;
}
async function finishConnect(code){
  try { await tokenCall({code, grant_type:"authorization_code"}); delete sv.oauthState; delete sv.pending; saveSv(); toast("Strava connected"); tab = "progress"; render(false); await stravaSync(true); }
  catch(e) { toast(e.message + ". Tap Connect Strava to get a fresh code."); render(false); }
}
function showCode(code){
  view.innerHTML = `<section class="card hero settings"><span class="label">Almost done</span><h2>Copy this code</h2>
    <p class="hint">Strava opened Safari instead of your app. Copy this code, open the <b style="color:var(--ink)">140.6</b> app from your home screen, go to <b style="color:var(--ink)">Progress → Strava</b> and paste it. Do it within a few minutes, the code expires.</p>
    <input class="note" readonly value="${esc(code)}" id="codeBox">
    <div class="btns"><button class="btn primary" data-act="copycode">Copy code</button></div></section>`;
  document.getElementById("viewTitle").textContent = "Strava";
}
function pasteCode(){
  const raw = (document.getElementById("pasteBox") || {}).value || "";
  let code = raw.trim(); const m = code.match(/[?&]code=([^&\s]+)/); if (m) code = m[1];
  if (!sv.id || !sv.secret) { toast("Add your Client ID and Secret first"); return; }
  if (!/^[0-9a-f]{20,}$/i.test(code)) { toast("That doesn't look like a Strava code"); return; }
  finishConnect(code);
}
async function api(path){
  if (!sv.expires || sv.expires * 1000 < Date.now() + 120000) await tokenCall({refresh_token:sv.refresh, grant_type:"refresh_token"});
  const r = await fetch("https://www.strava.com/api/v3" + path, {headers:{Authorization:"Bearer " + sv.access}});
  if (r.status === 401) { sv.access = null; sv.expires = 0; saveSv(); throw new Error("Strava needs you to reconnect"); }
  if (!r.ok) throw new Error("Strava error " + r.status);
  return r.json();
}
async function stravaSync(loud){
  if (syncing || !sv.refresh) return;
  if (!navigator.onLine) { if (loud) toast("You're offline"); return; }
  syncing = true;
  try {
    const after = Math.floor(addDays(START, -1) / 1000);
    let acts = [];
    for (let page = 1; page < 20; page++) {
      const a = await api(`/athlete/activities?after=${after}&per_page=200&page=${page}`);
      acts = acts.concat(a); if (a.length < 200) break;
    }
    acts.sort((a, b) => a.start_date.localeCompare(b.start_date));
    let matched = 0;
    for (const a of acts) {
      if (state.stravaUsed[a.id]) continue;
      const g = SPORT_GROUP(a.sport_type || a.type); if (!g) continue;
      const day = (a.start_date_local || "").slice(0, 10); if (!day) continue;
      const items = dayItems(parseISO(day)).filter(w => checkable(w) && PLAN_GROUP[w.s] === g && !state.strava[w.key]);
      const w = items[0]; if (!w) continue;
      state.strava[w.key] = {id:a.id, g, name:a.name, d:a.distance, t:a.moving_time, hr:a.average_heartrate || 0};
      state.stravaUsed[a.id] = w.key;
      if (!state.done[w.key]) state.done[w.key] = Date.now();
      matched++;
    }
    sv.lastSync = Date.now(); saveSv(); save();
    if (loud || matched) toast(matched ? `Strava: ${matched} workout${matched > 1 ? "s" : ""} checked off` : "Strava: nothing new");
    render(true);
  } catch(e) { if (loud) toast(e.message); }
  finally { syncing = false; }
}
function stravaDisconnect(){
  if (sv.access) fetch("https://www.strava.com/oauth/deauthorize", {method:"POST", headers:{Authorization:"Bearer " + sv.access}}).catch(() => {});
  sv = {id:sv.id, secret:sv.secret}; saveSv(); render(true); toast("Strava disconnected");
}

function extrasSettings(){
  const host = location.host;
  const connected = !!sv.refresh;
  return `
  <section class="card settings"><span class="label">Morning reminders</span>
    <p class="hint">Adds one alert per training day to your phone's calendar, listing that day's workouts. Days off are skipped.</p>
    <div class="fields">
      <label>Weekdays<input type="time" data-rem="wk" value="${state.remind.wk}"></label>
      <label>Weekends<input type="time" data-rem="we" value="${state.remind.we}"></label>
    </div>
    <div class="btns"><button class="btn primary" data-act="remind">Add reminders to calendar</button></div>
    <p class="hint">On iPhone, open the file and tap <b style="color:var(--ink)">Add All</b>. If you change the times later, delete the "Ironman reminders" calendar and add the file again.</p>
  </section>
  <section class="card settings"><span class="label">Strava</span>
    ${connected ? `<p class="hint">Connected${sv.athlete ? " as <b style=\"color:var(--ink)\">" + esc(sv.athlete) + "</b>" : ""}. New activities check off the matching workout and show your distance, time, pace and heart rate. Last sync: ${sv.lastSync ? new Date(sv.lastSync).toLocaleString() : "never"}.</p>
      <div class="btns"><button class="btn primary" data-act="ssync">Sync now</button><button class="btn" data-act="sdisc">Disconnect</button></div>`
    : `<p class="hint">One-time setup (about 3 minutes): on <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener">strava.com/settings/api</a>, create an app. Use any name and website, and set <b style="color:var(--ink)">Authorization Callback Domain</b> to <b style="color:var(--ink)">${esc(host)}</b>. Then paste its Client ID and Client Secret here. They stay on this phone.</p>
      <div class="fields">
        <label>Client ID<input inputmode="numeric" autocomplete="off" data-sv="id" value="${esc(sv.id || "")}"></label>
        <label>Client Secret<input type="password" autocomplete="off" data-sv="secret" value="${esc(sv.secret || "")}"></label>
      </div>
      <div class="btns"><button class="btn primary" data-act="sconn">Connect Strava</button></div>
      <p class="hint">On iPhone, Strava sends you back to Safari with a code. Copy it there, come back here and paste it:</p>
      <div class="fields"><label style="grid-column:1/-1">Code from Strava<input id="pasteBox" autocomplete="off" placeholder="Paste code"></label></div>
      <div class="btns"><button class="btn" data-act="spaste">Finish connecting</button></div>`}
  </section>`;
}
function extrasClick(b){
  if (b.dataset.rpe) { setRpe(b.dataset.for, Number(b.dataset.rpe)); return true; }
  const a = b.dataset.act;
  if (a === "remind") { downloadReminders(); return true; }
  if (a === "sconn") { stravaConnect(); return true; }
  if (a === "spaste") { pasteCode(); return true; }
  if (a === "copycode") { const v = document.getElementById("codeBox").value; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast("Copied. Now open the 140.6 app."), () => { const el = document.getElementById("codeBox"); el.select(); document.execCommand("copy"); toast("Copied"); }); return true; }
  if (a === "ssync") { stravaSync(true); return true; }
  if (a === "sdisc") { stravaDisconnect(); return true; }
  return false;
}
async function extrasInit(){
  const cb = await stravaCallback();
  if (!cb && sv.refresh && (!sv.lastSync || Date.now() - sv.lastSync > 20 * 60000)) stravaSync(false);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && sv.refresh && Date.now() - (sv.lastSync || 0) > 20 * 60000) stravaSync(false); });
}

// ---- App shell ----
const TITLES = {today:"Today", week:"Week", plan:"Plan", progress:"Progress"};
function render(keepScroll){
  const y = window.scrollY;
  document.getElementById("viewTitle").textContent = TITLES[tab];
  document.getElementById("raceName").textContent = state.raceName || "IRONMAN";
  const dl = dayDiff(today0(), parseISO(state.raceDate));
  document.getElementById("daysLeft").textContent = dl >= 0 ? dl : "🏁";
  view.innerHTML = tab === "today" ? renderToday() : tab === "week" ? renderWeek() : tab === "plan" ? renderPlan() : renderProgress();
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
function go(t){ tab = t; render(false); }

let toastT;
function toast(msg){ const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200); }

function toggle(k){
  if (state.done[k]) delete state.done[k]; else state.done[k] = Date.now();
  save();
  if (state.done[k]) {
    if (navigator.vibrate) navigator.vibrate(15);
    const d = k.includes("#") && !k.startsWith("chk") ? parseISO(k.split("#")[0]) : null;
    if (d) {
      const items = dayItems(d).filter(checkable);
      const i = Math.floor(dayDiff(START, d) / 7);
      if (plan[i] && wkDone(plan[i]) === wkKeys(plan[i]).length) toast("Week " + (i + 1) + " complete 🎉");
      else if (items.every(w => isDone(w.key))) toast("Day done. Nice work.");
    }
  }
  render(true);
}

document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.tab) return go(b.dataset.tab);
  if (b.dataset.key && !b.dataset.rpe) return toggle(b.dataset.key);
  if (b.dataset.open) { const k = b.dataset.open; openKeys.has(k) ? openKeys.delete(k) : openKeys.add(k); return render(true); }
  if (b.dataset.wk) { weekIdx = clampWeek(weekIdx + Number(b.dataset.wk)); return render(false); }
  if (b.dataset.wkjump) { weekIdx = clampWeek(curWeek()); return render(false); }
  if (b.dataset.goto) { weekIdx = Number(b.dataset.goto); tab = "week"; return render(false); }
  if (extrasClick(b)) return;
  const act = b.dataset.act;
  if (act === "export") return exportData();
  if (act === "import") return document.getElementById("importFile").click();
  if (act === "hideinstall") { try { localStorage.setItem(KEY + ".hideInstall", "1"); } catch(e) {} return render(true); }
});

// swipe between weeks on the Week tab
let sx = null, sy = null;
view.addEventListener("touchstart", e => { if (tab !== "week") return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive:true});
view.addEventListener("touchend", e => {
  if (tab !== "week" || sx === null) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) { const n = clampWeek(weekIdx + (dx < 0 ? 1 : -1)); if (n !== weekIdx) { weekIdx = n; render(false); } }
}, {passive:true});

function exportData(){
  const blob = new Blob([JSON.stringify({app:"ironman140", exported:new Date().toISOString(), state}, null, 1)], {type:"application/json"});
  const name = "ironman-backup-" + iso(today0()) + ".json";
  const file = new File([blob], name, {type:"application/json"});
  if (navigator.canShare && navigator.canShare({files:[file]})) { navigator.share({files:[file], title:name}).catch(() => {}); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
document.getElementById("importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const j = JSON.parse(await f.text()), s = j.state || j;
    if (!s || typeof s.done !== "object") throw 0;
    state.done = Object.assign({}, state.done, s.done);
    if (s.log) state.log = Object.assign({}, state.log, s.log);
    if (s.strava) { state.strava = Object.assign({}, state.strava, s.strava); state.stravaUsed = Object.assign({}, state.stravaUsed, s.stravaUsed); }
    save(); buildPlan(); render(false); toast("Backup imported");
  } catch(err) { toast("That file isn't a backup from this app"); }
});

// Re-render when the day changes or the app comes back to the foreground
let lastDay = iso(today0());
document.addEventListener("visibilitychange", () => { if (!document.hidden && iso(today0()) !== lastDay) { lastDay = iso(today0()); weekIdx = clampWeek(curWeek()); render(false); } });

render(false);
extrasInit();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing; if (!nw) return;
      nw.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Updated. Reopen the app to load it."); });
    });
  }).catch(() => {});
}
})();
