import { getSupabase } from "./client";

export type UserRole = "owner" | "cashier";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface SignUpData {
  username: string;
  password: string;
  role: UserRole;
  businessName: string;
  ownerName: string;
  businessType: string;
}

// ── Local auth helpers (used when Supabase not configured) ───────────────────
const LOCAL_USERS_KEY = "vynn_local_users";

interface LocalUser {
  username: string;
  passwordHash: string;
  role: UserRole;
  businessName: string;
  ownerName: string;
  businessType: string;
  gstPercent: number;
  upiId?: string;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const c = password.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return String(hash);
}

function getLocalUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUser[]): void {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export async function signUp(data: SignUpData): Promise<AuthResult> {
  const sb = getSupabase();

  if (!sb) {
    const users = getLocalUsers();
    const exists = users.some((u) => u.username === data.username.toLowerCase().trim());
    if (exists) return { ok: false, error: "Username already taken" };
    users.push({
      username: data.username.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role: data.role,
      businessName: data.businessName.trim(),
      ownerName: data.ownerName.trim(),
      businessType: data.businessType,
      gstPercent: 5,
    });
    saveLocalUsers(users);
    return { ok: true };
  }

  const email = `${data.username.toLowerCase().trim()}@vynn.app`;
  const { data: authData, error } = await sb.auth.signUp({ email, password: data.password });
  if (error) return { ok: false, error: error.message };

  if (authData.user) {
    // Use upsert instead of insert to handle auto-created profile rows from triggers
    const { error: profileError } = await sb.from("profiles").upsert(
      {
        id: authData.user.id,
        username: data.username.toLowerCase().trim(),
        role: data.role,
        business_name: data.businessName.trim(),
        owner_name: data.ownerName.trim(),
        business_type: data.businessType,
        gst_percent: 5,
        currency_symbol: "₹",
      },
      { onConflict: "id" }
    );
    if (profileError) return { ok: false, error: profileError.message };
  }

  return { ok: true };
}

export async function signIn(username: string, password: string): Promise<AuthResult & {
  userId?: string;
  role?: UserRole;
  businessName?: string;
  businessType?: string;
  gstPercent?: number;
  upiId?: string;
  ownerName?: string;
}> {
  const sb = getSupabase();

  if (!sb) {
    const users = getLocalUsers();
    const user = users.find((u) => u.username === username.toLowerCase().trim());
    if (!user) return { ok: false, error: "Username not found" };
    if (user.passwordHash !== hashPassword(password)) return { ok: false, error: "Incorrect password" };
    return {
      ok: true,
      userId: `local_${user.username}`,
      role: user.role,
      businessName: user.businessName,
      businessType: user.businessType,
      gstPercent: user.gstPercent ?? 5,
      upiId: user.upiId,
      ownerName: user.ownerName,
    };
  }

  const email = `${username.toLowerCase().trim()}@vynn.app`;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "No session" };

  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("role, business_name, business_type, gst_percent, upi_id, owner_name")
    .eq("id", user.id)
    .single();

  if (pErr || !profile) return { ok: false, error: "Profile not found" };

  return {
    ok: true,
    userId: user.id,
    role: profile.role as UserRole,
    businessName: profile.business_name,
    businessType: profile.business_type,
    gstPercent: profile.gst_percent ?? 5,
    upiId: profile.upi_id,
    ownerName: profile.owner_name,
  };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}

export async function getCurrentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) {
    const raw = typeof window !== "undefined" ? localStorage.getItem("vynn_session") : null;
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      return s.userId ?? null;
    } catch {
      return null;
    }
  }
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}
