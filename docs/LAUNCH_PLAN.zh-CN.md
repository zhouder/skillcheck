# Skillcheck 推广计划

更新日期：2026-06-19

## 核心定位

一句话：Skillcheck 是 Agent Skills 的离线质量门禁，一条命令检查规范、
安全、上下文成本和可移植性，无需 API Key，也不会执行被检查的脚本。

推广时不要只说“这是一个新项目”，而要展示：

1. 一个真实 `SKILL.md`；
2. 一条 `npx @zhouder/skillcheck .` 命令；
3. 清晰的分数、证据位置和修复建议；
4. GitHub Action 在 PR 中产生的注解。

## 发布前素材

- 录制 15-25 秒终端演示：运行检查、出现发现项、修复后重新得到 A。
- 制作 1280x640 社交预览图，标题使用 `The quality gate for Agent Skills`。
- GitHub 个人主页置顶 `zhouder/skillcheck`。
- 所有帖子统一使用仓库地址：https://github.com/zhouder/skillcheck
- 需要证据时链接真实验证报告：
  https://github.com/zhouder/skillcheck/blob/main/docs/REAL_WORLD_VALIDATION.md

## 渠道优先级

### 第一优先级：开发者社区

1. Hacker News 发布 `Show HN`。正文保持技术化，说明为什么做、如何实现、
   已知限制和真实案例，不写夸张营销语。发布后至少在线两小时回答问题。
2. 在 X、LinkedIn 或即刻发布短演示。首帖只讲一个明确痛点和一条命令。
3. 选择与 Agent Skills 直接相关的 Reddit、Discord 或论坛社区。先阅读社区
   规则，针对不同社区重写开头，不要复制同一段广告。

### 第二优先级：生态集成

1. 找 3-5 个维护活跃的 Agent Skill 仓库，先在本地运行 Skillcheck。
2. 只有发现明确且可修复的问题时，提交小型 PR；不要批量创建“扫描结果”
   Issue，也不要要求维护者 Star。
3. 征得维护者认可后，提交加入 `zhouder/skillcheck@v0` 的 CI PR。
4. 向包含 AI agent tooling、Agent Skills 或静态分析工具分类的 Awesome 列表
   提交符合其贡献规范的单项 PR。

### 第三优先级：集中发布平台

Product Hunt 等平台放在已有真实用户、演示素材和 3-5 条反馈之后。开发者
工具早期最有价值的是技术讨论和生态采用，而不是一次性的点赞数字。

## 可直接使用的文案

### 中文首发

```text
我做了 Skillcheck：一个面向 Agent Skills 的离线质量门禁。

它会检查 SKILL.md 规范、安全风险、上下文开销和跨客户端可移植性，
不需要 API Key，也不会执行被检查的脚本。

npx @zhouder/skillcheck .

目前有 27 条确定性规则，支持 JSON、Markdown、SARIF 和 GitHub Action。
我还用 Anthropic、Vercel、GitHub 等公开技能做了固定提交的真实验证，并据此
修复了两类误报和评分饱和问题。

GitHub: https://github.com/zhouder/skillcheck
欢迎直接拿你的 Skill 仓库测试，Issue 中告诉我误报或漏报案例。
```

### Show HN 标题

```text
Show HN: Skillcheck – an offline quality gate for Agent Skills
```

### Show HN / Reddit 正文

```text
I built Skillcheck, an offline linter and security-focused quality gate for
Agent Skills.

Run it with:

  npx @zhouder/skillcheck .

It validates SKILL.md against the open specification, checks high-confidence
security and portability risks, estimates context cost, and emits terminal,
JSON, Markdown, SARIF, and GitHub Action reports. It is deterministic, uses no
API key, sends no telemetry, and never executes analyzed scripts.

I validated it against pinned skills from Anthropic, Vercel, GitHub, and other
public repositories. That process exposed two false-positive classes and a
score-saturation problem, all now covered by regression tests.

Repo: https://github.com/zhouder/skillcheck
Validation notes: https://github.com/zhouder/skillcheck/blob/main/docs/REAL_WORLD_VALIDATION.md

I would especially value examples of false positives, client-specific metadata,
and skills that behave differently across agents.
```

## 14 天执行节奏

| 时间 | 动作 |
| --- | --- |
| 第 1 天 | 完成演示、社交预览图、GitHub 置顶；发布中文首帖 |
| 第 2 天 | 发布 Show HN；集中回复技术问题 |
| 第 3-4 天 | 选择两个相关社区分别发布，避免复制粘贴式群发 |
| 第 5-7 天 | 根据反馈修复最高价值问题；寻找第一个外部 Action 集成 |
| 第 8-10 天 | 写一篇真实案例文章，解释发现项、误报修复和评分校准 |
| 第 11-14 天 | 提交 Awesome 列表；总结指标；决定 v0.2.0 范围 |

## 成功指标

前两周优先衡量真实采用，而不是只看 Star：

- 10 个可确认的外部安装或运行；
- 3 个外部仓库采用 CLI 或 GitHub Action；
- 5 条包含具体样本的有效反馈；
- 1 位外部贡献者；
- npm 周下载、GitHub 独立克隆者和 Star 的持续增长。

## 不要做

- 不购买 Star，不参与互赞群。
- 不向无关仓库批量发 Issue 或 PR。
- 不夸大“安全保证”；静态分析只能提供证据和风险信号。
- 不在所有社区复制完全相同的文案。
- 不为了提高分数而弱化规则；用真实误报样本驱动调整。
