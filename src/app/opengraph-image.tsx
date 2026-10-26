import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Đất Vàng Group — Mua bán, cho thuê và ký gửi căn hộ tại Đà Nẵng";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Files under public/, inlined so the image renders at build time. */
async function inline(path: string, mime: string) {
  const data = await readFile(join(process.cwd(), "public", path));
  return `data:${mime};base64,${data.toString("base64")}`;
}

/**
 * Link preview (Facebook, Zalo, Messenger…): a project photo under a dark
 * green wash, the logo and the brand line.
 */
export default async function Image() {
  const [photo, logo] = await Promise.all([
    inline("images/projects/capital.jpg", "image/jpeg"),
    inline("images/dat-vang-group-logo-transparent.png", "image/png"),
  ]);
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        color: "#f8f7f3",
      }}
    >
      <img
        src={photo}
        alt=""
        width={1200}
        height={675}
        style={{ position: "absolute", top: -20, left: 0, objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          display: "flex",
          background:
            "linear-gradient(100deg, rgba(4,21,15,0.94) 0%, rgba(4,21,15,0.78) 48%, rgba(4,21,15,0.2) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logo} alt="" width={96} height={91} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, letterSpacing: 5, color: "#e3c88f" }}>
              ĐẤT VÀNG GROUP
            </div>
            <div style={{ fontSize: 20, letterSpacing: 3, color: "#cbd6ca" }}>
              ĐÀ NẴNG, VIỆT NAM
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, lineHeight: 1.15 }}>
            Không gian xứng tầm.
          </div>
          <div style={{ fontSize: 68, lineHeight: 1.15, color: "#e3c88f" }}>
            Giá trị bền vững.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginTop: 34,
              fontSize: 26,
              color: "#e6e1d4",
            }}
          >
            <div style={{ width: 48, height: 2, background: "#e3c88f" }} />
            Mua bán · Cho thuê · Ký gửi căn hộ — datvanggroup.vn
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
