/**
 * Build script: named physical features — ranges, plateaus, deserts, rivers,
 * lakes, peaks, capes and gulfs — with a label anchor and, where it reads
 * better, an angle to set the type along.
 *
 *   node tools/build-features.mjs <ne-geojson-dir>
 *
 * Expects these Natural Earth files in the directory (public domain,
 * https://github.com/nvkelso/natural-earth-vector):
 *   ne_50m_geography_regions_polys, ne_50m_geography_regions_points,
 *   ne_50m_geography_marine_polys, ne_50m_rivers_lake_centerlines, ne_50m_lakes
 * and optionally, for far more detail:
 *   ne_10m_geography_regions_elevation_points  (peaks)
 *   ne_10m_rivers_north_america                (tributaries)
 *
 * National parks come from Wikidata as parks.json — see the README for the
 * one-line query that produces it.
 *
 * Output is data/features.js. Region polygons are kept (simplified) so a future
 * mode can ask the player to find the Rockies, not just read the label.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const MONUMENTS = [
  {"name": "Devils Tower", "lon": -104.8048, "lat": 44.5905},
  {"name": "Chimney Rock", "lon": -103.3324, "lat": 41.1406},
  {"name": "Natural Bridges", "lon": -110.1978, "lat": 37.5208},
  {"name": "Newspaper Rock", "lon": -109.8367, "lat": 37.9061},
  {"name": "Hovenweep", "lon": -109.3725, "lat": 37.3892},
  {"name": "Canyons of the Ancients", "lon": -109.4136, "lat": 37.3925},
  {"name": "Escalante Petrified Forest", "lon": -111.5878, "lat": 37.9031},
  {"name": "Kodachrome Basin", "lon": -111.4975, "lat": 37.4475},
  {"name": "Goosenecks", "lon": -110.1208, "lat": 37.1767},
  {"name": "Bisti/De-Na-Zin", "lon": -108.3056, "lat": 35.8794},
  {"name": "Kasha-Katuwe Tent Rocks", "lon": -106.3789, "lat": 35.4767},
  {"name": "Petroglyph", "lon": -106.6636, "lat": 35.1136},
  {"name": "El Malpais", "lon": -107.8736, "lat": 34.8042},
  {"name": "El Morro", "lon": -108.3453, "lat": 35.0294},
  {"name": "Salinas Pueblo Missions", "lon": -106.2556, "lat": 34.3658},
  {"name": "Canyon de Chelly", "lon": -109.4847, "lat": 36.1533},
  {"name": "Wupatki", "lon": -110.7733, "lat": 35.2167},
  {"name": "Sunset Crater", "lon": -111.0225, "lat": 35.3614},
  {"name": "Walnut Canyon", "lon": -111.5078, "lat": 35.1803},
  {"name": "Organ Pipe Cactus", "lon": -113.3614, "lat": 32.3767},
  {"name": "Grand Canyon-Parashant", "lon": -112.9444, "lat": 36.8333},
  {"name": "Vermilion Cliffs", "lon": -112.0833, "lat": 36.8667},
  {"name": "Grand Staircase-Escalante", "lon": -111.5000, "lat": 37.5000},
  {"name": "Bears Ears", "lon": -109.7853, "lat": 37.2669},
  {"name": "Carrizo Plain", "lon": -119.9833, "lat": 34.8667},
  {"name": "California Coastal", "lon": -121.0000, "lat": 35.2667},
  {"name": "Dinosaur", "lon": -109.2236, "lat": 40.4614},
  {"name": "Craters of the Moon", "lon": -113.5144, "lat": 43.4150},
  {"name": "Hagerman Fossil Beds", "lon": -114.9453, "lat": 42.6283},
  {"name": "Three Sisters", "lon": -121.7667, "lat": 43.9167},
  {"name": "Fort Vancouver", "lon": -122.6608, "lat": 45.6269},
  {"name": "Hanford Reach", "lon": -119.5500, "lat": 46.6667},
  {"name": "Effigy Mounds", "lon": -91.1883, "lat": 43.0717},
  {"name": "Tallgrass Prairie", "lon": -96.8033, "lat": 38.4569},
  {"name": "Black Kettle", "lon": -99.7833, "lat": 35.7667},
  {"name": "Alibates Flint Quarries", "lon": -101.6958, "lat": 35.5917},
  {"name": "Amistad", "lon": -101.0558, "lat": 30.4722},
  {"name": "New River Gorge", "lon": -82.1042, "lat": 38.8064},
  {"name": "Saint-Gaudens", "lon": -72.2706, "lat": 43.6481},
  {"name": "Statue of Liberty", "lon": -74.0445, "lat": 40.6892},
  {"name": "Independence", "lon": -75.1486, "lat": 39.9486},
  {"name": "Fort Sumter", "lon": -80.2892, "lat": 32.7627},
  {"name": "Fort Jefferson", "lon": -82.8628, "lat": 24.7282},
  {"name": "Papahānaumokuākea", "lon": -160.0731, "lat": 28.1425},
  {"name": "Medano Creek", "lon": -105.5000, "lat": 37.8000},
  {"name": "Bighorn Canyon", "lon": -108.8833, "lat": 45.5167},
  {"name": "Fort Niobrara", "lon": -100.3667, "lat": 42.7833},
  {"name": "Homestead", "lon": -102.4567, "lat": 40.3061},
  {"name": "Little Missouri", "lon": -103.4667, "lat": 47.9667},
  {"name": "Medicine Rocks", "lon": -105.6333, "lat": 47.7000},
  {"name": "Upper Missouri River Breaks", "lon": -109.7500, "lat": 47.9000},
  {"name": "Gold Butte", "lon": -114.4000, "lat": 36.4500},
  {"name": "Aniakchak", "lon": -136.1500, "lat": 56.8500},
  {"name": "Bering Land Bridge", "lon": -165.5000, "lat": 65.5000},
  {"name": "Cape Krusenstern", "lon": -163.5000, "lat": 67.0000},
  {"name": "Denali", "lon": -149.5000, "lat": 63.7000},
  {"name": "Gates of the Arctic", "lon": -150.0000, "lat": 67.5000},
  {"name": "Katmai", "lon": -155.0000, "lat": 58.5000},
  {"name": "Seedskadee", "lon": -109.2000, "lat": 41.3500},
  {"name": "Castle Rock", "lon": -104.8000, "lat": 41.1500},
  {"name": "Saratoga", "lon": -73.7667, "lat": 43.1000}
];

const DIR = (process.argv[2] || '.').replace(/\/$/, '');
const load = (n) => JSON.parse(readFileSync(`${DIR}/${n}.geojson`, 'utf8'));
const loadIf = (n) => {
  try {
    return load(n);
  } catch (e) {
    console.log(`  (optional ${n} not found — skipping)`);
    return null;
  }
};

const R_MILES = 3958.8;
const milesBetween = (a, b) => {
  const dLat = (b[1] - a[1]) * (Math.PI / 180);
  const dLon = (b[0] - a[0]) * (Math.PI / 180);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * (Math.PI / 180)) * Math.cos(b[1] * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
};
const runMiles = (pts) => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += milesBetween(pts[i - 1], pts[i]);
  return d;
};

const BOX = { w: -126, e: -66, s: 23.5, n: 50.5 };
const round = (v) => Math.round(v * 1e3) / 1e3;
const inBox = (lon, lat) => lon >= BOX.w && lon <= BOX.e && lat >= BOX.s && lat <= BOX.n;

/* ---- the game's projection, so angles come out in screen space --------- */

