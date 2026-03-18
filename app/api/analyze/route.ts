// app/api/analyze/route.ts
// Procesa UN agente a la vez para evitar timeout de Vercel

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const CASA_APUESTAS = "Apostala (aposta.la) - Paraguay";

const AGENTS: Record<string, { name: string; search: boolean; prompt: string }> = {
  scout: {
    name: "🔭 Scout",
    search: true,
    prompt: `Eres scout de datos para apuestas en ${CASA_APUESTAS}.
Busca con web_search:
1. Odds del partido: 1X2, Over/Under 2.5, BTTS
2. Equipos, competición, fecha/hora
3. Forma últimos 5 partidos

Formato compacto (máx 8 líneas):
═══ ODDS ═══
1X2: [L] | [E] | [V]
O/U 2.5: [over] | [under]
BTTS: [sí] | [no]
═══ CONTEXTO ═══
[2-3 líneas]`
  },
  corners: {
    name: "🚩 Corners",
    search: true,
    prompt: `Especialista en CORNERS. Busca promedio corners cada equipo y H2H.
Máx 6 líneas. Termina con:
OVER 9.5: XX% | OVER 10.5: XX%
MEJOR APUESTA: [mercado @ cuota]`
  },
  tarjetas: {
    name: "🟨 Tarjetas",
    search: true,
    prompt: `Especialista en TARJETAS. Busca historial árbitro y promedios equipos.
Máx 6 líneas. Termina con:
ÁRBITRO: [nombre] - [X.X/partido]
OVER 3.5: XX% | OVER 4.5: XX%
MEJOR APUESTA: [mercado @ cuota]`
  },
  disparos: {
    name: "🎯 Disparos",
    search: true,
    prompt: `Especialista en DISPAROS. Busca promedio tiros a portería y xG.
Máx 6 líneas. Termina con:
TIROS ESPERADOS: XX
MEJOR APUESTA: [mercado @ cuota]`
  },
  tactico: {
    name: "📋 Táctico",
    search: true,
    prompt: `Analista táctico. Busca lesiones y alineación probable.
Máx 4 líneas. FACTOR_CLAVE: [lo más determinante]`
  },
  h2h: {
    name: "📜 Historiador",
    search: true,
    prompt: `H2H. Busca últimos 5 enfrentamientos con resultados.
Máx 4 líneas con datos concretos.`
  },
  esceptico: {
    name: "🔍 Escéptico",
    search: false,
    prompt: `Escéptico. Analiza los datos anteriores:
¿Qué mercado está INFLADO? ¿Dónde hay VALOR OCULTO?
Máx 4 líneas.
TRAMPA: [mercado sin valor]
VALOR: [mercado oculto]`
  },
  matematico: {
    name: "🧮 Matemático",
    search: false,
    prompt: `Matemático. Con los datos, calcula EV y Kelly para cada mercado.
═══ TOP 3 VALOR ═══
1. [mercado] @ [cuota] → EV: +XX%
2. [mercado] @ [cuota] → EV: +XX%
3. [mercado] @ [cuota] → EV: +XX%`
  },
  sintetizador: {
    name: "🧠 Sintetizador",
    search: false,
    prompt: `Sintetizador final. Produce veredicto COMPACTO:

⚽ PREDICCIÓN: [resultado]
📊 CONFIANZA: XX%

🏆 TOP 3 APUESTAS:
1. [MERCADO] @ [cuota] | EV +XX%
2. [MERCADO] @ [cuota] | EV +XX%
3. [MERCADO] @ [cuota] | EV +XX%

🚩 CORNERS: [1 línea]
🟨 TARJETAS: [1 línea]
🎯 DISPAROS: [1 línea]

⚠️ EVITAR: [mercados trampa]
💡 MEJOR APUESTA: [en 1 línea]`
  }
};

export const maxDuration = 60; // Vercel Pro permite hasta 60s

export async function POST(request: NextRequest) {
  try {
    const { partido, agentId, previousResults } = await request.json();

    if (!partido || !agentId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const agent = AGENTS[agentId];
    if (!agent) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY en Vercel" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Preparar contexto según el agente
    let context = "";
    if (agentId === "scout") {
      context = `Partido: ${partido}\nCasa de apuestas: ${CASA_APUESTAS}`;
    } else if (["corners", "tarjetas", "disparos", "tactico", "h2h"].includes(agentId)) {
      context = `DATOS:\n${previousResults?.scout || ""}\n\nPartido: ${partido}`;
    } else {
      // Agentes de síntesis reciben todo
      context = Object.entries(previousResults || {})
        .map(([id, text]) => `═══ ${AGENTS[id]?.name || id} ═══\n${text}`)
        .join("\n\n");
    }

    // Llamar a Claude
    const params: any = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: `${agent.prompt}\n\n---\n\n${context}` }]
    };

    if (agent.search) {
      params.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const message = await client.messages.create(params);

    let result = "";
    for (const block of message.content) {
      if (block.type === "text") {
        result += block.text;
      }
    }

    return NextResponse.json({ 
      success: true, 
      agentId,
      name: agent.name,
      result: result.trim()
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Error desconocido",
      agentId: "error"
    }, { status: 500 });
  }
}
