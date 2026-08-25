# Working in this repository

Two map quizzes over one shared engine. Read [README.md](README.md) for the
layout and [SPEC.md](SPEC.md) before proposing or building anything: it says
what the plate quiz must do to be finished, what is already built, and what is
deliberately out of scope.

## Before you build

- **SPEC.md section 3 is the backlog**, in dependency order. Each item names what
  it depends on and what it touches. Items are not interchangeable — building
  the leaderboard before the daily challenge produces an empty table.
- **Section 6 is out of scope on purpose.** If a change looks like one of those
  two, say why the reasoning no longer holds rather than building it quietly.
- **Keep SPEC.md current.** Anything shipped moves from section 3 to section 2,
  and any acceptance criterion it satisfies flips in section 1. A record that
  drifts is worse than none.

## House rules the code already follows

- **Datasets fail rather than guess.** Every `scripts/build-*.mjs` re-fetches its
  source and stops with a named list when something does not line up. Never
  paper over a gap with a hand-written fallback; see [DATA.md](DATA.md).
- **A round is its URL.** Topic, length, seed, difficulty, clock and the Kosovo
  set all live in the query string, so a link is the same questions in the same
  order for whoever opens it. Anything that changes a round belongs there too.
- **Never average incomparable rounds.** Four choices against the whole map, or
  a clock against none, are different games; SPEC.md section 4 has the rules.
- **An answer records what was picked**, not merely whether it was right. That is
  the whole basis of the confusion pairs, and of practising your mistakes.
- **Local first.** Progress is kept in the browser whether or not anyone is
  signed in. An account carries it between devices; it never gates play.
- **The design system is in `.claude/skills/kviz-design`.** Load it before
  touching CSS.

## Checking work

- `npm run lint` — oxlint, plus a check that no component stylesheet borrows a
  class name the shared system already owns. That has caused two invisible
  layout bugs.
- `npm run build` — both apps, with `tsc --noEmit` first.
- `node regress.mjs` in either app, against its own dev server (tablice 5173,
  geografija 5174, both pinned) or `URL=` a deployment. 100 checks: 89 in
  tablice, 11 in geografija.
- **No single run of tablice executes all 89.** Against a dev server 80 run;
  against a deployment, 63. Twenty-six need the dev server — a stubbed sign-in,
  syncing, the clock, the clipboard, the empty progress page — and nine need a
  deployment, because the preview tags are written into the built HTML and the
  picture is drawn by a function under `api/`. **Both, before believing a
  release**, and count from the run rather than from the calls to `check()`:
  they sit inside `if (process.env.URL)` either way, which is how the number in
  this file was wrong twice.

**Write the check so it fails first.** Several checks in this suite were
passing vacuously until that was verified — one tested a tooltip in a browser
where no tooltip exists, another read a stat page that had never loaded.

**Look at the result.** The suite cannot see that a coat of arms is a smudge or
that a menu is crowded. Screenshot what you changed and check it in both themes.
