# US Geography Trainer

A browser game for learning the lower 48 states and the biggest US cities by
clicking them on a map. No frameworks, no build step, no network calls — just
HTML, CSS and three plain JavaScript files, so it runs on GitHub Pages as-is
(and by double-clicking `index.html`).

## The two modes

**States** — the map is a blank silhouette: coastline, national border and the
Great Lakes, with no state lines at all. You're asked for one state at a time;
click where you think it is, and its border is drawn in when you get it right.
Finish all 48 to fill in the map.

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
the end of the round. Scores and times are kept per mode in `localStorage`.

Scroll to zoom, drag to pan, pinch on a touchscreen — useful for Rhode Island.
Panning never costs you a try.

## Running it

Open `index.html` in a browser. That's the whole story — the map data is
committed as plain JS, so there's nothing to install or serve.

To publish: push to GitHub, then **Settings → Pages → Source: Deploy from a
branch**, pick `main` and `/ (root)`.

## Layout

```
index.html        markup and script tags
style.css         all styling; the map colors are CSS variables the canvas reads
js/geo.js         Albers projection, point-in-polygon, distances, compass
js/map.js         canvas rendering, zoom/pan, hit-testing
js/game.js        question flow, scoring, menus and results
data/states.js    48 state outlines, label anchors, and the national silhouette
data/cities.js    150 cities with coordinates, state and population
tools/build-data.mjs   regenerates the two data files (only needed to change data)
```

## Data

- State boundaries: [us-atlas](https://github.com/topojson/us-atlas)
  `states-10m` (US Census cartographic boundary files, public domain)
- Cities: [plotly datasets](https://github.com/plotly/datasets)
  `2014_us_cities.csv`

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

To regenerate:

```bash
curl -sL -o /tmp/states-10m.json https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json
curl -sL -o /tmp/cities.csv https://raw.githubusercontent.com/plotly/datasets/master/2014_us_cities.csv
node tools/build-data.mjs /tmp/states-10m.json /tmp/cities.csv
```
