// Pathwaise data model
//
// This file is the source of truth for:
//   - RESOURCE_TYPES: the kinds of material a plan can be built from
//   - LEARNING_STYLES: the self-reported + inferred learning-style profile
//   - TOPIC_LIBRARY: sample curated learning paths for a handful of demo topics
//
// In production, TOPIC_LIBRARY would be populated by a curation pipeline that
// searches the public web (YouTube, podcast feeds, arXiv/research repositories,
// blogs) for a requested topic and scores candidates for quality, recency, and
// fit with the learner's stage. This static file stands in for that pipeline
// with a few hand-picked example paths so the sequencing/adaptation engine in
// app.js has real data to work with. Resource links point at stable public
// search pages (YouTube/Scholar/podcast search) rather than a single guessed
// URL, so every link resolves to something genuinely useful.

const RESOURCE_TYPES = {
  video: { label: "Video", icon: "▶", styleFit: ["visual", "auditory"] },
  podcast: { label: "Podcast", icon: "♪", styleFit: ["auditory"] },
  paper: { label: "Paper", icon: "⌒", styleFit: ["reading"] },
  blog: { label: "Article", icon: "≡", styleFit: ["reading"] },
  interactive: { label: "Interactive", icon: "⌘", styleFit: ["kinesthetic"] },
};

const LEARNING_STYLES = [
  {
    id: "visual",
    label: "Visual",
    description: "Learns best from diagrams, demos, and video walkthroughs.",
  },
  {
    id: "auditory",
    label: "Auditory",
    description: "Learns best by listening — talks, podcasts, narrated explanations.",
  },
  {
    id: "reading",
    label: "Reading / Writing",
    description: "Learns best from text — articles, papers, documentation, notes.",
  },
  {
    id: "kinesthetic",
    label: "Hands-on",
    description: "Learns best by doing — exercises, sandboxes, building things.",
  },
];

// Free tier cap: matches Pathwaise's free-plan resource limit.
const FREE_PLAN_RESOURCE_CAP = 15;

const STAGES = ["foundation", "core", "application"];

