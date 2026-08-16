/* Albers equal-area conic projection tuned for the lower 48, plus the small
   amount of geometry the game needs. No dependencies. */
(function () {
  'use strict';

  var RAD = Math.PI / 180;
  var LON0 = -96;
  var LAT0 = 37.5;
  var LAT1 = 29.5 * RAD;
  var LAT2 = 45.5 * RAD;

  var n = (Math.sin(LAT1) + Math.sin(LAT2)) / 2;
  var C = Math.cos(LAT1) * Math.cos(LAT1) + 2 * n * Math.sin(LAT1);
  var rho0 = Math.sqrt(C - 2 * n * Math.sin(LAT0 * RAD)) / n;

  /* Projected units. y already points down, matching screen convention. */
  function project(lon, lat) {
    var theta = n * (lon - LON0) * RAD;
    var rho = Math.sqrt(C - 2 * n * Math.sin(lat * RAD)) / n;
    return [rho * Math.sin(theta), -(rho0 - rho * Math.cos(theta))];
  }

  function invert(x, yDown) {
    var y = -yDown;
    var dy = rho0 - y;
    var rho = Math.sqrt(x * x + dy * dy);
    var theta = Math.atan2(x, dy);
    var lat = Math.asin((C - rho * rho * n * n) / (2 * n)) / RAD;
    var lon = LON0 + theta / n / RAD;
    return [lon, lat];
  }

  /* Great-circle distance in statute miles. */
  function milesBetween(lon1, lat1, lon2, lat2) {
    var R = 3958.8;
    var dLat = (lat2 - lat1) * RAD;
    var dLon = (lon2 - lon1) * RAD;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /* Compass word for the direction of (to) as seen from (from). */
  function compass(fromLon, fromLat, toLon, toLat) {
    var dx = toLon - fromLon;
    var dy = toLat - fromLat;
    var names = ['east', 'northeast', 'north', 'northwest', 'west', 'southwest', 'south', 'southeast'];
    var i = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    return names[((i % 8) + 8) % 8];
  }

  /* Ray casting over every ring at once; parity handles holes correctly. */
  function pointInRings(x, y, rings) {
    var inside = false;
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r];
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var xi = ring[i][0];
        var yi = ring[i][1];
        var xj = ring[j][0];
        var yj = ring[j][1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    return inside;
  }

  function pointInPolys(x, y, polys) {
    for (var i = 0; i < polys.length; i++) {
      if (pointInRings(x, y, polys[i])) return true;
    }
    return false;
  }

  /* Closest point on a segment, written into out. */
  function closestOnSegment(px, py, ax, ay, bx, by, out) {
    var dx = bx - ax;
    var dy = by - ay;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    out[0] = ax + t * dx;
    out[1] = ay + t * dy;
    return Math.hypot(px - out[0], py - out[1]);
  }

  /* Nearest point on a state's outline: {x, y, dist}. */
  function nearestOnPolys(px, py, polys) {
    var best = { x: 0, y: 0, dist: Infinity };
    var tmp = [0, 0];
    for (var p = 0; p < polys.length; p++) {
      var rings = polys[p];
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          var d = closestOnSegment(px, py, ring[j][0], ring[j][1], ring[i][0], ring[i][1], tmp);
          if (d < best.dist) {
            best.dist = d;
            best.x = tmp[0];
            best.y = tmp[1];
          }
        }
      }
    }
    return best;
  }

  window.Geo = {
    project: project,
    invert: invert,
    milesBetween: milesBetween,
    compass: compass,
    pointInPolys: pointInPolys,
    nearestOnPolys: nearestOnPolys,
  };
})();
