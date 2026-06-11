/* Xenoguesser :: Worldseed dimensions
 *
 * The hidden initial conditions. The engine picks exactly one option per
 * dimension. Each option injects weighted pressure tags into the causal pool
 * and contributes an indirect "shadow" clue (never a direct statement) that
 * the Planetary Shadow instrument can surface.
 *
 * Nothing here is shown to the player directly -- only its downstream
 * consequences are observable. The final form cannot lie.
 */
(function (XG) {
  'use strict';

  // helper: weighted tag entry
  function T(tag, w) { return { tag: tag, w: w == null ? 1 : w }; }

  var DIMENSIONS = [
    {
      key: 'planetType', title: 'Planet type',
      options: [
        { id: 'rocky',     label: 'Rocky terrestrial', tags: [T('WATER_CARBON', 0.5)], shadow: 'Sediment-graded strata; a solid lithosphere under the biology.' },
        { id: 'ocean',     label: 'Global ocean world', tags: [T('AQUATIC', 2), T('HIGH_PRESSURE', 1)], shadow: 'Every trace is water-laid; no record of dry land at all.' },
        { id: 'ice',       label: 'Ice world / sub-glacial ocean', tags: [T('COLD', 2), T('AQUATIC', 1.5), T('PERPETUAL_NIGHT', 1), T('CRYO_CHEM', 0.5)], shadow: 'Pressure-ice signatures; a roof of frozen sky over liquid below.' },
        { id: 'desert',    label: 'Arid desert world', tags: [T('SCARCITY', 1.5), T('HEAT', 1), T('THERMAL_SWING', 1)], shadow: 'Wind-abraded surfaces; water appears only as a precious trace.' },
        { id: 'tidal',     label: 'Tidally locked world', tags: [T('TERMINATOR', 2), T('PERPETUAL_DAY', 1), T('PERPETUAL_NIGHT', 1), T('THERMAL_SWING', 1)], shadow: 'A permanent shadow-line: one face never sees the star, one never loses it.' },
        { id: 'highg',     label: 'Super-Earth (high gravity)', tags: [T('HIGH_G', 2), T('DENSE_AIR', 1)], shadow: 'Everything is built low and braced; collapse seems to haunt the architecture.' },
        { id: 'lowg',      label: 'Small low-gravity world', tags: [T('LOW_G', 2), T('THIN_AIR', 1)], shadow: 'Forms reach absurdly high; momentum lingers; falls cost little.' },
        { id: 'volcanic',  label: 'Tectonic / volcanic world', tags: [T('HEAT', 1), T('CHEMOSYNTH', 1), T('CATASTROPHE', 1), T('SULFUR_CHEM', 0.7)], shadow: 'Mineral richness laced with sulfur; the ground itself is a power source.' },
        { id: 'moon',      label: 'Gas-giant moon', tags: [T('RADIATION', 1.5), T('COLD', 1), T('TERMINATOR', 0.5)], shadow: 'A vast banded thing fills the sky; tides and radiation pulse together.' },
      ],
    },
    {
      // The PRIMARY star's type only. Multiplicity (one/two/three suns) lives in
      // the celestial layer, so these never contradict the sky count.
      key: 'starSystem', title: 'Primary star',
      options: [
        { id: 'gstar',   label: 'Sun-like G star', tags: [T('PHOTOSYNTH', 1), T('BRIGHT', 0.5)], shadow: 'Light is steady and generous; chemistry leans on it openly.' },
        { id: 'reddwarf',label: 'Flaring red dwarf', tags: [T('RADIATION', 2), T('STAR_FLARE', 2), T('DIM_STAR', 1), T('DARKNESS', 1)], shadow: 'Long calm dimness punctuated by sudden violent light; shelter is everything.' },
        { id: 'orange',  label: 'Cool orange K dwarf', tags: [T('PHOTOSYNTH', 0.7), T('DIM_STAR', 0.5)], shadow: 'A muted, ruddy daylight; long-lived and steady, kinder than it looks.' },
        { id: 'bluegiant',label:'Hot blue star', tags: [T('HIGH_UV', 2), T('BRIGHT', 1.5), T('SHORT_STAR', 2)], shadow: 'Ferocious ultraviolet; the biosphere reads as rushed, never finished.' },
        { id: 'browndwarf',label:'Dim brown dwarf', tags: [T('DIM_STAR', 2), T('DARKNESS', 2), T('COLD', 1), T('THERMOSYNTH', 1)], shadow: 'Almost no true daylight; warmth wells up from below, not down from above.' },
      ],
    },
    {
      key: 'gravity', title: 'Surface gravity',
      options: [
        { id: 'low',  label: 'Low gravity', tags: [T('LOW_G', 1.5)], shadow: 'Slender, towering, fragile-looking forms.' },
        { id: 'mod',  label: 'Moderate gravity', tags: [], shadow: 'Proportions read as unremarkable, baseline.' },
        { id: 'high', label: 'High gravity', tags: [T('HIGH_G', 1.5)], shadow: 'Squat, reinforced, ground-hugging forms.' },
      ],
    },
    {
      key: 'atmosphere', title: 'Atmosphere',
      options: [
        { id: 'thin',   label: 'Thin atmosphere', tags: [T('THIN_AIR', 1.5), T('HIGH_UV', 0.5)], shadow: 'Little air to buffer light or sound; the sky is close and hostile.' },
        { id: 'thick',  label: 'Thick atmosphere', tags: [T('DENSE_AIR', 1.5)], shadow: 'Sound and scent carry far; light scatters into a perpetual haze.' },
        { id: 'oxy',    label: 'Oxygen-rich', tags: [T('OXYGEN_RICH', 1.5), T('FAST_METAB', 1)], shadow: 'Energetic chemistry; combustion and large active bodies are cheap.' },
        { id: 'toxic',  label: 'Reducing / toxic', tags: [T('TOXIC_AIR', 1.5), T('CHEMOSYNTH', 1)], shadow: 'Free oxygen is rare; life makes peace with poison.' },
      ],
    },
    {
      key: 'chemistry', title: 'Biosphere chemistry',
      options: [
        { id: 'watercarbon', label: 'Water-carbon', tags: [T('WATER_CARBON', 1.5)], shadow: 'Familiar solvent chemistry; liquid water in the loop.' },
        { id: 'cryo',        label: 'Cryogenic (ammonia/methane)', tags: [T('CRYO_CHEM', 2), T('COLD', 1)], shadow: 'Solvents that stay liquid far below freezing; slow, cold reactions.' },
        { id: 'sulfur',      label: 'Sulfur-based', tags: [T('SULFUR_CHEM', 2), T('CHEMOSYNTH', 1)], shadow: 'Sulfur cycles drive the food web; heat and minerals over sunlight.' },
      ],
    },
    {
      key: 'climate', title: 'Climate stability',
      options: [
        { id: 'stable',   label: 'Stable', tags: [], shadow: 'Long uninterrupted lineages; conditions held steady for ages.' },
        { id: 'seasonal', label: 'Extreme seasons', tags: [T('THERMAL_SWING', 1.5), T('MIGRATION', 0.5), T('DORMANCY', 0.5)], shadow: 'Life is tuned to a brutal annual rhythm of feast and freeze.' },
        { id: 'chaotic',  label: 'Chaotic instability', tags: [T('INSTABILITY', 2), T('BOOM_BUST', 1)], shadow: 'No reliable rhythm; survival rewards improvisers over specialists.' },
      ],
    },
    {
      key: 'catastrophe', title: 'Catastrophe regime',
      options: [
        { id: 'calm',    label: 'Few catastrophes', tags: [], shadow: 'Deep, undisturbed strata; the biosphere was rarely reset.' },
        { id: 'impacts', label: 'Impact bombardment', tags: [T('CATASTROPHE', 1.5), T('DORMANCY', 1)], shadow: 'Shock layers recur; survivors are the ones who could wait out the dark.' },
        { id: 'flares',  label: 'Radiation / flare bursts', tags: [T('CATASTROPHE', 1), T('RADIATION', 1.5)], shadow: 'Periodic sterilizing pulses; the record favors the sheltered.' },
        { id: 'glacial', label: 'Snowball / hothouse cycles', tags: [T('CATASTROPHE', 1), T('THERMAL_SWING', 1.5), T('DEEP_TIME', 0.5)], shadow: 'The whole world freezes and burns in turn, again and again.' },
      ],
    },
    {
      key: 'predation', title: 'Predator pressure',
      options: [
        { id: 'none',   label: 'No macro-predators', tags: [T('NO_PREDATORS', 1.5), T('GIGANTISM', 0.5)], shadow: 'Forms are unhurried and undefended; nothing hunted them at scale.' },
        { id: 'mod',    label: 'Moderate predation', tags: [T('PREDATION', 0.7)], shadow: 'Defenses exist but do not dominate the body plan.' },
        { id: 'intense',label: 'Intense arms race', tags: [T('PREDATION', 2)], shadow: 'Armor, speed, and wariness are written deep into the lineage.' },
        { id: 'ambush', label: 'Ambush-dominated', tags: [T('AMBUSH', 2), T('CRYPSIS', 1)], shadow: 'Stillness and concealment were the price of survival.' },
      ],
    },
    {
      key: 'resources', title: 'Resource regime',
      options: [
        { id: 'abundant', label: 'Abundant', tags: [T('ABUNDANCE', 1.5), T('FAST_METAB', 0.5)], shadow: 'Energy was cheap; bodies could afford to be wasteful.' },
        { id: 'patchy',   label: 'Patchy', tags: [T('PATCHY', 1.5), T('MIGRATION', 0.5)], shadow: 'Wealth came in islands; finding it mattered more than guarding it.' },
        { id: 'scarce',   label: 'Scarce', tags: [T('SCARCITY', 2), T('SLOW_METAB', 1), T('TERRITORIAL', 0.5)], shadow: 'Every joule was contested; thrift is etched into the metabolism.' },
        { id: 'boombust', label: 'Boom-bust', tags: [T('BOOM_BUST', 2), T('DORMANCY', 1)], shadow: 'Gluts followed by famines; survival meant storing or sleeping.' },
      ],
    },
    {
      key: 'terrain', title: 'Dominant terrain',
      options: [
        { id: 'open',    label: 'Open plains / pelagic', tags: [T('OPEN_TERRAIN', 1.5), T('FAST_FLEE', 0.5)], shadow: 'Nowhere to hide; sightlines are long and exposure constant.' },
        { id: 'forest',  label: 'Dense canopy / reef', tags: [T('VERTICAL', 1.5), T('CANOPY', 0.5), T('CRYPSIS', 0.5)], shadow: 'A three-dimensional maze; climbing and grasping pay off.' },
        { id: 'caves',   label: 'Caves / subsurface', tags: [T('SUBSURFACE', 2), T('PERPETUAL_NIGHT', 1), T('DARKNESS', 1)], shadow: 'No sky in the record at all; the world was navigated by touch and sound.' },
        { id: 'mountain',label: 'Vertical / mountainous', tags: [T('VERTICAL', 2), T('THERMAL_SWING', 0.5)], shadow: 'Steep, broken ground; balance and grip dominate locomotion.' },
        { id: 'islands', label: 'Archipelago', tags: [T('ARCHIPELAGO', 2), T('PATCHY', 1)], shadow: 'Isolated pockets; lineages diverged in parallel across many islands.' },
      ],
    },
    {
      key: 'timescale', title: 'Biosphere age',
      options: [
        { id: 'young', label: 'Young & fast', tags: [T('YOUNG_BIO', 1.5)], shadow: 'Few layers, little turnover; evolution had to move fast.' },
        { id: 'mature',label: 'Mature', tags: [], shadow: 'A comfortable depth of history; lineages well-settled.' },
        { id: 'ancient',label:'Ancient (deep time)', tags: [T('DEEP_TIME', 2)], shadow: 'Staggering stratigraphic depth; the biosphere reset and rebuilt many times.' },
      ],
    },
    {
      key: 'biosphere', title: 'Biosphere logic',
      options: [
        { id: 'standard',  label: 'Individual organisms', tags: [], shadow: 'Discrete bodies, discrete lives; selection acts on individuals.' },
        { id: 'colonial',  label: 'Colonial superorganism', tags: [T('EUSOCIAL', 1.5), T('SYMBIOSIS', 0.5)], shadow: 'The unit of life blurs; colonies behave as single bodies.' },
        { id: 'symbiotic', label: 'Symbiosis-saturated', tags: [T('SYMBIOSIS', 2)], shadow: 'Almost nothing lives alone; every body is a negotiated alliance.' },
      ],
    },
  ];

  XG.DIMENSIONS = DIMENSIONS;
})(window.XG = window.XG || {});
