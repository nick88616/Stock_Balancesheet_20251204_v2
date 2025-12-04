import { GoogleGenAI } from "@google/genai";
import { CategorySummary } from "../types";

let ai: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY;

// ✅ 安全初始化：只有在有 Key 的時候才啟動 AI
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  // 這裡只是警告，不會讓程式當機
  console.warn("API Key 未設定，AI 功能已停用");
}

export { ai };

export const analyzePortfolio = async (categories: CategorySummary[], totalValue: number): Promise<string> => {
  try {
    const summaryData = categories.map(c => ({
      category: c.label,
      value: c.totalValueTWD,
      percentage: ((c.totalValueTWD / totalValue) * 100).toFixed(1) + "%",
      topHoldings: c.holdings.slice(0, 3).map(h => h.symbol)
    }));

    const prompt = `
      請扮演一位專業的資產配置顧問。分析以下投資組合 (核心衛星/股債配置策略)。
      
      總資產: $${totalValue.toLocaleString()}
      
      配置詳情:
      ${JSON.stringify(summaryData, null, 2)}

      請提供繁體中文分析報告 (Markdown 格式)，重點包含：
      1. **配置比例分析**: 針對市值型ETF(核心)、債券型(避險/收息)與個股(衛星/積極)的比例進行點評。
      2. **風險承受度**: 根據目前的股債比與個股佔比，評估此組合的波動風險。
      3. **調整建議**: 如果需要長期穩健成長，針對目前比例給出具體的增減建議 (例如：個股佔比是否過高？債券是否不足？)。
      4. **總結**: 一句簡短的總評。

      語氣請專業、客觀。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法生成分析報告。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 分析服務暫時無法使用。";
  }
};
