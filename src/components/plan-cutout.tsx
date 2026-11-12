import { PLAN_OUTLINES, type UnitOutline } from "@/lib/floor-plan-outlines";

/** The unit's own sharp picture, cut from the developer's drawing. */
const unitPicture = (plan: string, unit: string) =>
  plan.replace(
    /mat-bang-([^/]+)\.webp$/,
    `mat-bang-can/$1/${unit.toLowerCase()}.webp`,
  );

/** A unit cut out of its floor plan along its real outline, not a rectangle. */
export function PlanCutout({
  image,
  unit,
  outline,
  label,
}: {
  /** The floor plan's image. */
  image: string;
  unit: string;
  outline: UnitOutline;
  label: string;
}) {
  const xs = outline.points.map((q) => q[0]);
  const ys = outline.points.map((q) => q[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left;
  const height = Math.max(...ys) - top;
  const points = outline.points.map((q) => q.join(",")).join(" ");
  const clip = `plan-cut-${unit}`;
  // Drawings with no picture per unit (named otherwise than "mat-bang-…").
  const whole =
    unitPicture(image, unit) === image
      ? PLAN_OUTLINES[image.split("/").pop() ?? ""]
      : undefined;
  return (
    <svg
      className="plan-cut-shape"
      viewBox={`${left} ${top} ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <clipPath id={clip}>
        <polygon points={points} />
      </clipPath>
      {/* The unit's own picture where one was cut, else the whole drawing
          in place (the view box shows the unit). */}
      {whole ? (
        <image
          href={image}
          x={0}
          y={0}
          width={whole.width}
          height={whole.height}
          clipPath={`url(#${clip})`}
        />
      ) : (
        <image
          href={unitPicture(image, unit)}
          x={left}
          y={top}
          width={width}
          height={height}
          preserveAspectRatio="none"
          clipPath={`url(#${clip})`}
        />
      )}
      <polygon className="plan-cut-edge" points={points} />
    </svg>
  );
}

/** "64,87 m²" */
export const planArea = (m2: number) =>
  `${m2.toLocaleString("vi-VN", { minimumFractionDigits: 2 })} m²`;
