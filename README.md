# Kvizovi

Two map quizzes about Serbia, sharing one engine.

| | what it asks | lives at |
| --- | --- | --- |
| [`apps/tablice`](apps/tablice) | a licence-plate code from Serbia, Croatia, North Macedonia, Montenegro or Slovenia — click the registration area it belongs to | [tablice.vercel.app](https://tablice.vercel.app) |
| [`apps/geografija`](apps/geografija) | a district, river, mountain or spa — click where it is | [geografija-srbija.vercel.app](https://geografija-srbija.vercel.app) |

They are separate apps with separate domains, but not separate codebases:
about 85% of the code is the same in both, and it is shared rather than copied.

[SPEC.md](SPEC.md) says what the plate quiz must do to be finished, what is
already built, and what is deliberately left out. [CLAUDE.md](CLAUDE.md) is the
short version for anyone — or anything — picking the work up.

```
packages/
  kviz/        the engine: map rendering, gestures, scoring, photographs,
               routing, remembered settings, and the design system
  build/       the dataset builders' shared parts: fetch and cache, geometry,
               transliteration, OSM relation assembly, Wikipedia and Commons
apps/
  tablice/     six countries, one of them at the root, so its menu is /
  geografija/  four topics, so it has a chooser
```

An app supplies **topics and a name**; everything else comes from the engine.
A topic is a dataset plus how its question reads (`src/topics.tsx` in each app).
Nothing in `QuizMap` knows what a licence plate is.

## A round is its URL

`/jugoslavija/igra?n=10&s=8fa2&m=lako` is not a link to the quiz, it is a link
to **that round**: ten questions, dealt from seed `8fa2`, played on easy. Open
it tomorrow or send it to someone else and the same questions come up in the
same order, with the same four choices offered.

Rounds are therefore drawn from a seeded shuffle rather than from chance, and
a round arriving without a seed is given one before play starts. Playing again
mints a new seed and navigates — there is no hidden restart.

`useRound` keeps one append-only list of answers, each holding what was picked
and how long it took. The score, the streak, the progress map and the end
screen are all read back out of that list rather than counted up as play goes
on, which is what makes a finished round something that can be summarised,
shared and — once there are accounts — stored.

## Counting who plays

On, for both projects, since 25 August. Each app's `main.tsx` carries two lines:

```ts
import { inject } from '@vercel/analytics'
if (import.meta.env.PROD) inject()
```

**The order matters, and it caught us out once.** The switch is per project —
**Vercel → the project → Analytics → Enable Web Analytics** — there is no CLI
or API for it (`PATCH /v9/projects/{id}` rejects `webAnalytics` outright), and
the route that serves `/_vercel/insights/script.js` is written into a
deployment when it is built. So: flip the switch, *then* deploy. Ship the two
lines against a project where it is off, or against a deployment built before
it was on, and every page load takes a 404 — which the geography suite fails
on, four "no console errors" checks, one per topic.

Page views only — no cookies, no accounts, nothing about a person. It answers
"is anyone playing", which is not the question signing in answers.

Note that `vercel.*.json` deliberately keeps `/_vercel/*` out of the
single-page rewrite. Without that the catch-all hands back `index.html` for the
analytics script, and the browser tries to parse a page of HTML as JavaScript.

## Running them

```sh
npm install                  # once, at the root — npm workspaces
npm run dev:tablice          # http://localhost:5173
npm run dev:geografija       # http://localhost:5174
npm run build                # both
```

Both ports are pinned rather than found: each app's `regress.mjs` looks at its
own by default, and a server that had slid to the next free port would hand the
suite the other quiz to report on.

Datasets are rebuilt per app, from inside that app:

```sh
cd apps/geografija && npm run build:rivers
```

Each app has a `regress.mjs` — a real-browser suite covering clicking,
scoring, wheel zoom, drag-pan, pinch, one-finger pan and tap-to-confirm.
Run it against a dev server, or against production with `URL=`:

```sh
cd apps/tablice && node regress.mjs
cd apps/geografija && URL=https://... node regress.mjs
```

Neither run is the whole suite. Tablice has 111 checks and no single run does
all of them: 85 want a dev server — a stubbed sign-in, syncing, the clock, the
clipboard — and 80 want a deployment, because the preview tags are written into
the built HTML, the pictures come from a function under `api/`, and a shared
result is a whole page served by one. Run both.

## Why one repo

The engine is ~3,000 lines and the app-specific parts are ~400 each — mostly
data, not logic. Copying it into two repos would mean every colour fix, gesture
fix and grammar fix landing twice. This project already has a cautionary tale:
the marker styles were once duplicated inside a single stylesheet, and the stale
copy silently reverted a fix for weeks. Two repos would make that the normal
working mode rather than an accident.

Splitting later is cheap (`git subtree split` keeps history); merging back is not.

## Deploying

Two Vercel projects, one repo. Each has a config at the root that builds its
workspace and points at its `dist`, so the whole workspace is uploaded and the
shared engine resolves:

```sh
VERCEL_PROJECT_ID=<tablice>    npx vercel deploy --prod --local-config vercel.tablice.json
VERCEL_PROJECT_ID=<geografija> npx vercel deploy --prod --local-config vercel.geografija.json
```

The projects are `tablice` and `geografija-srbija`. The plate app's old URL,
`igrica-registracije.vercel.app`, 308-redirects to the new one, so links shared
before the rename still work.

Deploying from inside an app directory does not work — npm cannot resolve
`@kviz/engine` when only that directory is uploaded.

## Data and licences

Every dataset is generated by a build script from a named source, and no
geometry is hand-drawn — see [DATA.md](DATA.md). Photographs come from
Wikimedia Commons and are credited per image in the app.

Code is MIT ([LICENSE](LICENSE)). The data and photographs are not: they carry
their own terms.
