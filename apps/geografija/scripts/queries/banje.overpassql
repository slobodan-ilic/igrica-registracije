[out:json][timeout:180];
area["ISO3166-1"="RS"][admin_level=2]->.rs;
(
  node["place"~"^(city|town|village|suburb|hamlet|locality|neighbourhood)$"]["name"~"[Бб]ања|[Bb]anja"](area.rs);
  node["amenity"="spa"]["name"](area.rs);
  node["place"]["name"~"^(Гор[њn]а Трепча|Gornja Trepča|Врдник|Vrdnik|Меленци|Melenci|Стари Сланкамен|Stari Slankamen|Палић|Palić|Јунаковић|Junaković)$"](area.rs);
);
out;
