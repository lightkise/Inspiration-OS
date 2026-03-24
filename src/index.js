/**
 * 🧠 Inspiration-OS v2.7 (JSON Robustness Edition)
 * 修复：Bad control character 导致的同步失败
 * 逻辑：标签与内容语种完全自适应 (问英得英，问中得中)
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

      // 🚀 1. 调用 AI 获取架构 (带 JSON 预清洗)
      const architecture = await this.askAIArchitect(userText, env.API_KEY);

      // 🚀 2. 写入 Notion
      await this.saveToNotion(architecture, env);

      // 3. 成功反馈 (双语自适应)
      const isChinese = /[\u4e00-\u9fa5]/.test(userText);
      const successTitle = isChinese ? "✅ 架构方案已同步！" : "✅ Architecture Synced!";
      const successMsg = `${successTitle}\n\n**Title:** ${architecture.title}\n**Tag:** #${architecture.category}\n\n*Synced to Notion Workspace.*`;
      await this.notifyUser(chatId, successMsg, env.TELE_TOKEN);

    } catch (err) {
      console.error("Critical Error:", err.message);
      if (chatId) {
        await this.notifyUser(chatId, `❌ **Sync Failed**\nReason: \`${err.message}\``, env.TELE_TOKEN);
      }
    }
    return new Response("OK");
  },

  async askAIArchitect(input, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
    
    const prompt = `
      Act as a Senior Product Architect. Analyze: "${input}"
      
      RULES:
      1. All fields (title, category, framework) MUST be in the SAME LANGUAGE as input.
      2. 'category' should be a single professional tag (e.g., Gaming, Career, AI / 游戏, 职场, 编程).
      
      Return ONLY a VALID JSON object:
      {
        "title": "Concise name",
        "category": "One relevant tag",
        "framework": "Deep 6-dimension analysis"
      }
      NO markdown, NO extra text.
    `;

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const json = await res.json();
    let rawText = json.candidates[0].content.parts[0].text;
    
    // 🛡️ JSON 强力清洗手术
    // 1. 去掉 Markdown 的代码块标记
    let cleaned = rawText.replace(/```json|```/gi, "").trim();
    // 2. 核心修复：处理导致 "Bad control character" 的不可见字符
    // 将真正的换行符、回车符等替换为安全的转义字符
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
      const charCode = match.charCodeAt(0);
      if (charCode === 10) return '\\n'; // 换行
      if (charCode === 13) return '\\r'; // 回车
      return ''; // 其他垃圾字符直接删掉
    });

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // 最终兜底：如果还解析失败，手动提取内容
      console.error("JSON Parse Retry:", e.message);
      return { 
        title: "New Inspiration", 
        category: "Other", 
        framework: cleaned.substring(0, 1000) 
      };
    }
  },

  async saveToNotion(data, env) {
    const createChunks = (textContent) => {
      const chunks = [];
      const text = textContent || "No Content";
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
          "Name": { title: [{ text: { content: data.title || "Inspiration" } }] },
          "Content": { rich_text: createChunks(data.framework) },
          "Category": { multi_select: [{ name: data.category || "General" }] }
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message);
    }
  },

  async notifyUser(chatId, text, token) {
    await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
  }
};
