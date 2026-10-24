# 优化审计 Round 2 — 06：控制台 `next/web`（Vue 3 + TS）

日期：2026-10-24
范围：`next/web/src/**`（控制台本体）、`next/web/packages/ui`、`next/web/packages/host`、`next/web/packages/vite-preset`（含被 `next/plugins/*/ui/native` 通过 import map 消费的公共导出）。
目标：抽象、复用、解耦、低嵌套、简洁。
作者：只读分析（未改任何代码）。CodeGraph/Serena/WarpGrep 不可用，全部用 Grep/Read/git + 两个写入 `%TEMP%` 的临时 node 脚本测量（函数长度、SFC 分段长度、模板嵌套深度、i18n 未用键、未引用导出、模板内 `.value`）。

## 0. 基线（本次实测，供改完后对比）

| 项 | 值 |
|---|---|
| `next/web/src` 合计 | 39,912 行 / 328 个 `.vue`+`.ts` |
| 其中非 spec | 32,913 行 |
| `src/views` 非 spec | 23,567 行 / 169 文件（其中 `.vue` 19,345 行 / 131 个） |
| `src/components` | 1,228 行 / 20 文件 |
| `src/composables` | 598 行 / 8 文件 |
| `src/api` | 1,276 行 / 3 文件（`types.ts` 单文件 1,180 行） |
| `src/i18n` | 5,462 行 / 54 文件（locales 5,324 行，2,757 个叶子键） |
| `packages/ui/src` | 8,434 行 / 105 文件 |
| `packages/host/src` | 1,025 行 / 6 文件 |
| spec | 6,999 行 / 58 个（含 packages 共 69 个 spec 文件） |
| `npx vue-tsc -b` | 通过，无输出 |
| `npx vitest run` | **69 文件 / 688 用例全绿**，21.7 s |
| `npx eslint src packages` | **0 error / 7,469 warning**（绝大部分是 `vue/max-attributes-per-line`、`vue/singleline-html-element-content-newline` 等排版规则） |
| `npx prettier --check` | 328 个文件未格式化（src `.vue` 132 / src `.ts` 120 / packages `.vue`+`.ts` 76）；CI（`.github/workflows/next-ci.yml` web job）只跑 typecheck + test，**不跑 lint/format** |
| 模板内 `.value` | 16 个 SFC / 55 处（`AccountsView` 12 处最多） |
| 重复模式计数 | `errors = ref<Record<string,string>>({})` 16 个文件；`const saving/busy/creating = ref(false)` 28 处；`const open = ref(false)` 33 处；`confirm({...})` 28 处；`toast(` 93 处；`notifyError(` 79 处；`applyFormError(` 12 处；`useSettingsForm` 只覆盖 6 个卡片；`page_size: 200` 14 处；`setInterval` 轮询 11 处（7 处在视图里各自写 visibility 守卫） |

## 1. 热点诊断

### 1.1 最大的 SFC / 模块（按行数）

| 位置 | 行数（tpl/scr/style） | 一句诊断 |
|---|---|---|
| `src/api/types.ts` | 1,180（99 个 `export interface/type`） | 全部 DTO 挤在一个文件，`Account`/`Quota`/`Ccg*`/`Usage`/`Price` 五个域混放，任何一处改动都让所有 import 失效重算。 |
| `views/accounts/AccountEditor.vue` | 873（247/625/0） | 一个 SFC 同时是「两段式新建 + 编辑 + 模型/映射 + 调度 + CC 特性 + 代理探测 + 草稿授权」；脚本 625 行、模板最大嵌套 10、15 条超长行。 |
| `views/accounts/AccountsView.vue` | 764（219/533/9） | 列表 + 类型选择器 + 编辑器宿主 + 模型测试弹窗 + 凭据揭示 + 详情抽屉 + 批量测试，7 个互不相关的域；模板嵌套 11。 |
| `views/ccgateway/CCGatewayAccountAuth.vue` | 675（138/535） | 草稿/重授权两套流程共用一个 535 行脚本，`serial`/`alive`/`lastCall` 手工防竞态散落；好在纯状态机已抽到 `ccgAuthFlow.ts`。 |
| `views/plugins/ConsentView.vue` | 565（272/291） | 模板 272 行 + 18 个三元；`hasProvides` 是一串 13 个 `asArray().length > 0` 的 OR 链。 |
| `views/ccgateway/RequestPolicySettings.vue` | 501（356/144） | 模板 356 行，4 张 layer 卡片平铺在同一文件里，靠 `v-if="layer==='billing'"` 之类的分组标志共享 `edit()` 写回。 |
| `views/ccgateway/AccountRuntimes.vue` | 434（82/350） | 行内 request-log 状态机（levels/legacy 两套形状）+ 表格 + 弹窗 + 抽屉，`Row` 结构 24 个字段。 |
| `views/users/UsersView.vue` | 412（138/272） | 5 组「open/target/form/errors/submit」段（create/edit/roles/groups/balance），每组都重写一遍 saving+toast+reload。 |
| `views/prices/PriceEditView.vue` | 406（126/278） | 4 种价格形态（per_request/per_token/visual/video）与 payload/校验/提交揉在一处。 |
| `views/proxies/ProxiesView.vue` | 405（158/245） | 与 UsersView/GroupsView 同构的 CRUD 页面，重复了同一套模板。 |
| `views/prices/priceExpr.ts` | 575 | 手写表达式解析器（`tokenize` 54 行、`cond` 65 行、`tier` 46 行），**没有 spec**。 |
| `packages/host/src/http.ts` | 501 | 会话、401 刷新、keep-alive、envelope 解包全在一个文件（属于对外契约，见 §3）。 |

### 1.2 最长函数（临时脚本 `web-fn.mjs`，测 script 段花括号跨度）

| 位置 | 行数 | 一句诊断 |
|---|---|---|
| `views/accounts/useModelsEditor.ts:21 useModelsEditor` | 223（单函数即整文件） | 一次 return 30 个成员：模型列表 + 映射 + JSON 文本框 + 预填 + 复制/清空 + pending 提交；AccountEditor 里再解构 20 个名字。 |
| `views/settings/useFailurePolicy.ts:18` | 69 | 可接受，但和 `failurePolicy.ts` 的纯逻辑混在同一文件域。 |
| `views/nodes/NodeTopology.vue:42 refresh` | 64 | 卡片→节点/边的一次性构造，内嵌 3 个闭包（`add`/`internal`/`visitLabel`）+ 4 组 details 数组字面量。 |
| `composables/useSettingsForm.ts:45` | 62 | 已是最佳样板，不建议再动。 |
| `views/prices/priceExpr.ts:443 cond` / `:251 tokenize` | 65 / 54 | 递归下降解析，分支清楚但无测试；只做提取不改语义。 |
| `views/accounts/AccountEditor.vue:590 save` + `:554 submit` + `:504 invalidSection` + `:528 requestBody` | 35+? | 提交管线被拆成 4 个函数但共享 6 个 ref（errors/credErrors/activeSection/ccFeature*/saving），只能靠闭包通信。 |
| `views/ccgateway/CCGatewayAccountAuth.vue:177 refresh` / `:274 createDraft` / `:338 sync` / `:389 complete` | 33/25/26/24 | 每个都是 `stamp = ++serial` + `alive` + `busy` 三段式复制。 |
| `views/accounts/AccountsView.vue:290 batchTest` | 33 | 批量测试与 `picked`/`batchTesting`/`batchDone`/`batchCtrl` 5 个 ref 绑定。 |
| `views/ccgateway/RemoteSettings.vue:221 save` + `connectionPayload` + `otherSettingsProblem` | 24+? | 保存管线正确抽出了子函数，是正面样板。 |

### 1.3 已经存在、却仍在被绕过的复用点

