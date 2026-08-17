// Croatia's 20 counties plus the City of Zagreb, which is a county in its own
// right and therefore absent from admin_level=7.
//
// Used for two things: Zagreb's own boundary, and telling apart the
// municipalities that share a name — there are two Novigrads, two Otoks and
// two Privlakas, and the registration list distinguishes them by county.

[out:json][timeout:300];
area["ISO3166-1"="HR"][admin_level=2]->.hr;
relation["boundary"="administrative"]["admin_level"="4"](area.hr);
out geom;
