# 第二轮命名 · 组 7（name-r7）

范围：`analysis/segments/naming-round2.json` 第 7 项，1,987 个声明，分布在 318 个阅读树文件。主要是 `utils/plugins/**`、`utils/git/**`、`utils/transcript/**`、`utils/telemetry/**`、`utils/redaction/**`、`services/policyLimits/**`、`services/remoteManagedSettings/**`、`services/gateway/**`、`services/quotaAutoResume/**`，还有 `utils/wslMounts`、`utils/udsMessaging/*`、`utils/peerSessions/*`、`bridge/*`、`daemon/bgDispatch`、`components/pluginUi/**`、`commands/review/*`、`commands/cd`、`utils/managedEnvSafety`、`utils/planTiers` 等 2.1.316 新模块里的零散声明。

## 结果

| 项 | 数量 |
| --- | --- |
| 顶层声明命名 | 1,984 / 1,987 |
| 同一语句里的兄弟顶层绑定 | 285 |
| 参数 | 62 |
| 局部（let/const/内部函数） | 127 |
| `naming/semantic-r7.jsonl` 总行数 | 2,458 |
| `naming/docs-r7.jsonl` 说明 | 932 |

- 所有 ≥300 字节或导出的声明都有说明（脚本核对，缺 0）。
- 改名引擎逐 chunk 调 `renameModule` 校验：0 冲突、0 拒绝、0 键错误。
- 与 `naming/` 下其他 semantic 表的键重合 0。说明有 15 条与已有 docs 表的 id 重合（`docs-commands`、`docs-extensions`、`docs-p0`、`docs-p5`、`docs-tools`，例如 `chunk-fh3th4b7.js#Vo`、`chunk-82kqcve8.js#pwe`、`chunk-a401dt71.js#D`），合并时以哪份为准由合并步骤决定。
- 置信度在 0.5–0.8 之间；含义只靠调用方推断的给 0.5，有日志文字或事件名佐证的给 0.6 以上。

## 做法

1. `artifacts/tmp/r7/dump.mjs`：按文件列出每个声明的 id、字节数、是否导出、跨模块调用方、同语句兄弟绑定、≥500 字节函数的参数/局部（含已有最终名），以及阅读树里的源码。
2. 按目录分 23 批写草稿（`artifacts/tmp/r7/draft/*.txt`，每行“压缩名 新名 置信度 说明”，可附 `.局部=名`）。
3. `artifacts/tmp/r7/gen.mjs`：把草稿换算成 `@偏移` 键，生成两份 jsonl，并逐 chunk 用 `renameModule` 试跑；报告在 `artifacts/tmp/r7/gen-report.json`。

大函数（如 `chunk-s5p7fp0c.js#fo` 14.9 KB 的登录流程视图、`chunk-00qhwn8e.js#Ze` /skills 菜单、`chunk-dg94x42s.js#Et` 限流选项菜单、`chunk-wbbfk060.js#pr`/`#Sr` 桥监视与轮询器）只命名了顶层和少数关键局部，其余局部大多已有上一轮的属性名推导，没逐个补。

## 未命名（3 个）

都是一条 `var` 里多个数值常量的首个绑定，只看数值和用处判断不出各自含义，硬起名容易误导：

- `chunk-ss669z1x.js#pr`（`daemon/bgDispatch.js`）：`3600000, 60000, 28800000, …, new Set()` 一组时限。
- `chunk-3nztfxrw.js#he`（`selfHostedRunner/lifecycleHooks.js`）：`1000, 1500, 5000, 500, …` 一组钩子等待时限（同语句的说明字符串 `$e` 也没命名）。
- `chunk-4cm44bmp.js#Ls`（`bridge/remoteBridgeCloseCodes.js`）：`300, 200, 300, 600, …` 一组关闭/重连时限。

同类情况还有 `chunk-wbbfk060.js#Or` 那组 17 个常量只给了首个（`BRIDGE_WATCH_DEADLINE_MS`，置信度 0.5）和正则 `ur`，其余兄弟没命名。

## 发现的问题（放错文件或名不副实）

格式：声明 id → 应归路径，证据。

### 第三方库代码混进业务文件

- `chunk-3a1caa6f.js#m,#g,#x,#w,#D`（`utils/git/gitSafeEnv.js`）→ vendor lodash（baseAssignValue/baseKeysIn/baseSet/basePickBy/pickBy），实现与 lodash 逐行一致。
- `chunk-29pqxdaf.js#Se`（`utils/git/gitOperationTelemetry.js`）→ vendor lodash baseZipObject。

### 插件目录里的非插件代码

