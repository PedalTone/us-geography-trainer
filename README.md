# Learn the US, for real!

A browser game for learning the lower 48 states and the biggest US cities by
clicking them on a map. No frameworks, no build step and nothing loaded from a
third party — just HTML, CSS, three plain JavaScript files and its own map data,
so it runs on GitHub Pages as-is.

## The two modes

**States** — no state lines at all: just coastline, national border, and the
physical geography — shaded relief, rivers and lakes — so you can find Colorado
by the Front Range or Iowa by the two rivers bracketing it. You're asked for one
state at a time; click where you think it is, and its border is drawn in when
you get it right. Finish all 48 to fill in the map.

Every feature is **labelled all the time** — Rocky Mountains, Great Plains,
Mississippi R., Colorado Plateau, Lake Superior and the rest — so you learn the
landmarks while you play. Around 310 features are named in four tiers, and
zooming in reveals the next one:

| Tier | Appears at | What shows up |
| --- | --- | --- |
| 1 | always | the main stems, big ranges, the Great Lakes, Gulf of Mexico |
| 2 | 1.4x | major tributaries, plateaus, the 4,000 m peaks |
| 3 | 2.2x | smaller rivers and lakes, **national parks**, capes |
| 4 | 3.4x | the rest of the river network and the smaller summits |

That covers 163 named rivers, 42 peaks and 48 national parks, plus ranges,
plateaus, deserts, lakes, gulfs and capes.

The **Terrain** switch turns the whole geography layer — relief, rivers, lakes
and labels — off if you want the bare silhouette instead. The setting sticks.

## Hard mode

Answered states normally stay lit up in green with their border and
abbreviation, which quickly becomes a crutch — once half the map is filled in,
the remaining states are outlined for you. Turn on **Hard mode** on the title
screen and a correct answer fades away completely: fill, border and name all go,
about a second after you place it. The map stays blank for the whole round, so
every question is answered from the geography alone. A missed answer holds its
red reveal for a couple of seconds first, since that is the lesson. Cities fade
away the same way.

When the round ends the finished map is drawn in full — every state named, with
the ones you missed in red — so you can still review what you did.

Hard mode keeps its own high scores, so an easier round can't hold the record.

**Cities** — the state borders are drawn for you, and you place major cities by
population. Pick the top 25, 50, 100 or 150.

## How a question works

Three tries each, worth 3 points on the first, 2 on the second, 1 on the third.
Every wrong click tells you what you actually hit and how far off you were:

- **Close!** — within 200 miles of the target state's edge, or near the city
- **Not quite** — under 500 miles
- **Way off** — beyond that

The second miss adds a direction ("Illinois is 130 mi to the east"). Miss all
three and the answer is revealed in red and added to the list you can drill at
the end of the round.

## Streaks

Answers you get right on the **first** try, back to back, build a streak — shown
as 🔥 in the header. Needing a second try keeps your points but ends the run,
which is what makes a long one worth something. Milestones pay a bonus and throw
a banner: 3, 5, 8, 12, 16, 20, 25, 30, 40, and all 48 first try (+60). A
flawless 48-state round is 362 points, which is exactly 100%.

Best score, time and longest streak are kept per mode in `localStorage`.

## Getting around the map

Scroll to zoom, drag to pan, pinch on a touchscreen — useful for Rhode Island.
Panning never costs you a try.

## Running it

Open `index.html` in a browser. That's the whole story — the map data is
committed as plain JS and the relief as a PNG beside it, so there's nothing to
install or build.

To publish: push to GitHub, then **Settings → Pages → Source: Deploy from a
branch**, pick `main` and `/ (root)`.

GitHub Pages serves assets with a ten minute cache, so every script and
stylesheet is referenced with a `?v=N` in `index.html` (and `relief.png` in
`data/relief.js`). **Bump N whenever you deploy** or returning players keep
running the old files.

## Layout

