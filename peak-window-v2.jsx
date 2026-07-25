import React, { useState, useEffect, useMemo, useRef } from "react";

// ---------- palette (light theme) ----------
const C = {
  bg: "#F5F6FA", panel: "#FFFFFF", panelSoft: "#F0F2F8", line: "#E2E5F0",
  text: "#23283D", muted: "#6A7089",
  amber: "#D98E1B", amberSoft: "rgba(217,142,27,0.13)",
  cyan: "#1FA7A2", cyanSoft: "rgba(31,167,162,0.12)",
  rose: "#D6497B", roseSoft: "rgba(214,73,123,0.11)",
  green: "#2E9E5B", greenSoft: "rgba(46,158,91,0.12)",
};

// ---------- time ----------
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fmt = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(min / 60), m = min % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")}${ampm}`;
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---------- pharmacokinetic models ----------
const effectAt = (mins) => {
  if (mins <= 0) return 0;
  const t = mins / 60, a = 4.0, k = 2.2;
  return Math.pow(t / a, k) * Math.exp(k * (1 - t / a));
};
const boosterEffectAt = (mins) => {
  if (mins <= 0) return 0;
  const t = mins / 60, a = 1.75, k = 2.5;
  return 0.55 * Math.pow(t / a, k) * Math.exp(k * (1 - t / a));
};

// ---------- schedule ----------
const KIND = {
  routine: { color: C.cyan, soft: C.cyanSoft, tag: "Routine" },
  deep: { color: C.amber, soft: C.amberSoft, tag: "Deep focus" },
  focus: { color: "#B8933D", soft: "rgba(184,147,61,0.13)", tag: "Focus" },
  workout: { color: C.rose, soft: C.roseSoft, tag: "Training" },
  meal: { color: C.green, soft: C.greenSoft, tag: "Fuel" },
  light: { color: "#7C86C2", soft: "rgba(124,134,194,0.13)", tag: "Light" },
  comedown: { color: C.green, soft: C.greenSoft, tag: "Comedown" },
  wind: { color: "#8089B8", soft: "rgba(128,137,184,0.12)", tag: "Wind down" },
  meds: { color: "#D6497B", soft: "rgba(214,73,123,0.12)", tag: "Meds" },
};

const DAY_TYPES = [
  { id: "study", label: "Study day" },
  { id: "clinical", label: "Clinical / theatre day" },
  { id: "recovery", label: "Recovery / post-call" },
];

function buildSchedule({ wake, med, workoutSlot, dayType }) {
  const W = toMin(wake), T = toMin(med);
  const B = [];
  const add = (start, end, kind, title, detail, snackLink) => B.push({ start, end, kind, title, detail, snackLink: !!snackLink });

  add(Math.min(W, T - 15), T, "meal", "Breakfast before the dose",
    "Your one reliable appetite window — 30–40g protein + slow carbs. Protein supplies tyrosine for the catecholamines the med works on. No vitamin C within an hour of the dose. 500ml water.");

  if (dayType === "clinical") {
    add(T, T + 30, "routine", "Commute / arrive", "Podcast or French audio. Kit sorted last night, so this is autopilot.");
    add(T + 30, T + 255, "focus", "Clinical morning", "Peak window goes to patients today — that's the right call. Theatre / ward round with your best brain.");
    add(T + 255, T + 280, "meal", "Protein snack — grab it when you can", "Peak suppression; you won't feel it, eat anyway. A shake in the coffee room counts.", true);
    add(T + 280, T + 405, "focus", "Clinical midday", "Keep water nearby — dehydration on stimulants reads as brain fog.");
    add(T + 405, T + 435, "meal", "Lunch — by the clock, not hunger", "Whatever the mess has, protein first, moderate portion.", true);
    add(T + 435, T + 765, "focus", "Clinical afternoon", "Long haul. Snack at ~3pm softens the comedown mid-list.");
    if (workoutSlot === "evening" || workoutSlot === "afternoon") {
      add(T + 765, T + 840, "workout", "Train after work", "Moderate intensity — the dose is tailing and you've had a full day. Consistency beats heroics.");
    } else {
      add(T + 765, T + 840, "light", "Decompress", "Walk or easy spin home. Transition ritual out of clinical mode.");
    }
    add(T + 840, T + 885, "meal", "Dinner — biggest meal", "Recover the day's calories here.", true);
    add(T + 885, T + 930, "light", "Micro-study: 40 min max", "Flashcards or one past-paper topic only — the tail can't carry new material, and pretending it can just burns morale.");
    add(T + 930, T + 1005, "wind", "Wind down → lights out", "Prep tomorrow. In bed by " + fmt(T + 1005) + ".");
  } else if (dayType === "recovery") {
    add(T, T + 120, "light", "Slow morning", "Post-call, the goal is repair, not output. Admin, sort life, no guilt.");
    add(T + 120, T + 255, "focus", "One gentle study block (optional)", "If it's there, use it lightly — flashcards or review, nothing new. If it's not, skip without negotiation.");
    add(T + 255, T + 280, "meal", "Protein snack", "Eat by the clock today especially — sleep debt scrambles hunger signals.", true);
    add(T + 280, T + 405, "light", "Errands / outside time", "Daylight exposure is the fastest circadian reset after nights.");
    add(T + 405, T + 435, "meal", "Lunch", "Proper meal, no rush.", true);
    add(T + 435, T + 555, "routine", "Nap window (20 min max) or full rest", "Set an alarm — 20 minutes restores, 90 wrecks tonight's sleep.");
    add(T + 555, T + 615, "workout", "Zone 2 / mobility only", "Easy spin or stretching. Hard training on sleep debt is how injuries happen.");
    add(T + 615, T + 780, "light", "Light tail", "Low-stakes anything. Today doesn't count toward the plan; it makes the plan possible.");
    add(T + 780, T + 825, "meal", "Dinner", "Biggest meal, early-ish.", true);
    add(T + 825, T + 915, "comedown", "Evening off", "Comedown grazing window — snack triage before the cupboard.", true);
    add(T + 915, T + 1005, "wind", "Early wind down", "Tonight's sleep is the whole point of today. Lights out " + fmt(T + 1005) + " or earlier.");
  } else {
    if (workoutSlot === "onset") {
      add(T, T + 75, "workout", "Train during onset", "Movement while the dose ramps burns off restlessness and primes focus. ~60–70 min, hydrate hard.");
      add(T + 75, T + 100, "routine", "Shower + reset", "Desk set, phone in another room, one clear target for block 1.");
      add(T + 100, T + 255, "deep", "Deep work 1 — peak window", "Best brain of the day. Hardest study only. 50/10 pomodoros.");
    } else {
      add(T, T + 90, "routine", "Ramp-up: easy wins", "Onset window. Small tasks, write today's top 3. Save the hard thing for the peak.");
      add(T + 90, T + 255, "deep", "Deep work 1 — peak window", "Best brain of the day. Hardest study only: new material, problem sets. 50/10 pomodoros.");
    }
    add(T + 255, T + 280, "meal", "Protein snack — eat by the clock", "Peak suppression — you won't feel hungry. Shake, nuts, or yogurt prevents the late-morning glucose dip.", true);
    add(T + 280, T + 405, "deep", "Deep work 2", "Still deep in the effective window. Active recall, past papers — output, not re-reading.");
    add(T + 405, T + 435, "meal", "Lunch — moderate, by the clock", "Protein + complex carbs, kept modest to dodge the post-prandial slump.", true);
    if (workoutSlot === "afternoon") {
      add(T + 435, T + 510, "workout", "Train — afternoon slot", "Focus still elevated; breaks up the study day.");
      add(T + 510, T + 585, "focus", "Focused block 3", "Post-workout clarity. Consolidation, flashcards, admin.");
    } else {
      add(T + 435, T + 585, "focus", "Focused block 3", "Skill work or a third study push. Slightly easier material than the morning.");
    }
    add(T + 585, T + 600, "meal", "Afternoon snack", "Fruit + protein. Softens the comedown, which lands harder on an empty stomach.", true);
    if (workoutSlot === "evening") {
      add(T + 600, T + 675, "workout", "Train — evening slot", "Dose is tailing; doubles as transition out of work mode. Moderate intensity.");
      add(T + 675, T + 780, "light", "Light tail", "Flashcards, review, errands. Low-stakes only.");
    } else {
      add(T + 600, T + 780, "light", "Light tail", "Flashcards, review notes, errands, meal prep. Nothing that needs peak focus.");
    }
    add(T + 780, T + 825, "meal", "Dinner — biggest meal", "Appetite is back as the dose fades. Recover the day's calories to protect training and sleep.", true);
    add(T + 825, T + 915, "comedown", "Evening off — comedown window", "Suppression has lifted — grazing hits hardest now. Snack triage before the cupboard.", true);
    add(T + 915, T + 1005, "wind", "Wind down → lights out", "Optional light snack before 9pm. Prep tomorrow's top 3. In bed by " + fmt(T + 1005) + " — sleep is the dose multiplier.");
  }
  return B.filter((b) => b.end > b.start);
}

