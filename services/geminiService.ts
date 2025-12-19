
import { GoogleGenAI, Type } from "@google/genai";
import { CarePlanItem, SoapNote } from "../types";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getAIClient = () => {
  // Always initialize with the apiKey named parameter using process.env.API_KEY.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const generateWithRetry = async (ai: GoogleGenAI, modelName: string, params: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent({
        model: modelName,
        ...params
      });
    } catch (error: any) {
      let errorMessage = typeof error === 'string' ? error : error?.message || "";
      const isRetryable = errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.toLowerCase().includes('overloaded');
      if (i < maxRetries - 1 && isRetryable) {
        const delay = 1000 * Math.pow(2, i) + (Math.random() * 500);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("通信限界だわ！あんたのプロジェクト、ちゃんと支払い設定してあるの？");
};

interface AnalysisResult {
  soap: SoapNote;
  carePlan: CarePlanItem[];
  summary: string;
  threatLevel: 'WOLF' | 'TIGER' | 'DEMON' | 'DRAGON';
  otsuboneWisdom: string;
}

export const analyzeRecord = async (audioBlob: Blob | null, textInput: string): Promise<AnalysisResult> => {
  try {
    const ai = getAIClient();
    const parts: any[] = [];

    if (audioBlob) {
      const base64Audio = await blobToBase64(audioBlob);
      parts.push({
        inlineData: { mimeType: audioBlob.type || "audio/webm", data: base64Audio },
      });
    }

    let promptText = `
            あなたは「ヒーロー協会」所属、看護歴30年のS級2位・最強のお局看護師です。
            提供された訪問看護の会話データやメモを最強の知能（Gemini 3）で分析し、
            新人看護師には到達できない「臨床的推論」に基づいたプロフェッショナルな記録を作成しなさい。
            
            【分析の極意】
            1. 患者の言動から、心不全増悪、脱水、認知症の進行、介護疲労などを予見しろ。
            2. SOAPは正確な医療用語を使用すること。
            3. 看護計画は具体的かつ実行可能な介入を提示しろ。
            
            【出力形式】JSONで出力すること。
    `;

    if (textInput) promptText += `\n\n【報告メモ】\n${textInput}`;
    parts.push({ text: promptText });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        soap: {
          type: Type.OBJECT,
          properties: {
            subjective: { type: Type.STRING },
            objective: { type: Type.STRING },
            assessment: { type: Type.STRING },
            plan: { type: Type.STRING },
          },
          required: ["subjective", "objective", "assessment", "plan"],
        },
        carePlan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              problem: { type: Type.STRING },
              goal: { type: Type.STRING },
              intervention: { type: Type.STRING },
            },
            required: ["problem", "goal", "intervention"],
          },
        },
        summary: { type: Type.STRING },
        threatLevel: { type: Type.STRING, enum: ['WOLF', 'TIGER', 'DEMON', 'DRAGON'] },
        otsuboneWisdom: { type: Type.STRING },
      },
      required: ["soap", "carePlan", "summary", "threatLevel", "otsuboneWisdom"],
    };

    // Use gemini-3-pro-preview for complex clinical reasoning and analysis.
    const response = await generateWithRetry(ai, "gemini-3-pro-preview", {
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0,
      },
    });

    // Access .text property directly (not a method).
    return JSON.parse(response.text || "{}") as AnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const generateSupportContent = async (
  type: 'hints' | 'family' | 'handover',
  soap: SoapNote,
  carePlan: CarePlanItem[]
): Promise<string> => {
  const ai = getAIClient();
  const context = `
    【SOAP】S:${soap.subjective} O:${soap.objective} A:${soap.assessment} P:${soap.plan}
    【PLAN】${carePlan.map(c => c.problem).join('/')}
  `;

  let systemInstruction = "";
  if (type === 'hints') {
    systemInstruction = "S級の洞察力で、記録には現れていない『現場の違和感』を指摘しなさい。お局口調で厳しくな。";
  } else if (type === 'family') {
    systemInstruction = "家族向けです。安心感を与えつつ、専門的な視点を含めた丁寧な報告文を作成しなさい。";
  } else if (type === 'handover') {
    systemInstruction = "多職種連携用。結論から簡潔に、医師やCMが即座に動ける申し送り文を書きなさい。";
  }

  // Use gemini-3-pro-preview for high-quality professional text generation.
  const response = await generateWithRetry(ai, "gemini-3-pro-preview", {
    contents: { parts: [{ text: `状況：\n${context}` }] },
    config: { systemInstruction, temperature: 0.2 }
  });

  return response.text || "生成失敗。";
};
