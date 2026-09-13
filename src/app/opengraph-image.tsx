import { ImageResponse } from "next/og";

export const alt = "Emmortals - Simple tools. Powerful results.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#101010", color: "#f5f5f5", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", fontFamily: "Arial" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 30, fontWeight: 700 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: "#f5f5f5", color: "#101010", display: "flex", alignItems: "center", justifyContent: "center" }}>E</div>Emmortals</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}><div style={{ display: "flex", color: "#a3a3a3", fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase" }}>Tools for the open web</div><div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 700, letterSpacing: "-0.06em" }}>Simple tools.<br />Powerful results.</div></div>
      <div style={{ color: "#a3a3a3", fontSize: 24 }}>Privacy-first QR creation and public media tools.</div>
    </div>,
    { ...size },
  );
}
