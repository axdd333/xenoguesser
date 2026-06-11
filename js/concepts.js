/* Xenoguesser :: concept vocabulary
 *
 * Every pressure, trait, and guess is expressed in these tags. Scoring is tag
 * overlap, never string match -- this is what lets a player score well for
 * "dark radiation world with synchronized behavior" when the true label was
 * "tidally locked red dwarf with flare radiation".
 *
 * group is used to assemble plausible distractors for guess panels.
 */
(function (XG) {
  'use strict';

  // tag -> { label, group, hint }
  var CONCEPTS = {
    // --- light & sky ---
    PERPETUAL_DAY:   { label: 'Perpetual daylight', group: 'light' },
    PERPETUAL_NIGHT: { label: 'Perpetual darkness', group: 'light' },
    TERMINATOR:      { label: 'Frozen day/night terminator', group: 'light' },
    DARKNESS:        { label: 'Chronic low light', group: 'light' },
    BRIGHT:          { label: 'Harsh bright light', group: 'light' },
    STROBE_LIGHT:    { label: 'Flickering/strobing light', group: 'light' },
    LONG_CYCLE:      { label: 'Very long day-night cycle', group: 'light' },

    // --- radiation & star ---
    RADIATION:   { label: 'Radiation/flare exposure', group: 'radiation' },
    HIGH_UV:     { label: 'Intense ultraviolet', group: 'radiation' },
    STAR_FLARE:  { label: 'Violent stellar flares', group: 'radiation' },
    SHORT_STAR:  { label: 'Short-lived hot star (rushed time)', group: 'radiation' },
    DIM_STAR:    { label: 'Dim, cool starlight', group: 'radiation' },

    // --- thermal ---
    COLD:        { label: 'Deep cold', group: 'thermal' },
    HEAT:        { label: 'Extreme heat', group: 'thermal' },
    THERMAL_SWING:{ label: 'Wild temperature swings', group: 'thermal' },

    // --- gravity & medium ---
    HIGH_G:      { label: 'High gravity', group: 'gravity' },
    LOW_G:       { label: 'Low gravity', group: 'gravity' },
    DENSE_AIR:   { label: 'Thick atmosphere', group: 'atmosphere' },
    THIN_AIR:    { label: 'Thin atmosphere', group: 'atmosphere' },
    TOXIC_AIR:   { label: 'Toxic/reducing air', group: 'atmosphere' },
    OXYGEN_RICH: { label: 'Oxygen-rich air', group: 'atmosphere' },
    AQUATIC:     { label: 'Aquatic / submerged life', group: 'medium' },
    HIGH_PRESSURE:{ label: 'Crushing pressure', group: 'medium' },
    AERIAL:      { label: 'Aerial / buoyant life', group: 'medium' },

    // --- terrain ---
    SUBSURFACE:  { label: 'Subsurface / caves', group: 'terrain' },
    VERTICAL:    { label: 'Vertical / canopy terrain', group: 'terrain' },
    OPEN_TERRAIN:{ label: 'Open exposed terrain', group: 'terrain' },
    ARCHIPELAGO: { label: 'Fragmented islands', group: 'terrain' },

    // --- resources & predation ---
    SCARCITY:    { label: 'Resource scarcity', group: 'resource' },
    ABUNDANCE:   { label: 'Resource abundance', group: 'resource' },
    BOOM_BUST:   { label: 'Boom-bust resources', group: 'resource' },
    PATCHY:      { label: 'Patchy resources', group: 'resource' },
    PREDATION:   { label: 'Intense predation arms race', group: 'predation' },
    AMBUSH:      { label: 'Ambush-dominated predation', group: 'predation' },
    NO_PREDATORS:{ label: 'No macro-predators', group: 'predation' },

    // --- instability & deep time ---
    INSTABILITY: { label: 'Chronic climate instability', group: 'instability' },
    CATASTROPHE: { label: 'Recurring mass catastrophes', group: 'instability' },
    DEEP_TIME:   { label: 'Ancient, many-reset biosphere', group: 'time' },
    YOUNG_BIO:   { label: 'Young, fast biosphere', group: 'time' },

    // --- chemistry / metabolism (emergent + seed) ---
    WATER_CARBON:{ label: 'Water-carbon biochemistry', group: 'chemistry' },
    CRYO_CHEM:   { label: 'Cryogenic (ammonia/methane) chemistry', group: 'chemistry' },
    SULFUR_CHEM: { label: 'Sulfur-based chemistry', group: 'chemistry' },
    CHEMOSYNTH:  { label: 'Chemosynthetic energy base', group: 'metabolism' },
    PHOTOSYNTH:  { label: 'Photosynthetic energy base', group: 'metabolism' },
    THERMOSYNTH: { label: 'Thermal-gradient energy base', group: 'metabolism' },
    SLOW_METAB:  { label: 'Thrifty slow metabolism', group: 'metabolism' },
    FAST_METAB:  { label: 'High-output fast metabolism', group: 'metabolism' },
    TORPOR:      { label: 'Torpor / antifreeze physiology', group: 'metabolism' },
    DORMANCY:    { label: 'Dormancy / seed-banking life', group: 'metabolism' },

    // --- ecological strategy (emergent) ---
    SYMBIOSIS:   { label: 'Deep symbiosis / mutualism', group: 'ecology' },
    FILTER:      { label: 'Filter / bloom feeding', group: 'ecology' },
    TERRITORIAL: { label: 'Territorial hoarding', group: 'ecology' },
    CRYPSIS:     { label: 'Camouflage & concealment', group: 'ecology' },
    ARMORED:     { label: 'Armor-plated defense', group: 'ecology' },
    FAST_FLEE:   { label: 'Speed / flight escape', group: 'ecology' },
    GIGANTISM:   { label: 'Gigantism', group: 'ecology' },
    MIGRATION:   { label: 'Long migration cycles', group: 'ecology' },

    // --- body plan (emergent) ---
    STOCKY:      { label: 'Low, robust, stocky build', group: 'body' },
    GRACILE:     { label: 'Tall, elongated, gracile build', group: 'body' },
    RADIAL:      { label: 'Radial symmetry', group: 'body' },
    BILATERAL:   { label: 'Bilateral symmetry', group: 'body' },
    EXOSKELETON: { label: 'Exoskeleton / plating', group: 'body' },
    GLIDER:      { label: 'Lift/glide surfaces', group: 'body' },
    DIGGER:      { label: 'Burrowing/digging limbs', group: 'body' },
    PREHENSILE:  { label: 'Grasping/prehensile limbs', group: 'body' },
    CHROMATIC:   { label: 'Color-shifting skin', group: 'body' },

    // --- senses (emergent) ---
    EYES_REDUCED:{ label: 'Reduced / lost eyes', group: 'senses' },
    EYES_ACUTE:  { label: 'High-acuity vision', group: 'senses' },
    UV_VISION:   { label: 'UV / polarization vision', group: 'senses' },
    ECHO:        { label: 'Echolocation / acoustic mapping', group: 'senses' },
    ELECTRO:     { label: 'Electroreception', group: 'senses' },
    THERMAL_SENSE:{ label: 'Infrared / thermal sensing', group: 'senses' },
    CHEMO_SENSE: { label: 'Acute chemoreception (smell)', group: 'senses' },
    MAGNETO:     { label: 'Magneto / celestial navigation', group: 'senses' },
    VIBRATION:   { label: 'Substrate vibration sensing', group: 'senses' },
    FAST_VISION: { label: 'High flicker-fusion vision', group: 'senses' },

    // --- cognition (emergent) ---
    SOCIAL_BRAIN:{ label: 'Social / theory-of-mind cognition', group: 'cognition' },
    SPATIAL_MAP: { label: 'Strong spatial mapping', group: 'cognition' },
    PLANNING:    { label: 'Caching & long-horizon planning', group: 'cognition' },
    INNOVATION:  { label: 'Generalist innovation & learning', group: 'cognition' },
    DECEPTION:   { label: 'Tactical deception', group: 'cognition' },
    DISTRIBUTED: { label: 'Distributed / collective cognition', group: 'cognition' },
    COMPLEX_COGNITION:{ label: 'Open-ended complex cognition', group: 'cognition' },

    // --- social (emergent) ---
    EUSOCIAL:    { label: 'Eusociality / hive structure', group: 'social' },
    HIERARCHY:   { label: 'Dominance hierarchies', group: 'social' },
    HERDING:     { label: 'Herding / shoaling cooperation', group: 'social' },
    SENTINEL:    { label: 'Sentinel & alarm cooperation', group: 'social' },
    SELF_DOMESTICATION:{ label: 'Self-domestication', group: 'social' },
    PAIR_BOND:   { label: 'Cooperative breeding / pair bonds', group: 'social' },
    DISPERSED:   { label: 'Dispersed, low-density society', group: 'social' },

    // --- culture (emergent) ---
    CULTURE_PRESENT:{ label: 'Symbolic culture present', group: 'culture' },
    CUMULATIVE_CULTURE:{ label: 'Cumulative (ratcheting) culture', group: 'culture' },
    APOCALYPSE_MYTH:{ label: 'Catastrophe / apocalypse myth', group: 'culture' },
    HOARD_RITUAL:{ label: 'Scarcity taboo & gift economy', group: 'culture' },
    ACOUSTIC_ART:{ label: 'Acoustic / tactile art (non-visual)', group: 'culture' },
    SKY_CULT:    { label: 'Sky-fear / shelter cult', group: 'culture' },
    HIVE_MIND_CULTURE:{ label: 'Weak individuality / shared identity', group: 'culture' },
    CALENDAR:    { label: 'Calendar & timing obsession', group: 'culture' },
    ANCESTOR_RITE:{ label: 'Burial / ancestor rites', group: 'culture' },

    // --- technology (emergent) ---
    TOOLS:       { label: 'Tool industry', group: 'tech' },
    FIRELESS_TECH:{ label: 'Fireless (electro/bio) technology', group: 'tech' },
    EFFICIENCY_TECH:{ label: 'Recycling / efficiency technology', group: 'tech' },
    TIDAL_TECH:  { label: 'Tidal / gradient energy harvest', group: 'tech' },
    NICHE_CONSTRUCTION:{ label: 'Large-scale niche construction', group: 'tech' },
    TECH_CAPABLE:{ label: 'Approaching technological takeoff', group: 'tech' },

    // --- self-modification / singularity (emergent) ---
    SINGULARITY: { label: 'Crossed a self-modification singularity', group: 'singularity' },
    POSTBIO:     { label: 'Post-biological substrate', group: 'singularity' },
    METAB_REWRITE:{ label: 'Rewrote own metabolism', group: 'singularity' },
    SENSORY_UPGRADE:{ label: 'Engineered new senses', group: 'singularity' },
    BODY_REDESIGN:{ label: 'Redesigned own body plan', group: 'singularity' },
    MERGED_MINDS:{ label: 'Merged / networked minds', group: 'singularity' },
    NO_SINGULARITY:{ label: 'Never reached self-modification', group: 'singularity' },
  };

  function label(tag) {
    return (CONCEPTS[tag] && CONCEPTS[tag].label) || tag;
  }
  function group(tag) {
    return (CONCEPTS[tag] && CONCEPTS[tag].group) || 'misc';
  }
  function tagsInGroups(groups) {
    var out = [];
    for (var t in CONCEPTS) {
      if (groups.indexOf(CONCEPTS[t].group) >= 0) out.push(t);
    }
    return out;
  }

  XG.CONCEPTS = CONCEPTS;
  XG.concept = { label: label, group: group, tagsInGroups: tagsInGroups };
})(window.XG = window.XG || {});
