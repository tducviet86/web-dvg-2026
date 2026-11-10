"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useT } from "@/i18n/client";
import type { Facing, Furniture, Interior, Rect } from "@/lib/interiors";

const EYE = 1.6;
const DOOR_HEAD = 2.1;
const COLOURS = {
  wall: "#f2eee7",
  ceiling: "#fbfaf7",
  oak: "#c49a6c",
  walnut: "#7b5338",
  white: "#f6f4f0",
  linen: "#ece6db",
  duvet: "#ddd5c8",
  throw: "#8e7a66",
  headboard: "#b7a790",
  sofa: "#c9bca9",
  cushion: "#a99a84",
  marble: "#eeebe5",
  black: "#1d1f21",
  steel: "#c3c7ca",
  chrome: "#d9dde0",
  fabric: "#b6aa98",
  rug: "#b9ae9d",
  leaf: "#5e7f4f",
  pot: "#d8d0c4",
  frame: "#5d6063",
  sheer: "#f5f1e8",
};

/** Room names said in the visitor's language. */
function useRoomName() {
  const t = useT();
  const names: Record<string, string> = {
    "Phòng khách": t("Phòng khách"),
    "Ban công": t("Ban công"),
    "Bếp và bàn ăn": t("Bếp và bàn ăn"),
    "Phòng ngủ 1": t("Phòng ngủ 1"),
    "Phòng ngủ 2": t("Phòng ngủ 2"),
    "Phòng ngủ 3": t("Phòng ngủ 3"),
    "WC phòng ngủ 1": t("WC phòng ngủ 1"),
    "WC chung": t("WC chung"),
    "Lối vào": t("Lối vào"),
    "Lô gia giặt phơi": t("Lô gia giặt phơi"),
    "WC 1": t("WC 1"),
    "WC phòng ngủ 2": t("WC phòng ngủ 2"),
    "WC 2": t("WC 2"),
    "Sảnh vào": t("Sảnh vào"),
    "Căn studio": t("Căn studio"),
    "Bếp căn studio": t("Bếp căn studio"),
    "WC căn studio": t("WC căn studio"),
    "Phòng ngủ": t("Phòng ngủ"),
    "Phòng khách và bếp": t("Phòng khách và bếp"),
    WC: t("WC"),
    "Phòng đa năng": t("Phòng đa năng"),
  };
  return (name: string) => names[name] ?? name;
}

const DIRECTION_NAMES = [
  "Bắc",
  "Đông Bắc",
  "Đông",
  "Đông Nam",
  "Nam",
  "Tây Nam",
  "Tây",
  "Tây Bắc",
];
const FACING_VECTORS: Record<Facing, [number, number]> = {
  "-x": [-1, 0],
  "+x": [1, 0],
  "-z": [0, -1],
  "+z": [0, 1],
};

