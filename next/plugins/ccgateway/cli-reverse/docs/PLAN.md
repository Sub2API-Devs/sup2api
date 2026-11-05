# 逆向计划与分层设计

> 目标：把官方 Claude Code CLI **2.1.316**（linux-x64 ELF，sha256 `fd13c700…d824`；2026-11-05 主线升级到 **2.1.318**，sha256 `708c77b2…bf0bd`，见第 7 节）基于 AST 逆向成一个人类看得懂、AI 读得懂、有详细文档的项目。
> 一切产物都从官方二进制推导而来；旧版源码（`references/claude-code-analysis`，约 2.1.88，2026-03 source map 泄露版）只用来**提供名字和目录线索**，不拷贝进 316 的代码。

## 1. 已知事实（2026-11-03 实测）

| 项 | 值 |
|---|---|
| 官方 ELF | `artifacts/official/claude-linux-x64`，sha256 与 `official-manifest.json` 的 linux-x64 一致 |
| 打包方式 | Bun 1.4.4（修订 71c9bf0ca）单文件 + bytecode，内嵌 Node 版本号 v26.12.1 |
| 模块表 | 2880 项：2648 个 JS（`cli.js` 入口 + 2644 个 `chunk-*.js` + 3 个 BOM 资源脚本）、232 个资源（提示词、Skill 文档、字体、.node 原生模块） |
| 代码量 | JS 约 50 MB，顶层声明 81,667 个 |
| chunk 结构 | ESM，全部提升到顶层（scope hoisting），**一个 chunk 内顺序拼接多个源模块**；CommonJS 依赖以 `var X=x(function(exports,module){…})` 包裹，一个包裹 = 一个 npm 文件 |
| 存活信息 | 字符串字面量、模板文本、属性名、导入/导出关系；局部和顶层绑定名全部被压缩 |

## 2. 分层产物

```
artifacts/official/   官方 ELF + manifest（ELF 不入库，用 sha 校验）
original/             L0 从 ELF 提取的 2880 个模块，只读真值
analysis/             L1 AST 事实（scan）、旧版事实（reference）、npm 指纹（vendor）、匹配结果（match）、模块切分（segments）
naming/               L2 命名表（每个领域一个 JSON，人工/agent 维护，可复现）
runnable/             L3a 改名后的 chunk 级代码，结构与 original 一一对应，可直接用 Bun 运行（验证改名正确）
reconstructed/        L3b 阅读树：src/（一方代码，按源文件重新聚合、按旧版目录布局摆放、格式化、带出处行）、vendor/（第三方包，按 npm 包/文件还原）、runtime/、assets/、manifest.json、symbols.jsonl
docs/                 文档：总览、手册（按子系统）、过程记录、方法
tools/                全部流水线工具
```

L3a 负责"证明改名没改坏"；L3b 负责"让人和 AI 读懂"。两者使用同一份命名表。

## 3. 流水线

1. `tools/extract/restore-bun.cjs`：ELF → `original/`（模块表解析，资源引用改相对路径）。
2. `tools/ast/scan.mjs`：每个顶层声明的字符串、属性名、调用边、导出名。
3. `tools/ast/scan-reference.mjs`：旧版 TS 源码同样的特征。
4. `tools/vendor/*`：安装候选 npm 包，生成第三方指纹，归属第三方声明（包名、版本、文件）。
5. `tools/ast/match.mjs`：一方代码匹配（指纹 → 调用图传播 → chunk 布局插值）。
6. `tools/segment/*`：把每个 chunk 切成源模块段，确定每段的目标路径。
7. `tools/rename/*`：作用域安全改名 + α 等价校验（改名前后 AST 只差绑定名）。
8. `tools/rename/apply.mjs` 生成 `runnable/`，`tools/emit/readable.mjs` 生成 `reconstructed/`；全流程入口 `tools/pipeline.sh`。
9. `tools/verify/*`：Bun 1.4.4 在隔离沙箱运行 original 与 runnable（54 个场景，假上游记录请求体逐字段对拍）；`readable-check.mjs` 静态校验阅读树。

