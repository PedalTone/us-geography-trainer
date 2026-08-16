/* Canvas map: projects the state data once, then fits and draws it. Owns all
   hit-testing so the game logic can stay in lon/lat and state names. */
(function () {
  'use strict';

  var PAD = 14;

  function MapView(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // Projected (not yet fitted) geometry, computed once.
    this.states = window.US_STATES.map(function (s) {
      var polys = s.polys.map(function (rings) {
        return rings.map(function (ring) {
          return ring.map(function (pt) {
            return window.Geo.project(pt[0], pt[1]);
          });
        });
      });
      return {
        name: s.name,
        abbr: s.abbr,
        polys: polys,
        anchor: window.Geo.project(s.anchor[0], s.anchor[1]),
        anchorLonLat: s.anchor,
      };
    });

    this.byName = {};
    this.states.forEach(function (s) {
      this.byName[s.name] = s;
    }, this);

    // Coastline + national border + Great Lakes shores, with no interior
    // state lines: the only thing shown in the borderless mode.
    this.outline = (window.US_OUTLINE || []).map(function (line) {
      return line.map(function (pt) {
        return window.Geo.project(pt[0], pt[1]);
      });
    });

    // Land that is drawn but never asked about (DC).
    this.extraLand = (window.US_EXTRA_LAND || []).map(function (polys) {
      return polys.map(function (rings) {
        return rings.map(function (ring) {
          return ring.map(function (pt) {
            return window.Geo.project(pt[0], pt[1]);
          });
        });
      });
    });

    // Rivers and lakes, projected once like everything else.
    this.rivers = (window.US_RIVERS || []).map(function (r) {
      return {
        rank: r.r,
        pts: r.pts.map(function (pt) {
          return window.Geo.project(pt[0], pt[1]);
        }),
      };
    });
    this.lakes = (window.US_LAKES || []).map(function (rings) {
      return rings.map(function (ring) {
        return ring.map(function (pt) {
          return window.Geo.project(pt[0], pt[1]);
        });
      });
    });

    this.terrain = true;
    this.reliefReady = false;
    if (window.US_RELIEF) {
      var self = this;
      this.relief = new Image();
      this.relief.onload = function () {
        self.reliefReady = true;
        self.requestDraw();
      };
      this.relief.src = window.US_RELIEF.src;
    }

    this.cities = window.US_CITIES;
    this.bounds = this.computeBounds();
    this.k = 1;
    this.tx = 0;
    this.ty = 0;
    // Zoom/pan layered on top of the fit-to-canvas transform.
    this.view = { s: 1, dx: 0, dy: 0 };
    this.onTap = null;
    this.onViewChange = null;

    // Draw state, owned by the game.
    this.mode = 'states';
    this.solved = {};          // name/label -> true
    this.missed = {};          // name/label -> true
    this.activeCities = [];    // city objects in play (cities mode)
    this.reveals = [];         // { name, t0, kind }
    this.markers = [];         // { x, y, t0, kind }  projected coords
    this.animating = false;
  }

  MapView.prototype.computeBounds = function () {
    var x0 = Infinity;
    var y0 = Infinity;
    var x1 = -Infinity;
    var y1 = -Infinity;
    this.states.forEach(function (s) {
      s.polys.forEach(function (rings) {
        rings[0].forEach(function (p) {
          if (p[0] < x0) x0 = p[0];
          if (p[0] > x1) x1 = p[0];
          if (p[1] < y0) y0 = p[1];
          if (p[1] > y1) y1 = p[1];
        });
      });
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  };

  /* Re-fits whenever the canvas actually changes size — a page that loads in a
     background tab starts at 0x0, and a one-shot resize would never recover. */
  MapView.prototype.watchSize = function () {
    var self = this;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        self.resize();
      }).observe(this.canvas);
    }
    window.addEventListener('resize', function () {
      self.resize();
    });
    this.resize();
  };

  MapView.prototype.ready = function () {
    return !!this.baseK;
  };

  MapView.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.w = rect.width;
    this.h = rect.height;

    var b = this.bounds;
    this.baseK = Math.min((this.w - PAD * 2) / (b.x1 - b.x0), (this.h - PAD * 2) / (b.y1 - b.y0));
    this.baseTx = (this.w - (b.x1 - b.x0) * this.baseK) / 2 - b.x0 * this.baseK;
    this.baseTy = (this.h - (b.y1 - b.y0) * this.baseK) / 2 - b.y0 * this.baseK;
    this.applyView();
    this.draw();
  };

  /* ---- zoom & pan --------------------------------------------------- */

  MapView.prototype.applyView = function () {
    this.k = this.baseK * this.view.s;
    this.tx = this.baseTx * this.view.s + this.view.dx;
    this.ty = this.baseTy * this.view.s + this.view.dy;
  };

  /* Keeps the map from being dragged off into empty space. */
  MapView.prototype.clampPan = function () {
    if (this.view.s <= 1.001) {
      this.view.s = 1;
      this.view.dx = 0;
      this.view.dy = 0;
      return;
    }
    var b = this.bounds;
    var k = this.baseK * this.view.s;
    var axes = [
      { lo: b.x0, hi: b.x1, base: this.baseTx, size: this.w, key: 'dx' },
      { lo: b.y0, hi: b.y1, base: this.baseTy, size: this.h, key: 'dy' },
    ];
    for (var i = 0; i < axes.length; i++) {
      var a = axes[i];
      var t = a.base * this.view.s + this.view[a.key];
      var start = a.lo * k + t;
      var span = (a.hi - a.lo) * k;
      if (span >= a.size) {
        if (start > 0) t -= start;
        if (start + span < a.size) t += a.size - (start + span);
      } else {
        t += (a.size - span) / 2 - start; // smaller than the viewport: center it
      }
      this.view[a.key] = t - a.base * this.view.s;
    }
  };

  MapView.prototype.zoomAt = function (px, py, factor) {
    if (!this.ready()) return;
    var proj = this.toProj(px, py);
    var s = Math.max(1, Math.min(8, this.view.s * factor));
    this.view.s = s;
    this.view.dx = px - proj[0] * this.baseK * s - this.baseTx * s;
    this.view.dy = py - proj[1] * this.baseK * s - this.baseTy * s;
    this.clampPan();
    this.applyView();
    this.requestDraw();
    if (this.onViewChange) this.onViewChange(this.view.s);
  };

  MapView.prototype.panBy = function (dx, dy) {
    if (!this.ready()) return;
    this.view.dx += dx;
    this.view.dy += dy;
    this.clampPan();
    this.applyView();
    this.requestDraw();
  };

  MapView.prototype.resetView = function () {
    this.view = { s: 1, dx: 0, dy: 0 };
    this.applyView();
    this.requestDraw();
    if (this.onViewChange) this.onViewChange(1);
  };

  MapView.prototype.sx = function (px) {
    return px * this.k + this.tx;
  };
  MapView.prototype.sy = function (py) {
    return py * this.k + this.ty;
  };
  /* Screen -> projected units. */
  MapView.prototype.toProj = function (x, y) {
    return [(x - this.tx) / this.k, (y - this.ty) / this.k];
  };
  MapView.prototype.toLonLat = function (x, y) {
    var p = this.toProj(x, y);
    return window.Geo.invert(p[0], p[1]);
  };

  /* Miles represented by one screen pixel, near the middle of the map. */
  MapView.prototype.milesPerPixel = function () {
    var a = this.toLonLat(this.w / 2, this.h / 2);
    var b = this.toLonLat(this.w / 2 + 20, this.h / 2);
    return window.Geo.milesBetween(a[0], a[1], b[0], b[1]) / 20;
  };

  /* State under the cursor, allowing a few px of slop for small states. */
  MapView.prototype.stateAt = function (x, y, slopPx) {
    var p = this.toProj(x, y);
    for (var i = 0; i < this.states.length; i++) {
      if (window.Geo.pointInPolys(p[0], p[1], this.states[i].polys)) return this.states[i];
    }
    var slop = (slopPx || 0) / this.k;
    if (!slop) return null;
    var best = null;
    var bestD = Infinity;
    for (var j = 0; j < this.states.length; j++) {
      var near = window.Geo.nearestOnPolys(p[0], p[1], this.states[j].polys);
      if (near.dist < bestD) {
        bestD = near.dist;
        best = this.states[j];
      }
    }
    return bestD <= slop ? best : null;
  };

  /* Miles from a screen point to the nearest edge of a state (0 if inside). */
  MapView.prototype.milesToState = function (x, y, state) {
    var p = this.toProj(x, y);
    if (window.Geo.pointInPolys(p[0], p[1], state.polys)) return 0;
    var near = window.Geo.nearestOnPolys(p[0], p[1], state.polys);
    var a = window.Geo.invert(p[0], p[1]);
    var b = window.Geo.invert(near.x, near.y);
    return window.Geo.milesBetween(a[0], a[1], b[0], b[1]);
  };

  /* ---- drawing ------------------------------------------------------ */

  MapView.prototype.css = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  MapView.prototype.addPolys = function (path, polys) {
    for (var p = 0; p < polys.length; p++) {
      for (var r = 0; r < polys[p].length; r++) {
        var ring = polys[p][r];
        for (var i = 0; i < ring.length; i++) {
          var x = this.sx(ring[i][0]);
          var y = this.sy(ring[i][1]);
          if (i === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        path.closePath();
      }
    }
    return path;
  };

  MapView.prototype.path = function (state) {
    return this.addPolys(new Path2D(), state.polys);
  };

  /* One path for the whole landmass: filling it in a single pass avoids the
     hairline seams you get when filling 48 adjacent polygons separately. */
  MapView.prototype.landPath = function () {
    var path = new Path2D();
    for (var i = 0; i < this.states.length; i++) this.addPolys(path, this.states[i].polys);
    for (var j = 0; j < this.extraLand.length; j++) this.addPolys(path, this.extraLand[j]);
    return path;
  };

  MapView.prototype.outlinePath = function () {
    var path = new Path2D();
    for (var i = 0; i < this.outline.length; i++) {
      var line = this.outline[i];
      for (var j = 0; j < line.length; j++) {
        var x = this.sx(line[j][0]);
        var y = this.sy(line[j][1]);
        if (j === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
    }
    return path;
  };

  MapView.prototype.requestDraw = function () {
    if (this.animating) return;
    this.animating = true;
    var self = this;
    requestAnimationFrame(function step() {
      var live = self.draw();
      if (live) requestAnimationFrame(step);
      else self.animating = false;
    });
  };

  /* ---- terrain ------------------------------------------------------ */

  /*
   * The relief is a greyscale image where 128 means flat, painted with a
   * soft-light blend so it shades the land colour instead of replacing it.
   */
  MapView.prototype.drawRelief = function (ctx) {
    if (!this.reliefReady) return;
    var b = window.US_RELIEF.bounds;
    ctx.save();
    // Overlay rather than soft-light: against a land colour this dark,
    // soft-light is almost invisible.
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 1;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.relief,
      this.sx(b.x0),
      this.sy(b.y0),
      (b.x1 - b.x0) * this.k,
      (b.y1 - b.y0) * this.k
    );
    ctx.restore();
  };

  MapView.prototype.drawRivers = function (ctx) {
    if (!this.rivers.length) return;
    ctx.save();
    ctx.strokeStyle = this.css('--river');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Two passes so the big rivers read heavier than the tributaries.
    for (var pass = 0; pass < 2; pass++) {
      ctx.lineWidth = pass === 0 ? 1.7 : 0.9;
      ctx.globalAlpha = pass === 0 ? 0.85 : 0.5;
      ctx.beginPath();
      for (var i = 0; i < this.rivers.length; i++) {
        var r = this.rivers[i];
        var big = r.rank <= 4;
        if ((pass === 0) !== big) continue;
        for (var j = 0; j < r.pts.length; j++) {
          var x = this.sx(r.pts[j][0]);
          var y = this.sy(r.pts[j][1]);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  MapView.prototype.drawLakes = function (ctx) {
    if (!this.lakes.length) return;
    var path = new Path2D();
    for (var i = 0; i < this.lakes.length; i++) {
      var rings = this.lakes[i];
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        for (var j = 0; j < ring.length; j++) {
          var x = this.sx(ring[j][0]);
          var y = this.sy(ring[j][1]);
          if (j === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        path.closePath();
      }
    }
    ctx.save();
    ctx.fillStyle = this.css('--water');
    ctx.fill(path, 'evenodd');
    ctx.restore();
  };

  /* Returns true while an animation still needs frames. */
  MapView.prototype.draw = function () {
    if (!this.ready()) return false;
    var ctx = this.ctx;
    var now = performance.now();
    var live = false;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    var LAND = this.css('--land');
    var LAND_SOLVED = this.css('--land-solved');
    var LAND_MISSED = this.css('--land-missed');
    var BORDER = this.css('--border-line');
    var INK = this.css('--ink');
    var GOOD = this.css('--good');
    var BAD = this.css('--bad');

    var showAllBorders = this.mode === 'cities';
    var i;

    // The landmass as one shape — no interior lines leak through.
    var land = this.landPath();
    ctx.fillStyle = LAND;
    ctx.fill(land, 'evenodd');

    // Terrain goes on next, masked to the land so relief and rivers stop at
    // the coast and the border instead of spilling into Canada and the sea.
    if (this.terrain) {
      ctx.save();
      ctx.clip(land, 'evenodd');
      this.drawRelief(ctx);
      this.drawRivers(ctx);
      ctx.restore();
      this.drawLakes(ctx); // outside the clip: the Great Lakes are not land
    }

    // Answered states get their own fill and border painted on top; in the
    // borderless mode this is the only way a state line ever appears.
    for (i = 0; i < this.states.length; i++) {
      var s = this.states[i];
      var path = this.path(s);
      s._path = path;
      var solved = this.mode === 'states' && this.solved[s.name];
      var missed = this.mode === 'states' && this.missed[s.name];
      if (solved || missed) {
        ctx.fillStyle = solved ? LAND_SOLVED : LAND_MISSED;
        ctx.fill(path, 'evenodd');
      }
      if (showAllBorders || solved || missed) {
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.stroke(path);
      }
    }

    // Coastline, national border and lake shores, over the fills.
    ctx.save();
    ctx.strokeStyle = this.css('--coast');
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke(this.outlinePath());
    ctx.restore();

    // Reveal flashes.
    for (i = this.reveals.length - 1; i >= 0; i--) {
      var rv = this.reveals[i];
      var age = (now - rv.t0) / 900;
      if (age >= 1) {
        this.reveals.splice(i, 1);
        continue;
      }
      live = true;
      var st = this.byName[rv.name];
      if (!st || !st._path) continue;
      ctx.save();
      ctx.globalAlpha = 1 - age;
      ctx.strokeStyle = rv.kind === 'miss' ? BAD : GOOD;
      ctx.lineWidth = 2 + 6 * (1 - age);
      ctx.stroke(st._path);
      ctx.restore();
    }

    // Labels for states already placed.
    if (this.mode === 'states') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 ' + Math.max(9, Math.min(13, this.w / 70)) + 'px system-ui, sans-serif';
      for (i = 0; i < this.states.length; i++) {
        var ls = this.states[i];
        if (!this.solved[ls.name] && !this.missed[ls.name]) continue;
        ctx.fillStyle = this.missed[ls.name] ? BAD : INK;
        ctx.fillText(ls.abbr, this.sx(ls.anchor[0]), this.sy(ls.anchor[1]));
      }
      ctx.restore();
    }

    // City dots.
    if (this.mode === 'cities') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = '600 ' + Math.max(9, Math.min(12, this.w / 78)) + 'px system-ui, sans-serif';
      for (i = 0; i < this.activeCities.length; i++) {
        var c = this.activeCities[i];
        var done = this.solved[c.label];
        var miss = this.missed[c.label];
        if (!done && !miss) continue;
        var pr = window.Geo.project(c.lon, c.lat);
        var cx = this.sx(pr[0]);
        var cy = this.sy(pr[1]);
        ctx.fillStyle = miss ? BAD : GOOD;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = miss ? BAD : INK;
        ctx.fillText(c.name, cx, cy - 6);
      }
      ctx.restore();
    }

    // Click markers: a fading X for a miss, a ring for a hit.
    for (i = this.markers.length - 1; i >= 0; i--) {
      var m = this.markers[i];
      var mage = (now - m.t0) / 1100;
      if (mage >= 1) {
        this.markers.splice(i, 1);
        continue;
      }
      live = true;
      var mx = this.sx(m.x);
      var my = this.sy(m.y);
      ctx.save();
      ctx.globalAlpha = 1 - mage;
      ctx.strokeStyle = m.kind === 'hit' ? GOOD : BAD;
      ctx.lineWidth = 2;
      if (m.kind === 'hit') {
        ctx.beginPath();
        ctx.arc(mx, my, 6 + 16 * mage, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(mx - 6, my - 6);
        ctx.lineTo(mx + 6, my + 6);
        ctx.moveTo(mx + 6, my - 6);
        ctx.lineTo(mx - 6, my + 6);
        ctx.stroke();
      }
      ctx.restore();
    }

    return live;
  };

  /* ---- input -------------------------------------------------------- */

  /*
   * One pointer: drag to pan, release without moving to answer. Two pointers:
   * pinch to zoom. A drag of more than a few pixels cancels the answer so
   * panning never costs a try.
   */
  MapView.prototype.bindInput = function () {
    var self = this;
    var c = this.canvas;
    var pointers = {};
    var moved = 0;
    var last = null;
    var pinchStart = 0;

    function local(ev) {
      var r = c.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    function pinchDistance() {
      var ids = Object.keys(pointers);
      if (ids.length < 2) return 0;
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function pinchCenter() {
      var ids = Object.keys(pointers);
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    c.addEventListener('pointerdown', function (ev) {
      c.setPointerCapture(ev.pointerId);
      pointers[ev.pointerId] = local(ev);
      moved = 0;
      last = pointers[ev.pointerId];
      pinchStart = pinchDistance();
    });

    c.addEventListener('pointermove', function (ev) {
      if (!pointers[ev.pointerId]) return;
      var p = local(ev);
      pointers[ev.pointerId] = p;
      var count = Object.keys(pointers).length;

      if (count >= 2) {
        var d = pinchDistance();
        if (pinchStart > 0 && d > 0) {
          var ctr = pinchCenter();
          self.zoomAt(ctr.x, ctr.y, d / pinchStart);
          pinchStart = d;
        }
        moved = 999;
        return;
      }
      if (last) {
        moved += Math.hypot(p.x - last.x, p.y - last.y);
        if (moved > 4) self.panBy(p.x - last.x, p.y - last.y);
      }
      last = p;
    });

    function release(ev) {
      var p = pointers[ev.pointerId];
      delete pointers[ev.pointerId];
      if (Object.keys(pointers).length === 0) {
        if (p && moved <= 4 && self.onTap) self.onTap(p.x, p.y);
        last = null;
      } else {
        last = null;
        pinchStart = pinchDistance();
      }
    }

    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', function (ev) {
      delete pointers[ev.pointerId];
      last = null;
    });

    c.addEventListener(
      'wheel',
      function (ev) {
        ev.preventDefault();
        var p = local(ev);
        self.zoomAt(p.x, p.y, Math.exp(-ev.deltaY * 0.002));
      },
      { passive: false }
    );
  };

  MapView.prototype.addMarker = function (screenX, screenY, kind) {
    var p = this.toProj(screenX, screenY);
    this.markers.push({ x: p[0], y: p[1], t0: performance.now(), kind: kind });
    this.requestDraw();
  };

  MapView.prototype.addReveal = function (name, kind) {
    this.reveals.push({ name: name, t0: performance.now(), kind: kind });
    this.requestDraw();
  };

  window.MapView = MapView;
})();
