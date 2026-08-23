## Pathwaise

A static, dependency-free app that curates a personalized, sequenced learning plan for any
topic — drawing on freely available public resources (videos, podcasts, papers, articles). No
build step, no backend.

- `data.js` — resource types, learning-style definitions, the free-plan cap (15 resources), and
  `TOPIC_LIBRARY` (sample curated paths for a few demo topics, plus a generic template for any
  other topic). This stands in for a real curation pipeline that would search the live web.
- `app.js` — sequencing engine (orders resources foundation → core → application, weighted by
  the learner's style profile), the onboarding cognitive-task battery that sets the initial style
  profile, and adaptive reordering (feedback on a resource nudges style weights and re-sequences
  what's left). Also handles rendering and localStorage persistence.
- `index.html` / `styles.css` — layout and theme (light/dark aware).

To view the app, open `index.html` directly in a browser, or serve the directory with any static
file server (e.g. `python3 -m http.server`).

All progress, style-profile weights, and generated paths persist in the browser's `localStorage`,
not in `data.js`.

### Curation confidence (read before trusting these links)

The three demo topics in `TOPIC_LIBRARY` (machine learning, public speaking, guitar) are
hand-curated by name — every entry names a real, specific creator/publisher and a real, specific
title/episode, not a search query. But this was written without live web access, so nothing here
has been click-verified:

- Entries with a permanent article/paper/doc URL (e.g. colah.github.io, an HBR article, an arXiv
  or academic paper page, an official Google Developers doc) are high-confidence — these kinds of
  URLs are usually stable for years.
- Entries linking to a creator's official channel/site root (e.g. youtube.com/@3blue1brown,
  justinguitar.com) rather than a specific video/episode URL are cases where the *title and
  creator* are confidently real but the exact deep-link (a YouTube video ID, a specific episode
  slug) was deliberately not guessed — fabricating a plausible-looking ID is a classic LLM
  hallucination trap, and a wrong guess is worse than no deep link. Search the named title on
  that channel/site; it should be the top or a very findable result.

**Before shipping this content to real users, spot-check each link once.** A production version
would replace `TOPIC_LIBRARY` with a curation pipeline that has live web/search access and can
verify every URL before serving it — this static file is a stand-in for that.

`buildGenericTopic()` (used for any topic not in `TOPIC_LIBRARY`) still falls back to
YouTube/Scholar/podcast/web search-query links, since arbitrary user-typed topics have no
hand-curated entry to draw on.

### Onboarding: implicit cognitive tasks, not a preference survey

`app.js`'s onboarding step (`COGNITIVE_TASKS` and friends) deliberately never asks the learner
"how do you like to learn?" — it runs four short performance tasks, one per modality, and infers
an initial style profile from how they actually do:

1. **Visual** — memorize a highlighted 3×3 grid pattern, then pick it out of lookalikes. Scored
   on accuracy + response speed.
2. **Auditory** — a short sequence is spoken aloud via the browser's `speechSynthesis` API (no
   transcript shown up front); a recall question follows. A learner who clicks "I'd rather read
   it" instead of listening is itself a signal — that lowers the auditory score and raises the
   reading score, on top of the direct accuracy/speed scoring.
3. **Reading/writing** — a short passage with an embedded detail, self-paced, followed by a
   recall question. Scored on accuracy + how efficiently (not just how fast) they processed it.
4. **Hands-on** — a number-guessing trial-and-error game (1–100, "higher/lower" feedback). Scored
   on how few attempts it took to converge; opening the optional strategy hint *before* the first
   guess is treated as a reading-leaning move and docked from the kinesthetic score.

Each task returns a raw score; `finishQuiz()` min-max normalizes the four raw scores into
`styleWeights` (same 0.2–4 range `applyFeedback()` already uses). If the browser doesn't support
`speechSynthesis`, the auditory task falls back to the transcript automatically and is excluded
from scoring entirely (weight stays neutral at 1) rather than penalizing the learner for a
missing browser feature.

This is a lightweight heuristic proxy for learning style, not a validated psychometric
instrument — say so if a user asks how rigorous it is. Its real value is as a plausible starting
point; `applyFeedback()`'s ongoing adjustment from actual resource feedback is what does the real
work of learning the individual's methodology over time, per the product's original spec.
