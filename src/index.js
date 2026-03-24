/**
 * 🧠 Inspiration-OS v2.1 (Language Adaptive Edition)
 * Features: Auto-language detection, Senior Architect Logic, Stable Sync.
 */

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    let chatId;
    try {
      const payload = await request.json();
      chatId = payload.message?.chat?.id;
      const userText = payload.message?.text;

      if (!userText) return new Response("OK");

      // 🚀 调用 AI 架构师
      const architecture = await this.askAIArchitect(userText, env.API_KEY);

      // 🚀 写入 Notion
      await this.saveToNotion(architecture, env);

      // 4. 反馈 (反馈语我们也做一下简单的双语适配)
      const isChinese = /[\u4e00-\u9fa5]/.test(userText);
      const successTitle = isChinese ? "✅ 架构方案已生成！" : "✅ Architecture Generated!";
      const statusMsg = isChinese ? "*状态：已同步至 Notion 工作区*" : "*Status: Synced to Notion Workspace.*";
      
      const successMsg = `${successTitle}\n\n**项目名称:** ${architecture.title}\n**所属分类:** ${architecture.category}\n\n${statusMsg}`;
      await this.notifyUser(chatId, successMsg, env.TELE_TOKEN);

    } catch (err) {
      console.error("Critical Error:", err.message);
      if (chatId) {
        const errorMsg = `❌ **Operation Failed**\n\n**Reason:** \`${err.message}\``;
        await this.notifyUser(chatId, errorMsg, env.TELE_TOKEN);
      }
    }
    return new Response("OK");
  },

  async askAIArchitect(input, apiKey) {
    const cleanKey = apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
    
    // 核心改动：增加语言自适应指令
    const prompt = `
      Act as a Senior Product Architect. Analyze: "${input}"
      
      CRITICAL: You MUST respond in the SAME LANGUAGE as the input (e.g., if input is Chinese, output Chinese).
      
      Return ONLY a JSON object with:
      1. title: Project name.
      2. category: [Product, Tech, Business, Life].
      3. framework: 6-dimension analysis (Definition, Core Logic, Tech Stack, Data Flow, MVP Path, Growth Strategy).
      NO markdown formatting, NO backticks.
    `;

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!res.ok) throw new Error(`Gemini API: ${res.statusText}`);
    const json = await res.json();
    const rawText = json.candidates[0].content.parts[0].text;
    const cleanedJson = rawText.replace(/```json|```/gi, "").trim();
    return JSON.parse(cleanedJson);
  },

  async saveToNotion(data, env) {
    const createChunks = (text) => {
      const chunks = [];
      const content = text || "No data.";
      for (let i = 0; i < content.length; i += 2000) {
        chunks.push({ text: { content: content.substring(i, i + 2000) } });
      }
      return chunks;
    };

    const token = env.NOTION_TOKEN.trim();
    const dbId = env.NOTION_DATABASE_ID.trim();

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          "Name": { title: [{ text: { content: data.title || "New Inspiration" } }] },
          "Content": { rich_text: createChunks(data.framework) },
          "Category": { multi_select: [{ name: data.category || "Life" }] }
        }
      })
    });

    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(`Notion API: ${errorDetail.message || response.statusText}`);
    }
  },

  async notifyUser(chatId, text, token) {
    const teleToken = token.trim();
    await fetch(`https://api.telegram.org/bot${teleToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
  }
};
