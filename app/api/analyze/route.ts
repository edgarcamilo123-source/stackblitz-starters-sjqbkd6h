// app/api/analyze/route.ts
// API Route que ejecuta el swarm de agentes

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const CASA_APUESTAS = "Apostala (aposta.la) - Paraguay";

const AGENTS = [
  {
    id: "scout",
    name: "🔭 Scout",
    search: true,
    prompt: `Eres scout de datos para apuestas en ${CASA_APUESTAS}.
Busca con web_search:
1. Odds del partido: 1X2, Over/Under 2.5, BTTS, Handicap
2. Equipos, competición, fecha/hora
3. Posición en tabla y forma últimos 5 partidos

Formato:
═══ ODDS ═══
1X2: [L] | [E] | [V]
O/U 2.5: [over] | [under]
BTTS: [sí] | [no]

═══ CONTEXTO ═══
[Info relevante]`
  },
  {
    id: "corners",
    name: "🚩 Corners",
    search: true,
    prompt: `Especialista en CORNERS. Busca promedio de corners de cada equipo, total en partidos, H2H corners.

Termina con:
═══ CORNERS ═══
TOTAL ESPERADO: XX corners
OVER 9.5: XX% | OVER 10.5: XX%
MEJOR APUESTA: [mercado]`
  },
  {
    id: "tarjetas",
    name: "🟨 Tarjetas",
    search: true,
    prompt: `Especialista en TARJETAS. Busca promedio de cada equipo, historial del árbitro, jugadores propensos.

Termina con:
═══ TARJETAS ═══
ÁRBITRO: [nombre] - [X.X/partido]
OVER 3.5: XX% | OVER 4.5: XX%
MEJOR APUESTA: [mercado]`
  },
  {
    id: "disparos",
    name: "🎯 Disparos",
    search: true,
    prompt: `Especialista en DISPAROS. Busca promedio tiros a portería, xG, arquero más exigido.

Termina con:
═══ DISPAROS ═══
TIROS A PORTERÍA ESPERADOS: XX
ARQUERO MÁS EXIGIDO: [nombre]
MEJOR APUESTA: [mercado]`
  },
  {
    id: "tactico",
    name: "📋 Táctico",
    search: true,
    prompt: `Analista táctico. Busca lesiones, alineación probable, sistema táctico. Máx 4 líneas.
FACTOR_CLAVE: [lo más determinante]`
  },
  {
    id: "h2h",
    name: "📜 Historiador",
    search: true,
    prompt: `Experto en H2H. Busca últimos 6 enfrentamientos con goles, qué se juega cada equipo. Máx 4 líneas.`
  },
  {
    id: "esceptico",
    name: "🔍 Escéptico",
    search: false,
    prompt: `Escéptico del swarm. Analiza reportes anteriores:
1. ¿Qué mercados INFLADOS?
2. ¿Dónde hay VALOR OCULTO?
3. ¿Corners/tarjetas/disparos: cuál tiene más edge?

TRAMPA: [mercado sin valor]
VALOR: [mercado oculto]`
  },
  {
    id: "matematico",
    name: "🧮 Matemático",
    search: false,
    prompt: `Matemático de value betting. Calcula para cada mercado:
- Prob_Implícita = (1/cuota) × 100%
- EV = (Prob_Real × Cuota) - 1
- Kelly% = ((Prob × Cuota - 1) / (Cuota - 1)) × 100%

═══ TOP 5 VALOR ═══
1. [mercado] @ [cuota] → EV: +XX%
2-5. [continuar]`
  },
  {
    id: "sintetizador",
    name: "🧠 Sintetizador",
    search: false,
    prompt: `Sintetizador final para ${CASA_APUESTAS}.

⚽ PREDICCIÓN: [resultado]
📊 CONFIANZA: XX%

🏆 TOP 3 APUESTAS:
1. [MERCADO] @ [cuota] | EV +XX%
2. [MERCADO] @ [cuota] | EV +XX%
3. [MERCADO] @ [cuota] | EV +XX%

🚩 CORNERS: [recomendación]
🟨 TARJETAS: [recomendación]
🎯 DISPAROS: [recomendación]

⚠️ EVITAR: [mercados trampa]
💡 MEJOR APUESTA: [en 1 línea]`
  }
];

async function callClaude(client: Anthropic, prompt: string, context: string, useSearch: boolean) {
  try {
    const params: any = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: `${prompt}\n\n---\n\n${context}` }]
    };

    if (useSearch) {
      params.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const message = await client.messages.create(params);

    let result = "";
    for (const block of message.content) {
      if (block.type === "text") {
        result += block.text + "\n";
      }
    }

    return result.trim();
  } catch (error: any) {
    console.error("Error calling Claude:", error);
    return `Error: ${error.message}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { partido, contexto, modo } = await request.json();

    if (!partido) {
      return NextResponse.json({ error: "Falta el partido" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Determinar qué agentes correr según el modo
    let agentsToRun = AGENTS;
    if (modo === "rapido") {
      agentsToRun = AGENTS.filter(a => ["scout", "matematico", "sintetizador"].includes(a.id));
    } else if (modo === "corners") {
      agentsToRun = AGENTS.filter(a => ["scout", "corners"].includes(a.id));
    } else if (modo === "tarjetas") {
      agentsToRun = AGENTS.filter(a => ["scout", "tarjetas"].includes(a.id));
    } else if (modo === "disparos") {
      agentsToRun = AGENTS.filter(a => ["scout", "disparos"].includes(a.id));
    }

    const results: Record<string, string> = {};

    // Ejecutar agentes secuencialmente
    for (const agent of agentsToRun) {
      let inputContext = "";

      if (agent.id === "scout") {
        inputContext = `Partido: ${partido}${contexto ? "\nContexto: " + contexto : ""}\nCasa de apuestas: ${CASA_APUESTAS}`;
      } else if (["corners", "tarjetas", "disparos", "tactico", "h2h"].includes(agent.id)) {
        inputContext = `DATOS DEL PARTIDO:\n${results.scout || ""}\n\nPartido: ${partido}`;
      } else {
        inputContext = Object.entries(results)
          .map(([id, text]) => `═══ ${AGENTS.find(a => a.id === id)?.name || id} ═══\n${text}`)
          .join("\n\n");
      }

      const result = await callClaude(client, agent.prompt, inputContext, agent.search);
      results[agent.id] = result;
    }

    return NextResponse.json({ 
      success: true, 
      results,
      agentes: agentsToRun.map(a => ({ id: a.id, name: a.name }))
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
