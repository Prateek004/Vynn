"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type {
  MenuItem,
  MenuCategory,
  CartItem,
  Order,
  UserSession,
  ServiceMode,
  OpenTable,
} from "@/lib/types";
import { calcDiscount, calcGST, generateBillNumber } from "@/lib/utils";
import { MENU_TEMPLATES } from "@/lib/utils/menuTemplates";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface AppState {
  session: UserSession | null;
  menuItems: MenuItem[];
  categories: MenuCategory[];
  cart: CartItem[];
  serviceMode: ServiceMode;
  tableNumber: number | undefined;
  orders: Order[];
  openTables: OpenTable[];
  isLoading: boolean;
  toasts: Toast[];
}

const initialState: AppState = {
  session: null,
  menuItems: [],
  categories: [],
  cart: [],
  serviceMode: "dine_in",
  tableNumber: undefined,
  orders: [],
  openTables: [],
  isLoading: true,
  toasts: [],
};

// ── Storage keys — all prefixed "vynn_" ──────────────────────────────────────
const SESSION_KEY = "vynn_session";
const CART_KEY = "vynn_cart";
const UI_KEY = "vynn_ui";

function saveSession(s: UserSession | null): void {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    // Validate minimum shape — if corrupt, wipe it
    if (!parsed.userId || !parsed.username) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveCart(cart: CartItem[]): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {}
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveUI(ui: {
  serviceMode: ServiceMode;
  tableNumber: number | undefined;
}): void {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {}
}

function loadUI(): { serviceMode: ServiceMode; tableNumber: number | undefined } {
  try {
    const raw = localStorage.getItem(UI_KEY);
    return raw
      ? (JSON.parse(raw) as {
          serviceMode: ServiceMode;
          tableNumber: number | undefined;
        })
      : { serviceMode: "dine_in", tableNumber: undefined };
  } catch {
    return { serviceMode: "dine_in", tableNumber: undefined };
  }
}

// ── Reducer ───────────────────────────────────────────────────────────────────
type Action =
  | {
      type: "INIT_DONE";
      session: UserSession | null;
      items: MenuItem[];
      categories: MenuCategory[];
      orders: Order[];
      openTables: OpenTable[];
      cart: CartItem[];
      serviceMode: ServiceMode;
      tableNumber: number | undefined;
    }
  | { type: "SET_SESSION"; payload: UserSession | null }
  | { type: "SET_MENU"; items: MenuItem[]; categories: MenuCategory[] }
  | { type: "SET_SERVICE_MODE"; mode: ServiceMode }
  | { type: "SET_TABLE"; tableNumber: number | undefined }
  | { type: "CART_ADD"; payload: CartItem }
  | { type: "CART_QTY"; cartId: string; qty: number }
  | { type: "CART_REMOVE"; cartId: string }
  | { type: "CART_CLEAR" }
  | { type: "ORDER_ADD"; payload: Order }
  | { type: "MENU_ITEM_UPSERT"; payload: MenuItem }
  | { type: "MENU_ITEM_DELETE"; id: string }
  | { type: "CATEGORY_UPSERT"; payload: MenuCategory }
  | { type: "CATEGORY_DELETE"; id: string }
  | { type: "TOAST_ADD"; payload: Toast }
  | { type: "TOAST_REMOVE"; id: string }
  | { type: "OPEN_TABLE_UPSERT"; payload: OpenTable }
  | { type: "OPEN_TABLE_REMOVE"; id: string }
  | { type: "LOGOUT" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "INIT_DONE":
      return {
        ...state,
        session: action.session,
        menuItems: action.items,
        categories: action.categories,
        orders: action.orders,
        openTables: action.openTables,
        cart: action.cart,
        serviceMode: action.serviceMode,
        tableNumber: action.tableNumber,
        isLoading: false,
      };
    case "SET_SESSION":
      return { ...state, session: action.payload };
    case "SET_MENU":
      return { ...state, menuItems: action.items, categories: action.categories };
    case "SET_SERVICE_MODE":
      return { ...state, serviceMode: action.mode };
    case "SET_TABLE":
      return { ...state, tableNumber: action.tableNumber };
    case "CART_ADD": {
      const inc = action.payload;
      const key = [
        inc.menuItemId,
        inc.selectedSize ?? "",
        inc.selectedPortion ?? "",
        inc.selectedAddOns
          .map((a) => a.id)
          .sort()
          .join(","),
        inc.notes ?? "",
      ].join("|");
      const idx = state.cart.findIndex(
        (c) =>
          [
            c.menuItemId,
            c.selectedSize ?? "",
            c.selectedPortion ?? "",
            c.selectedAddOns
              .map((a) => a.id)
              .sort()
              .join(","),
            c.notes ?? "",
          ].join("|") === key
      );
      if (idx !== -1) {
        return {
          ...state,
          cart: state.cart.map((c, i) =>
            i === idx ? { ...c, qty: c.qty + inc.qty } : c
          ),
        };
      }
      return { ...state, cart: [...state.cart, inc] };
    }
    case "CART_QTY":
      return {
        ...state,
        cart:
          action.qty <= 0
            ? state.cart.filter((i) => i.cartId !== action.cartId)
            : state.cart.map((i) =>
                i.cartId === action.cartId ? { ...i, qty: action.qty } : i
              ),
      };
    case "CART_REMOVE":
      return {
        ...state,
        cart: state.cart.filter((i) => i.cartId !== action.cartId),
      };
    case "CART_CLEAR":
      return { ...state, cart: [], tableNumber: undefined };
    case "ORDER_ADD":
      return { ...state, orders: [action.payload, ...state.orders] };
    case "MENU_ITEM_UPSERT":
      return {
        ...state,
        menuItems: state.menuItems.some((i) => i.id === action.payload.id)
          ? state.menuItems.map((i) =>
              i.id === action.payload.id ? action.payload : i
            )
          : [...state.menuItems, action.payload],
      };
    case "MENU_ITEM_DELETE":
      return {
        ...state,
        menuItems: state.menuItems.filter((i) => i.id !== action.id),
      };
    case "CATEGORY_UPSERT":
      return {
        ...state,
        categories: state.categories.some((c) => c.id === action.payload.id)
          ? state.categories.map((c) =>
              c.id === action.payload.id ? action.payload : c
            )
          : [...state.categories, action.payload],
      };
    case "CATEGORY_DELETE":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
      };
    case "TOAST_ADD":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "TOAST_REMOVE":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    case "OPEN_TABLE_UPSERT":
      return {
        ...state,
        openTables: state.openTables.some((t) => t.id === action.payload.id)
          ? state.openTables.map((t) =>
              t.id === action.payload.id ? action.payload : t
            )
          : [...state.openTables, action.payload],
      };
    case "OPEN_TABLE_REMOVE":
      return {
        ...state,
        openTables: state.openTables.filter((t) => t.id !== action.id),
      };
    case "LOGOUT":
      return { ...initialState, isLoading: false, toasts: state.toasts };
    default:
      return state;
  }
}

