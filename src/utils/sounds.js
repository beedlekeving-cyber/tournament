// ─── Web Audio Sound Engine ───────────────────────────────────────────────────
// All sounds generated via Web Audio API — no external files needed

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function gain(ac, value, time = 0) {
  const g = ac.createGain();
  g.gain.setValueAtTime(value, time || ac.currentTime);
  g.connect(ac.destination);
  return g;
}

function osc(ac, type, freq, start, duration, gainVal = 0.3, destination = null) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(gainVal, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  o.connect(g);
  g.connect(destination || ac.destination);
  o.start(start);
  o.stop(start + duration + 0.01);
}

// ── Tick sound (each second of timer) ──────────────────────────────────────
export function playTick() {
  const ac = getCtx();
  const t = ac.currentTime;
  osc(ac, 'sine', 880, t, 0.06, 0.08);
}

// ── Urgent tick (last 3 seconds) ───────────────────────────────────────────
export function playUrgentTick() {
  const ac = getCtx();
  const t = ac.currentTime;
  osc(ac, 'square', 1200, t, 0.08, 0.12);
  osc(ac, 'square', 600,  t + 0.04, 0.08, 0.06);
}

// ── Correct answer ──────────────────────────────────────────────────────────
export function playCorrect() {
  const ac = getCtx();
  const t = ac.currentTime;
  // Rising arpeggio
  osc(ac, 'sine', 523, t,        0.12, 0.25); // C5
  osc(ac, 'sine', 659, t + 0.1,  0.12, 0.12, 0.25); // E5
  osc(ac, 'sine', 784, t + 0.2,  0.20, 0.25); // G5
  osc(ac, 'sine', 1046,t + 0.3,  0.25, 0.3);  // C6
}

// ── Wrong answer ────────────────────────────────────────────────────────────
export function playWrong() {
  const ac = getCtx();
  const t = ac.currentTime;
  osc(ac, 'sawtooth', 300, t,       0.18, 0.3);
  osc(ac, 'sawtooth', 220, t + 0.15, 0.25, 0.35);
  osc(ac, 'sawtooth', 180, t + 0.3,  0.2,  0.3);
}

// ── Match win ───────────────────────────────────────────────────────────────
export function playWin() {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523, 659, 784, 1046, 1318, 1046, 1318];
  notes.forEach((freq, i) => {
    osc(ac, 'sine', freq, t + i * 0.1, 0.18, 0.3);
  });
  // Sparkle layer
  [1200, 1500, 1800].forEach((freq, i) => {
    osc(ac, 'triangle', freq, t + 0.4 + i * 0.08, 0.15, 0.1);
  });
}

// ── Match lose ──────────────────────────────────────────────────────────────
export function playLose() {
  const ac = getCtx();
  const t = ac.currentTime;
  osc(ac, 'sawtooth', 400, t,       0.25, 0.3);
  osc(ac, 'sawtooth', 300, t + 0.2, 0.25, 0.35);
  osc(ac, 'sawtooth', 200, t + 0.45, 0.25, 0.5);
  osc(ac, 'sawtooth', 150, t + 0.75, 0.2,  0.5);
}

// ── Countdown beep ──────────────────────────────────────────────────────────
export function playCountdown(number) {
  const ac = getCtx();
  const t = ac.currentTime;
  if (number > 0) {
    osc(ac, 'sine', 660, t, 0.2, 0.4);
    osc(ac, 'sine', 880, t + 0.05, 0.12, 0.1);
  } else {
    // GO! — high energetic blip
    osc(ac, 'sine', 1047, t,       0.4, 0.15);
    osc(ac, 'sine', 1319, t + 0.08, 0.4, 0.15);
    osc(ac, 'sine', 1568, t + 0.16, 0.5, 0.25);
  }
}

// ── Lobby / matchmaking ambience pulse ─────────────────────────────────────
export function playMatchFound() {
  const ac = getCtx();
  const t = ac.currentTime;
  [200, 300, 450].forEach((freq, i) => {
    osc(ac, 'sine', freq, t + i * 0.12, 0.25, 0.2);
  });
  osc(ac, 'sine', 600, t + 0.4, 0.3, 0.35);
  osc(ac, 'sine', 800, t + 0.55, 0.35, 0.4);
}

// ── Button click ────────────────────────────────────────────────────────────
export function playClick() {
  const ac = getCtx();
  const t = ac.currentTime;
  osc(ac, 'sine', 440, t, 0.06, 0.15);
}

// ── Final stage fanfare ─────────────────────────────────────────────────────
export function playFinalFanfare() {
  const ac = getCtx();
  const t = ac.currentTime;
  const melody = [523, 523, 784, 784, 880, 784, 659, 523];
  melody.forEach((freq, i) => {
    osc(ac, 'sine',     freq,       t + i * 0.13, 0.15, 0.28);
    osc(ac, 'triangle', freq * 1.5, t + i * 0.13, 0.12, 0.12);
  });
}

// ── Prize / reward ──────────────────────────────────────────────────────────
export function playPrize() {
  const ac = getCtx();
  const t = ac.currentTime;
  const coins = [1047, 1319, 1568, 2093, 1568, 2093, 2637];
  coins.forEach((freq, i) => {
    osc(ac, 'triangle', freq, t + i * 0.09, 0.12, 0.22);
    if (i % 2 === 0) osc(ac, 'sine', freq * 2, t + i * 0.09 + 0.02, 0.07, 0.1);
  });
}

// ── Time up buzz ────────────────────────────────────────────────────────────
export function playTimeUp() {
  const ac = getCtx();
  const t = ac.currentTime;
  osc(ac, 'square', 150, t,       0.35, 0.4);
  osc(ac, 'square', 100, t + 0.3, 0.3,  0.5);
}
