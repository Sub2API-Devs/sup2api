# 批次 nm318-3 过程记录

## 范围与结果

- 输入：`artifacts/tmp/batches/nm318-3/plan.json`（下标 0），294 个声明，1661 个压缩绑定；`hints.jsonl` 为空，本批没有 2.1.316 同名提示，全部靠 318 的代码本身取名。
- 范围对应的目录都在 `src/_unattributed/`（chunk-hma1b5gv、chunk-hnxhr3bs、chunk-hs37d1w3、chunk-js21vjmb、chunk-jz4c39m8、chunk-k6jh5e6v、chunk-kq89f1h5、chunk-m0cw0s4f、chunk-m2gb6h8m、chunk-n44f9pt7、chunk-n51jggtb）。
- 产物：`naming/semantic-nm318-3.jsonl`，1803 行，全部是偏移键、`source` 一律 `semantic`。
- 覆盖：按 `bindingsOf` 统计，本批 2154 个绑定（含已有名字的）里 2140 个有名字，99.4%；本批自己补的名字覆盖 1661 个压缩绑定里的绝大多数。
- 校验：`node tools/naming/annotate.mjs check naming/semantic-nm318-3.jsonl` → `0 problems`、`0 suffixed by conflicts`。

## 代码主题（按 chunk）

- `chunk-n51jggtb.js`：Code Mode / REPL 工具本体。包括脚本预处理（acorn 解析、`__replStep` 插桩、全局覆盖检查、解析错误排版）、VM 沙箱隔离层（克隆、错误重建、console 捕获、定时器与 atob/btoa 全局、工具包装器与权限/hook 流程）、脚本结局投递（settle 事件、日志批处理、输出截断与落盘回读、目录检查、危险删除拒绝）、上下文（子代理）API 与工具搜索助手、提示词构建。
- `chunk-hs37d1w3.js`：Gmail 调用形状校验（未知/非文本参数、reply id、subject 与附件名安全性、字符集检查）。
- `chunk-hnxhr3bs.js`：slash 场景下的提示缩进布局组件。
- `chunk-js21vjmb.js`：Code Mode 引导流程与询问对话框。
- `chunk-jz4c39m8.js`：主线程/子代理 REPL 会话收尾。
- `chunk-k6jh5e6v.js`：runner 的 work-look 检查（检查 checkout 是否丢工作）。
- `chunk-kq89f1h5.js`：plan Doc（artifact）引用与 Claude Docs 调用形状判断。
- `chunk-m0cw0s4f.js`：脚本行 UUID 记录集合。
- `chunk-m2gb6h8m.js`：HTTP hook 执行与沙箱初始化等待。
- `chunk-n44f9pt7.js`：就地写失败后判断目标是否被换掉。

## 命名依据举例

- 字符串：`"a git step failed"` → `runGitStep`；`tengu_repl_mcp_error_throw` → `mcpToolsThrow`；`"REPL: the name __replStep is reserved"` → `instrumentSteps`；`"work-look-answer: "` → `WORK_LOOK_ANSWER_PREFIX`。
- 调用关系：`vi` 被 `buildToolWrappers` 用于每个工具、返回包装器 → `createScriptToolWrapper`；`Gs` 返回 `{role, spawn, view, tail…}` 供上下文 API 用 → `createContextApi`。
- 属性名：`{behavior, message, permissionDecision}`、`e.detailJson`、`planDoc.id` 等决定了 `deny`、`McpToolError`、`planDocRef` 的命名。
- 导出别名：lazy 单元把 `S` 导出成 `endMainThreadConversation`、`ue` 导出成 `gmailShapeRefusal`，据此定名。

## 跳过与保留

- 没有整条跳过任何声明；剩下 14 个绑定（占 0.6%）是短小、语义与所在函数重复的局部（如 `Gd` 里的 `atDenialLimit` 之外的几个闭包缓存变量、`iu` 里几个与参数同义的中间变量），统一保持压缩名不强行起名。
- `__cc_resource_N` 与其别名（`_s`/`Rs`、`vs`/`As`、`Ds`/`Us`）只按资源编号命名为 `RESOURCE_n` 一类，资源内容未逐个展开。

## 发现的问题

1. `chunk-n51jggtb.js` 里 `type`/`userMsg` 等短名被工具写过多次，个别地方（`Gd` 的 `atDenialLimit` 一带）已有名字与局部变量重名，靠引擎加后缀解决；本批因此对同名局部统一改用 `xxxText`/`callState` 一类前缀，避免后缀。
2. `chunk-n51jggtb.js#Ho`（`buildReplPrompt`）与 `#Al`（`replSpliceWaitHelp`）的正文是长段英文提示，`show` 输出很长；命名按它们在模板里插入的位置定，不逐句分析。
3. `ReplGlobalOverwrite`、`ReplParseError` 等在原文里是 `deferInit` 里赋值的类表达式，注释里已写明；`bindingsOf` 给出的作用域是模块级，可正常改名。
4. `chunk-n51jggtb.js` 的 `ou`（`createVmIsolationLayer`）里裹着一段几百行的内联源码字符串，其中的标识符（`_stringify`、`_errStr` 等）属于 VM 侧、不受本表影响，命名只针对字符串外的外层函数与参数。
