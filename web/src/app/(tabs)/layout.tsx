"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoTrophy, IoGameController, IoTime } from "react-icons/io5";
import type { ReactNode } from "react";
import KawaiiBackground from "@/components/KawaiiBackground";

const tabs = [
  { href: "/", label: "Log", icon: IoTrophy },
  { href: "/games", label: "Games", icon: IoGameController },
  { href: "/history", label: "History", icon: IoTime },
];

export default function TabLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F0EA] dark:bg-[#0A0A0C]">
      <KawaiiBackground>
        {/* Page content */}
        <main className="flex-1 overflow-auto pb-24 animate-fade-in">{children}</main>
      </KawaiiBackground>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50
          bg-[#F3F0EA]/80 dark:bg-[#0A0A0C]/80
          backdrop-blur-xl border-t border-[#ECE7DE] dark:border-[#1A1A1C]
          safe-area-bottom"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto pt-2 pb-7">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors
                  ${
                    isActive
                      ? "text-[#3A7BD5] dark:text-white"
                      : "text-[#98989D] dark:text-[#636366] hover:text-[#636366] dark:hover:text-[#98989D]"
                  }`}
              >
                <Icon className="text-2xl" />
                <span className="text-[11px] font-semibold font-[family-name:var(--font-nunito)]">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
