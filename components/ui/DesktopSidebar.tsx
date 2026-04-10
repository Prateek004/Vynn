"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, ClipboardList, UtensilsCrossed, BarChart2, Settings, LogOut, Package } from "lucide-react";
import { useApp } from "@/lib/store/AppContext";
import { signOut } from "@/lib/supabase/auth";

const NAV = [
  { href: "/pos",      label: "Register",  Icon: ShoppingCart    },
  { href: "/orders",   label: "Orders",    Icon: ClipboardList   },
  { href: "/menu",     label: "Menu",      Icon: UtensilsCrossed },
  { href: "/stock",    label: "Stock",     Icon: Package         },
  { href: "/stats",    label: "Stats",     Icon: BarChart2       },
  { href: "/settings", label: "Settings",  Icon: Settings        },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setSession } = useApp();

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    router.replace("/auth");
  };

  return (
    <aside className="hidden lg:flex flex-col w-16 xl:w-52 h-screen bg-white border-r border-gray-100 shrink-0">
      <div className="flex items-center gap-3 px-3 xl:px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-2xl bg-primary-500 flex items-center justify-center shrink-0 shadow-md">
          <span className="text-white font-black text-base">S</span>
        </div>
        <div className="hidden xl:block min-w-0">
          <p className="font-black text-gray-900 text-sm truncate">{state.session?.businessName ?? "Servezy"}</p>
          <p className="text-[10px] text-gray-400 font-semibold capitalize">{state.session?.role}</p>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-2 xl:px-3 py-2.5 rounded-xl transition-all press ${active ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50"}`}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
              <span className="hidden xl:block text-sm font-bold">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-100">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2 xl:px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all press">
          <LogOut size={20} className="shrink-0" />
          <span className="hidden xl:block text-sm font-bold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
