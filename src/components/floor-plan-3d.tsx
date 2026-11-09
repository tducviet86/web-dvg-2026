"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Phone, X } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Link from "@/components/page-navigation";
import { useT } from "@/i18n/client";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { towerFloors, type FloorData } from "@/lib/floor-3d";
import { PLAN_OUTLINES } from "@/lib/floor-plan-outlines";
import { planArea } from "./plan-cutout";

const SCALE = 100;
const WALL = 0.34;
const WALL_THICK = 0.035;
/** Colour of a unit by its bedrooms. */
const COLOURS: Record<number, string> = {
  // Neither listed nor with an area on the drawing.
  0: "#8fa79e",
  1: "#4f9fb0",
  2: "#4d9a6f",
  3: "#c98a4b",
};
const PICKED = "#f2c14e";
const SOLD = "#9aa39d";
const call = telephoneHref(companyHotline);

type Choice = { tower: string; floor: string; unit: string };

/** Bedrooms printed on the listing, else judged from the drawn area. */
const roomsFromArea = (m2: number) =>
  m2 <= 0 ? 0 : m2 < 55 ? 1 : m2 < 90 ? 2 : 3;

function canDraw3D() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/** A unit's tinted floor and its walls. */
function paintUnit(mesh: THREE.Mesh, colour: string, picked: boolean) {
  const floor = mesh.material as THREE.MeshBasicMaterial;
  floor.color.set(picked ? PICKED : colour);
  floor.opacity = picked ? 0.62 : 0.3;
  const walls = mesh.userData.walls as THREE.MeshStandardMaterial;
  walls.color.set(picked ? PICKED : "#fbf8f0");
  mesh.position.y = picked ? 0.1 : 0;
}

/** One label, always readable from the camera. */
function label(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 48;
  const c = canvas.getContext("2d");
  if (c) {
    c.fillStyle = "#ffffffee";
    c.roundRect(4, 4, 88, 40, 12);
    c.fill();
    c.fillStyle = "#0b2a22";
    c.font = "600 26px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 48, 25);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
    }),
  );
  sprite.scale.set(0.8, 0.4, 1);
  sprite.renderOrder = 2;
  return sprite;
}

/**
 * A tower's floor in 3D: the developer's plan on the ground, each unit raised
 * over it along its traced outline. Click a unit, or pick it from the list.
 */
