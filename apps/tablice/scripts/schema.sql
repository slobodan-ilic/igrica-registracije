-- The whole database. Three tables, because a round is a small thing: who
-- played it, what it was, and what they answered question by question.
--
-- Playing signed out writes nothing here — rounds are kept in the browser and
-- only travel up if and when someone signs in. So every row below belongs to
-- somebody who asked for it to.

create table if not exists player (
  -- Google's subject id: stable for a person, and not their email, so this
  -- table holds no address to leak.
  sub        text primary key,
  name       text        not null,
  created_at timestamptz not null default now(),
  seen_at    timestamptz not null default now()
);

create table if not exists round (
  -- Minted by the browser when the round ends, so syncing the same round twice
  -- is harmless. Identity deliberately does not come from what the round was:
  -- playing the same seed again is a second round, and a stats page that
  -- swallowed the rematch would be lying about how much someone had played.
  id          uuid        primary key,
  player      text        not null references player(sub) on delete cascade,
  -- Which quiz, and which round of it. The seed and length are what make a
  -- round reproducible, so a stored round can be played again exactly.
  app         text        not null,
  topic       text        not null,
  seed        text        not null,
  length      int         not null,
  easy        boolean     not null,
  kim         boolean     not null,
  -- Whether every question was against a clock. Kept because accuracy under
  -- time pressure is a different number, and a round that arrives without this
  -- can be compared with neither the clocked rounds nor the unclocked ones.
  timed       boolean     not null default false,
  -- Whether the deck was chosen from the player's own mistakes rather than
  -- dealt from the seed. Such a round is harder on purpose, so it is counted
  -- apart from the rest for the same reason easy and clocked rounds are.
  practice    boolean     not null default false,
  score       int         not null,
  ms          int         not null,
  finished_at timestamptz not null default now()
);

create table if not exists answer (
  round   uuid    not null references round(id) on delete cascade,
  step    int     not null,
  code    text    not null,
  -- What was picked, not merely whether it was right: "you keep putting KŠ on
  -- Kraljevo" is the thing worth telling someone, and it needs the wrong
  -- answer as well as the right one.
  picked  text    not null,
  correct boolean not null,
  ms      int     not null,
  primary key (round, step)
);

-- This file is the whole database and is meant to be re-runnable, so a column
-- added after the fact is added here too. Existing rounds default to unclocked,
-- which is what all but a handful of them were.
alter table round add column if not exists timed boolean not null default false;
alter table round add column if not exists practice boolean not null default false;

-- A result somebody shared, so that the link they hand out can be short and can
-- be opened by anyone.
--
-- Nothing here belongs to a person: which round it was, which questions went
-- right, and how long it took. There is no player column and there is nothing
-- to join one to. That is what lets it be written without an account, which it
-- has to be — a result nobody can open is not a shared result.
--
-- The id is the first part of a hash of the row's own contents, so sharing the
-- same result twice writes one row and hands back one link.
create table if not exists shared (
  id      text        primary key,
  app     text        not null,
  topic   text        not null,
  seed    text        not null,
  easy    boolean     not null,
  kim     boolean     not null,
  timed   boolean     not null,
  -- One character per question, '1' right and '0' wrong, in the order asked.
  grid    text        not null,
  seconds int         not null,
  made_at timestamptz not null default now()
);

create index if not exists round_by_player on round (player, finished_at desc);
create index if not exists answer_wrong on answer (code, picked) where not correct;
