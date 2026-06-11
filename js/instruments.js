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
    { key: 'morphology', name: 'Body Scan', icon: '◉',
      blurb: 'Its shape, limbs, armor, eyes — and how it gets around' },
    { key: 'metabolism', name: 'Fuel Scan', icon: '◈',
      blurb: 'What it runs on: heat, cold, food, light or chemicals' },
    { key: 'behavior', name: 'Behavior', icon: '◌',
      blurb: 'Hunting, hiding, mating, packs, tricks, fighting, caring' },
    { key: 'culture', name: 'Ruins & Culture', icon: '⌘',
      blurb: 'Buildings, myths, taboos, tools, graves, how they talk' },
    { key: 'singularity', name: 'Did They Ascend?', icon: '⟡',
      blurb: 'Signs they rebuilt their own bodies and minds' },
    { key: 'shadow', name: 'Sky Clues', icon: '☾',
      blurb: 'Hints of gravity, light, seasons, storms, moons, the star' },
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
      return 'Nothing here. These never built a real culture — no art, no myths, no cities. Just animals doing animal things.';
    if (key === 'singularity' && !spec.milestones.singularity)
      return spec.milestones.tech
        ? 'They had tools, but never started rebuilding themselves. So close, and they never crossed the line.'
        : 'No tech, no self-tinkering. This is pure evolution, start to finish — nothing engineered.';
    return 'Nothing clear on this channel.';
  }


  XG.instruments = { build: build, ORDER: ORDER };
})(window.XG = window.XG || {});
