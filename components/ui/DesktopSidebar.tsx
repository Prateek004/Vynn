"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, ClipboardList, UtensilsCrossed, Settings, LogOut, Package, LayoutDashboard } from "lucide-react";
import { useApp } from "@/lib/store/AppContext";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/pos",       label: "Register",  Icon: ShoppingCart    },
  { href: "/orders",    label: "Orders",    Icon: ClipboardList   },
  { href: "/menu",      label: "Menu",      Icon: UtensilsCrossed },
  { href: "/stock",     label: "Stock",     Icon: Package         },
  { href: "/settings",  label: "Settings",  Icon: Settings        },
];

function VynnLogo() {
  return (
    <svg viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" width={32} height={36}>
      <polygon points="22,3 41,13 41,39 22,49 3,39 3,13" stroke="#D97C5A" strokeWidth="1.4" fill="none"/>
      <line x1="22" y1="0" x2="22" y2="52" stroke="#D97C5A" strokeWidth="2"/>
      <line x1="10" y1="26" x2="34" y2="26" stroke="#D97C5A" strokeWidth="0.7" opacity="0.35"/>
    </svg>
  );
}

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  // FIX: use ctx.logout() which clears all localStorage keys, not just signOut+setSession
  const { state, logout } = useApp();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  const initial = (state.session?.businessName ?? "V").charAt(0).toUpperCase();

  return (
    <aside className="hidden lg:flex flex-col shrink-0" style={{ width: 220, background: "#1C1410", height: "100vh" }}>
      <div style={{ padding: "28px 24px", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
        <VynnLogo />
        <div style={{ marginTop: 10, fontSize: 15, letterSpacing: "0.22em", color: "#D97C5A", fontWeight: 300 }}>
          {(state.session?.businessName ?? "VYNN").toUpperCase()}
        </div>
        <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(217,124,90,0.45)", fontWeight: 300, marginTop: 2 }}>
          {(state.session?.role ?? "POS").toUpperCase()}
        </div>
      </div>

      <nav style={{ flex: 1, padding: "20px 0" }}>
        <p style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(255,255,255,0.25)", padding: "0 24px 8px" }}>MAIN</p>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 24px", fontSize: 13, textDecoration: "none",
              color: active ? "#D97C5A" : "rgba(255,255,255,0.5)",
              background: active ? "rgba(217,124,90,0.10)" : "transparent",
              borderRight: active ? "2px solid #D97C5A" : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
              <Icon size={15} strokeWidth={active ? 2.2 : 1.6} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "20px 24px", borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#8B3018", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#F5DDD3", fontWeight: 500, flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.session?.businessName ?? "Business"}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{state.session?.role ?? "owner"}</p>
          </div>
          <button onClick={handleLogout} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4, display: "flex" }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
