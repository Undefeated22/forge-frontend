"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getReport, getWebSocketUrl } from "@/lib/api";

const spring = { type: "spring", stiffness: 300, damping: 24 };

export default function IncidentDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [noReport, setNoReport] = useState(false);
    const [liveEvents, setLiveEvents] = useState([]);

    useEffect(() => {
        getReport(id)
            .then((data) => { setReport(data.report ?? data); setLoading(false); })
            .catch((err) => {
                if (err.message?.includes("404") || err.message?.toLowerCase().includes("not found")) {
                    setNoReport(true);
                } else {
                    setError(err.message);
                }
                setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        const ws = new WebSocket(getWebSocketUrl(id));
        ws.onmessage = (e) => {
            try {
                const evt = JSON.parse(e.data);
                setLiveEvents((prev) => [...prev, evt]);
                if (evt.type === "scoring-done" || evt.type === "slack-dispatched") {
                    getReport(id).then((data) => setReport(data.report ?? data)).catch(() => { });
                }
            } catch { }
        };
        return () => ws.close();
    }, [id]);

    const ai = report?.aiPayload;
    const scored = report?.scoredRunbook;
    const fp = ai?.incidentFingerprint;
    const rca = ai?.rootCauseAnalysis;
    const status = report?.status ?? "pending";
    const isProcessing = status === "pending" || status === "processing";

    return (
        <div className="min-h-screen bg-[#f4f1f6] text-[#2a2730] relative selection:bg-rose-200/60">
            <div className="pointer-events-none fixed -top-20 left-1/4 h-[600px] w-[600px] rounded-full bg-rose-300/30 blur-[170px]" />
            <div className="pointer-events-none fixed bottom-12 right-12 h-[500px] w-[500px] rounded-full bg-purple-300/25 blur-[160px]" />

            <div className="relative z-10 max-w-4xl mx-auto px-8 py-8">

                <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={spring}
                    onClick={() => router.push("/")}
                    whileHover={{ x: -3 }}
                    className="font-mono text-[12px] text-slate-400 hover:text-purple-500 transition-colors mb-6 flex items-center gap-2">
                    ← back to overview
                </motion.button>

                {loading && <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/40 rounded-2xl animate-pulse" />)}</div>}

                {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-500 font-mono">
                        couldn't load report — {error}
                    </div>
                )}

                {noReport && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}
                        className="rounded-3xl border border-white/60 bg-white/50 backdrop-blur-2xl shadow-[0_25px_60px_-25px_rgba(200,100,180,0.4)] p-10 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-200 to-purple-200 flex items-center justify-center mx-auto mb-4">
                            <span className="text-white text-xl">◷</span>
                        </div>
                        <div className="text-xl font-semibold text-slate-800 mb-1">No analysis yet</div>
                        <p className="font-mono text-[12px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                            This incident hasn't been analyzed. Upload logs to generate a root-cause report, and it'll appear here in real time.
                        </p>
                        <div className="mt-5 font-mono text-[11px] text-slate-300">incident {id?.slice(0, 8)}</div>
                    </motion.div>
                )}

                {!loading && !error && !noReport && (
                    <>
                        {/* HEADER */}
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring}
                            className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    {fp?.severityLevel && (
                                        <span className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded-lg ring-1 ${fp.severityLevel === "SEV-1" ? "bg-rose-100/70 text-rose-500 ring-rose-200" : "bg-purple-100/70 text-purple-500 ring-purple-200"}`}>{fp.severityLevel}</span>
                                    )}
                                    <span className="font-mono text-[11px] text-slate-400">{report?.id?.slice(0, 8)}</span>
                                </div>
                                <h1 className="text-3xl font-semibold tracking-tight text-slate-800">
                                    {fp?.primaryFailingComponent ?? "Incident Analysis"}
                                </h1>
                            </div>
                            {ai?.confidenceMatrix?.overallScore != null && (
                                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.15 }}
                                    className="text-right">
                                    <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-purple-500 tabular-nums">{ai.confidenceMatrix.overallScore}</div>
                                    <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">confidence</div>
                                </motion.div>
                            )}
                        </motion.div>

                        {(isProcessing || liveEvents.length > 0) && (
                            <Pipeline events={liveEvents} status={status} />
                        )}

                        {isProcessing && !ai && (
                            <div className="rounded-3xl border border-white/60 bg-white/50 backdrop-blur-2xl p-8 text-center">
                                <div className="font-mono text-sm text-slate-400">Analysis in progress — live updates streaming…</div>
                            </div>
                        )}

                        {ai && (
                            <motion.div initial="hidden" animate="show"
                                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
                                className="space-y-5">

                                {fp?.executiveSummary && (
                                    <Card title="executive summary">
                                        <p className="text-sm text-slate-600 leading-relaxed">{fp.executiveSummary}</p>
                                    </Card>
                                )}

                                {rca?.definitiveRootCause && (
                                    <Card title="root cause">
                                        <p className="text-sm font-medium text-slate-700">{rca.definitiveRootCause}</p>
                                        {rca.evidenceCitations?.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-white/60 space-y-1.5">
                                                {rca.evidenceCitations.map((c, i) => (
                                                    <div key={i} className="font-mono text-[11px] text-slate-400 leading-relaxed">{c}</div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {/* historical correlation — THE MOAT */}
                                {fp?.historicalCorrelation && !fp.historicalCorrelation.startsWith("First occurrence") && (
                                    <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: spring } }}
                                        className="rounded-3xl border border-purple-200/60 bg-gradient-to-r from-purple-100/50 to-rose-100/40 backdrop-blur-xl p-5 shadow-[0_15px_40px_-20px_rgba(200,100,180,0.4)]">
                                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple-500 mb-2">⟳ recurring pattern detected</div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{fp.historicalCorrelation}</p>
                                    </motion.div>
                                )}

                                {scored?.scoredSteps?.length > 0 && (
                                    <Card title="recommended actions · ranked">
                                        <div className="space-y-3">
                                            {scored.scoredSteps.map((step, i) => (
                                                <motion.div key={i}
                                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.05 * i }}
                                                    whileHover={{ scale: 1.01 }}
                                                    className="rounded-2xl border border-white/60 p-4 bg-white/60">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <span className={`font-mono text-[11px] font-medium h-6 w-6 rounded-lg flex items-center justify-center ${i === 0 ? "bg-gradient-to-br from-rose-200 to-purple-200 text-purple-700" : "bg-white/70 text-slate-400"}`}>{step.rank}</span>
                                                        <span className="text-sm font-medium text-slate-700 flex-1">{step.action}</span>
                                                        <span className="font-mono text-[11px] text-slate-400">score {step.compositeScore}</span>
                                                    </div>
                                                    {step.cliCommand && step.cliCommand !== "N/A" && (
                                                        <div className="font-mono text-[11px] bg-white/70 border border-white/70 rounded-lg px-3 py-1.5 text-purple-600 mt-2 overflow-x-auto">{step.cliCommand}</div>
                                                    )}
                                                    <div className="flex gap-3 mt-2 font-mono text-[10px] text-slate-400">
                                                        <span>recovery {step.recoveryTimeMinutes}m</span>
                                                        <span>blast {step.blastRadius}/10</span>
                                                        <span>{step.reversibility}</span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                        {scored.strategySummary && (
                                            <p className="text-[13px] text-slate-500 mt-4 pt-4 border-t border-white/60 leading-relaxed">{scored.strategySummary}</p>
                                        )}
                                    </Card>
                                )}
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Pipeline({ events, status }) {
    const stages = ["status", "rca-ready", "graph-updated", "scoring-done", "escalation", "slack-dispatched"];
    const labels = { status: "analyzing", "rca-ready": "RCA ready", "graph-updated": "graph", "scoring-done": "scored", escalation: "routed", "slack-dispatched": "notified" };
    const seen = new Set(events.map(e => e.type));
    const done = status === "completed";
    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl p-4 mb-5 flex items-center gap-2 overflow-x-auto">
            {stages.map((s, i) => {
                const active = seen.has(s) || done;
                return (
                    <div key={s} className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-1.5 ${active ? "" : "opacity-30"}`}>
                            <span className={`h-2 w-2 rounded-full ${active ? "bg-purple-400" : "bg-slate-200"}`} />
                            <span className="font-mono text-[10px] text-slate-500">{labels[s]}</span>
                        </div>
                        {i < stages.length - 1 && <span className="text-slate-200 font-mono text-[10px]">→</span>}
                    </div>
                );
            })}
        </motion.div>
    );
}

function Card({ title, children }) {
    return (
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: spring } }}
            className="rounded-3xl border border-white/60 bg-white/55 backdrop-blur-xl p-5 shadow-[0_15px_40px_-20px_rgba(200,100,180,0.3)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3">{title}</div>
            {children}
        </motion.div>
    );
}