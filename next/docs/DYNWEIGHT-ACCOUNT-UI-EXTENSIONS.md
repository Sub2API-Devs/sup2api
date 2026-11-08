# 动态权重账号界面扩展点：设计与实施规格（2026-11-07）

本文是核心 0.1.256（UI SDK 3.6）（原定 0.1.255；该号 2026-11-08 先给了“请求体默认上限 128MB”热修发布）与 dynweight 0.5.0 的实施规格。目标：把 new-api 渠道页上的动态权重操作搬到 sup2api 账号页，方式是核心加两个通用扩展点（声明式账号操作、工具栏插槽；编辑页生命周期已于 2026-11-08 撤回，见 §4）、dynweight 接上；同时把权重 0 的调度语义改成"彻底不选"（用户 2026-11-07 决定）。

所有新开的扩展点都是通用的：核心代码不认识 dynweight。

## 1. 核心改动 A：调度中权重 0 改为跳过

文件：`server/internal/gateway/dispatch.go` `pick()`、`queueTarget`；`rank_tier_test.go`；`docs/CONTRACTS.md` §24.3 第 6、8 条、§74.5。

- 排序器（scheduler.rank 插件）给出 `weight == 0` 的候选一律跳过，不进 `pool`；删掉 `served` / `reserve` 两张表和分段排序，层内只剩 `weightedOrder`。
- `queueTarget` 的 `reserve` 参数去掉。
- 整层全 0 的均分由插件负责：dynweight `rank.go` 已对整层为 0 的层每个返回 1，不改。核心 fail-open 规则（所有候选都为 0 则整个结果作废）保留。
- 故障切换、忙、限流复用同一次排序结果，所以被拿掉的账号在重试时也不会被用到。
- 限流判定与权重 0 的先后（CONTRACTS §24.3 第 8 条）：`pick` 仍在改写前对全部带限额候选查一次 `Exhausted`；循环里权重 0 的跳过先于 `exhausted` 计入，所以被置 0 且限流的账号不把本次挑选标为 limited。候选池为空时观察不到错误码差异：有正权重账号因限流被跳过 → 429 `rate_limited`；可用候选全被置 0 时触发全零 fail open（排序结果作废、不改写权重），其中被限流的账号在重排后照常计入 `exhausted` → 同样 429（`TestRankZeroWeightSoleCandidateLimitedIsRateLimited`）。粘性绑定仍按改写前的 `exhausted` 判定。
- `rank_tier_test.go` 重写为反向断言：加权账号失败后跳到下一层（acc-1 → acc-3，不碰 acc-2）；忙/限流时同样；整层全 0 且插件均分时正常服务。另有 `TestRankZeroWeightSoleCandidateLimitedIsRateLimited`（唯一候选被置 0 且限流 → 全零 fail open 后 429，不打上游）、`TestRankZeroWeightNeverPickedAcrossRequests`（被置 0 的账号连续多次请求都不被选）、`TestRankTierAllZeroFallsToNextTier`（第 1 层全 0 → 落到第 2 层）。
- CONTRACTS §24.3 第 6 条与 §74.5 对应段落改写，注明 2026-11-07 用户决定（原"同层后备"语义作废）。

## 2. 核心改动 B：声明式账号操作 `ui.accountActions`

插件在 manifest 声明一条账号操作，核心渲染进每行操作菜单和批量栏，点击时按约定调插件自己的路由。

### manifest

```json
"ui": {
  "accountActions": [
    { "id": "reset", "label": {"en": "Reset dynamic weight", "zh": "重置动态权重"},
      "icon": "refresh", "permission": "dynweight:manage",
      "route": "POST /reset", "bulk": true,
      "confirm": {"en": "Reset the dynamic weight of {n} account(s)?", "zh": "重置 {n} 个账号的动态权重？"} }
  ]
}
```

