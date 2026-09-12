// ===================================================
// Gemini API 호출 서버리스 함수 (Vercel Serverless Function)
//
// 무료 티어로 사용 가능한 최신 모델 `gemini-2.5-flash`를 호출합니다.
// API 키는 환경변수 `process.env.GEMINI_API_KEY`에서 안전하게 가져옵니다.
// ===================================================

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: "서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 환경변수 또는 .env를 확인해 주세요." 
    });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "코멘트를 생성할 메모 내용(text)이 필요합니다." });
  }

  // 개인정보 보호 (AGENTS.md 규칙: 식별 정보 제외 및 학생 대상 따뜻한 피드백)
  const systemPrompt = "너는 친절하고 격려를 아끼지 않는 초·중등학교 선생님 AI 도우미야. 학생이 작성한 학습 메모나 소감을 읽고, 따뜻하고 긍정적인 격려와 호기심을 북돋아주는 피드백 코멘트를 1~2문장으로 한국어로 친절하게 작성해 줘. 이모지도 적절하게 1~2개 곁들여 줘.";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\n[학생 메모]: "${text}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200
        }
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error("Gemini API 응답 오류:", errData);
      return res.status(response.status).json({ 
        error: "Gemini API 호출에 실패했습니다.", 
        details: errData 
      });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return res.status(500).json({ error: "Gemini 응답에서 코멘트를 추출할 수 없습니다." });
    }

    return res.status(200).json({ comment: reply });
  } catch (error) {
    console.error("Gemini 호출 중 예외 발생:", error);
    return res.status(500).json({ error: "서버 처리 중 오류가 발생했습니다: " + error.message });
  }
}
