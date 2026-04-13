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

const LOCAL_USERS_KEY = "vynn_local_users";

interface LocalUser {
  username: string;
  passwordHash: string;
  salt?: string; // FIX: added — undefined on legacy accounts, triggers upgrade path
  role: UserRole;
  businessName: string;
  ownerName: string;
  businessType: string;
  gstPercent: number;
  upiId?: string;
}

// FIX: replaced insecure djb2 with SHA-256 + per-user salt via Web Crypto API
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Legacy djb2 — only used to verify and upgrade old accounts
function legacyHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const c = password.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return String(hash);
}

function getLocalUsers(): LocalUser[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) ?? "[]"); } catch { return []; }
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
    const salt = generateSalt();
    const passwordHash = await hashPassword(data.password, salt);
    users.push({
      username: data.username.toLowerCase().trim(),
      passwordHash,
      salt,
      role: data.role,
      businessName: data.businessName.trim(),
      ownerName: data.ownerName.trim(),
      businessType: data.businessType,
      gstPercent: 5,
    });
    saveLocalUsers(users);
    return { ok: true };
  }

  const username = data.username.toLowerCase().trim();
  const email = `${username}@vynn.app`;

  const { data: authData, error } = await sb.auth.signUp({
    email,
    password: data.password,
    options: {
      data: {
        username,
        business_name: data.businessName.trim(),
        owner_name: data.ownerName.trim(),
        business_type: data.businessType,
        role: data.role,
      },
    },
  });

  if (error) return { ok: false, error: error.message };
  if (!authData.user) return { ok: false, error: "Signup failed — no user returned" };

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

    let match = false;
    if (user.salt) {
      // Modern account — SHA-256 + salt
      const hash = await hashPassword(password, user.salt);
      match = hash === user.passwordHash;
    } else {
      // FIX: Legacy account (no salt) — verify with old djb2 then upgrade in-place
      if (legacyHash(password) === user.passwordHash) {
        match = true;
        const salt = generateSalt();
        user.salt = salt;
        user.passwordHash = await hashPassword(password, salt);
        saveLocalUsers(users);
      }
    }

    if (!match) return { ok: false, error: "Incorrect password" };
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
    // FIX: aligned with AppContext SESSION_KEY = "vynn_session"
    const raw = typeof window !== "undefined" ? localStorage.getItem("vynn_session") : null;
    if (!raw) return null;
    try { const s = JSON.parse(raw); return s.userId ?? null; } catch { return null; }
  }
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}
