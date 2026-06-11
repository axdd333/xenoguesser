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
    PERPETUAL_DAY:   { label: 'Always daytime', group: 'light' },
    PERPETUAL_NIGHT: { label: 'Always dark', group: 'light' },
    TERMINATOR:      { label: 'Stuck on the day/night line', group: 'light' },
    DARKNESS:        { label: 'Always dim', group: 'light' },
    BRIGHT:          { label: 'Blinding sunlight', group: 'light' },
    STROBE_LIGHT:    { label: 'Flickering light', group: 'light' },
    LONG_CYCLE:      { label: 'Super-long days', group: 'light' },

    // --- radiation & star ---
    RADIATION:   { label: 'Radiation blasts', group: 'radiation' },
    HIGH_UV:     { label: 'Brutal UV', group: 'radiation' },
    STAR_FLARE:  { label: 'Killer solar flares', group: 'radiation' },
    SHORT_STAR:  { label: 'Star dying young, no time to spare', group: 'radiation' },
    DIM_STAR:    { label: 'Weak, dim sun', group: 'radiation' },

    // --- thermal ---
    COLD:        { label: 'Freezing cold', group: 'thermal' },
    HEAT:        { label: 'Scorching heat', group: 'thermal' },
    THERMAL_SWING:{ label: 'Wild temperature swings', group: 'thermal' },

    // --- gravity & medium ---
    HIGH_G:      { label: 'High gravity', group: 'gravity' },
    LOW_G:       { label: 'Low gravity', group: 'gravity' },
    DENSE_AIR:   { label: 'Thick, heavy air', group: 'atmosphere' },
    THIN_AIR:    { label: 'Thin air', group: 'atmosphere' },
    TOXIC_AIR:   { label: 'Poisonous air', group: 'atmosphere' },
    OXYGEN_RICH: { label: 'Oxygen-rich air', group: 'atmosphere' },
    AQUATIC:     { label: 'Lives underwater', group: 'medium' },
    HIGH_PRESSURE:{ label: 'Crushing pressure', group: 'medium' },
    AERIAL:      { label: 'Lives in the air', group: 'medium' },

    // --- terrain ---
    SUBSURFACE:  { label: 'Underground / caves', group: 'terrain' },
    VERTICAL:    { label: 'Cliffs and treetops', group: 'terrain' },
    OPEN_TERRAIN:{ label: 'Wide-open ground', group: 'terrain' },
    ARCHIPELAGO: { label: 'Scattered islands', group: 'terrain' },

    // --- resources & predation ---
    SCARCITY:    { label: 'Never enough food', group: 'resource' },
    ABUNDANCE:   { label: 'Tons of food', group: 'resource' },
    BOOM_BUST:   { label: 'Feast or famine', group: 'resource' },
    PATCHY:      { label: 'Food in scattered patches', group: 'resource' },
    PREDATION:   { label: 'Hunted relentlessly', group: 'predation' },
    AMBUSH:      { label: 'Ambush predators everywhere', group: 'predation' },
    NO_PREDATORS:{ label: 'Nothing hunts them', group: 'predation' },

    // --- instability & deep time ---
    INSTABILITY: { label: 'Chaotic, unstable climate', group: 'instability' },
    CATASTROPHE: { label: 'Repeated disasters', group: 'instability' },
    DEEP_TIME:   { label: 'Ancient world, life reset many times', group: 'time' },
    YOUNG_BIO:   { label: 'Young world, life in a hurry', group: 'time' },

    // --- chemistry / metabolism (emergent + seed) ---
    WATER_CARBON:{ label: 'Water-and-carbon life (like us)', group: 'chemistry' },
    CRYO_CHEM:   { label: 'Cryo chemistry (ammonia/methane)', group: 'chemistry' },
    SULFUR_CHEM: { label: 'Sulfur-based life', group: 'chemistry' },
    CHEMOSYNTH:  { label: 'Eats chemicals, not light', group: 'metabolism' },
    PHOTOSYNTH:  { label: 'Eats sunlight', group: 'metabolism' },
    THERMOSYNTH: { label: 'Runs on heat from below', group: 'metabolism' },
    SLOW_METAB:  { label: 'Slow, thrifty body', group: 'metabolism' },
    FAST_METAB:  { label: 'Fast, hungry body', group: 'metabolism' },
    TORPOR:      { label: 'Antifreeze blood, hibernates', group: 'metabolism' },
    DORMANCY:    { label: 'Sleeps out the bad times', group: 'metabolism' },

    // --- ecological strategy (emergent) ---
    SYMBIOSIS:   { label: 'Lives fused with partners', group: 'ecology' },
    FILTER:      { label: 'Filter-feeds the water', group: 'ecology' },
    TERRITORIAL: { label: 'Hoards and guards turf', group: 'ecology' },
    CRYPSIS:     { label: 'Master of camouflage', group: 'ecology' },
    ARMORED:     { label: 'Armored up', group: 'ecology' },
    FAST_FLEE:   { label: 'Built for speed', group: 'ecology' },
    GIGANTISM:   { label: 'Giant size', group: 'ecology' },
    MIGRATION:   { label: 'Long migrations', group: 'ecology' },

    // --- body plan (emergent) ---
    STOCKY:      { label: 'Low, stocky, tough build', group: 'body' },
    GRACILE:     { label: 'Tall and lanky', group: 'body' },
    RADIAL:      { label: 'Radial body (no front or back)', group: 'body' },
    BILATERAL:   { label: 'Two-sided body (like us)', group: 'body' },
    EXOSKELETON: { label: 'Hard outer shell', group: 'body' },
    GLIDER:      { label: 'Wings or glide-flaps', group: 'body' },
    DIGGER:      { label: 'Digging limbs', group: 'body' },
    PREHENSILE:  { label: 'Grabby hands and limbs', group: 'body' },
    CHROMATIC:   { label: 'Color-changing skin', group: 'body' },

    // --- senses (emergent) ---
    EYES_REDUCED:{ label: 'Tiny or no eyes', group: 'senses' },
    EYES_ACUTE:  { label: 'Sharp eyesight', group: 'senses' },
    UV_VISION:   { label: 'Sees UV light', group: 'senses' },
    ECHO:        { label: 'Echolocation (sees with sound)', group: 'senses' },
    ELECTRO:     { label: 'Senses electric fields', group: 'senses' },
    THERMAL_SENSE:{ label: 'Heat vision', group: 'senses' },
    CHEMO_SENSE: { label: 'Incredible sense of smell', group: 'senses' },
    MAGNETO:     { label: 'Built-in compass', group: 'senses' },
    VIBRATION:   { label: 'Feels ground vibrations', group: 'senses' },
    FAST_VISION: { label: 'Super-fast eyes', group: 'senses' },

    // --- cognition (emergent) ---
    SOCIAL_BRAIN:{ label: 'Reads other minds', group: 'cognition' },
    SPATIAL_MAP: { label: 'Amazing sense of place', group: 'cognition' },
    PLANNING:    { label: 'Plans and stockpiles ahead', group: 'cognition' },
    INNOVATION:  { label: 'Clever, adaptable, learns fast', group: 'cognition' },
    DECEPTION:   { label: 'Lies and tricks', group: 'cognition' },
    DISTRIBUTED: { label: 'Thinks as a group', group: 'cognition' },
    COMPLEX_COGNITION:{ label: 'Genuinely clever', group: 'cognition' },

    // --- social (emergent) ---
    EUSOCIAL:    { label: 'Hive or colony', group: 'social' },
    HIERARCHY:   { label: 'Strict pecking order', group: 'social' },
    HERDING:     { label: 'Moves in herds or schools', group: 'social' },
    SENTINEL:    { label: 'Lookouts and alarm calls', group: 'social' },
    SELF_DOMESTICATION:{ label: 'Tamed itself, gone chill', group: 'social' },
    PAIR_BOND:   { label: 'Raises young together', group: 'social' },
    DISPERSED:   { label: 'Loners, spread far apart', group: 'social' },

    // --- culture (emergent) ---
    CULTURE_PRESENT:{ label: 'Has real culture', group: 'culture' },
    CUMULATIVE_CULTURE:{ label: 'Culture that builds on itself', group: 'culture' },
    APOCALYPSE_MYTH:{ label: 'End-of-the-world myths', group: 'culture' },
    HOARD_RITUAL:{ label: 'Gift economy, hates waste', group: 'culture' },
    ACOUSTIC_ART:{ label: 'Art you hear and touch, not see', group: 'culture' },
    SKY_CULT:    { label: 'Fears the sky, hides in shelters', group: 'culture' },
    HIVE_MIND_CULTURE:{ label: 'Barely individuals, shared identity', group: 'culture' },
    CALENDAR:    { label: 'Obsessed with calendars and timing', group: 'culture' },
    ANCESTOR_RITE:{ label: 'Buries and honors the dead', group: 'culture' },

    // --- technology (emergent) ---
    TOOLS:       { label: 'Makes tools', group: 'tech' },
    FIRELESS_TECH:{ label: 'Tech without fire', group: 'tech' },
    EFFICIENCY_TECH:{ label: 'Recycles everything', group: 'tech' },
    TIDAL_TECH:  { label: 'Harvests tides and heat', group: 'tech' },
    NICHE_CONSTRUCTION:{ label: 'Reshapes whole landscapes', group: 'tech' },
    TECH_CAPABLE:{ label: 'On the edge of high tech', group: 'tech' },

    // --- self-modification / singularity (emergent) ---
    SINGULARITY: { label: 'Rebuilt their own bodies', group: 'singularity' },
    POSTBIO:     { label: 'Went fully artificial', group: 'singularity' },
    METAB_REWRITE:{ label: 'Rewired how they fuel themselves', group: 'singularity' },
    SENSORY_UPGRADE:{ label: 'Gave themselves new senses', group: 'singularity' },
    BODY_REDESIGN:{ label: 'Redesigned their bodies', group: 'singularity' },
    MERGED_MINDS:{ label: 'Merged into one mind', group: 'singularity' },
    NO_SINGULARITY:{ label: 'Never rebuilt themselves', group: 'singularity' },
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
