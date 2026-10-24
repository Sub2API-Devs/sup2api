# Review Round 2 — 05：控制台 `next/web`（commit `1972f630e`）

范围：`git show --stat 1972f630e`（91 个文件）+ 计划与写者自述 `next/docs/audits/2026-10-24-optimization-round2/06-web.md` §5。
判据：抽象、复用、解耦、低嵌套、简洁；同时核对「行为是否真的零变化」。

## 0. 复核基线（本机实测，2026-10-24）

| 检查 | 结果 |
| --- | --- |
| `npx vitest run`（`next/web`） | 70 文件 / **694 用例全绿**（与 §5 一致） |
| `npx vue-tsc --noEmit -p tsconfig.app.json` | 无输出（通过） |
| `npx vue-tsc -b`（= `npm run typecheck`） | 通过 |
| `npx eslint src` | **0 error / 21 warning**（§5 写 22，差 1，不影响结论） |
| `npx eslint .`（= `npm run lint`）= 全仓 | 0 error / **156 warning**（§5 的 21/22 只覆盖 `src`） |
| `npx prettier --check .` | **360 个文件不合 prettier**；本次新增/改动的 12 个文件中 11 个不合格 |
| CI（`.github/workflows/next-ci.yml` web job） | 只有 Install / Typecheck / `npm test`，**没有 lint、没有 format:check** |

**结论先行**：这次拆分整体是「搬运式」的，多数行为等价；但发现 **1 个会掉界面的真实回归**（ConsentView 组件未导入）、**1 个行为变化未在 §5 声明的额外请求/共享 loading 竞争**（MyUsageView）、**1 个 lint 能力被顺手削掉**（`no-unexpected-multiline` 从 error 变 off），以及若干抽象过度/复用没做透的点。测试与类型检查都没能抓住第一类问题，说明本次新增的 `ConsentView.spec.ts` 护不住它想护的东西。

## 1. 问题表（按严重度排序）

