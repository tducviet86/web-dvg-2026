export const homeProjects = [
  {
    id: "capital",
    slug: "capital-square",
    projectId: "project-6",
    name: "Capital Square",
    group: "development",
    location: "Bên sông Hàn · Đà Nẵng",
    imageType: "Phối cảnh dự án",
    source: "https://capitalsquare.vn/",
  },
  {
    id: "symphony",
    slug: "sun-symphony-residence",
    projectId: "project-7",
    name: "Sun Symphony Residence",
    group: "development",
    location: "Trần Hưng Đạo · Đà Nẵng",
    imageType: "Phối cảnh dự án",
    source:
      "https://sunpropertygroup.vn/en/projects/sun-symphony-residence-9528",
  },
  {
    id: "cora",
    slug: "cora-tower",
    projectId: "project-8",
    name: "Cora Tower",
    group: "development",
    location: "Nam Hòa Xuân · Đà Nẵng",
    imageType: "Phối cảnh dự án",
    source: "https://sunpropertygroup.vn/projects/cora-tower-9556",
  },
  {
    id: "monarchy",
    slug: "monarchy-apartments",
    projectId: "project-3",
    name: "Monarchy",
    group: "operation",
    location: "Trần Hưng Đạo · Đà Nẵng",
    imageType: "Phối cảnh dự án",
    source: "https://monarchydanang.com.vn/gioi-thieu/",
  },
  {
    id: "ponte",
    slug: "sun-ponte-residence",
    projectId: "project-1",
    name: "Sun Ponte Residence",
    group: "operation",
    location: "Trần Hưng Đạo · Đà Nẵng",
    imageType: "Phối cảnh dự án",
    source: "https://sunpropertygroup.vn/en/projects/sun-ponte-residence-9554",
  },
  {
    id: "panoma",
    slug: "sun-panoma",
    projectId: "project-2",
    name: "Sun Panoma",
    group: "operation",
    location: "Sun Cosmo Residence · Đà Nẵng",
    imageType: "Phối cảnh dự án",
    source: "https://sunpropertygroup.vn/projects/sun-cosmo-residence-9549",
  },
  {
    id: "sam",
    slug: "sam-tower",
    projectId: "project-4",
    name: "Sam Tower",
    group: "operation",
    location: "Như Nguyệt · Đà Nẵng",
    imageType: "Ảnh thực tế",
    source: "https://samtowers.com.vn/",
  },
  {
    id: "hiyori",
    slug: "hiyori-garden-tower",
    projectId: "project-5",
    name: "Hiyori Garden Tower",
    group: "operation",
    location: "Võ Văn Kiệt · Đà Nẵng",
    imageType: "Ảnh thực tế",
    source: "https://hiyorigardentower.com/vi/",
  },
] as const;

export type PortfolioProject = (typeof homeProjects)[number];
export const projectStories: Record<
  PortfolioProject["id"],
  {
    intro: string;
    paragraphs: string[];
    products: string[];
    highlights: { title: string; text: string }[];
  }
