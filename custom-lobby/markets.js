/**
 * markets.js — Race Markets Detail Page
 * Golden Race Custom Lobby
 *
 * Reads ?race=<key> from URL, loads data/races.json, renders:
 *  - Race header title bar + compact recap table
 *  - 5 market panels (Win/Place/Show, Even/Odd, Over/Under,
 *    Esatta/Quinella, Trifecta)
 *  - Sticky right sidebar (Betslip tabs, race-info card,
 *    Race lineup, GlobalJackpot teaser, Place Bet CTA)
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Static maps
  ------------------------------------------------------------------ */
  var RACE_TITLES = {
    dog_race_1:   'Greyhound Racing: London',
    dog_race_2:   'Greyhound Racing: Hove',
    horse_race_1: 'Horse Racing: Royal Ascot'
  };

  var RACE_HEROES = {
    dog_race_1:   'assets/hero/dog-race.jpg',
    dog_race_2:   'assets/hero/dog-race.jpg',
    horse_race_1: 'assets/hero/horse-race-v2.png'
  };

  /* Per-race-type theme (mirrors lobby's RACE_THEMES). */
  var RACE_THEMES = {
    dog_race_1:   { gameType: 'dos', shieldDir: 'assets/dos-shields/dos-', titleStart: '#05215c', titleEnd: '#021138' },
    dog_race_2:   { gameType: 'doe', shieldDir: 'assets/doe-shields/doe-', titleStart: '#0e432d', titleEnd: '#0a241b' },
    horse_race_1: { gameType: 'hoc', shieldDir: 'assets/hoc-shields/hoc-', titleStart: '#b0bac3', titleEnd: '#7a8390' }
  };

  // Track the active race theme for builders below to consult.
  var ACTIVE_THEME = RACE_THEMES.dog_race_1;
  function shieldFor(pos) { return ACTIVE_THEME.shieldDir + pos + '.svg'; }

  /* ------------------------------------------------------------------
     Helpers
  ------------------------------------------------------------------ */

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function fmt(val) {
    var n = parseFloat(val);
    return isNaN(n) || n <= 0 ? '—' : n.toFixed(2);
  }

  /**
   * Compute WIN / PLACE / SHOW odds.
   * PLACE = WIN / 2.2  (approx. bookmaker convention ~45% of win)
   * SHOW  = WIN / 3.8  (approx. bookmaker convention ~26% of win)
   * NOTE: oddValues[N..2N-1] and [2N..3N-1] contain forecast combinations
   * for dogs and misaligned place markets for horses; approximation is used.
   */
  function computeOdds(oddValues, i) {
    var winRaw = parseFloat(oddValues[i]);
    if (isNaN(winRaw) || winRaw <= 0) return { win: '—', place: '—', show: '—' };
    return {
      win:   winRaw.toFixed(2),
      place: (winRaw / 2.2).toFixed(2),
      show:  (winRaw / 3.8).toFixed(2)
    };
  }

  function renderForecast(forecast) {
    if (!forecast || !forecast.length) return '<span class="forecast-empty">—</span>';
    var html = '<span class="forecast-cells">';
    for (var i = 0; i < forecast.length; i++) {
      var val = forecast[i];
      var display = (val === '0') ? 'X' : esc(val);
      var cls = (val === '0') ? 'fc-cell fc-scratch' : 'fc-cell';
      html += '<span class="' + cls + '">' + display + '</span>';
    }
    html += '</span>';
    return html;
  }

  function renderStars(star) {
    var s = Math.max(0, Math.min(5, Math.round(star)));
    var html = '<span class="star-rating" aria-label="' + s + ' out of 5 stars">';
    html += '<span class="star-label">' + s + '/5</span>';
    for (var i = 0; i < 5; i++) {
      html += i < s
        ? '<span class="star-filled">&#9733;</span>'
        : '<span class="star-empty">&#9734;</span>';
    }
    html += '</span>';
    return html;
  }

  function renderPerformance(form) {
    var pct = Math.max(0, Math.min(100, Math.round(form * 100)));
    return '<span class="perf-wrap">'
      + '<span class="perf-pct">' + pct + '%</span>'
      + '<span class="perf-track"><span class="perf-fill" style="width:' + pct + '%"></span></span>'
      + '</span>';
  }

  /* ------------------------------------------------------------------
     Recap table (condensed, same 8 columns as lobby card)
  ------------------------------------------------------------------ */
  function buildRecapTable(participants, oddValues, hatDir, eventId) {
    var N = participants.length;
    var header = '<thead><tr class="col-header-row">'
      + '<th class="th-hat" scope="col"><img src="assets/icons/tv.svg" class="th-hat-icon" alt=""></th>'
      + '<th class="th-name" scope="col"></th>'
      + '<th class="th-forecast" scope="col">Last Results</th>'
      + '<th class="th-perf" scope="col">Performance</th>'
      + '<th class="th-rating" scope="col">Rating</th>'
      + '<th class="th-win" scope="col">WIN</th>'
      + '<th class="th-place" scope="col">PLACE</th>'
      + '<th class="th-show" scope="col">SHOW</th>'
      + '</tr></thead>';

    var rows = participants.map(function (p, i) {
      var pos = i + 1;
      var hatSrc = shieldFor(pos);
      var odds = computeOdds(oddValues, i);
      return '<tr class="participant-row">'
        + '<td class="td-hat"><span class="hat-post-wrap">'
        + '<img class="hat-img hat-img--shield" src="' + esc(hatSrc) + '" alt="Post ' + pos + '">'
        + ''
        + '</span></td>'
        + '<td class="td-name"><span class="participant-name">' + esc(p.name) + '</span></td>'
        + '<td class="td-forecast">' + renderForecast(p.forecast) + '</td>'
        + '<td class="td-perf">' + renderPerformance(p.form) + '</td>'
        + '<td class="td-rating">' + renderStars(p.star) + '</td>'
        + '<td class="td-odd td-win"><span class="odd-box">' + esc(odds.win) + '</span></td>'
        + '<td class="td-odd td-place"><span class="odd-box">' + esc(odds.place) + '</span></td>'
        + '<td class="td-odd td-show"><span class="odd-box">' + esc(odds.show) + '</span></td>'
        + '</tr>';
    }).join('');

    return '<div class="participants-table mrh-recap-table">'
      + '<table role="table" aria-label="Runners recap for event ' + eventId + '">'
      + '<colgroup>'
      + '<col class="col-hat"><col class="col-name"><col class="col-forecast">'
      + '<col class="col-perf"><col class="col-rating">'
      + '<col class="col-win"><col class="col-place"><col class="col-show">'
      + '</colgroup>'
      + header
      + '<tbody>' + rows + '</tbody>'
      + '</table></div>';
  }

  /* ------------------------------------------------------------------
     Market panel builder
  ------------------------------------------------------------------ */

  function buildPanel(titleText, bodyHTML) {
    return '<div class="market-panel">'
      + '<div class="market-panel-header">' + esc(titleText) + '</div>'
      + '<div class="market-panel-body">' + bodyHTML + '</div>'
      + '</div>';
  }

  function buildPanelWithCTA(titleText, bodyHTML) {
    return '<div class="market-panel">'
      + '<div class="market-panel-header">' + esc(titleText) + '</div>'
      + '<div class="market-panel-body">' + bodyHTML + '</div>'
      + '<div class="market-panel-footer">'
      + '<button class="btn-add-betslip" type="button">Add to Betslip</button>'
      + '</div>'
      + '</div>';
  }

  /* ── Panel 1: Win/Place/Show ── */
  function buildWinPlaceShow(participants, oddValues, hatDir) {
    var header = '<thead><tr class="col-header-row">'
      + '<th class="th-hat mkt-th" scope="col"></th>'
      + '<th class="th-name mkt-th" scope="col">Name</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">WIN</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">PLACE</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">SHOW</th>'
      + '</tr></thead>';

    var rows = participants.map(function (p, i) {
      var pos = i + 1;
      var hatSrc = shieldFor(pos);
      var odds = computeOdds(oddValues, i);
      return '<tr class="participant-row">'
        + '<td class="td-hat"><span class="hat-post-wrap">'
        + '<img class="hat-img hat-img--shield" src="' + esc(hatSrc) + '" alt="Post ' + pos + '">'
        + ''
        + '</span></td>'
        + '<td class="td-name"><span class="participant-name">' + esc(p.name) + '</span></td>'
        + '<td class="td-odd td-win"><span class="odd-box mkt-odd-box">' + esc(odds.win) + '</span></td>'
        + '<td class="td-odd td-place"><span class="odd-box mkt-odd-box">' + esc(odds.place) + '</span></td>'
        + '<td class="td-odd td-show"><span class="odd-box mkt-odd-box">' + esc(odds.show) + '</span></td>'
        + '</tr>';
    }).join('');

    var tableHTML = '<div class="mkt-table-wrap">'
      + '<table class="mkt-table" role="table">'
      + '<colgroup>'
      + '<col style="width:56px"><col><col style="width:72px"><col style="width:72px"><col style="width:72px">'
      + '</colgroup>'
      + header + '<tbody>' + rows + '</tbody>'
      + '</table></div>';

    return buildPanel('Win/Place/Show', tableHTML);
  }

  /* ── Panel 2: Even/Odd ── */
  function buildEvenOdd(oddValues) {
    var evenVal = fmt(oddValues[60]);
    var oddVal  = fmt(oddValues[61]);
    if (evenVal === '—') evenVal = '1.95';
    if (oddVal  === '—') oddVal  = '1.95';

    var body = '<div class="mkt-table-wrap">'
      + '<table class="mkt-table" role="table">'
      + '<colgroup><col><col style="width:100px"></colgroup>'
      + '<tbody>'
      + '<tr class="participant-row"><td class="td-name"><span class="participant-name">Even</span></td>'
      + '<td class="td-odd td-win"><span class="odd-box mkt-odd-box">' + evenVal + '</span></td></tr>'
      + '<tr class="participant-row"><td class="td-name"><span class="participant-name">Odd</span></td>'
      + '<td class="td-odd"><span class="odd-box mkt-odd-box">' + oddVal + '</span></td></tr>'
      + '</tbody></table></div>';

    return buildPanel('Even/Odd', body);
  }

  /* ── Panel 3: Over/Under ── */
  function buildOverUnder(oddValues) {
    var underVal = fmt(oddValues[58]);
    var overVal  = fmt(oddValues[59]);
    if (underVal === '—') underVal = '2.05';
    if (overVal  === '—') overVal  = '1.75';

    var body = '<div class="mkt-table-wrap">'
      + '<table class="mkt-table" role="table">'
      + '<colgroup><col><col style="width:100px"></colgroup>'
      + '<tbody>'
      + '<tr class="participant-row"><td class="td-name"><span class="participant-name">Under 4.5</span></td>'
      + '<td class="td-odd td-win"><span class="odd-box mkt-odd-box">' + underVal + '</span></td></tr>'
      + '<tr class="participant-row"><td class="td-name"><span class="participant-name">Over 4.5</span></td>'
      + '<td class="td-odd"><span class="odd-box mkt-odd-box">' + overVal + '</span></td></tr>'
      + '</tbody></table></div>';

    return buildPanel('Over/Under', body);
  }

  /* ── Panel 4: Esatta/Quinella ── */
  function buildEsattaQuinella(participants, oddValues, hatDir) {
    var header = '<thead><tr class="col-header-row">'
      + '<th class="th-hat mkt-th" scope="col"></th>'
      + '<th class="th-name mkt-th" scope="col">Name</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">Quote Prima</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">EXATTA</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">QUINELLA</th>'
      + '</tr></thead>';

    var rows = participants.map(function (p, i) {
      var pos = i + 1;
      var hatSrc = shieldFor(pos);
      var quotePrima = fmt(oddValues[i]);
      // Esatta / Quinella: use oddValues at offset 2*N+i for orientation,
      // most cells show em-dash as per spec (reliable mapping unavailable)
      return '<tr class="participant-row">'
        + '<td class="td-hat"><span class="hat-post-wrap">'
        + '<img class="hat-img hat-img--shield" src="' + esc(hatSrc) + '" alt="Post ' + pos + '">'
        + ''
        + '</span></td>'
        + '<td class="td-name"><span class="participant-name">' + esc(p.name) + '</span></td>'
        + '<td class="td-odd td-win"><span class="odd-box mkt-odd-box">' + quotePrima + '</span></td>'
        + '<td class="td-odd"><span class="odd-box mkt-odd-box mkt-dash">—</span></td>'
        + '<td class="td-odd"><span class="odd-box mkt-odd-box mkt-dash">—</span></td>'
        + '</tr>';
    }).join('');

    var tableHTML = '<div class="mkt-table-wrap">'
      + '<table class="mkt-table" role="table">'
      + '<colgroup>'
      + '<col style="width:56px"><col><col style="width:88px"><col style="width:80px"><col style="width:80px">'
      + '</colgroup>'
      + header + '<tbody>' + rows + '</tbody>'
      + '</table></div>';

    return buildPanelWithCTA('Esatta/Schiavin', tableHTML);
  }

  /* ── Panel 5: Trifecta ── */
  function buildTrifecta(participants, oddValues, hatDir) {
    var header = '<thead><tr class="col-header-row">'
      + '<th class="th-hat mkt-th" scope="col"></th>'
      + '<th class="th-name mkt-th" scope="col">Name</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">Quote Prima</th>'
      + '<th class="mkt-th mkt-th-odd" scope="col">TRIFECTA</th>'
      + '</tr></thead>';

    var rows = participants.map(function (p, i) {
      var pos = i + 1;
      var hatSrc = shieldFor(pos);
      var quotePrima = fmt(oddValues[i]);
      return '<tr class="participant-row">'
        + '<td class="td-hat"><span class="hat-post-wrap">'
        + '<img class="hat-img hat-img--shield" src="' + esc(hatSrc) + '" alt="Post ' + pos + '">'
        + ''
        + '</span></td>'
        + '<td class="td-name"><span class="participant-name">' + esc(p.name) + '</span></td>'
        + '<td class="td-odd td-win"><span class="odd-box mkt-odd-box">' + quotePrima + '</span></td>'
        + '<td class="td-odd"><span class="odd-box mkt-odd-box mkt-dash">—</span></td>'
        + '</tr>';
    }).join('');

    var tableHTML = '<div class="mkt-table-wrap">'
      + '<table class="mkt-table" role="table">'
      + '<colgroup>'
      + '<col style="width:56px"><col><col style="width:88px"><col style="width:80px">'
      + '</colgroup>'
      + header + '<tbody>' + rows + '</tbody>'
      + '</table></div>';

    return buildPanelWithCTA('Trifecta', tableHTML);
  }

  /* ------------------------------------------------------------------
     Sidebar lineup
  ------------------------------------------------------------------ */
  function buildLineupTable(participants, oddValues, hatDir) {
    var rows = participants.map(function (p, i) {
      var pos = i + 1;
      var hatSrc = shieldFor(pos);
      var odds = computeOdds(oddValues, i);
      return '<tr class="lineup-row">'
        + '<td class="lineup-td-hat">'
        + '<img class="lineup-hat-img" src="' + esc(hatSrc) + '" alt="Post ' + pos + '" width="18" height="18">'
        + '<span class="lineup-post">' + pos + '</span>'
        + '</td>'
        + '<td class="lineup-td-name">' + esc(p.name) + '</td>'
        + '<td class="lineup-td-odd lineup-td-w">' + esc(odds.win) + '</td>'
        + '<td class="lineup-td-odd lineup-td-p">' + esc(odds.place) + '</td>'
        + '<td class="lineup-td-odd lineup-td-s">' + esc(odds.show) + '</td>'
        + '</tr>';
    }).join('');

    return '<table class="lineup-table" aria-label="Race lineup">'
      + '<thead><tr class="lineup-header-row">'
      + '<th class="lineup-th" colspan="2">Runner</th>'
      + '<th class="lineup-th">W</th>'
      + '<th class="lineup-th">P</th>'
      + '<th class="lineup-th">S</th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table>';
  }

  /* ------------------------------------------------------------------
     Tab switcher
  ------------------------------------------------------------------ */
  window.switchTab = function (tab) {
    document.getElementById('panel-betslip').classList.toggle('hidden', tab !== 'betslip');
    document.getElementById('panel-mybets').classList.toggle('hidden', tab !== 'mybets');
    document.getElementById('tab-betslip').classList.toggle('active', tab === 'betslip');
    document.getElementById('tab-betslip').setAttribute('aria-selected', tab === 'betslip');
    document.getElementById('tab-mybets').classList.toggle('active', tab === 'mybets');
    document.getElementById('tab-mybets').setAttribute('aria-selected', tab === 'mybets');
  };

  /* ------------------------------------------------------------------
     Main render
  ------------------------------------------------------------------ */
  function renderMarketsPage(raceKey, races) {
    var raceData = races[raceKey];
    if (!raceData) {
      document.getElementById('markets-panels').innerHTML =
        '<div class="lobby-error">Race not found: <strong>' + esc(raceKey) + '</strong></div>';
      return;
    }

    var isDog        = raceData.classType === 'DogParticipant';
    var hatDir       = isDog ? 'dog' : 'horse';
    var eventId      = raceData.eventId;
    var participants = raceData.event.data.participants;
    var oddValues    = raceData.event.data.oddValues || [];

    // Lock in the race-specific theme so shieldFor() resolves to the right
    // shield set, and so the title bar gradient + light/dark text matches.
    ACTIVE_THEME = RACE_THEMES[raceKey] || RACE_THEMES.dog_race_1;

    var titleBase = RACE_TITLES[raceKey] || (isDog ? 'Greyhound Racing' : 'Horse Racing');
    var heroSrc   = RACE_HEROES[raceKey];
    var fullTitle = titleBase + ' #' + eventId;

    /* -- Apply theme to the title bar of the race header -- */
    var mrhBar = document.getElementById('mrh-title-bar');
    if (mrhBar) {
      mrhBar.style.background =
        'linear-gradient(180deg, ' + ACTIVE_THEME.titleStart + ', ' + ACTIVE_THEME.titleEnd + ')';
      mrhBar.style.color = ACTIVE_THEME.gameType === 'hoc' ? '#222' : '#fff';
      if (ACTIVE_THEME.gameType === 'hoc') {
        mrhBar.classList.add('card-title-bar--light');
      } else {
        mrhBar.classList.remove('card-title-bar--light');
      }
    }

    /* -- Update page title -- */
    document.title = fullTitle + ' — Golden Race';

    /* -- Navbar breadcrumb -- */
    var navTitle = document.getElementById('nav-race-title');
    if (navTitle) navTitle.textContent = titleBase;

    /* -- Race header title bar -- */
    var mrh = document.getElementById('mrh-race-title');
    if (mrh) mrh.innerHTML = esc(titleBase) + ' <span class="card-event-id">#' + eventId + '</span>';

    /* -- WATCH link -- */
    var watchLink = document.getElementById('mrh-watch-link');
    if (watchLink) watchLink.href = 'markets.html?race=' + encodeURIComponent(raceKey) + '&play=1';

    /* -- Recap table -- */
    var recapWrap = document.getElementById('mrh-recap-table-wrap');
    if (recapWrap) {
      recapWrap.innerHTML = buildRecapTable(participants, oddValues, hatDir, eventId);
    }

    /* -- Market panels (in specified order) -- */
    var panelsEl = document.getElementById('markets-panels');
    if (panelsEl) {
      panelsEl.innerHTML =
        buildWinPlaceShow(participants, oddValues, hatDir)
        + buildEvenOdd(oddValues)
        + buildOverUnder(oddValues)
        + buildEsattaQuinella(participants, oddValues, hatDir)
        + buildTrifecta(participants, oddValues, hatDir);
    }

    /* -- Sidebar hero -- */
    var heroImg = document.getElementById('src-hero-img');
    if (heroImg) {
      heroImg.src = heroSrc;
      heroImg.alt = esc(titleBase) + ' race photo';
    }
    var heroTitle = document.getElementById('src-hero-title');
    if (heroTitle) heroTitle.textContent = fullTitle;

    /* -- Sidebar lineup -- */
    var lineupWrap = document.getElementById('lineup-table-wrap');
    if (lineupWrap) {
      lineupWrap.innerHTML = buildLineupTable(participants, oddValues, hatDir);
    }

    /* -- Real-data countdown from startsAtMs -- */
    var countdownEl = document.getElementById('src-hero-countdown');
    var startsAtMs = raceData.startsAtMs || 0;

    function updateSidebarCountdown() {
      if (!countdownEl) return;
      /* Once showing LIVE, stop updating */
      if (countdownEl.classList.contains('countdown-live')) return;

      var diff = startsAtMs - Date.now();
      if (diff <= 0) {
        countdownEl.textContent = 'LIVE';
        countdownEl.classList.add('countdown-live');
      } else {
        var totalSec = Math.ceil(diff / 1000);
        var mm = Math.floor(totalSec / 60);
        var ss = totalSec % 60;
        countdownEl.textContent =
          (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
      }
    }

    /* Run immediately, then every second */
    updateSidebarCountdown();
    setInterval(updateSidebarCountdown, 1000);
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    /* Read ?race= param */
    var params = new URLSearchParams(window.location.search);
    var raceKey = params.get('race') || 'horse_race_1';

    fetch('data/races.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
        return response.json();
      })
      .then(function (races) {
        renderMarketsPage(raceKey, races);
      })
      .catch(function (err) {
        var panelsEl = document.getElementById('markets-panels');
        if (panelsEl) {
          panelsEl.innerHTML =
            '<div class="lobby-error"><strong>Could not load race data.</strong><br>'
            + (err.message || 'Unknown error') + '</div>';
        }
      });
  });

})();
