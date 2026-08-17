[out:json][timeout:180];
area["ISO3166-1"="RS"][admin_level=2]->.rs;
(
  node["name"~"[Пп]ролом|[Pp]rolom|[Лл]уковск|[Ll]ukovsk|[Бб]уковичк|[Bb]ukovičk|[Вв]рујци|[Vv]rujci|[Јј]унаковић|[Jj]unaković|[Нн]овопазарск|[Nn]ovopazarsk"](area.rs);
  node["place"]["name"~"^([Кк]ањижа|[Kk]anjiža|[Аа]ранђеловац|[Aa]ranđelovac)$"](area.rs);
);
out;
