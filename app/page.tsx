"use client";

import { useState } from "react";

const AGENTS_INFO = [
  { id: "scout", name: "Scout", icon: "🔭", color: "#8B5CF6", role: "Odds" },
  { id: "corners", name: "Corners", icon: "🚩", color: "#F59E0B", role: "Esquinas" },
  { id: "tarjetas", name: "Tarjetas", icon: "🟨", color: "#EF4444", role: "Cards" },
  { id: "disparos", name: "Disparos", icon: "🎯", color: "#0EA5E9", role: "Tiros" },
  { id: "tactico", name: "Táctico", icon: "📋", color: "#6366F1", role: "Lesiones" },
  { id: "h2h", name: "H2H", icon: "📜", color: "#A855F7", role: "Historial" },
  { id: "esceptico", name: "Escéptico", icon: "🔍", color: "#DC2626", role: "Trampas" },
  { id: "matematico", name: "Matemático", icon: "🧮", color: "#10B981", role: "EV" },
  { id: "sintetizador", name: "Síntesis", icon: "🧠", color: "#7C3AED", role: "Final" },
];

const MODOS: Record<string, string[]> = {
  completo: ["scout", "corners", "tarjetas", "disparos", "tactico", "h2h", "esceptico", "matematico", "sintetizador"],
  rapido: ["scout", "matematico", "sintetizador"],
  corners: ["scout", "corners"],
  tarjetas: ["scout", "tarjetas"],
  disparos: ["scout", "disparos"],
};

function AgentCard({ agent, result, isActive }: { agent: typeof AGENTS_INFO[0]; result: string | null; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shortText = result?.slice(0, 180) || "";
  const isLong = (result?.length || 0) > 180;

  return (
    <div className="relative rounded-xl border p-3 bg-white transition-all"
      style={{ borderColor: result ? `${agent.color}50` : "#e5e7eb" }}>
      {isActive && (
        <div className="absolute left-0 right-0 top-0 h-1 rounded-t-xl animate-pulse"
          style={{ background: agent.color }} />
      )}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-base"
          style={{ background: result ? `${agent.color}20` : "#f3f4f6" }}>
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: result ? "#111" : "#aaa" }}>{agent.name}</div>
          <div className="text-[10px] text-gray-400">{agent.role}</div>
        </div>
        {isActive && <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: agent.color }} />}
        {result && !isActive && <span className="text-sm" style={{ color: agent.color }}>✓</span>}
      </div>
      {result && (
        <div className="mt-2 rounded-lg bg-gray-50 p-2">
          <pre className="whitespace-pre-wrap text-[11px] text-gray-700 font-sans leading-relaxed">
            {expanded ? result : shortText}{!expanded && isLong && "..."}
          </pre>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)}
              className="mt-1 text-[10px] font-medium" style={{ color: agent.color }}>
              {expanded ? "▲ Menos" : "▼ Más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [partido, setPartido] = useState("");
  const [modo, setModo] = useState("rapido");
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);

  const agentsToRun = MODOS[modo] || MODOS.rapido;

  async function runAnalysis() {
    if (!partido.trim() || loading) return;

    setLoading(true);
    setError("");
    setResults({});
    setStep(0);

    const allResults: Record<string, string> = {};

    // Llamar a cada agente uno por uno
    for (let i = 0; i < agentsToRun.length; i++) {
      const agentId = agentsToRun[i];
      setActiveAgent(agentId);
      setStep(i + 1);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partido,
            agentId,
            previousResults: allResults
          }),
        });

        const data = await res.json();

        if (data.error) {
          setError(`${agentId}: ${data.error}`);
          break;
        }

        allResults[agentId] = data.result;
        setResults({ ...allResults });

      } catch (err: any) {
        setError(`Error en ${agentId}: ${err.message}`);
        break;
      }
    }

    setLoading(false);
    setActiveAgent(null);
  }

  const copyAll = () => {
    const txt = Object.entries(results)
      .map(([id, text]) => {
        const agent = AGENTS_INFO.find(a => a.id === id);
        return `${agent?.icon || ""} ${agent?.name || id}\n${text}`;
      })
      .join("\n\n───────────────\n\n");
    navigator.clipboard.writeText(`⚽ SWARM ANÁLISIS - ${partido}\n\n${txt}`);
  };

  const visibleAgents = AGENTS_INFO.filter(a => agentsToRun.includes(a.id));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-3xl">
        
        {/* Header */}
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 mb-2">
            <span className="text-[11px] font-bold text-purple-600">⚽ SWARM PRO</span>
            <span className="text-purple-300">×</span>
            <span className="text-[11px] font-bold text-emerald-600">APOSTALA 🇵🇾</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Análisis con IA</h1>
        </div>

        {/* Input */}
        <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
          <input
            type="text"
            value={partido}
            onChange={(e) => setPartido(e.target.value)}
            placeholder="Ej: River vs Boca Libertadores"
            className="mb-3 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-purple-400"
          />

          {/* Modo */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              { id: "rapido", label: "⚡ Rápido", desc: "3 agentes" },
              { id: "completo", label: "🔥 Completo", desc: "9 agentes" },
              { id: "corners", label: "🚩 Corners", desc: "" },
              { id: "tarjetas", label: "🟨 Tarjetas", desc: "" },
              { id: "disparos", label: "🎯 Disparos", desc: "" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModo(m.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  modo === m.id
                    ? "border-purple-500 bg-purple-50 text-purple-700 font-medium"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading || !partido.trim()}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:bg-gray-300"
            style={{
              background: loading || !partido.trim() ? undefined : "linear-gradient(135deg, #8B5CF6, #6366F1)",
            }}
          >
            {loading ? `⏳ ${AGENTS_INFO.find(a => a.id === activeAgent)?.name || "..."} (${step}/${agentsToRun.length})` : "▶ Analizar"}
          </button>

          {loading && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{ width: `${(step / agentsToRun.length) * 100}%` }}
              />
            </div>
          )}

          {error && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-600">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Agents Grid */}
        {(loading || Object.keys(results).length > 0) && (
          <>
            <div className="mb-2 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-gray-400">Agentes</span>
              {Object.keys(results).length > 0 && !loading && (
                <button onClick={copyAll} className="text-[10px] text-gray-500 hover:text-gray-700">
                  📋 Copiar
                </button>
              )}
            </div>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 mb-4">
              {visibleAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  result={results[agent.id] || null}
                  isActive={activeAgent === agent.id}
                />
              ))}
            </div>
          </>
        )}

        {/* Veredicto */}
        {results.sintetizador && (
          <div className="rounded-xl border-2 border-purple-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🧠</span>
              <span className="font-semibold text-gray-900">Veredicto Final</span>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
              {results.sintetizador}
            </pre>
          </div>
        )}

        {/* Empty */}
        {!loading && Object.keys(results).length === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">⚽</div>
            <p className="text-gray-400 text-sm">Escribí el partido para comenzar</p>
          </div>
        )}

        <div className="mt-6 text-center text-[10px] text-gray-400">
          aposta.la • Juega responsablemente
        </div>
      </div>
    </div>
  );
}
