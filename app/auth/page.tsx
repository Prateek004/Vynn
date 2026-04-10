"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff, Loader2, Store, ChevronDown } from "lucide-react";
import { signIn, signUp } from "@/lib/supabase/auth";
import { useApp } from "@/lib/store/AppContext";
import { HIDE_FRANCHISE } from "@/lib/utils";
import type { UserRole, BusinessType } from "@/lib/types";

type Mode = "signin" | "signup";

const BIZ_TYPES = [
  { value: "cafe", label: "Cafe" },
  { value: "restaurant", label: "Restaurant" },
  { value: "food_truck", label: "Food Truck" },
  { value: "kiosk", label: "Kiosk" },
  { value: "bakery", label: "Bakery" },
  { value: "franchise", label: "Franchise" },
].filter((b) => !(HIDE_FRANCHISE && b.value === "franchise"));

export default function AuthPage() {
  const router = useRouter();
  const { setSession, loadMenuFromTemplate } = useApp();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<UserRole>("owner");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [bizType, setBizType] = useState("restaurant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || password.length < 6) {
      setError("Username required · password ≥ 6 characters");
      return;
    }
    if (mode === "signup" && !businessName.trim()) {
      setError("Business name required");
      return;
    }
    setLoading(true);

    if (mode === "signup") {
      const result = await signUp({ username, password, role, businessName, ownerName, businessType: bizType });
      if (!result.ok) { setError(result.error ?? "Signup failed"); setLoading(false); return; }
      const login = await signIn(username, password);
      if (!login.ok) { setError("Signed up! Please sign in."); setLoading(false); setMode("signin"); return; }
      const uid = login.userId ?? `local_${username}`;
      const session = {
        userId: uid,
        username,
        role,
        businessName,
        businessType: bizType as BusinessType,
        gstPercent: 5,
      };
      setSession(session);
      await loadMenuFromTemplate(bizType, uid);
    } else {
      const result = await signIn(username, password);
      if (!result.ok) { setError(result.error ?? "Sign in failed"); setLoading(false); return; }
      const uid = result.userId ?? `local_${username}`;
      const session = {
        userId: uid,
        username,
        role: result.role ?? "cashier" as UserRole,
        businessName: result.businessName ?? "",
        businessType: (result.businessType ?? "restaurant") as BusinessType,
        gstPercent: result.gstPercent ?? 5,
        upiId: result.upiId,
      };
      setSession(session);
      await loadMenuFromTemplate(result.businessType ?? "restaurant", uid);
    }

    router.replace("/pos");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 py-10">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-primary-500 flex items-center justify-center shadow-lg mb-3">
          <span className="text-white text-3xl font-black">V</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900">Vynn</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">Smart POS for Indian F&amp;B</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex rounded-2xl bg-gray-100 p-1 mb-5">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-4">
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="bm-input pl-10 border-2" placeholder="Username" value={username}
              onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="bm-input pl-10 pr-11 border-2" placeholder="Password"
              type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            <button onClick={() => setShowPwd((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === "signup" && (
            <>
              <input className="bm-input border-2" placeholder="Business Name *" value={businessName}
                onChange={(e) => setBusinessName(e.target.value)} />
              <input className="bm-input border-2" placeholder="Owner Name" value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)} />
              <div className="relative">
                <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select className="bm-input pl-10 border-2 appearance-none" value={bizType} onChange={(e) => setBizType(e.target.value)}>
                  {BIZ_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Role</p>
                <div className="flex gap-2">
                  {(["owner", "cashier"] as UserRole[]).map((r) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold capitalize transition-all ${role === r ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-gray-500"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-500 font-semibold bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold press shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}
