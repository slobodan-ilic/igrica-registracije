// Slovenia's 212 občine.
//
// geoBoundaries has this layer too, but with the diacritics mangled — Škocjan
// arrives as "Ckocjan", Žužemberk as "Suremberk" — which makes matching the
// registration list against it impossible. OSM carries them correctly named and
// tagged with their ISO code, which is what identifies them as Slovenian here.

[out:json][timeout:600];
relation["boundary"="administrative"]["admin_level"="8"]["ISO3166-2"~"^SI-"]
  (45.35,13.30,46.95,16.65);
out geom;
