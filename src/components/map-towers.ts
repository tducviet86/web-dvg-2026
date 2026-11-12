import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map as MapLibre,
} from "maplibre-gl";
import * as THREE from "three";
import { PLAN_ANCHORS, PLAN_OUTLINES } from "@/lib/floor-plan-outlines";
import {
  BUILDING_BLOCKS,
  FIREWORKS,
  FLOOR_METRES,
  blockCentre,
  type MapBlock,
} from "@/lib/rental-map";
import { createFireworks } from "./map-fireworks";

/** A tower under the pointer: `level` counts floors from the ground, from 1. */
export type TowerHit = {
  slug: string;
  tower: string;
  level: number;
  soon: boolean;
};
type Place = { slug: string; lat: number; lng: number };
type Tower = {
  slug: string;
  tower: string;
  block: MapBlock;
  mesh: THREE.Mesh;
  /** Other surfaces a pointer can land on. */
  extra?: THREE.Mesh[];
  parts: THREE.Object3D[];
  sides: THREE.MeshStandardMaterial[];
  shadow: THREE.Mesh;
  /** Middle of the tower and its corners, in metres from the scene's origin. */
  x: number;
  z: number;
  corners: [number, number][];
};

const BAY = 3.6;
const CELLS = 16;
const GOLD = "#c9a24f";

/** Sixteen floors by sixteen bays of glass, frames and floor edges. */
function facade() {
  const size = 1024;
  // Fixed random numbers: the same lights on every visit, with no pattern.
  let seed = 20261107;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const day = document.createElement("canvas");
  const lit = document.createElement("canvas");
  day.width = lit.width = day.height = lit.height = size;
  const d = day.getContext("2d");
  const n = lit.getContext("2d");
  if (!d || !n) throw new Error("no 2d canvas");
  n.fillStyle = "#000";
  n.fillRect(0, 0, size, size);
  const cell = size / CELLS;
  for (let row = 0; row < CELLS; row++)
    for (let col = 0; col < CELLS; col++) {
      const x = col * cell;
      const y = row * cell;
      const glass = d.createLinearGradient(x, y, x + cell, y + cell);
      const tone = Math.floor(random() * 5);
      glass.addColorStop(
        0,
        ["#8fc3cc", "#8abfc8", "#94c6cf", "#8cc1ca", "#88bcc6"][tone],
      );
      glass.addColorStop(
        1,
        ["#4f93a0", "#4c8f9c", "#5497a4", "#4e919e", "#4a8c99"][tone],
      );
      d.fillStyle = glass;
      d.fillRect(x, y, cell, cell);
      // Sky sliding over the glass.
      d.fillStyle = "#ffffff1a";
      d.beginPath();
      d.moveTo(x + cell * 0.1, y + cell * 0.7);
      d.lineTo(x + cell * 0.55, y + cell * 0.08);
      d.lineTo(x + cell * 0.8, y + cell * 0.08);
      d.lineTo(x + cell * 0.35, y + cell * 0.7);
      d.fill();
      // Frame, balcony rail, floor edge.
      d.fillStyle = "#1d4a42";
      d.fillRect(x, y, 3, cell);
      d.fillRect(x + cell / 2 - 1, y, 2, cell * 0.72);
      d.fillStyle = "#f0e6cf";
      d.fillRect(x, y + cell * 0.72, cell, 3);
      d.fillStyle = "#ffffff66";
      for (let i = 6; i < cell; i += 8)
        d.fillRect(x + i, y + cell * 0.72, 1, cell * 0.14);
      d.fillStyle = GOLD;
      d.fillRect(x, y + cell * 0.86, cell, cell * 0.14);
      // At night about half the homes have their lights on.
      if (random() < 0.42) {
        n.fillStyle = random() < 0.7 ? "#ffd38a" : "#fff0c9";
        n.fillRect(x + 4, y + 2, cell - 8, cell * 0.68);
      }
      n.fillStyle = "#6d5a33";
      n.fillRect(x, y + cell * 0.86, cell, 2);
    }
  const texture = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { day: texture(day, true), lit: texture(lit, true) };
}

const hull = (points: [number, number][]) => {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const q of list) {
      while (
        out.length > 1 &&
        turn(out[out.length - 2], out[out.length - 1], q) <= 0
      )
        out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half([...p].reverse())];
};

/** Where the sun stands over Đà Nẵng: azimuth from north, height, in radians. */
export function sunAt(hour: number, date = new Date()) {
  const day = (date.getTime() - Date.UTC(date.getFullYear(), 0, 0)) / 864e5;
  const decl =
    (-23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10)) * Math.PI) / 180;
  const lat = (16.07 * Math.PI) / 180;
  // Clock time here runs about 12 minutes behind the sun.
  const angle = ((hour + 0.21 - 12) * 15 * Math.PI) / 180;
  const height = Math.asin(
    Math.sin(lat) * Math.sin(decl) +
      Math.cos(lat) * Math.cos(decl) * Math.cos(angle),
  );
  const azimuth = Math.atan2(
    Math.sin(angle),
    Math.cos(angle) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat),
  );
  return { azimuth: azimuth + Math.PI, height };
}

