import { Analytics } from "@vercel/analytics/next";
import { Geist } from "next/font/google";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { isSiteInMaintenance } from "@/lib/maintenance";
import { baseMetadata } from "@/lib/seo";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata = baseMetadata;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const maintenance = isSiteInMaintenance();

  return (
    <html lang="fr" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-950">
        {maintenance ? <MaintenanceScreen /> : children}
        {!maintenance && <Analytics />}
      </body>
    </html>
  );
}
