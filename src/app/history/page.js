"use client";

import { useEffect, useState, useMemo } from "react";
import { listIncidents } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthGuard from "../AuthGuard";

export default function HistoryPage() {
  return <AuthGuard><History /></AuthGuard>;
}

const spring = { type: "spring", stiffness: 300, damping: 24 };

function History() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    listIncidents()
      .then((data) => { setIncidents(data.incidents ?? []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  // sort newest first
  const sorted = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [incidents]
  );

  // heatmap: last 12 weeks of incident counts
  const heatmap = useMemo(() => buildHeatmap(incidents), [incidents]);

  // group into time buckets
  const groups = useMemo(() => groupByTime(sorted), [sorted]);

  return (
    <div className="min-h-screen bg-[#f4f1f6] text-[#2a2730] flex relative selection:bg-rose-200/60 overflow-x-hidden">
      <div className="pointer-events-none fixed -top-40 left-1/4 h-[700px] w-[700px] rounded-full bg-rose-300/30 blur-[180px]" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-300/25 blur-[170px]" />

      <motion.aside initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}
        className="w-60 shrink-0 bg-white/50 backdrop-blur-xl border-r border-white/50 flex flex-col relative z-10">
        <div className="px-5 py-5 flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
          <motion.div whileHover={{ scale: 1.12, rotate: 8 }} transition={spring}
            className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-fuchsia-300/40">F</motion.div>
          <span className="text-base font-semibold tracking-tight text-slate-700">Forge</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1.5">
          <SideLink icon="◆" label="Overview" onClick={() => router.push("/")} />
          <SideLink icon="▤" label="Incidents" onClick={() => router.push("/incidents")} />
          <SideLink icon="◈" label="Topology" onClick={() => router.push("/topology")} />
          <SideLink icon="▰" label="Runbooks" onClick={() => router.push("/runbooks")} />
          <SideLink icon="◷" label="History" active />
        </nav>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <motion.header initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}
          className="h-16 shrink-0 bg-white/40 backdrop-blur-xl border-b border-white/40 flex items-center px-8">
          <span className="font-mono text-[11px] text-slate-500 uppercase tracking-[0.2em]">History</span>
        </motion.header>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-800 mb-1">Incident History</h1>
            <p className="text-sm text-slate-400 mb-6">{incidents.length} incidents over time</p>
          </motion.div>

          {loading && <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-white/40 rounded-2xl animate-pulse" />)}</div>}
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-500 font-mono">backend unreachable — {error}</div>}

          {!loading && !error && incidents.length === 0 && (
            <div className="rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 p-12 text-center">
              <div className="font-mono text-[13px] text-slate-400">no incident history yet</div>
            </div>
          )}

          {!loading && !error && incidents.length > 0 && (
            <>
              {/* HEATMAP STRIP */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring}
                className="rounded-3xl bg-white/55 backdrop-blur-xl border border-white/60 shadow-[0_15px_40px_-22px_rgba(200,100,180,0.3)] p-5 mb-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3">activity · last 12 weeks</div>
                <div className="flex items-end gap-1.5 h-16">
                  {heatmap.map((w, i) => {
                    const max = Math.max(...heatmap.map(h => h.count), 1);
                    const intensity = w.count / max;
                    return (
                      <motion.div key={i}
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...spring, delay: i * 0.02 }}
                        title={`${w.label}: ${w.count} incidents`}
                        className="flex-1 rounded-md origin-bottom min-h-[4px] cursor-default"
                        style={{
                          height: `${Math.max(intensity * 100, w.count > 0 ? 12 : 4)}%`,
                          background: w.count === 0 ? "rgba(0,0,0,0.04)" : `linear-gradient(to top, rgba(244,63,94,${0.3 + intensity * 0.5}), rgba(192,132,252,${0.3 + intensity * 0.5}))`,
                        }} />
                    );
                  })}
                </div>
              </motion.div>

              {/* TIMELINE */}
              <div className="relative">
                {/* vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-rose-200 via-purple-200 to-transparent" />
                {groups.map((group, gi) => (
                  <div key={group.label} className="mb-8">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: gi * 0.05 }}
                      className="flex items-center gap-3 mb-4 ml-7">
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-purple-500 font-medium">{group.label}</span>
                      <span className="font-mono text-[10px] text-slate-300">{group.items.length}</span>
                    </motion.div>
                    <div className="space-y-2.5">
                      {group.items.map((inc, i) => {
                        let conf = inc.confidence;
                        if (conf != null && conf <= 1) conf = Math.round(conf * 100);
                        const isSev1 = inc.severity === "SEV-1";
                        const isSev2 = inc.severity === "SEV-2";
                        const hasReport = inc.reportStatus === "completed" && (isSev1 || isSev2);
                        return (
                          <motion.div key={inc.id}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: gi * 0.05 + i * 0.02 }}
                            whileHover={{ x: 4 }}
                            onClick={() => router.push(`/incidents/${inc.id}`)}
                            className="relative pl-7 cursor-pointer group">
                            {/* timeline dot */}
                            <span className={`absolute left-0 top-4 h-3.5 w-3.5 rounded-full border-2 border-white shadow ${hasReport ? (isSev1 ? "bg-rose-400" : "bg-purple-400") : "bg-slate-300"}`} />
                            <div className="rounded-2xl bg-white/55 backdrop-blur-xl border border-white/60 shadow-[0_10px_30px_-18px_rgba(200,100,180,0.3)] px-4 py-3 group-hover:bg-white/75 transition-colors">
                              <div className="grid grid-cols-12 items-center gap-3">
                                <span className="col-span-1">
                                  {hasReport ? (
                                    <span className={`font-mono text-[9px] font-medium px-1.5 py-0.5 rounded-md ring-1 ${isSev1 ? "bg-rose-100/70 text-rose-500 ring-rose-200" : "bg-purple-100/70 text-purple-500 ring-purple-200"}`}>{inc.severity}</span>
                                  ) : (
                                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md ring-1 bg-slate-100/70 text-slate-300 ring-slate-200">—</span>
                                  )}
                                </span>
                                <span className="col-span-6 text-sm font-medium truncate text-slate-700">{inc.title}</span>
                                <span className="col-span-3 font-mono text-[10px] text-slate-400 truncate">{inc.primaryComponent && !inc.primaryComponent.startsWith("N/A") ? inc.primaryComponent : "—"}</span>
                                <span className="col-span-2 text-right font-mono text-[10px] text-slate-300">{new Date(inc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function buildHeatmap(incidents) {
  const weeks = 12;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const end = new Date(now); end.setDate(end.getDate() - (weeks - 1 - i) * 7);
    return { count: 0, label: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
  });
  for (const inc of incidents) {
    const d = new Date(inc.createdAt); d.setHours(0, 0, 0, 0);
    const weeksAgo = Math.floor((now - d) / (86400000 * 7));
    if (weeksAgo >= 0 && weeksAgo < weeks) buckets[weeks - 1 - weeksAgo].count += 1;
  }
  return buckets;
}

function groupByTime(sorted) {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(startOfToday); startOfMonth.setDate(startOfMonth.getDate() - 30);

  const buckets = { Today: [], Yesterday: [], "This week": [], "This month": [], Earlier: [] };
  for (const inc of sorted) {
    const d = new Date(inc.createdAt);
    if (d >= startOfToday) buckets["Today"].push(inc);
    else if (d >= startOfYesterday) buckets["Yesterday"].push(inc);
    else if (d >= startOfWeek) buckets["This week"].push(inc);
    else if (d >= startOfMonth) buckets["This month"].push(inc);
    else buckets["Earlier"].push(inc);
  }
  return Object.entries(buckets).filter(([, items]) => items.length > 0).map(([label, items]) => ({ label, items }));
}

function SideLink({ icon, label, active, onClick, soon }) {
  return (
    <motion.div whileHover={soon ? {} : { x: 5, scale: 1.02 }} whileTap={soon ? {} : { scale: 0.97 }} transition={spring}
      onClick={soon ? undefined : onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl font-mono text-[13px] ${soon ? "text-slate-300 cursor-default" : "cursor-pointer"} ${active ? "bg-white/70 text-purple-600 font-medium shadow-md shadow-purple-200/30" : !soon ? "text-slate-400 hover:bg-white/50 hover:text-slate-600" : ""}`}>
      <span className="text-[11px] w-4">{icon}</span><span>{label}</span>
      {soon && <span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-slate-300 bg-white/60 px-1.5 py-0.5 rounded-full">soon</span>}
    </motion.div>
  );
}