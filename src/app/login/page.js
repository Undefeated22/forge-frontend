"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, signup } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState("login"); // "login" | "signup"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);

    async function submit() {
        setErr(null);
        if (!email || !password) { setErr("Email and password required"); return; }
        if (mode === "signup" && password.length < 8) { setErr("Password must be at least 8 characters"); return; }
        setBusy(true);
        try {
            if (mode === "signup") await signup(email, password);
            else await login(email, password);
            router.push("/");
        } catch (e) {
            // surface the backend's message cleanly
            const msg = e.message.replace(/^API \d+:\s*/, "");
            try { setErr(JSON.parse(msg).error ?? msg); } catch { setErr(msg); }
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#fdfcfd] text-[#3a3a44] flex items-center justify-center relative overflow-hidden selection:bg-rose-100">
            <div className="pointer-events-none fixed top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-rose-100/40 blur-[160px]" />
            <div className="pointer-events-none fixed bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-purple-100/30 blur-[150px]" />

            <div className="relative z-10 w-full max-w-sm">
                {/* brand */}
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold shadow-sm">F</div>
                    <span className="text-2xl font-light tracking-tight text-slate-800">Forge</span>
                </div>

                <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-[#f3eef3] shadow-xl p-8">
                    <h1 className="text-lg font-medium text-slate-800 mb-1">
                        {mode === "login" ? "Welcome back" : "Create your account"}
                    </h1>
                    <p className="text-sm text-slate-400 mb-6">
                        {mode === "login" ? "Sign in to your incident workspace." : "Start building your incident intelligence."}
                    </p>

                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        className="w-full rounded-lg border border-[#f3eef3] px-3 py-2 text-sm text-slate-700 mb-4 focus:outline-none focus:border-purple-300" />

                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        className="w-full rounded-lg border border-[#f3eef3] px-3 py-2 text-sm text-slate-700 mb-5 focus:outline-none focus:border-purple-300" />

                    {err && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-500 font-mono text-[12px] px-3 py-2 mb-4">{err}</div>}

                    <button onClick={submit} disabled={busy}
                        className="w-full font-mono text-[13px] bg-gradient-to-r from-rose-400 to-purple-400 text-white py-2.5 rounded-lg hover:from-rose-500 hover:to-purple-500 transition disabled:opacity-50">
                        {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
                    </button>

                    <div className="mt-5 text-center font-mono text-[12px] text-slate-400">
                        {mode === "login" ? (
                            <>No account? <button onClick={() => { setMode("signup"); setErr(null); }} className="text-purple-500 hover:text-purple-600">Sign up</button></>
                        ) : (
                            <>Have an account? <button onClick={() => { setMode("login"); setErr(null); }} className="text-purple-500 hover:text-purple-600">Sign in</button></>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}