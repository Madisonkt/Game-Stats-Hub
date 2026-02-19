import type { Metadata, Viewport } from "next";
import { Nunito_Sans, SUSE } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const suse = SUSE({
  variable: "--font-suse",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3A7BD5",
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
      <body className={`${nunitoSans.variable} ${suse.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