| 字段 | 含义 | 校验（`sdk/manifest/check/ui.go` 新增 `uiAccountActions`） |
| --- | --- | --- |
| `id` | 插件内唯一 | slug，必填，不重复 |
| `label` | 菜单文案 | 必填 |
| `icon` | SIcon 名 | 可选 |
| `permission` | 插件本地权限 | 必须在 `userPermissions` 里 |
| `route` | `POST <path>` | 必须是 `routes` 里已声明的 `admin` 作用域 POST 路由，且该路由的 permission 与本条一致；路径不得含 `:参数` / `*通配` 段（核心只发 `{"account_ids":[…]}`，填不了路径参数），错误码 `parameterized_route` |
| `bulk` | 是否进批量栏 | 可选，默认 false |
| `confirm` | 二次确认文案，`{n}` 为账号数 | 可选，缺省不确认 |
| `danger` | 红色菜单项 | 可选 |
| `visibleFor` | 哪些行显示这条操作（2026-11-08 决定：可见性由插件声明） | 可选，`"editable"`（缺省：只在调用者有 `account:update` 的行显示）或 `"all"`（调用者能看到的每一行都显示）；两种取值下孤儿账号都不显示；`bulk: true` 时批量栏作用于同一批行（缺省：所选可编辑账号；`all`：所选全部非孤儿账号），计数同；非空且不是这两个值的错误码 `invalid`（field `ui.accountActions[i].visibleFor`）。`/ui/plugins` 原样下发，不补缺省 |

批大小不是可声明字段（2026-11-08 决定去掉原先的字段）：核心每批固定送 `manifest.MaxAccountBatch`（500）个。

Go 类型：`manifest.UI.AccountActions []AccountAction`（结构体名 `AccountAction`，json `accountActions`；字段 `VisibleFor string`，json `visibleFor`，omitempty）。常量 `manifest.MaxAccountBatch = 500` 是每批的固定大小，与前端 `@sub2api/host` 的 `MAX_ACCOUNT_BATCH` 是同一个数，`ui-contract.spec.ts` 锁定。不需要新的 hostPermission（`routes.admin` 已覆盖），没有 `ui.native` 也能用。

### 调用约定

- `POST /api/v1/p/<key><path>`，body 一律 `{"account_ids": [7, 8]}`（2026-11-08 决定：单行也是一个元素的数组，没有 `{"account_id": 7}` 形状）。
- 核心每批固定送 `manifest.MaxAccountBatch`（500，前端 `MAX_ACCOUNT_BATCH`）个，超过分批顺序发送；每个请求带 95 秒超时（`AbortSignal.timeout(95000)`，与账号类型插件动作 `runPluginAction` 一致）。
- 响应任意 JSON，核心只看状态码。成功后核心 `list.reload()`；失败按现有 `bulkToast` 口径提示。

### 后端

`server/internal/plugin/api/ui.go`：`UIPlugin` 加 `AccountActions []manifest.AccountAction \`json:"account_actions"\``，按 permission 过滤（与 slots 同一处理），字段原样下发、不补缺省；"菜单、插槽、页面全空则不返回"的判断加上它。`api_test.go` 加用例。

### 前端（低侵入）

