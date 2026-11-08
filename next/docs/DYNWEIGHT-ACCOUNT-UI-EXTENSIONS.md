# 动态权重账号界面扩展点：设计与实施规格（2026-11-07）

本文是核心 0.1.256（UI SDK 3.6）（原定 0.1.255；该号 2026-11-08 先给了“请求体默认上限 128MB”热修发布）与 dynweight 0.5.0 的实施规格。目标：把 new-api 渠道页上的动态权重操作搬到 sup2api 账号页，方式是核心加两个通用扩展点（声明式账号操作、工具栏插槽；编辑页生命周期已于 2026-11-08 撤回，见 §4）、dynweight 接上；同时把权重 0 的调度语义改成"彻底不选"（用户 2026-11-07 决定）。

所有新开的扩展点都是通用的：核心代码不认识 dynweight。

## 1. 核心改动 A：调度中权重 0 改为跳过

文件：`server/internal/gateway/dispatch.go` `pick()`、`queueTarget`；`rank_tier_test.go`；`docs/CONTRACTS.md` §24.3 第 6、8 条、§74.5。

- 排序器（scheduler.rank 插件）给出 `weight == 0` 的候选一律跳过，不进 `pool`；删掉 `served` / `reserve` 两张表和分段排序，层内只剩 `weightedOrder`。
- `queueTarget` 的 `reserve` 参数去掉。
- 整层全 0 的均分由插件负责：dynweight `rank.go` 已对整层为 0 的层每个返回 1，不改。核心 fail-open 规则（所有候选都为 0 则整个结果作废）保留。
- 故障切换、忙、限流复用同一次排序结果，所以被拿掉的账号在重试时也不会被用到。
- 限流判定与权重 0 的先后（CONTRACTS §24.3 第 8 条）：`pick` 仍在改写前对全部带限额候选查一次 `Exhausted`；循环里权重 0 的跳过先于 `exhausted` 计入，所以被置 0 且限流的账号不把本次挑选标为 limited。候选池为空时按 `busy` 区分：有正权重账号因限流被跳过 → 429 `rate_limited`；可用候选全被置 0 → 503 `no_available_account`（仅本请求尚无任何失败时；已有失败沿用收尾规则）。粘性绑定仍按改写前的 `exhausted` 判定。
- `rank_tier_test.go` 重写为反向断言：加权账号失败后跳到下一层（acc-1 → acc-3，不碰 acc-2）；忙/限流时同样；整层全 0 且插件均分时正常服务。
- CONTRACTS §24.3 第 6 条与 §74.5 对应段落改写，注明 2026-11-07 用户决定（原"同层后备"语义作废）。

## 2. 核心改动 B：声明式账号操作 `ui.accountActions`

插件在 manifest 声明一条账号操作，核心渲染进每行操作菜单和批量栏，点击时按约定调插件自己的路由。

### manifest

```json
"ui": {
  "accountActions": [
    { "id": "reset", "label": {"en": "Reset dynamic weight", "zh": "重置动态权重"},
      "icon": "refresh", "permission": "dynweight:manage",
      "route": "POST /reset", "bulk": true, "max_batch": 500,
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
| `max_batch` | 核心每批最多送多少个 id | 可选，整数 1..500（`manifest.MaxAccountBatch`），缺省 500，显式 0 等同缺省；负数或超上限错误码 `out_of_range`。`/ui/plugins` 下发时补缺省 |

Go 类型：`manifest.UI.AccountActions []AccountAction`（结构体名 `AccountAction`，json `accountActions`；字段 `MaxBatch int`，json `max_batch`，omitempty）。常量 `manifest.MaxAccountBatch = 500` 与前端 `@sub2api/host` 的 `MAX_ACCOUNT_BATCH` 是同一个数，`ui-contract.spec.ts` 锁定。不需要新的 hostPermission（`routes.admin` 已覆盖），没有 `ui.native` 也能用。

### 调用约定

- `POST /api/v1/p/<key><path>`，body 一律 `{"account_ids": [7, 8]}`（2026-11-08 决定：单行也是一个元素的数组，没有 `{"account_id": 7}` 形状）。
- 核心一次最多送 `max_batch` 个（声明值 1..500，缺省 500；服务端下发时补缺省，前端再 `|| MAX_ACCOUNT_BATCH` 并钳到 1..500），超过分批顺序发送。
- 响应任意 JSON，核心只看状态码。成功后核心 `list.reload()`；失败按现有 `bulkToast` 口径提示。

### 后端

`server/internal/plugin/api/ui.go`：`UIPlugin` 加 `AccountActions []manifest.AccountAction \`json:"account_actions"\``，按 permission 过滤（与 slots 同一处理）；"菜单、插槽、页面全空则不返回"的判断加上它。`api_test.go` 加用例。