| 已有能力 | 现状 | 一句诊断 |
|---|---|---|
| `composables/crud.ts`（`deleteResource`/`deleteWithConfirm`/`toggleStatus`/`useRowSwitch`/`useStatusOptions`） | 9 处用 `deleteWithConfirm`，但 4 处仍直接 `api.del`（`GrantsTab`、`ccgApi.discardDraft`、`imageUpload`），`PublishersView.revokePublisher/revokeKey` 自己写 confirm+post+toast。 | 判据是「是不是 DELETE 方法」而不是「是不是删除操作」，revoke/purge 这类语义等价动作没被覆盖。 |
| `notifyError` / `fieldErrors` / `applyFormError` | `notifyError` 79 处、`errorMessage` 27 处；`applyFormError` 只有 12 处，另有 8 处手写「`fieldErrors(e)` → 有就贴字段、没有就 toast」的等价逻辑（`MyApiKeysView.saveIPs`、`PublishersView.submitCreate/submitKey`、`ResourcesTab.save`、`DeclarativeForm.submit`…）。 | 手写版把「字段错 + toast 双提示」的旧行为固化了（`PublishersView` 会同时贴字段和弹 toast）。 |
| `useList` | 11 处使用；另有 **14 处** `api.list(..., { page_size: 200 })` 手工取「全量下拉选项」（roles、groups、plugins、market sources、nodes、dashboard accounts…）。 | 缺少「拿一页下拉数据」的公共 helper，每个调用点自己 catch + 自己赋 ref。 |
| `useSettingsForm` | 6 个设置卡片使用；`RemoteSettings`、`PluginDetailView` 的 `SettingsTab`、`RolesView`、`PriceEditView` 各自重写「loaded 快照 + dirty + reset + save」。 | `useSettingsForm` 的形状（path + defaults + fromServer + toBody）只适配「GET/PUT 同一个路径」，其余三个形状被迫手写。 |
| `lookups.ts`（groups/proxies 缓存） | 用法正确，但 `MyApiKeysView` 另走 `fetchMyGroups`、`GroupsView` 又自己 `api.get('/groups/:id/models')`。 | 缓存层只有两个实体，其它「小型枚举」没有归口。 |
| `useQuotaRefresh`/`useBalanceRefresh` | quota/balance 两个 hook 内部结构 90% 相同（`refreshing` Set + 早退 + try/catch + finally delete）。 | `useBalanceRefresh` 可以作为 `useQuotaRefresh` 的变体（多一个节流），但当前是复制。 |
| `STable` + `useTableColumns` | 30 处 `const columns = computed<TableColumn[]>`，写法统一，复用得好。 | 不用动；问题在「行操作菜单」：`rowActions/actionsFor` 在 3 个视图各写一遍，`label: t('common.actions')` 出现 12 次。 |
| `@sub2api/ui` 的 `timeRange.ts` | `toLocalInput`/`fromLocalInput` 在 `packages/ui/src/timeRange.ts` 和 `src/api/admin.ts` **各有一份**（返回类型还不同：`''` vs `null`）；`startOfToday`/`daysAgo` 在 `utils/format.ts` 和 `timeRange.ts` 重复。 | 公共包与 console 内部各有一套时间工具，`toLocalInput` 是逐字复制。 |
| `formatPercent` | `utils/format.ts:52`（part/whole）与 `accountQuota.ts:41`（utilization）**同名不同义**，`AccountQuotaCell` 只 import 后者，`UsageStatsBar` 只 import 前者。 | 同名导出让「改错文件」成为默认风险。 |

### 1.4 死代码与未被引用的导出（全仓 grep 确认，已排除 spec 与 `/locales/`）

| 类别 | 明细 |
|---|---|
| 完全未使用的组件 | `views/settings/AutoDisableSettingsCard.vue`（61 行 + `settings.autoDisable.*` 共 10 个 i18n 键）。它在 `54afc35df` 被 `FailurePolicySettings` 取代，但文件、i18n 和 `AutoDisableSettings` 类型都留下了；核心 `GET/PUT /settings/auto-disable` 仍然存在，账号编辑器仍读 `GET /accounts/auto-disable`，所以这是一个**已经没入口的 §42.2 全局开关**（见 V1 的说明）。 |
| 未使用的导出 | `composables/useList.ts` 的 `useAction`；`utils/format.ts` 的 `toRFC3339`；`api/admin.ts` 的 `isPositiveDecimal`+`POSITIVE_DECIMAL`（intent 已被 `priceExpr` 的 `num/isSet` 覆盖）；`views/plugins/pluginUtil.ts` 的 `riskTone`（RiskDot 用 `riskDotClass`）；`views/ccgateway/requestPolicy.ts` 的 `identityFields`（只剩类型自引用）。 |
| 只有 spec 引用的导出 | `requestPolicy.ts` 的 `attachmentAction`/`setAttachmentAction`/`relayModeForLevel`/`levelInjection`：levels 重构后界面上没有「逐项选择附件来源」的入口，只剩 `requestPolicy.spec.ts` 在测它们。属于「生产代码里没有调用方、测试在保护一个不存在的 UI」。 |
| 未使用的 i18n 键 | 2,757 个键里 **85 个无引用**：49 个 `ccgateway.policy.*`（levels 时代的逐项附件/思考兼容标签，已被 `ccgateway.levels.*` 取代）、`ccgateway.reauth.{prepare,migrate,migrateMessage,freshMessage,hint,hintLoggedOut,confirmTitle,confirmMessage,confirmButton}`、`usage.{filters.accountId,filters.clientRequestId,filters.clientRequestIdPlaceholder,cols.ip,cols.clientRequestId,ips.filter,ips.clear,range.custom,summary.partial,billing.breakdown,request.statusCode}`、`users.{adjustBalanceTitle,amountHint,balanceAdjusted}`、`apikeys.{allTitle,allDescription}`、`common.{appName,theme.light,theme.dark}`、`nav.{items.sticky,items.apiKeysAll,profile,forbidden.home}`、`prices.validate.fixErrors`、`proxies.passwordKeepMaybe`、`ccgateway.features.{ccHint,ccRuntime}`。 |
| i18n 重复值 | en 有 **249** 个「同一文本出现在 >1 个键」，zh 142 个。最高频：`Failed` 10 处（`accounts.lastTest.failed`、`proxies.failed`、`upgrades.states.failed`…）、`Error` 9 处、`Balance` 7 处、`Disabled` 7 处、`Unchanged` 6 处（`prices.sync` 四个键 + `ccgateway.workers` + `failurePolicy`）。 |
| 不能删的「疑似未用」 | `ccgateway.bundled.roles/statuses`、`ccgateway.workers.statuses/reasons` 是经 `RuntimeInstall.vue` 的 `codeText(prefix, code)` 动态拼接的；`ccgateway.policy.search_*`/`attachmentAction_*` 曾由 `i18n/locales.spec.ts` 的 `dynamicPatterns` 白名单保护。删键前必须按 `locales.spec.ts` 的白名单与 `codeText` 调用点复核。 |

### 1.5 解耦问题（父组件 ref 调子组件、prop 串联）

- `ref<InstanceType<typeof Child>>()` 共 11 处，其中真正「命令式调子组件」的有：`GroupsView` → `GroupAccountsEditor.save()/dirty` + `GroupModelPolicyEditor.commit()`、`MyUsageView`/`UsageView` → `UsageRecords.reload()/loading` + `MyLedgerTab.reload()`、`CCGatewayAccountReauth` → `CCGatewayAccountAuth.cancelAuthorization()/rejected()`、`AccountEditor` → `PluginIframe.validate()/getValue()/setErrors()/isReady()`、`SchemaForm.validate()`、`CCGatewayAccountAuth.adopt()/rejected()`。
- `RemoteSettings` 是 5 层 prop 串联的源头：`saved`/`disabled`/`blocked`/`installWarnings` → `ControllerInstall`，`mode/accountRuntimes/hasAdminKey/cliVersion` → `RuntimeInstall`，`global/latest/saved/disabled` → `GroupPolicyList`。
- `AccountRuntimes` 用 `revision: number` **手动版本号**驱动 `RetainedRuntimes` 重载（上一轮 audit V4 的修复结果，能用，但属于「拿一个数字当事件总线」）。
- `AccountEditor` 通过 6 个 emit（`change-type/saved/cancel/back/test/reauthorized`）+ 3 个 draft 容器与父视图通信；`AccountsView` 再把这些转发给 `openEdit/openTest`。

