/** @jsxImportSource @/i18n/jsx */
import { href } from "@/i18n/server";
import { Search, RotateCcw } from "lucide-react";
import type { SiteContent } from "@/lib/api/content";
import type { Filters } from "@/lib/filter";
import Link from "@/components/page-navigation";
export function PropertySearch({
  expanded = false,
  values = {},
  content,
}: {
  expanded?: boolean;
  values?: Filters;
  content: Pick<SiteContent, "projects" | "properties">;
}) {
  const { projects, properties } = content;
  const select = (name: string, label: string, options: [string, string][]) => (
    <label key={name}>
      {label}
      <select name={name} defaultValue={values[name] || ""}>
        <option value="">{name === "price" ? "Mọi mức giá" : "Tất cả"}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form
      key={JSON.stringify(values)}
      action={href("/cho-thue")}
      className={expanded ? "filter-form" : "search-panel"}
    >
      <div className="search-fields">
        {expanded && (
          <label>
            Từ khóa
            <input
              name="q"
              defaultValue={values.q}
              placeholder="Tên căn hộ, khu vực…"
            />
          </label>
        )}
        {select(
          "location",
          "Khu vực",
          [...new Set(properties.map((p) => p.location))].map((x) => [x, x]),
        )}
        {select(
          "project",
          "Dự án",
          projects
            .filter((p) => properties.some((r) => r.projectId === p.id))
            .map((p) => [p.slug, p.name]),
        )}
        {select(
          "type",
          "Loại căn hộ",
          [...new Set(properties.map((p) => p.type))].map((x) => [x, x]),
        )}
        {select("price", "Ngân sách / tháng", [
          ["10", "Dưới 10 triệu"],
          ["15", "Đến 15 triệu"],
          ["20", "Đến 20 triệu"],
          ["25", "Đến 25 triệu"],
        ])}
        {select("bedrooms", "Phòng ngủ", [
          ["0", "Studio"],
          ["1", "1 phòng ngủ"],
          ["2", "2 phòng ngủ"],
        ])}
        {expanded && (
          <>
            {select("area", "Diện tích", [
              ["40", "Từ 40 m²"],
              ["60", "Từ 60 m²"],
              ["90", "Từ 90 m²"],
            ])}
            {select(
              "furniture",
              "Nội thất",
              ["Đầy đủ nội thất", "Nội thất cơ bản"].map((x) => [x, x]),
            )}
            {select(
              "status",
              "Tình trạng",
              ["Còn trống", "Đã cho thuê"].map((x) => [x, x]),
            )}
            {select("sort", "Sắp xếp", [
              ["price-asc", "Giá tăng dần"],
              ["price-desc", "Giá giảm dần"],
              ["area", "Diện tích lớn nhất"],
            ])}
          </>
        )}
      </div>
      <button className="button button-primary" type="submit">
        <Search size={19} />
        {expanded ? "Áp dụng bộ lọc" : "Tìm không gian sống"}
      </button>
      {expanded && (
        <Link href="/cho-thue" className="text-link">
          <RotateCcw size={15} />
          Xóa bộ lọc
        </Link>
      )}
    </form>
  );
}
