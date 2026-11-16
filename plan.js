// Training plan generator (same plan as the tracker). Built backwards from the race date.
const START = new Date(2026, 10, 2);
const LS = "road703.v1";
const DAY = 864e5;
const DN = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

let state = {done:{}, raceDate:"2027-05-16", raceName:"", updatedAt:0};
if (!state.done || typeof state.done !== "object") state.done = {};

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const parseISO = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const fmt = d => MON[d.getMonth()] + " " + d.getDate();
const fmtLong = d => ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()] + ", " + MON[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
const dayDiff = (a, b) => Math.round((b - a) / DAY);
const lerp = (a, b, p) => a + (b - a) * p;
const r5 = x => Math.max(5, Math.round(x / 5) * 5);
const ry = x => Math.max(100, Math.round(x / 100) * 100);
const yd = n => n.toLocaleString("en-US") + " yd";
const dur = m => m < 60 ? m + " min" : Math.floor(m/60) + "h" + (m % 60 ? " " + String(m % 60).padStart(2,"0") + "m" : "");
const hrs = m => (Math.round(m / 6) / 10).toFixed(1) + " h";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// migrate() is defined with the plan below; run it once the plan code has loaded
const today0 = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };

const FUEL_BIKE = "Fuel practice: 60–90 g carbs/hr, 500–750 ml fluid/hr plus electrolytes";
const FUEL_RUN = "Fuel practice: a gel or chews every 30–40 min, sip fluids";
const STRENGTH = "Goblet or back squat, Romanian deadlift, step-ups, glute bridge, plank, side plank, band pull-aparts. 2–3 sets of 10–12.";
const CORE = "Dead bug, bird dog, Copenhagen plank, single-leg calf raises, hip and thoracic mobility. Keeps knees and back happy as volume climbs.";

// Workout builders
const swim = (t, y, pace, z, d) => ({s:"swim", t, min:r5(y/100*pace), dist:yd(y), z, d});
// Swim sets that add up exactly: S = fixed n×d, F = repeats of d sized to fill, C = one continuous swim sized to fill.
const S = (n, d, txt) => ({n, d, txt});
const F = (d, txt) => ({n:0, d, txt, flex:true});
const C = txt => ({n:0, d:100, txt, flex:true, cont:true});
const nf = n => n.toLocaleString("en-US");
function setsText(total, sets){
  const fixed = sets.filter(x => !x.flex).reduce((a, x) => a + x.n * x.d, 0);
  const flex = sets.find(x => x.flex);
  if (flex) flex.n = Math.max(1, Math.floor((total - fixed - 500) / flex.d));
  const parts = sets.map(x => x.cont ? `${nf(x.n * x.d)} continuous ${x.txt}` : x.n === 1 ? `${nf(x.d)} ${x.txt}` : `${x.n}×${x.d} ${x.txt}`);
  let R = total - sets.reduce((a, x) => a + x.n * x.d, 0);
  if (R > 800) { parts.push(`${nf(R - 500)} steady aerobic`); R = 500; }
  const cd = R >= 700 ? 200 : 100, wu = R - cd;
  if (wu < 200) console.error("swim set too short", total, sets);
  const wuTxt = wu >= 400 ? `${wu} (${wu - 200} easy, 4×25 drill, 4×25 build)` : `${wu} easy`;
  return `WU ${wuTxt}. Main: ${parts.join(", then ")}. CD ${cd} easy. Total ${nf(total)} yd.`;
}
const sw = (t, y, pace, z, sets, note) => swim(t, y, pace, z, setsText(y, sets) + (note ? " " + note : ""));
const W = (s, t, min, z, d, fuel) => ({s, t, min, z, d, fuel});
const REST = {s:"rest", t:"Rest day", min:0, z:"Off", d:"No training. Sleep, eat well, 10 min of easy stretching or a walk if you like."};

function baseWeek(p, rec, test, stage){
  const f = rec ? 0.65 : 1, pace = 2.75 - 0.4 * p;
  const days = [[REST],[],[],[],[],[],[]];
  // Tue
  if (test) days[1].push(swim("Swim assessment", 1000, 2.75, "Easy, then one strong 100", "Warm up 200 easy. Swim as far as you can continuously at a relaxed pace and log distance and time. Rest, then time one 100 yd at strong effort. Your baseline."));
  else days[1].push(swim("Technique swim", ry(lerp(1000,1900,p)*f), pace, "Z1–2 · RPE 3–4", [
    "Drills: 6×25 side-kick, 6×25 catch-up, 6×25 fingertip drag (20s rest). Then 6×50 easy freestyle focusing on a long exhale and a relaxed kick.",
    "Warm-up 200, drills 8×25, main 6×100 smooth at RPE 5 (20s rest), cool-down 100.",
    "Warm-up 300, drills 6×50, main 4×200 steady (30s rest) breathing every 3 strokes, cool-down 200."][rec ? 0 : stage]));
  if (test) days[1].push(W("run","5K time trial",45,"Z4 · RPE 8","15' warm-up, then a solo 5K as fast as you can hold evenly. Average HR of the last 20' approximates your threshold HR. Sets your run zones."));
  else days[1].push(W("run","Easy run + strides", r5(lerp(35,50,p)*f), "Z2 · RPE 3–4", rec ? "Easy aerobic run, no strides this week." : "Easy aerobic run, then 6×20s strides: smooth and fast with full walk-back recovery."));
  // Wed
  if (test) days[2].push(W("bike","20-min threshold test",60,"Z4–5 · RPE 8–9","Warm up 15', 5' hard, 5' easy, then 20' as hard as you can hold evenly. FTP ≈ 95% of 20' average power; also note average HR. Cool down 10'."));
  else days[2].push(W("bike","Trainer ride", r5(lerp(60,75,p)*f), stage === 0 || rec ? "Z2 · RPE 3–4" : "Z2 with Z3 blocks", rec ? "Steady Z2 spin, easy gearing, cadence 85–95." : [
    "Z2 ride with 5×1' high cadence (100+ rpm) / 2' easy. Good week to fine-tune bike fit.",
    "Z2 ride with 3×8' tempo (Z3, RPE 6) / 4' easy.",
    "Z2 ride with 3×12' sweet spot (top of Z3, RPE 6–7) / 5' easy."][stage]));
  days[2].push(W("strength","Strength", rec ? 20 : 30, "RPE 6", rec ? "Light version: one set of each, focus on form." : STRENGTH));
  // Thu
  days[3].push(swim("Endurance swim", ry(lerp(900,2000,p)*f), pace, "Z2 · RPE 4–5", [
    "Main: 4×100 easy (30s rest), then swim 200 continuous. Add 50–100 yd to the continuous swim each week.",
    "Main: 3×300 steady (30s rest) + 4×50 with pull buoy.",
    "Main: 1,000 continuous at steady effort, sighting every 8 strokes, then 4×100 pull."][rec ? 0 : stage]));
  days[3].push(W("run","Easy run", r5(lerp(30,45,p)*f), "Z1–2 · RPE 2–3", "Recovery-pace run. Conversational the whole way."));
  // Fri
  days[4].push(swim("Skills + speed swim", ry(lerp(800,1600,p)*f), pace, "Z2–3 · RPE 4–6", "8×25 drill/swim by 25, then 8×50 (15s rest) building to RPE 6 on each, then 200 easy. Practice bilateral breathing."));
  days[4].push(W("strength","Core + mobility", rec ? 15 : 25, "RPE 5", CORE));
  // Sat
  const lb = r5(lerp(105,150,p)*f);
  days[5].push(W("bike","Long ride", lb, stage === 2 && !rec ? "Z2 with 2×15' Z3" : "Z2 · RPE 3–4", (stage === 2 && !rec ? "Steady endurance ride with 2×15' at Z3 in the second half. " : "Steady endurance ride on flat-to-rolling roads. Hold Z2, cadence 85–95. ") , lb >= 90 ? FUEL_BIKE : ""));
  // Sun
  const lr = r5(lerp(60,85,p)*f);
  days[6].push(W("run","Long run", lr, "Z2 · RPE 3–4", "Long easy run, soft surfaces when you can. Last 10' at the top of Z2.", lr >= 75 ? FUEL_RUN : ""));
  return days;
}

