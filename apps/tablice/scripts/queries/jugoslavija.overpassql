// The towns that held a registration code in the SFRJ, looked up by name across
// all six republics.
//
// Villages are included because a couple of the seats are small now — Korenica
// held a code and is tagged a village today — but cities and towns win when a
// name is shared, which is what keeps Bor the town rather than some hamlet.

[out:json][timeout:500];
node["place"~"^(city|town|village)$"]["name"](40.8,13.2,46.9,23.1);
out;
