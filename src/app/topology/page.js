"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getGraph } from "@/lib/api";
import dagre from "dagre";
import {
    ReactFlow, Background, Controls,
    useNodesState, useEdgesState, Handle, Position, MarkerType,
    Panel, ReactFlowProvider, useReactFlow, BaseEdge, getBezierPath, EdgeLabelRenderer,
} from "@xyflow/react";
import { AlertTriangle, ShieldAlert, Cpu, Focus, Zap } from "lucide-react";

const spring = { type: "spring", stiffness: 300, damping: 24 };

const getLayoutedElements = (nodes, edges, direction = "LR") => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: 110, ranksep: 300 });
    nodes.forEach((n) => g.setNode(n.id, { width: 240, height: 120 }));
    edges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return {
        nodes: nodes.map((n) => ({
            ...n, targetPosition: Position.Left, sourcePosition: Position.Right,
            position: { x: g.node(n.id).x - 120, y: g.node(n.id).y - 60 },
        })),
        edges,
    };
};

function CascadeEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style }) {
    const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    return (
        <>
            <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
            <circle r={data.firing ? 6 : 4} fill={data.firing ? "#f43f5e" : data.hot ? "#f43f5e" : "#c084fc"} opacity={data.firing ? 1 : 0.8}>
                <animateMotion dur={`${data.firing ? 0.8 : data.speed}s`} repeatCount="indefinite" path={path} />
            </circle>
            <EdgeLabelRenderer>
                <div
                    style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 14}px)` }}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100/70 border border-purple-200 text-purple-500 pointer-events-none backdrop-blur-sm">
                    ×{data.count} cascades
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

function ComponentNode({ data }) {
    const { name, incidentCount, role, selected, failState } = data;
    const styles = {
        root: { ring: "ring-rose-300", text: "text-rose-500", iconBg: "bg-rose-100/70", Icon: ShieldAlert },
        victim: { ring: "ring-purple-200", text: "text-purple-500", iconBg: "bg-purple-100/70", Icon: AlertTriangle },
        stable: { ring: "ring-slate-200", text: "text-slate-400", iconBg: "bg-slate-100/70", Icon: Cpu },
    };
    const s = styles[role] || styles.stable;
    const Icon = s.Icon;
    const down = failState === "down";

    return (
        <div className={`relative rounded-3xl backdrop-blur-xl border transition-all duration-500
            ${down ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-400 scale-110 shadow-[0_0_50px_-4px_rgba(244,63,94,0.55)]" : `bg-white/70 border-white/70 ring-2 ${s.ring} shadow-[0_15px_45px_-15px_rgba(200,100,180,0.4)]`}
            p-4 min-w-[220px] ${selected ? "scale-105 z-50 shadow-2xl" : ""}`}>

            {role === "root" && !down && (
                <div className="absolute -inset-3 rounded-[28px] bg-rose-300/25 blur-xl -z-10 animate-pulse" />
            )}

            <Handle type="target" position={Position.Left} className="!bg-slate-300 !w-2 !h-5 !rounded-sm !border-0 -ml-1" />
            <Handle type="source" position={Position.Right} className="!bg-rose-300 !w-2 !h-5 !rounded-sm !border-0 -mr-1" />

            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${down ? "bg-rose-100 text-rose-600" : `${s.iconBg} ${s.text}`}`}>
                        <Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                        <div className="text-[14px] font-semibold text-slate-700 tracking-tight">{name}</div>
                        <div className={`font-mono text-[9px] uppercase tracking-widest mt-0.5 ${down ? "text-rose-500" : "text-slate-400"}`}>
                            {down ? "● failing" : role}
                        </div>
                    </div>
                </div>
                {role === "root" && (
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
                    </span>
                )}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/60">
                <span className="font-mono text-[10px] text-slate-400 uppercase">incidents</span>
                <span className="font-mono text-sm font-semibold text-slate-600 tabular-nums">{incidentCount}</span>
            </div>
        </div>
    );
}