function buildWeek(p, rec, test, ows){
  const f = rec ? 0.65 : 1, pace = 2.3 - 0.15 * p;
  const days = [[REST],[],[],[],[],[],[]];
  const reps = Math.round(lerp(8,14,p));
  if (test) days[1].push(swim("CSS swim test", 1800, 2.3, "Z4 · RPE 8", "Warm up 400. Swim a 400 yd time trial, 5' easy, then a 200 yd time trial. CSS pace per 100 = (T400 − T200) ÷ 2. Use it for every CSS set."));
  else days[1].push(swim("CSS intervals", ry(lerp(1900,2600,p)*f), pace, rec ? "Z2 · RPE 4" : "Z4 · CSS pace", rec ? "Easy aerobic swim with 6×50 drill. No hard efforts." : "Warm-up 400, main " + reps + "×100 at CSS pace (15s rest), cool-down 200."));
  if (test) days[1].push(W("run","5K time trial",45,"Z4 · RPE 8","15' warm-up, then a solo 5K. Compare to week 1 and update your run zones."));
  else days[1].push(W("run", rec ? "Easy run" : "Tempo run", r5(lerp(45,60,p)*f), rec ? "Z2" : "Z3–4 · RPE 7", rec ? "Easy aerobic run with 4 strides." : (p < .34 ? "3×8' at half-marathon effort / 2' jog" : p < .67 ? "3×10' at half-marathon effort / 2' jog" : "2×15' at half-marathon effort / 3' jog") + ", with 15' warm-up and 10' cool-down."));
  if (test) days[2].push(W("bike","20-min threshold test",60,"Z4–5 · RPE 8–9","Same protocol as week 1. Update your bike zones from the result."));
  else days[2].push(W("bike", rec ? "Easy spin" : "Bike intervals", r5(lerp(75,90,p)*f), rec ? "Z2" : "Z4 · RPE 7–8", rec ? "Easy Z2 spin with 4×1' high cadence." : (p < .34 ? "5×6' at threshold (Z4) / 3' easy" : p < .67 ? "4×10' at threshold (Z4) / 4' easy" : "3×15' at 70.3 race effort (top of Z3) / 5' easy") + "."));
  days[2].push(W("strength","Strength (maintenance)", rec ? 15 : 25, "RPE 6–7", rec ? "Mobility and core only." : "Once a week now: squats and RDL 3×6 (heavier), step-ups, side plank. Skip if legs are cooked before Saturday."));
  days[3].push(swim("Endurance swim", ry(lerp(2000,2800,p)*f), pace, "Z2–3 · RPE 5", "Swim " + yd(ry(lerp(1000,1800,p)*f)) + " continuous at steady effort with bilateral breathing, then 4×100 pull."));
  days[3].push(W("run","Easy run", r5(lerp(40,45,p)*f), "Z2 · RPE 3", "Easy aerobic run. Keep it truly easy so Tuesday and Sunday stay quality."));
  if (ows && !rec) days[4].push(W("swim","Open-water swim", r5(lerp(35,45,p)), "Z2–3 · RPE 5", "Wetsuit swim in open water if it's safe and warm enough, always with a buddy. Practice sighting, swimming straight, and getting the wetsuit off fast. If no open water yet, pool swim in the wetsuit with a sighting set.", ""));
  else days[4].push(swim("Open-water skills (pool)", ry(lerp(1600,2200,p)*f), pace, "Z2–4 · RPE 4–7", "Sighting every 6 strokes, 4×(deep-water start + 100 hard), turns at the wall without pushing off, swimming close to others if a friend joins."));
  const lb = r5(lerp(150,210,p)*f);
  days[5].push(W("bike","Long ride", lb, rec ? "Z2" : "Z2 with Z3 blocks", rec ? "Steady endurance ride. No race-pace work this week." : "Long ride with " + (p < .5 ? 2 : 3) + "×20' at 70.3 race effort (Z3, RPE 6). Practice staying aero and eating on the bike.", FUEL_BIKE));
  if (!rec) days[5].push(W("brick","Brick run", r5(lerp(15,30,p)), "Z3 · goal race pace", "Run within 5 min of getting off the bike. First 5' easy to find your legs, then settle at goal race pace. Practice a quick T2."));
  const lr = r5(lerp(80,105,p)*f);
  days[6].push(W("run","Long run", lr, rec ? "Z2" : "Z2 → Z3 finish", rec ? "Easy long run." : (p < .5 ? "Long easy run, last 10' at goal race pace." : "Long run, last 20' at goal race pace."), FUEL_RUN));
  return days;
}

function peakWeek(i){
  const days = [[REST],[],[],[],[],[],[]];
  if (i === 2) { // recovery
    days[1].push(swim("Aerobic swim", 1800, 2.1, "Z2", "Easy swim with 6×50 drill and 4×100 steady."));
    days[1].push(W("run","Easy run",40,"Z2","Easy aerobic run with 4 strides."));
    days[2].push(W("bike","Easy spin",60,"Z2","Easy spin, high cadence."));
    days[2].push(W("strength","Core + mobility",15,"RPE 5",CORE));
    days[3].push(swim("Aerobic swim", 2000, 2.1, "Z2", "1,000 continuous easy + 4×100 pull."));
    days[3].push(W("run","Easy run",30,"Z1–2","Short and easy."));
    days[4].push(W("swim","Open-water swim",30,"Z2","Relaxed wetsuit swim. Sighting practice only.",""));
    days[5].push(W("bike","Long ride",150,"Z2","Steady endurance ride. Absorb the last two big weeks.",FUEL_BIKE));
    days[6].push(W("run","Long run",75,"Z2","Easy long run.",FUEL_RUN));
    return days;
  }
  if (i === 3) { // race simulation
    days[1].push(swim("Race-pace swim", 2400, 2.1, "Z3 · race pace", "3×600 at goal race pace (30s rest) + 6×50 fast."));
    days[1].push(W("run","Race-pace run",50,"Z3","2×15' at goal 70.3 run pace / 3' jog."));
    days[2].push(W("bike","Race-effort intervals",75,"Z3","2×20' at race effort, 5×1' high cadence."));
    days[3].push(swim("Endurance swim", 2200, 2.1, "Z2", "1,500 continuous steady + 4×100 pull."));
    days[3].push(W("run","Easy run",35,"Z2","Easy."));
    days[4].push(swim("Easy swim", 1200, 2.1, "Z1–2", "Short, loose swim. Lay out tomorrow's kit and nutrition tonight."));
    days[5].push(W("swim","Race sim: open-water swim",45,"Z3 · race effort","1,800–2,000 yd in your wetsuit at race effort. Practice a race start and sighting.",""));
    days[5].push(W("bike","Race sim: bike",150,"Z3 · race effort","Straight into a 2:30 ride at race effort with your exact race-day nutrition, bottles and kit. Practice T1.",FUEL_BIKE));
    days[5].push(W("brick","Race sim: run",40,"Z3 · goal race pace","Off the bike into 40' at goal race pace. Practice T2. Note what your stomach and legs tell you."));
    days[6].push(W("run","Easy run",60,"Z1–2","Easy recovery run. Review the sim and lock in your race plan."));
    return days;
  }
  const big = i === 1;
  days[1].push(swim("Race-pace swim", big ? 2800 : 2700, 2.1, "Z3 · race pace", "Warm-up 400, 3×600 at goal race pace (30s rest), 6×50 fast, cool-down."));
  days[1].push(W("run","Race-pace run",60,"Z3","15' warm-up, 3×10' at goal 70.3 run pace / 3' jog, cool-down."));
  days[2].push(W("bike","Race-effort intervals",90,"Z3–4","2×25' at race effort + 5×1' high cadence."));
  days[2].push(W("strength","Core + mobility",20,"RPE 5",CORE));
  days[3].push(swim("Race-distance swim", big ? 3000 : 2800, 2.1, "Z2–3", "2,000+ yd continuous at steady effort (race distance is 2,112 yd), then 4×100 pull."));
  days[3].push(W("run","Easy run",45,"Z2","Easy aerobic run."));
  days[4].push(W("swim","Open-water swim",45,"Z3 · race effort","Wetsuit swim: 1.2 mi steady with a fast start, sighting every 6–8 strokes, and a run-out exit.",""));
  days[5].push(W("bike","Race rehearsal ride", big ? 240 : 225, "Z2 with Z3 blocks", "2×45' at 70.3 race effort on a course like your race. Eat and drink exactly your race plan.", FUEL_BIKE));
  days[5].push(W("brick","Brick run", big ? 40 : 35, "Z3 · goal race pace", "Off the bike: 5' easy, then goal race pace. This is your longest brick."));
  days[6].push(W("run","Long run", big ? 110 : 105, "Z2 with Z3 middle", "Long run with the middle 40' at goal race pace.", FUEL_RUN));
  return days;
}