// ---------- snacks ----------
const SNACKS = [
  { name: "Air-popped popcorn (big bowl)", kcal: 100, cravings: ["crunchy", "salty", "slow"], why: "Massive volume per calorie — takes 20 minutes to get through." },
  { name: "Cucumber + carrot sticks with hot sauce", kcal: 50, cravings: ["crunchy", "salty"], why: "Endless crunch; the heat makes it feel like a real snack." },
  { name: "Sugar snap peas", kcal: 40, cravings: ["crunchy", "sweet"], why: "Naturally sweet crunch, eaten one at a time." },
  { name: "Pickles / cornichons", kcal: 15, cravings: ["crunchy", "salty"], why: "Sharp and salty — kills a savoury craving for almost nothing." },
  { name: "Frozen grapes", kcal: 60, cravings: ["sweet", "slow"], why: "Feel like boiled sweets and you can't rush frozen food." },
  { name: "Frozen berries", kcal: 45, cravings: ["sweet", "slow"], why: "Slow, icy, dessert-adjacent." },
  { name: "Edamame in pods (1 cup)", kcal: 95, cravings: ["salty", "slow", "protein"], why: "Shelling slows the pace; 8g protein blunts the urge to keep grazing." },
  { name: "Seaweed thins (1 pack)", kcal: 25, cravings: ["crunchy", "salty"], why: "Crisps-shaped hole, filled for 25 kcal." },
  { name: "Greek yogurt + berries (small bowl)", kcal: 120, cravings: ["sweet", "protein"], why: "Protein is the actual off-switch for grazing — best pick on the comedown." },
  { name: "Sugar-free jelly pot", kcal: 10, cravings: ["sweet"], why: "Dessert ritual for basically zero calories." },
  { name: "Miso soup / stock cube in hot water", kcal: 20, cravings: ["warm", "salty"], why: "Warm + savoury + slow to sip. Often ends the craving outright." },
  { name: "Herbal tea + a square of dark chocolate", kcal: 55, cravings: ["warm", "sweet"], why: "One deliberate square beats absent-minded handfuls." },
  { name: "Babybel Light + cherry tomatoes", kcal: 70, cravings: ["salty", "protein"], why: "Unwrapping rituals slow you down; protein settles it." },
  { name: "Apple, sliced thin, with cinnamon", kcal: 80, cravings: ["sweet", "crunchy", "slow"], why: "Slicing it thin doubles the eating time." },
  { name: "Boiled egg with salt + pepper", kcal: 75, cravings: ["protein", "salty"], why: "Dense protein — the anti-boredom-loop snack." },
  { name: "Sparkling water + chewing gum", kcal: 5, cravings: ["sweet", "crunchy"], why: "For when it's genuinely boredom — fizz and jaw action, no calories." },
];
const CRAVINGS = [
  { id: "crunchy", label: "Crunchy", emoji: "🥕" }, { id: "salty", label: "Salty", emoji: "🥨" },
  { id: "sweet", label: "Sweet", emoji: "🍇" }, { id: "warm", label: "Warm", emoji: "🍵" },
  { id: "slow", label: "Slow to eat", emoji: "🐢" }, { id: "protein", label: "Comedown / protein", emoji: "🥚" },
];

// ---------- focus content ----------
const RESET_PROTOCOL = [
  "Stand up. Drink a full glass of water.",
  "Brain-dump: every distracting thought onto paper in 60 seconds. It's parked, not lost.",
  "Shrink the task: what's the 2-minute version? (Open the doc. Write one ugly sentence.)",
  "Phone in another room. Not face down — another room.",
  "Set a 10-minute sprint. You only owe 10 minutes; momentum handles the rest.",
];
const TACTICS = [
  { name: "Movement burst", how: "20 squats, a flight of stairs, or a 3-minute brisk walk.", why: "Fastest legal dopamine there is — resets restlessness better than another coffee." },
  { name: "Body double", how: "Work near someone, on a call, or with a focus-with-me video running.", why: "Another human presence anchors ADHD attention remarkably well." },
  { name: "Change location", how: "Different room, café, library — even the other side of the desk.", why: "Novel environment = novelty dopamine. The brain re-engages in new surroundings." },
  { name: "Make it ugly", how: "Give yourself permission to do the task badly for 10 minutes.", why: "Perfectionism paralysis masquerades as distraction. Ugly first drafts break it." },
  { name: "Brown noise / one album", how: "Brown noise, lo-fi, or a single familiar album on repeat.", why: "Occupies the under-stimulated channel so the rest of the brain can work." },
  { name: "HALT check", how: "Hungry? Thirsty? Tired? Overheated? Fix the body first.", why: "On stimulants, hunger and dehydration read as brain fog, not appetite." },
  { name: "Externalise the next step", how: "Write the literal next physical action on a sticky note. One action only.", why: "\"Study anatomy\" is unstartable. \"Open deck, do 5 cards\" is not." },
  { name: "Box breathing ×4", how: "Inhale 4, hold 4, exhale 4, hold 4 — four rounds.", why: "Downshifts the restless-wired state that blocks task initiation." },
  { name: "Race the timer", how: "Pick a micro-task and try to beat a 5-minute countdown.", why: "Manufactured urgency is the ADHD brain's native fuel. Use it deliberately." },
  { name: "Close everything", how: "Every tab, every app, except the one thing.", why: "Each open tab is a running background process in your head." },
  { name: "Temptation bundling", how: "Pair the boring task with something you like — best coffee, favourite chair — only during that task.", why: "Borrows dopamine from the reward and welds it to the work." },
  { name: "Waiting room list", how: "Sticky note titled \"LATER\" — every rabbit-hole idea gets written there instead of clicked.", why: "Honours the idea without following it. Hyperfocus detours die on paper." },
  { name: "Start with the interesting bit", how: "You don't have to start at the beginning — start at the most interesting sub-part.", why: "Interest is the ADHD ignition key. Momentum carries you back to the boring parts." },
  { name: "Analogue timer in view", how: "Physical timer or full-screen countdown where you can see time draining.", why: "Time-blindness means invisible time doesn't exist. Make it visible, it becomes real." },
  { name: "Text someone your goal", how: "Message a friend: \"Doing X for 45 min, will report back.\"", why: "Cheap accountability — the promised report-back manufactures a deadline." },
  { name: "Posture / place switch", how: "Stand up to work, sit on the floor, move to the window.", why: "A body-state change often reboots the brain-state cheaper than a full break." },
];
const stageAdvice = (m) => {
  if (m < 0) return { label: "Pre-dose", msg: "The med isn't on board yet — unfocused is expected. Physical setup and easy wins; save deep work for the peak." };
  if (m < 90) return { label: "Onset", msg: "Still ramping. If you can't lock in, that's chemistry, not character. Movement or admin now; the peak carries the hard stuff." };
  if (m < 300) return { label: "Peak window", msg: "At or near peak effect — unfocused now usually means a body or task problem. Run HALT, then shrink the task and sprint." };
  if (m < 540) return { label: "Mid-effect", msg: "Still decent coverage. Downshift one difficulty level — practice questions instead of new material — and use a timer sprint." };
  if (m < 720) return { label: "Tail", msg: "The dose is fading. No willpower battles here: light, mechanical tasks. Forcing hard study now just teaches your brain studying feels awful." };
  return { label: "Worn off", msg: "Effectively unmedicated. Stop forcing focus — food, movement, people, wind-down. Protect sleep; it's tomorrow's dose multiplier." };
};
const EXERCISES = [
  { name: "Attention anchor", mins: 5, how: "Sit, eyes closed, count breaths 1–10, restart. Mind wanders? Note it, back to 1.", why: "The rep is the catch-and-return — the exact muscle studying uses." },
  { name: "Reading sprint", mins: 10, how: "Physical book, pen in hand. Every drift = a dot in the margin. Count them at the end.", why: "Makes drift visible and countable. Most people halve the dots within two weeks." },
  { name: "Do-nothing drill", mins: 3, how: "Sit with zero input. No phone, no music. Just sit until the timer ends.", why: "Boredom tolerance is the foundation under deep work — the textbook feels stimulating by comparison." },
  { name: "Cold-start rep", mins: 2, how: "Pick the dreaded task. Do only its first physical action, then you may stop.", why: "Task initiation is the core ADHD deficit. Training the start shrinks activation energy permanently." },
  { name: "Single-task ladder", mins: 15, how: "One task, full screen, visible timer, nothing else. Next session, add 5 minutes.", why: "Progressive overload for attention span — same logic as adding plates to a bar." },
  { name: "Box breathing", mins: 2, how: "Inhale 4 · hold 4 · exhale 4 · hold 4. Repeat for two minutes.", why: "Downshifts the wired-restless state. Works mid-comedown too." },
];

