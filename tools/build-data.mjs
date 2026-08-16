/**
 * Build script: turns raw public-domain sources into the two data files the
 * game ships with (data/states.json, data/cities.json).
 *
 *   node tools/build-data.mjs <states-10m.json> <cities.csv>
 *
 * Sources:
 *   states  https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json  (Census cartographic boundaries)
 *   cities  https://raw.githubusercontent.com/plotly/datasets/master/2014_us_cities.csv
 *
 * You only need to re-run this if you want different data; the outputs are
 * committed to the repo so the game itself has no build step.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [topoPath, citiesPath] = process.argv.slice(2);

/* ---------- minimal topojson decoder ---------------------------------- */

function decodeArcs(topo) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  return topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

function ringFromArcIndexes(idxs, arcs) {
  const out = [];
  for (const i of idxs) {
    const arc = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    for (const p of arc) {
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
  }
  return out;
}

/** -> array of polygons, each polygon an array of rings (ring 0 = outer). */
function toPolygons(geom, arcs) {
  const polys = geom.type === 'Polygon' ? [geom.arcs] : geom.arcs;
  return polys.map((rings) => rings.map((r) => ringFromArcIndexes(r, arcs)));
}

/* ---------- geometry helpers ------------------------------------------ */

const ringArea = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
};

function pointInPolygon(pt, rings) {
  // Ray casting across every ring at once: parity handles holes correctly.
  const [x, y] = pt;
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

const pointInState = (pt, polys) => polys.some((rings) => pointInPolygon(pt, rings));

function bbox(polys) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const rings of polys) {
    for (const p of rings[0]) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
  }
  return [x0, y0, x1, y1];
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function distToEdges(pt, polys) {
  let best = Infinity;
  for (const rings of polys) {
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const d = segDist(pt[0], pt[1], ring[j][0], ring[j][1], ring[i][0], ring[i][1]);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

/**
 * Label anchor: the interior point furthest from any border ("pole of
 * inaccessibility"), found by a coarse grid then a local refinement. Keeps
 * labels off the coast for awkward shapes like Michigan and Florida.
 */
function labelPoint(polys) {
  const [x0, y0, x1, y1] = bbox(polys);
  let best = null;
  let bestD = -1;
  let step = Math.max((x1 - x0) / 60, (y1 - y0) / 60);
  for (let x = x0; x <= x1; x += step) {
    for (let y = y0; y <= y1; y += step) {
      if (!pointInState([x, y], polys)) continue;
      const d = distToEdges([x, y], polys);
      if (d > bestD) {
        bestD = d;
        best = [x, y];
      }
    }
  }
  for (let pass = 0; pass < 4 && best; pass++) {
    step /= 2.5;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const p = [best[0] + dx * step, best[1] + dy * step];
        if (!pointInState(p, polys)) continue;
        const d = distToEdges(p, polys);
        if (d > bestD) {
          bestD = d;
          best = p;
        }
      }
    }
  }
  return best;
}

/* ---------- state data ------------------------------------------------ */

