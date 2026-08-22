# dsh-verify（Witness）· 智能体说做完了，浏览器来证明

[![ci](https://github.com/263311487-ux/dsh-verify/actions/workflows/ci.yml/badge.svg)](https://github.com/263311487-ux/dsh-verify/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-verify)](https://www.npmjs.com/package/dsh-verify)
[![MCP server](https://glama.ai/mcp/servers/263311487-ux/dsh-verify/badges/score.svg)](https://glama.ai/mcp/servers/263311487-ux/dsh-verify)
[![awesome-dsh-plugin](https://img.shields.io/badge/awesome--dsh--plugin-listed-brightgreen)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
[![GitHub stars](https://img.shields.io/github/stars/263311487-ux/dsh-verify?style=social)](https://github.com/263311487-ux/dsh-verify/stargazers)

**你让 DeepSeek Harness（或其他 AI）帮你写了个网页。它说"做完了"。你敢直接上线吗？**

`dsh-verify` 会打开一个**真实的浏览器**，把你写好的检查清单一步步执行一遍：点击、输入、看样式、查控制台报错、对比截图。通过就是 **PASS**，不通过就是 **FAIL**，还附带截图证据。

**评判者不是 AI，是真实浏览器。**

> 如果 Witness 帮你抓到了问题，⭐ [给仓库点个星](https://github.com/263311487-ux/dsh-verify)——这是这个项目活下去的方式。

---

## 为什么需要它

我们跑了一个 4-agent 网页开发团队（需求 → 前端 → QA → 评审）。团队的自我评审结果是：

> ✅ "所有需求均已满足，无问题。"

但用真实浏览器打开后，**暗色模式切换按钮完全没有反应**——JS 切换了 `.dark` 类，但 `.dark` 的 CSS 规则根本没写。

每个 agent 的"自测"都通过了，因为页面上根本没有可运行的东西。**没有人打开过真实浏览器。**

| 构建 | agent 自评 | 真实浏览器结论 |
|---|---|---|
| `demo/buggy`（少一条 CSS 规则） | "无问题" | ❌ **FAIL** —— 背景色永远不变 |
| `demo/fixed`（补上一条 CSS 规则） | 已修复 | ✅ **PASS** —— 主题正常切换 |

同一页面、同一段 JS，只差一条 CSS 规则，两种完全不同的结论。

**单元测试和静态检查抓不到"少了一条 CSS 规则"这种问题。** agent 是在验证"自己以为做出来的东西"，不是在验证"用户真正体验到的页面"。

## 怎么用（三种方式）

### ① 命令行（最直接）

```bash
# 一条命令：写个 JSON 检查清单，真实浏览器跑一遍
npx dsh-verify --spec spec.json
```

检查清单长这样（都是"人会在浏览器里检查什么"）：

```json
[
  { "action": "goto", "url": "http://localhost:3000" },
  { "action": "click", "selector": "#color-btn" },
  { "action": "expect_style_changed", "selector": "#page", "prop": "backgroundColor" }
]
```

跑完输出 `PASS (6/6)` 或 `FAIL (4/6)`，并生成一份带截图的 HTML 报告。

### ② MCP 服务（给 Claude Code / Cursor / Copilot 用）

让 AI 自己也能"打开真实浏览器自查"：

- `verify_spec` —— 按 JSON 规范跑真实浏览器检查
- `verify_url` —— 直接检查一个网址
- `generate_and_verify` —— AI 起草检查清单，真实浏览器强制执行（AI 永远不给自己打分）

已收录于 [glama.ai](https://glama.ai/mcp/servers/263311487-ux/dsh-verify) 与 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。

### ③ GitHub Action（接入 CI）

一个步骤跑完验收，带报告产物：

```yaml
- uses: 263311487-ux/dsh-verify@v0.9.0
  with:
    spec: demo/fixed.json
    out: dsh-verify-out
```

## 实测数据（48 次真实浏览器运行）

| 模型 | 单次生成 | 自检循环 |
|---|---|---|
| DeepSeek V4 Flash | 11/12 通过 | 11/12 通过 |
| DeepSeek V4 Pro | 10/12 通过 | 12/12 通过 |

**最有说服力的一个结果**：最不稳的"待办清单"任务，加上自检循环后从 **6/8 提到 8/8**——差的不是智力，是验证。

- 完整排行榜（开放提交，带上你的 agent 上榜）：[Agent Arena](https://263311487-ux.github.io/dsh-verify/arena/)
- 演示站：[https://263311487-ux.github.io/dsh-verify/](https://263311487-ux.github.io/dsh-verify/)

## 特性一览

- ✅ JSON 规范，无框架：`goto → click → expect_text → capture_style → expect_style_changed`
- ✅ 真实 Chromium（Playwright 驱动，默认无头）
- ✅ 校验**计算样式**而不是 class 列表（正是能抓到"class 切了但 CSS 没写"的那类问题）
- ✅ 视觉回归：像素级截图对比 + 红色高亮差异图
- ✅ AI 起草检查清单：`dsh-verify gen --url <url> --run`
- ✅ MCP 服务 + GitHub Action + HTML 报告 + 退出码 0/1
- ✅ 多浏览器（Chromium / Firefox / WebKit）

## 快速开始

```bash
git clone https://github.com/263311487-ux/dsh-verify
cd dsh-verify
npm install
npx playwright install chromium
npm run demo:buggy   # FAIL —— 本仓库最想展示的那个 bug
npm run demo:fixed   # PASS
```

## 常见问题

**Q：和手写 Playwright 脚本有什么区别？**
A：JSON 规范本身就是"需求文档"，一次编写，agent 和 CI 都能复用；而且不用每个项目重写一遍样板代码。

**Q：和 LLM 裁判（promptfoo 之类的评测）有什么区别？**
A：LLM 说"看起来没问题"，它没有运行你的应用、没有看到像素。真实浏览器会执行点击、输入、样式断言，并返回截图证据。

**Q：agent 自己也有浏览器工具，为什么还要它？**
A：agent 的浏览器工具是 agent 自己的"手"——和它刚写出来的代码共享同一个盲区。dsh-verify 是独立的见证者，不属于被测试的 agent。

## 生态收录

- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) · [DeepSeek Harness 插件商店](https://github.com/Ericwong5021/deepseek-plugin-store) · [glama.ai MCP 目录](https://glama.ai/mcp/servers/263311487-ux/dsh-verify) · [unStone/dsh-xray](https://github.com/unStone/dsh-xray)

## License

MIT