### 1.6 低嵌套 / 简洁问题（模板侧）

| 文件 | 模板最大嵌套 | 超 200 字符行 | 诊断 |
|---|---|---|---|
| `RuntimeInstall.vue` | **12** | 8 | 4 层 `SSettingsGroup` × 3 层 `SCard/template #cell` × 单元格内联三元。 |
| `AccountsView.vue` | 11 | 15 | 表格单元格里塞完整 `<div><SBadge v-for>`，且 12 处 `.value`。 |
| `AccountEditor.vue` | 10 | 15 | 模型/映射卡 + 代理 URL 卡 + 特性卡都是 30–50 行的内联块。 |
| `ConsentView.vue` | 10 | 1 | 18 个三元表达式在同一模板里嵌套（`diffTag`、`risk`、`requiredPerm` 三态）。 |
| `TopologyGraph.vue` | 9 | 9 | `load()` 里 5 个 `Promise.allSettled` 分支各自的 `status === 'fulfilled'` 重复 5 次。 |

## 2. 优先级计划（26 项）

约定：
- 每条一个提交，独立可回滚；「行为变更：无」= 渲染结果、请求体、错误文本、跳转逐项不变。
- 每条都先跑基线命令：`cd next/web && npx vue-tsc -b && npx vitest run`（688 用例必须全绿，不许把用例改成「跳过」）。
- 涉及 i18n 的条目必须保持 `src/i18n/locales.spec.ts` 的 zh/en 同键集与「字面量键都存在」两条断言。

### A. 死代码与低风险清理（P0，先做，为后续腾出空间）

**V1** · 删除失效的 §42.2 全局自动禁用卡片
- 目标：`src/views/settings/AutoDisableSettingsCard.vue`、`src/api/types.ts` 的 `AutoDisableSettings`、`i18n/locales/{zh,en}/settings.ts` 的 `autoDisable.*`（10 键）。
- 改动：整文件删除 + 删类型 + zh/en 同步删块。`mock/accounts.ts` 的 `/settings/auto-disable` 路由**保留**（核心仍实现该接口，见 §3）。
- 行为变更：无（组件自 `54afc35df` 起没有任何引用）。
- 现有 spec：无直接 spec；`SettingsView.spec.ts` 的 6 个 tab 断言不受影响。
- 风险：极低。**但要在提交信息里写明**：CONTRACTS §42.2 要求的「设置 → 网关页签的自动禁用卡片」现在由 `FailurePolicySettings` 的 `account_enabled` + `account_rules` 承担（`server/internal/gateway/failure_policy.go:118` 把 `ad.Enabled` 迁进 `AccountEnabled`）。若产品上仍要独立入口，应新建只含开关的卡片而不是恢复这个文件——先确认，再删。

**V2** · 删除 85 个未引用 i18n 键 + 收窄 `locales.spec.ts` 的 dynamicPatterns
- 目标：§1.4 的键清单（先删 36 个非 `policy` 的；`ccgateway.policy.*` 49 个见 V3）。
- 改动：zh/en 同键删除；`src/i18n/locales.spec.ts:51-54` 只保留仍会被拼接的前缀（`ccgateway.bundled.roles|statuses`、`ccgateway.workers.statuses|reasons`、`ccgateway.levels.*` 等），删掉 `policy.search_`/`attachment_`/`attachmentAction_` 三条白名单。
- 行为变更：无（每键都用 `grep -rn --exclude-dir=locales` 确认 0 引用）。
- 现有 spec：`locales.spec.ts`（两条断言）；删键后仍需全绿。
- 风险：低。唯一陷阱是 §1.4 末尾列出的动态拼接键，删前用 `codeText(` 与 `te(` 的拼接前缀再筛一遍。

**V3** · 删除 levels 重构遗留的 `ccgateway.policy.*` 49 键与对应死助手
- 目标：`i18n/locales/{zh,en}/ccgateway.ts` 的 `policy.{toolSearch,toolSearchHint,customToolPrefix*,search_*,fallbackTitle,thinkingDisabledCompat*,attachments*,attachmentAction_*,attachmentMixed,attachment_*,unknownBeta,unknownField,reject,ignore,ignoreHint}`；配套 `requestPolicy.ts` 的 `attachmentAction`/`setAttachmentAction`/`relayModeForLevel`/`levelInjection`/`identityFields` 只被 `requestPolicy.spec.ts` 引用。
- 改动：先删这些键与助手，再把 `requestPolicy.spec.ts` 里对应 4 个 `it`（`rejects contradictory parent...`、`does not share mutable defaults` 里用到 levelInjection 的部分等）一并删除——**删测试是这个条目唯一允许的行为变更**，所以必须在计划里显式记录，且要在 PR 描述里说明「这些 API 已无 UI 入口」。
- 行为变更：无（界面）；测试数量下降（记录在计划里，避免被当成回归）。
- 现有 spec：`requestPolicy.spec.ts`（21 个 it）、`featureLayers.spec.ts`、`featurePayloadAudit.spec.ts`、`contractFixtures.spec.ts`。
- 风险：低—中。`requestPolicy.ts` 同时是契约夹具的生成源，**只删导出函数，不动 `normalizeRequestPolicy`/`mergeFeaturePolicy`**。

**V4** · 删除无引用导出（纯 TS，不含 view）
- 目标：`useAction`、`toRFC3339`、`isPositiveDecimal`+`POSITIVE_DECIMAL`、`riskTone`、`sortWindows`（只剩一处 `AccountQuotaCell` 调用且实现是 `[...(windows||[])]`）、`hasBalance` 保留（3 处用）。
- 行为变更：无。
- 风险：极低。`sortWindows` 建议直接内联到 `AccountQuotaCell` 并删导出。

### B. 公共层复用（P0/P1，收益覆盖最大）

**V5** · `composables/crud.ts` 增加「非 DELETE 的确认动作」与「提交结果统一处理」
- 改动：新增
  ```ts
  export async function confirmAction<T>(opts: { title?: string; message: string; danger?: boolean; confirmText?: string }, run: () => Promise<T>, done?: () => unknown): Promise<boolean>
  ```
  内部：`confirm` → `run()` → `done?.()`；失败 `notifyError` 并返回 false。把 `PublishersView.revokePublisher/revokeKey`、`RetainedRuntimes` 的清理、`AccountModelTest.removeFailed` 的 hand-rolled confirm+post+toast 换成它。
  另外把散落在 8 处的手写「字段错 / toast」统一成 `applyFormError`（只改「同时贴字段又弹 toast」的两处，见风险）。
- 行为变更：`PublishersView.submitCreate/submitKey` 当前是 `createErrors.value = fieldErrors(e); notifyError(e)`（字段 + toast 双提示），改用 `applyFormError` 后**只剩字段提示**——按「错误文字与官方逐字一致」原则，这属修正重复提示，需要在提交信息与 spec 里显式记录。
- 现有 spec：`composables/crud.spec.ts`（3 例，需新增 `confirmAction` 的 2 例）。
- 风险：低—中（两处提示行为变化，逐条确认）。

**V6** · 新增 `useFormDialog`（6 个「列表页 + 新建/编辑弹窗」的公共骨架）
- 目标：`UsersView`（5 段）、`GroupsView`、`ProxiesView`、`RolesView`、`MyApiKeysView`、`PublishersView`。
- 改动：`composables/formDialog.ts`:
  ```ts
  useFormDialog<T extends object>(opts: {
    empty: () => T
    fromRow?: (row: R) => T
    validate?: (form: T, errors: Record<string,string>) => boolean
    submit: (form: T) => Promise<unknown>
    onSaved?: () => void        // 默认 toast(created|updated) + 关窗 + reload
  })
  // -> { open, editing, form, errors, saving, openCreate, openEdit, submit, close }
  ```
  先只迁移 `RolesView.submitCreate`、`UsersView.submitCreate/submitEdit`、`ProxiesView.submit` 三处（形状最接近），其余按需。
