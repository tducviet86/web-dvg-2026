import * as THREE from "three";

const SHELLS = 9;
const SPARKS = 120;
const COLOURS = [
  "#ffd36b",
  "#ff5a5f",
  "#7cf29c",
  "#6cc8ff",
  "#ff8de1",
  "#ffffff",
];

type Shell = {
  start: number;
  x: number;
  z: number;
  height: number;
  colour: THREE.Color;
  /** Each spark's speed east, up and south, m/s. */
  speeds: Float32Array;
};

/**
 * Fireworks over a river at night, in a scene of metres (x east, y up, z
 * south): shells rise from the water and burst into fading sparks. `repaint`
 * asks the map for a frame.
 */
export function createFireworks(
  scene: THREE.Scene,
  [cx, cz]: readonly [number, number],
  repaint: () => void,
) {
  const count = SHELLS * (SPARKS + 1);
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  const RISE = 1.3;
  const FADE = 2.2;
  const shells: Shell[] = [];
  const launch = (shell: number, now: number) => {
    const speeds = new Float32Array(SPARKS * 3);
    const power = 50 + Math.random() * 35;
    for (let i = 0; i < SPARKS; i++) {
      // Evenly round a sphere, a little uneven in speed.
      const up = 1 - (2 * (i + 0.5)) / SPARKS;
      const round = Math.sqrt(1 - up * up);
      const turn = i * 2.39996 + Math.random() * 0.2;
      const v = power * (0.85 + Math.random() * 0.3);
      speeds.set(
        [Math.cos(turn) * round * v, up * v, Math.sin(turn) * round * v],
        i * 3,
      );
    }
    shells[shell] = {
      start: now + Math.random() * 1.5,
      x: cx + (Math.random() - 0.5) * 140,
      z: cz + (Math.random() - 0.5) * 320,
      height: 120 + Math.random() * 120,
      colour: new THREE.Color(
        COLOURS[Math.floor(Math.random() * COLOURS.length)],
      ),
      speeds,
    };
  };

  let frame = 0;
  const step = () => {
    const now = performance.now() / 1000;
    for (let s = 0; s < SHELLS; s++) {
      if (!shells[s] || now > shells[s].start + RISE + FADE) launch(s, now);
      const { start, x, z, height, colour, speeds } = shells[s];
      const age = now - start;
      const base = s * (SPARKS + 1);
      // The shell going up: one bright point until it bursts.
      const rising = age >= 0 && age < RISE;
      const u = Math.min(Math.max(age / RISE, 0), 1);
      positions.set([x, height * (1 - (1 - u) ** 2), z], base * 3);
      colours.set(rising ? [1, 0.85, 0.6] : [0, 0, 0], base * 3);
      // The burst: sparks fly out, fall and fade to nothing.
      const t = age - RISE;
      const glow = t >= 0 ? Math.max(0, 1 - t / FADE) ** 1.5 : 0;
      for (let i = 0; i < SPARKS; i++) {
        const k = (base + 1 + i) * 3;
        const drag = t > 0 ? (1 - Math.exp(-1.6 * t)) / 1.6 : 0;
        positions[k] = x + speeds[i * 3] * drag;
        positions[k + 1] = height + speeds[i * 3 + 1] * drag - 4.9 * t * t;
        positions[k + 2] = z + speeds[i * 3 + 2] * drag;
        colours[k] = colour.r * glow;
        colours[k + 1] = colour.g * glow;
        colours[k + 2] = colour.b * glow;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    repaint();
    frame = requestAnimationFrame(step);
  };

  return {
    /** Starts or stops the show; never for visitors who asked for less motion. */
    run(on: boolean) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)");
      const go = on && !still.matches;
      if (go === points.visible) return;
      points.visible = go;
      cancelAnimationFrame(frame);
      if (go) frame = requestAnimationFrame(step);
      repaint();
    },
  };
}
