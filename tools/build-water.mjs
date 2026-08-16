/**
 * Build script: extracts the rivers and lakes layer.
 *
 *   node tools/build-water.mjs <ne_50m_rivers_lake_centerlines.geojson> <ne_50m_lakes.geojson>
 *
 * Source: Natural Earth 50m (public domain), via
 * https://github.com/nvkelso/natural-earth-vector
 *
 * Output is data/water.js. Like the other data files it is committed, so the
 * game itself has no build step.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [riversPath, lakesPath] = process.argv.slice(2);

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
