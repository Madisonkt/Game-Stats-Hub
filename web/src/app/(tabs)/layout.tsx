"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoTrophy, IoGameController, IoTime } from "react-icons/io5";
import type { ReactNode } from "react";
import KawaiiBackground from "@/components/KawaiiBackground";
import { usePushSubscription } from "@/lib/usePushSubscription";

const tabs = [
  { href: "/", label: "Log", icon: IoTrophy },
  { href: "/games", label: "Games", icon: IoGameController },
  { href: "/history", label: "History", icon: IoTime },
];

export default function TabLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  usePushSubscription();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F3F0EA] dark:bg-[#0A0A0C]">
      <KawaiiBackground>
        {/* Page content */}
        <main className="relative flex-1 overflow-auto pb-20 animate-fade-in">{children}</main>
      </KawaiiBackground>

      {/* Bottom tab bar — liquid glass */}
      <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center safe-area-bottom">
        <nav
          className="liquid-glass-bar mx-4 mb-2"
        >
          <div className="flex items-center justify-around relative">
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
                  className={`relative flex flex-col items-center gap-0.5 px-6 py-2 transition-all duration-300 z-10
                    ${
                      isActive
                        ? "text-[#0A0A0C] dark:text-white"
                        : "text-[#98989D]/70 dark:text-[#636366] hover:text-[#636366] dark:hover:text-[#98989D]"
                    }`}
                >
                  <Icon className="text-[22px] relative z-10" />
                  <span className="text-[10px] font-bold font-[family-name:var(--font-suse)] relative z-10 tracking-wide">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
