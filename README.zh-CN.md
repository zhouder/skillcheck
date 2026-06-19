# Skillcheck

[English](README.md) | **简体中文**

[![npm version](https://img.shields.io/npm/v/%40zhouder%2Fskillcheck.svg)](https://www.npmjs.com/package/@zhouder/skillcheck)
[![CI](https://github.com/zhouder/skillcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/zhouder/skillcheck/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40zhouder%2Fskillcheck.svg)](LICENSE)

**判断一个 Agent Skill 是否有效、安全、精简，并已准备好发布。**

Skillcheck 是面向开放 [Agent Skills 规范](https://agentskills.io/specification) 的离线质量门禁。它可以验证 `SKILL.md`、扫描技能包中的高置信度风险、测量上下文开销，并生成适用于本地环境和 GitHub Actions 的报告。

```text
Skillcheck 0.1.1

csv-review  100/100 A
examples/csv-review/SKILL.md | 2 files | ~88 context tokens
  OK  No findings

1 skill | 0 errors | 0 warnings | 0 info
```

查看[真实项目验证报告](docs/REAL_WORLD_VALIDATION.md)，了解 Skillcheck 对 Anthropic、Vercel、GitHub 及其他广泛使用的公开技能进行测试的可复现结果。

## 为什么选择 Skillcheck

- **兼容规范：** 覆盖官方元数据和命名约束。
- **关注安全：** 检测直接远程执行、大范围删除、凭据访问、打包私钥、提示词覆盖、不安全链接以及越界符号链接。
- **关注上下文：** 在冗长指令和过大的技能包消耗智能体上下文窗口之前发出提示。
- **跨客户端：** 标记实验性和不可移植的行为，不绑定某个特定的智能体产品。
- **默认保护隐私：** 分析过程具有确定性、完全离线、无遥测、无需 API 密钥，也不会执行被分析的脚本。
- **适用于 CI：** 支持终端文本、JSON、Markdown、SARIF 2.1.0 和 Shields Endpoint 输出。

## 快速开始

需要 Node.js 20.12 或更高版本。

```bash
npx @zhouder/skillcheck ./my-skill
```

分析仓库下的所有技能：

```bash
npx @zhouder/skillcheck .
```

生成机器可读的报告：

```bash
npx @zhouder/skillcheck . --format json --output skillcheck.json
npx @zhouder/skillcheck . --format sarif --output skillcheck.sarif
npx @zhouder/skillcheck . --format markdown --output skillcheck.md
npx @zhouder/skillcheck . --format badge --output skillcheck-badge.json
```

创建一个最小可用的技能：

```bash
npx @zhouder/skillcheck init ./skills/csv-review
```

## 退出码

| 退出码 | 含义 |
| ---: | --- |
| `0` | 分析完成，且没有发现达到失败阈值的问题 |
| `1` | 至少一项发现达到配置的失败阈值 |
| `2` | 命令无效、配置错误或内部错误 |

默认阈值为 `error`，可以通过命令行修改：

```bash
npx @zhouder/skillcheck . --fail-on warning
npx @zhouder/skillcheck . --fail-on never
```

## 配置

Skillcheck 会向上查找 `.skillcheckrc.json` 或 `skillcheck.config.json`。配置仅支持 JSON，因此加载配置时绝不会执行项目代码。

```json
{
  "$schema": "https://unpkg.com/@zhouder/skillcheck/schema/config.schema.json",
  "ignore": ["**/vendor/**", "**/generated/**"],
  "maxDepth": 8,
  "failOn": "warning",
  "rules": {
    "quality/license": "error",
    "portability/unicode-name": "off"
  }
}
```

规则设置可以是 `off`、`info`、`warning` 或 `error`。运行 `skillcheck rules` 或阅读[规则参考](docs/RULES.md)可以查看规则 ID。

## GitHub Action

```yaml
name: Skillcheck
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  skillcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: zhouder/skillcheck@v0
        with:
          path: skills
          fail-on: warning
          sarif-file: skillcheck.sarif
```

该 Action 会添加文件注解、写入任务摘要、导出分数和问题数量，并可选择生成 SARIF 文件。是否将 SARIF 上传到 GitHub 代码扫描由仓库维护者自行决定；启用上传需要 `security-events: write` 权限。

## 徽章

`badge` 格式会生成一个 [Shields Endpoint](https://shields.io/badges/endpoint-badge) 文档：

```json
{
  "schemaVersion": 1,
  "label": "skillcheck",
  "message": "A 100/100",
  "color": "brightgreen"
}
```

提交生成的 JSON，或将它作为构建产物发布，然后让 Shields Endpoint 徽章指向它的原始文件 URL。

## 评分方式

每个技能初始为 100 分，发现问题后会根据严重级别和类别施加相应权重的扣分。同一规则的重复发现采用递减权重，总扣分通过平滑衰减计算，不会突然截断为零。规范和安全错误比质量或可移植性提示的权重更高。分数只是便于比较的简要指标，并不构成安全保证；具体证据和每项发现仍是判断依据。

| 等级 | 分数 |
| --- | ---: |
| A | 90-100 |
| B | 80-89 |
| C | 70-79 |
| D | 60-69 |
| F | 0-59 |

## 安全模型

Skillcheck 将所有被分析的技能视为不可信输入。它不会执行脚本、在发现过程中跟随符号链接、加载 JavaScript 配置或发起网络请求。静态检查会优先报告高置信度问题，但无法证明一个技能绝对安全。详情请参阅 [SECURITY.md](SECURITY.md)。

## 开发

```bash
npm install
npm run check
npm run test:coverage
npm run build:all
npm run package:check
```

进行行为变更前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)、[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 和 [PROJECT_STATUS.md](PROJECT_STATUS.md)。

## 许可证

MIT