function taperWeek(){
  const days = [[REST],[],[],[],[],[],[]];
  days[1].push(swim("Race-pace swim", 2000, 2.1, "Z3", "Warm-up 400, 6×200 at race pace (20s rest), cool-down."));
  days[1].push(W("run","Race-pace run",40,"Z3","3×8' at goal race pace / 2' jog."));
  days[2].push(W("bike","Race-effort ride",60,"Z3","3×10' at race effort / 3' easy."));
  days[3].push(swim("Easy swim", 1800, 2.1, "Z2", "Easy swim with 8×50 build."));
  days[3].push(W("run","Easy run",30,"Z2","Easy with 4 strides."));
  days[4].push(W("swim","Open-water swim",30,"Z2–3","Wetsuit swim with 3×3' at race effort. Last chance to test goggles and wetsuit.",""));
  days[5].push(W("bike","Long ride",120,"Z2 with Z3","2×20' at race effort. Final full test of race-day nutrition.",FUEL_BIKE));
  days[5].push(W("brick","Brick run",20,"Z3","Short brick at goal race pace."));
  days[6].push(W("run","Long run",70,"Z2","Easy long run, last 15' at race pace.",FUEL_RUN));
  return days;
}

function raceWeek(weekStart, race){
  const days = [];
  const byOff = {
    "-6": [REST],
    "-5": [swim("Race-pace swim",1500,2.1,"Z3 touches","Warm-up, then 6×50 at race pace with full rest. Feel sharp, not tired."), W("run","Short run",30,"Z2 + Z3","Easy with 4×1' at goal race pace.")],
    "-4": [W("bike","Openers ride",50,"Z2 + Z3","Easy ride with 3×5' at race effort. Check gears and brakes.")],
    "-3": [swim("Easy swim",1200,2.1,"Z1–2","Loose and easy. Open water if you can get it."), W("run","Easy run",20,"Z2","Easy with 4 strides.")],
    "-2": [Object.assign({}, REST, {t:"Rest / travel", d:"Rest. Pack using the checklist below. Carbs up a bit at each meal and drink to thirst. Packet pickup if it's open."})],
    "-1": [W("brick","Shakeout",45,"Z1–2 with pickups","15' swim, 20' bike with 3×30s pickups, 10' run with strides. Rack your bike, walk transitions, early dinner, early bed.")],
    "0":  [W("race","RACE DAY",0,"See pacing plan","Swim 1.2 mi · Bike 56 mi · Run 13.1 mi. Stick to the plan below. Enjoy it, you earned this.")]
  };
  for (let d = 0; d < 7; d++) {
    const off = dayDiff(race, addDays(weekStart, d));
    if (off > 0) days.push([Object.assign({}, REST, {t:"Recovery", d:"Celebrate. Walk, eat, sleep. No structured training for a week."})]);
    else if (off < -6) days.push([W("swim","Easy swim",30,"Z2","Easy aerobic swim.")]);
    else days.push(byOff[String(off)]);
  }
  return days;
}

let plan = [];

// ---- Schedule: bike + run Mon–Fri, swim Sat + Sun ----
const SWIM_NOTE = " Weekday swimming isn't possible, so if you can fit a second short session in on the same day (20' of drills later on), take it.";
const GULF = "The race swim is in the Gulf of Mexico. Practice in the ocean or a lake when you can: sighting, chop and swimming without a pool wall.";

function baseWeek2(p, rec, stage, test){
  const f = rec ? 0.65 : 1, pace = 2.45 - 0.3 * p;
  const days = [[],[],[],[],[],[],[]];
  days[0].push(W("bike","Recovery spin", rec ? 40 : 45, "Z1–2 · RPE 2–3", "Easy spin, high cadence, legs only. Loosens you up after the weekend."));
  days[0].push(W("strength","Strength", rec ? 20 : 30, "RPE 6", rec ? "Light version: one set of each, focus on form." : STRENGTH));
  days[1].push(W("run", rec ? "Easy run + strides" : "Run quality", r5(lerp(50,65,p)*f), rec ? "Z2" : "Z3–4 · RPE 7", rec ? "Easy aerobic run with 6×20s strides." : [
    "15' warm-up, 6×3' at 10K effort / 2' jog, 10' cool-down.",
    "15' warm-up, 3×10' at half-marathon effort / 2' jog, 10' cool-down.",
    "15' warm-up, 2×15' at half-marathon effort / 3' jog, 10' cool-down."][stage]));
  days[2].push(W("bike","Bike intervals", r5(lerp(70,90,p)*f), rec ? "Z2" : "Z3–4 · RPE 6–8", rec ? "Steady Z2 trainer ride, cadence 85–95." : [
    "Z2 with 4×6' tempo (Z3) / 3' easy and 5×1' high cadence.",
    "Z2 with 3×12' sweet spot (top of Z3) / 4' easy.",
    "Z2 with 4×10' at threshold (Z4) / 4' easy."][stage]));
  days[2].push(W("run","Run off the bike", rec ? 10 : 15, "Z2", "Straight off the trainer, easy pace. Teaches your legs the bike-to-run switch."));
  const lr = r5(lerp(80,105,p)*f);
  days[3].push(W("run","Long run", lr, "Z2 · RPE 3–4", rec ? "Easy long run." : (stage < 2 ? "Steady long run at conversational pace. Soft surfaces when you can." : "Long run, last 15' at goal 70.3 run pace."), FUEL_RUN));
  const lb = r5(lerp(120,165,p)*f);
  days[4].push(W("bike","Long ride", lb, rec ? "Z2" : stage === 2 ? "Z2 with Z3 blocks" : "Z2 · RPE 3–4", rec ? "Steady endurance ride." : (stage === 2 ? "Endurance ride with 2×20' at 70.3 effort in the second half. " : "Steady endurance ride, cadence 85–95. ") + "Indoors on the trainer is fine on dark evenings.", FUEL_BIKE));
  days[5].push(sw("Technique + CSS swim", ry(lerp(1800,2600,p)*f), pace, rec ? "Z2" : "Z2–4", rec ? [S(8,50,"drill"), F(100,"easy (15s rest)")] : [
    [S(8,50,"drill (catch-up, fingertip drag, 6-kick switch)"), F(100,"steady (20s rest)")],
    [S(6,50,"drill"), F(100,"at CSS pace (15s rest)")],
    [S(4,50,"drill"), F(100,"at CSS pace (15s rest, extra 1' after every 4)")]][stage], SWIM_NOTE.trim()));
  days[5].push(W("strength","Core + mobility", rec ? 15 : 20, "RPE 5", CORE));
  days[6].push(sw("Endurance swim", ry(lerp(2000,3000,p)*f), pace, "Z2 · RPE 4–5", rec ? [F(300,"easy (20s rest)")] : [
    [F(300,"steady (30s rest), breathing every 3"), S(6,50,"pull buoy (15s rest)")],
    [F(800,"steady (1' rest), sighting every 8 strokes"), S(4,100,"pull (15s rest)")],
    [C("at steady effort, sighting every 6–8 strokes"), S(6,100,"pull (15s rest)")]][stage]));
  if (test) {
    days[1][0] = W("run","5K time trial",45,"Z4 · RPE 8","15' warm-up, then a solo 5K as fast as you can hold evenly. Average HR of the last 20' approximates your threshold HR. Sets your run zones.");
    days[2][0] = W("bike","20-min threshold test",60,"Z4–5 · RPE 8–9","Warm up 15', 5' hard, 5' easy, then 20' as hard as you can hold evenly. FTP ≈ 95% of 20' average power; also note average HR. Cool down 10'.");
    days[5][0] = sw("CSS swim test", 1800, 2.45, "Z4 · RPE 8", [S(1,400,"time trial, as fast as you can hold evenly"), S(1,200,"easy recovery"), S(1,200,"time trial"), F(100,"easy pull (15s rest)")], "CSS pace per 100 = (T400 − T200) ÷ 2. Use it for every CSS set.");
  }
  return days;
}

