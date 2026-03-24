/**
 * 🧠 Inspiration-OS v2.0 (Stable Architect Edition)
 * Logic: Telegram -> Cloudflare Workers -> Gemini 2.5 -> Notion
 * Features: Senior Architect Prompting, Recursive Chunking, Regex Sanitization.
 */

export default {
  async fetch(request, env) {
    // 1. Webhook Validation
    if (request.method !== "POST") return new Response("OK");

    let chatId;
    try {
      const payload = await request.json();
      chatId = payload.message?.chat?.id;
      const userText = payload.message?.text;

      if (!userText) return new Response("OK");

      // 🚀 Step 2: Invoke AI Architect (Gemini 2.5 Flash)
      const architecture = await this.askAIArchitect(userText, env.API_KEY);

      // 🚀 Step 3: Atomic Storage to Notion (With 2000-char splitting)
      await this.saveToNotion(architecture, env);

      // 4. Success Feedback
      await this.notifyUser(chatId, `✅ **Architecture Generated!**\n\n**Title:** ${architecture.title}\n**Category:** ${architecture.category}\n\n*Status: Synced to your Notion Workspace.*`, env.TELE_TOKEN);

    } catch (err) {
      console.error("Critical Error:", err.message);
      if (chatId) {
        // 提供更详细的错误反馈，方便排查
        await this.notifyUser(chatId, `❌ **System Error:**\n\`${err.message}\`\n\n*Please check your Notion Database property names (Name, Content, Category).*`, env.TELE_TOKEN);
      }
    }

    return new Response("OK");
  },

  /**
   * AI CORE: Analyzes fragmented ideas into a 6D professional framework.
   */
  async askAIArchitect(input, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
    
    const prompt = `
      Act as a Senior Product Architect. Analyze this inspiration: "${input}"
      Generate a structured architecture in JSON format with these EXACT fields:
      1. title: A professional English name for the project.
      2. category: Pick one from [Product, Tech, Business, Life].
      3. framework: A deep 6-dimension analysis (Definition, Core Logic, Tech Stack, Data Flow, MVP Path, Growth Strategy). Use Markdown for formatting.
      Return ONLY raw JSON. No markdown backticks.
    `;

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!res.ok) throw new Error(`Gemini API Error: ${res.statusText}`);

    const json = await res.json();
    const rawText = json.candidates[0].content.parts[0].text;
    
    // Clean potential markdown code blocks / 清理 AI 可能带出的 JSON 标记
    const cleanedJson = rawText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson);
  },

  /**
   * NOTION ADAPTER: Handles API headers and long-text chunking.
   */
  async saveToNotion(data, env) {
    // 递归切片逻辑：Notion API 单个 rich_text 块上限为 2000 字符
    const createChunks = (text) => {
      const chunks = [];
      const content = text || "No framework generated.";
      for (let i = 0; i < content.length; i += 2000) {
        chunks.push({ text: { content: content.substring(i, i + 2000) } });
      }
      return chunks;
    };

    // 严格校验 Headers：这是之前报错的重灾区
    const notionHeaders = {
      "Authorization": `Bearer ${env.NOTION_TOKEN.trim()}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    };

    const payload = {
      parent: { database_id: env.NOTION_DATABASE_ID.trim() },
      properties: {
        "Name": { title: [{ text: { content: data.title || "Untitled Project" } }] },
        "Content": { rich_text: createChunks(data.framework) },
        "Category": { multi_select: [{ name: data.category || "Life" }] },
        "Created Time": { date: { start: new Date().toISOString().split("T")[0] } }
      }
    };

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json();
      // 抛出具体的 Notion 报错原因，比如 "Property not found"
      throw new Error(`Notion Rejected: ${errorBody.message || response.statusText}`);
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
