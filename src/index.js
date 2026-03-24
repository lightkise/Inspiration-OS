export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    let chatId;
    try {
      const payload = await request.json();
      chatId = payload.message?.chat?.id;
      const originalText = payload.message?.text;
      if (!originalText) return new Response("OK");

      const now = new Date();
      const dateStr = new Date(now.getTime() + 8 * 3600000).toISOString().split('T')[0];

      // --- 1. 调用 Gemini 2.5-flash (产品架构师模式) ---
      // 注意：这里必须是 v1beta 和 gemini-2.5-flash
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.API_KEY}`;
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: `你是一位资深产品架构师。请将以下灵感梳理为6个维度：产品定义、输入链路、中枢逻辑、存储分发、推荐技术栈、MVP开发路径。
输出格式严格遵循以下 JSON，不要输出任何多余文字：
{
  "title": "5字内标题",
  "category": "技术/商业/生活/艺术",
  "framework": "1. 产品定义...\\n2. 输入链路...\\n3. 中枢逻辑...\\n4. 存储分发...\\n5. 推荐技术栈...\\n6. MVP 开发路径..."
}
灵感内容：${originalText}` }] 
          }]
        })
      });

      const geminiData = await geminiRes.json();
      if (geminiData.error) throw new Error(`Gemini: ${geminiData.error.message}`);
      
      const rawResponse = geminiData.candidates[0].content.parts[0].text;
      const jsonStr = rawResponse.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(jsonStr);

      // --- 2. 核心修复：处理 Notion 2000 字符限制 ---
      const splitContent = (str) => {
        const chunks = [];
        for (let i = 0; i < str.length; i += 2000) {
          chunks.push({ text: { content: str.substring(i, i + 2000) } });
        }
        return chunks;
      };

      // --- 3. 写入 Notion ---
      const notionRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          parent: { database_id: env.NOTION_DATABASE_ID },
          properties: {
            "Name": { title: [{ text: { content: parsed.title } }] },
            "Content": { rich_text: splitContent(parsed.framework) },
            "Category": { multi_select: [{ name: parsed.category }] },
            "Created Time": { date: { start: dateStr } }
          }
        })
      });

      if (!notionRes.ok) {
        const nErr = await notionRes.json();
        throw new Error(`Notion: ${nErr.message}`);
      }

      await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🚀 **方案重载成功！**\n\n📌 **${parsed.title}**\n已按架构模版存入 Notion。`
        })
      });

    } catch (err) {
      if (chatId) {
        await fetch(`https://api.telegram.org/bot${env.TELE_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: `❌ 异常：${err.message}` })
        });
      }
    }
    return new Response("OK");
  }
};
