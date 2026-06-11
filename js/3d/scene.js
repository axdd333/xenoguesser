/* Xenoguesser :: 3D scene
 *
 * The hyperspace observation chamber. A starfield, a nebula gradient, the
 * specimen's actual star (or two/three suns) tinted by its real type, a distant
 * planet that casts the "planetary shadow", and a holographic scan platform.
 * Cinematic lighting + Unreal bloom. The specimen is swapped in via setSpecimen.
 */
import * as THREE from 'three';
import { OrbitControls } from './../../vendor/jsm/controls/OrbitControls.js';
import { EffectComposer } from './../../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './../../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './../../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './../../vendor/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from './../../vendor/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from './../../vendor/jsm/RoomEnvironment.js';
import { buildCreature } from './creature.js';

const STAR_COLOR = {
  gstar: 0xfff1d8, reddwarf: 0xff5230, orange: 0xffab52,
  bluegiant: 0xaeccff, browndwarf: 0x6b3f28,
};
const PLANET_COLOR = {
  rocky: 0x8a6f55, ocean: 0x2f6f9e, ice: 0xcfe6f2, desert: 0xc69a5b,
  tidal: 0x6a5d7a, highg: 0x6e6157, lowg: 0x9aa0a6, volcanic: 0x7a3326, moon: 0x8d8478,
};

