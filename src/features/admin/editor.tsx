"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ImagePlus, Info, Save } from "lucide-react";
import { photos, adminUsers } from "@/data";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { names, statuses, type Kind, type Row } from "./model";

type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  default?: string | number;
  options?: [string, string][];
  hint?: string;
  wide?: boolean;
  min?: number;
  max?: number;
  step?: string;
};
type Group = { title: string; description: string; fields: Field[] };
const options = (values: string[]): [string, string][] =>
  values.map((value) => [value, value]);
const field = (
  key: string,
  label: string,
  more: Omit<Field, "key" | "label"> = {},
): Field => ({ key, label, ...more });
const numeric = (
  key: string,
  label: string,
  fallback: number,
  min = 0,
  step = "1",
) =>
  field(key, label, {
    type: "number",
    required: true,
    default: fallback,
    min,
    step,
  });
function groups(kind: Kind, projects: Project[]): Group[] {
  const common: Group = {
    title: "Thông tin cơ bản",
    description: "Những thông tin chính giúp nhận diện và quản lý bản ghi.",
    fields: [
      field(
        "name",
        kind === "leads"
          ? "Họ và tên"
          : kind === "posts"
            ? "Tiêu đề bài viết"
            : "Tên",
        { required: true, wide: true },
      ),
      field("status", "Trạng thái", {
        required: true,
        options: options(statuses[kind]),
      }),
      ...(kind === "leads"
        ? [
            field("priority", "Mức độ ưu tiên", {
              options: options(["Bình thường", "Cao", "Thấp"]),
            }),
          ]
        : [
            field("slug", "Đường dẫn (slug)", {
              required: true,
              hint: "Chữ thường không dấu, số và dấu gạch ngang. Không trùng với mục khác.",
            }),
          ]),
    ],
  };
  const detail: Group[] =
    kind === "projects"
      ? [
          {
            title: "Vị trí & quy mô",
            description:
              "Thông tin giới thiệu dự án và vai trò của doanh nghiệp.",
            fields: [
              field("location", "Khu vực", {
                required: true,
                default: "Hải Châu, Đà Nẵng",
              }),
              field("address", "Địa chỉ chi tiết"),
              field("type", "Loại dự án", {
                required: true,
                default: "Căn hộ cao cấp",
              }),
              field("developer", "Chủ đầu tư"),
              field("companyRole", "Vai trò của Đất Vàng Group"),
              field("legalStatus", "Thông tin pháp lý"),
              field("totalArea", "Tổng diện tích (m²)", {
                type: "number",
                min: 0,
                step: "any",
              }),
              field("totalUnits", "Số lượng căn", { type: "number", min: 0 }),
              field("startDate", "Ngày khởi công", { type: "date" }),
              field("handoverDate", "Ngày bàn giao dự kiến", { type: "date" }),
              field("mapUrl", "Liên kết bản đồ", { type: "url", wide: true }),
              field("amenities", "Tiện ích & hạ tầng", {
                type: "textarea",
                wide: true,
                hint: "Mỗi tiện ích trên một dòng.",
              }),
            ],
          },
        ]
      : kind === "properties"
        ? [
            {
              title: "Thông số căn hộ",
              description: "Phân loại, diện tích và hiện trạng không gian.",
              fields: [
                field("projectId", "Dự án", {
                  required: true,
                  options: projects.map((p) => [p.id, p.name]),
                  default: projects[0]?.id,
                }),
                field("unitCode", "Mã căn / số phòng"),
                field("location", "Khu vực", {
                  required: true,
                  default: "Hải Châu, Đà Nẵng",
                }),
                field("address", "Địa chỉ chi tiết"),
                field("type", "Loại căn hộ", {
                  required: true,
                  options: options([
                    "Studio",
                    "1 phòng ngủ",
                    "2 phòng ngủ",
                    "Căn hộ dịch vụ",
                    "Penthouse",
                  ]),
                }),
                numeric("area", "Diện tích (m²)", 50, 0.1, "any"),
                numeric("bedrooms", "Phòng ngủ", 1),
                numeric("bathrooms", "Phòng tắm", 1, 1),
                numeric("floor", "Tầng", 5),
                field("direction", "Hướng căn hộ", {
                  options: options([
                    "Chưa xác định",
                    "Đông",
                    "Tây",
                    "Nam",
                    "Bắc",
                    "Đông Bắc",
                    "Đông Nam",
                    "Tây Bắc",
                    "Tây Nam",
                  ]),
                }),
                field("furniture", "Nội thất", {
                  required: true,
                  options: options([
                    "Đầy đủ nội thất",
                    "Nội thất cơ bản",
                    "Không nội thất",
                  ]),
                }),
                field("amenities", "Trang thiết bị & tiện ích", {
                  type: "textarea",
                  wide: true,
                }),
              ],
            },
            {
              title: "Giá & điều kiện thuê",
              description:
                "Làm rõ chi phí, thời hạn và thời điểm có thể nhận căn.",
              fields: [
                numeric("price", "Giá (triệu / tháng)", 10, 0.1, "any"),
                field("deposit", "Đặt cọc (triệu đồng)", {
                  type: "number",
                  min: 0,
                  step: "any",
                }),
                field("managementFee", "Phí quản lý (đồng / tháng)", {
                  type: "number",
                  min: 0,
                }),
                field("minimumLease", "Thời hạn thuê tối thiểu (tháng)", {
                  type: "number",
                  min: 1,
                }),
                field("availableFrom", "Ngày có thể nhận căn", {
                  type: "date",
                }),
                field("contactName", "Người liên hệ"),
                field("contactPhone", "Số điện thoại liên hệ", { type: "tel" }),
                field("rentalPolicy", "Điều kiện thuê & chi phí khác", {
                  type: "textarea",
                  wide: true,
                }),
              ],
            },
          ]
        : kind === "posts"
          ? [
              {
                title: "Biên tập & phân loại",
                description:
                  "Quản lý tác giả, chuyên mục và phần nội dung của bài viết.",
                fields: [
                  field("category", "Chuyên mục", {
                    required: true,
                    options: options([
                      "Tin doanh nghiệp",
                      "Thị trường bất động sản",
                      "Cẩm nang thuê nhà",
                      "Phong cách sống",
                      "Góc nhìn chủ sở hữu",
                    ]),
                  }),
                  field("author", "Tác giả", { default: "Đất Vàng Group" }),
                  numeric("readingTime", "Phút đọc", 5, 1),
                  field("publishDate", "Ngày xuất bản", {
                    type: "date",
                    hint: "Thông tin biên tập, chưa có chức năng tự động hẹn giờ.",
                  }),
                  field("tags", "Từ khóa bài viết", {
                    hint: "Ngăn cách bằng dấu phẩy.",
                    wide: true,
                  }),
                  field("content", "Nội dung chi tiết", {
                    type: "textarea",
                    wide: true,
                    hint: "Nhập nội dung văn bản đầy đủ, chia đoạn bằng xuống dòng. Không hỗ trợ HTML.",
                  }),
                ],
              },
            ]
          : [
              {
                title: "Liên hệ & nhu cầu",
                description:
                  "Thông tin để tiếp nhận và theo dõi yêu cầu của khách hàng.",
                fields: [
                  field("email", "Email", { type: "email", required: true }),
                  field("phone", "Điện thoại (tùy chọn)", { type: "tel" }),
                  field("company", "Công ty / tổ chức"),
                  field("position", "Chức vụ"),
                  field("source", "Nguồn / Căn hộ quan tâm", {
                    required: true,
                    default: "Tư vấn căn hộ",
                  }),
                  field("interest", "Nhóm nhu cầu", {
                    options: options([
                      "Tư vấn chung",
                      "Hợp tác doanh nghiệp",
                      "Quản lý bất động sản",
                      "Thuê căn hộ",
                      "Khác",
                    ]),
                  }),
                  field("budgetMin", "Ngân sách từ (triệu đồng)", {
                    type: "number",
                    min: 0,
                    step: "any",
                  }),
                  field("budgetMax", "Ngân sách đến (triệu đồng)", {
                    type: "number",
                    min: 0,
                    step: "any",
                  }),
                  field("preferredLocation", "Khu vực quan tâm"),
                  field("preferredContact", "Kênh liên hệ ưu tiên", {
                    options: options(["Điện thoại", "Email", "Zalo"]),
                  }),
                ],
              },
              {
                title: "Theo dõi & phân công",
                description:
                  "Lưu người phụ trách, lịch liên hệ tiếp theo và ghi chú nội bộ.",
                fields: [
                  field("assignment", "Người phụ trách", {
                    required: true,
                    options: options([
                      "Chưa phân công",
                      ...adminUsers.map((u) => u.name),
                    ]),
                  }),
                  field("followUpAt", "Lịch liên hệ tiếp theo", {
                    type: "datetime-local",
                  }),
                  field("notes", "Ghi chú", { type: "textarea", wide: true }),
                ],
              },
            ];
  return [
    common,
    ...detail,
    {
      title: kind === "leads" ? "Nội dung yêu cầu" : "Giới thiệu & mô tả",
      description: "Nội dung rõ ràng giúp đội ngũ hiểu đúng thông tin.",
      fields: [
        field(
          kind === "leads" ? "message" : "description",
          kind === "leads"
            ? "Nhu cầu"
            : kind === "posts"
              ? "Mô tả ngắn"
              : "Mô tả",
          { type: "textarea", required: true, wide: true },
        ),
      ],
    },
    ...(kind === "leads"
      ? []
      : [
          {
            title: "Tối ưu tìm kiếm (SEO)",
            description:
              "Thông tin lưu cùng bản ghi; chưa tự động xuất bản lên website công khai.",
            fields: [
              field("seoTitle", "Tiêu đề SEO", {
                hint: "Gợi ý khoảng 50–60 ký tự.",
                wide: true,
              }),
              field("seoDescription", "Mô tả SEO", {
                type: "textarea",
                hint: "Gợi ý khoảng 140–160 ký tự.",
                wide: true,
              }),
            ],
          },
        ]),
  ];
}
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const validUrl = (value: string) => {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export function Editor({
  kind,
  row,
  projects,
  existing,
  onSave,
  onCancel,
}: {
  kind: Kind;
  row: Row | null;
  projects: Project[];
  existing: Row[];
  onSave: (row: Row) => void;
  onCancel: () => void;
}) {
  const data = (row || {}) as unknown as Record<string, string | number>;
  const sections = groups(kind, projects);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [preview, setPreview] = useState(String(data.image || photos.living));
  const [imageFailed, setImageFailed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(
      [...new FormData(event.currentTarget)].map(([key, value]) => [
        key,
        String(value).trim(),
      ]),
    );
    const issues: string[] = [];
    if (!raw.name) issues.push("Vui lòng nhập tên hợp lệ.");
    if ((raw.message || raw.description || "").length < 10)
      issues.push("Nội dung mô tả hoặc nhu cầu cần có ít nhất 10 ký tự.");
    if (kind !== "leads") {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug))
        issues.push(
          "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang.",
        );
      if (
        existing.some(
          (item) =>
            "slug" in item && item.slug === raw.slug && item.id !== row?.id,
        )
      )
        issues.push(
          "Đường dẫn này đã được sử dụng. Vui lòng chọn đường dẫn khác.",
        );
      if (!validUrl(raw.image))
        issues.push("Ảnh đại diện cần là đường dẫn HTTP hoặc HTTPS hợp lệ.");
      if (
        raw.gallery
          ?.split("\n")
          .some((url) => url.trim() && !validUrl(url.trim()))
      )
        issues.push(
          "Mỗi ảnh trong thư viện cần là một đường dẫn HTTP hoặc HTTPS hợp lệ.",
        );
    }
    for (const key of ["phone", "contactPhone"])
      if (
        raw[key] &&
        (!/^\+?[\d\s().-]{8,20}$/.test(raw[key]) ||
          raw[key].replace(/\D/g, "").length < 8)
      )
        issues.push(
          "Số điện thoại cần có 8–20 ký tự gồm số và dấu phân cách hợp lệ.",
        );
    if (
      raw.budgetMin &&
      raw.budgetMax &&
      Number(raw.budgetMin) > Number(raw.budgetMax)
    )
      issues.push(
        "Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu.",
      );
    if (raw.startDate && raw.handoverDate && raw.startDate > raw.handoverDate)
      issues.push("Ngày bàn giao không được trước ngày khởi công.");
    if (kind === "properties" && !projects.some((p) => p.id === raw.projectId))
      issues.push("Vui lòng chọn một dự án còn tồn tại.");
    if (
      kind === "posts" &&
      raw.status === "Đã xuất bản" &&
      (raw.content || "").length < 10
    )
      issues.push(
        "Bài viết cần nội dung chi tiết trước khi chuyển sang trạng thái đã xuất bản (demo).",
      );
    if (issues.length) {
      setErrors(issues);
      requestAnimationFrame(() =>
        document.getElementById("editor-errors")?.focus(),
      );
      return;
    }
    const now = new Date().toISOString();
    const next: Record<string, unknown> = {
      ...row,
      ...raw,
      id: row?.id || crypto.randomUUID(),
      updatedAt: now,
    };
    if (kind !== "properties") next.createdAt = data.createdAt || now;
    if (kind === "properties")
      for (const key of ["price", "area", "bedrooms", "bathrooms", "floor"])
        next[key] = Number(raw[key]);
    if (kind === "posts") {
      next.readingTime = Number(raw.readingTime);
      next.categorySlug = slugify(raw.category);
    }
    setErrors([]);
    onSave(next as Row);
  }
  function renderField(item: Field) {
    const id = `field-${item.key}`;
    const value = data[item.key] ?? item.default ?? "";
    const shared = {
      id,
      name: item.key,
      required: item.required,
      defaultValue: value,
      "aria-describedby": item.hint ? `${id}-hint` : undefined,
    };
    return (
      <label
        key={item.key}
        htmlFor={id}
        className={item.wide ? "full" : undefined}
      >
        <span>
          {item.label}
          {item.required && <span className="required-mark"> *</span>}
        </span>
        {item.type === "textarea" ? (
          <textarea
            {...shared}
            rows={item.key === "content" ? 16 : 5}
            maxLength={item.key === "content" ? 50000 : 10000}
            minLength={item.required ? 10 : undefined}
          />
        ) : item.options ? (
          <select {...shared}>
            {!item.options.length && (
              <option value="">Chưa có dự án — hãy tạo dự án trước</option>
            )}
            {value && !item.options.some(([key]) => key === String(value)) && (
              <option value={value}>{value}</option>
            )}
            {item.options.map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...shared}
            type={item.type || "text"}
            min={item.min}
            max={item.max}
            step={item.step}
            maxLength={item.type === "number" ? undefined : 300}
          />
        )}
        {item.hint && <small id={`${id}-hint`}>{item.hint}</small>}
        {item.key === "slug" && (
          <button
            className="admin-inline-button"
            type="button"
            onClick={() => {
              const form = formRef.current;
              if (!form) return;
              const name = form.elements.namedItem("name") as HTMLInputElement;
              const slug = form.elements.namedItem("slug") as HTMLInputElement;
              slug.value = slugify(name.value);
              setDirty(true);
            }}
          >
            Tạo đường dẫn từ tên
          </button>
        )}
      </label>
    );
  }
  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onChange={() => setDirty(true)}
      className="admin-editor admin-editor-page"
    >
      <div className="editor-topline">
        <button
          type="button"
          onClick={() => (dirty ? setCanceling(true) : onCancel())}
        >
          <ArrowLeft size={17} />
          Về danh sách
        </button>
        <span>
          {dirty
            ? "Có thay đổi chưa lưu"
            : row
              ? "Đang chỉnh sửa bản ghi"
              : "Bản ghi mới"}
        </span>
      </div>
      {errors.length > 0 && (
        <div
          className="editor-errors"
          id="editor-errors"
          tabIndex={-1}
          role="alert"
        >
          <strong>Vui lòng kiểm tra lại thông tin</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {canceling && (
        <div className="editor-errors" role="alert">
          <strong>Bạn có thay đổi chưa lưu.</strong>
          <p>Rời khỏi trang sẽ bỏ các thay đổi trong biểu mẫu.</p>
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCanceling(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button type="button" onClick={onCancel}>
              Bỏ thay đổi và quay lại
            </Button>
          </div>
        </div>
      )}
      <div className="editor-layout">
        <div className="editor-sections">
          {sections.map((group, index) => (
            <section
              className="admin-panel editor-section"
              key={group.title}
              id={`editor-section-${index}`}
            >
              <header>
                <span className="editor-section-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
              </header>
              <div className="form-grid">{group.fields.map(renderField)}</div>
            </section>
          ))}
        </div>
        <aside className="editor-aside">
          {kind !== "leads" && (
            <section className="admin-panel editor-media">
              <h2>
                <ImagePlus size={19} />
                Hình ảnh
              </h2>
              <p>Chọn ảnh mẫu hoặc nhập URL ảnh của doanh nghiệp.</p>
              <div className="editor-image-preview">
                {validUrl(preview) && !imageFailed ? (
                  // External image URLs are user-entered and cannot use a fixed Next Image host allowlist.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Xem trước ảnh đại diện"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <span>Chưa thể tải ảnh. Kiểm tra lại đường dẫn.</span>
                )}
              </div>
              <label>
                Chọn nhanh ảnh minh họa
                <select
                  aria-label="Chọn nhanh ảnh minh họa"
                  value={Object.values(photos).includes(preview) ? preview : ""}
                  onChange={(event) => {
                    setPreview(event.target.value);
                    setImageFailed(false);
                  }}
                >
                  <option value="" disabled>
                    Ảnh tùy chỉnh
                  </option>
                  {Object.entries(photos).map(([key, url], index) => (
                    <option value={url} key={key}>
                      Không gian minh họa {index + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                URL ảnh đại diện <span className="required-mark">*</span>
                <input
                  name="image"
                  type="url"
                  required
                  value={preview}
                  onChange={(event) => {
                    setPreview(event.target.value);
                    setImageFailed(false);
                  }}
                />
              </label>
              <label>
                Mô tả ảnh (alt text)
                <input
                  name="imageAlt"
                  defaultValue={data.imageAlt}
                  maxLength={300}
                />
              </label>
              <label>
                Thư viện hình ảnh
                <textarea
                  name="gallery"
                  rows={5}
                  defaultValue={data.gallery}
                  placeholder="https://.../anh-1.jpg&#10;https://.../anh-2.jpg"
                />
                <small>
                  Mỗi URL ảnh trên một dòng. Lưu liên kết, không tải tệp lên máy
                  chủ.
                </small>
              </label>
            </section>
          )}
          <section className="admin-panel editor-guide">
            <h2>
              <Info size={18} />
              Thông tin bản ghi
            </h2>
            <dl>
              <dt>Loại nội dung</dt>
              <dd>{names[kind]}</dd>
              <dt>Mã bản ghi</dt>
              <dd>{row?.id || "Tự tạo khi lưu"}</dd>
              <dt>Ngày tạo / cập nhật</dt>
              <dd>
                {data.updatedAt || data.createdAt
                  ? new Date(
                      String(data.updatedAt || data.createdAt),
                    ).toLocaleDateString("vi-VN")
                  : "Chưa lưu"}
              </dd>
            </dl>
            <p>
              Các trường có dấu * là bắt buộc. Dữ liệu lưu trên trình duyệt này,
              chưa đồng bộ lên website công khai.
            </p>
            <nav aria-label="Các phần biểu mẫu">
              {sections.map((group, index) => (
                <a key={group.title} href={`#editor-section-${index}`}>
                  {String(index + 1).padStart(2, "0")} · {group.title}
                </a>
              ))}
            </nav>
          </section>
        </aside>
      </div>
      <div className="editor-savebar">
        <span>
          <Check size={16} />
          {dirty
            ? "Sẵn sàng lưu thay đổi"
            : "Điền thông tin và kiểm tra trước khi lưu"}
        </span>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => (dirty ? setCanceling(true) : onCancel())}
          >
            Hủy
          </Button>
          <Button type="submit">
            <Save size={17} />
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </form>
  );
}
