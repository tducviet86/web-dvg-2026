import type { UnitOutline } from "@/lib/floor-plan-outlines";

/** A unit cut out of its floor plan along its real outline, not a rectangle. */
export function PlanCutout({
  image,
  width,
  height,
  outline,
  id,
  label,
}: {
  image: string;
  width: number;
  height: number;
  outline: UnitOutline;
  /** Unique on the page. */
  id: string;
  label: string;
}) {
  const xs = outline.points.map((q) => q[0]);
  const ys = outline.points.map((q) => q[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const points = outline.points.map((q) => q.join(",")).join(" ");
  const clip = `plan-cut-${id}`;
  return (
    <svg
      className="plan-cut-shape"
      viewBox={`${left} ${top} ${Math.max(...xs) - left} ${Math.max(...ys) - top}`}
      role="img"
      aria-label={label}
    >
      <clipPath id={clip}>
        <polygon points={points} />
      </clipPath>
      <image
        href={image}
        width={width}
        height={height}
        clipPath={`url(#${clip})`}
      />
      <polygon className="plan-cut-edge" points={points} />
    </svg>
  );
}

/** "64,87 m²" */
export const planArea = (m2: number) =>
  `${m2.toLocaleString("vi-VN", { minimumFractionDigits: 2 })} m²`;
