import type { ProjectLocation } from "@/types";
import { t } from "@/i18n/server";
import { NEARBY_PLACES } from "@/lib/rental-map";
import { RentalMap, type MapBuilding } from "./rental-map";

/**
 * A project's place on the site's own 3D map, its tower chosen, with the way
 * there from where the visitor stands.
 */
export function ProjectMap({
  place,
  slug,
  name,
  address = "",
  buildings,
}: {
  place?: ProjectLocation;
  slug: string;
  /** The project's name, for the way there. */
  name: string;
  address?: string;
  /** The map's buildings (lib/map-buildings.ts). */
  buildings: MapBuilding[];
}) {
  // Without a place, the map still shows the project when it is drawn on it.
  if (!buildings.length || (!place && !buildings.some((b) => b.slug === slug)))
    return null;
  return (
    <section className="project-map" aria-label={t("Bản đồ và chỉ đường")}>
      <RentalMap
        buildings={buildings}
        places={NEARBY_PLACES.map((p) => t(p.name))}
        initial={{ slug }}
        route={
          place && {
            name: t(name),
            address: t(address),
            lat: place.lat,
            lng: place.lng,
          }
        }
      />
    </section>
  );
}