const ABBR = {
  Alabama: 'AL', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO',
  Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY',
  Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI',
  Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE',
  Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH',
  Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX',
  Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

const topo = JSON.parse(readFileSync(topoPath, 'utf8'));
const arcs = decodeArcs(topo);

const round = (v) => Math.round(v * 1e4) / 1e4;

/**
 * The silhouette for the borderless mode: an arc shared by two states is an
 * interior line, an arc used only once is coastline, national border, or a
 * Great Lakes shore. DC is counted in (but not quizzed) so its borders with
 * Maryland and Virginia don't show up as a stray outline.
 */
function outlineArcs(geometries) {
  const use = new Map();
  for (const geom of geometries) {
    const polys = geom.type === 'Polygon' ? [geom.arcs] : geom.arcs;
    for (const rings of polys) {
      for (const ring of rings) {
        for (const i of ring) {
          const key = i < 0 ? ~i : i;
          use.set(key, (use.get(key) || 0) + 1);
        }
      }
    }
  }
  const lines = [];
  for (const [key, count] of use) {
    if (count === 1) lines.push(arcs[key].map(([x, y]) => [round(x), round(y)]));
  }
  return lines;
}

const states = [];
for (const geom of topo.objects.states.geometries) {
  const name = geom.properties.name;
  const abbr = ABBR[name];
  if (!abbr) continue; // drops AK, HI, DC, PR and other territories

  let polys = toPolygons(geom, arcs);

  // Drop slivers (tiny offshore islands) that only add noise to hit-testing,
  // but never drop a state's mainland.
  const areas = polys.map((p) => Math.abs(ringArea(p[0])));
  const maxArea = Math.max(...areas);
  polys = polys.filter((_, i) => areas[i] > maxArea * 0.002);

  const anchor = labelPoint(polys);
  states.push({
    name,
    abbr,
    polys: polys.map((rings) => rings.map((r) => r.map(([x, y]) => [round(x), round(y)]))),
    anchor: [round(anchor[0]), round(anchor[1])],
    bbox: bbox(polys).map(round),
  });
}
states.sort((a, b) => a.name.localeCompare(b.name));
console.log(`states: ${states.length}`);

// Landmass that gets drawn but never asked about: DC, so the map has no hole.
const dcGeom = topo.objects.states.geometries.find((g) => g.properties.name === 'District of Columbia');
const extras = dcGeom
  ? [toPolygons(dcGeom, arcs).map((rings) => rings.map((r) => r.map(([x, y]) => [round(x), round(y)])))]
  : [];

const silhouetteGeoms = topo.objects.states.geometries.filter(
  (g) => ABBR[g.properties.name] || g.properties.name === 'District of Columbia'
);
const outline = outlineArcs(silhouetteGeoms);
console.log(`outline: ${outline.length} arcs`);

/* ---------- city data ------------------------------------------------- */

// The census records consolidated city-county governments under their legal
// names; nobody calls it "Louisville/Jefferson County".
const RENAME = {
  'Nashville-Davidson': 'Nashville',
  'Louisville/Jefferson County': 'Louisville',
  'Lexington-Fayette urban county': 'Lexington',
  'Macon-Bibb County': 'Macon',
  'Augusta-Richmond County': 'Augusta',
  'Athens-Clarke County': 'Athens',
  'Indianapolis city (balance)': 'Indianapolis',
  'Boise City': 'Boise',
  'Urban Honolulu': 'Honolulu',
};

const rows = readFileSync(citiesPath, 'utf8').trim().split('\n').slice(1);
const cities = [];
for (const line of rows) {
  const [rawName, pop, lat, lon] = line.split(',');
  const name = RENAME[rawName.trim()] || rawName.trim();
  const pt = [parseFloat(lon), parseFloat(lat)];
  if (!Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
  const st = states.find((s) => pointInState(pt, s.polys));
  if (!st) continue; // outside the lower 48
  cities.push({
    name: name,
    state: st.name,
    abbr: st.abbr,
    pop: parseInt(pop, 10),
    lon: round(pt[0]),
    lat: round(pt[1]),
  });
}

const milesApart = (a, b) => {
  const R = 3958.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

cities.sort((a, b) => b.pop - a.pop);

// One entry per name+state; keep the largest.
const seen = new Set();
const unique = cities.filter((c) => {
  const key = `${c.name}|${c.abbr}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const top = unique.slice(0, 150);

/*
 * A bare "Portland" is unanswerable — Oregon and Maine are 2,500 miles apart.
 * These names get their state in the prompt. The list is explicit rather than
 * derived because the source geocodes every same-named city to a single point
 * (all 30-odd Springfields share one row), so twins can't be detected from the
 * data itself. The coordinate we keep is the one the state was computed from,
 * so name + state always agree.
 */
const AMBIGUOUS = new Set([
  'Portland', 'Columbus', 'Springfield', 'Peoria', 'Glendale', 'Pasadena',
  'Arlington', 'Rochester', 'Salem', 'Lancaster', 'Richmond', 'Jackson',
  'Kansas City', 'Aurora', 'Charleston', 'Columbia', 'Athens', 'Manchester',
  'Bloomington', 'Alexandria', 'Fayetteville', 'Independence', 'Clinton',
]);
for (const c of top) c.label = AMBIGUOUS.has(c.name) ? `${c.name}, ${c.abbr}` : c.name;
console.log('disambiguated: ' + top.filter((c) => c.label !== c.name).map((c) => c.label).join(', '));

console.log(`cities: ${top.length} (largest ${top[0].name}, smallest ${top[top.length - 1].name} @ ${top[top.length - 1].pop})`);

// Emitted as plain JS globals rather than JSON so the game runs from a
// file:// double-click as well as from a web server.
writeFileSync(
  'data/states.js',
  `window.US_STATES = ${JSON.stringify(states)};\n` +
    `window.US_OUTLINE = ${JSON.stringify(outline)};\n` +
    `window.US_EXTRA_LAND = ${JSON.stringify(extras)};\n`
);
writeFileSync('data/cities.js', `window.US_CITIES = ${JSON.stringify(top)};\n`);
console.log('wrote data/states.js, data/cities.js');
