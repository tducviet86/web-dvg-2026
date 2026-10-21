import { Search, SlidersHorizontal } from "lucide-react";
import { projects, properties } from "@/data";
import type { Filters } from "@/lib/filter";
import { RentalSearchForm } from "./rental-search-form";
export function RentalSearch({
  values,
  action = "/cho-thue",
  projectId,
}: {
  values: Filters;
  action?: string;
  projectId?: string;
}) {
  const select = (
    name: string,
    label: string,
    options: [string, string][],
    placeholder = "Tất cả",
  ) => (
    <label key={name}>
      {label}
      <select name={name} defaultValue={values[name] || ""}>
        <option value="">{placeholder}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <RentalSearchForm key={JSON.stringify(values)} action={action}>
      <div className="rental-search-primary">
        <label>
          Tìm căn hộ
          <input
            name="q"
            defaultValue={values.q}
            placeholder="Tên căn, mã căn, dự án…"
          />
        </label>
        {!projectId &&
          select(
            "project",
            "Dự án",
            projects
              .filter((p) => properties.some((r) => r.projectId === p.id))
              .map((p) => [p.id, p.name]),
            "Tất cả dự án",
          )}
        {select(
          "price",
          "Ngân sách / tháng",
          [
            ["10", "Đến 10 triệu"],
            ["15", "Đến 15 triệu"],
            ["20", "Đến 20 triệu"],
            ["25", "Đến 25 triệu"],
          ],
          "Mọi mức giá",
        )}
        {select("bedrooms", "Phòng ngủ", [
          ["0", "Studio"],
          ["1", "1 phòng ngủ"],
          ["2", "2 phòng ngủ"],
        ])}
        <button type="submit" className="button button-primary">
          <Search size={19} /> Tìm căn hộ
        </button>
      </div>
      <details
        className="rental-search-more"
        open={
          !!(
            values.location ||
            values.type ||
            values.area ||
            values.furniture ||
            values.status ||
            values.sort
          )
        }
      >
        <summary>
          <SlidersHorizontal size={16} /> Bộ lọc chi tiết & sắp xếp
          <span>+</span>
        </summary>
        <div className="rental-search-extra">
          {select(
            "location",
            "Khu vực",
            [...new Set(properties.map((p) => p.location))].map((x) => [x, x]),
          )}
          {select(
            "type",
            "Loại căn hộ",
            ["Studio", "1 phòng ngủ", "2 phòng ngủ", "Căn hộ dịch vụ"].map(
              (x) => [x, x],
            ),
          )}
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
          {select(
            "sort",
            "Sắp xếp",
            [
              ["price-asc", "Giá tăng dần"],
              ["price-desc", "Giá giảm dần"],
              ["area", "Diện tích lớn nhất"],
            ],
            "Mặc định",
          )}
        </div>
        <button className="button button-outline" type="submit">
          Áp dụng bộ lọc
        </button>
      </details>
      {values.view && <input type="hidden" name="view" value={values.view} />}
    </RentalSearchForm>
  );
}