// ---------- storage helpers ----------
const sGet = async (key) => {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
};
const sSet = (key, value) => { try { window.storage.set(key, JSON.stringify(value)).catch(() => {}); } catch {} };
function useSaver(key, value, ready) {
  const t = useRef(null);
  useEffect(() => {
    if (!ready) return;
    clearTimeout(t.current);
    t.current = setTimeout(() => sSet(key, value), 800);
    return () => clearTimeout(t.current);
  }, [key, value, ready]);
}

// ---------- sound ----------
function useChime(enabled) {
  const ctxRef = useRef(null);
  return () => {
    if (!enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = (ctxRef.current = ctxRef.current || new AC());
      [[660, 0], [880, 0.16]].forEach(([f, when]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.12, ctx.currentTime + when);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.25);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + 0.3);
      });
    } catch {}
  };
}

function usePomodoro(onDing) {
  const [mode, setMode] = useState("focus");
  const [secs, setSecs] = useState(50 * 60);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          onDing && onDing();
          if (mode === "focus") { setMode("break"); setRounds((r) => r + 1); return 10 * 60; }
          setMode("focus"); return 50 * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode]);
  const reset = () => { setRunning(false); setMode("focus"); setSecs(50 * 60); };
  return { mode, secs, running, rounds, setRunning, reset };
}

// ---------- curve ----------
function DayCurve({ medMin, boosterMins, blocks, nowMin }) {
  const Wd = 1000, H = 190;
  const x0 = 4 * 60, x1 = 23 * 60;
  const X = (m) => ((m - x0) / (x1 - x0)) * Wd;
  const eff = (m) => Math.min(effectAt(m - medMin) + boosterMins.reduce((s, b) => s + boosterEffectAt(m - b), 0), 1.1);
  const pts = [];
  for (let m = x0; m <= x1; m += 8) pts.push(`${X(m).toFixed(1)},${(H - 26 - eff(m) * (H - 60)).toFixed(1)}`);
  const path = `M ${pts.join(" L ")}`;
  const area = `${path} L ${Wd},${H - 26} L 0,${H - 26} Z`;
  return (
    <svg viewBox={`0 0 ${Wd} ${H}`} className="w-full" style={{ display: "block" }}>
      <defs>
        <linearGradient id="fillg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.amber} stopOpacity="0.35" />
          <stop offset="100%" stopColor={C.amber} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {blocks.map((b, i) => (
        <rect key={i} x={X(b.start)} y={H - 22} width={Math.max(X(b.end) - X(b.start) - 1.5, 2)} height={10} rx={3} fill={KIND[b.kind].color} opacity={0.85} />
      ))}
      {[5, 8, 11, 14, 17, 20, 22].map((h) => (
        <g key={h}>
          <line x1={X(h * 60)} y1={20} x2={X(h * 60)} y2={H - 26} stroke={C.line} strokeWidth="1" strokeDasharray="2 5" />
          <text x={X(h * 60)} y={H - 2} fill={C.muted} fontSize="11" textAnchor="middle">{h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}</text>
        </g>
      ))}
      <path d={area} fill="url(#fillg)" />
      <path d={path} fill="none" stroke={C.amber} strokeWidth="2.5" strokeLinejoin="round" />
      <g>
        <line x1={X(medMin)} y1={16} x2={X(medMin)} y2={H - 26} stroke={C.cyan} strokeWidth="1.5" />
        <circle cx={X(medMin)} cy={16} r="4" fill={C.cyan} />
        <text x={X(medMin) + 8} y={20} fill={C.cyan} fontSize="12">dose</text>
      </g>
      {boosterMins.map((bm, i) => (
        <g key={i}>
          <line x1={X(bm)} y1={16} x2={X(bm)} y2={H - 26} stroke={C.rose} strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx={X(bm)} cy={16} r="4" fill={C.rose} />
          <text x={X(bm) + 8} y={20} fill={C.rose} fontSize="12">{boosterMins.length > 1 ? `boost ${i + 1}` : "booster"}</text>
        </g>
      ))}
      <text x={X(medMin + 240)} y={26} fill={C.amber} fontSize="12" textAnchor="middle">peak {fmt(medMin + 90)}–{fmt(medMin + 300)}</text>
      {nowMin >= x0 && nowMin <= x1 && (
        <g>
          <line x1={X(nowMin)} y1={12} x2={X(nowMin)} y2={H - 12} stroke={C.text} strokeWidth="1.5" />
          <text x={X(nowMin)} y={10} fill={C.text} fontSize="11" textAnchor="middle">now</text>
        </g>
      )}
    </svg>
  );
}