const RAD = Math.PI / 180;
const nAlb = (Math.sin(29.5 * RAD) + Math.sin(45.5 * RAD)) / 2;
const CAlb = Math.cos(29.5 * RAD) ** 2 + 2 * nAlb * Math.sin(29.5 * RAD);
const rho0 = Math.sqrt(CAlb - 2 * nAlb * Math.sin(37.5 * RAD)) / nAlb;

function project(lon, lat) {
  const theta = nAlb * (lon + 96) * RAD;
  const rho = Math.sqrt(CAlb - 2 * nAlb * Math.sin(lat * RAD)) / nAlb;
  return [rho * Math.sin(theta), -(rho0 - rho * Math.cos(theta))];
}

/** Upright-ish: type is never set upside down. */
function readableAngle(rad) {
  let deg = (rad * 180) / Math.PI;
  while (deg > 90) deg -= 180;
  while (deg < -90) deg += 180;
  return Math.round(Math.max(-62, Math.min(62, deg)) * 10) / 10;
}

/* ---- polygon helpers -------------------------------------------------- */

function pointInRings(x, y, rings) {
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

function edgeDistance(x, y, rings) {
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j];
      const [bx, by] = ring[i];
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
    }
  }
  return best;
}

/** Interior point furthest from the edge, so labels sit in the body of a shape. */
function labelPoint(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of rings[0]) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  let step = Math.max((x1 - x0) / 40, (y1 - y0) / 40);
  let best = null;
  let bestD = -1;
  for (let x = x0; x <= x1; x += step) {
    for (let y = y0; y <= y1; y += step) {
      if (!pointInRings(x, y, rings)) continue;
      const d = edgeDistance(x, y, rings);
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
  }
  for (let pass = 0; pass < 3 && best; pass++) {
    step /= 2.5;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const p = [best[0] + dx * step, best[1] + dy * step];
        if (!pointInRings(p[0], p[1], rings)) continue;
        const d = edgeDistance(p[0], p[1], rings);
        if (d > bestD) { bestD = d; best = p; }
      }
    }
  }
  return best;
}

