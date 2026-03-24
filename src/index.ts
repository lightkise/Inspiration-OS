export default {
  async fetch(request, env) {
    // 1. 仅处理 Telegram 的 POST 请求
    if (request.method !== "POST") return new Response("OK");

    try {
      const payload = await request.json();
      const chatId = payload.message?.chat?.id;
      const userText = payload.message?.text;

      // 如果没有文字内容（比如发了张图），直接跳过
      if (!userText || !chatId) return new Response("OK");

      // 2. 调用 Gemini AI 整理灵感
      const aiReport = await this.fetchAI(userText, env);

      // 3. 执行 Skill：将结果存入 Notion
      const notionStatus = await this.saveToNotion(userText, aiReport, env);

      // 4. 将 AI 报告回传给 Telegram
      const statusIcon = notionStatus === 200 ? "✅" : "⚠️";
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `${statusIcon} *Inspiration-OS 内化报告*\n\n${aiReport}`,
          parse_mode: "Markdown"
        })
      });

      return new Response("OK");
    } catch (e) {
      // 容错处理：如果报错，至少给 Telegram 发个信号
      console.error(e);
      return new Response("Error: " + e.message);
    }
  },

  // --- Notion 写入模块 ---
  async saveToNotion(rawText, report, env) {
    const title = rawText.substring(0, 30).replace(/\n/g, " ") + "...";
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DATABASE_ID },
        properties: {
          "Name": { // ⚡注意：请确保你 Notion 数据库的第一列标题叫 Name
            title: [{ text: { content: title } }]
          }
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ text: { content: report } }]
            }
          }
        ]
      })
    });
    return response.status;
  },

  // --- Gemini AI 处理模块 ---
  async fetchAI(text, env) {
    const res = await fetch(`${env.BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash", // 建议使用 flash 版本，速度极快
        messages: [
          { 
            role: "system", 
            content: "你是一位资深产品架构师。请将用户发散性的灵感整理为 Markdown 报告。格式要求：🎯产品核心、🏗️逻辑链路、💡技术/商业建议。风格要硬核、极简、带点中二感。" 
          },
          { role: "user", content: text }
        ]
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }
};
