"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getGraph } from "@/lib/api";
import dagre from "dagre";
import {
    ReactFlow, Background, Controls,
    useNodesState, useEdgesState, Handle, Position, MarkerType,
    Panel, ReactFlowProvider, useReactFlow, BaseEdge, getBezierPath, EdgeLabelRenderer,
} from "@xyflow/react";
import { AlertTriangle, ShieldAlert, Cpu, Focus, Zap } from "lucide-react";

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
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-50 border border-purple-100 text-purple-500 pointer-events-none">
                    ×{data.count} cascades
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

function ComponentNode({ data }) {
    const { name, incidentCount, role, selected, failState } = data;
    const styles = {
        root: { ring: "ring-rose-300", text: "text-rose-500", iconBg: "bg-rose-50", Icon: ShieldAlert },
        victim: { ring: "ring-purple-200", text: "text-purple-500", iconBg: "bg-purple-50", Icon: AlertTriangle },
        stable: { ring: "ring-slate-200", text: "text-slate-400", iconBg: "bg-slate-50", Icon: Cpu },
    };
    const s = styles[role] || styles.stable;
    const Icon = s.Icon;

    // failState: null | "down"
    const down = failState === "down";

    return (
        <div className={`relative rounded-2xl backdrop-blur-xl border transition-all duration-500
            ${down ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400 scale-110 shadow-[0_0_40px_-4px_rgba(244,63,94,0.5)]" : `bg-white/90 border-white ring-2 ${s.ring} shadow-xl`}
            p-4 min-w-[220px] ${selected ? "scale-105 z-50 shadow-2xl" : ""}`}>

            {/* halo for root */}
            {role === "root" && !down && (
                <div className="absolute -inset-3 rounded-3xl bg-rose-300/20 blur-xl -z-10 animate-pulse" />
            )}

            <Handle type="target" position={Position.Left} className="!bg-slate-300 !w-2 !h-5 !rounded-sm !border-0 -ml-1" />
            <Handle type="source" position={Position.Right} className="!bg-rose-300 !w-2 !h-5 !rounded-sm !border-0 -mr-1" />

            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${down ? "bg-rose-100 text-rose-600" : `${s.iconBg} ${s.text}`}`}>
                        <Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                        <div className="text-[14px] font-medium text-slate-700 tracking-tight">{name}</div>
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
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="font-mono text-[10px] text-slate-400 uppercase">incidents</span>
                <span className="font-mono text-sm font-medium text-slate-600 tabular-nums">{incidentCount}</span>
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
        getGraph().then((g) => { setGraph(g); setLoading(false); }).catch(() => setLoading(false));
        return () => timers.current.forEach(clearTimeout);
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

    // ---- SIMULATE FAILURE: cascade propagation ----
    const runSimulation = useCallback(() => {
        if (simulating) return;
        const rootNode = nodes.find(n => n.data?.role === "root");
        if (!rootNode) return;

        setSimulating(true);
        setSelectedNodeId(null);
        timers.current.forEach(clearTimeout);
        timers.current = [];

        // reset all
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, failState: null } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, firing: false } })));

        // order victims by edge weight from root (heaviest cascades first)
        const rootEdges = edges.filter(e => e.source === rootNode.id).sort((a, b) => b.data.count - a.data.count);

        // step 0: root goes down
        const t0 = setTimeout(() => {
            setNodes(nds => nds.map(n => n.id === rootNode.id ? { ...n, data: { ...n.data, failState: "down" } } : n));
            setBlastCaption(`${rootNode.data.name} failing — predicting blast radius…`);
        }, 200);
        timers.current.push(t0);

        // each victim fails in sequence
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

        // finish
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

    if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400 font-mono">loading topology…</div>;

    return (
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
            <header className="h-16 shrink-0 border-b border-[#f3eef3] bg-white/80 backdrop-blur-md flex items-center justify-between px-8">
                <span className="font-mono text-[11px] text-slate-400 uppercase tracking-[0.15em]">System Topology</span>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-400">{graph?.nodeCount ?? "—"} components · {graph?.edgeCount ?? "—"} cascade paths</span>
                    {!simulating ? (
                        <button onClick={runSimulation}
                            className="flex items-center gap-1.5 font-mono text-[11px] bg-gradient-to-r from-rose-400 to-purple-400 text-white px-3 py-1.5 rounded-lg hover:from-rose-500 hover:to-purple-500 transition shadow-sm">
                            <Zap size={13} /> simulate failure
                        </button>
                    ) : (
                        <button onClick={resetSim}
                            className="font-mono text-[11px] bg-white border border-[#f3eef3] text-slate-500 px-3 py-1.5 rounded-lg hover:text-slate-700 transition">
                            reset
                        </button>
                    )}
                    <button onClick={() => fitView({ padding: 0.25, duration: 800 })} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition" title="Reset view">
                        <Focus size={16} />
                    </button>
                </div>
            </header>

            <main className="flex-1 relative">
                {/* STORY BANNER / BLAST CAPTION */}
                {(rootNode || blastCaption) && (
                    <div className={`absolute top-5 left-1/2 -translate-x-1/2 z-10 rounded-2xl backdrop-blur-xl border shadow-lg px-6 py-3 transition-all duration-300
                        ${blastCaption ? "bg-rose-50/90 border-rose-200" : "bg-white/85 border-rose-100/70"}`}>
                        {blastCaption ? (
                            <span className="font-mono text-[13px] text-rose-600">{blastCaption}</span>
                        ) : (
                            <div className="flex items-center gap-5">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500">{rootNode.name}</span>
                                    <span className="font-mono text-[11px] text-slate-400">is your single point of failure</span>
                                </div>
                                <div className="h-6 w-px bg-[#f3eef3]" />
                                <div className="font-mono text-[12px] text-slate-500">
                                    1 root → <span className="text-rose-500 font-medium">{victimCount} services</span> · <span className="text-purple-500 font-medium">{totalCascades}</span> total cascades
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <ReactFlow
                    nodes={nodes} edges={edges}
                    onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                    onNodeClick={(_, node) => !simulating && setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    onPaneClick={() => setSelectedNodeId(null)}
                    nodeTypes={nodeTypes} edgeTypes={edgeTypes}
                    minZoom={0.2} maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                    className="bg-[#fdfcfd]"
                >
                    <Background color="#e9d5ff" gap={22} size={1.5} />
                    <Controls className="!bg-white !border !border-[#f3eef3] !rounded-lg !shadow-sm" />

                    {selectedNodeData && !simulating && (
                        <Panel position="top-right" className="!m-6">
                            <div className="w-72 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#f3eef3] shadow-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">node inspector</span>
                                    <button onClick={() => setSelectedNodeId(null)} className="text-slate-300 hover:text-slate-500">✕</button>
                                </div>
                                <h2 className="text-xl font-light text-slate-800">{selectedNodeData.name}</h2>
                                <div className="font-mono text-[11px] text-slate-400 uppercase tracking-widest mt-1">{selectedNodeData.role} node</div>
                                <div className="mt-5 pt-5 border-t border-[#f3eef3]">
                                    <div className="text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-wider">total impact</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-light tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-purple-500">{selectedNodeData.incidentCount}</span>
                                        <span className="font-mono text-[10px] text-slate-400">incidents involved</span>
                                    </div>
                                </div>
                                {selectedNodeData.role === "root" && (
                                    <div className="mt-4 rounded-lg bg-rose-50/60 border border-rose-100 px-3 py-2 font-mono text-[11px] text-rose-500 leading-relaxed">
                                        ⚠ weakest link — try “simulate failure” to see its blast radius
                                    </div>
                                )}
                            </div>
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
        <div className="h-screen w-screen bg-[#fdfcfd] text-[#3a3a44] flex relative overflow-hidden selection:bg-rose-100">
            <div className="absolute top-[-20%] left-[-10%] h-[700px] w-[700px] rounded-full bg-rose-100/30 blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-100/20 blur-[150px] pointer-events-none" />
            <aside className="w-60 shrink-0 bg-[#fbf9fb] border-r border-[#f3eef3] flex flex-col relative z-20">
                <div className="px-5 py-5 border-b border-[#f3eef3] flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
                    <div className="h-7 w-7 rounded-md bg-gradient-to-br from-rose-300 via-fuchsia-300 to-purple-300 flex items-center justify-center text-white font-bold text-sm shadow-sm">F</div>
                    <span className="text-base font-medium tracking-tight text-slate-700">Forge</span>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                    <SideLink label="Overview" onClick={() => router.push("/")} />
                    <SideLink label="Topology" active />
                </nav>
            </aside>
            <ReactFlowProvider><TopologyCanvas /></ReactFlowProvider>
        </div>
    );
}

function SideLink({ label, active, onClick }) {
    return (
        <div onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-mono text-[13px] cursor-pointer transition-colors ${active ? "bg-rose-50/80 text-purple-600 font-medium" : "text-slate-400 hover:bg-rose-50/40 hover:text-slate-600"}`}>
            {label}
        </div>
    );
}