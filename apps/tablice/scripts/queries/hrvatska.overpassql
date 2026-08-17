// Croatia's local self-government units — 127 gradovi and 428 općine — which
// are what the registration-area list is written in terms of.
//
// admin_level=7 is the right level here: 4 is the county (županija) and 8 is
// the settlement (naselje), of which Croatia has some 6,700.

[out:json][timeout:600];
area["ISO3166-1"="HR"][admin_level=2]->.hr;
relation["boundary"="administrative"]["admin_level"="7"](area.hr);
out geom;
