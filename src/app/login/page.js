"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { login, signup, forgotPassword } from "@/lib/api";

const spring = { type: "spring", stiffness: 300, damping: 24 };

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [sent, setSent] = useState(false);

    async function submit() {
        setErr(null);
        if (mode === "forgot") {
            if (!email) { setErr("Email required"); return; }
            setBusy(true);
            try { await forgotPassword(email); setSent(true); }
            catch (e) { setErr(cleanErr(e)); }
            finally { setBusy(false); }
            return;
        }
        if (!email || !password) { setErr("Email and password required"); return; }
        if (mode === "signup" && password.length < 8) { setErr("Password must be at least 8 characters"); return; }
        setBusy(true);
        try {
            if (mode === "signup") await signup(email, password);
            else await login(email, password);
            router.push("/");
        } catch (e) { setErr(cleanErr(e)); setBusy(false); }
    }

    function cleanErr(e) {
        const msg = e.message.replace(/^API \d+:\s*/, "");
        try { return JSON.parse(msg).error ?? msg; } catch { return msg; }
    }
    function switchMode(m) { setMode(m); setErr(null); setSent(false); }

    const inputCls = "w-full rounded-xl bg-white/60 border border-white/70 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-purple-300 focus:bg-white/80 transition-colors";

    return (
        <div className="min-h-screen bg-[#f4f1f6] text-[#2a2730] flex items-center justify-center relative overflow-hidden selection:bg-rose-200/60">
            {/* static light field */}
            <div className="pointer-events-none fixed -top-20 left-1/4 h-[600px] w-[600px] rounded-full bg-rose-300/30 blur-[170px]" />
            <div className="pointer-events-none fixed bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-purple-300/25 blur-[160px]" />
            <div className="pointer-events-none fixed top-1/3 left-1/2 h-[400px] w-[400px] rounded-full bg-fuchsia-300/20 blur-[150px]" />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring}
                className="relative z-10 w-full max-w-sm">

                <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}
                    className="flex items-center justify-center gap-2.5 mb-8">
                    <motion.div whileHover={{ scale: 1.12, rotate: 8 }} transition={spring}
                        className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-fuchsia-300/40">F</motion.div>
                    <span className="text-2xl font-semibold tracking-tight text-slate-800">Forge</span>
                </motion.div>

                <div className="rounded-3xl bg-white/50 backdrop-blur-2xl border border-white/60 shadow-[0_25px_70px_-25px_rgba(200,100,180,0.4)] p-8">
                    <AnimatePresence mode="wait">
                        {mode === "forgot" ? (
                            <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
                                {sent ? (
                                    <div className="text-center">
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.1 }}
                                            className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-white/70 flex items-center justify-center mx-auto mb-4">
                                            <span className="text-emerald-500 text-2xl">✓</span>
                                        </motion.div>
                                        <h1 className="text-lg font-semibold text-slate-800 mb-1">Check your email</h1>
                                        <p className="text-sm text-slate-400 mb-6">If an account exists for that email, we've sent a reset link.</p>
                                        <button onClick={() => switchMode("login")} className="font-mono text-[12px] text-purple-500 hover:text-purple-600">← back to sign in</button>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-xl font-semibold text-slate-800 mb-1">Reset your password</h1>
                                        <p className="text-sm text-slate-400 mb-6">Enter your email and we'll send you a reset link.</p>
                                        <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy}
                                            onKeyDown={(e) => e.key === "Enter" && submit()} className={`${inputCls} mb-5`} />
                                        {err && <ErrBox msg={err} />}
                                        <SubmitBtn busy={busy} onClick={submit} label="Send reset link" />
                                        <div className="mt-5 text-center font-mono text-[12px] text-slate-400">
                                            <button onClick={() => switchMode("login")} className="text-purple-500 hover:text-purple-600">← back to sign in</button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring}>
                                <h1 className="text-xl font-semibold text-slate-800 mb-1">
                                    {mode === "login" ? "Welcome back" : "Create your account"}
                                </h1>
                                <p className="text-sm text-slate-400 mb-6">
                                    {mode === "login" ? "Sign in to your incident workspace." : "Start building your incident intelligence."}
                                </p>
                                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy}
                                    onKeyDown={(e) => e.key === "Enter" && submit()} className={`${inputCls} mb-4`} />
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Password</label>
                                    {mode === "login" && (
                                        <button onClick={() => switchMode("forgot")} className="font-mono text-[10px] text-purple-400 hover:text-purple-600">Forgot?</button>
                                    )}
                                </div>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy}
                                    onKeyDown={(e) => e.key === "Enter" && submit()} className={`${inputCls} mb-5`} />
                                {err && <ErrBox msg={err} />}
                                <SubmitBtn busy={busy} onClick={submit} label={mode === "login" ? "Sign in" : "Create account"} />
                                <div className="mt-5 text-center font-mono text-[12px] text-slate-400">
                                    {mode === "login" ? (
                                        <>No account? <button onClick={() => switchMode("signup")} className="text-purple-500 hover:text-purple-600">Sign up</button></>
                                    ) : (
                                        <>Have an account? <button onClick={() => switchMode("login")} className="text-purple-500 hover:text-purple-600">Sign in</button></>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

function ErrBox({ msg }) {
    return (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            className="rounded-xl bg-rose-50/80 border border-rose-200 text-rose-500 font-mono text-[12px] px-3 py-2 mb-4">{msg}</motion.div>
    );
}
function SubmitBtn({ busy, onClick, label }) {
    return (
        <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={spring} onClick={onClick} disabled={busy}
            className="w-full font-mono text-[13px] bg-gradient-to-r from-rose-400 to-purple-400 text-white py-2.5 rounded-xl shadow-lg shadow-fuchsia-300/40 hover:from-rose-500 hover:to-purple-500 transition-colors disabled:opacity-50">
            {busy ? "…" : label}
        </motion.button>
    );
}