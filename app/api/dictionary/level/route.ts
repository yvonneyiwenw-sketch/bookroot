import { NextResponse } from "next/server";

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["evaluations"],
  properties: {
    evaluations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "term",
          "normalizedTerm",
          "level",
          "confidence",
          "isTechnicalTerm",
          "reasonEn",
          "reasonZh",
        ],
        properties: {
          term: { type: "string" },
          normalizedTerm: { type: "string" },
          level: {
            type: "string",
            enum: ["A1", "A2", "B1", "B2", "C1", "C2", "Off-list"],
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          isTechnicalTerm: { type: "boolean" },
          reasonEn: { type: "string" },
          reasonZh: { type: "string" },
        },
      },
    },
  },
};

function extractOutputText(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const data = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing. Add it to .env.local and restart the server." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { terms?: string[] };
    const terms = [...new Set((body.terms ?? []).map((term) => term.trim()).filter(Boolean))].slice(0, 50);
    if (!terms.length) return NextResponse.json({ error: "At least one term is required." }, { status: 400 });

    const model = process.env.OPENAI_DICTIONARY_MODEL || "gpt-5-mini";
    const prompt = `Estimate CEFR vocabulary levels for the following English words or short terms:
${terms.map((term, index) => `${index + 1}. ${term}`).join("\n")}

Use A1, A2, B1, B2, C1, C2, or Off-list.
Evaluate the most common general-English headword sense, not the difficulty of the supplied document.
Use Off-list for proper names, malformed tokens, abbreviations, and specialist technical compounds that are not meaningfully represented by a normal CEFR headword level.
A technical word can still receive a CEFR level when it also has a well-established general-English use; set isTechnicalTerm accordingly.
Return every input term exactly once and in the same order.
Give a short reason in English and natural Simplified Chinese.
Be conservative: this is an AI estimate for learning guidance, not an official CEFR certification.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "bookroot_cefr_word_evaluations",
            strict: true,
            schema: evaluationSchema,
          },
        },
      }),
    });

    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify((payload as { error: unknown }).error)
        : "OpenAI request failed.";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) return NextResponse.json({ error: "The AI response did not contain CEFR results." }, { status: 502 });
    const parsed = JSON.parse(outputText) as { evaluations: unknown[] };
    return NextResponse.json({ evaluations: parsed.evaluations, model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