/** Every piece is made of boxes, rounded where soft, in a few materials. */
function kit() {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (
    colour: string,
    rough = 0.8,
    metal = 0,
    extra: Partial<THREE.MeshStandardMaterialParameters> = {},
  ) => {
    const key = `${colour}/${rough}/${metal}/${JSON.stringify(extra)}`;
    let m = materials.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: colour,
        roughness: rough,
        metalness: metal,
        ...extra,
      });
      materials.set(key, m);
    }
    return m;
  };
  const group = new THREE.Group();
  /** A box by its corners in the room: x and z on the floor, y up. */
  const box = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    m: THREE.Material,
    round = 0,
  ) => {
    const w = Math.abs(x1 - x0),
      h = Math.abs(y1 - y0),
      d = Math.abs(z1 - z0);
    const r = Math.min(round, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    const geometry =
      r > 0.004
        ? new RoundedBoxGeometry(w, h, d, 3, r)
        : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const cylinder = (
    x: number,
    z: number,
    y0: number,
    y1: number,
    radius: number,
    m: THREE.Material,
    top = radius,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(top, radius, y1 - y0, 24),
      m,
    );
    mesh.position.set(x, (y0 + y1) / 2, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  return { mat, box, cylinder, group };
}
type Kit = ReturnType<typeof kit>;

/** A rectangle's span across and along a facing: the side the front is on. */
function frame(at: Rect, face: Facing) {
  const [x0, z0, x1, z1] = at;
  // u runs across the front, v from the back (0) to the front (1).
  const point = (u: number, v: number): [number, number] => {
    switch (face) {
      case "-z":
        return [x0 + u * (x1 - x0), z1 - v * (z1 - z0)];
      case "+z":
        return [x0 + u * (x1 - x0), z0 + v * (z1 - z0)];
      case "-x":
        return [x1 - v * (x1 - x0), z0 + u * (z1 - z0)];
      case "+x":
        return [x0 + v * (x1 - x0), z0 + u * (z1 - z0)];
    }
  };
  const across = face === "-z" || face === "+z" ? x1 - x0 : z1 - z0;
  const deep = face === "-z" || face === "+z" ? z1 - z0 : x1 - x0;
  /** A box between (u0, v0) and (u1, v1) of the rectangle, y0 to y1. */
  const part = (
    k: Kit,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    y0: number,
    y1: number,
    m: THREE.Material,
    round = 0,
  ) => {
    const [ax, az] = point(u0, v0);
    const [bx, bz] = point(u1, v1);
    return k.box(
      Math.min(ax, bx),
      y0,
      Math.min(az, bz),
      Math.max(ax, bx),
      y1,
      Math.max(az, bz),
      m,
      round,
    );
  };
  return { point, part, across, deep };
}

function addFurniture(k: Kit, f: Furniture) {
  const { mat } = k;
  const oak = mat(COLOURS.oak, 0.6);
  const white = mat(COLOURS.white, 0.45);
  const marble = mat(COLOURS.marble, 0.25);
  const steel = mat(COLOURS.steel, 0.3, 0.7);
  const chrome = mat(COLOURS.chrome, 0.15, 0.9);
  const black = mat(COLOURS.black, 0.4);
  const glow = mat("#fff2d6", 0.5, 0, {
    emissive: new THREE.Color("#ffd9a0"),
    emissiveIntensity: 0.9,
  });
  switch (f.kind) {
    case "bed": {
      // The foot faces away from the head.
      const foot = (
        { "-x": "+x", "+x": "-x", "-z": "+z", "+z": "-z" } as const
      )[f.head];
      const b = frame(f.at, foot);
      b.part(k, 0, 0.04, 1, 1, 0, 0.3, mat(COLOURS.walnut, 0.7), 0.03);
      b.part(
        k,
        0.02,
        0.06,
        0.98,
        0.99,
        0.3,
        0.52,
        mat(COLOURS.white, 0.9),
        0.06,
      );
      b.part(
        k,
        0.01,
        0.06,
        0.99,
        0.72,
        0.52,
        0.57,
        mat(COLOURS.duvet, 0.95),
        0.03,
      );
      b.part(k, 0.0, 0.5, 1, 0.68, 0.53, 0.6, mat(COLOURS.throw, 0.95), 0.02);
      b.part(
        k,
        -0.02,
        0,
        1.02,
        0.04,
        0,
        1.15,
        mat(COLOURS.headboard, 0.95),
        0.03,
      );
      b.part(
        k,
        0.08,
        0.06,
        0.46,
        0.2,
        0.52,
        0.68,
        mat(COLOURS.linen, 0.95),
        0.06,
      );
      b.part(
        k,
        0.54,
        0.06,
        0.92,
        0.2,
        0.52,
        0.68,
        mat(COLOURS.linen, 0.95),
        0.06,
      );
      break;
    }
    case "nightstand": {
      const b = frame(f.at, f.face);
      b.part(k, 0, 0, 1, 1, 0, 0.5, oak, 0.02);
      const [x, z] = b.point(0.5, 0.45);
      k.cylinder(x, z, 0.5, 0.78, 0.04, mat(COLOURS.pot, 0.5));
      k.cylinder(x, z, 0.78, 0.96, 0.15, glow, 0.1);
      break;
    }
    case "stool":
      k.cylinder(
        (f.at[0] + f.at[2]) / 2,
        (f.at[1] + f.at[3]) / 2,
        0,
        0.46,
        Math.min(f.at[2] - f.at[0], f.at[3] - f.at[1]) / 2,
        mat(COLOURS.fabric, 0.95),
      );
      break;
    case "wardrobe":
    case "cabinet": {
      const b = frame(f.at, f.face);
      const top = f.kind === "wardrobe" ? 2.4 : 2.2;
      b.part(k, 0, 0, 1, 1, 0, top, f.kind === "wardrobe" ? oak : white, 0.01);
      const doors = Math.max(1, Math.round(b.across / 0.5));
      for (let i = 1; i < doors; i++)
        b.part(
          k,
          i / doors - 0.003,
          0.99,
          i / doors + 0.003,
          1.01,
          0.05,
          top - 0.05,
          mat("#8a6a4c", 0.6),
        );
      for (let i = 0; i < doors; i++)
        b.part(
          k,
          (i + 0.5) / doors - 0.004,
          1,
          (i + 0.5) / doors + 0.004,
          1.04,
          0.9,
          1.3,
          chrome,
        );
      break;
    }
    case "tv":
    case "console": {
      const b = frame(f.at, f.face);
      const big = f.kind === "console";
      b.part(
        k,
        0.04,
        0,
        0.96,
        big ? 0.95 : 0.8,
        0,
        big ? 0.45 : 0.5,
        oak,
        0.02,
      );
      const half = (big ? 0.82 : 0.6) / b.across;
      b.part(
        k,
        0.5 - half,
        0.02,
        0.5 + half,
        0.08,
        big ? 0.95 : 1.0,
        big ? 1.85 : 1.68,
        black,
        0.01,
      );
      break;
    }
    case "shoes": {
      const b = frame(f.at, f.face);
      b.part(k, 0, 0, 1, 1, 0.15, 1.05, oak, 0.01);
      b.part(k, 0, 0, 1, 1, 1.05, 1.08, marble);
      break;
    }
    case "washer": {
      const b = frame(f.at, f.face);
      b.part(k, 0.02, 0.02, 0.98, 0.98, 0, 0.85, white, 0.03);
      const [x, z] = b.point(0.5, 1);
      const door = new THREE.Mesh(
        new THREE.CircleGeometry(0.18, 32),
        mat("#3b4d58", 0.15, 0.3),
      );
      door.position.set(
        x + FACING_VECTORS[f.face][0] * 0.005,
        0.42,
        z + FACING_VECTORS[f.face][1] * 0.005,
      );
      door.lookAt(
        x + FACING_VECTORS[f.face][0],
        0.42,
        z + FACING_VECTORS[f.face][1],
      );
      k.group.add(door);
      break;
    }
    case "laundry": {
      const b = frame(f.at, f.face);
      b.part(k, 0, 0, 1, 1, 0, 0.84, white, 0.01);
      b.part(k, 0.15, 0.2, 0.85, 0.85, 0.84, 0.86, steel);
      break;
    }
    case "fridge": {
      const b = frame(f.at, f.face);
      b.part(k, 0.03, 0.05, 0.97, 1, 0, 1.9, steel, 0.02);
      b.part(k, 0.03, 1, 0.97, 1.005, 1.2, 1.205, black);
      b.part(k, 0.08, 1, 0.12, 1.06, 0.85, 1.6, chrome);
      break;
    }
    case "kitchen": {
      const b = frame(f.at, f.face);
      // Base cabinets, worktop, splashback, wall cabinets.
      b.part(k, 0, 0, 1, 0.95, 0.1, 0.86, mat(COLOURS.oak, 0.55), 0.005);
      b.part(k, 0, 0, 1, 1, 0.86, 0.9, marble);
      b.part(k, 0, 0, 1, 0.03, 0.9, 1.5, mat("#e7e1d6", 0.3));
      b.part(k, 0, 0, 1, 0.55, 1.5, 2.3, white, 0.01);
      const along = (x: number) =>
        (x - (f.face === "-z" || f.face === "+z" ? f.at[0] : f.at[1])) /
        b.across;
      // A run with only the sink, or only the hob, has an empty span.
      const [s0, s1] = f.sink.map(along);
      if (s1 > s0) {
        b.part(k, s0, 0.25, s1, 0.8, 0.86, 0.905, steel);
        const [x, z] = b.point((s0 + s1) / 2, 0.15);
        k.cylinder(x, z, 0.9, 1.2, 0.015, chrome);
      }
      const [h0, h1] = f.hob.map(along);
      if (h1 > h0) {
        b.part(k, h0, 0.2, h1, 0.85, 0.9, 0.91, black);
        b.part(k, h0 + 0.05, 0, h1 - 0.05, 0.5, 1.55, 1.75, steel);
      }
      break;
    }
    case "island": {
      const [x0, z0, x1, z1] = f.at;
      k.box(x0 + 0.05, 0, z0 + 0.12, x1 - 0.05, 0.88, z1 - 0.05, oak, 0.01);
      k.box(x0, 0.88, z0, x1, 0.93, z1, marble, 0.01);
      for (const x of [x0 + 0.5, (x0 + x1) / 2, x1 - 0.5]) {
        k.cylinder(x, (z0 + z1) / 2, 1.75, 2.7, 0.006, black);
        k.cylinder(x, (z0 + z1) / 2, 1.55, 1.75, 0.12, glow, 0.06);
      }
      break;
    }
    case "table": {
      const [x0, z0, x1, z1] = f.at;
      k.box(x0, 0.72, z0, x1, 0.76, z1, mat(COLOURS.walnut, 0.5), 0.01);
      for (const [x, z] of [
        [x0 + 0.08, z0 + 0.08],
        [x1 - 0.08, z0 + 0.08],
        [x0 + 0.08, z1 - 0.08],
        [x1 - 0.08, z1 - 0.08],
      ])
        k.box(x - 0.025, 0, z - 0.025, x + 0.025, 0.72, z + 0.025, black);
      const cx = (x0 + x1) / 2;
      for (const z of [z0 + 0.45, (z0 + z1) / 2, z1 - 0.45]) {
        k.cylinder(cx, z, 1.6, 2.7, 0.006, black);
        k.cylinder(cx, z, 1.42, 1.6, 0.16, glow, 0.08);
      }
      break;
    }
    case "chair": {
      const b = frame(f.at, f.face);
      b.part(
        k,
        0.08,
        0.1,
        0.92,
        0.95,
        0.42,
        0.48,
        mat(COLOURS.fabric, 0.95),
        0.03,
      );
      b.part(
        k,
        0.08,
        0.02,
        0.92,
        0.12,
        0.48,
        0.9,
        mat(COLOURS.fabric, 0.95),
        0.03,
      );
      for (const [u, v] of [
        [0.12, 0.15],
        [0.88, 0.15],
        [0.12, 0.9],
        [0.88, 0.9],
      ])
        b.part(k, u - 0.02, v - 0.03, u + 0.02, v + 0.03, 0, 0.42, black);
      break;
    }
    case "coffee": {
      const [x0, z0, x1, z1] = f.at;
      k.box(x0, 0.36, z0, x1, 0.4, z1, marble, 0.02);
      k.box(
        x0 + 0.1,
        0,
        z0 + 0.1,
        x1 - 0.1,
        0.36,
        z1 - 0.1,
        mat(COLOURS.walnut, 0.6),
        0.02,
      );
      break;
    }
    case "rug": {
      const [x0, z0, x1, z1] = f.at;
      k.box(x0, 0, z0, x1, 0.012, z1, mat(COLOURS.rug, 1));
      break;
    }
    case "sofa": {
      const b = frame(
        f.at,
        ({ "-x": "+x", "+x": "-x", "-z": "+z", "+z": "-z" } as const)[f.back],
      );
      const fabric = mat(COLOURS.sofa, 0.95);
      b.part(k, 0, 0, 1, 1, 0.08, 0.42, fabric, 0.05);
      b.part(k, 0, 0, 1, 0.28, 0.42, 0.82, fabric, 0.06);
      b.part(
        k,
        0.04,
        0.3,
        0.96,
        0.98,
        0.42,
        0.5,
        mat(COLOURS.linen, 0.95),
        0.05,
      );
      const n = Math.max(1, Math.round(b.across / 0.7));
      for (let i = 0; i < n; i++)
        b.part(
          k,
          (i + 0.2) / n,
          0.22,
          (i + 0.8) / n,
          0.36,
          0.5,
          0.82,
          mat(COLOURS.cushion, 0.95),
          0.06,
        );
      break;
    }
    case "toilet": {
      const b = frame(f.at, f.face);
      b.part(k, 0.12, 0, 0.88, 0.18, 0.4, 1.0, white, 0.03);
      const [x, z] = b.point(0.5, 0.6);
      const bowl = k.cylinder(x, z, 0.12, 0.42, 0.2, white, 0.18);
      bowl.scale.set(1, 1, 1.25);
      if (f.face === "-x" || f.face === "+x") bowl.scale.set(1.25, 1, 1);
      break;
    }
    case "vanity": {
      const b = frame(f.at, f.face);
      b.part(k, 0, 0, 1, 1, 0.35, 0.82, oak, 0.01);
      b.part(k, 0, 0, 1, 1, 0.82, 0.86, marble);
      const [x, z] = b.point(0.5, 0.55);
      k.cylinder(x, z, 0.86, 0.98, 0.2, white, 0.22);
      const [fx, fz] = b.point(0.5, 0.1);
      k.cylinder(fx, fz, 0.86, 1.1, 0.012, chrome);
      b.part(k, 0.08, 0, 0.92, 0.02, 1.1, 1.85, mat("#dfe7ea", 0.08, 0.25));
      break;
    }
    case "shower": {
      const [x0, z0, x1, z1] = f.at;
      k.box(x0, 0, z0, x1, 0.02, z1, mat("#a9adb0", 0.4));
      const [hx, hz] = f.head;
      k.cylinder(hx, hz, 1.2, 2.15, 0.012, chrome);
      const cx = hx + (hx <= x0 + 0.01 ? 0.18 : hx >= x1 - 0.01 ? -0.18 : 0);
      const cz = hz + (hz <= z0 + 0.01 ? 0.18 : hz >= z1 - 0.01 ? -0.18 : 0);
      k.cylinder(cx, cz, 2.12, 2.14, 0.13, chrome);
      break;
    }
    case "plant": {
      const [x0, z0, x1, z1] = f.at;
      const x = (x0 + x1) / 2,
        z = (z0 + z1) / 2,
        r = Math.min(x1 - x0, z1 - z0) / 2;
      k.cylinder(x, z, 0, 0.42, r * 0.7, mat(COLOURS.pot, 0.6), r * 0.85);
      for (const [dx, dy, dz, s] of [
        [0, 0.75, 0, 0.32],
        [0.12, 0.98, 0.05, 0.22],
        [-0.1, 1.08, -0.06, 0.2],
        [0.03, 1.25, 0.08, 0.16],
      ]) {
        const leaf = new THREE.Mesh(
          new THREE.IcosahedronGeometry(s, 1),
          mat(COLOURS.leaf, 0.9),
        );
        leaf.position.set(x + dx, dy, z + dz);
        leaf.castShadow = true;
        k.group.add(leaf);
      }
      break;
    }
    case "lamp": {
      const x = (f.at[0] + f.at[2]) / 2,
        z = (f.at[1] + f.at[3]) / 2;
      k.cylinder(x, z, 0, 0.03, 0.14, black);
      k.cylinder(x, z, 0.03, 1.45, 0.012, black);
      k.cylinder(x, z, 1.45, 1.7, 0.2, glow, 0.15);
      break;
    }
  }
}

/** The architecture: floor (the layout), ceiling, walls, door heads, glass. */
function addRooms(k: Kit, unit: Interior, floor: THREE.Texture) {
  const { mat, box } = k;
  const wall = mat(COLOURS.wall, 0.9);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(unit.width, unit.depth),
    new THREE.MeshStandardMaterial({ map: floor, roughness: 0.55 }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(unit.width / 2, 0, unit.depth / 2);
  plane.receiveShadow = true;
  plane.name = "floor";
  k.group.add(plane);
  // The ceiling keeps the sun out but for the windows.
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(unit.width, unit.depth),
    mat(COLOURS.ceiling, 1, 0, { side: THREE.DoubleSide }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.castShadow = true;
  ceiling.position.set(unit.width / 2, unit.ceiling, unit.depth / 2);
  k.group.add(ceiling);
  // Walls hide what is behind them: the arrows to rooms out of sight.
  const solid: THREE.Mesh[] = [];
  for (const [x0, z0, x1, z1] of unit.walls)
    solid.push(box(x0, 0, z0, x1, unit.ceiling, z1, wall));
  for (const [x0, z0, x1, z1] of unit.doors)
    box(x0, DOOR_HEAD, z0, x1, unit.ceiling, z1, wall);
  for (const [x0, z0, x1, z1] of unit.windows) {
    box(x0, 0, z0, x1, 0.9, z1, wall);
    box(x0, DOOR_HEAD, z0, x1, unit.ceiling, z1, wall);
    box(
      x0,
      0.9,
      z0,
      x1,
      DOOR_HEAD,
      z1,
      mat("#bcd3da", 0.05, 0.1, { transparent: true, opacity: 0.35 }),
    );
  }
  const glass = mat("#cfe3ea", 0.05, 0.1, {
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const metal = mat(COLOURS.frame, 0.4, 0.6);
  const sheer = mat(COLOURS.sheer, 1, 0, {
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  for (const [x0, z0, x1, z1] of unit.glass) {
    const pane = box(x0, 0, z0, x1, unit.ceiling, z1, glass);
    pane.castShadow = false;
    const alongX = x1 - x0 > z1 - z0;
    const length = alongX ? x1 - x0 : z1 - z0;
    const n = Math.max(1, Math.round(length / 1.2));
    for (let i = 0; i <= n; i++) {
      const s = (alongX ? x0 : z0) + (i * length) / n;
      if (alongX) box(s - 0.025, 0, z0, s + 0.025, unit.ceiling, z1, metal);
      else box(x0, 0, s - 0.025, x1, unit.ceiling, s + 0.025, metal);
    }
    if (alongX) box(x0, 0, z0, x1, 0.06, z1, metal);
    // Sheer curtains gathered at both ends, inside the glass.
    if (alongX && z0 < 0.2) {
      box(
        x0,
        0.02,
        z1 + 0.05,
        x0 + 0.38,
        unit.ceiling - 0.04,
        z1 + 0.16,
        sheer,
        0.04,
      ).castShadow = false;
      box(
        x1 - 0.38,
        0.02,
        z1 + 0.05,
        x1,
        unit.ceiling - 0.04,
        z1 + 0.16,
        sheer,
        0.04,
      ).castShadow = false;
    }
  }
  for (const [x0, z0, x1, z1] of unit.railings) {
    box(x0, 0, z0, x1, 1.1, z1, glass).castShadow = false;
    box(x0, 1.08, z0 - 0.02, x1, 1.12, z1 + 0.02, metal);
  }
  for (const [x0, z0, x1, z1] of unit.screens) {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(length, 2.0, 0.012),
      glass,
    );
    pane.position.set((x0 + x1) / 2, 1.0, (z0 + z1) / 2);
    pane.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    k.group.add(pane);
  }
  return solid;
}

/** A seeded number in [0, 1): the same city every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * The view out: ground at the floor's height below, the Hàn river to the west
 * with Hải Châu beyond it and the Dragon Bridge to the north, the Rio's low
 * blocks and the city around. Placed by compass from the unit's north.
 */
function addOutside(scene: THREE.Scene, unit: Interior, height: number) {
  const [nx, nz] = FACING_VECTORS[unit.north];
  const [ex, ez] = [-nz, nx];
  const cx = unit.width / 2,
    cz = unit.depth / 2;
  const at = (north: number, east: number) =>
    [cx + nx * north + ex * east, cz + nz * north + ez * east] as const;
  const outside = new THREE.Group();
  const flat = (colour: string) =>
    new THREE.MeshLambertMaterial({ color: colour });
  // The sky: deeper blue overhead, pale at the horizon.
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  if (c) {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#7fb2d8");
    g.addColorStop(0.45, "#b9d6ea");
    g.addColorStop(0.5, "#e4edf1");
    g.addColorStop(1, "#e4edf1");
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 256);
  }
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3500, 32, 16),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      side: THREE.BackSide,
      fog: false,
    }),
  );
  sky.position.set(cx, -height, cz);
  outside.add(sky);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    flat("#c9c3b4"),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx, -height, cz);
  outside.add(ground);
  // The river, 130 to 560 m west, running north–south.
  const [rx, rz] = at(0, -345);
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 6000),
    flat("#5e8ea3"),
  );
  river.rotation.x = -Math.PI / 2;
  river.rotation.z = Math.atan2(-nx, -nz);
  river.position.set(rx, -height + 0.2, rz);
  outside.add(river);
  /** A strip running north–south, `from` to `to` metres east (west < 0). */
  const strip = (from: number, to: number, colour: string, lift: number) => {
    const [sx, sz] = at(0, (from + to) / 2);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(to - from, 6000),
      flat(colour),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.atan2(-nx, -nz);
    mesh.position.set(sx, -height + lift, sz);
    outside.add(mesh);
  };
  // Trần Hưng Đạo below, the riverside park and walk.
  strip(-34, -14, "#6f7275", 0.15);
  strip(-130, -112, "#8fae7a", 0.15);
  strip(-112, -106, "#d8d2c4", 0.16);
  const block = (
    north: number,
    east: number,
    w: number,
    d: number,
    h: number,
    colour: string,
  ) => {
    const [x, z] = at(north, east);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(colour));
    mesh.position.set(x, -height + h / 2, z);
    mesh.rotation.y = Math.atan2(nx, nz);
    outside.add(mesh);
  };
  const random = seeded(11);
  const tones = ["#e7e1d6", "#d9d4ca", "#efe9df", "#cfd3d6", "#e2d8c8"];
  // Hải Châu across the river: taller blocks.
  for (let i = 0; i < 140; i++)
    block(
      -1200 + random() * 2600,
      -600 - random() * 900,
      20 + random() * 30,
      20 + random() * 30,
      15 + random() ** 2 * 120,
      tones[i % 5],
    );
  // The Rio's shophouses between the road and the river.
  for (let i = 0; i < 18; i++)
    block(-90 + i * 12, -60 - (i % 3) * 18, 10, 14, 20, "#e9dcc8");
  // The city east, north and south.
  for (let i = 0; i < 260; i++) {
    const north = -1500 + random() * 3000,
      east = 40 + random() * 1400;
    block(
      north,
      east,
      10 + random() * 25,
      10 + random() * 25,
      8 + random() ** 3 * 70,
      tones[i % 5],
    );
  }
  // T2 beside us, and the Dragon Bridge over the river to the north.
  block(52, 0, 38, 26, 85, "#eceae4");
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(440, 3, 34),
    flat("#d9d6cf"),
  );
  const [bx, bz] = at(320, -345);
  deck.position.set(bx, -height + 10, bz);
  deck.rotation.y = Math.atan2(-ez, ex);
  outside.add(deck);
  for (let i = 0; i < 5; i++) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(40, 1.6, 8, 24, Math.PI),
      flat("#e6b43c"),
    );
    const [ax, az] = at(320, -170 - i * 70);
    arch.position.set(ax, -height + 10, az);
    arch.rotation.y = Math.atan2(-ez, ex);
    outside.add(arch);
  }
  scene.add(outside);
}

