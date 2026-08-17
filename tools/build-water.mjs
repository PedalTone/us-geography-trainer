/**
 * Build script: extracts the rivers and lakes layer.
 *
 *   node tools/build-water.mjs <rivers.geojson> <lakes.geojson> [rivers_north_america.geojson]
 *
 * Source: Natural Earth (public domain), via
 * https://github.com/nvkelso/natural-earth-vector
 *
 * The 50m centrelines carry the main stems — Mississippi, Missouri, Ohio — and
 * the optional 10m North America file adds the tributary network. That second
 * file is detail rather than importance (its scalerank puts the Mississippi
 * last), so tributaries are ranked by their own length instead, which is what
 * decides how heavily they are drawn.
 *
 * Output is data/water.js. Like the other data files it is committed, so the
 * game itself has no build step.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [riversPath, lakesPath, extraRiversPath] = process.argv.slice(2);

const R_MILES = 3958.8;
const RAD = Math.PI / 180;
const milesBetween = (a, b) => {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
};
const runMiles = (pts) => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += milesBetween(pts[i - 1], pts[i]);
  return d;
};

// Tributaries shorter than this are left out; below it the map turns to fuzz
// and the file doubles in size.
const MIN_TRIBUTARY_MILES = 120;

/* Drops points closer together than the tolerance — plenty for a backdrop. */
function thin(pts, tol) {
  const out = [pts[0]];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) >= tol) out.push(p);
  }
  if (out.length < 2) return pts;
  const end = pts[pts.length - 1];
  const last = out[out.length - 1];
  if (last[0] !== end[0] || last[1] !== end[1]) out.push(end);
  return out;
}

// A little wider than the lower 48 so rivers run to the coast and border.
const BOX = { w: -126.5, e: -65.5, s: 23.5, n: 50.5 };
const round = (v) => Math.round(v * 1e3) / 1e3; // ~110 m, plenty for a backdrop

const inBox = ([x, y]) => x >= BOX.w && x <= BOX.e && y >= BOX.s && y <= BOX.n;

/* Split a line at the box edge so we keep the parts that cross the country
   without dragging the rest of the continent along. */
function clipLine(coords) {
  const runs = [];
  let run = [];
  for (const pt of coords) {
    if (inBox(pt)) {
      run.push([round(pt[0]), round(pt[1])]);
    } else if (run.length) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/* ---- rivers ---------------------------------------------------------- */

const riversGeo = JSON.parse(readFileSync(riversPath, 'utf8'));
const rivers = [];
for (const f of riversGeo.features) {
  const p = f.properties || {};
  // scalerank rises as rivers get smaller; past 8 it is creeks.
  if ((p.scalerank ?? 99) > 8) continue;
  const geoms = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const line of geoms) {
    for (const run of clipLine(line)) {
      rivers.push({ r: p.scalerank ?? 8, pts: run });
    }
  }
}

/* ---- lakes ----------------------------------------------------------- */

const lakesGeo = JSON.parse(readFileSync(lakesPath, 'utf8'));
const lakes = [];
for (const f of lakesGeo.features) {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const rings of polys) {
    const outer = rings[0];
    if (!outer.some(inBox)) continue;
    // Rough area in square degrees; drops ponds that would render as a speck.
    let a = 0;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
      a += outer[j][0] * outer[i][1] - outer[i][0] * outer[j][1];
    }
    if (Math.abs(a / 2) < 0.02) continue;
    lakes.push(rings.map((r) => r.map((pt) => [round(pt[0]), round(pt[1])])));
  }
}

/* ---- tributaries from the 10m North America supplement --------------- */

if (extraRiversPath) {
  const extra = JSON.parse(readFileSync(extraRiversPath, 'utf8'));
  const byName = new Map();
  for (const f of extra.features) {
    if (!f.geometry || !f.properties.name) continue; // a few features have null geometry
    const geoms =
      f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const line of geoms) {
      for (const run of clipLine(line)) {
        const e = byName.get(f.properties.name) || { miles: 0, runs: [] };
        e.miles += runMiles(run);
        e.runs.push(run);
        byName.set(f.properties.name, e);
      }
    }
  }

  let added = 0;
  for (const [name, e] of byName) {
    if (e.miles < MIN_TRIBUTARY_MILES) continue;
    // 6 draws mid-weight, 7 hairline — main stems stay at 4 and below.
    const rank = e.miles >= 300 ? 6 : 7;
    for (const run of e.runs) {
      // Hairlines at 3 km spacing gain nothing from metre precision; two
      // decimals shaves a fifth off the file.
      const pts = thin(run, 0.03).map((p) => [
        Math.round(p[0] * 100) / 100,
        Math.round(p[1] * 100) / 100,
      ]);
      if (pts.length > 1) {
        rivers.push({ r: rank, pts });
        added++;
      }
    }
  }
  console.log(`tributaries: ${byName.size} named, ${added} segments kept (>= ${MIN_TRIBUTARY_MILES} mi)`);
}

console.log(`rivers: ${rivers.length} segments, lakes: ${lakes.length}`);
const named = riversGeo.features
  .filter((f) => (f.properties.scalerank ?? 99) <= 5 && f.properties.name)
  .map((f) => f.properties.name);
console.log('major named rivers in source:', [...new Set(named)].slice(0, 12).join(', '));

writeFileSync(
  'data/water.js',
  `window.US_RIVERS = ${JSON.stringify(rivers)};\nwindow.US_LAKES = ${JSON.stringify(lakes)};\n`
);
console.log('wrote data/water.js');
