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
  A round of your own mistakes carries its deck written out — `?d=KG.BČ.ČA.NS` —
  rather than a rule, because the rule reads one browser's history and would
  deal a different round to whoever opened the link. `/:topic/greske` is a
  doorway that deals one and replaces itself with it.
- **Never average incomparable rounds.** Four choices against the whole map, a
  clock against none, or a deck chosen from your mistakes against one dealt at
  random, are different games; SPEC.md section 5 has the rules. A new kind of
  round means a column on `round`, a field in `clean()`, and a filter in
  `against()` — `timed` was missing all three and dropped out of the
  comparison silently.
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
  geografija 5174, both pinned) or `URL=` a deployment. 136 checks: 125 in
  tablice, 11 in geografija.
- **No single run of tablice executes all 125.** Against a dev server 99 run;
  against a deployment, 94. Thirty-one need the dev server — a stubbed sign-in,
  syncing, the clock, the clipboard, the empty progress page — and twenty-six
  need a deployment, because the preview tags are written into the built HTML,
  the picture is drawn by a function under `api/`, and a shared result is a
  whole page served by one. **Both, before believing a
  release**, and count from the run rather than from the calls to `check()`:
  they sit inside `if (process.env.URL)` either way, which is how the number in
  this file was wrong twice — and this line said "nine" until 27 August, when
  it should always have said twenty-six.
- 99 was counted from two dev runs on 27 August. 94 was not counted: the
  network went down mid-run. It is 99 less the thirty-one that want a dev
  server plus the twenty-six that want a deployment, which is the arithmetic
  that reproduces the previous 85 / 80 / 111 exactly. **Confirm it on the next
  run against a deployment**, and correct it here if it is out.

**Write the check so it fails first.** Several checks in this suite were
passing vacuously until that was verified — one tested a tooltip in a browser
where no tooltip exists, another read a stat page that had never loaded.

**Look at the result.** The suite cannot see that a coat of arms is a smudge or
that a menu is crowded. Screenshot what you changed and check it in both themes.
