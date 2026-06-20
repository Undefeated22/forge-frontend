"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
    const { token } = useParams();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [done, setDone] = useState(false);

    async function submit() {
        setErr(null);
        if (password.length < 8) { setErr("Password must be at least 8 characters"); return; }
        if (password !== confirm) { setErr("Passwords don't match"); return; }
        setBusy(true);
        try {
            await resetPassword(token, password);
            setDone(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch (e) {
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
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold shadow-sm">F</div>
                    <span className="text-2xl font-light tracking-tight text-slate-800">Forge</span>
                </div>

                <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-[#f3eef3] shadow-xl p-8">
                    {done ? (
                        <div className="text-center">
                            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                                <span className="text-emerald-500 text-xl">✓</span>
                            </div>
                            <h1 className="text-lg font-medium text-slate-800 mb-1">Password updated</h1>
                            <p className="text-sm text-slate-400">Redirecting you to sign in…</p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-lg font-medium text-slate-800 mb-1">Set a new password</h1>
                            <p className="text-sm text-slate-400 mb-6">Choose a strong password for your account.</p>

                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">New password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy}
                                onKeyDown={(e) => e.key === "Enter" && submit()}
                                className="w-full rounded-lg border border-[#f3eef3] px-3 py-2 text-sm text-slate-700 mb-4 focus:outline-none focus:border-purple-300" />

                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">Confirm password</label>
                            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy}
                                onKeyDown={(e) => e.key === "Enter" && submit()}
                                className="w-full rounded-lg border border-[#f3eef3] px-3 py-2 text-sm text-slate-700 mb-5 focus:outline-none focus:border-purple-300" />

                            {err && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-500 font-mono text-[12px] px-3 py-2 mb-4">{err}</div>}

                            <button onClick={submit} disabled={busy}
                                className="w-full font-mono text-[13px] bg-gradient-to-r from-rose-400 to-purple-400 text-white py-2.5 rounded-lg hover:from-rose-500 hover:to-purple-500 transition disabled:opacity-50">
                                {busy ? "…" : "Update password"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}