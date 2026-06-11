/* Xenoguesser :: procedural 3D creature
 *
 * Builds a THREE.Group from a specimen's tag pool. Every choice -- symmetry,
 * build, limb count, eyes, armor, bioluminescence, colour -- is downstream of
 * the same causal tags the engine produced. The creature you orbit IS the
 * theorem; nothing here is arbitrary.
 */
import * as THREE from 'three';
import { MarchingCubes } from './../../vendor/jsm/objects/MarchingCubes.js';

// ---- procedural skin: a tiling normal map so flesh has micro-relief and
// armored forms have scales/plates instead of looking like smooth plastic ----
const _skinCache = {};
function makeSkinNormal(mode) {
  if (_skinCache[mode]) return _skinCache[mode];
  const N = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(N, N);
  const h = new Float32Array(N * N);
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let f = 0, amp = 0.5, frq = mode === 'scales' ? 5 : 9;
    for (let o = 0; o < 4; o++) { f += amp * vnoise(x / N * frq, y / N * frq); frq *= 2; amp *= 0.5; }
    if (mode === 'scales') {
      const gx = x / N * 11, gy = y / N * 11;
      const cell = Math.abs(Math.sin(gx * 1.7) * Math.sin(gy * 1.9));
      f = 0.55 * f + 0.45 * Math.pow(cell, 0.6);
    }
    h[y * N + x] = f;
  }
  const str = mode === 'scales' ? 2.4 : 1.3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const xl = h[y * N + ((x - 1 + N) % N)], xr = h[y * N + ((x + 1) % N)];
    const yl = h[((y - 1 + N) % N) * N + x], yr = h[((y + 1) % N) * N + x];
    let nx = -(xr - xl) * str, ny = -(yr - yl) * str, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * N + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
    img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(mode === 'scales' ? 4 : 6, mode === 'scales' ? 4 : 6);
  _skinCache[mode] = tex;
  return tex;
}

const STAR_COLOR = {
  gstar: 0xfff1d8, reddwarf: 0xff5a3c, orange: 0xffae5a,
  bluegiant: 0xbcd2ff, browndwarf: 0x7a4a30,
};

function starColor(spec) {
  const id = spec.worldseed.choices.starSystem.id;
  return new THREE.Color(STAR_COLOR[id] || 0xffffff);
}

function palette(spec) {
  const has = (t) => (spec.pool[t] || 0) > 0;
  let skin = 0x8896a0;                              // default: muted grey-blue
  if (has('SULFUR_CHEM')) skin = 0xc9a23c;          // sulfur ochre
  else if (has('CRYO_CHEM') || has('COLD')) skin = 0x9ed3ea; // cryo pale blue
  else if (has('CHEMOSYNTH')) skin = 0xc08597;      // vent flesh
  else if (has('PHOTOSYNTH')) skin = 0x6fae5e;      // chlorophyll
  else if (has('HEAT') || has('HIGH_UV')) skin = 0xb5603f; // sunbaked

  // bioluminescence in the dark
  const lumen = has('CHEMOSYNTH') || has('PERPETUAL_NIGHT') || has('DARKNESS') || has('SUBSURFACE');
  // bioluminescence is localized organs, not whole-body glow: keep the body
  // emissive subtle so its form reads under lighting, and let photophores pop.
  const emissive = lumen ? 0x1fd6ff : 0x0c1622;
  const eInt = lumen ? 0.14 : 0.08;

  const exo = has('EXOSKELETON') || has('ARMORED');
  return {
    skin: new THREE.Color(skin),
    emissive: new THREE.Color(emissive),
    eInt,
    metal: exo ? 0.6 : 0.05,
    rough: exo ? 0.32 : 0.72,
    flat: exo,
    accent: starColor(spec),
    lumen,
  };
}

// a tapered limb segment: base at local origin, grows along +Y
function segment(len, r0, r1, mat, seg = 10) {
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  g.translate(0, len / 2, 0);
  return new THREE.Mesh(g, mat);
}

