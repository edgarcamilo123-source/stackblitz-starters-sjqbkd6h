"use client";

import { useState } from "react";

const AGENTS_INFO = [
  { id: "scout", name: "Scout", icon: "🔭", color: "#8B5CF6", role: "Odds principales" },
  { id: "corners", name: "Corners", icon: "🚩", color: "#F59E0B", role: "Tiros de esquina" },
  { id: "tarjetas", name: "Tarjetas", icon: "🟨", color: "#EF4444", role: "Amarillas y rojas" },
  { id: "disparos", name: "Disparos", icon: "🎯", color: "#0EA5E9", role: "Tiros a portería" },
  { id: "tactico", name: "Táctico", icon: "📋", color: "#6366F1", role: "Lesiones y sistema" },
  { id: "h2h", name: "Historiador", icon: "📜", color: "#A855F7", role: "H2H y contexto" },
  { id: "esceptico", name: "Escéptico", icon: "🔍", color: "#DC2626", role: "Busca trampas" },
  { id: "matematico", name: "Matemático", icon: "🧮", color: "#10B981", role: "EV y Kelly" },
  { id: "sintetizador", name: "Sintetizador", icon: "🧠", color: "#7C3AED", role: "Veredicto final" },
];

interface AgentCardProps {
  agent: typeof AGENTS_INFO[0];
  result: string | null;
  isActive: boolean;
}

function AgentCard({ agent, result, isActive }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const shortText = result?.slice(0, 200) || "";
  const isLong = (result?.length || 0) > 200;

  return (
    <div
      className="relative rounded-xl border p-3 transition-all"
      style={{
        borderColor: result ? `${agent.color}40` : "#e5e7eb",
        background: "#fff",
      }}
    >
      {isActive && (
        <div
          className="absolute left-0 right-0 top-0 h-1 animate-pulse rounded-t-xl"
          style={{ background: agent.color }}
        />
      )}

      <div className="flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{
            background: result ? `${agent.color}15` : "#f3f4f6",
            border: result ? `2px solid ${agent.color}30` : "none",
          }}
        >
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: result ? "#111" : "#9ca3af" }}>
            {agent.name}
          </div>
          <div className="text-xs text-gray-400 truncate">{agent.role}</div>
        </div>
        {isActive && (
          <div className="flex items-center gap-1">
            <div
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: agent.color }}
            />
          </div>
        )}
        {result && !isActive && <span style={{ color: agent.color }}>✓</span>}
      </div>

      {result && (
        <div className="mt-2 rounded-lg bg-gray-50 p-2">
          <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans leading-relaxed">
            {expanded ? result : shortText}
            {!expanded && isLong && "..."}
          </pre>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-medium"
              style={{ color: agent.color }}
            >
              {expanded ? "▲ Ver menos" : "▼ Ver más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [partido, setPartido] = useState("");
  const [contexto, setContexto] = useState("");
  const [modo, setModo] = useState("completo");
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);

  async function runAnalysis() {
    if (!partido.trim() || loading) return;

    setLoading(true);
    setError("");
    setResults({});
    setActiveAgent("scout");
    setStep(1);

    // Determinar total de pasos según el modo
    const steps = modo === "completo" ? 9 : modo === "rapido" ? 3 : 2;
    setTotalSteps(steps);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partido, contexto, modo }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results);
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
      setActiveAgent(null);
    }
  }

  const copyResults = () => {
    const header = `═══════════════════════════════════════\n⚽ ANÁLISIS SWARM - APOSTALA\n📅 ${new Date().toLocaleDateString()}\n🏟️ ${partido}\n═══════════════════════════════════════\n\n`;
    const body = AGENTS_INFO.filter((a) => results[a.id])
      .map((a) => `${a.icon} ${a.name.toUpperCase()}\n${results[a.id]}`)
      .join("\n\n─────────────────────────────────\n\n");
    navigator.clipboard.writeText(header + body);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5">
            <span className="text-xs font-semibold tracking-wide text-purple-600">
              ⚽ SWARM ANALYTICS PRO
            </span>
            <span className="text-purple-300">×</span>
            <span className="text-xs font-semibold text-emerald-600">APOSTALA 🇵🇾</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Análisis con 9 Agentes IA</h1>
          <p className="mt-1 text-sm text-gray-500">
            Goles, corners, tarjetas, disparos — todos los mercados
          </p>
        </div>

        {/* Input Card */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Partido a analizar
          </label>
          <input
            type="text"
            value={partido}
            onChange={(e) => setPartido(e.target.value)}
            placeholder="Ej: Manchester City vs Real Madrid Champions League"
            className="mb-4 w-full rounded-lg border border-gray-200 px-4 py-3 text-base outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />

          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Contexto <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <textarea
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            placeholder="Ej: Partido de vuelta, ida terminó 3-0..."
            rows={2}
            className="mb-4 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />

          {/* Modo selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { id: "completo", label: "Completo (9 agentes)", time: "~2 min" },
              { id: "rapido", label: "Rápido (Top 3)", time: "~30s" },
              { id: "corners", label: "Solo Corners", time: "~20s" },
              { id: "tarjetas", label: "Solo Tarjetas", time: "~20s" },
              { id: "disparos", label: "Solo Disparos", time: "~20s" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModo(m.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  modo === m.id
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading || !partido.trim()}
            className="w-full rounded-xl py-3.5 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
            style={{
              background: loading || !partido.trim() ? undefined : "linear-gradient(135deg, #8B5CF6, #6366F1)",
              boxShadow: loading || !partido.trim() ? undefined : "0 4px 14px rgba(139, 92, 246, 0.25)",
            }}
          >
            {loading ? `⏳ Analizando... (${step}/${totalSteps})` : "▶ Iniciar análisis"}
          </button>

          {loading && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Agents Grid */}
        {(loading || Object.keys(results).length > 0) && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Panel de analistas
              </span>
              {Object.keys(results).length > 0 && !loading && (
                <button
                  onClick={copyResults}
                  className="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                  📋 Copiar todo
                </button>
              )}
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AGENTS_INFO.filter(
                (a) =>
                  modo === "completo" ||
                  (modo === "rapido" && ["scout", "matematico", "sintetizador"].includes(a.id)) ||
                  (modo === "corners" && ["scout", "corners"].includes(a.id)) ||
                  (modo === "tarjetas" && ["scout", "tarjetas"].includes(a.id)) ||
                  (modo === "disparos" && ["scout", "disparos"].includes(a.id))
              ).map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  result={results[agent.id] || null}
                  isActive={activeAgent === agent.id}
                />
              ))}
            </div>

            {/* Veredicto Final */}
            {results.sintetizador && (
              <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">🧠</span>
                  <span className="font-semibold text-gray-900">Veredicto Final</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                  {results.sintetizador}
                </pre>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && Object.keys(results).length === 0 && (
          <div className="py-16 text-center">
            <div className="mb-4 text-5xl">⚽</div>
            <p className="text-gray-400">Escribí el partido para comenzar</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-600">
                🚩 Corners
              </span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600">
                🟨 Tarjetas
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-600">
                🎯 Disparos
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600">
                ⚽ Goles
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Verifica las cuotas en aposta.la antes de apostar • Juega responsablemente
        </div>
      </div>
    </div>
  );
}
