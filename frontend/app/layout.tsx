import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScanMark OS",
  description: "Academic records and departmental registration infrastructure."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
