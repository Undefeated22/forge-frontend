"use client";

import { useEffect, useState, useMemo } from "react";
import { getRunbooks } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "../AuthGuard";

export default function RunbooksPage() {
    return <AuthGuard><Runbooks /></AuthGuard>;
}

const spring = { type: "spring", stiffness: 300, damping: 24 };

function Runbooks() {
    const [steps, setSteps] = useState([]);
    const [meta, setMeta] = useState({ incidentCount: 0, stepCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState("all"); // all | proven
    const [search, setSearch] = useState("");
    const [component, setComponent] = useState("all");
    const router = useRouter();

    useEffect(() => {
        getRunbooks()
            .then((data) => {
                setSteps(data.steps ?? []);
                setMeta({ incidentCount: data.incidentCount ?? 0, stepCount: data.stepCount ?? 0 });
                setLoading(false);
            })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, []);

    // unique components for the filter
    const components = useMemo(() => {
        const set = new Set();
        for (const s of steps) if (s.primaryComponent) set.add(s.primaryComponent);
        return ["all", ...Array.from(set).sort()];
    }, [steps]);

    const filtered = useMemo(() => {
        let list = steps.filter((s) => {
            const matchesSearch = !search ||
                s.action?.toLowerCase().includes(search.toLowerCase()) ||
                s.cliCommand?.toLowerCase().includes(search.toLowerCase()) ||
                s.incidentTitle?.toLowerCase().includes(search.toLowerCase());
            const matchesComp = component === "all" || s.primaryComponent === component;
            return matchesSearch && matchesComp;
        });
        if (tab === "proven") {
            // proven plays: highest composite score first, only real scored steps
            list = list.filter(s => s.compositeScore != null).sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0)).slice(0, 20);
        }
        return list;
    }, [steps, search, component, tab]);

    return (
        <div className="min-h-screen bg-[#f4f1f6] text-[#2a2730] flex relative selection:bg-rose-200/60 overflow-x-hidden">
            <div className="pointer-events-none fixed -top-40 left-1/4 h-[700px] w-[700px] rounded-full bg-rose-300/30 blur-[180px]" />
            <div className="pointer-events-none fixed bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-300/25 blur-[170px]" />

            {/* SIDEBAR */}
            <motion.aside
                initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}
                className="w-60 shrink-0 bg-white/50 backdrop-blur-xl border-r border-white/50 flex flex-col relative z-10">
                <div className="px-5 py-5 flex items-center gap-2.5">
                    <motion.div whileHover={{ scale: 1.12, rotate: 8 }} transition={spring}
                        className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-fuchsia-300/40">F</motion.div>
                    <span className="text-base font-semibold tracking-tight text-slate-700">Forge</span>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1.5">
                    <SideLink icon="◆" label="Overview" onClick={() => router.push("/")} />
                    <SideLink icon="▤" label="Incidents" onClick={() => router.push("/incidents")} />
                    <SideLink icon="◈" label="Topology" onClick={() => router.push("/topology")} />
                    <SideLink icon="▰" label="Runbooks" active />
                    <SideLink icon="◷" label="History" onClick={() => router.push("/history")} />
                </nav>
            </motion.aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                <motion.header
                    initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}
                    className="h-16 shrink-0 bg-white/40 backdrop-blur-xl border-b border-white/40 flex items-center justify-between px-8">
                    <span className="font-mono text-[11px] text-slate-500 uppercase tracking-[0.2em]">Runbooks</span>
                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="search steps, commands…"
                        className="font-mono text-[12px] bg-white/60 border border-white/70 rounded-xl px-4 py-1.5 w-64 focus:outline-none focus:border-purple-300 text-slate-600 placeholder:text-slate-300" />
                </motion.header>

                <main className="flex-1 overflow-y-auto px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                        <h1 className="text-4xl font-semibold tracking-tight text-slate-800 mb-1">Runbook Library</h1>
                        <p className="text-sm text-slate-400 mb-6">{meta.stepCount} mitigation steps across {meta.incidentCount} analyzed incidents</p>
                    </motion.div>

                    {/* TABS */}
                    <div className="flex gap-2 mb-5">
                        <Tab label="All Steps" active={tab === "all"} onClick={() => setTab("all")} />
                        <Tab label="★ Proven Plays" active={tab === "proven"} onClick={() => setTab("proven")} tone="gold" />
                    </div>

                    {/* COMPONENT FILTER (only on All Steps) */}
                    {tab === "all" && components.length > 1 && (
                        <div className="flex gap-2 mb-6 flex-wrap">
                            {components.map((c) => (
                                <FilterPill key={c} label={c === "all" ? "All components" : c} active={component === c} onClick={() => setComponent(c)} />
                            ))}
                        </div>
                    )}

                    {tab === "proven" && (
                        <p className="font-mono text-[11px] text-slate-400 mb-5">Top 20 highest-scored mitigation steps Forge has generated — your proven plays.</p>
                    )}

                    {loading && <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/40 rounded-2xl animate-pulse" />)}</div>}
                    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-500 font-mono">backend unreachable — {error}</div>}

                    {!loading && !error && filtered.length === 0 && (
                        <div className="rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 p-12 text-center">
                            <div className="font-mono text-[13px] text-slate-400 mb-1">no runbook steps yet</div>
                            <div className="font-mono text-[11px] text-slate-300">analyze some incidents to build your library</div>
                        </div>
                    )}

                    {!loading && !error && filtered.length > 0 && (
                        <motion.div layout className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {filtered.map((step, idx) => (
                                    <motion.div key={`${step.incidentId}-${idx}`}
                                        layout
                                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                                        transition={{ ...spring, delay: Math.min(idx * 0.02, 0.3) }}
                                        whileHover={{ y: -3, scale: 1.005 }}
                                        onClick={() => router.push(`/incidents/${step.incidentId}`)}
                                        className="rounded-2xl bg-white/55 backdrop-blur-xl border border-white/60 p-5 shadow-[0_15px_40px_-22px_rgba(200,100,180,0.3)] cursor-pointer">
                                        <div className="flex items-start gap-3">
                                            {step.compositeScore != null && (
                                                <div className="shrink-0 flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-rose-100 to-purple-100 border border-white/70">
                                                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-br from-rose-500 to-purple-500 tabular-nums leading-none">{step.compositeScore}</span>
                                                    <span className="font-mono text-[7px] uppercase tracking-wider text-slate-400 mt-0.5">score</span>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    {step.stepType && <Badge tone={typeTone(step.stepType)}>{step.stepType}</Badge>}
                                                    {step.reversibility && <Badge tone={step.reversibility === "easy" ? "emerald" : step.reversibility === "hard" ? "amber" : "rose"}>{step.reversibility} to reverse</Badge>}
                                                    {step.blastRadius != null && <Badge tone="slate">blast {step.blastRadius}/10</Badge>}
                                                    {step.recoveryTimeMinutes != null && <Badge tone="slate">~{step.recoveryTimeMinutes}m</Badge>}
                                                </div>
                                                <div className="text-sm font-medium text-slate-700 mb-1.5">{step.action ?? "—"}</div>
                                                {step.cliCommand && (
                                                    <code className="block font-mono text-[11px] text-purple-600 bg-white/60 border border-white/70 rounded-lg px-3 py-1.5 mb-2 truncate">{step.cliCommand}</code>
                                                )}
                                                <div className="font-mono text-[10px] text-slate-400 truncate">
                                                    from: {step.incidentTitle}{step.primaryComponent ? ` · ${step.primaryComponent}` : ""}
                                                </div>
                                            </div>
                                            <span className="shrink-0 font-mono text-slate-300 self-center">→</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
}

function typeTone(t) {
    return t === "diagnostic" ? "sky" : t === "containment" ? "amber" : t === "rollback" ? "rose" : "purple";
}

function Badge({ children, tone }) {
    const tones = {
        sky: "bg-sky-100/70 text-sky-600 ring-sky-200",
        amber: "bg-amber-100/70 text-amber-600 ring-amber-200",
        rose: "bg-rose-100/70 text-rose-500 ring-rose-200",
        purple: "bg-purple-100/70 text-purple-500 ring-purple-200",
        emerald: "bg-emerald-100/70 text-emerald-600 ring-emerald-200",
        slate: "bg-slate-100/70 text-slate-500 ring-slate-200",
    };
    return <span className={`font-mono text-[9px] px-2 py-0.5 rounded-md ring-1 ${tones[tone] ?? tones.slate}`}>{children}</span>;
}

function Tab({ label, active, onClick, tone }) {
    const activeBg = tone === "gold" ? "bg-gradient-to-r from-amber-300 to-rose-300 text-white" : "bg-slate-700 text-white";
    return (
        <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }} transition={spring} onClick={onClick}
            className={`font-mono text-[12px] px-4 py-2 rounded-xl border transition-colors ${active ? `${activeBg} border-transparent shadow-lg` : "bg-white/60 border-white/70 text-slate-500 hover:bg-white/80"}`}>
            {label}
        </motion.button>
    );
}

function FilterPill({ label, active, onClick }) {
    return (
        <motion.button whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} transition={spring} onClick={onClick}
            className={`font-mono text-[11px] px-3 py-1.5 rounded-xl border transition-colors ${active ? "bg-purple-400 text-white border-transparent shadow-lg shadow-purple-300/40" : "bg-white/60 border-white/70 text-slate-500 hover:bg-white/80"}`}>
            {label}
        </motion.button>
    );
}

function SideLink({ icon, label, active, badge, onClick, soon }) {
    return (
        <motion.a whileHover={soon ? {} : { x: 5, scale: 1.02 }} whileTap={soon ? {} : { scale: 0.97 }} transition={spring}
            onClick={soon ? undefined : onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl font-mono text-[13px] ${soon ? "text-slate-300 cursor-default" : "cursor-pointer"} ${active ? "bg-white/70 text-purple-600 font-medium shadow-md shadow-purple-200/30" : !soon ? "text-slate-400 hover:bg-white/50 hover:text-slate-600" : ""}`}>
            <span className="text-[11px] w-4">{icon}</span><span>{label}</span>
            {soon && <span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-slate-300 bg-white/60 px-1.5 py-0.5 rounded-full">soon</span>}
            {badge != null && <span className="ml-auto font-mono text-[10px] text-purple-400 bg-white/70 px-1.5 py-0.5 rounded-full">{badge}</span>}
        </motion.a>
    );
}