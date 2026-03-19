// app/api/analyze/route.ts
// STREAMING - Envía resultados de cada agente en tiempo real (sin timeout)

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const CASA_APUESTAS = "Apostala (aposta.la) - Paraguay";

const AGENTS = [
  {
    id: "scout",
    name: "🔭 Scout",
    search: true,
    prompt: `Scout de datos para ${CASA_APUESTAS}. Busca TODO:
- Odds 1X2, O/U 2.5, BTTS
- Corners promedio de cada equipo
- Árbitro y su promedio de tarjetas
- Tiros a portería promedio
- H2H últimos 5 partidos
- Forma y lesiones

Formato compacto (máx 12 líneas).`
  },
  {
    id: "corners",
    name: "🚩 Corners",
    search: false,
    prompt: `Analista CORNERS. Con los datos:
TOTAL ESPERADO: XX | OVER 9.5: XX% | OVER 10.5: XX%
MEJOR APUESTA: [mercado] @ [cuota]
(máx 3 líneas)`
  },
  {
    id: "tarjetas",
    name: "🟨 Tarjetas",
    search: false,
    prompt: `Analista TARJETAS. Con los datos:
ÁRBITRO: [nombre] [X.X/partido]
OVER 3.5: XX% | OVER 4.5: XX%
MEJOR APUESTA: [mercado]
(máx 3 líneas)`
  },
  {
    id: "disparos",
    name: "🎯 Disparos",
    search: false,
    prompt: `Analista DISPAROS:
ESPERADOS: XX tiros | ARQUERO EXIGIDO: [nombre]
MEJOR APUESTA: [mercado]
(máx 2 líneas)`
  },
  {
    id: "tactico",
    name: "📋 Táctico",
    search: false,
    prompt: `Táctico. FACTOR_CLAVE: [lo más importante del partido] (1 línea)`
  },
  {
    id: "h2h",
    name: "📜 H2H",
    search: false,
    prompt: `H2H. TENDENCIA: [patrón de los últimos enfrentamientos] (1 línea)`
  },
  {
    id: "esceptico",
    name: "🔍 Escéptico",
    search: false,
    prompt: `Escéptico. Cuestiona todo:
TRAMPA: [mercado inflado sin valor]
VALOR OCULTO: [mercado que nadie ve]
(máx 2 líneas)`
  },
  {
    id: "matematico",
    name: "🧮 Matemático",
    search: false,
    prompt: `Matemático. Calcula EV = (Prob × Cuota) - 1 para cada mercado.
TOP 3:
1. [mercado] @ [cuota] → EV +XX%
2. [mercado] @ [cuota] → EV +XX%
3. [mercado] @ [cuota] → EV +XX%`
  },
  {
    id: "sintetizador",
    name: "🧠 Síntesis",
    search: false,
    prompt: `VEREDICTO FINAL:

⚽ PREDICCIÓN: [resultado]
📊 CONFIANZA: XX%

🏆 TOP 3 APUESTAS:
1️⃣ [MERCADO] @ [cuota] | EV +XX%
2️⃣ [MERCADO] @ [cuota] | EV +XX%  
3️⃣ [MERCADO] @ [cuota] | EV +XX%

🚩 CORNERS: [recomendación]
🟨 TARJETAS: [recomendación]
🎯 DISPAROS: [recomendación]

⚠️ EVITAR: [mercado trampa]
💡 MEJOR APUESTA: [en 1 línea]`
  }
];

async function callClaude(client: Anthropic, prompt: string, context: string, useSearch: boolean) {
  const params: any = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [{ role: "user", content: `${prompt}\n\n---\n\n${context}` }]
  };
  if (useSearch) {
    params.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }
  const message = await client.messages.create(params);
  return message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
}

export async function POST(request: NextRequest) {
  const { partido } = await request.json();
  
  if (!partido) {
    return new Response(JSON.stringify({ error: "Falta partido" }), { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Falta API KEY" }), { status: 500 });
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const results: Record<string, string> = {};
      
      for (const agent of AGENTS) {
        try {
          // Preparar contexto
          let context = "";
          if (agent.id === "scout") {
            context = `Partido: ${partido}\nCasa: ${CASA_APUESTAS}`;
          } else if (["esceptico", "matematico", "sintetizador"].includes(agent.id)) {
            context = Object.entries(results).map(([id, text]) => {
              const a = AGENTS.find(x => x.id === id);
              return `${a?.name || id}:\n${text}`;
            }).join("\n\n");
          } else {
            context = `DATOS:\n${results.scout || ""}\n\nPartido: ${partido}`;
          }

          // Llamar a Claude
          const result = await callClaude(client, agent.prompt, context, agent.search);
          results[agent.id] = result;

          // Enviar resultado al cliente
          const data = JSON.stringify({ 
            agentId: agent.id, 
            name: agent.name, 
            result,
            done: agent.id === "sintetizador"
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            agentId: agent.id, 
            error: error.message 
          })}\n\n`));
        }
      }
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
