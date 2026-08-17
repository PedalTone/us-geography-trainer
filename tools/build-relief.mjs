/**
 * Build script: renders the shaded-relief backdrop, data/relief.png.
 *
 *   node tools/build-relief.mjs [--zoom 6] [--width 1920]
 *
 * Elevation comes from the public AWS "terrarium" terrain tiles
 * (https://registry.opendata.aws/terrain-tiles/, no key required), which are
 * Web Mercator. The game draws in Albers, so every output pixel is inverse
 * projected to lon/lat and sampled from the Mercator grid — the result lines up
 * with the map exactly and can be drawn as a single image.
 *
 * Output is an 8-bit greyscale PNG where 128 is flat ground; the canvas paints
 * it over the land with an overlay blend, so lighter is sunlit or high and
 * darker is shaded. Keeping flat ground at exactly 128 is what stops the blend
 * from tinting the whole country.
 *
 * Tiles are cached in tools/.cache so re-runs are cheap. Only needed if you
 * want to regenerate the relief — the PNG is committed.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const args = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : Number(args[i + 1]);
};
const ZOOM = argOf('--zoom', 6);
const OUT_W = argOf('--width', 1920);
const CACHE = new URL('./.cache/', import.meta.url).pathname;

/* ---- PNG ------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decodes an 8-bit RGB(A) non-interlaced PNG into {width, height, bpp, data}. */
function decodePNG(buf) {
  let pos = 8; // skip signature
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8) throw new Error('expected 8-bit PNG');
      colorType = body[9];
      if (body[12] !== 0) throw new Error('interlaced PNG not supported');
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  const bpp = colorType === 2 ? 3 : colorType === 6 ? 4 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      cur[x] = v & 0xff;
    }
  }
  return { width, height, bpp, data: out };
}

/** Encodes 8-bit greyscale. Picks the cheapest of three row filters. */
function encodeGrayPNG(width, height, gray) {
  const rows = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    const src = gray.subarray(y * width, (y + 1) * width);
    const prev = y ? gray.subarray((y - 1) * width, y * width) : null;
    const cand = [];
    // 0: none, 1: sub, 2: up
    cand.push({ f: 0, line: Buffer.from(src) });
    const sub = Buffer.alloc(width);
    for (let x = 0; x < width; x++) sub[x] = (src[x] - (x ? src[x - 1] : 0)) & 0xff;
    cand.push({ f: 1, line: sub });
    if (prev) {
      const up = Buffer.alloc(width);
      for (let x = 0; x < width; x++) up[x] = (src[x] - prev[x]) & 0xff;
      cand.push({ f: 2, line: up });
    }
    let best = cand[0];
    let bestScore = Infinity;
    for (const c of cand) {
      let s = 0;
      for (let x = 0; x < width; x++) s += Math.min(c.line[x], 256 - c.line[x]);
      if (s < bestScore) {
        bestScore = s;
        best = c;
      }
    }
    rows[y * (width + 1)] = best.f;
    best.line.copy(rows, y * (width + 1) + 1);
  }

  const chunk = (type, body) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'ascii');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- projections ----------------------------------------------------- */

const RAD = Math.PI / 180;
const LON0 = -96;
const LAT0 = 37.5;
const nAlb = (Math.sin(29.5 * RAD) + Math.sin(45.5 * RAD)) / 2;
const CAlb = Math.cos(29.5 * RAD) ** 2 + 2 * nAlb * Math.sin(29.5 * RAD);
const rho0 = Math.sqrt(CAlb - 2 * nAlb * Math.sin(LAT0 * RAD)) / nAlb;

function albersInvert(x, yDown) {
  const y = -yDown;
  const dy = rho0 - y;
  const rho = Math.sqrt(x * x + dy * dy);
  const theta = Math.atan2(x, dy);
  const lat = Math.asin((CAlb - rho * rho * nAlb * nAlb) / (2 * nAlb)) / RAD;
  const lon = LON0 + theta / nAlb / RAD;
  return [lon, lat];
}

const lonToTileX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const latToTileY = (lat, z) =>
  ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** z;

/* ---- fetch the elevation grid ---------------------------------------- */

const BOX = { w: -126.5, e: -65.5, s: 23.0, n: 50.5 };
const x0 = Math.floor(lonToTileX(BOX.w, ZOOM));
const x1 = Math.floor(lonToTileX(BOX.e, ZOOM));
const y0 = Math.floor(latToTileY(BOX.n, ZOOM));
const y1 = Math.floor(latToTileY(BOX.s, ZOOM));
const cols = x1 - x0 + 1;
const rows = y1 - y0 + 1;
const TILE = 256;
const gw = cols * TILE;
const gh = rows * TILE;

console.log(`zoom ${ZOOM}: tiles x ${x0}..${x1}, y ${y0}..${y1} (${cols * rows} tiles, grid ${gw}x${gh})`);

if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
const elev = new Float32Array(gw * gh);

