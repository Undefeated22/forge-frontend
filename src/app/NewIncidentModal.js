"use client";

import { useState, useRef } from "react";
import { createIncident, uploadEvidence } from "@/lib/api";

export default function NewIncidentModal({ open, onClose, onCreated, router }) {
    const [title, setTitle] = useState("API Gateway 500 Errors");
    const [description, setDescription] = useState("Investigating intermittent 500 errors during authentication.");
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [stage, setStage] = useState("");
    const [err, setErr] = useState(null);
    const inputRef = useRef(null);

    if (!open) return null;

    function pickFiles(e) {
        setFiles(Array.from(e.target.files ?? []));
    }
    function onDrop(e) {
        e.preventDefault();
        setFiles(Array.from(e.dataTransfer.files ?? []));
    }

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
                // go straight to the live detail page to watch the pipeline
                onClose();
                router.push(`/incidents/${incidentId}`);
            } else {
                // no files: just refresh the list
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
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={busy ? undefined : onClose} />

            {/* modal */}
            <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#f3eef3] shadow-xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-medium text-slate-800">New Incident</h2>
                    <button onClick={busy ? undefined : onClose} className="text-slate-300 hover:text-slate-500 font-mono text-sm disabled:opacity-30" disabled={busy}>✕</button>
                </div>

                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy}
                    className="w-full rounded-lg border border-[#f3eef3] px-3 py-2 text-sm text-slate-700 mb-4 focus:outline-none focus:border-purple-300" />

                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} rows={2}
                    className="w-full rounded-lg border border-[#f3eef3] px-3 py-2 text-sm text-slate-700 mb-4 focus:outline-none focus:border-purple-300 resize-none" />

                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">Log files</label>
                <div onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
                    className="rounded-lg border-2 border-dashed border-[#f3eef3] hover:border-purple-300 px-4 py-6 text-center cursor-pointer transition mb-2">
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
                </div>
                <p className="font-mono text-[10px] text-slate-300 mb-5">No file? You can still create the incident and upload logs later.</p>

                {err && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-500 font-mono text-[12px] px-3 py-2 mb-4">{err}</div>}

                <div className="flex items-center justify-end gap-3">
                    {busy && <span className="font-mono text-[11px] text-purple-400 mr-auto">{stage}</span>}
                    <button onClick={busy ? undefined : onClose} disabled={busy}
                        className="font-mono text-[12px] text-slate-400 hover:text-slate-600 px-3 py-2 disabled:opacity-30">cancel</button>
                    <button onClick={submit} disabled={busy}
                        className="font-mono text-[12px] bg-gradient-to-r from-rose-400 to-purple-400 text-white px-4 py-2 rounded-lg hover:from-rose-500 hover:to-purple-500 transition disabled:opacity-50">
                        {busy ? "working…" : files.length > 0 ? "create & analyze" : "create"}
                    </button>
                </div>
            </div>
        </div>
    );
}