/**
 * Principal axis of a shape in projected space. A long thin range like the
 * Rockies gets its label set along its spine; a blobby one stays horizontal.
 */
function principalAngle(ring) {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  let mx = 0, my = 0;
  for (const p of pts) { mx += p[0]; my += p[1]; }
  mx /= pts.length; my /= pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) {
    const dx = p[0] - mx;
    const dy = p[1] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  // Eigenvalues tell us how elongated it is.
  const t = sxx + syy;
  const d = Math.sqrt((sxx - syy) ** 2 + 4 * sxy * sxy);
  const l1 = (t + d) / 2;
  const l2 = (t - d) / 2;
  return { angle: theta, elongation: l2 > 0 ? Math.sqrt(l1 / l2) : 99 };
}

/** Keeps shape while cutting point count. */
function simplify(ring, tolerance) {
  const out = [ring[0]];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= tolerance) out.push(p);
  }
  if (out.length < 4) return ring.map((p) => [round(p[0]), round(p[1])]);
  return out.map((p) => [round(p[0]), round(p[1])]);
}

/* ---- what to label ---------------------------------------------------- */

// Tier 1 is always on screen; 2 and 3 appear as you zoom in. Names not listed
// fall back to a tier from their class.
const TIER1 = new Set([
  'ROCKY MOUNTAINS', 'APPALACHIAN MTS.', 'SIERRA NEVADA', 'CASCADE RANGE', 'COAST RANGES',
  'GREAT PLAINS', 'GREAT BASIN', 'COLORADO PLATEAU', 'Ozark Plateau', 'CENTRAL LOWLAND',
  'COASTAL PLAIN', 'Central Valley',
]);

// Anything outside the lower 48 or better handled elsewhere.
const SKIP = new Set([
  'NORTH AMERICA', 'ASIA', 'CANADIAN SHIELD', 'LES LAURENTIDES', 'CUBA', 'Nova Scotia',
  'Vancouver Island', 'Gaspé Peninsula', 'BAJA CALIFORNIA', 'SIERRA MADRE ORIENTAL',
  'SIERRA MADRE OCCIDENTAL', 'ALTI-PLANICIE MEXICANA', 'FRASER PLATEAU', 'COAST MOUNTAINS',
  'GREATER ANTILLES', 'BAHAMA ISLANDS', 'WEST INDIES', 'POLYNESIA', 'ALEUTIAN ISLANDS',
  'GREAT LAKES', 'FLORIDA', 'North Atlantic Ocean', 'North Pacific Ocean', 'Bering Sea',
  'Sargasso Sea', 'James Bay', 'Bay of Fundy', 'Gulf of Saint Lawrence', 'Golfo de California',
  'Columbia River', 'Straits of Florida',
  // Canadian and Mexican water that survives the distance test
  'Fraser R.', 'Fraser', 'Saint John', 'Lake Simcoe', 'Lago Madre', 'Rainy Lake', 'Rainy',
  'Lake of the Woods', 'Pit', 'Sprague',
]);

