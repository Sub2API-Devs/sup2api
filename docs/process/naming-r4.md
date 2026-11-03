# 第四阶段第二轮命名：name-r4（组 4）

范围是 `analysis/segments/naming-round2.json` 的第 4 项：1,851 个声明，约 606 KB，分布在 263 个阅读树文件（108 个目录）和 155 个 chunk 中。主要模块如下：

- `utils/permissions/**`：权限规则、分类器、写入检查、规则来源
- `services/homeSeed`：本机设置打包转发到云会话
- `services/daemon`、`cli/headlessCloud`：后台会话、名册、云端无头打印
- `services/tools`：工具执行、分离调用、Web 隔离
- `utils/claudeAiSync`：技能和插件同步
- `services/memorySync`、`services/orgMemory`、`services/accountMemory`：记忆同步与记忆上下文
- `utils/hooks.js`：钩子匹配与远程钩子
- `utils/crossSessionInbound`：跨会话入站把关
- `history.js`、`utils/historyFile.js`：粘贴占位与历史复制区间
- `tasks/LocalShellTask`
- `services/sessionStatus`：会话状态分类器
- `components/workflows`
- `services/usageInsights`
- `commands/promo`
- `utils/fsAnchor`：Windows 和 Darwin 锚定文件操作
- 另有若干只有一两个声明的目录

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定命名 | 2,283。共 2,306 个顶层绑定，其中 2,281 个是压缩名，已全部命名；另有 2 个原本已有自动名，也改成了语义名 |
| 参数 | 352 |
| 局部变量 | 939（let/var 927、函数声明 3、const 7、catch 2） |
| `naming/semantic-r4.jsonl` 总条数 | 3,574 |
| 说明（`naming/docs-r4.jsonl`） | 950 条。≥300 字节或被导出的 912 个声明全部有说明，另有 38 个较小的声明也写了 |
| ≥500 字节的声明 | 242 个，其中 209 个已命名参数或关键局部 |
| 改名引擎校验（只用本组命名表） | 155 个 chunk 逐个跑 `renameModule`：请求 3,574 个，改名 3,574 个，拒绝 0，冲突 0，告警 0。脚本是 `artifacts/tmp/r4/validate.mjs`，结果在 `artifacts/tmp/r4/rename-check.txt` |
| 改名引擎校验（合并其他命名表） | 加载 `naming/final/{top.json,locals.jsonl}` 和全部 `semantic-*.jsonl`（复制到 `artifacts/tmp/r4/naming-merged/`，因为 `naming/` 里的 `docs-*`、`modules-*`、`placement-*` 不是 `loadNaming` 能读的格式），对本组的 key 统计：拒绝 0，冲突 0。脚本是 `artifacts/tmp/r4/validate-merged.mjs` |
| 与其他 semantic 表的键重合 | 0 |

置信度分布：0.75 共 2,129 条，0.7 共 1,292 条（局部默认值），0.65 共 2 条，0.6 共 151 条。0.6 主要用于两类：一是只能从数值猜用途的常量，例如 previewTunnel 的重连和超时常量、`feedback` 的长度上限；二是用途能看出但调用方没读全的小函数，例如 `useStatusLineSuppressed`、`isXtermJsTerminal`、`createClientEventSigner` 一带。

合并校验时最初有 8 个同作用域冲突：本组的名字和 facade、reference 或其他组已有的名字撞了。已经全部改成不撞的名字，例如：

- `br`：`planHomeSeed` → `buildHomeSeedPlan`。facade 的 `POo` 已经叫 `planHomeSeed`。
- `Pe`：→ `loadJobState`。facade 的 `yo` 已经叫 `readJobState`。
- `g`：→ `requestPeerIdleNotice`。place-g5 的 `K` 已经叫 `subscribeToPeerIdle`。
- 另外改了 `Rhe`、`ua`、`T5r`、`P` 和 `#507` 的一个局部变量。

## 说明重合（交给 lead 取舍）

下面 5 个声明在其他说明表里已经有说明，本组的说明是对照代码重写的：

- `chunk-e6aww6q8.js#_en`（docs-commands）：/login 命令对象
- `chunk-ndsajhew.js#zt`（docs-commands）：/claim-credit 促销
- `chunk-24t3dkzb.js#JRr`（docs-ink）：是否启用同步输出
- `chunk-24t3dkzb.js#sgt`（docs-ink）：Ink 事件基类
- `chunk-fe6rs39h.js#UTs`（docs-p5）

## 还没命名的部分