function buildWeek2(p, rec, test, ows){
  const f = rec ? 0.65 : 1, pace = 2.15 - 0.1 * p;
  const days = [[],[],[],[],[],[],[]];
  days[0].push(W("bike","Recovery spin", rec ? 40 : 45, "Z1–2", "Easy spin, high cadence."));
  days[0].push(W("strength","Strength (maintenance)", rec ? 15 : 25, "RPE 6–7", rec ? "Mobility and core only." : "Squats and RDL 3×6 (heavier), step-ups, side plank."));
  if (test) days[1].push(W("run","5K time trial",45,"Z4 · RPE 8","15' warm-up, then a solo 5K. Update your run zones."));
  else days[1].push(W("run", rec ? "Easy run" : "Run quality", r5(lerp(60,75,p)*f), rec ? "Z2" : "Z3–4 · RPE 7", rec ? "Easy run with 4 strides." : (p < .5 ? "15' warm-up, 3×12' at half-marathon effort / 2' jog, 10' cool-down." : "15' warm-up, 3×15' at goal 70.3 run pace / 3' jog, 10' cool-down.")));
  if (test) days[2].push(W("bike","20-min threshold test",60,"Z4–5 · RPE 8–9","Warm up 15', 5' hard, 5' easy, then 20' as hard as you can hold evenly. FTP ≈ 95% of 20' power. Update bike zones."));
  else days[2].push(W("bike", rec ? "Easy spin" : "Bike intervals", r5(lerp(90,105,p)*f), rec ? "Z2" : "Z4 · RPE 7–8", rec ? "Easy Z2 ride." : (p < .5 ? "5×8' at threshold (Z4) / 4' easy." : "3×15' at threshold (Z4) / 5' easy.")));
  days[2].push(W("brick", rec ? "Run off the bike" : "Brick run", rec ? 10 : r5(lerp(15,25,p)), "Z3 · goal race pace", rec ? "Easy jog off the bike." : "Off the bike within 3 minutes. First 5' settle, then goal race pace."));
  const lr = r5(lerp(95,120,p)*f);
  days[3].push(W("run","Long run", lr, rec ? "Z2" : "Z2 → Z3 finish", rec ? "Easy long run." : (p < .5 ? "Long run, last 20' at goal 70.3 run pace." : "Long run with the middle 30' and last 10' at goal 70.3 run pace."), FUEL_RUN));
  const lb = r5(lerp(165,210,p)*f);
  days[4].push(W("bike","Long ride", lb, rec ? "Z2" : "Z2 with Z3 blocks", rec ? "Steady endurance ride, no race-pace work." : "Long ride with " + (p < .5 ? 2 : 3) + "×20' at 70.3 race effort. Stay in the aero position and eat on schedule.", FUEL_BIKE));
  if (!rec) days[4].push(W("brick","Brick run", r5(lerp(20,35,p)), "Z3 · goal race pace", "Run right off the long ride at goal race pace. Practice a fast T2."));
  if (test) days[5].push(swim("CSS swim test", 2000, 2.2, "Z4 · RPE 8", "Warm up 400. 400 yd time trial, 5' easy, then 200 yd time trial. CSS pace per 100 = (T400 − T200) ÷ 2."));
  else days[5].push(swim("CSS swim", ry(lerp(2600,3200,p)*f), pace, rec ? "Z2" : "Z4 · CSS pace", rec ? "Easy swim with drills." : "Warm-up 400, drills 4×50, main " + Math.round(lerp(10,16,p)) + "×100 at CSS pace (15s rest), 4×50 fast, cool-down 200." + SWIM_NOTE));
  days[5].push(W("strength","Core + mobility", 15, "RPE 5", CORE));
  if (ows && !rec) days[6].push(W("swim","Open-water swim", r5(lerp(50,60,p)), "Z2–3 · RPE 5", "Ocean or lake swim, always with a buddy: 1,800–2,200 yd steady with sighting every 6 strokes, a few fast starts and beach exits. " + GULF, ""));
  else days[6].push(swim("Endurance swim", ry(lerp(2800,3400,p)*f), pace, "Z2–3 · RPE 5", "Swim " + yd(ry(lerp(1500,2200,p)*f)) + " continuous at steady effort, then 6×100 pull with sighting."));
  return days;
}

function peakWeek2(i){
  const days = [[],[],[],[],[],[],[]];
  if (i === 2) {
    days[0].push(REST);
    days[1].push(W("run","Easy run",45,"Z2","Easy aerobic run with 4 strides."));
    days[2].push(W("bike","Easy ride",60,"Z2","Easy ride, high cadence."));
    days[3].push(W("run","Long run",80,"Z2","Easy long run.",FUEL_RUN));
    days[4].push(W("bike","Long ride",150,"Z2","Steady endurance ride. Absorb the last two big weeks.",FUEL_BIKE));
    days[5].push(swim("Easy swim", 2200, 2.05, "Z2", "Drills and easy 100s."));
    days[6].push(W("swim","Open-water swim",40,"Z2","Relaxed open-water swim. Sighting practice only.",""));
    return days;
  }
  const big = i === 1, sim = i === 3;
  days[0].push(W("bike","Recovery spin",45,"Z1–2","Easy spin."));
  days[0].push(W("strength","Core + mobility",20,"RPE 5",CORE));
  days[1].push(W("run","Race-pace run", sim ? 55 : 70,"Z3","15' warm-up, " + (sim ? "2×15'" : "3×15'") + " at goal 70.3 run pace / 3' jog, cool-down."));
  days[2].push(W("bike","Race-effort intervals", sim ? 75 : 100,"Z3–4", sim ? "2×20' at race effort." : "2×30' at race effort + 5×1' high cadence."));
  days[2].push(W("brick","Brick run",20,"Z3","Goal race pace off the bike."));
  days[3].push(W("run","Long run", sim ? 90 : big ? 130 : 120, "Z2 with Z3 middle", sim ? "Steady long run, last 20' at goal pace." : "Long run with the middle 40' at goal 70.3 run pace. Your longest runs of the plan.", FUEL_RUN));
  days[4].push(W("bike", sim ? "Race simulation: bike" : "Race rehearsal ride", sim ? 165 : big ? 210 : 195, "Z2 with Z3 blocks", sim ? "56 miles at race effort with your exact race-day kit, bottles and nutrition. Practice T1 setup before you start." : "2×45' at 70.3 race effort. Eat and drink exactly your race plan.", FUEL_BIKE));
  days[4].push(W("brick", sim ? "Race simulation: run" : "Brick run", sim ? 50 : big ? 45 : 40, "Z3 · goal race pace", sim ? "Straight into 50' at goal race pace. Note what your stomach and legs tell you." : "Off the bike: 5' easy, then goal race pace. Longest bricks of the plan."));
  days[5].push(swim("Race-pace swim", big ? 3400 : 3200, 2.05, "Z3 · race pace", "Warm-up 400, 3×600 at goal race pace (30s rest), 6×50 fast, cool-down." + SWIM_NOTE));
  days[6].push(W("swim", sim ? "Race simulation: swim" : "Open-water swim", sim ? 50 : 60, "Z3 · race effort", (sim ? "Full 1.2 mi (2,112 yd) at race effort with a race-style start, then 10' easy. " : "Open-water swim: 1.2 mi steady plus 4 fast starts. ") + GULF, ""));
  return days;
}

