// Montenegro's 25 municipalities, which the registration codes match one to one
// — every opština has its own code, plus the capital Podgorica ("Glavni grad")
// and the old royal capital Cetinje ("Prijestolnica").
//
// admin_level=6 here; 8 is the settlement, of which there are some 230.

[out:json][timeout:300];
area["ISO3166-1"="ME"][admin_level=2]->.me;
relation["boundary"="administrative"]["admin_level"="6"](area.me);
out geom;