let fetched = 0;
for (let ty = y0; ty <= y1; ty++) {
  for (let tx = x0; tx <= x1; tx++) {
    const file = `${CACHE}terrarium-${ZOOM}-${tx}-${ty}.png`;
    let buf;
    if (existsSync(file)) {
      buf = readFileSync(file);
    } else {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} -> ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      fetched++;
    }
    const img = decodePNG(buf);
    const ox = (tx - x0) * TILE;
    const oy = (ty - y0) * TILE;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const i = (y * img.width + x) * img.bpp;
        // terrarium: (R * 256 + G + B / 256) - 32768 metres
        elev[(oy + y) * gw + ox + x] =
          img.data[i] * 256 + img.data[i + 1] + img.data[i + 2] / 256 - 32768;
      }
    }
  }
}
console.log(`tiles: ${fetched} downloaded, ${cols * rows - fetched} from cache`);

/* ---- resample into Albers -------------------------------------------- */

// Same bounds the game fits the map to, so the image aligns with the geometry.
const BOUNDS = { x0: -0.3689, y0: -0.2448, x1: 0.3532, y1: 0.2095 };
const OUT_H = Math.round((OUT_W * (BOUNDS.y1 - BOUNDS.y0)) / (BOUNDS.x1 - BOUNDS.x0));
const height = new Float32Array(OUT_W * OUT_H);

function sampleElev(lon, lat) {
  const fx = (lonToTileX(lon, ZOOM) - x0) * TILE;
  const fy = (latToTileY(lat, ZOOM) - y0) * TILE;
  if (fx < 0 || fy < 0 || fx >= gw - 1 || fy >= gh - 1) return 0;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const dx = fx - ix;
  const dy = fy - iy;
  const a = elev[iy * gw + ix];
  const b = elev[iy * gw + ix + 1];
  const c = elev[(iy + 1) * gw + ix];
  const d = elev[(iy + 1) * gw + ix + 1];
  return a * (1 - dx) * (1 - dy) + b * dx * (1 - dy) + c * (1 - dx) * dy + d * dx * dy;
}

for (let py = 0; py < OUT_H; py++) {
  const wy = BOUNDS.y0 + ((py + 0.5) / OUT_H) * (BOUNDS.y1 - BOUNDS.y0);
  for (let px = 0; px < OUT_W; px++) {
    const wx = BOUNDS.x0 + ((px + 0.5) / OUT_W) * (BOUNDS.x1 - BOUNDS.x0);
    const [lon, lat] = albersInvert(wx, wy);
    height[py * OUT_W + px] = sampleElev(lon, lat);
  }
}

/* ---- hillshade ------------------------------------------------------- */

// Ground distance per output pixel, from the map's real width.
const R = 6371000;
const spanMetres = (BOX.e - BOX.w) * RAD * R * Math.cos(38 * RAD);
const cell = spanMetres / OUT_W;
const Z_FACTOR = 3.6; // continental view needs vertical exaggeration to read
const AZ = (315 - 90) * RAD;
const ZENITH = (90 - 45) * RAD;

const gray = Buffer.alloc(OUT_W * OUT_H);
const at = (x, y) => height[Math.min(OUT_H - 1, Math.max(0, y)) * OUT_W + Math.min(OUT_W - 1, Math.max(0, x))];

for (let y = 0; y < OUT_H; y++) {
  for (let x = 0; x < OUT_W; x++) {
    const a = at(x - 1, y - 1), b = at(x, y - 1), c = at(x + 1, y - 1);
    const d = at(x - 1, y), f = at(x + 1, y);
    const g = at(x - 1, y + 1), h = at(x, y + 1), i = at(x + 1, y + 1);
    const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / (8 * cell);
    const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / (8 * cell);
    const slope = Math.atan(Z_FACTOR * Math.hypot(dzdx, dzdy));
    const aspect = Math.atan2(dzdy, -dzdx);
    let hs =
      Math.cos(ZENITH) * Math.cos(slope) + Math.sin(ZENITH) * Math.sin(slope) * Math.cos(AZ - aspect);
    hs = Math.max(0, Math.min(1, hs));

    // A little hypsometric lift so high ground reads as high even where it is
    // flat — the plains rising into the Rockies is a landmark in itself.
    const el = Math.max(0, height[y * OUT_W + x]);
    const lift = Math.min(1, el / 3200) * 0.18;

    // Flat ground must land on neutral grey (128) or the soft-light blend
    // tints the whole country. FLAT is the hillshade value of level terrain.
    const FLAT = Math.cos(ZENITH);
    const v = 0.5 + (hs - FLAT) * 1.45 + lift;
    // Quantising costs nothing visually and shrinks the PNG substantially:
    // flat country collapses to a single repeated value.
    gray[y * OUT_W + x] = Math.max(0, Math.min(255, Math.round((v * 255) / 2) * 2));
  }
}

const png = encodeGrayPNG(OUT_W, OUT_H, gray);
writeFileSync('data/relief.png', png);
// The renderer needs the exact projected rectangle this image covers, or the
// relief drifts against the coastline.
writeFileSync(
  'data/relief.js',
  `window.US_RELIEF = ${JSON.stringify({ src: 'data/relief.png?v=8', bounds: BOUNDS })};\n`
);
console.log(`wrote data/relief.png (${OUT_W}x${OUT_H}, ${(png.length / 1024).toFixed(0)} KB) and data/relief.js`);
