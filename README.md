# 🧠 Inspiration-OS: 原子化灵感中转与架构系统

> **"将碎片化的瞬时直觉，转化为可落地的产品架构。"**

![Gemini 2.5](https://img.shields.io/badge/Model-Gemini%202.5%20Flash-blue?style=for-the-badge&logo=google-gemini)
![Cloudflare](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare)
![Notion](https://img.shields.io/badge/Database-Notion%20API-000000?style=for-the-badge&logo=notion)
![Telegram](https://img.shields.io/badge/Interface-Telegram%20Bot-26A5E4?style=for-the-badge&logo=telegram)
![TypeScript](https://img.shields.io/badge/Language-JavaScript/TS-F7DF1E?style=for-the-badge&logo=javascript)

---

## 🚀 项目定位 (Product Definition)
一个基于 **AI Agent** 思维的原子化信息流转系统。它通过 Telegram 监听用户输入的乱序灵感，利用 Gemini 2.5 Flash 的深度推理能力，自动完成标题提取、分类判断及“6维度”产品架构梳理，并最终持久化存储至 Notion 数据库。

## 🛠️ 系统架构 (System Architecture)
graph LR
    A[Telegram Bot] -- Webhook/JSON --> B[Cloudflare Workers]
    B -- Prompt Strategy --> C[Gemini 2.5 Flash]
    C -- Structured JSON --> B
    B -- Recursive Splitting --> D[Notion API]
    D -- Success Feedback --> B
    B -- Notification --> A

## 🛠️ 核心架构 (Core Logic)

1. **输入链路 (Input)**: 移动端 Telegram 随时随地录入。
2. **中枢逻辑 (Brain)**: 
   - **JSON 强制规范**: 确保 AI 输出稳定的结构化数据。
   - **架构师提示词**: 注入专业产品经理思维，产出包含：产品定义、输入链路、中枢逻辑、存储分发、推荐技术栈、MVP 路径的深度方案。
3. **健壮性优化 (Robustness)**:
   - **自动切片算法**: 突破 Notion API 单个文本块 2000 字符的限制，支持长篇架构方案自动分页写入。
   - **模型自适应**: 自动兼容 Gemini v1beta 最新接口与 2.5 系列模型。
4. **存储分发 (Persistence)**: 自动对齐 Notion 的 `Name` (Title), `Content` (Rich Text), `Category` (Multi-select) 及 `Created Time` (Date) 属性。

## 📈 项目复盘 (STAR)

* **S (Situation)**: 散落在各处的灵感难以整理，且缺乏逻辑深度。
* **T (Task)**: 构建一个全自动化的灵感处理中转站，实现“录入即架构”。
* **A (Action)**: 
    * 部署 Cloudflare Workers 作为核心路由。
    * 通过自定义 Prompt 让 Gemini 2.5 模拟资深架构师行为。
    * 解决 Notion 属性类型匹配及字符超限等工程坑位。
* **R (Result)**: 成功落地一个 L3 级别的 AI Agent，实现从“碎碎念”到“PRD原型”的分钟级转化。

## ⚙️ 快速开始
1. 在 Notion 建立灵感数据库（需包含 Name, Content, Category, Created Time 列）。
2. 在 Cloudflare Workers 配置环境变量：`API_KEY`, `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `TELE_TOKEN`。
3. 部署 `index.js` 代码。   
4. 在 Telegram 设置 Webhook 关联至 Worker URL。

---

**Developed with ❤️ by Light Kise**
