/**
 * 🧠 Inspiration-OS: From Chaos to Architecture
 * A high-performance AI Agent for personal knowledge management.
 * * Logic: Telegram (Input) -> Cloudflare Workers (Brain) -> Notion (Storage)
 * Models: Google Gemini 2.5 Flash (Architect Reasoning)
 */

export default {
  async fetch(request, env) {
    // 1. Basic Webhook Validation / 基础 Webhook 校验
    if (request.method !== "POST") return new Response("OK");

    let chatId;
    try {
      const payload = await request.json();
      chatId = payload.message?.chat?.id;
      const userText = payload.message?.text;

      if (!userText) return new Response("OK");

      // 🚀 Step 2: Invoke AI Architect / 调用 AI 架构师深度推理
      // We use Gemini 2.5 Flash for high-speed, high-order logical analysis.
      const architecture = await this.askAIArchitect(userText, env.API_KEY);

      // 🚀 Step 3: Atomic Storage to Notion / 持久化存储至 Notion
      // Includes custom logic to handle Notion's 2000-char block limit.
      await this.saveToNotion(architecture, env);

      // 4. Feedback / 成功反馈
      await this.notifyUser(chatId, `✅ **Architecture Generated!**\n\nTitle: ${architecture.title}\nStatus: Synced to Notion Workspace.`, env.TELE_TOKEN);

    } catch (err) {
      console.error("Critical Error:", err.message);
      if (chatId) await this.notifyUser(chatId, `❌ **Error:** ${err.message}`, env.TELE_TOKEN);
    }

    return new Response("OK");
  },

  /**
   * PROMPT ENGINEERING: The core "Brain" of this Agent.
   * This prompt forces Gemini to act as a Senior Business Analyst & Architect.
   */
  async askAIArchitect(input, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
      Act as a Senior Product Architect. Analyze this inspiration: "${input}"
      Generate a structured architecture in JSON format with these fields:
      1. title: A professional name for the project.
      2. category: One of [Product, Tech, Business, Life].
      3. framework: A deep 6-dimension analysis (Definition, Core Logic, Tech Stack, Data Flow, MVP Path, Growth Strategy). Use Markdown for formatting.
      Return ONLY raw JSON. No markdown backticks.
    `;

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const json = await res.json();
    const rawText = json.candidates[0].content.parts[0].text;
    
    // Cleaning Logic: Remove potential ```json tags / 清洗 AI 返回的冗余标记
    return JSON.parse(rawText.replace(/```json|```/g, "").trim());
  },

  /**
   * RECURSIVE CHUNKING: Bypassing Notion API's physical limits.
   * Notion rich_text has a 2000-char limit. This function splits long text.
   */
  async saveToNotion(data, env) {
    const createChunks = (text) => {
      const chunks = [];
      for (let i = 0; i < text.length; i += 2000) {
        chunks.push({ text: { content: text.substring(i, i + 2000) } });
      }
      return chunks;
    };

    const res = await fetch("[https://api.notion.com/v1/pages](https://api.notion.com/v1/pages)", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DATABASE_ID },
        properties: {
          Name: { title: [{ text: { content: data.title } }] },
          Content: { rich_text: createChunks(data.framework) },
          Category: { multi_select: [{ name: data.category }] },
          "Created Time": { date: { start: new Date().toISOString().split("T")[0] } }
        }
      })
    });

    if (!res.ok) throw new Error(`Notion API fail: ${res.statusText}`);
  },

  async notifyUser(chatId, text, token) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
  }
};
