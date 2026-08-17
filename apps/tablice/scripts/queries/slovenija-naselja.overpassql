// Slovenian settlements, used to work out which občina each one is in.
//
// Slovenia's registration areas are defined over its 58 upravne enote, but only
// 31 of those publish which občine they contain; the other 27 publish their
// settlements instead. Placing those settlements inside the občina polygons is
// what recovers the missing half of the mapping.

[out:json][timeout:400];
node["place"~"^(city|town|village|hamlet|suburb|isolated_dwelling)$"]["name"]
  (45.35,13.30,46.95,16.65);
out;
