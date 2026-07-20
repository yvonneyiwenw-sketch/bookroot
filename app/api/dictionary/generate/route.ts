import { NextResponse } from "next/server";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "term",
    "slug",
    "meaningZh",
    "partOfSpeech",
    "category",
    "definitionEn",
    "professionalExplanationEn",
    "professionalExplanationZh",
    "whyThisWordEn",
    "whyThisWordZh",
    "originEn",
    "originZh",
    "wordParts",
    "memoryTrickEn",
    "memoryTrickZh",
    "exampleEn",
    "exampleZh",
    "realLifeApplicationEn",
    "realLifeApplicationZh",
    "relatedWords",
    "australianUsageEn",
    "australianUsageZh",
    "visualDescriptionEn",
    "visualDescriptionZh",
    "imagePrompt",
    "cefrLevel",
    "cefrConfidence",
    "cefrReasonEn",
    "cefrReasonZh",
    "isTechnicalTerm"
  ],
  properties: {
    term: { type: "string" },
    slug: { type: "string" },
    meaningZh: { type: "string" },
    partOfSpeech: { type: "string" },
    category: { type: "string" },
    definitionEn: { type: "string" },
    professionalExplanationEn: { type: "string" },
    professionalExplanationZh: { type: "string" },
    whyThisWordEn: { type: "string" },
    whyThisWordZh: { type: "string" },
    originEn: { type: "string" },
    originZh: { type: "string" },
    wordParts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["part", "meaning"],
        properties: {
          part: { type: "string" },
          meaning: { type: "string" }
        }
      }
    },
    memoryTrickEn: { type: "string" },
    memoryTrickZh: { type: "string" },
    exampleEn: { type: "string" },
    exampleZh: { type: "string" },
    realLifeApplicationEn: { type: "string" },
    realLifeApplicationZh: { type: "string" },
    relatedWords: { type: "array", items: { type: "string" } },
    australianUsageEn: { type: "string" },
    australianUsageZh: { type: "string" },
    visualDescriptionEn: { type: "string" },
    visualDescriptionZh: { type: "string" },
    imagePrompt: { type: "string" },
    cefrLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2", "Off-list"] },
    cefrConfidence: { type: "string", enum: ["high", "medium", "low"] },
    cefrReasonEn: { type: "string" },
    cefrReasonZh: { type: "string" },
    isTechnicalTerm: { type: "boolean" }
  }
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
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing. Add it to .env.local and restart the development server."
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      term?: string;
      context?: string;
      domain?: string;
    };

    const term = body.term?.trim();

    if (!term) {
      return NextResponse.json({ error: "A term is required." }, { status: 400 });
    }

    const domain =
      body.domain?.trim() ||
      "Australian building, construction, landscape architecture and site management";
    const context = body.context?.trim() || "No source sentence was provided.";
    const model = process.env.OPENAI_DICTIONARY_MODEL || "gpt-5-mini";

    const prompt = `Create one original, accurate bilingual English-Chinese BookRoot dictionary entry.

English term: "${term}"
Professional domain: ${domain}
Source context: ${context}

The learner is a Chinese-speaking professional in Australia. Explain the term in practical English and natural Simplified Chinese.

Content requirements:
1. Give a concise Chinese meaning and a clear English definition.
2. Give a fuller professional explanation in BOTH English and Chinese.
3. Explain why the word has this meaning in BOTH English and Chinese. Focus on naming logic, roots, or visual logic rather than a generic definition.
4. Explain word origin cautiously in BOTH languages. Never invent an etymology. State uncertainty when needed.
5. Give a memorable bilingual memory trick.
6. Give one natural professional English example and its Chinese translation.
7. Explain how the term is used in real life or on a real project, in BOTH English and Chinese.
8. Explain Australian professional usage in BOTH English and Chinese. Do not invent standards, legal rules, abbreviations, or slang.
9. Give a short bilingual visual description showing what a learner should notice in a photograph or diagram.
10. Create one safe image-generation prompt for an educational, realistic, clearly labelled-free visual. The image must show the physical object, process, or workplace situation—not decorative typography. Do not ask the image model to render text, labels, logos, standards, or measurements.
11. Estimate the term's CEFR vocabulary level as A1, A2, B1, B2, C1, C2, or Off-list. Use the most common general-English headword sense. Use Off-list for specialist compounds, abbreviations, proper names, or malformed tokens that do not have a meaningful normal CEFR level. Also state confidence, whether it is technical, and a short bilingual reason.
12. Use lowercase kebab-case for slug.
13. Return only the structured JSON required by the schema.
14. All wording must be original and must not copy commercial dictionary text.`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "bookroot_bilingual_dictionary_entry",
            strict: true,
            schema
          }
        }
      })
    });

    const responseBody = (await openAiResponse.json()) as unknown;

    if (!openAiResponse.ok) {
      const message =
        responseBody && typeof responseBody === "object" && "error" in responseBody
          ? JSON.stringify((responseBody as { error: unknown }).error)
          : "OpenAI request failed.";

      return NextResponse.json({ error: message }, { status: openAiResponse.status });
    }

    const outputText = extractOutputText(responseBody);

    if (!outputText) {
      return NextResponse.json(
        { error: "The AI response did not contain a dictionary entry." },
        { status: 502 }
      );
    }

    const entry = JSON.parse(outputText);
    return NextResponse.json({ entry, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
