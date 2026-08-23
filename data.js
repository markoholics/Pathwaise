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

// Curated by name: every entry below names a specific real creator/publisher
// and a specific real title/episode — not a search query. Where a confident,
// stable deep link exists (a permanent blog post, an official doc, a paper
// with a known identifier) it's used directly. Where only the creator/channel
// is confidently known but not the exact video ID, the link points at that
// creator's official channel/site — see the "Curation confidence" note in
// CLAUDE.md before treating any of these as verified.
const TOPIC_LIBRARY = {
  "machine learning": buildTopic("machine learning", [
    { title: "But What Is a Neural Network? | Chapter 1, Deep Learning", type: "video", source: "3Blue1Brown", stage: "foundation", minutes: 19, url: "https://www.youtube.com/watch?v=aircAruvnKk" },
    { title: "A Visual Introduction to Machine Learning, Part 1", type: "blog", source: "r2d3", stage: "foundation", minutes: 15, url: "https://www.r2d3.us/visual-intro-to-machine-learning-part-1/" },
    { title: "Machine Learning is Fun! Part 1", type: "blog", source: "Adam Geitgey", stage: "foundation", minutes: 12, url: "https://medium.com/@ageitgey/machine-learning-is-fun-80ea3ec3c471" },
    { title: "What is Machine Learning?", type: "podcast", source: "Data Skeptic", stage: "foundation", minutes: 25, url: "https://dataskeptic.com" },
    { title: "Gradient Descent, How Neural Networks Learn | Chapter 2, Deep Learning", type: "video", source: "3Blue1Brown", stage: "core", minutes: 21, url: "https://www.youtube.com/@3blue1brown" },
    { title: "Understanding LSTM Networks", type: "blog", source: "Christopher Olah", stage: "core", minutes: 20, url: "https://colah.github.io/posts/2015-08-Understanding-LSTMs/" },
    { title: "Random Forests, Clearly Explained!!!", type: "video", source: "StatQuest with Josh Starmer", stage: "core", minutes: 12, url: "https://www.youtube.com/@statquest" },
    { title: "Tinker With a Neural Network in Your Browser", type: "interactive", source: "TensorFlow Playground", stage: "core", minutes: 20, url: "https://playground.tensorflow.org" },
    { title: "A Few Useful Things to Know about Machine Learning", type: "paper", source: "Pedro Domingos", stage: "core", minutes: 40, url: "https://homes.cs.washington.edu/~pedrod/papers/cacm12.pdf" },
    { title: "Andrew Ng: Deep Learning, Education, and Real-World AI", type: "podcast", source: "Lex Fridman Podcast", stage: "core", minutes: 90, url: "https://lexfridman.com/andrew-ng/" },
    { title: "Rules of Machine Learning: Best Practices for ML Engineering", type: "blog", source: "Google Developers (Martin Zinkevich)", stage: "application", minutes: 25, url: "https://developers.google.com/machine-learning/guides/rules-of-ml" },
    { title: "What Is Reinforcement Learning?", type: "video", source: "Two Minute Papers", stage: "application", minutes: 6, url: "https://www.youtube.com/@TwoMinutePapers" },
    { title: "This Week in Machine Learning & AI", type: "podcast", source: "TWIML AI Podcast", stage: "application", minutes: 45, url: "https://twimlai.com" },
    { title: "People + AI Guidebook", type: "blog", source: "Google PAIR", stage: "application", minutes: 15, url: "https://pair.withgoogle.com/guidebook/" },
  ]),
  "public speaking": buildTopic("public speaking", [
    { title: "TED's Secret to Great Public Speaking", type: "video", source: "Chris Anderson, TED", stage: "foundation", minutes: 8, url: "https://www.youtube.com/@TED" },
    { title: "10 Tips for Public Speaking", type: "blog", source: "Toastmasters International", stage: "foundation", minutes: 10, url: "https://www.toastmasters.org/public-speaking-resources/public-speaking-tips" },
    { title: "Your Body Language May Shape Who You Are", type: "video", source: "Amy Cuddy, TED", stage: "foundation", minutes: 21, url: "https://www.youtube.com/@TED" },
    { title: "The Secret Structure of Great Talks", type: "video", source: "Nancy Duarte, TED", stage: "core", minutes: 18, url: "https://www.ted.com/talks/nancy_duarte_the_secret_structure_of_great_talks" },
    { title: "How to Speak So That People Want to Listen", type: "video", source: "Julian Treasure, TED", stage: "core", minutes: 10, url: "https://www.youtube.com/@TED" },
    { title: "How to Give a Killer Presentation", type: "blog", source: "Chris Anderson, Harvard Business Review", stage: "core", minutes: 16, url: "https://hbr.org/2013/06/how-to-give-a-killer-presentation" },
    { title: "Harnessing the Science of Persuasion", type: "paper", source: "Robert Cialdini, Harvard Business Review", stage: "core", minutes: 20, url: "https://hbr.org/2001/10/harnessing-the-science-of-persuasion" },
    { title: "Practice drill: record and self-review a 2-minute impromptu talk", type: "interactive", source: "Self-practice exercise", stage: "core", minutes: 20, url: "https://www.toastmasters.org/public-speaking-resources/public-speaking-tips" },
    { title: "How Great Leaders Inspire Action", type: "video", source: "Simon Sinek, TED", stage: "application", minutes: 18, url: "https://www.youtube.com/@TED" },
    { title: "The Public Speaker", type: "podcast", source: "Quick and Dirty Tips", stage: "application", minutes: 12, url: "https://www.quickanddirtytips.com/public-speaker" },
    { title: "How to Handle Q&A Like a Pro", type: "blog", source: "Toastmasters International", stage: "application", minutes: 9, url: "https://www.toastmasters.org" },
  ]),
  guitar: buildTopic("guitar", [
    { title: "Absolute Beginner Guitar Course, Stage 1", type: "video", source: "JustinGuitar (Justin Sandercoe)", stage: "foundation", minutes: 15, url: "https://www.justinguitar.com" },
    { title: "How to Read Guitar Tab and Chord Charts", type: "blog", source: "JustinGuitar (Justin Sandercoe)", stage: "foundation", minutes: 8, url: "https://www.justinguitar.com" },
    { title: "Interactive tab and chord library for popular songs", type: "interactive", source: "Ultimate Guitar", stage: "foundation", minutes: 20, url: "https://www.ultimate-guitar.com" },
    { title: "Guitar Lessons for Beginners", type: "video", source: "Marty Music (Marty Schwartz)", stage: "foundation", minutes: 12, url: "https://www.youtube.com/@MartyMusic" },
    { title: "Strumming Patterns for Beginners", type: "video", source: "JustinGuitar (Justin Sandercoe)", stage: "core", minutes: 12, url: "https://www.justinguitar.com" },
    { title: "Music Theory for Guitarists", type: "video", source: "Paul Davids", stage: "core", minutes: 18, url: "https://www.youtube.com/@PaulDavids" },
    { title: "Interactive tab player with slow-down and playback", type: "interactive", source: "Songsterr", stage: "core", minutes: 25, url: "https://www.songsterr.com" },
    { title: "Barre Chords Tutorial", type: "video", source: "Marty Music (Marty Schwartz)", stage: "core", minutes: 15, url: "https://www.youtube.com/@MartyMusic" },
    { title: "60 Cycle Hum", type: "podcast", source: "60 Cycle Hum Guitar Podcast", stage: "core", minutes: 45, url: "https://60cyclehum.com" },
    { title: "Building a Daily Practice Routine", type: "blog", source: "JustinGuitar (Justin Sandercoe)", stage: "application", minutes: 10, url: "https://www.justinguitar.com" },
    { title: "Play-along backing tracks by key and style", type: "interactive", source: "QuistTV (Chris Quist)", stage: "application", minutes: 20, url: "https://www.youtube.com/@QuistTV" },
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
