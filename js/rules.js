/* Xenoguesser :: causal trait rules
 *
 * The pipeline:
 *   worldseed -> ecology -> body plan -> senses -> cognition ->
 *   social -> culture -> technology -> self-modification -> final form
 *
 * Each rule:
 *   id        unique key
 *   need      tags that must be present in the accumulated pool (ANY of them)
 *   needAll   tags that must ALL be present (optional)
 *   block     if any of these tags are present, the rule cannot fire (optional)
 *   weight    base propensity; final firing score = weight + matched tag strength + jitter
 *   emit      tags this trait injects into the pool for later stages
 *   title     short trait name
 *   reveal    instrument-facing description (what the player actually reads)
 *   inst      which instrument surfaces this trait
 *
 * Real concepts referenced: natural selection, convergent evolution, niche
 * construction, sensory ecology, metabolism/ecological tradeoffs, symbiosis,
 * eusociality, self-domestication, gene-culture coevolution, catastrophe
 * selection, sexual selection, cultural feedback loops. Speculative, not
 * actionable: no protocols, no engineering recipes.
 */
(function (XG) {
  'use strict';

  var I = {
    MORPH: 'morphology', METAB: 'metabolism', BEHAV: 'behavior',
    CULT: 'culture', SING: 'singularity', SHADOW: 'shadow',
  };

  // ---- ECOLOGY : how life makes a living under the pressures ----
  var ECOLOGY = [
    { id: 'eco_chemo', need: ['CHEMOSYNTH', 'SULFUR_CHEM', 'THERMOSYNTH'], weight: 1.4, emit: ['CHEMOSYNTH', 'SYMBIOSIS'], inst: I.METAB,
      title: 'Eats chemicals', reveal: 'Energy is drawn from mineral and chemical gradients, not light. Tissues host dense symbiotic chemo-bacteria — life here is a negotiated alliance, not a solo act.' },
    { id: 'eco_photo', need: ['PHOTOSYNTH', 'BRIGHT', 'PERPETUAL_DAY'], block: ['PERPETUAL_NIGHT', 'SUBSURFACE'], weight: 1.2, emit: ['PHOTOSYNTH'], inst: I.METAB,
      title: 'Solar-panel skin', reveal: 'Light-harvesting symbionts are farmed in dermal panels; the body doubles as a solar collector and orients toward the light by reflex.' },
    { id: 'eco_thrift', need: ['SCARCITY'], weight: 1.3, emit: ['SLOW_METAB', 'TERRITORIAL'], inst: I.METAB,
      title: 'Runs on almost nothing', reveal: 'A miserly metabolism wrung for every joule: slow growth, long life, fiercely defended territory. Waste is effectively lethal.' },
    { id: 'eco_bloom', need: ['ABUNDANCE', 'AQUATIC'], weight: 1.1, emit: ['FILTER', 'FAST_METAB'], inst: I.METAB,
      title: 'Filter-feeds the blooms', reveal: 'Cheap, dense food selected for fast, high-throughput filter feeders that breed in floods and die in droves — an r-strategy boom ecology.' },
    { id: 'eco_torpor', need: ['COLD', 'CRYO_CHEM'], weight: 1.2, emit: ['TORPOR', 'SLOW_METAB'], inst: I.METAB,
      title: 'Antifreeze and deep sleep', reveal: 'Antifreeze chemistry and routine torpor; reactions run cold and slow. Whole seasons pass in suspended near-stillness.' },
    { id: 'eco_dormant', need: ['BOOM_BUST', 'CATASTROPHE', 'INSTABILITY'], weight: 1.2, emit: ['DORMANCY'], inst: I.METAB,
      title: 'Waits out disaster', reveal: 'Survival is timed to disaster: spores, cysts, and seed-banks that sit out the bad years. Catastrophe selection favored the patient over the powerful.' },
    { id: 'eco_armor', need: ['PREDATION'], weight: 1.1, emit: ['ARMORED'], inst: I.METAB,
      title: 'Locked in an arms race', reveal: 'Heavy investment in armor and toxins — the metabolic cost of not being eaten in a predator arms race.' },
    { id: 'eco_speed', need: ['PREDATION', 'OPEN_TERRAIN'], weight: 1.0, emit: ['FAST_FLEE', 'FAST_METAB'], inst: I.METAB,
      title: 'Built to outrun', reveal: 'Oxygen-hungry burst muscle and a high resting metabolism — built to outrun rather than out-armor.' },
    { id: 'eco_crypsis', need: ['AMBUSH', 'CRYPSIS', 'VERTICAL'], weight: 1.1, emit: ['CRYPSIS'], inst: I.METAB,
      title: 'Sit-and-wait ambusher', reveal: 'Long fasts punctuated by explosive strikes; metabolism is tuned for patience, not pursuit.' },
    { id: 'eco_giant', need: ['NO_PREDATORS', 'LOW_G'], weight: 1.0, emit: ['GIGANTISM', 'SLOW_METAB'], inst: I.METAB,
      title: 'Grew huge, unbothered', reveal: 'With nothing hunting them, bodies drifted toward great size and low vigilance — the classic signature of relaxed predation.' },
    { id: 'eco_symb', need: ['SYMBIOSIS'], weight: 1.0, emit: ['SYMBIOSIS'], inst: I.METAB,
      title: 'Never lives alone', reveal: 'The organism is a chimera of partners. No single genome runs it; metabolism is a committee.' },
    { id: 'eco_migrate', need: ['PATCHY', 'MIGRATION', 'THERMAL_SWING'], weight: 0.9, emit: ['MIGRATION'], inst: I.METAB,
      title: 'Always on the move', reveal: 'Resources arrive in moving islands, so the body is built to follow them — fat-loading, long-haul endurance, navigational hunger.' },
  ];

  // ---- BODY PLAN : morphology under physics + ecology ----
  var BODY = [
    { id: 'body_stocky', need: ['HIGH_G'], weight: 1.4, emit: ['STOCKY', 'BILATERAL'], inst: I.MORPH,
      title: 'Low and heavily braced', reveal: 'Short, thick limbs and a low center of mass. Bones (or their analog) are dense and over-engineered against the constant downward pull.' },
    { id: 'body_gracile', need: ['LOW_G'], weight: 1.4, emit: ['GRACILE'], inst: I.MORPH,
      title: 'Tall and spindly', reveal: 'Elongated, spindly, improbably tall. Structural margins are thin — falling barely matters here, so nothing is built to resist it.' },
    { id: 'body_stream', need: ['AQUATIC'], block: ['FILTER'], weight: 1.3, emit: ['BILATERAL'], inst: I.MORPH,
      title: 'Streamlined swimmer', reveal: 'Fusiform body, fin- or mantle-driven propulsion, jelly-supported tissues. Bilateral and directional — built to chase and steer through open water.' },
    { id: 'body_radial', need: ['FILTER'], needAll: ['AQUATIC'], weight: 1.4, emit: ['RADIAL'], inst: I.MORPH,
      title: 'No front, no back', reveal: 'No front, no back — a radially symmetric body that meets food and threat from every direction at once. The classic plan of the sessile filter-feeder, convergent on jellyfish and anemones.' },
    { id: 'body_exo', need: ['ARMORED', 'PREDATION', 'HIGH_PRESSURE'], weight: 1.2, emit: ['EXOSKELETON'], inst: I.MORPH,
      title: 'Wears its skeleton outside', reveal: 'Articulated armor plates over the whole body — convergent on the same solution arthropods and ankylosaurs found: wear the skeleton outside.' },
    { id: 'body_glide', need: ['LOW_G', 'DENSE_AIR', 'AERIAL', 'VERTICAL'], weight: 1.0, emit: ['GLIDER', 'AERIAL'], inst: I.MORPH,
      title: 'Wings and glide-flaps', reveal: 'Membranes, frills, or true wings. Thick air and forgiving gravity made staying aloft cheap, and the body sprouted ways to exploit it.' },
    { id: 'body_dig', need: ['SUBSURFACE'], weight: 1.2, emit: ['DIGGER'], inst: I.MORPH,
      title: 'Built to dig', reveal: 'Powerful digging limbs, a wedge-shaped head, reduced external structures that would snag in tunnels. Built to move through matter, not over it.' },
    { id: 'body_prehensile', need: ['VERTICAL', 'CANOPY'], weight: 1.1, emit: ['PREHENSILE'], inst: I.MORPH,
      title: 'Real hands', reveal: 'Prehensile limbs, hooks, or gripping pads for a three-dimensional world — the same pressure that gave primates and chameleons their hands.' },
    { id: 'body_chrom', need: ['CRYPSIS', 'AMBUSH'], weight: 1.0, emit: ['CHROMATIC'], inst: I.MORPH,
      title: 'Color-changing skin', reveal: 'Active color-shifting skin for camouflage and, later, signaling. The same tissue that hides the body can later be turned to speak.' },
    { id: 'body_giant', need: ['GIGANTISM'], weight: 0.9, emit: ['STOCKY'], inst: I.MORPH,
      title: 'Enormous body', reveal: 'A massive body with heat-dump structures — sails, frills, or vasculature — to shed the warmth that great size traps.' },
  ];

  // ---- SENSES : sensory ecology under the light & medium regime ----
  var SENSES = [
    { id: 'sense_blind', need: ['PERPETUAL_NIGHT', 'SUBSURFACE', 'DARKNESS', 'DIM_STAR'], weight: 1.4, emit: ['EYES_REDUCED'], inst: I.MORPH,
      title: 'Lost its eyes', reveal: 'Vision was useless and expensive, so it was abandoned — eyes reduced to vestiges or gone entirely. A textbook ecological tradeoff.' },
    { id: 'sense_echo', need: ['DARKNESS', 'PERPETUAL_NIGHT', 'SUBSURFACE'], needAll: null, weight: 1.3, emit: ['ECHO', 'SPATIAL_MAP'], inst: I.BEHAV,
      title: 'Sees with sound', reveal: 'The world is built from echoes. Specialized emitters and resonant receivers paint a spatial model out of returning sound.' },
    { id: 'sense_electro', need: ['AQUATIC', 'SUBSURFACE'], weight: 1.1, emit: ['ELECTRO'], inst: I.BEHAV,
      title: 'Senses electricity', reveal: 'Fields of electroreceptors read the faint bioelectricity of other bodies — hunting and navigating where light cannot reach.' },
    { id: 'sense_thermal', need: ['DARKNESS', 'THERMAL_SWING', 'AMBUSH'], weight: 1.0, emit: ['THERMAL_SENSE'], inst: I.MORPH,
      title: 'Heat-sensing pits', reveal: 'Heat-sensing pit organs let it see warm bodies against a cold dark — pure thermal sensing, like pit vipers convergently evolved.' },
    { id: 'sense_acute', need: ['BRIGHT', 'PERPETUAL_DAY', 'OPEN_TERRAIN'], block: ['PERPETUAL_NIGHT'], weight: 1.2, emit: ['EYES_ACUTE'], inst: I.MORPH,
      title: 'Eagle eyes', reveal: 'Large, sharp eyes with a dense fovea-analog. In open daylight, the long view is everything, and vision was sharpened to a blade.' },
    { id: 'sense_uv', need: ['HIGH_UV', 'BRIGHT'], weight: 1.0, emit: ['UV_VISION'], inst: I.MORPH,
      title: 'Sees colors we cannot', reveal: 'Vision pushed into the ultraviolet and into polarized light — turning a hostile UV-rich sky into an information channel.' },
    { id: 'sense_chemo', need: ['DENSE_AIR', 'TOXIC_AIR'], weight: 1.0, emit: ['CHEMO_SENSE'], inst: I.BEHAV,
      title: 'Smells everything', reveal: 'Thick air carries scent for kilometers, and the body answered with an enormous chemosensory apparatus — it largely smells the world.' },
    { id: 'sense_magneto', need: ['TERMINATOR', 'MIGRATION', 'PERPETUAL_NIGHT'], weight: 0.9, emit: ['MAGNETO'], inst: I.BEHAV,
      title: 'Built-in compass', reveal: 'With no fixed sun to steer by, it reads the planet’s magnetic field and celestial cues as an innate compass.' },
    { id: 'sense_vibe', need: ['SUBSURFACE', 'HIGH_G'], weight: 0.9, emit: ['VIBRATION'], inst: I.BEHAV,
      title: 'Listens through the ground', reveal: 'It listens through the ground — seismic vibration sensing that turns the solid world into a medium for messages.' },
    { id: 'sense_flicker', need: ['STROBE_LIGHT'], weight: 0.9, emit: ['FAST_VISION'], inst: I.MORPH,
      title: 'Super-fast eyes', reveal: 'Under stuttering double-star light, the visual system evolved a punishing refresh rate — it perceives flicker the way slower eyes perceive steady glow.' },
  ];

  // ---- COGNITION : what the brain is FOR ----
  var COGNITION = [
    { id: 'cog_tom', need: ['PREDATION', 'AMBUSH', 'HERDING'], weight: 1.3, emit: ['SOCIAL_BRAIN', 'DECEPTION'], inst: I.BEHAV,
      title: 'Reads other minds', reveal: 'Survival meant modeling other minds — predators, prey, rivals. The result is a brain built for prediction and, inevitably, for deception.' },
    { id: 'cog_spatial', need: ['ECHO', 'SPATIAL_MAP', 'MIGRATION', 'SUBSURFACE'], weight: 1.2, emit: ['SPATIAL_MAP'], inst: I.BEHAV,
      title: 'Maps the world in its head', reveal: 'A cognitive map is its core competence: vast, detailed memory of place, route, and resource laid over a remembered world.' },
    { id: 'cog_plan', need: ['SCARCITY', 'BOOM_BUST', 'THERMAL_SWING'], weight: 1.1, emit: ['PLANNING'], inst: I.BEHAV,
      title: 'Plans ahead and stockpiles', reveal: 'It hoards, plans, and defers gratification. Lean futures selected for minds that could see them coming and prepare.' },
    { id: 'cog_innov', need: ['INSTABILITY', 'BOOM_BUST', 'PATCHY'], weight: 1.2, emit: ['INNOVATION'], inst: I.BEHAV,
      title: 'Clever improviser', reveal: 'An unpredictable world punished specialists, so it became an improviser — a flexible, curious generalist that learns its way through novelty.' },
    { id: 'cog_distrib', need: ['EUSOCIAL', 'SYMBIOSIS'], weight: 1.0, emit: ['DISTRIBUTED'], inst: I.BEHAV,
      title: 'Thinks as a colony', reveal: 'Thinking is spread across many bodies. No single individual holds the whole mind; cognition is a property of the colony.' },
  ];

  // ---- SOCIAL : structure that the ecology + cognition imply ----
  var SOCIAL = [
    { id: 'soc_euso', need: ['EUSOCIAL', 'ABUNDANCE', 'SYMBIOSIS'], weight: 1.3, emit: ['EUSOCIAL', 'DISTRIBUTED'], inst: I.BEHAV,
      title: 'Hive with castes', reveal: 'Reproduction is monopolized by a few; the rest are sterile specialists. Kin selection drove the colony to behave as one super-body.' },
    { id: 'soc_hier', need: ['SCARCITY', 'TERRITORIAL'], weight: 1.1, emit: ['HIERARCHY', 'DISPERSED'], inst: I.BEHAV,
      title: 'Strict pecking order', reveal: 'Scarce, defended resources produced steep dominance hierarchies and dispersed, low-density living. Status is survival.' },
    { id: 'soc_herd', need: ['PREDATION', 'OPEN_TERRAIN', 'FAST_FLEE'], weight: 1.1, emit: ['HERDING', 'SENTINEL'], inst: I.BEHAV,
      title: 'Herds with lookouts', reveal: 'Safety in numbers: synchronized herds, shared vigilance, alarm calls. Many eyes are the cheapest defense against ambush.' },
    { id: 'soc_selfdom', needAll: ['INNOVATION'], need: ['SOCIAL_BRAIN', 'HERDING', 'PAIR_BOND'], weight: 1.2, emit: ['SELF_DOMESTICATION', 'PAIR_BOND'], inst: I.BEHAV,
      title: 'Tamed itself', reveal: 'Tolerance was selected over aggression; juveniles stayed playful and teachable into adulthood. The species, in effect, tamed itself.' },
    { id: 'soc_bond', need: ['SCARCITY', 'PATCHY', 'SLOW_METAB'], weight: 0.9, emit: ['PAIR_BOND'], inst: I.BEHAV,
      title: 'Raises young together', reveal: 'Costly, slow-growing young made it cheaper to raise them together — cooperative breeding and durable bonds.' },
  ];

  // ---- CULTURE : symbolic life (gated on complex cognition) ----
  var CULTURE = [
    { id: 'cult_acoustic', need: ['ECHO', 'EYES_REDUCED', 'VIBRATION', 'DARKNESS'], weight: 1.2, emit: ['ACOUSTIC_ART'], inst: I.CULT,
      title: 'Art you hear and touch', reveal: 'No visual symbolism survives — there was never light to see it by. Instead: resonant chambers, sculpted echoes, raised-relief glyphs read by touch.' },
    { id: 'cult_apoc', need: ['CATASTROPHE', 'INSTABILITY'], weight: 1.2, emit: ['APOCALYPSE_MYTH', 'CALENDAR'], inst: I.CULT,
      title: 'End-times myths', reveal: 'Recurring disasters fossilized into myth: cycles of ending and renewal, an obsession with calendars and omens, architecture built to outlast the next reset.' },
    { id: 'cult_sky', need: ['RADIATION', 'STAR_FLARE', 'TERMINATOR'], weight: 1.1, emit: ['SKY_CULT', 'CALENDAR'], inst: I.CULT,
      title: 'Fears the sky', reveal: 'The sky itself is the enemy. Deep shelters, flare-warning rites, a cosmology in which safety means going down and in, never up and out.' },
    { id: 'cult_hoard', need: ['SCARCITY', 'TERRITORIAL', 'HIERARCHY'], weight: 1.0, emit: ['HOARD_RITUAL'], inst: I.CULT,
      title: 'Gift-and-debt economy', reveal: 'Gift and debt structure everything; waste is the deepest taboo. Wealth is hoarded, displayed, and ritually destroyed to signal status.' },
    { id: 'cult_hive', need: ['EUSOCIAL', 'DISTRIBUTED'], weight: 1.0, emit: ['HIVE_MIND_CULTURE'], inst: I.CULT,
      title: 'Barely individuals', reveal: 'Individuality is faint. Memory, story, and selfhood are colony-level; a single body matters about as much as a single cell does to us.' },
    { id: 'cult_ancestor', need: ['SELF_DOMESTICATION', 'PAIR_BOND', 'DEEP_TIME'], weight: 1.0, emit: ['ANCESTOR_RITE'], inst: I.CULT,
      title: 'Honors its dead', reveal: 'The dead are kept: burial, relics, lineages remembered across generations. Care extended past death and became the root of religion.' },
  ];

  // ---- TECHNOLOGY (gated on cumulative culture) ----
  var TECH = [
    { id: 'tech_tools', need: ['PREHENSILE', 'INNOVATION', 'EYES_ACUTE'], weight: 1.2, emit: ['TOOLS', 'TECH_CAPABLE'], inst: I.SING,
      title: 'Real toolmakers', reveal: 'Hands and foresight converged on a true tool industry — shaped implements, composite tools, tools that make tools.' },
    { id: 'tech_fireless', need: ['AQUATIC', 'SUBSURFACE'], weight: 1.1, emit: ['FIRELESS_TECH', 'TECH_CAPABLE'], inst: I.SING,
      title: 'Tech without fire', reveal: 'Fire was impossible here, so technology took another road: bio-chemistry, electro-fabrication, cultivated organisms used as machines.' },
    { id: 'tech_eff', need: ['SCARCITY', 'HOARD_RITUAL'], weight: 1.0, emit: ['EFFICIENCY_TECH', 'TECH_CAPABLE'], inst: I.SING,
      title: 'Wastes nothing', reveal: 'Technology obsessed with closing loops — recycling everything, zero waste, getting maximal work from minimal energy.' },
    { id: 'tech_tidal', need: ['TERMINATOR', 'THERMOSYNTH'], weight: 0.9, emit: ['TIDAL_TECH', 'TECH_CAPABLE'], inst: I.SING,
      title: 'Taps the planet for power', reveal: 'Power comes from the planet’s own gradients — tides, the eternal hot/cold terminator boundary, geothermal heat tapped at scale.' },
    { id: 'tech_niche', need: ['EUSOCIAL', 'TOOLS'], weight: 0.9, emit: ['NICHE_CONSTRUCTION', 'TECH_CAPABLE'], inst: I.SING,
      title: 'Reshapes whole worlds', reveal: 'It reshapes the environment to suit itself at continental scale — the same instinct that built termite mounds and human cities, run to its limit.' },
  ];

  // ---- SELF-MODIFICATION / SINGULARITY (gated on tech_capable) ----
  // Note: even after self-modification, the ROOT pressure persists. That is the
  // "what the final form can never escape" payoff.
  var SELFMOD = [
    { id: 'mod_metab', need: ['SLOW_METAB', 'SCARCITY', 'CHEMOSYNTH'], weight: 1.1, emit: ['METAB_REWRITE', 'SINGULARITY'], inst: I.SING,
      title: 'Rewired its own fuel', reveal: 'They rewrote their own energy economy — but kept the deep thrift the old scarcity burned in. Even unbound, they cannot bring themselves to waste.' },
    { id: 'mod_sense', need: ['EYES_REDUCED', 'ECHO', 'ELECTRO'], weight: 1.1, emit: ['SENSORY_UPGRADE', 'SINGULARITY'], inst: I.SING,
      title: 'Built new senses', reveal: 'They built the senses evolution denied them — yet their whole cognition is still shaped around the original dark. They see now, and still think like the blind.' },
    { id: 'mod_body', need: ['EXOSKELETON', 'HIGH_G', 'STOCKY'], weight: 1.0, emit: ['BODY_REDESIGN', 'SINGULARITY'], inst: I.SING,
      title: 'Redesigned its body', reveal: 'They redesigned the body wholesale — but every redesign still braces against a gravity they never left. The old weight is in everything they make.' },
    { id: 'mod_merge', need: ['EUSOCIAL', 'DISTRIBUTED', 'HIVE_MIND_CULTURE'], weight: 1.1, emit: ['MERGED_MINDS', 'POSTBIO', 'SINGULARITY'], inst: I.SING,
      title: 'Merged into one mind', reveal: 'Individual minds dissolved into a networked substrate — the colony logic taken to completion. There may be no "individuals" left to ask.' },
    { id: 'mod_postbio', need: ['RADIATION', 'CATASTROPHE', 'DEEP_TIME'], weight: 1.0, emit: ['POSTBIO', 'SINGULARITY'], inst: I.SING,
      title: 'Left flesh behind', reveal: 'To outlast a sky that periodically sterilizes the world, they moved into durable engineered substrates — but they still bunker, still flinch from the flare. The fear outlived the flesh.' },
  ];

  XG.RULES = {
    ecology: ECOLOGY, body: BODY, senses: SENSES, cognition: COGNITION,
    social: SOCIAL, culture: CULTURE, tech: TECH, selfmod: SELFMOD,
  };
  XG.INSTRUMENTS = I;
})(window.XG = window.XG || {});
