# Change: The Chutes trace site

## Why

The one-year Chutes production trace (6.12 billion requests, 9,174 models)
is public on Hugging Face with its artifact repository and paper, but it has
no page that shows what it holds. The FreeInference agentic trace has one
(agent-traces.freeinference.org), and readers of the second paper should get
the same thing in the same place: a landing page with the trace's totals,
its mixes and trends, a table to browse it, the paper's figures by topic,
and the citation.

## What

A new repository, `chutes_trace_site`, with the layout, look, rules and
tooling of the FreeInference agentic trace site, filled with the Chutes
trace:

- **One page**, in the agentic site's order: a hero with the stats strip,
  the Overview (two donuts, three monthly trends), a **Traffic
  Explorer** (where the agentic site's Session Explorer stands: requests
  per day for a chosen model, endpoint and period, with four numbers
  that follow the choice), the **Insights** (the paper's 48 figures as the
  paper drew them, in six topic tabs following the paper's sections), Cite
  and Team.
- **The paper's figures are the paper's images.** Each card shows a PNG
  rendered from the artifact's committed PDF, with a title, an insight, a
  caption and a definition as the agentic site's cards have, and nothing
  interactive: no tooltips, no legend toggles, no redrawing.
- **The data step reads the artifact, never the trace.** `make data`
  reads the artifact repository's committed query caches (small Parquet
  files, 12 MB in all) and its figure PDFs, and writes small JSON answers
  for the stats, the Overview and the explorer, and the figures' images.
  Nothing larger than a few megabytes ships.
- Deployed as a Cloudflare Worker's static assets by a push to `main`,
  like the agentic site, under a hostname of the lab's choosing.

## What it moves

- Of the 1.9 GB of query caches the artifact keeps locally, the site uses
  eleven small ones (about 3 MB) and the PDFs (2.6 MB). The 706 MB
  per-pair inter-arrival table, the 420 MB per-request latency table and
  the rest are the paper's reproducibility caches and stay where they are.
- The stats strip needs the trace's totals (requests, users, models,
  instances, input and output tokens, the span), and the Traffic Explorer
  a daily rollup (day × model × endpoint group). No cache holds either,
  so the artifact gains two query caches, `trace_totals` and
  `daily_rollup`, computed once from the trace and committed there (see
  design.md D4 and D5). Until they exist, the site cannot build.
- A Session Explorer has no analog: the release holds request metadata
  with no session identifiers, and the artifact reconstructs sessions for
  two models only. The Traffic Explorer takes its place.

## Pushback and open points

1. **Static images cost what interactivity gave.** No dark scheme for the
   figures (the image sits on a white panel in both schemes), no tooltips,
   no legend toggles, no screen-reader access to the plotted values (the
   image's alternative text is its title and insight), and the agentic
   site's 14 px minimum type size cannot apply inside an image: the
   paper's 7 pt labels render at about 11 pt at a card's width on a
   desktop and smaller on a phone, where the visitor zooms. Every card
   links its full-size image. This is the requested trade; it is stated
   here so it is a decision and not a surprise.
2. **The Traffic Explorer is deliberately small.** It takes from the
   "A Year of LLM Traffic, in a Browser Tab" dashboard the one thing the
   paper's figures cannot do, choosing a model, an endpoint and a period
   and seeing the traffic, and leaves the rest (a database in the
   browser, live reads of the trace, brushing, animation, anomalies,
   export, model families derived from names).
3. **The copy is seeded from the paper and is yours to edit.** Each
   card's insight is the paper's italic lead-in for that figure
   ("Requests are often prompt-heavy."), its caption the paper's figure
   caption for that panel, its definition the artifact README's "What it
   shows" line, and each topic's takeaway the paper's finding box. The
   word-count tests keep the agentic site's limits.
4. **The brand name is a placeholder.** The page says "Chutes Production
   Trace" with "Production Trace" in the accent, after the Hugging Face
   card's "A Year in LLM Serving — Chutes Production Trace". The hostname
   is undecided; the Worker answers at `workers.dev` until it is set.
5. **One artifact change.** The `trace_totals` and `daily_rollup`
   caches (D4, D5) are two queries added to the artifact's
   `01_workload_overview/reproduce.py` in its own caching pattern and
   committed under `data/paper/cache/`; they need the trace once, which
   this machine has.

## Not in this change

- No table of models, no per-model page, no per-session view.
- No redrawn figures: a figure that should become interactive later is
  its own change, one figure at a time, with its own small answer.
- The Open Data page's "Explore the trace" link to this site is added
  there once the site is live, as it was for the agentic site.