// nested two-bone limb so it can be posed and animated as a chain. Joint balls
// at hip/knee and a foot at the tip make it read as an articulated limb with
// muscle rather than a tapered wire.
function joint(r, mat) { return new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat); }
function limb(opts) {
  const { thigh, shin, r0, r1, r2, mat, rootAngle, kneeAngle, foot } = opts;
  const root = new THREE.Group();
  root.rotation.z = rootAngle;
  root.add(joint(r0 * 1.15, mat));                 // hip/shoulder ball
  root.add(segment(thigh, r0, r1, mat));
  const knee = new THREE.Group();
  knee.position.y = thigh;
  knee.rotation.z = kneeAngle;
  knee.add(joint(r1 * 1.2, mat));                  // knee/elbow ball
  knee.add(segment(shin, r1, r2, mat));
  if (foot !== false) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r2 * 1.6, 10, 8), mat);
    f.scale.set(1.4, 0.7, 1.6); f.position.set(0, shin, r2 * 0.8);
    knee.add(f);
  }
  root.add(knee);
  return root;
}

// a bone spanning two local points a -> b
function bone(a, b, r0, r1, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() || 0.001;
  const g = new THREE.CylinderGeometry(r1, r0, len, 6);
  g.translate(0, len / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

// build a smooth organic mass from metaballs (marching cubes). balls are given
// as { p: Vector3 offset from center, r: world radius }. Returns a baked mesh.
function metaballMass(balls, center, scale, mat, res) {
  const mc = new MarchingCubes(res, mat, true, false, 80000);
  mc.isolation = 80;
  mc.position.copy(center);
  mc.scale.copy(scale);
  const avg = (scale.x + scale.y + scale.z) / 3;
  const subtract = 12;
  for (const b of balls) {
    const fx = 0.5 + b.p.x / (2 * scale.x);
    const fy = 0.5 + b.p.y / (2 * scale.y);
    const fz = 0.5 + b.p.z / (2 * scale.z);
    const rf = b.r / (2 * avg);
    mc.addBall(fx, fy, fz, subtract * rf * rf, subtract);
  }
  mc.update();
  return mc;
}

function glow(color, size) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(size, 16, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.4 })
  );
  return m;
}

