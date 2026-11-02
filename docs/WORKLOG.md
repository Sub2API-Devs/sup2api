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
