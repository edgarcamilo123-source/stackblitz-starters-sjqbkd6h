// app/api/analyze/route.ts
// UN SOLO AGENTE - Todo en ~10-15 segundos

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `Eres analista de apuestas para Apostala (Paraguay).

Busca info del partido y produce este análisis:

═══════════════════════════════════════
⚽ [LOCAL] vs [VISITANTE]
📅 [Fecha] | 🏟️ [Competición]
═══════════════════════════════════════

📊 ODDS
1X2: [L] | [E] | [V]
O/U 2.5: [over] | [under]
BTTS: [sí] | [no]

🚩 CORNERS: Total esperado XX | Over 9.5: XX%
🟨 TARJETAS: Árbitro [nombre] [X.X/partido] | Over 3.5: XX%
🎯 DISPAROS: XX esperados

📋 CONTEXTO
• Local: [forma, posición]
• Visitante: [forma, posición]  
• H2H: [últimos 3]
• Lesiones: [clave]

═══════════════════════════════════════
🏆 TOP 3 APUESTAS
═══════════════════════════════════════

1️⃣ [MERCADO] @ [cuota] → EV +XX%
2️⃣ [MERCADO] @ [cuota] → EV +XX%
3️⃣ [MERCADO] @ [cuota] → EV +XX%

⚠️ EVITAR: [mercado trampa]
💡 MEJOR: [recomendación final]`;

export async function POST(request: NextRequest) {
  try {
    const { partido } = await request.json();
    if (!partido) return NextResponse.json({ error: "Falta partido" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Falta API KEY" }, { status: 500 });

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: `${PROMPT}\n\nPartido: ${partido}` }]
    });

    let result = "";
    for (const block of message.content) {
      if (block.type === "text") result += block.text;
    }

    return NextResponse.json({ success: true, result: result.trim() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
