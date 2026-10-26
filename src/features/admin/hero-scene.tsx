"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Deterministic pseudo-random numbers: the skyline is the same every visit. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/**
 * A small golden city on deep green, slowly turning and leaning toward the
 * pointer. Pauses while off screen or in a background tab, keeps still with
 * "reduce motion", and frees all GPU memory on unmount.
 */
export default function HeroScene({
  far = false,
}: {
  /** Step the camera back (tall panels such as the login page). */
  far?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      el.dataset.fallback = "true"; // no WebGL: the CSS backdrop stays
      return;
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0d2a23, 9, 22);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 6.2, 12.5);
    camera.lookAt(0, 0.6, 0);

    scene.add(new THREE.HemisphereLight(0xfff3d6, 0x0b241d, 1.1));
    const sun = new THREE.DirectionalLight(0xffe2a8, 2.4);
    sun.position.set(-6, 10, 6);
    scene.add(sun);
    const rim = new THREE.PointLight(0xd4b97a, 18, 18);
    rim.position.set(4, 3, -3);
    scene.add(rim);

    const city = new THREE.Group();
    scene.add(city);

    // Ground: a disc with a fine golden grid.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0x123c32,
        roughness: 0.95,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    city.add(ground);
    const grid = new THREE.GridHelper(14, 28, 0xc6a76b, 0xc6a76b);
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.12;
    grid.position.y = 0.01;
    city.add(grid);

    // Towers: one instanced mesh for the bodies, one for the lit crowns.
    const random = seeded(20261026);
    const spots: { x: number; z: number; h: number; w: number }[] = [];
    for (let gx = -5; gx <= 5; gx++)
      for (let gz = -5; gz <= 5; gz++) {
        const x = gx * 1.05 + (random() - 0.5) * 0.2;
        const z = gz * 1.05 + (random() - 0.5) * 0.2;
        const d = Math.hypot(x, z);
        if (d > 6.2 || random() < 0.18) continue;
        // Taller toward the centre, like a downtown.
        const h = 0.25 + (1 - d / 6.4) ** 2 * 3.4 * (0.45 + random() * 0.8);
        spots.push({ x, z, h, w: 0.42 + random() * 0.34 });
      }
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d5446,
      metalness: 0.35,
      roughness: 0.42,
    });
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: 0xe9cf93,
      emissive: 0xc6a76b,
      emissiveIntensity: 0.55,
      metalness: 0.9,
      roughness: 0.25,
    });
    const bodies = new THREE.InstancedMesh(box, bodyMaterial, spots.length);
    const crowns = new THREE.InstancedMesh(box, crownMaterial, spots.length);
    const m = new THREE.Matrix4();
    spots.forEach((s, i) => {
      m.compose(
        new THREE.Vector3(s.x, 0, s.z),
        new THREE.Quaternion(),
        new THREE.Vector3(s.w, s.h, s.w),
      );
      bodies.setMatrixAt(i, m);
      m.compose(
        new THREE.Vector3(s.x, s.h, s.z),
        new THREE.Quaternion(),
        new THREE.Vector3(s.w * 0.96, 0.06 + s.h * 0.02, s.w * 0.96),
      );
      crowns.setMatrixAt(i, m);
    });
    city.add(bodies, crowns);

    // A thin golden orbit around the city.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.6, 0.018, 8, 160),
      new THREE.MeshBasicMaterial({
        color: 0xd4b97a,
        transparent: true,
        opacity: 0.55,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    city.add(ring);

    // Pointer parallax (desktop): a gentle lean, eased every frame.
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      lean.tx = ((event.clientX - r.left) / r.width - 0.5) * 0.35;
      lean.ty = ((event.clientY - r.top) / r.height - 0.5) * 0.18;
    };
    el.addEventListener("pointermove", onPointer);

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Narrow boxes (phones, tall panels) step back so the city fits.
      camera.position.z =
        (width / height < 1.2 ? 15.5 : 12.5) * (far ? 1.45 : 1);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const sizer = new ResizeObserver(resize);
    sizer.observe(el);
    resize();

    let frame = 0;
    let visible = true;
    let last = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      city.rotation.y += dt * 0.06;
      lean.x += (lean.tx - lean.x) * 0.06;
      lean.y += (lean.ty - lean.y) * 0.06;
      camera.position.x = lean.x * 6;
      camera.position.y = 6.2 - lean.y * 6;
      camera.lookAt(0, 0.6, 0);
      crownMaterial.emissiveIntensity = 0.5 + Math.sin(now / 1400) * 0.12;
      renderer.render(scene, camera);
    };
    const start = () => {
      if (still || frame || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    seen.observe(el);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      seen.disconnect();
      sizer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("pointermove", onPointer);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((x) => x.dispose());
        else material?.dispose();
      });
      bodies.dispose();
      crowns.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [far]);

  return <div ref={host} className="hero-scene" aria-hidden="true" />;
}
