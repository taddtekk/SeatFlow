import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SeatFlow",
  description: "Bestuhlungspläne für Veranstaltungen"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