- **顶层**：23 个顶层绑定原本已有可读名（自动命名或 facade，例如 `WORKER_KINDS`、`VSCODE_FAMILY_TERMINALS`、`STANDALONE_PROXY`、`AFKTIMEOUTMS`），按原样保留。
- **≥500 字节但没有命名局部的 33 个声明**：大多是数据字面量、zod schema、常量组，例如 `Rvn` 敏感配置文件名列表、`S` 权限上下文序列化表、`Me` 名册 schema、`ue` 环境变量清单。还有一部分的局部只是箭头函数的单字母参数，例如 `fr` 的解构参数、类 `tt`/`p` 的方法参数，以及若干 switch 映射函数。这些读顶层名和说明就够了。
- **其余函数的局部变量**：只命名了关键的参数和局部。循环下标、箭头回调参数、React memo 缓存槽（`$[i]` 对应的临时变量）多数保留压缩名。
- **被跳过的局部条目**：答案里有 43 个局部条目指向的局部已经被自动命名过（如 `found`、`filtered`、`mapped`、`parts`、`max`），不在压缩名列表里。build 脚本会跳过这些条目，阅读树里它们已经是可读名。

## 发现的问题（放错文件、名字不符）

- `chunk-ah34pb7m.js#WM`、`#qM` → `tools/ListMcpResourcesTool/UI`（或 ReadMcpResource 的 UI）。证据：两者渲染的是 MCP 资源列表，空时显示 "(No resources found)" 或 "(Empty directory)"，与 Monitor 无关。现在放在 `tools/MonitorTool/UI.js`。
- `chunk-bhxaz9j0.js#koi`、`#UYo`、`#Aoi`、`#Coi`、`#Roi`、`#xoi`、`#Poi`、`#Ioi` → 自动编辑归属与流水线回复来源模块，例如 `services/autoEditAttribution`。证据：这些函数只读写 `getLiveState().autoEditAttribution` 和 `pipelineReplyOrigins`，与 MCP 输出保存无关。现在放在 `utils/mcpOutputStorage.js`。
- `chunk-82kqcve8.js#Xo` → `services/remoteManagedSettings` 或设置签名相关模块。证据：它列出的是设置文件、签名文件、远程设置同意文件，用于监视或校验，与 gitignore 风格的忽略模式无关。现在放在 `utils/ignorePatterns.js`。
- `chunk-ca06bv0t.js#Mgo` → 插件市场或插件列表组件。证据：它按 `getPluginInstallCount` 和 `isFromPluginDirectory` 给插件排序。现在放在 `components/HelpV2/Commands.js`。
- `chunk-e6aww6q8.js#ylr`、`#Slr`、`#bGr`：这是内联的 lodash `countBy`（`hasOwnProperty` 计数、`baseAssignValue`、`createAggregator`），属于第三方代码，应归到 vendor。现在放在 `utils/toolSearch.js`。
- `chunk-tbfde207.js#B` → AppState 的会话规则更新模块。证据：它是 `applySessionAllowRules` 的 AppState 更新函数，与权限模式无关；原有 JSDoc 也标注了切分误归。现在放在 `utils/permissions/PermissionMode.js`。
- `chunk-18hwfzwa.js#$Zt`：名字和用途存疑。它在 `components/StatusLine.js` 里，读取渲染模式、终端行数和附着端能力，但恒返回 false，看起来是被关掉的特性残留。本组按保守的 `useStatusLineSuppressed`（0.6）命名。
- `chunk-ndsajhew.js` 的 `Me`、`ze` 等（`commands/promo/promo.js`）和 `commands/promo` 的启动缓存：本身是启动时的促销缓存逻辑，也可以单独成为 `commands/promo/promoStartupCache` 一类模块。这是建议，不是错误。
- `chunk-e6aww6q8.js#v2e` 一带（`utils/claudeAiSync/syncOwnedRoot.js`）：原有 JSDoc 提到附近混有 computerUse 的 touchExclusive 代码。本组只核对了 `v2e`：它读取同步标记文件，属于本文件。
- `chunk-e6aww6q8.js#rde`/`yYs`/`H1r`/`C8n`（`utils/messageOrigin.js`）：归属正确，不过 `H1r` 处理的是桥接消息元数据，也可以放进 bridge。

## 做法

1. `artifacts/tmp/r4/prep.mjs` 从 segments 取本组声明，结合 `analysis/scan/decls.jsonl`、`original/` 和 `reconstructed/`，生成 `items.json`（每个声明的顶层绑定键和局部绑定键，局部带出现序号）和 27 份视图（`dump/b00.txt`–`b26.txt`）。
2. 逐份阅读视图，在 `artifacts/tmp/r4/ans/*.txt` 里写答案，每行一种格式：
   - `idx 名字 | 说明`
   - `idx 压缩名=名字,… | 说明`
   - `idxL 压缩名[#k]=名字 …`：局部
   - `idxD 说明`：只补说明
   
   `z1docs`–`z3docs` 补的是缺少的说明，`z4locals`、`z5locals` 补的是 ≥500 字节函数的参数和局部。
3. `artifacts/tmp/r4/build.mjs` 生成两张表，并报告缺顶层、缺说明、重复和保留字等问题。`artifacts/tmp/r4/show.mjs` 用来按编号查看声明。
4. 用 `validate.mjs`（只用本组表）和 `validate-merged.mjs`（合并其他表）跑改名引擎，按冲突改名，直到拒绝和冲突都为 0。
