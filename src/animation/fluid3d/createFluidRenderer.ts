/**
 * Imperative Three.js fluid column for a single vessel well.
 * Dynamic-imported only from client components — never touch window at module top.
 *
 * Realism priorities: nucleation bubbles (rise / grow / wobble / pop),
 * heat convection shimmer, freeze from the bottom, stir vortex, overflow foam.
 */

import type { FluidState } from "./types";

const MAX_PARTICLES = 72;
const IDLE_FPS = 12;
const ACTIVE_FPS = 60;

export interface FluidRendererHandle {
  setState: (state: FluidState) => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
}

function parseColor(
  THREE: typeof import("three"),
  hex: string,
): InstanceType<typeof import("three").Color> {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color("#8fc0b5");
  }
}

function impulseEnergy(state: FluidState, now: number): number {
  let e = 0;
  for (const imp of state.impulses) {
    const age = now - imp.at;
    if (age < 0 || age > imp.durationMs) continue;
    const t = 1 - age / imp.durationMs;
    e = Math.max(e, imp.strength * t * t);
  }
  return e;
}

function impulseByKind(
  state: FluidState,
  now: number,
  kind: FluidState["impulses"][number]["kind"],
): number {
  let e = 0;
  for (const imp of state.impulses) {
    if (imp.kind !== kind) continue;
    const age = now - imp.at;
    if (age < 0 || age > imp.durationMs) continue;
    const t = 1 - age / imp.durationMs;
    e = Math.max(e, imp.strength * t);
  }
  return e;
}

