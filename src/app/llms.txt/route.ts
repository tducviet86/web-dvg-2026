import {
  getPosts,
  getPublicSettings,
  getServices,
  getSiteContent,
} from "@/lib/api/content";
import { listingFaqs, rentalUnits } from "@/lib/faq";
import {
  MIN_LANDING_UNITS,
  landingFacts,
  landingPath,
  landingSummary,
  landingUnits,
  readLandings,
} from "@/lib/landings";
import { siteUrl } from "@/lib/utils";

// Built per request from cached API data, like the sitemap.
export const revalidate = 0;

const million = (vnd: number) =>
  `${(vnd / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
const line = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * /llms.txt: a plain-language summary of the company and its listings for
 * AI assistants (llmstxt.org format), with links to the pages to cite.
 * Only published content and stored facts are used.
 */
export async function GET() {
  const [settings, content, services, posts] = await Promise.all([
    getPublicSettings().catch(() => ({}) as Record<string, string>),
    getSiteContent(),
    getServices().catch(() => []),
    getPosts().catch(() => []),
  ]);
  const brand = settings["company.brand"] || "Đất Vàng Group";
  const units = rentalUnits(content.properties);
  const free = units.filter((u) => u.status === "Còn trống");
  const rentProjects = content.portfolio.filter((p) =>
    p.categories.includes("rent"),
  );

  const towerNames = (projectId: string) => {
    const towers = content.apiProjects.find((x) => x.id === projectId)?.towers;
    return towers?.length
      ? `các tòa: ${towers
          .map((x) => (x.note ? `${x.name} (${x.note})` : x.name))
          .join(", ")}`
      : "";
  };
  const projectLine = (p: (typeof content.portfolio)[number]) => {
    const own = free.filter((u) => u.projectId === p.projectId);
    const prices = own.map((u) => u.rentVnd).filter((n): n is number => !!n);
    const facts = [
      p.location,
      own.length ? `${own.length} căn còn trống` : "",
      prices.length ? `giá thuê từ ${million(Math.min(...prices))}/tháng` : "",
      towerNames(p.projectId),
    ].filter(Boolean);
    const page = p.categories.includes("rent")
      ? `${siteUrl}/cho-thue/du-an/${p.slug}`
      : `${siteUrl}/du-an/${p.slug}`;
    return `- [${p.name}](${page}): ${facts.join("; ")}`;
  };

  const contact = [
    settings["company.legalName"] &&
      `- Tên pháp lý: ${settings["company.legalName"]}`,
    settings["company.taxCode"] &&
      `- Mã số thuế: ${settings["company.taxCode"]}`,
    settings["company.address"] && `- Địa chỉ: ${settings["company.address"]}`,
    settings["company.hotline"] &&
      `- Hotline / Zalo: ${settings["company.hotline"]}`,
    settings["company.email"] && `- Email: ${settings["company.email"]}`,
    settings["company.workingHours"] &&
      `- Giờ làm việc: ${settings["company.workingHours"]}`,
    settings["social.facebook"] && `- Facebook: ${settings["social.facebook"]}`,
  ].filter(Boolean);

  // Search landing pages with enough units to be indexed (Admin › SEO).
  const landings = readLandings(settings["seo.landings"])
    .filter((l) => l.published)
    .map((l) => ({ l, units: landingUnits(l, content.properties) }))
    .filter(({ units }) => units.length >= MIN_LANDING_UNITS)
    .map(
      ({ l, units }) =>
        `- [${l.h1}](${siteUrl}${landingPath(l)}): ${line(
          landingSummary(landingFacts(l, units)),
        )}`,
    );
  const faqs = listingFaqs(content.properties, undefined, rentProjects);
  const body = [
    `# ${brand}`,
    "",
    `> ${line(
      `${brand} là công ty bất động sản tại Đà Nẵng: cho thuê và mua bán căn hộ, quản lý và khai thác căn hộ cho chủ sở hữu tại các dự án ${rentProjects
        .map((p) => p.name)
        .join(", ")}.`,
    )}`,
    "",
    "Đất Vàng Luxury và Đất Vàng Smart City nay được gộp chung vào Đất Vàng Group.",
    "",
    `Website bằng tiếng Việt (có bản tiếng Anh /en, tiếng Hàn /ko, tiếng Trung /zh). Giá và tình trạng căn hộ lấy trực tiếp từ hệ thống quản lý và thay đổi theo thời điểm${
      free.length ? `; hiện có ${free.length} căn hộ còn trống để cho thuê` : ""
    }.`,
    "",
    "## Căn hộ cho thuê theo dự án",
    ...rentProjects.map(projectLine),
    `- [Tất cả căn hộ cho thuê tại Đà Nẵng](${siteUrl}/cho-thue)`,
    "",
    "## Mua bán căn hộ",
    `- [Căn hộ đang bán và căn mẫu tại Đà Nẵng](${siteUrl}/mua-ban)`,
    "",
    ...(landings.length ? ["## Tìm căn theo nhu cầu", ...landings, ""] : []),
    "## Dự án khác",
    ...content.portfolio
      .filter((p) => !p.categories.includes("rent"))
      .map(projectLine),
    `- [Danh mục dự án](${siteUrl}/du-an)`,
    "",
    ...(services.length
      ? [
          "## Lĩnh vực hoạt động",
          ...services.map(
            (s) =>
              `- [${s.name}](${s.href.startsWith("/") ? siteUrl + s.href : s.href}): ${line(s.description)}`,
          ),
          "",
        ]
      : []),
    ...(faqs.length
      ? ["## Hỏi đáp nhanh", ...faqs.flatMap(([q, a]) => [`- ${q} ${a}`]), ""]
      : []),
    ...(posts.length
      ? [
          "## Bài viết mới",
          ...posts
            .slice(0, 10)
            .map(
              (p) =>
                `- [${p.name}](${siteUrl}/blog/${p.slug}): ${line(p.description)}`,
            ),
          "",
        ]
      : []),
    "## Liên hệ",
    ...contact,
    `- [Trang liên hệ](${siteUrl}/lien-he)`,
    `- [Ký gửi căn hộ cho chủ sở hữu](${siteUrl}/hop-tac-chu-so-huu)`,
    "",
    "## Thông tin khác",
    `- [Giới thiệu công ty](${siteUrl}/gioi-thieu)`,
    `- [Tuyển dụng](${siteUrl}/tuyen-dung)`,
    `- [Sơ đồ trang web](${siteUrl}/sitemap.xml)`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
