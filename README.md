# Inspiration-OS

📊 项目复盘：灵感架构自动化系统 (STAR 法则)
维度	内容描述
S (Situation) 情景	需要一个能随时随地（通过 Telegram）记录碎片化灵感，并将其自动转化为结构化、专业产品架构文档并存入 Notion 的系统。
T (Task) 任务	搭建一套基于 Cloudflare Workers 的中间件，集成 Telegram Bot API、Gemini 2.5 Flash API 和 Notion API，实现数据流的自动化流转与 AI 深度加工。
A (Action) 行动	1. 编写异步 Fetch 逻辑对接 Telegram Webhook。2. 编写复杂的 System Prompt 强制 Gemini 以“产品架构师”思维输出 JSON。3. 解决多维度的 API 兼容性问题（1.5 vs 2.5 模型路径、Notion 属性类型匹配）。4. 开发字符切片算法绕过 Notion 2000 字符限制。
R (Result) 结果	成功交付了一个具备“原子化录入 -> 结构化分析 -> 自动化存储”能力的闭环系统，支持超长内容录入，产出的内容直接对齐 PRD 标准。
🛠️ 遇到的问题与解决方案（备忘录）
	1. 模型 404/429 错误：
		○ 原因：Google 接口版本（v1/v1beta）与账号模型权限（1.5 vs 2.5）不匹配。
		○ 解决：编写“自查代码”列出可用模型列表，精准锁定 gemini-2.5-flash 并匹配 v1beta 路径。
	2. Notion 写入失败 (Property mismatch)：
		○ 原因：代码发送的数据类型（如 Select）与 Notion 列配置（如 Multi-select）不一致。
		○ 解决：严格按照 Notion API 文档，将多选类别包装为数组对象 [{ name: category }]。
	3. 2000 字符超限报错：
		○ 原因：Notion rich_text 块单个元素限制长度。
		○ 解决：增加 splitContent 函数，将长文本自动切分为每段 2000 字的数组块发送。

🤖 AI Agent vs. AI Skill：边界在哪里？
这是一个非常经典的问题。在你的这个系统中，两者的定义如下：
1. 这部分是 AI Skill (AI 技能)：
	• 定义：指 AI 完成特定、单一、确定性任务的能力。
	• 在本项目中：Gemini 将乱序文字提取为 5 字标题、将灵感分类、按照 6 维度框架重写。
	• 特征：它是“被动执行”的。你给它一段话，它还你一段处理好的话。它就像一个超级高效的“过滤器”或“翻译官”。
2. 这部分是 AI Agent (AI 智能体)：
	• 定义：指 AI 能够感知环境（Telegram 输入）、利用工具（调用 Notion API、调用 Cloudflare 逻辑）、自主做出决策并产生影响的能力。
	• 在本项目中：虽然目前的逻辑主要是顺序执行，但它具备了 Agent 的雏形：
		○ 感知：通过 Webhook 实时监听你的灵感。
		○ 决策：根据内容自主判断属于什么 Category。
		○ 工具使用：它不只是说话，而是通过 API 在物理世界（你的 Notion 数据库）里产生了持久化的动作。
		○ 未来进化：如果你加上“灵感召回”功能，当它发现新灵感和旧灵感冲突时，主动提醒你并建议合并，那就是一个成熟的 Agent 了。
<img width="965" height="1655" alt="image" src="https://github.com/user-attachments/assets/177329ac-2af1-42e9-828f-31a762f3dcbf" />

