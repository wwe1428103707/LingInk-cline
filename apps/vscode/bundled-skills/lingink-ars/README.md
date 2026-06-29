# 灵砚内置学术研究 Skills

本目录包含 灵砚（LingInk）预装的 **Academic Research Skills (ARS)** v3.13.0，提供完整的学术研究流水线能力。

> 原始项目：https://github.com/Imbad0202/academic-research-skills (CC-BY-NC-4.0)

## 已安装的 Skills

| Skill | 版本 | 说明 | 代理数 | 模式数 |
|-------|------|------|--------|--------|
| `deep-research` | v2.11.0 | 通用深度研究 Agent 团队 | 13 | 8 |
| `academic-paper` | v3.2.0 | 学术论文写作流水线 | 12 | 11 |
| `academic-paper-reviewer` | v1.10.0 | 多视角同行评审模拟 | 7 | 6 |
| `academic-pipeline` | v3.13.0 | 全流程编排器（研究→写作→评审→修订→定稿） | 5 | 1 |

## 目录结构

```
.clinerules/skills/
├── deep-research/           ← Skill 1 目录
│   ├── SKILL.md             ← 主指令（29.8 KB）
│   ├── agents/              ← 本 skill 的 Agent 定义
│   ├── references/          ← 本 skill 的参考文档
│   └── templates/           ← 模板文件
├── academic-paper/          ← Skill 2
├── academic-paper-reviewer/ ← Skill 3
├── academic-pipeline/       ← Skill 4
├── agents/                  ← 插件级共享 Agent 定义
├── shared/                  ← 跨 skill 共享的参考、合约、模板
├── scripts/                 ← Python 脚本（API 客户端、工具等）
├── commands/                ← Claude Code 斜杠命令定义（参考用）
├── _plugin-manifest.json    ← 插件元数据
└── _routing-guide.md        ← 路由规则参考
```

## 文件引用说明

Skills 中的文件引用已适配为相对路径：

- `agents/xxx.md` → 当前 skill 目录下的 `agents/` 子目录
- `../shared/xxx.md` → `.clinerules/skills/shared/` 共享目录
- `../scripts/xxx.py` → `.clinerules/skills/scripts/` 脚本目录

## 来源

所有内容出自 [academic-research-skills v3.13.0](https://github.com/Imbad0202/academic-research-skills)
作者：Cheng-I Wu, License: CC-BY-NC-4.0