| ID | 位置 | 类型 | 问题 | 具体修法 | 风险 | 行为变化 |
| --- | --- | --- | --- | --- | --- | --- |
| R-V1 | `next/web/src/views/plugins/ConsentView.vue:6`（用到处 203/210/211/228/233/237/244/269/272） | 回归（丢导入） | 拆分 `ProvidesSummary`/`HostPermissionTable` 时把 `@sub2api/ui` 的导入行改成 `{ SAlert, SBadge, SButton, SCard, SLink, SSpinner, confirm, toast }`，但模板仍在用 `SIcon`、`SHint`、`SEmpty`。编译产物是 `_resolveComponent("SIcon")` 等，运行时 Vue 只 warn（`Failed to resolve component`），元素按未知自定义标签渲染：**返回箭头图标、签名/兼容性状态图标、`loadError`/`fromCache`/`diffRemoved`/`diffNone` 提示、以及「版本未找到」的 `SEmpty` 整块内容全部消失**（`SEmpty` 的 `:text` 落到未知元素上不会显示，只剩 slot 里的刷新按钮）。已用 `vue/no-undef-components` 复现 9 处 error。 | 在 import 里补回 `SEmpty, SHint, SIcon`；提交前跑一次 `npx eslint --rule '{"vue/no-undef-components":"error"}' src`。 | 中（漏在测试外，用户一眼能看到） | **是**（界面元素丢失） |
| R-V2 | `next/web/src/views/usage/MyUsageView.vue:33-36,49-50`；`UsageRecords.vue:53`；`MyLedgerTab.vue:55` | 隐藏行为变化 + 共享状态 | 刷新从「只重载当前 tab」（旧 `if (tab==='ledger') ledgerRef.reload() else records.reload()`）变成 `revision++`，而 `UsageRecords` 是 `v-show`（始终挂载）→ 在**余额 tab** 上点刷新会连带重载隐藏的请求列表（list + day summary + ip summary 共 3 个额外请求）。同时两个子组件 `v-model:loading` 绑到**同一个** `loading` ref：两个 `watch(loading, …)` 都往它写，隐藏的 `UsageRecords` 的 loading 变化会覆盖可见 tab 的状态，刷新按钮的转圈可能来自看不见的那个 tab。§5 的「行为变更」一节没有记录这条。 | 两个子组件各自持有 loading，页面用 `computed(() => tab==='ledger' ? ledgerLoading : recordsLoading)` 投到按钮；`revision` 只传给当前 tab（`v-show` 的那个改用 `v-if`，或给 `UsageRecords` 传 `:revision="tab==='requests' ? revision : undefined"`）。 | 中（多请求 + 状态错位） | **是** |
| R-V3 | `next/web/eslint.config.js:5,14` | 配置（lint 能力回退） | `import prettier from 'eslint-config-prettier'` 用的是 CJS 主入口（只导出 `{rules}`）。实测生效后 `no-unexpected-multiline` 从 `eslint:recommended` 的 **error** 变成 `0`（`curly` 也变 0）。这条不是排版规则，是抓 ASI 隐患（`a = b\n(c)`）的语义规则；为了 7,469 条排版告警把它一起关掉，属于连带损失。依赖本身没问题（`package.json`/`package-lock.json` 早已有 `eslint-config-prettier@10.1.8`）；CI 没有 lint 步骤，所以对 CI 无影响。 | 保留 `prettier` 配置对象，但在其后的项目 rules 块里显式加回 `'no-unexpected-multiline': 'error'`（`curly` 按团队偏好定）；或改用 `eslint-config-prettier/flat` 并同样显式回补。 | 低 | 否（仅 lint） |
| R-V4 | `next/web/src/views/plugins/ConsentView.vue`（新增 `ConsentView.spec.ts`） | 测试无效护 | 新增的 4 个用例在**组件根本没解析**的情况下全绿——R-V1 的 `Failed to resolve component` 只进了 stderr。计划里「先补 spec 再拆」的目的是给拆分母组件兜底，实际只测了审批请求体，没测「页面结构还在」。 | 在 spec 的 `global.config.warnHandler` 里把 `Failed to resolve component` 变成失败；或在 eslint 里开 `vue/no-undef-components`（R-V1 修法自带这项能力）；再加一条 `expect(w.getComponent(SEmpty).exists()).toBe(true)`。 | 低 | 否 |
| R-V5 | `next/web/src/views/accounts/useAccountSave.ts:40-78,211`；`AccountEditor.vue:502-546` | 抽象过度（依赖袋） | `AccountSaveDeps` 有 17 个顶层成员，其中 `gateway` 又是 17 字段的嵌套袋（`needed/automaticModels/…/adopt/rejected/showAuth`），本质是把组件内部的 ref 与回调原样抄成接口；`AccountEditor` 为装配它写了 45 行（502-546），比抽出去的调用点还长。返回的 5 个成员里 **`invalidSection`/`requestBody`/`submit`/`showSaveError` 全仓无人使用**（唯一消费者只解构 `save`），是新的死导出。 | 返回对象收敛为 `{ save }`（其余保持内部函数）；`gateway.*` 直接传 `props`/已有的 `ccgAuth`、`ccgState` 引用而不再拍平成 17 个字段，或让 `useAccountSave` 接 `{ basic, errors, credErrors, saving, activeSection, editorModels, account, accountType }` 七个真状态 + 一个 `ccg` 对象（该对象已在组件里有对应物）。 | 低（行为等价，只是接口面） | 否 |
| R-V6 | `next/web/src/views/accounts/AccountModelsCard.vue:12-55`；`AccountEditor.vue:668-692` | 抽象过度（prop 串联） | 卡片对外是 **17 props + 7 v-model + 16 emits ≈ 40 个通道**，自身不持状态，只是把父组件的模板片段搬过去——计划里担心的「30 字段 prop 大对象」以另一种形式出现了，且父组件要为它写 25 行绑定。这样的「组件」无法单独理解或测试（spec 只能通过两层查找 `getComponent(AccountModelsCard).getComponent(ModelTagSelect)` 断言）。 | 只保留 `v-model:models`/`v-model:mapping`（父组件保存请求体要用）与 4 个展示用 props（`automatic/editing/prefilled/draft`），其余把 `editorModels` 这个现成对象整体作为 prop 传入（它本来就是 ref+函数的普通对象，模板里 `editorModels.xxx` 直接调）；`fetch/clear/copy/format/…` 那一组 emit 随之消失。 | 中（要重接测试的查找路径） | 否 |
| R-V7 | `next/web/src/views/accounts/AccountModelsCard.vue:53-54,86,119`；`AccountEditor.vue:675,677` | 死接线（简洁） | `defineModel('modelsTextMode')` / `defineModel('mappingJsonMode')` 声明的双向绑定在卡片里从未被写（两个 `SSegmented` 用 `emit('models-text-mode'|'mapping-json-mode')` 自定义事件往外走），父组件却同时绑了 `v-model:…` 和 `@models-text-mode="setModelsTextMode"`。也就是说 7 个 v-model 里有 2 个的 `update:` 半边永远不触发——读者会以为状态是双向同步的。 | 这两个改成普通 prop（`:models-text-mode` / `:mapping-json-mode`，只读展示），或者反过来让卡片写 model、父组件不再额外挂自定义事件；二选一，别两套并存。 | 低 | 否 |
| R-V8 | `next/web/src/views/accounts/AccountsView.vue:508`；`useBatchTest.ts:48-50` | 封装泄漏 + 死代码 | 抽 `useBatchTest` 时把「清空选择」也包了 `clear()`，但模板仍然是 `@click="picked = new Set()"`，直接写组合式函数的 ref（靠 `<script setup>` 的 maybe-ref 赋值才成立），`clear()` 成了死代码。 | 模板改 `@click="clear"`（同时把它解构进模板作用域），删掉手写 `new Set()`。 | 低 | 否 |
| R-V9 | `next/web/src/views/accounts/useModelEdit.ts:164-171,174`；`useModelList.ts:97` | 解耦不彻底 + 死导出 | 拆成 `useModelList`/`useModelEdit` 后，`useModelEdit` 的返回里既有 `list`（整个内部对象，消费者可反向穿透），又把 `models`/`setModels` 等平铺重复了一遍（同一成员两条路径）；新加的 `export type ModelEdit` / `export type ModelList` 全仓零引用。`useModelsEditor` 仍是 34 成员的门面，拆完对外签名没变、可理解性也没变。 | 去掉 `list` 字段（内部用闭包即可），平铺成员只保留一份；删掉两个未使用的类型导出。若目标是可理解性，建议改为 `useModelsEditor` 返回 `{ list: useModelList(), edit: useModelEdit() }` 两组命名空间，而不是再摊平 34 个名字。 | 低 | 否 |
| R-V10 | `next/web/src/views/ccgateway/usePolicyLayerContext.ts:86,105-106`；三张卡模板（如 `EnvironmentLayerCard.vue:58-60,75-79`） | provide/inject 隐式耦合 | 卡片不再收 props，改从注入拿 15 个成员；因为是把 `ComputedRef` 装进普通对象，模板里必须写 `layers.has.value.environment`、`layers.toggles.value`、`layers.modeOptions.value`（同一文件里 `layers.modeOf(...)`、`layers.edit(...)` 又不需要 `.value`），一眼看不出哪些是响应式的。`editable()` 里 `locked(layer as LockableLayer)` 用断言绕过了 `'level'|'billing'` 不在 `LockableLayer` 里的事实，以后给 `locked` 加分支会静默错判。 | 用 `reactive({ view, toggles, has, … , modeOf, edit })` 暴露（模板统一不写 `.value`），或按计划另一条路：把 `view/toggles/disabled/modeOf/setMode/editable/modeLabel/layerOrigin/edit` 作为 props 传（三张卡只被 `RequestPolicySettings` 使用，没有复用压力）；`editable` 里的 `locked` 改成先按 `FeatureLayer` 判断再 cast。 | 中（模板可读性） | 否 |
| R-V11 | `next/web/src/views/ccgateway/policy/EnvironmentLayerCard.vue:47-53`；`PromptLayerCard.vue:13-27` | 重复 + 死分支 | 拆卡后 `injected()`/`setInjection()` 在环境卡与提示卡各写了一遍（build_injection 的合并逻辑重复）；环境卡的 `part` 类型仍保留 `'tools'` 分支，但 tools 已迁到提示卡，本卡永远只会传 `'attachments'`。 | 把 `injected(part,name)`/`setInjection(part,name,on)` 放进 `usePolicyLayerContext`（一处实现，两张卡共用），环境卡的 `part` 收窄为 `'attachments'`。 | 低 | 否 |
| R-V12 | `ConsentView.vue:90-94`；`consent/HostPermissionTable.vue:25-27`；`GrantsTab.vue:35-37`；`consent/ProvidesSummary.vue:25` | 复用不到位 | `hpLabel(id)`（`plugins.hp.${hpKey(id)}` + 回退 id）现在有 **3 份**逐字相同的实现；`colon` 也有 2 份（`ConsentView` 与 `ProvidesSummary`）。这次改动正好在搬这两个文件，却把重复又留了一份。 | 把 `hpLabel` 与 `colon` 放进 `consent/hostPermission.ts`（已是同目录的共享模块）导出，三处 import 使用。 | 低 | 否 |
| R-V13 | `next/web/src/i18n/locales/en/accounts.ts:37`、`zh/accounts.ts:37`（`accounts.editorUi.autoDisableHint`） | 文案失效 | 本 commit 删掉了 `AutoDisableSettingsCard`（`/settings/auto-disable` 在控制台的唯一入口），但账号编辑器的提示仍写「规则见 设置 → 网关 → 自动禁用」。实际上该规则现在位于 设置 → **调度策略**（`failurePolicy.title`）页签的「自动禁用」分组，网关页签里没有这一项——按提示找过去会找不到。 | 中英文改为「设置 → 调度策略 → 自动禁用」（`failurePolicy.title` / `failurePolicy.disableSection`），并在 V1 的提交说明里点明入口迁移（计划 §V1 要求过，写者只在文档里记了）。 | 低 | 否（文案） |
| R-V14 | `next/web/src/i18n/locales/{en,zh}/users.ts:27-32`、`apikeys.ts:29-30`、`platforms.ts:6` | 清理不彻底（死键） | 全量复查 `src`+`packages/ui`+`next/plugins/*/ui`（含模板字符串拼接、`te()/tm()`）后确认：被删的 85 个键**确实无人引用**（删得对）；但仍有 **9 个同样零引用的死键**没删：`users.{currentBalance,direction,credit,debit,amount,amountInvalid}`（用户余额弹窗已改用 `ledger.adjust.*`）、`apikeys.{userId,searchPlaceholder}`、`platforms.plugin`。§5「逐键 grep 后删除」的表述让人以为已穷尽。 | 同批删掉这 9 个键（zh/en 同步）；顺手把 `usage.filters.userId` 备注为「被 `LedgerView` 跨命名空间使用」，避免下次被误删。 | 低 | 否 |
| R-V15 | `next/web/src/composables/lookups.ts:9-22`；`AccountRuntimes.vue:155`；`groups/GroupAccountsEditor.vue:31-34` | API 形状 + 防御回退 | `fetchFirstPage(path, pageSize = 200, query = {})` 把不常改的 `pageSize` 放在常用 `query` 前面，导致唯一传 query 的调用点写成 `fetchFirstPage('/accounts', 200, { plugin_key: 'ccgateway' })`（把默认值又抄了一遍）；`fetchAllPages` 把旧循环里的 `(r.page.total ?? out.length)` 收窄成 `result.page.total`，丢了 total 缺失时的兜底（当前 host 一定填 total，所以只是防御性回退，不是现网 bug）。 | 改签名 `fetchFirstPage(path, query = {}, pageSize = 200)`（调用点只改 1 处）；`fetchAllPages` 恢复 `out.length >= (result.page.total ?? out.length)`。 | 低 | 否 |
| R-V16 | `next/web/src/views/plugins/consent/HostPermissionTable.vue:31` | 噪音（简洁） | `const rows = computed(() => props.rows)` 是纯 identity 包装，且与 prop 同名，遮蔽后读者得回头确认「rows 到底还是不是那个 prop」。 | 删掉该行，模板直接用 `props.rows`（或 `defineProps` 解构 `rows`）。 | 低 | 否 |
| R-V17 | `next/web/src/views/accounts/accountRowActions.ts:8-23,39-50` | 依赖注入不一致 | 抽行操作表时把 `t` 做成 `RowActionDeps.t` 注入（13 个依赖里唯一一个“环境能力”），同模块却直接 `import { lt } from '@/i18n'`；两套取词方式并存，调用方还得记得把 `t` 塞进去。另外 `runRowAction` 每次点击都重建 `handlers` 表。 | 与 `lt` 保持一致，直接在模块里用 `i18n.global.t`（原实现就在组件内用 `t`，行为等价），从 `RowActionDeps` 去掉 `t`；`handlers` 提到模块级常量（`openDetail` 等仍从 deps 取）。 | 低 | 否 |

