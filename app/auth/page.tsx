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
  { value: "cafe",        label: "Cafe"        },
  { value: "restaurant",  label: "Restaurant"  },
  { value: "food_truck",  label: "Food Truck"  },
  { value: "kiosk",       label: "Kiosk"       },
  { value: "bakery",      label: "Bakery"      },
  { value: "franchise",   label: "Franchise"   },
].filter((b) => !(HIDE_FRANCHISE && b.value === "franchise"));

function VynnHex() {
  return (
    <svg viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" width={40} height={46}>
      <polygon points="22,3 41,13 41,39 22,49 3,39 3,13" stroke="#D97C5A" strokeWidth="1.4" fill="none"/>
      <line x1="22" y1="0" x2="22" y2="52" stroke="#D97C5A" strokeWidth="2"/>
      <line x1="10" y1="26" x2="34" y2="26" stroke="#D97C5A" strokeWidth="0.7" opacity="0.35"/>
    </svg>
  );
}

const ink  = "#1C1410";
const ink2 = "#5C4E47";
const ink3 = "#9C8E87";
const tc600 = "#B24B2F";
const tc400 = "#D97C5A";
const tc50  = "#FAF0EB";
const sand  = "#FAF6F2";
const sand2 = "#F3EDE6";

function Field({
  icon, placeholder, value, onChange, type = "text", right, onKeyDown,
}: {
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
  right?: React.ReactNode; onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: ink3, pointerEvents: "none", display: "flex" }}>
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          width: "100%", height: 48,
          paddingLeft: 42, paddingRight: right ? 44 : 14,
          borderRadius: 10,
          border: `1px solid ${sand2}`,
          background: sand,
          fontSize: 14,
          color: ink,
          outline: "none",
          fontFamily: "inherit",
        }}
        onFocus={(e) => { e.target.style.border = `1.5px solid ${tc400}`; e.target.style.background = "white"; }}
        onBlur={(e)  => { e.target.style.border = `1px solid ${sand2}`;  e.target.style.background = sand; }}
      />
      {right && (
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
          {right}
        </div>
      )}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { login, loadMenuFromTemplate } = useApp();
  const [mode, setMode]               = useState<Mode>("signin");
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [role, setRole]               = useState<UserRole>("owner");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName]     = useState("");
  const [bizType, setBizType]         = useState("restaurant");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

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
      const loginResult = await signIn(username, password);
      if (!loginResult.ok) { setError("Signed up! Please sign in."); setLoading(false); setMode("signin"); return; }
      const uid = loginResult.userId ?? `local_${username}`;
      await login({ userId: uid, username, role, businessName, businessType: bizType as BusinessType, gstPercent: 5 });
      await loadMenuFromTemplate(bizType, uid);
    } else {
      const result = await signIn(username, password);
      if (!result.ok) { setError(result.error ?? "Sign in failed"); setLoading(false); return; }
      const uid = result.userId ?? `local_${username}`;
      await login({
        userId: uid, username,
        role: result.role ?? "cashier" as UserRole,
        businessName: result.businessName ?? "",
        businessType: (result.businessType ?? "restaurant") as BusinessType,
        gstPercent: result.gstPercent ?? 5,
        upiId: result.upiId,
      });
      await loadMenuFromTemplate(result.businessType ?? "restaurant", uid);
    }
    router.replace("/pos");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1C1410", display: "flex" }}>

      {/* ── Left panel — brand (desktop only) ── */}
      <div style={{
        display: "none",
        width: 340, flexShrink: 0,
        background: "#161008",
        borderRight: "0.5px solid rgba(255,255,255,0.06)",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 40px",
      }}
        className="auth-left"
      >
        <div>
          <VynnHex />
          <div style={{ marginTop: 16, fontSize: 18, letterSpacing: "0.2em", color: tc400, fontWeight: 300 }}>VYNN</div>
          <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(217,124,90,0.4)", fontWeight: 300, marginTop: 3 }}>SMART POS</div>
        </div>
        <div>
          <p style={{ fontSize: 22, fontWeight: 300, color: "white", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
            Built for<br/>Indian F&amp;B<br/>businesses.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 16, lineHeight: 1.7 }}>
            Fast · Offline-first · GST-ready
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 20px", overflowY: "auto",
      }}>

        {/* Mobile logo */}
        <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }} className="auth-mobile-logo">
          <VynnHex />
          <div style={{ marginTop: 10, fontSize: 14, letterSpacing: "0.2em", color: tc400, fontWeight: 300 }}>VYNN</div>
          <div style={{ fontSize: 9, letterSpacing: "0.16em", color: "rgba(217,124,90,0.4)", marginTop: 2 }}>SMART POS</div>
        </div>

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 400,
          background: "white",
          borderRadius: 16,
          border: `0.5px solid ${sand2}`,
          overflow: "hidden",
        }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: `0.5px solid ${sand2}` }}>
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "16px 0",
                  fontSize: 13, fontWeight: 500,
                  letterSpacing: "0.04em",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit",
                  color: mode === m ? tc600 : ink3,
                  borderBottom: mode === m ? `2px solid ${tc600}` : "2px solid transparent",
                  transition: "all 0.15s",
                  marginBottom: -1,
                }}
              >
                {m === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
              </button>
            ))}
          </div>

          {/* Form body */}
          <div style={{ padding: "28px 28px 32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>

              <Field
                icon={<User size={15}/>}
                placeholder="Username"
                value={username}
                onChange={setUsername}
              />

              <Field
                icon={<Lock size={15}/>}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                type={showPwd ? "text" : "password"}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                right={
                  <button onClick={() => setShowPwd((p) => !p)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: ink3, display: "flex", padding: 0 }}>
                    {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                }
              />

              {mode === "signup" && (
                <>
                  <Field
                    icon={<Store size={15}/>}
                    placeholder="Business Name *"
                    value={businessName}
                    onChange={setBusinessName}
                  />

                  <Field
                    icon={<User size={15}/>}
                    placeholder="Owner Name"
                    value={ownerName}
                    onChange={setOwnerName}
                  />

                  {/* Business type select */}
                  <div style={{ position: "relative" }}>
                    <Store size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: ink3, pointerEvents: "none" }}/>
                    <select
                      value={bizType}
                      onChange={(e) => setBizType(e.target.value)}
                      style={{
                        width: "100%", height: 48,
                        paddingLeft: 42, paddingRight: 36,
                        borderRadius: 10,
                        border: `1px solid ${sand2}`,
                        background: sand,
                        fontSize: 14, color: ink,
                        outline: "none",
                        appearance: "none",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {BIZ_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                    <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: ink3, pointerEvents: "none" }}/>
                  </div>

                  {/* Role pills */}
                  <div>
                    <p style={{ fontSize: 10, letterSpacing: "0.1em", color: ink3, marginBottom: 8 }}>ROLE</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["owner", "cashier"] as UserRole[]).map((r) => (
                        <button key={r} onClick={() => setRole(r)}
                          style={{
                            flex: 1, padding: "10px 0",
                            borderRadius: 8, fontSize: 12,
                            fontWeight: 500, letterSpacing: "0.06em",
                            textTransform: "capitalize",
                            cursor: "pointer", fontFamily: "inherit",
                            border: `1px solid ${role === r ? tc600 : sand2}`,
                            color: role === r ? tc600 : ink3,
                            background: role === r ? tc50 : "white",
                            transition: "all 0.15s",
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12, color: tc600,
                background: tc50, borderRadius: 8,
                padding: "10px 14px", marginBottom: 16,
                border: `0.5px solid rgba(178,75,47,0.2)`,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", height: 48,
                background: ink, color: "white",
                border: "none", borderRadius: 10,
                fontSize: 13, fontWeight: 500,
                letterSpacing: "0.08em",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "inherit",
                transition: "opacity 0.15s",
              }}
            >
              {loading && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }}/>}
              {mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>

            {/* Toggle hint */}
            <p style={{ textAlign: "center", fontSize: 12, color: ink3, marginTop: 20 }}>
              {mode === "signin" ? "New here? " : "Already have an account? "}
              <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: tc600, fontSize: 12, fontFamily: "inherit", fontWeight: 500 }}>
                {mode === "signin" ? "Create account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 32, letterSpacing: "0.06em" }}>
          VYNN · SMART POS
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          .auth-left { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
