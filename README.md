# Registarske oznake — kviz

A quiz for learning Serbian licence-plate codes. You get a plate, you click the
registration area it belongs to. Right answers go green and score; wrong ones go
red and reveal the correct area, along with every other municipality that
registers under the same code.

## Running it

```sh
npm install
npm run dev
```

## The map

The map is divided by **registration area**, not by district or municipality —
81 codes in total, each one merged from the municipalities the law assigns to it:
74 for Serbia proper and 7 that Serbia lists for Kosovo and Metohija (PR, PZ, GL,
KM, PE, UR, ĐA). The Kosovo set can be switched off on the menu, in which case
those areas still appear on the map but are dimmed and inert.

Serbia's list predates Kosovo's current 38-municipality division, so the eight
municipalities created since are assigned the code of the one they were split
from — Junik with Dečani, Gračanica with Priština, Mamuša with Prizren, and so on.

`npm run build:map` regenerates `src/data/regions.json`. It downloads its two
sources on first run and caches them in `scripts/.cache/`:

| what | source |
| --- | --- |
| municipality boundaries (145 + 38 ADM2 units) | [geoBoundaries](https://www.geoboundaries.org/) SRB and XKX ADM2, OSM-derived, ODbL 1.0 |
| code → municipality mapping | [sr.wikipedia](https://sr.wikipedia.org/wiki/Регистарске_ознаке_у_Србији), citing Правилник о регистрацији моторних и прикључних возила, Прилог 1 (5 May 2025) |

The script assigns each of the 145 municipalities to a code, then dissolves the
internal borders with a topojson merge, so each area is a single shape. It fails
loudly if a municipality is left unassigned, if a code ends up with no geometry,
or if the total area drifts from the expected ~88,400 km² (77,500 + 10,900).

Four areas are legitimately non-contiguous, because a neighbouring code splits
them: Mali Iđoš (SU), Ražanj (NI), Bač (NS) and Preševo (VR).

Four further codes appear in the regulation as historical renames — DJ→ĐA,
TU→UE (Titovo Užice), TM→KM (Titova Mitrovica), SV→JA (Svetozarevo). They are
deliberately left out: each names a place that already has a current code, so on
a map quiz two different codes would share one correct answer.

## Design

The palette is taken from the object itself — a plate is white and black with
the blue of the country band and the red of the shield — so the app looks like
its subject rather than like a default dark dashboard. Light, flat and printed:
no gradients, no glassmorphism, no glows, no emoji standing in for UI. The rules
live in `.claude/skills/plate-quiz-design/SKILL.md` so every country added later
stays one product, and `.claude/skills/visual-qa/SKILL.md` covers checking a
change in a real browser before calling it done.

## The plate

The emblem is the real one: a red shield, the cross reaching every edge, and four
**ocila** (firesteels) — each a ribbon with its flat back toward the cross and two
lobes spiralling outward. The ocilo path is generated from a spiral rather than
copied, so no third-party licence rides along with it; the Serbian cross itself is
a centuries-old heraldic device. The Cyrillic code under the shield and the
tricolour on the blue band follow the current plate format.

## Topics

Two so far, picked on the menu:

- **Tablice** — 81 registration codes (74 plus the 7 Serbia lists for Kosovo).
- **Okruzi** — the 24 upravni okruzi plus the City of Belgrade, from
  geoBoundaries SRB ADM1. `npm run build:okruzi` regenerates them. Kosovo's
  districts are a separate administrative division and are not included; the
  territory is drawn as one unplayable shape so the map keeps its outline
  between topics.

- **Reke** — 24 rivers taught in Serbian schools, from OpenStreetMap
  (`waterway=river`) via Overpass, simplified with Douglas–Peucker to ~120 m.
  `npm run build:rivers` regenerates them plus the country outline they are
  drawn over. Answers are **lines**, so each river carries a wide transparent
  hit path under the visible stroke — a 1.5px line is otherwise unclickable.
  Rivers are **not clipped to the border** — the Danube crosses from Hungary out
  to Romania, the Sava arrives from Croatia, the Ibar runs down through Kosovo.
  Cutting them at the border was arbitrary and made the map read wrongly.

  Two things make that work. OSM renames a river when it crosses (Duna,
  Dunărea, Bega, Timiș) and sometimes carries both languages in one tag
  (`Dunav / Дунав`), so names are matched per slash-separated part against an
  alias table. And the Bega reaches Serbia as a canal, so that reach is included
  too — otherwise the river arrives in disconnected pieces.

  Serbia does have two different rivers called Toplica (one joins the Kolubara,
  one the Južna Morava). That single real collision is stated outright in
  `ONLY_WITHIN` rather than guessed at from distances — an earlier heuristic
  that dropped "far" segments silently deleted 204 km of Danube.

### Relief

`npm run build:relief` turns AWS Terrain Tiles (terrarium-encoded SRTM, z9,
~220 m/px) into eight vector elevation bands — 200 m to 2100 m. Every pixel is
measured elevation, so the terrain is exact rather than inferred; the bands are
blurred slightly before contouring and simplified afterwards, and rings under
~60 grid cells are dropped as specks.

Line and point topics draw it under the answers, clipped to the country outline.
It is the reason mountains are shown as summit markers rather than invented
footprints: no authoritative boundary dataset exists for Serbia's massifs
(OSM `natural=mountain_range` covers only minor ridges, and GMBA — which does
have real polygons — has no unit for Zlatibor or Tara), so the terrain is drawn
from measurement and the summits are marked exactly.

Topics declare a `kind` — `area`, `line` or `point` — which decides how answers
are drawn and hit-tested. Line and point topics also supply a `base` collection
(the country outline) that is drawn underneath as context and framed to.

- **Planine** — 24 mountains as points. A mountain is not a single OSM object,
  so each is defined by a rough box and resolved to *the highest `natural=peak`
  inside it*: every coordinate and elevation comes from OSM, and the only
  hand-entered data is an approximate region. `npm run build:planine` fails if
  two mountains resolve to the same summit, or if a summit's name would give its
  mountain away.

- **Banje** — 23 spa towns as points, drawn as droplets so they are not mistaken
  for peaks. `npm run build:banje` takes each spa's coordinates from OSM and
  derives its district by point-in-polygon against `okruzi.json`, so the hint is
  computed rather than typed. Where the district shares a root with the spa
  (Niška Banja sits in the Nišavski okrug) it falls back to the wider
  statistical region, and the build fails if any hint still gives its answer away.

A topic supplies a dataset and how its question reads (`src/topics.tsx`);
the deck, scoring, progress map, gestures and both difficulty modes are shared.
Adding one is data plus a prompt component, not a new map.

## Difficulty

**Klasično** — the whole map is live; you pick from all 81 areas.

**Lako** — only four areas are live per question: the answer plus three decoys,
drawn fresh each time. Everything else greys out and stops responding, so a
mis-tap costs nothing. It keeps the game a map game rather than falling back to
a list of names — the search space shrinks from 81 to 4, but you still have to
know roughly where the place is. Progress colours from earlier questions stay
visible underneath.

## Colour

Answers use two hues — teal for right, orange for wrong — chosen to survive
colour blindness: they separate on the blue–yellow axis, which deuteranopia,
protanopia and tritanopia all preserve, unlike the green/amber they replaced
(worst-case contrast 1.54 vs 1.07 in light, 2.96 vs 1.07 in dark, measured by
simulating each dichromacy). Colour is never the only signal: a missed peak is
ringed and a missed river dashed.

## Input

**Mouse.** Hover a region to see its name and the municipalities under that
code; click to answer. Scroll to zoom, drag to pan, double-click to reset.

**Touch.** One finger drags the map, the way any map app behaves. Selection is a
separate, deliberate act, so a child cannot lose a round to a stray fingertip:

- **Tap a region** to select it. Its name and the municipalities under that code
  appear in a banner at the edge of the map — never under the finger, and it
  flips to the opposite side depending on where you tapped.
- **Confirm** with the button, or by tapping the same region a second time.
- **Tap empty space** to clear the selection.
- **Two fingers** to pinch-zoom. Lifting out of a pinch never selects anything.

The synthetic `click` that browsers fire after a tap is ignored on touch, so a
two-finger pan can't land a stray answer when the fingers come up.

## Extending this

`QuizMap` knows nothing about licence plates. It takes a GeoJSON
FeatureCollection whose features carry `{ code, name, covers }`, a per-code
paint state, and an `onPick` callback — so another map round (districts,
neighbouring countries, rivers) is a new dataset plus a new prompt component
beside `Plate`, not a new map. The state a round needs — deck, results, score —
lives in `App`; that is the piece to lift out when a second quiz type arrives.
