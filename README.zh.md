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

## 首次成功：无需 API key

需要 Node.js 18+，首次需下载 Chromium。在一个空工作目录执行：

```bash
# 0.9.5 尚未上 npm 时，先从源码 checkout 打本地包：
git clone https://github.com/263311487-ux/dsh-verify && cd dsh-verify
npm install && npm pack
mkdir /tmp/dsh-verify-starter-run && cd /tmp/dsh-verify-starter-run
# 将 /path/to 替换成你克隆仓库的绝对路径。
npm install --save-dev /path/to/dsh-verify/dsh-verify-0.9.5.tgz
# 0.9.5 发布后可改用：npm install --save-dev dsh-verify@0.9.5
npx dsh-verify init
cd dsh-verify-starter
npx playwright install chromium
npx dsh-verify --spec dsh-verify.spec.json
# PASS (5/5)，退出码 0 -> dsh-verify-out/report.html
npx dsh-verify --spec dsh-verify.fail.json --out failed-report
# 故意失败：FAIL (4/5)，退出码 1 -> failed-report/report.html
```

打开 HTML 报告时保留同级 PNG 图片。失败清单故意断言错误文字，可直接检查断言与截图；另有[缺失 CSS 的失败报告](evidence/buggy-report.html)。

`init [目录]` 只在新目录内写入本地网页和两份 JSON 清单，不调用模型、不启动浏览器、不下载资源。父目录必须存在；目标路径如已存在（包括空目录、文件、符号链接）会拒绝，不提供强制覆盖选项。从 GitHub 安装项目和首次下载浏览器需要联网，两份示例仅访问本机。`gen` 与 MCP `generate_and_verify` 是另行启用、需要模型 key 的功能。

验收自己的应用时编辑步骤；静态文件用 `serve`，已有网址用 `base`。`serve` 相对于执行命令的当前目录，不是清单所在目录。PASS 仅表示本次浏览器运行中所写断言通过，不证明需求全覆盖、安全、无障碍或规范作者独立。网页与规范可能出自同一 agent，需要独立性时应另行审核规范。报告保存断言细节与明确请求的截图，不是完整审计轨迹。

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

这次已有检查没有覆盖渲染后的样式行为；浏览器断言补上了这项覆盖。

## 怎么用（三种方式）

### ① 命令行（最直接）

```bash
# 一条命令：写个 JSON 检查清单，真实浏览器跑一遍
npx dsh-verify --spec spec.json
```

初始化后打开生成的 JSON 即可看到完整格式：顶层对象包含 serve 与 steps。样式变化断言需先用 capture_style 保存同名变量。

### ② MCP 服务（给 Claude Code / Cursor / Copilot 用）

让 AI 自己也能"打开真实浏览器自查"：

- `verify_spec` —— 按 JSON 规范跑真实浏览器检查
- `verify_url` —— 直接检查一个网址
- `generate_and_verify` —— AI 起草检查清单，真实浏览器强制执行（AI 永远不给自己打分）

已收录于 [glama.ai](https://glama.ai/mcp/servers/263311487-ux/dsh-verify) 与 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。

### ③ GitHub Action（接入 CI）

一个步骤跑完验收，带报告产物：

```yaml
- uses: 263311487-ux/dsh-verify/.github/actions/dsh-verify@main
  with:
    spec: demo/fixed.json
    out: dsh-verify-out
```

## Arena 历史样本与限制

仓库记录时间为 **2026-08-17–18 UTC**：共 **48 条记录，44 PASS、2 FAIL、2 ERROR**；两个记录中的模型标签 × 两种策略 × 三个静态任务，每格四条。自检策略最多额外修复两轮，计算预算不同，不能据此推断普遍可靠性、性价比或当前模型排名。

模型标签未经独立身份核验；历史记录未锁定验收器及依赖版本，生成网页、模型回复与本机报告未提交，无法仅凭仓库精确复现旧失败。0.9.5 文档整理没有重跑付费模型实验。

- [Arena 历史看板](https://263311487-ux.github.io/dsh-verify/arena/)
- [方法、版本与证据限制](docs/ARENA.md)

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

**Q：与 LLM 评测、agent 浏览器工具有什么区别？**
A：其他工具也能集成浏览器；这里提供可保存、可重复执行的断言和报告。浏览器执行本身不保证规范独立或覆盖完整，AI 起草规范仍需审核。

## 生态收录

- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) · [DeepSeek Harness 插件商店](https://github.com/Ericwong5021/deepseek-plugin-store) · [glama.ai MCP 目录](https://glama.ai/mcp/servers/263311487-ux/dsh-verify) · [unStone/dsh-xray](https://github.com/unStone/dsh-xray)

## License

MIT
