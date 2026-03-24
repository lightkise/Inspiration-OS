/**
 * 🧠 Inspiration-OS v2.5 (Standardized & Smart Category)
 * 逻辑：优先匹配标准分类库，特殊灵感自动提炼精准标签。
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

      // 1. 调用 AI 获取架构
      const architecture = await this.askAIArchitect(userText, env.API_KEY);

      // 2. 写入 Notion
      await this.saveToNotion(architecture, env);

      // 3. 成功反馈
      const isChinese = /[\u4e00-\u9fa5]/.test(userText);
      const successTitle = isChinese ? "✅ 灵感已录入星图" : "✅ Inspiration Archived";
      const successMsg = `${successTitle}\n\n**项目:** ${architecture.title}\n**标签:** #${architecture.category}\n\n*内容已同步至 Notion，请查收。*`;
      await this.notifyUser(chatId, successMsg, env.TELE_TOKEN);

    } catch (err) {
      console.error("Critical Error:", err.message);
      if (chatId) {
        await this.notifyUser(chatId, `❌ **同步失败**\n原因: \`${err.message}\``, env.TELE_TOKEN);
      }
    }
    return new Response("OK");
  },

  async askAIArchitect(input, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
    
    // 关键改动：给 AI 一个建议库，但保留提炼权
    const prompt = `
      Act as a Senior Product Architect. Analyze: "${input}"
      Response MUST be in the SAME LANGUAGE as input.
      
      Return ONLY a VALID JSON object:
      {
        "title": "A concise and professional project name",
        "category": "Pick the most relevant tag. PREFER: [产品, 技术, 商业, 游戏, 职场, 留学, 生活, 艺术]. If none fit, generate a precise 2-4 character Chinese tag.",
        "framework": "Deep 6-dimension professional analysis."
      }
      NO markdown, NO extra text.
    `;

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const json = await res.json();
    const rawText = json.candidates[0].content.parts[0].text;
    const cleanedJson = rawText.replace(/```json|```/gi, "").trim();
    
    return JSON.parse(cleanedJson);
  },

  async saveToNotion(data, env) {
    const createChunks = (textContent) => {
      const chunks = [];
      const text = textContent || "无详细内容";
      for (let i = 0; i < text.length; i += 2000) {
        chunks.push({ text: { content: text.substring(i, i + 2000) } });
      }
      return chunks;
    };

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.NOTION_TOKEN.trim()}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DATABASE_ID.trim() },
        properties: {
          "Name": { title: [{ text: { content: data.title || "新灵感" } }] },
          "Content": { rich_text: createChunks(data.framework) },
          "Category": { multi_select: [{ name: data.category || "其它" }] }
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message);
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
