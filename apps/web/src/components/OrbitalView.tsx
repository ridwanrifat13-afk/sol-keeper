import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { environment, type Body } from "@sol-keeper/sim";
import { SPEEDS, useRun } from "../store/run.js";
import { useAccessibility } from "../store/accessibility.js";

/**
 * Player request: "a 3d model like eyes.nasa.gov... to show moon/mars orbiting when the sol
 * is ran, stop when the sol is paused, speed up when the sol is ran 4x/16x." Not a WebGL/3D
 * library the brief pre-approved: it only names PixiJS (a 2D renderer) as the one sanctioned
 * SVG-escalation, and even that requires asking first (CLAUDE.md rule 7). This first shipped
 * as a compliant original SVG scene for exactly that reason — see git history on this file.
 * The player then explicitly asked for a literal 3D/WebGL version and, asked which library,
 * chose Three.js directly (not react-three-fiber) — the one new dependency this file adds,
 * with that same explicit approval on record here rather than silently assumed.
 *
 * What's real: the orbital *periods* (environment.lunarSiderealOrbitalPeriodDays/
 * earthOrbitalPeriodDays/marsOrbitalPeriodDays, all NSSDC-FACTS) and their ratios to each
 * other. What's tuned (disclosed below, not a `packages/sim` constant — this never touches a
 * simulated number, so it carries no SIM_VERSION weight): the ABSOLUTE on-screen pace. A
 * literal real-time scale-down using the same ms-per-simulated-hour the sim clock itself uses
 * (store/run.ts's SPEEDS) would take the Moon ~13 minutes per revolution at 1x and Mars nearly
 * half an hour even at 16x — physically honest but nothing a player would ever see complete.
 * `BASE_FAST_ORBIT_SECONDS` fixes how long the scene's *fastest* real body takes to complete
 * one revolution at the 16x ("fast") setting to something actually watchable; every other
 * body and every other speed is then scaled off that one number by the bodies' own real period
 * ratio and by the sim's own real SPEEDS ratio — so "Mars takes ~1.9x longer than Earth" and
 * "4x is exactly 4x the rate of 1x" both stay true to real, sourced numbers, only the single
 * anchor pace itself is a presentation choice.
 *
 * Every body/starfield/orbit-ring here is a plain procedural Three.js primitive (spheres,
 * points, line loops) — original geometry, no textures, no NASA imagery (brief rule 5), and
 * no network fetch (offline-safe, brief rule 6): `three` is bundled locally like every other
 * dependency, not loaded from a CDN.
 */
const BASE_FAST_ORBIT_SECONDS = 20;

const SUN_COLOR = 0xffcf6b;
const EARTH_COLOR = 0x2a6fdb;
const MARS_COLOR = 0xc1440e;
const MOON_COLOR = 0xaab0bd;

/** Radians per ms at the "fast" (16x) sim speed — the same anchor/ratio math the SVG version
 *  used for CSS animation-duration, reframed as an angular velocity for a per-frame rotation
 *  update instead. */
function fastOrbitAngularSpeed(periodDays: number, referencePeriodDays: number): number {
  const fastDurationMs = (periodDays / referencePeriodDays) * BASE_FAST_ORBIT_SECONDS * 1000;
  return (2 * Math.PI) / fastDurationMs;
}

interface OrbitingBody {
  readonly mesh: THREE.Mesh;
  readonly orbitRadius: number;
  /** Angular speed in rad/ms at the sim's "fast" setting; 0 for a body that doesn't orbit
   *  (the Sun/Earth sitting at this scene's own centre). */
  readonly angularSpeedAtFast: number;
  angle: number;
}

function addOrbitRing(scene: THREE.Scene, radius: number): void {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius);
  const points = curve.getPoints(96).map((p: THREE.Vector2) => new THREE.Vector3(p.x, 0, p.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x3a4568, transparent: true, opacity: 0.55 });
  scene.add(new THREE.LineLoop(geometry, material));
}

function addBody(
  scene: THREE.Scene,
  bodies: OrbitingBody[],
  color: number,
  size: number,
  orbitRadius: number,
  angularSpeedAtFast: number,
  emissive: boolean,
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(size, 24, 16);
  const material = emissive
    ? new THREE.MeshBasicMaterial({ color })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(orbitRadius, 0, 0);
  scene.add(mesh);
  if (orbitRadius > 0) addOrbitRing(scene, orbitRadius);
  bodies.push({ mesh, orbitRadius, angularSpeedAtFast, angle: 0 });
  return mesh;
}

function disposeObject(obj: THREE.Object3D): void {
  if (obj instanceof THREE.Mesh || obj instanceof THREE.LineLoop || obj instanceof THREE.Points) {
    obj.geometry.dispose();
    const material = obj.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
  }
}

