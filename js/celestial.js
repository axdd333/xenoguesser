/* Xenoguesser :: celestial first-principles layer
 *
 * Before ecology, before chemistry, there is sky mechanics. How many suns?
 * How many moons? How fast does the world turn, how far does it lean, does it
 * have a magnetic shield? These are the most upstream causes of all -- they set
 * the light cycle, the tides, the seasons, and the radiation the biosphere must
 * answer. Every choice here is granular and injects concrete pressure tags that
 * propagate through the entire causal chain.
 *
 * The player never sees these directly. They infer them from the Planetary
 * Shadow instrument and from downstream traits (e.g. flicker-fusion vision
 * implies more than one sun in the sky).
 */
(function (XG) {
  'use strict';

  function T(tag, w) { return { tag: tag, w: w == null ? 1 : w }; }

  var CELESTIAL = [
    {
      key: 'starCount', title: 'Number of suns',
      options: [
        { id: 'one',    label: 'A single sun', tags: [], shadow: 'One shadow per body, one clean rhythm of day and night.' },
        { id: 'two',    label: 'Two suns (binary)', tags: [T('STROBE_LIGHT', 1.5), T('THERMAL_SWING', 1), T('INSTABILITY', 0.5)], shadow: 'Bodies cast crossing double shadows; daylight beats with two competing periods.' },
        { id: 'three',  label: 'Three suns (trinary)', tags: [T('STROBE_LIGHT', 2), T('INSTABILITY', 1.5), T('THERMAL_SWING', 1.5)], shadow: 'No two days are alike; the light cycle never repeats — a sky with no dependable clock.' },
      ],
    },
    {
      key: 'moons', title: 'Moons',
      options: [
        { id: 'none',   label: 'No moon', tags: [], shadow: 'No second light, and no strong tides — coasts are placid, nights are simply dark.' },
        { id: 'one',    label: 'One ordinary moon', tags: [T('MIGRATION', 0.3)], shadow: 'A single steady tide and a faint reflected nightlight to navigate by.' },
        { id: 'giant',  label: 'One giant moon', tags: [T('TERMINATOR', 0.5), T('MIGRATION', 0.8), T('CATASTROPHE', 0.5)], shadow: 'A huge companion dominates the sky; titanic tides scour the shores and pull at the blood.' },
        { id: 'many',   label: 'Many moons', tags: [T('STROBE_LIGHT', 0.8), T('MIGRATION', 0.8)], shadow: 'A cluttered sky of moving lights; tides are complex, layered, never quite predictable.' },
        { id: 'ring',   label: 'Ring system', tags: [T('PERPETUAL_NIGHT', 0.3), T('CALENDAR', 0)], shadow: 'A vast arch of debris splits the sky and casts a slow shadow-band that crawls with the seasons.' },
      ],
    },
    {
      key: 'rotation', title: 'Rotation',
      options: [
        { id: 'fast',   label: 'Fast spin (short day)', tags: [T('FAST_VISION', 0.5), T('THERMAL_SWING', -0.2)], shadow: 'Brief, rapid days; little time for heat to build or escape before the next turn.' },
        { id: 'moderate', label: 'Moderate spin', tags: [], shadow: 'A familiar march of days and nights, neither rushed nor dragging.' },
        { id: 'slow',   label: 'Slow spin (long day)', tags: [T('LONG_CYCLE', 1.5), T('THERMAL_SWING', 1.5), T('DORMANCY', 0.5)], shadow: 'Each day is an era; the lit side bakes and the dark side freezes before the world turns again.' },
        { id: 'locked', label: 'No spin relative to sun (locked)', tags: [T('TERMINATOR', 2), T('PERPETUAL_DAY', 1), T('PERPETUAL_NIGHT', 1)], shadow: 'The sun never moves. One hemisphere in endless day, one in endless night, life crowded along the line between.' },
      ],
    },
    {
      key: 'tilt', title: 'Axial tilt',
      options: [
        { id: 'none',   label: 'No tilt (no seasons)', tags: [], shadow: 'Conditions barely change across the year; there is no seasonal pulse to the biology.' },
        { id: 'mild',   label: 'Mild tilt (gentle seasons)', tags: [T('MIGRATION', 0.3)], shadow: 'A soft seasonal swing; life keeps a loose annual calendar.' },
        { id: 'extreme',label: 'Extreme tilt (violent seasons)', tags: [T('THERMAL_SWING', 2), T('MIGRATION', 1), T('DORMANCY', 1)], shadow: 'The axis lies far over; each pole bakes then freezes. Life either migrates, sleeps, or dies with the season.' },
      ],
    },
    {
      key: 'orbit', title: 'Orbit shape',
      options: [
        { id: 'circular', label: 'Near-circular orbit', tags: [], shadow: 'The distance to the sun holds steady; the year delivers no surprises of heat.' },
        { id: 'eccentric',label: 'Eccentric orbit', tags: [T('THERMAL_SWING', 1.5), T('BOOM_BUST', 1)], shadow: 'The world swings near the sun and far again; the year is a tide of heat and cold, feast and famine.' },
      ],
    },
    {
      key: 'magfield', title: 'Magnetic field',
      options: [
        { id: 'strong', label: 'Strong magnetic shield', tags: [], shadow: 'The surface is shielded; whatever the star throws, the ground rarely feels it.' },
        { id: 'weak',   label: 'Weak / no magnetic shield', tags: [T('RADIATION', 1.5), T('SUBSURFACE', 0.5), T('HIGH_UV', 0.5)], shadow: 'Nothing deflects the star’s particle wind; the surface is irradiated and shelter is survival.' },
      ],
    },
  ];

  // find an option object by dimension key + option id, across both layers
  function optById(dimKey, id) {
    var dim = XG.DIMENSIONS.find(function (d) { return d.key === dimKey; }) ||
      CELESTIAL.find(function (d) { return d.key === dimKey; });
    if (!dim) return null;
    return dim.options.find(function (o) { return o.id === id; });
  }

  // Reconcile contradictions between independently-sampled dimensions so the
  // world is physically coherent -- no "high-gravity super-Earth" that is
  // somehow low gravity, no ancient biosphere around a short-lived blue star.
  // This is what keeps an alien a theorem rather than slop.
  function reconcile(choices, rng) {
    var pt = choices.planetType.id;
    // gravity must follow the planet's class
    if (pt === 'highg') choices.gravity = optById('gravity', 'high');
    else if (pt === 'lowg' || pt === 'moon') choices.gravity = optById('gravity', 'low');
    // a tidally locked planet is, by definition, rotationally locked to its star
    if (pt === 'tidal') choices.rotation = optById('rotation', 'locked');
    // a short-lived hot star cannot host an ancient, many-reset biosphere
    if (choices.starSystem.id === 'bluegiant' && choices.timescale.id === 'ancient') {
      choices.timescale = optById('timescale', 'mature');
    }
    // a rotationally locked world has no meaningful seasons from tilt
    if (choices.rotation.id === 'locked' && choices.tilt.id === 'extreme') {
      choices.tilt = optById('tilt', 'mild');
    }
  }

  // Emergent interactions BETWEEN celestial bodies, applied after the pool is
  // built from the (already reconciled) choices.
  function applyCelestialInteractions(choices, pool, shadows) {
    if (choices.rotation.id === 'locked' &&
        (choices.moons.id === 'giant' || choices.moons.id === 'many')) {
      pool.TERMINATOR = (pool.TERMINATOR || 0) + 1;
      shadows.push({ dim: 'Sky interaction', hint: 'A fixed sun and a heavy moon together: a permanent terminator raked by relentless tides.' });
    }
    if ((choices.starCount.id === 'two' || choices.starCount.id === 'three') &&
        choices.magfield.id === 'weak') {
      pool.RADIATION = (pool.RADIATION || 0) + 1;
      pool.STAR_FLARE = (pool.STAR_FLARE || 0) + 1;
      shadows.push({ dim: 'Sky interaction', hint: 'Multiple stars and no magnetic shield: the surface is bathed in particle radiation with nowhere to hide.' });
    }
  }

  XG.CELESTIAL = CELESTIAL;
  XG.optById = optById;
  XG.reconcile = reconcile;
  XG.applyCelestialInteractions = applyCelestialInteractions;
})(window.XG = window.XG || {});