- `web/src/api/types.ts`：`UIPlugin.account_actions?: PluginAccountAction[]`，`PluginAccountAction { id, label: LText, icon?, permission, route, bulk?, confirm?: LText, danger?, visibleFor?: 'editable' | 'all' }`（json 键与 Go 一致，camelCase）。
- `web/src/stores/plugins.ts`：`accountActions` computed，把各插件条目扁平成 `{ pluginKey, ...decl }`。
- `web/src/views/accounts/accountRowActions.ts`：deps 加 `declaredActions: PluginAccountActionEntry[]` 和 `runPluginAccountAction(a, entry)`；在 `delete` 之前插入 key `declared:<plugin>:<id>` 的条目（既有账号类型插件动作的 `plugin:` 前缀与 `runPluginAction` 不动），`hidden: a.orphaned || (entry.visibleFor !== 'all' && !canUpdate(a))`，`danger` 透传；`runRowAction` 识别该前缀。
- 新建 `web/src/views/accounts/usePluginAccountActions.ts`：`run(entry, accounts: Account[])`：`parseRouteRef(entry.route, 'POST')` 解析路由（`web/src/components/plugin/declarative.ts`，失败不发请求；path 为 `/p/<pluginKey><path>`）→ confirm（有 `confirm` 时，`{n}` 替换）→ 按 `MAX_ACCOUNT_BATCH`（500）固定分批 POST `{account_ids}`（`AbortSignal.timeout(95000)`）→ toast（成功 `accounts.bulk.done` 风格，失败 `bulkToast` 风格）→ `reload()`。行和批量共用。
- `AccountsView.vue`：composable 实例叫 `declaredActions`；`moreBulkActions` 追加 `bulk: true` 的条目，计数用 `picked.edit`；`onBulkMore` 分发。
- 权限与可见性：服务端 `/ui/plugins` 按插件权限过滤，插件路由自己再校验；前端按 `visibleFor` 决定显隐（缺省 `editable` 要求对该行有 `canUpdate`，`all` 不要求），孤儿账号一律隐藏。

## 3. 核心改动 C：工具栏插槽 `account.list.toolbar` 与按 id 筛选

### 插槽

`account.list.toolbar`，挂在 `AccountsView.vue` 的 `SPageHeader #filters-primary`（搜索框之后；`#title-extra` 会让页面说明留在页内，不用）。props：

```ts
{ ids: number[] | null,                        // 本插件自己设的那组 id，null = 没设过
  setIds(ids: number[] | null, label: string) } // 设置或清除自己那组；label 显示在本插件的筛选芯片上
```

多个插件可以同时设筛选（2026-11-08 决定）：核心按插件分别记一组，列表取交集。`PluginSlot.vue` 的 `props` 允许传函数 `(entry: SlotEntry) => Record<string, any>`，渲染时按类型取值（向后兼容），`AccountsView.vue` 用它给每个插件传自己那组 `ids` 和绑定了自己 key 的 `setIds`。

### 核心前端

- `idsFilters = ref<Record<string, { ids: number[]; label: string }>>({})`，键 = 插件 key，是 id 筛选的单一真相；每个插件的 `setIds(ids, label)` 只改自己的条目：`null` / 空数组删条目，否则原样写入（不截断）。
- `list.filters.ids`（逗号分隔字符串，与其他筛选同一张表）由 watch 派生：所有条目 ids 的交集，超过 `MAX_ACCOUNT_BATCH`（500）截到前 500 个；没有条目 → `''`；有条目但交集为空 → 哨兵 `'0'`（0 不是账号 id，后端 ParseInt 通过、匹配不到行，列表为空）。
- 筛选行每个条目一个 `SChip closable`（文案各自的 `label`），关闭只删自己的条目；交集被截断时只有第一枚芯片的文案用 `accounts.listUi.idsTruncated`（`{label, n}` → 「label（前 500 个）」）；`setIds` 收到的 id 去重、只留正整数后才记入；`resetFilters()` /「清除筛选」清空整个 record；`activeFilterCount` 自然覆盖；筛选变化已会清空勾选。不存 localStorage。
- 测试：两个 mock 插件分别 `setIds([12,21],'A')`、`setIds([21,7],'B')` → `list.filters.ids` 为 `'21'` 且两个芯片；关 A → `'21,7'` 只剩 B；交集空 → `'0'`；600 个截到 500 带截断文案；A 的组件 `props.ids` 只看到 `[12,21]`。
- `loadAllAccounts()`（跨页全选）本来就带 `list.filters`，自然包含 `ids`。

### 核心后端