/**
 * The buildings as a Three.js layer in MapLibre's own camera: glass towers with
 * floors, windows and a crown, their shadows, and picking of the floor pointed at.
 */
export function createTowers(map: MapLibre, places: Place[]) {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const centre = places.reduce(
    (n, p) => [n[0] + p.lng / places.length, n[1] + p.lat / places.length],
    [0, 0],
  );
  const origin = MercatorCoordinate.fromLngLat([centre[0], centre[1]], 0);
  const s = origin.meterInMercatorCoordinateUnits();
  // Scene: x east, y up, z south.
  const model = new THREE.Matrix4().set(
    s, 0, 0, origin.x,
    0, 0, s, origin.y,
    0, s, 0, origin.z,
    0, 0, 0, 1,
  ); // prettier-ignore
  const toScene = (lng: number, lat: number) => {
    const m = MercatorCoordinate.fromLngLat([lng, lat], 0);
    return [(m.x - origin.x) / s, (m.y - origin.y) / s] as const;
  };

  // Fireworks over the river by the project that has them.
  const show = places.find((p) => p.slug === FIREWORKS.slug);
  const fireworks =
    show &&
    createFireworks(
      scene,
      toScene(
        show.lng +
          FIREWORKS.east / (111_320 * Math.cos((show.lat * Math.PI) / 180)),
        show.lat + FIREWORKS.north / 110_574,
      ),
      () => map.triggerRepaint(),
    );

  const ambient = new THREE.HemisphereLight("#ffffff", "#c9c2ad", 2.1);
  const sun = new THREE.DirectionalLight("#fff4e0", 2.2);
  scene.add(ambient, sun, sun.target);
  const { day, lit } = facade();
  const stone = new THREE.MeshStandardMaterial({
    color: "#d8c8a4",
    roughness: 0.8,
  });
  const roof = new THREE.MeshStandardMaterial({
    color: "#efe8d6",
    roughness: 0.9,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: GOLD,
    roughness: 0.35,
    metalness: 0.6,
  });
  // Shop fronts: warm lit glass. Parking: dark deck with open sides.
  const shopFront = new THREE.MeshStandardMaterial({
    color: "#e8c98d",
    emissive: "#3a2a10",
    roughness: 0.4,
    metalness: 0.2,
  });
  const parkingDeck = new THREE.MeshStandardMaterial({
    color: "#6f7b77",
    roughness: 0.9,
  });
  const garden = new THREE.MeshStandardMaterial({
    color: "#7fa66a",
    roughness: 0.95,
  });
  const tile = new THREE.MeshStandardMaterial({
    color: "#b4613f",
    roughness: 0.85,
  });
  const ghost = new THREE.MeshStandardMaterial({
    color: "#c9d3ce",
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    roughness: 0.9,
  });
  const ghostEdge = new THREE.LineBasicMaterial({
    color: "#7f938b",
    transparent: true,
    opacity: 0.6,
  });
  const shade = new THREE.MeshBasicMaterial({
    color: "#17302a",
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  let offset = 0;
  const sideOf = (metres: number, floors: number) => {
    offset += 0.37;
    const repeat = (t: THREE.Texture) => {
      const c = t.clone();
      // Each tower starts somewhere else in the pattern.
      c.offset.set(offset, offset * 1.7);
      c.repeat.set(
        Math.max(1, Math.round(metres / BAY)) / CELLS,
        floors / CELLS,
      );
      return c;
    };
    return new THREE.MeshStandardMaterial({
      map: repeat(day),
      emissiveMap: repeat(lit),
      emissive: "#ffffff",
      emissiveIntensity: 0,
      roughness: 0.28,
      metalness: 0.35,
    });
  };
  const box = (
    w: number,
    h: number,
    d: number,
    y: number,
    material: THREE.Material | THREE.Material[],
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.y = y + h / 2;
    return mesh;
  };

  const towers: Tower[] = [];
  for (const place of places)
    for (const block of BUILDING_BLOCKS[place.slug] ?? []) {
      const [cLng, cLat] = blockCentre(place.lat, place.lng, block);
      const [x, z] = toScene(cLng, cLat);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = (-block.angle * Math.PI) / 180;
      scene.add(group);
      const { width: w, depth: d, base, height } = block;
      const shadow = new THREE.Mesh(new THREE.BufferGeometry(), shade);
      shadow.position.y = 0.4;
      shadow.renderOrder = -1;
      scene.add(shadow);
      const turn = group.rotation.y;
      const corners = (
        [
          [-w / 2, -d / 2],
          [w / 2, -d / 2],
          [w / 2, d / 2],
          [-w / 2, d / 2],
        ] as [number, number][]
      ).map(
        ([a, b]) =>
          [
            x + a * Math.cos(turn) + b * Math.sin(turn),
            z - a * Math.sin(turn) + b * Math.cos(turn),
          ] as [number, number],
      );
      // Not on sale yet: only a faint volume with its edges.
      if (block.soon) {
        const body = box(w, height, d, 0, ghost);
        body.add(
          new THREE.LineSegments(
            new THREE.EdgesGeometry(body.geometry),
            ghostEdge,
          ),
        );
        group.add(body);
        shadow.userData.off = true;
        towers.push({
          slug: place.slug,
          tower: block.tower ?? "",
          block,
          mesh: body,
          parts: [group],
          sides: [],
          shadow,
          x,
          z,
          corners,
        });
        continue;
      }
      if (block.outline) {
        const out = block.outline;
        const shape = new THREE.Shape(
          out.map(([p, q]) => new THREE.Vector2(p, q)),
        );
        // Glass above four floors of stone: the two must not share a surface.
        // A tower on a podium starts at its own base, with no stone.
        const low = block.lowFloors ?? [];
        const baseTop = base || (low.length ? low.length : 4) * FLOOR_METRES;
        const floors = Math.round((height - baseTop) / FLOOR_METRES);
        const prism = (
          depth: number,
          y: number,
          material: THREE.Material | THREE.Material[],
        ) => {
          const mesh = new THREE.Mesh(
            new THREE.ExtrudeGeometry(shape, {
              depth,
              bevelEnabled: false,
            }).rotateX(-Math.PI / 2),
            material,
          );
          mesh.position.y = y;
          return mesh;
        };
        if (block.low) {
          const house = prism(height, 0, [tile, stone]);
          group.add(house);
          towers.push({
            slug: place.slug,
            tower: block.tower ?? "",
            block,
            mesh: house,
            parts: [group],
            sides: [],
            shadow,
            x,
            z,
            corners: out.map(
              ([a, b]) =>
                [
                  x + a * Math.cos(turn) - b * Math.sin(turn),
                  z - a * Math.sin(turn) - b * Math.cos(turn),
                ] as [number, number],
            ),
          });
          continue;
        }
        const sides: THREE.MeshStandardMaterial[] = [];
        // A podium of shops only has no glass above them.
        const walls = (height > baseTop + 0.1 ? out : []).map(([p, q], i) => {
          const [np, nq] = out[(i + 1) % out.length];
          const length = Math.hypot(np - p, nq - q);
          const material = sideOf(length, floors);
          material.side = THREE.DoubleSide;
          sides.push(material);
          const wall = new THREE.Mesh(
            new THREE.PlaneGeometry(length, height - baseTop),
            material,
          );
          wall.position.set(
            (p + np) / 2,
            baseTop + (height - baseTop) / 2,
            -(q + nq) / 2,
          );
          wall.rotation.y = Math.atan2(nq - q, np - p);
          return wall;
        });
        const top = prism(
          0.9,
          height,
          walls.length ? [roof, metal] : [garden, roof],
        );
        // Shop and parking floors are pointed at like any other floor.
        const bands = base
          ? []
          : low.map((kind, i) =>
              prism(
                FLOOR_METRES,
                i * FLOOR_METRES,
                kind === "shop" ? [roof, shopFront] : [roof, parkingDeck],
              ),
            );
        group.add(
          ...walls,
          top,
          ...bands,
          ...(base || low.length ? [] : [prism(baseTop, 0, stone)]),
        );
        towers.push({
          slug: place.slug,
          tower: block.tower ?? "",
          block,
          mesh: top,
          extra: [...walls, ...bands],
          parts: [group],
          sides,
          shadow,
          x,
          z,
          corners: out.map(
            ([a, b]) =>
              [
                x + a * Math.cos(turn) - b * Math.sin(turn),
                z - a * Math.sin(turn) - b * Math.cos(turn),
              ] as [number, number],
          ),
        });
        continue;
      }
      if (block.low) {
        const house = box(w, height, d, 0, [
          stone,
          stone,
          tile,
          tile,
          stone,
          stone,
        ]);
        group.add(house);
        towers.push({
          slug: place.slug,
          tower: block.tower ?? "",
          block,
          mesh: house,
          parts: [group],
          sides: [],
          shadow,
          x,
          z,
          corners,
        });
        continue;
      }
      // A block on the ground with no tower name is the podium under towers.
      if (base === 0 && !block.tower) {
        const podium = box(w, height, d, 0, stone);
        group.add(podium, box(w + 0.8, 0.8, d + 0.8, height, metal));
        towers.push({
          slug: place.slug,
          tower: "",
          block,
          mesh: podium,
          parts: [group],
          sides: [],
          shadow,
          x,
          z,
          corners,
        });
        continue;
      }
      const floors = Math.round((height - base) / FLOOR_METRES);
      const front = sideOf(w, floors);
      const side = sideOf(d, floors);
      const mesh = box(w, height - base, d, base, [
        side,
        side,
        roof,
        roof,
        front,
        front,
      ]);
      group.add(mesh);
      // A stone base under a tower standing directly on the ground.
      if (base === 0)
        group.add(box(w + 1.2, 4 * FLOOR_METRES, d + 1.2, 0, stone));
      // Crown: a gold edge, a roof room and a thin mast.
      if (!block.bare)
        group.add(
          // Gold edge only: the roof itself stays light.
          box(w + 0.6, 0.9, d + 0.6, height, [
            metal,
            metal,
            roof,
            roof,
            metal,
            metal,
          ]),
          box(w * 0.42, 3.4, d * 0.42, height + 0.9, roof),
          box(0.5, 9, 0.5, height + 4.3, metal),
        );
      towers.push({
        slug: place.slug,
        tower: block.tower ?? "",
        block,
        mesh,
        parts: [group],
        sides: [front, side],
        shadow,
        x,
        z,
        corners,
      });
    }
  const byMesh = new Map(
    towers.flatMap((x) =>
      [x.mesh, ...(x.extra ?? [])].map((m) => [m, x] as const),
    ),
  );
  const hitList = [...byMesh.keys()];

  // The floor pointed at, and the ring around the chosen tower.
  // The floor pointed at: a band the shape of the tower, a little wider.
  const bandMaterial = new THREE.MeshBasicMaterial({
    color: "#f2c14e",
    transparent: true,
    opacity: 0.82,
  });
  const bands = new Map<Tower, THREE.Mesh>();
  const bandOf = (x: Tower) => {
    let band = bands.get(x);
    if (band) return band;
    const out = x.block.outline;
    band = out
      ? new THREE.Mesh(
          new THREE.ExtrudeGeometry(
            new THREE.Shape(out.map(([p, q]) => new THREE.Vector2(p, q))),
            { depth: FLOOR_METRES, bevelEnabled: false },
          ).rotateX(-Math.PI / 2),
          bandMaterial,
        )
      : new THREE.Mesh(
          new THREE.BoxGeometry(
            x.block.width + 0.6,
            FLOOR_METRES,
            x.block.depth + 0.6,
          ),
          bandMaterial,
        );
    if (out) band.scale.set(1.015, 1, 1.015);
    band.position.set(x.x, 0, x.z);
    band.rotation.y = (-x.block.angle * Math.PI) / 180;
    band.visible = false;
    scene.add(band);
    bands.set(x, band);
    return band;
  };

  const layer: CustomLayerInterface = {
    id: "dvg-towers",
    type: "custom",
    renderingMode: "3d",
    render(_gl, args) {
      camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(args.defaultProjectionData.mainMatrix as unknown as number[])
        .multiply(model);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      renderer?.resetState();
      renderer?.render(scene, camera);
    },
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGL2RenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    onRemove() {
      fireworks?.run(false);
      renderer?.dispose();
    },
  };
  let renderer: THREE.WebGLRenderer | null = null;

  let opened: {
    group: THREE.Group;
    added: THREE.Object3D[];
    /** A part hidden while the floor is open, shown again on closing. */
    show?: THREE.Object3D;
  }[] = [];
  let grounded = false;
  /** The site's ground floor drawing, laid on the ground around the towers. */
  function layGround(x: Tower, image: string) {
    if (grounded) return;
    const anchored = anchorsFor(image, { ...x.block, east: 0, north: 0 });
    const plan = PLAN_OUTLINES[image.split("/").pop() ?? ""];
    const area = PLAN_ANCHORS[image.split("/").pop() ?? ""]?.ground;
    if (!anchored || !plan || !area) return;
    const [left, up, right, down] = area;
    grounded = true;
    // The pin in the scene: this part's middle less its offset from the pin.
    const pinX = x.x - x.block.east;
    const pinZ = x.z + x.block.north;
    const corner = (px: number, py: number) => {
      const [e, n] = anchored.toLocal(px, py);
      return [pinX + e, 0.25, pinZ - n];
    };
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          ...corner(left, up),
          ...corner(right, up),
          ...corner(right, down),
          ...corner(left, down),
        ],
        3,
      ),
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        [
          left / plan.width,
          1 - up / plan.height,
          right / plan.width,
          1 - up / plan.height,
          right / plan.width,
          1 - down / plan.height,
          left / plan.width,
          1 - down / plan.height,
        ],
        2,
      ),
    );
    geometry.setIndex([0, 2, 1, 0, 3, 2]);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    new THREE.TextureLoader().load(image, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      material.map = t;
      material.needsUpdate = true;
      map.triggerRepaint();
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    opened.push({ group: scene as unknown as THREE.Group, added: [mesh] });
  }
  let lifting = 0;
  /**
   * A footprint's own axes: its longest wall, turned less than 45° from east.
   * `to` takes a point into them, `back` returns it; e/n are its extent there.
   */
  function frameOf(
    out: [number, number][],
    /** The footprint whose walls give the axes, when `out` is several. */
    walls: [number, number][] = out,
  ) {
    let best = 0;
    let angle = 0;
    walls.forEach(([p, q], i) => {
      const [np, nq] = walls[(i + 1) % walls.length];
      const length = Math.hypot(np - p, nq - q);
      if (length > best) {
        best = length;
        angle = Math.atan2(nq - q, np - p);
      }
    });
    angle = ((angle % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    if (angle > Math.PI / 4) angle -= Math.PI / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const to = (p: number, q: number): [number, number] => [
      p * c + q * s,
      -p * s + q * c,
    ];
    const back = (p: number, q: number): [number, number] => [
      p * c - q * s,
      p * s + q * c,
    ];
    const turned = out.map(([p, q]) => to(p, q));
    const e = turned.map((v) => v[0]);
    const n = turned.map((v) => v[1]);
    return {
      to,
      back,
      e0: Math.min(...e),
      e1: Math.max(...e),
      n0: Math.min(...n),
      n1: Math.max(...n),
    };
  }

  type Anchors = {
    toLocal: (px: number, py: number) => [number, number];
    toImage: (p: number, q: number) => [number, number];
  };
  /** A drawing's pixels to a block's own metres and back, from its anchors. */
  function anchorsFor(image: string, block: MapBlock): Anchors | null {
    const known = PLAN_ANCHORS[image.split("/").pop() ?? ""];
    if (!known) return null;
    const [i0, i1, i2] = known.image;
    const [w0, w1, w2] = known.site;
    const u = [i1[0] - i0[0], i1[1] - i0[1]];
    const v = [i2[0] - i0[0], i2[1] - i0[1]];
    const U = [w1[0] - w0[0], w1[1] - w0[1]];
    const V = [w2[0] - w0[0], w2[1] - w0[1]];
    // Solves a·first + b·second = point.
    const solve = (first: number[], second: number[], point: number[]) => {
      const det = first[0] * second[1] - first[1] * second[0];
      return [
        (point[0] * second[1] - point[1] * second[0]) / det,
        (first[0] * point[1] - first[1] * point[0]) / det,
      ];
    };
    return {
      toLocal: (px, py) => {
        const [a, b] = solve(u, v, [px - i0[0], py - i0[1]]);
        return [
          w0[0] + a * U[0] + b * V[0] - block.east,
          w0[1] + a * U[1] + b * V[1] - block.north,
        ];
      },
      toImage: (p, q) => {
        const [a, b] = solve(U, V, [
          p + block.east - w0[0],
          q + block.north - w0[1],
        ]);
        return [i0[0] + a * u[0] + b * v[0], i0[1] + a * u[1] + b * v[1]];
      },
    };
  }

  /** Whether a point lies inside a footprint. */
  function inside([x, y]: [number, number], ring: [number, number][]) {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[j];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
        hit = !hit;
    }
    return hit;
  }

  /** The part of a drawing with the units, and a margin around them. */
  type Crop = { left: number; up: number; across: number; down: number };
  function cropOf(
    plan: (typeof PLAN_OUTLINES)[string] | undefined,
  ): Crop | null {
    if (!plan) return null;
    const points = Object.values(plan.units).flatMap((u) => u.points);
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const pad =
      0.05 *
      Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      );
    const left = Math.max(0, Math.min(...xs) - pad);
    const up = Math.max(0, Math.min(...ys) - pad);
    return {
      left,
      up,
      across: Math.min(plan.width, Math.max(...xs) + pad) - left,
      down: Math.min(plan.height, Math.max(...ys) + pad) - up,
    };
  }

  /** The units over the drawing: low walls along each, and a surface to point at. */
  let unitMeshes: THREE.Mesh[] = [];
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: "#fbf8f0",
    roughness: 0.85,
  });
  function layUnits(
    into: THREE.Group,
    y: number,
    plan: (typeof PLAN_OUTLINES)[string],
    image: string,
    tower: string,
    toLocal: (px: number, py: number) => [number, number],
    keep: (middle: [number, number]) => boolean = () => true,
  ) {
    for (const [unit, outline] of Object.entries(plan.units)) {
      const points = outline.points.map(([px, py]) => toLocal(px, py));
      const middle: [number, number] = [
        points.reduce((n, p) => n + p[0], 0) / points.length,
        points.reduce((n, p) => n + p[1], 0) / points.length,
      ];
      if (!keep(middle)) continue;
      const surface = new THREE.Mesh(
        new THREE.ShapeGeometry(
          new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z))),
        ).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: "#f2c14e",
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      surface.position.y = y + 0.05;
      const xs = outline.points.map((p) => p[0]);
      const ys = outline.points.map((p) => p[1]);
      surface.userData = {
        unit,
        tower,
        image,
        inner: outline.inner,
        box: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
        ],
        size: [plan.width, plan.height],
      };
      into.add(surface);
      unitMeshes.push(surface);
      points.forEach(([x, z], i) => {
        const [nx, nz] = points[(i + 1) % points.length];
        const length = Math.hypot(nx - x, nz - z);
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(length + 0.2, 1.1, 0.2),
          wallMaterial,
        );
        wall.position.set((x + nx) / 2, y + 0.55, (z + nz) / 2);
        wall.rotation.y = -Math.atan2(nz - z, nx - x);
        into.add(wall);
      });
    }
  }

  /** The same opening for a tower of any shape: walls below, the floor on top. */
  function openOutline(
    x: Tower,
    group: THREE.Group,
    top: number,
    image: string,
    then: () => void,
    together: Tower[],
  ) {
    const out = x.block.outline ?? [];
    const from = x.block.base;
    // The drawing spans every part of the floor, in this tower's own metres.
    const extent = [x, ...together].flatMap((t) =>
      (t.block.outline ?? []).map(
        ([p, q]) => [t.x + p - x.x, x.z - t.z + q] as [number, number],
      ),
    );
    const shape = new THREE.Shape(out.map(([p, q]) => new THREE.Vector2(p, q)));
    const lower = new THREE.Group();
    out.forEach(([p, q], i) => {
      const [np, nq] = out[(i + 1) % out.length];
      const length = Math.hypot(np - p, nq - q);
      const material = sideOf(
        length,
        Math.max(1, Math.round((top - from) / FLOOR_METRES)),
      );
      material.side = THREE.DoubleSide;
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(length, top - from),
        material,
      );
      wall.position.set((p + np) / 2, from + (top - from) / 2, -(q + nq) / 2);
      wall.rotation.y = Math.atan2(nq - q, np - p);
      lower.add(wall);
    });
    const ground = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
      ground,
      new THREE.MeshBasicMaterial({ color: "#f4efe2" }),
    );
    const units = new THREE.Group();
    if (image) {
      const plan = PLAN_OUTLINES[image.split("/").pop() ?? ""];
      const crop = cropOf(plan);
      // A drawing with known points on the map is laid exactly by them;
      // others are stretched over the tower.
      const anchored = anchorsFor(image, x.block);
      const frame = frameOf(extent, out);
      const toLocal = (px: number, py: number): [number, number] => {
        if (anchored) return anchored.toLocal(px, py);
        if (!crop) return [0, 0];
        const a = (px - crop.left) / crop.across;
        const b = (py - crop.up) / crop.down;
        return frame.back(
          frame.e1 - b * (frame.e1 - frame.e0),
          frame.n1 - a * (frame.n1 - frame.n0),
        );
      };
      showDrawing(floor, ground, extent, image, crop, out, anchored);
      if (plan && crop)
        layUnits(
          units,
          top + 0.25,
          plan,
          image,
          x.tower,
          (px, py) => {
            const [p, q] = toLocal(px, py);
            return [p, -q];
          },
          // Only this part's own units; the other part lays its own.
          ([cx, cz]) => inside([cx, -cz], out),
        );
    }
    floor.position.y = top + 0.2;
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
      ),
      new THREE.LineBasicMaterial({ color: GOLD }),
    );
    edge.position.y = top + 0.3;
    const upper = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(1, x.block.height - top),
        bevelEnabled: false,
      }).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: "#d9e4e1",
        transparent: true,
        opacity: 0.6,
      }),
    );
    upper.position.y = top;
    for (const child of group.children) child.visible = false;
    group.add(lower, floor, edge, upper, units);
    opened.push({ group, added: [lower, floor, edge, upper, units] });
    const started = performance.now();
    const run = lifting;
    const step = (now: number) => {
      if (run !== lifting) return;
      const u = Math.min(1, (now - started) / 1100);
      const eased = 1 - (1 - u) ** 3;
      upper.position.y = top + eased * 90;
      (upper.material as THREE.MeshStandardMaterial).opacity =
        0.6 * (1 - eased);
      map.triggerRepaint();
      if (u < 1) requestAnimationFrame(step);
      else {
        upper.visible = false;
        then();
      }
    };
    requestAnimationFrame(step);
  }

  /**
   * The drawing laid over a floor of any shape. These drawings face up to the
   * east (Trần Hưng Đạo at the bottom), like the developer's site plan.
   */
  function showDrawing(
    floor: THREE.Mesh,
    ground: THREE.BufferGeometry,
    out: [number, number][],
    image: string,
    crop: Crop | null,
    walls: [number, number][] = out,
    anchored: Anchors | null = null,
  ) {
    // Along the tower's own walls, not the compass: no slant.
    const { e0, e1, n0, n1, to } = frameOf(out, walls);
    const at = ground.getAttribute("position");
    const uv = ground.getAttribute("uv");
    for (let i = 0; i < at.count; i++) {
      if (anchored && crop) {
        const [ix, iy] = anchored.toImage(at.getX(i), -at.getZ(i));
        uv.setXY(
          i,
          (ix - crop.left) / crop.across,
          1 - (iy - crop.up) / crop.down,
        );
        continue;
      }
      const [p, q] = to(at.getX(i), -at.getZ(i));
      // Across the drawing: north to south; down it: east to west.
      uv.setXY(i, (n1 - q) / (n1 - n0), (p - e0) / (e1 - e0));
    }
    uv.needsUpdate = true;
    const picture = new Image();
    picture.onload = () => {
      const plan = PLAN_OUTLINES[image.split("/").pop() ?? ""];
      const scale = plan ? picture.naturalWidth / plan.width : 1;
      const [left, up, across, down] = crop
        ? [crop.left, crop.up, crop.across, crop.down].map((n) => n * scale)
        : [0, 0, picture.naturalWidth, picture.naturalHeight];
      const canvas = document.createElement("canvas");
      canvas.width = across;
      canvas.height = down;
      const c = canvas.getContext("2d");
      if (c) {
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, across, down);
      }
      c?.drawImage(picture, left, up, across, down, 0, 0, across, down);
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      const material = floor.material as THREE.MeshBasicMaterial;
      material.color.set("#ffffff");
      material.map = t;
      material.needsUpdate = true;
      map.triggerRepaint();
    };
    picture.src = image;
  }

  /** Opens one part of a tower at a floor; `together` are its other parts. */
  function openPart(
    x: Tower,
    level: number,
    image: string,
    then: () => void,
    together: Tower[],
  ) {
    const { width: w, depth: d, height } = x.block;
    const top = Math.min(level * FLOOR_METRES, height);
    const group = x.parts[0] as THREE.Group;
    if (x.block.outline)
      return openOutline(x, group, top, image, then, together);
    const body = x.mesh;
    const side = (metres: number, floors: number) => sideOf(metres, floors);
    const cut = (from: number, to: number) =>
      box(
        w,
        to - from,
        d,
        from,
        (() => {
          const floors = Math.max(1, Math.round((to - from) / FLOOR_METRES));
          const a = side(d, floors);
          const b = side(w, floors);
          return [a, a, roof, roof, b, b];
        })(),
      );
    const lower = cut(0, top);
    const upper = new THREE.Group();
    upper.add(cut(top, height));
    const fading = (upper.children[0] as THREE.Mesh)
      .material as THREE.MeshStandardMaterial[];
    for (const m of fading) {
      if (m === roof) continue;
      m.transparent = true;
    }
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    );
    plate.position.y = top + 0.3;
    const plan = PLAN_OUTLINES[image.split("/").pop() ?? ""];
    const crop = cropOf(plan);
    // A drawing wider than its tower is turned to lie along it.
    const turned = crop ? crop.across > crop.down !== w > d : false;
    const units = new THREE.Group();
    if (plan && crop)
      layUnits(units, top + 0.35, plan, image, x.tower, (px, py) => {
        const a = (px - crop.left) / crop.across;
        const b = (py - crop.up) / crop.down;
        const [u, v] = turned ? [1 - b, a] : [a, b];
        return [-w / 2 + u * w, -d / 2 + v * d];
      });
    const picture = new Image();
    picture.onload = () => {
      const scale = plan ? picture.naturalWidth / plan.width : 1;
      const [left, up, across, down] = crop
        ? [crop.left, crop.up, crop.across, crop.down].map((n) => n * scale)
        : [0, 0, picture.naturalWidth, picture.naturalHeight];
      const canvas = document.createElement("canvas");
      canvas.width = turned ? down : across;
      canvas.height = turned ? across : down;
      const c = canvas.getContext("2d");
      if (!c) return;
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, canvas.width, canvas.height);
      if (turned) {
        c.translate(canvas.width, 0);
        c.rotate(Math.PI / 2);
      }
      c.drawImage(picture, left, up, across, down, 0, 0, across, down);
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      (plate.material as THREE.MeshBasicMaterial).map = t;
      (plate.material as THREE.MeshBasicMaterial).needsUpdate = true;
      map.triggerRepaint();
    };
    picture.src = image;
    for (const child of group.children) child.visible = false;
    void body;
    group.add(lower, upper, plate, units);
    opened.push({ group, added: [lower, upper, plate, units] });
    const started = performance.now();
    const run = lifting;
    const step = (now: number) => {
      if (run !== lifting) return;
      const u = Math.min(1, (now - started) / 1100);
      const eased = 1 - (1 - u) ** 3;
      upper.position.y = eased * 90;
      for (const m of fading) if (m !== roof) m.opacity = 1 - eased;
      map.triggerRepaint();
      if (u < 1) requestAnimationFrame(step);
      else {
        upper.visible = false;
        then();
      }
    };
    requestAnimationFrame(step);
  }

  /** Puts the opened tower back together. */
  function closeFloor() {
    lifting++;
    unitMeshes = [];
    for (const open of opened) {
      for (const part of open.added) open.group.remove(part);
      if (open.show) open.show.visible = true;
      else if (open.group !== (scene as unknown as THREE.Group))
        for (const child of open.group.children) child.visible = true;
    }
    opened = [];
    grounded = false;
    map.triggerRepaint();
  }

  const ray = new THREE.Ray();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const caster = new THREE.Raycaster();

  return {
    layer,
    /** What is under a point of the map's canvas. */
    pick(x: number, y: number): TowerHit | null {
      const box = map.getCanvas().getBoundingClientRect();
      const nx = (x / box.width) * 2 - 1;
      const ny = -(y / box.height) * 2 + 1;
      a.set(nx, ny, -1).applyMatrix4(camera.projectionMatrixInverse);
      b.set(nx, ny, 1).applyMatrix4(camera.projectionMatrixInverse);
      ray.origin.copy(a);
      ray.direction.copy(b).sub(a).normalize();
      caster.ray.copy(ray);
      const hit = caster.intersectObjects(hitList, false)[0];
      const tower = hit && byMesh.get(hit.object as THREE.Mesh);
      if (!tower) return null;
      return {
        slug: tower.slug,
        tower: tower.tower,
        level: tower.block.crown
          ? Math.round(tower.block.base / FLOOR_METRES)
          : Math.max(1, Math.ceil(hit.point.y / FLOOR_METRES)),
        soon: !!tower.block.soon,
      };
    },
    /** Gold for the chosen building or tower. */
    highlight(slug: string | null, tower: string) {
      for (const x of towers) {
        const on = x.slug === slug && (tower ? x.tower === tower : !x.tower);
        for (const m of x.sides) m.color.set(on ? "#ffe9b0" : "#ffffff");
      }
      map.triggerRepaint();
    },
    /** The band of the floor pointed at; `level` 0 hides it. */
    markFloor(slug: string, tower: string, level: number) {
      for (const band of bands.values()) band.visible = false;
      if (level > 0)
        for (const x of towers) {
          if (x.slug !== slug || x.tower !== tower || !x.sides.length) continue;
          if (level * FLOOR_METRES > x.block.height + 0.1 || x.block.crown)
            continue;
          bandOf(x).position.y =
            (level - 1) * FLOOR_METRES +
            (x.block.outline ? 0 : FLOOR_METRES / 2);
          bandOf(x).visible = true;
        }
      map.triggerRepaint();
    },
    /** Hides a tower, so a view from inside it is not blocked by its walls. */
    hide(slug: string, tower: string) {
      for (const x of towers) {
        const gone = x.slug === slug && x.tower === tower;
        for (const part of x.parts) part.visible = !gone;
        x.shadow.visible = !gone && x.shadow.visible;
      }
      map.triggerRepaint();
    },
    /**
     * Opens a tower at a floor: everything above lifts away, showing the floor's
     * drawing where it stands. `then` runs when the lift is done.
     */
    openFloor(
      slug: string,
      tower: string,
      level: number,
      image: string,
      then: () => void,
      /** Open beside what is open already: another tower of the same floor. */
      keep = false,
    ) {
      if (!keep) closeFloor();
      // A tower in several parts (an L) opens all its parts that reach the floor.
      const parts = towers.filter(
        (q) =>
          q.slug === slug && q.tower === tower && !q.block.low && !q.block.soon,
      );
      // Only the parts that hold this floor: not below a tower's own base.
      const tall = parts.filter(
        (q) =>
          level * FLOOR_METRES <= q.block.height + 0.1 &&
          level * FLOOR_METRES > q.block.base + 0.1,
      );
      if (!tall.length) return then();
      // Parts above the floor (a tower on its base) step aside meanwhile.
      for (const q of parts)
        if (!tall.includes(q) && q.block.base + 0.1 >= level * FLOOR_METRES) {
          const group = q.parts[0];
          group.visible = false;
          opened.push({
            group: scene as unknown as THREE.Group,
            added: [],
            show: group,
          });
        }
      const known = PLAN_ANCHORS[image.split("/").pop() ?? ""];
      if (known?.ground) layGround(tall[0], image);
      tall.forEach((x, i) =>
        openPart(
          x,
          level,
          image,
          i === 0 ? then : () => {},
          parts.filter((q) => q !== x),
        ),
      );
    },
    closeFloor,

    /** The unit of an opened floor under a point of the canvas. */
    pickUnit(x: number, y: number) {
      if (!unitMeshes.length) return null;
      const box = map.getCanvas().getBoundingClientRect();
      const nx = (x / box.width) * 2 - 1;
      const ny = -(y / box.height) * 2 + 1;
      a.set(nx, ny, -1).applyMatrix4(camera.projectionMatrixInverse);
      b.set(nx, ny, 1).applyMatrix4(camera.projectionMatrixInverse);
      caster.ray.origin.copy(a);
      caster.ray.direction.copy(b).sub(a).normalize();
      const hit = caster.intersectObjects(unitMeshes, false)[0];
      return hit
        ? (hit.object.userData as {
            unit: string;
            tower: string;
            image: string;
            inner: number;
            box: [number, number, number, number];
            size: [number, number];
          })
        : null;
    },
    /** Lights the unit pointed at on an opened floor. */
    hoverUnit(unit: string) {
      for (const m of unitMeshes)
        (m.material as THREE.MeshBasicMaterial).opacity =
          `${m.userData.tower}/${m.userData.unit}` === unit ? 0.45 : 0;
      map.triggerRepaint();
    },
    /** Light, windows and shadows for a time of day. */
    setSun(hour: number, night: boolean) {
      const { azimuth, height } = sunAt(hour);
      const up = Math.max(height, 0.05);
      sun.position.set(
        Math.sin(azimuth) * Math.cos(up) * 400,
        Math.sin(up) * 400,
        -Math.cos(azimuth) * Math.cos(up) * 400,
      );
      fireworks?.run(night);
      sun.intensity = night ? 0.15 : 2.2;
      ambient.intensity = night ? 0.45 : 2.1;
      for (const x of towers) {
        for (const m of x.sides) m.emissiveIntensity = night ? 1.25 : 0;
        const show =
          !night &&
          height > 0.05 &&
          x.parts[0].visible &&
          !x.shadow.userData.off;
        x.shadow.visible = show;
        if (!show) continue;
        const reach = Math.min(x.block.height / Math.tan(height), 420);
        const dx = -Math.sin(azimuth) * reach;
        const dz = Math.cos(azimuth) * reach;
        const outline = hull([
          ...x.corners,
          ...x.corners.map(([p, q]) => [p + dx, q + dz] as [number, number]),
        ]);
        x.shadow.geometry.dispose();
        x.shadow.geometry = new THREE.ShapeGeometry(
          new THREE.Shape(outline.map(([p, q]) => new THREE.Vector2(p, -q))),
        ).rotateX(-Math.PI / 2);
      }
      map.triggerRepaint();
    },
  };
}
export type Towers = ReturnType<typeof createTowers>;
