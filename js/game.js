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

  var STATE_FACTS = {
    'Alabama': { border: 'Georgia to the north', river: 'the Tennessee River' },
    'Alaska': { border: 'Canada to the east', river: 'the Yukon River' },
    'Arizona': { border: 'Nevada to the west', river: 'the Colorado River' },
    'Arkansas': { border: 'Missouri to the north', river: 'the Mississippi River' },
    'California': { border: 'Nevada to the east', river: 'the Sacramento River' },
    'Colorado': { border: 'Wyoming to the north', river: 'the Colorado River' },
    'Connecticut': { border: 'New York to the west', river: 'the Connecticut River' },
    'Delaware': { border: 'Pennsylvania to the north', river: 'the Delaware River' },
    'Florida': { border: 'Georgia to the north', river: 'the St. Johns River' },
    'Georgia': { border: 'Tennessee to the north', river: 'the Chattahoochee River' },
    'Hawaii': { border: 'the Pacific Ocean', river: 'the Wailuku River' },
    'Idaho': { border: 'Canada to the north', river: 'the Snake River' },
    'Illinois': { border: 'Iowa to the west', river: 'the Mississippi River' },
    'Indiana': { border: 'Michigan to the north', river: 'the Wabash River' },
    'Iowa': { border: 'Minnesota to the north', river: 'the Missouri River' },
    'Kansas': { border: 'Nebraska to the north', river: 'the Arkansas River' },
    'Kentucky': { border: 'Ohio to the north', river: 'the Kentucky River' },
    'Louisiana': { border: 'Arkansas to the north', river: 'the Mississippi River' },
    'Maine': { border: 'Canada to the north', river: 'the Kennebec River' },
    'Maryland': { border: 'Pennsylvania to the north', river: 'the Potomac River' },
    'Massachusetts': { border: 'Vermont to the west', river: 'the Connecticut River' },
    'Michigan': { border: 'Wisconsin to the west', river: 'the Grand River' },
    'Minnesota': { border: 'Canada to the north', river: 'the Mississippi River' },
    'Mississippi': { border: 'Tennessee to the north', river: 'the Mississippi River' },
    'Missouri': { border: 'Iowa to the north', river: 'the Missouri River' },
    'Montana': { border: 'Canada to the north', river: 'the Yellowstone River' },
    'Nebraska': { border: 'South Dakota to the north', river: 'the Platte River' },
    'Nevada': { border: 'Oregon to the north', river: 'the Humboldt River' },
    'New Hampshire': { border: 'Vermont to the west', river: 'the Connecticut River' },
    'New Jersey': { border: 'New York to the north', river: 'the Delaware River' },
    'New Mexico': { border: 'Colorado to the north', river: 'the Rio Grande' },
    'New York': { border: 'Vermont to the east', river: 'the Hudson River' },
    'North Carolina': { border: 'Virginia to the north', river: 'the Cape Fear River' },
    'North Dakota': { border: 'Canada to the north', river: 'the Missouri River' },
    'Ohio': { border: 'Michigan to the north', river: 'the Ohio River' },
    'Oklahoma': { border: 'Texas to the south', river: 'the Arkansas River' },
    'Oregon': { border: 'Washington to the north', river: 'the Willamette River' },
    'Pennsylvania': { border: 'New York to the north', river: 'the Allegheny River' },
    'Rhode Island': { border: 'Massachusetts to the north', river: 'the Providence River' },
    'South Carolina': { border: 'North Carolina to the north', river: 'the Pee Dee River' },
    'South Dakota': { border: 'North Dakota to the north', river: 'the Missouri River' },
    'Tennessee': { border: 'Kentucky to the north', river: 'the Tennessee River' },
    'Texas': { border: 'Oklahoma to the north', river: 'the Brazos River' },
    'Utah': { border: 'Idaho to the north', river: 'the Green River' },
    'Vermont': { border: 'New Hampshire to the east', river: 'the Connecticut River' },
    'Virginia': { border: 'Maryland to the north', river: 'the James River' },
    'Washington': { border: 'Oregon to the south', river: 'the Columbia River' },
    'West Virginia': { border: 'Pennsylvania to the north', river: 'the New River' },
    'Wisconsin': { border: 'Michigan to the east', river: 'the Wisconsin River' },
    'Wyoming': { border: 'Montana to the north', river: 'the North Platte River' },
  };

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
    hard: false,
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
    return (
      'usgeo.best.' + game.mode +
      (game.mode === 'cities' ? '.' + game.citySize : '') +
      (game.hard ? '.hard' : '')
    );
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
    map.revealAll = false;
    if (game.mode === 'states') map.activeCities = [];

    hideOverlay();
    el.progressTotal.textContent = '/ ' + game.queue.length;
    say(
      game.mode === 'states'
        ? 'Click the state on the map. Three tries each. Zoom in for more details.'
        : 'Click where the city is. Three tries each. Zoom in for more details.'
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
    // Hard mode hides your work as you go; show the finished map for review.
    map.revealAll = true;
    map.requestDraw();
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

    map.solved[labelOf(item)] = performance.now();
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

    var message = praise + extra + tail;
    if (game.mode === 'states' && STATE_FACTS[item.name]) {
      var fact = STATE_FACTS[item.name];
      message += '\n' + item.name + ' is bordered on the south by ' + fact.border + ' and includes ' + fact.river + ' flowing through.';
    }
    say(message, 'good');
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
    map.missed[labelOf(item)] = performance.now();
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

  function showOverlay(html, isTitle) {
    el.panel.className = isTitle ? 'titlecard' : 'panel';
    el.panel.innerHTML = html;
    el.overlay.classList.toggle('title-mode', !!isTitle);
    el.overlay.classList.add('show');
  }

  function showTitle() {
    game.running = false;
    var isCities = game.mode === 'cities';
    var best = readBest();

    var sizeChips = CITY_SIZES.map(function (n) {
      return (
        '<button class="chip' + (n === game.citySize ? ' is-on' : '') +
        '" data-size="' + n + '">Top ' + n + '</button>'
      );
    }).join('');

    showOverlay(
      '<canvas class="hero-mark" id="heroMark"></canvas>' +
        '<p class="eyebrow">Geography trainer</p>' +
        '<h2 class="title">Learn the U.S., <em>for real!</em></h2>' +
        '<hr class="title-rule">' +
        '<p class="tagline">No state lines to trace — just terrain, rivers and coast, the way the ' +
        'country actually looks. Find each place by its geography and the borders fill in behind you.</p>' +
        '<div class="mode-cards" id="modeCards">' +
        '<button class="mode-card' + (isCities ? '' : ' is-on') + '" data-mode="states">' +
        '<b>The lower 48</b><span>Every state on a blank map, three tries each</span></button>' +
        '<button class="mode-card' + (isCities ? ' is-on' : '') + '" data-mode="cities">' +
        '<b>Major cities</b><span>Place the biggest cities, borders shown</span></button>' +
        '</div>' +
        '<div class="setup">' +
        (isCities
          ? '<span class="choice-label">How many</span><span id="sizes" class="choices" style="margin:0">' +
            sizeChips + '</span>'
          : '') +
        '<button class="switch' + (game.hard ? ' is-on' : '') + '" id="hardBtn" ' +
        'role="switch" aria-checked="' + (game.hard ? 'true' : 'false') + '" ' +
        'title="Answers fade away completely — no fill, border or name — so the map stays blank">' +
        '<span class="track"><span class="knob"></span></span>Hard mode</button>' +
        (game.hard
          ? '<span class="setup-note">Answers fade away — the map stays blank</span>'
          : '') +
        '</div>' +
        '<button class="btn btn-start" id="playBtn">Start</button>' +
        '<p class="title-foot">' +
        (best
          ? 'Your best &middot; <b>' + best.score + '</b> points in ' + fmtTime(best.ms) +
            (best.streak ? ' &middot; longest streak <b>' + best.streak + '</b>' : '')
          : 'Three tries a question. First-try answers in a row build a streak.') +
        '</p>',
      true
    );

    map.drawMark(document.getElementById('heroMark'), '#e2b558');

    document.getElementById('modeCards').addEventListener('click', function (ev) {
      var b = ev.target.closest('.mode-card');
      if (!b) return;
      setMode(b.dataset.mode);
      showTitle();
    });

    var sizes = document.getElementById('sizes');
    if (sizes) {
      sizes.addEventListener('click', function (ev) {
        var b = ev.target.closest('.chip');
        if (!b) return;
        game.citySize = parseInt(b.dataset.size, 10);
        showTitle();
      });
    }

    document.getElementById('hardBtn').addEventListener('click', function () {
      setHard(!game.hard);
      showTitle();
    });

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
    document.getElementById('backBtn').addEventListener('click', showTitle);
  }

  /* ---- chrome ------------------------------------------------------- */

  function setMode(mode) {
    game.mode = mode;
    Array.prototype.forEach.call(el.modes.children, function (c) {
      c.classList.toggle('is-on', c.dataset.mode === mode);
    });
    map.mode = mode;
    map.solved = {};
    map.missed = {};
    map.activeCities = mode === 'cities' ? map.cities.slice(0, game.citySize) : [];
    map.requestDraw();
  }

  function setHard(on) {
    game.hard = on;
    map.hardMode = on;
    try {
      localStorage.setItem('usgeo.hard', on ? '1' : '0');
    } catch (e) {
      /* not fatal */
    }
    map.requestDraw();
  }

  el.modes.addEventListener('click', function (ev) {
    var b = ev.target.closest('.mode-btn');
    if (!b) return;
    setMode(b.dataset.mode);
    showTitle();
  });

  el.resetView.addEventListener('click', function () {
    map.resetView();
  });

  function setTerrain(on) {
    map.terrain = on;
    el.terrainBtn.classList.toggle('is-on', on);
    el.terrainBtn.setAttribute('aria-checked', on ? 'true' : 'false');
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

  var savedHard = null;
  try {
    savedHard = localStorage.getItem('usgeo.hard');
  } catch (e) {
    /* not fatal */
  }
  setHard(savedHard === '1');

  el.menuBtn.addEventListener('click', showTitle);
  el.restartBtn.addEventListener('click', function () {
    startRound(null);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') showTitle();
  });

  // Single ticker for the whole session; it idles when no round is running.
  setInterval(function () {
    if (game.running) el.timer.textContent = fmtTime(performance.now() - game.startedAt);
  }, 250);

  map.watchSize();
  showTitle();
})();
