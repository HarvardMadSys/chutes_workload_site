# Change: A simpler Overview, a plain Definition, and a see-also link

## Why

The Overview stacks the year's requests and tokens by the eight most
requested models in three charts, which is finer than a first look wants
and repeats what the Traffic Explorer now answers by family and month.
A figure card's Definition control opens on the definition and two
links, to the figure's plot-ready table in the artifact and to its
README, which name repository paths a reader of the site does not need.
And a blog post has explored the same trace in a browser, which the site
should point to.

## What Changes

- **The Overview is two donuts.** The model mix becomes the family mix:
  each family's share of the year's requests, in the families' colours
  and order of the Traffic Explorer, the models in no family as Other.
  The endpoint mix stays. The three monthly trends, their queries,
  answers and module go.
- **A card's Definition is prose alone.** The control opens on the
  definition and nothing else: no link to the plot-ready table, no link
  to the artifact's README. A definition is a short description of what
  the figure shows; one that names a cut-off used to pick its rows
  or a bin width is shortened to the description.
- **A see-also line.** The Cite section names, after its citation line,
  the blog post "A Year of LLM Traffic, in a Browser Tab", which
  explores the same trace interactively, with a link.

## What it moves

- Three Overview charts, three queries, their three answers (the
  trends), the `top_models` setup table and the monthly cache the site
  no longer reads go; the model colours stay, as the Traffic Explorer
  colours a family's models by them. The page requests three answers fewer.
- The Definition control loses its two links; the snapshot test, which
  read a card's figure name from the plot-ready link, reads it from the
  card's own attribute instead.
- Copy: the family mix's title, caption and definition, the shortened
  definitions, and the see-also line are the user's words; each is
  marked placeholder for the authors.

## Out of scope

- The figures' own readability (the change `readable-figures`).
- Where the site's data comes from (the artifact remains the source).