const nodeTypes = { component: ComponentNode };
const edgeTypes = { cascade: CascadeEdge };

function TopologyCanvas() {
    const { fitView } = useReactFlow();
    const [graph, setGraph] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [simulating, setSimulating] = useState(false);
    const [blastCaption, setBlastCaption] = useState(null);
    const timers = useRef([]);

    useEffect(() => {
        let alive = true;
        getGraph()
            .then((g) => { if (alive) { setGraph(g); setLoading(false); } })
            .catch((err) => { if (alive) { console.error("[topology] graph fetch failed:", err); setLoading(false); } });
        return () => { alive = false; timers.current.forEach(clearTimeout); };
    }, []);

    useEffect(() => {
        if (!graph?.nodes?.length) return;
        const outWeight = {};
        for (const e of graph.edges ?? []) outWeight[e.fromNodeId] = (outWeight[e.fromNodeId] ?? 0) + e.occurrenceCount;
        const rootId = Object.keys(outWeight).sort((a, b) => outWeight[b] - outWeight[a])[0];
        const targets = new Set((graph.edges ?? []).map(e => e.toNodeId));

        const rawNodes = graph.nodes.map((n) => ({
            id: n.id, type: "component",
            data: { name: n.componentName, incidentCount: n.incidentCount, role: n.id === rootId ? "root" : targets.has(n.id) ? "victim" : "stable", failState: null },
            position: { x: 0, y: 0 },
        }));

        const maxOcc = Math.max(...(graph.edges ?? []).map(e => e.occurrenceCount), 1);
        const rawEdges = (graph.edges ?? []).map((e) => {
            const hot = e.occurrenceCount >= maxOcc * 0.8;
            return {
                id: e.id, source: e.fromNodeId, target: e.toNodeId, type: "cascade",
                data: { count: e.occurrenceCount, hot, speed: 3 - (e.occurrenceCount / maxOcc) * 1.5, firing: false },
                style: { stroke: hot ? "#f43f5e" : "#c084fc", strokeWidth: 1.5 + (e.occurrenceCount / maxOcc) * 3 },
                markerEnd: { type: MarkerType.ArrowClosed, color: hot ? "#f43f5e" : "#c084fc" },
            };
        });

        const { nodes: ln, edges: le } = getLayoutedElements(rawNodes, rawEdges);
        setNodes(ln); setEdges(le);
        setTimeout(() => fitView({ padding: 0.25 }), 50);
    }, [graph, setNodes, setEdges, fitView]);

    useEffect(() => {
        if (!nodes.length || simulating) return;
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, selected: n.id === selectedNodeId } })));
        setEdges(eds => eds.map(e => {
            const connected = selectedNodeId ? (e.source === selectedNodeId || e.target === selectedNodeId) : true;
            return { ...e, style: { ...e.style, opacity: connected ? 0.95 : 0.1 } };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNodeId, edges.length, simulating]);

    const runSimulation = useCallback(() => {
        if (simulating) return;
        const rootNode = nodes.find(n => n.data?.role === "root");
        if (!rootNode) return;
        setSimulating(true);
        setSelectedNodeId(null);
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, failState: null } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, firing: false } })));
        const rootEdges = edges.filter(e => e.source === rootNode.id).sort((a, b) => b.data.count - a.data.count);
        const t0 = setTimeout(() => {
            setNodes(nds => nds.map(n => n.id === rootNode.id ? { ...n, data: { ...n.data, failState: "down" } } : n));
            setBlastCaption(`${rootNode.data.name} failing — predicting blast radius…`);
        }, 200);
        timers.current.push(t0);
        rootEdges.forEach((edge, i) => {
            const delay = 1100 + i * 1100;
            const t = setTimeout(() => {
                setEdges(eds => eds.map(e => e.id === edge.id ? { ...e, data: { ...e.data, firing: true } } : e));
                setNodes(nds => nds.map(n => n.id === edge.target ? { ...n, data: { ...n.data, failState: "down" } } : n));
                const victim = nodes.find(n => n.id === edge.target);
                setBlastCaption(`${victim?.data.name} down · ${i + 1} of ${rootEdges.length} services affected`);
            }, delay);
            timers.current.push(t);
        });
        const totalTime = 1100 + rootEdges.length * 1100 + 800;
        const tEnd = setTimeout(() => {
            const secs = Math.round((rootEdges.length * 1.1 + 1));
            setBlastCaption(`⚠ Predicted blast radius: ${rootEdges.length} services in ~${secs}s`);
        }, totalTime);
        timers.current.push(tEnd);
    }, [simulating, nodes, edges, setNodes, setEdges]);

    const resetSim = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setSimulating(false);
        setBlastCaption(null);
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, failState: null } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, firing: false }, style: { ...e.style, opacity: 0.95 } })));
    }, [setNodes, setEdges]);

    const selectedNodeData = nodes.find(n => n.id === selectedNodeId)?.data;
    const rootNode = nodes.find(n => n.data?.role === "root")?.data;
    const victimCount = nodes.filter(n => n.data?.role === "victim").length;
    const totalCascades = (graph?.edges ?? []).reduce((s, e) => s + e.occurrenceCount, 0);

    if (loading) {
        return <div className="flex-1 flex items-center justify-center text-slate-400 font-mono">loading topology…</div>;
    }

    if (!graph?.nodes?.length) {
        return (
            <div className="flex-1 flex items-center justify-center relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}
                    className="text-center rounded-3xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_25px_60px_-25px_rgba(200,100,180,0.4)] p-12 max-w-md">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-200 to-purple-200 flex items-center justify-center mx-auto mb-4 text-2xl">◈</div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">No topology yet</h2>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        Forge builds your system's failure map from analyzed incidents. Create and analyze a few incidents, and the cascade relationships between your components will appear here.
                    </p>
                    <span className="font-mono text-[11px] text-slate-300">your causal graph is empty</span>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
            <motion.header initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}
                className="h-16 shrink-0 border-b border-white/40 bg-white/40 backdrop-blur-xl flex items-center justify-between px-8">
                <span className="font-mono text-[11px] text-slate-500 uppercase tracking-[0.2em]">System Topology</span>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-400">{graph?.nodeCount ?? "—"} components · {graph?.edgeCount ?? "—"} cascade paths</span>
                    {!simulating ? (
                        <motion.button whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} transition={spring} onClick={runSimulation}
                            className="flex items-center gap-1.5 font-mono text-[11px] bg-gradient-to-r from-rose-400 to-purple-400 text-white px-3.5 py-1.5 rounded-xl shadow-lg shadow-fuchsia-300/40">
                            <Zap size={13} /> simulate failure
                        </motion.button>
                    ) : (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={spring} onClick={resetSim}
                            className="font-mono text-[11px] bg-white/70 border border-white/70 text-slate-500 px-3.5 py-1.5 rounded-xl hover:text-slate-700 transition-colors">
                            reset
                        </motion.button>
                    )}
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => fitView({ padding: 0.25, duration: 800 })} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg transition-colors" title="Reset view">
                        <Focus size={16} />
                    </motion.button>
                </div>
            </motion.header>

            <main className="flex-1 relative" style={{ height: "calc(100vh - 64px)" }}>
                {(rootNode || blastCaption) && (
                    <motion.div
                        key={blastCaption ? "blast" : "story"}
                        initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring}
                        className={`absolute top-5 left-1/2 -translate-x-1/2 z-10 rounded-2xl backdrop-blur-xl border shadow-lg px-6 py-3
                            ${blastCaption ? "bg-rose-50/85 border-rose-200" : "bg-white/55 border-white/60"}`}>
                        {blastCaption ? (
                            <span className="font-mono text-[13px] text-rose-600">{blastCaption}</span>
                        ) : (
                            <div className="flex items-center gap-5">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500">{rootNode.name}</span>
                                    <span className="font-mono text-[11px] text-slate-400">is your single point of failure</span>
                                </div>
                                <div className="h-6 w-px bg-white/60" />
                                <div className="font-mono text-[12px] text-slate-500">
                                    1 root → <span className="text-rose-500 font-medium">{victimCount} services</span> · <span className="text-purple-500 font-medium">{totalCascades}</span> total cascades
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                <ReactFlow
                    nodes={nodes} edges={edges}
                    onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                    onNodeClick={(_, node) => !simulating && setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    onPaneClick={() => setSelectedNodeId(null)}
                    nodeTypes={nodeTypes} edgeTypes={edgeTypes}
                    minZoom={0.2} maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                    className="bg-transparent"
                >
                    <Background color="#e9d5ff" gap={22} size={1.5} />
                    <Controls className="!bg-white/70 !border !border-white/70 !rounded-xl !shadow-lg !backdrop-blur-xl" />

                    {selectedNodeData && !simulating && (
                        <Panel position="top-right" className="!m-6">
                            <motion.div initial={{ opacity: 0, x: 20, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={spring}
                                className="w-72 rounded-3xl bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_25px_60px_-25px_rgba(200,100,180,0.4)] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">node inspector</span>
                                    <button onClick={() => setSelectedNodeId(null)} className="text-slate-300 hover:text-slate-500">✕</button>
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800">{selectedNodeData.name}</h2>
                                <div className="font-mono text-[11px] text-slate-400 uppercase tracking-widest mt-1">{selectedNodeData.role} node</div>
                                <div className="mt-5 pt-5 border-t border-white/60">
                                    <div className="text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-wider">total impact</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500">{selectedNodeData.incidentCount}</span>
                                        <span className="font-mono text-[10px] text-slate-400">incidents involved</span>
                                    </div>
                                </div>
                                {selectedNodeData.role === "root" && (
                                    <div className="mt-4 rounded-xl bg-rose-50/70 border border-rose-100 px-3 py-2 font-mono text-[11px] text-rose-500 leading-relaxed">
                                        ⚠ weakest link — try "simulate failure" to see its blast radius
                                    </div>
                                )}
                            </motion.div>
                        </Panel>
                    )}
                </ReactFlow>
            </main>
        </div>
    );
}

export default function TopologyPage() {
    const router = useRouter();
    return (
        <div className="h-screen w-screen bg-[#f4f1f6] text-[#2a2730] flex relative overflow-hidden selection:bg-rose-200/60">
            <div className="absolute top-[-20%] left-[-10%] h-[700px] w-[700px] rounded-full bg-rose-300/30 blur-[170px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-300/25 blur-[170px] pointer-events-none" />

            <motion.aside initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}
                className="w-60 shrink-0 bg-white/50 backdrop-blur-xl border-r border-white/50 flex flex-col relative z-20">
                <div className="px-5 py-5 flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
                    <motion.div whileHover={{ scale: 1.12, rotate: 8 }} transition={spring}
                        className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-fuchsia-300/40">F</motion.div>
                    <span className="text-base font-semibold tracking-tight text-slate-700">Forge</span>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1.5">
                    <SideLink icon="◆" label="Overview" onClick={() => router.push("/")} />
                    <SideLink icon="▤" label="Incidents" onClick={() => router.push("/incidents")} />
                    <SideLink icon="◈" label="Topology" active />
                    <SideLink icon="▰" label="Runbooks" onClick={() => router.push("/runbooks")} />
                    <SideLink icon="◷" label="History" soon />
                </nav>
            </motion.aside>
            <ReactFlowProvider><TopologyCanvas /></ReactFlowProvider>
        </div>
    );
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