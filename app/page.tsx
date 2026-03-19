"use client";
import { useState } from "react";

export default function Home() {
  const [partido, setPartido] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analizar() {
    if (!partido.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partido }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data.result);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex gap-2 bg-purple-50 rounded-full px-3 py-1 mb-2">
            <span className="text-xs font-bold text-purple-600">⚽ SWARM</span>
            <span className="text-xs font-bold text-emerald-600">APOSTALA 🇵🇾</span>
          </div>
          <h1 className="text-xl font-bold">Análisis Rápido</h1>
        </div>

        {/* Input */}
        <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <input
            type="text"
            value={partido}
            onChange={(e) => setPartido(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analizar()}
            placeholder="Ej: River vs Boca Libertadores"
            className="w-full rounded-lg border px-3 py-2.5 mb-3 outline-none focus:border-purple-400"
          />
          <button
            onClick={analizar}
            disabled={loading || !partido.trim()}
            className="w-full rounded-xl py-3 font-semibold text-white disabled:bg-gray-300"
            style={{ background: loading ? "#ccc" : "linear-gradient(135deg, #8B5CF6, #6366F1)" }}
          >
            {loading ? "⏳ Analizando... (10-15 seg)" : "▶ Analizar"}
          </button>
          
          {loading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              Buscando datos y calculando valor...
            </div>
          )}
          
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-xl border-2 border-purple-200 p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold">🧠 Análisis Completo</span>
              <button 
                onClick={() => navigator.clipboard.writeText(result)}
                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
              >
                📋 Copiar
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-gray-800">
              {result}
            </pre>
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">⚽</div>
            <p>Escribí un partido para analizar</p>
            <div className="flex justify-center gap-2 mt-3 text-xs">
              <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded">🚩 Corners</span>
              <span className="bg-red-50 text-red-600 px-2 py-1 rounded">🟨 Tarjetas</span>
              <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">🎯 Disparos</span>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 mt-6">
          aposta.la • Juega responsablemente
        </div>
      </div>
    </div>
  );
}