> = {
  capital: {
    intro:
      "Không gian đô thị bên sông Hàn, kết nối nhịp sống trung tâm Đà Nẵng.",
    paragraphs: [
      "Capital Square nằm ở bờ Đông sông Hàn, trong khu vực kết nối các trục Trần Hưng Đạo, Ngô Quyền và Nguyễn Công Trứ. Dự án được giới thiệu theo định hướng tổ hợp đô thị, kết hợp không gian ở với thương mại và tiện ích.",
      "Điểm nhận diện của dự án là tầm nhìn hướng sông cùng sự kết nối với khu trung tâm thành phố. Khách hàng có thể tìm hiểu từng loại căn hộ, mặt bằng và thông tin sản phẩm phù hợp với nhu cầu sử dụng.",
    ],
    products: ["Căn hộ", "Không gian thương mại", "Tiện ích nội khu"],
    highlights: [
      {
        title: "Vị trí bên sông",
        text: "Bờ Đông sông Hàn, kết nối khu vực cầu Sông Hàn.",
      },
      {
        title: "Tổ hợp đô thị",
        text: "Không gian ở gắn với thương mại và các hoạt động hằng ngày.",
      },
      {
        title: "Góc nhìn kiến trúc",
        text: "Các khối tháp tạo nên diện mạo đô thị trong phối cảnh dự án.",
      },
    ],
  },
  symphony: {
    intro: "Một tổ hợp nhiều nhịp sống bên dòng sông Hàn.",
    paragraphs: [
      "Sun Symphony Residence là tổ hợp nằm bên sông Hàn tại Đà Nẵng. Theo giới thiệu của Sun Property, dự án gồm phân khu thấp tầng The Sonata và phân khu cao tầng The Symphony.",
      "The Sonata có nhà phố và biệt thự; The Symphony tập trung vào các sản phẩm căn hộ. Sự kết hợp này tạo nên lựa chọn đa dạng cho khách hàng muốn tìm hiểu không gian ở và sản phẩm thương mại trong cùng một quần thể.",
    ],
    products: [
      "Căn hộ Studio, 1PN+1, 2PN, 3PN",
      "Penthouse & Sky Villa",
      "Nhà phố & biệt thự",
    ],
    highlights: [
      {
        title: "Hai phân khu",
        text: "The Sonata và The Symphony với các loại hình sản phẩm khác nhau.",
      },
      {
        title: "Bên dòng sông Hàn",
        text: "Vị trí kết nối không gian cảnh quan ven sông với đô thị.",
      },
      {
        title: "Sản phẩm đa dạng",
        text: "Từ căn hộ đến nhà phố, biệt thự và sản phẩm thương mại.",
      },
    ],
  },
  cora: {
    intro: "Dấu ấn kiến trúc giữa khu đô thị Nam Hòa Xuân.",
    paragraphs: [
      "Cora Tower là dự án căn hộ của Sun Group tại khu đô thị Nam Hòa Xuân, Đà Nẵng. Kiến trúc được giới thiệu với cảm hứng “Song Lân Chầu Nhật”, tạo nên hình ảnh hai khối tháp có sự liên kết.",
      "Danh mục sản phẩm được Sun Property công bố gồm Studio, căn hộ 1 phòng ngủ, 1 phòng ngủ cộng, 2 và 3 phòng ngủ, Penthouse cùng Shophouse khối đế. Mỗi loại hình đáp ứng một cách sử dụng không gian khác nhau.",
    ],
    products: [
      "Studio, 1PN & 1PN+1",
      "Căn hộ 2PN & 3PN",
      "Penthouse & Shophouse",
    ],
    highlights: [
      {
        title: "Nam Hòa Xuân",
        text: "Nằm trong không gian quy hoạch của khu đô thị phía Nam Đà Nẵng.",
      },
      {
        title: "Kiến trúc hai tháp",
        text: "Hình khối lấy cảm hứng từ hình tượng Song Lân Chầu Nhật.",
      },
      {
        title: "Nhiều lựa chọn",
        text: "Danh mục căn hộ và không gian thương mại tại khối đế.",
      },
    ],
  },
  monarchy: {
    intro: "Căn hộ bên bờ Đông sông Hàn, trong nhịp sống đô thị Đà Nẵng.",
    paragraphs: [
      "Monarchy nằm trên trục Trần Hưng Đạo, thuộc khu vực bờ Đông sông Hàn. Danh mục vận hành tại đây được tổ chức theo nhu cầu mua bán, tìm thuê và ký gửi của chủ sở hữu.",
    ],
    products: ["Mua bán căn hộ", "Thuê & cho thuê", "Ký gửi tài sản"],
    highlights: [],
  },
  ponte: {
    intro: "Kết nối không gian sống với những cây cầu biểu tượng của Đà Nẵng.",
    paragraphs: [
      "Sun Ponte Residence nằm trên đường Trần Hưng Đạo, gồm phân khu cao tầng The Ponte và phân khu thấp tầng The Rio. Khách hàng có thể chọn nhu cầu mua bán, thuê hoặc ký gửi để tiếp tục tìm hiểu sản phẩm tại dự án.",
    ],
    products: ["Mua bán căn hộ", "Thuê & cho thuê", "Ký gửi tài sản"],
    highlights: [],
  },
  panoma: {
    intro: "Không gian căn hộ thuộc quần thể Sun Cosmo Residence.",
    paragraphs: [
      "Sun Panoma là tên gọi được sử dụng cho phân khu The Panoma thuộc Sun Cosmo Residence tại Đà Nẵng. Đất Vàng tổ chức thông tin theo từng nhu cầu để khách hàng dễ tìm hiểu căn hộ và chủ sở hữu thuận tiện trao đổi việc ký gửi.",
    ],
    products: ["Mua bán căn hộ", "Thuê & cho thuê", "Ký gửi tài sản"],
    highlights: [],
  },
  sam: {
    intro: "Không gian cao tầng trên trục Như Nguyệt bên sông Hàn.",
    paragraphs: [
      "Sam Tower tọa lạc trên đường Như Nguyệt tại Đà Nẵng. Khách hàng và chủ sở hữu có thể trao đổi về căn hộ cần mua, thuê hoặc ký gửi trong danh mục vận hành.",
    ],
    products: ["Mua bán căn hộ", "Thuê & cho thuê", "Ký gửi tài sản"],
    highlights: [],
  },
  hiyori: {
    intro: "Điểm kết nối trên trục Võ Văn Kiệt, Đà Nẵng.",
    paragraphs: [
      "Hiyori Garden Tower nằm trên đường Võ Văn Kiệt tại Đà Nẵng. Trang dự án tập hợp nhu cầu thuê, mua bán và ký gửi, giúp khách hàng tiếp cận thông tin căn hộ trước khi liên hệ xem thực tế.",
    ],
    products: ["Mua bán căn hộ", "Thuê & cho thuê", "Ký gửi tài sản"],
    highlights: [],
  },
};
