import Dexie, { type Table } from "dexie";
import type { Order, MenuItem, MenuCategory, RawMaterial, FinishedGood, OpenTable } from "@/lib/types";

type WithUid<T> = T & { _uid: string };

class ServezyDB extends Dexie {
  orders!: Table<WithUid<Order>, string>;
  menuItems!: Table<WithUid<MenuItem>, string>;
  categories!: Table<WithUid<MenuCategory>, string>;
  rawMaterials!: Table<WithUid<RawMaterial>, string>;
  finishedGoods!: Table<WithUid<FinishedGood>, string>;
  barItems!: Table<WithUid<FinishedGood>, string>;
  openTables!: Table<WithUid<OpenTable>, string>;

  constructor() {
    super("servezy_db");
    this.version(1).stores({ orders: "id, createdAt, syncStatus", menuItems: "id, categoryId", categories: "id, sortOrder" });
    this.version(2).stores({ orders: "id, createdAt, syncStatus", menuItems: "id, categoryId", categories: "id, sortOrder", rawMaterials: "id, name", finishedGoods: "id, name, expiryDate" });
    this.version(3).stores({ orders: "id, createdAt, syncStatus", menuItems: "id, categoryId", categories: "id, sortOrder", rawMaterials: "id, name", finishedGoods: "id, name, expiryDate", barItems: "id, name, expiryDate" });
    this.version(4).stores({
      orders:        "id, _uid, createdAt, syncStatus",
      menuItems:     "id, _uid, categoryId",
      categories:    "id, _uid, sortOrder",
      rawMaterials:  "id, _uid, name",
      finishedGoods: "id, _uid, name, expiryDate",
      barItems:      "id, _uid, name, expiryDate",
    });
    this.version(5).stores({
      orders:        "id, _uid, createdAt, syncStatus",
      menuItems:     "id, _uid, categoryId",
      categories:    "id, _uid, sortOrder",
      rawMaterials:  "id, _uid, name",
      finishedGoods: "id, _uid, name, expiryDate",
      barItems:      "id, _uid, name, expiryDate",
      openTables:    "id, _uid, tableNumber",
    });
  }
}

let _db: ServezyDB | null = null;
function getDB(): ServezyDB {
  if (!_db) _db = new ServezyDB();
  return _db;
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function dbSaveOrder(order: Order, uid: string): Promise<void> {
  await getDB().orders.put({ ...order, _uid: uid });
}
export async function dbGetAllOrders(uid: string): Promise<Order[]> {
  const rows = await getDB().orders.where("_uid").equals(uid).reverse().sortBy("createdAt");
  return rows as unknown as Order[];
}
export async function dbGetTodaysOrders(uid: string): Promise<Order[]> {
  const today = new Date().toISOString().slice(0, 10);
  const all = await getDB().orders.where("_uid").equals(uid).toArray();
  return all.filter((o) => o.createdAt.startsWith(today)) as unknown as Order[];
}
// FIX: uid is now required — prevents backgroundSync from leaking cross-user orders
export async function dbGetPendingOrders(uid: string): Promise<Order[]> {
  const all = await getDB().orders.where("_uid").equals(uid).toArray();
  return all.filter((o) => o.syncStatus === "pending" || o.syncStatus === "failed") as unknown as Order[];
}
export async function dbUpdateSyncStatus(id: string, status: Order["syncStatus"]): Promise<void> {
  await getDB().orders.update(id, { syncStatus: status });
}

// ── Menu Items ────────────────────────────────────────────────────────────────
export async function dbSaveMenuItem(item: MenuItem, uid: string): Promise<void> {
  await getDB().menuItems.put({ ...item, _uid: uid });
}
export async function dbDeleteMenuItem(id: string, uid: string): Promise<void> {
  const rec = await getDB().menuItems.get(id);
  if (rec && rec._uid === uid) await getDB().menuItems.delete(id);
}
export async function dbGetAllMenuItems(uid: string): Promise<MenuItem[]> {
  return getDB().menuItems.where("_uid").equals(uid).toArray() as unknown as MenuItem[];
}
export async function dbBulkSaveMenuItems(items: MenuItem[], uid: string): Promise<void> {
  await getDB().menuItems.bulkPut(items.map((i) => ({ ...i, _uid: uid })));
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function dbSaveCategory(cat: MenuCategory, uid: string): Promise<void> {
  await getDB().categories.put({ ...cat, _uid: uid });
}
export async function dbDeleteCategory(id: string, uid: string): Promise<void> {
  const rec = await getDB().categories.get(id);
  if (rec && rec._uid === uid) await getDB().categories.delete(id);
}
export async function dbGetAllCategories(uid: string): Promise<MenuCategory[]> {
  const cats = await getDB().categories.where("_uid").equals(uid).toArray();
  return cats.sort((a, b) => a.sortOrder - b.sortOrder) as unknown as MenuCategory[];
}
export async function dbBulkSaveCategories(cats: MenuCategory[], uid: string): Promise<void> {
  await getDB().categories.bulkPut(cats.map((c) => ({ ...c, _uid: uid })));
}

// ── Raw Materials ─────────────────────────────────────────────────────────────
export async function dbSaveRawMaterial(item: RawMaterial, uid: string): Promise<void> {
  await getDB().rawMaterials.put({ ...item, _uid: uid });
}
export async function dbDeleteRawMaterial(id: string, uid: string): Promise<void> {
  const rec = await getDB().rawMaterials.get(id);
  if (rec && rec._uid === uid) await getDB().rawMaterials.delete(id);
}
export async function dbGetAllRawMaterials(uid: string): Promise<RawMaterial[]> {
  return getDB().rawMaterials.where("_uid").equals(uid).toArray() as unknown as RawMaterial[];
}

// ── Finished Goods ────────────────────────────────────────────────────────────
export async function dbSaveFinishedGood(item: FinishedGood, uid: string): Promise<void> {
  await getDB().finishedGoods.put({ ...item, _uid: uid });
}
export async function dbDeleteFinishedGood(id: string, uid: string): Promise<void> {
  const rec = await getDB().finishedGoods.get(id);
  if (rec && rec._uid === uid) await getDB().finishedGoods.delete(id);
}
export async function dbGetAllFinishedGoods(uid: string): Promise<FinishedGood[]> {
  return getDB().finishedGoods.where("_uid").equals(uid).toArray() as unknown as FinishedGood[];
}

// ── Bar Items ─────────────────────────────────────────────────────────────────
export async function dbSaveBarItem(item: FinishedGood, uid: string): Promise<void> {
  await getDB().barItems.put({ ...item, _uid: uid });
}
export async function dbDeleteBarItem(id: string, uid: string): Promise<void> {
  const rec = await getDB().barItems.get(id);
  if (rec && rec._uid === uid) await getDB().barItems.delete(id);
}
export async function dbGetAllBarItems(uid: string): Promise<FinishedGood[]> {
  return getDB().barItems.where("_uid").equals(uid).toArray() as unknown as FinishedGood[];
}

// ── Open Tables ───────────────────────────────────────────────────────────────
export async function dbSaveOpenTable(tab: OpenTable, uid: string): Promise<void> {
  await getDB().openTables.put({ ...tab, _uid: uid });
}
export async function dbGetAllOpenTables(uid: string): Promise<OpenTable[]> {
  return getDB().openTables.where("_uid").equals(uid).toArray() as unknown as OpenTable[];
}
export async function dbDeleteOpenTable(id: string, uid: string): Promise<void> {
  const rec = await getDB().openTables.get(id);
  if (rec && rec._uid === uid) await getDB().openTables.delete(id);
}
