"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type SceneProject = {
  id: string;
  name: string;
  slug: string;
  total: number;
  views: number;
  availability: Record<string, number>;
};

/** Floors of a tower, bottom to top: taken units first, free ones on top. */
const FLOORS: { key: string[]; color: number; glow: number }[] = [
  { key: ["RENTED", "SOLD"], color: 0x1f5a49, glow: 0 },
  { key: ["RESERVED"], color: 0xb9852f, glow: 0.18 },
  { key: ["MAINTENANCE"], color: 0x6f7d78, glow: 0 },
  { key: ["AVAILABLE"], color: 0xe2c37f, glow: 0.42 },
];
const count = (p: SceneProject, keys: string[]) =>
  keys.reduce((s, k) => s + (p.availability[k] ?? 0), 0);

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
const easeOut = (t: number) => 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;

/**
 * "Bản đồ danh mục": each project is a tower on a golden grid. Its height
 * follows its number of units; its floors show what is free (gold, on top),
 * reserved (amber) and taken (green); the ring at its foot glows with the
 * period's views. Hover or focus a name for details, click to open its
 * units; drag to turn. Pauses off screen, stays still with "reduce motion",
 * and frees the GPU on unmount.
 */
export default function PortfolioScene({
  projects,
  onSelect,
}: {
  projects: SceneProject[];
  onSelect: (project: SceneProject) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const focus = useRef<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  const key = projects
    .map(
      (p) => `${p.id}:${p.total}:${p.views}:${JSON.stringify(p.availability)}`,
    )
    .join("|");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const root = el;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      el.dataset.fallback = "true"; // no WebGL: the CSS grid backdrop shows
      return;
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0d2a23, 12, 26);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0xfff3d6, 0x0b241d, 1.15));
    const sun = new THREE.DirectionalLight(0xffe2a8, 2.2);
    sun.position.set(-6, 11, 7);
    scene.add(sun);
    const rim = new THREE.PointLight(0xd4b97a, 22, 20);
    rim.position.set(5, 4, -4);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7.6, 72),
      new THREE.MeshStandardMaterial({ color: 0x123c32, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    world.add(ground);
    const grid = new THREE.GridHelper(15, 30, 0xc6a76b, 0xc6a76b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.1;
    grid.position.y = 0.01;
    world.add(grid);
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(7.1, 0.02, 8, 180),
      new THREE.MeshBasicMaterial({
        color: 0xd4b97a,
        transparent: true,
        opacity: 0.5,
      }),
    );
    orbit.rotation.x = Math.PI / 2;
    orbit.position.y = 0.04;
    world.add(orbit);

    // Low, dark buildings around the edge: the city the projects stand in.
    const random = seeded(20261030);
    const filler: THREE.Matrix4[] = [];
    for (let i = 0; i < 70; i++) {
      const a = random() * Math.PI * 2;
      const r = 5 + random() * 2.2;
      const h = 0.2 + random() * 0.7;
      const w = 0.28 + random() * 0.3;
      filler.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
          new THREE.Quaternion(),
          new THREE.Vector3(w, h, w),
        ),
      );
    }
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const fillerMesh = new THREE.InstancedMesh(
      box,
      new THREE.MeshStandardMaterial({
        color: 0x184a3d,
        roughness: 0.6,
        metalness: 0.2,
      }),
      filler.length,
    );
    filler.forEach((m, i) => fillerMesh.setMatrixAt(i, m));
    world.add(fillerMesh);

    // The project towers, laid out on a golden-angle spiral.
    const maxUnits = Math.max(1, ...projects.map((p) => p.total));
    const maxViews = Math.max(1, ...projects.map((p) => p.views));
    const edges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    );
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xf1dca8,
      transparent: true,
      opacity: 0.28,
    });
    const towers = projects.map((project, i) => {
      const angle = i * 2.39996 + 0.6;
      const radius =
        projects.length === 1 ? 0 : 1.05 + 1.05 * Math.sqrt(i + 0.4);
      const group = new THREE.Group();
      group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const height = 0.9 + 3.4 * (project.total / maxUnits);
      const width = 0.72 + 0.28 * (project.total / maxUnits);
      const materials: THREE.MeshStandardMaterial[] = [];
      const meshes: THREE.Mesh[] = [];
      let y = 0;
      for (const floor of FLOORS) {
        const share = project.total
          ? count(project, floor.key) / project.total
          : 0;
        if (!share) continue;
        const material = new THREE.MeshStandardMaterial({
          color: floor.color,
          emissive: floor.color,
          emissiveIntensity: floor.glow,
          metalness: 0.45,
          roughness: 0.38,
        });
        const mesh = new THREE.Mesh(box, material);
        mesh.position.y = y;
        mesh.scale.set(width, height * share - 0.02, width);
        mesh.userData.index = i;
        y += height * share;
        group.add(mesh);
        materials.push(material);
        meshes.push(mesh);
      }
      const outline = new THREE.LineSegments(edges, edgeMaterial);
      outline.scale.set(width * 1.01, y, width * 1.01);
      group.add(outline);
      const crown = new THREE.Mesh(
        box,
        new THREE.MeshStandardMaterial({
          color: 0xf3dfa9,
          emissive: 0xd4b97a,
          emissiveIntensity: 0.7,
          metalness: 0.9,
          roughness: 0.2,
        }),
      );
      crown.position.y = y;
      crown.scale.set(width * 0.7, 0.08, width * 0.7);
      crown.userData.index = i;
      group.add(crown);
      meshes.push(crown);
      // Views: a glowing ring at the foot of the tower.
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(width * 0.85, width * 1.45, 48),
        new THREE.MeshBasicMaterial({
          color: 0xf0d48f,
          transparent: true,
          opacity: 0.08 + 0.55 * (project.views / maxViews),
          side: THREE.DoubleSide,
        }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.03;
      group.add(halo);
      world.add(group);
      return {
        group,
        meshes,
        materials,
        halo,
        top: y + 0.25,
        strength: project.views / maxViews,
      };
    });
    const pickable = towers.flatMap((t) => t.meshes);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hover: number | null = null;
    let drag: { x: number; rot: number } | null = null;
    let spin = 0;
    let moved = false;
    const pick = (event: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.set(
        ((event.clientX - r.left) / r.width) * 2 - 1,
        -((event.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickable, false)[0];
      return hit ? (hit.object.userData.index as number) : null;
    };
    const setHover = (index: number | null) => {
      if (hover === index) return;
      hover = index;
      setHovered(index);
      el.style.cursor =
        index === null ? (drag ? "grabbing" : "grab") : "pointer";
      if (still) draw();
    };
    const onMove = (event: PointerEvent) => {
      if (drag) {
        const dx = event.clientX - drag.x;
        if (Math.abs(dx) > 3) moved = true;
        spin = drag.rot + dx * 0.008;
        if (still) draw();
        return;
      }
      setHover(pick(event));
    };
    const onDown = (event: PointerEvent) => {
      drag = { x: event.clientX, rot: spin };
      moved = false;
    };
    const onUp = (event: PointerEvent) => {
      const wasDrag = moved;
      drag = null;
      if (wasDrag) return;
      const index = pick(event);
      if (index !== null) select.current(projects[index]);
    };
    const onLeave = () => {
      drag = null;
      setHover(null);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);

    let wide = true;
    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      wide = width / height >= 1.15;
      camera.updateProjectionMatrix();
      draw();
    };

    const v = new THREE.Vector3();
    const start = performance.now();
    function draw(now = performance.now()) {
      const t = (now - start) / 1000;
      const distance = wide ? 15.5 : 19;
      camera.position.set(
        Math.sin(0.35) * distance * 0.35,
        8.2,
        distance * 0.94,
      );
      camera.lookAt(0, 1.2, 0);
      world.rotation.y = spin + (still ? 0 : t * 0.05);
      towers.forEach((tower, i) => {
        const grow = still ? 1 : easeOut((t - 0.15 - i * 0.12) / 1.1);
        tower.group.scale.set(1, Math.max(grow, 0.001), 1);
        const lit = hover === i || focus.current === i;
        tower.materials.forEach(
          (m) =>
            (m.emissiveIntensity =
              (m.userData.base ??= m.emissiveIntensity) + (lit ? 0.35 : 0)),
        );
        const pulse = still ? 0 : Math.sin(t * 2 + i) * 0.08 * tower.strength;
        (tower.halo.material as THREE.MeshBasicMaterial).opacity =
          0.08 + 0.55 * tower.strength + pulse + (lit ? 0.2 : 0);
        // Name tags follow the tower tops on screen.
        const label = labels.current[i];
        if (label) {
          v.set(0, tower.top * Math.max(grow, 0.001), 0);
          tower.group.localToWorld(v);
          v.project(camera);
          const x = (v.x * 0.5 + 0.5) * root.clientWidth;
          const y = (-v.y * 0.5 + 0.5) * root.clientHeight;
          label.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          label.style.opacity = grow > 0.6 ? "1" : "0";
        }
      });
      renderer.render(scene, camera);
    }
    const sizer = new ResizeObserver(resize);
    sizer.observe(el);
    resize();

    let frame = 0;
    let visible = true;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      draw(now);
    };
    const run = () => {
      if (still || frame || !visible || document.hidden) return;
      frame = requestAnimationFrame(tick);
    };
    const halt = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run();
      else halt();
    });
    seen.observe(el);
    const onVisibility = () => (document.hidden ? halt() : run());
    document.addEventListener("visibilitychange", onVisibility);
    // Keyboard focus on a name tag lights its tower (also when still).
    const onFocus = (event: Event) => {
      const index = Number((event.target as HTMLElement).dataset?.index);
      focus.current =
        event.type === "focusin" && !Number.isNaN(index) ? index : null;
      if (still) draw();
    };
    el.addEventListener("focusin", onFocus);
    el.addEventListener("focusout", onFocus);
    run();

    return () => {
      halt();
      seen.disconnect();
      sizer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("focusin", onFocus);
      el.removeEventListener("focusout", onFocus);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((x) => x.dispose());
        else material?.dispose();
      });
      fillerMesh.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // `projects` is summarised by `key`: the scene is rebuilt when data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const shown = hovered !== null ? projects[hovered] : null;
  return (
    <div
      ref={host}
      className="portfolio-scene"
      role="group"
      aria-label="Bản đồ dự án 3D: chiều cao tòa tháp theo số căn, vòng sáng theo lượt xem"
    >
      {projects.map((p, i) => (
        <button
          key={p.id}
          ref={(node) => {
            labels.current[i] = node;
          }}
          type="button"
          data-index={i}
          className="portfolio-tag"
          data-on={hovered === i || undefined}
          onClick={() => onSelect(p)}
          aria-label={`${p.name}: ${p.total} căn, ${p.availability.AVAILABLE ?? 0} còn trống, ${p.views} lượt xem. Mở danh sách căn`}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          {p.name}
        </button>
      ))}
      {shown && (
        <div className="portfolio-tip" role="status">
          <strong>{shown.name}</strong>
          <span>
            {shown.total} căn · {shown.availability.AVAILABLE ?? 0} còn trống
          </span>
          <span>{shown.views.toLocaleString("vi-VN")} lượt xem</span>
        </div>
      )}
      <ul className="portfolio-legend" aria-hidden="true">
        <li data-kind="free">Còn trống</li>
        <li data-kind="reserved">Đặt cọc</li>
        <li data-kind="taken">Đã thuê / bán</li>
        <li data-kind="views">Vòng sáng = lượt xem</li>
      </ul>
    </div>
  );
}