function taperWeek2(){
  const days = [[],[],[],[],[],[],[]];
  days[0].push(REST);
  days[1].push(W("run","Race-pace run",45,"Z3","3×8' at goal race pace / 2' jog."));
  days[2].push(W("bike","Race-effort ride",75,"Z3","3×10' at race effort / 3' easy."));
  days[2].push(W("brick","Brick run",15,"Z3","Short brick at goal pace."));
  days[3].push(W("run","Medium run",60,"Z2","Easy, last 10' at race pace.",FUEL_RUN));
  days[4].push(W("bike","Long ride",120,"Z2 with Z3","2×20' at race effort. Final full test of race-day nutrition.",FUEL_BIKE));
  days[5].push(swim("Race-pace swim", 2400, 2.05, "Z3", "Warm-up 400, 6×200 at race pace (20s rest), cool-down."));
  days[6].push(W("swim","Open-water swim",40,"Z2–3","Open-water swim with 4×3' at race effort. Last swim before race week: test goggles and wetsuit. " + GULF,""));
  return days;
}

function raceWeek2(weekStart, race){
  const days = [];
  const byOff = {
    "-6": [W("swim","Easy swim",30,"Z1–2","Short, loose swim.")],
    "-5": [W("bike","Easy spin",40,"Z2","Easy spin with 3×1' at race effort.")],
    "-4": [W("run","Short run",30,"Z2 + Z3","Easy with 4×1' at goal race pace.")],
    "-3": [W("bike","Openers ride",45,"Z2 + Z3","Easy ride with 3×5' at race effort. Check gears, brakes and tires.")],
    "-2": [Object.assign({}, REST, {t:"Rest / travel", d:"Rest. Travel to Panama City Beach, pack using the checklist below. Carbs up a bit at each meal and drink to thirst."})],
    "-1": [W("brick","Shakeout",40,"Z1–2 with pickups","10–15' easy swim at the race venue if it's open (the only weekday swim in the plan), 20' bike with 3×30s pickups, 10' run with strides. Rack your bike, walk transitions, early dinner, early bed.")],
    "0":  [W("race","RACE DAY",0,"See pacing plan","IRONMAN 70.3 Gulf Coast. Swim 1.2 mi · Bike 56 mi · Run 13.1 mi. Stick to the plan below. Enjoy it, you earned this.")]
  };
  for (let d = 0; d < 7; d++) {
    const off = dayDiff(race, addDays(weekStart, d));
    if (off > 0) days.push([Object.assign({}, REST, {t:"Recovery", d:"Celebrate. Walk, eat, sleep. No structured training for a week."})]);
    else if (off < -6) days.push([REST]);
    else days.push(byOff[String(off)]);
  }
  return days;
}


// ---- Schedule from week 2 (Nov 9) ----
// Mon: gym/recovery only. Tue–Fri: bike/run 4–6 AM, swims after work.
// 4 swims a week: 2-swim weekends get 2 weekday swims (Tue, Thu); 1-swim weekends get 3 (Tue, Thu, Fri).
const GULF3 = "The race swim is in the St. Johns River in Jacksonville. Get into a river or lake when you can: sighting, current and no pool wall. Mid-May water can be too warm for a wetsuit, so do some swims without one.";
const DRILLS = "Drills: catch-up, fingertip drag, 6-kick switch, single-arm.";
const am = w => Object.assign(w, {when: "4–6 AM"});
const pm = w => Object.assign(w, {when: "After work"});
const GYM = {s:"rest", t:"Gym day · recovery", min:0, z:"No tri training", d:"Your regular gym session only. No swim, bike or run today, so the body recovers from the weekend."};
// Fixed shuffle so each week keeps the same weekend pattern every time the page loads
const DOUBLE_WEEKEND = n => [0,1,1,0,1,0,0,1,1,0,1,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,0][n % 28] === 1;

function baseWeek3(p, rec, stage, dbl){
  const f = rec ? 0.65 : 1, pace = 2.3 - 0.25 * p;
  const days = [[GYM],[],[],[],[],[],[]];
  // Tue
  days[1].push(am(W("bike", rec ? "Steady ride" : "Bike intervals", r5(lerp(75,85,p)*f), rec ? "Z2" : "Z4–5 · RPE 7–9", rec ? "Steady Z2 trainer ride, cadence 85–95." : [
    "15' warm-up, 5×6' at threshold (Z4) / 3' easy, 5×30s hard / 30s easy, cool-down.",
    "15' warm-up, 3×12' over-unders (2' just above threshold / 1' just below) / 4' easy, cool-down.",
    "15' warm-up, 2×20' at threshold (Z4) / 5' easy, cool-down."][stage])));
  days[1].push(am(W("brick","Brick run", rec ? 15 : r5(lerp(25,35,p)), "Z3 · goal race pace", "Off the bike within 3 minutes. First 5' settle, then goal Ironman run pace. Treadmill is fine.")));
  days[1].push(pm(sw("Technique + CSS swim", ry(lerp(2200,3200,p)*f), pace, rec ? "Z2" : "Z2–4", rec ? [S(8,50,"drill"), F(100,"easy (15s rest)")] : [
    [S(8,50,"drill"), F(100,"at CSS pace (15s rest)")],
    [S(6,50,"drill"), F(100,"at CSS pace (10s rest, extra 1' after every 5)")],
    [S(4,50,"drill"), F(300,"at CSS + 3s/100 (20s rest)")]][stage], stage === 0 && !rec ? DRILLS : "")));
  // Wed
  days[2].push(am(W("run","Easy run", r5(lerp(50,65,p)*f), "Z2 · RPE 3", "Easy aerobic run with 6×20s strides at the end.")));
  days[2].push(am(W("strength","Core + mobility", 15, "RPE 5", CORE)));
  // Thu
  days[3].push(am(W("run", rec ? "Easy run + strides" : "Run intervals", r5(lerp(65,80,p)*f), rec ? "Z2" : "Z4–5 · RPE 8", rec ? "Easy aerobic run with 6×20s strides." : [
    "15' warm-up, 6×4' at 5K–10K effort / 2' jog, 10' cool-down.",
    "15' warm-up, 5×1 mi at 10K effort / 90s jog, 10' cool-down.",
    "15' warm-up, 3×2 mi at half-marathon effort / 2' jog, 10' cool-down."][stage])));
  days[3].push(pm(sw("Endurance swim", ry(lerp(2800,3800,p)*f), pace, "Z2–3 · RPE 5", rec ? [F(400,"easy (20s rest)")] : [
    [F(400,"steady (30s rest), breathing every 3"), S(6,50,"pull (15s rest)")],
    [F(1000,"steady (1' rest), sighting every 8 strokes"), S(6,100,"pull (15s rest)")],
    [C("at steady effort, sighting every 6–8 strokes"), S(6,100,"pull (15s rest)")]][stage])));
  // Fri
  days[4].push(am(W("bike","Tempo ride", r5(lerp(60,75,p)*f), rec ? "Z2" : "Z2–3", rec ? "Easy spin." : "Z2 with 3×8' at Ironman effort. Keep it controlled: the long ride is tomorrow.")));
  if (!dbl) days[4].push(pm(sw("Aerobic swim", ry(lerp(1800,2600,p)*f), pace, "Z2 · RPE 4", [S(8,50,"as 25 fast / 25 easy"), F(stage < 2 ? 200 : 400, "steady, bilateral breathing (20s rest)")])));
  // Sat: swim first, then long ride + brick (race order)
  days[5].push(sw(dbl ? "Technique swim" : "Long swim", ry(lerp(dbl ? 2200 : 2800, dbl ? 2800 : 3800, p)*f), pace, "Z2 · RPE 4–5", dbl
    ? [S(8,50,"drill"), F(200,"steady, bilateral breathing (20s rest)")]
    : [stage < 2 ? F(700,"steady with sighting (30s rest)") : C("steady, sighting every 6–8 strokes"), S(6,50,"drill (15s rest)")],
    (dbl ? "" : "Your only weekend swim. ") + "Then straight to the bike."));
  const lb = r5(lerp(180,300,p)*f);
  days[5].push(W("bike","Long ride", lb, rec ? "Z2" : stage === 0 ? "Z2 with Z3 blocks" : "Z2–3", rec ? "Steady endurance ride." : [
    "Endurance ride with 3×15' at Ironman effort (Z3).",
    "Endurance ride with 3×20' at Ironman effort and the final 20' at sweet spot.",
    "Endurance ride with 3×40' at Ironman effort. Stay aero and eat on schedule."][stage], FUEL_BIKE));
  if (!rec) days[5].push(W("brick","Brick run", r5(lerp(25,45,p)), "Z3 · goal race pace", "Run right off the long ride: first 10' settle, then goal Ironman run pace. Practice a fast T2 and take a gel if you go past 30'."));
  // Sun: long run (+ easy swim on 2-swim weekends)
  const lr = r5(lerp(100,140,p)*f);
  days[6].push(W("run","Long run", lr, rec ? "Z2" : stage === 0 ? "Z2 → Z3 finish" : "Z2 with Z3 blocks", rec ? "Easy long run." : [
    "Steady long run, last 20' at goal Ironman run pace.",
    "Long run with 3×10' at half-marathon effort in the second half.",
    "Long run with the middle 40' at goal Ironman run pace."][stage], FUEL_RUN));
  if (dbl) days[6].push(sw("Recovery swim", ry(lerp(1400,2000,p)*f), 2.2, "Z1–2", [F(100,"easy, every 4th one as drill (10s rest)")], "Later in the day, after the long run. Loosens the legs."));
  return days;
}

