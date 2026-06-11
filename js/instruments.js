/* Xenoguesser :: instruments
 *
 * The player never reads a dossier. They read instruments. Each instrument
 * surfaces a slice of the specimen's trait record -- and the Planetary Shadow
 * gives only indirect, inferential hints, never a direct statement of the
 * Worldseed.
 *
 * The Morphology scan also renders a procedural creature glyph derived from the
 * body-plan and sense tags, so the form is something you can look at, not just
 * read. The glyph is a schematic -- a theorem with skin, sketched.
 */
(function (XG) {
  'use strict';

  var ORDER = [
    { key: 'morphology', name: 'Morphology scan', icon: '◉',
      blurb: 'Body plan · symmetry · limbs · armor · sensory organs · locomotion' },
    { key: 'metabolism', name: 'Metabolism scan', icon: '◈',
      blurb: 'Energy source · thermal range · chemistry · scarcity adaptations' },
    { key: 'behavior', name: 'Behavioral echo', icon: '◌',
      blurb: 'Hunting · hiding · mating · migration · cooperation · deception' },
    { key: 'culture', name: 'Culture residue', icon: '⌘',
      blurb: 'Architecture · myth · taboo · symbol · burial · communication' },
    { key: 'singularity', name: 'Singularity artifact', icon: '⟡',
      blurb: 'Evidence of self-modification after gaining control of its own form' },
    { key: 'shadow', name: 'Planetary shadow', icon: '☾',
      blurb: 'Indirect traces of gravity · light · sky · seasons · storms · tides' },
  ];

  function readingsFor(spec, instKey) {
    return spec.record.filter(function (t) { return t.inst === instKey; })
      .map(function (t) { return { title: t.title, reveal: t.reveal }; });
  }

  function build(spec) {
    var out = [];
    ORDER.forEach(function (inst) {
      var readings;
      if (inst.key === 'shadow') {
        readings = spec.worldseed.shadows.map(function (s) {
          return { title: s.dim, reveal: s.hint };
        });
      } else {
        readings = readingsFor(spec, inst.key);
      }
      out.push({
        key: inst.key, name: inst.name, icon: inst.icon, blurb: inst.blurb,
        readings: readings,
        empty: emptyMessage(inst.key, spec),
      });
    });
    return out;
  }

  function emptyMessage(key, spec) {
    if (key === 'culture' && !spec.milestones.culture)
      return 'No symbolic residue detected. This lineage never crossed into cumulative culture — the instrument returns only noise.';
    if (key === 'singularity' && !spec.milestones.singularity)
      return spec.milestones.tech
        ? 'Tool-use traces present, but no self-modification artifacts. They reached the threshold and did not cross it.'
        : 'No technological or self-modification artifacts. This form is the raw product of natural selection alone.';
    return 'No clear reading on this band.';
  }

  // ---- procedural creature glyph (schematic SVG) ----
  function has(spec, tag) { return (spec.pool[tag] || 0) > 0; }

  function glyph(spec, rng) {
    var w = 320, h = 320, cx = w / 2, cy = h / 2;
    var parts = [];
    var stroke = '#9af7e0', accent = '#ff7a9c', dim = 'rgba(154,247,224,0.35)';

    var radial = has(spec, 'RADIAL') && !has(spec, 'BILATERAL');
    var tall = has(spec, 'GRACILE');
    var stocky = has(spec, 'STOCKY');
    var aquatic = has(spec, 'AQUATIC');

    // body
    if (radial) {
      var arms = rng.int(5, 8);
      for (var i = 0; i < arms; i++) {
        var ang = (Math.PI * 2 * i) / arms;
        var len = 92 + rng.jitter(14);
        var ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
        parts.push(line(cx, cy, ex, ey, stroke, 3));
        parts.push(circle(ex, ey, 6, accent));
      }
      parts.push(circle(cx, cy, 34, 'none', stroke, 3));
    } else {
      var bw = stocky ? 86 : (tall ? 40 : 60);
      var bh = tall ? 150 : (aquatic ? 80 : 110);
      // torso
      parts.push(ellipse(cx, cy + 10, bw / 2, bh / 2, 'none', stroke, 3));
      // head
      var hy = cy + 10 - bh / 2 - (tall ? 26 : 18);
      parts.push(circle(cx, hy, tall ? 16 : 22, 'none', stroke, 3));
      // limbs
      var legPairs = stocky ? 3 : 2;
      for (var p = 0; p < legPairs; p++) {
        var ly = cy + bh / 2 - 6 - p * 18;
        var spread = bw / 2 + 30 + rng.jitter(8);
        var drop = 50 + rng.jitter(14);
        parts.push(line(cx - bw / 4, ly, cx - spread, ly + drop, stroke, 3));
        parts.push(line(cx + bw / 4, ly, cx + spread, ly + drop, stroke, 3));
      }
      // arms / manipulators
      if (has(spec, 'PREHENSILE') || has(spec, 'TOOLS')) {
        parts.push(line(cx - bw / 3, cy - 10, cx - bw / 2 - 36, cy + 24, accent, 3));
        parts.push(line(cx + bw / 3, cy - 10, cx + bw / 2 + 36, cy + 24, accent, 3));
      }
    }

    // wings / glide surfaces
    if (has(spec, 'GLIDER') || has(spec, 'AERIAL')) {
      parts.push(path('M' + cx + ' ' + cy + ' Q ' + (cx - 110) + ' ' + (cy - 70) + ' ' + (cx - 130) + ' ' + (cy + 30), dim, 2));
      parts.push(path('M' + cx + ' ' + cy + ' Q ' + (cx + 110) + ' ' + (cy - 70) + ' ' + (cx + 130) + ' ' + (cy + 30), dim, 2));
    }
    // exoskeleton hint: segment bands
    if (has(spec, 'EXOSKELETON') || has(spec, 'ARMORED')) {
      for (var s = -2; s <= 2; s++) {
        parts.push(line(cx - 30, cy + 10 + s * 16, cx + 30, cy + 10 + s * 16, dim, 2));
      }
    }
    // eyes / sensors
    var headY = radial ? cy : cy + 10 - (tall ? 150 : 110) / 2 - (tall ? 26 : 18);
    if (has(spec, 'EYES_REDUCED')) {
      parts.push(line(cx - 8, headY, cx - 2, headY, dim, 2));
      parts.push(line(cx + 2, headY, cx + 8, headY, dim, 2));
    } else if (has(spec, 'EYES_ACUTE') || has(spec, 'UV_VISION') || has(spec, 'FAST_VISION')) {
      parts.push(circle(cx - 8, headY, 5, accent));
      parts.push(circle(cx + 8, headY, 5, accent));
      parts.push(circle(cx, headY - 10, 4, accent));
    } else {
      parts.push(circle(cx - 7, headY, 3, stroke));
      parts.push(circle(cx + 7, headY, 3, stroke));
    }
    // echolocation / antennae
    if (has(spec, 'ECHO') || has(spec, 'CHEMO_SENSE')) {
      parts.push(line(cx - 6, headY - 14, cx - 18, headY - 40, stroke, 2));
      parts.push(line(cx + 6, headY - 14, cx + 18, headY - 40, stroke, 2));
    }

    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" class="glyph-svg">' +
      '<defs><radialGradient id="gscan" cx="50%" cy="45%" r="60%">' +
      '<stop offset="0%" stop-color="rgba(40,90,120,0.25)"/>' +
      '<stop offset="100%" stop-color="rgba(6,14,24,0)"/></radialGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#gscan)"/>' +
      parts.join('') + '</svg>';
    return svg;
  }

  function line(x1, y1, x2, y2, c, sw) {
    return '<line x1="' + r(x1) + '" y1="' + r(y1) + '" x2="' + r(x2) + '" y2="' + r(y2) + '" stroke="' + c + '" stroke-width="' + (sw || 2) + '" stroke-linecap="round"/>';
  }
  function circle(x, y, rad, fill, st, sw) {
    return '<circle cx="' + r(x) + '" cy="' + r(y) + '" r="' + r(rad) + '" fill="' + (fill || 'none') + '"' + (st ? ' stroke="' + st + '" stroke-width="' + (sw || 2) + '"' : '') + '/>';
  }
  function ellipse(x, y, rx, ry, fill, st, sw) {
    return '<ellipse cx="' + r(x) + '" cy="' + r(y) + '" rx="' + r(rx) + '" ry="' + r(ry) + '" fill="' + (fill || 'none') + '" stroke="' + st + '" stroke-width="' + (sw || 2) + '"/>';
  }
  function path(d, c, sw) {
    return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (sw || 2) + '"/>';
  }
  function r(n) { return Math.round(n * 10) / 10; }

  XG.instruments = { build: build, glyph: glyph, ORDER: ORDER };
})(window.XG = window.XG || {});
