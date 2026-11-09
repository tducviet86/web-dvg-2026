import { t } from "@/i18n/server";
import type { SiteContent } from "@/lib/api/content";
import { mapBuildings } from "@/lib/map-buildings";
import { NEARBY_PLACES } from "@/lib/rental-map";
import { RentalMap } from "./rental-map";

/** The whole-screen map: /ban-do?du-an=…&toa=…&tang=…&can=… */
export function MapPage({
  content,
  filters,
}: {
  content: SiteContent;
  filters: Record<string, string | undefined>;
}) {
  return (
    <RentalMap
      full
      buildings={mapBuildings(content, { rentalsOnly: false })}
      places={NEARBY_PLACES.map((p) => t(p.name))}
      initial={{
        slug: filters["du-an"],
        tower: filters.toa,
        floor: filters.tang,
        unit: filters.can,
      }}
    />
  );
}