function buildWeek3(p, rec, test, ows, dbl){
  const f = rec ? 0.65 : 1, pace = 2.05 - 0.1 * p;
  const days = [[GYM],[],[],[],[],[],[]];
  if (test) days[1].push(am(W("bike","20-min threshold test",60,"Z4–5 · RPE 8–9","Warm up 15', 5' hard, 5' easy, then 20' as hard as you can hold evenly. FTP ≈ 95% of 20' power. Update bike zones.")));
  else days[1].push(am(W("bike", rec ? "Steady ride" : "Bike intervals", r5(lerp(80,90,p)*f), rec ? "Z2" : "Z4 · RPE 8", rec ? "Steady Z2 ride." : (p < .5 ? "15' warm-up, 3×15' at threshold (Z4) / 5' easy, cool-down." : "15' warm-up, 2×25' at threshold (Z4) / 5' easy, cool-down."))));
  days[1].push(am(W("brick","Brick run", rec ? 15 : 30, "Z3 · goal race pace", "Off the bike within 3 minutes. First 5' settle, then goal Ironman run pace.")));
  if (test) days[1].push(pm(sw("CSS swim test", 2000, 2.1, "Z4 · RPE 8", [S(1,400,"time trial, as fast as you can hold evenly"), S(1,200,"easy recovery"), S(1,200,"time trial"), F(100,"easy pull (15s rest)")], "CSS pace per 100 = (T400 − T200) ÷ 2. Compare to week 1.")));
  else days[1].push(pm(sw("CSS swim", ry(lerp(3200,3800,p)*f), pace, rec ? "Z2" : "Z4 · CSS pace", rec ? [S(8,50,"drill"), F(100,"easy (15s rest)")] : [S(4,50,"drill"), F(100,"at CSS pace (10s rest)"), S(4,50,"fast (20s rest)")])));
  days[2].push(am(W("run","Easy run", r5(lerp(55,65,p)*f), "Z2", "Easy aerobic run with 6×20s strides.")));
  days[2].push(am(W("strength","Core + mobility", 15, "RPE 5", CORE)));
  if (test) days[3].push(am(W("run","5K time trial",45,"Z4 · RPE 8","15' warm-up, then a solo 5K. Update your run zones.")));
  else days[3].push(am(W("run", rec ? "Easy run" : "Run quality", r5(lerp(75,90,p)*f), rec ? "Z2" : "Z4 · RPE 7–8", rec ? "Easy run with 4 strides." : (p < .5 ? "15' warm-up, 4×2K at half-marathon effort / 2' jog, cool-down." : "15' warm-up, 2×3 mi at goal Ironman run pace minus 10s/mi / 3' jog, cool-down."))));
  days[3].push(pm(sw(ows && !rec ? "Open-water skills (pool)" : "Endurance swim", ry(lerp(3400,4200,p)*f), pace, "Z2–3 · RPE 5", ows && !rec
    ? [C("with sighting every 6 strokes and no push-off at the walls"), S(4,50,"sprint after treading water 20s")]
    : [C("at steady effort"), S(6,100,"pull with sighting (15s rest)")])));
  days[4].push(am(W("bike","Tempo ride", r5(lerp(70,80,p)*f), rec ? "Z2" : "Z3", rec ? "Easy spin." : "Z2 with 2×15' at Ironman effort. Controlled: the long ride is tomorrow.")));
  if (!dbl) days[4].push(pm(sw("Aerobic swim", ry(lerp(2400,2800,p)*f), pace, "Z2 · RPE 4", [F(600,"steady, bilateral breathing (30s rest)")])));
  if (ows && !rec) days[5].push(W("swim","Open-water swim", dbl ? 45 : 65, "Z2–3", "Before the ride: " + (dbl ? "2,000" : "2,800–3,200") + " yd in the ocean or a lake, always with a buddy. Practice sighting, a beach start and the run-up to T1. If no open water, pool swim with a sighting set. " + GULF3, ""));
  else days[5].push(sw(dbl ? "Technique swim" : "Long swim", ry(dbl ? 2600 : lerp(3400,4000,p)*f), pace, "Z2", dbl ? [S(8,50,"drill"), F(400,"steady, bilateral breathing (20s rest)")] : [C("with sighting"), S(6,100,"pull (15s rest)")], (dbl ? "" : "Your only weekend swim. ") + "Then straight to the bike."));
  const lb = r5(lerp(300,360,p)*f);
  days[5].push(W("bike","Long ride", lb, rec ? "Z2" : "Z2–3", rec ? "Steady endurance ride, no race-pace work." : "Long ride with " + (p < .5 ? "2×60'" : "3×60'") + " at Ironman race effort. Stay aero and eat on schedule.", FUEL_BIKE));
  if (!rec) days[5].push(W("brick","Brick run", r5(lerp(40,60,p)), "Z3 · goal race pace", "Straight off the long ride: first 10' settle, then goal Ironman run pace. Fuel it like race day: gel every 30', water at every 'aid station'."));
  const lr = r5(lerp(140,165,p)*f);
  days[6].push(W("run","Long run", lr, rec ? "Z2" : "Z2 with Z3 blocks", rec ? "Easy long run." : (p < .5 ? "Long run, last 30' at goal Ironman run pace." : "Long run with 2×20' at goal Ironman run pace in the second half."), FUEL_RUN));
  if (dbl) days[6].push(sw("Recovery swim", ry(lerp(1600,2000,p)*f), 2.1, "Z1–2", [F(100,"easy, every 4th one as drill (10s rest)")], "After the long run. Loosens the legs."));
  return days;
}

