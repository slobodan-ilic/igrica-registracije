# Tablice — kviz

A quiz for learning licence-plate codes. You get a plate, you click the
registration area it belongs to. Right answers go green and score; wrong ones go
red, reveal the correct area and show a photograph of it.

Five countries and the one they all used to be, each its own topic with its own map and its own plate:

| | | at |
| --- | --- | --- |
| **Srbija** | 81 codes | `/` — the front page |
| **Hrvatska** | 34 codes | `/hrvatska` |
| **Makedonija** | 34 codes | `/makedonija` |
| **Crna Gora** | 25 codes | `/crnagora` |
| **Slovenija** | 11 codes | `/slovenija` |
| **Jugoslavija** | 125 codes | `/jugoslavija` — the SFRJ, mid-1980s |

The interface is Serbian throughout, whichever country you are playing. Serbia
sits at the root because it is the flagship; every other country gets its own
path, and the menu carries a switcher between them.

Part of the [kvizovi](../..) workspace: the map, scoring, gestures and design
come from `@kviz/engine`. This app supplies the plates, the areas and the wording.

```
src/
  Plate.tsx      the shell every plate is built from — band, code, emblem,
                 serial — plus the EU stars two of them share
  PlateRS/HR/    one file per country: its emblem, and which pieces it passes
  MK/ME/SI.tsx   to the shell
  Plate.css      the shell's styles, then what each country changes
  topics.tsx     one `country({...})` per quiz; everything the five say the
                 same way is written once
scripts/
  build-map*.mjs one per country. They differ entirely in how they work out
                 which municipalities a code covers, and not at all after
                 that — the merge, thinning, area check and write are
                 @kviz/build/areas
```