> 说明：R-V2 与 R-V3 不属于「同一类」，前者是产品可见的行为变化，后者是开发期工具能力回退，分开记录。

## 2. 已核对为「无问题」的点（供后续复查省事）

- **行为等价性（逐项比对 diff 与旧文件）**：`useAccountSave` 的 `invalidSection` 检查顺序（ccFeature → 原生 invalid → name → ccgSaveBlocked → commitPending）、`requestBody` 字段顺序与 `proxy_url`/`proxy_id` 二选一、`showSaveError` 的三段分支（revision conflict / draft 拒绝 / 字段错误）与旧实现逐字一致；`useBatchTest` 的并发池、`AbortSignal.timeout(120000)`、toast 严重度（`failed ? warning : success`）不变；`RequestPolicySettings` 的 `edit()` 语义（`layered ? overrides : policy` + 深拷贝 + 只写 change 设置的字段）与 `setLevel` 的 `delete draft.relay_mode` 都保住了（`RequestPolicySettings.vue:48`）；`usePolicyLayerContext` 的 `view`/`showEffective`/`toggles` 计算式与旧文件相同。
- **`picked = new Set()` 仍能工作**：`<script setup>` 下 `picked` 是 `setup-maybe-ref`，非内联模板编译成 `$setup.picked = …`（`proxyRefs` setter 会写 `.value`），内联模板编译成 `picked.value = …`，两条路径都正确——问题只在封装（R-V8）。
- **i18n 动态键**：`t(\`...${x}\`)` 的所有前缀（`usage.search.*`、`usage.billing.status.*`、`plugins.hp*.*`、`ccgateway.levels.*`、`ccgateway.layers.*`、`accounts.*`、`prices.*`、`sticky.*`、`failurePolicy.*`、`settings.gateway.*`、`upgrades.*`、`observe.*`、`ledger.kinds.*`、`groups.*`）与被删的 85 键无交集；`next/plugins/*/ui/native/src` 用的是插件自己的 `host.t`/`messages.ts` 命名空间，未消费控制台的 locales；`nav.items.sticky`/`nav.items.apiKeysAll` 也不被客户端菜单（`stores/app.ts` 的 `CORE_MENU`）引用，服务端菜单走 `core.LocalizedText`（`server/internal/authz/menus.go`）而非 `labelKey`。
- **`locales.spec.ts` 收窄 dynamicPatterns**：被删的三个模式（`policy.search_`/`attachment_`/`attachmentAction_`）对应的键已一并删除，且代码里没有任何 `t('ccgateway.policy.search_' + x)` 形式的拼接，白名单确已无意义。
- **eslint 依赖**：`eslint-config-prettier` 在本 commit 之前就已在 `devDependencies`（`^10.1.8`）与 lockfile 中，没有新增依赖、没有 lockfile 变更；CI web job 不跑 lint，因此「0 error / 21 warning」只影响本地/`npm run check`。
- **`fetchAllPages`/`fetchFirstPage` 请求不变**：`api.list(path, page=1, page_size=200)` 与旧 `GroupPolicyList`/`GroupAccountsEditor` 的手写循环逐参一致（`paged` 早退条件也一致）；`fetchFirstPage` 一律只取第一页，符合计划「必须用 fetchFirstPage」的约束。
- **`proxy`/`environment` 装配**：`useAccountSave` 里 `deps.environment()` 与旧 `ccgSettings.locale/timezone` 同一个来源，`locationLoading` 早退、`saving` 的 finally 复位均保留。