const CLASS_KIND = {
  'Range/mtn': 'range',
  Plateau: 'range',
  Plain: 'plain',
  Basin: 'plain',
  Desert: 'desert',
  Valley: 'plain',
  Gorge: 'range',
  Delta: 'plain',
  Foothills: 'range',
  'Pen/cape': 'plain',
  Tundra: 'plain',
};

/** Title case for the SHOUTED Natural Earth names, with the usual exceptions. */
function tidyName(name) {
  // Title case first: expanding the abbreviations introduces lower case and
  // would make the all-caps test below miss.
  let out = name;
  if (!/[a-z]/.test(out)) {
    out = out
      .toLowerCase()
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .replace(/\bOf\b/g, 'of');
  }
  return out
    .replace(/\bMts\.?$/i, 'Mountains')
    .replace(/\bPlat\.?$/i, 'Plateau')
    .replace(/\bMt\.?\b/i, 'Mount');
}

/*
 * Natural Earth's bounding box reaches well into Canada and Mexico, so
 * everything is checked against the actual state geometry. Lakes and rivers get
 * a tolerance: the Great Lakes sit off the shore, and border rivers like the
 * Rio Grande can land either side of the line.
 */
const STATES = (() => {
  // states.js holds three statements; take just the first array.
  const src = readFileSync('data/states.js', 'utf8');
  const m = src.match(/window\.US_STATES = (\[[\s\S]*?\]);\n/);
  if (!m) throw new Error('could not read data/states.js — run build-data.mjs first');
  return JSON.parse(m[1]);
})();

function nearUS(lon, lat, toleranceDeg) {
  for (const st of STATES) {
    for (const rings of st.polys) {
      if (pointInRings(lon, lat, rings)) return true;
    }
  }
  if (!toleranceDeg) return false;
  let best = Infinity;
  for (const st of STATES) {
    if (
      lon < st.bbox[0] - toleranceDeg || lon > st.bbox[2] + toleranceDeg ||
      lat < st.bbox[1] - toleranceDeg || lat > st.bbox[3] + toleranceDeg
    ) continue;
    for (const rings of st.polys) best = Math.min(best, edgeDistance(lon, lat, rings));
  }
  return best <= toleranceDeg;
}

const features = [];

/* regions: ranges, plateaus, plains, deserts */

function addRegions(collection, defaultTier) {
  if (!collection) return 0;
  let n = 0;
  for (const f of collection.features) {
    const p = f.properties;
    // The two scales disagree on case for the property names.
    const name = p.NAME || p.name;
    const cla = p.FEATURECLA || p.featurecla;
    if (!name || SKIP.has(name)) continue;
    const kind = CLASS_KIND[cla];
    if (!kind || !f.geometry) continue;

    const shapes =
      f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    // Largest ring wins for elongated multi-part ranges.
    let biggest = null;
    let bigArea = 0;
    for (const rings of shapes) {
      let a = 0;
      const r = rings[0];
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
      if (Math.abs(a / 2) > bigArea) { bigArea = Math.abs(a / 2); biggest = rings; }
    }
    if (!biggest) continue;

    const at = labelPoint(biggest);
    if (!at || !inBox(at[0], at[1]) || !nearUS(at[0], at[1], 0.4)) continue;

    const pa = principalAngle(biggest[0]);
    features.push({
      kind,
      name: tidyName(name),
      at: [round(at[0]), round(at[1])],
      angle: pa.elongation > 1.9 ? readableAngle(pa.angle) : 0,
      tier: TIER1.has(name) ? 1 : defaultTier,
      poly: simplify(biggest[0], 0.25),
    });
    n++;
  }
  return n;
}

