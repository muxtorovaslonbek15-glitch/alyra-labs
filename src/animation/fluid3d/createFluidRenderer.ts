/**
 * Imperative Three.js fluid column for a single vessel well.
 * Dynamic-imported only from client components — never touch window at module top.
 *
 * Presence over spectacle: viscous vs watery body, stir vortex, heat plumes,
 * cool settling, wax vs ice. No hash sparkle.
 */

import type { FluidState } from "./types";
import {
  convectionScale,
  fluidWaveAmp,
  impulseByKind,
  impulseEnergy,
  shaderViscosity,
  shouldEmitParticles,
} from "./fluidMath";

const MAX_PARTICLES = 72;
const IDLE_FPS = 12;
const ACTIVE_FPS = 60;

export interface FluidRendererHandle {
  setState: (state: FluidState) => void;
  setActive: (active: boolean) => void;
  setStillWater: (still: boolean) => void;
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

const EMPTY_STATE: FluidState = {
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
  wax: 0,
  cool: 0,
  stillWater: false,
};

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
    uWax: { value: 0 },
    uStill: { value: 0 },
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
      uniform float uWax;
      uniform float uCool;
      uniform float uStill;

      void main() {
        vUv = uv;
        float visc = clamp(uViscosity, 0.0, 1.0);
        float damp = mix(1.0, 0.18, visc);
        float freeze = clamp(uSolidify, 0.0, 1.0);
        float wax = clamp(uWax, 0.0, 1.0);
        float still = step(0.5, uStill);
        damp *= (1.0 - freeze * 0.92) * (1.0 - wax * 0.45) * (1.0 - still);

        float ny = position.y + 0.5;
        vec3 p = position;
        p.y = -0.5 + ny * max(uFill, 0.001);
        p.y *= 1.0 - wax * freeze * 0.03;

        // Heat plumes — low-frequency cells, slower when thick
        float conv = uTemp * (1.0 - freeze) * damp;
        float cell = sin(position.x * mix(5.5, 2.2, visc) + uTime * mix(1.35, 0.45, visc));
        p.y += conv * 0.016 * cell * sin(ny * 3.14159);
        // Cool water settles downward; wax already quiet
        p.y -= uCool * 0.01 * (1.0 - ny) * (1.0 - wax) * (1.0 - still);

        // Stir vortex — tangential, visc-slowed
        float swirl = uAgitation * mix(0.055, 0.018, visc) * damp;
        float ang = uTime * mix(2.4, 0.55, visc) + ny * 2.2;
        p.x += swirl * sin(ang) * ny;
        p.z += swirl * cos(ang) * ny * 0.35;

        float wave =
          sin(position.x * mix(8.0, 3.2, visc) + uTime * mix(2.6, 0.7, visc)) * uWaveAmp * damp
          + sin(position.x * mix(13.0, 5.0, visc) + uTime * mix(3.1, 1.05, visc)) * uWaveAmp * mix(0.32, 0.12, visc) * damp
          + sin(position.x * 4.5 - uTime * (1.6 + uAgitation * 2.8)) * swirl * 0.65
          + sin(position.x * 7.0 + uTime * 1.8) * uWaveAmp * uTemp * 0.28 * damp;
        if (ny > 0.78) {
          p.y += wave * smoothstep(0.78, 0.92, ny);
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
      uniform float uWax;

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

      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        float y = clamp(vY, 0.0, 1.0);
        vec3 base = layerColor(y);
        float shade = 0.78 + 0.22 * y;
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        base *= shade;

        float wax = clamp(uWax, 0.0, 1.0);
        float freeze = clamp(uSolidify - uMelt * 0.85, 0.0, 1.0);

        // Turbidity: large-scale haze, almost static — not TV snow
        float haze = valueNoise(vUv * 5.5 + vec2(0.0, uTime * 0.04));
        base = mix(base, mix(base * 0.72, vec3(0.42, 0.43, 0.40), 0.35), uTurbidity * (0.45 + haze * 0.25));

        // Heat: amber from the well floor (DESIGN --lab-amber)
        float heatGrad = uTemp * (0.62 * (1.0 - y) + 0.22 * smoothstep(0.68, 1.0, y));
        base = mix(base, base + vec3(0.10, 0.045, -0.015), heatGrad * 0.5);
        vec3 iceTint = vec3(0.88, 0.94, 1.02);
        base = mix(base, mix(base, iceTint, 0.55), uCool * (1.0 - wax) * 0.42);

        float freezeFront = freeze * 0.92;
        float iceMask = smoothstep(freezeFront + 0.1, freezeFront - 0.2, y);
        float grain = valueNoise(vUv * vec2(7.0, 11.0));
        vec3 iceCol = mix(vec3(0.78, 0.90, 0.96), vec3(0.92, 0.97, 1.0), grain);
        vec3 waxCol = mix(base * 0.92, vec3(0.82, 0.74, 0.62), 0.28 + grain * 0.08);
        vec3 setCol = mix(iceCol, waxCol, wax);
        base = mix(base, setCol, iceMask * freeze * mix(0.92, 0.88, wax));
        float skim = smoothstep(0.72, 0.98, y) * freeze * mix(0.55, 0.35, wax);
        base = mix(base, setCol, skim);

        float foamAmt = max(uFoam, uOverflow * 0.85) * (1.0 - wax * 0.85);
        float foamBand = smoothstep(0.74, 0.99, y) * foamAmt;
        float foamSoft = 0.5 + 0.5 * sin(vUv.x * 18.0 + uTime * 1.1);
        base = mix(base, vec3(0.94, 0.97, 0.95), foamBand * (0.55 + foamSoft * 0.2));
        base = mix(base, vec3(0.96, 0.98, 0.97), smoothstep(0.9, 1.0, y) * uOverflow * (1.0 - wax) * 0.55);

        float alpha = mix(0.8, mix(0.97, 0.96, wax), freeze) * edge;
        alpha *= mix(1.0, 0.88, uMelt * 0.4);
        alpha = mix(alpha, min(0.98, alpha + 0.12), uOverflow * smoothstep(0.85, 1.0, y) * (1.0 - wax));

        float gloss = mix(0.28, mix(0.05, 0.06, wax), freeze) + uMelt * 0.18 + uTemp * 0.05;
        gloss *= (1.0 - foamBand * 0.7) * (1.0 - wax * 0.55);
        float spec = pow(1.0 - abs(vUv.x - 0.35), 8.0) * gloss;
        base += vec3(spec);

        // Champagne glass rim (~4%) on wax
        float rim = (1.0 - smoothstep(0.0, 0.07, vUv.x)) + (1.0 - smoothstep(0.0, 0.07, 1.0 - vUv.x));
        base = mix(base, vec3(0.769, 0.706, 0.604), clamp(rim, 0.0, 1.0) * 0.04 * wax);

        float streak = sin((vUv.x * 9.0 + y * 6.0) + uTime * (1.4 + uAgitation * 2.2)) * 0.5 + 0.5;
        base += vec3(0.035) * streak * uAgitation * (1.0 - freeze) * (1.0 - wax * 0.5) * smoothstep(0.18, 0.88, y);

        if (y < 0.001) discard;
        gl_FragColor = vec4(base, alpha);
      }
    `,
  });

  const liquidGeo = new THREE.PlaneGeometry(0.92, 1.0, 36, 24);
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
        float rim = smoothstep(0.48, 0.32, d) * smoothstep(0.12, 0.38, d);
        float core = smoothstep(0.28, 0.0, d) * 0.18;
        float highlight = smoothstep(0.22, 0.0, length(uv - vec2(-0.14, -0.16)));
        float alpha = (rim * 0.9 + core + highlight * 0.55) * uOpacity;
        alpha *= mix(1.0, 0.15, smoothstep(0.82, 1.0, vLife));
        vec3 col = mix(vec3(0.92, 0.97, 1.0), vec3(1.0), highlight);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.visible = false;
  scene.add(particles);

  const phase = new Float32Array(particleCount);
  const seedX = new Float32Array(particleCount);
  const seedW = new Float32Array(particleCount);
  const seedSize = new Float32Array(particleCount);
  const seedSpeed = new Float32Array(particleCount);
  const kind = new Uint8Array(particleCount);

  const reseed = (i: number, mode: number) => {
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
    phase[i] = Math.random() * 0.15;
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

  let state: FluidState = EMPTY_STATE;
  let active = true;
  let stillOverride = false;
  let needsStillFrame = true;
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
  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          resize();
          needsStillFrame = true;
        })
      : null;
  ro?.observe(canvas);

  const stillNow = () => stillOverride || state.stillWater;

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
    uniforms.uOverflow.value = Math.max(
      s.overflow,
      s.fill > 98 ? Math.min(1, (s.fill - 98) / 14) : 0,
    );
    uniforms.uCool.value = s.cool;
    uniforms.uWax.value = s.wax;
    uniforms.uStill.value = stillNow() ? 1 : 0;

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

    const showParticles = shouldEmitParticles({
      wax: s.wax,
      solidify: s.solidify,
      boil: s.boil,
      bubble: s.bubble,
      foam: s.foam,
      overflow: s.overflow,
      agitation: s.agitation,
      fill: s.fill,
      stillWater: stillNow(),
    });
    particles.visible = showParticles;
    bubbleUniforms.uOpacity.value =
      0.55 +
      (s.boil ? 0.35 : 0) +
      (s.bubble ? 0.2 : 0) +
      s.foam * 0.25 +
      s.overflow * 0.15;
    needsStillFrame = true;
  };

  const renderStill = () => {
    uniforms.uTime.value = 0;
    uniforms.uWaveAmp.value = 0;
    uniforms.uAgitation.value = 0;
    uniforms.uStill.value = 1;
    particles.visible = false;
    const fill01 = uniforms.uFill.value as number;
    liquid.visible = fill01 >= 0.01;
    side.visible = fill01 >= 0.01;
    renderer.render(scene, camera);
  };

  const tick = (nowMs: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (!active) return;

    if (stillNow()) {
      if (!needsStillFrame) return;
      needsStillFrame = false;
      renderStill();
      return;
    }

    const wall = performance.now();
    const now = Date.now();
    const impulse = impulseEnergy(state, now);
    const shakeImp = impulseByKind(state, now, "shake");
    const stirImp = Math.max(
      impulseByKind(state, now, "stir"),
      impulseByKind(state, now, "pour") * 0.25,
      state.agitation,
    );
    const freeze = Math.max(0, state.solidify - state.melt * 0.85);
    const conv = convectionScale(
      state.temperature,
      freeze,
      state.viscosity,
      false,
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
      state.solidify > 0.25 ||
      conv > 0.2;

    const targetFps = energetic ? ACTIVE_FPS : IDLE_FPS;
    const minDelta = 1000 / targetFps;
    if (wall - lastFrame < minDelta) return;
    lastFrame = wall;

    if (!t0) t0 = nowMs;
    const t = (nowMs - t0) / 1000;
    uniforms.uTime.value = t;

    const fill01 = uniforms.uFill.value as number;
    uniforms.uWaveAmp.value = fluidWaveAmp({
      viscosity: state.viscosity,
      freeze,
      wax: state.wax,
      temperature: state.temperature,
      boil: state.boil,
      agitation: state.agitation,
      overflow: state.overflow,
      melt: state.melt,
      impulse,
      shakeImp,
      cool: state.cool,
    });
    uniforms.uViscosity.value = shaderViscosity(
      state.viscosity,
      freeze,
      state.melt,
    );
    uniforms.uAgitation.value = stirImp;

    if (particles.visible) {
      const boilOn = state.boil || state.temperature > 0.55;
      const gasOn = state.bubble || state.agitation > 0.45;
      const foamOn = state.foam > 0.2 || state.overflow > 0.25;
      const viscSlow = 1 - state.viscosity * 0.7;
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
          viscSlow *
          (1 + state.temperature * 0.35) *
          (1 + stirImp * 0.25);
        phase[i] = Math.min(1, phase[i]! + dt * speedMul * 0.55);
        const p = phase[i]!;

        const rise = p * p * (3 - 2 * p);
        const bottom = -0.5;
        const surfaceY = -0.5 + fill01 * 0.98;
        let y = bottom + (surfaceY - bottom) * rise;
        // Cool settling: bubbles linger lower
        y -= state.cool * 0.04 * (1 - state.wax) * (1 - rise);

        const wobble =
          Math.sin(t * (2.4 + seedW[i]!) + i * 1.7) *
          (0.012 + p * p * 0.055) *
          (1 + shakeImp * 2.2) *
          viscSlow;
        const vortex =
          stirImp *
          0.07 *
          rise *
          viscSlow *
          Math.sin(t * (2.8 + stirImp * 3.5) + seedX[i]! * 8.0 + i);
        const vortexY =
          stirImp * 0.02 * Math.cos(t * 3.1 + i) * rise * (1 - freeze);
        let x = seedX[i]! + wobble + vortex;
        y += vortexY;

        if (k === 2) {
          y = surfaceY - 0.02 + Math.sin(t * 5 + i) * 0.015;
          x =
            seedX[i]! * (1.1 + state.overflow * 0.35) +
            Math.sin(t * 3.5 + i) * 0.04;
          if (state.overflow > 0.4 && Math.abs(x) > 0.32) {
            y += (Math.abs(x) - 0.32) * 0.35;
          }
        }

        let size = seedSize[i]! * (0.65 + rise * 0.9);
        if (k === 0) size *= 1.15 + state.temperature * 0.35;
        if (p > 0.88) size *= Math.max(0.2, 1 - (p - 0.88) / 0.12);

        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = ((i % 5) - 2) * 0.018;
        aSize[i] = size * 140;
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
      if (v) {
        lastFrame = 0;
        needsStillFrame = true;
      }
    },
    setStillWater: (still: boolean) => {
      stillOverride = still;
      uniforms.uStill.value = stillNow() ? 1 : 0;
      needsStillFrame = true;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      liquidGeo.dispose();
      liquidMat.dispose();
      side.geometry.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    },
  };
}
