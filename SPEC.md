# Specifikacija tablica

What the plate quiz is, what it must do before it is finished, what has been
built, and what is left.

Rendered and shareable: [claude.ai/code/artifact/ab9911f1](https://claude.ai/code/artifact/ab9911f1-f66d-441c-8d90-0aa61d59bd06)

> **Reading this.** Section 2 is drawn from the repository's history and is
> accurate to 24 August 2026. Sections 1, 3 and 4 are a proposal and are meant
> to be argued with. Three statuses are used and they mean what they say:
> **Shipped** is live and checked, **Next** is agreed and not started, **After**
> and **Last** are sequenced by what they depend on rather than by preference.

---

## 1 · The specification

**Tablice asks you which region a licence plate comes from, and you answer by
clicking the map.** Six countries, 310 regional codes, from Serbia's current
plates to Yugoslavia's as they stood in 1985.

These seven lines are the acceptance criteria. Not a feature list — a
description of the experience when it works. Each is either true today or it is
not, and the ones that are not are the work that remains. **Three of seven hold.**

| | | |
| --- | --- | --- |
| — | **Someone can find it.** | Today it is a URL nobody knows. People search "čija je tablica PP", and three lookup sites already answer them. |
| ✓ | **They can play in one tap, with no setup.** | One button; every setting remembered and put away behind it. |
| ✓ | **There is a reason to come back tomorrow.** | A daily challenge at `/dnevni` — one round, the same for everyone, a different country each day. |
| ✓ | **They can see they are improving.** | Accuracy over time and per country, kept per device and synced to an account. |
| — | **They can practise exactly what they are bad at.** | The data exists — the confusion pairs — but nothing acts on it yet. |
| — | **They can compare themselves to others, fairly.** | Needs comparable rounds before it needs a table. See section 4. |
| — | **They can share a result without spoiling it.** | A shared link now previews as the country's plate; what is missing is the result grid to put beside it. |

---

## 2 · The record — what is built

Forty commits between 14 and 24 August 2026, in seven areas. Everything
here is live at [tablice.vercel.app](https://tablice.vercel.app) and
[geografija-srbija.vercel.app](https://geografija-srbija.vercel.app).

### The quiz · shipped 14–19 Aug

- A clickable map: pan, pinch and wheel zoom, with the map's gestures taken back
  from the browser so two fingers zoom the map rather than the page.
- Areas, lines and points — districts, rivers, peaks, spas and towns all
  answerable on the same engine.
- Two difficulties: the whole map, or four neighbouring choices.
- A clock, optional, budgeted from the size of the map — ten seconds among four
  choices, twenty-seven across Yugoslavia's 125 towns.
- Answer colours that survive colour blindness, and a tooltip that stays inside
  the map.
- A photograph of each place, shown at the moment you got it wrong.

### The countries · shipped 14–17 Aug

- Serbia 81 codes · Croatia 34 · North Macedonia 34 · Montenegro 25 ·
  Slovenia 11 · Yugoslavia 125.
- Every dataset built from a script that re-fetches its source and fails rather
  than guesses — OpenStreetMap relations, geoBoundaries, Wikipedia tables. See
  [DATA.md](DATA.md).
- Kosovo included where Serbia lists it, as a set you switch on rather than a
  decision made for you.
- Yugoslavia as it stood in 1985, so Titograd and Titovo Užice are the names in
  force — and Bosnia's towns have codes, which they have not had since 1998.
- Serbia's geography as a second app on the same engine: districts, rivers,
  mountains, spas.

### The plates · shipped 17–18 Aug

- Each country's plate drawn to its real proportions — characters at the size
  they are in life, which is what makes a plate look like a plate.
- Real coats of arms from Wikimedia Commons rather than hand-drawn ones:
  Croatia, Serbia, Montenegro and eleven Slovenian municipalities.
- Each country's own serial format, band colour and country mark.

### You · shipped 18–19 Aug

- Sign in with Google, verified against Google's keys and checked for the right
  audience. Subject id and display name are stored; the email is dropped.
- Every finished round kept in the browser, signed in or not — an account
  carries progress between devices, it does not unlock the game.
- A progress page at `/napredak`: accuracy over time, accuracy per country,
  longest streak, median pace.
- Confusion pairs — "KŠ → Kraljevo, six times" — which exist because an answer
  records what you picked, not merely whether you were right.
- Easy and clocked rounds counted apart from the whole map, since guessing among
  four scores 25% and guessing on the map scores one in seventy.

### Coming back · shipped 24 Aug

- A daily challenge at `/dnevni`: one round a day, seeded from the date, the same
  questions in the same order for everyone dealt it.
- The day turns over at midnight in **Belgrade**, not at UTC — almost everyone
  playing is in that hour, and a challenge changing at two in the morning would
  be a puzzle about time zones.
- It walks the six countries rather than staying on the flagship, so which one
  it is today is itself a small reason to look.
- Ten questions, whole map, no clock — the one shape a board can rank.
- Played once: come back the same day and it shows your score, not another go.

### Travelling · shipped 24 Aug

- A link to any country, to `/dnevni` or to `/napredak` previews as that
  country's plate — drawn on demand by a function under `api/`, 1200×630, with
  the real coat of arms on it.
- The tags are written into each route's own HTML at build time rather than set
  by React, because the crawlers that draw previews do not run JavaScript.
  Everyone is served the same HTML, crawler and browser alike — no sniffing the
  user agent, no showing Facebook something a person would not see.
- The build refuses to ship a page carrying two `og:image` tags, which is what
  the first attempt produced: its own and the template's, with the choice left
  to whichever crawler read it.

### Underneath · shipped 17–24 Aug

- Two apps over one shared engine, deployed as separate projects from one
  repository.
- A round is its URL: dealt from a seed, so the same link is the same questions
  in the same order — the foundation everything in section 3 depends on.
- Neon Postgres, three tables, reached from serverless functions in the same
  deploy. Schema in [apps/tablice/scripts/schema.sql](apps/tablice/scripts/schema.sql).
- 73 browser checks across the two apps, each written to fail before it was made
  to pass — the daily's seven and the preview's five were watched failing with
  the feature removed.

---

## 3 · Outstanding — what still needs doing

Four pieces of work, in the order they have to happen. Each exists because the
next one needs it. Built out of order most land in an empty room: a leaderboard
with three names on it advertises that nobody is here.

### 1. Shareable result — **next**

A compact grid that gives away the score and none of the answers, so posting it
is an invitation rather than a spoiler.

```
Tablice #142 · 8/10 · 1:47
▪▪▫▪▪ ▫▪▪▪▪
tablice.vercel.app
```

- **Unlocks** people arriving without being told
- **Depends on** nothing further — the daily and the preview picture are both in place
- **Touches** the end-of-round screen in `Game.tsx`, clipboard, share sheet

### 2. Practise your mistakes — **after**

A round dealt entirely from the codes you keep getting wrong. This is what turns
a toy into a study tool, and nothing else on the web can copy it — every answer
here already records *what you picked*.

- **Unlocks** the reason to use this over a listicle
- **Depends on** nothing — the confusion pairs are already recorded
- **Touches** `deck.ts`, `stats.ts`, one new round type

### 3. Code pages — **after**

One page per code — 310 of them — answering the question people actually type
into a search box, with the map beside it and a way into the quiz. A doorway,
never a tool inside the game.

- **Unlocks** arrivals from search
- **Depends on** nothing
- **Touches** 310 static routes, the map component, a sitemap

### 4. Leaderboards — **last**

Deliberately last. It needs people, which items 1 and 3 bring. The
comparable round it ranks already exists — the daily. Shipped today it would be
an empty table with one name on it three times.

- **Unlocks** a reason to return once the novelty goes
- **Depends on** people
- **Touches** a fourth table, two endpoints, a screen

---

## 4 · Ranking

### What can honestly be compared

A round is defined by five things: country, length, whether it offers four
choices or the whole map, whether there is a clock, and whether Kosovo is
included. Change any one and it is a different game. So a board can only rank
rounds of one fixed shape — which is why the daily challenge comes first. It is
the only round everyone plays identically.

| Board | Round it ranks | Ranked by | Resets |
| --- | --- | --- | --- |
| Dnevni izazov | Today's seed · 10 · whole map · no clock | score, then time | daily |
| Niz | Any daily | days in a row | on a missed day |
| Brzina · per country | All codes · whole map · clock on | total time, perfect runs only | never |
| Tačnost · per country | All codes · whole map · no clock | correct of total | monthly |
| Ukupno | Every country's Tačnost board | mean of country scores | monthly |

The per-country board is the interesting one socially: nobody in Skopje cares
who is best at Serbian codes, and "best in the country you live in" is a title
people will actually chase.

### Five rules that keep it fair

- **Easy never ranks against the whole map.** Choosing from four means guessing
  alone scores about 25%; on the whole map it scores about one in seventy.
- **A clock never ranks against no clock.** Same reason, opposite direction.
- **A time only counts on a perfect run.** Otherwise the fastest way to the top
  is to click anything, instantly, and be wrong.
- **An abandoned round ranks at nothing.** It is already not recorded, and that
  stays true — otherwise you would fish for a good start and quit the rest.
- **The daily is checked on the server.** The server knows today's seed and can
  mark the answers itself, so the one board that matters cannot be typed in by
  hand.

Names on a board come from the Google account, so there needs to be a way to
play under something else — or to stay off the boards entirely.

---

## 5 · Later — worth doing, not worth waiting for

- **More countries with regional codes.** Austria, Hungary, Bulgaria, Romania
  and Greece all have them. Germany is the monster — around 700 codes — and
  would pull in an entirely different crowd.
- **Reverse rounds.** Name the region, pick the code. No map to scan, so it
  tests recall rather than recognition.
- **Installable on a phone.** Cheap, and it stops feeling like a web page you
  happened to open.
- **Bosnia, explained rather than added.** It has had no regional codes since
  1998, which is exactly why its towns appear only in the Yugoslavia quiz. A
  story worth telling on the page, not a gap to fill.

---

## 6 · Out of scope

- **Lookup inside the game.** Typing two letters to be told the answer is the
  opposite of the exercise. It belongs on the code pages, where it brings people
  in — never where it lets them out.
- **A global leaderboard before there is anyone on it.** An empty board is worse
  than no board: it tells every visitor the room is empty.

---

Everything is measured against the seven lines in section 1. When all seven are
true, it is done.
