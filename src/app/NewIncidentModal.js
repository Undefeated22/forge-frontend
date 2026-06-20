"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { createIncident, uploadEvidence } from "@/lib/api";

const spring = { type: "spring", stiffness: 300, damping: 26 };

export default function NewIncidentModal({ open, onClose, onCreated, router }) {
    const [title, setTitle] = useState("API Gateway 500 Errors");
    const [description, setDescription] = useState("Investigating intermittent 500 errors during authentication.");
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [stage, setStage] = useState("");
    const [err, setErr] = useState(null);
    const inputRef = useRef(null);

    function pickFiles(e) { setFiles(Array.from(e.target.files ?? [])); }
    function onDrop(e) { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files ?? [])); }

    async function submit() {
        setErr(null);
        if (!title.trim()) { setErr("Title is required"); return; }
        setBusy(true);
        try {
            setStage("creating incident…");
            const res = await createIncident(title, description);
            const incidentId = res.data?.id ?? res.id;
            if (files.length > 0) {
                setStage(`uploading ${files.length} file(s)…`);
                await uploadEvidence(incidentId, files);
                setStage("analysis started — redirecting…");
                onClose();
                router.push(`/incidents/${incidentId}`);
            } else {
                setStage("done");
                onClose();
                onCreated?.();
            }
        } catch (e) {
            setErr(e.message);
            setBusy(false);
            setStage("");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-md" onClick={busy ? undefined : onClose} />

            {/* modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={spring}
                className="relative w-full max-w-lg rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_30px_80px_-20px_rgba(200,100,180,0.45)] p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-semibold text-slate-800">New Incident</h2>
                    <button onClick={busy ? undefined : onClose} className="text-slate-300 hover:text-slate-500 font-mono text-sm disabled:opacity-30" disabled={busy}>✕</button>
                </div>

                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy}
                    className="w-full rounded-xl bg-white/60 border border-white/70 px-3.5 py-2.5 text-sm text-slate-700 mb-4 focus:outline-none focus:border-purple-300 focus:bg-white/80 transition-colors" />

                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} rows={2}
                    className="w-full rounded-xl bg-white/60 border border-white/70 px-3.5 py-2.5 text-sm text-slate-700 mb-4 focus:outline-none focus:border-purple-300 focus:bg-white/80 transition-colors resize-none" />

                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Log files</label>
                <motion.div whileHover={{ scale: 1.005 }} onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
                    className="rounded-2xl border-2 border-dashed border-white/70 hover:border-purple-300 bg-white/40 px-4 py-6 text-center cursor-pointer transition-colors mb-2">
                    <input ref={inputRef} type="file" multiple onChange={pickFiles} className="hidden" accept=".txt,.log,.json" />
                    {files.length === 0 ? (
                        <span className="font-mono text-[12px] text-slate-400">drop log files here, or click to browse</span>
                    ) : (
                        <div className="space-y-1">
                            {files.map((f, i) => (
                                <div key={i} className="font-mono text-[12px] text-slate-600">{f.name} · {(f.size / 1024).toFixed(1)} KB</div>
                            ))}
                        </div>
                    )}
                </motion.div>
                <p className="font-mono text-[10px] text-slate-300 mb-5">No file? You can still create the incident and upload logs later.</p>

                {err && <div className="rounded-xl bg-rose-50/80 border border-rose-200 text-rose-500 font-mono text-[12px] px-3 py-2 mb-4">{err}</div>}

                <div className="flex items-center justify-end gap-3">
                    {busy && <span className="font-mono text-[11px] text-purple-400 mr-auto">{stage}</span>}
                    <button onClick={busy ? undefined : onClose} disabled={busy}
                        className="font-mono text-[12px] text-slate-400 hover:text-slate-600 px-3 py-2 disabled:opacity-30">cancel</button>
                    <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} transition={spring} onClick={submit} disabled={busy}
                        className="font-mono text-[12px] bg-gradient-to-r from-rose-400 to-purple-400 text-white px-4 py-2 rounded-xl shadow-lg shadow-fuchsia-300/40 hover:from-rose-500 hover:to-purple-500 transition-colors disabled:opacity-50">
                        {busy ? "working…" : files.length > 0 ? "create & analyze" : "create"}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}