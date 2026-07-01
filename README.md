<p align="center">
  <img src="assets/icons/icon.png" width="80" alt="LingInk" />
</p>

<h1 align="center">灵砚 LingInk</h1>

<p align="center">
基于 Cline 的学术写作辅助工具 — 选题、写作、润色、审稿、投稿，全流程 AI 辅助。
</p>

<div align="center">
<table>
<tbody>
<td align="center">
<a href="./specs/灵砚功能需求报告-通俗版.md"><strong>功能需求</strong></a>
</td>
<td align="center">
<a href="./specs/灵砚-Cline集成分析报告.md"><strong>集成分析</strong></a>
</td>
<td align="center">
<a href="./specs/科研专用插件功能简化建议报告.md"><strong>产品建议</strong></a>
</td>
</tbody>
</table>
</div>

<br>

---

## 简介

灵砚是基于 [Cline](https://github.com/cline/cline) 的学术研究专用分支，保留了 Cline 强大的 AI 代理能力，同时针对科研写作场景进行了深度定制：

- **全流程覆盖**：从选题引导到投稿格式，贯穿论文写作全周期
- **学术 API 集成**：对接 Semantic Scholar、arXiv、Crossref 等学术数据库
- **多模型支持**：兼容 Claude、GPT、Gemini、本地模型等 20+ 提供商
- **自主可控**：所有数据本地存储，写作偏好本地学习，无需上传

## 产品定位

灵砚定位为**科研写作工作台**，而非通用编程代理。我们正在逐步从 Cline 的通用能力平台向科研专属形态演进，详情见[科研专用插件功能简化建议报告](./specs/科研专用插件功能简化建议报告.md)。

## 核心功能

| 模块 | 功能 | 说明 |
|------|------|------|
| **写作辅助** | 选题引导 | 苏格拉底式追问 + 三问框架，从模糊想法到清晰选题 |
| | 结构重组 | 全篇/局部多叙事路径大纲生成 |
| | 概念溯源 | 多学派定义检索与概念界定草稿 |
| | 英文润色 | 地道度 + 学术语用双层递进润色 |
| **AI 智能体** | 文献检索综述 | 学术 API 检索 → 自动聚类 → 综述草稿生成 |
| | 漏洞扫描 | 前提检查 + 证据审查 + 反驳演练三级分析 |
| | 模拟审稿 | 多角色同时审查论文 |
| | 深度追问 | 跨会话、有状态记忆的深度推理追问 |
| | 项目记忆 | 跨会话保持论文上下文 |
| **论证逻辑** | 论证链路图 | 可视化论证骨架，标注断裂点并推荐补全路径 |
| | 假设检测 | 挖掘文中未表述的隐含假设 |
| | 反驳演练 | AI 扮演反方学者系统性反驳论证 |
| **文献知识** | 知识补漏 | 后台分析草稿，实时识别文献/方法缺口 |
| | 投稿匹配 | 提取论文特征，匹配目标期刊 |
| **发表生涯** | 报告准备 | 多版本宣讲大纲 + 预判问答 |
| | 方向拓展 | 论文树状延伸图 + 期刊征稿匹配 |

> 详细功能描述见[灵砚功能需求报告](./specs/灵砚功能需求报告-通俗版.md)，技术可行性分析见[灵砚 × Cline 集成分析报告](./specs/灵砚-Cline集成分析报告.md)。

## 快速开始

### VS Code 扩展

1. 在 VS Code 中按 `F5` 启动调试（开发模式）
2. 首次启动进入 API 提供商配置，填入你的 API Key
3. 开始写作 — 选中文本右键使用学术功能，或在对话中输入研究需求

### CLI

```bash
npm i -g cline
cline "帮我检索 2023-2025 年关于 AI 辅助学术写作的文献"
```

### SDK

构建自定义 AI 代理和集成：

```bash
npm install @cline/sdk
```

## 支持模型

灵砚兼容主流 AI 模型提供商，可根据需要自由切换：

| 提供商 | 模型 |
|--------|------|
| Anthropic | Claude Opus, Sonnet, Haiku |
| OpenAI | GPT 系列 |
| Google | Gemini 系列 |
| OpenRouter | 200+ 模型 |
| AWS Bedrock | Claude, Llama 等 |
| Azure / GCP Vertex | 所有托管模型 |
| Ollama / LM Studio | 本地运行模型 |
| 任意 OpenAI 兼容 API | 自托管或第三方 |

## 开发

### 环境要求

- [Bun](https://bun.sh) 包管理器
- Node.js >= 22
- protoc（protobuf 编译器）

### 首次构建

```bash
bun install
cd sdk/packages/shared && bun run build && bun tsc --emitDeclarationOnly --outDir dist
cd sdk/packages/llms && bun run build
cd sdk/packages/agents && bun run build
cd apps/vscode
bun scripts/build-proto.mjs   # 生成 protobuf 代码
bun esbuild.mjs               # 构建扩展
cd webview-ui && bun run build # 构建 Webview UI
```

启动调试请见 [apps/vscode/DEVELOPMENT.md](./apps/vscode/DEVELOPMENT.md)。

## 项目结构

| 目录 | 说明 |
|------|------|
| `apps/cli/` | 命令行界面 |
| `apps/vscode/` | VS Code 扩展 |
| `sdk/` | 核心 SDK（agent、llms、shared） |
| `docs/` | 文档 |
| `specs/` | 灵砚功能需求与技术分析 |

## 协议

[Apache 2.0 © 2026 Cline Bot Inc.](./LICENSE)
