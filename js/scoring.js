/* Xenoguesser :: guess construction & scoring
 *
 * Scoring rewards CAUSAL REASONING, not trivia. Everything is tags. A guess
 * scores by how much of the true pressure set it recovers -- so "dark unstable
 * world with radiation and synchronized behavior" scores high against a true
 * "tidally locked flaring red dwarf", because the underlying pressure tags
 * (DARKNESS, RADIATION, INSTABILITY, TERMINATOR) overlap, even though the label
 * is wrong.
 */
(function (XG) {
  'use strict';

  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  function emittedByStages(record, stages) {
    var out = [];
    record.forEach(function (t) {
      if (stages.indexOf(t.stage) >= 0) out = out.concat(t.emit || []);
    });
    return uniq(out);
  }

  // strongest N root pressures from the base (worldseed-only) pool
  function topRootPressures(basePool, n) {
    var entries = Object.keys(basePool).map(function (k) { return [k, basePool[k]]; });
    // keep only meaningful pressure-like tags (those that have a concept label)
    entries = entries.filter(function (e) { return XG.CONCEPTS[e[0]] && e[1] > 0; });
    entries.sort(function (a, b) { return b[1] - a[1]; });
    return entries.slice(0, n).map(function (e) { return e[0]; });
  }

  // build a chip set: the true tags + plausible distractors from same groups
  function buildChips(answerTags, rng, distractorCount) {
    var groups = uniq(answerTags.map(function (t) { return XG.concept.group(t); }));
    var pool = XG.concept.tagsInGroups(groups).filter(function (t) {
      return answerTags.indexOf(t) < 0;
    });
    var distractors = rng.sample(pool, Math.min(distractorCount, pool.length));
    var chips = uniq(answerTags.concat(distractors));
    return rng.shuffle(chips).map(function (t) {
      return { tag: t, label: XG.concept.label(t) };
    });
  }

  // ---- build the full guess form spec for a specimen ----
  function buildGuessForm(spec, rng) {
    var rec = spec.record;
    var cats = [];

    // 1. Planet type (single, tag-overlap scored)
    cats.push({
      key: 'planet', title: 'Planet type', mode: 'single',
      prompt: 'What kind of world produced this form?',
      options: XG.DIMENSIONS.find(function (d) { return d.key === 'planetType'; }).options.map(function (o) {
        return { id: o.id, label: o.label, tags: (o.tags || []).map(function (t) { return t.tag; }) };
      }),
      answerId: spec.worldseed.choices.planetType.id,
      answerTags: (spec.worldseed.choices.planetType.tags || []).map(function (t) { return t.tag; }),
    });

    // 2. Star system (single)
    cats.push({
      key: 'star', title: 'Star system', mode: 'single',
      prompt: 'What was in its sky?',
      options: XG.DIMENSIONS.find(function (d) { return d.key === 'starSystem'; }).options.map(function (o) {
        return { id: o.id, label: o.label, tags: (o.tags || []).map(function (t) { return t.tag; }) };
      }),
      answerId: spec.worldseed.choices.starSystem.id,
      answerTags: (spec.worldseed.choices.starSystem.tags || []).map(function (t) { return t.tag; }),
    });

    // 3. Main environmental pressures (multi)
    var pressureAns = topRootPressures(spec.worldseed.basePool, 6);
    cats.push({
      key: 'pressures', title: 'Main environmental pressures', mode: 'multi',
      prompt: 'Select the dominant pressures that shaped this lineage.',
      chips: buildChips(pressureAns, rng, 7), answerTags: pressureAns,
    });

    // 4. Evolutionary pathway (multi) -- ecology + body
    var pathAns = emittedByStages(rec, ['ecology', 'body', 'senses']);
    cats.push({
      key: 'pathway', title: 'Evolutionary pathway', mode: 'multi',
      prompt: 'How did selection actually solve this world?',
      chips: buildChips(pathAns, rng, 7), answerTags: pathAns,
    });

    // 5. Cognitive adaptations (multi)
    var cogAns = emittedByStages(rec, ['cognition']);
    cats.push({
      key: 'cognition', title: 'Cognitive adaptations', mode: 'multi',
      prompt: 'What is this mind for?',
      chips: buildChips(cogAns.length ? cogAns : ['SPATIAL_MAP'], rng, 6), answerTags: cogAns,
    });

    // 6. Cultural consequences (multi)
    var cultAns = emittedByStages(rec, ['culture']);
    cats.push({
      key: 'culture', title: 'Cultural consequences', mode: 'multi',
      prompt: spec.milestones.culture ? 'What did their culture become?' : 'Did culture even emerge here?',
      chips: buildChips(cultAns.length ? cultAns : ['CULTURE_PRESENT'], rng, 6), answerTags: cultAns,
    });

    // 7. Singularity reached? (single)
    var singId = spec.milestones.singularity ? (spec.milestones.postbio ? 'postbio' : 'yes')
      : (spec.milestones.tech ? 'partial' : 'no');
    cats.push({
      key: 'singularity', title: 'Did they reach a singularity?', mode: 'single',
      prompt: 'Did they gain control over their own biology/embodiment?',
      options: [
        { id: 'no', label: 'No — never reached technology', tags: ['NO_SINGULARITY'] },
        { id: 'partial', label: 'Approached it — tech-capable, not yet self-modifying', tags: ['TECH_CAPABLE'] },
        { id: 'yes', label: 'Yes — crossed a self-modification singularity', tags: ['SINGULARITY'] },
        { id: 'postbio', label: 'Yes, and went post-biological', tags: ['SINGULARITY', 'POSTBIO'] },
      ],
      answerId: singId,
      answerTags: singId === 'postbio' ? ['SINGULARITY', 'POSTBIO'] : (singId === 'yes' ? ['SINGULARITY'] : (singId === 'partial' ? ['TECH_CAPABLE'] : ['NO_SINGULARITY'])),
    });

    // 8. How culture reshaped biology / postbiology (multi)
    var modAns = emittedByStages(rec, ['selfmod']);
    cats.push({
      key: 'selfmod', title: 'How culture reshaped biology', mode: 'multi',
      prompt: spec.milestones.singularity ? 'How did they rewrite themselves?' : 'If they had crossed over, which path was open to them?',
      chips: buildChips(modAns.length ? modAns : ['METAB_REWRITE', 'SENSORY_UPGRADE', 'BODY_REDESIGN'], rng, 5),
      answerTags: modAns,
    });

    // 9. What the final form can never escape (single -- the deep constraint)
    var rootCandidates = uniq([spec.rootPressure].concat(
      topRootPressures(spec.worldseed.basePool, 6)
    )).slice(0, 7);
    cats.push({
      key: 'inescapable', title: 'What the final form can never escape', mode: 'single',
      prompt: 'Even after everything they became — what original constraint is still written into the final form?',
      options: rootCandidates.map(function (t) { return { id: t, label: XG.concept.label(t), tags: [t] }; }),
      answerId: spec.rootPressure,
      answerTags: [spec.rootPressure],
    });

    return cats;
  }

  // ---- scoring ----
  function jaccard(a, b) {
    if (!a.length && !b.length) return 1;
    var setB = {}; b.forEach(function (x) { setB[x] = 1; });
    var inter = 0; a.forEach(function (x) { if (setB[x]) inter++; });
    var union = uniq(a.concat(b)).length;
    return union ? inter / union : 0;
  }

  function scoreSingle(cat, chosenId) {
    if (chosenId == null) return { score: 0, exact: false };
    var opt = (cat.options || []).find(function (o) { return o.id === chosenId; });
    if (!opt) return { score: 0, exact: false };
    var exact = chosenId === cat.answerId;
    // tag overlap gives partial credit even when label is wrong
    var s = jaccard(opt.tags || [], cat.answerTags || []);
    if (exact) s = 1;
    return { score: s, exact: exact };
  }

  function scoreMulti(cat, selectedTags) {
    var ans = cat.answerTags || [];
    if (!ans.length) {
      // correct answer is "none apply": reward restraint, penalize over-claiming
      var wrongN = (selectedTags || []).length;
      return { score: wrongN === 0 ? 1 : Math.max(0, 1 - 0.34 * wrongN), exact: wrongN === 0 };
    }
    var sel = selectedTags || [];
    var correct = 0, wrong = 0;
    sel.forEach(function (t) { if (ans.indexOf(t) >= 0) correct++; else wrong++; });
    var raw = (correct - 0.6 * wrong) / ans.length;
    var score = Math.max(0, Math.min(1, raw));
    return { score: score, exact: correct === ans.length && wrong === 0 };
  }

  function scoreForm(cats, answers) {
    var results = [];
    var total = 0;
    cats.forEach(function (cat) {
      var a = answers[cat.key];
      var r = cat.mode === 'single' ? scoreSingle(cat, a) : scoreMulti(cat, a || []);
      results.push({ key: cat.key, title: cat.title, mode: cat.mode, score: r.score, exact: r.exact, cat: cat, answer: a });
      total += r.score;
    });
    var pct = Math.round((total / cats.length) * 100);
    return { results: results, percent: pct, verdict: verdict(pct) };
  }

  function verdict(pct) {
    if (pct >= 90) return { rank: 'XENO-ORACLE', note: 'You read the world off its children. The causal chain held end to end.' };
    if (pct >= 75) return { rank: 'DEEP READER', note: 'You recovered most of the hidden Worldseed from the form alone.' };
    if (pct >= 55) return { rank: 'FIELD ANALYST', note: 'Solid causal inference — you caught the dominant pressures.' };
    if (pct >= 35) return { rank: 'PATTERN-SEEKER', note: 'You felt the shape of it, but missed deeper constraints.' };
    return { rank: 'STATIC', note: 'The signal slipped past you. Read the chain below — it was always there.' };
  }

  XG.scoring = {
    buildGuessForm: buildGuessForm,
    scoreForm: scoreForm,
  };
})(window.XG = window.XG || {});