// 10m goes first so its finer geometry wins the de-duplication. It is also
// where the state-identifying ranges live — Front Range, Wasatch, Blue Ridge,
// Adirondacks, Black Hills — which the 50m file is too coarse to carry.
const fine = addRegions(loadIf('ne_10m_geography_regions_polys'), 2);
const coarse = addRegions(load('ne_50m_geography_regions_polys'), 2);
console.log(`regions: ${fine} from 10m, ${coarse} from 50m (before de-duplication)`);

/* rivers: label set along the flow, ranked by how long the river actually is */

const RIVER_TIER1 = new Set([
  'Mississippi', 'Missouri', 'Ohio', 'Colorado', 'Columbia', 'Rio Grande', 'Arkansas',
  'Snake', 'Tennessee', 'Rio Bravo',
]);
const riverRuns = new Map(); // name -> { miles, runs }

function collectRiver(name, line) {
  const inside = line.filter(([lon, lat]) => inBox(lon, lat));
  if (inside.length < 6) return;
  const e = riverRuns.get(name) || { miles: 0, runs: [] };
  e.miles += runMiles(inside);
  e.runs.push(inside);
  riverRuns.set(name, e);
}

const rivers = load('ne_50m_rivers_lake_centerlines');
for (const f of rivers.features) {
  const p = f.properties;
  if (!p.name || SKIP.has(p.name) || (p.scalerank ?? 99) > 6) continue;
  if (/\bfork\b|\bbranch\b|\bdes\b/i.test(p.name)) continue;
  const lines =
    f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const line of lines) collectRiver(p.name, line);
}

// The 10m North America file is the tributary network. Its scalerank is a
// detail level, not importance, so length decides which tier a river lands in.
const extraRivers = loadIf('ne_10m_rivers_north_america');
if (extraRivers) {
  for (const f of extraRivers.features) {
    const p = f.properties;
    if (!f.geometry || !p.name || SKIP.has(p.name)) continue;
    if (/\bfork\b|\bbranch\b|\bdes\b/i.test(p.name)) continue;
    const lines =
      f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const line of lines) collectRiver(p.name, line);
  }
}

const MIN_RIVER_MILES = 120;
let riverCount = 0;
for (const [name, e] of riverRuns) {
  if (e.miles < MIN_RIVER_MILES) continue;
  // Label the longest continuous run, so the name sits on real water.
  const pts = e.runs.reduce((a, b) => (b.length > a.length ? b : a), e.runs[0]);
  if (pts.length < 6) continue;
  if (!nearUS(pts[Math.floor(pts.length / 2)][0], pts[Math.floor(pts.length / 2)][1], 0.35)) continue;

  const mid = Math.floor(pts.length / 2);
  const w = Math.max(2, Math.floor(pts.length * 0.06));
  const a = project(...pts[Math.max(0, mid - w)]);
  const b = project(...pts[Math.min(pts.length - 1, mid + w)]);

  const tier = RIVER_TIER1.has(name) ? 1 : e.miles >= 320 ? 2 : e.miles >= 200 ? 3 : 4;
  // Not everything on the river layer is a "River" — a Draw, Wash or Bayou
  // already names itself.
  const WATER_WORD = /(river|r\.|creek|draw|wash|bayou|slough|fork|brook|run|canal|arroyo|kill)$/i;
  features.push({
    kind: 'river',
    name: WATER_WORD.test(name) ? name : name + ' R.',
    at: [round(pts[mid][0]), round(pts[mid][1])],
    angle: readableAngle(Math.atan2(b[1] - a[1], b[0] - a[0])),
    tier,
  });
  riverCount++;
}
console.log(`rivers labelled: ${riverCount} of ${riverRuns.size} named`);

