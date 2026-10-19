import { ImageResponse } from "next/og";
export const alt = "Đất Vàng Group — Không gian sống, giá trị bền vững";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#123c32",
        color: "#f8f7f3",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 90,
      }}
    >
      <div
        style={{
          fontSize: 24,
          color: "#c6a76b",
          letterSpacing: 6,
          marginBottom: 45,
        }}
      >
        ĐẤT VÀNG GROUP
      </div>
      <div style={{ fontSize: 72, lineHeight: 1.2 }}>Không gian xứng tầm.</div>
      <div style={{ fontSize: 72, lineHeight: 1.2, color: "#c6a76b" }}>
        Giá trị bền vững.
      </div>
      <div style={{ fontSize: 22, marginTop: 50, color: "#cbd6ca" }}>
        ĐÀ NẴNG, VIỆT NAM 
      </div>
    </div>,
    size,
  );
}
