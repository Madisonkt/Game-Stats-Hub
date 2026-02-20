import type { Metadata, Viewport } from "next";
import { SUSE, SUSE_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const suse = SUSE({
  variable: "--font-suse",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const suseMono = SUSE_Mono({
  variable: "--font-suse-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#292929",
};

export const metadata: Metadata = {
  title: "Cheese Squeeze",
  description: "Track game stats with your partner",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cheese Squeeze",
  },
  icons: {
    icon: "/images/favicon.png",
    apple: "/images/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                  navigator.serviceWorker.register("/sw.js");
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${suse.variable} ${suseMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
