"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import AppShell from "@/components/ui/AppShell";
import { Cloud, CloudOff, LogOut, Trash2 } from "lucide-react";
import { isSupabaseEnabled } from "@/lib/supabase/client";
import { HIDE_FRANCHISE } from "@/lib/utils";
import type { StockSettings } from "@/lib/types";

const GST_OPTIONS = [0, 5, 12, 18];
const BAR_BIZ_TYPES = ["cafe", "restaurant", "franchise"].filter((t) => !HIDE_FRANCHISE || t !== "franchise");

export default function SettingsPage() {
  const { state, setSession, logout, showToast } = useApp();
  const router = useRouter();
  const { session } = state;
  const isOwner = session?.role === "owner";
  const showBarToggle = BAR_BIZ_TYPES.includes(session?.businessType ?? "");

  const [gst, setGst] = useState(session?.gstPercent ?? 5);
  const [upiId, setUpiId] = useState(session?.upiId ?? "");
  const [saving, setSaving] = useState(false);

  const ss: StockSettings = session?.stockSettings ?? {
    tablesEnabled: false,
    kotEnabled: false,
    barEnabled: false,
    tableCount: 10,
  };
  const [tablesEnabled, setTablesEnabled] = useState(ss.tablesEnabled);
  const [kotEnabled, setKotEnabled] = useState(ss.kotEnabled);
  const [barEnabled, setBarEnabled] = useState(ss.barEnabled);
  const [tableCount, setTableCount] = useState(ss.tableCount);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    const stockSettings: StockSettings = { tablesEnabled, kotEnabled, barEnabled, tableCount };
    const updated = { ...session, gstPercent: gst, upiId: upiId.trim() || undefined, stockSettings };
    localStorage.setItem("sz_session", JSON.stringify(updated));
    setSession(updated);

    if (isSupabaseEnabled()) {
      const sb = await import("@/lib/supabase/client").then((m) => m.getSupabase());
      if (sb) {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from("profiles").update({ gst_percent: gst, upi_id: upiId.trim() || null }).eq("id", user.id);
        }
      }
    }

    showToast("Settings saved ✓");
    setSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  const handleReset = () => {
    if (!confirm("Reset ALL local data? Orders and menu will be cleared.")) return;
    localStorage.clear();
    import("dexie").then(({ default: Dexie }) => Dexie.delete("servezy_db")).catch(() => {});
    window.location.href = "/auth";
  };

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
          <h1 className="text-xl font-black text-gray-900">Settings</h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          <Section title="Account">
            <div className="px-4 py-3 space-y-1">
              <Row label="Username" value={session?.username ?? "—"} />
              <Row label="Role" value={session?.role ?? "—"} />
              <Row label="Business" value={session?.businessName ?? "—"} />
              <Row label="Type" value={session?.businessType ?? "—"} />
            </div>
          </Section>

          <Section title="Billing">
            <div className="px-4 py-3">
              <p className="text-sm font-bold text-gray-700 mb-2">GST Rate</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {GST_OPTIONS.map((rate) => (
                  <button key={rate} onClick={() => setGst(rate)}
                    className={`h-11 rounded-xl border-2 font-bold text-sm press transition-all ${gst === rate ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-gray-600"}`}>
                    {rate}%
                  </button>
                ))}
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">UPI ID</p>
              <input className="bm-input" placeholder="e.g. 9876543210@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Used to generate QR code at checkout</p>
            </div>
          </Section>

          {isOwner && (
            <Section title="POS Features">
              <div className="px-4 py-3 space-y-4">
                <Toggle label="Table Management" desc="Enable table selection in billing" value={tablesEnabled} onChange={setTablesEnabled} />
                {tablesEnabled && (
                  <div className="pl-2">
                    <p className="text-xs font-bold text-gray-500 mb-1">Number of Tables</p>
                    <div className="flex gap-2 flex-wrap">
                      {[5, 10, 15, 20, 25, 30].map((n) => (
                        <button key={n} onClick={() => setTableCount(n)}
                          className={`w-10 h-9 rounded-xl border-2 text-sm font-bold press transition-all ${tableCount === n ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-gray-600"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Toggle label="KOT (Kitchen Order Ticket)" desc="Print kitchen tickets with orders" value={kotEnabled} onChange={setKotEnabled} />
                {showBarToggle && (
                  <>
                    <div className="h-px bg-gray-100" />
                    <Toggle label="Bar Tab" desc="Enable bar section in Stock management" value={barEnabled} onChange={setBarEnabled} />
                    {barEnabled && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                        Bar tab is active. Go to Stock → Bar to manage bar inventory.
                      </p>
                    )}
                  </>
                )}
              </div>
            </Section>
          )}

          <Section title="Cloud Sync">
            <div className="px-4 py-4 flex items-center gap-3">
              {isSupabaseEnabled() ? (
                <>
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <Cloud size={18} className="text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">Supabase Connected</p>
                    <p className="text-xs text-gray-400">Orders sync automatically</p>
                  </div>
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <CloudOff size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Offline Only</p>
                    <p className="text-xs text-gray-400">Add Supabase keys to enable sync</p>
                  </div>
                </>
              )}
            </div>
          </Section>

          <Section title="About">
            {[["Version", "v1.0.0"], ["Storage", "Dexie (IndexedDB)"], ["Framework", "Next.js 14"]].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-3 border-b border-gray-50 last:border-0 text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </Section>

          <button onClick={handleSave} disabled={saving}
            className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold disabled:opacity-40 press shadow-md">
            {saving ? "Saving…" : "Save Settings"}
          </button>

          <button onClick={handleLogout}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 font-bold text-gray-700 press">
            <LogOut size={16} /> Sign Out
          </button>

          <Section title="Danger Zone">
            <button onClick={handleReset} className="w-full flex items-center gap-3 px-4 py-4 text-red-500 press text-left">
              <Trash2 size={18} className="shrink-0" />
              <div>
                <p className="font-bold text-sm">Reset All Local Data</p>
                <p className="text-xs text-gray-400">Clears orders, menu, and session</p>
              </div>
            </button>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-800 capitalize">{value}</span>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)} className={`shrink-0 w-11 h-6 rounded-full relative transition-colors press ${value ? "bg-primary-500" : "bg-gray-200"}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