// ---------- insights chart ----------
function InsightsChart({ checkins, sos }) {
  const Wd = 700, H = 170;
  const buckets = 7; // 0–2h ... 12–14h
  const avg = Array(buckets).fill(null).map((_, i) => {
    const inB = checkins.filter((c) => c.m >= i * 120 && c.m < (i + 1) * 120);
    return inB.length ? inB.reduce((s, c) => s + c.s, 0) / inB.length : null;
  });
  const sosCount = Array(buckets).fill(0);
  sos.forEach((e) => { const i = Math.min(Math.max(Math.floor(e.m / 120), 0), buckets - 1); sosCount[i]++; });
  const maxSos = Math.max(...sosCount, 1);
  const bw = Wd / buckets;
  const modelPts = [];
  for (let m = 0; m <= buckets * 120; m += 15) modelPts.push(`${(m / (buckets * 120)) * Wd},${(H - 40 - effectAt(m) * (H - 70)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${Wd} ${H}`} className="w-full" style={{ display: "block" }}>
      {avg.map((a, i) =>
        a != null ? (
          <rect key={i} x={i * bw + 8} y={H - 40 - (a / 5) * (H - 70)} width={bw - 16} height={(a / 5) * (H - 70)} rx={5} fill={C.cyan} opacity={0.55} />
        ) : null
      )}
      <path d={`M ${modelPts.join(" L ")}`} fill="none" stroke={C.amber} strokeWidth="2" strokeDasharray="5 4" />
      {sosCount.map((n, i) =>
        n > 0 ? (
          <g key={i}>
            <circle cx={i * bw + bw / 2} cy={H - 22} r={4 + (n / maxSos) * 5} fill={C.rose} opacity={0.8} />
            <text x={i * bw + bw / 2} y={H - 18} fill="#2A0F18" fontSize="10" textAnchor="middle" fontWeight="700">{n}</text>
          </g>
        ) : null
      )}
      {Array(buckets).fill(0).map((_, i) => (
        <text key={i} x={i * bw + bw / 2} y={H - 2} fill={C.muted} fontSize="11" textAnchor="middle">{i * 2}–{i * 2 + 2}h</text>
      ))}
    </svg>
  );
}