- 行为变更：无（toast 键、关闭时机、reload 顺序保持）。
- 现有 spec：`MyApiKeysView.spec.ts`、无 Users/Groups/Proxies/Roles 的视图 spec；迁移顺序要从小到大。
- 风险：中。`UsersView` 的 5 段各自有差异（roles/groups 无校验），一次只迁 2–3 段。

**V7** · 新增 `fetchOptions`（下拉选项的全量/单页拉取）
- 目标：14 处 `api.list(..., { page_size: 200 })`。
- 改动：`composables/lookups.ts`:
  ```ts
  export async function fetchFirstPage<T>(path: string, pageSize = 200): Promise<T[]>
  export async function fetchAllPages<T>(path: string, pageSize = 200): Promise<T[]>
  ```
  第一批替换只读下拉：`UsersView.loadRoles`、`RolesView.loadRoles`、`ConsentView.loadRoles`、`PluginsView.load`、`MarketView.loadSources`、`AccountRuntimes.load`、`DashboardView.loadAccounts`。
- 行为变更：无。**必须用 `fetchFirstPage`**：`/groups`、`/plugins`、`/nodes` 的 200 上限是刻意的，换成 `fetchAllPages` 会改变请求次数与结果集（`GroupPolicyList.loadGroups` 已有分页循环，保持原样）。
- 现有 spec：无直接覆盖（这些路径在视图 spec 里被 mock）。
- 风险：低。逐个替换、不合并多个请求。

**V8** · 新增 `usePoll`（把 7 处 `setInterval` + visibility 守卫 + inflight 守卫收敛）
- 目标：`NodesView.vue:47`、`TopologyGraph.vue:79`、`plugins/parts/ReleaseHistory.vue:47`、`UpgradesView.vue:90`、`OffloadSettingsCard.vue:75`、`AccountsView.vue:167`、`AccountRuntimes.vue:276`。
- 改动：`composables/usePoll.ts`:
  ```ts
  usePoll(fn: () => unknown, ms: number, opts?: { visibleOnly?: boolean; skip?: () => boolean; immediate?: boolean })
  ```
  内部统一 `document.visibilityState !== 'hidden'`、`clearInterval` 于 `onBeforeUnmount`、`skip()` 早退；`inflight` 守卫留在各 `fn`（语义不同：`NodesView` 要计失败次数，`TopologyGraph` 要打 tick）。
- 行为变更：无（节拍与可见性判断逐字等价）。
- 现有 spec：`AccountRuntimes.spec.ts`、`RetainedRuntimes.spec.ts`（都依赖轮询停止）；无 usePoll 单测，需新增 3 例（可见/隐藏/unmount 清理）。
- 风险：低。逐文件替换，先做 `UpgradesView`、`ReleaseHistory`（形状完全相同）。

**V9** · 合并两套 `toLocalInput`/`fromLocalInput` 与日期起点工具
- 目标：`src/api/admin.ts:47-60` 与 `packages/ui/src/timeRange.ts:44-70`；`utils/format.ts` 的 `startOfToday/daysAgo` 与 `timeRange.ts` 的同名私有函数。
- 改动：`@/api/admin` 的两个函数改为从 `@sub2api/ui` re-export（`fromLocalInput` 的 `null` vs `''` 差异：`PublishersView` 依赖 `null` 判断「未填」，在调用点用 `|| null` 转换）；`utils/format` 的 `startOfToday/daysAgo` 改为 re-export `timeRange` 的版本（当前 `timeRange.ts` 的是私有，需导出）。
- 行为变更：无（`PublishersView` 的 `if (nb)` 判定不变）。
- 现有 spec：`MyApiKeysView.spec.ts`、`PublishersView` 无 spec、`helpers.spec.ts`（ui 侧）。
- 风险：低。

**V10** · `formatPercent` 更名消歧 + 合并 `display`/`displayValue`
- 改动：`accountQuota.ts` 的 `formatPercent(utilization)` → `formatUtilization`（同步 `accountQuota.spec.ts:36-37` 与 `AccountQuotaCell.vue:13`）；`pluginUtil.display` 改为复用 `@sub2api/ui` 的 `isBlank`/`displayValue` 再附加数组 `join(', ')`（当前差异只有数组分支，用 `pluginUtil.spec.ts` 覆盖）。
- 行为变更：无（逐个断言现有输出）。
- 现有 spec：`accountQuota.spec.ts`、`pluginUtil.spec.ts`。
- 风险：低。`displayValue` 需要在 `@sub2api/ui` 的 index 里加导出（属于公共包，见 §3 的 `ui-contract.spec` 要求同步版本）。

**V11** · 统一状态→tone 映射，去掉 14 份私有表
- 目标：`api/admin.statusTone`、`pluginUtil.statusTone`、`RequestLogViewer.statusTone(number)`、`GroupAccountsEditor.statusTone(Account)`、`NodesView.pluginTone`、`PluginsView.nodeTone`、`declarative.badgeTone`，以及 8 个 `Record<string, Tone>` 常量（`STATE_TONES/BUNDLED_TONES/WORKER_TONES/RESULT_TONES/KIND_TONE/STATE_TONE/STEP_TONE/STATUS_TONE/ACTION_TONE/MODE_TONE`）。
- 改动：`utils/tones.ts`:
  ```ts
  export function toneOf(status: string | null | undefined): Tone        // 并集表
  export function httpStatusTone(code: number): Tone                     // 5xx danger / 4xx warning
  export function toneMap<const K extends string>(m: Record<K, Tone>): (k: string | null | undefined) => Tone
  ```
  `toneOf` 的表必须是两份现有表的**并集且冲突项保留各自偏差**（`api/admin`：`pending→warning`；`pluginUtil`：`pending→primary`、`upgrading→primary`、`awaiting_consent→warning`）。冲突用可选的 `profile` 参数区分，不做「统一审美」。
- 行为变更：必须无。每个 view 用「改前/改后快照」验证：`StatusBadge.spec.ts` 覆盖 `api/admin`，`plugins/parts/PluginGatewayDecl.spec.ts` 覆盖插件侧。
- 风险：中。**这是最容易悄悄改颜色的条目**；只合并「语义完全一致」的键，冲突项保留 profile。若不放心，拆成 V11a（新增 `httpStatusTone`/`toneMap`，替换 3 个局部函数）与 V11b（profile 化）。

**V12** · 可选翻译 helper 取代 14 处 `te(k) ? t(k) : raw`
- 目标：`plugins/parts/StatusBadge.vue:12`、`TrustBadge.vue:11`、`ReleaseHistory.vue:14`、`CLISettings.vue:41`、`RuntimeInstall.vue:62 codeText`、`ConsentView.vue:101/106/129/523/526`、`GrantsTab.vue:34/80`、`BillingBreakdown.vue:37`、`LedgerTable.vue:28`、`upgrades.ts:13`、`UsageBillingFacts.vue:33`、`ccgError.ts:19`、`SettingsFailureDecisionDetails.vue:9`、`EgressTab.vue:189`。
- 改动：`composables/optionalText.ts`:
  ```ts
  /** te(key) ? t(key, params) : fallback（默认 fallback = 原键的末段/给定原文） */
  export function useOptionalT(): (key: string, params?: Record<string, unknown>, fallback?: string) => string
  ```
  上述点改为 `const tr = useOptionalT()` + `tr(`plugins.status.${v}`, undefined, v)`。
- 行为变更：无（`te + t` 的语义逐字保留，包括 `ConsentView` 的「存在才渲染」情形需要保留 `te` 单独调用，不能一刀切）。
- 现有 spec：`StatusBadge.spec.ts`、`CLISettings.spec.ts`、`ccgAuthFlow.spec.ts`（reason 已知/未知码）。
- 风险：低。分两批：纯 label 的 9 处先做，带 `v-if="te(...)"` 的 3 处保留原样。

### C. 大文件拆分（P1，行为必须零变化）