/* lakes */
const lakes = loadIf('ne_10m_lakes') || load('ne_50m_lakes');
let lakeCount = 0;
for (const f of lakes.features) {
  const name = f.properties.name;
  if (!name || SKIP.has(name) || !f.geometry) continue;
  const shapes = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const rings = shapes[0];
  let a = 0;
  const r = rings[0];
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  const area = Math.abs(a / 2);
  if (area < 0.004) continue;
  const at = labelPoint(rings);
  // 1.4 degrees keeps the Great Lakes, which sit off shore, without reaching
  // Nipigon or Winnipeg.
  if (!at || !inBox(at[0], at[1]) || !nearUS(at[0], at[1], 1.4)) continue;
  features.push({
    kind: 'lake',
    name,
    at: [round(at[0]), round(at[1])],
    angle: 0,
    tier: area > 3 ? 1 : area > 0.4 ? 2 : area > 0.06 ? 3 : 4,
  });
  lakeCount++;
}
console.log(`lakes: ${lakeCount}`);

/* gulfs, bays and sounds — 10m adds Puget Sound, Delaware Bay and friends */
for (const marine of [loadIf('ne_10m_geography_marine_polys'), load('ne_50m_geography_marine_polys')]) {
  if (!marine) continue;
  for (const f of marine.features) {
    const name = f.properties.name;
    if (!name || SKIP.has(name) || !f.geometry) continue;
    const shapes = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    const at = labelPoint(shapes[0]);
    if (!at || !inBox(at[0], at[1]) || !nearUS(at[0], at[1], 4.5)) continue;
    // The named ocean basins are tier 1; a bay is a local landmark.
    const big = /gulf|ocean|sea/i.test(f.properties.featurecla || '');
    features.push({ kind: 'sea', name, at: [round(at[0]), round(at[1])], angle: 0, tier: big ? 1 : 3 });
  }
}

/* peaks and capes: point features, kept for the zoomed-in view */

const peaks = loadIf('ne_10m_geography_regions_elevation_points') ||
  load('ne_50m_geography_regions_elevation_points');
let peakCount = 0;
for (const f of peaks.features) {
  const [lon, lat] = f.geometry.coordinates;
  if (!f.properties.name || !inBox(lon, lat) || !nearUS(lon, lat, 0.2)) continue;
  const elevation = f.properties.elevation || 0;
  features.push({
    kind: f.properties.featurecla === 'depression' ? 'low' : 'peak',
    name: f.properties.name,
    at: [round(lon), round(lat)],
    angle: 0,
    // The really big ones are landmarks; the rest wait for a deeper zoom.
    tier: elevation >= 4000 ? 2 : elevation >= 3000 ? 3 : 4,
    elev: elevation || null,
  });
  peakCount++;
}
console.log(`peaks: ${peakCount}`);

for (const points of [loadIf('ne_10m_geography_regions_points'), load('ne_50m_geography_regions_points')]) {
  if (!points) continue;
  for (const f of points.features) {
    const cla = f.properties.featurecla;
    if (cla !== 'cape' && cla !== 'waterfall') continue;
    const [lon, lat] = f.geometry.coordinates;
    if (!f.properties.name || !inBox(lon, lat) || !nearUS(lon, lat, 0.6)) continue;
    features.push({ kind: 'cape', name: f.properties.name, at: [round(lon), round(lat)], angle: 0, tier: 3 });
  }
}

/* national parks, from Wikidata */

let parkJson = null;
try {
  parkJson = JSON.parse(readFileSync(`${DIR}/parks.json`, 'utf8'));
} catch (e) {
  console.log('  (optional parks.json not found — skipping national parks)');
}
if (parkJson) {
  // Wikidata returns a row per statement, so the same park can appear twice.
  const seenPark = new Set();
  let parkCount = 0;
  for (const row of parkJson.results.bindings) {
    const m = row.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (!m) continue;
    const lon = +m[1];
    const lat = +m[2];
    const raw = row.parkLabel.value;
    const name = raw
      .replace(/ National Park and Preserve$/, ' NP')
      .replace(/ National Park$/, ' NP')
      .replace(/ National and State Parks$/, ' NP');
    if (seenPark.has(name)) continue;
    if (!inBox(lon, lat) || !nearUS(lon, lat, 0.3)) continue;
    seenPark.add(name);
    features.push({ kind: 'park', name, at: [round(lon), round(lat)], angle: 0, tier: 3 });
    parkCount++;
  }
  console.log(`national parks: ${parkCount}`);
}

