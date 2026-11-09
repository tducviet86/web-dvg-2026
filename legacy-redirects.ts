/**
 * Pages of the previous datvanggroup.vn website that Google still lists.
 * Each one moves permanently (301) to the closest page of this site, so
 * visitors from old search results land somewhere useful and the old
 * pages pass their ranking on. Add a line when Search Console reports
 * another old URL as "Not found (404)".
 */
export const LEGACY_REDIRECTS: [from: string, to: string][] = [
  // Company
  ["/ve-chung-toi", "/gioi-thieu"],
  ["/van-hoa-dv", "/gioi-thieu/tam-nhin-su-menh"],
  ["/van-hoa-dat-vang", "/gioi-thieu/tam-nhin-su-menh"],
  [
    "/le-khai-truong-van-phong-cong-ty-cp-dat-vang-group-chi-nhanh-fpt-city",
    "/gioi-thieu",
  ],
  [
    "/dong-hanh-phat-trien-dat-vang-group-cung-vingroup-tao-dung-gia-tri-moi",
    "/gioi-thieu/doi-tac",
  ],
  ["/ngay-hoi-tuyen-dung-dat-vang-luxury", "/tuyen-dung"],
  // Projects still on this site
  ["/can-ho-cao-cap-monarchy-da-nang", "/du-an/monarchy-apartments"],
  ["/cap-nhat-tien-do-du-an-monarchy", "/du-an/monarchy-apartments"],
  ["/tong-quan-du-an-capital-square-da-nang", "/du-an/capital-square"],
  ["/tong-quan-du-an-the-legend-city-da-nang", "/du-an/trien-khai"],
  // FPT Plaza 2 (not listed any more): the project directory
  ["/dat-vang-luxury", "/du-an"],
  [
    "/fpt-plaza-2-da-nang-dvg-don-vi-phat-trien-du-an-chinh-thuc-tu-cdt",
    "/du-an",
  ],
  [
    "/shophouse-khoi-de-fpt-plaza-2-mo-vang-dau-tu-cho-quy-khach-hang-nha-dau-tu",
    "/du-an",
  ],
  [
    "/dvg-thong-bao-ngan-hang-tien-phong-bank-tiep-tuc-ha-lai-suat-cho-vay-du-an-fpt-plaza-2",
    "/du-an",
  ],
  [
    "/dat-vang-group-cap-nhap-hinh-anh-moi-nhat-toa-fpt-plaza-2-o189z8c69x",
    "/du-an",
  ],
  [
    "/dat-vang-group-ra-mat-combo-tron-goi-quan-ly-van-hanh-can-ho-cho-fpt-plaza2",
    "/dich-vu/quan-ly-bat-dong-san",
  ],
  // Articles; the old news listing and its pages ("/tin-tuc-du-an/page/9")
  ["/tin-tuc-du-an", "/blog"],
  ["/tin-tuc-du-an/:path*", "/blog"],
  ["/tin-tuc", "/blog"],
  ["/tin-tuc/:path*", "/blog"],
  ["/tin-tuc-can-ho", "/blog"],
  ["/6-luu-y-khi-dau-tu-bat-dong-san-de-tranh-mat-sach-von", "/blog"],
  // A category no longer on the blog (remove if it comes back).
  ["/blog/danh-muc/phong-cach-song", "/blog"],
  // Old tag pages
  ["/tags/tuyen-dung-:rest", "/tuyen-dung"],
  ["/tags/:path*", "/gioi-thieu"],
  // Monarchy news: the project's page
  [
    "/ban-giao-can-ho-chung-cu-the-monarchy-da-nang",
    "/du-an/monarchy-apartments",
  ],
  [
    "/cap-nhap-tien-do-du-an-monarchy-thang-11-2019",
    "/du-an/monarchy-apartments",
  ],
  [
    "/don-cho-giai-doan-3-monarchy-block-b-voi-su-tang-gia-du-kien-20-25",
    "/du-an/monarchy-apartments",
  ],
  ["/du-an-can-ho-cao-cap-monarchy-da-nang", "/du-an/monarchy-apartments"],
  [
    "/nhan-nha-monarchy-nhan-them-uu-dai-tu-pnt-furniture",
    "/du-an/monarchy-apartments",
  ],
  [
    "/dat-vang-luxury-group-dot-nong-thi-truong-bat-dong-san-voi-hang-tram-khach-hang-den-voi-du-an-can-ho-monarchy-sau-dai-dich-covid-19",
    "/du-an/monarchy-apartments",
  ],
  // FPT Plaza (not listed any more): the project directory
  [
    "/can-shophouse-sh07-san-pham-gioi-han-cong-nang-da-nhiem-tai-fpt-plaza-2",
    "/du-an",
  ],
  [
    "/can-shophouse-sh11-san-pham-gioi-han-loi-nhuan-toi-da-tai-fpt-plaza-2-r1qinhm3ch",
    "/du-an",
  ],
  [
    "/can-shophouse-sh15-san-pham-gioi-han-kinh-doanh-da-nhiem-tai-fpt-plaza-2",
    "/du-an",
  ],
  [
    "/dat-vang-group-gioi-thieu-can-ho-tang-15-fpt-plaza-1-muc-gia-chua-den-1-8-ty-dong",
    "/du-an",
  ],
  [
    "/dat-vang-group-trien-khai-chuong-trinh-khuyen-mai-thiet-ke-thi-cong-noi-that-cho-khach-mua-can-ho-fpt-plaza-2",
    "/du-an",
  ],
  [
    "/dip-nghi-le-30-4-1-5-moi-tham-quan-trai-nghiem-du-an-fpt-plaza-2-va-quang-truong-cong-vien-nuoc-lon-nhat-da-nang",
    "/du-an",
  ],
  [
    "/ky-3-quy-khach-can-luu-y-gi-truoc-khi-nhan-ban-giao-can-ho-fpt-plaza-2",
    "/du-an",
  ],
  [
    "/tham-du-big-event-chuong-trinh-mo-ban-dot-cuoi-can-ho-fpt-plaza-2-uu-dai-lon-nhat-nam",
    "/du-an",
  ],
  [
    "/the-le-cuoc-thi-sang-tao-video-moi-khach-hang-tham-quan-du-an-tuyetvoifptplaza2-tren-nen-tang-mxh",
    "/du-an",
  ],
  ["/giao-diem-phon-hoa-tam-nhin-sinh-loi", "/du-an"],
  // FPT Plaza flats for rent, fireworks views: the rentals
  [
    "/cho-thue-can-ho-3-phong-ngu-view-dep-tai-fpt-plaza-2-gia-chi-10-trieu-dong-thang",
    "/cho-thue",
  ],
  [
    "/cho-thue-can-ho-3-phong-ngu-view-ngam-bien-tai-fpt-plaza-2-gia-chi-12-trieu-dong-thang",
    "/cho-thue",
  ],
  [
    "/cho-thue-can-ho-tang-17-fpt-plaza-2-view-dep-noi-that-dang-cap",
    "/cho-thue",
  ],
  [
    "/cho-thue-can-ho-tang-25-fpt-plaza-2-view-dep-noi-that-sang-xin-min",
    "/cho-thue",
  ],
  [
    "/dat-vang-group-tung-loat-can-ho-view-sieu-dep-ngam-nhin-le-hoi-phao-hoa-da-nang",
    "/cho-thue",
  ],
  [
    "/kham-pha-can-ho-view-sieu-dep-tan-huong-le-hoi-phao-hoa-da-nang-cung-dat-vang-group",
    "/cho-thue",
  ],
  // Market news
  [
    "/bat-dong-san-da-nang-dang-tren-da-phuc-hoi",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/bo-quy-dinh-thoi-han-so-huu-chung-cu-khuyen-khich-nguoi-nuoc-ngoai-mua-nha-o-viet-nam",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/da-nang-dua-ke-hoach-xay-ham-qua-song-han-vao-du-thao-quy-hoach-moi-nhat",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/da-nang-khoi-thong-nguon-luc-giu-vung-tang-truong-kinh-te",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/da-nang-se-dau-gia-19-khu-dat-vang-tai-cac-vi-tri-nao",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/han-quoc-du-dinh-se-mo-lanh-su-quan-o-da-nang-phuc-vu-du-khach",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/nguoi-mua-quay-tro-lai-thi-truong-bat-dong-san-da-nang",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/nha-dau-tu-nuoc-ngoai-quan-tam-nhat-den-mua-chung-cu-trung-cap-va-cao-cap-tai-viet-nam",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/nhung-cong-trinh-duoi-bien-tai-du-an-dat-vang-hoi-an-golden-sea",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/nhung-luu-y-de-tranh-rui-ro-khi-mua-nha-o-hinh-thanh-trong-tuong-lai",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/nua-nam-nhin-lai-thi-truong-bds-da-nang-dang-ra-sao",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/siet-chat-hoat-dong-moi-gioi-bat-dong-san",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/tinh-den-thang-3-2023-da-nang-co-16-duong-bay-quoc-te-den-thanh-pho",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/vi-sao-can-ho-cao-cap-van-hut-gioi-dau-tu",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/viet-nam-van-la-thi-truong-bat-dong-san-ua-thich-cua-nha-dau-tu",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  [
    "/von-dau-tu-han-quoc-vao-viet-nam-tang-vot-qua-cac-nam",
    "/blog/danh-muc/thi-truong-bat-dong-san",
  ],
  // Company news
  [
    "/chi-con-1-ngay-nua-la-le-ky-ket-khai-thac-kinh-doanh-va-cho-thue-se-chinh-thuc-dien-ra",
    "/blog/danh-muc/tin-doanh-nghiep",
  ],
  [
    "/chuc-mung-sinh-nhat-nguoi-dan-duong-dat-vang-group-ceo-le-tu-luyen",
    "/blog/danh-muc/tin-doanh-nghiep",
  ],
  [
    "/cuoc-thi-anh-online-vien-ngoc-sang-giua-long-song-han",
    "/blog/danh-muc/tin-doanh-nghiep",
  ],
  ["/dat-vang-group-thong-bao-thay-doi", "/blog/danh-muc/tin-doanh-nghiep"],
  [
    "/ngay-sinh-nhat-nguoi-dan-dau-cong-ty-dat-vang-ceo-le-tu-luyen-3z9a7d7ya8",
    "/blog/danh-muc/tin-doanh-nghiep",
  ],
  [
    "/mua-can-ho-kieu-moi-toi-dat-vang-luxury",
    "/blog/danh-muc/tin-doanh-nghiep",
  ],
  // Company pages of the old site, and its English pages
  ["/gioi-thieu-chung", "/gioi-thieu"],
  ["/dvg-academy", "/tuyen-dung"],
  ["/nhan-vien", "/gioi-thieu/doi-ngu"],
  ["/nguyen-van-thanh", "/gioi-thieu/doi-ngu"],
  ["/contact", "/lien-he"],
  ["/can-ho-cho-thue", "/cho-thue"],
  ["/can-ho-danang-plaza", "/du-an"],
  ["/can-ho-lapaz-tower", "/du-an"],
  ["/can-ho-muong-thanh-:rest", "/du-an"],
  // Units taken down whose address names no project
  ["/cho-thue/can-ho-1-pn", "/cho-thue"],
  ["/cho-thue/can-ho-view-bien-2-phong-ngu", "/cho-thue"],
  // Stray words Google followed from the old site's date widgets
  // (matched as sent: percent-encoded)
  ["/%E6%9C%88", "/blog"],
  ["/%EC%9B%94", "/blog"],
];

/** The same moves under /en, /ko and /zh. */
export const LOCALE_PREFIX = "/:locale(en|ko|zh)";
