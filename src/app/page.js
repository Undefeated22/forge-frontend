"use client";

import { useEffect, useState } from "react";
import { listIncidents, createIncident, getGraph, logout } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NewIncidentModal from "./NewIncidentModal";
import AuthGuard from "./AuthGuard";

export default function Home() {
    return <AuthGuard><Dashboard /></AuthGuard>;
}

const spring = { type: "spring", stiffness: 300, damping: 24 };
const softSpring = { type: "spring", stiffness: 200, damping: 22 };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
// transform + opacity ONLY — GPU-cheap, no blur
const item = { hidden: { opacity: 0, y: 28, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } };

function Dashboard() {
    const [incidents, setIncidents] = useState([]);
    const [graph, setGraph] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        Promise.all([listIncidents(), getGraph()])
            .then(([incData, graphData]) => { setIncidents(incData.incidents ?? []); setGraph(graphData); setLoading(false); })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, []);

    function refreshIncidents() { listIncidents().then((data) => setIncidents(data.incidents ?? [])).catch(() => {}); }
    async function handleLogout() { await logout().catch(() => {}); router.push("/login"); }

    const analysis = analyzeGraph(graph);
    const analyzed = incidents.filter(i => i.severity === "SEV-1" || i.severity === "SEV-2");
    const sev1Count = analyzed.filter(i => i.severity === "SEV-1").length;
    const sev1Pct = analyzed.length ? Math.round((sev1Count / analyzed.length) * 100) : 0;
    const sev2Pct = analyzed.length ? 100 - sev1Pct : 0;
    const trend = buildVolume(incidents);

    return (
        <div className="min-h-screen bg-[#f4f1f6] text-[#2a2730] flex relative selection:bg-rose-200/60 overflow-x-hidden">

            {/* STATIC light field — looks glowy, costs nothing per frame */}
            <div className="pointer-events-none fixed -top-40 left-1/4 h-[700px] w-[700px] rounded-full bg-rose-300/30 blur-[180px]" />
            <div className="pointer-events-none fixed top-1/3 -right-32 h-[600px] w-[600px] rounded-full bg-fuchsia-300/25 blur-[170px]" />
            <div className="pointer-events-none fixed bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-purple-300/25 blur-[160px]" />

            {/* SIDEBAR — blur only here (a major surface) */}
            <motion.aside
                initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={softSpring}
                className="w-60 shrink-0 bg-white/50 backdrop-blur-xl border-r border-white/50 flex flex-col relative z-10 shadow-[1px_0_40px_-10px_rgba(180,100,200,0.15)]">
                <div className="px-5 py-5 flex items-center gap-2.5">
                    <motion.div whileHover={{ scale: 1.12, rotate: 8 }} whileTap={{ scale: 0.95 }} transition={spring}
                        className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-fuchsia-300/40">F</motion.div>
                    <span className="text-base font-semibold tracking-tight text-slate-700">Forge</span>
                    <span className="font-mono text-[9px] text-slate-400 ml-auto">v0.1</span>
                </div>
                <motion.nav variants={container} initial="hidden" animate="show" className="flex-1 px-3 py-4 space-y-1.5">
                    <NavItem icon="◆" label="Overview" active />
<NavItem icon="▤" label="Incidents" badge={incidents.length} onClick={() => router.push("/incidents")} />
<NavItem icon="◈" label="Topology" onClick={() => router.push("/topology")} />
<NavItem icon="▰" label="Runbooks" onClick={() => router.push("/runbooks")} />
<NavItem icon="◷" label="History" soon />
                </motion.nav>
                <div className="px-4 py-4">
                    <div className="rounded-2xl bg-white/70 border border-white/60 p-3 shadow-lg shadow-purple-200/20">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="font-mono text-[10px] text-emerald-600/90 uppercase tracking-wider">live</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mb-2.5">{analysis.componentCount} components</div>
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={spring} onClick={handleLogout}
                            className="w-full font-mono text-[11px] text-slate-500 hover:text-rose-500 bg-white/70 border border-white/70 rounded-xl py-1.5 transition-colors">
                            sign out
                        </motion.button>
                    </div>
                </div>
            </motion.aside>

            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                <motion.header
                    initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={softSpring}
                    className="h-16 shrink-0 bg-white/40 backdrop-blur-xl border-b border-white/40 flex items-center justify-between px-8">
                    <span className="font-mono text-[11px] text-slate-500 uppercase tracking-[0.2em]">Overview</span>
                    <div className="flex items-center gap-4">
                        <div className="font-mono text-[11px] text-slate-400">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <motion.button whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.95 }} transition={spring}
                            onClick={() => setModalOpen(true)}
                            className="font-mono text-[12px] bg-gradient-to-r from-rose-400 to-purple-400 text-white px-5 py-2 rounded-xl shadow-lg shadow-fuchsia-300/40 font-medium">
                            + new incident
                        </motion.button>
                    </div>
                </motion.header>

                <main className="flex-1 overflow-y-auto px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
                        <h1 className="text-4xl font-semibold tracking-tight text-slate-800 mb-1">Incident Intelligence</h1>
                        <p className="text-sm text-slate-400 mb-8">Every failure analyzed, remembered, and predicted.</p>
                    </motion.div>

                    <motion.div variants={container} initial="hidden" animate="show">
                        {/* HERO — blur here (major surface) */}
                        <motion.div variants={item} whileHover={{ scale: 1.008, y: -2 }} transition={spring}
                            className="relative rounded-[28px] overflow-hidden mb-6 p-8 bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_20px_60px_-20px_rgba(200,100,180,0.3)]">
                            <div className="relative grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">primary failure source</div>
                                    <div className="text-5xl font-semibold text-slate-800 mt-3 tracking-tight">{analysis.rootName}</div>
                                    <div className="font-mono text-[12px] text-slate-500 mt-2">{analysis.downstreamCount} downstream services affected</div>
                                    <div className="mt-6 flex items-end gap-3">
                                        <motion.span initial={{ scale: 0.4, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ ...spring, delay: 0.25 }}
                                            className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-purple-500 tabular-nums inline-block">{analysis.topCount}×</motion.span>
                                        <span className="font-mono text-[11px] text-slate-400 mb-3">peak recurring cascade · {analysis.cascadeLabel}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <GlassStat value={incidents.length} label="incidents" i={0} />
                                    <GlassStat value={analysis.componentCount} label="components" i={1} />
                                    <GlassStat value={graph?.edgeCount ?? "—"} label="failure edges" i={2} />
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                            <GlassPanel variants={item} title="dominant cascade">
                                <div className="space-y-2.5 mt-2">
                                    {analysis.cascade.length === 0 && <div className="font-mono text-[11px] text-slate-300">no cascade data</div>}
                                    {analysis.cascade.map((step, i) => (
                                        <ChainStep key={i} n={String(i + 1).padStart(2, "0")} name={step.name} note={i === 0 ? "root" : `×${step.count}`} strong={i === 0} delay={0.2 + i * 0.08} />
                                    ))}
                                </div>
                            </GlassPanel>
                            <GlassPanel variants={item} title="severity split">
                                <div className="space-y-3 mt-3">
                                    <SeverityBar label="SEV-1" pct={sev1Pct} tone="rose" delay={0.3} />
                                    <SeverityBar label="SEV-2" pct={sev2Pct} tone="purple" delay={0.38} />
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/50 font-mono text-[11px] text-slate-400">{analyzed.length} analyzed incidents</div>
                            </GlassPanel>
                            <GlassPanel variants={item} title="30-day volume">
                                <div className="flex items-end gap-[3px] h-24 mt-2">
                                    {(() => {
                                        const max = Math.max(...trend, 1);
                                        return trend.map((h, i) => (
                                            <motion.div key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...spring, delay: 0.35 + i * 0.012 }}
                                                className="flex-1 rounded-t-md origin-bottom"
                                                style={{ height: `${Math.max((h / max) * 100, h > 0 ? 8 : 2)}%`, background: h >= max * 0.7 ? "linear-gradient(to top, #f43f5e, #c084fc)" : "linear-gradient(to top, #fecdd3, #f3e8ff)" }} />
                                        ));
                                    })()}
                                </div>
                            </GlassPanel>
                        </div>

                        <motion.div variants={item} className="flex items-center justify-between mb-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">incident ledger</span>
                            <span className="font-mono text-[10px] text-slate-300">{incidents.length} records</span>
                        </motion.div>

                        {loading && <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/40 rounded-2xl animate-pulse" />)}</div>}
                        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-500 font-mono">backend unreachable — {error}</div>}

                        {!loading && !error && (
                            <motion.div variants={item} className="rounded-3xl overflow-hidden bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_-25px_rgba(200,100,180,0.3)] divide-y divide-white/40">
                                {incidents.slice(0, 14).map((incident, idx) => {
                                    let conf = incident.confidence;
                                    if (conf != null && conf <= 1) conf = Math.round(conf * 100);
                                    const sev = incident.severity;
                                    const isSev1 = sev === "SEV-1"; const isSev2 = sev === "SEV-2";
                                    const hasReport = incident.reportStatus === "completed" && (isSev1 || isSev2);
                                    const failed = incident.reportStatus === "failed";
                                    const noReport = incident.reportStatus === "no-report";
                                    return (
                                        <motion.div key={incident.id}
                                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.45 + idx * 0.025 }}
                                            whileHover={{ x: 6, backgroundColor: "rgba(255,255,255,0.55)" }}
                                            onClick={() => router.push(`/incidents/${incident.id}`)}
                                            className="group grid grid-cols-12 items-center gap-4 py-3.5 px-5 cursor-pointer">
                                            <span className="col-span-1">
                                                {hasReport ? (
                                                    <span className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded-lg ring-1 ${isSev1 ? "bg-rose-100/70 text-rose-500 ring-rose-200" : "bg-purple-100/70 text-purple-500 ring-purple-200"}`}>{sev}</span>
                                                ) : failed ? (
                                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg ring-1 bg-slate-100/70 text-slate-400 ring-slate-200">failed</span>
                                                ) : noReport ? (
                                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg ring-1 bg-slate-100/70 text-slate-300 ring-slate-200">—</span>
                                                ) : (
                                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg ring-1 bg-amber-100/70 text-amber-500 ring-amber-200">{incident.reportStatus}</span>
                                                )}
                                            </span>
                                            <span className="col-span-5 text-sm font-medium truncate text-slate-700">{incident.title}</span>
                                            <span className="col-span-3 font-mono text-[11px] text-slate-400 truncate">{incident.primaryComponent && !incident.primaryComponent.startsWith("N/A") ? incident.primaryComponent : "—"}</span>
                                            <span className="col-span-2 font-mono text-[11px] text-slate-300">{conf != null && conf > 0 ? `${conf}% conf` : new Date(incident.createdAt).toLocaleDateString()}</span>
                                            <motion.span className="col-span-1 text-right font-mono text-slate-300 group-hover:text-purple-400 transition-colors">→</motion.span>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </motion.div>
                </main>
            </div>

            <AnimatePresence>
                {modalOpen && <NewIncidentModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={refreshIncidents} router={router} />}
            </AnimatePresence>
        </div>
    );
}

function analyzeGraph(graph) {
    const fallback = { rootName: "—", topCount: 0, downstreamCount: 0, cascade: [], cascadeLabel: "—", componentCount: 0 };
    if (!graph?.nodes?.length) return fallback;
    const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
    const outWeight = {}; const outEdges = {};
    for (const e of graph.edges ?? []) { outWeight[e.fromNodeId] = (outWeight[e.fromNodeId] ?? 0) + e.occurrenceCount; (outEdges[e.fromNodeId] ??= []).push(e); }
    const rootId = Object.keys(outWeight).sort((a, b) => outWeight[b] - outWeight[a])[0];
    if (!rootId) return { ...fallback, componentCount: graph.nodes.length };
    const root = nodeById[rootId];
    const edges = (outEdges[rootId] ?? []).sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    const topEdge = edges[0]; const topTarget = topEdge ? nodeById[topEdge.toNodeId] : null;
    const cascade = [{ name: root.componentName, count: 0 }, ...edges.slice(0, 3).map(e => ({ name: nodeById[e.toNodeId]?.componentName ?? "unknown", count: e.occurrenceCount }))];
    return { rootName: root.componentName, topCount: topEdge?.occurrenceCount ?? 0, downstreamCount: edges.length, cascade, cascadeLabel: topTarget ? `${root.componentName} → ${topTarget.componentName}` : root.componentName, componentCount: graph.nodes.length };
}

function GlassStat({ value, label, i }) {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.2 + i * 0.08 }}
            whileHover={{ scale: 1.05, y: -3 }}
            className="flex-1 rounded-2xl bg-white/70 border border-white/70 px-5 py-3 shadow-lg shadow-purple-200/20 flex flex-col justify-center">
            <div className="text-2xl font-semibold text-slate-800 tabular-nums">{value}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
        </motion.div>
    );
}
function NavItem({ icon, label, active, badge, onClick, soon }) {
    return (
        <motion.a
            variants={item}
            whileHover={soon ? {} : { x: 5, scale: 1.02 }}
            whileTap={soon ? {} : { scale: 0.97 }}
            transition={spring}
            onClick={soon ? undefined : onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl font-mono text-[13px] ${soon ? "text-slate-300 cursor-default" : "cursor-pointer"} ${active ? "bg-white/70 text-purple-600 font-medium shadow-md shadow-purple-200/30" : !soon ? "text-slate-400 hover:bg-white/50 hover:text-slate-600" : ""}`}>
            <span className="text-[11px] w-4">{icon}</span><span>{label}</span>
            {soon && <span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-slate-300 bg-white/60 px-1.5 py-0.5 rounded-full">soon</span>}
            {badge != null && <span className="ml-auto font-mono text-[10px] text-purple-400 bg-white/70 px-1.5 py-0.5 rounded-full">{badge}</span>}
        </motion.a>
    );

}
function GlassPanel({ title, children, variants }) {
    return (
        <motion.div variants={variants} whileHover={{ y: -4, scale: 1.01 }} transition={spring}
            className="rounded-3xl bg-white/55 border border-white/60 p-5 shadow-[0_15px_40px_-20px_rgba(200,100,180,0.3)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3">{title}</div>
            {children}
        </motion.div>
    );
}
function ChainStep({ n, name, note, strong, delay }) {
    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay }} className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-300">{n}</span>
            <span className={`font-mono text-[13px] truncate ${strong ? "text-rose-500 font-medium" : "text-slate-500"}`}>{name}</span>
            <span className="font-mono text-[10px] text-slate-400 ml-auto shrink-0">{note}</span>
        </motion.div>
    );
}
function SeverityBar({ label, pct, tone, delay }) {
    const bar = tone === "rose" ? "bg-rose-400" : "bg-purple-400";
    const text = tone === "rose" ? "text-rose-500" : "text-purple-500";
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className={`font-mono text-[11px] ${text}`}>{label}</span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/60 overflow-hidden">
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ ...spring, delay }} className={`h-full rounded-full origin-left ${bar}`} style={{ width: "100%" }} />
            </div>
        </div>
    );
}
function buildVolume(incidents) {
    const days = 30; const buckets = new Array(days).fill(0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (const inc of incidents) {
        const d = new Date(inc.createdAt); d.setHours(0, 0, 0, 0);
        const daysAgo = Math.floor((now - d) / 86400000);
        if (daysAgo >= 0 && daysAgo < days) buckets[days - 1 - daysAgo] += 1;
    }
    return buckets;
}