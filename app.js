// Pathwaise app logic: onboarding, plan generation/sequencing, adaptive
// reordering based on feedback, and progress persistence. No build step,
// no backend — state lives in localStorage.

const STORE_KEYS = {
  styleWeights: "pathwaise:styleWeights",
  paths: "pathwaise:paths", // { [topicKey]: { topicName, resources: [...], completed: {id: true}, feedback: {id: 'helpful'|'slow'|'fast'} } }
  onboarded: "pathwaise:onboarded",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function defaultStyleWeights() {
  const w = {};
  LEARNING_STYLES.forEach((s) => (w[s.id] = 1));
  return w;
}

let styleWeights = loadJSON(STORE_KEYS.styleWeights, defaultStyleWeights());
let paths = loadJSON(STORE_KEYS.paths, {});

function saveStyleWeights() {
  saveJSON(STORE_KEYS.styleWeights, styleWeights);
}
function savePaths() {
  saveJSON(STORE_KEYS.paths, paths);
}

// --- Sequencing engine -----------------------------------------------------

// Score a resource against the current style-weight profile: resources whose
// type fits a heavily-weighted style rank higher within their stage.
function styleScore(resource) {
  const fits = RESOURCE_TYPES[resource.type]?.styleFit || [];
  if (fits.length === 0) return 0;
  return Math.max(...fits.map((s) => styleWeights[s] ?? 1));
}

function sequenceResources(resources) {
  const stageIndex = (r) => STAGES.indexOf(r.stage);
  return [...resources]
    .sort((a, b) => {
      if (stageIndex(a) !== stageIndex(b)) return stageIndex(a) - stageIndex(b);
      return styleScore(b) - styleScore(a);
    })
    .slice(0, FREE_PLAN_RESOURCE_CAP);
}

function topicKey(name) {
  return name.trim().toLowerCase();
}

function getOrCreatePath(topicName) {
  const key = topicKey(topicName);
  if (!paths[key]) {
    const topic = getTopic(topicName);
    paths[key] = {
      topicName: topic.name,
      resources: sequenceResources(topic.resources),
      completed: {},
      feedback: {},
    };
    savePaths();
  }
  return paths[key];
}

// Re-sequence the not-yet-completed resources of a path in place, keeping
// completed ones fixed in their spot, so feedback visibly reorders what's next.
function resequencePath(path) {
  const done = path.resources.filter((r) => path.completed[r.id]);
  const remaining = path.resources.filter((r) => !path.completed[r.id]);
  path.resources = [...done, ...sequenceResources(remaining)];
}

function applyFeedback(path, resource, kind) {
  path.feedback[resource.id] = kind;
  const fits = RESOURCE_TYPES[resource.type]?.styleFit || [];
  const delta = kind === "helpful" ? 0.4 : kind === "slow" ? -0.3 : -0.15; // 'fast' = too advanced/fast-paced
  fits.forEach((styleId) => {
    styleWeights[styleId] = Math.max(0.2, Math.min(4, (styleWeights[styleId] ?? 1) + delta));
  });
  saveStyleWeights();
  resequencePath(path);
  savePaths();
}

// --- Rendering ---------------------------------------------------------------

const el = (sel) => document.querySelector(sel);
const els = (sel) => Array.from(document.querySelectorAll(sel));

function dominantStyle() {
  return LEARNING_STYLES.slice().sort((a, b) => styleWeights[b.id] - styleWeights[a.id])[0];
}

function renderStyleProfile() {
  const container = el("#style-profile");
  const max = Math.max(...LEARNING_STYLES.map((s) => styleWeights[s.id]), 1);
  container.innerHTML = LEARNING_STYLES.map((s) => {
    const pct = Math.round((styleWeights[s.id] / max) * 100);
    return `
      <div class="style-row">
        <span class="style-label">${s.label}</span>
        <div class="style-bar-track"><div class="style-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");
}

function renderPathsList() {
  const container = el("#paths-list");
  const keys = Object.keys(paths);
  if (keys.length === 0) {
    container.innerHTML = `<p class="muted">No paths yet — search a topic to start one.</p>`;
    return;
  }
  container.innerHTML = keys
    .map((key) => {
      const p = paths[key];
      const total = p.resources.length;
      const done = p.resources.filter((r) => p.completed[r.id]).length;
      const active = key === activeTopicKey ? "active" : "";
      return `<button class="path-pill ${active}" data-key="${key}">
        ${p.topicName} <span class="pill-progress">${done}/${total}</span>
      </button>`;
    })
    .join("");
  els(".path-pill").forEach((btn) =>
    btn.addEventListener("click", () => setActiveTopic(btn.dataset.key))
  );
}

function stageLabel(stage) {
  return { foundation: "Foundations", core: "Core concepts", application: "Real-world application" }[stage];
}

function renderPlan() {
  const container = el("#plan");
  if (!activeTopicKey || !paths[activeTopicKey]) {
    container.innerHTML = `<p class="muted">Search a topic above to generate your first learning path.</p>`;
    el("#plan-header").innerHTML = "";
    return;
  }
  const path = paths[activeTopicKey];
  const total = path.resources.length;
  const done = path.resources.filter((r) => path.completed[r.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  el("#plan-header").innerHTML = `
    <h2>${path.topicName}</h2>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <p class="muted">${done} of ${total} resources complete · free plan (cap ${FREE_PLAN_RESOURCE_CAP})</p>
  `;

  let lastStage = null;
  container.innerHTML = path.resources
    .map((r) => {
      const stageHeader =
        r.stage !== lastStage ? `<h3 class="stage-heading">${stageLabel(r.stage)}</h3>` : "";
      lastStage = r.stage;
      const checked = path.completed[r.id] ? "checked" : "";
      const fb = path.feedback[r.id];
      const type = RESOURCE_TYPES[r.type];
      return `
        ${stageHeader}
        <div class="resource-card ${path.completed[r.id] ? "done" : ""}">
          <label class="resource-main">
            <input type="checkbox" data-id="${r.id}" class="complete-toggle" ${checked} />
            <span class="resource-type" title="${type.label}">${type.icon}</span>
            <span class="resource-body">
              <a class="resource-title" href="${r.url}" target="_blank" rel="noopener">${r.title}</a>
              <span class="resource-meta">${r.source} · ${r.minutes} min</span>
            </span>
          </label>
          <div class="resource-feedback">
            <button data-id="${r.id}" data-kind="helpful" class="fb-btn ${fb === "helpful" ? "picked" : ""}">👍 Helpful</button>
            <button data-id="${r.id}" data-kind="slow" class="fb-btn ${fb === "slow" ? "picked" : ""}">🐢 Too slow</button>
            <button data-id="${r.id}" data-kind="fast" class="fb-btn ${fb === "fast" ? "picked" : ""}">⚡ Too fast</button>
          </div>
        </div>`;
    })
    .join("");

  els(".complete-toggle").forEach((box) =>
    box.addEventListener("change", () => {
      path.completed[box.dataset.id] = box.checked;
      savePaths();
      renderPlan();
      renderPathsList();
    })
  );
  els(".fb-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const resource = path.resources.find((r) => r.id === btn.dataset.id);
      applyFeedback(path, resource, btn.dataset.kind);
      renderPlan();
      renderStyleProfile();
    })
  );
}

let activeTopicKey = null;

function setActiveTopic(key) {
  activeTopicKey = key;
  renderPlan();
  renderPathsList();
}

// --- Onboarding: implicit cognitive-style tasks -----------------------------
//
// Rather than asking "how do you prefer to learn?", this runs four short
// performance tasks — one per modality — and infers style weights from how
// the learner actually does on each: accuracy, response speed, and a couple
// of behavioral tells (do they reach for a text fallback instead of
// listening; do they read a hint before trying, or just try things). This is
// a lightweight heuristic, not a validated psychometric instrument — it's
// meant to give a plausible starting point that the feedback-driven
// adaptation in applyFeedback() then refines through real usage.

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Faster + correct => higher score (efficient processing in that modality).
// Slower + correct => moderate. Incorrect => low, regardless of speed.
function scoreFromTime(ms, maxMs) {
  return clamp(2 - (ms / maxMs) * 1.5, 0.3, 2);
}

function scoreFromAttempts(attempts) {
  const base = 2 - Math.max(0, attempts - 2) * 0.15;
  return clamp(attempts <= 1 ? Math.min(base, 1.2) : base, 0.3, 2);
}

const VISUAL_TARGET = [0, 2, 4, 6, 8];

function gridHTML(active) {
  let html = '<div class="grid3">';
  for (let i = 0; i < 9; i++) html += `<div class="grid-cell ${active.includes(i) ? "on" : ""}"></div>`;
  html += "</div>";
  return html;
}

function taskVisual(container, done) {
  container.innerHTML = `
    <p class="task-prompt">Puzzle 1 of 4 — Memorize this pattern.</p>
    <div class="mini-grid">${gridHTML(VISUAL_TARGET)}</div>
    <p class="muted small" id="mg-timer">Hiding in 3…</p>
  `;
  let n = 3;
  const timer = setInterval(() => {
    n--;
    const t = el("#mg-timer");
    if (t) t.textContent = n > 0 ? `Hiding in ${n}…` : "";
    if (n <= 0) {
      clearInterval(timer);
      showVisualOptions(container, done);
    }
  }, 1000);
}

function showVisualOptions(container, done) {
  const options = shuffle([
    { cells: VISUAL_TARGET, correct: true },
    { cells: [1, 3, 4, 5, 7], correct: false },
    { cells: [0, 1, 2, 6, 8], correct: false },
  ]);
  container.innerHTML = `
    <p class="task-prompt">Which pattern matches what you saw?</p>
    <div class="option-grids">
      ${options.map((o, i) => `<button type="button" class="grid-option" data-i="${i}">${gridHTML(o.cells)}</button>`).join("")}
    </div>
  `;
  const shownAt = performance.now();
  els(".grid-option").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const elapsed = performance.now() - shownAt;
      const correct = options[i].correct;
      done({ visualRaw: correct ? scoreFromTime(elapsed, 6000) : 0.1 });
    });
  });
}

const AUDIO_SCRIPT =
  "Three items are needed to finish the task. First, unfold the map. Second, use the brass key to open the drawer. Third, ring the small bell to signal you are done.";

function taskAuditory(container, done) {
  const supportsSpeech = "speechSynthesis" in window;
  let usedTranscript = !supportsSpeech;
  let startedAt = null;
  container.innerHTML = `
    <p class="task-prompt">Puzzle 2 of 4 — Listen, then answer.</p>
    <div class="task-actions">
      <button id="play-audio" type="button">▶ Play</button>
      <button id="show-transcript" type="button" class="link-btn">I'd rather read it</button>
    </div>
    <div id="transcript" class="transcript hidden"></div>
    <button id="audio-continue" type="button" class="hidden">Continue</button>
  `;
  if (!supportsSpeech) {
    el("#play-audio").classList.add("hidden");
    el("#transcript").textContent = AUDIO_SCRIPT;
    el("#transcript").classList.remove("hidden");
    el("#audio-continue").classList.remove("hidden");
    startedAt = performance.now();
  }
  el("#play-audio").addEventListener("click", () => {
    startedAt = startedAt ?? performance.now();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(AUDIO_SCRIPT);
    utter.onend = () => el("#audio-continue")?.classList.remove("hidden");
    window.speechSynthesis.speak(utter);
  });
  el("#show-transcript").addEventListener("click", () => {
    usedTranscript = true;
    startedAt = startedAt ?? performance.now();
    if (supportsSpeech) window.speechSynthesis.cancel();
    el("#transcript").textContent = AUDIO_SCRIPT;
    el("#transcript").classList.remove("hidden");
    el("#audio-continue").classList.remove("hidden");
  });
  el("#audio-continue").addEventListener("click", () => {
    showAuditoryQuestion(container, done, usedTranscript, startedAt, supportsSpeech);
  });
}

function showAuditoryQuestion(container, done, usedTranscript, startedAt, supportsSpeech) {
  const options = shuffle([
    { label: "Map → Key → Bell", correct: true },
    { label: "Key → Map → Bell", correct: false },
    { label: "Bell → Map → Key", correct: false },
  ]);
  container.innerHTML = `
    <p class="task-prompt">What was the correct order of steps?</p>
    <div class="quiz-options">${options.map((o, i) => `<button type="button" class="quiz-opt" data-i="${i}">${o.label}</button>`).join("")}</div>
  `;
  els(".quiz-opt").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const elapsed = performance.now() - startedAt;
      const correct = options[i].correct;
      const auditoryRaw = !supportsSpeech ? null : usedTranscript ? 0.3 : correct ? scoreFromTime(elapsed, 8000) : 0.2;
      done({
        auditoryRaw,
        auditorySupported: supportsSpeech,
        readingBonusFromAudio: usedTranscript ? 0.3 : 0,
      });
    });
  });
}

const READING_PASSAGE =
  "Deep-sea coral reefs can form at depths greater than 2,000 meters, far below where sunlight reaches. Unlike their shallow-water relatives, these corals don't rely on photosynthetic algae for energy — they filter tiny particles of food drifting through cold, dark currents. Some individual coral structures have been found to be over 4,000 years old.";

function taskReading(container, done) {
  const shownAt = performance.now();
  container.innerHTML = `
    <p class="task-prompt">Puzzle 3 of 4 — Read this, then continue.</p>
    <p class="reading-passage">${READING_PASSAGE}</p>
    <button id="reading-continue" type="button">Continue</button>
  `;
  el("#reading-continue").addEventListener("click", () => {
    showReadingQuestion(container, done, performance.now() - shownAt);
  });
}

function showReadingQuestion(container, done, readingTimeMs) {
  const options = shuffle([
    { label: "Over 4,000 years old", correct: true },
    { label: "Over 400 years old", correct: false },
    { label: "Over 40,000 years old", correct: false },
  ]);
  container.innerHTML = `
    <p class="task-prompt">How old were the oldest coral structures mentioned?</p>
    <div class="quiz-options">${options.map((o, i) => `<button type="button" class="quiz-opt" data-i="${i}">${o.label}</button>`).join("")}</div>
  `;
  els(".quiz-opt").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const correct = options[i].correct;
      done({ readingRaw: correct ? scoreFromTime(readingTimeMs, 25000) : 0.1 });
    });
  });
}

function taskKinesthetic(container, done) {
  const target = Math.floor(Math.random() * 100) + 1;
  let attempts = 0;
  let hintUsedFirst = false;
  let hintOpened = false;
  container.innerHTML = `
    <p class="task-prompt">Puzzle 4 of 4 — Find the hidden number (1–100) by trial and error.</p>
    <input type="range" min="1" max="100" value="50" id="k-slider" />
    <span id="k-value">50</span>
    <div class="task-actions">
      <button id="k-check" type="button">Check</button>
      <button id="k-hint" type="button" class="link-btn">Need a strategy tip?</button>
    </div>
    <p id="k-feedback" class="muted small"></p>
  `;
  el("#k-slider").addEventListener("input", (e) => {
    el("#k-value").textContent = e.target.value;
  });
  el("#k-hint").addEventListener("click", () => {
    if (hintOpened) return;
    hintOpened = true;
    if (attempts === 0) hintUsedFirst = true;
    el("#k-feedback").textContent = "Tip: cut the range in half with each guess.";
  });
  el("#k-check").addEventListener("click", () => {
    const val = Number(el("#k-slider").value);
    attempts++;
    if (val === target) {
      done({
        kinestheticRaw: hintUsedFirst ? 0.4 : scoreFromAttempts(attempts),
        kinestheticHintFirst: hintUsedFirst,
      });
    } else {
      el("#k-feedback").textContent = val < target ? "Higher." : "Lower.";
    }
  });
}

const COGNITIVE_TASKS = [taskVisual, taskAuditory, taskReading, taskKinesthetic];

let quizMetrics = {};
let quizTaskIndex = 0;

function renderQuiz() {
  quizMetrics = {};
  quizTaskIndex = 0;
  runNextTask();
}

function runNextTask() {
  const container = el("#quiz");
  if (quizTaskIndex >= COGNITIVE_TASKS.length) {
    finishQuiz();
    return;
  }
  const slot = document.createElement("div");
  container.innerHTML = "";
  container.appendChild(slot);
  COGNITIVE_TASKS[quizTaskIndex](slot, (metrics) => {
    Object.assign(quizMetrics, metrics);
    quizTaskIndex++;
    runNextTask();
  });
}

function finishQuiz() {
  const m = quizMetrics;
  const readingRaw =
    (m.readingRaw ?? 1) + (m.readingBonusFromAudio || 0) + (m.kinestheticHintFirst ? 0.3 : 0);
  const raws = {
    visual: m.visualRaw ?? 1,
    auditory: m.auditorySupported === false ? null : m.auditoryRaw ?? 1,
    reading: readingRaw,
    kinesthetic: m.kinestheticRaw ?? 1,
  };
  const supportedValues = Object.values(raws).filter((v) => v !== null);
  const maxRaw = Math.max(...supportedValues, 0.1);
  const minRaw = Math.min(...supportedValues, 0);
  const range = maxRaw - minRaw || 1;
  LEARNING_STYLES.forEach((s) => {
    const raw = raws[s.id];
    styleWeights[s.id] = raw === null ? 1 : clamp(0.4 + ((raw - minRaw) / range) * 3.2, 0.2, 4);
  });
  saveStyleWeights();
  localStorage.setItem(STORE_KEYS.onboarded, "1");
  el("#quiz").innerHTML = `<p class="quiz-done">Got it — your initial profile is set. It'll keep adjusting as you give feedback on resources in your plans.</p>`;
  renderStyleProfile();
  setTimeout(() => el("#onboarding")?.classList.add("collapsed"), 1600);
}

// --- Topic search -------------------------------------------------------------

function initSearch() {
  const form = el("#topic-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = el("#topic-input");
    const value = input.value.trim();
    if (!value) return;
    const path = getOrCreatePath(value);
    setActiveTopic(topicKey(path.topicName));
    input.value = "";
  });

  els(".suggested-topic").forEach((btn) =>
    btn.addEventListener("click", () => {
      const path = getOrCreatePath(btn.dataset.topic);
      setActiveTopic(topicKey(path.topicName));
    })
  );
}

// --- Init ------------------------------------------------------------------

function init() {
  renderQuiz();
  renderStyleProfile();
  renderPathsList();
  renderPlan();
  initSearch();

  if (!localStorage.getItem(STORE_KEYS.onboarded)) {
    el("#onboarding").classList.remove("collapsed");
  } else {
    el("#onboarding").classList.add("collapsed");
  }
  el("#onboarding-toggle").addEventListener("click", () => {
    const willOpen = el("#onboarding").classList.contains("collapsed");
    el("#onboarding").classList.toggle("collapsed");
    if (willOpen) renderQuiz();
  });

  const keys = Object.keys(paths);
  if (keys.length) setActiveTopic(keys[0]);
}

document.addEventListener("DOMContentLoaded", init);