`GET /accounts` 新增 `ids=1,2,3`（`server/internal/account/handlers.go` `list`）：`a.id = ANY(?)`，最多 500 个（直接用 `manifest.MaxAccountBatch`，不另起别名），非整数或超量返回 400（`core.ErrInvalidArgument`）。与其它筛选 AND。加测试。

### mock

`web/mock/accounts.ts` 的列表支持 `ids`。

## 4. 核心改动 D：`account.form.widgets` 的校验/保存生命周期（已撤回）

2026-11-08 用户决定不做：账号编辑页不带动态权重功能，避免插件代码进入核心的保存流程（核心保存要等插件的 validate/save）。`account.form.widgets` 插槽保持 UI 3.5 的行为（只展示，props 仍为 `account`、`accountType`、`credentials`），账号级的插件配置在插件自己的页面改。原先实现的 PluginSlot 聚合、`useAccountSave` 的 widgets 依赖、`accounts.pluginWidgetSaveFailed` 文案已随之删除。

## 5. 核心改动 E：校验、下发、mock、文档、版本

| 位置 | 改动 |
| --- | --- |
| `sdk/manifest/manifest.go` | `UI.AccountActions`；`Slot` 注释加 `account.list.toolbar` |
| `sdk/manifest/check/ui.go` | `uiSlots` 白名单加 `account.list.toolbar`；新增 `uiAccountActions`；核心下限表：UI 3.4 → 0.1.229，UI 3.6 → 0.1.256（0.1.256 是最后一个带 UI 3.5 的核心）；用 `ui.accountActions` 或 `account.list.toolbar` 的插件也按 3.6 要求下限；check 测试 |
| `server/internal/plugin/api/ui.go` | `account_actions` |
| `server/internal/account/handlers.go` | `ids` |
| `web/src/api/types.ts`、`stores/plugins.ts`、`components/plugin/PluginSlot.vue`、`views/accounts/*` | §2–§4 |
| `web/packages/host/src/index.ts` | `HOST_UI_VERSION = '3.6.0'`；`PluginHost` 不加方法 |
| `web/packages/ui/package.json`、`web/packages/host/package.json` | 3.6.0 |
| `web/mock/pluginui.ts` | dynweight 条目加 `account_actions` 与新插槽（由插件 UI 任务改 `web/mock/dynweight.ts` 中的 `dynweightUIPlugin`） |
| `docs/CONTRACTS.md` | §23.3 末尾加"UI 3.6 账号界面扩展点（2026-11-07）"段（accountActions、toolbar 插槽、`HOST_UI_VERSION` 3.6.0、核心下限 0.1.256；form.widgets 不参与保存）；`/ui/plugins` 两处表格（约第 210 行、第 703 行）加 `account_actions`；§24.3 第 6 条；§74.5 界面段 |

## 6. dynweight 0.5.0

路径 `plugins/dynweight/`。

### manifest

`version 0.5.0`，`hostUICompat ^3.6`，`hostCompat >=0.1.256 <0.2.0`；`ui.accountActions` 加 `reset`（§2 的例子；不声明 `visibleFor`，按缺省只在可编辑行显示）；`ui.slots` 加 `account.list.toolbar → DynweightDegradedBadge`、`account.detail.tabs → DynweightAccountTab`（权限 `dynweight:read`）；不挂 `account.form.widgets`（见 §4）；`routes` 加 `GET /degraded`。

### 路由（`internal/dynweight/routes.go`）

| 路由 | 权限 | 内容 |
| --- | --- | --- |
| `GET /degraded` | dynweight:read | `{count, account_ids}`：本节点快照里有键低于基准的账号，`account_ids` 最多 500 个（`manifest.MaxAccountBatch`），`count` 为实际数 |
| `GET /weights`（扩） | 不变 | 每个账号加 `keys: [{group_id, model, eff, base}]`，按 eff 升序最多 10 条 |

