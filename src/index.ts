export default {
  async fetch(request, env) {
    // 基础校验：只处理 POST 请求（来自 Telegram 的消息）
    if (request.method !== "POST") {
      return new Response("Worker is running. Please use POST via Telegram Webhook.");
    }

    // 1. 打印环境变量存在性（保护隐私，不打印具体值）
    console.log("Environment Variable Status:", {
      hasApiKey: !!env.API_KEY,
      hasTeleToken: !!env.TELE_TOKEN,
      hasNotionToken: !!env.NOTION_TOKEN,
      hasDbId: !!env.NOTION_DATABASE_ID
    });

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      console.error("Payload parse error:", e.message);
      return new Response("Invalid JSON", { status: 400 });
    }

    // 兼容 Telegram 不同类型的消息结构
    const message = payload.message || payload.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    // 如果没有 chatId 或 text，直接返回，不继续执行
    if (!chatId || !text) {
      console.log("No valid text or chatId found in payload.");
      return new Response("OK");
    }

    try {
      // 2. 调用 Gemini AI 进行总结
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${env.API_KEY}`;
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `你是一个灵感助手，请将以下内容总结为一个简短的标题，仅输出 JSON 格式 {"title":"标题内容"}: ${text}` }] }]
        })
      });

      const gData = await geminiRes.json();
      if (gData.error) throw new Error(`Gemini API Error: ${gData.error.message}`);

      // 解析 AI 返回的 JSON
      const rawText = gData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
      const aiTitle = JSON.parse(rawText).title;
      console.log("AI Summary Success:", aiTitle);

      // 3. 写入 Notion 数据库
      const notionRes = await fetch(`https://api.notion.com/v1/pages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          parent: { database_id: env.NOTION_DATABASE_ID },
          properties: { 
            "Name": { // 注意：请确保你的 Notion 数据库主属性名称确实是 "Name"
              title: [{ text: { content: aiTitle } }] 
            } 
          }
        })
      });

      if (!notionRes.ok) {
        const nError = await notionRes.text();
        throw new Error(`Notion API Error: ${nError}`);
      }

      // 4. 成功后反馈给 Telegram 用户
      await this.sendToTelegram(chatId, `✅ 灵感已成功记录：\n「${aiTitle}」`, env.TELE_TOKEN);

    } catch (err) {
      console.error("Execution Flow Error:", err.message);
      // 失败反馈给用户
      await this.sendToTelegram(chatId, `❌ 录入失败：${err.message}`, env.TELE_TOKEN);
    }

    return new Response("OK");
  },

  // 封装 Telegram 发送函数
  async sendToTelegram(chatId, text, token) {
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
  }
};