- `chunk-f3qhjfah.js#Ht`（`utils/plugins/pluginComponentConflicts.js`）→ `localMarketplacePaths`，是 PathSpace 辅助，唯一调用方是 localMarketplacePaths。
- `chunk-csq9ftr9.js#z`（`commandSourceErrors.js`）→ 插件目录（plugin directory）目录页会话状态。
- `chunk-yf5m6p65.js#Pos`（`pluginLoadState.js`）→ `plugins/functionHooks` 状态存储。
- `chunk-dcmhvw5a.js#Oio`（`pluginSourceUrl.js`）→ 模块加载器的脚本扩展名映射。
- `chunk-dcmhvw5a.js#Dxi`（`securityDefaultPlugin.js`）→ ConfigTool / memory 设置解析。
- `chunk-0sn6pxb4.js#*`（`utils/plugins/publishedCatalogFloor.js`）→ `utils/model/servedModelCatalog`，内容是模型目录下限，与插件无关。
- `chunk-aepeg2w5.js#too`（`utils/plugins/pluginDirectories.js`）→ `services/api/bootstrap` 缓存键。
- `chunk-cjydagjy.js#Kt`（`pluginPolicyColdStart`）→ 托管记忆策略监视。
- `chunk-4q6mp9e8.js#K`（`utils/plugins/refresh.js`）→ 频道允许列表检查。

### 其他

- `chunk-aepeg2w5.js#Va`（`services/gateway/hostCheck.js`）→ `utils/model/modelStrings`，由别名求提供方模型 id。
- `utils/telemetry/memorySummary.js` 里的 `M8t`、`D8t`、`uro`、`jis` → 上传 / control_response 辅助（`cli/structuredIO` 一带），与记忆摘要无关。
- `chunk-q4qb1h08.js#q`、`#pn`（`utils/managedEnvSafety.js`）→ 模型组合（lead/worker/coordinator、label 默认 "Mix"）配置 schema，应归模型/代理配置，与环境变量安全无关。
- `chunk-18hwfzwa.js#aCt`（`components/Stats.js`）→ REPL 进度显示默认设置（唯一调用方 `screens/_new/REPL.helpers-18hw.ts`）。
- `chunk-e6aww6q8.js#Eun`（`components/Stats.js`）→ `services/api/logging`，空用量计数。
- `chunk-08s5p3av.js#L`（`utils/sessionRestore.js`）→ `utils/imageStore`，调用方全在 imageStore。
- `chunk-f25sswmp.js#Zot`（`bridge/readReceipts.js`）→ 原始 JSON 包装类，调用方是 `services/tools/toolExecution`、`cli/transports/ccrMessageMapping`。
- `chunk-82kqcve8.js#Ym`、`#Km`（`memdir/memoryTypes.js`）→ `utils/frontmatterParser`，YAML 复杂度检测，唯一调用方 parseFrontmatter；同文件 `qm`/`eR`/`uFe`/`T9r` 偏记忆 frontmatter 读写（`services/memoryStore/memoryFrontmatter`）。
- `chunk-cxdk9p3j.js#c`（`utils/env.js`）→ `utils/fullscreen`，全屏试用锁存，唯一调用方在 fullscreen。
- `chunk-e6aww6q8.js#FXt`、`#wKo`、`#TKo`（`tools/FileEditTool/fileStaleness.js`）→ `utils/remoteTools/restartNotices`，远程工具重启通知 schema。
- `chunk-kxyd0g16.js#fs`、`#yo`（`tools/ScheduleWakeupTool/ScheduleWakeupTool.js`）→ `tools/WebSearchTool`，CCR 代理网页搜索响应 schema 与开关，调用方全在 WebSearchTool。
- `chunk-18hwfzwa.js#Yse`（`components/FullscreenUpsellDialog.js`）→ 自动模式默认提示对话框（AUTO_DEFAULT_NUDGE）。
- `screens/Doctor.js` 的 `chunk-ah34pb7m.js#CF`（TurnDurationRow 的代理引用）、`chunk-jb5bg5s7.js#A`（`skills/forkedSkillMarkers` 的作用域 JSON 解析）、`chunk-qh6wfbga.js#_Mi`（`services/usageInsights/transcriptScan`）都与 Doctor 无关。
- `chunk-18hwfzwa.js#FZt`（`utils/modelCost.js`）→ `utils/effort`，推理强度成本比。
- `chunk-nsfjm4vg.js#FOi`（`utils/diagLogs.js`）→ `utils/hooks`，收集各会话钩子注册表。
- `chunk-e6aww6q8.js#Mbn`（`utils/Shell.js`）只在 `xbn()` 开关下拼会话标签，用途没查清，名字 `buildShellSessionLabel` 置信度 0.5。
- `chunk-vkkcvt15.js#MUe` 与 `#upr` 实现完全相同（定义惰性 getter），分别取名 `defineLazyGetter`、`defineLazyGetterAlt`。
