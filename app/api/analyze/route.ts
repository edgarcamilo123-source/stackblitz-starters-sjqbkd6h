// app/api/analyze/route.ts
// OPTIMIZADO: Solo Scout usa web_search para evitar timeout

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const CASA_APUESTAS = "Apostala (aposta.la) - Paraguay";

const AGENTS: Record<string, { name: string; search: boolean; prompt: string }> = {
  scout: {
    name: "🔭 Scout",
    search: true, // ÚNICO que busca en web
    prompt: `Eres scout de datos para ${CASA_APUESTAS}. Busca TODO sobre el partido:

1. ODDS: 1X2, Over/Under 2.5, BTTS, Handicap
2. Equipos, competición, fecha/hora
3. Forma últimos 5 partidos de cada equipo
4. CORNERS: promedio de corners de cada equipo
5. TARJETAS: árbitro asignado y su promedio de tarjetas
6. DISPAROS: promedio tiros a portería
7. H2H: últimos 5 enfrentamientos
8. Lesiones importantes

Formato:
═══ ODDS ═══
1X2: [L] | [E] | [V]
O/U 2.5: [over] | [under]
BTTS: [sí] | [no]

═══ CORNERS ═══
[Promedio corners local] | [Promedio visitante]

═══ TARJETAS ═══
Árbitro: [nombre] - [X.X tarjetas/partido]

═══ DISPAROS ═══
[Tiros a portería promedio]

═══ H2H ═══
[Últimos 5 resultados]

═══ CONTEXTO ═══
[Forma, lesiones, qué se juegan]`
  },
  corners: {
    name: "🚩 Corners",
    search: false, // Ya no busca, usa datos del Scout
    prompt: `Analista de CORNERS. Con los datos del Scout, calcula:
- Total corners esperados
- Probabilidad Over 9.5 y Over 10.5
- Mejor apuesta de corners

Formato (máx 5 líneas):
TOTAL ESPERADO: XX corners
OVER 9.5: XX% | OVER 10.5: XX%
MEJOR APUESTA: [mercado] @ [cuota estimada]`
  },
  tarjetas: {
    name: "🟨 Tarjetas",
    search: false,
    prompt: `Analista de TARJETAS. Con los datos del Scout, calcula:
- Total tarjetas esperadas según árbitro
- Probabilidad Over 3.5 y Over 4.5

Formato (máx 5 líneas):
ÁRBITRO: [nombre] - [promedio]
OVER 3.5: XX% | OVER 4.5: XX%
MEJOR APUESTA: [mercado] @ [cuota estimada]`
  },
  disparos: {
    name: "🎯 Disparos",
    search: false,
    prompt: `Analista de DISPAROS. Con los datos del Scout:
- Tiros a portería esperados
- Qué arquero será más exigido

Formato (máx 4 líneas):
TIROS ESPERADOS: XX
ARQUERO MÁS EXIGIDO: [nombre]
MEJOR APUESTA: [mercado]`
  },
  tactico: {
    name: "📋 Táctico",
    search: false,
    prompt: `Táctico. Con los datos del Scout, identifica:
- Lesiones clave
- Factor determinante del partido

Máx 3 líneas.
FACTOR_CLAVE: [lo más importante]`
  },
  h2h: {
    name: "📜 H2H",
    search: false,
    prompt: `Historiador. Con los datos del Scout, analiza el H2H:
- Tendencia histórica
- Quién tiene ventaja psicológica

Máx 3 líneas.`
  },
  esceptico: {
    name: "🔍 Escéptico",
    search: false,
    prompt: `Escéptico. Analiza TODO lo anterior:
- ¿Qué mercado está INFLADO por las casas?
- ¿Dónde hay VALOR OCULTO?

Máx 3 líneas.
TRAMPA: [mercado sin valor]
VALOR: [mercado oculto]`
  },
  matematico: {
    name: "🧮 Matemático",
    search: false,
    prompt: `Matemático. Calcula EV para los mejores mercados:
- EV = (Prob_Real × Cuota) - 1
- Kelly% = ((P × Cuota - 1) / (Cuota - 1)) × 100

═══ TOP 3 VALOR ═══
1. [mercado] @ [cuota] → EV: +XX%
2. [mercado] @ [cuota] → EV: +XX%
3. [mercado] @ [cuota] → EV: +XX%`
  },
  sintetizador: {
    name: "🧠 Síntesis",
    search: false,
    prompt: `Sintetizador. Veredicto FINAL compacto:

⚽ PREDICCIÓN: [resultado]
📊 CONFIANZA: XX%

🏆 TOP 3 APUESTAS:
1. [MERCADO] @ [cuota] | EV +XX%
2. [MERCADO] @ [cuota] | EV +XX%
3. [MERCADO] @ [cuota] | EV +XX%

🚩 CORNERS: [recomendación corta]
🟨 TARJETAS: [recomendación corta]
🎯 DISPAROS: [recomendación corta]

⚠️ EVITAR: [mercado trampa]
💡 MEJOR APUESTA: [en 1 línea]`
  }
};

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
      return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Preparar contexto
    let context = "";
    if (agentId === "scout") {
      context = `Partido: ${partido}\nCasa de apuestas: ${CASA_APUESTAS}`;
    } else {
      // Todos los demás usan los datos del Scout
      const scoutData = previousResults?.scout || "";
      const allData = Object.entries(previousResults || {})
        .map(([id, text]) => `═══ ${AGENTS[id]?.name || id} ═══\n${text}`)
        .join("\n\n");
      
      context = agentId === "sintetizador" || agentId === "matematico" || agentId === "esceptico"
        ? allData
        : `DATOS DEL PARTIDO:\n${scoutData}\n\nPartido: ${partido}`;
    }

    // Llamar a Claude
    const params: any = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: `${agent.prompt}\n\n---\n\n${context}` }]
    };

    // Solo Scout usa web_search
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
      error: error.message || "Error desconocido"
    }, { status: 500 });
  }
}
