import type { Metadata, Viewport } from "next";
import { Noto_Sans_Lao } from "next/font/google";
import DisableMobileZoom from "@/components/DisableMobileZoom";
import "./globals.css";
import { SITE_URL } from "@/lib/config";

const notoLao = Noto_Sans_Lao({
  variable: "--font-lao",
  subsets: ["lao", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const DESCRIPTION =
  "ODIENMALL — ສູນລວມເຄື່ອງໃຊ້ໄຟຟ້າ, ເຄື່ອງໃຊ້ໃນເຮືອນ ແລະ ສິນຄ້າຄຸນນະພາບ ລາຄາດີ ຈັດສົ່ງທົ່ວລາວ.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "ODIENMALL",
  manifest: "/manifest.json",
  title: {
    default: "ODIENMALL",
    template: "%s | ODIENMALL",
  },
  description: DESCRIPTION,
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/icon.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "ODIENMALL",
    locale: "lo_LA",
    title: "ODIENMALL",
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/odm.png", width: 852, height: 606, alt: "ODIENMALL" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lo" className={`${notoLao.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <DisableMobileZoom />
        {children}
      </body>
    </html>
  );
}