**V13** · `AccountEditor.vue` 拆出保存管线
- 目标：873 行 → ~600 行。
- 改动：新增 `views/accounts/useAccountSave.ts`，接收 `{ formState, modelsEditor, credentialCollector, featureState, activeSection }`，迁出 `invalidSection`、`requestBody`、`submit`、`showSaveError`、`save` 与 `loadAutoDisablePolicy`（后者含 `autoDisablePolicyRequest` 序号与 focus 监听）。AccountEditor 只留模板 + 装配。
- 行为变更：无。关键不变量：`invalidSection` 的检查顺序（ccFeature → 浏览器原生 invalid → name → ccgSaveBlocked → commitPending）、`requestBody` 的字段顺序与「`proxy_url` 与 `proxy_id` 二选一」。
- 现有 spec：`AccountEditor.spec.ts`（26 个 it，覆盖自动禁用门控、代理预填、自动模型、特性草稿原子保存）。
- 风险：中。`test 'sends empty settings explicitly to reset previously saved overrides'` 与 `'saves a feature draft atomically'` 直接断言请求体，可作为等价性护栏。

**V14** · `AccountEditor.vue` 拆出模型/映射卡
- 改动：新增 `views/accounts/AccountModelsCard.vue`（模板 ~110 行：模型卡 + 映射卡 + autoModels 开关 + 预填提示），props `{ models, mapping, defaultModels, defaultMapping, modelOptions, mode 相关 flags, automaticModels, editing, canFetch }`，emit `(update:models, update:mapping, fetch, setAutoModels, clearPrefill, mergeModels)`；`useModelsEditor` 的解构保持在父组件（避免二次传递 30 个字段时改成 prop 大对象）。
- 行为变更：无。
- 现有 spec：`AccountEditor.spec.ts` 的 `ModelTagSelect` 断言（`tags(w).props('readonly')`）依赖组件层级，拆分后需改为 `w.getComponent(AccountModelsCard)` 两层查找。
- 风险：中低。

**V15** · `AccountsView.vue` 拆出批量测试与行操作
- 改动：新增 `views/accounts/useBatchTest.ts`（`picked/batchTesting/batchRunning/batchDone/batchTotal/batchCtrl/pickRow/pickPage/batchTest/stopBatch`，~70 行）与 `views/accounts/accountRowActions.ts`（`actionsFor/onAction/ROW_ACTIONS` 所需的权限谓词作为参数注入）；`abbrev/trimZero` 移到 `utils/format.ts` 作 `formatCompact`。
- 行为变更：无。`batchTest` 的 toast（`failed ? 'warning' : 'success'`）与 `AbortSignal.timeout(120000)` 保持。
- 现有 spec：`AccountsView.spec.ts`（`batchTest` 相关：`plugin account actions`、`names why a manual quota refresh cannot run`）。
- 风险：中。行操作表用了 `ROW_ACTIONS: Record<string,(a)=>unknown>` 的动态派发，迁移时函数引用必须原样搬。

**V16** · `ConsentView.vue` 拆出「插件提供物」与「宿主权限表」
- 改动：新增 `views/plugins/consent/ProvidesSummary.vue`（承载 13 项 `hasProvides` OR 链，改为 `const provides = computed(() => [ {key,label,items}... ].filter(x => x.items.length))` 一处遍历）与 `HostPermissionTable.vue`（`rows`/`checked`/`toggle` 通过 `defineModel`）。
- 行为变更：无（渲染的 `v-if` 组合等价）。
- 现有 spec：`plugins/parts/PluginGatewayDecl.spec.ts` 只覆盖子组件；ConsentView 无 spec → **先补一个「审批提交请求体」的 spec 再拆**。
- 风险：中。

**V17** · `RequestPolicySettings.vue` 按 layer 拆卡
- 改动：`views/ccgateway/policy/BillingLayerCard.vue`、`EnvironmentLayerCard.vue`、`PromptLayerCard.vue`；`view`/`edit`/`modeOf`/`setMode`/`layered`/`showEffective`/`editable` 以 props + `defineModel('overrides')` 传入，或用一个 `usePolicyLayerContext(props, emit)` 的 provide/inject。
- 行为变更：无。**注意**：`edit()` 的「只写它设置的字段」语义与 `setLevel` 的 `delete draft.relay_mode` 必须保持在同一处实现。
- 现有 spec：`RequestPolicySettings.spec.ts`（7 个 it，含「never sends a request policy schema the core rejects」）、`featureLayers.spec.ts`（10 个 mount）、`featurePayloadAudit.spec.ts`、`contractFixtures.spec.ts`。
- 风险：中。这四组 spec 覆盖率是全仓最高的之一，可作等价护栏；但它是契约夹具的生产路径，任何字段丢失都会被 `contractFixtures` 抓到。

**V18** · `UsersView.vue` 迁移到 `useFormDialog`（V6 的后续）
- 改动：5 段（create/edit/roles/groups/balance）中至少 3 段（create/edit/roles/groups 四段共用 `saving`）收敛；`toggleKey` 保留。
- 行为变更：无（每段的 toast 键不同：create→`common.created`，其余→`common.updated`）。
- 现有 spec：无 UsersView spec → 先补 1 个「create 提交体 + 失败贴字段」的 spec。
- 风险：中。

**V19** · `RuntimeInstall.vue` 拆出 bundled / workers 两块
- 改动：`views/ccgateway/runtime/BundledImagesCard.vue`、`WorkerUpdateCard.vue`；`STATE_TONES` 等 4 个表随 V11 处理；模板嵌套从 12 降到 ≤6。
- 行为变更：无。
- 现有 spec：`RuntimeBundled.spec.ts`、`RuntimeWorkers.spec.ts`、`RuntimeUpload.spec.ts`。
- 风险：中低。

### D. 结构与接口（P2）

**V20** · 去掉 3 处「ref 调子组件 reload」
- 目标：`UsageView.vue:23`、`MyUsageView.vue:33-34`。
- 改动：`UsageRecords.vue` 增加 `title`/`description` props 并自带 `SPageHeader`（内含 refresh 按钮，直接用内部 `loading`），父视图只渲染 `<UsageRecords .../>`；`MyUsageView` 的 `ledgerRef` 改成 `MyLedgerTab` 也自带 header 的同一形状，或保留一个 `revision` prop（与 `RetainedRuntimes` 同法）。
- 行为变更：DOM 层级变化（header 从父移到子），标题文字与按钮位置不变。
- 现有 spec：`UsageFilters.spec.ts`、`UsageTable.spec.ts`、`STableExpand.independent.spec.ts`（均 mount 子树，不 mount UsageView）。
- 风险：中低。若不想动 DOM 层级，退化为 `revision: number` 方案（与 `RetainedRuntimes` 一致），零层级变化。

**V21** · `GroupsView` 的两个子编辑器改为受控 draft
- 改动：`GroupAccountsEditor` 已 `defineModel`？否——它用 `props.groupId` + `defineExpose({save, dirty})`。改为父持有 `accountDraft: Set<number>`，子组件 `v-model:selected`；`GroupModelPolicyEditor` 的 `commit()`（把文本刷进 `modelValue`）改为 `watch(modelValue, immediate)` 下由父在 submit 前调用一个纯函数 `normalizeModelPolicy(form)`。
- 行为变更：无（提交体字段名不变）。
- 现有 spec：`GroupModelPolicyEditor.spec.ts`。
- 风险：中高。`commit()` 承担「粘滞文本 → 列表」的转换，抽成纯函数可先做（低风险），`save()` 的 RPC 换成父调用放后一步。

**V22** · `RemoteSettings` 的 prop 串联收敛为 `config` 对象
- 改动：`RuntimeInstall`/`ControllerInstall` 接收 `config: Pick<CcgRemoteConfig, 'mode'|'account_runtimes'|'has_admin_key'> & { cli_version: string }`。仅 2 个子组件，收益有限。
- 行为变更：无。
- 风险：低但改动面广（`RemoteSettings.controller.spec.ts` 33 个 mount）。
- 建议：**放在最后，或不做**（见 §3）。

