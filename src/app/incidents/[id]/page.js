
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReport, getWebSocketUrl } from "@/lib/api";

export default function IncidentDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [noReport, setNoReport] = useState(false);
    const [liveEvents, setLiveEvents] = useState([]);

    // fetch the report
    useEffect(() => {
        getReport(id)
            .then((data) => { setReport(data.report ?? data); setLoading(false); })
            .catch((err) => {
                // a 404 means the incident exists but has no analysis yet — not a real error
                if (err.message?.includes("404") || err.message?.toLowerCase().includes("not found")) {
                    setNoReport(true);
                } else {
                    setError(err.message);
                }
                setLoading(false);
            });
    }, [id]);

    // live WebSocket — lights up as the pipeline runs
    useEffect(() => {
        const ws = new WebSocket(getWebSocketUrl(id));
        ws.onmessage = (e) => {
            try {
                const evt = JSON.parse(e.data);
                setLiveEvents((prev) => [...prev, evt]);
                // when analysis completes, re-fetch the report
                if (evt.type === "scoring-done" || evt.type === "slack-dispatched") {
                    getReport(id).then((data) => setReport(data.report ?? data)).catch(() => {});
                }
            } catch {}
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
        <div className="min-h-screen bg-[#fdfcfd] text-[#3a3a44] relative selection:bg-rose-100 selection:text-rose-700">
            <div className="pointer-events-none fixed top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-rose-100/40 blur-[160px]" />
            <div className="pointer-events-none fixed bottom-12 right-12 h-[500px] w-[500px] rounded-full bg-fuchsia-100/35 blur-[140px]" />

            <div className="relative z-10 max-w-4xl mx-auto px-8 py-8">

                {/* back */}
                <button onClick={() => router.push("/")}
                    className="font-mono text-[12px] text-slate-400 hover:text-purple-500 transition mb-6 flex items-center gap-2">
                    ← back to overview
                </button>

                {loading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-50/80 rounded-xl animate-pulse" />)}</div>}
                
                {error && (
                    <div className="border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-500 font-mono rounded-xl">
                        couldn’t load report — {error}
                    </div>
                )}
                
                {noReport && (
                    <div className="rounded-2xl border border-[#f3eef3] bg-white/60 backdrop-blur-xl p-10 text-center">
                        <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                            <span className="text-purple-300 text-xl">◷</span>
                        </div>
                        <div className="text-lg font-light text-slate-700 mb-1">No analysis yet</div>
                        <p className="font-mono text-[12px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                            This incident hasn’t been analyzed. Upload logs to generate a root-cause report, and it’ll appear here in real time.
                        </p>
                        <div className="mt-5 font-mono text-[11px] text-slate-300">
                            incident {id?.slice(0, 8)}
                        </div>
                    </div>
                )}

                {!loading && !error && !noReport && (
                    <>
                        {/* HEADER */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    {fp?.severityLevel && (
                                        <span className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded ring-1 ${fp.severityLevel === "SEV-1" ? "bg-rose-50 text-rose-500 ring-rose-100" : "bg-purple-50 text-purple-500 ring-purple-100"}`}>{fp.severityLevel}</span>
                                    )}
                                    <span className="font-mono text-[11px] text-slate-400">{report?.id?.slice(0, 8)}</span>
                                </div>
                                <h1 className="text-3xl font-light tracking-tight text-slate-800">
                                    {fp?.primaryFailingComponent ?? "Incident Analysis"}
                                </h1>
                            </div>
                            {ai?.confidenceMatrix?.overallScore != null && (
                                <div className="text-right">
                                    <div className="text-4xl font-light text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500 tabular-nums">{ai.confidenceMatrix.overallScore}</div>
                                    <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">confidence</div>
                                </div>
                            )}
                        </div>

                        {/* LIVE PIPELINE — shows while processing */}
                        {(isProcessing || liveEvents.length > 0) && (
                            <Pipeline events={liveEvents} status={status} />
                        )}

                        {/* PROCESSING STATE */}
                        {isProcessing && !ai && (
                            <div className="rounded-2xl border border-rose-100/70 bg-white/50 backdrop-blur-xl p-8 text-center">
                                <div className="font-mono text-sm text-slate-400">Analysis in progress — live updates streaming…</div>
                            </div>
                        )}

                        {/* RCA CONTENT */}
                        {ai && (
                            <div className="space-y-5">

                                {/* executive summary */}
                                {fp?.executiveSummary && (
                                    <Card title="executive summary">
                                        <p className="text-sm text-slate-600 leading-relaxed">{fp.executiveSummary}</p>
                                    </Card>
                                )}

                                {/* root cause */}
                                {rca?.definitiveRootCause && (
                                    <Card title="root cause">
                                        <p className="text-sm font-medium text-slate-700">{rca.definitiveRootCause}</p>
                                        {rca.evidenceCitations?.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-[#f3eef3] space-y-1.5">
                                                {rca.evidenceCitations.map((c, i) => (
                                                    <div key={i} className="font-mono text-[11px] text-slate-400 leading-relaxed">{c}</div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {/* historical correlation — THE MOAT */}
                                {fp?.historicalCorrelation && !fp.historicalCorrelation.startsWith("First occurrence") && (
                                    <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/60 to-rose-50/40 p-5">
                                        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-purple-400 mb-2">⟳ recurring pattern detected</div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{fp.historicalCorrelation}</p>
                                    </div>
                                )}

                                {/* scored runbook */}
                                {scored?.scoredSteps?.length > 0 && (
                                    <Card title={`recommended actions · ranked`}>
                                        <div className="space-y-3">
                                            {scored.scoredSteps.map((step, i) => (
                                                <div key={i} className="rounded-xl border border-[#f3eef3] p-4 bg-white/60">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <span className={`font-mono text-[11px] font-medium h-5 w-5 rounded flex items-center justify-center ${i === 0 ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400"}`}>{step.rank}</span>
                                                        <span className="text-sm font-medium text-slate-700 flex-1">{step.action}</span>
                                                        <span className="font-mono text-[11px] text-slate-400">score {step.compositeScore}</span>
                                                    </div>
                                                    {step.cliCommand && step.cliCommand !== "N/A" && (
                                                        <div className="font-mono text-[11px] bg-slate-50 rounded px-2 py-1.5 text-slate-500 mt-2 overflow-x-auto">{step.cliCommand}</div>
                                                    )}
                                                    <div className="flex gap-3 mt-2 font-mono text-[10px] text-slate-400">
                                                        <span>recovery {step.recoveryTimeMinutes}m</span>
                                                        <span>blast {step.blastRadius}/10</span>
                                                        <span>{step.reversibility}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {scored.strategySummary && (
                                            <p className="text-[13px] text-slate-500 mt-4 pt-4 border-t border-[#f3eef3] leading-relaxed">{scored.strategySummary}</p>
                                        )}
                                    </Card>
                                )}
                            </div>
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
        <div className="rounded-2xl border border-[#f3eef3] bg-white/60 backdrop-blur-sm p-4 mb-5 flex items-center gap-2 overflow-x-auto">
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
        </div>
    );
}

function Card({ title, children }) {
    return (
        <div className="rounded-2xl border border-[#f3eef3] bg-white/70 backdrop-blur-sm p-5 shadow-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-3">{title}</div>
            {children}
        </div>
    );
}
