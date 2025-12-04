import { GoogleGenAI } from "@google/genai";

// 1. 初始化 AI (防崩潰模式)
let ai: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Gemini SDK Init Failed", e);
  }
} else {
  console.warn("API Key is missing. AI features disabled.");
}

// 2. 這是你的 APP C 必須要有的函式！
// 如果少了這個 export，App.tsx 就會壞掉導致白畫面
export const analyzePortfolio = async (categories: any[], totalValue: number): Promise<string> => {
  // 如果 AI 沒啟動，直接回傳安全訊息，不要報錯
  if (!ai) {
    return "⚠️ AI 分析功能暫無法使用。\n\n(原因：GitHub Pages 上未設定 API Key，這是正常的安全機制。若要在本地測試，請確認 .env 檔案。)";
  }

  try {
    // 這裡是你原本的 AI 邏輯
    const model = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this portfolio: ${JSON.stringify(categories)}. Total Value: ${totalValue}`,
    });
    const response = await model;
    return response.text;
  } catch (e) {
    console.error("AI Analysis failed", e);
    return "分析發生錯誤，請稍後再試。";
  }
};