export async function createFluidRenderer(
  canvas: HTMLCanvasElement,
): Promise<FluidRendererHandle | null> {
  const THREE = await import("three");

  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
    });
  } catch {
    return null;
  }

  if (!renderer.getContext()) {
    renderer.dispose();
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.75),
  );

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.55, 0.55, 0.75, -0.75, 0.1, 10);
  camera.position.set(0.15, 0.08, 2.2);
  camera.lookAt(0, 0, 0);

  const uniforms = {
    uTime: { value: 0 },
    uFill: { value: 0.4 },
    uColor: { value: new THREE.Color("#8fc0b5") },
    uLayer0: { value: new THREE.Color("#8fc0b5") },
    uLayer1: { value: new THREE.Color("#8fc0b5") },
    uLayer2: { value: new THREE.Color("#8fc0b5") },
    uLayer3: { value: new THREE.Color("#8fc0b5") },
    uLayerCount: { value: 1 },
    uTurbidity: { value: 0 },
    uFoam: { value: 0 },
    uViscosity: { value: 0.2 },
    uWaveAmp: { value: 0.02 },
    uSolidify: { value: 0 },
    uMelt: { value: 0 },
    uTemp: { value: 0 },
    uAgitation: { value: 0 },
    uOverflow: { value: 0 },
    uCool: { value: 0 },
  };

  const liquidMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vY;
      uniform float uTime;
      uniform float uFill;
      uniform float uWaveAmp;
      uniform float uViscosity;
      uniform float uAgitation;
      uniform float uTemp;
      uniform float uSolidify;
      void main() {
        vUv = uv;
        float damp = mix(1.0, 0.22, uViscosity);
        float freeze = clamp(uSolidify, 0.0, 1.0);
        damp *= (1.0 - freeze * 0.92);

        // Stir vortex bias — stronger near surface
        float swirl = uAgitation * 0.035 * damp;
        float wave =
          sin(position.x * 9.0 + uTime * mix(2.8, 1.05, uViscosity)) * uWaveAmp * damp
          + sin(position.x * 15.0 + uTime * 3.4) * uWaveAmp * 0.35 * damp
          + sin(position.x * 6.0 - uTime * (2.2 + uAgitation * 4.0)) * swirl
          + sin(position.x * 22.0 + uTime * (4.5 + uTemp * 3.0)) * uWaveAmp * uTemp * 0.55 * damp;

        float ny = position.y + 0.5;
        vec3 p = position;
        p.y = -0.5 + ny * max(uFill, 0.001);
        // Mild convection: warmer fluid lifts mid-column slightly
        p.y += uTemp * 0.012 * sin(ny * 6.28 + uTime * 1.6) * (1.0 - freeze) * damp;
        if (ny > 0.82) {
          p.y += wave;
          p.x += swirl * sin(uTime * 3.2 + position.y * 8.0) * (ny - 0.82) * 4.0;
        }
        vY = ny;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying float vY;
      uniform vec3 uColor;
      uniform vec3 uLayer0;
      uniform vec3 uLayer1;
      uniform vec3 uLayer2;
      uniform vec3 uLayer3;
      uniform float uLayerCount;
      uniform float uTurbidity;
      uniform float uFoam;
      uniform float uSolidify;
      uniform float uMelt;
      uniform float uTime;
      uniform float uTemp;
      uniform float uOverflow;
      uniform float uCool;
      uniform float uAgitation;

      vec3 layerColor(float y) {
        if (uLayerCount < 1.5) return uColor;
        float bands = max(uLayerCount, 1.0);
        float idx = floor(y * bands);
        if (idx < 0.5) return uLayer0;
        if (idx < 1.5) return uLayer1;
        if (idx < 2.5) return uLayer2;
        return uLayer3;
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float iceNoise(vec2 p) {
        float n = hash(floor(p));
        float f = hash(floor(p) + vec2(1.7, 3.1));
        vec2 w = fract(p);
        w = w * w * (3.0 - 2.0 * w);
        return mix(n, f, w.x) * 0.65 + hash(p * 1.7) * 0.35;
      }

      void main() {
        float y = clamp(vY, 0.0, 1.0);
        vec3 base = layerColor(y);
        float shade = 0.76 + 0.24 * y;
        float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
        base *= shade;

        // Turbidity haze
        float n = hash(vUv * 40.0 + uTime * 0.15);
        base = mix(base, base * 0.55 + vec3(0.35, 0.38, 0.34) * n, uTurbidity * 0.75);

        // Heat: warm bottom + mirage tint near surface
        float heatGrad = uTemp * (0.55 * (1.0 - y) + 0.35 * smoothstep(0.7, 1.0, y));
        base = mix(base, base + vec3(0.12, 0.04, -0.02), heatGrad * 0.55);
        // Cool: blue-white chill
        base = mix(base, base * vec3(0.88, 0.94, 1.05) + vec3(0.04, 0.06, 0.1), uCool * 0.45);

        // Solidify — freeze front rises from bottom with crystal facets
        float freeze = clamp(uSolidify - uMelt * 0.85, 0.0, 1.0);
        float freezeFront = freeze * 0.92;
        float iceMask = smoothstep(freezeFront + 0.08, freezeFront - 0.22, y);
        float crystal = iceNoise(vUv * vec2(28.0, 40.0) + vec2(0.0, uTime * 0.02));
        vec3 iceCol = mix(vec3(0.78, 0.9, 0.96), vec3(0.92, 0.97, 1.0), crystal);
        base = mix(base, iceCol, iceMask * freeze * 0.92);
        // Surface skim ice when mostly solid
        float skim = smoothstep(0.72, 0.98, y) * freeze * 0.55;
        base = mix(base, iceCol, skim);

        // Foam / overflow crest — churning white head
        float foamBand = smoothstep(0.72, 0.99, y) * max(uFoam, uOverflow * 0.85);
        float foamChurn = hash(vUv * 55.0 + uTime * (1.8 + uOverflow * 2.5));
        base = mix(base, vec3(0.94, 0.97, 0.95), foamBand * (0.7 + foamChurn * 0.3));
        // Overflow: brighter lip spill
        base = mix(base, vec3(0.96, 0.98, 0.97), smoothstep(0.9, 1.0, y) * uOverflow * 0.65);

        float alpha = mix(0.8, 0.97, freeze) * edge;
        alpha *= mix(1.0, 0.88, uMelt * 0.4);
        // Overflow reads denser at the lip
        alpha = mix(alpha, min(0.98, alpha + 0.12), uOverflow * smoothstep(0.85, 1.0, y));

        float gloss = mix(0.28, 0.05, freeze) + uMelt * 0.18 + uTemp * 0.06;
        gloss *= (1.0 - foamBand * 0.7);
        float spec = pow(1.0 - abs(vUv.x - 0.35), 8.0) * gloss;
        base += vec3(spec);

        // Stir streaks — faint tangential sheen
        float streak = sin((vUv.x + y) * 40.0 + uTime * (3.0 + uAgitation * 6.0)) * 0.5 + 0.5;
        base += vec3(0.04) * streak * uAgitation * (1.0 - freeze) * smoothstep(0.2, 0.9, y);

        if (y < 0.001) discard;
        gl_FragColor = vec4(base, alpha);
      }
    `,
  });

  const liquidGeo = new THREE.PlaneGeometry(0.92, 1.0, 28, 20);
  const liquid = new THREE.Mesh(liquidGeo, liquidMat);
  liquid.position.z = 0;
  scene.add(liquid);

  const side = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 1.0, 4, 14),
    liquidMat,
  );
  side.rotation.y = Math.PI * 0.42;
  side.position.set(0.38, 0, -0.12);
  scene.add(side);

  // --- Bubble particles: soft ring + highlight (reads as gas, not sparks) ---
  const particleCount = MAX_PARTICLES;
  const positions = new Float32Array(particleCount * 3);
  const aSize = new Float32Array(particleCount);
  const aLife = new Float32Array(particleCount);
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  particleGeo.setAttribute("aLife", new THREE.BufferAttribute(aLife, 1));

  const bubbleUniforms = {
    uOpacity: { value: 0.85 },
  };
  const particleMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: bubbleUniforms,
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aLife;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.5, aSize * (220.0 / max(0.4, -mv.z)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      uniform float uOpacity;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        // Thin film rim + specular highlight — soap-bubble / gas look
        float rim = smoothstep(0.48, 0.32, d) * smoothstep(0.12, 0.38, d);
        float core = smoothstep(0.28, 0.0, d) * 0.18;
        float highlight = smoothstep(0.22, 0.0, length(uv - vec2(-0.14, -0.16)));
        float alpha = (rim * 0.9 + core + highlight * 0.55) * uOpacity;
        // Pop fade near end of life
        alpha *= mix(1.0, 0.15, smoothstep(0.82, 1.0, vLife));
        // Slight cool-white body
        vec3 col = mix(vec3(0.92, 0.97, 1.0), vec3(1.0), highlight);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.visible = false;
  scene.add(particles);

  // Per-bubble sim state
  const phase = new Float32Array(particleCount);
  const seedX = new Float32Array(particleCount);
  const seedW = new Float32Array(particleCount);
  const seedSize = new Float32Array(particleCount);
  const seedSpeed = new Float32Array(particleCount);
  /** 0 = boil nucleation, 1 = reaction gas, 2 = foam / spill */
  const kind = new Uint8Array(particleCount);

  const reseed = (i: number, mode: number) => {
    // Nucleation clustered near bottom-center with lateral jitter
    const cluster = (Math.random() - 0.5) * 0.55;
    seedX[i] = cluster + (Math.random() - 0.5) * 0.12;
    seedW[i] = 0.6 + Math.random() * 1.4;
    seedSize[i] =
      mode === 2
        ? 0.045 + Math.random() * 0.05
        : mode === 0
          ? 0.028 + Math.random() * 0.04
          : 0.022 + Math.random() * 0.035;
    seedSpeed[i] =
      mode === 0
        ? 0.75 + Math.random() * 0.55
        : mode === 1
          ? 0.45 + Math.random() * 0.4
          : 0.25 + Math.random() * 0.35;
    kind[i] = mode;
    phase[i] = Math.random() * 0.15; // start near bottom
  };

  for (let i = 0; i < particleCount; i++) {
    reseed(i, i % 3 === 0 ? 1 : 0);
    phase[i] = Math.random();
    positions[i * 3] = seedX[i]!;
    positions[i * 3 + 1] = -0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
    aSize[i] = seedSize[i]!;
    aLife[i] = phase[i]!;
  }

  let state: FluidState = {
    fill: 0,
    layers: [{ color: "#8fc0b5", fraction: 1 }],
    viscosity: 0.2,
    turbidity: 0,
    foam: 0,
    temperature: 0,
    impulses: [],
    fillColor: "#8fc0b5",
    boil: false,
    bubble: false,
    melt: 0,
    solidify: 0,
    agitation: 0,
    overflow: 0,
  };
  let active = true;
  let raf = 0;
  let disposed = false;
  let t0 = 0;
  let lastFrame = 0;

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
  };
  resize();

  const applyState = (s: FluidState) => {
    state = s;
    const fill01 = Math.max(0, Math.min(1, s.fill / 100));
    uniforms.uFill.value = fill01;
    uniforms.uColor.value = parseColor(THREE, s.fillColor);
    uniforms.uTurbidity.value = s.turbidity;
    const foamBoost =
      s.fill > 100 ? Math.min(1, 0.45 + (s.fill - 100) / 24) : 0;
    uniforms.uFoam.value = Math.max(s.foam, foamBoost, s.overflow * 0.7);
    uniforms.uViscosity.value = s.viscosity;
    uniforms.uSolidify.value = s.solidify;
    uniforms.uMelt.value = s.melt;
    uniforms.uTemp.value = s.temperature;
    uniforms.uAgitation.value = s.agitation;
    uniforms.uOverflow.value = Math.max(
      s.overflow,
      s.fill > 98 ? Math.min(1, (s.fill - 98) / 14) : 0,
    );
    // Cool reads from solidify when chilled, independent of full freeze
    uniforms.uCool.value = Math.max(
      0,
      Math.min(1, s.solidify * 0.55 + (1 - s.temperature) * 0.15 * (s.solidify > 0.1 ? 1 : 0)),
    );

    const layers = s.layers.slice(0, 4);
    uniforms.uLayerCount.value = Math.max(1, layers.length);
    uniforms.uLayer0.value = parseColor(THREE, layers[0]?.color ?? s.fillColor);
    uniforms.uLayer1.value = parseColor(
      THREE,
      layers[1]?.color ?? layers[0]?.color ?? s.fillColor,
    );
    uniforms.uLayer2.value = parseColor(
      THREE,
      layers[2]?.color ?? layers[0]?.color ?? s.fillColor,
    );
    uniforms.uLayer3.value = parseColor(
      THREE,
      layers[3]?.color ?? layers[0]?.color ?? s.fillColor,
    );

    const showParticles =
      s.boil ||
      s.bubble ||
      s.foam > 0.15 ||
      s.overflow > 0.2 ||
      s.agitation > 0.35;
    particles.visible = showParticles && fill01 > 0.04;
    bubbleUniforms.uOpacity.value =
      0.55 +
      (s.boil ? 0.35 : 0) +
      (s.bubble ? 0.2 : 0) +
      s.foam * 0.25 +
      s.overflow * 0.15;
  };

  const tick = (nowMs: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!active) return;

    const wall = performance.now();
    const now = Date.now();
    const impulse = impulseEnergy(state, now);
    const shakeImp = impulseByKind(state, now, "shake");
    const stirImp = Math.max(
      impulseByKind(state, now, "stir"),
      state.agitation,
    );
    const energetic =
      impulse > 0.05 ||
      state.boil ||
      state.bubble ||
      state.foam > 0.15 ||
      state.temperature > 0.35 ||
      state.turbidity > 0.3 ||
      state.agitation > 0.2 ||
      state.overflow > 0.15 ||
      state.solidify > 0.25;

    const targetFps = energetic ? ACTIVE_FPS : IDLE_FPS;
    const minDelta = 1000 / targetFps;
    if (wall - lastFrame < minDelta) return;
    lastFrame = wall;

    if (!t0) t0 = nowMs;
    const t = (nowMs - t0) / 1000;
    uniforms.uTime.value = t;

    const fill01 = uniforms.uFill.value as number;
    const freeze = Math.max(0, state.solidify - state.melt * 0.85);
    const waveBase =
      0.01 +
      impulse * 0.13 +
      state.temperature * 0.038 +
      (state.boil ? 0.06 : 0) +
      state.melt * 0.02 +
      state.agitation * 0.045 +
      shakeImp * 0.08 +
      state.overflow * 0.03;
    uniforms.uWaveAmp.value =
      waveBase * (1 - state.viscosity * 0.55) * (1 - freeze * 0.95);
    uniforms.uViscosity.value = Math.min(
      1,
      state.viscosity + freeze * 0.35 - state.melt * 0.2,
    );

    if (particles.visible) {
      const boilOn = state.boil || state.temperature > 0.55;
      const gasOn = state.bubble || state.agitation > 0.45;
      const foamOn = state.foam > 0.2 || state.overflow > 0.25;
      const count = Math.min(
        particleCount,
        freeze > 0.65
          ? 6
          : boilOn
            ? 52
            : gasOn
              ? 36
              : foamOn
                ? 22
                : 12,
      );

      const dt = minDelta / 1000;
      const posAttr = particleGeo.getAttribute("position") as InstanceType<
        typeof THREE.BufferAttribute
      >;
      const sizeAttr = particleGeo.getAttribute("aSize") as InstanceType<
        typeof THREE.BufferAttribute
      >;
      const lifeAttr = particleGeo.getAttribute("aLife") as InstanceType<
        typeof THREE.BufferAttribute
      >;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        // Prefer kind mix based on active emitters
        if (phase[i]! >= 1) {
          let mode = 1;
          if (boilOn && foamOn) mode = i % 5 === 0 ? 2 : i % 2;
          else if (boilOn) mode = i % 4 === 0 ? 1 : 0;
          else if (foamOn) mode = 2;
          else mode = 1;
          reseed(i, mode);
        }

        const k = kind[i]!;
        const speedMul =
          (k === 0 ? 1.15 : k === 1 ? 0.75 : 0.4) *
          seedSpeed[i]! *
          (1 - freeze * 0.85) *
          (1 + state.temperature * 0.35) *
          (1 + stirImp * 0.25);
        phase[i] = Math.min(1, phase[i]! + dt * speedMul * 0.55);
        const p = phase[i]!;

        // Ease: slow leave nucleation site, accelerate mid-column
        const rise = p * p * (3 - 2 * p);
        const bottom = -0.5;
        const surfaceY = -0.5 + fill01 * 0.98;
        let y = bottom + (surfaceY - bottom) * rise;

        // Lateral: nucleation x + increasing wobble + stir vortex + shake
        const wobble =
          Math.sin(t * (2.4 + seedW[i]!) + i * 1.7) *
          (0.012 + p * p * 0.055) *
          (1 + shakeImp * 2.2);
        const vortex =
          stirImp *
          0.07 *
          rise *
          Math.sin(t * (2.8 + stirImp * 3.5) + seedX[i]! * 8.0 + i);
        const vortexY =
          stirImp * 0.02 * Math.cos(t * 3.1 + i) * rise * (1 - freeze);
        let x = seedX[i]! + wobble + vortex;
        y += vortexY;

        // Foam / spill: stay near surface, drift outward
        if (k === 2) {
          y = surfaceY - 0.02 + Math.sin(t * 5 + i) * 0.015;
          x =
            seedX[i]! * (1.1 + state.overflow * 0.35) +
            Math.sin(t * 3.5 + i) * 0.04;
          if (state.overflow > 0.4 && Math.abs(x) > 0.32) {
            y += (Math.abs(x) - 0.32) * 0.35; // crest spill upward
          }
        }

        // Growth while rising; pop shrink near surface
        let size = seedSize[i]! * (0.65 + rise * 0.9);
        if (k === 0) size *= 1.15 + state.temperature * 0.35;
        if (p > 0.88) size *= Math.max(0.2, 1 - (p - 0.88) / 0.12);

        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = ((i % 5) - 2) * 0.018;
        aSize[i] = size * 140; // point size in px-ish units for shader
        aLife[i] = p;
      }
      for (let i = count; i < particleCount; i++) {
        arr[i * 3 + 1] = -2;
        aSize[i] = 0;
        aLife[i] = 1;
      }
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      lifeAttr.needsUpdate = true;
    }

    if (fill01 < 0.01) {
      liquid.visible = false;
      side.visible = false;
    } else {
      liquid.visible = true;
      side.visible = true;
    }

    renderer.render(scene, camera);
  };

  raf = requestAnimationFrame(tick);

  return {
    setState: applyState,
    setActive: (v: boolean) => {
      active = v;
      if (v) lastFrame = 0;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      liquidGeo.dispose();
      liquidMat.dispose();
      side.geometry.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    },
  };
}