**V23** · `useModelsEditor` 拆成三块
- 改动：`useModelList.ts`（models/modelsText/mode/error/reject/format/clear/copy/merge）、`useModelMapping.ts`（mapping/mappingText/jsonMode/error/format/template/clearPrefill）、`useModelDefaults.ts`（defaultsFor/defaultModels/defaultMapping/prefillWhat/sameDefaults/applyDefaults）。AccountEditor 分别解构；`useModelsEditor` 作为组合器保留一个薄封装（对外签名不变，AccountEditor 不需要改 20 个解构）。
- 行为变更：无。
- 现有 spec：`modelIds.spec.ts`、`modelDefaults.spec.ts`、`AccountEditor.spec.ts`。
- 风险：中。文件顶部的 `api.list<Price>('/prices')` 模块级副作用（加载 priced models 作为建议）必须留在默认值块里，且只有一次。

**V24** · 模板内 55 处 `.value` 消除（`useList` 返回值解构）
- 改动：`AccountsView`/`GroupsView`/`MyApiKeysView`/`PublishersView`/`ProxiesView`/`UsersView` 把 `const list = useList(...)` 改成 `const { items, loading, page, pageSize, total, filters, reload } = useList(...)`，模板里的 `list.items.value` → `items`。**只改模板与绑定名，不改 `useList` 本身**（`UseListResult` 的嵌套 ref 在模板里不会自动解包，所以两种写法必须选一种；全仓已有 5 个文件用解构式，应统一到解构式）。
- 行为变更：无。
- 现有 spec：`AccountsView.spec.ts` 的 mock 提供的是 `list` 对象（`vi.mock('@/composables/useList', () => ({ useList: () => list }))`），解构后 mock 仍可用（解构自同一对象）；`MyApiKeysView.spec.ts` 同理需核对。
- 风险：低—中（纯机械，但 6 个文件、模板 25 处，容易漏）。建议每个文件一个提交。

**V25** · `api/types.ts` 按域拆分（type-only）
- 改动：`src/api/types/{accounts,ccgateway,usage,plugins,prices,platforms,misc}.ts` + `src/api/types.ts` 保留 `export *`（路径不变，import 不用改）。
- 行为变更：无（类型擦除）。
- 风险：低（`vue-tsc -b` 即可验证）。收益是后续单文件改动不再触发全量类型重算；但 diff 很大，若分支上还有人在改 `types.ts`，**应推迟**。

**V26** · eslint 配置与现有风格对齐（去掉 4,596 条可自动修的排版告警源）
- 目标：`next/web/eslint.config.js` 关闭与 prettier 冲突的 `vue/max-attributes-per-line`、`vue/singleline-html-element-content-newline`、`vue/first-attribute-linebreak`、`vue/html-closing-bracket-newline`（或直接接入 `eslint-config-prettier`，已安装）。
- 改动：只改配置，不改源码。
- 行为变更：无。
- 风险：低。**不要同时跑 `prettier --write .`**（见 §3）；`format:check` 脚本与 CI 的关系另行决定。

## 3. 不要动的地方（及原因）

1. **`views/prices/priceExpr.ts`（575 行，无 spec）**：手写表达式解析器，语法与核心价格表达式语言一一对应（`expression` 字符串是服务端要执行的 DSL）。没有 golden 测试，任何「顺手重构」都可能改变生成/解析的表达式文本。要动先补 `parseExpression`/`visualExpr` 的往返测试（现有 `videoPrice.spec.ts` 只覆盖视频价）。
2. **`views/ccgateway/ccgAuthFlow.ts` 与 `ccgReauth.ts`**：草稿/重授权状态机（`currentStep`/`stepStates`/`readyToSave`/`commitRecovery`）是文档 `CCGATEWAY-DRAFT-RUNTIMES.md` / `CCGATEWAY-REAUTH.md` 的可执行版本，`ccgAuthFlow.spec.ts` + `LocalCredentialFlow.independent.spec.ts` 逐条对应文档。`CCGatewayAccountAuth.vue` 的脚本虽然 535 行，但拆分风险 > 收益（OAuth 失败不可本地复现）。
3. **`views/ccgateway/requestPolicy.ts` 的 `normalizeRequestPolicy`/`mergeFeaturePolicy`/`validRequestPolicy`**：`plugins/ccgateway/companions/contracts/testdata/web-policy-payloads.json` 由它们生成，`contractFixtures.spec.ts` + 核心侧契约测试共同校验。上一轮 audit（`2026-10-24-code-quality/05-web-sdk.md` V2）已确认默认值里的 `cli_version: '2.1.304'` **必须保留**。
4. **`packages/ui` 的任何导出**：插件通过 import map 消费（`vite-preset` 的 `SHARED_MODULES`，`HOST_UI_VERSION = '3.1.0'`）。`SStack` 在控制台内 0 引用但 `next/plugins/growth/ui/native/src/*` 在用；`SRadio` 只被 `SRadioGroup` 用。删导出前必须 grep `next/plugins/*/ui/native/src`，且 `ui-contract.spec.ts` 会断言版本与导出集合。
5. **`packages/host/src/http.ts`**：会话、401 单次刷新、`startKeepAlive`、envelope 解包（含 `paged` 标志的语义注释）是对外契约，`http.spec.ts` 覆盖。只在 V9 那种「纯 helper 去重」时靠近它。
6. **`packages/ui/src/STable.vue` + `tableReorder.ts` + `tableColumns.ts`**：列偏好持久化、拖拽排序、`columnSettingsKey` 已被插件复用；`tableReorder.spec.ts` 全绿是前提。`STable` 的 `card`/`expandable`/`selectable`/`reorderable` 组合不要为了「低嵌套」拆散。
7. **`TimeText.vue` 与 `SDateTime.vue` 不要合并**：输出格式不同（`TimeText` 是 `YYYY-MM-DD HH:mm:ss`/本地 `HH:mm:ss`；`SDateTime` 是 `Intl.DateTimeFormat` + `Intl.RelativeTimeFormat` 本地化文案）。控制台 10 个视图依赖前者，ccgateway 的日志抽屉依赖后者。只合并它们底层的纯日期工具（V9）。
8. **`packages/*/` 与 `next/plugins/*/ui/native` 的 API 形状**：`host.ts` 里 `HostContext`/`PluginHost` 的字段是插件 `register(host)` 的入参。V6/V20 之类的重构不得改变这些类型。
9. **全量 `prettier --write .` / 全量 `eslint --fix`**：328 个文件未格式化，一次性重排会与任何在飞分支冲突，并且 `next/server/web/dist/index.html` 是被 git 跟踪的占位文件（`CONTRACTS` §1 约定，build 后必须 `git checkout` 还原）。格式化只作为独立提交、在分支收敛后做，且不同时改逻辑。
10. **`mock/**` 与 `src/views/plugin-host/PluginPageView.vue` 的声明式页面渲染**：`mock/` 是 dev/mock 服务器的数据源（含已被 UI 弃用的 `/settings/auto-disable`），它与核心接口一一对应；删 mock 路由会让「接口仍在、控制台无入口」的事实消失。
11. **`AccountRuntimes` 的 request-log levels/legacy 双形状兼容**：`logsLevels === null` 表示旧 Worker（`REQUEST-LOG-LEVELS-DESIGN §4`）。看着像死分支，实际是跨版本兼容，删掉会让旧 Worker 的开关消失。
12. **`layouts/AppSidebar.vue` 的 `CLIENT_ITEMS`**：当服务端菜单还没列新页面时客户端补项，是刻意的过渡机制（注释写明），不是冗余。

## 4. 给单一写者的执行顺序

原则：先把「删东西」和「公共 helper」做掉（低风险、缩小后面每次改动的成本），再拆大文件，最后才动结构/接口。每步结束都跑 `cd next/web && npx vue-tsc -b && npx vitest run`（688 用例）。

**第 1 批（纯删除，1–2 天）**
1. V1 死卡片 + 类型 + 10 个 i18n 键（先与用户确认 §42.2 入口归属）。
2. V2 36 个非 policy 死键 + 收窄 `locales.spec.ts` 白名单。
3. V4 5 个无引用导出（含 `sortWindows` 内联）。
4. V3 `ccgateway.policy.*` 49 键 + 4 个 spec-only 助手（含删对应用例，需在提交信息记录）。