function ytSearch(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
function podcastSearch(q) {
  return `https://podcasts.google.com/search/${encodeURIComponent(q)}`;
}
function scholarSearch(q) {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`;
}
function webSearch(q) {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

// Each resource: { title, type, source, stage, minutes, url }
function buildTopic(name, seeds) {
  return {
    name,
    resources: seeds.map((s, i) => ({
      id: `${name}-${i}`,
      title: s.title,
      type: s.type,
      source: s.source,
      stage: s.stage,
      minutes: s.minutes,
      url: s.url,
    })),
  };
}

const TOPIC_LIBRARY = {
  "machine learning": buildTopic("machine learning", [
    { title: "What Is Machine Learning? (beginner overview)", type: "video", source: "YouTube", stage: "foundation", minutes: 12, url: ytSearch("machine learning explained beginner") },
    { title: "Linear Algebra intuition for ML", type: "blog", source: "Article", stage: "foundation", minutes: 15, url: webSearch("linear algebra intuition for machine learning") },
    { title: "The Data Skeptic podcast — ML fundamentals episode", type: "podcast", source: "Podcast", stage: "foundation", minutes: 30, url: podcastSearch("data skeptic machine learning fundamentals") },
    { title: "Supervised vs. unsupervised learning", type: "blog", source: "Article", stage: "foundation", minutes: 10, url: webSearch("supervised vs unsupervised learning explained") },
    { title: "Andrew Ng-style intro lecture on gradient descent", type: "video", source: "YouTube", stage: "core", minutes: 20, url: ytSearch("gradient descent intro lecture") },
    { title: "Train a model hands-on (interactive notebook)", type: "interactive", source: "Sandbox", stage: "core", minutes: 25, url: webSearch("interactive machine learning notebook tutorial beginner") },
    { title: "Decision trees and random forests explained", type: "video", source: "YouTube", stage: "core", minutes: 18, url: ytSearch("decision trees random forests explained") },
    { title: "A Few Useful Things to Know About Machine Learning (paper)", type: "paper", source: "Research", stage: "core", minutes: 40, url: scholarSearch("a few useful things to know about machine learning") },
    { title: "Neural networks from scratch", type: "video", source: "YouTube", stage: "core", minutes: 35, url: ytSearch("neural networks from scratch tutorial") },
    { title: "Overfitting and regularization", type: "blog", source: "Article", stage: "core", minutes: 12, url: webSearch("overfitting and regularization explained") },
    { title: "Talking Machines podcast — real-world ML deployment", type: "podcast", source: "Podcast", stage: "application", minutes: 40, url: podcastSearch("talking machines real world ML deployment") },
    { title: "Build and deploy a small ML project (guided walkthrough)", type: "interactive", source: "Sandbox", stage: "application", minutes: 45, url: webSearch("build and deploy a small machine learning project tutorial") },
    { title: "Case study: ML in production at scale", type: "blog", source: "Article", stage: "application", minutes: 15, url: webSearch("machine learning in production case study") },
    { title: "Ethics and bias in ML systems", type: "video", source: "YouTube", stage: "application", minutes: 20, url: ytSearch("ethics and bias in machine learning systems") },
    { title: "Where to go next: specializing in ML", type: "blog", source: "Article", stage: "application", minutes: 8, url: webSearch("how to specialize in machine learning next steps") },
  ]),
  "public speaking": buildTopic("public speaking", [
    { title: "Why most people fear public speaking (and how to start)", type: "video", source: "YouTube", stage: "foundation", minutes: 10, url: ytSearch("overcome fear of public speaking beginner") },
    { title: "The anatomy of a great talk", type: "blog", source: "Article", stage: "foundation", minutes: 12, url: webSearch("anatomy of a great talk structure") },
    { title: "Toastmasters-style basics podcast", type: "podcast", source: "Podcast", stage: "foundation", minutes: 25, url: podcastSearch("public speaking basics podcast toastmasters") },
    { title: "Body language and stage presence", type: "video", source: "YouTube", stage: "core", minutes: 15, url: ytSearch("body language stage presence public speaking") },
    { title: "Structuring a persuasive talk", type: "blog", source: "Article", stage: "core", minutes: 14, url: webSearch("how to structure a persuasive talk") },
    { title: "Practice drill: record and review a 2-minute talk", type: "interactive", source: "Exercise", stage: "core", minutes: 20, url: webSearch("public speaking practice drill record review") },
    { title: "Handling Q&A and hostile questions", type: "video", source: "YouTube", stage: "core", minutes: 18, url: ytSearch("handling Q and A hostile questions public speaking") },
    { title: "The psychology of persuasive speech (research overview)", type: "paper", source: "Research", stage: "core", minutes: 30, url: scholarSearch("psychology of persuasive public speaking") },
    { title: "Storytelling techniques for speakers", type: "blog", source: "Article", stage: "application", minutes: 12, url: webSearch("storytelling techniques for public speakers") },
    { title: "Deliver a 5-minute talk to a live or recorded audience", type: "interactive", source: "Exercise", stage: "application", minutes: 30, url: webSearch("deliver a short talk practice exercise") },
    { title: "Speaker coaching podcast — advanced delivery", type: "podcast", source: "Podcast", stage: "application", minutes: 35, url: podcastSearch("advanced public speaking delivery coaching") },
    { title: "Case studies: iconic speeches broken down", type: "video", source: "YouTube", stage: "application", minutes: 22, url: ytSearch("iconic speeches breakdown analysis") },
  ]),
  guitar: buildTopic("guitar", [
    { title: "Guitar for absolute beginners — first lesson", type: "video", source: "YouTube", stage: "foundation", minutes: 15, url: ytSearch("guitar for absolute beginners first lesson") },
    { title: "How to read guitar tabs and chord charts", type: "blog", source: "Article", stage: "foundation", minutes: 8, url: webSearch("how to read guitar tabs and chord charts") },
    { title: "Basic open chords practice drill", type: "interactive", source: "Exercise", stage: "foundation", minutes: 20, url: webSearch("basic open chords practice drill guitar") },
    { title: "Strumming patterns for beginners", type: "video", source: "YouTube", stage: "core", minutes: 12, url: ytSearch("strumming patterns for beginners guitar") },
    { title: "Music theory basics for guitarists podcast", type: "podcast", source: "Podcast", stage: "core", minutes: 28, url: podcastSearch("music theory basics for guitarists") },
    { title: "Learn your first full song (guided)", type: "interactive", source: "Exercise", stage: "core", minutes: 30, url: webSearch("learn your first full song guitar guided lesson") },
    { title: "Barre chords: the breakthrough skill", type: "video", source: "YouTube", stage: "core", minutes: 18, url: ytSearch("barre chords tutorial breakthrough") },
    { title: "Building a daily practice routine", type: "blog", source: "Article", stage: "application", minutes: 10, url: webSearch("daily guitar practice routine for beginners") },
    { title: "Playing along with a backing track", type: "interactive", source: "Exercise", stage: "application", minutes: 25, url: webSearch("guitar backing track play along beginner") },
    { title: "Interview with a working musician on practice habits", type: "podcast", source: "Podcast", stage: "application", minutes: 40, url: podcastSearch("musician interview practice habits") },
  ]),
};

// Generic template used when the requested topic isn't in TOPIC_LIBRARY.
// Produces a stage-balanced set of search-based resources so the sequencing
// and style-adaptation logic still has something concrete to work with.
function buildGenericTopic(name) {
  const n = name.trim();
  const seeds = [
    { title: `${n}: beginner overview`, type: "video", stage: "foundation", minutes: 12, source: "YouTube", url: ytSearch(`${n} for beginners explained`) },
    { title: `${n}: key terms and definitions`, type: "blog", stage: "foundation", minutes: 10, source: "Article", url: webSearch(`${n} glossary key terms`) },
    { title: `${n} basics podcast`, type: "podcast", stage: "foundation", minutes: 25, source: "Podcast", url: podcastSearch(`${n} basics introduction`) },
    { title: `${n}: foundational concepts, part 2`, type: "video", stage: "foundation", minutes: 15, source: "YouTube", url: ytSearch(`${n} foundational concepts`) },
    { title: `Getting started with ${n} (interactive)`, type: "interactive", stage: "foundation", minutes: 20, source: "Exercise", url: webSearch(`${n} beginner exercise interactive tutorial`) },
    { title: `${n}: intermediate deep dive`, type: "video", source: "YouTube", stage: "core", minutes: 25, url: ytSearch(`${n} intermediate deep dive`) },
    { title: `Common mistakes when learning ${n}`, type: "blog", source: "Article", stage: "core", minutes: 12, url: webSearch(`common mistakes learning ${n}`) },
    { title: `${n}: research and academic overview`, type: "paper", source: "Research", stage: "core", minutes: 35, url: scholarSearch(`${n} overview`) },
    { title: `Practice exercises for ${n}`, type: "interactive", source: "Exercise", stage: "core", minutes: 25, url: webSearch(`${n} practice exercises`) },
    { title: `${n} discussion podcast — going deeper`, type: "podcast", source: "Podcast", stage: "core", minutes: 35, url: podcastSearch(`${n} deep dive discussion`) },
    { title: `${n}: expert techniques`, type: "video", source: "YouTube", stage: "core", minutes: 20, url: ytSearch(`${n} expert techniques`) },
    { title: `Real-world applications of ${n}`, type: "blog", source: "Article", stage: "application", minutes: 15, url: webSearch(`real world applications of ${n}`) },
    { title: `Build a small project using ${n}`, type: "interactive", source: "Exercise", stage: "application", minutes: 40, url: webSearch(`beginner project using ${n}`) },
    { title: `Case studies in ${n}`, type: "video", source: "YouTube", stage: "application", minutes: 22, url: ytSearch(`${n} case studies`) },
    { title: `Where to go next after learning ${n}`, type: "blog", source: "Article", stage: "application", minutes: 8, url: webSearch(`what to learn after ${n} next steps`) },
  ];
  return buildTopic(n, seeds.map((s, i) => ({ ...s, id: `${n}-generic-${i}` })));
}

function getTopic(rawName) {
  const key = rawName.trim().toLowerCase();
  if (TOPIC_LIBRARY[key]) return TOPIC_LIBRARY[key];
  return buildGenericTopic(rawName);
}