function peakWeek3(i, dbl){
  const days = [[GYM],[],[],[],[],[],[]];
  if (i === 2) {
    days[1].push(am(W("bike","Steady ride",75,"Z2","Steady ride, high cadence.")));
    days[1].push(pm(sw("Easy swim", 2400, 2.0, "Z2", [S(8,50,"drill"), F(100,"easy (15s rest)")])));
    days[2].push(am(W("run","Easy run",45,"Z2","Easy aerobic run with 4 strides.")));
    days[3].push(am(W("run","Easy run",50,"Z2","Easy aerobic run.")));
    days[3].push(pm(sw("Aerobic swim", 2800, 2.0, "Z2", [C("easy"), S(6,100,"pull (15s rest)")])));
    days[4].push(am(W("bike","Easy spin",45,"Z1–2","Easy spin.")));
    if (!dbl) days[4].push(pm(sw("Easy swim", 2000, 2.0, "Z2", [S(8,50,"drill"), F(100,"easy (15s rest)")])));
    days[5].push(W("swim","Open-water swim",30,"Z2","Relaxed open-water swim before the ride. Sighting only.",""));
    days[5].push(W("bike","Long ride",210,"Z2","Steady endurance ride. Absorb the last two big weeks.",FUEL_BIKE));
    days[6].push(W("run","Long run",100,"Z2","Easy long run.",FUEL_RUN));
    if (dbl) days[6].push(sw("Recovery swim", 1500, 2.0, "Z1–2", [F(100,"easy (10s rest)")], "After the run."));
    return days;
  }
  const big = i === 1, sim = i === 3;
  days[1].push(am(W("bike","Race-effort intervals", sim ? 75 : 90,"Z3–4", sim ? "2×20' at race effort." : "2×30' at race effort + 4×1' hard.")));
  days[1].push(am(W("brick","Brick run",30,"Z3","Off the bike: 5' settle, then goal Ironman run pace.")));
  days[1].push(pm(sw("Race-pace swim", big ? 3800 : 3600, 2.0, "Z3 · race pace", [F(800,"at goal race pace (30s rest)"), S(6,50,"fast (20s rest)")])));
  days[2].push(am(W("run","Easy run",55,"Z2","Easy aerobic run with strides.")));
  days[2].push(am(W("strength","Core + mobility",15,"RPE 5",CORE)));
  days[3].push(am(W("run","Race-pace run", sim ? 60 : 85, "Z3–4", sim ? "15' warm-up, 2×15' at goal Ironman run pace / 3' jog, cool-down." : "15' warm-up, 3×2 mi at goal Ironman run pace / 3' jog, cool-down.")));
  days[3].push(pm(sw("Race-distance swim", big ? 4800 : 4600, 2.0, "Z2–3", [S(1,4200,"continuous (race distance) at Ironman effort, no push-off at the walls")])));
  days[4].push(am(W("bike","Easy spin", sim ? 40 : 60, "Z2", sim ? "Short spin. Lay out tomorrow's race kit and nutrition tonight." : "Easy spin with 4×1' high cadence.")));
  if (!dbl && !sim) days[4].push(pm(sw("Aerobic swim", 2400, 2.0, "Z2", [S(8,50,"build (15s rest)"), F(200,"easy (15s rest)")])));
  days[5].push(W("swim", sim ? "Race sim: open-water swim" : "Open-water swim", sim ? 90 : 50, sim ? "Z3 · race effort" : "Z2–3", (sim ? "Full 2.4 mi (4,224 yd) at Ironman effort with a race-style start, then straight to your bike. " : "2,500 yd steady with 4 fast starts, then onto the bike. ") + GULF3, ""));
  days[5].push(W("bike", sim ? "Race sim: bike" : "Race rehearsal ride", sim ? 330 : big ? 390 : 360, "Z2–3", sim ? "About 100 miles (5½ hours) at Ironman effort with your exact race-day kit, bottles and nutrition." : "3×60' at Ironman race effort. Eat and drink exactly your race plan.", FUEL_BIKE));
  days[5].push(W("brick", sim ? "Race sim: run" : "Brick run", sim ? 60 : big ? 75 : 60, "Z2–3 · goal race pace", sim ? "Straight into 60' at goal Ironman run pace. Note what your stomach and legs tell you." : "Off the bike: 5' settle, then goal race pace. Longest bricks of the plan."));
  days[6].push(W("run", sim ? "Easy run" : "Long run", sim ? 60 : big ? 180 : 165, sim ? "Z1–2" : "Z2 with Z3 middle", sim ? "Easy recovery run. Review the race sim and lock in your race plan." : "Longest runs of the plan (about 18–20 mi): middle 60' at goal Ironman run pace. Practice your full run fueling.", sim ? "" : FUEL_RUN));
  if (dbl || sim) days[6].push(sw("Recovery swim", 1800, 2.0, "Z1–2", [F(100,"easy, every 4th one as drill (10s rest)")], "After the run."));
  return days;
}

function taperWeek3(k){
  // k = 0: three weeks out (~70% volume) · k = 1: two weeks out (~50%)
  const days = [[GYM],[],[],[],[],[],[]];
  days[1].push(am(W("bike","Race-effort ride", k ? 75 : 90,"Z3", k ? "3×10' at race effort / 3' easy." : "3×15' at Ironman effort / 3' easy.")));
  days[1].push(am(W("brick","Brick run",25,"Z3","Brick at goal Ironman run pace.")));
  days[1].push(pm(sw("Race-pace swim", k ? 2800 : 3400, 2.0, "Z3", [k ? F(300,"at race pace (20s rest)") : F(600,"at race pace (30s rest)")])));
  days[2].push(am(W("run","Easy run", k ? 45 : 55,"Z2","Easy with strides.")));
  days[2].push(am(W("strength","Core + mobility",15,"RPE 4",CORE)));
  days[3].push(am(W("run","Race-pace run", k ? 50 : 65,"Z3","15' warm-up, " + (k ? "3×8'" : "3×12'") + " at goal Ironman run pace / 2' jog.")));
  days[3].push(pm(sw("Aerobic swim", k ? 2600 : 3200, 2.0, "Z2", [C("easy"), S(8,50,"build (15s rest)")])));
  days[4].push(am(W("bike","Easy spin",45,"Z2","Easy spin.")));
  days[4].push(pm(sw("Easy swim", 2000, 2.0, "Z2", [S(8,50,"drill"), F(100,"easy (15s rest)")])));
  days[5].push(W("swim","Open-water swim", k ? 40 : 50,"Z2–3",(k ? "4×4' at race effort. Last open-water swim before race week: test goggles and (if it's cool enough) wetsuit. " : "2,500 yd steady with sighting. ") + GULF3,""));
  days[5].push(W("bike","Long ride", k ? 180 : 240,"Z2 with Z3", k ? "2×30' at Ironman effort. Final full test of race-day nutrition." : "Steady ride with 2×45' at Ironman effort, full race nutrition.",FUEL_BIKE));
  days[5].push(W("brick","Brick run", k ? 30 : 45,"Z3","Brick at goal Ironman run pace."));
  days[6].push(W("run","Long run", k ? 90 : 120,"Z2","Easy, last 15' at goal Ironman run pace.",FUEL_RUN));
  return days;
}

function raceWeek3(weekStart, race){
  const days = [];
  const byOff = {
    "-6": [Object.assign({}, GYM, {d:"Light gym session only. Race week starts."})],
    "-5": [am(W("run","Easy run",30,"Z2","Easy with 4 strides.")), pm(sw("Race-pace swim",2200,2.0,"Z3 touches",[S(8,50,"at race pace, full rest"), F(100,"easy (15s rest)")],"Feel sharp, not tired."))],
    "-4": [am(W("bike","Openers ride",50,"Z2 + Z3","Easy ride with 3×5' at race effort. Check gears, brakes and tires.")), am(W("brick","Short run",15,"Z3","4×1' at goal race pace."))],
    "-3": [pm(sw("Easy swim",1500,2.0,"Z1–2",[F(100,"loose and easy (10s rest)")],"Start carb-loading a bit at each meal and drink to thirst."))],
    "-2": [Object.assign({}, REST, {t:"Travel + check-in", d:"Travel to Jacksonville and pick up your packet. Pack your bike, run and special-needs bags using the checklist below. Off your feet as much as you can."})],
    "-1": [W("brick","Shakeout",40,"Z1–2 with pickups","10–15' easy swim at the race venue if it's open, 20' bike with 3×30s pickups, 10' run with strides. Check in your bike and gear bags, early dinner, early bed.")],
    "0":  [W("race","RACE DAY",0,"See pacing plan","IRONMAN Jacksonville. Swim 2.4 mi · Bike 112 mi · Run 26.2 mi. Stick to the plan below. Enjoy it, you earned this.")]
  };
  for (let d = 0; d < 7; d++) {
    const off = dayDiff(race, addDays(weekStart, d));
    if (off > 0) days.push([Object.assign({}, REST, {t:"Recovery", d:"Celebrate. Walk, eat, sleep. No structured training for a week."})]);
    else if (off < -6) days.push([GYM]);
    else days.push(byOff[String(off)]);
  }
  return days;
}

