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

### Notes on resource links

Demo resources link to stable public search pages (YouTube/Scholar/podcast/web search) rather
than a single guessed URL, since this app has no live web-search integration. A production
curation pipeline would replace `TOPIC_LIBRARY` with real, verified links per topic.
