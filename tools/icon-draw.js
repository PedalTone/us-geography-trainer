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

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = 30 * S;
  ctx.shadowOffsetY = 10 * S;
  ctx.fillStyle = landFill;
  ctx.fill(path, 'evenodd');
  ctx.restore();

  // Gold rim, the app's accent, to crisp the coastline at small sizes. Drawn
  // from the coastline, not the state rings, so interior borders stay unlined.
  var rim = new Path2D();
  outline.forEach(function (line) {
    line.forEach(function (p, j) {
      var x = p[0] * k + tx, y = p[1] * k + ty;
      if (j === 0) rim.moveTo(x, y); else rim.lineTo(x, y);
    });
  });
  ctx.save();
  ctx.strokeStyle = '#e2b558';
  ctx.lineWidth = Math.max(1, 6 * S);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(rim);
  ctx.restore();

  // A quiz mark parked in the Atlantic, where a real map has open ocean. Kept
  // off the diagonal corner, since iOS masks the icon to a squircle.
  if (variant === 'ask') {
    ctx.save();
    ctx.fillStyle = '#e2b558';
    ctx.font = '800 ' + Math.round(250 * S) + 'px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 24 * S;
    ctx.fillText('?', size * 0.845, size * 0.815);
    ctx.restore();
  }

  return c;
}
