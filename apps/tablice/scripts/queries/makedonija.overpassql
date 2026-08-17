// North Macedonia's local self-government units.
//
// admin_level=7 is the 80 municipalities, which is what the registration list
// is written in terms of. admin_level=6 is the City of Skopje, a single unit
// covering ten of them — the list names it as a whole under SK, so it is
// fetched too rather than assembling those ten by hand.
// (8 is the settlement, of which there are some 1,750.)

[out:json][timeout:400];
area["ISO3166-1"="MK"][admin_level=2]->.mk;
relation["boundary"="administrative"]["admin_level"~"^(6|7)$"](area.mk);
out geom;
