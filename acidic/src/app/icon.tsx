import { ImageResponse } from "next/og";
import { AcidicMark } from "@/components/acidic-logo";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#15130f" }}><AcidicMark size={420} /></div>, size);
}