`POST /reset` 已支持 `account_id` / `account_ids`，语义不改；核心只发 `{account_ids:[…]}`（单行一个元素），一元素数组与单值等价（`filter.accounts()` 合并去重）。上限直接用 `manifest.MaxAccountBatch`（不另起 `maxResetAccounts` / `maxListedAccounts` 别名）。测试加进现有 `plugin_test.go` 的真实 PostgreSQL 夹具（含一元素数组与单值结果相同）。

### 原生 UI（`ui/native/src/`）

| 组件 | 插槽 | 内容 |
| --- | --- | --- |
| `DegradedBadge.vue` | account.list.toolbar | `GET /degraded`，`count > 0` 时显示 `SChip pressed` "动态权重降权 N"；点击 `setIds(ids, label)`，再点清除；按下态 = `props.ids` 等于自己设的那组（核心按插件分别保存，别的插件同时设筛选也不影响，见 §3）；`useAutoRefresh` 30 秒 |
| `AccountWeight.vue`（改） | account.list.weight | 徽标包在 `STooltip #content` 里，列出 `keys` 的分组/模型/有效·基准；徽标本身是 `SLink to` 插件页 `/p/dynweight/dashboard?tab=status&account=<id>` |
| `AccountTab.vue` | account.detail.tabs | 本账号各键：复用从 `StatusTab.vue` 抽出的 `KeyStatusTable.vue`（列、展开 `KeyDetail`、单键重置），加"重置本账号全部"和"查看事件"跳转 |
| `DynweightDashboard.vue`（改） | 菜单页 | 读 `?account=` 预填状态/事件标签的账号筛选 |

账号覆盖只在 `ConfigTab.vue` 的账号覆盖表里改（§4）。`messages.ts` 加 zh/en 文案；`web/mock/dynweight.ts` 加新路由与 manifest 条目；CONTRACTS §74.5 "界面"段改写。

## 7. 判据

账号页扩展点（§2、§3，以及今后再开的口子）按三条判据验收（2026-11-08 决定；CONTRACTS §23.3 UI 3.6 段同）：

1. **核心不被插件阻断**：核心的保存、删除、测试、列表加载等流程里没有同步等待插件返回值的点，插件请求失败只影响插件自己那块界面（§4 撤回 `account.form.widgets` 的保存生命周期就是为此）。
2. **插件不写核心数据**：插件只读写自己的接口，需要核心数据时由核心以 props 传入（`account.list.toolbar` 的 `ids`、`account.detail.tabs` 的账号），或按公开接口只读（`GET /accounts?q=`、`GET /accounts/:id`）。
3. **插件输入进核心必有上限与钳制**：插件交给核心的数据由核心校验、截断或拒绝——各插件 `setIds` 的 id 列表取交集后截到 `MAX_ACCOUNT_BATCH`，`ui.accountActions` 声明里的文案、路由与 `visibleFor` 由 `sdk/manifest/check` 校验（`parameterized_route`、`invalid` 等），每批大小由核心固定为 `MAX_ACCOUNT_BATCH`、不由插件声明。

## 8. 代码规范

- 抽象：扩展点不认识 dynweight；复用：行和批量共用 `usePluginAccountActions`，`KeyStatusTable` 两处复用；解耦：核心按 id 筛选不调插件过滤，插件代码不进核心保存流程；简洁：不加 hostPermission、不加 refresh 字段；低嵌套：`pick()` 删两层分支；低侵入：老插件一字不改也能跑。
- 不新增只有一个调用者的模块级小函数；前端文案全部走 i18n；Go 测试按仓库现有风格。
- 每个任务完成后自查：`go build ./... && go vet ./...`（所涉模块）、`npm run typecheck && npm run lint && npm test`（web）、插件 UI `npm run build`。

## 9. 版本与发布

核心 0.1.256 带 UI 3.6；dynweight 0.5.0 的 `hostCompat` 下限指向它。先核心后插件。没有核心迁移，插件没有新表。
