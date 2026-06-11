/* Xenoguesser :: 3D-first controller
 *
 * Wires the deterministic causal engine (window.XG.*) to the 3D scene and a
 * holographic HUD. The specimen lives in 3D; instruments and the reconstruction
 * form are overlays you summon.
 */
import { XenoScene } from './3d/scene.js';

const XG = window.XG;
const $ = (s) => document.querySelector(s);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

const state = { spec: null, cats: null, answers: {}, submitted: false, seed: null, scene: null, activeInst: null };

function newGame(seed) {
  const s = seed || XG.makeSeedWord(XG.RNG(Date.now() + '' + Math.random()));
  state.seed = s;
  state.spec = XG.engine.simulate(s);
  state.cats = XG.scoring.buildGuessForm(state.spec, XG.RNG(s + '::guess'));
  state.answers = {};
  state.submitted = false;
  state.scene.setSpecimen(state.spec);
  $('#seed-label').textContent = s;
  $('#designation').textContent = state.spec.designation;
  buildRail();
  closeOverlay();
  closeInstPanel();
}

// ---- instrument rail + panel ----
function buildRail() {
  const rail = $('#inst-rail');
  rail.innerHTML = '';
  state.insts = XG.instruments.build(state.spec);
  state.insts.forEach((inst) => {
    const b = el('button', 'rail-btn');
    b.innerHTML = `<span class="rail-ico">${inst.icon}</span><span class="rail-name">${inst.name}</span>`;
    b.addEventListener('click', () => openInst(inst.key, b));
    rail.appendChild(b);
  });
}

