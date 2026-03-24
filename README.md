# 🧠 Inspiration-OS: Atomic Inspiration Relay & Architecture System

<p align="center">
  <b><a href="#english-version">EN</a></b> | <b><a href="#中文文档">CN</a></b>
</p>

---

<a name="english-version"></a>

## 🚀 Product Definition (English)
An **AI Agent-based** atomic information flow system. It listens to disordered inspirations via Telegram, leverages Gemini 2.5 Flash's deep reasoning to perform auto-titling, classification, and "6-dimensional" architecture analysis, and persists the data into a Notion database.

### 🛠️ System Architecture
```mermaid
graph LR
    A[Telegram Bot] -- Webhook/JSON --> B[Cloudflare Workers]
    B -- Prompt Strategy --> C[Gemini 2.5 Flash]
    C -- Structured JSON --> B
    B -- Recursive Splitting --> D[Notion API]
    D -- Success Feedback --> B
    B -- Notification --> A
```

### 🔧 Engineering Challenges (Key Takeaways)
* **Recursive Content Chunking**: Notion API strictly limits `rich_text` to 2000 chars. Implemented a recursive `splitContent` function to automate string segmentation, ensuring 100% data integrity for massive PRD outputs.
* **Regex-based JSON Sanitization**: Resolved the "LLM Hallucination Format" issue where models return JSON wrapped in Markdown backticks. Built a sanitization layer to strip redundant markers before parsing.
* **API Version Locking & Compatibility**: Optimized the Cloudflare Worker core to lock the `v1beta` endpoint for Gemini 2.5, preventing the 404/500 errors caused by rapid model iterations.
* **Multi-Platform Webhook Coordination**: Engineered a robust error-handling mechanism to provide real-time feedback to Telegram when Notion or Gemini services experience latency.

### 📈 Project Review (STAR)
* **S (Situation)**: Fragmented inspirations were difficult to organize and lacked logical depth.
* **T (Task)**: Build an automated relay station to achieve "Input to Architecture" in seconds.
* **A (Action)**: Deployed Cloudflare Workers; engineered "Senior Architect" prompts; resolved Notion integration hurdles.
* **R (Result)**: Successfully launched an L3 AI Agent, enabling minute-level conversion from "random thoughts" to "PRD prototypes."

---

<a name="中文文档"></a>

## 🧠 Inspiration-OS: 原子化灵感中转与架构系统

## 🚀 项目定位 (中文)
一个基于 **AI Agent** 思维的原子化信息流转系统。它通过 Telegram 监听用户输入的乱序灵感，利用 Gemini 2.5 Flash 的深度推理能力，自动完成标题提取、分类判断及“6维度”产品架构梳理，并最终持久化存储至 Notion 数据库。

### 🛠️ 系统架构
```mermaid
graph LR
    A[Telegram Bot] -- Webhook/JSON --> B[Cloudflare Workers]
    B -- Prompt Strategy --> B
    B -- Gemini 2.5 Flash --> B
    B -- Notion API --> B
    B -- Success Notification --> A
```

### 🔧 核心技术攻关 (关键总结)
* **Notion API 递归分片算法**：针对 Notion 字符限制（2000字/块）痛点，自研递归分片函数，实现长文档自动切割与顺序写入，确保深度架构方案无损沉淀。
* **结构化数据“脏数据”清洗**：通过正则拦截器自动剔除 LLM 返回的 Markdown 伪代码块标识（如 \`\`\`json），彻底解决 JSON 解析崩溃问题。
* **API 稳定性与版本锁死**：针对 Google AI API 频繁更新的风险，封装统一 Request Header 并锁定 `v1beta` 路径，保证了系统在模型迭代下的高可用性。
* **异步通讯与反馈闭环**：在 Cloudflare Workers 层实现了多阶段错误捕获，确保在 Notion API 抖动或 Gemini 响应延迟时，用户能在 Telegram 端收到精准报错提示。

---

## ⚙️ Quick Start / 快速开始

### 1. Variables / 环境变量 (EN/CN)
| Variable | Description / 说明 |
| :--- | :--- |
| `API_KEY` | Google Gemini API Key |
| `TELE_TOKEN` | Telegram Bot Token |
| `NOTION_TOKEN` | Notion Internal Integration Token |
| `NOTION_DATABASE_ID` | Notion Database ID |

### 2. Deployment / 部署步骤
1. **Notion**: Create/创建 `Name`, `Content`, `Category`, `Created Time`.
2. **Workers**: Deploy `index.js` and set variables / 部署代码并配置变量。
3. **Webhook**: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>`

---

**Developed with ❤️ by Light Kise**
