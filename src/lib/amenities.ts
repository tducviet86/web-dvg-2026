import {
  AirVent,
  AlarmSmoke,
  ArrowUpDown,
  Bath,
  BedDouble,
  Blinds,
  BriefcaseMedical,
  Cctv,
  ConciergeBell,
  CookingPot,
  Coffee,
  Dumbbell,
  FireExtinguisher,
  GlassWater,
  KeyRound,
  Laptop,
  Lock,
  Microwave,
  PawPrint,
  Refrigerator,
  Shirt,
  ShieldCheck,
  ShowerHead,
  Sofa,
  Sparkles,
  SquareParking,
  Sun,
  Trees,
  Tv,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
  Bike,
  Baby,
  Archive,
  Building2,
  Sailboat,
  type LucideIcon,
} from "lucide-react";

/**
 * What a unit offers, ticked in Admin and shown on the unit page. Units store
 * the stable keys (e.g. "bathtub"), so labels and icons can change and be
 * translated without touching the data.
 */
export type Amenity = { key: string; label: string; icon: LucideIcon };
export type AmenityGroup = { title: string; items: Amenity[] };

export const AMENITY_GROUPS: AmenityGroup[] = [
  {
    title: "Phòng tắm",
    items: [
      { key: "bathtub", label: "Bồn tắm", icon: Bath },
      { key: "hot-water", label: "Nước nóng", icon: ShowerHead },
      { key: "hair-dryer", label: "Máy sấy tóc", icon: Wind },
      { key: "towels", label: "Khăn tắm", icon: Archive },
    ],
  },
  {
    title: "Phòng ngủ và giặt là",
    items: [
      { key: "washer", label: "Máy giặt", icon: WashingMachine },
      { key: "dryer", label: "Máy sấy quần áo", icon: Wind },
      { key: "bed-linens", label: "Chăn ga gối", icon: BedDouble },
      { key: "wardrobe", label: "Tủ quần áo", icon: Shirt },
      { key: "iron", label: "Bàn là", icon: Shirt },
      { key: "blackout-curtains", label: "Rèm chắn sáng", icon: Blinds },
    ],
  },
  {
    title: "Bếp và phòng ăn",
    items: [
      { key: "kitchen", label: "Bếp nấu", icon: CookingPot },
      { key: "fridge", label: "Tủ lạnh", icon: Refrigerator },
      { key: "microwave", label: "Lò vi sóng", icon: Microwave },
      { key: "cookware", label: "Dụng cụ nấu ăn", icon: Utensils },
      { key: "dining-table", label: "Bàn ăn", icon: Utensils },
      { key: "kettle", label: "Ấm đun nước", icon: Coffee },
      { key: "water-dispenser", label: "Máy lọc nước", icon: GlassWater },
    ],
  },
  {
    title: "Phòng khách và làm việc",
    items: [
      { key: "sofa", label: "Sofa", icon: Sofa },
      { key: "tv", label: "TV", icon: Tv },
      { key: "wifi", label: "Wi-Fi", icon: Wifi },
      { key: "workspace", label: "Bàn làm việc", icon: Laptop },
    ],
  },
  {
    title: "Điều hòa và thông gió",
    items: [
      { key: "air-conditioning", label: "Điều hòa", icon: AirVent },
      { key: "balcony", label: "Ban công", icon: Sun },
      { key: "sea-view", label: "View biển", icon: Waves },
      { key: "river-view", label: "View sông", icon: Sailboat },
      { key: "city-view", label: "View thành phố", icon: Building2 },
    ],
  },
  {
    title: "An ninh và an toàn",
    items: [
      { key: "security-24-7", label: "Bảo vệ 24/7", icon: ShieldCheck },
      { key: "cctv", label: "Camera an ninh", icon: Cctv },
      { key: "smart-lock", label: "Khóa vân tay / thẻ từ", icon: Lock },
      { key: "self-check-in", label: "Tự nhận phòng", icon: KeyRound },
      { key: "smoke-alarm", label: "Báo khói", icon: AlarmSmoke },
      { key: "fire-extinguisher", label: "Bình chữa cháy", icon: FireExtinguisher },
      { key: "first-aid", label: "Bộ sơ cứu", icon: BriefcaseMedical },
    ],
  },
  {
    title: "Tiện ích tòa nhà",
    items: [
      { key: "elevator", label: "Thang máy", icon: ArrowUpDown },
      { key: "pool", label: "Hồ bơi", icon: Waves },
      { key: "gym", label: "Phòng gym", icon: Dumbbell },
      { key: "car-parking", label: "Chỗ đỗ ô tô", icon: SquareParking },
      { key: "motorbike-parking", label: "Chỗ để xe máy", icon: Bike },
      { key: "reception", label: "Lễ tân", icon: ConciergeBell },
      { key: "cleaning", label: "Dọn phòng định kỳ", icon: Sparkles },
      { key: "garden", label: "Sân vườn / công viên", icon: Trees },
    ],
  },
  {
    title: "Gia đình và thú cưng",
    items: [
      { key: "kid-friendly", label: "Phù hợp trẻ nhỏ", icon: Baby },
      { key: "pets-allowed", label: "Cho phép thú cưng", icon: PawPrint },
    ],
  },
];

const BY_KEY = new Map(
  AMENITY_GROUPS.flatMap((g) => g.items.map((item) => [item.key, item])),
);
export const amenityOf = (key: string) => BY_KEY.get(key);

/**
 * A unit's amenities grouped for display, in catalogue order. Free-text
 * entries saved before the catalogue existed are kept under "Khác".
 */
export function groupAmenities(keys: string[]): AmenityGroup[] {
  const chosen = new Set(keys);
  const groups = AMENITY_GROUPS.map((g) => ({
    title: g.title,
    items: g.items.filter((item) => chosen.has(item.key)),
  })).filter((g) => g.items.length);
  const other = keys.filter((k) => !BY_KEY.has(k) && k.trim());
  if (other.length)
    groups.push({
      title: "Khác",
      items: other.map((label) => ({ key: label, label, icon: Sparkles })),
    });
  return groups;
}