```
index.html        markup and script tags
style.css         all styling; the map colors are CSS variables the canvas reads
js/geo.js         Albers projection, point-in-polygon, distances, compass
js/map.js         canvas rendering, terrain layers, zoom/pan, hit-testing
js/game.js        question flow, scoring, streaks, menus and results
data/states.js    48 state outlines, label anchors, and the national silhouette
data/cities.js    150 cities with coordinates, state and population
data/water.js     river centrelines and lake polygons
data/features.js  named features: label anchor, angle and priority tier
data/relief.png   shaded relief, pre-projected to match the map
tools/build-*.mjs      regenerate the data files (only needed to change data)
```

## Data

- State boundaries: [us-atlas](https://github.com/topojson/us-atlas)
  `states-10m` (US Census cartographic boundary files, public domain)
- Cities: [plotly datasets](https://github.com/plotly/datasets)
  `2014_us_cities.csv`
- Rivers and lakes: [Natural Earth](https://github.com/nvkelso/natural-earth-vector)
  50m centrelines for the main stems, 10m North America for the tributary
  network, 10m elevation points for the peaks (public domain)
- National parks: [Wikidata](https://query.wikidata.org/) (CC0)
- Elevation: [AWS terrain tiles](https://registry.opendata.aws/terrain-tiles/)
  (public, no key)

`tools/build-data.mjs` converts the TopoJSON into the flat structures the game
uses. Two things it does that are worth knowing:

- The borderless silhouette is derived from the topology — an arc used by two
  states is an interior line, an arc used once is coastline, national border or
  lake shore. That's what makes the "no borders" mode possible without a
  separate outline file.
- The city source geocodes every same-named city to a single point (all the
  Springfields share one row), so populations for reused names can belong to a
  twin. Names that are ambiguous in real life — Portland, Columbus, Springfield
  and friends — are asked with their state attached.

The relief is the third interesting piece. The terrain tiles are Web Mercator
and the game draws in Albers, so `build-relief.mjs` inverse projects every
output pixel to lon/lat and samples the Mercator elevation grid. The result is a
single greyscale image that lines up with the geometry exactly, painted over the
land with an `overlay` blend — 128 means flat, so the blend shades the land
colour instead of tinting it.

To regenerate:

```bash
curl -sL -o /tmp/states-10m.json https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json
curl -sL -o /tmp/cities.csv https://raw.githubusercontent.com/plotly/datasets/master/2014_us_cities.csv
node tools/build-data.mjs /tmp/states-10m.json /tmp/cities.csv
```

```bash
node tools/build-water.mjs <rivers.geojson> <lakes.geojson> <rivers_north_america.geojson>
node tools/build-relief.mjs --zoom 6 --width 1920
node tools/build-features.mjs <dir-with-natural-earth-geojson>
```

National parks come from Wikidata, saved as `parks.json` in the same directory
(`build-features.mjs` skips them if it isn't there):

```bash
curl -sG https://query.wikidata.org/sparql -H 'Accept: application/sparql-results+json' -o parks.json --data-urlencode 'query=SELECT ?parkLabel ?coord WHERE { ?park wdt:P31 wd:Q34918903 . ?park wdt:P625 ?coord . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }'
```

Two ranking notes. The 10m North America river file is a *detail* layer, not an
importance one — its scalerank puts the Mississippi last — so tributaries are
ranked by their own length instead, which decides both how heavily they draw and
which tier their label lands in. Rivers under 120 miles are dropped entirely;
below that the map turns to fuzz and the file doubles. Peaks are tiered by
elevation, so Whitney and Elbert show up long before the 2,000 m summits.

Feature labels are placed at draw time, not baked in: each one is measured,
turned into a few small boxes along its baseline — a diagonal label like
"Appalachian Mountains" covers a thin strip, and using its full bounding box
would block half the east — and skipped if it collides with something already
placed or runs off the canvas. Game labels claim their space first, then the
headline features in a hand-ranked order, so losing the Appalachians to
"Coastal Plain" can't happen. `build-features.mjs` also keeps a simplified
polygon for each region, so a future mode can ask you to find the Rockies
rather than just read the name.
