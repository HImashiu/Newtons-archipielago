// Per-browser persistence of progress and programs. Storage can be missing
// or throw (private windows, blocked site data), so every access is guarded
// and the app works without it.

const KEY = 'scratch-physics:v1';

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: keep going without persistence */
  }
}

export function goalsFor(levelId) {
  return read().goals?.[levelId] ?? [];
}

export function saveGoals(levelId, ids) {
  const d = read();
  d.goals = { ...(d.goals ?? {}), [levelId]: ids };
  write(d);
}

export function loadProgram(levelId) {
  const p = read().programs?.[levelId];
  return p && Array.isArray(p.scripts) ? p : null;
}

export function saveProgram(levelId, program) {
  const d = read();
  d.programs = { ...(d.programs ?? {}) };
  if (program) d.programs[levelId] = program;
  else delete d.programs[levelId];
  write(d);
}

export function getPref(key, fallback) {
  return read().prefs?.[key] ?? fallback;
}

export function setPref(key, value) {
  const d = read();
  d.prefs = { ...(d.prefs ?? {}), [key]: value };
  write(d);
}
