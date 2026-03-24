export default {
  async fetch(request, env) {
    // 基础校验
    if (request.method !== "POST") return new Response("OK");

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const message = payload.message || payload.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (!chatId || !text) return new Response("OK");

    try {
      // 1. 调用 Gemini (使用环境变量 API_KEY)
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `将内容总结为JSON {"title":"标题"}: ${text}` }] }]
          })
        }
      );

      const gData = await geminiRes.json();
      if (gData.error) throw new Error(`Gemini: ${gData.error.message}`);

      const rawText = gData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
      const aiTitle = JSON.parse(rawText).title;

      // 2. 写入 Notion (使用环境变量 NOTION_TOKEN 和 NOTION_DATABASE_ID)
      const notionRes = await fetch(`https://api.notion.com/v1/pages`, {
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

      // 3. 成功反馈 (使用环境变量 TELE_TOKEN)
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `✅ 灵感录入成功: ${aiTitle}` })
      });

    } catch (err) {
      // 发生错误时尝试通知用户
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `❌ 失败: ${err.message}` })
      });
    }

    return new Response("OK");
  }
};