**第 2 批（公共 helper，收益覆盖最广）**
5. V12 `useOptionalT`（先做 9 处纯 label）。
6. V9 `toLocalInput`/`startOfToday` 去重。
7. V8 `usePoll`（先 `UpgradesView` + `ReleaseHistory`）。
8. V5 `confirmAction` + 8 处手写 `applyFormError` 收敛（含 2 处提示行为修正，逐条确认）。
9. V7 `fetchFirstPage`（7 处只读下拉）。
10. V10 `formatUtilization` 更名 + `display` 复用 `displayValue`。

**第 3 批（机械整理，低风险）**
11. V24 模板 `.value` 消除，一个文件一提交（6 个）。
12. V11a 新增 `httpStatusTone`/`toneMap`，替换 `RequestLogViewer`、`PluginsView.nodeTone`、`GroupAccountsEditor` 3 处局部函数（不做 profile 化）。

**第 4 批（大文件拆分，行为零变化）**
13. V13 `AccountEditor` 保存管线（最需要护栏，先做）。
14. V14 `AccountModelsCard`。
15. V15 `useBatchTest` + `accountRowActions` + `formatCompact`。
16. V19 `RuntimeInstall` 两块卡片。
17. V17 `RequestPolicySettings` 三张 layer 卡（四组 spec 兜底）。
18. V16 `ConsentView`（先补 spec）。
19. V23 `useModelsEditor` 三段（对外签名不变）。

**第 5 批（表单/结构，谨慎）**
20. V6 `useFormDialog` + 只迁 `RolesView`、`UsersView`（先补 spec）。
21. V18 `UsersView` 剩余段。
22. V20 usage 页 header 归属（或退回 `revision` prop 的最小方案）。
23. V22 `RemoteSettings` prop 收敛（可选，若时间不足就跳过）。

**第 6 批（可选/推迟）**
24. V21 `GroupsView` 子编辑器受控化（先抽出 `normalizeModelPolicy` 纯函数这一步）。
25. V11b tone 表 profile 化。
26. V25 `api/types.ts` 分域（分支收敛后再做）；V26 eslint 配置对齐（独立提交，不与格式化混）。

依赖关系：V6 依赖 V5；V18 依赖 V6；V11b 依赖 V11a；V14 依赖 V13（同一 SFC，先后改会冲突）；V17 必须在 V3 之后（先删死助手，模板才好拆）；V24 独立，随时可做。**同一文件同一时间只给一个写者**：`AccountEditor.vue` 占 V13/V14/V23 三条，必须串行；`RequestsPolicySettings.vue`（V17）与 `requestPolicy.ts`（V3）也不并行。

## 5. 处理结果（2026-10-24，单一写者 `next/web/src/**`）

基线复核：`npx vitest run` 69 文件 / 688 用例全绿、`npx vue-tsc --noEmit -p tsconfig.app.json` 无输出。

最终：`npx vitest run` **70 文件 / 694 用例全绿**（新增 `ConsentView.spec.ts` 4 例、`crud.spec.ts` 2 例；删除 `AutoDisableSettingsCard.vue` 未带走任何用例）；`vue-tsc` 仍无输出；`npx eslint src` **0 error / 22 warning**（改配置前 0 error / 7,469 warning，见 V26）。

### 已做

| 项 | 结果 |
|---|---|
| V1 | 删除 `views/settings/AutoDisableSettingsCard.vue`（全仓 0 引用）、`api/types.ts` 的 `AutoDisableSettings`、zh/en `settings.autoDisable.*`（10 键）。`mock/accounts.ts` 的 `/settings/auto-disable` 保留（核心仍实现该接口，账号编辑器仍读 `GET /accounts/auto-disable`）。 |
| V2 / V3 | 逐键 grep（含 spec）后删除 85 个死键：`ccgateway.policy.*` 收到只剩 `invalid`（`RemoteSettings` 在用）+ `ccgateway.features.ccHint/ccRuntime`、`ccgateway.reauth.{prepare,migrate,migrateMessage,freshMessage}`、`usage.*` 11 键、`users.*` 3 键、`apikeys.{allTitle,allDescription}`、`common.{appName,theme.light,theme.dark}`、`nav.{items.sticky,items.apiKeysAll,profile,forbidden.home}`、`prices.validate.fixErrors`、`proxies.passwordKeepMaybe`。**保留** `ccgateway.reauth.{hint,hintLoggedOut,confirmTitle,confirmMessage,confirmButton}`：`ccgReauth.spec.ts` 明确断言这五个文案存在（属"只在 spec 里用到也算用到"）。`locales.spec.ts` 里 `policy.search_/attachment_/attachmentAction_` 三条 dynamicPatterns 白名单一并删除（键已不存在，`te()+t()` 都不再拼接它们）。 |
| V4 | 删除 `useAction`、`toRFC3339`、`isPositiveDecimal`+`POSITIVE_DECIMAL`、`riskTone`、`identityFields`（`IdentityField` 改为字面量联合，字段仍被 `RequestPolicy.request_identity_sources` 引用）。`sortWindows` 保留：`AccountQuotaCell` 与 `accountQuota.spec.ts` 在用，内联会动 spec，收益不抵。`relayModeForLevel` / `levelInjection` / `attachmentAction` / `setAttachmentAction` **未删**（V3 允许删 spec 用例，但同一模块还挂着 `contractFixtures.spec.ts` 的契约夹具生成路径，删导出+删 5 个 `it` 的收益低于风险，仅在 `relayModeForLevel` 上补了"spec-only helper"注释）。 |
| V4（实际 V12）/ V12 | 新增 `composables/optionalText.ts` 的 `useOptionalT()`（`te(k) ? t(k, params) : fallback`，默认 fallback 为键末段），替换 15 处纯 label 的 `te+t`：`StatusBadge`、`plugins/parts/{StatusBadge,TrustBadge,ReleaseHistory}`、`ConsentView`（hpLabel/sigLabel/fieldLabel）、`GrantsTab`、`EgressTab`、`CLISettings`、`RuntimeInstall.codeText`、`FailureDecisionDetails`、`LedgerTable`、`BillingBreakdown`、`UsageBillingFacts`、`upgrades.ts`、`ccgError.ts`。带 `v-if="te(...)"` 的 3 处（`ConsentView` 的 hpDesc/hpWarn、`GrantsTab` 的 hpDesc）**保留 `te`**（"存在才渲染"语义），只把 `hpWarn` 的 fallback 收进 `HostPermissionTable`。 |
| V7（实际 V5） | `composables/crud.ts` 新增 `confirmAction(opts, run, done)`（confirm → run → done，失败 notifyError，返回布尔），替换 `PublishersView.revokePublisher/revokeKey`、`AccountModelTest.removeFailed` 的手写三段式；`crud.spec.ts` 新增 2 例。`RetainedRuntimes.purge` 保留原写法（"已到期不必确认" + 失败用 `describe(e)` 的 CCGateway 文案，套 `confirmAction` 会丢掉这两点）。 |
| V8（实际 V5 的 applyFormError 部分） | `PublishersView.submitCreate/submitKey`、`ResourcesTab.save`、`DeclarativeForm.submit` 的"字段错 + toast"双提示统一成 `applyFormError`（**行为变更：这两处失败时只剩字段提示，不再额外弹一条 toast**，即 V5 计划里写明要记录的那两处）。`MyApiKeysView.saveIPs`、`AccountEditor.probeProxyUrl`、`ProxiesView` 的 probe 保留原样（它们只取单个字段、其余走 toast，语义不同）。 |
| V7（实际 V5 的 fetchOptions 部分） | `composables/lookups.ts` 新增 `fetchFirstPage` / `fetchAllPages`，替换 14 处 `page_size: 200`：下拉 9 处用 `fetchFirstPage`（roles ×3、plugins ×2、market sources、accounts(plugin_key)×1、nodes ×2、sticky、proxies/groups lookup），需要全量的 `GroupAccountsEditor`、`GroupPolicyList` 用 `fetchAllPages`（与原来的分页循环等价，含 `paged` 早退）。`MarketView` 的 `/market/plugins` 是 `requestRaw`（行情接口不走统一 envelope），未替换。 |
| V9 | 拆 `useModelsEditor`（V23）：新增 `useModelList.ts`（models/modelsText/mode/error + set/reject/sync/format/merge/clear/copy）与 `useModelEdit.ts`（mapping、默认值、prefill、compare/apply/setSaved/reset/commitPending/payload、`modelOptions` 的模块级一次性加载留在后者）；`useModelsEditor.ts` 变成只做拼装的薄封装，**对外 30 个成员签名不变**，`AccountEditor` 不用改解构。 |
| V10（实际 V13+V14） | `AccountEditor.vue` 873 → 747 行：保存管线抽到 `useAccountSave.ts`（`invalidSection`、`requestBody`、`submit`、`showSaveError`、`save`，检查顺序与请求体字段顺序逐字保留）；模型/映射两块卡抽到 `AccountModelsCard.vue`（模板 ~120 行，状态仍由父组件的 `useModelsEditor` 持有，通过 `v-model:*` + 事件传入）。`AccountEditor.spec.ts` 的 `tags()` 改成两层查找（`getComponent(AccountModelsCard).getComponent(ModelTagSelect)`），24 条用例全绿。 |
| V11（实际 V15） | `AccountsView.vue` 764 → 696 行：批量测试抽到 `useBatchTest.ts`（picked/batchTesting/batchRunning/batchDone/batchTotal/pickRow/pickPage/batchTest/stopBatch，toast 与 `AbortSignal.timeout(120000)` 原样），行操作表抽到 `accountRowActions.ts`（`rowActions`/`runRowAction`，权限谓词与处理函数由视图注入）；`abbrev/trimZero` 移到 `utils/format.ts` 的 `formatCompact`。 |
| V12（实际 V16） | `ConsentView.vue` 565 → 306 行：拆出 `views/plugins/consent/ProvidesSummary.vue`（13 项 OR 链改成 `hasProvides` 计算属性一处判断，模板逐项 `v-if`）与 `HostPermissionTable.vue`（rows/checked/showMissing 作 props，切换 emit；`HPRow` 提到 `consent/hostPermission.ts`）。**先补了 `ConsentView.spec.ts`（4 例）**：审批提交体（grants 含 scope / denied / role_keys_for_new_permissions）、缺权限时按钮禁用、必选未勾时不提交。 |
| V13（实际 V17） | `RequestPolicySettings.vue` 501 → 180 行：新增 `usePolicyLayerContext.ts`（`providePolicyLayers` + `usePolicyLayers`，`view/toggles/modeOf/setMode/editable/edit/locked/layerOrigin/fieldOrigin` 集中一处，`edit()` 的"只写它设置的字段"与 `setLevel` 的 `delete draft.relay_mode` 语义未变）与 `policy/{Billing,Environment,Prompt}LayerCard.vue`；level 卡与 identity 卡留在原文件。四组契约 spec（`featureLayers` / `featurePayloadAudit` / `contractFixtures` / `RequestPolicySettings`）全绿；`contractFixtures` 与 `featurePayloadAudit` 的 AccountEditor stub 列表补了三个卡片（因为它们对 `RequestPolicySettings` 用 `false` 透传）。 |
| V14（实际 V20） | 去掉 `UsageView`/`MyUsageView` 对子组件的 ref 调用：`UsageRecords` 与 `MyLedgerTab` 增加 `revision?: number` prop（变化即 reload）与 `v-model:loading` emit，页面只把按钮的 `revision++` 传下去、用 `loading` 控制 spinner。DOM 层级与标题位置不变。`MyLedgerTab` 的 `reloadAll` 仍保留（供 revision 触发）。 |
| V15（V21 的第一步） | `GroupModelPolicyEditor` 里"粘滞文本 → 列表"的转换抽成纯函数 `views/groups/groupModelPolicy.ts`（`draftPatterns` / `mergeDraftPatterns`，含 `fillGroupModels` 的 pending 快照语义）；组件 `commit()` 仍由父组件命令式调用（第二步改父持有 draft 未做，见"跳过"）。 |
| V26 | `eslint.config.js` 接入 `eslint-config-prettier`（依赖本就在 devDependencies 里）：`npx eslint src` 从 0 error / 7,469 warning 降到 **0 error / 22 warning**，其余 12 条仍可 `--fix` 的是 `vue/attributes-order` / `vue/require-default-prop` / 少量未用变量（其中 `_p`、`_e`、`_omit` 是既有的"故意忽略"命名）。 |

