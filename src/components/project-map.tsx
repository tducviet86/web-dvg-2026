import { MapPin, ArrowUpRight } from "lucide-react";
import { projectLocations } from "@/data/project-locations";

export function ProjectMap({ projectId }: { projectId: string }) {
  const place = projectLocations[projectId];
  if (!place) return null;
  return (
    <div className="rental-map">
      <iframe
        title={`Bản đồ ${place.label}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        src={`https://www.google.com/maps?q=${place.lat},${place.lng}&z=16&output=embed`}
      />
      <a href={place.url} target="_blank" rel="noopener noreferrer">
        <MapPin size={20} />
        <span>
          <strong>{place.label}</strong>
          <small>Mở địa điểm & chỉ đường trên Google Maps</small>
        </span>
        <ArrowUpRight size={19} />
      </a>
    </div>
  );
}