function buildPlan(){
  const race = parseISO(state.raceDate);
  const N = Math.floor(dayDiff(START, race) / 7) + 1;
  const rem = N - 7;
  const build = Math.min(12, Math.max(3, Math.floor(rem * 0.45)));
  const base = rem - build;
  const weeks = [];
  const push = (phase, days, focus, rec) => {
    const ws = addDays(START, weeks.length * 7);
    days.forEach((items, di) => items.forEach((w, i) => { w.key = iso(addDays(ws, di)) + "#" + i; }));
    const min = days.flat().reduce((a, w) => a + w.min, 0);
    weeks.push({n: weeks.length + 1, phase, days, focus, rec, start: ws, min});
  };
  for (let i = 0; i < base; i++) {
    if (i === 0) {
      // Week 1 is done: kept exactly as trained (tests and checkmarks)
      push("Base", baseWeek2(0, false, 0, true), "<b>Week 1: testing + routine.</b> Baseline tests for run (Tue), bike (Wed) and swim (Sat) set your zones. Done on the original schedule.", false);
      continue;
    }
    const rec = (i + 1) % 4 === 0 && i < base - 1;
    const p = base > 2 ? (i - 1) / (base - 2) : 1;
    const stage = p < 1/3 ? 0 : p < 2/3 ? 1 : 2;
    const focus = rec ? "<b>Recovery week.</b> Volume drops about a third. Sleep more and let the last three weeks sink in."
      : i === 1 ? "<b>New schedule starts.</b> Monday is gym only. Bike and run are 4–6 AM, swims are after work. Long ride Saturday, long run Sunday, with 1 or 2 weekend swims depending on the week."
      : ["<b>Swim consistency + harder bike and run.</b> Four swims a week build your feel for the water. Tuesday bike and Thursday run are true quality days.",
         "<b>Threshold work.</b> Over-unders on the bike, mile repeats on the run, CSS sets in the pool.",
         "<b>Endurance volume.</b> Longest base-phase ride and run. Practice eating on anything over 90 minutes."][stage];
    push("Base", baseWeek3(p, rec, stage, DOUBLE_WEEKEND(weeks.length + 1)), focus, rec);
  }
  for (let i = 0; i < build; i++) {
    const rec = (i + 1) % 4 === 0;
    const p = build > 1 ? i / (build - 1) : 1;
    const ows = i >= build - 5;
    const focus = rec ? "<b>Recovery week.</b> No bricks or intervals. Easy volume only."
      : i === 0 ? "<b>Re-test + race-specific work begins.</b> New zones from the tests. Long rides grow to 4+ hours with bricks."
      : ows ? "<b>Race-pace volume + open water.</b> Saturday starts with an open-water swim before the long ride whenever it's safe."
      : "<b>Threshold + race-pace volume.</b> Longer threshold blocks midweek, race-pace blocks in the long ride and long run.";
    push("Build", buildWeek3(p, rec, i === 0, ows, DOUBLE_WEEKEND(weeks.length + 1)), focus, rec);
  }
  const pf = ["<b>Peak block 1.</b> Race-rehearsal rides, race-distance swims, open water before Saturday's ride.",
    "<b>Peak volume week.</b> Your biggest week: a 6½-hour ride and a 3-hour run, with your full nutrition plan.",
    "<b>Recovery week.</b> Absorb the two biggest weeks of the plan.",
    "<b>Race simulation.</b> Saturday is your big day: 2.4 mi open-water swim, about 100 miles on the bike and a 60' run at Ironman effort with race kit and nutrition."];
  for (let i = 0; i < 4; i++) push("Peak", peakWeek3(i, DOUBLE_WEEKEND(weeks.length + 1)), pf[i], i === 2);
  push("Taper", taperWeek3(0), "<b>Taper begins.</b> Volume drops about 30%. Keep race-pace efforts in every sport so you stay sharp.", false);
  push("Taper", taperWeek3(1), "<b>Taper.</b> Volume drops to about half. Finalize gear, bags and your race-day nutrition.", false);
  push("Taper", raceWeek3(addDays(START, weeks.length * 7), race), "<b>Race week.</b> Less is more. Short sharp sessions, lots of sleep, carbs up in the last 48 hours. Checklist and pacing below.", false);
  weeks[weeks.length - 1].race = true;
  plan = weeks;
}

// One-time move to the IRONMAN Jacksonville race date (full distance)
function migrate(s){
  if (s.v >= 3) return false;
  if (!s.raceDate || s.raceDate === "2027-06-13" || s.raceDate === "2027-05-08") s.raceDate = "2027-05-16";
  if (!s.raceName || /70\.3/.test(s.raceName)) s.raceName = "IRONMAN Jacksonville";
  s.v = 3;
  return true;
}

const checkable = w => w.s !== "rest";
const keysOf = wk => wk.days.flat().filter(checkable).map(w => w.key);

function currentIndex(){
  const i = Math.floor(dayDiff(START, today0()) / 7);
  return Math.max(-1, Math.min(i, plan.length));
}
const CHECKLIST = [
  ["Swim", ["Wetsuit or speedsuit + anti-chafe (wetsuit legal only at 76.1°F water or colder: check the call at the athlete briefing)", "Two pairs of goggles (clear + tinted)", "Race cap (from packet) + spare cap", "Timing chip"]],
  ["Bike", ["Bike tuned, tires checked night before", "Helmet (buckled before you touch the bike)", "Bike shoes + sunglasses", "Bottles mixed with your race drink", "Bars/gels taped or in bento box", "Flat kit: tube, levers, CO2"]],
  ["Run", ["Run shoes with elastic laces", "Race belt with bib", "Hat or visor", "Gels for the run"]],
  ["Special needs", ["Bike special-needs bag: spare bottles, extra nutrition, sunscreen", "Run special-needs bag: dry socks, gels, anti-chafe, something salty"]],
  ["Race morning", ["Breakfast 3 hours before (80–120 g carbs you've tested)", "Sunscreen + body marking", "Pump tires, set gears for the start", "Walk swim exit → bike → bike out → run out", "Short warm-up swim if allowed"]]
];
const LEGS = [
  ["Swim", "2.4 mi", "Seed yourself honestly in the rolling start. Keep the first 400 yd controlled, then settle at a pace you could hold all day (RPE 5). Sight every 6–8 strokes, watch the current and draft on feet when you can.", "1:28–1:35", "1:20–1:25"],
  ["T1", "", "Walk-jog to the change tent, sit down, helmet on before you touch the bike. Take your time: it's a long day.", "8–10 min", "6–7 min"],
  ["Bike", "112 mi", "First 30' easy. Then hold Ironman effort: top of Z2, RPE 4–5, about 68–75% of FTP if you use power. If it feels hard before mile 80, back off. Eat 60–90 g carbs/hr and drink 500–800 ml/hr from the first 20 min.", "6:15–6:25 (≈17.5–18 mph)", "5:55–6:05 (≈18.5–19 mph)"],
  ["T2", "", "Hand off the bike, change in the tent, grab gels, go.", "5–6 min", "4 min"],
  ["Run", "26.2 mi", "First 6 miles slower than goal pace, even if you feel great. Walk every aid station for 15–20 seconds to drink and take carbs. The race really starts at mile 18; if there's anything left after that, use it.", "4:40–4:50 (≈10:40–11:05/mi)", "4:20–4:30 (≈9:55–10:20/mi)"]
];