/* volcanoes, from the Smithsonian Global Volcanism Program */

let volcanoJson = null;
try {
  volcanoJson = JSON.parse(readFileSync(`${DIR}/volcanoes.json`, 'utf8'));
} catch (e) {
  console.log('  (optional volcanoes.json not found — skipping volcanoes)');
}
if (volcanoJson) {
  let added = 0;
  let upgraded = 0;
  for (const f of volcanoJson.features) {
    const [lon, lat] = f.geometry.coordinates;
    if (!inBox(lon, lat) || !nearUS(lon, lat, 0.2)) continue;
    const p = f.properties;
    const elevation = p.Elevation || 0;

    // Many Cascade volcanoes are already in the peak list under a different
    // form of the name ("Mount Rainier" vs "Rainier"), so match on position and
    // promote the existing label rather than printing both.
    const near = features.find(
      (x) => x.kind === 'peak' && Math.hypot(x.at[0] - lon, x.at[1] - lat) < 0.15
    );
    if (near) {
      near.kind = 'volcano';
      upgraded++;
      continue;
    }
    features.push({
      kind: 'volcano',
      name: p.Volcano_Name,
      at: [round(lon), round(lat)],
      angle: 0,
      tier: elevation >= 3000 ? 2 : elevation >= 1500 ? 3 : 4,
      elev: elevation || null,
    });
    added++;
  }
  console.log(`volcanoes: ${added} added, ${upgraded} peaks promoted`);
}

/* national monuments (curated subset) */
let monAdded = 0;
for (const m of MONUMENTS) {
  if (!inBox(m.lon, m.lat) || !nearUS(m.lon, m.lat, 0.2)) continue;
  features.push({
    kind: 'monument',
    name: m.name,
    at: [round(m.lon), round(m.lat)],
    angle: 0,
    tier: 2,
  });
  monAdded++;
}
console.log(`monuments: ${monAdded}`);

/* the Continental Divide, from OpenStreetMap natural=divide ways */

const divideChains = [];
const divideFiles = readdirSync(DIR).filter((f) => /^divide.*\.json$/.test(f));
if (divideFiles.length) {
  let ways = [];
  for (const file of divideFiles) {
    let d;
    try {
      d = JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8'));
    } catch (e) {
      // A timed-out Overpass request lands as an XML error page.
      console.log(`  (skipping ${file} — not JSON)`);
      continue;
    }
    for (const e of d.elements || []) {
      if (!e.geometry || e.geometry.length < 2) continue;
      if (!/contin/i.test((e.tags && e.tags.name) || '')) continue;
      const pts = e.geometry.map((g) => [g.lon, g.lat]).filter(([lon, lat]) => inBox(lon, lat));
      if (pts.length > 1) ways.push(pts);
    }
  }

  /*
   * OSM holds the divide as a few hundred separate ways. Joining them where
   * their endpoints meet turns it back into long continuous lines, which both
   * draws better (dashes flow) and gives somewhere sensible to put the label.
   */
  const key = (pt) => pt[0].toFixed(4) + ',' + pt[1].toFixed(4);
  const open = new Map();
  for (const w of ways) {
    const a = key(w[0]);
    const b = key(w[w.length - 1]);
    (open.get(a) || open.set(a, []).get(a)).push({ w, atStart: true });
    (open.get(b) || open.set(b, []).get(b)).push({ w, atStart: false });
  }
  const used = new Set();
  for (const w of ways) {
    if (used.has(w)) continue;
    used.add(w);
    const chain = w.slice();
    // Extend from both ends for as long as something connects.
    for (let dir = 0; dir < 2; dir++) {
      for (;;) {
        const end = dir === 0 ? chain[chain.length - 1] : chain[0];
        const cands = (open.get(key(end)) || []).filter((c) => !used.has(c.w));
        if (!cands.length) break;
        const next = cands[0];
        used.add(next.w);
        const seg = next.atStart ? next.w.slice(1) : next.w.slice(0, -1).reverse();
        if (dir === 0) chain.push(...seg);
        else chain.unshift(...seg.reverse());
      }
    }
    divideChains.push(chain);
  }

  divideChains.sort((a, b) => b.length - a.length);
  const thinned = divideChains
    .map((c) => simplify(c, 0.012))
    .filter((c) => c.length >= 4);
  divideChains.length = 0;
  divideChains.push(...thinned);

  const longest = divideChains[0];
  if (longest) {
    const mid = Math.floor(longest.length / 2);
    const w = Math.max(2, Math.floor(longest.length * 0.04));
    const a = project(...longest[Math.max(0, mid - w)]);
    const b = project(...longest[Math.min(longest.length - 1, mid + w)]);
    features.push({
      kind: 'divide',
      name: 'Continental Divide',
      at: [round(longest[mid][0]), round(longest[mid][1])],
      angle: readableAngle(Math.atan2(b[1] - a[1], b[0] - a[0])),
      tier: 2,
    });
  }
  const pts = divideChains.reduce((n, c) => n + c.length, 0);
  console.log(`continental divide: ${ways.length} ways -> ${divideChains.length} chains, ${pts} points`);
}

