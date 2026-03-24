export default {
  async fetch(request, env) {
    // 仅处理来自 Telegram 的 POST 请求
    if (request.method !== "POST") return new Response("Worker is running.");

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response("Invalid JSON");
    }

    const message = payload.message || payload.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (!chatId || !text) return new Response("OK");

    try {
      // 1. 调用 Gemini 1.5 Flash 总结标题 (使用 v1 稳定路径)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${env.API_KEY}`;
      
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `你是一个灵感助手，请将以下内容总结为一个简短的标题，仅输出 JSON 格式 {"title":"标题内容"}: ${text}` }] }]
        })
      });

      const gData = await geminiRes.json();
      if (gData.error) throw new Error(`Gemini Error: ${gData.error.message}`);

      // 清理 AI 可能返回的 Markdown 代码块标签
      const rawText = gData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
      const aiTitle = JSON.parse(rawText).title;

      // 2. 将结果写入 Notion 数据库
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
            "Name": { // 请确认你的 Notion 数据库主属性列名是 "Name"
              title: [{ text: { content: aiTitle } }] 
            } 
          }
        })
      });

      if (!notionRes.ok) {
        const nError = await notionRes.text();
        throw new Error(`Notion API Error: ${nError}`);
      }

      // 3. 成功反馈
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `✅ 灵感录入成功: ${aiTitle}` })
      });

    } catch (err) {
      // 失败反馈
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: `❌ 录入失败：${err.message}` 
        })
      });
    }

    return new Response("OK");
  }
};
