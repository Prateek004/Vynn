"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/store/AppContext";
import AppShell from "@/components/ui/AppShell";
import { fmtRupee, fmtTime, todayStr, PAY_LABEL, SERVICE_LABEL } from "@/lib/utils";
import type { Order, OpenTable, CartItem } from "@/lib/types";
import {
  TrendingUp, Banknote, ShoppingBag, Cloud, CloudOff,
  RefreshCw, ChevronDown, ChevronUp, Plus, CheckCircle, Clock,
} from "lucide-react";
import { isSupabaseEnabled } from "@/lib/supabase/client";

// ── Close Table Modal ─────────────────────────────────────────────────────────
function CloseTableModal({
  tab, onClose, onConfirm,
}: {
  tab: OpenTable;
  onClose: () => void;
  onConfirm: (params: {
    paymentMethod: "cash" | "upi" | "split";
    discountType: "flat" | "percent";
    discountValue: number;
    cashReceivedPaise?: number;
    splitPayment?: { cashPaise: number; upiPaise: number };
  }) => void;
}) {
  const { state } = useApp();
  const [method, setMethod] = useState<"cash" | "upi" | "split">("cash");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");

  const subtotal = tab.items.reduce((s, i) => {
    const ao = i.selectedAddOns.reduce((x, a) => x + a.pricePaise, 0);
    return s + (i.unitPricePaise + ao) * i.qty;
  }, 0);
  const gstPct = state.session?.gstPercent ?? 0;
  const discount = discountType === "flat"
    ? Math.min(discountValue * 100, subtotal)
    : Math.round(subtotal * Math.min(discountValue, 100) / 100);
  const afterDisc = Math.max(0, subtotal - discount);
  const gst = Math.round(afterDisc * gstPct / 100);
  const total = afterDisc + gst;
  const cashPaise = Math.round(parseFloat(cashReceived || "0") * 100);
  const splitCashP = Math.round(parseFloat(splitCash || "0") * 100);
  const splitUpiP = Math.round(parseFloat(splitUpi || "0") * 100);
  const change = Math.max(0, cashPaise - total);
  const splitTotal = splitCashP + splitUpiP;
  const splitOk = splitTotal >= total;

  const canConfirm =
    method === "upi" ||
    (method === "cash" && cashPaise >= total) ||
    (method === "split" && splitOk);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      paymentMethod: method,
      discountType,
      discountValue,
      cashReceivedPaise: method === "cash" ? cashPaise || undefined : undefined,
      splitPayment: method === "split" ? { cashPaise: splitCashP, upiPaise: splitUpiP } : undefined,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1C1410" }}>Close Table {tab.tableNumber}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9C8E87" }}>✕</button>
        </div>

        {/* Items summary */}
        <div style={{ background: "#FAF6F2", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#9C8E87", marginBottom: 10 }}>ORDER SUMMARY</p>
          {tab.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "#1C1410" }}>{item.qty}× {item.name}{item.selectedPortion ? ` (${item.selectedPortion})` : ""}</span>
              <span style={{ color: "#5C4E47", fontWeight: 500 }}>{fmtRupee((item.unitPricePaise + item.selectedAddOns.reduce((s, a) => s + a.pricePaise, 0)) * item.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop: "0.5px solid rgba(28,20,16,0.1)", marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9C8E87", marginBottom: 4 }}><span>Subtotal</span><span>{fmtRupee(subtotal)}</span></div>
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#3E9B5A", marginBottom: 4 }}><span>Discount</span><span>−{fmtRupee(discount)}</span></div>}
            {gstPct > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9C8E87", marginBottom: 4 }}><span>GST ({gstPct}%)</span><span>{fmtRupee(gst)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "#1C1410", marginTop: 6 }}><span>Total</span><span>{fmtRupee(total)}</span></div>
          </div>
        </div>

        {/* Discount */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#9C8E87", marginBottom: 8 }}>DISCOUNT (OPTIONAL)</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {(["flat", "percent"] as const).map((t) => (
              <button key={t} onClick={() => setDiscountType(t)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${discountType === t ? "#B24B2F" : "#F3EDE6"}`, background: discountType === t ? "#FAF0EB" : "white", color: discountType === t ? "#B24B2F" : "#9C8E87", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {t === "flat" ? "₹ Flat" : "% Percent"}
              </button>
            ))}
          </div>
          <input type="number" placeholder="0" value={discountValue || ""}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid #F3EDE6", padding: "0 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        {/* Payment method */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#9C8E87", marginBottom: 8 }}>PAYMENT METHOD</p>
          <div style={{ display: "flex", gap: 8 }}>
            {(["cash", "upi", "split"] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${method === m ? "#B24B2F" : "#F3EDE6"}`, background: method === m ? "#FAF0EB" : "white", color: method === m ? "#B24B2F" : "#9C8E87", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {method === "cash" && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#9C8E87", marginBottom: 8 }}>CASH RECEIVED</p>
            <input type="number" placeholder={String(total / 100)} value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid #F3EDE6", padding: "0 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            {change > 0 && <p style={{ fontSize: 12, color: "#3E9B5A", marginTop: 4 }}>Change: {fmtRupee(change)}</p>}
            {cashReceived && cashPaise < total && (
              <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>Short by {fmtRupee(total - cashPaise)}</p>
            )}
          </div>
        )}

        {method === "split" && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#9C8E87", marginBottom: 8 }}>SPLIT PAYMENT</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: "#9C8E87", marginBottom: 4 }}>Cash ₹</p>
                <input type="number" placeholder="0" value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid #F3EDE6", padding: "0 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: "#9C8E87", marginBottom: 4 }}>UPI ₹</p>
                <input type="number" placeholder="0" value={splitUpi}
                  onChange={(e) => setSplitUpi(e.target.value)}
                  style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid #F3EDE6", padding: "0 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: splitOk ? "#f0fdf4" : "#fafafa", color: splitOk ? "#16a34a" : "#9C8E87", fontSize: 12, fontWeight: 600 }}>
              {splitOk ? `Covered ✓ (${fmtRupee(splitTotal)})` : `Need ${fmtRupee(total)} · have ${fmtRupee(splitTotal)}`}
            </div>
          </div>
        )}

        {method === "upi" && (
          <div style={{ marginBottom: 12, padding: "12px", background: "#eff6ff", borderRadius: 8, textAlign: "center", color: "#1d4ed8", fontSize: 13, fontWeight: 600 }}>
            📱 Collect {fmtRupee(total)} via UPI
          </div>
        )}

        <button onClick={handleConfirm} disabled={!canConfirm}
          style={{ width: "100%", height: 48, background: canConfirm ? "#1C1410" : "#ccc", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: canConfirm ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          Collect {fmtRupee(total)} & Close Table
        </button>
      </div>
    </div>
  );
}

// ── Add Items Modal ───────────────────────────────────────────────────────────
function AddItemsModal({
  tab, onClose, onAdd,
}: {
  tab: OpenTable;
  onClose: () => void;
  onAdd: (items: CartItem[]) => void;
}) {
  const { state } = useApp();
  const [localCart, setLocalCart] = useState<CartItem[]>([]);

  const addItem = (item: typeof state.menuItems[0]) => {
    setLocalCart((prev) => {
      const ex = prev.find((c) => c.menuItemId === item.id);
      if (ex) return prev.map((c) => c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { cartId: crypto.randomUUID(), menuItemId: item.id, name: item.name, unitPricePaise: item.pricePaise, qty: 1, selectedAddOns: [] }];
    });
  };

  const totalNew = localCart.reduce((s, i) => s + i.unitPricePaise * i.qty, 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 12px", borderBottom: "0.5px solid #F3EDE6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1C1410" }}>Add to Table {tab.tableNumber}</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9C8E87" }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {state.menuItems.filter((i) => i.isAvailable).map((item) => {
            const inCart = localCart.find((c) => c.menuItemId === item.id);
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #FAF0EB" }}>
                <div>
                  <p style={{ fontSize: 14, color: "#1C1410", fontWeight: 500 }}>{item.name}</p>
                  <p style={{ fontSize: 12, color: "#9C8E87" }}>{fmtRupee(item.pricePaise)}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {inCart && (
                    <>
                      <button onClick={() => setLocalCart((p) => p.map((c) => c.menuItemId === item.id ? { ...c, qty: c.qty - 1 } : c).filter((c) => c.qty > 0))}
                        style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #F3EDE6", background: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#B24B2F" }}>−</button>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1C1410", minWidth: 20, textAlign: "center" }}>{inCart.qty}</span>
                    </>
                  )}
                  <button onClick={() => addItem(item)}
                    style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#B24B2F", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {localCart.length > 0 && (
          <div style={{ padding: 16, borderTop: "0.5px solid #F3EDE6" }}>
            <button onClick={() => onAdd(localCart)}
              style={{ width: "100%", height: 48, background: "#1C1410", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Add {localCart.reduce((s, i) => s + i.qty, 0)} items · {fmtRupee(totalNew)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Orders Page ──────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { state, openTableAddItems, closeTable, showToast } = useApp();
  const uid = state.session?.userId ?? "default";
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"today" | "all">("today");
  const [tab, setTab] = useState<"orders" | "tables">("orders");
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<OpenTable | null>(null);
  const [closingTab, setClosingTab] = useState<OpenTable | null>(null);
  const isOwner = state.session?.role === "owner";
  const openTableEnabled = state.session?.stockSettings?.openTableBilling ?? false;

  // FIX: reload all orders from DB whenever state.orders changes
  useEffect(() => {
    import("@/lib/db").then(({ dbGetAllOrders }) =>
      dbGetAllOrders(uid).then(setAllOrders)
    );
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

  const handleAddItems = async (items: CartItem[]) => {
    if (!addingTo) return;
    await openTableAddItems(addingTo.tableNumber, items);
    showToast(`Added ${items.reduce((s, i) => s + i.qty, 0)} items to Table ${addingTo.tableNumber} ✓`);
    setAddingTo(null);
  };

  const handleCloseTable = async (params: {
    paymentMethod: "cash" | "upi" | "split";
    discountType: "flat" | "percent";
    discountValue: number;
    cashReceivedPaise?: number;
    splitPayment?: { cashPaise: number; upiPaise: number };
  }) => {
    if (!closingTab) return;
    try {
      await closeTable(closingTab.id, params);
      showToast(`Table ${closingTab.tableNumber} closed & billed ✓`);
      setClosingTab(null);
    } catch {
      showToast("Failed to close table", "error");
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="bg-white px-4 pt-12 lg:pt-5 pb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-gray-900">Orders</h1>
            {isSupabaseEnabled() && (
              <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 text-sm font-bold text-primary-500 press">
                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />Sync
              </button>
            )}
          </div>

          {openTableEnabled && (
            <div className="flex rounded-xl bg-gray-100 p-1 mt-3">
              {(["orders", "tables"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                  {t === "orders" ? "Orders" : `Open Tables (${state.openTables.length})`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">

          {/* ── OPEN TABLES TAB ── */}
          {openTableEnabled && tab === "tables" && (
            <>
              {state.openTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <Clock size={48} className="mb-3" />
                  <p className="font-semibold text-gray-400">No open tables</p>
                  <p className="text-sm mt-1">Hold a cart to a table from the POS screen</p>
                </div>
              ) : (
                state.openTables.map((openTab) => {
                  const tabTotal = openTab.items.reduce((s, i) => {
                    const ao = i.selectedAddOns.reduce((x, a) => x + a.pricePaise, 0);
                    return s + (i.unitPricePaise + ao) * i.qty;
                  }, 0);
                  const itemCount = openTab.items.reduce((s, i) => s + i.qty, 0);
                  const dur = Math.round((Date.now() - new Date(openTab.openedAt).getTime()) / 60000);

                  return (
                    <div key={openTab.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-gray-900">Table {openTab.tableNumber}</span>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock size={9} /> {dur}m open
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{itemCount} item{itemCount !== 1 ? "s" : ""} · Running bill: <span className="font-bold text-gray-700">{fmtRupee(tabTotal)}</span></p>
                        </div>
                      </div>

                      <div className="px-4 pb-2 space-y-1">
                        {openTab.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm text-gray-600">
                            <span>{item.qty}× {item.name}{item.selectedPortion ? ` (${item.selectedPortion})` : ""}</span>
                            <span className="font-medium">{fmtRupee((item.unitPricePaise + item.selectedAddOns.reduce((s, a) => s + a.pricePaise, 0)) * item.qty)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="px-4 pb-4 pt-2 flex gap-2">
                        <button onClick={() => setAddingTo(openTab)}
                          className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl border-2 border-primary-200 text-primary-600 text-sm font-bold press">
                          <Plus size={14} /> Add Items
                        </button>
                        <button onClick={() => setClosingTab(openTab)}
                          className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-primary-500 text-white text-sm font-bold press shadow-sm">
                          <CheckCircle size={14} /> Close & Bill
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ── ORDERS TAB ── */}
          {(!openTableEnabled || tab === "orders") && (
            <>
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
                  : <><CloudOff size={14} className="text-gray-400" /><span className="text-gray-400">Offline only</span></>
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
                      <button onClick={() => setExpanded(isOpen ? null : order.id)}
                        className="w-full flex items-center px-4 py-3 gap-3 press text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 text-sm">#{order.billNumber}</p>
                            {order.tableNumber && (
                              <span className="text-[10px] font-bold bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">T{order.tableNumber}</span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.syncStatus === "synced" ? "bg-green-50 text-green-600" : order.syncStatus === "failed" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"}`}>
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
                                  {item.selectedAddOns.length > 0 && <p className="text-xs text-gray-400">+ {item.selectedAddOns.map((a) => a.name).join(", ")}</p>}
                                  {item.notes && <p className="text-xs text-primary-400 italic">→ {item.notes}</p>}
                                </div>
                                <span className="font-semibold text-gray-700 shrink-0 ml-2">{fmtRupee((item.unitPricePaise + ao) * item.qty)}</span>
                              </div>
                            );
                          })}
                          <div className="border-t border-gray-100 pt-2 space-y-1 text-xs text-gray-500">
                            <div className="flex justify-between"><span>Subtotal</span><span>{fmtRupee(order.subtotalPaise)}</span></div>
                            {order.discountPaise > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{fmtRupee(order.discountPaise)}</span></div>}
                            {order.gstPercent > 0 && <div className="flex justify-between"><span>GST ({order.gstPercent}%)</span><span>{fmtRupee(order.gstPaise)}</span></div>}
                            <div className="flex justify-between font-black text-gray-900 text-sm pt-1"><span>Total</span><span>{fmtRupee(order.totalPaise)}</span></div>
                            {order.changePaise != null && order.changePaise > 0 && <div className="flex justify-between"><span>Change given</span><span>{fmtRupee(order.changePaise)}</span></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {addingTo && <AddItemsModal tab={addingTo} onClose={() => setAddingTo(null)} onAdd={handleAddItems} />}
      {closingTab && <CloseTableModal tab={closingTab} onClose={() => setClosingTab(null)} onConfirm={handleCloseTable} />}
    </AppShell>
  );
}
