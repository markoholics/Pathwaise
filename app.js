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

// --- Onboarding quiz ---------------------------------------------------------

const QUIZ_QUESTIONS = [
  {
    prompt: "When learning something new, you'd rather...",
    options: [
      { label: "Watch someone demonstrate it", style: "visual" },
      { label: "Listen to someone explain it", style: "auditory" },
      { label: "Read about it in detail", style: "reading" },
      { label: "Just try it yourself", style: "kinesthetic" },
    ],
  },
  {
    prompt: "You remember things best when you...",
    options: [
      { label: "Saw a diagram or chart", style: "visual" },
      { label: "Heard it discussed out loud", style: "auditory" },
      { label: "Wrote it down or took notes", style: "reading" },
      { label: "Practiced it hands-on", style: "kinesthetic" },
    ],
  },
  {
    prompt: "Your ideal way to fill a commute is...",
    options: [
      { label: "A video essay (audio-only in the background)", style: "auditory" },
      { label: "A podcast or audiobook", style: "auditory" },
      { label: "An article saved for later", style: "reading" },
      { label: "Not learning then — you'd rather be doing something", style: "kinesthetic" },
    ],
  },
];

function renderQuiz() {
  const container = el("#quiz");
  container.innerHTML = QUIZ_QUESTIONS.map(
    (q, qi) => `
    <div class="quiz-q">
      <p>${q.prompt}</p>
      <div class="quiz-options">
        ${q.options
          .map(
            (o, oi) =>
              `<button class="quiz-opt" data-q="${qi}" data-style="${o.style}">${o.label}</button>`
          )
          .join("")}
      </div>
    </div>`
  ).join("");

  els(".quiz-opt").forEach((btn) =>
    btn.addEventListener("click", () => {
      styleWeights[btn.dataset.style] = (styleWeights[btn.dataset.style] ?? 1) + 1;
      btn.closest(".quiz-q").querySelectorAll(".quiz-opt").forEach((b) => b.classList.remove("picked"));
      btn.classList.add("picked");
      saveStyleWeights();
      renderStyleProfile();
      maybeFinishOnboarding();
    })
  );
}

function maybeFinishOnboarding() {
  const answered = els(".quiz-q").every((q) => q.querySelector(".quiz-opt.picked"));
  if (answered) {
    localStorage.setItem(STORE_KEYS.onboarded, "1");
    el("#onboarding").classList.add("collapsed");
  }
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
    el("#onboarding").classList.toggle("collapsed");
  });

  const keys = Object.keys(paths);
  if (keys.length) setActiveTopic(keys[0]);
}

document.addEventListener("DOMContentLoaded", init);
