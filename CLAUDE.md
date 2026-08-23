## Pathwaise

A static, dependency-free app that curates a personalized, sequenced learning plan for any
topic — drawing on freely available public resources (videos, podcasts, papers, articles). No
build step, no backend.

- `data.js` — resource types, learning-style definitions, the free-plan cap (15 resources), and
  `TOPIC_LIBRARY` (sample curated paths for a few demo topics, plus a generic template for any
  other topic). This stands in for a real curation pipeline that would search the live web.
- `app.js` — sequencing engine (orders resources foundation → core → application, weighted by
  the learner's style profile) and adaptive reordering (feedback on a resource nudges style
  weights and re-sequences what's left). Also handles rendering and localStorage persistence.
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
