/* MNM — 3D particle scene.
   Thousands of glowing particles morph between shapes:
   brain (neuroscience) → cross (medicine) → π (mathematics) → MNM → cloud.
   Other scripts drive it through window.MNM3D.setProgress(p) where p goes 0..SHAPES-1. */
import * as THREE from "../vendor/three.module.min.js";

const canvas = document.getElementById("gl");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 820px)").matches;
const COUNT = mobile ? 4200 : 9000;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  document.documentElement.classList.add("no-webgl");
}

if (renderer) init();

async function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  try { await document.fonts.load('700 200px "Space Grotesk"'); } catch (e) {}

  /* ---------- palette ---------- */
  const C = {
    teal: new THREE.Color("#1AA7A8"), tealHi: new THREE.Color("#5fe3e0"),
    purple: new THREE.Color("#7B4BC4"), purpleHi: new THREE.Color("#b48cff"),
    green: new THREE.Color("#1E8C5E"), mint: new THREE.Color("#30C39C"),
    ice: new THREE.Color("#c8deff"),
  };

  /* ---------- helpers ---------- */
  const rand = (a = -1, b = 1) => a + Math.random() * (b - a);
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  // sample filled pixels of something drawn on a 2D canvas → 3D points with depth
  function fromCanvas(draw, scale, depth, colorFn) {
    const S = 420, cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.strokeStyle = "#fff";
    draw(g, S);
    const data = g.getImageData(0, 0, S, S).data, filled = [];
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (data[(y * S + x) * 4 + 3] > 128) filled.push(x, y);
    const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), n = filled.length / 2;
    const tmp = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const k = (Math.random() * n) | 0;
      const px = filled[k * 2] + rand(-1, 1), py = filled[k * 2 + 1] + rand(-1, 1);
      const x = (px / S - 0.5) * scale, y = -(py / S - 0.5) * scale, z = gauss() * depth;
      pos.set([x, y, z], i * 3);
      colorFn(tmp, x / scale + 0.5, y / scale + 0.5, Math.random());
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    return { pos, col };
  }

  // procedural brain: two folded hemispheres (gyri as particle ridges) + cerebellum + stem
  function brain() {
    const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), tmp = new THREE.Color();
    const fold = (x, y, z) =>
      Math.sin(x * 7.0 + Math.sin(z * 3.1) * 2.2) * Math.sin(z * 6.3 + Math.sin(y * 4.3) * 2.0) +
      0.6 * Math.sin(y * 8.7 + Math.sin(x * 5.2) * 1.7);
    let i = 0, guard = 0;
    while (i < COUNT && guard++ < COUNT * 40) {
      const part = Math.random();
      let x, y, z, kind = 0;
      if (part < 0.84) {
        // hemisphere surface (side = left/right)
        const side = Math.random() < 0.5 ? -1 : 1;
        const u = Math.random() * Math.PI * 2, v = Math.acos(rand(-1, 1));
        let nx = Math.abs(Math.sin(v) * Math.cos(u)), ny = Math.cos(v), nz = Math.sin(v) * Math.sin(u);
        x = side * (0.06 + nx * 0.78);
        y = ny * 0.92; z = nz * 1.32;
        if (y < -0.25) y = -0.25 + (y + 0.25) * 0.55;                 // flatter base
        if (z > 0.2 && y < 0) y -= 0.18 * Math.sin(((z - 0.2) / 1.1) * Math.PI) * (1 - Math.abs(nx - 0.8)); // temporal lobe
        z *= 1 - 0.08 * y;                                             // slightly taller at the back
        const f = fold(x, y, z);
        if (Math.abs(f) < 0.32 && Math.random() < 0.82) continue;      // keep ridges → visible gyri
        const k = 1 + 0.05 * f;
        x *= k; y *= k; z *= k;
      } else if (part < 0.95) {
        // cerebellum: striped, behind and below
        const u = Math.random() * Math.PI * 2, v = Math.acos(rand(-1, 1));
        x = Math.sin(v) * Math.cos(u) * 0.62; y = -0.52 + Math.cos(v) * 0.27; z = -0.98 + Math.sin(v) * Math.sin(u) * 0.36;
        if (Math.abs(Math.sin(y * 60)) < 0.45 && Math.random() < 0.7) continue;
        kind = 1;
      } else {
        const t = Math.random(); x = rand(-0.12, 0.12); y = -0.45 - t * 0.85; z = -0.42 - t * 0.2 + rand(-0.1, 0.1);
        kind = 2;
      }
      pos.set([x * 1.45, y * 1.45, z * 1.45], i * 3);
      const m = Math.random();
      tmp.copy(kind === 1 ? (m < 0.7 ? C.purpleHi : C.ice) : kind === 2 ? C.teal : m < 0.6 ? C.purple : m < 0.88 ? C.purpleHi : m < 0.96 ? C.teal : C.ice);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
      i++;
    }
    // lateral 3/4 view: front of the brain points to the right
    const e = new THREE.Euler(0.12, -1.25, 0), v = new THREE.Vector3();
    for (let j = 0; j < COUNT; j++) { v.fromArray(pos, j * 3).applyEuler(e); v.toArray(pos, j * 3); }
    return { pos, col };
  }

  function cross() {
    return fromCanvas((g, S) => {
      const a = S * 0.16, l = S * 0.38, c = S / 2;
      g.beginPath();
      g.roundRect(c - a, c - l, a * 2, l * 2, 18); g.roundRect(c - l, c - a, l * 2, a * 2, 18); g.fill();
    }, 3.6, 0.16, (t, x, y, r) => t.copy(r < 0.7 ? C.teal : r < 0.93 ? C.tealHi : C.ice));
  }

  function pi() {
    return fromCanvas((g, S) => {
      g.font = `700 ${S * 0.95}px "Space Grotesk", serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("π", S / 2, S * 0.47);
    }, 3.9, 0.3, (t, x, y, r) => t.copy(r < 0.65 ? C.mint : r < 0.9 ? C.green : C.ice));
  }

  function mnm() {
    return fromCanvas((g, S) => {
      g.font = `700 ${S * 0.36}px "Space Grotesk", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("MNM", S / 2, S / 2);
    }, 5.4, 0.22, (t, x, y, r) => {
      // left M = medicine teal, N = neuro purple, right M = math mint
      t.copy(x < 0.38 ? C.teal : x < 0.62 ? C.purpleHi : C.mint);
      if (r > 0.9) t.copy(C.ice);
    });
  }

  function cloud() {
    const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), tmp = new THREE.Color(), list = [C.teal, C.purple, C.mint, C.ice];
    for (let i = 0; i < COUNT; i++) {
      const r = 3 + Math.random() * 6, u = Math.random() * Math.PI * 2, v = Math.acos(rand(-1, 1));
      pos.set([Math.sin(v) * Math.cos(u) * r * 1.6, Math.cos(v) * r * 0.9, Math.sin(v) * Math.sin(u) * r - 2], i * 3);
      tmp.copy(list[(Math.random() * list.length) | 0]);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    return { pos, col };
  }

  const SHAPES = [brain(), cross(), pi(), mnm(), cloud()];

  /* ---------- geometry ---------- */
  const geo = new THREE.BufferGeometry();
  const aFrom = new THREE.BufferAttribute(SHAPES[0].pos.slice(), 3);
  const aTo = new THREE.BufferAttribute(SHAPES[1].pos.slice(), 3);
  const cFrom = new THREE.BufferAttribute(SHAPES[0].col.slice(), 3);
  const cTo = new THREE.BufferAttribute(SHAPES[1].col.slice(), 3);
  const seed = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const d = new THREE.Vector3(rand(), rand(), rand()).normalize();
    seed.set([d.x, d.y, d.z, Math.random()], i * 4);
  }
  geo.setAttribute("position", aFrom);
  geo.setAttribute("aTo", aTo);
  geo.setAttribute("cFrom", cFrom);
  geo.setAttribute("cTo", cTo);
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));

  const uniforms = {
    uTime: { value: 0 }, uMix: { value: 0 }, uSize: { value: mobile ? 2.6 : 2.4 },
    uPx: { value: renderer.getPixelRatio() }, uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uPulse: { value: 0 }, uAlpha: { value: 1 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uMix, uSize, uPx, uPulse;
      uniform vec3 uMouse;
      attribute vec3 aTo, cFrom, cTo;
      attribute vec4 aSeed;
      varying vec3 vColor;
      varying float vGlow;
      void main() {
        float r = aSeed.w;
        float t = clamp((uMix - r * 0.35) / 0.65, 0.0, 1.0);
        t = t * t * (3.0 - 2.0 * t);
        vec3 p = mix(position, aTo, t);
        p += aSeed.xyz * sin(3.14159 * t) * (0.9 + r);                    // burst while morphing
        p += aSeed.xyz * 0.035 * sin(uTime * (0.8 + r) + r * 40.0);       // breathing
        vec4 world = modelMatrix * vec4(p, 1.0);
        vec3 d = world.xyz - uMouse; float dist = length(d.xy);
        world.xyz += normalize(d + 1e-4) * smoothstep(1.4, 0.0, dist) * 0.55; // push away from cursor
        vec4 mv = viewMatrix * world;
        gl_Position = projectionMatrix * mv;
        // travelling "impulse" wave
        float wave = sin(p.y * 2.5 + p.x * 1.5 - uTime * 2.2 + r * 6.0);
        vGlow = smoothstep(0.92, 1.0, wave) * (0.6 + uPulse) + step(0.985, r) * 0.9;
        vColor = mix(cFrom, cTo, t);
        gl_PointSize = uSize * uPx * (1.0 + vGlow * 1.6) * (9.0 / -mv.z) * (0.7 + r * 0.6);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      varying vec3 vColor;
      varying float vGlow;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a;
        gl_FragColor = vec4(vColor * (1.0 + vGlow * 1.8), a * 0.85 * uAlpha);
      }`,
  });

  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  /* ---------- state driven from outside ---------- */
  const SCALE = mobile ? 0.8 : +(document.body.dataset.scale || 1);
  let seq = (document.body.dataset.seq || "0,1,2,3,4").split(",").map(Number);
  let target = 0, current = 0, pair = 0, offsetX = 0, offsetTarget = 0;
  const mouse = new THREE.Vector2(9, 9), tilt = new THREE.Vector2(), ZERO = new THREE.Vector2();
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();

  function setPair(i) {
    pair = i;
    const A = SHAPES[seq[i]], B = SHAPES[seq[i + 1]];
    aFrom.array.set(A.pos); cFrom.array.set(A.col);
    aTo.array.set(B.pos); cTo.array.set(B.col);
    aFrom.needsUpdate = aTo.needsUpdate = cFrom.needsUpdate = cTo.needsUpdate = true;
  }

  window.MNM3D = {
    get steps() { return seq.length - 1; },
    setProgress(p) { target = Math.max(0, Math.min(seq.length - 1, p)); },
    setOffset(x) { offsetTarget = x; },
    pulse() { uniforms.uPulse.value = 2.5; },
  };
  window.dispatchEvent(new Event("mnm3d:ready"));

  addEventListener("pointermove", (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  });
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let visible = true;
  document.addEventListener("visibilitychange", () => (visible = !document.hidden));

  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
    current += (target - current) * (reduce ? 1 : Math.min(1, dt * 4));
    let i = Math.min(Math.floor(current), seq.length - 2);
    if (i !== pair) setPair(i);
    uniforms.uMix.value = current - i;
    uniforms.uTime.value = time;
    uniforms.uPulse.value *= 0.94;

    offsetX += (offsetTarget - offsetX) * Math.min(1, dt * 3);
    tilt.lerp(mouse.x > 5 ? ZERO : mouse, Math.min(1, dt * 2));
    group.position.x = offsetX;
    group.scale.setScalar(SCALE);
    group.rotation.y = (reduce ? 0 : Math.sin(time * 0.25) * 0.35) + tilt.x * 0.35;
    group.rotation.x = -tilt.y * 0.2;
    // fade a little when it becomes the background cloud
    uniforms.uAlpha.value = seq[seq.length - 1] === 4 ? 1 - Math.max(0, current - (seq.length - 2)) * 0.55 : 1;

    ray.setFromCamera(mouse, camera);
    if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit);
    renderer.render(scene, camera);
  }
  setPair(0);
  tick();
  document.documentElement.classList.add("gl-ready");
}
