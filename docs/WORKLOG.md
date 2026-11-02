# 工作日志

按时间记录每一步做了什么、得到什么、发现了什么。每位成员在自己的过程文档（`docs/process/*.md`）里写细节，这里只记里程碑。

## 2026-11-03

- 03:53 初始化仓库 `D:\projects\js\cc`；加入子模块 `references/claude-code-analysis`（旧版 TS 源码，1902 个文件，约 2.1.88）。
- 03:55 复制官方 2.1.316 linux-x64 ELF（sha256 `fd13c700…d824`，与官方 manifest 一致）到 `artifacts/official/`；用 `tools/extract/restore-bun.cjs` 重新提取模块表到 `original/`：2880 个模块（2648 JS、232 资源），与此前独立提取结果逐文件相同。内嵌 Bun 1.4.4（71c9bf0ca），报 Node v26.12.1。
- 03:57 `tools/ast/scan.mjs`：81,667 个顶层声明，2652 个 JS 解析，3 个 BOM 资源脚本（chart.js、highlight.js、mermaid）不解析。耗时约 20 秒。
- 04:00 `tools/ast/scan-reference.mjs`：旧版 12,938 个顶层声明，0 解析错误。
- 04:05 `tools/ast/match.mjs` 第一版：指纹（字符串 + 属性名，IDF 加权 Dice，互为最佳）8,419 个；调用图传播后共 9,138 个；布局插值后 16,506 个声明有旧版文件归属，触及 1,711 个旧版文件、994 个 chunk、约 9.9 MB。
  - 发现：调用图"唯一候选即匹配"会误配（恒等函数 `b` 被配成 `shouldUseSessionMemoryCompaction`），改成"两个独立见证，或一个见证 + 指纹分 ≥0.15"。
  - 发现：一个 chunk 里混着第三方和一方代码（如 chunk-1ny7cxrt 前 1.3 MB 是 openid-client/jose/zod 等）；CommonJS 依赖有显式包裹 `x(function(exports,module){…})`，可直接作为模块边界。
