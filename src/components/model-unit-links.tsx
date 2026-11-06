/** @jsxImportSource @/i18n/jsx */
import Link from "@/components/page-navigation";
import { hasRooms, roomsLabel } from "@/lib/property-groups";
import { unitRef } from "@/lib/utils";
import type { Property } from "@/types";

/**
 * Every model apartment as a plain link, grouped by tower. The interactive
 * floor plans only reach a unit after clicks, so this list is what lets search
 * engines (and anyone in a hurry) get to each one.
 */
export function ModelUnitLinks({ units }: { units: Property[] }) {
  const towers = new Map<string, Property[]>();
  const models = units
    .filter((u) => u.floorNote)
    .sort((a, b) =>
      unitRef(a).localeCompare(unitRef(b), "en", { numeric: true }),
    );
  for (const unit of models) {
    const tower = unit.tower || "";
    towers.set(tower, [...(towers.get(tower) ?? []), unit]);
  }
  if (!towers.size) return null;
  return (
    <div className="model-unit-links">
      {[...towers].map(([tower, list]) => (
        <section key={tower}>
          {tower && <h3>{`Tòa ${tower}`}</h3>}
          <ul>
            {list.map((unit) => (
              <li key={unit.id}>
                <Link href={`/mua-ban/${unit.slug}`}>
                  <strong>{unitRef(unit)}</strong>
                  <small>{hasRooms(unit) ? roomsLabel(unit) : unit.type}</small>
                  <small>{unit.area} m²</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
