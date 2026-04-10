"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/store/AppContext";
import AppShell from "@/components/ui/AppShell";
import { fmtRupee, fmtTime, todayStr, PAY_LABEL, SERVICE_LABEL } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { TrendingUp, Banknote, ShoppingBag, Cloud, CloudOff, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { isSupabaseEnabled } from "@/lib/supabase/client";

export default function OrdersPage() {
  const { state } = useApp();
  const uid = state.session?.userId ?? "default";
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"today" | "all">("today");
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isOwner = state.session?.role === "owner";

  useEffect(() => {
    import("@/lib/db").then(({ dbGetAllOrders }) => dbGetAllOrders(uid).then(setAllOrders));
  }, [state.orders, uid]);

  const today = todayStr();
  const todayOrders = allOrders.filter((o) => o.createdAt.startsWith(today));
  const displayed = filter === "today" ? todayOrders : allOrders;
  const todaySales = todayOrders.reduce((s, o) => s + o.totalPaise, 0);
  const totalSales = allOrders.reduce((s, o) => s + o.totalPaise, 0);

  const handleSync = async () => {
    setSyncing(true);
    const { backgroundSync } = await import("@/lib/supabase/sync");
    await backgroundSync(uid);
    const { dbGetAllOrders } = await import("@/lib/db");
    setAllOrders(await dbGetAllOrders(uid));
    setSyncing(false);
  };

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="bg-white px-4 pt-12 lg:pt-5 pb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-gray-900">Orders</h1>
            {isSupabaseEnabled() && (
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-1.5 text-sm font-bold text-primary-500 press">
                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />Sync
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary-500 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-primary-100">Today&apos;s Sales</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp size={16} className="text-white" />
                </div>
              </div>
              <p className="text-xl font-black">{fmtRupee(todaySales)}</p>
              <p className="text-xs text-primary-200 mt-1">{todayOrders.length} orders</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">All Time</span>
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Banknote size={16} className="text-gray-400" />
                </div>
              </div>
              <p className="text-xl font-black text-gray-900">{fmtRupee(totalSales)}</p>
              <p className="text-xs text-gray-400 mt-1">{allOrders.length} orders</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm text-xs font-semibold">
            {isSupabaseEnabled()
              ? <><Cloud size={14} className="text-green-500" /><span className="text-green-600">Cloud sync enabled</span></>
              : <><CloudOff size={14} className="text-gray-400" /><span className="text-gray-400">Offline only — add Supabase keys to sync</span></>
            }
          </div>

          <div className="flex rounded-2xl bg-gray-100 p-1">
            {(["today", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                {f === "today" ? `Today (${todayOrders.length})` : `All (${allOrders.length})`}
              </button>
            ))}
          </div>

          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <ShoppingBag size={48} className="mb-3" />
              <p className="font-semibold text-gray-400">No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here after checkout</p>
            </div>
          ) : (
            displayed.map((order) => {
              const isOpen = expanded === order.id;
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    className="w-full flex items-center px-4 py-3 gap-3 press text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm">#{order.billNumber}</p>
                        {order.tableNumber && (
                          <span className="text-[10px] font-bold bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                            T{order.tableNumber}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.syncStatus === "synced" ? "bg-green-50 text-green-600" :
                          order.syncStatus === "failed" ? "bg-red-50 text-red-500" :
                          "bg-gray-100 text-gray-400"
                        }`}>
                          {order.syncStatus}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtTime(order.createdAt)} · {PAY_LABEL[order.paymentMethod] ?? order.paymentMethod} · {SERVICE_LABEL[order.serviceMode] ?? order.serviceMode}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-gray-900">{fmtRupee(order.totalPaise)}</p>
                      <p className="text-xs text-gray-400">{order.items.length} item{order.items.length > 1 ? "s" : ""}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-50 px-4 py-3 space-y-2">
                      {order.items.map((item, i) => {
                        const ao = item.selectedAddOns.reduce((s, a) => s + a.pricePaise, 0);
                        return (
                          <div key={i} className="flex justify-between text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-800">{item.qty}× {item.name}</span>
                              {item.selectedPortion && <span className="text-gray-400 text-xs ml-1">({item.selectedPortion})</span>}
                              {item.selectedAddOns.length > 0 && (
                                <p className="text-xs text-gray-400">+ {item.selectedAddOns.map((a) => a.name).join(", ")}</p>
                              )}
                              {item.notes && <p className="text-xs text-primary-400 italic">→ {item.notes}</p>}
                            </div>
                            <span className="font-semibold text-gray-700 shrink-0 ml-2">
                              {fmtRupee((item.unitPricePaise + ao) * item.qty)}
                            </span>
                          </div>
                        );
                      })}
                      <div className="border-t border-gray-100 pt-2 space-y-1 text-xs text-gray-500">
                        <div className="flex justify-between"><span>Subtotal</span><span>{fmtRupee(order.subtotalPaise)}</span></div>
                        {order.discountPaise > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{fmtRupee(order.discountPaise)}</span></div>}
                        {order.gstPercent > 0 && <div className="flex justify-between"><span>GST ({order.gstPercent}%)</span><span>{fmtRupee(order.gstPaise)}</span></div>}
                        <div className="flex justify-between font-black text-gray-900 text-sm pt-1"><span>Total</span><span>{fmtRupee(order.totalPaise)}</span></div>
                        {order.changePaise != null && order.changePaise > 0 && (
                          <div className="flex justify-between"><span>Change given</span><span>{fmtRupee(order.changePaise)}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
