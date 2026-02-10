import { NextResponse } from "next/server";

/**
 * POST /api/generate-questions
 * Body: { bookText: string }
 * 책 내용을 기반으로 AI가 문제를 생성합니다.
 * OPENAI_API_KEY 환경변수가 필요합니다.
 */
export async function POST(request) {
  try {
    const { bookText } = await request.json();
    if (!bookText || typeof bookText !== "string") {
      return NextResponse.json(
        { error: "bookText is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Add it to .env.local file.",
        },
        { status: 500 }
      );
    }

    // 텍스트가 너무 길면 앞부분만 사용 (토큰 제한 고려)
    const maxChars = 12000;
    const truncatedText =
      bookText.length > maxChars ? bookText.slice(0, maxChars) + "..." : bookText;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a children's English learning quiz creator. Based on the book content provided, create 10 multiple-choice questions suitable for kids learning English. 
Respond with a valid JSON array only, no other text. Each question object must have:
- "question": string (the question text)
- "options": string[] (4 options, A/B/C/D)
- "correctIndex": number (0-3, index of correct answer)
- "explanation": string (brief explanation for kids)
Example format:
[{"question":"What color is the dog?","options":["Red","Blue","Brown","Green"],"correctIndex":2,"explanation":"The dog in the story is brown!"}]`,
          },
          {
            role: "user",
            content: `Create 10 multiple-choice questions based on this book content:\n\n${truncatedText}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: "OpenAI API error",
          details: errData.error?.message || response.statusText,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    // JSON 파싱 시도 (코드블록 제거)
    let questions;
    try {
      const jsonStr = content.replace(/```json?\s*|\s*```/g, "").trim();
      questions = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 502 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "No valid questions generated" },
        { status: 502 }
      );
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[generate-questions]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