export class XenoScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05080f, 0.012);

    // image-based lighting: a PMREM environment gives physical/translucent
    // materials real reflections and soft ambient -- the single biggest lever
    // for an organic, non-plastic look.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    this.camera.position.set(4.8, 2.8, 6.4);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 18;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.target.set(0, 1.6, 0);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.55;

    this._buildBackdrop();
    this._buildLights();
    this._buildPlatform();
    this._buildDust();

    // post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.36, 0.82);
    this.composer.addPass(this.bloom);

    // cinematic grade: vignette, fine film grain, and a whisper of chromatic
    // aberration at the edges -- pulls the render away from "clean CG".
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 },
        grain: { value: 0.05 }, vignette: { value: 1.15 }, aberration: { value: 0.0016 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float time, grain, vignette, aberration; varying vec2 vUv;',
        'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
        'void main(){',
        '  vec2 d = vUv - 0.5;',
        '  float r = texture2D(tDiffuse, vUv + d*aberration).r;',
        '  float g = texture2D(tDiffuse, vUv).g;',
        '  float b = texture2D(tDiffuse, vUv - d*aberration).b;',
        '  vec3 col = vec3(r,g,b);',
        '  float vig = smoothstep(1.25, vignette*0.35, length(d)*2.0);',
        '  col *= mix(0.62, 1.0, vig);',
        '  float n = hash(vUv*vec2(1920.0,1080.0) + time);',
        '  col += (n - 0.5) * grain;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    });
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());

    this.starGroup = new THREE.Group();
    this.scene.add(this.starGroup);
    this.creature = null;
    this.clock = new THREE.Clock();

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  _buildBackdrop() {
    // nebula gradient sky
    const geo = new THREE.SphereGeometry(900, 32, 32);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(0x0a1830) }, bot: { value: new THREE.Color(0x05060d) }, hue: { value: new THREE.Color(0x10243f) } },
      vertexShader: `varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
      fragmentShader: `varying vec3 vp; uniform vec3 top; uniform vec3 bot; uniform vec3 hue;
        float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        void main(){ vec3 d = normalize(vp); float t = d.y*0.5+0.5;
          vec3 c = mix(bot, top, pow(t,1.3));
          float n = h(floor(d.xz*40.0))*0.5 + h(floor(d.xy*30.0))*0.5;
          c += hue * smoothstep(0.6,1.0,n) * 0.25 * (1.0-t);
          gl_FragColor = vec4(c,1.0);} `,
    });
    this.scene.add(new THREE.Mesh(geo, mat));

    // starfield
    const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 200 + Math.random() * 600;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.5, 0.6 + Math.random() * 0.4);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    this.scene.add(stars);
    this.stars = stars;
  }

  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0x6a86a8, 0x10121c, 0.8);
    this.scene.add(this.hemi);
    // key light = the star
    this.key = new THREE.DirectionalLight(0xffffff, 2.4);
    this.key.position.set(6, 5, 4);
    this.scene.add(this.key);
    // rim light for the silhouette
    this.rim = new THREE.DirectionalLight(0x3fd0ff, 1.4);
    this.rim.position.set(-5, 2, -4);
    this.scene.add(this.rim);
    // soft fill so dim-star worlds still read
    this.fill = new THREE.PointLight(0x88aaff, 6, 40, 2);
    this.fill.position.set(-2, 4, 6);
    this.scene.add(this.fill);
  }

  _buildPlatform() {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0e2233, emissive: 0x1f6f8c, emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const tr = new THREE.Mesh(new THREE.TorusGeometry(2.0 + i * 0.55, 0.015 + (i === 0 ? 0.02 : 0), 8, 96), ringMat);
      tr.rotation.x = Math.PI / 2; g.add(tr);
    }
    // radial spokes
    const spokeMat = new THREE.LineBasicMaterial({ color: 0x2a7f9c, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const pts = [new THREE.Vector3(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4), new THREE.Vector3(Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1)];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), spokeMat));
    }
    // soft contact shadow grounds the specimen on the platform
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d');
    const grd = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = grd; cx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.9 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04;
    g.add(shadow);

    g.position.y = 0.02;
    this.scene.add(g);
    this.platform = g;
  }

  _buildDust() {
    const N = 160, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 9;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0x9fd6ff, size: 0.035, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.dust);
  }

  _clearStars() {
    while (this.starGroup.children.length) {
      const c = this.starGroup.children.pop();
      c.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this.starGroup.remove(c);
    }
    this.suns = [];
  }

  _addStar(color, pos, size, intensity) {
    const c = new THREE.Color(color);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3.2 }));
    sun.position.copy(pos);
    this.starGroup.add(sun);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 1.7, 24, 24),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18, depthWrite: false }));
    halo.position.copy(pos); this.starGroup.add(halo);
    const light = new THREE.PointLight(c, intensity, 0, 2);
    light.position.copy(pos); this.starGroup.add(light);
    this.suns.push({ sun, light, base: intensity });
  }

  // configure environment + creature from a specimen
  setSpecimen(spec) {
    const ch = spec.worldseed.choices;
    // creature
    if (this.creature) {
      this.creature.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
      this.scene.remove(this.creature);
    }
    this.creature = buildCreature(spec);
    this.scene.add(this.creature);

    // star(s)
    this._clearStars();
    const sc = STAR_COLOR[ch.starSystem.id] || 0xffffff;
    const count = ch.starCount.id === 'three' ? 3 : (ch.starCount.id === 'two' ? 2 : 1);
    const dim = ch.starSystem.id === 'browndwarf' || ch.starSystem.id === 'reddwarf';
    const baseInt = dim ? 12 : 26;
    const positions = [new THREE.Vector3(22, 16, -10), new THREE.Vector3(-26, 10, -16), new THREE.Vector3(8, 24, -30)];
    for (let i = 0; i < count; i++) this._addStar(sc, positions[i], dim ? 1.5 : 2.4, baseInt / count + 6);
    this.key.color.set(sc);
    this.key.intensity = dim ? 1.6 : 2.8;
    this.key.position.copy(positions[0]).normalize().multiplyScalar(8);
    this.hemi.intensity = dim ? 0.62 : 0.85;
    this.flicker = ch.starCount.id !== 'one' || ch.starSystem.id === 'reddwarf';

    // planet shadow (a distant world)
    if (this.planet) this.scene.remove(this.planet);
    const pc = PLANET_COLOR[ch.planetType.id] || 0x6a6a72;
    const planet = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 48),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(pc).multiplyScalar(0.45), roughness: 1, metalness: 0,
        emissive: new THREE.Color(pc).multiplyScalar(0.03), envMapIntensity: 0.2 }));
    // a distant world up in the sky, clear of the specimen
    planet.position.set(-52, 17, -64);
    this.scene.add(planet);
    this.planet = planet;
    // ring system
    if (this.pring) { this.scene.remove(this.pring); this.pring = null; }
    if (ch.moons.id === 'ring') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(18, 26, 64),
        new THREE.MeshBasicMaterial({ color: 0xb9c6d6, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
      ring.rotation.x = Math.PI * 0.42; ring.position.copy(planet.position);
      this.scene.add(ring); this.pring = ring;
    }

    // tint platform + fog to the world's mood
    const lumen = this.creature.userData.lumen;
    this.bloom.strength = lumen ? 0.5 : 0.42;
    this.scene.fog.color.set(dim ? 0x04060c : 0x070b16);
    this.controls.target.set(0, 1.6, 0);
    this.frame();
  }

  frame() {
    // cinematic fly-in: start far and high, ease down to the 3/4 framing
    this._intro = 0;
    this._lastT = this.clock.getElapsedTime();
    this.controls.enabled = false;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const t = this.clock.getElapsedTime();
      const dt = Math.min(0.05, t - (this._lastT != null ? this._lastT : t));
      this._lastT = t;
      if (!this.controls.enabled) {
        this._intro += dt;
        const k = Math.min(1, this._intro / 1.7);
        const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
        this.camera.position.set(
          THREE.MathUtils.lerp(11, 4.8, e),
          THREE.MathUtils.lerp(8, 2.8, e),
          THREE.MathUtils.lerp(15.5, 6.4, e));
        this.camera.lookAt(this.controls.target);
        if (k >= 1) this.controls.enabled = true;
      } else {
        this.controls.update();
      }
      if (this.creature && this.creature.userData.animate) this.creature.userData.animate(t);
      if (this.platform) this.platform.rotation.y = t * 0.08;
      if (this.stars) this.stars.rotation.y = t * 0.005;
      if (this.grade) this.grade.uniforms.time.value = t;
      if (this.dust) { this.dust.rotation.y = t * 0.02; this.dust.position.y = Math.sin(t * 0.3) * 0.2; }
      if (this.flicker && this.suns) {
        const f = 0.7 + 0.3 * Math.abs(Math.sin(t * 7.0) * Math.sin(t * 2.3));
        for (const s of this.suns) s.light.intensity = s.base * f;
      }
      this.composer.render();
    };
    loop();
  }

  setAutoRotate(on) { this.controls.autoRotate = on; }
  dispose() { cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._onResize); this.renderer.dispose(); }
}