```sh
npm run dev -w @kviz/tablice
npm run build:map      # data/srbija.json
npm run build:map-hr   # data/hrvatska.json
npm run build:map-mk   # data/makedonija.json
npm run build:map-me   # data/crnagora.json
npm run build:map-si   # data/slovenija.json
npm run build:map-yu   # data/jugoslavija.json
npm run build:grbovi-si # the Slovenian coats of arms
npm run build:slike    # the photographs
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

`npm run build:map` regenerates `data/regions.json`. It downloads its two
sources on first run and caches them in the workspace's `.cache/`:

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

## The plate

The emblem is the real one: a red shield, the cross reaching every edge, and four
**ocila** (firesteels) — each a ribbon with its flat back toward the cross and two
lobes spiralling outward. The ocilo path is generated from a spiral rather than
copied, so no third-party licence rides along with it; the Serbian cross itself is
a centuries-old heraldic device. The Cyrillic code under the shield and the
tricolour on the blue band follow the current plate format.


## Photographs

Each area shows a photograph of its town once you have answered — under the
reveal when you miss, and as a tile on the end-of-round contact sheet. 79 of the
81 areas have one, taken from the lead image of the town's sr.wikipedia article
and credited per image. `npm run build:slike` regenerates them; see
[DATA.md](../../DATA.md) for the licence terms and the rules the build enforces.

## Design

The palette is taken from the object itself — a plate is white and black with
the blue of the country band and the red of the shield — so the app looks like
its subject rather than like a default dark dashboard. That palette is now the
whole family's, and lives with the engine.

## Croatia

34 codes, from the list HAK publishes and hr.wikipedia tabulates, which gives
each code its towns and municipalities by name.

The boundaries come from **OpenStreetMap `admin_level=7`** — Croatia's 127
gradovi and 428 općine — rather than geoBoundaries, which is what Serbia uses.
geoBoundaries' Croatian layer is missing eight municipalities outright,
misspells several (`Hvratska Dubica`, `Veliki Pisanica`, `Opicina Pirovac`) and
models the inhabited islands as islands rather than as the municipalities on
them. A missing municipality does not leave a visible hole — its territory ends
up inside a neighbour, which on a map quiz is simply a wrong answer.

Three things make that source work:

- **Rings have to be assembled.** OSM returns a relation as unordered,
  arbitrarily-directed member ways, so they are chained end-to-end into rings
  and each hole is assigned to the outer ring containing it.
- **Same-named municipalities are told apart by county.** There are two
  Novigrads, two Otoks, two Privlakas and two Sveta Nedeljas; the list
  distinguishes them exactly as OSM does, by županija, so each municipality is
  keyed by name *and* county.
- **Simplification happens in topology space**, on the shared arcs rather than
  on the finished rings. Two neighbouring areas are built from the very same
  arc, so they thin identically and cannot drift apart into a sliver of
  no-man's-land. Straight from OSM the file is 7.4 MB; it ships at 244 KB.

The build fails if any Croatian municipality ends up in no area at all, since
that is the failure that would otherwise be invisible. Seven municipalities
created after the list was written are assigned explicitly to the code they were
split from, and 1,100 islets under 4 km² are dropped as unclickable.

Croatia has no Kosovo switch, and no photographs yet — the app renders fine
without them.

## North Macedonia

34 codes, from mk.wikipedia's table, which gives code, region and covered
municipalities in one row.

Boundaries are OpenStreetMap again, but at two levels: `admin_level=7` is the 80
municipalities the list is written in terms of, and `admin_level=6` is the City
of Skopje — a single unit covering ten of them, which the list names as a whole
under SK. Fetching both means Skopje does not have to be assembled by hand.

Names arrive in Cyrillic on both sides and are transliterated for display, so
the app stays in Latin script: Скопје becomes Skopje, Ѓорче Петров becomes
Đorče Petrov. That needed three letters Serbian does not have — ѓ, ќ and ѕ,
added to `@kviz/build/serbian` as their Serbian equivalents đ, ć and dz. Serbian
text never contains them, so every existing dataset rebuilds byte-identical.

Three naming differences had to be stated outright: OSM carries
`Општина Демир Хисар/Мургашево` with both names in one tag, and the list
misspells Дебарца as Дебрца and Ростуша as Ростуше.

The build fails if any municipality belongs to no code. Skopje's ten inner
municipalities are the deliberate exception, and they are recognised by
point-in-polygon against the city rather than by touching its border — Čair and
Centar sit wholly inside it and touch its outer boundary nowhere.

### The plate

The country mark is **NMK**, not the MK it was before 2019. The distinctive part
is the small red block after the code, carrying the same letters again in gold
Cyrillic above the serial's — so ST reads СТ, and SK reads СК, which to a Latin
eye looks like CK. Red and gold are the national pairing, as on the flag.

## Montenegro

25 codes, and the simplest of the four: every municipality has its own code and
every code covers exactly one municipality, so there is nothing to group.
Boundaries are OpenStreetMap `admin_level=6`, which is those 25 units exactly —
including Zeta, split from Podgorica in 2024, so the list is current.

The borders still go through a shared topology before being thinned, for the
same reason as everywhere else: neighbours built from the same arc thin
identically and cannot part into a sliver of no-man's-land.

OSM names each unit by what it is — `Opština Nikšić`, but `Glavni grad
Podgorica` for the capital and `Prijestolnica Cetinje` for the old royal one —
and Ulcinj carries its Montenegrin and Albanian names in one tag
(`Opština Ulcinj - Komuna e Ulqinit`).

### The plate

The blue band is the union's, but the stars' place is left empty: Montenegro is
a candidate, not a member, and the real plate simply carries MNE low down. The
separator is the state arms — a gold-rimmed red roundel with the crowned
double-headed eagle — drawn as a silhouette, since it is about 5 mm across in
reality. The serial runs two letters then three digits, unlike its neighbours.

## Slovenia

11 codes — and much the hardest data, because Slovenia's codes are defined over
its 58 **upravne enote**, and nothing maps those:

- OSM has 11 of the 58 as boundary relations, and no more.
- geoBoundaries has the 212 občine, but with the diacritics mangled — Škocjan
  arrives as `Ckocjan`, Žužemberk as `Suremberk` — so nothing can be matched
  against it. OSM has them correctly named and tagged `ISO3166-2=SI-*`.
- sl.wikipedia gives the občine for only **31** of the 58 units; the other 27
  list their **settlements** instead.
- Wikidata has no items for the units at all, and the state's legal register
  answers with a JavaScript shell.

So the missing half is derived: each of those 27 units' 2,554 settlements is
placed inside an občina by point-in-polygon, and an občina goes to whichever
unit most of its settlements came from. The majority matters — Slovenia reuses
settlement names, and a single stray would otherwise hand a municipality to a
unit on the far side of the country. Real members come in at six settlements or
more; strays at one. The build then asserts what it must: **all 212 občine
assigned, each to exactly one unit**, or it stops.

The source contradicts itself once, and its own arithmetic settles it: both
Grosuplje and Litija claim Ivančna Gorica, but Grosuplje states 464 km² — which
is exactly Grosuplje plus Dobrepolje plus Ivančna Gorica — while Litija states
321.97, exactly Litija plus Šmartno pri Litiji with no room for it.

Finally the areas are **clipped to Natural Earth's land**. Slovenia's coastal
občine take in the water it claims in the Bay of Piran, which left KP with a
wedge of open sea attached: a glitch on the map, a wider frame, and the very
stretch Slovenia and Croatia dispute. Clipping brings the total from 0.8% over
Slovenia's real area to 0.2% under it.

### The plate

The green frame is what makes a Slovenian plate recognisable across a car park.
The arms are the interesting part: a real plate carries the arms of the
**municipality**, not the region — a GO plate from Idrija shows Idrija's arms,
not Nova Gorica's. There is one plate per code here, so each shows the arms of
the town its code is named after, which is what a plate registered in that town
looks like. All eleven come from Wikimedia Commons and are public domain or CC0
(`npm run build:grbovi-si`).

## Yugoslavia

125 codes as the map stood in the **mid-1980s** — which is when the names are at
their best. Six of the towns were named for Tito: Titograd, Titovo Užice,
Titova Mitrovica, Titov Veles, Titov Drvar and Titova Korenica. Four more have
since been renamed: Ivangrad, Svetozarevo, Slavonska Požega and Podravska
Slatina. Each carries what it is called today, revealed once you have answered.

**This one asks for towns, not areas, and that is a deliberate limit.** The
codes were issued over groups of opštine, and which opština belonged to which
code is not published anywhere that can be relied on — the boundaries have moved
a great deal since, most of all in Bosnia and Kosovo. Guessing it, by nearest
town or otherwise, would be inventing a map. The towns themselves are exact, so
the quiz asks for the town and the map draws the six republics behind them.

Which name a town had is decided by the dates the source gives rather than by
taste. A note reading "od 1992 se zove Berane" means Ivangrad was still current;
one reading "od 1989 Kosovska Mitrovica" means that name had already replaced
Titova Mitrovica — so a snapshot taken in 1990 would miss it, and one taken in
1985 keeps it. Two towns held two codes across the period and only the one in
force is kept, which is why BA and KM are absent.

### The plate

No country band, no shield: white enamel, lettering in the dark blue those
plates were stamped in rather than the black their successors use, and the red
five-pointed star between the letters and the numbers. The real ones ran to
several lengths — BG★123-456, BG★123-45, BG★12-34 — and the longest is used.

Bosnia is the reason this is worth playing: it is the only place in the app
where its towns have codes of their own, since Bosnia has had no regional codes
since 1998.
