# Specifikacija tablica

What the plate quiz is, what it must do before it is finished, what has been
built, and what is left.

Rendered and shareable: [claude.ai/code/artifact/ab9911f1](https://claude.ai/code/artifact/ab9911f1-f66d-441c-8d90-0aa61d59bd06)

> **Reading this.** Section 2 is drawn from the repository's history and is
> accurate to 26 August 2026, when lint, both builds and both browser suites
> were last run against production and came back clean; section 4 lists things
> checked and found wanting on that date. Sections 1, 3 and 5 are a proposal and are meant to be
> argued with. Three statuses are used and they mean what they say:
> **Shipped** is live and checked, **Next** is agreed and not started, **After**
> and **Last** are sequenced by what they depend on rather than by preference.

---

## 1 · The specification

**Tablice asks you which region a licence plate comes from, and you answer by
clicking the map.** Six countries, 310 regional codes, from Serbia's current
plates to Yugoslavia's as they stood in 1985.

These seven lines are the acceptance criteria. Not a feature list — a
description of the experience when it works. Each is either true today or it is
not, and the ones that are not are the work that remains. **Four of seven hold.**

| | | |
| --- | --- | --- |
| — | **Someone can find it.** | Today it is a URL nobody knows. People search "čija je tablica PP", and three lookup sites already answer them. |
| ✓ | **They can play in one tap, with no setup.** | One button; every setting remembered and put away behind it. |
| ✓ | **There is a reason to come back tomorrow.** | A daily challenge at `/dnevni` — one round, the same for everyone, a different country each day. |
| ✓ | **They can see they are improving.** | Accuracy over time and per country, kept per device and synced to an account. |
| — | **They can practise exactly what they are bad at.** | The data exists — the confusion pairs — but nothing acts on it yet. |
| — | **They can compare themselves to others, fairly.** | Needs comparable rounds before it needs a table. See section 4. |
| ✓ | **They can share a result without spoiling it.** | A grid of squares, the score and a link — no code and no place name anywhere in it. |

---

## 2 · The record — what is built

Fifty-six commits between 14 and 26 August 2026, in ten areas. Everything
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
- With nothing played yet, `/napredak` says what it will hold, shows what one of
  those lines looks like, and offers both ways to fill it — rather than a
  heading and a button in an empty screen. Local-first stands: the page says an
  account is not needed, and mentions it only as the thing that carries progress
  between devices.
- The end of a round says what the score means against the rounds before it —
  "najbolje do sada", or how it sits against your usual for that country. Nine
  out of ten is a triumph across Yugoslavia's 125 towns and unremarkable among
  four choices, so the number alone tells nobody how they did.

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
- The daily's picture follows the daily. The page is written once and the
  country changes every day, so the choice is made when the picture is asked
  for, and the rule that makes it lives in one file both the picture and the
  challenge read — `packages/kviz/src/rota.ts`. It only caches until the
  country turns over in Belgrade, rather than for a flat day.
- The tags are written into each route's own HTML at build time rather than set
  by React, because the crawlers that draw previews do not run JavaScript.
  Everyone is served the same HTML, crawler and browser alike — no sniffing the
  user agent, no showing Facebook something a person would not see.
- The build refuses to ship a page carrying two `og:image` tags, which is what
  the first attempt produced: its own and the template's, with the choice left
  to whichever crawler read it.

### Sending it on · shipped 24 Aug

- The end of a round draws the result as a card — the plate, the score, one
  square per question in the order they were asked — and puts the places it can
  go underneath it: X, WhatsApp, Telegram, Facebook, Viber on a phone, the
  picture saved, or the text copied. Not a button. A button that quietly copies
  was the whole of this until 25 August, and it neither said what it had done
  nor offered anywhere to put it.
- **Kopiraj puts a link on the clipboard, and only a link.** It used to hand
  over the whole result — three lines with an address on the end — which is not
  what a control marked with a link gives you, and not what an address bar or a
  post does anything useful with. The score and the grid still travel, to the
  platforms that take text: X, WhatsApp, Telegram.
- **The link is short**, `/r/ab12cd34`, because a link nobody would send is not
  a shared result. The result is kept server-side to make that possible — no
  account, no player column, nothing that belongs to a person: which round it
  was, which questions went right, how long it took. The id is the front of a
  hash of those, so sharing one result twice writes one row and gives one link.
  If the store cannot be reached the long self-contained form is used instead,
  and everything still works.
- **A result has an address of its own**, `/r/…`, and it previews as what
  happened. This took three tries. The bare hostname dropped whoever opened it
  on the front page. The round's own address at least dealt them the questions —
  but it previews as the country's plate, the same picture for a perfect ten and
  a miserable two, because those tags are written once when the app is built and
  cannot know what happened. So a result is answered by a function that makes
  its tags when the link is opened: the score in the title, the grid in the
  picture, and the round itself one press away.
- The page is served to everyone alike, crawler and person — no sniffing, the
  same rule the built pages follow. A crawler reads the tags and stops; a person
  reads the score and presses *Probaj isti krug*.
- A link that lost half of itself in a chat app previews nothing and goes to the
  country it named, rather than inventing a result to show.
- `t` meant *timed* in a round's address and *topic* to both the picture and the
  page, and Vercel's rewrite hands the topic over in the query — so a clocked
  round went out `t=1&t=crnagora` and came back unclocked, silently. The clock
  is `c` in a share link now. One letter with two meanings, found by a check
  rather than by a person.
- The card is square, and Instagram is the reason: it is the one target that
  takes no link at all — there is no address that opens a prefilled post — so
  the only way to it is a picture a person posts themselves, through the phone's
  own share sheet.
- One drawing routine paints the canvas the summary shows *and* the file that
  leaves, so what someone looks at before sending is the thing that gets sent.
- Nothing in it gives an answer away — no code, no place name. A line naming
  what you missed would feel like a kindness and would ruin the day's challenge
  for whoever read it, so the check asserts the *absence* of every code and name
  from that round.
- Green against black rather than green against red, since these squares carry
  no label to fall back on and red against green is the one pairing that
  collapses for the six percent of men who cannot separate them.
- The daily wears its number; an ordinary round does not, or the first person to
  compare two of them finds the number means nothing.
- The share sheet on a phone, the clipboard everywhere else — and a fallback to
  the old copy command, because Safari, any page not on https, and any browser
  with the permission denied all refuse the modern one.

### Counting who plays · shipped 25 Aug

- Both apps ask Vercel for page views, in production only. Page views and
  nothing else: no cookies, no accounts, nothing about a person.
- It went out once before the switch was on and came straight back: Vercel
  serves no script until Web Analytics is enabled per project, and the route
  that serves it is written into a deployment when it is built — so the switch
  comes first, then a deploy, in that order. The geography suite caught the
  wrong order, four "no console errors" checks, one per topic.
- Two rounds had reached the database when this went on. That is the number the
  next decision rests on: a doorway from search is the right build if nobody
  arrives, a deeper game is the right build if people arrive and leave.

### A round survives the trip · shipped 25 Aug

- Whether a round was played against the clock now goes up with it and comes
  back down again. It never did: `round` had no column for it, so a synced round
  matched neither the clocked rounds nor the unclocked ones, and dropped out of
  the end-of-round comparison entirely on any second device.
- A question the clock ran out on is recorded with nothing picked, and the sync
  endpoint used to drop every answer without a pick. A ten-question round with
  two timeouts arrived as eight — shorter, more accurate, and with a streak the
  timeout had broken closed back up.
- Both were found by reading rather than by playing, and both are now checked:
  a round goes through `clean()` in the suite and is asserted to come out whole.
  It is the one check with no browser in it, because the loss happened where no
  browser could see it.

### Underneath · shipped 17–24 Aug

- Two apps over one shared engine, deployed as separate projects from one
  repository, each naming the other in a line of small type at the foot of the
  page.
- A round is its URL: dealt from a seed, so the same link is the same questions
  in the same order — the foundation everything in section 3 depends on.
- Neon Postgres, three tables, reached from serverless functions in the same
  deploy. Schema in [apps/tablice/scripts/schema.sql](apps/tablice/scripts/schema.sql).
- 122 checks across the two apps — 111 and 11, counted by running them rather
  than by counting the lines that call them — each written to fail before it was
  made to pass; the daily's, the preview's, the share's and the round trip
  through the server were each watched failing with the feature removed. No
  single run of tablice does all 111: thirty-one want a dev server, twenty-six
  want a deployment, and the fifty-four left run either way.
- Two of them were written, watched passing, and rewritten because they were
  passing for the wrong reason — one fetched a link from inside the app, where
  every wrong answer resolves against the dev server and comes back as the page
  shell; the other fetched an HTML-escaped URL, so it graded the country's plate
  while believing it was looking at a result.
- The share page and its picture serve both quizzes. They did not: every line
  of this is engine code that the geography quiz runs too, and it was sending
  results that called themselves Tablice to a route only tablice had. The name
  on the card and in the line comes from the topic now.
- `api/` is type-checked, as of 26 August. It never was, and it had a real error
  in it — two serverless functions that nothing checked before a deploy.

---

## 3 · Outstanding — what still needs doing

Three pieces of work, in the order they have to happen. Each exists because the
next one needs it. Built out of order most land in an empty room: a leaderboard
with three names on it advertises that nobody is here.

### 1. Practise your mistakes — **next**

A round dealt entirely from the codes you keep getting wrong. This is what turns
a toy into a study tool, and nothing else on the web can copy it — every answer
here already records *what you picked*.

- **Unlocks** the reason to use this over a listicle
- **Depends on** nothing — the confusion pairs are already recorded
- **Touches** `deck.ts`, `stats.ts`, one new round type

### 2. Code pages — **after**

One page per code — 310 of them — answering the question people actually type
into a search box, with the map beside it and a way into the quiz. A doorway,
never a tool inside the game.

- **Unlocks** arrivals from search
- **Depends on** nothing
- **Touches** 310 static routes, the map component, a sitemap

### 3. Leaderboards — **last**

Deliberately last. It needs people, which item 2 brings. The
comparable round it ranks already exists — the daily. Shipped today it would be
an empty table with one name on it three times.

- **Unlocks** a reason to return once the novelty goes
- **Depends on** people
- **Touches** a fourth table, two endpoints, a screen

---

## 4 · Rough edges

Things that work but are wrong, or that were left half-done and have stayed
that way. Not features — none of these would appear on a list of what the app
lacks, and every one of them is visible to somebody using it. Fix them between
the numbered items rather than after them.

### The geography app's progress can never leave the browser

It has the same progress page and the same account code, and no Google client
id — so its sign-in button never appears and its rounds are stranded on one
device. Either connect it to the same account, or say on the page that this one
is local only.

### A topic is promised that does not exist

The geography app's home still offers "Nacionalni parkovi" with an *Uskoro*
badge. It has said that since the first week. Build it or take it down.

### Kosovo and the clock are recorded but never separated

Easy rounds are counted apart from the whole map, for good reason. Rounds with
Kosovo switched on and rounds against the clock are recorded the same way and
then averaged together with the rest. The clock especially: accuracy under time
pressure is a different number, and mixing them quietly flatters neither.

---

## 5 · Ranking

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

## 6 · Later — worth doing, not worth waiting for

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

## 7 · Out of scope

- **Lookup inside the game.** Typing two letters to be told the answer is the
  opposite of the exercise. It belongs on the code pages, where it brings people
  in — never where it lets them out.
- **A global leaderboard before there is anyone on it.** An empty board is worse
  than no board: it tells every visitor the room is empty.

---

Everything is measured against the seven lines in section 1. When all seven are
true, it is done.
