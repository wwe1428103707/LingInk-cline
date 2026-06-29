# 灵砚 × Cline 集成可行性分析报告

> 基于[灵砚功能需求报告（通俗版）](./灵砚功能需求报告-通俗版.md) 与 LingInk-cline（Cline）项目架构的系统级映射分析
> 生成日期：2026-06-29

---

## 目录

1. [核心发现](#核心发现)
2. [逐功能映射矩阵](#逐功能映射矩阵)
   - [模块 A：核心写作辅助](#模块-a核心写作辅助)
   - [模块 B：AI 智能体与记忆](#模块-bai-智能体与记忆)
   - [模块 C：论证与逻辑深度](#模块-c论证与逻辑深度)
   - [模块 D：文献与知识管理](#模块-d文献与知识管理)
   - [模块 E：数据、代码与统计辅助](#模块-e数据代码与统计辅助)
   - [模块 F：语言润色](#模块-f语言润色)
   - [模块 G：写作体验](#模块-g写作体验)
   - [模块 H：发表与学术生涯](#模块-h发表与学术生涯)
3. [汇总统计](#汇总统计)
4. [推荐架构方案](#推荐架构方案)
5. [ARS 利用策略](#ars-利用策略)
6. [Phase 1 落地方案](#建议的-phase-1-落地方案)

---

## 核心发现

**Cline（LingInk）项目** 是一个模块化的 AI 编码代理框架，提供了完整的 VSCode 扩展架构、工具注册系统（`createTool()`）、存储层（SQLite）、自动化引擎和可替换的 Webview UI。非常适合作为科研专用 Agent 的基础平台。

**ARS（academic-research-skills）** 是一个独立的第三方 Claude Code 插件（v3.13.0，作者 Cheng-I Wu），包含 4 个 skill、27 个模式和 39 个 agent 的学术研究流水线。它**不是本项目的一部分**，但已在当前环境中安装，可作为 prompt 设计的参考来源。

**关键结论**：灵砚 22 个功能中：
- **8 个**可纯通过 Prompt/Skill 实现（零或极低开发成本）
- **6 个**需 Prompt + 轻量 Tool（中等成本）
- **2 个**可直接参考 ARS 设计（B2 文献综述、B4 模拟审稿）
- **2 个**需中度新增开发（B5 偏好学习、D1 知识补漏）
- **2 个**需重度新增开发，是差异化核心（C1 论证链路图、E1 图文校验）

---

## 逐功能映射矩阵

### 模块 A：核心写作辅助

#### A1. 选题引导

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 纯 LLM 对话交互，无需特殊工具。Cline 的 agent 循环天然支持多轮对话 |
| **与 ARS 关系** | `ars-plan` 有 Socratic 章节规划模式，但本功能的"三问框架"（边界之问/贡献之问/可行之问）是独特的选题方法论 |
| **实现方式** | **Prompt + Skill** — 编写自定义选题引导 skill，设定苏格拉底追问链 + 三问框架。进阶模式 5-10 轮追问可通过多轮 agent 调用实现 |
| **所需新增** | 1 个 SKILL.md 文件 + 选题单导出模板 |
| **复杂度** | 🟢 低 |

#### A2. 结构重组

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 纯 LLM 分析+生成任务，需读取用户选中/全文内容 |
| **与 ARS 关系** | `ars-outline` 生成详细大纲，但缺少三种叙事路径（问题导向/方法驱动/争议切入）的对比生成能力 |
| **实现方式** | **Prompt + Skill** — 编写结构重组 skill，设定三个叙事视角的 system prompt + 对比输出格式 |
| **所需新增** | 1 个 SKILL.md + 结构化输出 schema |
| **复杂度** | 🟢 低 |

#### A3. 概念溯源

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | **需新增 Tool** — 需要调用学术 API（Crossref / Semantic Scholar）获取术语定义 |
| **与 ARS 关系** | ARS 的 `scripts/semantic_scholar_client.py` 可作为参考实现 |
| **实现方式** | **新增 Tool** — `concept_trace` 工具：术语 → 学术 API 检索 → 多学派定义分类 → 界定草稿生成。Zotero 集成可后续增加 |
| **所需新增** | 1 个 Tool（API 调用 + 结果分类） + 右键菜单注册 |
| **复杂度** | 🟡 中 |

---

### 模块 B：AI 智能体与记忆

#### B1. 投稿匹配与格式

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | **需新增 Tool** — 期刊检索 API。但 Pandoc 调用可通过 Cline 已有的 Bash 工具执行 |
| **与 ARS 关系** | 部分匹配 `ars-format-convert`（引用格式/LaTeX/DOCX 转换），但不含期刊匹配能力 |
| **实现方式** | **新增 Tool** — `journal_match`（期刊特征匹配 API） + 复用 Cline Bash 工具调 Pandoc 做格式转换 |
| **所需新增** | 1 个 Tool + 期刊数据库 API 接入 |
| **复杂度** | 🟡 中 |

#### B2. 文献检索综述

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | **需新增 Tool** — 学术 API 检索（arXiv / Semantic Scholar / PubMed） |
| **与 ARS 关系** | 🔥 **强匹配 `ars-lit-review`！** ARS 的 `deep-research lit-review` 和 `academic-paper lit-review` 模式都做文献综述，流程高度一致 |
| **实现方式** | **方案 A（推荐）**：参考 ARS 的 `scripts/arxiv_client.py` 和 `semantic_scholar_client.py` 实现检索工具 + 参考其 lit-review prompt 体系。**方案 B**：通过 CLI 调用 ARS skill 获取结果 |
| **所需新增** | 1 个检索 Tool + 文献聚类 prompt |
| **复杂度** | 🟡 中 |

#### B3. 漏洞扫描

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 可通过 LLM 结构化输出实现。需定义三级严格度（温和/标准/严格）的分析 chain |
| **与 ARS 关系** | 部分匹配 `ars-reviewer`（漏洞扫描是审稿的子集），但本功能更聚焦于**三个维度**（前提检查/证据审查/反驳演练）+ 严格度调节 |
| **实现方式** | **Prompt + 结构化输出** — 定义三层严格度的分步分析 chain + 生成《论证体检报告》 |
| **所需新增** | 1 个 Agent（多步推理） + 报告模板 |
| **复杂度** | 🟢 低 ~ 🟡 中 |

#### B4. 模拟审稿

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 纯 LLM 多角色并发对话。Cline 可并行调用多个 agent 实现 |
| **与 ARS 关系** | 🔥 **强匹配 `ars-reviewer full`！** 方法论/领域/统计/读者四角色审稿人 = ARS 的 field_analyst_agent + methodology_reviewer_agent + domain_reviewer_agent + perspective_reviewer_agent |
| **实现方式** | **推荐参考 ARS 的 `academic-paper-reviewer` skill 的 agent 定义和 prompt 体系**。可实现为 4 个并行 agent + 一个合成 agent 生成审稿意见汇编 |
| **所需新增** | 1 个多 agent 编排器 + 审稿意见模板 |
| **复杂度** | 🟢 低（直接复用设计） |

#### B5. 写作偏好学习

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | **需大幅新增** — Cline 已有 SQLite（`@cline/core` 的 better-sqlite3），但偏好数据模型、学习算法、风格分析逻辑需全新开发 |
| **与 ARS 关系** | ARS 无此功能。这是灵砚的差异化能力 |
| **实现方式** | 利用 Cline 现有 SQLite 存储层，新增：偏好采集 hook + 分析 pipeline（句式分析/术语密度/论证习惯）+ 风格报告生成 + UI 管理面板 |
| **所需新增** | 数据模型 + 分析算法 + UI 面板 |
| **复杂度** | 🔴 高 |

#### B6. 项目记忆

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 可复用 Cline 的 Session/Storage 系统。`@cline/core` 已管理会话生命周期和持久化 |
| **与 ARS 关系** | ARS 的 Material Passport（YAML 状态文件跟踪管道状态）概念可参考 |
| **实现方式** | 项目级 JSON schema（选题/假设/目标期刊/数据路径/会话焦点/未完成任务）。跨会话时读取上轮状态恢复上下文 |
| **所需新增** | 项目元数据模型 + 跨会话恢复逻辑 + UI 管理面板 |
| **复杂度** | 🟡 中 |

#### B7. 工作流

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 🔥 **Cline 已有完整自动化系统！** `packages/core/src/cron/` 提供了基于 markdown 规范文件的自动化引擎，支持一次性/定时/事件驱动任务 |
| **与 ARS 关系** | ARS 的 `academic-pipeline` 是简单的 10 阶段编排器，功能较基础 |
| **实现方式** | **直接利用 Cline 现有 cron/automation 系统** + 预置科研工作流模板（如"每周文献速递""投稿前检查清单"） |
| **所需新增** | 工作流模板文件 + 结果推送 UI |
| **复杂度** | 🟡 中 |

#### B8. 深度追问

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 需跨会话状态机 + 推理链记忆。可复用 B6 项目记忆的持久化能力 |
| **与 ARS 关系** | `deep-research socratic` 模式方向接近但更开放、无结构化追问框架 |
| **实现方式** | 状态机维护最近 5 轮问答上下文。每轮分析未明确的前提和矛盾点 → 生成下一轮追问。跨会话恢复上轮对话 |
| **所需新增** | 推理状态机逻辑 + 思维路径图生成 + 与 B6 记忆联动 |
| **复杂度** | 🟡 中 |

---

### 模块 C：论证与逻辑深度

#### C1. 论证链路图

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 🆕 **完全新增** — 需要论证提取 pipeline + Webview 可视化。这是灵砚的**差异化杀手功能** |
| **与 ARS 关系** | ARS 无对应功能 |
| **实现方式** | **后端**：LLM 逐段提取主张-证据-推理关系，输出结构化论证图数据。**前端**：Webview 中渲染节点链路图（推荐 Mermaid.js 或 D3.js），断裂处红色虚线标注 + 可点击补全 |
| **所需新增** | 论证提取 Tool + 可视化 React 组件 + 补全路径生成 |
| **复杂度** | 🔴 高 |

#### C2. 假设检测

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 纯 LLM + 结构化分析任务 |
| **与 ARS 关系** | 部分重叠 B3 漏洞扫描。本功能更聚焦于挖掘**未表述的隐含假设**而非已表述的漏洞 |
| **实现方式** | **Prompt** — 三段论分析（前提提取 → 三分类标注 → 补写建议），可与 B3 联动 |
| **所需新增** | 结构化输出 schema |
| **复杂度** | 🟢 低 |

#### C3. 反驳演练

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 交互式 LLM 对话循环。Cline 的 agent 循环天然支持 |
| **与 ARS 关系** | `devils_advocate_agent`（ARS 的 deep-research skill 中的 agent）有类似的反方角色设计 |
| **实现方式** | **Prompt** — 反方学者角色设定 → 生成 3 条反驳 → 用户逐条回应 → AI 评分（回应是否充分）→ 循环直到所有反驳被充分回应 |
| **所需新增** | 1 个交互式对话 Skill |
| **复杂度** | 🟢 低 |

---

### 模块 D：文献与知识管理

#### D1. 知识补漏

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | **需大幅新增** — 需要后台持续分析草稿 + 学术 API 实时检索 + 主动通知机制 |
| **与 ARS 关系** | ARS 无后台自动分析功能 |
| **实现方式** | 草稿变更 hook → 后台 LLM 分析（识别三类缺口：文献/方法/数据）→ 学术 API 补充检索 → 用户通知 → 一键插入。可利用 Cline 的 hook 系统监听草稿变更 |
| **所需新增** | 后台分析 pipeline + 通知机制 + 学术检索联动 |
| **复杂度** | 🔴 高 |

---

### 模块 E：数据、代码与统计辅助

#### E1. 图文校验

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 🆕 **完全新增** — 多模态理解 + 图表描述生成 + 一致性对比 |
| **与 ARS 关系** | ARS 无此功能 |
| **实现方式** | **图转文**：LLM 视觉能力分析图表 → 生成标准学术描述。**文转图**：LLM 判断"应配图" → 生成图表草稿结构。**一致性检查**：数值抽取 → 文图交叉比对 → 标注不一致处 |
| **所需新增** | 图片上传 Tool + Vision LLM 调用 + 一致性对比算法 + Webview 上传/对比 UI |
| **复杂度** | 🔴 高 |

#### E2. 结果表述

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | LLM + 统计输出格式解析 |
| **与 ARS 关系** | 无 |
| **实现方式** | **Tool** 解析 SPSS/R/Python 统计输出表格 → **Prompt** 生成学术表述 + 过度推论审核 |
| **所需新增** | 1 个统计输出解析 Tool + 审核 prompt |
| **复杂度** | 🟡 中 |

#### E3. 代码辅助

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 🔥 **Cline 核心能力！** 代码理解/生成/重构是 Cline 的天生优势 |
| **与 ARS 关系** | 无 |
| **实现方式** | **复用 Cline 现有代码能力** + 定制输出格式：LaTeX algorithm2e 伪代码 / 学术注释模板 / 代码-论文一致性校验 |
| **所需新增** | 学术输出格式模板 + 伪代码提炼 prompt |
| **复杂度** | 🟢 低 |

---

### 模块 F：语言润色

#### F1. 英文润色

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 纯 LLM 任务，完全可 prompt 实现 |
| **与 ARS 关系** | ARS 的论文写作 skill 含基本润色但非专门功能 |
| **实现方式** | **Prompt 工程** — 双层润色：基础层（地道度校验三级标记 + 语感解析）+ 进阶层（精准化/得体性/声调统一 + 声调地图雷达图） |
| **所需新增** | 2 套系统 prompt + 语感评分 schema |
| **复杂度** | 🟢 低 |

---

### 模块 G：写作体验

#### G2. 反馈风格切换

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | 纯 Prompt 工程 + 用户设置切换 |
| **与 ARS 关系** | 无 |
| **实现方式** | **3 套 System Prompt 模板** — 书童（温和鼓励）/ 诤友（直接客观）/ 老学究（引经据典），界面一键切换，所有 AI 输出经风格 prompt 重写 |
| **所需新增** | 3 段风格 prompt + 切换 UI 控件 |
| **复杂度** | 🟢 极低（0.5 天） |

---

### 模块 H：发表与学术生涯

#### I1. 报告准备

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | LLM 摘要 + 结构生成 |
| **与 ARS 关系** | 无 |
| **实现方式** | **Prompt** — 三段式摘要（3 分钟/15 分钟/30 分钟版本）+ 预判问答生成 |
| **所需新增** | 1 个 Skill |
| **复杂度** | 🟢 低 |

#### I2. 方向拓展

| 维度 | 分析 |
|------|------|
| **与 Cline 关系** | LLM 树状分析 + 可选期刊数据 API |
| **与 ARS 关系** | 无 |
| **实现方式** | **Prompt** — 从核心论点/局限性延伸分支问题 → 树状图生成。期刊征稿匹配依赖外部数据源，建议后置 |
| **所需新增** | 树状图可视化组件 + 可选期刊征稿 API |
| **复杂度** | 🟡 中 |

---

## 汇总统计

| 实现方式 | 数量 | 功能列表 |
|---------|:---:|---------|
| 🟢 **纯 Prompt/Skill 实现** | 8 | A1 选题引导, A2 结构重组, C2 假设检测, C3 反驳演练, E3 代码辅助, F1 英文润色, G2 反馈风格切换, I1 报告准备 |
| 🟡 **Prompt + 轻量 Tool** | 7 | A3 概念溯源, B1 投稿匹配, B6 项目记忆, B7 工作流, B8 深度追问, E2 结果表述, I2 方向拓展 |
| 🟡 **可参考 ARS 设计** | 2 | B2 文献检索综述, B4 模拟审稿 |
| 🟠 **需中度新增开发** | 2 | B5 写作偏好学习, D1 知识补漏 |
| 🔴 **需重度新增开发（差异化核）** | 2 | C1 论证链路图, E1 图文校验 |

---

## 推荐架构方案

基于"**Cline 为基础 + 分级实现**"的原则，建议分 4 层架构：

```
灵砚 VSCode Extension
│
├─ 层 1：Prompt 层（零成本快速交付）
│   ├─ F1 英文润色 / G2 反馈切换 / C3 反驳演练
│   ├─ A1 选题引导 / A2 结构重组 / I1 报告准备
│   ├─ C2 假设检测 / I2 方向拓展
│   └─ 📦 实现方式：.clinerules/ + .agents/skills/ 注入领域知识
│
├─ 层 2：Tool 层（轻量工具注册）
│   ├─ A3 概念溯源 → concept_trace tool（Semantic Scholar / Crossref API）
│   ├─ B1 投稿匹配 → journal_match tool + Pandoc 格式转换
│   ├─ B2 文献综述 → literature_search tool（arXiv / PubMed API）
│   ├─ E2 结果表述 → stat_parser tool（SPSS / R / Python 输出解析）
│   └─ 📦 实现方式：利用 Cline 的 createTool() API 注册科研工具
│
├─ 层 3：Agent 层（多步推理 + 记忆）
│   ├─ B3 漏洞扫描 / B4 模拟审稿 → 多 agent 编排
│   ├─ B6 项目记忆 → SQLite 持久化项目状态
│   ├─ B7 工作流 → 复用 Cline cron/automation 系统
│   ├─ B8 深度追问 → 跨会话推理状态机
│   ├─ B5 写作偏好学习 → 长期数据采集 + 风格分析
│   └─ D1 知识补漏 → 后台草稿分析 + 智能通知
│
└─ 层 4：UI 层（Webview 可视化，差异化功能）
    ├─ C1 论证链路图 → Mermaid.js / D3.js 可视化骨架
    ├─ E1 图文校验 → 图片上传 + 一致性对比面板
    └─ 📦 实现方式：修改 apps/vscode/webview-ui/ React 应用
```

### 架构决策原则

1. **能 prompt 不写代码** — 层 1 功能完全用 system prompt 和 skill 文件实现
2. **能轻量 Tool 不建 Agent** — 层 2 功能注册单一工具，不引入复杂状态
3. **Agent 用于多步推理** — 层 3 功能需要编排、记忆、状态管理时才使用 agent
4. **UI 只做差异化亮点** — 层 4 只做纯 LLM 做不到的可视化和多模态交互

---

## ARS 利用策略

ARS（academic-research-skills）是 Claude Code 插件，**不能直接在 VSCode 扩展中运行**。但有两种利用方式：

### 方案 A：参考设计（推荐）

ARS 的完整 prompt 体系是极佳的参考材料：

| ARS 组件 | 可供参考的内容 | 对应的灵砚功能 |
|----------|---------------|----------------|
| `deep-research lit-review` 的 agent 定义 + prompt | 文献检索策略、多源信息整合流程 | B2 文献检索综述 |
| `academic-paper-reviewer` 的 5 个审稿 agent | 方法论/领域/统计/读者审稿视角的具体 prompt | B4 模拟审稿 |
| `devils_advocate_agent` | 反方论证生成的 prompt 设计 | C3 反驳演练 |
| `scripts/semantic_scholar_client.py` | Semantic Scholar API 调用代码（可直接复用） | A3 概念溯源, B2 文献综述 |
| `scripts/arxiv_client.py` | arXiv API 调用代码（可直接复用） | B2 文献综述 |
| `verification_cache.py` | SQLite 验证缓存实现 | B5/B6 记忆系统 |
| Material Passport schema | 跨会话状态管理的 YAML schema 设计 | B6 项目记忆 |
| Generator-Evaluator Contract | 写作-审校分离的 prompt 设计模式 | B3 漏洞扫描 |

## 建议的 Phase 1 落地方案

参考需求文档的优先级 + Cline 可复用度，推荐的 6 周启动计划：

### Week 1：基建 + 品牌化（2 天）

| 任务 | 具体内容 | 产出 |
|------|---------|------|
| Fork 项目 | 创建灵砚仓库 | 独立代码库 |
| 环境搭建 | 本地开发环境就绪 | 可运行的 dev 环境 |
| 品牌化 | 修改扩展名、图标、活动栏图标 | "灵砚" VSCode 扩展骨架 |
| G2 反馈风格 | 3 套 prompt 模板 + UI 切换控件 | 第一个可见功能 |

### Week 2：纯 Prompt 功能上线（3 天）

| 任务 | 具体内容 | 产出 |
|------|---------|------|
| F1 英文润色 | 双层润色 prompt + 语感评分 | 润色功能可用 |
| A1 选题引导 | 苏格拉底三问链 skill + 选题单导出 | 选题引导可用 |
| C3 反驳演练 | 反方角色 prompt + 评分循环 | 反驳演练可用 |

### Week 3：轻量 Tool 开发（3 天）

| 任务 | 具体内容 | 产出 |
|------|---------|------|
| A3 概念溯源 | `concept_trace` tool + Semantic Scholar API | 概念溯源可用 |
| B2 文献检索 | `literature_search` tool + arXiv API | 文献检索可用 |

### Week 4：Agent 编排能力（3 天）

| 任务 | 具体内容 | 产出 |
|------|---------|------|
| B3 漏洞扫描 | 结构化输出 + 三级严格度 | 漏洞扫描可用 |
| B4 模拟审稿 | 4 角色并行 agent | 模拟审稿可用 |
| B7 工作流 | 预置 2 个科研工作流模板 | 工作流可用 |

### Week 5：记忆系统 + 可视化（3 天）

| 任务 | 具体内容 | 产出 |
|------|---------|------|
| B6 项目记忆 | SQLite 项目元数据 + 跨会话恢复 | 项目记忆可用 |
| C1 论证链路图 | LLM 提取 + Webview 可视化原型 | 论证链路图 MVP |

### Week 6：集成测试 + 发布（3 天）

| 任务 | 具体内容 | 产出 |
|------|---------|------|
| 集成测试 | 所有功能联调、边界场景测试 | 稳定版本 |
| 文档 | 用户文档 + 开发者文档 | 文档就绪 |
| 打包发布 | vsce 打包 + Marketplace 发布 | 灵砚 v1.0.0 |

**总计：约 6 周 / 17 个工作日 可完成 Phase 1 MVP（12 个核心功能）。**

---

## 附录

### A. 关键文件路径参考

| 项目 | 路径 |
|------|------|
| 灵砚需求文档 | `specs/灵砚功能需求报告-通俗版.md` |
| VSCode 扩展入口 | `apps/vscode/src/extension.ts` |
| Webview UI 源码 | `apps/vscode/webview-ui/` |
| 扩展配置 | `apps/vscode/package.json` |
| Cline Agent 核心 | `sdk/packages/agents/src/agent-runtime.ts` |
| 工具注册 API | `sdk/packages/agents/src/tool/` |
| 存储层 | `sdk/packages/core/src/storage/` |
| 自动化系统 | `sdk/packages/core/src/cron/` |
| 项目规则（提示词注入点） | `.clinerules/` |
| Agent Skill 定义目录 | `.agents/skills/` |
| ARS 插件缓存 | `C:\Users\24107\.claude\plugins\cache\academic-research-skills\academic-research-skills\3.13.0\` |

### B. 术语对照

| 需求文档 | Cline/ARS 对应概念 |
|---------|-------------------|
| Agent | `AgentRuntime` / `ClineCore` — 有状态/无状态代理循环 |
| 工具（Tool） | `createTool()` — 工具注册 API |
| Skill | `.clinerules/skills/` + `SKILL.md` — 领域知识注入 |
| 工作流 | `packages/core/src/cron/` — 基于文件的自动化引擎 |
| 记忆 | Cline 的 SQLite session 存储 + 自定义项目状态 |
| Webview | `webview-ui/` — React 18 + Tailwind + gRPC |
| 多 Agent | `AgentTeam` / `AgentTeamsRuntime` — 多代理编排 |

---

## 附录 C：ARS 内置集成完成情况

> 最后更新：2026-06-29

### 集成方式

采用 **VS Code 扩展自动安装 + Cline Skill 系统** 双轨集成：

**A. 扩展包内捆绑（始终可用）**

```
apps/vscode/bundled-skills/lingink-ars/   ← 随 VSIX 发布
├── deep-research/SKILL.md       (29.8 KB / 8 模式 / 13 代理)
├── academic-paper/SKILL.md      (40.1 KB / 11 模式 / 12 代理)
├── academic-paper-reviewer/     (25.2 KB / 6 模式 / 7 代理)
├── academic-pipeline/           (37.5 KB / 10 阶段 / 5 代理)
├── agents/                  ← 共享 Agent 定义
├── shared/                  ← 共享参考/合约/模板
├── scripts/                 ← Python 脚本（API 客户端等）
└── commands/                ← 斜杠命令（参考）
```

**B. 自动检测 + 一键安装到工作区**

用户打开任意目录作为工作区时，插件自动执行：

1. **检测** → 检查 `工作区/.clinerules/skills/.lingink-ars-installed` 标记
2. **提示** → 未安装时弹出通知，含"安装学术研究技能包"按钮
3. **安装** → 用户点击后将捆绑内容复制到 `工作区/.clinerules/skills/`
4. **标记** → 写入 `工作区/.clinerules/skills/.lingink-ars-installed`，避免重复提示

### 路径适配

SKILL.md 中的文件引用已适配为 `.clinerules/skills/` 结构下的正确相对路径：

| 引用类型 | 原始路径 | 适配后路径 |
|---------|---------|-----------|
| Skill 自有 Agent | `agents/xxx.md` | 不变 → `<skill>/agents/xxx.md` |
| 共享参考 | `shared/xxx.md` | → `../shared/xxx.md` |
| Python 脚本 | `scripts/xxx.py` | → `../scripts/xxx.py` |

### 核心代码变更

| 文件 | 说明 |
|------|------|
| `src/services/skill-installer.ts` | 🆕 安装逻辑：检测/复制/标记/通知 |
| `src/extension.ts` | 🔧 `activate()` 中注册命令 + 启动时自动检测 |
| `src/registry.ts` | 🔧 添加 `InstallAcademicSkills` 命令枚举 |
| `package.json` | 🔧 注册 `cline.installAcademicSkills` 命令 |
| `src/sdk/SdkController.ts` | 🔧 添加捆绑路径作为斜杠命令后备查找路径 |

### 设计要点

- **无侵入式**：不修改 Cline 核心代码，只在扩展层添加安装流程
- **延迟安装**：用户确认后才写入文件系统，不影响无科研需求的用户
- **幂等性**：标记文件防止重复提示，覆盖安装时覆盖旧文件
- **离线兼容**：Skills 打包在 VSIX 中，无需网络即可安装
- **命令触发**：用户也可从命令面板手动触发（`Install Academic Research Skills`）

### 版本信息

- **ARS 版本**：v3.13.0（从 GitHub 最新版直接导入）
- **来源**：https://github.com/Imbad0202/academic-research-skills
- **许可证**：CC-BY-NC-4.0（原作者 Cheng-I Wu）
