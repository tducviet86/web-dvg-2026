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
  // Articles
  ["/6-luu-y-khi-dau-tu-bat-dong-san-de-tranh-mat-sach-von", "/blog"],
];