### 前端（低侵入）

- `web/src/api/types.ts`：`UIPlugin.account_actions?: PluginAccountAction[]`，`PluginAccountAction { id, label: LText, icon?, permission?, route, bulk?, confirm?: LText, danger? }`。
- `web/src/stores/plugins.ts`：`accountActions` computed，把各插件条目扁平成 `{ pluginKey, ...decl }`。
- `web/src/views/accounts/accountRowActions.ts`：deps 加 `pluginActions: PluginAccountActionEntry[]` 和 `runPluginAccountAction(a, entry)`；在 `delete` 之前插入 key `pa:<plugin>:<id>` 的条目，`hidden: !canUpdate(a) || a.orphaned`，`danger` 透传；`runRowAction` 识别该前缀。
- 新建 `web/src/views/accounts/usePluginAccountActions.ts`：`run(entry, accounts: Account[])`：confirm（有 `confirm` 时，`{n}` 替换）→ 按 `max_batch` 分批（≤ `MAX_ACCOUNT_BATCH`）POST `{account_ids}` → toast（成功 `accounts.bulk.done` 风格，失败 `bulkToast` 风格）→ `reload()`。行和批量共用。
- `AccountsView.vue`：`moreBulkActions` 追加 `bulk: true` 的条目，计数用 `picked.edit`；`onBulkMore` 分发。
- 权限：服务端 `/ui/plugins` 按插件权限过滤，插件路由自己再校验；前端另要求对该行有 `canUpdate`。

## 3. 核心改动 C：工具栏插槽 `account.list.toolbar` 与按 id 筛选

### 插槽

`account.list.toolbar`，挂在 `AccountsView.vue` 的 `SPageHeader #filters-primary`（搜索框之后；`#title-extra` 会让页面说明留在页内，不用）。props：

```ts
{ ids: number[] | null,                        // 当前的 id 筛选，null = 没有
  setIds(ids: number[] | null, label: string) } // 设置或清除；label 显示在筛选芯片上
```

### 核心前端

- `list.filters.ids`（逗号分隔字符串，与其他筛选同一张表）和 `idsLabel` ref。`setIds` 把 id 列表截到前 `MAX_ACCOUNT_BATCH`（500）个，截过时芯片文案用 `accounts.listUi.idsTruncated`（`{label, n}` → 「label（前 500 个）」）；`null` 与空数组都是清除。
- 筛选行多一个 `SChip closable`（显示 `idsLabel`），关闭即清除；`resetFilters()`、`activeFilterCount` 自然覆盖；筛选变化已会清空勾选。不存 localStorage。
- `loadAllAccounts()`（跨页全选）本来就带 `list.filters`，自然包含 `ids`。

### 核心后端

`GET /accounts` 新增 `ids=1,2,3`（`server/internal/account/handlers.go` `list`）：`a.id = ANY(?)`，最多 500 个（`maxListIDs = manifest.MaxAccountBatch`），非整数或超量返回 400（`core.ErrInvalidArgument`）。与其它筛选 AND。加测试。

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

`version 0.5.0`，`hostUICompat ^3.6`，`hostCompat >=0.1.256 <0.2.0`；`ui.accountActions` 加 `reset`（§2 的例子，`max_batch: 500` = `manifest.MaxAccountBatch`）；`ui.slots` 加 `account.list.toolbar → DynweightDegradedBadge`、`account.detail.tabs → DynweightAccountTab`（权限 `dynweight:read`）；不挂 `account.form.widgets`（见 §4）；`routes` 加 `GET /degraded`。

### 路由（`internal/dynweight/routes.go`）