// ── Context interface ─────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  setSession: (s: UserSession | null) => void;
  login: (session: UserSession) => Promise<void>;
  logout: () => Promise<void>;
  setServiceMode: (m: ServiceMode) => void;
  setTableNumber: (n: number | undefined) => void;
  loadMenuFromTemplate: (
    businessType: string,
    userId: string
  ) => Promise<void>;
  addToCart: (item: CartItem) => void;
  updateCartQty: (cartId: string, qty: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  placeOrder: (params: {
    paymentMethod: Order["paymentMethod"];
    discountType: "flat" | "percent";
    discountValue: number;
    cashReceivedPaise?: number;
    splitPayment?: { cashPaise: number; upiPaise: number };
  }) => Promise<Order>;
  upsertMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  upsertCategory: (cat: MenuCategory) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  showToast: (message: string, type?: Toast["type"]) => void;
  openTableAddItems: (
    tableNumber: number,
    items: CartItem[]
  ) => Promise<OpenTable>;
  closeTable: (
    tableId: string,
    params: {
      paymentMethod: Order["paymentMethod"];
      discountType: "flat" | "percent";
      discountValue: number;
      cashReceivedPaise?: number;
      splitPayment?: { cashPaise: number; upiPaise: number };
    }
  ) => Promise<Order>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Helper: load all user data from IndexedDB ─────────────────────────────────
async function loadUserData(uid: string) {
  const db = await import("@/lib/db");
  const [items, categories, orders, openTables] = await Promise.all([
    db.dbGetAllMenuItems(uid),
    db.dbGetAllCategories(uid),
    db.dbGetTodaysOrders(uid),
    db.dbGetAllOpenTables(uid),
  ]);
  return { items, categories, orders, openTables };
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Boot: restore session + all data on app load ──────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const session = loadSession();
        const cart = loadCart();
        const ui = loadUI();

        if (!session) {
          dispatch({
            type: "INIT_DONE",
            session: null,
            items: [],
            categories: [],
            orders: [],
            openTables: [],
            cart: [],
            serviceMode: "dine_in",
            tableNumber: undefined,
          });
          return;
        }

        const { items, categories, orders, openTables } = await loadUserData(
          session.userId
        );

        dispatch({
          type: "INIT_DONE",
          session,
          items,
          categories,
          orders,
          openTables,
          cart,
          serviceMode: ui.serviceMode,
          tableNumber: ui.tableNumber,
        });

        import("@/lib/supabase/sync")
          .then(({ backgroundSync }) => backgroundSync(session.userId))
          .catch(() => {});
      } catch {
        dispatch({
          type: "INIT_DONE",
          session: null,
          items: [],
          categories: [],
          orders: [],
          openTables: [],
          cart: [],
          serviceMode: "dine_in",
          tableNumber: undefined,
        });
      }
    }
    init();
  }, []);

  // ── Auto-persist on every change ─────────────────────────────────────────
  useEffect(() => {
    if (!state.isLoading) saveCart(state.cart);
  }, [state.cart, state.isLoading]);

  useEffect(() => {
    if (!state.isLoading)
      saveUI({
        serviceMode: state.serviceMode,
        tableNumber: state.tableNumber,
      });
  }, [state.serviceMode, state.tableNumber, state.isLoading]);

  // Save session whenever it changes (catches Settings saves via setSession)
  useEffect(() => {
    if (!state.isLoading) saveSession(state.session);
  }, [state.session, state.isLoading]);

  // ── Login: load all user data and persist session ─────────────────────────
  const login = useCallback(async (session: UserSession) => {
    saveSession(session);
    try {
      const cart = loadCart();
      const ui = loadUI();
      const { items, categories, orders, openTables } = await loadUserData(
        session.userId
      );
      dispatch({
        type: "INIT_DONE",
        session,
        items,
        categories,
        orders,
        openTables,
        cart,
        serviceMode: ui.serviceMode,
        tableNumber: ui.tableNumber,
      });
      import("@/lib/supabase/sync")
        .then(({ backgroundSync }) => backgroundSync(session.userId))
        .catch(() => {});
    } catch {
      dispatch({
        type: "INIT_DONE",
        session,
        items: [],
        categories: [],
        orders: [],
        openTables: [],
        cart: [],
        serviceMode: "dine_in",
        tableNumber: undefined,
      });
    }
  }, []);

  // ── Logout: wipe all local state ─────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(UI_KEY);
    } catch {}
    try {
      const { signOut } = await import("@/lib/supabase/auth");
      await signOut();
    } catch {}
    dispatch({ type: "LOGOUT" });
  }, []);

  // setSession: used by Settings page — also persists to localStorage
  const setSession = useCallback((s: UserSession | null) => {
    saveSession(s);
    dispatch({ type: "SET_SESSION", payload: s });
  }, []);

  const setServiceMode = useCallback(
    (mode: ServiceMode) => dispatch({ type: "SET_SERVICE_MODE", mode }),
    []
  );

  const setTableNumber = useCallback(
    (tableNumber: number | undefined) =>
      dispatch({ type: "SET_TABLE", tableNumber }),
    []
  );

  const loadMenuFromTemplate = useCallback(
    async (businessType: string, userId: string) => {
      const db = await import("@/lib/db");
      const existing = await db.dbGetAllMenuItems(userId);
      if (existing.length > 0) return;
      const key = businessType as keyof typeof MENU_TEMPLATES;
      const template = MENU_TEMPLATES[key] ?? MENU_TEMPLATES["restaurant"];
      await db.dbBulkSaveCategories(template.categories, userId);
      await db.dbBulkSaveMenuItems(template.items, userId);
      dispatch({
        type: "SET_MENU",
        items: template.items,
        categories: template.categories,
      });
    },
    []
  );

  const addToCart = useCallback(
    (item: CartItem) => dispatch({ type: "CART_ADD", payload: item }),
    []
  );
  const updateCartQty = useCallback(
    (cartId: string, qty: number) =>
      dispatch({ type: "CART_QTY", cartId, qty }),
    []
  );
  const removeFromCart = useCallback(
    (cartId: string) => dispatch({ type: "CART_REMOVE", cartId }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: "CART_CLEAR" }), []);

  const placeOrder = useCallback(
    async (params: {
      paymentMethod: Order["paymentMethod"];
      discountType: "flat" | "percent";
      discountValue: number;
      cashReceivedPaise?: number;
      splitPayment?: { cashPaise: number; upiPaise: number };
    }): Promise<Order> => {
      const {
        paymentMethod,
        discountType,
        discountValue,
        cashReceivedPaise,
        splitPayment,
      } = params;
      const snap = structuredClone(state.cart);
      if (snap.length === 0) throw new Error("Cart is empty");

      const subtotalPaise = snap.reduce(
        (s, i) =>
          s +
          (i.unitPricePaise +
            i.selectedAddOns.reduce((x, a) => x + a.pricePaise, 0)) *
            i.qty,
        0
      );
      const discountPaise = calcDiscount(subtotalPaise, discountType, discountValue);
      const afterDiscount = Math.max(0, subtotalPaise - discountPaise);
      const gstPercent = state.session?.gstPercent ?? 0;
      const gstPaise = calcGST(afterDiscount, gstPercent);
      const totalPaise = afterDiscount + gstPaise;
      const changePaise = cashReceivedPaise
        ? Math.max(0, cashReceivedPaise - totalPaise)
        : 0;

      const order: Order = {
        id: crypto.randomUUID(),
        billNumber: generateBillNumber(),
        items: snap,
        serviceMode: state.serviceMode,
        tableNumber: state.tableNumber,
        subtotalPaise,
        discountPaise,
        discountType,
        discountValue,
        gstPercent,
        gstPaise,
        totalPaise,
        paymentMethod,
        splitPayment,
        cashReceivedPaise,
        changePaise,
        createdAt: new Date().toISOString(),
        syncStatus: "pending",
      };

      const uid = state.session?.userId ?? "default";
      const db = await import("@/lib/db");
      await db.dbSaveOrder(order, uid);
      dispatch({ type: "ORDER_ADD", payload: order });
      dispatch({ type: "CART_CLEAR" });

      import("@/lib/supabase/sync")
        .then(({ syncOrder }) => syncOrder(order))
        .catch(() => {});

      return order;
    },
    [state.cart, state.session, state.serviceMode, state.tableNumber]
  );

  const openTableAddItems = useCallback(
    async (tableNumber: number, items: CartItem[]): Promise<OpenTable> => {
      const uid = state.session?.userId ?? "default";
      const db = await import("@/lib/db");
      const ex = state.openTables.find((t) => t.tableNumber === tableNumber);
      const now = new Date().toISOString();
      const tab: OpenTable = ex
        ? { ...ex, items: [...ex.items, ...items], updatedAt: now }
        : {
            id: crypto.randomUUID(),
            tableNumber,
            items,
            openedAt: now,
            updatedAt: now,
          };
      await db.dbSaveOpenTable(tab, uid);
      dispatch({ type: "OPEN_TABLE_UPSERT", payload: tab });
      return tab;
    },
    [state.openTables, state.session]
  );

  const closeTable = useCallback(
    async (
      tableId: string,
      params: {
        paymentMethod: Order["paymentMethod"];
        discountType: "flat" | "percent";
        discountValue: number;
        cashReceivedPaise?: number;
        splitPayment?: { cashPaise: number; upiPaise: number };
      }
    ): Promise<Order> => {
      const tab = state.openTables.find((t) => t.id === tableId);
      if (!tab) throw new Error("Table not found");

      const {
        paymentMethod,
        discountType,
        discountValue,
        cashReceivedPaise,
        splitPayment,
      } = params;

      const subtotalPaise = tab.items.reduce(
        (s, i) =>
          s +
          (i.unitPricePaise +
            i.selectedAddOns.reduce((x, a) => x + a.pricePaise, 0)) *
            i.qty,
        0
      );
      const discountPaise = calcDiscount(subtotalPaise, discountType, discountValue);
      const afterDiscount = Math.max(0, subtotalPaise - discountPaise);
      const gstPercent = state.session?.gstPercent ?? 0;
      const gstPaise = calcGST(afterDiscount, gstPercent);
      const totalPaise = afterDiscount + gstPaise;
      const changePaise = cashReceivedPaise
        ? Math.max(0, cashReceivedPaise - totalPaise)
        : 0;

      const order: Order = {
        id: crypto.randomUUID(),
        billNumber: generateBillNumber(),
        items: tab.items,
        serviceMode: "dine_in",
        tableNumber: tab.tableNumber,
        subtotalPaise,
        discountPaise,
        discountType,
        discountValue,
        gstPercent,
        gstPaise,
        totalPaise,
        paymentMethod,
        splitPayment,
        cashReceivedPaise,
        changePaise,
        createdAt: new Date().toISOString(),
        syncStatus: "pending",
      };

      const uid = state.session?.userId ?? "default";
      const db = await import("@/lib/db");
      await db.dbSaveOrder(order, uid);
      await db.dbDeleteOpenTable(tableId, uid);
      dispatch({ type: "ORDER_ADD", payload: order });
      dispatch({ type: "OPEN_TABLE_REMOVE", id: tableId });

      import("@/lib/supabase/sync")
        .then(({ syncOrder }) => syncOrder(order))
        .catch(() => {});

      return order;
    },
    [state.openTables, state.session]
  );

  const upsertMenuItem = useCallback(
    async (item: MenuItem) => {
      const uid = state.session?.userId ?? "default";
      const db = await import("@/lib/db");
      await db.dbSaveMenuItem(item, uid);
      dispatch({ type: "MENU_ITEM_UPSERT", payload: item });
    },
    [state.session]
  );

  const deleteMenuItem = useCallback(
    async (id: string) => {
      const uid = state.session?.userId ?? "default";
      const db = await import("@/lib/db");
      await db.dbDeleteMenuItem(id, uid);
      dispatch({ type: "MENU_ITEM_DELETE", id });
    },
    [state.session]
  );

  const upsertCategory = useCallback(
    async (cat: MenuCategory) => {
      const uid = state.session?.userId ?? "default";
      const db = await import("@/lib/db");
      await db.dbSaveCategory(cat, uid);
      dispatch({ type: "CATEGORY_UPSERT", payload: cat });
    },
    [state.session]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const uid = state.session?.userId ?? "default";
      const db = await import("@/lib/db");
      await db.dbDeleteCategory(id, uid);
      dispatch({ type: "CATEGORY_DELETE", id });
    },
    [state.session]
  );

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = crypto.randomUUID();
      dispatch({ type: "TOAST_ADD", payload: { id, message, type } });
      setTimeout(() => dispatch({ type: "TOAST_REMOVE", id }), 3500);
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        state,
        setSession,
        login,
        logout,
        setServiceMode,
        setTableNumber,
        loadMenuFromTemplate,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        placeOrder,
        upsertMenuItem,
        deleteMenuItem,
        upsertCategory,
        deleteCategory,
        showToast,
        openTableAddItems,
        closeTable,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
