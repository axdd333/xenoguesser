/* Xenoguesser :: simulation engine
 *
 * Generates a hidden Worldseed, then runs the causal pipeline. The output is a
 * "specimen": the final form plus a complete, inspectable causal chain. The UI
 * only ever shows the player the instrument reveals -- never the chain -- until
 * the verdict.
 */
(function (XG) {
  'use strict';

  var STAGES = ['ecology', 'body', 'senses', 'cognition', 'social', 'culture', 'tech', 'selfmod'];
  // how many traits each stage may fire (kept small so the alien stays a
  // theorem, not a junk drawer)
  var STAGE_CAP = { ecology: 4, body: 3, senses: 3, cognition: 3, social: 3, culture: 3, tech: 2, selfmod: 2 };

  // ---- tag pool helpers ----
  function poolAdd(pool, tag, w) { pool[tag] = (pool[tag] || 0) + (w == null ? 1 : w); }
  function poolHas(pool, tag) { return (pool[tag] || 0) > 0; }
  function poolHasAny(pool, tags) {
    if (!tags) return false;
    for (var i = 0; i < tags.length; i++) if (poolHas(pool, tags[i])) return true;
    return false;
  }
  function poolHasAll(pool, tags) {
    if (!tags) return true;
    for (var i = 0; i < tags.length; i++) if (!poolHas(pool, tags[i])) return false;
    return true;
  }
  function matchedStrength(pool, tags) {
    var s = 0;
    if (!tags) return 0;
    for (var i = 0; i < tags.length; i++) s += (pool[tags[i]] || 0);
    return s;
  }

  // ---- generate the hidden worldseed ----
  // Sample every dimension (planetary + celestial first-principles), reconcile
  // physical contradictions, THEN build the pressure pool and shadow clues from
  // the final consistent choices. Building last guarantees the pool always
  // matches what is actually displayed in the reveal.
  function generateWorldseed(rng) {
    var choices = {};
    XG.DIMENSIONS.forEach(function (dim) { choices[dim.key] = rng.pick(dim.options); });
    XG.CELESTIAL.forEach(function (dim) { choices[dim.key] = rng.pick(dim.options); });
    XG.reconcile(choices, rng);

    var pool = {};
    var shadows = [];
    function ingest(title, opt) {
      (opt.tags || []).forEach(function (t) { poolAdd(pool, t.tag, t.w); });
      shadows.push({ dim: title, hint: opt.shadow });
    }
    XG.DIMENSIONS.forEach(function (dim) { ingest(dim.title, choices[dim.key]); });
    XG.CELESTIAL.forEach(function (dim) { ingest(dim.title, choices[dim.key]); });
    XG.applyCelestialInteractions(choices, pool, shadows);
    return { choices: choices, basePool: pool, shadows: shadows };
  }

  // ---- run one stage ----
  function runStage(stageKey, rules, pool, rng, record) {
    var candidates = [];
    rules.forEach(function (r) {
      if (r.block && poolHasAny(pool, r.block)) return;
      if (!poolHasAll(pool, r.needAll)) return;
      if (!poolHasAny(pool, r.need)) return;
      var support = matchedStrength(pool, r.need) + matchedStrength(pool, r.needAll);
      var score = (r.weight || 1) + support * 0.6 + rng.jitter(0.5);
      candidates.push({ rule: r, score: score });
    });
    candidates.sort(function (a, b) { return b.score - a.score; });
    var cap = STAGE_CAP[stageKey] || 3;
    var fired = candidates.slice(0, cap);
    fired.forEach(function (c) {
      (c.rule.emit || []).forEach(function (t) { poolAdd(pool, t, 1); });
      record.push({
        stage: stageKey, id: c.rule.id, title: c.rule.title,
        reveal: c.rule.reveal, inst: c.rule.inst, emit: c.rule.emit || [],
      });
    });
    return fired.length;
  }

  // emergent meta-tags between stages (gene-culture coevolution gates)
  //
  // These rungs are deliberately hard. Most biospheres never climb past
  // ecology -- open-ended cognition needs a SOCIAL brain (predator/prey mind-
  // reading or colony-level cognition), not just a big one. This produces real
  // attrition so "did they reach a singularity?" stays a meaningful question.
  function countStage(record, stage) {
    return record.filter(function (t) { return t.stage === stage; }).length;
  }
  // Open-ended cognition is rare. It needs the full convergent package that
  // tracks high intelligence across Earth lineages: social mind-reading, a
  // flexible generalist mind, AND a slow/bonded or colonial life history that
  // pays for a long, teachable juvenile period. Any one alone is not enough.
  function aggregateCognition(pool, record) {
    var cog = countStage(record, 'cognition');
    var socialBrain = poolHas(pool, 'SOCIAL_BRAIN') || poolHas(pool, 'DISTRIBUTED');
    var flexible = poolHas(pool, 'INNOVATION') || poolHas(pool, 'PLANNING');
    var lifeHistory = poolHasAny(pool, ['PAIR_BOND', 'EUSOCIAL', 'DISTRIBUTED', 'SELF_DOMESTICATION']);
    // idempotent: this runs after both cognition and social stages, but the
    // tag must only be credited once or it double-counts in complexityScore.
    if (cog >= 2 && socialBrain && flexible && lifeHistory && !poolHas(pool, 'COMPLEX_COGNITION')) {
      poolAdd(pool, 'COMPLEX_COGNITION', 2);
    }
  }
  // A causal "encephalization" score: the weighted sum of pressures that
  // historically favor open-ended intelligence, minus those that suppress it
  // (gigantism, relaxed predation, deep torpor). Not numerically precise -- a
  // conceptual ledger. The rungs below read off thresholds of this score, so
  // attrition is grounded in the actual trait load, not a coin flip.
  function complexityScore(pool) {
    var pos = {
      COMPLEX_COGNITION: 1.6, INNOVATION: 1.4, SOCIAL_BRAIN: 1.4, DISTRIBUTED: 1.0,
      SPATIAL_MAP: 0.7, PLANNING: 1.0, DECEPTION: 0.6, PREHENSILE: 1.0, TOOLS: 1.0,
      EUSOCIAL: 0.9, SYMBIOSIS: 0.5, PAIR_BOND: 0.9, SELF_DOMESTICATION: 1.3,
    };
    var neg = { GIGANTISM: 1.3, NO_PREDATORS: 0.9, TORPOR: 0.6, SLOW_METAB: 0.3 };
    var s = 0, t;
    for (t in pos) s += (pool[t] || 0) * pos[t];
    for (t in neg) s -= (pool[t] || 0) * neg[t];
    return s;
  }
  var THRESH = { culture: 9.5, tech: 10.5, singularity: 12.0 };

  function aggregateCulture(pool, record) {
    if (poolHas(pool, 'COMPLEX_COGNITION') &&
        countStage(record, 'social') >= 1 &&
        complexityScore(pool) >= THRESH.culture) {
      poolAdd(pool, 'CULTURE_PRESENT', 2);
    }
  }

  // ---- full simulation ----
  function simulate(seedString) {
    var rng = XG.RNG(seedString);
    var seed = generateWorldseed(rng);
    var pool = Object.assign({}, seed.basePool);
    var record = [];

    // ecology -> body -> senses -> cognition
    runStage('ecology', XG.RULES.ecology, pool, rng, record);
    runStage('body', XG.RULES.body, pool, rng, record);
    runStage('senses', XG.RULES.senses, pool, rng, record);
    runStage('cognition', XG.RULES.cognition, pool, rng, record);
    aggregateCognition(pool, record);

    // social always runs; culture gated on complex (social) cognition
    runStage('social', XG.RULES.social, pool, rng, record);
    aggregateCognition(pool, record); // social may add DISTRIBUTED/SOCIAL_BRAIN
    aggregateCulture(pool, record);

    var reachedCulture = poolHas(pool, 'CULTURE_PRESENT');
    if (reachedCulture) runStage('culture', XG.RULES.culture, pool, rng, record);

    // tech needs culture PLUS a manipulation substrate (hands, a colony, or a
    // buildable medium) PLUS enough complexity to ratchet.
    var manipulation = poolHasAny(pool, ['PREHENSILE', 'AQUATIC', 'SUBSURFACE', 'EUSOCIAL', 'TOOLS']);
    if (reachedCulture && poolHas(pool, 'INNOVATION') && manipulation &&
        complexityScore(pool) >= THRESH.tech) {
      poolAdd(pool, 'CUMULATIVE_CULTURE', 2);
    }
    var reachedTech = false;
    if (poolHas(pool, 'CUMULATIVE_CULTURE')) {
      var firedTech = runStage('tech', XG.RULES.tech, pool, rng, record);
      reachedTech = firedTech > 0;
    }

    // self-mod needs tech capability, deep time (or a relentless colony
    // ratchet), AND the highest complexity tier. Most tech-capable species
    // never cross over.
    var reachedSingularity = false;
    var canCross = poolHas(pool, 'TECH_CAPABLE') &&
      poolHasAny(pool, ['DEEP_TIME', 'EUSOCIAL', 'NICHE_CONSTRUCTION']) &&
      complexityScore(pool) >= THRESH.singularity;
    if (canCross) {
      runStage('selfmod', XG.RULES.selfmod, pool, rng, record);
      reachedSingularity = poolHas(pool, 'SINGULARITY');
    }

    // determine the inescapable root pressure: the strongest tag drawn purely
    // from the original worldseed pool (not emergent). This is what the final
    // form can never escape.
    var root = strongestRoot(seed.basePool);

    var milestones = {
      culture: reachedCulture,
      tech: reachedTech,
      singularity: reachedSingularity,
      postbio: poolHas(pool, 'POSTBIO'),
    };

    return {
      seed: seedString,
      worldseed: seed,
      pool: pool,
      record: record,
      milestones: milestones,
      rootPressure: root,
      designation: designation(rng, seed, root),
    };
  }

  // the strongest non-trivial seed pressure
  function strongestRoot(basePool) {
    // pressures that count as "deep constraints" worth being inescapable
    var rootable = ['HIGH_G', 'LOW_G', 'AQUATIC', 'PERPETUAL_NIGHT', 'DARKNESS',
      'RADIATION', 'STAR_FLARE', 'SCARCITY', 'COLD', 'HEAT', 'CATASTROPHE',
      'TERMINATOR', 'HIGH_PRESSURE', 'TOXIC_AIR', 'SUBSURFACE', 'INSTABILITY',
      'BOOM_BUST', 'NO_PREDATORS', 'PREDATION', 'CHEMOSYNTH', 'HIGH_UV'];
    // bestW starts at 0 so only pressures ACTUALLY present (weight > 0) can win;
    // otherwise an absent pressure could be declared "inescapable".
    var best = null, bestW = 0;
    rootable.forEach(function (t) {
      var w = basePool[t] || 0;
      if (w > bestW) { bestW = w; best = t; }
    });
    if (best) return best;
    // mild-mannered world with no deep constraint: fall back to the strongest
    // pressure that is genuinely present, only then to a default.
    var fbW = 0;
    Object.keys(basePool).forEach(function (t) {
      if (XG.CONCEPTS[t] && basePool[t] > fbW) { fbW = basePool[t]; best = t; }
    });
    return best || 'SCARCITY';
  }

  // a flavorful catalog designation for the specimen
  function designation(rng, seed, root) {
    var greek = ['Tau', 'Xi', 'Theta', 'Vela', 'Corvi', 'Lyrae', 'Draconis', 'Ophiuchi', 'Indi', 'Ceti'];
    var n = rng.int(2, 19);
    var sub = String.fromCharCode(98 + rng.int(0, 4)); // b..f
    return 'XG-' + rng.int(1000, 9999) + ' · ' + rng.pick(greek) + ' ' + n + ' ' + sub;
  }

  XG.engine = { simulate: simulate, STAGES: STAGES };
})(window.XG = window.XG || {});
