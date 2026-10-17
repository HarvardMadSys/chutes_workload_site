# Design: Grouped Insights

## D1. The model: topic → group → card

A topic is `{ selector, takeaway, groups }`; a group is `{ heading,
takeaway, cards }`. The list of topics moves to
`explore/figure_sections.js`, beside the page's start that places them,
since `js/insights/`, taking `routing_panels.js` (below), would
otherwise hold ten modules, one past the folder limit. `placeTopic`
(`explore/start.js`) writes, after the topic's takeaway, for each group
a heading (`h3.figure-group-title`), its takeaway
(`p.figure-group-takeaway`) and a card grid; a card's title becomes an
`h4` (`renderFigure` takes the heading tag already).
`placeTopic` returns the topic's section and every card of its groups,
and `drawShownTopic` draws that list. The six topic modules keep their
cards and wrap them in groups; the index's six `h2` take the new names.
The routing simulation card's series and eight panels move from
`insights/balancing.js` to `insights/routing_panels.js`, which keeps the
balancing module under 300 lines once its groups are added.
`figure_sections.js` exports `topicCards(topic)` (every card of the
topic in order) so the tests and the snapshot keep one way to list them.

## D2. The words, all placeholder for the authors

Tabs: 01 The workload at a glance · 02 Request shape and latency ·
03 Users and models · 04 A year of change · 05 Prefix caching ·
06 Load balancing.

Topic takeaways (the paper's Findings, plain):
- 01 Demand changes all year, in volume, in which models are active and
  in how the API is called; one request rate would not describe it.
- 02 Requests are prompt-heavy and latency is mostly decode; the three
  highlighted models are slow for different reasons.
- 03 Users and models each have their own rhythm of access and bursts,
  and busy or quiet spells tend to last, which serving decisions can use.
- 04 Over the year the leading models change, outputs get shorter and
  newer users send longer inputs.
- 05 Cache reuse is common but uneven: a request reuses nearly all of
  its prefix or none, and most reuse returns within minutes, so simple
  eviction works.
- 06 Routing for cache locality fights load balancing: spreading a user
  over instances duplicates cache state, keeping them together costs a
  little imbalance.

Groups (heading · takeaway · cards, in the paper's order):
- 01 · Demand over the year · "Requests and tokens rise through 2025
  and fall into 2026, the set of active models swings, and chat
  overtakes completion calls." · request rate, token rate, active
  models, API calls. — The weekly rhythm · "Through all of it traffic
  keeps a weekly and daily cycle, busiest in UTC afternoons." ·
  seasonality.
- 02 · Three model profiles · "DeepSeek R1 (reasoning) writes long
  outputs, MiniMax M2.5 (coding and agents) reads long inputs and answers
  briefly, DeepSeek V3.2 (general chat) sits near the global curve." ·
  input, output, ratio CDFs. — Latency is mostly decode · "End-to-end
  latency spans orders of magnitude, and the time to the first token is
  usually a small share of it." · end-to-end, TTFT share. — What drives
  latency · "Duration grows with output length, time to first token with
  input length, and caching cuts it only for long inputs." · the three
  grids.
- 03 · Same volume, different breadth · "Models and users with similar
  request counts differ by orders of magnitude in how many users or
  models they touch, and in their token shape." · the four density
  cards. — Access patterns · "Some users stick to a few models or return
  on a schedule, others spread out or burst, and popular models see
  both." · the four rasters. — Burstiness is persistent · "Most models
  arrive in bursts, and busy or quiet hours follow each other, so
  colocation and autoscaling can plan on it." · the two burstiness cards.
- 04 · Dominant models turn over · "DeepSeek V3-0324 and R1 lead early,
  Qwen3-32B and DeepSeek V3.2 later, and the long tail of other models
  grows." · the two share cards. — Inputs stay, outputs shrink · "Monthly
  input lengths hold in the thousands of tokens while the median output
  falls below a hundred." · the two interval cards. — Newer users send
  more input · "Users who arrived later in the year have longer inputs
  and more varied token profiles." · the two cohort cards.
- 05 · Reuse is all or nothing · "A request reuses nearly all of its
  prefix or none; DeepSeek's models mostly see none, MiniMax M2.5 a broad
  range, so cacheability follows the use case and the user base." · the
  two CDFs and the two cache profiles. — Reuse comes back fast ·
  "Per-user inter-arrival times run to minutes and shorten over the
  year, and 99% of repeat requests to a model return within 15 minutes,
  so a short TTL keeps most reuse." · IAT over time, IAT across models,
  TTL coverage. — Simple eviction is enough · "FIFO and LRU match or beat
  newer policies; the gap to Belady is what session-aware caching could
  still win, more so on DeepSeek V3.2." · the two eviction cards.
- 06 · Balanced on average, not every hour · "The fleet shrinks with
  token load, imbalance grows as it does, and the busiest instances pay
  in time to first token." · the four hourly cards and the two latency
  grids. — Locality against balance · "Under low load a user stays on
  one instance and keeps their cache; under high load the router spreads
  them and duplicates it." · the two user zooms. — Cache-aware routing ·
  "Larger caches raise hit ratios only when routing keeps a session
  together; the price is a few percent of imbalance." · the routing card.

Card copy stays as it is, except: the IAT-across-models card's caption
names the three profiles (R1 longest, human-paced reasoning; MiniMax
shortest, coding and agents in rapid succession; V3.2 between); the
model token hit ratio card's caption likewise.

## D3. The IAT cards

`fig_iat_monthly_per_user_band`: `y: { label: "Inter-arrival time (s)",
domain: [0, 400] }`, no log; the bands kind clips to the domain
(`IAT_CAP_SECONDS = 400`, its comment: the 90th percentile passes it in
the last months, and a linear axis shows the median's move that a log
axis hid). `fig_per_user_iat_p50_by_model`: linear as it is.

## D4. Tests and snapshots

`figure_words.test.js`: a group heading of at most six words, a group
takeaway of at most two sentences and forty words; the topic takeaways
keep their limit (raised to thirty words, since a Finding needs more
than a lead-in). `insights_figure_sections.test.js`: every card of the
index in exactly one group, groups non-empty, `topicCards` lists them in
order. `snapshot_units.py`: a topic's unit holds its heading, takeaway
and each group's heading and takeaway; the cards as before. The
snapshots rewritten.

## D5. Spec

The Insights requirement states the groups; its table lists each tab's
groups and figures.
