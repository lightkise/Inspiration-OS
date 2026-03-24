export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Worker is running");

    // 1. 打印变量状态（仅检查是否存在，不打印具体内容，保护隐私）
    console.log("Environment Check:", {
      hasApiKey: !!env.API_KEY,
      hasTeleToken: !!env.TELE_TOKEN,
      hasNotionToken: !!env.NOTION_TOKEN,
      hasDbId: !!env.NOTION_DATABASE_ID
    });

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response("Invalid JSON");
    }

    const message = payload.message || payload.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (!chatId || !text) {
      console.log("No text or chatId in payload");
      return new Response("OK");
    }

    try {
      // 调用 Gemini
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
      if (gData.error) throw new Error(gData.error.message);

      const rawText = gData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
      const aiTitle = JSON.parse(rawText).title;

      // 写入 Notion
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

      // 反馈到 Tele
      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `✅ 灵感录入成功: ${aiTitle}` })
      });

    } catch (err) {
      console.error("Execution Error:", err.message);
      // 报错反馈
      if (env.TELE_TOKEN && chatId) {
        await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: `❌ 报错: ${err.message}` })
        });
      }
    }

    return new Response("OK");
  }
};
