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
  id          uuid        primary key default gen_random_uuid(),
  player      text        not null references player(sub) on delete cascade,
  -- Which quiz, and which round of it. The seed and length are what make a
  -- round reproducible, so a stored round can be played again exactly.
  app         text        not null,
  topic       text        not null,
  seed        text        not null,
  length      int         not null,
  easy        boolean     not null,
  kim         boolean     not null,
  score       int         not null,
  ms          int         not null,
  finished_at timestamptz not null default now(),
  -- One row per round per player, so replaying a sync is harmless.
  unique (player, app, topic, seed, length, easy, kim)
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

create index if not exists round_by_player on round (player, finished_at desc);
create index if not exists answer_wrong on answer (code, picked) where not correct;
