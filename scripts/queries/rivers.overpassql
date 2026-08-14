// River courses for src/data/rivers.json.
//
// OSM often carries two languages in one name ("Dunav / Дунав", "Lepenc /
// Лепенец"), so each name is matched as a whole slash-separated component:
// start-or-slash before, slash-or-end after. That keeps "Beli Timok" from
// matching the entry for "Timok", and "Stari Dunav" from matching "Dunav".
//
// The boxes differ because the rivers do: the first group leaves the country
// and is followed out, the second is Serbian throughout, the fourth drains
// Kosovo towards three different seas.

[out:json][timeout:300];
(
  // Cross-border rivers, followed well past the border on every side.
  way["waterway"="river"]
     ["name"~"(^|/ *)(Дунав|Dunav|Duna|Dunărea|Сава|Sava|Тиса|Tisa|Tisza|Дрина|Drina|Ибар|Ibar|Ibër|Бегеј|Begej|Bega|Тимок|Timok|Бели Тимок|Beli Timok|Црни Тимок|Crni Timok|Нишава|Nišava|Лим|Lim|Увац|Uvac|Тамиш|Tamiš|Timiș)( *$| */)"]
     (40.9,17.2,47.4,24.4);

  // The Bega reaches Serbia as a canal; without it the Begej arrives in pieces.
  way["waterway"="canal"]
     ["name"~"(^|/ *)(Бегеј|Begej|Bega|Бегејски канал|Begejski kanal)( *$| */)"]
     (45.1,20.2,45.95,22.5);

  // Rivers that rise and end inside Serbia.
  way["waterway"="river"]
     ["name"~"(^|/ *)(Велика Морава|Velika Morava|Западна Морава|Zapadna Morava|Јужна Морава|Južna Morava|Колубара|Kolubara|Млава|Mlava|Пек|Pek|Ресава|Resava|Јадар|Jadar|Топлица|Toplica|Расина|Rasina|Ђетиња|Đetinja)( *$| */)"]
     (41.5,18.6,46.5,23.2);

  // Kosovo and Metohija. Mapped mostly under Albanian names, and reaching into
  // Albania (Beli Drim) and North Macedonia (Lepenac), so the box covers both.
  way["waterway"="river"]
     ["name"~"(^|/ *)(Бели Дрим|Beli Drim|Drini i Bardhë|Ситница|Sitnica|Sitnicë|Лепенац|Lepenac|Lepenc|Лепенец|Биначка Морава|Binačka Morava|Morava e Binçës)( *$| */)"]
     (41.75,19.85,43.45,21.95);
);
out geom;
