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
    'Alabama': { neighbor: 'Tennessee', river: 'the Tennessee River', border: false },
    'Alaska': { neighbor: 'Canada', river: 'the Yukon River', border: false },
    'Arizona': { neighbor: 'Nevada', river: 'the Colorado River', border: false },
    'Arkansas': { neighbor: 'Missouri', river: 'the Mississippi River', border: true },
    'California': { neighbor: 'Nevada', river: 'the Sacramento River', border: false },
    'Colorado': { neighbor: 'Wyoming', river: 'the Colorado River', border: false },
    'Connecticut': { neighbor: 'New York', river: 'the Connecticut River', border: false },
    'Delaware': { neighbor: 'Pennsylvania', river: 'the Delaware River', border: true },
    'Florida': { neighbor: 'Georgia', river: 'the St. Johns River', border: false },
    'Georgia': { neighbor: 'Tennessee', river: 'the Chattahoochee River', border: false },
    'Hawaii': { neighbor: 'the Pacific Ocean', river: 'the Wailuku River', border: false },
    'Idaho': { neighbor: 'Canada', river: 'the Snake River', border: false },
    'Illinois': { neighbor: 'Indiana', river: 'the Mississippi River', border: true },
    'Indiana': { neighbor: 'Ohio', river: 'the Wabash River', border: false },
    'Iowa': { neighbor: 'Minnesota', river: 'the Mississippi River', border: true },
    'Kansas': { neighbor: 'Nebraska', river: 'the Arkansas River', border: false },
    'Kentucky': { neighbor: 'Ohio', river: 'the Ohio River', border: true },
    'Louisiana': { neighbor: 'Arkansas', river: 'the Mississippi River', border: true },
    'Maine': { neighbor: 'New Hampshire', river: 'the Kennebec River', border: false },
    'Maryland': { neighbor: 'Virginia', river: 'the Potomac River', border: false },
    'Massachusetts': { neighbor: 'New York', river: 'the Connecticut River', border: false },
    'Michigan': { neighbor: 'Indiana', river: 'the Grand River', border: false },
    'Minnesota': { neighbor: 'Canada', river: 'the Minnesota River', border: false },
    'Mississippi': { neighbor: 'Louisiana', river: 'the Mississippi River', border: false },
    'Missouri': { neighbor: 'Iowa', river: 'the Missouri River', border: true },
    'Montana': { neighbor: 'Canada', river: 'the Yellowstone River', border: false },
    'Nebraska': { neighbor: 'Colorado', river: 'the Platte River', border: false },
    'Nevada': { neighbor: 'California', river: 'the Humboldt River', border: false },
    'New Hampshire': { neighbor: 'Vermont', river: 'the Connecticut River', border: true },
    'New Jersey': { neighbor: 'New York', river: 'the Delaware River', border: true },
    'New Mexico': { neighbor: 'Texas', river: 'the Rio Grande', border: true },
    'New York': { neighbor: 'Pennsylvania', river: 'the Hudson River', border: false },
    'North Carolina': { neighbor: 'Virginia', river: 'the Neuse River', border: false },
    'North Dakota': { neighbor: 'Canada', river: 'the Missouri River', border: false },
    'Ohio': { neighbor: 'Pennsylvania', river: 'the Ohio River', border: true },
    'Oklahoma': { neighbor: 'Texas', river: 'the Canadian River', border: false },
    'Oregon': { neighbor: 'Washington', river: 'the Columbia River', border: true },
    'Pennsylvania': { neighbor: 'New York', river: 'the Delaware River', border: true },
    'Rhode Island': { neighbor: 'Massachusetts', river: 'the Blackstone River', border: false },
    'South Carolina': { neighbor: 'North Carolina', river: 'the Savannah River', border: true },
    'South Dakota': { neighbor: 'North Dakota', river: 'the Missouri River', border: true },
    'Tennessee': { neighbor: 'Kentucky', river: 'the Tennessee River', border: false },
    'Texas': { neighbor: 'Oklahoma', river: 'the Rio Grande', border: true },
    'Utah': { neighbor: 'Idaho', river: 'the Green River', border: false },
    'Vermont': { neighbor: 'New Hampshire', river: 'the Connecticut River', border: true },
    'Virginia': { neighbor: 'West Virginia', river: 'the James River', border: false },
    'Washington': { neighbor: 'Oregon', river: 'the Columbia River', border: true },
    'West Virginia': { neighbor: 'Virginia', river: 'the New River', border: false },
    'Wisconsin': { neighbor: 'Illinois', river: 'the Wisconsin River', border: false },
    'Wyoming': { neighbor: 'Colorado', river: 'the North Platte River', border: false },
  };

  var el = {
    canvas: document.getElementById('map'),
    prompt: document.getElementById('prompt'),
    askLabel: document.getElementById('askLabel'),
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
    peekBtn: document.getElementById('peekBtn'),
    regionsBtn: document.getElementById('regionsBtn'),
    streak: document.getElementById('streak'),
    streakCount: document.getElementById('streakCount'),
    toast: document.getElementById('toast'),
    burst: document.getElementById('burst'),
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
    // States and trivia both ask about a state; only cities carry their own label.
    return game.mode === 'cities' ? item.label : item.name;
  }

  function displayName(item) {
    return game.mode === 'cities' ? item.name + ', ' + item.state : item.name;
  }

  /* ---- answer card -------------------------------------------------- */

  // Rotated so 48 answers in a row do not read as the same sentence twice.
  var CHEERS = ['Nailed it!', 'Yes!', 'Got it!', 'Spot on!', 'Exactly!', 'That’s the one!'];
  var CHEERS_CLEAN = ['Straight away!', 'First try!', 'No hesitation!'];
  var CONSOLE_LINES = [
    'Now you know.',
    'You’ll have it next time.',
    'One to remember.',
    'File that one away.',
    'Next time it’s yours.',
  ];

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  var burstTimers = [];

  // Clears the card immediately and drops any pending step, so restarting or
  // leaving mid-celebration cannot advance the round underneath the new one.
  function clearBurst() {
    burstTimers.forEach(clearTimeout);
    burstTimers = [];
    el.burst.className = 'burst';
    el.burst.textContent = '';
    game.blocked = false;
  }

  function showBurst(kind, head, name, note, hold, then) {
    clearBurst();

    var card = document.createElement('div');
    card.className = 'burst-card';
    var rows = kind === 'hit'
      ? [['burst-glyph', '✓'], ['burst-head', head], ['burst-name', name], ['burst-note', note]]
      : [['burst-head', head], ['burst-name', name], ['burst-note', note]];
    rows.forEach(function (row) {
      if (!row[1]) return;
      var d = document.createElement('div');
      d.className = row[0];
      d.textContent = row[1];
      card.appendChild(d);
    });
    el.burst.textContent = '';
    el.burst.appendChild(card);
    el.burst.className = 'burst show ' + kind;

    // Taps are ignored while the card is up, so a fast click cannot answer the
    // next question before it has been shown.
    game.blocked = true;

    burstTimers.push(
      setTimeout(function () {
        el.burst.classList.add('out');
        burstTimers.push(
          setTimeout(function () {
            clearBurst();
            then();
          }, 300)
        );
      }, hold)
    );
  }

  // Clue text carries **bold** and *italic* markers. Build real elements rather
  // than assigning innerHTML, so the data can never inject markup.
  function renderClue(host, text) {
    host.textContent = '';
    var re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      if (m.index > last) host.appendChild(document.createTextNode(text.slice(last, m.index)));
      var mark = document.createElement(m[1] ? 'b' : 'i');
      mark.textContent = m[1] || m[2];
      host.appendChild(mark);
      last = re.lastIndex;
    }
    if (last < text.length) host.appendChild(document.createTextNode(text.slice(last)));
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
    if (game.mode === 'trivia') {
      // Only states the map can actually be clicked on, and that have clues —
      // Alaska and Hawaii have clues but are not drawn.
      var asked = map.states.filter(function (s) {
        return !!TRIVIA_CLUES[s.name];
      });
      if (only) {
        asked = asked.filter(function (s) {
          return only.indexOf(s.name) !== -1;
        });
      }
      return shuffle(asked);
    }
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
    clearBurst();
    lastTapAt = -Infinity;
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
    if (game.mode !== 'cities') map.activeCities = [];

    hideOverlay();
    el.progressTotal.textContent = '/ ' + game.queue.length;
    say(
      game.mode === 'trivia'
        ? 'Read the clue and click the state. A wrong guess buys an easier clue.'
        : game.mode === 'states'
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
    var trivia = game.mode === 'trivia';
    el.prompt.classList.toggle('clue', trivia);
    el.askLabel.textContent = trivia ? 'Which state' : 'Where is';
    // Nothing sits under the clue: the answer card carries the result, and a
    // running commentary would only compete with the clue for attention.
    el.feedback.hidden = trivia;
    if (trivia && item) {
      // Each spent try buys the next, easier clue.
      var clues = TRIVIA_CLUES[item.name];
      var step = Math.min(MAX_TRIES - game.tries, clues.length - 1);
      renderClue(el.prompt, clues[step]);
    } else {
      el.prompt.textContent = item ? labelOf(item) : '—';
    }
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
    map.addReveal(game.mode === 'cities' ? item.state : item.name, 'hit');

    var praise =
      game.tries === MAX_TRIES ? 'Correct!' : game.tries === 2 ? 'Got it.' : 'Got it — last try.';
    var extra =
      game.mode === 'cities'
        ? ' ' + item.name + ', ' + item.state + '.'
        : ' ' + item.name + ' locked in.';
    var tail = ' +' + earned;
    if (reward) tail += ' and +' + reward.bonus + ' streak bonus';
    else if (clean && game.streak >= 2) tail += ' · ' + game.streak + ' in a row';

    var message = praise + extra + tail;
    if (game.mode !== 'cities' && STATE_FACTS[item.name]) {
      var fact = STATE_FACTS[item.name];
      if (fact.border) {
        message += '\n' + item.name + ' borders ' + fact.neighbor + ' along ' + fact.river + '.';
      } else {
        message += '\n' + item.name + ' borders ' + fact.neighbor + ' and includes ' + fact.river + '.';
      }
    }
    say(message, 'good');
    showBurst(
      'hit',
      clean ? pick(CHEERS_CLEAN) : pick(CHEERS),
      displayName(item),
      '+' + earned + (earned === 1 ? ' point' : ' points') +
        (reward ? '  ·  +' + reward.bonus + ' streak' : ''),
      1150,
      advance
    );
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
    map.addReveal(game.mode === 'cities' ? item.state : item.name, 'miss');
    say(
      'Out of tries — that is ' +
        (game.mode === 'cities' ? item.name + ', ' + item.state : item.name) +
        ', shown in red.',
      'bad'
    );
    // Held longer than a correct answer: this card is the only chance to study
    // the one that got away before the round moves on.
    showBurst('miss', 'It was', displayName(item), pick(CONSOLE_LINES), 1900, advance);
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

  // Trivia never gives distance or direction hints: the states are all named
  // on screen, so the only thing being tested is the clue.
  function answerTrivia(x, y, item) {
    var clicked = map.stateAt(x, y, 7);
    if (clicked && clicked.name === item.name) {
      onCorrect(item, x, y);
      return;
    }
    var lead = clicked ? 'Not ' + clicked.name + '. ' : 'That is out at sea. ';
    if (game.tries > 1) lead += 'Here is another clue.';
    onMiss(item, lead, 'bad');
  }

  // A double-click is one intent, not two guesses. Without this guard the
  // second click of a natural double-click spends another try — which in Trivia
  // silently skips a clue, and in the other modes throws away a life.
  var TAP_DEBOUNCE_MS = 450;
  var lastTapAt = -Infinity;

  map.onTap = function (x, y) {
    if (!game.running || game.blocked) return;
    var now = performance.now();
    if (now - lastTapAt < TAP_DEBOUNCE_MS) return;
    lastTapAt = now;
    var item = current();
    if (!item) return;
    if (game.mode === 'trivia') answerTrivia(x, y, item);
    else if (game.mode === 'states') answerState(x, y, item);
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
    clearBurst();
    game.running = false;
    var isCities = game.mode === 'cities';
    var isTrivia = game.mode === 'trivia';
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
        '<h2 class="title">State the <em>Facts!</em></h2>' +
        '<hr class="title-rule">' +
        '<p class="tagline">No state lines to trace — just terrain, rivers and coast, the way the ' +
        'country actually looks. Find each place by its geography and the borders fill in behind you.</p>' +
        '<div class="mode-cards" id="modeCards">' +
        '<button class="mode-card' + (game.mode === 'states' ? ' is-on' : '') + '" data-mode="states">' +
        '<b>The lower 48</b><span>Every state on a blank map, three tries each</span></button>' +
        '<button class="mode-card' + (isCities ? ' is-on' : '') + '" data-mode="cities">' +
        '<b>Major cities</b><span>Place the biggest cities, borders shown</span></button>' +
        '<button class="mode-card' + (isTrivia ? ' is-on' : '') + '" data-mode="trivia">' +
        '<b>Trivia</b><span>Name the state from a clue, on a labelled map</span></button>' +
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
        (game.mode === 'states'
          ? 'All 48 states'
          : game.mode === 'trivia'
          ? 'Trivia · 48 clues'
          : 'Top ' + game.citySize + ' cities') +
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
    // Trivia already draws every border, so Peek has nothing left to reveal.
    el.peekBtn.disabled = mode === 'trivia';
    el.peekBtn.title = mode === 'trivia'
      ? 'Trivia already shows every border'
      : 'Show all state boundaries';
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

  function setPeek(on) {
    map.peek = on;
    el.peekBtn.classList.toggle('is-on', on);
    el.peekBtn.setAttribute('aria-checked', on ? 'true' : 'false');
    try {
      localStorage.setItem('usgeo.peek', on ? '1' : '0');
    } catch (e) {
      /* not fatal */
    }
    map.requestDraw();
  }

  el.peekBtn.addEventListener('click', function () {
    setPeek(!map.peek);
  });

  // Shades every state by its region and shows the legend beside the map.
  // Lives here rather than in regions.js because that file cannot see this
  // `map` — the canvas carries id="map", so a bare `map` out there resolves to
  // the element, not the view.
  function setRegionColors(on) {
    map.regionColors = on;
    el.regionsBtn.classList.toggle('is-on', on);
    el.regionsBtn.setAttribute('aria-checked', on ? 'true' : 'false');
    regionsUI.setVisible(on);
    // The legend floats over the map rather than taking space from it, so the
    // canvas keeps its size and only needs a repaint.
    map.requestDraw();
  }

  regionsUI.build(map.states);

  el.regionsBtn.addEventListener('click', function () {
    setRegionColors(!map.regionColors);
  });

  // Deliberately not remembered across reloads, unlike Terrain and Peek: the
  // region wash is a study overlay, and the plain map is the game.
  setRegionColors(false);

  var savedTerrain = null;
  try {
    savedTerrain = localStorage.getItem('usgeo.terrain');
  } catch (e) {
    /* not fatal */
  }
  setTerrain(savedTerrain !== '0');

  var savedPeek = null;
  try {
    savedPeek = localStorage.getItem('usgeo.peek');
  } catch (e) {
    /* not fatal */
  }
  setPeek(savedPeek === '1');

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