export function buildCreature(spec) {
  const has = (t) => (spec.pool[t] || 0) > 0;
  const rng = window.XG.RNG(spec.seed + '::form3d');
  const pal = palette(spec);
  const group = new THREE.Group();
  const anim = []; // {obj, fn}

  // Physical material: soft-tissue creatures get subsurface translucency
  // (transmission + attenuation + sheen); exoskeletons get a hard chitinous
  // clearcoat. This is what reads as "alive" rather than "plastic".
  const fleshy = !pal.flat;
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: pal.skin,
    roughness: pal.flat ? 0.34 : 0.55,
    metalness: pal.flat ? 0.45 : 0.0,
    emissive: pal.emissive, emissiveIntensity: pal.eInt, flatShading: pal.flat,
    clearcoat: pal.flat ? 0.7 : 0.35, clearcoatRoughness: pal.flat ? 0.25 : 0.5,
    sheen: fleshy ? 0.7 : 0.0, sheenRoughness: 0.6,
    sheenColor: pal.skin.clone().lerp(new THREE.Color(0xffffff), 0.5),
    transmission: fleshy ? 0.22 : 0.0, thickness: fleshy ? 1.3 : 0.0,
    attenuationColor: pal.skin.clone().multiplyScalar(0.75), attenuationDistance: 1.6,
    iridescence: has('CHROMATIC') ? 0.6 : 0.0, iridescenceIOR: 1.3,
    envMapIntensity: 0.9,
  });
  // skin micro-relief: scales/plates for armored forms, fine bumps otherwise
  const skinTex = makeSkinNormal(pal.flat ? 'scales' : 'skin');
  bodyMat.normalMap = skinTex;
  bodyMat.normalScale = new THREE.Vector2(pal.flat ? 0.8 : 0.35, pal.flat ? 0.8 : 0.35);
  const limbMat = bodyMat.clone();

  // chromatophore skin: animate a hue cycle
  if (has('CHROMATIC')) {
    bodyMat.metalness = 0.2; bodyMat.roughness = 0.45;
    const baseHSL = {};
    bodyMat.color.getHSL(baseHSL);
    anim.push({ obj: bodyMat, fn: (t) => {
      bodyMat.color.setHSL((baseHSL.h + 0.08 * Math.sin(t * 0.6)) % 1, 0.55, 0.55);
    }});
  }

  const radial = has('RADIAL') && !has('BILATERAL');
  const aquatic = has('AQUATIC') && !radial;
  const stocky = has('STOCKY');
  const gracile = has('GRACILE');

  const core = new THREE.Group();
  group.add(core);

  // emissive bioluminescent spots scattered on the body
  function speckle(host, n, radius) {
    if (!pal.lumen) return;
    n = Math.round(n * 1.5);
    for (let i = 0; i < n; i++) {
      const s = glow(pal.emissive, 0.045 + rng.float() * 0.05);
      const u = rng.float() * Math.PI * 2, v = Math.acos(2 * rng.float() - 1);
      s.position.set(
        radius * Math.sin(v) * Math.cos(u),
        radius * Math.cos(v) * 0.8 + 0.2,
        radius * Math.sin(v) * Math.sin(u)
      );
      host.add(s);
    }
  }

  // ---- BODY ARCHETYPES ----
  let headHost = core, headY = 1.0, headFwd = 0;

  if (radial) {
    // central bell + radiating arms (a deep-sea / cnidarian logic)
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), bodyMat);
    bell.scale.set(1, 1.1, 1);
    bell.position.y = 0.5;
    core.add(bell);
    speckle(bell, 14, 0.8);
    const arms = rng.int(6, 9);
    for (let i = 0; i < arms; i++) {
      const a = new THREE.Group();
      a.rotation.y = (i / arms) * Math.PI * 2;
      const t = limb({ thigh: 0.9, shin: 1.1, r0: 0.14, r1: 0.09, r2: 0.02, mat: limbMat,
        rootAngle: Math.PI * 0.62, kneeAngle: 0.4 });
      t.position.set(0.55, 0.45, 0);
      a.add(t);
      core.add(a);
      const phase = i;
      anim.push({ obj: a, fn: (tm) => { a.children[0].rotation.x = 0.18 * Math.sin(tm * 1.3 + phase); } });
    }
    headHost = bell; headY = 0.7; headFwd = 0;
  } else if (aquatic) {
    // fusiform swimmer
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 40, 26), bodyMat);
    body.scale.set(0.7, 0.62, 1.9);
    body.position.y = 0.6;
    core.add(body);
    speckle(body, 12, 0.7);
    // tail fin
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 4, 1), bodyMat);
    tail.scale.set(1, 0.12, 1); tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.6, -1.7); core.add(tail);
    // pectoral + dorsal fins
    const finMat = bodyMat;
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4, 1), finMat);
      f.scale.set(1, 0.08, 1); f.rotation.z = Math.PI / 2; f.rotation.y = sx * 0.5;
      f.position.set(sx * 0.55, 0.55, 0.1); core.add(f);
    }
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 4, 1), finMat);
    dorsal.scale.set(0.5, 0.1, 1); dorsal.position.set(0, 1.25, 0.1); core.add(dorsal);
    // electroreception lateral line: a dim sensory stripe along each flank
    if (has('ELECTRO') || has('VIBRATION')) {
      const llMat = new THREE.MeshStandardMaterial({ color: pal.accent, emissive: pal.accent, emissiveIntensity: 0.8, roughness: 0.5 });
      for (const sx of [-1, 1]) {
        const ll = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6), llMat);
        ll.rotation.x = Math.PI / 2; ll.position.set(sx * 0.46, 0.72, 0); core.add(ll);
      }
    }
    anim.push({ obj: body, fn: (t) => { core.rotation.y = 0; body.rotation.z = 0.05 * Math.sin(t * 1.6); tail.rotation.z = 0.25 * Math.sin(t * 1.6 + 0.4); } });
    headHost = core; headY = 0.78; headFwd = 0.95;
  } else {
    // bilateral terrestrial -- organic metaball torso (shoulders, chest, belly
    // and hips flow into one mass instead of a hard capsule)
    const th = gracile ? 1.7 : (stocky ? 0.95 : 1.25);
    const tw = stocky ? 0.85 : (gracile ? 0.42 : 0.6);
    const hipY = stocky ? 0.95 : (gracile ? 1.7 : 1.35);
    const center = new THREE.Vector3(0, hipY, 0);
    // a slimmer field for slender builds so the torso elongates instead of
    // ballooning; metaball overlap already inflates the surface, so radii are
    // kept tight.
    const wide = gracile ? 2.0 : (stocky ? 2.8 : 2.4);
    const mscale = new THREE.Vector3(tw * wide, th * 1.05, tw * wide);
    const torsoBalls = [
      { p: new THREE.Vector3(0, -th * 0.44, 0), r: tw * 0.78 },         // hips
      { p: new THREE.Vector3(0, -th * 0.2, tw * 0.16), r: tw * 0.72 },  // belly
      { p: new THREE.Vector3(0, th * 0.02, tw * 0.06), r: tw * 0.78 },  // chest
      { p: new THREE.Vector3(0, th * 0.24, 0), r: tw * 0.66 },          // sternum
      { p: new THREE.Vector3(0, th * 0.42, 0), r: tw * 0.52 },          // upper chest
      { p: new THREE.Vector3(-tw * 0.78, th * 0.44, 0), r: tw * 0.4 },  // shoulder L
      { p: new THREE.Vector3(tw * 0.78, th * 0.44, 0), r: tw * 0.4 },   // shoulder R
      { p: new THREE.Vector3(0, th * 0.56, 0), r: tw * 0.34 },          // neck base
    ];
    const torsoMesh = metaballMass(torsoBalls, center, mscale, bodyMat, 64);
    core.add(torsoMesh);
    const torso = new THREE.Group(); torso.position.copy(center); core.add(torso); // speckle anchor
    speckle(torso, 10, tw + 0.1);

    // armor plates down the back
    if (has('ARMORED') || has('EXOSKELETON')) {
      const pm = new THREE.MeshStandardMaterial({ color: pal.skin.clone().multiplyScalar(0.8), metalness: 0.7, roughness: 0.3, flatShading: true });
      const plates = stocky ? 5 : 4;
      for (let i = 0; i < plates; i++) {
        const pl = new THREE.Mesh(new THREE.SphereGeometry(tw * 0.9, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), pm);
        pl.scale.set(1, 0.5, 0.7);
        pl.position.set(0, hipY - th * 0.45 + (i / (plates - 1)) * th * 0.9, -tw * 0.55);
        core.add(pl);
      }
    }
    // exoskeleton segment rings
    if (has('EXOSKELETON')) {
      const rm = new THREE.MeshStandardMaterial({ color: pal.skin, metalness: 0.65, roughness: 0.3, flatShading: true });
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(tw * 1.02, 0.07, 6, 16), rm);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = hipY - th * 0.4 + (i / 3) * th * 0.8;
        core.add(ring);
      }
    }

    // legs
    const pairs = stocky ? 3 : 2;
    const legLen = gracile ? 1.1 : (stocky ? 0.55 : 0.8);
    const legR = stocky ? 0.22 : (gracile ? 0.11 : 0.16);
    for (let p = 0; p < pairs; p++) {
      for (const sx of [-1, 1]) {
        const L = limb({ thigh: legLen, shin: legLen * 0.95, r0: legR, r1: legR * 0.7, r2: legR * 0.45,
          mat: limbMat, rootAngle: sx * 0.5, kneeAngle: -sx * 0.7 });
        const px = sx * tw * 0.8;
        const pz = (p - (pairs - 1) / 2) * tw * 0.7;
        L.position.set(px, hipY - th * 0.42, pz);
        L.rotation.x = 0.1;
        core.add(L);
        const ph = p * 2 + (sx > 0 ? 1 : 0);
        anim.push({ obj: L, fn: (t) => { L.children[1].rotation.x = 0.12 * Math.sin(t * 1.1 + ph); } });
        // digger claws on front pair
        if (has('DIGGER') && p === pairs - 1) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(legR * 1.4, legR * 3, 4), limbMat);
          claw.position.y = legLen * 0.95; claw.rotation.x = Math.PI * 0.6;
          L.children[1].add(claw);
        }
      }
    }

    // manipulator arms
    if (has('PREHENSILE') || has('TOOLS')) {
      for (const sx of [-1, 1]) {
        // shoulders out at ~45deg, elbows bent forward so the arms hang and
        // reach rather than locking into a stiff horizontal T-pose
        const A = limb({ thigh: th * 0.4, shin: th * 0.4, r0: legR * 0.8, r1: legR * 0.55, r2: legR * 0.35,
          mat: limbMat, rootAngle: sx * 0.85, kneeAngle: -sx * 1.2 });
        A.position.set(sx * tw * 0.85, hipY + th * 0.34, headFwd * 0.2 + 0.05);
        A.rotation.x = 0.5;
        core.add(A);
        const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(legR * 1.1, 0), limbMat);
        hand.position.y = th * 0.4; A.children[1].add(hand);
      }
    }

    // gliding / aerial membranes -- folded wing panels that drape down the
    // back and flanks (a wing at rest), so they read as surfaces and never as
    // horizontal spars sticking out to the sides.
    if (has('GLIDER') || has('AERIAL')) {
      const wm = new THREE.MeshPhysicalMaterial({ color: pal.skin, transparent: true, opacity: 0.72,
        side: THREE.DoubleSide, roughness: 0.5, metalness: 0.0, transmission: 0.3, thickness: 0.4,
        sheen: 0.5, emissive: pal.emissive, emissiveIntensity: pal.eInt * 0.5 });
      for (const sx of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(sx * tw * 0.72, hipY + th * 0.36, -0.04);
        const S = new THREE.Vector3(0, 0, 0);                              // shoulder
        const O = new THREE.Vector3(sx * tw * 0.85, -th * 0.5, -th * 0.4); // outer fold
        const T = new THREE.Vector3(sx * tw * 0.2, -th * 1.0, -th * 0.22); // tail end
        const I = new THREE.Vector3(0, -th * 0.5, -th * 0.05);             // inner spine
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(
          [S.x, S.y, S.z, O.x, O.y, O.z, T.x, T.y, T.z,
           S.x, S.y, S.z, T.x, T.y, T.z, I.x, I.y, I.z], 3));
        g.computeVertexNormals();
        wing.add(new THREE.Mesh(g, wm));
        wing.add(bone(S, O, 0.03, 0.012, limbMat));   // wing finger along the fold
        wing.add(bone(O, T, 0.018, 0.01, limbMat));   // trailing edge
        core.add(wing);
        anim.push({ obj: wing, fn: (t) => { wing.rotation.y = sx * 0.12 * Math.sin(t * 1.6); } });
      }
    }

    // tail for balance / display
    const tail = limb({ thigh: th * 0.5, shin: th * 0.5, r0: legR * 0.9, r1: legR * 0.5, r2: 0.03,
      mat: limbMat, rootAngle: Math.PI * 0.85, kneeAngle: 0.3 });
    tail.position.set(0, hipY - th * 0.3, -tw * 0.6);
    core.add(tail);
    anim.push({ obj: tail, fn: (t) => { tail.rotation.y = 0.12 * Math.sin(t * 0.8); } });

    headHost = core; headY = hipY + th * 0.62; headFwd = 0;
  }

  // ---- HEAD & SENSES ----
  const head = new THREE.Group();
  const headR = gracile ? 0.34 : (stocky ? 0.5 : 0.42);
  if (!radial) {
    // neck
    const neckLen = gracile ? 0.6 : 0.25;
    const neck = segment(neckLen, headR * 0.5, headR * 0.45, bodyMat);
    neck.position.set(0, headY - neckLen, headFwd);
    headHost.add(neck);
    head.position.set(0, headY + (aquatic ? 0 : 0.05), headFwd + (aquatic ? 0.05 : 0));
  } else {
    head.position.set(0, headY, 0);
  }
  const predator = has('PREDATION') || has('AMBUSH');
  const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 32, 24), bodyMat);
  skull.scale.set(1.05, 0.92, 1.05);
  if (aquatic) skull.scale.set(0.9, 0.8, 1.3);
  head.add(skull);
  if (!radial) {
    // muzzle, jaw and brow give the head a face. Predators get a longer,
    // toothed jaw -- the skull is downstream of the hunting niche too.
    const mz = predator ? 1.05 : 0.6;
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.6, 20, 16), bodyMat);
    muzzle.scale.set(0.82, 0.66, 1.5 * mz);
    muzzle.position.set(0, -headR * 0.12, headR * (0.7 + 0.18 * mz));
    head.add(muzzle);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.5, 18, 14), bodyMat);
    jaw.scale.set(0.74, 0.4, 1.35 * mz);
    jaw.position.set(0, -headR * 0.34, headR * (0.6 + 0.18 * mz));
    head.add(jaw);
    anim.push({ obj: jaw, fn: (t) => { jaw.rotation.x = 0.05 + 0.05 * Math.max(0, Math.sin(t * 0.7)); } });
    const brow = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.02, headR * 0.16, headR * 0.42), bodyMat);
    brow.position.set(0, headR * 0.32, headR * 0.5);
    head.add(brow);
    if (predator) {
      const tm = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.5 });
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.05, headR * 0.2, 4), tm);
        tooth.position.set(sx * headR * 0.17, -headR * 0.24, headR * (0.72 + i * 0.16 * mz));
        tooth.rotation.x = Math.PI; head.add(tooth);
      }
    }
  }
  headHost.add(head);

  // echolocation melon / dish ears
  if (has('ECHO')) {
    const melon = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.7, 16, 12), bodyMat);
    melon.position.set(0, headR * 0.4, headR * 0.7); head.add(melon);
    for (const sx of [-1, 1]) {
      const dish = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.8, headR * 0.4, 16, 1, true), bodyMat);
      dish.material = bodyMat; dish.position.set(sx * headR * 0.8, headR * 0.5, -headR * 0.2);
      dish.rotation.z = sx * 0.5; dish.rotation.x = -0.3; head.add(dish);
    }
  }

  // antennae for chemo / electro sensing
  if (has('CHEMO_SENSE') || has('ELECTRO') || has('MAGNETO')) {
    for (const sx of [-1, 1]) {
      const ant = segment(headR * 1.6, 0.03, 0.012, limbMat);
      ant.position.set(sx * headR * 0.4, headR * 0.6, headR * 0.2);
      ant.rotation.z = sx * 0.4; ant.rotation.x = -0.5; head.add(ant);
      const tip = glow(pal.accent, 0.05); tip.position.set(sx * headR * 0.4 + sx * headR * 0.6, headR * 0.6 + headR * 1.4, 0);
      head.add(tip);
    }
  }

  // EYES (sensory ecology made visible)
  const eyeColor = pal.accent.clone().lerp(new THREE.Color(0xffffff), 0.3);
  function eye(x, y, z, r) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: eyeColor, emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.1 }));
    e.position.set(x, y, z); head.add(e);
    return e;
  }
  if (has('EYES_REDUCED')) {
    // vestigial pits only
    for (const sx of [-1, 1]) {
      const pit = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 1 }));
      pit.position.set(sx * headR * 0.5, headR * 0.1, headR * 0.85); head.add(pit);
    }
  } else if (has('THERMAL_SENSE')) {
    // pit-viper thermal pits + small eyes
    for (const sx of [-1, 1]) {
      eye(sx * headR * 0.5, headR * 0.15, headR * 0.82, headR * 0.13);
      const p = glow(0xff5530, headR * 0.1); p.position.set(sx * headR * 0.55, -headR * 0.1, headR * 0.85); head.add(p);
    }
  } else {
    const big = has('EYES_ACUTE') || has('UV_VISION') || has('FAST_VISION');
    const r = big ? headR * 0.32 : headR * 0.2;
    for (const sx of [-1, 1]) eye(sx * headR * 0.52, headR * 0.18, headR * 0.82, r);
    // extra median / compound eyes
    if (has('FAST_VISION') || has('UV_VISION')) eye(0, headR * 0.55, headR * 0.78, r * 0.7);
    if (has('UV_VISION')) eye(0, headR * 0.55, headR * 0.78, r * 0.72).material.emissive = new THREE.Color(0xb486ff);
  }

  // ---- EUSOCIAL: a few drones drifting nearby (the colony) ----
  if (has('EUSOCIAL') || has('DISTRIBUTED')) {
    for (let i = 0; i < 4; i++) {
      const d = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), bodyMat);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), bodyMat);
      h.position.y = 0.28; d.add(b); d.add(h);
      if (pal.lumen) { const gl = glow(pal.emissive, 0.04); gl.position.y = 0.28; d.add(gl); }
      const ang = rng.float() * Math.PI * 2, rad = 2.4 + rng.float() * 1.2, yy = 0.5 + rng.float() * 2;
      d.scale.setScalar(0.6);
      d.userData = { ang, rad, yy, sp: 0.2 + rng.float() * 0.2 };
      group.add(d);
      anim.push({ obj: d, fn: (t) => {
        const a = ang + t * d.userData.sp;
        d.position.set(Math.cos(a) * rad, yy + 0.2 * Math.sin(t + i), Math.sin(a) * rad);
        d.rotation.y = -a;
      }});
    }
  }

  // ---- normalize: center + scale to a consistent presentation size ----
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const targetH = 3.6;
  group.scale.setScalar(targetH / maxDim);
  // recompute center after scaling and sit it on the platform
  const box2 = new THREE.Box3().setFromObject(group);
  group.position.y -= box2.min.y;
  group.position.x -= center.x * (targetH / maxDim);
  group.position.z -= center.z * (targetH / maxDim);

  // breathing
  anim.push({ obj: core, fn: (t) => { const s = 1 + 0.015 * Math.sin(t * 1.4); core.scale.set(s, 1 / s * s * s, s); } });

  group.userData.animate = (t) => { for (const a of anim) a.fn(t); };
  group.userData.lumen = pal.lumen;
  group.userData.accent = pal.accent;
  return group;
}
