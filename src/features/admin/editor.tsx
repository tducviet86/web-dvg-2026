"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  FileText,
  Home,
  ImagePlus,
  Info,
  MapPin,
  Save,
  Search,
  Sparkles,
  Tag,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { videoSource } from "@/lib/property-media";
import {
  availabilityOptions,
  categoryOptions,
  furnishingOptions,
  priorityOptions,
  stageOptions,
  type MediaState,
} from "./adapters";
import { ConfirmDialog, ErrorDialog, type FormIssue } from "./error-dialog";
import { DatePicker } from "./date-picker";
import { AMENITY_GROUPS } from "@/lib/amenities";
import {
  highlightOptions,
  TRENDING_LABEL,
  TRENDING_SCORE,
} from "@/lib/highlights";
import { AiSeoAssistant, type SeoSuggestion } from "./ai-seo";
import {
  MediaGallery,
  MediaManager,
  MediaPicker,
  UploadPlaceProvider,
} from "./media";
import type { UploadPlace } from "./api";
import {
  leadStatusOptions,
  names,
  type FormValue,
  type FormValues,
  type Kind,
} from "./model";
import { ProjectBannerSection, type ProjectBannerDraft } from "./banners";

// ───────────────────────────── field model ─────────────────────────────

type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "select"
    | "number"
    | "date"
    | "datetime-local"
    | "url"
    | "email"
    | "tel"
    | "checkbox"
    | "checkboxes"
    /** Grouped tick-list of unit amenities (lib/amenities.ts). */
    | "amenities"
    | "choice"
    /** Amount in đồng, typed with thousand separators (20.000.000). */
    | "vnd";
  required?: boolean;
  default?: string | number | boolean;
  options?: [string, string][];
  /** Description of each choice card (type "choice"). */
  optionHints?: Record<string, string>;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
  /** Unit shown inside the input, e.g. "m²", "triệu / tháng". */
  unit?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: string;
  integer?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
  /** Textarea holding one item per line. */
  lines?: { max: number; itemMax: number };
  /** Customer-submitted data: shown but not editable after creation. */
  lockedOnEdit?: boolean;
  /** Only shown when creating. */
  newOnly?: boolean;
  /** Only shown while this checkbox field is on (e.g. rent price ↔ "Cho thuê"). */
  showWhen?: string;
  /** Starts a new block inside the section, with this small heading. */
  subhead?: string;
};
type Group = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  fields: Field[];
};
export type Lookups = {
  projects: [string, string][];
  propertyTypes: [string, string][];
  blogCategories: [string, string][];
  users: [string, string][];
  /** Project address and map, used to pre-fill a unit's location. */
  projectPlaces: Record<
    string,
    { name: string; location: string; address: string; hasMap: boolean }
  >;
};