## 4. 团队分工（一个目录只有一个写者）

| 角色 | 写入范围 | 任务 |
|---|---|---|
| lead（主线程） | `docs/PLAN.md`、`docs/WORKLOG.md`、`tools/ast`、`tools/segment`、`tools/emit`、`analysis/match`、`analysis/segments` | 架构、集成、切分与生成、验收 |
| vendor | `tools/vendor/`、`vendor-ref/`、`analysis/vendor/`、`docs/process/vendor.md` | 第三方包识别与版本、文件级归属 |
| rename | `tools/rename/`、`docs/process/rename.md` | 作用域安全改名引擎与 α 等价校验 |
| runtime | `tools/verify/`、`docs/process/verify.md` | Bun 运行、假上游、与官方对拍 |
| 领域组（第二阶段） | `naming/<domain>.json`、`docs/handbook/<domain>.md` | 语义命名、未匹配新代码的识别、子系统手册 |
| 审校（第三阶段） | `docs/` 索引类文件 | 阅读指南、AI 索引、交叉审核 |

## 5. 验收标准

- 出处：每个输出文件可追溯到 `original/` 的 chunk 和字节区间。
- 正确：`runnable/` 与 `original/` 逐模块 α 等价；Bun 运行行为与官方对拍一致。
- 可读：`src/` 一方代码按子系统目录组织，顶层符号有名字（来源标注：reference / vendor / semantic / auto）。
- 可理解：手册覆盖启动、查询循环、API、工具、权限与沙箱、MCP/插件/Skill/Hook、UI、配置与会话、多代理、遥测，函数级入口可查。
- AI 友好：`AGENTS.md`、`docs/INDEX.md`、`analysis/symbols.json`（符号 → 文件/行/说明）。

## 6. 实际执行情况（2026-11-03）

计划按三个阶段执行，团队共 24 个成员：

| 阶段 | 成员 | 产出 |
|---|---|---|
| 一：基础设施 | vendor、rename、runtime | 第三方识别（255 个 npm 包）、作用域安全改名 + α 校验、Bun 隔离运行与 54 场景对拍 |
| 二：领域 | dom-bootstrap、dom-query、dom-tools、dom-permissions、dom-extensions、dom-state、dom-ui、dom-ink、dom-agents、dom-commands | 10 本子系统手册、约 2 万条语义名、1.3 万条声明说明 |
| 三：放置与整合 | place-g0…g7、place-rest、fixer、docs-writer | 把 2.1.316 新增的约 18 MB 一方代码放进约 4,000 个源文件；修正领域成员指出的 1,728 处切分错误与 175 处命名冲突；架构总览、变化总表、索引 |

中途调整：
- 发现 Bun 按顶层语句拆 chunk（第二节的"按 chunk 切段"改为"按源文件重新聚合"）。
- 发现门面 chunk 给出原始导出名（来源优先级最高）。
- 原计划由领域成员处理未归属代码，实际未归属部分（主要是 316 新功能）有 18 MB，改为单独的放置阶段。

## 7. 升级到 2.1.318（2026-11-05/06）

主线换成 2.1.318：`original/` 是 2.1.318 的还原树（3,100 个模块，其中 2,857 个 JS；Bun 1.4.4，修订 424a542a9）。2.1.316 的 ELF 移到了 `artifacts/official/2.1.316/`。

做法：
- 新写 `tools/versions/carry-names.mjs`，按 equiv 配对把 316 的命名、说明、放置、裁决迁到 318 的键上：语义名 99.3% 带过去，放置 99.6%。
- 剩下的手工工作切成批次，交给 sonnet：放置 5 批，命名 11 + 3 批，名字形态、文档引用、名字核对各 1 批。
- 合并后跑 `SCAN=1 VERIFY=1` 全量验收。

全过程、数据和坑见 `docs/process/upgrade-318.md`；官方的版本变化见 `research/versions/CLAUDE-CODE-2.1.318-CHANGES.md`；以后的升级照 `tools/versions/README.md` 的流程做。
