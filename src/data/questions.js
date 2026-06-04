// Quiz question bank.
// Intentionally empty — questions are managed via the admin panel.
export const QUESTIONS_DB = [];

export function getRandomQuestions(count, excludeIds = []) {
  const available = QUESTIONS_DB.filter(q => !excludeIds.includes(q.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Deterministic seeded PRNG (mulberry32) so both devices get identical questions
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

export function getSeededQuestions(count, excludeIds = [], seedStr = '') {
  const available = QUESTIONS_DB.filter(q => !excludeIds.includes(q.id));
  const rng = mulberry32(hashSeed(String(seedStr)));
  const shuffled = [...available].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

export function getQuestionById(id) {
  return QUESTIONS_DB.find(q => q.id === id);
}
