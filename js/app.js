/* Xenoguesser :: app controller
 * Game flow, DOM rendering, and the post-verdict causal-chain reveal.
 */
(function (XG) {
  'use strict';

  var state = { spec: null, cats: null, answers: {}, submitted: false, seed: null };

  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ---- new specimen ----
  function newGame(seed) {
    var rng0 = XG.RNG(seed || (Date.now() + '' + Math.random()));
    var s = seed || XG.makeSeedWord(rng0);
    state.seed = s;
    state.spec = XG.engine.simulate(s);
    var rng = XG.RNG(s + '::guess');
    state.cats = XG.scoring.buildGuessForm(state.spec, rng);
    state.answers = {};
    state.submitted = false;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    $('#seed-label').textContent = state.seed;
    $('#designation').textContent = state.spec.designation;
    renderInstruments();
    renderGuess();
    $('#verdict').innerHTML = '';
    $('#verdict').classList.remove('show');
    $('#reveal').innerHTML = '';
    var btn = $('#submit-btn');
    btn.disabled = false;
    btn.textContent = 'Submit reconstruction';
  }

  // ---- instruments ----
  function renderInstruments() {
    var wrap = $('#instruments');
    wrap.innerHTML = '';
    var insts = XG.instruments.build(state.spec);
    var rng = XG.RNG(state.seed + '::glyph');

    insts.forEach(function (inst) {
      var card = el('article', 'instrument card');
      var head = el('header', 'inst-head');
      head.innerHTML = '<span class="inst-icon">' + inst.icon + '</span>' +
        '<div><h3>' + inst.name + '</h3><p class="inst-blurb">' + inst.blurb + '</p></div>';
      card.appendChild(head);

      var body = el('div', 'inst-body');
      if (inst.key === 'morphology') {
        var g = el('div', 'glyph');
        g.innerHTML = XG.instruments.glyph(state.spec, rng);
        body.appendChild(g);
      }
      if (inst.readings.length) {
        inst.readings.forEach(function (rd) {
          var item = el('div', 'reading');
          item.innerHTML = '<h4>' + rd.title + '</h4><p>' + rd.reveal + '</p>';
          body.appendChild(item);
        });
      } else {
        body.appendChild(el('p', 'reading-empty', inst.empty));
      }
      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  // ---- guess form ----
  function renderGuess() {
    var wrap = $('#guess');
    wrap.innerHTML = '';
    state.cats.forEach(function (cat) {
      var block = el('section', 'guess-cat');
      block.appendChild(el('h3', 'guess-title', cat.title));
      block.appendChild(el('p', 'guess-prompt', cat.prompt));

      var optWrap = el('div', cat.mode === 'multi' ? 'chips' : 'options');
      if (cat.mode === 'single') {
        cat.options.forEach(function (o) {
          var b = el('button', 'opt', o.label);
          b.type = 'button';
          b.addEventListener('click', function () {
            if (state.submitted) return;
            state.answers[cat.key] = o.id;
            optWrap.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('sel'); });
            b.classList.add('sel');
          });
          optWrap.appendChild(b);
        });
      } else {
        state.answers[cat.key] = state.answers[cat.key] || [];
        cat.chips.forEach(function (c) {
          var b = el('button', 'chip', c.label);
          b.type = 'button';
          b.addEventListener('click', function () {
            if (state.submitted) return;
            var arr = state.answers[cat.key];
            var idx = arr.indexOf(c.tag);
            if (idx >= 0) { arr.splice(idx, 1); b.classList.remove('sel'); }
            else { arr.push(c.tag); b.classList.add('sel'); }
          });
          optWrap.appendChild(b);
        });
      }
      block.appendChild(optWrap);
      wrap.appendChild(block);
    });
  }

  // ---- submit & verdict ----
  function submit() {
    if (state.submitted) return;
    state.submitted = true;
    $('#submit-btn').disabled = true;
    var result = XG.scoring.scoreForm(state.cats, state.answers);
    renderVerdict(result);
    renderReveal(result);
    $('#verdict').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderVerdict(result) {
    var v = $('#verdict');
    v.classList.add('show');
    var ring = '<div class="score-ring" style="--p:' + result.percent + '"><span>' + result.percent + '<small>%</small></span></div>';
    var bars = result.results.map(function (r) {
      var pct = Math.round(r.score * 100);
      var cls = r.exact ? 'bar exact' : (pct >= 50 ? 'bar good' : 'bar weak');
      return '<div class="cat-score"><span class="cat-name">' + r.title + '</span>' +
        '<span class="' + cls + '"><i style="width:' + pct + '%"></i></span>' +
        '<span class="cat-pct">' + pct + '%</span></div>';
    }).join('');
    v.innerHTML =
      '<div class="verdict-top">' + ring +
      '<div><h2>' + result.verdict.rank + '</h2><p>' + result.verdict.note + '</p></div></div>' +
      '<div class="cat-scores">' + bars + '</div>';
  }

  // ---- the payoff: full causal chain, worldseed -> final form ----
  function renderReveal(result) {
    var r = $('#reveal');
    var spec = state.spec;
    var ws = spec.worldseed.choices;

    var seedRows = '';
    Object.keys(ws).forEach(function (k) {
      var dim = XG.DIMENSIONS.find(function (d) { return d.key === k; }) ||
        XG.CELESTIAL.find(function (d) { return d.key === k; });
      if (!dim) return;
      seedRows += '<tr><td>' + dim.title + '</td><td>' + ws[k].label + '</td></tr>';
    });

    var stageOrder = ['ecology', 'body', 'senses', 'cognition', 'social', 'culture', 'tech', 'selfmod'];
    var stageNames = {
      ecology: 'Ecology', body: 'Body plan', senses: 'Senses', cognition: 'Cognition',
      social: 'Social structure', culture: 'Culture', tech: 'Technology', selfmod: 'Self-modification',
    };
    var chain = '';
    stageOrder.forEach(function (sk) {
      var traits = spec.record.filter(function (t) { return t.stage === sk; });
      if (!traits.length) return;
      chain += '<div class="chain-stage"><h4>' + stageNames[sk] + '</h4><ul>' +
        traits.map(function (t) { return '<li><b>' + t.title + '</b> — ' + t.reveal + '</li>'; }).join('') +
        '</ul></div>';
    });

    var inescapable = XG.concept.label(spec.rootPressure);

    r.innerHTML =
      '<h2 class="reveal-title">The hidden Worldseed</h2>' +
      '<p class="reveal-sub">Every trait you scanned was downstream of this. The final form could not lie.</p>' +
      '<div class="reveal-grid">' +
        '<div class="reveal-seed"><table>' + seedRows + '</table></div>' +
        '<div class="reveal-chain">' + chain + '</div>' +
      '</div>' +
      '<div class="reveal-root">The constraint it could never escape: <b>' + inescapable + '</b></div>' +
      '<button id="again-btn" class="primary">Peer into a new world →</button>';

    $('#again-btn').addEventListener('click', function () { newGame(); });
  }

  // ---- wiring ----
  function init() {
    $('#submit-btn').addEventListener('click', submit);
    $('#new-btn').addEventListener('click', function () { newGame(); });
    var shareTimer = null;
    $('#share-btn').addEventListener('click', function () {
      var url = location.origin + location.pathname + '?seed=' + encodeURIComponent(state.seed);
      navigator.clipboard && navigator.clipboard.writeText(url);
      var b = $('#share-btn');
      if (shareTimer) clearTimeout(shareTimer);
      b.textContent = 'Seed link copied';
      // restore to a fixed label so rapid re-clicks never freeze the temporary text
      shareTimer = setTimeout(function () { b.textContent = 'Share seed'; }, 1400);
    });
    $('#seedform').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('#seedinput').value.trim();
      if (v) newGame(v);
    });

    var params = new URLSearchParams(location.search);
    newGame(params.get('seed') || null);
  }

  document.addEventListener('DOMContentLoaded', init);
  XG.app = { newGame: newGame };
})(window.XG = window.XG || {});