export default function FloorPlan3D({
  data,
  tower,
  floor,
  unit,
  onChange,
  onClose,
  onLook,
}: {
  data: FloorData;
  tower: string;
  /** Empty: the tower's lowest floor. */
  floor: string;
  unit: string;
  onChange: (next: Choice) => void;
  onClose: () => void;
  /** Shows the view out of this floor on the map. */
  onLook: (floor: string) => void;
}) {
  const t = useT();
  const stage = useRef<HTMLDivElement>(null);
  const [failed] = useState(() => !canDraw3D());
  const floors = useMemo(
    () => towerFloors(data.plans, tower),
    [data.plans, tower],
  );
  const shownFloor = floors.includes(floor) ? floor : (floors[0] ?? "");
  const plan = data.plans.find(
    (p) => p.tower === tower && p.floors.includes(shownFloor),
  );
  const file = plan?.image.split("/").pop() ?? "";
  const outlines = PLAN_OUTLINES[file];
  const numbers = useMemo(
    () => Object.keys(outlines?.units ?? {}).sort(),
    [outlines],
  );
  const onFloor = (number: string) => ({
    // A listing on this very floor; else the model unit of that column.
    listing: data.units.find(
      (u) => u.tower === tower && u.floor === shownFloor && u.number === number,
    ),
    model: data.units.find(
      (u) => u.tower === tower && !u.floor && u.number === number,
    ),
  });
  const kindOf = (number: string) =>
    data.kinds?.[`${plan?.image.split("/").pop()}/${number}`];
  const bedroomsOf = (number: string) => {
    const { listing, model } = onFloor(number);
    return (
      listing?.bedrooms ||
      model?.bedrooms ||
      kindOf(number)?.bedrooms ||
      roomsFromArea(outlines?.units[number]?.inner ?? 0)
    );
  };
  const picked = numbers.includes(unit) ? unit : "";
  const go = (next: Partial<Choice>) =>
    onChange({ tower, floor: shownFloor, unit: picked, ...next });
  const pick = useRef(go);
  useEffect(() => {
    pick.current = go;
  });
  const meshes = useRef<Map<string, THREE.Mesh>>(new Map());
  const redraw = useRef<() => void>(() => {});

  // The scene: rebuilt for each drawing, kept while only the floor changes.
  useEffect(() => {
    const el = stage.current;
    if (!el || !plan || !outlines || failed) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const width = outlines.width / SCALE;
    const depth = outlines.height / SCALE;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 3;
    controls.maxDistance = 60;
    const draw = () => renderer.render(scene, camera);
    redraw.current = draw;
    controls.addEventListener("change", draw);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    );
    scene.add(ground);
    new THREE.TextureLoader().load(plan.image, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      ground.material.map = texture;
      ground.material.needsUpdate = true;
      draw();
    });
    scene.add(new THREE.HemisphereLight("#ffffff", "#b9c2bb", 2.2));
    const sun = new THREE.DirectionalLight("#fff4e0", 1.6);
    sun.position.set(-4, 8, 5);
    scene.add(sun);

    const made = new Map<string, THREE.Mesh>();
    for (const [number, outline] of Object.entries(outlines.units)) {
      const shape = new THREE.Shape(
        outline.points.map(
          ([x, y]) =>
            new THREE.Vector2(
              (x - outlines.width / 2) / SCALE,
              -(y - outlines.height / 2) / SCALE,
            ),
        ),
      );
      const geometry = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.position.y = 0;
      const walls = new THREE.MeshStandardMaterial({ roughness: 0.8 });
      mesh.userData = { number, walls };
      // Walls along the traced outline, the drawing's rooms showing inside.
      outline.points.forEach(([x, y], i) => {
        const [nx, ny] = outline.points[(i + 1) % outline.points.length];
        const length = Math.hypot(nx - x, ny - y) / SCALE;
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(length + WALL_THICK, WALL, WALL_THICK),
          walls,
        );
        wall.position.set(
          ((x + nx) / 2 - outlines.width / 2) / SCALE,
          WALL / 2,
          ((y + ny) / 2 - outlines.height / 2) / SCALE,
        );
        wall.rotation.y = -Math.atan2(ny - y, nx - x);
        mesh.add(wall);
      });
      const xs = outline.points.map((p) => p[0]);
      const ys = outline.points.map((p) => p[1]);
      const tag = label(number);
      tag.position.set(
        ((Math.min(...xs) + Math.max(...xs)) / 2 - outlines.width / 2) / SCALE,
        WALL + 0.25,
        ((Math.min(...ys) + Math.max(...ys)) / 2 - outlines.height / 2) / SCALE,
      );
      mesh.add(tag);
      scene.add(mesh);
      made.set(number, mesh);
    }
    meshes.current = made;

    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      draw();
    };
    const reach =
      Math.max(width / Math.max(el.clientWidth / el.clientHeight, 0.5), depth) *
      1.4;
    camera.position.set(0, reach * 0.95, reach * 0.8);
    controls.target.set(0, 0, 0);
    controls.update();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    fit();

    // A click, not a drag, chooses the unit under the pointer.
    const ray = new THREE.Raycaster();
    let down: [number, number] | null = null;
    const press = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const release = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6)
        return;
      const box = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - box.left) / box.width) * 2 - 1,
          -((e.clientY - box.top) / box.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects([...made.values()], false)[0];
      if (hit) pick.current({ unit: String(hit.object.userData.number) });
    };
    renderer.domElement.addEventListener("pointerdown", press);
    renderer.domElement.addEventListener("pointerup", release);

    return () => {
      watch.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", press);
      renderer.domElement.removeEventListener("pointerup", release);
      scene.traverse((node) => {
        const part = node as THREE.Mesh;
        part.geometry?.dispose();
        const material = part.material as
          (THREE.Material & { map?: THREE.Texture | null }) | undefined;
        material?.map?.dispose();
        material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      meshes.current = new Map();
    };
  }, [plan, outlines, failed]);

  // Colours follow the floor's listings and the chosen unit.
  useEffect(() => {
    for (const [number, mesh] of meshes.current) {
      const sold = onFloor(number).listing?.state === "sold";
      paintUnit(
        mesh,
        sold ? SOLD : (COLOURS[bedroomsOf(number)] ?? COLOURS[0]),
        number === picked,
      );
    }
    redraw.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, shownFloor, plan, outlines]);

  const at = floors.indexOf(shownFloor);
  const outline = picked ? outlines?.units[picked] : undefined;
  const { listing, model } = picked
    ? onFloor(picked)
    : { listing: undefined, model: undefined };
  const stateText = listing
    ? listing.state === "available"
      ? t("Đang bán")
      : listing.state === "sold"
        ? t("Đã bán")
        : t("Đã giữ chỗ")
    : t("Liên hệ để biết tình trạng căn này");
  const kind = picked ? kindOf(picked) : undefined;
  const rooms = listing?.rooms ?? model?.rooms ?? kind?.rooms;

  return (
    <section className="fp3d" aria-label={t("Mặt bằng 3D")}>
      <div ref={stage} className="fp3d-stage">
        {(failed || !outlines) && (
          <p className="rmap-failed">
            {t("Chưa hiển thị được mặt bằng 3D trên thiết bị này.")}
          </p>
        )}
      </div>
      <button
        type="button"
        className="fp3d-close"
        aria-label={t("Đóng mặt bằng 3D")}
        onClick={onClose}
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="fp3d-card">
        <div className="fp3d-towers" role="group" aria-label={t("Chọn tòa")}>
          {data.towers.map((x) => (
            <button
              key={x.name}
              type="button"
              aria-pressed={x.name === tower}
              onClick={() => onChange({ tower: x.name, floor: "", unit: "" })}
            >
              {x.name}
            </button>
          ))}
        </div>
        <div className="fp3d-floor">
          <button
            type="button"
            aria-label={t("Tầng dưới")}
            disabled={at <= 0}
            onClick={() => go({ floor: floors[at - 1], unit: "" })}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <label>
            <span>{t("Tầng")}</span>
            <select
              value={shownFloor}
              onChange={(e) => go({ floor: e.target.value, unit: "" })}
            >
              {floors.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-label={t("Tầng trên")}
            disabled={at >= floors.length - 1}
            onClick={() => go({ floor: floors[at + 1], unit: "" })}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <label className="fp3d-unit-pick">
            <span>{t("Căn")}</span>
            <select
              value={picked}
              onChange={(e) => go({ unit: e.target.value })}
            >
              <option value="">{t("Chọn căn")}</option>
              {numbers.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          className="fp3d-slider"
          type="range"
          min={0}
          max={Math.max(floors.length - 1, 0)}
          value={Math.max(at, 0)}
          aria-label={t("Kéo để đổi tầng")}
          onChange={(e) =>
            go({ floor: floors[Number(e.target.value)], unit: "" })
          }
        />
        <button
          type="button"
          className="fp3d-look"
          onClick={() => onLook(shownFloor)}
        >
          <Eye size={16} aria-hidden="true" />
          {t("Tầm nhìn từ tầng {floor}", { floor: shownFloor })}
        </button>
        <ul className="fp3d-legend">
          <li style={{ "--c": COLOURS[1] } as React.CSSProperties}>
            {t("1 phòng ngủ")}
          </li>
          <li style={{ "--c": COLOURS[2] } as React.CSSProperties}>
            {t("2 phòng ngủ")}
          </li>
          <li style={{ "--c": COLOURS[3] } as React.CSSProperties}>
            {t("3 phòng ngủ")}
          </li>
        </ul>
        {outline ? (
          <div className="fp3d-info">
            <h3>
              {kind?.code ?? `${tower}-${shownFloor.padStart(2, "0")}${picked}`}
            </h3>
            <p className="fp3d-state" data-state={listing?.state ?? "unknown"}>
              {stateText}
            </p>
            <dl>
              {rooms && (
                <div>
                  <dt>{t("Loại căn")}</dt>
                  <dd>{rooms}</dd>
                </div>
              )}
              {kind?.area !== undefined && kind.area !== "" && (
                <>
                  <div>
                    <dt>{t("Diện tích")}</dt>
                    <dd>{t("khoảng {n} m²", { n: kind.area })}</dd>
                  </div>
                  <div>
                    <dt>{t("Hướng nhìn")}</dt>
                    <dd>{kind.view}</dd>
                  </div>
                </>
              )}
              {outline.inner > 0 && (
                <>
                  {" "}
                  <div>
                    <dt>{t("Thông thủy")}</dt>
                    <dd>{planArea(outline.inner)}</dd>
                  </div>
                  <div>
                    <dt>{t("Tim tường")}</dt>
                    <dd>{planArea(outline.wall)}</dd>
                  </div>
                </>
              )}
              {listing && (
                <div>
                  <dt>{t("Giá")}</dt>
                  <dd>{listing.priceText}</dd>
                </div>
              )}
            </dl>
            <div className="fp3d-actions">
              {(listing ?? model) && (
                <Link href={(listing ?? model)?.href ?? ""}>
                  {listing ? t("Xem căn này") : t("Xem căn mẫu cùng vị trí")}
                </Link>
              )}
              {call && (
                <a href={call}>
                  <Phone size={15} aria-hidden="true" />
                  {t("Gọi tư vấn")}
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="fp3d-hint">
            {t("Bấm vào một căn để xem diện tích và tình trạng.")}
          </p>
        )}
        <p className="fp3d-note">
          {t("Mặt bằng theo bản vẽ của chủ đầu tư, chỉ để tham khảo.")}
        </p>
      </div>
    </section>
  );
}
