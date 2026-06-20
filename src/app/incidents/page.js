"use client";

import { useEffect, useState, useMemo } from "react";
import { listIncidents } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "../AuthGuard";

export default function IncidentsPage() {
    return <AuthGuard><Incidents /></AuthGuard>;
}

const spring = { type: "spring", stiffness: 300, damping: 24 };

function Incidents() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [sevFilter, setSevFilter] = useState("all"); // all | SEV-1 | SEV-2 | unanalyzed
    const router = useRouter();

    useEffect(() => {
        listIncidents()
            .then((data) => { setIncidents(data.incidents ?? []); setLoading(false); })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, []);

    const filtered = useMemo(() => {
        return incidents.filter((inc) => {
            const matchesSearch = !search ||
                inc.title?.toLowerCase().includes(search.toLowerCase()) ||
                inc.primaryComponent?.toLowerCase().includes(search.toLowerCase());
            const isAnalyzed = inc.severity === "SEV-1" || inc.severity === "SEV-2";
            const matchesSev =
                sevFilter === "all" ? true :
                sevFilter === "unanalyzed" ? !isAnalyzed :
                inc.severity === sevFilter;
            return matchesSearch && matchesSev;
        });
    }, [incidents, search, sevFilter]);

    const counts = useMemo(() => ({
        all: incidents.length,
        sev1: incidents.filter(i => i.severity === "SEV-1").length,
        sev2: incidents.filter(i => i.severity === "SEV-2").length,
        unanalyzed: incidents.filter(i => i.severity !== "SEV-1" && i.severity !== "SEV-2").length,
    }), [incidents]);

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
                    <SideLink icon="▤" label="Incidents" active badge={incidents.length} />
                    <SideLink icon="◈" label="Topology" onClick={() => router.push("/topology")} />
                    <SideLink icon="▰" label="Runbooks" soon />
                    <SideLink icon="◷" label="History" soon />
                </nav>
            </motion.aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                <motion.header
                    initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}
                    className="h-16 shrink-0 bg-white/40 backdrop-blur-xl border-b border-white/40 flex items-center justify-between px-8">
                    <span className="font-mono text-[11px] text-slate-500 uppercase tracking-[0.2em]">Incidents</span>
                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="search incidents…"
                        className="font-mono text-[12px] bg-white/60 border border-white/70 rounded-xl px-4 py-1.5 w-64 focus:outline-none focus:border-purple-300 text-slate-600 placeholder:text-slate-300" />
                </motion.header>

                <main className="flex-1 overflow-y-auto px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                        <h1 className="text-4xl font-semibold tracking-tight text-slate-800 mb-1">All Incidents</h1>
                        <p className="text-sm text-slate-400 mb-6">{filtered.length} of {incidents.length} shown</p>
                    </motion.div>

                    {/* FILTER PILLS */}
                    <div className="flex gap-2 mb-6">
                        <FilterPill label="All" count={counts.all} active={sevFilter === "all"} onClick={() => setSevFilter("all")} />
                        <FilterPill label="SEV-1" count={counts.sev1} active={sevFilter === "SEV-1"} onClick={() => setSevFilter("SEV-1")} tone="rose" />
                        <FilterPill label="SEV-2" count={counts.sev2} active={sevFilter === "SEV-2"} onClick={() => setSevFilter("SEV-2")} tone="purple" />
                        <FilterPill label="Unanalyzed" count={counts.unanalyzed} active={sevFilter === "unanalyzed"} onClick={() => setSevFilter("unanalyzed")} />
                    </div>

                    {loading && <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/40 rounded-2xl animate-pulse" />)}</div>}
                    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-500 font-mono">backend unreachable — {error}</div>}

                    {!loading && !error && (
                        <motion.div layout className="rounded-3xl overflow-hidden bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_-25px_rgba(200,100,180,0.3)] divide-y divide-white/40">
                            <AnimatePresence mode="popLayout">
                                {filtered.length === 0 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center font-mono text-[12px] text-slate-300">
                                        no incidents match
                                    </motion.div>
                                )}
                                {filtered.map((incident, idx) => {
                                    let conf = incident.confidence;
                                    if (conf != null && conf <= 1) conf = Math.round(conf * 100);
                                    const sev = incident.severity;
                                    const isSev1 = sev === "SEV-1"; const isSev2 = sev === "SEV-2";
                                    const hasReport = incident.reportStatus === "completed" && (isSev1 || isSev2);
                                    const failed = incident.reportStatus === "failed";
                                    return (
                                        <motion.div key={incident.id}
                                            layout
                                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                                            transition={{ ...spring, delay: Math.min(idx * 0.02, 0.3) }}
                                            whileHover={{ x: 6, backgroundColor: "rgba(255,255,255,0.55)" }}
                                            onClick={() => router.push(`/incidents/${incident.id}`)}
                                            className="group grid grid-cols-12 items-center gap-4 py-4 px-5 cursor-pointer">
                                            <span className="col-span-1">
                                                {hasReport ? (
                                                    <span className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg ring-1 ${isSev1 ? "bg-rose-100/70 text-rose-500 ring-rose-200" : "bg-purple-100/70 text-purple-500 ring-purple-200"}`}>{sev}</span>
                                                ) : failed ? (
                                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg ring-1 bg-slate-100/70 text-slate-400 ring-slate-200">failed</span>
                                                ) : (
                                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg ring-1 bg-slate-100/70 text-slate-300 ring-slate-200">—</span>
                                                )}
                                            </span>
                                            <span className="col-span-5 text-sm font-medium truncate text-slate-700">{incident.title}</span>
                                            <span className="col-span-3 font-mono text-[11px] text-slate-400 truncate">{incident.primaryComponent && !incident.primaryComponent.startsWith("N/A") ? incident.primaryComponent : "—"}</span>
                                            <span className="col-span-2 font-mono text-[11px] text-slate-300">{conf != null && conf > 0 ? `${conf}% conf` : new Date(incident.createdAt).toLocaleDateString()}</span>
                                            <span className="col-span-1 text-right font-mono text-slate-300 group-hover:text-purple-400 transition-colors">→</span>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
}

function FilterPill({ label, count, active, onClick, tone }) {
    const activeColor = tone === "rose" ? "bg-rose-400 text-white shadow-rose-300/40"
        : tone === "purple" ? "bg-purple-400 text-white shadow-purple-300/40"
        : "bg-slate-700 text-white shadow-slate-300/40";
    return (
        <motion.button whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} transition={spring} onClick={onClick}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded-xl border transition-colors ${active ? `${activeColor} border-transparent shadow-lg` : "bg-white/60 border-white/70 text-slate-500 hover:bg-white/80"}`}>
            {label} <span className="opacity-60">{count}</span>
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