// "Fort Peck Lake" and "Ft. Peck Lake" are the same lake twice.
const norm = (n) => n.toLowerCase().replace(/\bft\.?\b/g, 'fort').replace(/[^a-z]/g, '');
const kept = new Map();
for (const f of features) {
  const key = f.kind + '|' + norm(f.name);
  if (!kept.has(key) || kept.get(key).tier > f.tier) kept.set(key, f);
}
features.length = 0;
features.push(...kept.values());

/*
 * Draw order is priority order: the first label to claim a patch of map keeps
 * it. The headline features are ranked by hand — losing "Appalachian Mountains"
 * to "Coastal Plain" because they happened to overlap is the wrong trade.
 */
const MARQUEE = [
  'Mississippi R.', 'Rocky Mountains', 'Appalachian Mountains', 'Great Plains', 'Great Basin',
  'Missouri R.', 'Ohio R.', 'Sierra Nevada', 'Cascade Range', 'Gulf of Mexico',
  'Colorado Plateau', 'Colorado R.', 'Columbia R.', 'Rio Grande R.', 'Lake Michigan',
  'Lake Superior', 'Lake Huron', 'Central Valley', 'Ozark Plateau', 'Coast Ranges',
  'Snake R.', 'Arkansas R.', 'Tennessee R.', 'Chesapeake Bay', 'Coastal Plain',
  'Central Lowland', 'Gulf of Maine',
];
const KIND_RANK = { divide: 0, river: 1, range: 2, lake: 3, sea: 4, desert: 5, plain: 6, volcano: 7, peak: 8, low: 8, monument: 9, park: 10, cape: 11 };
const rank = (f) => {
  const i = MARQUEE.indexOf(f.name);
  return i === -1 ? 100 + (KIND_RANK[f.kind] ?? 9) : i;
};
features.sort((a, b) => a.tier - b.tier || rank(a) - rank(b) || a.name.localeCompare(b.name));

const byKind = {};
for (const f of features) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
console.log('features:', features.length, JSON.stringify(byKind));
for (const t of [1, 2, 3, 4]) {
  console.log(`  tier ${t}: ` + features.filter((f) => f.tier === t).map((f) => f.name).join(', '));
}

writeFileSync(
  'data/features.js',
  `window.US_FEATURES = ${JSON.stringify(features)};\n` +
    `window.US_DIVIDE = ${JSON.stringify(divideChains)};\n`
);
console.log('wrote data/features.js');