function openInst(key, btn) {
  if (state.activeInst === key) { closeInstPanel(); return; }
  state.activeInst = key;
  document.querySelectorAll('.rail-btn').forEach((x) => x.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const inst = state.insts.find((i) => i.key === key);
  const panel = $('#inst-panel');
  let body = inst.readings.length
    ? inst.readings.map((r) => `<div class="reading"><h4>${r.title}</h4><p>${r.reveal}</p></div>`).join('')
    : `<p class="reading-empty">${inst.empty}</p>`;
  panel.innerHTML = `<header class="panel-head"><span class="panel-ico">${inst.icon}</span>
      <div><h3>${inst.name}</h3><p class="panel-blurb">${inst.blurb}</p></div>
      <button class="panel-x" aria-label="close">✕</button></header>
    <div class="panel-body">${body}</div>`;
  panel.classList.remove('hidden');
  panel.querySelector('.panel-x').addEventListener('click', closeInstPanel);
}
function closeInstPanel() {
  state.activeInst = null;
  $('#inst-panel').classList.add('hidden');
  document.querySelectorAll('.rail-btn').forEach((x) => x.classList.remove('active'));
}

// ---- overlay (reconstruction / verdict / reveal) ----
function openOverlay() { $('#overlay').classList.remove('hidden'); }
function closeOverlay() { $('#overlay').classList.add('hidden'); $('#overlay').scrollTop = 0; }

function openReconstruct() {
  const o = $('#overlay');
  o.innerHTML = '';
  const wrap = el('div', 'overlay-inner');
  wrap.appendChild(el('button', 'overlay-x', '✕')).addEventListener('click', closeOverlay);
  wrap.appendChild(el('h2', 'overlay-title', 'Reconstruct the causal chain'));
  wrap.appendChild(el('p', 'overlay-sub', 'You are not guessing a planet. You are reconstructing causes. Partial credit is given for catching the right <em>pressure</em>, even if the exact label is wrong.'));
  const grid = el('div', 'guess-grid');
  state.cats.forEach((cat) => grid.appendChild(renderCat(cat)));
  wrap.appendChild(grid);
  const submit = el('button', 'primary big', 'Submit reconstruction');
  submit.addEventListener('click', () => doSubmit(wrap));
  wrap.appendChild(el('div', 'submit-row')).appendChild(submit);
  o.appendChild(wrap);
  openOverlay();
}

function renderCat(cat) {
  const block = el('section', 'guess-cat');
  block.appendChild(el('h3', 'guess-title', cat.title));
  block.appendChild(el('p', 'guess-prompt', cat.prompt));
  const wrap = el('div', cat.mode === 'multi' ? 'chips' : 'options');
  if (cat.mode === 'single') {
    cat.options.forEach((o) => {
      const b = el('button', 'opt', o.label); b.type = 'button';
      b.addEventListener('click', () => {
        if (state.submitted) return;
        state.answers[cat.key] = o.id;
        wrap.querySelectorAll('.opt').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
      });
      wrap.appendChild(b);
    });
  } else {
    state.answers[cat.key] = state.answers[cat.key] || [];
    cat.chips.forEach((c) => {
      const b = el('button', 'chip', c.label); b.type = 'button';
      b.addEventListener('click', () => {
        if (state.submitted) return;
        const arr = state.answers[cat.key];
        const i = arr.indexOf(c.tag);
        if (i >= 0) { arr.splice(i, 1); b.classList.remove('sel'); }
        else { arr.push(c.tag); b.classList.add('sel'); }
      });
      wrap.appendChild(b);
    });
  }
  block.appendChild(wrap);
  return block;
}

function doSubmit(wrap) {
  if (state.submitted) return;
  state.submitted = true;
  const result = XG.scoring.scoreForm(state.cats, state.answers);
  wrap.querySelectorAll('.opt, .chip').forEach((b) => { b.style.pointerEvents = 'none'; });
  const v = renderVerdict(result);
  const r = renderReveal();
  wrap.appendChild(v);
  wrap.appendChild(r);
  v.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderVerdict(result) {
  const v = el('div', 'verdict show');
  const ring = `<div class="score-ring" style="--p:${result.percent}"><span>${result.percent}<small>%</small></span></div>`;
  const bars = result.results.map((r) => {
    const pct = Math.round(r.score * 100);
    const cls = r.exact ? 'bar exact' : (pct >= 50 ? 'bar good' : 'bar weak');
    return `<div class="cat-score"><span class="cat-name">${r.title}</span><span class="${cls}"><i style="width:${pct}%"></i></span><span class="cat-pct">${pct}%</span></div>`;
  }).join('');
  v.innerHTML = `<div class="verdict-top">${ring}<div><h2>${result.verdict.rank}</h2><p>${result.verdict.note}</p></div></div><div class="cat-scores">${bars}</div>`;
  return v;
}

function renderReveal() {
  const spec = state.spec, ws = spec.worldseed.choices;
  const r = el('div', 'reveal');
  let seedRows = '';
  Object.keys(ws).forEach((k) => {
    const dim = XG.DIMENSIONS.find((d) => d.key === k) || XG.CELESTIAL.find((d) => d.key === k);
    if (dim) seedRows += `<tr><td>${dim.title}</td><td>${ws[k].label}</td></tr>`;
  });
  const order = ['ecology', 'body', 'senses', 'cognition', 'social', 'culture', 'tech', 'selfmod'];
  const names = { ecology: 'Ecology', body: 'Body plan', senses: 'Senses', cognition: 'Cognition', social: 'Social structure', culture: 'Culture', tech: 'Technology', selfmod: 'Self-modification' };
  let chain = '';
  order.forEach((sk) => {
    const traits = spec.record.filter((t) => t.stage === sk);
    if (!traits.length) return;
    chain += `<div class="chain-stage"><h4>${names[sk]}</h4><ul>${traits.map((t) => `<li><b>${t.title}</b> — ${t.reveal}</li>`).join('')}</ul></div>`;
  });
  r.innerHTML = `<h2 class="reveal-title">The hidden Worldseed</h2>
    <p class="reveal-sub">Every trait you scanned was downstream of this. The final form could not lie.</p>
    <div class="reveal-grid"><div class="reveal-seed"><table>${seedRows}</table></div><div class="reveal-chain">${chain}</div></div>
    <div class="reveal-root">The constraint it could never escape: <b>${XG.concept.label(spec.rootPressure)}</b></div>
    <button class="primary big again">Peer into a new world →</button>`;
  r.querySelector('.again').addEventListener('click', () => { newGame(); });
  return r;
}

// ---- boot ----
function init() {
  state.scene = new XenoScene($('#stage'));
  if (location.search.includes('debug')) window.__scene = state.scene;
  state.scene.start();

  $('#reconstruct-btn').addEventListener('click', openReconstruct);
  $('#new-btn').addEventListener('click', () => newGame());
  $('#share-btn').addEventListener('click', () => {
    const url = location.origin + location.pathname + '?seed=' + encodeURIComponent(state.seed);
    if (navigator.clipboard) navigator.clipboard.writeText(url);
    const b = $('#share-btn');
    if (b._t) clearTimeout(b._t);
    b.textContent = 'Copied';
    b._t = setTimeout(() => { b.textContent = 'Share'; }, 1300);
  });
  $('#rotate-btn').addEventListener('click', () => {
    const on = $('#rotate-btn').classList.toggle('off');
    state.scene.setAutoRotate(!on);
    $('#rotate-btn').textContent = on ? 'Spin: off' : 'Spin: on';
  });
  $('#seedform').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#seedinput').value.trim();
    if (v) newGame(v);
  });

  const seed = new URLSearchParams(location.search).get('seed');
  newGame(seed || null);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