/**
 * Inside a unit in 3D: stand at eye height, drag to look around, tap the floor
 * to walk there or pick a room. The windows look out the way the unit faces,
 * at the floor's height.
 */
export default function Interior3D({
  unit,
  title,
  height,
  onClose,
}: {
  unit: Interior;
  title: string;
  /** The floor's height above the ground, in metres. */
  height: number;
  onClose: () => void;
}) {
  const t = useT();
  const roomName = useRoomName();
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({
    heading: 0,
    plan: 0,
    at: unit.rooms[0].at as [number, number],
  });
  const go = useRef<(at: [number, number], look?: Facing) => void>(() => {});
  /** The arrows on the floor to the other rooms, placed each frame. */
  const spots = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.append(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#cfe2ef");
    scene.fog = new THREE.Fog("#d6e4ee", 400, 2600);
    const camera = new THREE.PerspectiveCamera(
      72,
      el.clientWidth / el.clientHeight,
      0.05,
      4000,
    );

    // Daylight from the sky and the light floor; a soft fill for the ceiling.
    scene.add(new THREE.HemisphereLight("#f4f7fb", "#efe7da", 1.35));
    scene.add(new THREE.AmbientLight("#fff8ee", 0.45));
    // Afternoon sun from the west-south-west, through the windows.
    const [nx, nz] = FACING_VECTORS[unit.north];
    const [ex, ez] = [-nz, nx];
    const sun = new THREE.DirectionalLight("#fff1dc", 2.2);
    sun.position.set(
      unit.width / 2 - ex * 30 - nx * 10,
      22,
      unit.depth / 2 - ez * 30 - nz * 10,
    );
    sun.target.position.set(unit.width / 2, 0, unit.depth / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -9,
      right: 9,
      top: 9,
      bottom: -9,
      near: 1,
      far: 80,
    });
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);
    for (const room of unit.rooms) {
      const lamp = new THREE.PointLight("#ffe2bd", 1.2, 6, 1.5);
      lamp.position.set(room.at[0], unit.ceiling - 0.25, room.at[1]);
      scene.add(lamp);
    }

    const k = kit();
    const texture = new THREE.TextureLoader().load(unit.floor);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // A mirrored unit: its layout read from the other side.
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(unit.flipX ? -1 : 1, unit.flipZ ? -1 : 1);
    texture.offset.set(unit.flipX ? 1 : 0, unit.flipZ ? 1 : 0);
    const solid = addRooms(k, unit, texture);
    for (const f of unit.furniture) addFurniture(k, f);
    scene.add(k.group);
    addOutside(scene, unit, height);

    // Looking: yaw about y (0 looks toward −z), pitch up and down.
    let yaw = 0;
    let pitch = -0.05;
    const position = new THREE.Vector3(
      unit.rooms[0].at[0],
      EYE,
      unit.rooms[0].at[1],
    );
    let target: THREE.Vector3 | null = null;
    const facingYaw = (f: Facing) =>
      ({ "-z": 0, "+x": -Math.PI / 2, "+z": Math.PI, "-x": Math.PI / 2 })[f];
    yaw = facingYaw(unit.rooms[0].look);
    go.current = (at, look) => {
      target = new THREE.Vector3(at[0], EYE, at[1]);
      if (look) yaw = facingYaw(look);
    };

    const floorMesh = k.group.getObjectByName("floor");
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number; yaw: number; pitch: number } | null =
      null;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, yaw, pitch };
      moved = false;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x,
        dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 4) moved = true;
      yaw = down.yaw + dx * 0.005;
      pitch = Math.max(-1.3, Math.min(1.3, down.pitch + dy * 0.005));
    };
    const onUp = (e: PointerEvent) => {
      if (down && !moved && floorMesh) {
        const box = renderer.domElement.getBoundingClientRect();
        ray.far = Infinity;
        ray.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - box.left) / box.width) * 2 - 1,
            -((e.clientY - box.top) / box.height) * 2 + 1,
          ),
          camera,
        );
        const hit = ray.intersectObjects([
          floorMesh,
          ...k.group.children.filter((c) => c !== floorMesh),
        ])[0];
        if (hit?.object === floorMesh) {
          const p = hit.point;
          target = new THREE.Vector3(
            Math.max(0.3, Math.min(unit.width - 0.3, p.x)),
            EYE,
            Math.max(0.3, Math.min(unit.depth - 0.3, p.z)),
          );
        }
      }
      down = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.fov = Math.max(40, Math.min(85, camera.fov + e.deltaY * 0.03));
      camera.updateProjectionMatrix();
    };
    const keys = new Set<string>();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.type === "keydown") keys.add(e.key.toLowerCase());
      else keys.delete(e.key.toLowerCase());
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);

    let frame = 0;
    let last = performance.now();
    let shown = { heading: -1, x: -1, z: -1 };
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const walk = new THREE.Vector3();
      if (keys.has("w") || keys.has("arrowup")) walk.add(forward);
      if (keys.has("s") || keys.has("arrowdown")) walk.sub(forward);
      if (keys.has("d")) walk.add(right);
      if (keys.has("a")) walk.sub(right);
      if (keys.has("arrowleft")) yaw += dt * 1.6;
      if (keys.has("arrowright")) yaw -= dt * 1.6;
      if (walk.lengthSq()) {
        target = null;
        position.addScaledVector(walk.normalize(), dt * 1.4);
      }
      if (target) {
        position.lerp(target, Math.min(1, dt * 4));
        if (position.distanceTo(target) < 0.02) target = null;
      }
      position.x = Math.max(0.25, Math.min(unit.width - 0.25, position.x));
      position.z = Math.max(0.25, Math.min(unit.depth - 0.25, position.z));
      camera.position.copy(position);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      renderer.render(scene, camera);
      // Arrows to the rooms in sight, as in the 360° tours.
      const box = renderer.domElement.getBoundingClientRect();
      unit.rooms.forEach((room, i) => {
        const el = spots.current[i];
        if (!el) return;
        const spot = new THREE.Vector3(room.at[0], 0.05, room.at[1]);
        const away = Math.hypot(
          room.at[0] - position.x,
          room.at[1] - position.z,
        );
        const p = spot.clone().project(camera);
        let shown =
          away > 0.8 && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
        if (shown) {
          const to = spot.clone().sub(camera.position);
          ray.set(camera.position, to.clone().normalize());
          ray.far = to.length() - 0.15;
          shown = ray.intersectObjects(solid, false).length === 0;
        }
        el.hidden = !shown;
        if (shown)
          el.style.transform = `translate(${((p.x + 1) / 2) * box.width}px, ${((1 - p.y) / 2) * box.height}px) translate(-50%, -50%)`;
      });
      // Compass: the looking direction against the unit's north.
      const north = forward.x * nx + forward.z * nz;
      const east = forward.x * ex + forward.z * ez;
      const deg = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
      if (
        Math.abs(deg - shown.heading) > 2 ||
        Math.hypot(position.x - shown.x, position.z - shown.z) > 0.05
      ) {
        shown = { heading: deg, x: position.x, z: position.z };
        setView({
          heading: Math.round(deg),
          // On the plan an arrow pointing up is turned to the looking way.
          plan: (Math.atan2(forward.z, forward.x) * 180) / Math.PI + 90,
          at: [position.x, position.z],
        });
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [unit, height, onClose]);

  const direction = DIRECTION_NAMES[Math.round(view.heading / 45) % 8];
  const river = direction.includes("Tây");
  return (
    <div className="in3d" role="dialog" aria-label={title}>
      <div ref={stage} className="in3d-stage" />
      <header className="in3d-head">
        <button type="button" className="in3d-close" onClick={onClose}>
          <X size={16} aria-hidden="true" />
          {t("Thoát")}
        </button>
        <div>
          <b>{title}</b>
          <small>
            {t("Đang nhìn hướng {dir}", { dir: t(direction) })}
            {river && ` · ${t("sông Hàn")}`}
          </small>
        </div>
      </header>
      {unit.rooms.map((room, i) => (
        <button
          key={room.name}
          ref={(el) => {
            spots.current[i] = el;
          }}
          type="button"
          className="in3d-spot"
          hidden
          aria-label={roomName(room.name)}
          onClick={() => go.current(room.at, room.look)}
        >
          <span>{roomName(room.name)}</span>
        </button>
      ))}
      <nav className="in3d-rooms" aria-label={t("Các phòng")}>
        {unit.rooms.map((room) => (
          <button
            key={room.name}
            type="button"
            onClick={() => go.current(room.at, room.look)}
          >
            {roomName(room.name)}
          </button>
        ))}
      </nav>
      <div
        className="in3d-plan"
        style={{ aspectRatio: `${unit.width} / ${unit.depth}` }}
        aria-hidden="true"
      >
        <span
          style={{
            backgroundImage: `url(${unit.floor})`,
            transform: `scale(${unit.flipX ? -1 : 1}, ${unit.flipZ ? -1 : 1})`,
          }}
        />
        <i
          style={{
            left: `${(view.at[0] / unit.width) * 100}%`,
            top: `${(view.at[1] / unit.depth) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${view.plan}deg)`,
          }}
        />
      </div>
      <p className="in3d-hint">
        {t(
          "Kéo để nhìn quanh · Bấm lên sàn để đi tới · Nội thất minh hoạ theo bản vẽ",
        )}
      </p>
    </div>
  );
}