- 04:10 确定分层设计与团队分工，见 `docs/PLAN.md`。
- 04:12 启动第一阶段团队：vendor（第三方识别）、rename（作用域安全改名 + α 校验）、runtime（Bun 运行与对拍）；lead 做切分与生成。
- 04:13 发现 Bun 按顶层语句粒度拆 chunk：1,711 个旧版文件中 728 个跨 chunk 出现（如 `bootstrap/state.ts` 分在两个 chunk）。阅读树改为"按归属文件把各 chunk 的部分重新聚合"，`runnable/` 保持 chunk 布局。见 `docs/process/lead.md` 第 4 节。
- 04:15 `tools/segment/segment.mjs`（切分）、`tools/naming/reference-names.mjs`（旧版顶层名/参数名/局部名对齐）、`tools/q.mjs`（查询：find/show/callers/callees/module/where）。
- 04:18 匹配器加"形状一致"检查（只对一对多的 shared 匹配、单绑定语句生效；多声明 var 语句里形状不可靠，一刀切会丢 449 个正确匹配）。
- 04:22 `tools/naming/resolve.mjs`：多来源合并（semantic > vendor > reference > auto），顶层名在 chunk 内和重组模块内都唯一，导入别名跟随导出方；`tools/naming/auto-names.mjs`：基于代码证据的兜底命名 94,453 条（解构键、catch、成员/方法名、已知调用、字符串常量、Error 类名……）。
- 04:30 `tools/emit/readable.mjs`：阅读树生成（模块头、每个声明前的出处行 `//@ chunk:start-end 方法 = 旧版名`、按使用边合成 import/export、prettier 格式化）；改名统一调用 rename 成员的库（放弃了自写的第二套改名器，避免两套实现）。
- 04:33 `tools/ast/match-local.mjs`：文件内二次匹配 529 对；旧版命名合计顶层 8,353、参数 5,824、局部 17,816。
- 05:05 runtime：`tools/verify/`（隔离运行 run.mjs、假 Messages API fake-upstream.mjs、stdio MCP 假服务器、42 个场景、对拍 compare.mjs）+ 开发依赖 `bun@1.4.4`（公版，修订 38afee6c8）。original 自对拍两轮 42/42 一致（16 个场景需归一化），负对照能抓出一字之差；rename 测试输出 `.rn-tmp/out-full`、`out-final` 对拍 42/42 一致。已知限制：Ink 命令需要内部 Bun 的 `Bun.ant.CellSegmenter`，公版跑不了。细节见 `docs/process/verify.md`。
- 05:17 rename：`tools/rename/`（apply.mjs、alpha-check.mjs、lib/、test/）作用域安全改名引擎 + α 等价校验，基于偏移的文本替换（空表逐字节相同）；导出改名跨模块同步，`import()`/`require("./x.js")`/未被静态导入的 1,041 个模块导出名冻结。全语料（2,650 模块、674,774 绑定）全量随机改名、冲突压力两种表 α 0 差异，各约 10–20 秒；分析器与 Babel 作用域差分 271 万标识符 0 差异；Bun 对拍一致；46 个测试通过。格式见 `naming/README.md`，细节见 `docs/process/rename.md`。
- 05:25 lead：用正式命名表（naming/final：旧版名 + 自动名，13,968 个顶层名、约 10 万个局部名）经 rename 引擎生成 `runnable/`：α 校验 4,025,733 个标识符 0 差异；runtime 对拍 42 个场景 41 一致，唯一不一致的 update-offline 是基线侧偶发 0 个外网请求，单独重跑一致（已转 runtime 查原因）。
- 05:26 lead：阅读树生成器改为调用 rename 库（`renameModule` + `planFromTree`），按引擎实际决定的名字合成 import；外部模块导入（node 内置、bun:*）按导入名命名（6,034 个）；重组模块内保留的压缩名冲突时加 chunk 标记（59 个）。
- 05:50 runtime 第二轮：查清 original 用到的 12 个 `Bun.ant.*`（只有 CellSegmenter 无回退），写验证环境垫片 `tools/verify/bun-ant-shim.js` 和 ConPTY 伪终端驱动，Ink 子命令与交互会话可在公版 Bun 上对拍；Bash "Bad file descriptor" 查明是 linux 构建在 Windows 上走 POSIX 分支、用 O_APPEND 打开输出文件（`win-append-shim.js` 绕开）；`update-offline` 不稳定是本机真实 npm 的 5 秒超时（改用假 npm，compare 加 --retry）。54 个场景 original 自对拍两轮、对 runnable 均 54/54 一致。
- 05:40 lead：启动第二阶段 10 个领域成员（query、tools、permissions、extensions、bootstrap、state、ui、ink、agents、commands），工作指南 `docs/process/domain-guide.md`；交付 `naming/semantic-*.jsonl`（语义名，优先级最高）、`naming/docs-*.jsonl`（声明说明，生成为 JSDoc）、`naming/modules-*.json`（模块说明）、`docs/handbook/*.md`、`docs/process/domain-*.md`。q.mjs 新增 `bindings`/`module-bindings`。
- 05:45 lead：坑——`node - <<'EOF'` 方式改代码时，heredoc 里的反斜杠在模板字符串中被吃掉（正则 `\.`、`\s`、`\w` 失效），查出 4 处并修复；以后带反斜杠的改动一律用 Edit 或写成独立脚本文件。
- 06:54 dom-bootstrap：交付 `naming/semantic-bootstrap.jsonl`（1831 条，顶层 1450 中 semantic 1212/reference 223/auto 8/无名 7；门面原名 968 条）、`naming/docs-bootstrap.jsonl`（874 条，导出声明 768/802）、`naming/modules-bootstrap.json`（57/57）、`docs/handbook/bootstrap.md`（启动序列、命令树、stream-json 协议、state 两层结构、迁移 v14、安装更新、优雅退出、与 2.1.88 差异）、`docs/process/domain-bootstrap.md`（约 250 条门面证明的切分修正建议、state.ts 约 111 条 NFC 指纹误配）。生成器 `artifacts/tmp/bootstrap/gen-names.mjs` / `gen-docs.mjs` 可重跑。
- 06:58 dom-ui：ui 领域第一轮完成——naming/semantic-ui.jsonl 1,046 条（人工 425 + 规则 621，resolve 试跑全部生效、27 条加后缀）、docs-ui.jsonl 204 条、modules-ui.json 473/473；手册 docs/handbook/ui.md（REPL 控制器架构、对话框注册表、输入/消息/权限链）；切分/匹配建议见 docs/process/domain-ui.md 第 5 节（fingerprint-shared 克隆名 285 个跨 chunk、fflate/zod/React 哨兵误归、REPL 控制器类待归属）。
- 06:05 lead：吸收 dom-bootstrap 的发现——**门面 chunk**（只 import + `export{局部 as 原名}` 的 chunk，Bun 为每个被动态 import 的源模块生成一个）给出源码的**原始导出名**。`tools/ast/facades.mjs`：513 个门面、7,692 个原名（`analysis/names/facade.jsonl`，来源 `facade`，优先级最高）；门面 → 源文件路径：按旧版导出名匹配 106 个、按成员匹配投票 28 个、其余 379 个是旧版没有的模块，按最大导出命名为 `_new/<名>.ts`。切分时门面导出的声明强制归入同一模块（仅次于显式放置与第三方）。重切后一方 2,030 个模块 13.0 MB。
- 06:59 dom-ink：完成 ink 领域（105 模块、1064 声明）：semantic-ink 2575 条（顶层 1304、局部 1271）、docs-ink 572 条、modules-ink 105/105；手册 docs/handbook/ink.md（渲染管线、Bun.ant.CellSegmenter 接口、全屏与滚动、输入解析、选区复制、快捷键与默认绑定表、vim 状态机、与 2.1.88 差异）；248 个误归声明与 215 组切分/匹配修正建议见 docs/process/domain-ink.md。
- 07:00 lead：采纳 dom-ui 的建议——一对多的 fingerprint-shared 匹配（克隆的小工具函数，例如 `hasThinkingContent_2…16`）只用于命名、不再决定归属；只有在 chunk 相邻声明已归同一文件时才放入（shared-adjacent 63 个）。匹配器自带的 layout 猜测也不再直接采用，改由切分器用可信标签重做。file-local 匹配进入切分。
