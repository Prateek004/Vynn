"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import DesktopSidebar from "./DesktopSidebar";
import BottomNav from "./BottomNav";

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1C1410",
        gap: 24,
      }}
    >
      <svg
        viewBox="0 0 44 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={48}
        height={56}
        style={{ animation: "vynn-pulse 1.8s ease-in-out infinite" }}
      >
        <polygon
          points="22,3 41,13 41,39 22,49 3,39 3,13"
          stroke="#D97C5A"
          strokeWidth="1.4"
          fill="none"
        />
        <line x1="22" y1="0" x2="22" y2="52" stroke="#D97C5A" strokeWidth="2" />
        <line
          x1="10"
          y1="26"
          x2="34"
          y2="26"
          stroke="#D97C5A"
          strokeWidth="0.7"
          opacity="0.35"
        />
      </svg>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.24em",
          color: "rgba(217,124,90,0.5)",
          fontWeight: 300,
        }}
      >
        VYNN
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoading && !state.session) router.replace("/auth");
  }, [state.isLoading, state.session, router]);

  if (state.isLoading) return <LoadingScreen />;

  return (
    <div
      style={{ height: "100dvh" }}
      className="flex overflow-hidden bg-gray-50"
    >
      {/* Sidebar — desktop only */}
      <DesktopSidebar />

      {/* Right column: content + bottom nav stacked */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          {/* Extra bottom padding on mobile so content clears the nav bar */}
          <div className="pb-16 lg:pb-0">{children}</div>
        </main>

        {/* Bottom nav — mobile only, static in flow (not fixed) */}
        <div className="lg:hidden shrink-0">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
