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


  XG.instruments = { build: build, ORDER: ORDER };
})(window.XG = window.XG || {});