### 跳过（附原因）

| 项 | 原因 |
|---|---|
| V6 `useFormDialog` / V18 `UsersView` 迁移 | 计划要求先补 `UsersView` spec 再迁；`UsersView` 5 段（create/edit/roles/groups/balance）各自的 toast 键与 reload 顺序有差异，本轮的 `applyFormError`/`confirmAction` 已收掉重复的错误提示，`useFormDialog` 留待有 spec 的独立一轮，避免在没有护栏的情况下动 5 段提交。 |
| V8 `usePoll` | 7 处 `setInterval` 的语义各不相同（`NodesView` 要计失败次数、`TopologyGraph` 要打 tick、`AccountRuntimes` 要 `revision++`），抽出 `usePoll` 需要每处再注入 `skip`/`onTick`，本轮没有等价护栏（`usePoll` 自身也无 spec），收益不抵风险。 |
| V9（原计划 V9 的 `toLocalInput` 去重） | `fromLocalInput` 在 `@/api/admin` 与 `@sub2api/ui` 的返回类型不同（`null` vs `''`），`PublishersView` 依赖 `null` 判"未填"；改 re-export 要在调用点加 `\|\| null` 且公共包导出属于 import-map 契约（`ui-contract.spec.ts` 断言导出集合与 `HOST_UI_VERSION`），按"不要动 packages/ui 的导出"的约束本轮不动。 |
| V10/V11（原计划） | `formatPercent` 更名 `formatUtilization` 需要同步 `AccountQuotaCell` + spec；`display` 复用 `@sub2api/ui` 的 `displayValue` 同样要动公共包导出；状态→tone 表 profile 化（V11b）也属"最易悄悄改颜色"的一项，本轮不动。 |
| V16（原计划 V24 模板 `.value` 消除） | `AccountsView`/`MyApiKeysView` 等 spec 的 `useList` mock 返回的是扁平对象，`list.items.value` 与解构式两种写法在模板里不等价；6 个文件 × 25 处属纯机械改动，但本轮已把 `AccountsView` 的脚本改过大半，再叠加上去 diff 难以 review，留作独立一轮。 |
| V17（原计划 V25 `api/types.ts` 分域） | 计划本身要求"分支收敛后再做"；本轮同时有 `AutoDisableSettings` 删除与多处类型联动，拆 1,180 行会放大冲突。 |
| V21（`GroupsView` 子编辑器受控化第二步） | 只做了纯函数那一步；把 `save()` 的 RPC 换成父调用需要动 `GroupAccountsEditor.spec` 的挂载方式，收益（去掉一个 `defineExpose`）不抵本轮风险。 |
| V22（`RemoteSettings` prop 收敛） | 计划标注"可做可不做，放在最后"；`RemoteSettings.controller.spec.ts` 33 个 mount 都要跟着改。 |
| `AccountsView` 的 `te`→`useOptionalT` | 两处是"已知 reason 才换文案，否则走通用 `notifyError`"的三态，不是 `te?t:raw`，换成 `tr` 会把未知 reason 显示成空串。 |

### 行为变更（逐条）

1. `PublishersView.submitCreate` / `submitKey`、`ResourcesTab.save`、`DeclarativeForm.submit`：失败时**不再同时**贴字段错误和弹 toast——有字段错误只贴字段（`applyFormError` 的语义，与其余 12 处一致）。错误文字本身未改。
2. `AccountDeleteDialog`：删除请求进行中 `busy` 现在保持到对话框关闭之后（原先在 `emit('update:open')` 之前就清掉，出现"仍在打开但已可关闭"的一帧）。
3. 没有其它渲染、请求体、错误文字或跳转变化；`contractFixtures` / `featurePayloadAudit` 逐字段断言通过。

