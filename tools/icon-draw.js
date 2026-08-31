/* Home-screen icon, drawn from the app's own CONUS geometry so the coastline
   is the real one rather than a traced approximation.

   Shared by icon.html (interactive preview of the variants) and
   icon-render.html (the page the build screenshots). Requires data/states.js
   and js/geo.js to be loaded first. */
function drawIcon(size, variant) {
  // The landmass is the union of the state polygons — the same source the map
  // fills from. US_OUTLINE is coast + border + lake shores and does not
  // enclose a fillable area on its own, so it is used only for the rim.
  var rings = [];
  var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };

  function addRing(ring) {
    var out = ring.map(function (pt) { return Geo.project(pt[0], pt[1]); });
    out.forEach(function (p) {
      if (p[0] < b.x0) b.x0 = p[0];
      if (p[0] > b.x1) b.x1 = p[0];
      if (p[1] < b.y0) b.y0 = p[1];
      if (p[1] > b.y1) b.y1 = p[1];
    });
    rings.push(out);
  }

  US_STATES.forEach(function (s) {
    s.polys.forEach(function (poly) { poly.forEach(addRing); });
  });
  (window.US_EXTRA_LAND || []).forEach(function (polys) {
    polys.forEach(function (poly) { poly.forEach(addRing); });
  });

  var outline = US_OUTLINE.map(function (line) {
    return line.map(function (p) { return Geo.project(p[0], p[1]); });
  });

  var c = document.createElement('canvas');
  c.width = c.height = size;
  var ctx = c.getContext('2d');
  var S = size / 1024; // authored at 1024

  // Ground: the app's own night-sky backdrop.
  var bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#1b2d43');
  bg.addColorStop(0.55, '#0d1219');
  bg.addColorStop(1, '#070c11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Warm halo so the landmass separates from the ground at any size.
  var glow = ctx.createRadialGradient(size / 2, size * 0.5, 0, size / 2, size * 0.5, size * 0.55);
  glow.addColorStop(0, 'rgba(226,181,88,.20)');
  glow.addColorStop(1, 'rgba(226,181,88,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // iOS masks to a squircle, so inset generously — nothing vital near a corner.
  var pad = size * 0.175;
  var k = Math.min((size - pad * 2) / (b.x1 - b.x0), (size - pad * 2) / (b.y1 - b.y0));
  var tx = (size - (b.x1 - b.x0) * k) / 2 - b.x0 * k;
  var ty = (size - (b.y1 - b.y0) * k) / 2 - b.y0 * k;

  var path = new Path2D();
  rings.forEach(function (ring) {
    ring.forEach(function (p, j) {
      var x = p[0] * k + tx, y = p[1] * k + ty;
      if (j === 0) path.moveTo(x, y); else path.lineTo(x, y);
    });
    path.closePath();
  });

  // The land carries the map's own hypsometric tint — dry tan in the west,
  // green in the east — so the icon is a small piece of the map itself.
  var landFill = ctx.createLinearGradient(pad, 0, size - pad, 0);
  landFill.addColorStop(0.00, '#cbb47a');
  landFill.addColorStop(0.38, '#c2bb7e');
  landFill.addColorStop(0.70, '#8fae63');
  landFill.addColorStop(1.00, '#7ba45d');

  var rim = new Path2D();
  outline.forEach(function (line) {
    line.forEach(function (p, j) {
      var x = p[0] * k + tx, y = p[1] * k + ty;
      if (j === 0) rim.moveTo(x, y); else rim.lineTo(x, y);
    });
  });

  // The land is built on its own layer so the question mark can be punched
  // clean through it. Gold on the tan-and-green fill would barely register;
  // a void that shows the night sky behind it reads at any size.
  var layer = document.createElement('canvas');
  layer.width = layer.height = size;
  var lc = layer.getContext('2d');

  lc.fillStyle = landFill;
  lc.fill(path, 'evenodd');

  // Gold rim, the app's accent, to crisp the coastline at small sizes. Drawn
  // from the coastline, not the state rings, so interior borders stay unlined.
  lc.strokeStyle = '#e2b558';
  lc.lineWidth = Math.max(1, 6 * S);
  lc.lineJoin = 'round';
  lc.lineCap = 'round';
  lc.stroke(rim);

  if (variant === 'ask') {
    lc.save();
    lc.globalCompositeOperation = 'destination-out';
    lc.font = '900 ' + Math.round(405 * S) + 'px system-ui, -apple-system, sans-serif';
    lc.textAlign = 'center';
    lc.textBaseline = 'middle';
    // Centred on the landmass rather than on the canvas: the bounding box runs
    // out to Maine, which pulls its centre right of where the country looks
    // centred.
    lc.fillText('?', size * 0.515, size * 0.498);
    lc.restore();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = 30 * S;
  ctx.shadowOffsetY = 10 * S;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();

  return c;
}