// Same rules as the API DTOs (BE-DVG/src/modules/*/*.dto.ts).
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHONE = /^\+?[\d\s().-]{8,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTPS = /^https:\/\/\S+$/;
const HTTP = /^https?:\/\/\S+$/;
const PHONE_MESSAGE = "chỉ gồm 8–20 chữ số và dấu cách, chấm, gạch";

const f = (
  key: string,
  label: string,
  more: Omit<Field, "key" | "label"> = {},
): Field => ({ key, label, ...more });
const publishChoice = f("status", "Trạng thái", {
  type: "choice",
  required: true,
  default: "DRAFT",
  wide: true,
  options: [
    ["DRAFT", "Bản nháp"],
    ["PUBLISHED", "Xuất bản"],
  ],
  optionHints: {
    DRAFT: "Chỉ người quản trị thấy, có thể xem trước.",
    PUBLISHED: "Hiển thị trên website và sitemap.",
  },
});
const slugField = (max: number) =>
  f("slug", "Đường dẫn (slug)", {
    required: true,
    maxLength: max,
    pattern: SLUG,
    patternMessage:
      "chỉ gồm chữ thường không dấu, số và dấu gạch ngang (vd: sun-ponte-residence)",
    placeholder: "vd: ten-du-an",
    wide: true,
    hint: "Địa chỉ trang trên website. Nếu đổi sau này, địa chỉ cũ tự chuyển hướng sang địa chỉ mới.",
  });
const seoGroup: Group = {
  id: "seo",
  title: "Hiển thị trên Google",
  description:
    "Để trống để dùng tên và mô tả ngắn. Dùng cho tiêu đề tab, kết quả tìm kiếm và khi chia sẻ lên mạng xã hội.",
  icon: Search,
  fields: [
    f("seoTitle", "Tiêu đề SEO", {
      maxLength: 120,
      wide: true,
      hint: "Nên 50–60 ký tự.",
    }),
    f("seoDescription", "Mô tả SEO", {
      type: "textarea",
      rows: 3,
      maxLength: 320,
      wide: true,
      hint: "Nên 140–160 ký tự.",
    }),
  ],
};
const choices = (values: string[]): [string, string][] =>
  values.map((x) => [x, x]);

function groups(kind: Kind, lookups: Lookups, isNew: boolean): Group[] {
  if (kind === "projects")
    return [
      {
        id: "basic",
        title: "Thông tin chính",
        description: "Tên, đường dẫn và trạng thái hiển thị của dự án.",
        icon: Building2,
        fields: [
          f("name", "Tên dự án", {
            required: true,
            minLength: 2,
            maxLength: 160,
            wide: true,
            placeholder: "vd: Sun Ponte Residence",
          }),
          slugField(120),
          publishChoice,
          f("description", "Mô tả ngắn", {
            type: "textarea",
            required: true,
            minLength: 10,
            maxLength: 600,
            rows: 3,
            wide: true,
            hint: "1–2 câu, hiển thị ở thẻ dự án và làm mô tả SEO mặc định.",
          }),
        ],
      },
      {
        id: "classify",
        title: "Phân loại",
        description:
          "Một dự án có thể thuộc nhiều nhóm, ví dụ vừa đang vận hành vừa cho thuê.",
        icon: Tag,
        fields: [
          f("categories", "Nhóm dự án", {
            type: "checkboxes",
            required: true,
            options: categoryOptions,
            wide: true,
          }),
          f("stage", "Giai đoạn", {
            type: "select",
            options: stageOptions,
            default: "UNDER_DEVELOPMENT",
          }),
          f("type", "Loại hình", {
            maxLength: 120,
            default: "Căn hộ & bất động sản",
          }),
          f("sortOrder", "Thứ tự trong danh mục", {
            type: "number",
            integer: true,
            default: 0,
            hint: "Số nhỏ hiển thị trước.",
          }),
        ],
      },
      {
        id: "location",
        title: "Vị trí & quy mô",
        description: "Thông tin giới thiệu dự án và vai trò của doanh nghiệp.",
        icon: MapPin,
        fields: [
          f("location", "Khu vực", {
            required: true,
            minLength: 2,
            maxLength: 160,
            default: "Đà Nẵng",
            placeholder: "vd: Hải Châu · Đà Nẵng",
          }),
          f("address", "Địa chỉ chi tiết", { maxLength: 300 }),
          f("developer", "Chủ đầu tư", { maxLength: 200 }),
          f("companyRole", "Vai trò của Đất Vàng Group", {
            maxLength: 200,
            placeholder: "vd: Phân phối, vận hành",
          }),
          f("legalStatus", "Thông tin pháp lý", { maxLength: 600, wide: true }),
          f("totalArea", "Tổng diện tích", {
            type: "number",
            min: 0,
            step: "0.01",
            unit: "m²",
          }),
          f("totalUnits", "Số lượng căn", {
            type: "number",
            min: 0,
            integer: true,
            unit: "căn",
          }),
          f("startDate", "Ngày khởi công", { type: "date" }),
          f("handoverDate", "Ngày bàn giao dự kiến", { type: "date" }),
          f("mapUrl", "Liên kết Google Maps", {
            type: "url",
            pattern: HTTPS,
            patternMessage: "phải là liên kết bắt đầu bằng https://",
            wide: true,
          }),
          f("facebookUrl", "Fanpage Facebook của dự án", {
            type: "url",
            pattern: /^https:\/\/(www\.|m\.)?(facebook|fb)\.com\/\S+$/,
            patternMessage:
              "phải là trang Facebook, vd https://www.facebook.com/datvangmonarchy/",
            placeholder: "https://www.facebook.com/…",
            hint: "Hiện nút Fanpage trên trang chủ và trang dự án đang vận hành.",
            wide: true,
          }),
          f("mapLabel", "Tên địa điểm trên bản đồ", { maxLength: 200 }),
          f("latitude", "Vĩ độ", {
            type: "number",
            step: "any",
            min: -90,
            max: 90,
            placeholder: "vd: 16.0548413",
          }),
          f("longitude", "Kinh độ", {
            type: "number",
            step: "any",
            min: -180,
            max: 180,
            placeholder: "vd: 108.2329786",
          }),
          f("amenities", "Tiện ích & hạ tầng", {
            type: "textarea",
            rows: 4,
            wide: true,
            lines: { max: 60, itemMax: 160 },
            hint: "Mỗi tiện ích một dòng.",
          }),
        ],
      },
      {
        id: "story",
        title: "Nội dung giới thiệu",
        description: "Hiển thị trên trang chi tiết dự án.",
        icon: FileText,
        fields: [
          f("overview", "Giới thiệu chi tiết", {
            type: "textarea",
            rows: 7,
            wide: true,
            hint: "Mỗi đoạn cách nhau một dòng trống (tối đa 20 đoạn).",
          }),
          f("products", "Loại sản phẩm", {
            type: "textarea",
            rows: 3,
            wide: true,
            lines: { max: 30, itemMax: 160 },
            hint: "Mỗi loại một dòng, vd: Căn hộ 2 phòng ngủ.",
          }),
          f("highlights", "Điểm nổi bật", {
            type: "textarea",
            rows: 4,
            wide: true,
            lines: { max: 12, itemMax: 523 },
            hint: "Mỗi dòng: Tiêu đề | Nội dung. Ví dụ: Vị trí | Bên bờ sông Hàn.",
          }),
        ],
      },
      {
        id: "rental",
        title: "Cho thuê tại dự án",
        description:
          "Hiển thị trên trang /cho-thue/du-an khi dự án thuộc nhóm Cho thuê.",
        icon: Home,
        fields: [
          f("rentalFocus", "Tiêu đề hướng dẫn thuê", {
            maxLength: 200,
            wide: true,
          }),
          f("rentalIntro", "Giới thiệu cho thuê", {
            type: "textarea",
            rows: 3,
            maxLength: 800,
            wide: true,
          }),
          f("rentalChecks", "Những điều cần kiểm tra", {
            type: "textarea",
            rows: 3,
            wide: true,
            lines: { max: 12, itemMax: 300 },
            hint: "Mỗi lưu ý một dòng.",
          }),
        ],
      },
      {
        id: "source",
        title: "Nguồn thông tin & bản quyền ảnh",
        description:
          "Ghi rõ nguồn khi dùng hình ảnh hoặc thông tin của chủ đầu tư.",
        icon: Info,
        fields: [
          f("imageCredit", "Loại ảnh / ghi chú bản quyền", {
            maxLength: 120,
            default: "Phối cảnh dự án",
          }),
          f("sourceUrl", "Nguồn thông tin", {
            type: "url",
            pattern: HTTP,
            patternMessage:
              "phải là liên kết bắt đầu bằng http:// hoặc https://",
          }),
        ],
      },
      seoGroup,
    ];
  if (kind === "properties")
    return [
      {
        id: "basic",
        title: "Thông tin chính",
        description: "Tên căn, đường dẫn, dự án và trạng thái hiển thị.",
        icon: Home,
        fields: [
          f("name", "Tên căn hộ", {
            required: true,
            minLength: 2,
            maxLength: 160,
            wide: true,
            placeholder: "vd: Căn 2 phòng ngủ view sông Hàn",
          }),
          slugField(160),
          publishChoice,
          f("projectId", "Dự án", {
            type: "select",
            required: true,
            options: lookups.projects,
            default: lookups.projects[0]?.[0],
          }),
          f("unitCode", "Mã căn / số phòng", {
            maxLength: 40,
            placeholder: "vd: A-12.05",
          }),
          f("location", "Khu vực", {
            required: true,
            minLength: 2,
            maxLength: 160,
            default: "Đà Nẵng",
          }),
          f("address", "Địa chỉ chi tiết", {
            maxLength: 300,
            hint: "Tự điền theo dự án khi chọn dự án; sửa nếu căn ở tòa/block khác. Bản đồ trên website dùng vị trí của dự án.",
          }),
        ],
      },
      {
        id: "specs",
        title: "Thông số căn hộ",
        description: "Loại căn, diện tích và nội thất.",
        icon: ClipboardList,
        fields: [
          f("type", "Loại căn hộ", {
            type: "select",
            required: true,
            options: lookups.propertyTypes,
          }),
          f("area", "Diện tích", {
            type: "number",
            required: true,
            min: 1,
            max: 100000,
            step: "0.01",
            default: 50,
            unit: "m²",
          }),
          f("bedrooms", "Phòng ngủ", {
            type: "number",
            required: true,
            min: 0,
            max: 50,
            integer: true,
            default: 1,
            hint: "Nhập 0 cho căn studio.",
          }),
          f("bathrooms", "Phòng tắm", {
            type: "number",
            required: true,
            min: 0,
            max: 50,
            integer: true,
            default: 1,
          }),
          f("floor", "Tầng", {
            type: "number",
            min: -10,
            max: 200,
            integer: true,
          }),
          f("direction", "Hướng căn hộ", {
            type: "select",
            options: [
              ["", "Chưa xác định"],
              ...choices([
                "Đông",
                "Tây",
                "Nam",
                "Bắc",
                "Đông Bắc",
                "Đông Nam",
                "Tây Bắc",
                "Tây Nam",
              ]),
            ],
          }),
          f("furniture", "Nội thất", {
            type: "select",
            required: true,
            options: furnishingOptions,
          }),
        ],
      },
      {
        id: "amenities",
        title: "Tiện nghi căn hộ",
        description:
          "Tích những gì căn hộ có. Trang chi tiết căn hộ hiển thị theo nhóm kèm biểu tượng.",
        icon: Sparkles,
        fields: [
          f("amenities", "Tiện nghi", { type: "amenities", wide: true }),
        ],
      },
      {
        id: "listing",
        title: "Hình thức & tình trạng",
        description: "Một căn có thể vừa cho thuê vừa bán.",
        icon: Tag,
        fields: [
          f("availability", "Tình trạng", {
            type: "select",
            required: true,
            options: availabilityOptions,
          }),
          f("forRent", "Cho thuê", { type: "checkbox", default: true }),
          f("forSale", "Mua bán", { type: "checkbox" }),
          f("isConsignment", "Căn ký gửi", { type: "checkbox" }),
          f("highlight", "Nhãn nổi bật trên thẻ căn", {
            type: "choice",
            default: "",
            options: [["", "Không gắn"], ...highlightOptions],
            optionHints: {
              "": "Thẻ căn chỉ hiện tình trạng.",
              hot: "Căn đang được nhiều khách hỏi.",
              exclusive: "Chỉ Đất Vàng đang phân phối.",
              rare: "View, tầng hoặc layout hiếm trong dự án.",
              "good-price": "Giá dưới mặt bằng dự án.",
            },
            hint: `Ngoài nhãn này, căn tự hiện “${TRENDING_LABEL}” khi đạt ${TRENDING_SCORE} điểm trong 14 ngày (1 lượt xem = 1 điểm, 1 yêu cầu tư vấn = 5 điểm).`,
          }),
          f("isDemo", "Căn mẫu / dữ liệu minh họa", {
            type: "checkbox",
            wide: true,
            hint: "Bật cho dữ liệu chưa xác minh: website ghi “Căn mẫu” và ẩn khỏi Google.",
          }),
        ],
      },
      {
        id: "price",
        title: "Giá & điều kiện",
        description:
          "Nhập số tiền đầy đủ, vd 20.000.000. Mục Cho thuê hiện khi bật Cho thuê, mục Mua bán hiện khi bật Mua bán.",
        icon: Wallet,
        fields: [
          f("price", "Giá thuê", {
            type: "vnd",
            unit: "đ / tháng",
            placeholder: "20.000.000",
            showWhen: "forRent",
            subhead: "Cho thuê",
          }),
          f("depositMonths", "Đặt cọc (theo giá thuê)", {
            type: "select",
            options: depositOptions,
            showWhen: "forRent",
          }),
          f("minimumLease", "Thuê tối thiểu", {
            type: "number",
            min: 1,
            max: 120,
            integer: true,
            unit: "tháng",
            showWhen: "forRent",
          }),
          f("availableFrom", "Ngày có thể nhận căn", {
            type: "date",
            showWhen: "forRent",
          }),
          f("salePrice", "Giá bán", {
            type: "vnd",
            unit: "đ",
            placeholder: "2.500.000.000",
            showWhen: "forSale",
            subhead: "Mua bán",
          }),
          f("contactName", "Người liên hệ", {
            maxLength: 120,
            default: COMPANY_CONTACT.name,
            subhead: "Liên hệ",
          }),
          f("contactPhone", "Số điện thoại liên hệ", {
            type: "tel",
            pattern: PHONE,
            patternMessage: PHONE_MESSAGE,
            default: COMPANY_CONTACT.phone,
          }),
        ],
      },
      {
        id: "describe",
        title: "Mô tả",
        description: "Giới thiệu không gian, ánh sáng, tiện ích xung quanh.",
        icon: FileText,
        fields: [
          f("description", "Mô tả căn hộ", {
            type: "textarea",
            required: true,
            minLength: 10,
            maxLength: 10000,
            rows: 6,
            wide: true,
          }),
        ],
      },
      seoGroup,
    ];
  if (kind === "posts")
    return [
      {
        id: "basic",
        title: "Thông tin chính",
        description: "Tiêu đề, đường dẫn, chuyên mục và lịch xuất bản.",
        icon: FileText,
        fields: [
          f("name", "Tiêu đề bài viết", {
            required: true,
            minLength: 2,
            maxLength: 200,
            wide: true,
          }),
          slugField(160),
          publishChoice,
          f("category", "Chuyên mục", {
            type: "select",
            required: true,
            options: lookups.blogCategories,
          }),
          f("publishDate", "Thời điểm xuất bản", {
            type: "datetime-local",
            hint: "Để trống: xuất bản ngay. Chọn thời điểm tương lai để hẹn giờ.",
          }),
          f("author", "Tác giả", { maxLength: 120, default: "Đất Vàng Group" }),
          f("readingTime", "Thời gian đọc", {
            type: "number",
            required: true,
            min: 1,
            max: 120,
            integer: true,
            default: 5,
            unit: "phút",
          }),
          f("tags", "Từ khóa", {
            wide: true,
            hint: "Ngăn cách bằng dấu phẩy, tối đa 20 từ khóa.",
            placeholder: "vd: thị trường, Đà Nẵng",
          }),
        ],
      },
      {
        id: "content",
        title: "Nội dung",
        description:
          "Văn bản thuần: mỗi đoạn cách nhau một dòng trống. Thẻ HTML sẽ bị loại bỏ.",
        icon: ClipboardList,
        fields: [
          f("description", "Mô tả ngắn (sapo)", {
            type: "textarea",
            required: true,
            minLength: 10,
            maxLength: 600,
            rows: 3,
            wide: true,
            hint: "Hiển thị ở danh sách bài viết và làm mô tả SEO mặc định.",
          }),
          f("content", "Nội dung chi tiết", {
            type: "textarea",
            maxLength: 50000,
            rows: 16,
            wide: true,
            hint: "Bắt buộc khi xuất bản (tối thiểu 10 ký tự).",
          }),
        ],
      },
      seoGroup,
    ];
  return [
    {
      id: "customer",
      title: "Thông tin khách hàng",
      description: isNew
        ? "Ghi nhận khách liên hệ qua điện thoại hoặc gặp trực tiếp."
        : "Thông tin khách đã gửi được giữ nguyên.",
      icon: UserRound,
      fields: [
        f("name", "Họ và tên", {
          required: true,
          minLength: 2,
          maxLength: 80,
          lockedOnEdit: true,
        }),
        f("phone", "Điện thoại", {
          type: "tel",
          pattern: PHONE,
          patternMessage: PHONE_MESSAGE,
          lockedOnEdit: true,
          placeholder: "vd: 0905 123 456",
        }),
        f("email", "Email", {
          type: "email",
          required: true,
          maxLength: 120,
          pattern: EMAIL,
          patternMessage: "chưa đúng định dạng (vd: ten@congty.vn)",
          lockedOnEdit: true,
        }),
        f("company", "Công ty / tổ chức", { maxLength: 120 }),
        f("position", "Chức vụ", { maxLength: 120 }),
      ],
    },
    {
      id: "need",
      title: "Nhu cầu",
      description: "Khách cần gì và liên hệ qua kênh nào.",
      icon: ClipboardList,
      fields: [
        f("kind", "Loại yêu cầu", {
          type: "choice",
          newOnly: true,
          default: "INQUIRY",
          wide: true,
          options: [
            ["INQUIRY", "Tư vấn dự án / căn hộ"],
            ["CONTACT", "Liên hệ chung, hợp tác"],
          ],
        }),
        f("source", "Nguồn", {
          required: true,
          minLength: 2,
          maxLength: 80,
          default: "Tư vấn trực tiếp",
          lockedOnEdit: true,
          hint: "vd: Gọi hotline, Zalo, Gặp trực tiếp.",
        }),
        f("interest", "Nhóm nhu cầu", {
          type: "select",
          lockedOnEdit: true,
          options: [
            ["", "Chưa xác định"],
            ...choices([
              "Tư vấn mua bán bất động sản",
              "Tìm thuê bất động sản",
              "Cho thuê bất động sản",
              "Ký gửi bán hoặc cho thuê",
              "Hợp tác và nhu cầu khác",
            ]),
          ],
        }),
        f("message", "Nội dung nhu cầu", {
          type: "textarea",
          required: true,
          minLength: 10,
          maxLength: 1500,
          rows: 4,
          wide: true,
          lockedOnEdit: true,
        }),
        f("budgetMin", "Ngân sách từ", {
          type: "number",
          min: 0,
          step: "0.001",
          unit: "triệu",
        }),
        f("budgetMax", "Ngân sách đến", {
          type: "number",
          min: 0,
          step: "0.001",
          unit: "triệu",
        }),
        f("preferredLocation", "Khu vực quan tâm", { maxLength: 160 }),
        f("preferredContact", "Kênh liên hệ ưu tiên", {
          type: "select",
          options: [
            ["", "Chưa chọn"],
            ...choices(["Điện thoại", "Email", "Zalo"]),
          ],
        }),
      ],
    },
    {
      id: "follow",
      title: "Theo dõi & phân công",
      description: "Trạng thái xử lý, người phụ trách và ghi chú nội bộ.",
      icon: CheckCircle2,
      fields: [
        f("status", "Trạng thái xử lý", {
          type: "select",
          required: true,
          options: leadStatusOptions,
          default: "NEW",
        }),
        f("priority", "Mức độ ưu tiên", {
          type: "select",
          options: priorityOptions,
          default: "NORMAL",
        }),
        f("assignment", "Người phụ trách", {
          type: "select",
          options: [["", "Chưa phân công"], ...lookups.users],
        }),
        f("followUpAt", "Lịch liên hệ tiếp theo", { type: "datetime-local" }),
        f("notes", "Ghi chú nội bộ", {
          type: "textarea",
          rows: 3,
          maxLength: 4000,
          wide: true,
        }),
      ],
    },
  ];
}

const intro: Record<Kind, { title: string; text: string }> = {
  projects: {
    title: "dự án",
    text: "Điền thông tin chính, chọn nhóm dự án và thêm ảnh đại diện. Dự án chỉ hiển thị trên website khi ở trạng thái “Xuất bản”.",
  },
  properties: {
    title: "căn hộ",
    text: "Chọn dự án, nhập thông số và giá, tải ảnh/video thực tế của căn. Giá nhập theo triệu đồng.",
  },
  posts: {
    title: "bài viết",
    text: "Viết tiêu đề, sapo và nội dung. Có thể lưu bản nháp, xem trước hoặc hẹn giờ xuất bản.",
  },
  leads: {
    title: "khách hàng",
    text: "Ghi nhận khách hàng liên hệ ngoài website. Yêu cầu gửi từ website được tạo tự động.",
  },
};

/** API field names → form keys shown here (for server-side errors). */
const apiFieldToKey: Record<string, string> = {
  intro: "description",
  propertyKind: "type",
  totalAreaM2: "totalArea",
  coverImageAlt: "imageAlt",
  coverImageId: "media",
  galleryImageIds: "media",
  videoUrl: "media",
  areaM2: "area",
  propertyType: "type",
  furnishing: "furniture",
  rentPriceVnd: "price",
  salePriceVnd: "salePrice",
  depositVnd: "depositMonths",
  minimumLeaseMonths: "minimumLease",
  title: "name",
  excerpt: "description",
  authorName: "author",
  readingMinutes: "readingTime",
  publishedAt: "publishDate",
  intent: "interest",
  assigneeId: "assignment",
  budgetMinVnd: "budgetMin",
  budgetMaxVnd: "budgetMax",
};
export const formKeyOf = (apiField: string) => {
  const root = apiField.split(".")[0];
  return root === "banner" ? "banner" : (apiFieldToKey[root] ?? root);
};

// ───────────────────────────── validation ─────────────────────────────

/** "20000000" → "20.000.000" (digits only, Vietnamese thousand dots). */
export const formatVnd = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** Default contact of a unit until a staff member is chosen. */
const COMPANY_CONTACT = { name: "Ánh Đất Vàng", phone: "0911 29 69 79" };
const depositOptions: [string, string][] = [
  ["", "Chưa xác định / thỏa thuận"],
  ["0.5", "Nửa tháng tiền nhà"],
  ["1", "1 tháng tiền nhà"],
  ["2", "2 tháng tiền nhà"],
  ["3", "3 tháng tiền nhà"],
];
const str = (v: FormValue) => (v === null || v === undefined ? "" : String(v));
const aiKind = {
  projects: "project",
  properties: "property",
  posts: "post",
  leads: "post",
} as const;
const publicBase: Record<Kind, string> = {
  projects: "/du-an",
  properties: "/cho-thue",
  posts: "/blog",
  leads: "",
};
function checkField(field: Field, value: FormValue): string | null {
  if (field.type === "amenities") return null;
  if (field.type === "checkboxes")
    return field.required && !(value as string[] | undefined)?.length
      ? "cần chọn ít nhất một mục"
      : null;
  if (field.type === "checkbox") return null;
  const text = str(value).trim();
  if (!text) return field.required ? "là bắt buộc" : null;
  if (field.type === "vnd") {
    const digits = text.replace(/\D/g, "");
    if (!digits || /[^\d.\s]/.test(text)) return "chỉ nhập số, vd 20.000.000";
    if (digits.length > 15) return "số tiền quá lớn";
    return null;
  }
  if (field.type === "number") {
    const n = Number(text);
    if (!Number.isFinite(n)) return "phải là số";
    if (field.integer && !Number.isInteger(n)) return "phải là số nguyên";
    if (field.min !== undefined && n < field.min)
      return `tối thiểu là ${field.min}`;
    if (field.max !== undefined && n > field.max)
      return `tối đa là ${field.max}`;
    return null;
  }
  if (field.minLength && text.length < field.minLength)
    return `cần ít nhất ${field.minLength} ký tự (hiện có ${text.length})`;
  if (field.maxLength && text.length > field.maxLength)
    return `tối đa ${field.maxLength} ký tự (hiện có ${text.length})`;
  if (field.pattern && !field.pattern.test(text))
    return field.patternMessage ?? "sai định dạng";
  if (field.lines) {
    const items = text
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (items.length > field.lines.max) return `tối đa ${field.lines.max} dòng`;
    const long = items.findIndex((x) => x.length > field.lines!.itemMax);
    if (long >= 0)
      return `dòng ${long + 1} dài quá ${field.lines.itemMax} ký tự`;
  }
  return null;
}

/** Rules spanning several fields (mirrors the API's service checks). */
function crossChecks(kind: Kind, v: FormValues): FormIssue[] {
  const issues: FormIssue[] = [];
  const add = (field: string, label: string, message: string) =>
    issues.push({ field, label, message });
  if (kind === "projects") {
    if (
      str(v.startDate) &&
      str(v.handoverDate) &&
      str(v.startDate) > str(v.handoverDate)
    )
      add(
        "handoverDate",
        "Ngày bàn giao dự kiến",
        "không được trước ngày khởi công",
      );
    if (!!str(v.latitude) !== !!str(v.longitude))
      add(
        str(v.latitude) ? "longitude" : "latitude",
        "Tọa độ",
        "cần nhập đủ cả vĩ độ và kinh độ",
      );
    str(v.highlights)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((line, i) => {
        const [title, ...rest] = line.split("|");
        const text = rest.join("|").trim();
        if (!rest.length || title.trim().length < 2 || text.length < 2)
          add(
            "highlights",
            "Điểm nổi bật",
            `dòng ${i + 1} cần có dạng “Tiêu đề | Nội dung”`,
          );
        else if (title.trim().length > 120 || text.length > 400)
          add(
            "highlights",
            "Điểm nổi bật",
            `dòng ${i + 1}: tiêu đề tối đa 120, nội dung tối đa 400 ký tự`,
          );
      });
    const paragraphs = str(v.overview)
      .split(/\n\s*\n/)
      .filter((x) => x.trim());
    if (paragraphs.length > 20)
      add("overview", "Giới thiệu chi tiết", "tối đa 20 đoạn");
    if (paragraphs.some((p) => p.trim().length > 4000))
      add("overview", "Giới thiệu chi tiết", "mỗi đoạn tối đa 4000 ký tự");
  }
  if (kind === "properties" && !v.forRent && !v.forSale)
    add("forRent", "Hình thức", "cần chọn ít nhất Cho thuê hoặc Mua bán");
  if (
    kind === "properties" &&
    v.forRent &&
    str(v.depositMonths) &&
    !str(v.price)
  )
    add("price", "Giá thuê", "cần nhập để tính tiền đặt cọc");
  if (kind === "posts") {
    if (v.status === "PUBLISHED" && str(v.content).trim().length < 10)
      add(
        "content",
        "Nội dung chi tiết",
        "cần ít nhất 10 ký tự trước khi xuất bản",
      );
    const tags = str(v.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 20) add("tags", "Từ khóa", "tối đa 20 từ khóa");
    if (tags.some((t) => t.length > 60))
      add("tags", "Từ khóa", "mỗi từ khóa tối đa 60 ký tự");
  }
  if (
    kind === "leads" &&
    str(v.budgetMin) &&
    str(v.budgetMax) &&
    Number(v.budgetMin) > Number(v.budgetMax)
  )
    add(
      "budgetMax",
      "Ngân sách đến",
      "phải lớn hơn hoặc bằng ngân sách tối thiểu",
    );
  return issues;
}

/** Reads the form, keeping multi-value fields (checkbox groups) as arrays. */
function readForm(form: HTMLFormElement, fields: Field[]): FormValues {
  const data = new FormData(form);
  const values: FormValues = {};
  for (const item of fields) {
    if (item.type === "checkboxes" || item.type === "amenities")
      values[item.key] = data.getAll(item.key).map(String);
    else if (item.type === "checkbox")
      values[item.key] = data.get(item.key) === "on";
    else values[item.key] = String(data.get(item.key) ?? "").trim();
  }
  values.imageAlt = String(data.get("imageAlt") ?? "").trim();
  return values;
}
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ─────────────────────────────── editor ───────────────────────────────

export function Editor({
  kind,
  values: data,
  media: initialMedia,
  isNew,
  lookups,
  banner,
  previewHref,
  onSave,
  onCancel,
}: {
  kind: Kind;
  values: FormValues;
  media: MediaState;
  isNew: boolean;
  lookups: Lookups;
  /** Project form only: the homepage banner section. */
  banner?: {
    draft: ProjectBannerDraft;
    existing: boolean;
    maxPosition: number;
  };
  previewHref?: string;
  /** Resolves with server-side issues (none = saved). */
  onSave: (
    values: FormValues,
    media: MediaState,
    banner?: ProjectBannerDraft,
  ) => Promise<FormIssue[] | void>;
  onCancel: () => void;
}) {
  const sections = groups(kind, lookups, isNew).map((g) => ({
    ...g,
    fields: g.fields.filter((field) => !(field.newOnly && !isNew)),
  }));
  const allFields = sections.flatMap((g) => g.fields);
  const labelOf = (key: string) =>
    key === "banner"
      ? "Banner trang chủ"
      : key === "media"
        ? "Hình ảnh"
        : (allFields.find((x) => x.key === key)?.label ?? key);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [media, setMedia] = useState(initialMedia);
  const [bannerDraft, setBannerDraft] = useState(banner?.draft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<FormIssue[]>([]);
  // Live values for the progress checklist, counters and banner preview.
  const [live, setLive] = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of allFields)
      initial[field.key] =
        data[field.key] ??
        field.default ??
        (field.type === "checkboxes" || field.type === "amenities" ? [] : "");
    return initial;
  });
  const required = allFields.filter(
    (x) => x.required && !(x.lockedOnEdit && !isNew),
  );
  const filled = required.filter((x) => !checkField(x, live[x.key]));

  function snapshot() {
    if (formRef.current) setLive(readForm(formRef.current, allFields));
  }
  /**
   * Units inherit the project's area and address: choosing a project fills
   * them, unless the editor already typed something different.
   */
  const placeOf = (id: string) => lookups.projectPlaces?.[id];
  const lastProject = useRef(str(live.projectId));
  function fillFromProject(projectId: string) {
    const form = formRef.current;
    const next = placeOf(projectId);
    const previous = placeOf(lastProject.current);
    lastProject.current = projectId;
    if (!form || !next) return;
    const fill = (name: string, value: string, old?: string) => {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      if (!input || !value) return false;
      const current = input.value.trim();
      if (current && current !== old && current !== "Đà Nẵng") return false;
      input.value = value;
      return true;
    };
    const changed = [
      fill("location", next.location, previous?.location),
      fill("address", next.address, previous?.address),
    ].some(Boolean);
    if (changed) toast.success(`Đã điền khu vực và địa chỉ theo ${next.name}.`);
  }
  /** Folder for uploads: the unit code (or slug) typed in the form right now. */
  function uploadPlace(): UploadPlace | null {
    const form = formRef.current;
    const value = (name: string) =>
      (
        form?.elements.namedItem(name) as HTMLInputElement | null
      )?.value.trim() ?? "";
    if (kind === "properties")
      return { owner: "property", code: value("unitCode") || value("slug") };
    if (kind === "projects") return { owner: "project", code: value("slug") };
    if (kind === "posts") return { owner: "post", code: value("slug") };
    return null;
  }
  // A new unit starts with the default project's address.
  useEffect(() => {
    if (kind === "properties" && isNew && formRef.current)
      fillFromProject(
        (
          formRef.current.elements.namedItem(
            "projectId",
          ) as HTMLSelectElement | null
        )?.value ?? "",
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookups.projectPlaces]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function goTo(key: string) {
    const target =
      key === "banner" || key === "media"
        ? document.getElementById(
            key === "banner" ? "editor-section-banner" : "field-media",
          )
        : (formRef.current?.querySelector<HTMLElement>(`[name="${key}"]`) ??
          document.getElementById(`field-${key}`));
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }
  function report(issues: FormIssue[]) {
    const byField: Record<string, string> = {};
    for (const issue of issues)
      if (issue.field && !byField[issue.field])
        byField[issue.field] = issue.message;
    setFieldErrors(byField);
    setDialog(issues);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = readForm(event.currentTarget, allFields);
    const issues: FormIssue[] = [];
    for (const field of allFields) {
      if (field.lockedOnEdit && !isNew) continue;
      const problem = checkField(field, raw[field.key]);
      if (problem)
        issues.push({ field: field.key, label: field.label, message: problem });
    }
    issues.push(...crossChecks(kind, raw));
    if (kind === "projects" && bannerDraft?.enabled) {
      if (!bannerDraft.useProjectImage && !bannerDraft.image)
        issues.push({
          field: "banner",
          label: "Banner trang chủ",
          message: "cần chọn ảnh banner hoặc dùng ảnh đại diện dự án",
        });
      if (bannerDraft.useProjectImage && !media.cover)
        issues.push({
          field: "banner",
          label: "Banner trang chủ",
          message: "dự án cần có ảnh đại diện để dùng làm banner",
        });
    }
    if (media.videoUrl && !videoSource(media.videoUrl))
      issues.push({
        field: "media",
        label: "Video",
        message: "video cũ không hợp lệ, hãy xóa và tải lên lại",
      });
    if (issues.length) return report(issues);
    setFieldErrors({});
    setSaving(true);
    try {
      const serverIssues = await onSave(raw, media, bannerDraft);
      if (serverIssues?.length)
        report(
          serverIssues.map((issue) => ({
            ...issue,
            label:
              issue.label ?? (issue.field ? labelOf(issue.field) : undefined),
          })),
        );
      else setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  /** Current form text the AI reads (unsaved edits included). */
  function aiSource() {
    const v = formRef.current ? readForm(formRef.current, allFields) : live;
    if (kind === "posts")
      return {
        title: str(v.name),
        summary: str(v.description),
        content: str(v.content),
        context: str(v.tags) ? `Từ khóa hiện có: ${str(v.tags)}` : undefined,
      };
    if (kind === "projects")
      return {
        title: str(v.name),
        summary: str(v.description),
        content: [str(v.overview), str(v.products), str(v.highlights)]
          .filter(Boolean)
          .join("\n\n"),
        context: [
          str(v.location),
          str(v.developer) && `Chủ đầu tư: ${str(v.developer)}`,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    const project = lookups.projects.find(
      ([id]) => id === str(v.projectId),
    )?.[1];
    return {
      title: str(v.name),
      summary: str(v.description),
      content: [str(v.amenities), str(v.rentalPolicy)]
        .filter(Boolean)
        .join("\n\n"),
      context: [
        project && `Dự án: ${project}`,
        str(v.location),
        str(v.area) && `${str(v.area)} m²`,
        `${str(v.bedrooms)} phòng ngủ`,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }
  /** Writes an accepted AI suggestion into the (uncontrolled) inputs. */
  function applySeo(suggestion: SeoSuggestion) {
    const form = formRef.current;
    if (!form) return;
    const set = (name: string, value: string, onlyIfEmpty = false) => {
      const input = form.elements.namedItem(name) as
        HTMLInputElement | HTMLTextAreaElement | null;
      if (!input || (onlyIfEmpty && input.value.trim())) return;
      input.value = value;
    };
    set("seoTitle", suggestion.seoTitle);
    set("seoDescription", suggestion.seoDescription);
    if (kind === "posts" && suggestion.keywords.length)
      set("tags", suggestion.keywords.join(", "), true);
    if (suggestion.imageAlt) set("imageAlt", suggestion.imageAlt, true);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.seoTitle;
      delete next.seoDescription;
      return next;
    });
    setDirty(true);
    snapshot();
  }

  function renderField(item: Field) {
    const id = `field-${item.key}`;
    const value: FormValue = data[item.key] ?? item.default ?? "";
    const locked = !isNew && item.lockedOnEdit;
    const error = fieldErrors[item.key];
    const describedBy =
      [item.hint && `${id}-hint`, error && `${id}-error`]
        .filter(Boolean)
        .join(" ") || undefined;
    const tag = locked ? (
      <span className="field-tag">Không sửa</span>
    ) : item.required ? (
      <span className="field-tag required">Bắt buộc</span>
    ) : null;
    const errorText = error && (
      <span id={`${id}-error`} className="field-error-text">
        {item.label} {error}.
      </span>
    );
    if (item.type === "amenities") {
      const chosen = new Set((live[item.key] as string[] | undefined) ?? []);
      return (
        <div key={item.key} id={id} className="amenity-picker full">
          <p className="amenity-count" aria-live="polite">
            Đã chọn <strong>{chosen.size}</strong> tiện nghi
          </p>
          {AMENITY_GROUPS.map((group) => (
            <fieldset key={group.title} className="amenity-group">
              <legend>{group.title}</legend>
              <div className="amenity-grid">
                {group.items.map((a) => (
                  <label key={a.key} className="amenity-option">
                    <input
                      type="checkbox"
                      name={item.key}
                      value={a.key}
                      defaultChecked={chosen.has(a.key)}
                    />
                    <a.icon size={20} aria-hidden="true" />
                    <span>{a.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      );
    }
    if (item.type === "checkboxes" || item.type === "choice")
      return (
        <fieldset
          key={item.key}
          id={id}
          tabIndex={-1}
          className={`field-cards full${error ? " has-error" : ""}`}
          aria-describedby={describedBy}
        >
          <legend>
            {item.label} {tag}
          </legend>
          <div>
            {item.options!.map(([key, label]) => (
              <label key={key} className="field-card">
                <input
                  type={item.type === "choice" ? "radio" : "checkbox"}
                  name={item.key}
                  value={key}
                  defaultChecked={
                    Array.isArray(value)
                      ? value.includes(key)
                      : String(value) === key
                  }
                />
                <span>
                  <strong>{label}</strong>
                  {item.optionHints?.[key] && (
                    <small>{item.optionHints[key]}</small>
                  )}
                </span>
              </label>
            ))}
          </div>
          {item.hint && <small id={`${id}-hint`}>{item.hint}</small>}
          {errorText}
        </fieldset>
      );
    if (item.type === "checkbox")
      return (
        <label
          key={item.key}
          htmlFor={id}
          className={`banner-switch${item.wide ? " full" : ""}`}
        >
          <input
            id={id}
            type="checkbox"
            role="switch"
            name={item.key}
            defaultChecked={!!value}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
          <span aria-hidden="true" />
          <span className="switch-text">
            {item.label}
            {item.hint && <small id={`${id}-hint`}>{item.hint}</small>}
            {errorText}
          </span>
        </label>
      );
    const shared = {
      id,
      name: item.key,
      defaultValue: String(value ?? ""),
      readOnly: locked || undefined,
      placeholder: item.placeholder,
      "aria-describedby": describedBy,
      "aria-invalid": error ? true : undefined,
      "aria-required": item.required && !locked ? true : undefined,
    };
    const length = item.maxLength ? str(live[item.key]).length : 0;
    return (
      <div
        key={item.key}
        className={`field${item.wide ? " full" : ""}${error ? " has-error" : ""}`}
        hidden={item.showWhen ? !live[item.showWhen] : undefined}
      >
        <label htmlFor={id}>
          {item.label} {tag}
        </label>
        {item.type === "textarea" ? (
          <textarea {...shared} rows={item.rows ?? 4} />
        ) : item.type === "select" ? (
          <select {...shared} disabled={locked || undefined}>
            {!item.options?.length && (
              <option value="">Chưa có dữ liệu — hãy tạo trước</option>
            )}
            {item.options?.map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        ) : item.type === "date" ? (
          <DatePicker
            id={id}
            name={item.key}
            defaultValue={String(value ?? "")}
            invalid={!!error}
            describedBy={describedBy}
            disabled={locked || undefined}
            onChange={() => {
              setDirty(true);
              snapshot();
            }}
          />
        ) : item.type === "vnd" ? (
          <div className="input-unit">
            <input
              {...shared}
              defaultValue={formatVnd(String(value ?? ""))}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              onInput={(event) => {
                const input = event.currentTarget;
                input.value = formatVnd(input.value);
              }}
            />
            {item.unit && <span aria-hidden="true">{item.unit}</span>}
          </div>
        ) : (
          <div className={item.unit ? "input-unit" : undefined}>
            <input
              {...shared}
              type={item.type || "text"}
              inputMode={
                item.type === "number"
                  ? item.integer
                    ? "numeric"
                    : "decimal"
                  : undefined
              }
              min={item.min}
              max={item.max}
              step={item.step ?? (item.integer ? "1" : undefined)}
            />
            {item.unit && <span aria-hidden="true">{item.unit}</span>}
          </div>
        )}
        {locked && item.type === "select" && (
          <input type="hidden" name={item.key} value={String(value ?? "")} />
        )}
        {(item.hint || (item.maxLength && !locked)) && (
          <div className="field-foot">
            {item.hint ? (
              <small id={`${id}-hint`}>{item.hint}</small>
            ) : (
              <span />
            )}
            {item.maxLength && !locked ? (
              <small
                className={length > item.maxLength ? "counter over" : "counter"}
              >
                {length}/{item.maxLength}
              </small>
            ) : null}
          </div>
        )}
        {errorText}
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
              snapshot();
            }}
          >
            Tạo đường dẫn từ tên
          </button>
        )}
      </div>
    );
  }

  return (
    <UploadPlaceProvider value={uploadPlace}>
      <form
        ref={formRef}
        onSubmit={submit}
        onChange={(event) => {
          const target = event.target as unknown as HTMLInputElement;
          if (kind === "properties" && target.name === "projectId")
            fillFromProject(target.value);
          setDirty(true);
          snapshot();
        }}
        className="admin-editor admin-editor-page"
        noValidate
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
              : isNew
                ? "Bản ghi mới"
                : "Đang chỉnh sửa"}
          </span>
        </div>
        <section className="editor-intro">
          <div>
            <span className="eyebrow">{isNew ? "THÊM MỚI" : "CHỈNH SỬA"}</span>
            <h2>
              {isNew ? "Tạo" : "Cập nhật"} {intro[kind].title}
            </h2>
            <p>{intro[kind].text}</p>
          </div>
          <div className="editor-progress">
            <strong>
              {filled.length}/{required.length}
            </strong>
            <span>mục bắt buộc đã điền</span>
            <div className="editor-progress-bar" aria-hidden="true">
              <i
                style={{
                  width: `${required.length ? (filled.length / required.length) * 100 : 100}%`,
                }}
              />
            </div>
          </div>
        </section>
        <ConfirmDialog
          open={canceling}
          title="Rời đi mà không lưu?"
          message="Các thay đổi trong biểu mẫu chưa được lưu sẽ bị bỏ."
          confirmLabel="Bỏ thay đổi"
          onConfirm={onCancel}
          onCancel={() => setCanceling(false)}
        />
        <div className="editor-layout">
          <div className="editor-sections">
            {sections.map((group, index) => (
              <section
                className="admin-panel editor-section"
                key={group.id}
                id={`editor-section-${group.id}`}
              >
                <header>
                  <span className="editor-section-number" aria-hidden="true">
                    <group.icon size={17} />
                  </span>
                  <div>
                    <h2>
                      <small>{String(index + 1).padStart(2, "0")}</small>{" "}
                      {group.title}
                    </h2>
                    <p>{group.description}</p>
                  </div>
                </header>
                <div className="form-grid">
                  {group.id === "seo" && kind !== "leads" && (
                    <AiSeoAssistant
                      kind={aiKind[kind]}
                      path={`${publicBase[kind]}/${str(live.slug) || "duong-dan"}`}
                      getSource={aiSource}
                      onApply={applySeo}
                    />
                  )}
                  {group.fields.flatMap((item) =>
                    item.subhead
                      ? [
                          <h3
                            key={`${item.key}-subhead`}
                            className="field-subhead full"
                            hidden={
                              item.showWhen ? !live[item.showWhen] : undefined
                            }
                          >
                            {item.subhead}
                          </h3>,
                          renderField(item),
                        ]
                      : [renderField(item)],
                  )}
                </div>
              </section>
            ))}
            {kind === "projects" && bannerDraft && banner && (
              <div id="editor-section-banner" tabIndex={-1}>
                {fieldErrors.banner && (
                  <p className="field-error-text">
                    Banner trang chủ: {fieldErrors.banner}.
                  </p>
                )}
                <ProjectBannerSection
                  number={sections.length + 1}
                  project={{
                    name: str(live.name),
                    slug: str(live.slug),
                    description: str(live.description),
                    published: live.status === "PUBLISHED",
                    cover: media.cover,
                    coverAlt: str(data.imageAlt),
                  }}
                  existing={banner.existing}
                  maxPosition={banner.maxPosition}
                  draft={bannerDraft}
                  onChange={(next) => {
                    setBannerDraft(next);
                    setDirty(true);
                  }}
                />
              </div>
            )}
          </div>
          <aside className="editor-aside">
            {kind !== "leads" && (
              <section
                className="admin-panel editor-media"
                id="field-media"
                tabIndex={-1}
              >
                <h2>
                  <ImagePlus size={19} />
                  {kind === "properties" ? "Ảnh & video" : "Hình ảnh"}
                </h2>
                {fieldErrors.media && (
                  <p className="field-error-text">{fieldErrors.media}.</p>
                )}
                {kind === "properties" && (
                  <p className="upload-place-note">
                    {str(live.unitCode) ? (
                      <>
                        Tệp lưu trong thư mục{" "}
                        <code>can-ho/{str(live.unitCode)}/</code>
                      </>
                    ) : (
                      "Nhập Mã căn trước khi tải ảnh để tệp được lưu theo mã căn (dễ tìm khi sao lưu)."
                    )}
                  </p>
                )}
                {kind === "properties" ? (
                  <MediaManager
                    value={media.gallery}
                    onChange={(gallery) => {
                      setMedia({ ...media, gallery });
                      setDirty(true);
                    }}
                    legacyVideo={media.videoUrl ?? undefined}
                    onRemoveLegacyVideo={() => {
                      setMedia({ ...media, videoUrl: null });
                      setDirty(true);
                    }}
                  />
                ) : (
                  <>
                    <p>
                      Tải ảnh lên hoặc chọn từ thư viện. Ảnh được nén WebP và
                      xóa thông tin vị trí chụp.
                    </p>
                    <MediaPicker
                      label={
                        kind === "posts" ? "Ảnh bìa bài viết" : "Ảnh đại diện"
                      }
                      value={media.cover}
                      onChange={(cover) => {
                        setMedia({ ...media, cover });
                        setDirty(true);
                      }}
                    />
                  </>
                )}
                <div className="field">
                  <label htmlFor="field-imageAlt">Mô tả ảnh (alt text)</label>
                  <input
                    id="field-imageAlt"
                    name="imageAlt"
                    defaultValue={String(data.imageAlt ?? "")}
                    maxLength={300}
                    placeholder="Mô tả ngắn nội dung ảnh"
                    aria-describedby="field-imageAlt-hint"
                  />
                  <small id="field-imageAlt-hint">
                    Giúp Google và người dùng trình đọc màn hình hiểu ảnh.
                  </small>
                </div>
                {kind === "projects" && (
                  <MediaGallery
                    value={media.gallery}
                    onChange={(gallery) => {
                      setMedia({ ...media, gallery });
                      setDirty(true);
                    }}
                  />
                )}
              </section>
            )}
            <section className="admin-panel editor-guide">
              <h2>
                <CheckCircle2 size={18} />
                Mục bắt buộc
              </h2>
              <ul className="editor-checklist">
                {required.map((x) => {
                  const done = !checkField(x, live[x.key]);
                  return (
                    <li key={x.key} data-done={done}>
                      <button type="button" onClick={() => goTo(x.key)}>
                        {done ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <Circle size={15} />
                        )}
                        {x.label}
                        <span className="sr-only">
                          {done ? " (đã điền)" : " (chưa điền)"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <dl>
                <dt>Loại nội dung</dt>
                <dd>{names[kind]}</dd>
                {!isNew && (
                  <>
                    <dt>Mã bản ghi</dt>
                    <dd>{String(data.id ?? "")}</dd>
                  </>
                )}
              </dl>
              {previewHref && (
                <a
                  className="text-link"
                  href={previewHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem trước trên website <ExternalLink size={15} />
                </a>
              )}
              <nav aria-label="Các phần biểu mẫu">
                {sections.map((group, index) => (
                  <a key={group.id} href={`#editor-section-${group.id}`}>
                    {String(index + 1).padStart(2, "0")} · {group.title}
                  </a>
                ))}
                {kind === "projects" && banner && (
                  <a href="#editor-section-banner">
                    {String(sections.length + 1).padStart(2, "0")} · Banner
                    trang chủ
                  </a>
                )}
              </nav>
            </section>
          </aside>
        </div>
        <div className="editor-savebar">
          <span>
            <Info size={16} />
            {saving
              ? "Đang lưu lên máy chủ…"
              : filled.length < required.length
                ? `Còn ${required.length - filled.length} mục bắt buộc chưa điền`
                : dirty
                  ? "Sẵn sàng lưu thay đổi"
                  : "Kiểm tra thông tin trước khi lưu"}
          </span>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => (dirty ? setCanceling(true) : onCancel())}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              <Save size={17} />
              {saving
                ? "Đang lưu…"
                : isNew
                  ? `Tạo ${intro[kind].title}`
                  : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
        <ErrorDialog
          issues={dialog}
          onClose={() => setDialog([])}
          onGoTo={goTo}
        />
      </form>
    </UploadPlaceProvider>
  );
}