export function OrbitalView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scenario = useRun((s) => s.scenario);
  const speed = useRun((s) => s.speed);
  const phase = useRun((s) => s.phase);
  const status = useRun((s) => s.state.status);
  const lowPowerMode = useAccessibility((s) => s.lowPowerMode);
  const body: Body = scenario.body;

  const isAnimating = status === "running" && phase === "running" && speed !== "paused";
  // SPEEDS.fast is the fastest real rate (smallest ms-per-hour); every angular speed below is
  // anchored to it, then divided by this ratio for a slower speed — the same real ratio
  // store/run.ts's own setInterval already uses to advance the clock itself.
  const speedRatio = SPEEDS[speed === "paused" ? "fast" : speed] / SPEEDS.fast;
  const stateWord = isAnimating ? `orbiting at ${speed === "fast" ? "16x" : speed === "normal" ? "4x" : "1x"}` : "stopped";

  // Read live inside the animation loop's closure via a ref, not a `useEffect` dependency —
  // speed/phase/status change on essentially every tick while the sim runs, and none of them
  // should tear down and rebuild the whole WebGL scene (only `body`, a structurally different
  // scene, and `lowPowerMode`, which changes render-cost choices, do).
  const liveRef = useRef({ isAnimating, speedRatio });
  liveRef.current = { isAnimating, speedRatio };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPowerMode, alpha: true });
    } catch {
      // A device/browser with no usable WebGL context — the real text table below still
      // carries the real data regardless; there is nothing else safe to render here.
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPowerMode ? 1 : 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 22;

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const starCount = lowPowerMode ? 180 : 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starPositions.length; i++) starPositions[i] = (Math.random() - 0.5) * 260;
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true })));

    const bodies: OrbitingBody[] = [];

    if (body === "moon") {
      // The Sun itself sits far outside this Earth-Moon view's natural scale and is never
      // shown here (same reasoning the old SVG scene's own doc comment gave) — sunlight
      // instead comes from a fixed directional light, giving Earth and the Moon a real
      // lit/unlit terminator without claiming a literal Sun position on screen.
      const sunlight = new THREE.DirectionalLight(0xffffff, 1.4);
      sunlight.position.set(10, 8, 6);
      scene.add(sunlight);
      addBody(scene, bodies, EARTH_COLOR, 1.5, 0, 0, false);
      addBody(
        scene,
        bodies,
        MOON_COLOR,
        0.5,
        5,
        fastOrbitAngularSpeed(environment.lunarSiderealOrbitalPeriodDays.value, environment.lunarSiderealOrbitalPeriodDays.value),
        false,
      );
    } else {
      addBody(scene, bodies, SUN_COLOR, 1.1, 0, 0, true);
      const sunLight = new THREE.PointLight(0xffffff, 90, 300);
      scene.add(sunLight); // co-located with the Sun mesh at the origin — a real light source, not a stand-in.
      addBody(
        scene,
        bodies,
        EARTH_COLOR,
        0.65,
        5,
        fastOrbitAngularSpeed(environment.earthOrbitalPeriodDays.value, environment.earthOrbitalPeriodDays.value),
        false,
      );
      addBody(
        scene,
        bodies,
        MARS_COLOR,
        0.5,
        7.5,
        fastOrbitAngularSpeed(environment.marsOrbitalPeriodDays.value, environment.earthOrbitalPeriodDays.value),
        false,
      );
    }

    function resize(): void {
      const clientWidth = container?.clientWidth ?? 0;
      const clientHeight = container?.clientHeight ?? 0;
      if (clientWidth === 0 || clientHeight === 0) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastTime = performance.now();
    let frameId = requestAnimationFrame(animate);

    function animate(now: number): void {
      frameId = requestAnimationFrame(animate);
      const dtMs = now - lastTime;
      lastTime = now;

      const { isAnimating: animating, speedRatio: ratio } = liveRef.current;
      if (animating && !prefersReducedMotion) {
        for (const orbitingBody of bodies) {
          if (orbitingBody.angularSpeedAtFast === 0) continue;
          orbitingBody.angle += (orbitingBody.angularSpeedAtFast / ratio) * dtMs;
          orbitingBody.mesh.position.set(
            Math.cos(orbitingBody.angle) * orbitingBody.orbitRadius,
            0,
            Math.sin(orbitingBody.angle) * orbitingBody.orbitRadius,
          );
        }
      }
      controls.update();
      renderer.render(scene, camera);
    }

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse(disposeObject);
      renderer.dispose();
    };
  }, [body, lowPowerMode]);

  const ariaLabel = `${
    body === "moon" ? "The Moon orbiting Earth" : "Earth and Mars orbiting the Sun"
  }, currently ${stateWord}, in an interactive 3D view — drag to look around. A full text version follows below.`;

  return (
    <section className="panel orbital-view" aria-labelledby="orbital-view-heading">
      <div className="panel-head-row">
        <h2 id="orbital-view-heading">Orbital display</h2>
        <span className="orbital-view-state">{isAnimating ? "● " : "○ "}{stateWord.toUpperCase()}</span>
      </div>
      <p className="panel-hint">
        {body === "moon"
          ? "The Moon's real orbit around Earth, in 3D — drag to look around. Moves with the clock: stopped in Sol Planning, faster at 4x/16x."
          : "Earth and Mars' real orbits around the Sun, in 3D — drag to look around. Moves with the clock: stopped in Sol Planning, faster at 4x/16x."}
      </p>

      <div ref={containerRef} className="orbital-canvas-container">
        <canvas ref={canvasRef} className="orbital-canvas" role="img" aria-label={ariaLabel} />
      </div>

      <table className="ripple-table">
        <caption className="visually-hidden">Real orbital periods behind the display above</caption>
        <tbody>
          {body === "moon" ? (
            <tr>
              <th scope="row">Moon's real orbital period</th>
              <td>{environment.lunarSiderealOrbitalPeriodDays.value} days around Earth</td>
            </tr>
          ) : (
            <>
              <tr>
                <th scope="row">Earth's real orbital period</th>
                <td>{environment.earthOrbitalPeriodDays.value} days around the Sun</td>
              </tr>
              <tr>
                <th scope="row">Mars' real orbital period</th>
                <td>{environment.marsOrbitalPeriodDays.value} days around the Sun</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      <p className="panel-hint">
        The on-screen pace is compressed for viewing (real orbits are far slower than any player
        would sit and watch) — but the ratio between bodies, and the 1x/4x/16x relationship, both
        stay real.
      </p>
    </section>
  );
}