| 路由 | 权限 | 内容 |
| --- | --- | --- |
| `GET /degraded` | dynweight:read | `{count, account_ids}`：本节点快照里有键低于基准的账号，`account_ids` 最多 500 个（`manifest.MaxAccountBatch`），`count` 为实际数 |
| `GET /weights`（扩） | 不变 | 每个账号加 `keys: [{group_id, model, eff, base}]`，按 eff 升序最多 10 条 |

`POST /reset` 已支持 `account_id` / `account_ids`，语义不改；核心只发 `{account_ids:[…]}`（单行一个元素），一元素数组与单值等价（`filter.accounts()` 合并去重）。`maxResetAccounts`、`maxListedAccounts` 改为引用 `manifest.MaxAccountBatch`。测试加进现有 `plugin_test.go` 的真实 PostgreSQL 夹具（含一元素数组与单值结果相同）。

### 原生 UI（`ui/native/src/`）

| 组件 | 插槽 | 内容 |
| --- | --- | --- |
| `DegradedBadge.vue` | account.list.toolbar | `GET /degraded`，`count > 0` 时显示 `SChip pressed` "动态权重降权 N"；点击 `setIds(ids, label)`，再点清除；`useAutoRefresh` 30 秒 |
| `AccountWeight.vue`（改） | account.list.weight | 徽标包在 `STooltip #content` 里，列出 `keys` 的分组/模型/有效·基准；徽标本身是 `SLink to` 插件页 `/p/dynweight/dashboard?tab=status&account=<id>` |
| `AccountTab.vue` | account.detail.tabs | 本账号各键：复用从 `StatusTab.vue` 抽出的 `KeyStatusTable.vue`（列、展开 `KeyDetail`、单键重置），加"重置本账号全部"和"查看事件"跳转 |
| `DynweightDashboard.vue`（改） | 菜单页 | 读 `?account=` 预填状态/事件标签的账号筛选 |

账号覆盖只在 `ConfigTab.vue` 的账号覆盖表里改（§4）。`messages.ts` 加 zh/en 文案；`web/mock/dynweight.ts` 加新路由与 manifest 条目；CONTRACTS §74.5 "界面"段改写。

## 7. 判据

账号页扩展点（§2、§3，以及今后再开的口子）按三条判据验收（2026-11-08 决定；CONTRACTS §23.3 UI 3.6 段同）：

1. **核心不被插件阻断**：核心的保存、删除、测试、列表加载等流程里没有同步等待插件返回值的点，插件请求失败只影响插件自己那块界面（§4 撤回 `account.form.widgets` 的保存生命周期就是为此）。
2. **插件不写核心数据**：插件只读写自己的接口，需要核心数据时由核心以 props 传入（`account.list.toolbar` 的 `ids`、`account.detail.tabs` 的账号），或按公开接口只读（`GET /accounts?q=`、`GET /accounts/:id`）。
3. **插件输入进核心必有上限与钳制**：插件交给核心的数据由核心校验、截断或拒绝——`setIds` 的 id 列表截到 `MAX_ACCOUNT_BATCH`，`ui.accountActions` 声明里的文案与路由由 `sdk/manifest/check` 校验（`parameterized_route`、`out_of_range` 等），`max_batch` 由服务端补缺省、前端钳到 1..500。

## 8. 代码规范

- 抽象：扩展点不认识 dynweight；复用：行和批量共用 `usePluginAccountActions`，`KeyStatusTable` 两处复用；解耦：核心按 id 筛选不调插件过滤，插件代码不进核心保存流程；简洁：不加 hostPermission、不加 refresh 字段；低嵌套：`pick()` 删两层分支；低侵入：老插件一字不改也能跑。
- 不新增只有一个调用者的模块级小函数；前端文案全部走 i18n；Go 测试按仓库现有风格。
- 每个任务完成后自查：`go build ./... && go vet ./...`（所涉模块）、`npm run typecheck && npm run lint && npm test`（web）、插件 UI `npm run build`。

## 9. 版本与发布

核心 0.1.256 带 UI 3.6；dynweight 0.5.0 的 `hostCompat` 下限指向它。先核心后插件。没有核心迁移，插件没有新表。