## 3. 建议的最小修复顺序

1. R-V1（补 3 个组件导入）——一行修复，先上。
2. R-V4（把「未解析组件」变成测试失败）——防止下一次拆分再犯。
3. R-V2（MyUsageView 的 revision 定向 + loading 拆分）。
4. R-V3（回补 `no-unexpected-multiline`）、R-V13（文案）、R-V14（9 个死键）。
5. R-V5/R-V6/R-V7/R-V9/R-V10（接口收敛），可各自独立提交，行为应为零变化。

## 4. 处理结果（2026-10-24，web 写者）

三件最终校验（全部通过）：`npx vitest run` **71 文件 / 699 用例全绿**（原 694，新增 5 条：ConsentView +2、MyUsageView +3）；`npx vue-tsc --noEmit -p tsconfig.app.json` 无输出；`npx eslint src` **0 error / 21 warning**（与基线同样的 21 条 warning，没有新增）。

| ID | 处理 | 说明 |
| --- | --- | --- |
| R-V1 | 已修 | `ConsentView.vue` 的 `@sub2api/ui` 导入补回 `SEmpty, SHint, SIcon`。随后按要求跑 `npx eslint src --rule '{"vue/no-undef-components":"error"}'`，全仓**只有这一处**是漏导入（另外 5 条是 `RouterLink`/`RouterView`，由 vue-router 全局注册，不是 bug）。 |
| R-V1 护栏 | 已加 | `eslint.config.js` 打开 `vue/no-undef-components: ['error', { ignorePatterns: ['RouterLink','RouterView'] }]`，从此漏导入是 lint error 而不是运行时 warning。 |
| R-V4 | 已加 | `ConsentView.spec.ts` 的 `global.config.warnHandler` 把 `Failed to resolve component` 抛成失败（实测：临时去掉 `SIcon` 导入后 6 条用例全红），另加两条用例断言 `SIcon`/`SHint`/`SEmpty` 真的解析成组件（`findComponent` + `<svg>` + 空状态文案）。 |
| R-V2 | 已修 | `MyUsageView` 改为 `recordsRevision`/`ledgerRevision` + `recordsLoading`/`ledgerLoading` 各自独立，按钮的 loading 是 `computed(() => tab==='ledger' ? ledgerLoading : recordsLoading)`，`refresh()` 只递增当前 tab 的 revision。`UsageRecords` 保持 `v-show`（搜索条件仍跨 tab 保留）但不再收到隐藏时的刷新。新增 `MyUsageView.spec.ts` 3 条用例锁住：余额 tab 刷新不影响请求列表 revision、隐藏 tab 的 loading 不影响按钮、无 `balance:self:read` 时无 tab 栏。 |
| R-V3 | 已修 | `eslint.config.js` 在 prettier 之后显式加回 `'no-unexpected-multiline': 'error'`（实测 `a = b\n(c)` 报 error）；`curly` 未回补（团队无偏好，保持 prettier 的关闭）。 |
| R-V5 | 已修 | `AccountSaveDeps` 从 17 个顶层成员 + 17 字段 `gateway` 袋收敛：`gateway` → `ccg`（12 个真状态，去掉了 `needed`/`automaticModels`/`schedulingConfigurable`/`autoDisableConfigurable` 四个派生值，改由 `accountType` 就地算）；`environment()` → 直接传 `settings`（`ccgSettings`）；`models` 的 4 成员小接口删掉，直接传 `useModelEdit` 的返回（`ReturnType<typeof useModelEdit>`）。返回值从 5 个收敛为 `{ save }`（其余 4 个确认为死导出）。 |
| R-V6 | 已修 | `AccountModelsCard` 从 17 props + 7 v-model + 16 emits（≈40 通道）收敛为 9 props + 1 v-model（`autoModels`）+ 1 emit（`fetch`）：`editor`（`useModelEdit` 的整个返回）直接传，卡片自己调 `setModels`/`syncMappingText`/`clearPrefill` 等；`errors` 传整个表单错误表，卡片用新的 `modelsErrorText`/`mappingErrorText`（`editorErrors.ts`，AccountEditor 的 section 标记也用同一份）自己挑；`mappingCount`/`defaultMappingCount` 移进卡片。AccountEditor 侧的模板绑定从 42 行降到 12 行，`@update:models="modelsError = ''"`（`setModels` 里本就会清空）随之删除。 |
| R-V7 | 已修 | `modelsTextMode`/`mappingJsonMode` 不再用 `defineModel`：卡片只读 `editor.modelsTextMode` / `editor.mappingJsonMode`，切换直接调 `editor.setModelsTextMode` / `setMappingJsonMode`，父组件不再同时挂 `v-model:…` 与自定义事件（"update:" 半边不再存在）。 |
| R-V8 | 已修 | `AccountsView` 模板改为 `@click="clear"`，`clear` 已从 `useBatchTest` 解构进模板作用域，手写 `picked = new Set()` 删除。 |
| R-V9 | 已修 | `useModelEdit` 的返回去掉 `list`（内部闭包），`models`/`modelsText`/`setModels` 等平铺成员只保留一份；`export type ModelEdit` / `export type ModelList` 删除。另外 `useModelsEditor` 的 34 成员门面在 R-V6 后已无存在意义（唯一作用是把两份对象摊平），整个文件删除，`AccountEditor` 直接用 `useModelEdit`。 |
| R-V10 | 已修 | `usePolicyLayerContext` 的 `ctx` 改为 `reactive({...})`，`view`/`toggles`/`disabled`/`modeOptions`/`has` 都以值暴露，模板统一写 `layers.has.environment`、`layers.view`、`layers.modeOptions`（三张卡与 `RequestPolicySettings` 的 `.value` 全部去掉）。`editable` 里的断言改为 `mayBeLocked(layer)`（只 `environment`/`prompt` 可被 level 锁；`level`/`billing` 永不锁，`identity` 由 `RequestPolicySettings` 直接用 `has.identity`），不再有 `as LockableLayer`。 |
| R-V11 | 已修 | `injected(part, name)` / `setInjection(part, name, on)` 收进 `usePolicyLayerContext`（`PolicyLayers.injected/setInjection`），环境卡与提示卡共用；两张卡里的两份 `build_injection` 合并逻辑删除。环境卡只会传 `'attachments'`，`tools` 分支随之不再存在。 |
| R-V12 | 已修 | `consent/hostPermission.ts` 新增 `useConsentLabels()` 导出 `colon` 与 `hpLabel`；`ConsentView`、`HostPermissionTable`、`ProvidesSummary`、`detail/GrantsTab` 四处改为 import（3 份 `hpLabel`、2 份 `colon` 归零）。`GrantsTab` 里因此不再需要 `useOptionalT`。 |
| R-V13 | 已修 | `accounts.editorUi.autoDisableHint` 中英文均改为指向 **设置 → 调度策略 → 自动禁用**（`failurePolicy.title` / `failurePolicy.disableSection` 的实际文案；已核对 `SettingsView.vue` 的 `failure` 页签 label 就是 `failurePolicy.title`）。 |
| R-V14 | 已修 | 9 个死键删除（zh/en 同步）：`users.{currentBalance,direction,credit,debit,amount,amountInvalid}`、`apikeys.{userId,searchPlaceholder}`、`platforms.plugin`。`platforms.plugin` 的 grep 命中是 `pluginBy` 的前缀，确认无单独引用。`usage.filters.userId` 按建议加了「被 `LedgerView` 跨命名空间使用」的注释。 |
| R-V15 | 已修 | `fetchFirstPage`/`fetchAllPages` 签名改为 `(path, query = {}, pageSize = 200)`，唯一传 query 的 `AccountRuntimes.vue` 改为 `fetchFirstPage('/accounts', { plugin_key: 'ccgateway' })`；`fetchAllPages` 恢复 `out.length >= (result.page.total ?? out.length)` 兜底。 |
| R-V16 | 已修 | `HostPermissionTable` 的 `const rows = computed(() => props.rows)` 删除，模板改用 `props.rows`（`import { computed }` 随之删除）。 |
| R-V17 | 已修 | `accountRowActions.ts` 不再从 deps 注入 `t`，模块内直接用 `i18n.global.t`（与同文件的 `lt` 一致，行为等价）；`handlers` 提到模块级常量 `HANDLERS`，`runRowAction` 不再每次点击重建表。`RowActionDeps.t` 与 `AccountsView` 的 `t,` 一并删除。 |
| R-X2（web 侧） | 已处理 | `FILE_KINDS` **保留 `cli`**：引擎已把 `cli-*` 分支改回来（`request_log_viewer.go:428`，注为「0.1.86 及更早的历史日志」），所以 `logViewer.kind.cli` 分组不是死分组，zh/en 文案均保留；只在 `FILE_KINDS` 上补注释写明保留缘由与 `other` 的兜底语义。另核对了 `mock/ccgateway.ts` 的 `fileKind()` 仍把 `cli-*` 归 `cli`，与引擎一致。 |
| R-X3（web 侧） | 已处理 | `mock/ccgateway.ts` 的 `/system/ccgateway/features` 夹具从 native 时代目录（`F-SAFEGUARDS`/`F-ADD-DIR`/`F-THINKING-DISABLED-COMPAT`/`F-STREAM`、`catalog_version 2026-10-09.18`）改为与 `features.RequestCatalog("request_build")` 一致：`catalog_version 2026-10-20.request-attachments-v1`，只有 `F-REQUEST-MODES` + `F-BUILD-ATTACHMENTS`（标题、body_paths、mechanisms、reason 逐字取自 `request_modes.go`）。 |

跳过 / 降级的点：

- **`curly`（R-V3 提到的可选回补）**：未回补。审计只要求「按团队偏好定」，仓里没有偏好证据，保持 prettier 的关闭。
- **R-V10 的另一条路（改成 props）**：未采用。改为 `reactive` 暴露是审计给的第一条路，改动面小、`RequestPolicySettings` 与三张卡共用同一份上下文，没有重复传递压力。
- **`useModelEdit` 的 34 成员仍是一个对象**：R-V9 建议的 `{ list, edit }` 命名空间方案在 R-V6 之后不再需要——卡片直接持有整个 editor，成员名不再需要从组件层重复一遍。