// ---------- main ----------
export default function PeakWindowV2() {
  const [tab, setTab] = useState("day");
  const [loaded, setLoaded] = useState(false);

  // settings (persisted)
  const [settings, setSettings] = useState({
    wake: "05:00", med: "05:15", dose: "50", workoutSlot: "onset",
    boosterMode: "off", booster1Time: "12:45", booster2Time: "14:00",
    dayType: "study", budget: 200, soundOn: true,
  });
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  // day state (persisted per date)
  const dayKey = `pw-day-${todayStr()}`;
  const [day, setDay] = useState({ done: {}, top3: ["", "", ""], log: [], checkins: [], sos: [] });
  const patchDay = (patch) => setDay((d) => ({ ...d, ...patch }));

  // insights aggregate (persisted)
  const [insights, setInsights] = useState({ checkins: [], sos: [] });

  // task list (persisted, carries over between days)
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newTaskKind, setNewTaskKind] = useState("deep");

  const [nowMin, setNowMin] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  const chime = useChime(settings.soundOn);
  const pomo = usePomodoro(chime);

  // SOS / focus
  const [sosOpen, setSosOpen] = useState(false);
  const [tactic, setTactic] = useState(null);
  const [protocolDone, setProtocolDone] = useState({});
  const [checkinFlash, setCheckinFlash] = useState(false);
  const dealTactic = () => setTactic((prev) => { const o = TACTICS.filter((t) => t !== prev); return o[Math.floor(Math.random() * o.length)]; });

  // exercises
  const [exName, setExName] = useState(null);
  const [exSecs, setExSecs] = useState(0);
  useEffect(() => {
    if (!exName || exSecs <= 0) return;
    const id = setInterval(() => setExSecs((s) => {
      if (s <= 1) { chime(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [exName, exSecs > 0, settings.soundOn]);

  // snacks
  const [snackStep, setSnackStep] = useState("triage");
  const [craving, setCraving] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  // load persisted state
  useEffect(() => {
    (async () => {
      const s = await sGet("pw-settings");
      if (s) {
        if (s.boosterOn && !s.boosterMode) { s.boosterMode = "one"; s.booster1Time = s.boosterTime || "12:45"; }
        setSettings((prev) => ({ ...prev, ...s }));
      }
      const d = await sGet(dayKey);
      if (d) setDay((prev) => ({ ...prev, ...d }));
      const ins = await sGet("pw-insights");
      if (ins) setInsights((prev) => ({ ...prev, ...ins }));
      const tk = await sGet("pw-tasks");
      if (tk) setTasks(tk);
      setLoaded(true);
    })();
  }, []);
  useSaver("pw-settings", settings, loaded);
  useSaver(dayKey, day, loaded);
  useSaver("pw-insights", insights, loaded);
  useSaver("pw-tasks", tasks, loaded);

  // clock
  useEffect(() => {
    const id = setInterval(() => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); }, 30000);
    return () => clearInterval(id);
  }, []);

  const medMin = toMin(settings.med);
  const boosterMins =
    settings.boosterMode === "one" ? [toMin(settings.booster1Time)]
    : settings.boosterMode === "two" ? [toMin(settings.booster1Time), toMin(settings.booster2Time)]
    : [];
  const baseBlocks = useMemo(
    () => buildSchedule({ wake: settings.wake, med: settings.med, workoutSlot: settings.workoutSlot, dayType: settings.dayType }),
    [settings.wake, settings.med, settings.workoutSlot, settings.dayType]
  );
  const bedMin = medMin + 1005;
  const boosterLatest = bedMin - 480;
  const lateBoosters = boosterMins.filter((m) => m > boosterLatest);
  const tooClose = boosterMins.length === 2 && Math.abs(boosterMins[1] - boosterMins[0]) < 150;
  const blocks = useMemo(() => {
    if (boosterMins.length === 0) return baseBlocks;
    const rows = boosterMins.map((m, i) => ({
      start: m, end: m + 10, kind: "meds", marker: true,
      title: `Booster ${boosterMins.length > 1 ? i + 1 : ""} — 10 mg short-acting (only if prescribed)`.replace("  ", " "),
      detail: i === 0
        ? (boosterMins.length > 1
          ? "First of two. Stacks on the Vyvanse while it's still strong — lunch by the clock is non-negotiable today."
          : `Bridges the tail through the afternoon. Latest sensible time today: ${fmt(boosterLatest)} — later and it's still active at bedtime.`)
        : `Second booster carries you to ~7:30pm. Hard ceiling ${fmt(boosterLatest)} — this is the edge of sleep-safe, not a target to drift past.`,
    }));
    return [...baseBlocks, ...rows].sort((a, b) => a.start - b.start || b.end - a.end);
  }, [baseBlocks, JSON.stringify(boosterMins), boosterLatest]);

  const current = blocks.filter((b) => !b.marker).find((b) => nowMin >= b.start && nowMin < b.end);
  const next = blocks.find((b) => b.start > nowMin);
  const boosterEffNow = boosterMins.reduce((s, m) => s + boosterEffectAt(nowMin - m), 0);
  const effPct = Math.round(Math.min(effectAt(nowMin - medMin) + boosterEffNow, 1.1) * 100);

  // block-transition chime
  const prevBlockRef = useRef(null);
  useEffect(() => {
    if (prevBlockRef.current && current && prevBlockRef.current !== current.title) chime();
    prevBlockRef.current = current ? current.title : null;
  }, [current ? current.title : null]);

  // actions
  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    setTasks((t) => [...t, { id: Date.now(), text, kind: newTaskKind, done: false }]);
    setNewTask("");
  };
  const toggleTask = (id) => setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const deleteTask = (id) => setTasks((t) => t.filter((x) => x.id !== id));
  const promoteTask = (text) => {
    const top3 = [...day.top3];
    const slot = top3.findIndex((x) => !x.trim());
    if (slot === -1) return;
    top3[slot] = text;
    patchDay({ top3 });
  };
  const logCheckin = (score) => {
    const m = nowMin - medMin;
    patchDay({ checkins: [...day.checkins, { m, s: score }] });
    setInsights((ins) => ({ ...ins, checkins: [...ins.checkins, { m, s: score }].slice(-400) }));
    setCheckinFlash(true);
    setTimeout(() => setCheckinFlash(false), 1500);
  };
  const openSos = () => {
    setSosOpen((o) => !o);
    if (!tactic) dealTactic();
    if (!sosOpen) {
      const m = nowMin - medMin;
      patchDay({ sos: [...day.sos, { m }] });
      setInsights((ins) => ({ ...ins, sos: [...ins.sos, { m }].slice(-400) }));
    }
  };
  const roll = (list, avoid) => { const o = list.filter((s) => s !== avoid); return o[Math.floor(Math.random() * o.length)] || list[0]; };
  const chooseCraving = (id) => { setCraving(id); setSuggestion(roll(SNACKS.filter((s) => s.cravings.includes(id)), null)); setSnackStep("pick"); };
  const eatIt = () => {
    patchDay({ log: [...day.log, { name: suggestion.name, kcal: suggestion.kcal, t: fmt(nowMin) }] });
    setSnackStep("triage"); setSuggestion(null); setCraving(null);
  };
  const openTriage = () => { setSnackStep("triage"); setSuggestion(null); setCraving(null); setTab("snacks"); };

  const spent = day.log.reduce((s, l) => s + l.kcal, 0);
  const left = settings.budget - spent;
  const pct = Math.min((spent / Math.max(settings.budget, 1)) * 100, 100);
  const pool = useMemo(() => (craving ? SNACKS.filter((s) => s.cravings.includes(craving)) : SNACKS), [craving]);

  const mm = String(Math.floor(pomo.secs / 60)).padStart(2, "0");
  const ss = String(pomo.secs % 60).padStart(2, "0");
  const allInsights = { checkins: insights.checkins, sos: insights.sos };

  const inputStyle = { background: C.panelSoft, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, padding: "6px 10px", fontSize: 14 };
  const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 };
  const btn = (bg, color, border) => ({ background: bg, color, border: border ? `1.5px solid ${border}` : "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" });

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* header */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <div style={{ color: C.amber, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Ride the curve</div>
            <h1 style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 32, lineHeight: 1.1, margin: "4px 0 0" }}>Peak Window</h1>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
              {todayStr()} · {DAY_TYPES.find((d) => d.id === settings.dayType).label} · everything saves automatically
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => set({ soundOn: !settings.soundOn })} title="sound" style={{ ...btn("transparent", C.muted, C.line), padding: "10px 12px" }}>
              {settings.soundOn ? "🔔" : "🔕"}
            </button>
            <button onClick={() => setTab("day")} style={btn(tab === "day" ? C.amber : "transparent", tab === "day" ? "#1A1408" : C.muted, tab === "day" ? null : C.line)}>Day plan</button>
            <button onClick={() => { setTab("focus"); if (!tactic) dealTactic(); }} style={btn(tab === "focus" ? C.rose : "transparent", tab === "focus" ? "#2A0F18" : C.muted, tab === "focus" ? null : C.line)}>Focus gym</button>
            <button onClick={() => setTab("snacks")} style={btn(tab === "snacks" ? C.green : "transparent", tab === "snacks" ? "#10241A" : C.muted, tab === "snacks" ? null : C.line)}>
              Snack Patrol {spent > 0 ? `· ${spent} kcal` : ""}
            </button>
          </div>
        </div>

        {tab === "day" && (
          <>
            {/* settings */}
            <div className="flex flex-wrap gap-3 items-end mb-4">
              <label className="flex flex-col gap-1" style={{ fontSize: 11, color: C.muted }}>Day type
                <select value={settings.dayType} onChange={(e) => set({ dayType: e.target.value })} style={inputStyle}>
                  {DAY_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1" style={{ fontSize: 11, color: C.muted }}>Wake
                <input type="time" value={settings.wake} onChange={(e) => set({ wake: e.target.value })} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1" style={{ fontSize: 11, color: C.muted }}>Dose time
                <input type="time" value={settings.med} onChange={(e) => set({ med: e.target.value })} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1" style={{ fontSize: 11, color: C.muted }}>Prescribed dose
                <select value={settings.dose} onChange={(e) => set({ dose: e.target.value })} style={inputStyle}>
                  <option value="40">Vyvanse 40 mg</option>
                  <option value="50">Vyvanse 50 mg</option>
                </select>
              </label>
              <label className="flex flex-col gap-1" style={{ fontSize: 11, color: C.muted }}>Workout slot
                <select value={settings.workoutSlot} onChange={(e) => set({ workoutSlot: e.target.value })} style={inputStyle}>
                  <option value="onset">During onset</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </label>
              <label className="flex flex-col gap-1" style={{ fontSize: 11, color: C.muted }}>10mg boosters (if prescribed)
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={settings.boosterMode}
                    onChange={(e) => {
                      const m = e.target.value;
                      set(m === "two" ? { boosterMode: m, booster1Time: "11:00", booster2Time: "14:00" } : m === "one" ? { boosterMode: m, booster1Time: "12:45" } : { boosterMode: m });
                    }}
                    style={{ ...inputStyle, color: settings.boosterMode !== "off" ? C.rose : C.muted, borderColor: settings.boosterMode !== "off" ? C.rose : C.line }}
                  >
                    <option value="off">Off</option>
                    <option value="one">One (~12:45pm)</option>
                    <option value="two">Two (11am + 2pm)</option>
                  </select>
                  {settings.boosterMode !== "off" && (
                    <input type="time" value={settings.booster1Time} onChange={(e) => set({ booster1Time: e.target.value })} style={inputStyle} />
                  )}
                  {settings.boosterMode === "two" && (
                    <input type="time" value={settings.booster2Time} onChange={(e) => set({ booster2Time: e.target.value })} style={inputStyle} />
                  )}
                </div>
              </label>
            </div>

            {lateBoosters.length > 0 && (
              <div style={{ background: C.roseSoft, border: `1px solid ${C.rose}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                ⚠️ A booster at {lateBoosters.map((m) => fmt(m)).join(" and ")} will still be active at your {fmt(bedMin)} bedtime. Short-acting dex runs ~5–6h — last booster by <b>{fmt(boosterLatest)}</b>, hard ceiling. A booster that costs sleep is a net loss: tomorrow's main dose performs worse under-slept.
              </div>
            )}
            {tooClose && (
              <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                ⚠️ Your two boosters are under 2.5h apart — they'll mostly overlap, adding side-effect load without extending coverage. Space them ~3–4h (e.g. 11am + 2pm).
              </div>
            )}

            {/* curve */}
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 14px 6px" }}>
              <div className="flex justify-between items-baseline px-1 flex-wrap gap-2">
                <div style={{ fontSize: 13, color: C.muted }}>
                  {settings.dose} mg at {fmt(medMin)}{boosterMins.length > 0 ? ` + 10 mg at ${boosterMins.map((m) => fmt(m)).join(" & ")}` : ""} · onset ~{fmt(medMin + 90)} · fades ~{fmt(boosterMins.length > 0 ? Math.max(medMin + 720, ...boosterMins.map((m) => m + 330)) : medMin + 720)}
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: C.amber, fontWeight: 700 }}>{effPct}%</span>
                  <span style={{ color: C.muted }}> of peak right now</span>
                </div>
              </div>
              <DayCurve medMin={medMin} boosterMins={boosterMins} blocks={blocks.filter((b) => !b.marker)} nowMin={nowMin} />
            </div>

            {/* top 3 */}
            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>
                Today's top 3 — write these during ramp-up
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {day.top3.map((t, i) => (
                  <input
                    key={i}
                    value={t}
                    placeholder={["The hard thing (peak block)", "Second priority", "If time allows"][i]}
                    onChange={(e) => {
                      const top3 = [...day.top3]; top3[i] = e.target.value; patchDay({ top3 });
                    }}
                    style={{ ...inputStyle, width: "100%", padding: "10px 12px" }}
                  />
                ))}
              </div>
            </div>

            {/* task list */}
            <div style={{ ...card, marginTop: 16 }}>
              <div className="flex justify-between items-center flex-wrap gap-2" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted }}>
                  Task list — carries over until done
                </div>
                {tasks.some((t) => t.done) && (
                  <button onClick={() => setTasks((t) => t.filter((x) => !x.done))} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                    clear completed
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap" style={{ marginBottom: 12 }}>
                <input
                  value={newTask}
                  placeholder="Add a task…"
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                  style={{ ...inputStyle, flex: 1, minWidth: 180, padding: "10px 12px" }}
                />
                <button
                  onClick={() => setNewTaskKind(newTaskKind === "deep" ? "light" : "deep")}
                  title="Toggle: does this need peak brain or not?"
                  style={{ ...inputStyle, cursor: "pointer", fontWeight: 600, color: newTaskKind === "deep" ? C.amber : "#9AA3D6", borderColor: newTaskKind === "deep" ? C.amber : C.line }}
                >
                  {newTaskKind === "deep" ? "🧠 Deep" : "🍃 Light"}
                </button>
                <button onClick={addTask} style={{ background: C.amber, color: "#1A1408", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}>Add</button>
              </div>
              {tasks.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>
                  Empty. Tag each task 🧠 Deep (needs peak brain: new material, writing, problem sets) or 🍃 Light (flashcards, admin, errands) — the "Right now" card will surface the right ones for the block you're in.
                </div>
              ) : (
                tasks.map((t, i) => (
                  <div key={t.id} className="flex gap-3 items-center py-2" style={{ borderTop: i ? `1px solid ${C.line}` : "none", opacity: t.done ? 0.45 : 1 }}>
                    <button onClick={() => toggleTask(t.id)} style={{
                      width: 20, height: 20, borderRadius: 6, cursor: "pointer", flexShrink: 0,
                      border: `1.5px solid ${t.done ? C.green : C.line}`,
                      background: t.done ? C.green : "transparent", color: "#10241A", fontSize: 13, lineHeight: "17px",
                    }}>{t.done ? "✓" : ""}</button>
                    <span style={{ fontSize: 12, flexShrink: 0 }} title={t.kind === "deep" ? "Needs peak brain" : "Fine for the tail"}>{t.kind === "deep" ? "🧠" : "🍃"}</span>
                    <span style={{ flex: 1, fontSize: 14, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                    {!t.done && day.top3.some((x) => !x.trim()) && (
                      <button onClick={() => promoteTask(t.text)} title="Promote to today's top 3" style={{ background: "none", border: "none", color: C.amber, fontSize: 15, cursor: "pointer", padding: "0 4px" }}>★</button>
                    )}
                    <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 14, cursor: "pointer", padding: "0 4px" }}>✕</button>
                  </div>
                ))
              )}
            </div>

            {/* now + timer */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div style={card}>
                <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted }}>Right now</div>
                {current ? (
                  <>
                    <div className="flex items-center gap-2 mt-2">
                      <span style={{ width: 10, height: 10, borderRadius: 99, background: KIND[current.kind].color, display: "inline-block" }} />
                      <span style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 22 }}>{current.title}</span>
                    </div>
                    <div style={{ color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{current.detail}</div>
                    {(current.kind === "deep" || current.kind === "focus") && day.top3.some(Boolean) && (
                      <div style={{ background: C.amberSoft, borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 13 }}>
                        {day.top3.filter(Boolean).map((t, i) => <div key={i}>▸ {t}</div>)}
                      </div>
                    )}
                    {(() => {
                      const wantKind = current.kind === "deep" || current.kind === "focus" ? "deep" : current.kind === "light" || current.kind === "routine" ? "light" : null;
                      const match = wantKind ? tasks.filter((t) => !t.done && t.kind === wantKind).slice(0, 4) : [];
                      return match.length > 0 ? (
                        <div style={{ background: C.panelSoft, borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 13 }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
                            {wantKind === "deep" ? "🧠 Deep tasks that fit this block" : "🍃 Light tasks that fit this block"}
                          </div>
                          {match.map((t) => (
                            <div key={t.id} className="flex items-center gap-2" style={{ padding: "2px 0" }}>
                              <button onClick={() => toggleTask(t.id)} style={{ width: 16, height: 16, borderRadius: 5, cursor: "pointer", border: `1.5px solid ${C.line}`, background: "transparent", flexShrink: 0 }} />
                              <span>{t.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
                      Until {fmt(current.end)}{next ? ` · next: ${next.title} at ${fmt(next.start)}` : ""}
                    </div>
                    {/* focus check-in */}
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 12, color: C.muted, marginRight: 8 }}>{checkinFlash ? "Logged ✓" : "Focus check:"}</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => logCheckin(n)} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, padding: "4px 10px", marginRight: 4, cursor: "pointer", fontSize: 13 }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-wrap" style={{ marginTop: 12 }}>
                      <button onClick={openSos} style={btn(C.roseSoft, C.rose, C.rose)}>😵‍💫 Feeling unfocused?</button>
                      {current.snackLink && <button onClick={openTriage} style={btn(C.greenSoft, C.green, C.green)}>Craving? Snack triage →</button>}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>
                      Outside the planned day. {next ? `Next up: ${next.title} at ${fmt(next.start)}.` : "Sleep. Tomorrow's curve needs it."}
                    </div>
                    <button onClick={openSos} style={{ ...btn(C.roseSoft, C.rose, C.rose), marginTop: 12 }}>😵‍💫 Feeling unfocused?</button>
                  </>
                )}
              </div>

              <div style={card}>
                <div className="flex justify-between items-center">
                  <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted }}>Focus timer · 50 / 10</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{pomo.rounds} rounds done</div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 44, color: pomo.mode === "focus" ? C.amber : C.cyan }}>{mm}:{ss}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{pomo.mode === "focus" ? "focus" : "break"}</div>
                  <div className="flex gap-2 ml-auto">
                    <button onClick={() => pomo.setRunning(!pomo.running)} style={{ background: C.amber, color: "#1A1408", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}>
                      {pomo.running ? "Pause" : "Start"}
                    </button>
                    <button onClick={pomo.reset} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>Reset</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Chimes {settings.soundOn ? "on" : "off"} — end of each focus/break phase and at block changes.</div>
              </div>
            </div>

            {/* SOS panel */}
            {sosOpen && (
              <div style={{ ...card, marginTop: 16, borderColor: C.rose }}>
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.rose }}>Focus SOS</div>
                    <div style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 22, marginTop: 4 }}>Unfocused isn't a character flaw — it's a state. Change the state.</div>
                  </div>
                  <button onClick={() => setSosOpen(false)} style={{ background: "none", border: `1px solid ${C.line}`, color: C.muted, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>Close</button>
                </div>
                {(() => {
                  const s = stageAdvice(nowMin - medMin);
                  return (
                    <div style={{ background: C.panelSoft, borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
                      <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.amber }}>
                        Where you are on the curve: {s.label} · {effPct}% of peak
                      </span>
                      <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{s.msg}</div>
                    </div>
                  );
                })()}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>The 5-step reset (~4 minutes)</div>
                    {RESET_PROTOCOL.map((step, i) => (
                      <div key={i} className="flex gap-3 items-start py-2" style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
                        <button onClick={() => setProtocolDone((d) => ({ ...d, [i]: !d[i] }))} style={{
                          width: 20, height: 20, borderRadius: 6, marginTop: 1, cursor: "pointer", flexShrink: 0,
                          border: `1.5px solid ${protocolDone[i] ? C.green : C.line}`,
                          background: protocolDone[i] ? C.green : "transparent", color: "#10241A", fontSize: 13, lineHeight: "17px",
                        }}>{protocolDone[i] ? "✓" : ""}</button>
                        <span style={{ fontSize: 13, color: protocolDone[i] ? C.muted : C.text, lineHeight: 1.5, textDecoration: protocolDone[i] ? "line-through" : "none" }}>{step}</span>
                      </div>
                    ))}
                    {Object.values(protocolDone).filter(Boolean).length === RESET_PROTOCOL.length && (
                      <div style={{ color: C.green, fontSize: 13, marginTop: 8 }}>
                        Reset complete — start the 50/10 timer and go. ✓
                        <button onClick={() => setProtocolDone({})} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", textDecoration: "underline", marginLeft: 10 }}>reset checklist</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Or try one tactic</div>
                    {tactic && (
                      <div style={{ background: C.roseSoft, border: `1px solid ${C.rose}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 19 }}>{tactic.name}</div>
                        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{tactic.how}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{tactic.why}</div>
                      </div>
                    )}
                    <button onClick={dealTactic} style={{ ...btn("transparent", C.text, C.line), marginTop: 10 }}>🎲 Deal me another</button>
                    <button onClick={() => setTab("focus")} style={{ background: "none", border: "none", color: C.rose, fontSize: 12, cursor: "pointer", textDecoration: "underline", display: "block", marginTop: 8, padding: 0 }}>
                      Full library + focus exercises →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* schedule */}
            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Today's plan</div>
              <div className="flex flex-col">
                {blocks.map((b, i) => {
                  const isNow = current === b;
                  const isDone = day.done[i];
                  return (
                    <div key={i} className="flex gap-3 items-start py-3" style={{
                      borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
                      opacity: isDone ? 0.45 : 1,
                      background: isNow ? KIND[b.kind].soft : "transparent",
                      borderRadius: isNow ? 10 : 0, paddingLeft: isNow ? 10 : 0, paddingRight: isNow ? 10 : 0,
                    }}>
                      <button onClick={() => patchDay({ done: { ...day.done, [i]: !day.done[i] } })} style={{
                        width: 20, height: 20, borderRadius: 6, marginTop: 2, cursor: "pointer",
                        border: `1.5px solid ${isDone ? C.green : C.line}`,
                        background: isDone ? C.green : "transparent", color: "#10241A", fontSize: 13, lineHeight: "17px",
                      }}>{isDone ? "✓" : ""}</button>
                      <div style={{ minWidth: 118, fontFamily: "ui-monospace, monospace", fontSize: 13, color: C.muted, paddingTop: 2 }}>{fmt(b.start)}–{fmt(b.end)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ textDecoration: isDone ? "line-through" : "none", fontWeight: 600, fontSize: 15 }}>{b.title}</span>
                          <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: KIND[b.kind].color, border: `1px solid ${KIND[b.kind].color}`, borderRadius: 99, padding: "1px 8px" }}>{KIND[b.kind].tag}</span>
                          {isNow && <span style={{ fontSize: 10, color: C.text, background: C.line, borderRadius: 99, padding: "2px 8px" }}>NOW</span>}
                        </div>
                        <div style={{ color: C.muted, fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{b.detail}</div>
                        {b.snackLink && (
                          <button onClick={openTriage} style={{ background: "none", border: "none", color: C.green, fontSize: 12, cursor: "pointer", padding: 0, marginTop: 4, textDecoration: "underline" }}>Open Snack Patrol →</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* insights */}
            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.cyan, marginBottom: 4 }}>
                Your actual curve · {allInsights.checkins.length} check-ins, {allInsights.sos.length} SOS events logged
              </div>
              {allInsights.checkins.length >= 5 ? (
                <>
                  <div style={{ color: C.muted, fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>
                    Bars = your average focus rating (1–5) by hours after dose. Dashed line = the textbook curve. Pink dots = SOS presses.
                    Where your bars sag below the model, that's where to move easier work — and it's genuinely useful data for a prescriber conversation.
                  </div>
                  <InsightsChart checkins={allInsights.checkins} sos={allInsights.sos} />
                </>
              ) : (
                <div style={{ color: C.muted, fontSize: 13 }}>
                  Rate your focus (1–5 in the "Right now" card) a few times a day. After 5 check-ins, your personal curve appears here — your real data vs the textbook model.
                </div>
              )}
            </div>

            {/* med rules */}
            <div style={{ background: C.panelSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.cyan, marginBottom: 8 }}>Medication ground rules</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 13, lineHeight: 1.7 }}>
                <li><b style={{ color: C.text }}>One long-acting dose, once daily, in the morning</b> — whichever strength you're prescribed. Never combine the 40 and 50 or redose Vyvanse later; timing, not stacking, is the optimisation.</li>
                <li><b style={{ color: C.text }}>Boosters (10 mg short-acting) only exist if your prescriber prescribed them.</b> One booster: ~12:45pm. Two boosters: 11am + 2pm — spaced 3–4h, and the second at 2pm is a <b style={{ color: C.text }}>hard ceiling</b> with a 10pm bedtime, not a target to drift past. If sleep onset or dinner appetite suffers, drop to one and flag it at review.</li>
                <li>Same time every day. With a 10pm bedtime, main dose by <b style={{ color: C.text }}>~7am at the latest</b>.</li>
                <li>Caffeine cutoff by <b style={{ color: C.text }}>noon</b> — none within a few hours of a booster.</li>
                <li>Sleep is the multiplier. If the booster starts costing sleep or dinner appetite, that's a signal for your prescriber, not for pushing through.</li>
                <li>Any dose or timing change goes through your prescriber, not this app.</li>
              </ul>
            </div>
          </>
        )}

        {tab === "focus" && (
          <>
            <div style={{ ...card, borderColor: C.rose, marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.rose }}>Tactic dealer</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 12 }}>One card at a time — scanning a wall of advice while distracted is itself a focus task.</div>
              {tactic && (
                <div style={{ background: C.roseSoft, border: `1px solid ${C.rose}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 22 }}>{tactic.name}</div>
                  <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>{tactic.how}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{tactic.why}</div>
                </div>
              )}
              <div className="flex gap-3 mt-3 flex-wrap">
                <button onClick={dealTactic} style={btn(C.rose, "#2A0F18")}>🎲 Deal me one</button>
                <button onClick={() => setTab("day")} style={btn("transparent", C.muted, C.line)}>Back to the day →</button>
              </div>
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.cyan, marginBottom: 4 }}>Focus exercises — train it like a muscle</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
                Medication raises the ceiling; these raise the floor. One or two per day — best in the ramp-up or light tail, never peak time.
              </div>
              {exName && exSecs > 0 && (
                <div style={{ background: C.cyanSoft, border: `1px solid ${C.cyan}`, borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 36, color: C.cyan }}>
                    {String(Math.floor(exSecs / 60)).padStart(2, "0")}:{String(exSecs % 60).padStart(2, "0")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{exName}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>in progress — stay with it</div>
                  </div>
                  <button onClick={() => { setExName(null); setExSecs(0); }} style={{ ...btn("transparent", C.muted, C.line), marginLeft: "auto" }}>Stop</button>
                </div>
              )}
              {exName && exSecs === 0 && (
                <div style={{ background: C.greenSoft, border: `1px solid ${C.green}`, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 14, color: C.green }}>
                  ✓ {exName} done. That was a rep — they compound.
                  <button onClick={() => setExName(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", textDecoration: "underline", marginLeft: 10 }}>dismiss</button>
                </div>
              )}
              {EXERCISES.map((e, i) => (
                <div key={i} className="flex gap-3 items-start py-3" style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
                  <button onClick={() => { setExName(e.name); setExSecs(e.mins * 60); }} style={{ ...btn(C.cyanSoft, C.cyan, C.cyan), padding: "6px 12px", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>▶ {e.mins} min</button>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{e.name}</div>
                    <div style={{ color: C.text, fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{e.how}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{e.why}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Full tactics library</div>
              <div className="grid md:grid-cols-2 gap-3">
                {TACTICS.map((t, i) => (
                  <div key={i} style={{ background: C.panelSoft, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                    <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{t.how}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{t.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "snacks" && (
          <>
            <div style={{ ...card, marginBottom: 16 }}>
              <div className="flex justify-between items-baseline flex-wrap gap-2">
                <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>Today's snack budget</div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  <span style={{ fontWeight: 800, fontSize: 18, color: left >= 0 ? C.green : C.rose }}>{spent}</span>{" / "}
                  <input type="number" value={settings.budget} min={50} step={25} onChange={(e) => set({ budget: Number(e.target.value) || 0 })}
                    style={{ width: 64, border: `1px solid ${C.line}`, borderRadius: 8, padding: "2px 6px", fontSize: 13, color: C.text, background: C.panelSoft }} /> kcal
                </div>
              </div>
              <div style={{ background: C.panelSoft, borderRadius: 99, height: 10, marginTop: 10, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: left >= 0 ? C.green : C.rose, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: left >= 0 ? C.muted : C.rose, marginTop: 6 }}>
                {left >= 0 ? `${left} kcal of guilt-free grazing left` : `${-left} kcal over — switch to the free stuff (tea, gum, miso)`}
              </div>
            </div>

            {snackStep === "triage" && (
              <div style={card}>
                <div style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 22, marginBottom: 4 }}>About to snack?</div>
                <p style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Quick check — would you eat a plain apple right now?</p>
                <div className="flex flex-col gap-3">
                  <button style={btn(C.cyanSoft, C.text, C.cyan)} onClick={() => setSnackStep("water")}>
                    🚱 Not sure I'm actually hungry
                    <div style={{ fontSize: 12, fontWeight: 400, color: C.muted, marginTop: 2 }}>Probably boredom or thirst — try the free fixes first</div>
                  </button>
                  <button style={btn(C.green, "#10241A")} onClick={() => setSnackStep("craving")}>
                    😋 Yes — I'd eat the apple
                    <div style={{ fontSize: 12, fontWeight: 400, color: "#1E3A2A", marginTop: 2 }}>Real hunger. Pick a craving, get a smart match</div>
                  </button>
                </div>
              </div>
            )}

            {snackStep === "water" && (
              <div style={card}>
                <div style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 22, marginBottom: 8 }}>The free fixes</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 14, lineHeight: 1.9 }}>
                  <li>Big glass of <b style={{ color: C.text }}>water or sparkling water</b> — thirst impersonates hunger constantly</li>
                  <li><b style={{ color: C.text }}>Chewing gum</b> — ends most boredom cravings in ~10 min</li>
                  <li><b style={{ color: C.text }}>Miso / stock cube in hot water</b> — warm and savoury for ~20 kcal</li>
                  <li><b style={{ color: C.text }}>Stand up and move for 2 minutes</b> — it's usually a dopamine itch, not a fuel problem</li>
                </ul>
                <div className="flex gap-3 mt-5 flex-wrap">
                  <button style={btn(C.green, "#10241A")} onClick={() => setSnackStep("triage")}>That did it ✓</button>
                  <button style={btn("transparent", C.text, C.line)} onClick={() => setSnackStep("craving")}>Still hungry — show me snacks</button>
                </div>
              </div>
            )}

            {snackStep === "craving" && (
              <div style={card}>
                <div style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 22, marginBottom: 4 }}>What's the craving?</div>
                <p style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Matching the texture beats willpower every time.</p>
                <div className="grid grid-cols-2 gap-3">
                  {CRAVINGS.map((c) => (
                    <button key={c.id} style={btn(C.panelSoft, C.text, C.line)} onClick={() => chooseCraving(c.id)}>
                      <span style={{ fontSize: 20, marginRight: 8 }}>{c.emoji}</span>{c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {snackStep === "pick" && suggestion && (
              <div style={{ ...card, borderColor: C.green }}>
                <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: C.green }}>Your match</div>
                <div className="flex justify-between items-start gap-3 mt-2 flex-wrap">
                  <div style={{ fontFamily: "ui-serif, Georgia, serif", fontSize: 24, lineHeight: 1.2 }}>{suggestion.name}</div>
                  <div style={{ background: C.amberSoft, color: C.amber, fontWeight: 800, borderRadius: 99, padding: "4px 14px", fontSize: 15, whiteSpace: "nowrap" }}>~{suggestion.kcal} kcal</div>
                </div>
                <p style={{ color: C.muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{suggestion.why}</p>
                <div className="flex gap-3 mt-4 flex-wrap">
                  <button style={btn(C.green, "#10241A")} onClick={eatIt}>Eating this — log it</button>
                  <button style={btn("transparent", C.text, C.line)} onClick={() => setSuggestion(roll(pool, suggestion))}>🎲 Pick again</button>
                  <button style={btn("transparent", C.muted, C.line)} onClick={() => { setSnackStep("triage"); setSuggestion(null); setCraving(null); }}>Cancel</button>
                </div>
              </div>
            )}

            {day.log.length > 0 && (
              <div style={{ ...card, marginTop: 16 }}>
                <div className="flex justify-between items-center mb-2">
                  <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>Today's grazing log</div>
                  <button onClick={() => patchDay({ log: [] })} style={{ background: "none", border: "none", color: C.rose, fontSize: 12, cursor: "pointer" }}>Clear</button>
                </div>
                {day.log.map((l, i) => (
                  <div key={i} className="flex justify-between py-2" style={{ borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 14 }}>
                    <span><span style={{ color: C.muted, fontFamily: "ui-monospace, monospace", fontSize: 12, marginRight: 10 }}>{l.t}</span>{l.name}</span>
                    <span style={{ color: C.muted }}>{l.kcal} kcal</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>The full arsenal</div>
              {SNACKS.map((s, i) => (
                <div key={i} className="flex justify-between items-center py-2 gap-3" style={{ borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 14 }}>
                  <span>{s.name}</span>
                  <span style={{ color: C.muted, whiteSpace: "nowrap", fontSize: 13 }}>~{s.kcal} kcal</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ color: C.muted, fontSize: 11, textAlign: "center", padding: "18px 0 8px" }}>
          Planning aid only — not medical advice. Calorie figures approximate. Follow your prescriber's instructions.
        </div>
      </div>
    </div>
  );
}
