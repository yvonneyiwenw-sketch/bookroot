import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      term?: string;
      imagePrompt?: string;
    };

    const term = body.term?.trim();
    const imagePrompt = body.imagePrompt?.trim();

    if (!term || !imagePrompt) {
      return NextResponse.json(
        { error: "term and imagePrompt are required." },
        { status: 400 }
      );
    }

    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
    const prompt = `Educational reference image for the English-learning app BookRoot.
Professional term: ${term}.
Show this term being used in a realistic Australian building, construction, landscape, planning, horticulture, or workplace context.
${imagePrompt}
Photorealistic documentary style, clear subject, natural lighting, uncluttered composition, no words, no labels, no captions, no logos, no watermarks, no unsafe work practices.`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt,
        size: "1024x1024",
        quality: "low",
        output_format: "webp",
        n: 1
      })
    });

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error?.message || "Image generation failed." },
        { status: response.status }
      );
    }

    const base64 = payload.data?.[0]?.b64_json;

    if (!base64) {
      return NextResponse.json(
        { error: "The image API did not return image data." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageDataUrl: `data:image/webp;base64,${base64}`,
      model
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
