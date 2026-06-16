"use client";

import { useEffect, useState } from "react";
import { listIncidents, createIncident, getGraph, logout } from "@/lib/api";
import { useRouter } from "next/navigation";
import NewIncidentModal from "./NewIncidentModal";
import AuthGuard from "./AuthGuard";

export default function Home() {
    return (
        <AuthGuard>
            <Dashboard />
        </AuthGuard>
    );
}

function Dashboard() {
    const [incidents, setIncidents] = useState([]);
    const [graph, setGraph] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        Promise.all([listIncidents(), getGraph()])
            .then(([incData, graphData]) => {
                setIncidents(incData.incidents ?? []);
                setGraph(graphData);
                setLoading(false);
            })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, []);

    function refreshIncidents() {
        listIncidents().then((data) => setIncidents(data.incidents ?? [])).catch(() => {});
    }

    async function handleLogout() {
        await logout().catch(() => {});
        router.push("/login");
    }

    // ---- derive REAL insights from the graph ----
    const analysis = analyzeGraph(graph);

    // real severity split from analyzed incidents
    const analyzed = incidents.filter(i => i.severity === "SEV-1" || i.severity === "SEV-2");
    const sev1Count = analyzed.filter(i => i.severity === "SEV-1").length;
    const sev1Pct = analyzed.length ? Math.round((sev1Count / analyzed.length) * 100) : 0;
    const sev2Pct = analyzed.length ? 100 - sev1Pct : 0;

    // real 30-day volume: count incidents per day for the last 30 days
    const trend = buildVolume(incidents);

    return (
        <div className="min-h-screen bg-[#fdfcfd] text-[#3a3a44] flex relative selection:bg-rose-100 selection:text-rose-700 overflow-x-hidden">

            <div className="pointer-events-none fixed top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-rose-100/40 blur-[160px]" />
            <div className="pointer-events-none fixed bottom-12 right-12 h-[500px] w-[500px] rounded-full bg-fuchsia-100/35 blur-[140px]" />
            <div className="pointer-events-none fixed top-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-50/50 blur-[130px]" />

            {/* SIDEBAR */}
            <aside className="w-60 shrink-0 bg-[#fbf9fb] border-r border-[#f3eef3] flex flex-col relative z-10">
                <div className="px-5 py-5 border-b border-[#f3eef3] flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-md bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold text-sm shadow-sm">F</div>
                    <span className="text-base font-medium tracking-tight text-slate-700">Forge</span>
                    <span className="font-mono text-[9px] text-slate-300 ml-auto">v0.1</span>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                    <NavItem icon="◆" label="Overview" active />
                    <NavItem icon="▤" label="Incidents" badge={incidents.length} />
                    <NavItem icon="◈" label="Topology" onClick={() => router.push("/topology")} />
                    <NavItem icon="▰" label="Runbooks" />
                    <NavItem icon="◷" label="History" />
                    <div className="pt-4 mt-4 border-t border-[#f3eef3]">
                        <NavItem icon="⚙" label="Settings" />
                    </div>
                </nav>
                <div className="px-5 py-4 border-t border-[#f3eef3]">
                    <div className="flex items-center gap-2.5 mb-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                        <span className="font-mono text-[10px] text-rose-500/80 uppercase tracking-wider">all systems live</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-300 mb-3">{analysis.componentCount} components monitored</div>
                    <button onClick={handleLogout}
                        className="w-full font-mono text-[11px] text-slate-400 hover:text-rose-500 border border-[#f3eef3] hover:border-rose-200 rounded-md py-1.5 transition">
                        sign out
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                <header className="h-16 shrink-0 border-b border-[#f3eef3] bg-white/80 backdrop-blur-md flex items-center justify-between px-8">
                    <span className="font-mono text-[11px] text-slate-400 uppercase tracking-[0.15em]">Overview</span>
                    <div className="flex items-center gap-4">
                        <div className="font-mono text-[11px] text-slate-400">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <button onClick={() => setModalOpen(true)}
                            className="font-mono text-[12px] bg-gradient-to-r from-rose-400 to-purple-400 text-white px-4 py-2 rounded-md hover:from-rose-500 hover:to-purple-500 transition-all shadow-sm font-medium">
                            + new incident
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-8 py-8">
                    <h1 className="text-3xl font-light tracking-tight mb-1 text-slate-800">Incident Intelligence</h1>
                    <p className="text-sm text-slate-400 mb-8">Every failure analyzed, remembered, and predicted.</p>

                    {/* HERO — real data */}
                    <div className="relative rounded-3xl overflow-hidden mb-8 p-8 border border-rose-100/70 shadow-sm">
                        <div className="absolute inset-0 -z-10 bg-white">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white via-rose-50/50 to-fuchsia-100/40" />
                            <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-rose-100/40 blur-3xl animate-pulse" />
                            <div className="absolute bottom-0 right-10 h-80 w-80 rounded-full bg-purple-100/30 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
                        </div>
                        <div className="relative grid grid-cols-3 gap-4">
                            <div className="col-span-2 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/80 p-6 shadow-[0_8px_32px_0_rgba(244,63,94,0.03)]">
                                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">primary failure source</div>
                                <div className="text-4xl font-light text-slate-800 mt-3">{analysis.rootName}</div>
                                <div className="font-mono text-[12px] text-slate-500 mt-1">{analysis.downstreamCount} downstream services affected</div>
                                <div className="mt-6 flex items-end gap-3">
                                    <span className="text-6xl font-light text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500 tabular-nums drop-shadow-sm">{analysis.topCount}×</span>
                                    <span className="font-mono text-[11px] text-slate-400 mb-2">peak recurring cascade · {analysis.cascadeLabel}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <GlassStat value={incidents.length} label="incidents" />
                                <GlassStat value={analysis.componentCount} label="components" />
                                <GlassStat value={graph?.edgeCount ?? "—"} label="failure edges" />
                            </div>
                        </div>
                    </div>

                    {/* ANALYTICS ROW — real cascade */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <Panel title="dominant cascade">
                            <div className="space-y-2.5 mt-2">
                                {analysis.cascade.length === 0 && <div className="font-mono text-[11px] text-slate-300">no cascade data</div>}
                                {analysis.cascade.map((step, i) => (
                                    <ChainStep key={i} n={String(i + 1).padStart(2, "0")} name={step.name} note={i === 0 ? "root" : `×${step.count}`} strong={i === 0} />
                                ))}
                            </div>
                        </Panel>

                        <Panel title="severity split">
                            <div className="space-y-3 mt-3">
                                <SeverityBar label="SEV-1" pct={sev1Pct} tone="rose" />
                                <SeverityBar label="SEV-2" pct={sev2Pct} tone="purple" />
                            </div>
                            <div className="mt-4 pt-4 border-t border-[#f3eef3] font-mono text-[11px] text-slate-400">
                                {analyzed.length} analyzed incidents
                            </div>
                        </Panel>

                        <Panel title="30-day volume">
                            <div className="flex items-end gap-[3px] h-24 mt-2 group/chart">
                                {(() => {
                                    const max = Math.max(...trend, 1);
                                    return trend.map((h, i) => (
                                        <div key={i} className="flex-1 rounded-t-[3px] transition-all duration-300 origin-bottom hover:!opacity-100 group-hover/chart:opacity-40 hover:scale-y-105"
                                            style={{ height: `${Math.max((h / max) * 100, h > 0 ? 8 : 2)}%`, background: h >= max * 0.7 ? "linear-gradient(to top, #f43f5e, #c084fc)" : "linear-gradient(to top, #ffe4e6, #f3e8ff)" }} />
                                    ));
                                })()}
                            </div>
                        </Panel>
                    </div>

                    {/* LEDGER */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">incident ledger</span>
                        <span className="font-mono text-[10px] text-slate-300">{incidents.length} records</span>
                    </div>

                    {loading && <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-50/80 rounded animate-pulse" />)}</div>}
                    {error && <div className="border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-500 font-mono rounded">backend unreachable — {error}</div>}

                    {!loading && !error && (
                        <div className="rounded-lg border border-[#f3eef3] overflow-hidden divide-y divide-[#f3eef3] bg-white/40 backdrop-blur-sm">
                            {incidents.slice(0, 14).map((incident) => {
                                // normalize confidence: some reports use 0-1, most use 0-100
                                let conf = incident.confidence;
                                if (conf != null && conf <= 1) conf = Math.round(conf * 100);

                                const sev = incident.severity;
                                const isSev1 = sev === "SEV-1";
                                const isSev2 = sev === "SEV-2";
                                const hasReport = incident.reportStatus === "completed" && (isSev1 || isSev2);
                                const failed = incident.reportStatus === "failed";
                                const noReport = incident.reportStatus === "no-report";

                                return (
                                    <div key={incident.id}
                                        onClick={() => router.push(`/incidents/${incident.id}`)}
                                        className="group grid grid-cols-12 items-center gap-4 py-3.5 px-4 bg-white/40 hover:bg-white hover:shadow-[0_4px_20px_-4px_rgba(244,63,94,0.08)] transition-all duration-200 cursor-pointer first:rounded-t-lg last:rounded-b-lg">

                                        <span className="col-span-1">
                                            {hasReport ? (
                                                <span className={`font-mono text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ${isSev1 ? "bg-rose-50 text-rose-500 ring-rose-100" : "bg-purple-50 text-purple-500 ring-purple-100"}`}>{sev}</span>
                                            ) : failed ? (
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded ring-1 bg-slate-50 text-slate-400 ring-slate-100">failed</span>
                                            ) : noReport ? (
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded ring-1 bg-slate-50 text-slate-300 ring-slate-100">—</span>
                                            ) : (
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded ring-1 bg-amber-50 text-amber-500 ring-amber-100">{incident.reportStatus}</span>
                                            )}
                                        </span>

                                        <span className="col-span-5 text-sm font-medium truncate text-slate-700">{incident.title}</span>

                                        <span className="col-span-3 font-mono text-[11px] text-slate-400 truncate">
                                            {incident.primaryComponent && !incident.primaryComponent.startsWith("N/A") ? incident.primaryComponent : "—"}
                                        </span>

                                        <span className="col-span-2 font-mono text-[11px] text-slate-300">
                                            {conf != null && conf > 0 ? `${conf}% conf` : new Date(incident.createdAt).toLocaleDateString()}
                                        </span>

                                        <span className="col-span-1 text-right font-mono text-slate-300 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-200">→</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                <footer className="h-12 shrink-0 border-t border-[#f3eef3] bg-[#fbf9fb] flex items-center justify-between px-8">
                    <span className="font-mono text-[10px] text-slate-300">Forge · autonomous incident intelligence</span>
                    <div className="flex items-center gap-5 font-mono text-[10px] text-slate-300">
                        <span>backend: localhost:5000</span>
                        <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-rose-400" />connected</span>
                    </div>
                </footer>
            </div>

            <NewIncidentModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={refreshIncidents}
                router={router}
            />
        </div>
    );
}

// ---- REAL graph analysis: find the node with the heaviest outgoing cascade weight ----
function analyzeGraph(graph) {
    const fallback = { rootName: "—", topCount: 0, downstreamCount: 0, cascade: [], cascadeLabel: "—", componentCount: 0 };
    if (!graph?.nodes?.length) return fallback;

    const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
    const outWeight = {};
    const outEdges = {};
    for (const e of graph.edges ?? []) {
        outWeight[e.fromNodeId] = (outWeight[e.fromNodeId] ?? 0) + e.occurrenceCount;
        (outEdges[e.fromNodeId] ??= []).push(e);
    }
    const rootId = Object.keys(outWeight).sort((a, b) => outWeight[b] - outWeight[a])[0];
    if (!rootId) return { ...fallback, componentCount: graph.nodes.length };

    const root = nodeById[rootId];
    const edges = (outEdges[rootId] ?? []).sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    const topEdge = edges[0];
    const topTarget = topEdge ? nodeById[topEdge.toNodeId] : null;

    const cascade = [
        { name: root.componentName, count: 0 },
        ...edges.slice(0, 3).map(e => ({ name: nodeById[e.toNodeId]?.componentName ?? "unknown", count: e.occurrenceCount }))
    ];

    return {
        rootName: root.componentName,
        topCount: topEdge?.occurrenceCount ?? 0,
        downstreamCount: edges.length,
        cascade,
        cascadeLabel: topTarget ? `${root.componentName} → ${topTarget.componentName}` : root.componentName,
        componentCount: graph.nodes.length,
    };
}

function GlassStat({ value, label }) {
    return (
        <div className="flex-1 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 px-5 py-3 shadow-sm flex flex-col justify-center">
            <div className="text-2xl font-light text-slate-800 tabular-nums">{value}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
        </div>
    );
}
function NavItem({ icon, label, active, badge, onClick }) {
    return (
        <a onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-mono text-[13px] cursor-pointer transition-colors ${active ? "bg-rose-50/80 text-purple-600 font-medium shadow-sm" : "text-slate-400 hover:bg-rose-50/40 hover:text-slate-600"}`}>
            <span className="text-[11px] w-4">{icon}</span><span>{label}</span>
            {badge != null && <span className="ml-auto font-mono text-[10px] text-purple-400 bg-purple-50 px-1.5 py-0.5 rounded-full">{badge}</span>}
        </a>
    );
}
function Panel({ title, children }) {
    return (
        <div className="rounded-lg border border-[#f3eef3] bg-white/80 backdrop-blur-sm p-5 shadow-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-3">{title}</div>
            {children}
        </div>
    );
}
function ChainStep({ n, name, note, strong }) {
    return (
        <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-300">{n}</span>
            <span className={`font-mono text-[13px] truncate ${strong ? "text-rose-500 font-medium" : "text-slate-500"}`}>{name}</span>
            <span className="font-mono text-[10px] text-slate-400 ml-auto shrink-0">{note}</span>
        </div>
    );
}
function SeverityBar({ label, pct, tone }) {
    const bar = tone === "rose" ? "bg-rose-400" : "bg-purple-400";
    const text = tone === "rose" ? "text-rose-500" : "text-purple-500";
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className={`font-mono text-[11px] ${text}`}>{label}</span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
function buildVolume(incidents) {
    const days = 30;
    const buckets = new Array(days).fill(0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (const inc of incidents) {
        const d = new Date(inc.createdAt);
        d.setHours(0, 0, 0, 0);
        const daysAgo = Math.floor((now - d) / 86400000);
        if (daysAgo >= 0 && daysAgo < days) {
            buckets[days - 1 - daysAgo] += 1;
        }
    }
    return buckets;
}