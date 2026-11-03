# 第五阶段第四轮（参数/局部）命名：name-l9c（组 9 前半段）

范围：`analysis/segments/naming-round4c.json` 第 9 项，**下标 0–893**（清单声明的前半段，后半段 894–2102 由 `name-l9x` 负责）。整段是 `src/services/` 里 mcpServe 之后的字母序：

- `memoryStore/`、`memorySync/`（memorySkills、memoryWatcher、mountWalk、multiStoreSync、storeReconcile）
- `mcpServe/`（contextCalls、fileCalls、fileListingCalls、hookCalls、mcpRelayCalls、repoGitState、shellCalls）
- `modelCatalog/publishedCatalog`、`mockRateLimits`
- `notifications`、`oauth/`（wifCredentials、postLoginHooks、refusedSignIn、validateOauthToken、sessionsBearerHooks）、`orgMemory/`、`orgSurvey/`
- `pluginEval/` 整片（authPreflight、caseDiscovery、caseSchema、childEnvironment、credentialExclusion、evalDir、evalFence、evalInitInterview、evalOutput、evalReport、evalSandbox、graders、keptSandbox、mocks/*、ownershipChecks、pluginEvalCommand、runChild、runSuite、runToolRules、runTrace、safeFiles）
- `plugins/`（accountSync/*、devMods/*、pluginCliCommands、PluginInstallationManager、pluginOperations、pluginReadmeAdvice、pluginPublish、pluginTag、pluginUninstallSettings、pluginTest/claudeTestPlugin、publish/*）
- `policyLimits/`（cacheStamp、capabilityBlocks、complianceTaints、index、orgConfigEligibility、orgConfigGate、orgConfigGateFlag、orgConfigGateMessages、orgConfigStartup、orgPolicyDeniedEvent、policyEvidence、policyFetchStatus、policyMessages、policyState、policyVerdicts、prefetchToggle）

## 结果

| 项 | 数量 |
|---|---|
| 接手时 `naming/semantic-l9.jsonl` 行数 | 4,965（前任 name-l9 写的，全部保留） |
| 本段声明数 / 待命名绑定 | 894 / 3,995 |
| 本次续写条目 | 3,984（追加写入，未重写文件） |
| 最终行数 | 8,949 |
| `annotate check` | 0 problems，0 conflicts（全表 58 个 chunk） |
| 覆盖复核 | 用“final5 + 本表合并”再跑 `show` 0–893，**剩余 `_K` 偏移 0** |

置信度分布（本次写入的 3,984 条）：0.9 2 条、0.85 2,945、0.8 996、0.75 30、0.7 11。0.7/0.75 主要是 React Compiler 缓存槽、只有字符串值的局部、以及同名参数在多层闭包里只能按调用点判断的小函数。

## 做法

- 每批 `show` 20–45 个声明，先用 `artifacts/tmp/l9c/trim.mjs`（自写的小工具，只打印含 `_K` 的行及其上下文）压缩输出，再逐个读上下文命名；一批写一个 `artifacts/tmp/l9c/bN.jsonl`，`cat 批次 >> naming/semantic-l9.jsonl` 追加。
- 每批后跑 `check`，另用 `artifacts/tmp/l9c/conflict.mjs`（复刻 check 的 rename 流程，打印冲突明细）定位"会被引擎加 `_2`"的重名并即时改名；共处理 25 处冲突（多数是 `store`/`entry`/`value`/`settings` 在参数与函数体同名，改成更具体的 `xxxInstallations`、`declaredConfig`、`resolvedMarketplace` 等）。
- 遇到 `check` 报 “no binding at this offset” 的键（`chunk-55ht3bcx.js@497`，是只有声明无引用的内联参数）删掉该行，未强行命名。
- 键一律按 `file`（chunk）+ `key`（偏移）写，不对同一阅读树文件跨 chunk 的去重，因为 `pluginOperations.js` 被拆在 `chunk-csq9ftr9.js`、`chunk-e6aww6q8.js`、`chunk-pp50kewz.js` 三个 chunk 里。

## 跳过

- 1 处：`chunk-55ht3bcx.js@497`（check 无绑定，删除）。
- 没有因“看不出用途”整段放弃的声明；240 个 `unnamed=1` 的小声明也全部读完（多为单参数回调、`map(entry => ...)` 之类）。

## 发现的问题（未在本表覆盖，仅记录）

1. **既有名字风格不一致**：`chunk-pp50kewz.js` 的 `VALID_UPDATE_SCOPES_2`（`function(e){...}` 返回 scope 字符串）沿用常量式名，建议改 `pickUpdateScope`；`chunk-e6aww6q8.js` 的 `isRealPathWithinTeamDir_3`、`isWorkspaceRestrictedSource` 一带的 `_2/_3` 后缀是引擎撞名留下的，读起来割裂。
2. **名不副实**：`chunk-9cjx5pnm.js`（`publish/publishStatus.js`）的 `extractMarkupText` 实际是从错误响应体里捞出 `marketplaces`/`manual marketplace id`，不是“取 markup 文本”；`repoHttpsUrlOf`（`pluginReadmeAdvice.js`）用 `mcpAuthCacheContent` 去读 `.git/config`，这个读文件工具的别名本身容易误导。
3. **同一阅读树文件跨多个 chunk**：`plugins/pluginOperations.js` 分散在 3 个 chunk，按文件路径检索容易只看到一个片段；审核时按 chunk 搜更稳。
4. **`chunk-qchp9vrd.js` 的 `pluginEval/mocks/mockRelay.js` 大量 22–45 个未命名绑定的长函数**（`writeRunMocks`、`createMockRelayPipe`、`answerMockCallWithReplay`），压缩名是多字母的（`ae_`、`ce_`、`We_`），比单字母更难辨认，命名时需要结合类型/字段名逐条推断。
5. `policyLimits/orgConfigGate.js` 与 `orgConfigEligibility.js` 里同名函数族（`settingsOutcome`、`policyOutcomeSummary`、`orgConfigGateDecision`）在参数与闭包里反复重名，最终用了 `settingsFacts`、`policyOutcome`、`armedInput` 等区分名，后续改这些文件时注意别把两者混同。

## 产物（均在 `artifacts/tmp/l9c/`）

- `bN.txt` / `bNtrim.txt`：每批 `show` 原文与精简视图；`bN.jsonl`：每批命名条目。
- `trim.mjs`：只打印含 `_K` 的行 ±上下文，控制读入体量。
- `conflict.mjs`：按 check 同样的 rename 流程列出本表导致的 `_2` 冲突。
- `merged/`：final5 + 本表合并后的临时的 `top.json`/`locals.jsonl`，仅用于复核覆盖，不改 `artifacts/tmp/lead/final5`。
