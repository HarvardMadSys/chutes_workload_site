# Working in this repository

This is the Chutes trace site: a static, public site for the Chutes
production trace, drawn from the paper's artifact repository.

Start with `README.md` and `CONTRIBUTING.md`; the rules in
`CONTRIBUTING.md` are binding. The specs are in `openspec/specs/`, and a
change being built is a folder of `openspec/changes/`.

## Verifying a change

As `CONTRIBUTING.md`'s "Verifying a change" says: `make test`, and
`make snapshots` when the change is meant to alter what the page shows.

## Git

One commit per task, `make test` green at every commit. Never push without
being asked. Commit messages end with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, followed by a
`Claude-Session:` line with the session's link when there is one.
