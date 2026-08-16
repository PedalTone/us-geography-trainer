/* Game state machine and DOM wiring. */
(function () {
  'use strict';

  var MAX_TRIES = 3;
  var CITY_SIZES = [25, 50, 100, 150];

  /*
   * A streak counts answers got right on the FIRST try, back to back. Needing a
   * second try keeps your points but ends the run, which is what makes a long
   * streak worth something. Milestones pay a bonus on top.
   */
  var STREAK_REWARDS = [
    { at: 3, label: '3 in a row', bonus: 2 },
    { at: 5, label: '5 in a row!', bonus: 5 },
    { at: 8, label: '8 straight!', bonus: 8 },
    { at: 12, label: '12 in a row — on fire', bonus: 12 },
    { at: 16, label: '16! Unstoppable', bonus: 16 },
    { at: 20, label: '20 in a row!!', bonus: 20 },
    { at: 25, label: '25 straight — incredible', bonus: 25 },
    { at: 30, label: '30 in a row!!!', bonus: 30 },
    { at: 40, label: '40 straight — showing off now', bonus: 40 },
    { at: 48, label: 'ALL 48, FIRST TRY', bonus: 60 },
    { at: 100, label: '100 in a row', bonus: 100 },
    { at: 150, label: 'EVERY CITY, FIRST TRY', bonus: 150 },
  ];

  var el = {
    canvas: document.getElementById('map'),
    prompt: document.getElementById('prompt'),
    tries: document.getElementById('tries'),
    progress: document.getElementById('progress'),
    progressTotal: document.getElementById('progressTotal'),
    feedback: document.getElementById('feedback'),
    overlay: document.getElementById('overlay'),
    panel: document.getElementById('panel'),
    score: document.getElementById('score'),
    firstTry: document.getElementById('firstTry'),
    timer: document.getElementById('timer'),
    modes: document.getElementById('modes'),
    menuBtn: document.getElementById('menuBtn'),
    restartBtn: document.getElementById('restartBtn'),
    resetView: document.getElementById('resetView'),
    terrainBtn: document.getElementById('terrainBtn'),
    streak: document.getElementById('streak'),
    streakCount: document.getElementById('streakCount'),
    toast: document.getElementById('toast'),
  };

  var map = new window.MapView(el.canvas);

  var game = {
    mode: 'states',
    citySize: 50,
    queue: [],
    index: 0,
    tries: MAX_TRIES,
    score: 0,
    firstTry: 0,
    missed: [],
    streak: 0,
    bestStreak: 0,
    startedAt: 0,
    running: false,
  };

  /* ---- helpers ------------------------------------------------------ */

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function labelOf(item) {
    return game.mode === 'states' ? item.name : item.label;
  }

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function fmtMiles(m) {
    return m < 10 ? m.toFixed(0) : Math.round(m / 5) * 5 + '';
  }

  function say(text, tone) {
    el.feedback.textContent = text;
    el.feedback.className = 'feedback' + (tone ? ' ' + tone : '');
  }

  function rewardFor(streak) {
    for (var i = 0; i < STREAK_REWARDS.length; i++) {
      if (STREAK_REWARDS[i].at === streak) return STREAK_REWARDS[i];
    }
    return null;
  }

  function showToast(label, bonus) {
    el.toast.innerHTML = '';
    el.toast.appendChild(document.createTextNode(label));
    if (bonus) {
      var b = document.createElement('span');
      b.className = 'bonus';
      b.textContent = '+' + bonus;
      el.toast.appendChild(b);
    }
    el.toast.classList.remove('show');
    void el.toast.offsetWidth; // restart the animation on a repeat milestone
    el.toast.classList.add('show');
  }

  function bestKey() {
    return 'usgeo.best.' + game.mode + (game.mode === 'cities' ? '.' + game.citySize : '');
  }

  function readBest() {
    try {
      return JSON.parse(localStorage.getItem(bestKey()) || 'null');
    } catch (e) {
      return null;
    }
  }

  function writeBest(rec) {
    try {
      localStorage.setItem(bestKey(), JSON.stringify(rec));
    } catch (e) {
      /* private mode: scores just don't persist */
    }
  }

  /* ---- rounds ------------------------------------------------------- */

  function buildQueue(only) {
    if (game.mode === 'states') {
      var states = map.states;
      if (only) {
        states = states.filter(function (s) {
          return only.indexOf(s.name) !== -1;
        });
      }
      return shuffle(states);
    }
    var pool = map.cities.slice(0, game.citySize);
    if (only) {
      pool = pool.filter(function (c) {
        return only.indexOf(c.label) !== -1;
      });
    }
    map.activeCities = pool;
    return shuffle(pool);
  }

  function startRound(only) {
    game.queue = buildQueue(only);
    game.index = 0;
    game.tries = MAX_TRIES;
    game.score = 0;
    game.firstTry = 0;
    game.missed = [];
    game.streak = 0;
    game.bestStreak = 0;
    game.startedAt = performance.now();
    game.running = true;

    map.mode = game.mode;
    map.solved = {};
    map.missed = {};
    map.reveals = [];
    map.markers = [];
    if (game.mode === 'states') map.activeCities = [];

    hideOverlay();
    el.progressTotal.textContent = '/ ' + game.queue.length;
    say(
      game.mode === 'states'
        ? 'Click the state on the map. Three tries each.'
        : 'Click where the city is. Three tries each.'
    );
    render();
    map.resize();
  }

  function current() {
    return game.queue[game.index];
  }

  function render() {
    var item = current();
    el.prompt.textContent = item ? labelOf(item) : '—';
    el.progress.textContent = game.index;
    el.score.textContent = game.score;
    el.firstTry.textContent = game.firstTry;
    el.streakCount.textContent = game.streak;
    el.streak.classList.toggle('show', game.streak >= 2);

    el.tries.innerHTML = '';
    for (var i = 0; i < MAX_TRIES; i++) {
      var d = document.createElement('div');
      d.className = 'dot' + (i < game.tries ? '' : ' spent');
      el.tries.appendChild(d);
    }
    map.requestDraw();
  }

  function advance() {
    game.index++;
    game.tries = MAX_TRIES;
    if (game.index >= game.queue.length) finish();
    else render();
  }

  function finish() {
    game.running = false;
    var elapsed = performance.now() - game.startedAt;
    var total = game.queue.length;
    var best = readBest();
    var isBest = !best || game.score > best.score || (game.score === best.score && elapsed < best.ms);
    if (isBest) {
      writeBest({
        score: game.score,
        ms: elapsed,
        firstTry: game.firstTry,
        streak: Math.max(game.bestStreak, (best && best.streak) || 0),
      });
    } else if (best && game.bestStreak > (best.streak || 0)) {
      best.streak = game.bestStreak;
      writeBest(best);
    }

    el.progress.textContent = total;
    showResults(elapsed, total, isBest, best);
  }

  /* ---- answering ---------------------------------------------------- */

  function onCorrect(item, x, y) {
    var earned = game.tries; // 3 / 2 / 1 by how many tries were left
    var clean = game.tries === MAX_TRIES;
    game.score += earned;
    if (clean) game.firstTry++;

    game.streak = clean ? game.streak + 1 : 0;
    if (game.streak > game.bestStreak) game.bestStreak = game.streak;
    var reward = clean ? rewardFor(game.streak) : null;
    if (reward) {
      game.score += reward.bonus;
      showToast(reward.label, reward.bonus);
      el.streak.classList.remove('hit');
      void el.streak.offsetWidth; // restart the pulse
      el.streak.classList.add('hit');
    }

    map.solved[labelOf(item)] = true;
    map.addMarker(x, y, 'hit');
    map.addReveal(game.mode === 'states' ? item.name : item.state, 'hit');

    var praise =
      game.tries === MAX_TRIES ? 'Correct!' : game.tries === 2 ? 'Got it.' : 'Got it — last try.';
    var extra =
      game.mode === 'states'
        ? ' ' + item.name + ' locked in.'
        : ' ' + item.name + ', ' + item.state + '.';
    var tail = ' +' + earned;
    if (reward) tail += ' and +' + reward.bonus + ' streak bonus';
    else if (clean && game.streak >= 2) tail += ' · ' + game.streak + ' in a row';
    say(praise + extra + tail, 'good');
    advance();
  }

  function onMiss(item, message, tone) {
    game.tries--;
    if (game.tries > 0) {
      say(message, tone);
      render();
      return;
    }
    game.streak = 0;
    map.missed[labelOf(item)] = true;
    game.missed.push(labelOf(item));
    map.addReveal(game.mode === 'states' ? item.name : item.state, 'miss');
    say(
      'Out of tries — that is ' +
        (game.mode === 'states' ? item.name : item.name + ', ' + item.state) +
        ', shown in red.',
      'bad'
    );
    advance();
  }

  function answerState(x, y, item) {
    var clicked = map.stateAt(x, y, 7);
    if (clicked && clicked.name === item.name) {
      onCorrect(item, x, y);
      return;
    }
    map.addMarker(x, y, 'miss');

    // Distance is to the nearest edge of the target, so landing anywhere in a
    // neighbouring state reads as "Close!".
    var miles = map.milesToState(x, y, item);
    var lead;
    var tone;
    if (miles < 200) {
      lead = 'Close! ';
      tone = 'warm';
    } else if (miles < 500) {
      lead = 'Not quite. ';
      tone = 'bad';
    } else {
      lead = 'Way off. ';
      tone = 'bad';
    }
    if (clicked) lead += 'That is ' + clicked.name + '. ';
    else lead += 'That is out at sea. ';

    // Second miss earns a direction hint.
    if (game.tries === 2) {
      var from = map.toLonLat(x, y);
      lead +=
        item.name +
        ' is ' +
        fmtMiles(miles) +
        ' mi to the ' +
        window.Geo.compass(from[0], from[1], item.anchorLonLat[0], item.anchorLonLat[1]) +
        '.';
    }
    onMiss(item, lead, tone);
  }

  function answerCity(x, y, item) {
    var from = map.toLonLat(x, y);
    var miles = window.Geo.milesBetween(from[0], from[1], item.lon, item.lat);
    // Generous enough to stay fair on a phone-sized map.
    var tol = Math.max(40, map.milesPerPixel() * 13);

    if (miles <= tol) {
      onCorrect(item, x, y);
      return;
    }
    map.addMarker(x, y, 'miss');

    var lead;
    var tone;
    if (miles <= Math.max(tol * 2.5, 150)) {
      lead = 'Close! ';
      tone = 'warm';
    } else if (miles < 500) {
      lead = 'Not quite. ';
      tone = 'bad';
    } else {
      lead = 'Way off. ';
      tone = 'bad';
    }
    lead += 'You were ' + fmtMiles(miles) + ' mi away';

    var clicked = map.stateAt(x, y, 7);
    lead += clicked ? ', in ' + clicked.name + '. ' : '. ';

    if (game.tries === 2) {
      lead +=
        'Look ' + window.Geo.compass(from[0], from[1], item.lon, item.lat) + ' of where you clicked.';
    }
    onMiss(item, lead, tone);
  }

  map.onTap = function (x, y) {
    if (!game.running) return;
    var item = current();
    if (!item) return;
    if (game.mode === 'states') answerState(x, y, item);
    else answerCity(x, y, item);
  };

  map.onViewChange = function (scale) {
    el.resetView.classList.toggle('show', scale > 1.01);
  };

  map.bindInput();

  /* ---- overlays ----------------------------------------------------- */

  function hideOverlay() {
    el.overlay.classList.remove('show');
  }

  function showOverlay(html) {
    el.panel.innerHTML = html;
    el.overlay.classList.add('show');
  }

  function showMenu() {
    game.running = false;
    var isCities = game.mode === 'cities';
    var best = readBest();
    var sizeChips = CITY_SIZES.map(function (n) {
      return (
        '<button class="chip' +
        (n === game.citySize ? ' is-on' : '') +
        '" data-size="' +
        n +
        '">Top ' +
        n +
        '</button>'
      );
    }).join('');

    showOverlay(
      '<h2>' +
        (isCities ? 'Major cities' : 'The lower 48') +
        '</h2>' +
        '<p>' +
        (isCities
          ? 'State borders are drawn for you. Click the spot where each city sits.'
          : 'A blank silhouette — no state lines. Click the state being asked for, and its border is drawn in when you get it.') +
        '</p>' +
        '<ol>' +
        '<li>Three tries per question: 3 points on the first, 2 on the second, 1 on the third.</li>' +
        '<li>Every wrong click tells you how far off you were, and after two misses which way to look.</li>' +
        '<li>Miss all three and the answer is revealed in red.</li>' +
        '<li>Get them right first time back to back for a streak — 3, 5, 8, 12 and up each pay a bonus.</li>' +
        '</ol>' +
        (isCities
          ? '<span class="choice-label">How many cities</span><div class="choices" id="sizes">' +
            sizeChips +
            '</div>'
          : '') +
        (best
          ? '<p>Your best: <b>' +
            best.score +
            '</b> points in ' +
            fmtTime(best.ms) +
            (best.streak ? ' &middot; longest streak <b>' + best.streak + '</b>' : '') +
            '.</p>'
          : '') +
        '<div class="btn-row"><button class="btn" id="playBtn">Start</button></div>'
    );

    var sizes = document.getElementById('sizes');
    if (sizes) {
      sizes.addEventListener('click', function (ev) {
        var b = ev.target.closest('.chip');
        if (!b) return;
        game.citySize = parseInt(b.dataset.size, 10);
        showMenu();
      });
    }
    document.getElementById('playBtn').addEventListener('click', function () {
      startRound(null);
    });
  }

  function showResults(elapsed, total, isBest, prevBest) {
    // A flawless run is 3 points per question plus every streak bonus it would
    // pass through, so 100% means exactly that and nothing scores over it.
    var max = total * MAX_TRIES;
    for (var m = 0; m < STREAK_REWARDS.length; m++) {
      if (STREAK_REWARDS[m].at <= total) max += STREAK_REWARDS[m].bonus;
    }
    var pct = Math.round((game.score / max) * 100);
    var missedHtml = game.missed.length
      ? '<span class="choice-label">Missed entirely</span><div class="misslist">' +
        game.missed
          .map(function (m) {
            return '<i>' + m + '</i>';
          })
          .join('') +
        '</div>'
      : '<p>Clean sweep — nothing missed.</p>';

    showOverlay(
      '<h2>' + (game.missed.length ? 'Round complete' : 'Perfect round') + '</h2>' +
        '<p>' +
        (game.mode === 'states' ? 'All 48 states' : 'Top ' + game.citySize + ' cities') +
        ' &middot; ' +
        pct +
        '% of a perfect score' +
        (isBest ? ' &middot; <b>new personal best</b>' : prevBest ? ' &middot; best is ' + prevBest.score : '') +
        '</p>' +
        '<div class="results">' +
        '<div class="result-cell"><span>Score</span><b>' + game.score + '</b></div>' +
        '<div class="result-cell"><span>First try</span><b>' + game.firstTry + '/' + total + '</b></div>' +
        '<div class="result-cell"><span>Best streak</span><b>' + game.bestStreak + '</b></div>' +
        '<div class="result-cell"><span>Time</span><b>' + fmtTime(elapsed) + '</b></div>' +
        '</div>' +
        missedHtml +
        '<div class="btn-row">' +
        '<button class="btn" id="againBtn">Play again</button>' +
        (game.missed.length
          ? '<button class="btn ghost" id="drillBtn">Drill the ' + game.missed.length + ' I missed</button>'
          : '') +
        '<button class="btn ghost" id="backBtn">Menu</button>' +
        '</div>'
    );

    document.getElementById('againBtn').addEventListener('click', function () {
      startRound(null);
    });
    var drill = document.getElementById('drillBtn');
    if (drill) {
      var list = game.missed.slice();
      drill.addEventListener('click', function () {
        startRound(list);
      });
    }
    document.getElementById('backBtn').addEventListener('click', showMenu);
  }

  /* ---- chrome ------------------------------------------------------- */

  el.modes.addEventListener('click', function (ev) {
    var b = ev.target.closest('.mode-btn');
    if (!b) return;
    game.mode = b.dataset.mode;
    Array.prototype.forEach.call(el.modes.children, function (c) {
      c.classList.toggle('is-on', c === b);
    });
    map.mode = game.mode;
    map.solved = {};
    map.missed = {};
    map.activeCities = game.mode === 'cities' ? map.cities.slice(0, game.citySize) : [];
    map.requestDraw();
    showMenu();
  });

  el.resetView.addEventListener('click', function () {
    map.resetView();
  });

  function setTerrain(on) {
    map.terrain = on;
    el.terrainBtn.classList.toggle('is-on', on);
    el.terrainBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    try {
      localStorage.setItem('usgeo.terrain', on ? '1' : '0');
    } catch (e) {
      /* not fatal */
    }
    map.requestDraw();
  }

  el.terrainBtn.addEventListener('click', function () {
    setTerrain(!map.terrain);
  });

  var savedTerrain = null;
  try {
    savedTerrain = localStorage.getItem('usgeo.terrain');
  } catch (e) {
    /* not fatal */
  }
  setTerrain(savedTerrain !== '0');

  el.menuBtn.addEventListener('click', showMenu);
  el.restartBtn.addEventListener('click', function () {
    startRound(null);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') showMenu();
  });

  // Single ticker for the whole session; it idles when no round is running.
  setInterval(function () {
    if (game.running) el.timer.textContent = fmtTime(performance.now() - game.startedAt);
  }, 250);

  map.watchSize();
  showMenu();
})();
