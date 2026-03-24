export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Running");

    const payload = await request.json();
    const message = payload.message || payload.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (!chatId || !text) return new Response("OK");

    try {
      // 这里的 URL 必须是 v1 且模型名匹配
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${env.API_KEY}`;
      
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `总结为JSON {"title":"标题"}: ${text}` }] }]
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const aiTitle = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim()).title;

      // 写入 Notion
      await fetch(`https://api.notion.com/v1/pages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          parent: { database_id: env.NOTION_DATABASE_ID },
          properties: { "Name": { title: [{ text: { content: aiTitle } }] } }
        })
      });

      // 反馈到 Tele
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `✅ 灵感录入成功: ${aiTitle}` })
      });

    } catch (err) {
      // 错误反馈
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `❌ 录入失败: ${err.message}` })
      });
    }
    return new Response("OK");
  }
};
