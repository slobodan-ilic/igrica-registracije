// The spa towns of Kosovo and Metohija, for src/data/banje.json.
//
// A separate query because the others are scoped to area["ISO3166-1"="RS"],
// which OSM does not extend over Kosovo — so these three were invisible to the
// build. All three are on Serbia's own list of spas (sr.wikipedia, "Списак
// бања у Србији"): Бањска Бања, Клокот Бања, and Бања (Исток), the settlement
// better known as Пећка Бања.
//
// They are mapped under bilingual names, so the match is loose here and pinned
// to an exact name in build-banje.mjs.

[out:json][timeout:180];
node["place"]
    ["name"~"(^|[ -])([Bb]anj|[Kk]lokot|[Kk]llokot|[Бб]ањ|[Кк]локот)"]
    (41.85,20.0,43.30,21.85);
out;
