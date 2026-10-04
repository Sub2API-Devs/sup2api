# 前端 UI 视觉与交互审计（next/web）

- 日期：2026-10-04
- 范围：`next/web`（`src/views`、`src/layouts`、`src/components`、`packages/ui`、`packages/host`、`src/style.css`、`tailwind.config.js`）
- 对照：sub2api 原版 `frontend/`（Vue3 + Tailwind，视觉基调）；new-api `web/default`（React + shadcn/Base UI，交互参考）
- 方式：只读通读源码，逐页对比。`npm run typecheck` 通过；`vite build --outDir <临时目录>` 构建正常（没写 `server/web/dist`）；脚本核对 zh/en 文案键：各 1629 个，完全对齐，代码里写死的 `t('…')` 键没有缺失。
- 约定：行号指当前工作区文件；`ui/` 指 `next/web/packages/ui/src/`，`views/` 指 `next/web/src/views/`。

---

## 1. 总评

1. **底子是 sub2api 的，但被削薄了。** `tailwind.config.js` 的配色、字体、阴影和 `style.css` 的 `.btn/.input/.card/.badge/.modal` 几乎照搬原版。但原版里撑起观感的那一层都没带过来：表格页骨架 `TablePageLayout`、1152 行的 `DataTable`（排序、勾选、固定列、骨架屏、移动端卡片）、可搜索的 `Select`、`DateRangePicker`、`EmptyState`（标题 + 描述 + 操作）、`Skeleton`、`HelpTooltip`、`AutoRefreshButton`、`NavigationProgress`、玻璃顶栏、可折叠的侧栏分组、Logo 光晕。"简陋"的感觉主要来自这一层缺失，而不是配色。
2. **组件库 `@sub2api/ui` 方向对，但只有"原子"，缺"模式"。** 现在 31 个组件基本是样式类外面包一层；表格页、筛选栏、详情抽屉、编辑页保存栏、提示框、状态徽标这些"页面级模式"没有，每页各写一套。结果是 5 种筛选栏写法、3 种刷新按钮、4 种行操作布局、17 处手写提示框、10 多个各自的"状态 → 颜色"映射函数。
3. **反馈链条不完整。** 确认框点完立刻关闭，后面的异步过程没有反馈；自动刷新会让整表变灰闪烁，失败时每 10 秒弹一次错误；加载失败大多显示成"暂无数据"；核心升级、回滚、停用节点、停用分组、扣余额都**没有二次确认**。
4. **信息密度不均。** 账号页信息塞得很满（一行最多 6 种元素），仪表盘却只有 2–4 张数字卡和一张 7 天图。原版管理员仪表盘有模型分布、Token 趋势、用户排行，用户仪表盘有快捷操作和最近使用；new-api 还有分区仪表盘。
5. **i18n 和类型都干净**（键完全对齐、typecheck 通过），**组件 API 有契约**（CONTRACTS §23.3），这是重构的好前提：可以放心改样式类（§23 已声明类名属于内部实现），组件 API 扩展时同步更新 §23.3 即可。
6. 结论：不用推倒重来。按"**设计 token → 基础组件 v2 → 页面模式（ListPage / DetailDrawer / EditorPage / SettingsPage）→ 逐页迁移**"的顺序做，前两批就能明显改善整体观感和一致性。

---

## 2. 对照结论速览

| 维度 | sub2api 原版 | new-api | next/web 现状 | 结论 |
|---|---|---|---|---|
| 配色 / 字体 / 阴影 | teal 主色 + slate 暗色，glow/glass 阴影 | 中性色 + CSS 变量主题 | 主色相同；去掉了 `glow`、`glass-sm`、`mesh-gradient`、`accent` | 保留基调，补回品牌层 |
| 按钮与输入框高度 | `.btn` 和 `.input` 都是 `py-2.5`，同高 | 按钮和输入框高度一致 | `.btn` `py-2`（`style.css:42`），`.input` `py-2.5`（`style.css:80`），**同一行高低不齐** | 退步，P1 |
| 表格 | DataTable：排序、勾选、固定列、骨架屏、移动端卡片、列设置 | TanStack：分面筛选、列显隐、批量操作条、移动卡片、固定列 | `STable` 只有 columns/rows/expand/empty，加载时整表 `opacity-60`（`ui/STable.vue:78`） | 大幅退步，P1 |
| 表格页骨架 | `TablePageLayout`：表格撑满视口、表头固定、分页固定在底部 | `DataTablePage` | 没有；整页滚动，表头不固定 | 退步 |
| 下拉选择 | 自研 `Select`：可搜索、可新建、自定义渲染 | Combobox / MultiSelect | 原生 `<select>`（`ui/SSelect.vue:39`），不能搜索；多选分组是拿原生 select 拼出来的（`components/GroupPicker.vue:62`） | 退步，P1 |
| 时间范围 | `DateRangePicker` + 快捷项 | DatePicker / DateTimePicker | 一个下拉加两个 `datetime-local`（`ui/STimeRange.vue:48-64`） | 可用但粗糙 |
| 空状态 | 图标 + 标题 + 描述 + 操作 | `EmptyState`（含操作）+ `ErrorState` | `SEmpty` 只有图标和一行字；表格空态只是"暂无数据"文字 | 缺 CTA，也不区分错误 |
| Toast | 左侧色条 + 图标，从右滑入 | sonner：图标、操作按钮、堆叠 | 纯文字、无图标、宽 `w-80`（`ui/SToastHost.vue:14`） | 退步 |
| 确认 | `ConfirmDialog` | `ConfirmDialog(isLoading)` + `RiskAcknowledgementDialog`（勾选或输入文字确认） | Promise 式 `confirm()`，点完立刻关；只有卸载插件单独做了输入确认 | 需要 v2 |
| 详情 / 编辑 | 大量弹窗 | Drawer（`api-keys-mutate-drawer`） | 弹窗套弹窗（账号编辑 → 测试） | 引入 Drawer |
| 导航 | 可折叠分组、Logo、站点名可配置、新手引导 | 分组侧栏 + 命令面板（Cmd+K） | 平铺分区（"系统"区 9 项），Logo 是一个 "S" 字母（`layouts/AppSidebar.vue:41`） | 退步 |
| 顶栏 | `h-16` 玻璃效果，含页面标题和描述 | 面包屑 / 搜索 | `h-14`，左边灰色小标题，**和页面里的 H1 重复**（`layouts/AppTopbar.vue:59` 和 `ui/SPageHeader.vue:10`） | 去重 |
| 仪表盘 | 管理员：统计 + 趋势 + 模型分布 + 排行；用户：统计 + 图表 + 最近使用 + 快捷操作 | 分区：概览 / 模型 / 流量 / 用户 | 2–4 张数字卡 + 1 张 7 天图（`views/dashboard/DashboardView.vue:98-134`） | 大幅退步 |
| API Key（用户侧） | 使用示例弹窗、CC Switch 导入、批量编辑、列设置、首个 Key 引导 | 额度单元格、分组下拉、批量删除、抽屉编辑 | 只能新建和删除；不能编辑、停用、复制，没有使用指引 | 退步，P1 |

---

## 3. 设计系统提案

### 3.1 原则与继承关系

- **继承 sub2api**：保留 teal 主色、slate 暗色、`rounded-xl` 控件、`rounded-2xl` 卡片、渐变主按钮、玻璃顶栏、卡片微阴影、徽标色系。补回原版去掉的 `glow`、`btn-icon`、`card-hover`、`card-footer`、页签胶囊样式（`.tabs/.tab-active`）、`progress`、`skeleton`、Toast 左色条、弹窗缩放过渡和 `prefers-reduced-motion`、滚动条悬停才显示。
- **吸收 new-api 的交互**：数据表格工具条（搜索 + 分面筛选 + 更多筛选 + 重置 + 列显隐 + 视图切换）、浮动批量操作条、移动端卡片列表、带加载态的确认框、需要输入文字的风险确认、抽屉编辑、错误态和空态分开、命令面板。
- **契约约束**（CONTRACTS §23）：全局 CSS 类是内部实现，可以改；`@sub2api/ui` 的组件 API 是契约，**只加不改**（或同步修改 §23.3 和内置插件）。Tailwind 不扫描插件源码，所以新组件不能在运行时拼类名；需要动态的地方（例如 `badge-${tone}`）一律进 `safelist`。
- **语义优先**：页面里不再直接写 `bg-amber-50 text-amber-800 …` 这类组合，改用语义组件（`SAlert tone="warning"`）或语义 token（`bg-warning-soft text-warning-fg`）。

### 3.2 设计 token（Tailwind 配置层面）

**(1) 语义色：用 CSS 变量，暗色只换变量值**

```css
/* style.css @layer base */
:root {
  --bg: 249 250 251;          /* gray-50 页面底 */
  --surface: 255 255 255;     /* 卡片 / 弹窗 */
  --surface-2: 248 250 252;   /* 表头、次级面板 */
  --line: 229 231 235;        /* 常规边框 */
  --line-strong: 209 213 219;
  --fg: 17 24 39;             /* 正文 */
  --fg-muted: 107 114 128;    /* 次要文字 */
  --fg-subtle: 156 163 175;   /* 占位 / 辅助 */
}
.dark {
  --bg: 2 6 23; --surface: 15 23 42; --surface-2: 30 41 59;
  --line: 51 65 85; --line-strong: 71 85 105;
  --fg: 243 244 246; --fg-muted: 148 163 184; --fg-subtle: 100 116 139;
}
```

```js
// tailwind.config.js theme.extend（节选）
colors: {
  primary: { /* 保持现有 teal 50–950 */ },
  dark: { /* 保持 */ },
  bg: 'rgb(var(--bg) / <alpha-value>)',
  surface: { DEFAULT: 'rgb(var(--surface) / <alpha-value>)', 2: 'rgb(var(--surface-2) / <alpha-value>)' },
  line: { DEFAULT: 'rgb(var(--line) / <alpha-value>)', strong: 'rgb(var(--line-strong) / <alpha-value>)' },
  fg: { DEFAULT: 'rgb(var(--fg) / <alpha-value>)', muted: 'rgb(var(--fg-muted) / <alpha-value>)', subtle: 'rgb(var(--fg-subtle) / <alpha-value>)' },
  // 状态色：固定映射，消灭 yellow / sky / blue / primary 混用
  info: colors.sky, success: colors.emerald, warning: colors.amber, danger: colors.red,
  accent: colors.violet   // 原 purple 徽标（超管、插件来源）
},
```

- **`info` 必须和 `primary` 分开**：现在 `.badge-info` 和 `.badge-primary` 是同一条规则（`style.css:193-194`），"同步 / 手动"来源徽标看起来一模一样（`views/prices/PricesView.vue:202`、`views/prices/PriceEditView.vue:337`）。
- 每种状态色派生 3 个用法：`soft` 底（`*-50` / 暗色 `*-900/20`）、`fg` 字（`*-700` / 暗色 `*-300`）、`solid`（`*-500`，用于圆点、进度条）。

**(2) 圆角、控件高度、阴影、层级**

```js
borderRadius: { chip: '0.375rem', control: '0.75rem', card: '1rem', panel: '1.25rem' },
height:  { 'control-sm': '2rem', control: '2.5rem', 'control-lg': '3rem' },   // 32 / 40 / 48
minHeight: { 'control-sm': '2rem', control: '2.5rem', 'control-lg': '3rem' },
boxShadow: {
  card: '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)',
  'card-hover': '0 10px 40px rgba(0,0,0,.08)',
  popover: '0 12px 32px -8px rgba(15,23,42,.18)',
  modal: '0 24px 64px -12px rgba(15,23,42,.28)',
  glow: '0 0 20px rgba(20,184,166,.25)'          // 从原版补回：Logo、主 CTA
},
zIndex: { topbar: '20', sidebar: '40', overlay: '50', drawer: '55', popover: '60', toast: '100' },
fontSize: { xxs: ['11px', '16px'] },            // 取代现有 text-[11px] 任意值
transitionDuration: { fast: '150ms', base: '200ms' },
```

- **按钮和输入框统一用固定高度**（`h-control` / `h-control-sm`），不再靠内边距凑，同一行的按钮、输入框、下拉框自然对齐。
- 间距规则：页面左右边距 `px-4 sm:px-6 lg:px-8`（沿用）；区块间距 `space-y-5`；卡片内边距 `p-5`（紧凑）或 `p-6`（原版）；表格单元格常规 `px-4 py-3`、紧凑 `px-3 py-2`；表单字段间距 `space-y-4`，栅格 `gap-4`。

**(3) 字号层级**

| 用途 | 规格 | 现状问题 |
|---|---|---|
| 页面标题 | `text-xl sm:text-2xl font-semibold`（原版 `text-2xl font-bold`） | 和顶栏标题重复 |
| 区块 / 卡片标题 | `text-base font-semibold` / `text-sm font-semibold` | `SCard` 标题和 `EditorCard` 标题各写一套（`views/accounts/EditorCard.vue`） |
| 正文 | `text-sm` | — |
| 辅助 | `text-xs text-fg-muted` | `SHint` 已有，保留 |
| 微型 | `text-xxs` | 现在散落着 `text-[11px]` |
| 数字 | 表格数字列、统计卡默认 `tabular-nums` | 目前靠各处手写 |

### 3.3 组件清单（v2）

图例：**升级** = 已有、需要增强；**新增** = 没有，要补；"替换"列是会被收编的手写位置。

| 组件 | 类型 | 关键能力 / API 要点 | 统一行为 | 替换的手写位置（举例） |
|---|---|---|---|---|
| `SButton` | 升级 | 加 `icon` / `iconRight`、`iconOnly`（这时 `aria-label` 必填）、`size` 对应固定高度；`loading` 时保持宽度不跳 | 主操作一律 `primary` + 图标；"新建"统一用 `plus` 图标，不再写文字 "+" | `views/users/UsersView.vue:332`、`views/groups/GroupsView.vue:214`、`views/keys/MyApiKeysView.vue:147`、`views/proxies/ProxiesView.vue:240`、`views/prices/PricesView.vue:152`、`views/sticky/StickyView.vue:148`、`views/roles/RolesView.vue:272`、`views/plugins/PublishersView.vue:228` |
| `SInput` | 升级 | `prefix` / `suffix` 插槽（图标、单位 `USD`、`$`）、`clearable`、`type="search"` 自带放大镜 | 和按钮同高 | `views/accounts/AccountsView.vue:385-388`（手写搜索图标）、`views/users/UsersView.vue:481-484`（手写 `$`）、`views/settings/SettingsView.vue:121-130`（手写 USD） |
| `SSelect` | 升级 | 改成自绘弹层：`searchable`、`multiple`、`clearable`、分组、选项可带图标和描述、虚拟滚动；保留 `native` 属性兼容旧用法 | 选项超过 8 个自动出现搜索框 | `ui/SSelect.vue:39`、`components/GroupPicker.vue:62-69` |
| `SCombobox` / `SEntityPicker` | 新增 | 远程搜索、`UserPicker` / `GroupPicker` / `AccountPicker` / `ModelPicker` | 筛选栏和表单共用；显示名称，提交 ID | `views/usage/UsageView.vue:111-120`、`views/ledger/LedgerView.vue:37`、`views/keys/AllApiKeysView.vue:90`（直接填裸 ID）；可从 `views/ledger/AdjustBalanceModal.vue` 的用户联想抽出来 |
| `SDataTable` | 新增（`STable` 保留为轻量版） | 列定义支持 `sortable`、`hideable`、`pinned`、`minWidth`、`format`；`selectable` + `v-model:selection`；表头固定；`loading` 首次显示骨架、刷新时只在顶部显示细进度条；`<md` 自动切卡片；`rowActions` 槽统一放在最右并固定 | 加载中不让整表变灰；空态和错误态分开；数字列右对齐 + `tabular-nums` | `ui/STable.vue:78`；手写 `<table>` 的 `views/platforms/PlatformsView.vue:69`、`views/plugins/PublishersView.vue:264`、`views/prices/PriceSyncView.vue:301,382`、`views/plugins/detail/ResourcesTab.vue:99` |
| `SFilterBar` | 新增 | 搜索框 + 分面筛选（可选计数）+ "更多筛选"折叠 + 已生效条件个数 + 重置 + 右侧槽（列设置、紧凑、刷新、自动刷新） | 所有列表页同一种写法；条件同步到 URL query | 5 种现状写法见 §3.5 |
| `SListPage` | 新增（页面模式） | `PageHeader` + `FilterBar` + `DataTable` + `BulkBar` + `Pagination`，表格撑满视口、分页固定在底部（移植原版 `TablePageLayout`） | 列表页骨架完全一致 | Users / Keys / Groups / Proxies / Accounts / Usage / Ledger / Prices / Sticky / Plugins |
| `SBulkBar` | 新增 | 勾选后底部浮出："已选 N 项 · 操作… · 清除" | 批量危险操作走 `SConfirm` | 目前全站没有批量操作 |
| `SPagination` | 升级 | 加 `compact`（移动端只显示上一页 / 下一页）、跳页输入框；每页条数记到 localStorage | — | `views/upgrades/AuditView.vue:27`（手写分页） |
| `SModal` | 升级 | 焦点锁定、打开时自动聚焦、锁住 body 滚动、缩放过渡、`dirty` 属性（关闭前确认）、`persistent` 时右上角 X 也走确认、`size="full"`（手机全屏） | 弹窗里的表单按 Enter 提交 | `ui/SModal.vue:49-55` |
| `SDrawer` | 新增 | 右侧抽屉（宽 `md`/`lg`/`xl`），页头 + 页签 + 页脚操作；URL 可带 `?detail=<id>` 直接打开 | 详情和编辑都放抽屉，不再弹窗套弹窗 | `views/accounts/AccountsView.vue:545-622`（详情）、`views/groups/GroupsView.vue:311-344` |
| `SConfirm` v2 | 升级 | `confirm({ title, message, tone, impact: string[], requireText?, onConfirm: async () => {} })`：执行期间按钮转圈、弹窗保持打开，失败在框内显示错误；`requireText` 用于不可逆操作 | 危险操作分三级：普通确认 / 列出影响 / 输入名称确认 | `ui/feedback.ts:30-42`；`views/plugins/detail/UninstallModal.vue` 已有的输入确认可收编 |
| `SToast` v2 | 升级 | 图标、标题 + 描述、`action`（撤销 / 查看）、相同消息合并、最多叠 3 条；Promise 用法 `toast.promise()` | 成功提示统一用"动词 + 对象"文案 | `ui/SToastHost.vue` |
| `SAlert` | 新增 | `tone`（info/success/warning/danger/neutral）、`title`、`icon`、`actions`、`dismissible`、`variant`（soft/outline/banner） | 页面内提示一律用它 | 17 处手写，见 §3.5 |
| `SEmpty` | 升级 | `title`、`description`、`action` 插槽、`variant`（`empty` / `filtered`，后者带"清除筛选"按钮）、尺寸 | 首次为空时引导去创建 | `ui/SEmpty.vue` |
| `SErrorState` | 新增 | 错误信息 + 重试按钮 + 错误码可展开 | 加载失败不再显示成空数据 | `views/usage/MyStatsView.vue:35`、`views/usage/UsageView.vue:53` 等 |
| `SSkeleton` | 新增 | `text` / `rect` / `circle` / `table-rows` / `card` | 首次加载用骨架，刷新不用 | 目前只有 `SStatCard` 和侧栏用到 |
| `SStatusBadge` | 新增 | `domain` + `value`，从一张状态注册表取文案、颜色、是否显示圆点；查不到就原样显示 | 全站同一个状态同一种颜色 | `api/admin.ts:14`、`views/plugins/pluginUtil.ts:65`、`views/plugins/PluginsView.vue:68`、`views/nodes/NodesView.vue:120`、`views/groups/GroupAccountsEditor.vue:135`、`views/ledger/LedgerTable.vue:29`、`views/upgrades/UpgradesView.vue:36` 等 10+ 处 |
| `STooltip` / `SHelpTip` | 新增 | 悬停或聚焦时显示；`?` 图标版用于表单 label | 取代散落的 `:title`（键盘和触屏都用不了） | 账号状态详情、限额、缓存 Token 等 |
| `SCopy` | 新增 | 复制按钮或可复制文本，内置成功提示；`masked` 模式（默认打码，点眼睛显示） | — | `views/accounts/AccountsView.vue:234-236,282-284`、`views/keys/MyApiKeysView.vue:118-121` |
| `SDescriptionList` | 新增 | `items` 或插槽，支持 1–3 列、可复制、可折叠 | 取代 `.kv` 手写 | 账号详情、分组详情、测试结果、核心更新 |
| `SSegmented` | 新增 | 分段切换（原版 `.tabs` 胶囊样式） | — | `views/prices/PriceEditView.vue:390` |
| `SRadioCard` | 新增 | 卡片式单选：标题、描述、角标、禁用原因 | — | `views/settings/SettingsView.vue:101-113`、`views/plugins/PluginDetailView.vue:299-309`、`views/plugins/MarketView.vue:277` |
| `SFormSection` + `SSaveBar` | 新增 | 带描述的表单分区；底部固定保存栏（显示未保存状态 + 重置 + 保存）；配套 `useDirtyGuard()` 拦截路由离开和刷新 | 所有编辑页和设置页 | `views/accounts/EditorCard.vue`（`SCard` 的分叉版）、`views/accounts/AccountEditor.vue:974` |
| `SStepper` | 新增 | 纵向或横向步骤，状态有 pending/running/done/failed | — | `views/plugins/RolloutView.vue`（手写 ①②③）、`views/upgrades/StepLanes.vue` |
| `SMeter` | 新增 | 用量 / 上限迷你进度条（RPM、TPM、并发） | 接近上限时变成 warning 或 danger 色 | `views/accounts/AccountsView.vue:430-438` |
| `SAutoRefresh` | 新增 | 开关 + 间隔选择 + "N 秒前更新"；页面不可见时暂停；刷新不打扰视图 | — | `views/accounts/AccountsView.vue:377`、`views/nodes/NodesView.vue:160-169`、`views/upgrades/UpgradesView.vue:87` |
| `SPageHeader` | 升级 | 加 `back`（返回链接）、`breadcrumbs`、`tabs` 插槽；顶栏改为面包屑后，页面标题只在这里出现一次 | — | 4 处手写返回链接：`views/plugins/PluginDetailView.vue:188-192`、`RolloutView`、`ConsentView`、`views/prices/PriceEditView.vue:331-335` |
| `SDateRange` | 升级（替代 `STimeRange` 的界面） | 快捷项 + 日历弹层 + 时间；值的语义不变 | — | `ui/STimeRange.vue` |

**页面模式（建议沉淀到 `src/patterns/`，按需导出给插件）**

1. **ListPage**：头部（标题、描述、主操作）→ FilterBar → DataTable（表头固定，`<md` 显示卡片）→ BulkBar → Pagination（固定在底部）。筛选、分页、排序全部同步到 URL；每页条数、紧凑模式、隐藏的列记到 localStorage，按页面区分。
2. **DetailDrawer**：右侧抽屉，页签（概览 / 插件页签 / 日志），页脚放主要操作，URL 可分享。
3. **EditorPage / EditorModal**：FormSection 分区 + SaveBar + 未保存拦截；服务端返回的字段错误自动定位并滚动到第一个出错字段。
4. **SettingsPage**：宽屏左侧纵向导航，窄屏改页签；每个分区自带 SaveBar；`?tab=` 双向同步。
5. **Dashboard**：KPI 行 → 趋势图 → 分布图（模型 / 分组 / 账号类型）→ 排行 → 最近活动 / 告警 → 快捷入口；整页共用一个时间范围。

**统一的交互规范**

- **异步操作**：`useMutation({ run, success: 'common.updated', confirm?, optimistic? })`。执行期间禁用触发控件；成功出 toast；失败出 toast 并回滚乐观更新。参考 `views/sticky/StickyView.vue:129-137` 和 `views/prices/PricesView.vue:206` 的正确写法。
- **后台刷新**：`reload({ silent: true })`。不改 `loading`，只更新数据；失败只在页面顶部显示"连接中断，N 秒后重试"，不弹 toast。
- **危险操作分级**：L1 普通确认；L2 列出影响（例如"影响 12 个账号、30 个 Key"）；L3 输入名称确认（卸载插件、删除分组、核心升级、回滚、清空粘性会话）。
- **表单**：footer 里的提交按钮通过 `form` 属性关联到表单，Enter 即可提交；必填项标星；字段 hint 默认显示一行，过长放进 `SHelpTip`。

### 3.4 与 sub2api 的继承对照（类名层）

| 原版类 | next 现状 | 处理 |
|---|---|---|
| `.btn`（`py-2.5`，`focus:ring-offset-2`） | `py-2`，没有 offset | 改成固定高度，恢复 `ring-offset` |
| `.btn-icon` | 没有 | 补回，由 `SButton iconOnly` 使用 |
| `.card-hover` / `.card-footer` / `.glass-card` | 没有 | 补回（市场卡片、插件卡片、统计卡可点击时用） |
| `.page-title` / `.page-description` | `SPageHeader` 内联写死 | 改成 token |
| `.empty-state-*` | `SEmpty` 极简 | 用 `SEmpty` v2 承接 |
| `.tabs` / `.tab-active`（胶囊） | 只有下划线式 `STabs` | `STabs variant="pill"` + `SSegmented` |
| `.toast-*`（左色条） | 纯色块 | `SToast` v2 |
| `.skeleton` / `.progress` / `.switch`（`h-6 w-11`） | 没有 / `SSwitch` 是 `h-5 w-9` | 补回；`SSwitch` 加 `size` |
| `.sidebar-*`（分组可折叠，`w-64`） | 平铺分区，`w-60` | 侧栏支持二级分组 |
| `shadow-glow`、Logo | 字母 "S" | 品牌位：Logo 图片 + 站点名可配置 |
| `.modal-enter … scale(0.95)` + reduced-motion | 只有淡入淡出 | 补回 |

### 3.5 重复手写的证据（迁移清单）

- **筛选栏 5 种写法**
  - 卡片面板 + 搜索图标 + 高级筛选 + 清除：`views/accounts/AccountsView.vue:383-402`
  - 只有 placeholder、没有 label：`views/users/UsersView.vue:334-342`、`views/keys/AllApiKeysView.vue:88-94`、`views/plugins/PluginsView.vue:132-137`
  - `SField` 堆叠 label：`views/usage/UsageView.vue:111-135`、`views/ledger/LedgerView.vue:37-49`、`views/prices/PricesView.vue:155-169`、`views/plugins/MarketView.vue:183-196`
  - 原生 input + "搜索"按钮的提交式：`views/upgrades/AuditView.vue:19`
  - 小号输入框 + 刷新：`components/plugin/DeclarativeTable.vue:113`
- **手写提示框 17 处**（`rounded-(xl|lg) bg-(amber|red|emerald|purple|blue|primary)-50`），而且信息色混用：
  - `yellow`：`views/plugins/PluginDetailView.vue:271`
  - `sky`：`views/prices/PriceEditView.vue:351`、`views/prices/PricesView.vue:165`
  - `blue`：`views/ccgateway/ProxySettings.vue:49`
  - `primary`：`views/prices/PricesView.vue:173`
  - `amber` / `purple`：`views/keys/MyApiKeysView.vue:220`、`views/roles/RolesView.vue:326,330`、`views/auth/LoginView.vue:86`
- **"状态 → 颜色"映射 10+ 个**：见 §3.3 `SStatusBadge` 一行。
- **刷新按钮 3 种**
  - 只有图标：`views/accounts/AccountsView.vue:378`
  - 图标 + 文字：`views/plugins/PluginsView.vue:123`、`views/platforms/PlatformsView.vue:41`、`views/nodes/NodesView.vue:169`
  - 只有文字：`views/usage/UsageView.vue:107`、`views/ledger/LedgerView.vue:33`、`views/sticky/StickyView.vue:147`、`views/usage/MyStatsView.vue:94`
- **行操作 4 种布局**
  - 开关 + 两个文字按钮 + 下拉：`views/accounts/AccountsView.vue:440-452`
  - 只有下拉：`views/users/UsersView.vue:367-369`
  - 编辑 + 下拉：`views/groups/GroupsView.vue:254-265`
  - 红色 ghost 删除按钮直接放在行里：`views/keys/MyApiKeysView.vue:174`、`views/prices/PricesView.vue:212`
- **绕开组件库的原生控件**
  - `views/ccgateway/RemoteSettings.vue:100-119`：原生 `label` / `input` / `select` 拼 `.input`
  - `views/upgrades/AuditView.vue:19`：原生 input，样式也和 `.input` 不同
  - `views/ccgateway/ProxySettings.vue:57`：`class="btn btn-secondary"`
- **表格外层再包一张卡片，出现双层边框**（`.card overflow-hidden` 套 `STable` 自带的 `.table-container`）：`views/usage/UsageView.vue:156`、`views/usage/MyUsageView.vue:73`、`views/ledger/LedgerView.vue:52`、`views/ledger/MyLedgerTab.vue:84`、`views/prices/PricesView.vue:176`、`views/sticky/StickyView.vue:154`
- **同一功能写了两遍**
  - 余额调整：`views/users/UsersView.vue:268-311,470-496` 和 `views/ledger/AdjustBalanceModal.vue`
  - 粘性设置卡片挂在两个页面：`views/sticky/StickyView.vue:152`、`views/settings/SettingsView.vue:142`
  - 拓扑图同时出现在两个页面：`views/nodes/NodesView.vue:179`、`views/upgrades/UpgradesView.vue:95`

---

## 4. 问题清单

工作量：S ≤ 半天，M 1–3 天，L > 3 天。

### P0：明显的坏体验或 bug

| # | 位置 | 现象 | 建议改法 | 工作量 |
|---|---|---|---|---|
| P0-1 | `views/upgrades/UpgradesView.vue:116`（开始升级）、`:136`（回滚）、`:137`（取消）、`:106`（停用节点）、`:63-86` | 核心滚动升级、回滚、取消计划、停用节点都是**一点就执行**，没有确认；成功后也没有提示，只是静默刷新 | 用 `SConfirm` L3：开始升级列出节点顺序和目标版本，并要求输入版本号；回滚和停用节点用 L2，列出影响；成功出 toast；进行中在页面顶部挂 `SAlert` | S |
| P0-2 | `views/groups/GroupsView.vue:186-195`、`views/proxies/ProxiesView.vue:213-221`、`views/keys/AllApiKeysView.vue:67-75`、`views/users/UsersView.vue:286-311` | 停用分组（连带该分组下所有 Key 失效）、停用代理、停用别人的 Key、**扣减余额**都没有二次确认；扣余额只是把按钮换成红色 | 停用分组用 L2，显示受影响的账号数和 Key 数（数据已有：`account_count`、`keyCount`）；扣减余额加一步确认"将从 X 扣除 $N，剩余 $M" | S |
| P0-3 | `views/accounts/AccountsView.vue:134-141`、`ui/STable.vue:78`、`views/accounts/AccountsView.vue:405`、`composables/useList.ts:18` | 账号页每 10 秒自动刷新都会把 `loading` 置为 true：整表变成 60% 透明、计数区闪"加载中"、刷新按钮转圈。后端断开时**每 10 秒弹一次错误 toast** | `useList.reload({ silent: true })`：后台刷新不改 `loading`、失败不弹 toast，只在页面顶部显示断线提示；`STable` 去掉整表变灰，改成顶部细进度条 | S |
| P0-4 | `style.css:193-194` | `.badge-info` 和 `.badge-primary` 是同一组颜色，用 info 和 primary 区分的徽标看起来没有区别：价格来源"同步 / 手动"（`views/prices/PricesView.vue:202`、`views/prices/PriceEditView.vue:337`）、流式请求徽标等 | `info` 改用 sky 色系（§3.2）；`SBadge` 的 tone 表同步更新 | S |
| P0-5 | `views/dashboard/DashboardView.vue:52-61` | "可用账号 x/y"：x 只按第一页 200 条算，y 却是 `page.total`。账号超过 200 个时数字明显错误 | 后端提供 `/accounts/stats`（按状态计数），或者请求一次 `status=active&page_size=1` 取 total；没有数据时卡片要有 `loading` 态（现在没传 `:loading`，数据回来时卡片突然出现） | S（需后端小接口） |
| P0-6 | `ui/SModal.vue:55` + `views/accounts/AccountsView.vue:457`；`views/prices/PriceEditView.vue`（整页编辑）；`views/settings/SettingsView.vue:141-144` | 账号编辑器虽然设了 `persistent`，但右上角 X 照样直接关闭，近千行表单的输入全部丢失；价格编辑页离开路由不提示；设置页切换页签时子卡片被卸载，未保存的修改丢失。全站没有任何 `onBeforeRouteLeave` / `beforeunload` | `SModal` 支持 `dirty`：`persistent` 时 X 也走确认；新增 `useDirtyGuard()` 统一拦截路由离开和刷新；设置页各分区用 `v-show` 或把状态提到父组件 | M |
| P0-7 | `views/usage/MyStatsView.vue:35-39`、`views/usage/UsageView.vue:53-54`、`views/dashboard/DashboardView.vue:93`；列表页通用 | **加载失败显示成"暂无数据"或 0**。统计页 catch 后直接清空；仪表盘用 `allSettled` 吞掉错误，卡片显示 0；各列表加载失败只弹 toast，表格仍是"暂无数据"（只有账号页区分了，`views/accounts/AccountsView.vue:404`） | `SDataTable` / `SCard` 统一支持 `error` 状态，渲染 `SErrorState`（带重试）；`useList` 暴露的 `error` 自动接到表格上 | M |

### P1：应尽快改

| # | 位置 | 现象 | 建议改法 | 工作量 |
|---|---|---|---|---|
| P1-1 | `style.css:42` 对比 `style.css:80` | 按钮约 36–38px 高，输入框约 42px，同一行明显高低不齐（例如 `views/accounts/AccountsView.vue:389-393` 下拉框旁边的 `size="sm"` 按钮）。原版按钮是 `py-2.5`，两者同高 | 按钮、输入框、下拉框统一用 `h-control` / `h-control-sm` | S |
| P1-2 | `ui/STable.vue` 全文 | 没有排序、勾选、批量、列显隐、固定表头和固定操作列、骨架屏、移动端卡片；12–13 列的使用记录表只能横向滚动 | 新增 `SDataTable`（§3.3），使用记录、账号、用户先迁移 | L |
| P1-3 | 全站列表页（见 §3.5） | 筛选栏有 5 种写法；新建按钮有 "+" 文字和图标两种；刷新按钮 3 种；行操作 4 种布局 | `SListPage` + `SFilterBar`，按 §3.3 的统一规范迁移 | M |
| P1-4 | `ui/SSelect.vue:39`、`components/GroupPicker.vue:62-69` | 原生 `<select>`：不能搜索；暗色下 Windows 的原生下拉面板很突兀；多选分组是"标签 + 一个透明的原生 select"拼出来的 | `SSelect` 改为自绘的 Combobox，支持搜索和多选 | M |
| P1-5 | `views/usage/UsageView.vue:111-120`、`views/ledger/LedgerView.vue:37-39`、`views/keys/AllApiKeysView.vue:90`、`views/accounts/AccountsView.vue:397` | 用户、账号、创建者筛选只能**填裸数字 ID** | 用 `UserPicker` / `AccountPicker`（从 `views/ledger/AdjustBalanceModal.vue` 的联想逻辑抽出来） | M |
| P1-6 | `packages/host/src/useList.ts:68-121` | 筛选、页码不进 URL，刷新或返回后全部丢失，也没法分享链接；每页条数、账号页的"紧凑"（`views/accounts/AccountsView.vue:364`）不持久化 | `useList({ syncQuery: true, persistKey })` | S |
| P1-7 | `ui/feedback.ts:30-42`、`ui/SConfirmHost.vue` | 确认后弹窗立刻关闭，请求在后台执行，没有过程反馈，失败只弹一条 toast；无法在确认框里展示影响范围 | `SConfirm` v2（`onConfirm` 异步、`impact`、`requireText`）；`host.confirm` 同步扩展并更新 CONTRACTS §23.3 | M |
| P1-8 | `layouts/AppTopbar.vue:59` + `ui/SPageHeader.vue:10` | 顶栏的灰色小标题和页面 H1 重复；顶栏只有 `h-14`，左侧空荡 | 顶栏改为面包屑（插件页显示"插件 / xxx"），标题只留在 `SPageHeader`；顶栏恢复 `h-16` 玻璃效果，右侧放搜索（命令面板入口）、通知、余额、语言、主题、头像 | S |
| P1-9 | `ui/SToastHost.vue` | 没有图标、没有标题、不能带操作按钮、不合并重复消息，只有固定 `w-80` 一种宽度 | `SToast` v2（原版左色条样式 + new-api 的 action 能力） | S |
| P1-10 | §3.5 列出的 17 处 | 手写提示框，信息色在 yellow / sky / blue / primary 之间混用 | 新增 `SAlert` 并批量替换 | S |
| P1-11 | §3.3 `SStatusBadge` 一行列出的 10+ 处 | 同一个状态（如 `failed`、`disabled`）在不同页面颜色不同 | 状态注册表 + `SStatusBadge` | M |
| P1-12 | `views/dashboard/DashboardView.vue:98-134` | 仪表盘只有 2–4 张数字卡加一张 7 天图：没有时间范围选择、模型分布、Top 用户 / 账号、错误率趋势、最近请求、告警（账号冷却 / 错误、插件异常、节点离线）、快捷入口 | 见 §5 仪表盘；需要后端提供聚合接口 | L |
| P1-13 | `views/dashboard/DashboardView.vue:32-49` 对比 `ui/timeRange.ts:19-21` | 仪表盘"今日"按 UTC 日期算，使用记录页"今天"按本地零点算，两边数字对不上（UTC+8 的早上 8 点前差异尤其明显） | 统一按本地时区，`/usage/summary` 传 `tz` 参数；图表横轴也用本地日期 | S（需后端支持 tz） |
| P1-14 | `views/keys/MyApiKeysView.vue` 全文 | 用户最常用的页面功能最少：不能编辑名称 / 分组 / 过期时间，不能停用，不能复制 Key 前缀，没有"如何使用"（Base URL、curl、Claude Code / Codex 配置），也没有首个 Key 引导；删除是行内红色按钮 | 补编辑抽屉、启停开关、`SCopy`；新建成功的弹窗和行操作里加"使用示例"（参考原版 `UseKeyModal`，配置片段可分页签切换）；空态加 CTA | M |
| P1-15 | `views/accounts/AccountsView.vue:314-321,442-447` | "可调度"开关切换时没有 pending 态，可以连点；成功没有反馈 | 用 `useMutation` + 乐观更新，失败回滚（参考 `views/prices/PricesView.vue:206`） | S |
| P1-16 | `views/accounts/AccountsView.vue:457-622` | 编辑、测试、详情、凭据都是弹窗，编辑里点"测试"会再叠一层弹窗；详情把 `credentials` 原样 JSON 输出（`:617`） | 详情和编辑改用 `SDrawer`；测试做成抽屉里的页签或侧栏面板；凭据用 `SDescriptionList` + 打码 | M |
| P1-17 | 用户、分组、代理、账号、Key 列表 | 没有任何批量操作（批量启停、批量测试、批量改分组、批量删除）；分组和代理页连搜索都没有（`views/groups/GroupsView.vue:43`、`views/proxies/ProxiesView.vue:44`） | `SBulkBar` + 后端批量接口（或前端并发 + 结果汇总弹窗）；补上搜索 | L |
| P1-18 | `views/users/UsersView.vue:268-311,470-496` 对比 `views/ledger/AdjustBalanceModal.vue` | 余额调整写了两套，只有 ledger 那套带用户联想和 step-up 提示 | 用户页直接复用 `AdjustBalanceModal`（传入 `userId`） | S |
| P1-19 | `views/ccgateway/CCGatewayView.vue:78-104`、`views/ccgateway/RemoteSettings.vue:100-119`、`views/upgrades/AuditView.vue:13-27`、`views/upgrades/UpgradesView.vue` | 绕开组件库（原生 input / label / select、手写分页、行内展开式确认 `CCGatewayView.vue:82-83`）；模板被压成超长单行，难以维护和审查 | 改用 `SField` / `SInput` / `SPagination` / `SConfirm`；按组件拆分并格式化 | M |
| P1-20 | `views/settings/SettingsView.vue:28-29` | 页签只从 URL 读取，切换时不写回 URL；保存按钮是 `size="sm"`，放在卡片底部右侧不显眼 | `?tab=` 双向同步；用 `SSaveBar` 固定在底部 | S |
| P1-21 | `layouts/AppSidebar.vue:37`、`layouts/AppTopbar.vue:64` | 手机端打开侧栏时沿用桌面的折叠状态，抽屉只有 72px 宽、只显示图标；手机端余额完全隐藏，菜单里也没有 | 移动端抽屉固定 `w-64` 并显示文字；头像菜单里显示余额（原版做法） | S |
| P1-22 | `ui/SModal.vue`、`ui/SDropdown.vue` | 弹窗没有焦点锁定和自动聚焦，也不锁背景滚动；下拉菜单固定 `w-44`（`ui/SDropdown.vue:62`），不能用键盘操作，Esc 不能关闭，菜单项没有图标和分隔 | 见 §3.3 | M |

### P2：打磨

| # | 位置 | 现象 | 建议改法 | 工作量 |
|---|---|---|---|---|
| P2-1 | `views/usage/UsageTable.vue:122,127`；`views/prices/PriceEditView.vue` 校验区 | 状态用 `✓` / `✕` 字符，在不同字体下粗细和基线不一 | 改用 `SIcon` 或 `SStatusBadge` | S |
| P2-2 | `views/users/UsersView.vue:375`、`views/groups/GroupsView.vue:270`、`views/proxies/ProxiesView.vue:314`、`views/keys/MyApiKeysView.vue:182` | `<form @submit.prevent>` 里没有提交按钮（按钮在 footer 插槽里，表单外面），有多个字段时按 Enter 不会提交 | 给 footer 按钮加 `form="<id>" type="submit"`，或由 `SModal` 统一处理 | S |
| P2-3 | §3.5 列出的 6 个文件 | 外层卡片加表格自带边框，出现双层边框 | 去掉外层 `.card`，或者 `STable` 加 `bare` 模式 | S |
| P2-4 | `views/usage/MyUsageView.vue:59-70` | 页签内的筛选条件放在页签**上方**，层级颠倒 | 筛选移到页签内容区 | S |
| P2-5 | `layouts/AppSidebar.vue:41`、`views/auth/LoginView.vue:78` | 品牌位是渐变色块里一个 "S" 字母；`<title>` 固定为 sub2api，也不随路由变化 | 用 Logo 图片 + `shadow-glow`，站点名和 Logo 可配置；路由切换时更新 `document.title`（"页面名 · 站点名"） | S |
| P2-6 | `layouts/AppLayout.vue` | 懒加载路由切换期间没有任何反馈 | 加顶部 `NavigationProgress`（原版已有现成实现） | S |
| P2-7 | `stores/app.ts:36-72` | "系统"分区平铺 9 项，插件、市场、发布者、节点、设置混在一起 | 拆成二级分组：用户与权限（用户、角色、全部 Key）、插件（插件、市场、发布者）、运维（节点、升级、审计、设置）；侧栏支持折叠分组 | M |
| P2-8 | `stores/app.ts:93` | 主题只有亮 / 暗两种，没有"跟随系统" | 改成 `light` / `dark` / `system` 三态，用 `matchMedia` 监听 | S |
| P2-9 | `views/plugins/PluginsView.vue:140` | `cursor-pointer` 加在整个表格容器上，表头也显示手型 | `SDataTable` 提供 `clickableRows`，只作用于行 | S |
| P2-10 | `views/plugin-host/PluginPageView.vue:46` | 插件页的描述直接显示 `pluginKey vX.Y.Z`，太技术化 | 显示插件声明的页面描述；版本放到面包屑后面的小字 | S |
| P2-11 | `views/prices/PriceEditView.vue:390`、`views/settings/SettingsView.vue:101-113`、`views/plugins/MarketView.vue:277`、`views/plugins/PluginDetailView.vue:299-309` | 手写分段切换和卡片式单选 | 换成 `SSegmented` / `SRadioCard` | S |
| P2-12 | `views/nodes/NodesView.vue:173` | 统计卡用原生 `grid` 排版，别处都用 `SGrid` | 统一 | S |
| P2-13 | 表格数字列 | `tabular-nums` 靠各处手写，部分数字列没加 | `SDataTable` 的 `format: 'number' \| 'money'` 自动加 | S |
| P2-14 | `views/plugins/MarketView.vue:210` | 市场是纵向列表，缺少应用商店那种可浏览感 | 改成卡片网格（`card-hover`）+ 分类筛选 chip + 详情抽屉（更新日志、权限预览） | M |
| P2-15 | 全站 | 没有命令面板和快捷键 | `Ctrl/Cmd+K` 命令面板：页面跳转、切换主题、搜索用户 / 账号 / Key | M |

---

## 5. 逐页改版建议

### 登录（`views/auth/LoginView.vue`）
1. 品牌区换成 Logo 加站点名，背景用原版 `mesh-gradient`（`login-bg` 可以复用）。
2. 密码框加显示 / 隐藏切换，加 CapsLock 提示。
3. 错误、限流、会话过期改用 `SAlert`（现在是三段手写：`:86`、`:97`、`:100`）。
4. 表单宽度在 `max-w-sm` 基础上增加卡片阴影层次，和原版 AuthLayout 保持一致。

### 仪表盘（`views/dashboard/DashboardView.vue`）
1. 顶部全局时间范围（今天 / 7 天 / 30 天 / 自定义）加自动刷新。
2. 管理员视图：KPI 行（请求数、成功率、Token、费用、可用账号、活跃用户，每项带环比）→ 请求 / 费用趋势 → 模型分布饼图和账号类型分布 → Top 用户 / Top 账号排行 → 告警卡（冷却中、错误账号、插件异常、节点离线），点击可跳到对应页面并带上筛选条件。
3. 普通用户视图：余额、今日用量、本月费用 → 7 天趋势 → 最近请求（5 条）→ 快捷入口（新建 Key、查看用量、使用指南）。
4. 卡片统一加 `loading` 和 `error` 状态；修复 P0-5 和 P1-13。
5. 插件挂件区 `PluginSlot name="dashboard.widgets"` 单独成区，加标题，避免和核心卡片混排。

### 账号（`views/accounts/AccountsView.vue`、`AccountEditor.vue`）
1. 套 `SListPage`：现有的搜索、类型、分组、状态、高级筛选迁到 `SFilterBar`；加列显隐，把"紧凑"放进视图选项。
2. 行内可视化：限额改用 `SMeter`，并发用小进度条；状态详情（冷却原因、错误）放进 `STooltip`，不再挤在单元格里。
3. 勾选加 `SBulkBar`：批量测试、启停调度、改分组、删除；批量测试的结果用汇总弹窗展示。
4. 详情和编辑放进 `SDrawer`；测试作为抽屉里的页签；编辑加 `dirty` 守卫（P0-6）。
5. 自动刷新改为 silent（P0-3），换成 `SAutoRefresh`，显示"N 秒前更新"。
6. 新建账号第一步的类型选择用卡片网格，带平台图标和搜索（已有雏形 `AccountTypePicker.vue`），保持现有两步流程。

### 分组（`views/groups/GroupsView.vue`）
1. 补搜索和状态筛选，名称列加上可点击打开详情的视觉提示。
2. 停用和删除用 L2 确认，列出受影响的账号数和 Key 数（P0-2）。
3. 详情改抽屉：基础信息、平台与端点、成员账号（直接在这里增删）。
4. 模型白名单单元格改为"前 N 个 chip + 悬停查看全部"。

### 代理（`views/proxies/ProxiesView.vue`）
1. 补搜索（名称或主机）和协议筛选。
2. 测试结果持久显示"N 分钟前测试"；加批量测试；失败时只在行内显示，不再同时弹 toast（现在两处都报：`:89-90`）。
3. 停用用 L2 确认，并提示引用这个代理的账号数。
4. 导入 / 粘贴多条代理 URL 批量创建（原版有 `ImportDataModal`）。

### 价格（`views/prices/*`）
1. 修复 info / primary 同色（P0-4）。
2. "定价范围说明"改成可关闭的 `SAlert`，不要每次都占一行（`views/prices/PricesView.vue:173`、`views/prices/PriceEditView.vue:361` 重复出现）。
3. 编辑页加 `SSaveBar` 和未保存拦截；"可视化 / 源码 / 视频"切换改用 `SSegmented`。
4. 列表的价格摘要列改成结构化展示（输入 / 输出 / 缓存三栏），不再用一句长文案。
5. 同步页里两张手写表改用 `SDataTable`，差异行高亮。

### 使用记录（管理员 `views/usage/UsageView.vue`，个人 `MyUsageView.vue`、`MyStatsView.vue`）
1. 筛选用 `SFilterBar`：用户、分组、账号改用选择器（P1-5）；常用条件放在一行，request id 和模型放进"更多筛选"。
2. 加列显隐和"导出 CSV"（原版有导出进度弹窗）；状态列改用 `SStatusBadge` 加图标。
3. 统计卡和趋势图可以收起，给表格留出更多高度；趋势图支持按天 / 小时切换。
4. 行展开改成右侧抽屉，展示完整请求详情（计费拆解、hook 链、上游信息），表格保持紧凑。
5. 个人页：筛选移到页签内（P2-4）；统计页加模型分布饼图，费用 Top 模型做成条形图。

### 余额流水（`views/ledger/*`）
1. 用户筛选改用 `UserPicker`；金额列右对齐、正负着色、`tabular-nums`。
2. 余额调整只保留一套实现（P1-18）；扣减加确认（P0-2）。
3. 个人余额卡下面补"最近 30 天收支"小图。

### 粘性会话（`views/sticky/*`）
1. 设置卡只保留在一个地方（建议放设置页，粘性页放一个跳转链接）。
2. 匹配条件列改为 chip 展示，`dl` 网格太密（`views/sticky/StickyView.vue:169-181`）。
3. 命中率用 `SMeter`，统计行支持点开看趋势。

### 用户（`views/users/UsersView.vue`）
1. 套 `SListPage`：搜索框带图标，加角色、状态、分组筛选，以及批量启停 / 改角色 / 改分组。
2. 行操作：常用的"编辑"露出来，其余放进下拉（统一规范）。
3. 用户详情抽屉：基本信息、角色、分组、余额与最近流水、API Key、最近使用（参考原版 `UserApiKeysModal`、`UserBalanceHistoryModal`）。
4. 新建表单支持 Enter 提交（P2-2），加"生成随机密码并复制"。

### 角色（`views/roles/RolesView.vue`）
1. 主从布局保留；权限树上方加搜索和"只看已授予"切换。
2. 敏感权限用 `SHelpTip` 解释；未保存时底部出现 `SSaveBar`，路由离开时拦截。
3. 超管、权限缺失提示改用 `SAlert`。

### 全部 API Key（`views/keys/AllApiKeysView.vue`）
1. 用户筛选改用 `UserPicker`；加分组筛选。
2. 启停改为行内开关（带乐观更新）；删除用 L1 确认；批量启停。
3. Key 前缀用 `SCopy`。

### 我的 API Key（`views/keys/MyApiKeysView.vue`）
1. 见 P1-14：编辑抽屉、启停开关、复制前缀、空态 CTA。
2. 新建成功弹窗分两段："复制 Key" 和 "使用示例"（页签：curl / Claude Code / Codex / OpenAI SDK，Base URL 自动填好）。
3. 每个 Key 显示今日 / 本月用量（需要接口），可点击跳到按该 Key 筛选的使用记录。
4. 过期时间用快捷选项（7 天 / 30 天 / 90 天 / 永不 / 自定义），代替单独一个 `datetime-local`。

### 平台（`views/platforms/PlatformsView.vue`）
1. 手写的端点表改用 `SDataTable` 的 dense 模式；方法徽标颜色统一。
2. 每张平台卡加"复制 Base URL"，以及"有多少分组提供该平台"的跳转。
3. 降级提示改用 `SAlert`。

### 插件列表、详情、市场、授权、滚动发布（`views/plugins/*`）
1. 列表：节点状态 chip 合并成"健康 N / 异常 M"迷你条；整行可点的光标只作用在行上（P2-9）。
2. 详情：返回链接并入 `SPageHeader back`；授权待处理、已授权等横幅改用 `SAlert banner`（统一用 warning 色，不再用 yellow）；页签过多（overview / grants / nodes / hooks / jobs / events / egress / resources / settings）时，用"更多"折叠低频页签。
3. 市场：卡片网格 + 分类 chip + 版本选择改用 `SRadioCard`（P2-14）。
4. 授权页（Consent）质量较好，保留现有结构，风险分级用 `SStatusBadge`；底部操作栏用 `SSaveBar` 样式。
5. 滚动发布页：步骤改用 `SStepper`；终态横幅改用 `SAlert`。

### 发布者（`views/plugins/PublishersView.vue`）
1. 展开行里的手写子表改用 `SDataTable dense`。
2. 吊销发布者、吊销密钥用 L3 确认（输入名称）。

### 集群节点（`views/nodes/*`）
1. 拓扑图可以折叠，默认收起；统计卡统一用 `SGrid`。
2. 节点行点开抽屉：插件运行实例、资源、日志入口。
3. "自动刷新"呼吸点换成 `SAutoRefresh`。

### 核心升级与审计（`views/upgrades/*`）
1. 补全确认和反馈（P0-1）；按"状态 → 新计划 → 历史"重排信息层级；有计划进行中时页面顶部常驻进度 `SAlert` 和 `SStepper`。
2. 历史计划从一排按钮改成表格（版本、状态、开始时间、耗时），点击后在抽屉里看详情和事件时间线。
3. 拓扑图和节点页的拓扑二选一，这里改成节点表加状态点。
4. 审计页：改用 `SFilterBar` 和 `SPagination`；操作人显示邮箱而不是 ID；详情 JSON 用 `SCode` 加复制。

### 设置（`views/settings/*`）
1. 宽屏左侧纵向导航（计费、网关、粘性、卸载、更新源），窄屏改页签；`?tab=` 双向同步（P1-20）。
2. 每个分区用 `SFormSection` 加 `SSaveBar`；切换分区时检查未保存修改。
3. 计费策略的单选卡片换成 `SRadioCard`。

### CCGateway（`views/ccgateway/*`）
1. 改用组件库（P1-19），拆分超长单行模板。
2. 登出确认改用 `SConfirm`；状态和通知改用 toast 或 `SAlert`。
3. "远程设置 / 代理 / 认证 / 运行时"四块做成 `SFormSection` 纵向分区，每块有明确的保存和测试按钮。

### 插件宿主页（`views/plugin-host/PluginPageView.vue`、`components/plugin/*`）
1. 声明式表格改用 `SListPage` 和 `SDataTable`，插件能自动得到一致的筛选、分页和空态。
2. 页头描述改为插件声明的文案（P2-10）；崩溃态改用 `SErrorState`，带"重新加载"按钮。

### 错误页（`views/errors/*`）
1. 用 `SEmpty` v2 的大号版本（插画或图标 + 标题 + 描述 + 返回或重试）；403 页显示缺少的权限，并给出"联系管理员"的指引。

---

## 6. 建议的实施顺序

每一批都能单独合并和发布，都要求 typecheck 通过、e2e 不回归，并同步更新 CONTRACTS §23.3。

| 批次 | 内容 | 产出 | 工作量 |
|---|---|---|---|
| **第 0 批：热修（1–2 天）** | P0-1、P0-2（补确认）；P0-3（silent reload）；P0-4（info 色）；P0-5（账号计数）；P1-1（控件统一高度）；P1-15（开关 pending 态） | 消除最刺眼的问题，不改结构 | S×7 |
| **第 1 批：Token + 基础组件 v2** | §3.2 的 token（CSS 变量、状态色、圆角、高度、阴影、层级）；`SButton` / `SInput` / `SToast` / `SConfirm` v2 / `SModal` a11y 与 `dirty`；新增 `SAlert`、`SSkeleton`、`SErrorState`、`SEmpty` v2、`STooltip`、`SCopy`、`SStatusBadge`（含注册表）、`SSegmented`、`SRadioCard`、`SDescriptionList`；批量替换 17 处提示框和 10+ 个 tone 映射 | 全站观感统一一个档次；修复 P0-6、P0-7、P1-7、P1-9、P1-10、P1-11 | M–L |
| **第 2 批：列表页模式** | `SDataTable`、`SFilterBar`、`SBulkBar`、`SListPage`、`useList` v2（`syncQuery`、`persistKey`、`silent`、`sort`）、`SSelect` 改 Combobox、`UserPicker` / `GroupPicker` / `AccountPicker`；迁移顺序：用户 → 全部 Key → 分组 → 代理 → 使用记录 → 账号 → 余额流水 → 价格 → 粘性 → 插件 | 列表页一致，支持排序、批量、URL 状态、移动端卡片；修复 P1-2 到 P1-6、P1-17 | L |
| **第 3 批：布局与导航** | 顶栏改面包屑加玻璃效果、去掉重复标题；侧栏二级分组和品牌位；`NavigationProgress`、`document.title`；移动端抽屉和余额；主题三态；`SDrawer` 落地 | 修复 P1-8、P1-21、P2-5 到 P2-8 | M |
| **第 4 批：重点页面改版** | 仪表盘（需后端聚合接口和 tz）、我的 API Key（使用示例、编辑、启停）、账号（抽屉、批量测试）、设置页（纵向导航加 SaveBar）、核心升级页信息重排、CCGateway 和审计页改用组件库 | 修复 P1-12 到 P1-14、P1-16、P1-18 到 P1-20 | L |
| **第 5 批：打磨** | 命令面板、键盘可达性（下拉、弹窗、表格）、市场卡片网格、动效和 reduced-motion、`tabular-nums` 全覆盖、错误页、插件宿主页改用 `SListPage` | P2 全部 | M |

**依赖后端的项**（需要在后端排期）：
- 账号按状态计数接口（P0-5）
- usage summary 支持 `tz` 参数（P1-13）
- 仪表盘聚合接口：Top 用户 / 账号、模型分布、告警（P1-12）
- 批量操作接口（P1-17）
- 使用记录导出（CSV，流式或异步任务）
- 每个 Key 的用量（我的 API Key 页）

**风险提示**：
- `@sub2api/ui` 被内置插件（如 `plugins/moderation/ui/native`）通过 import map 共享。组件 API 只能扩展；`SSelect` 改成自绘后，要保留原生模式作为兜底，并回归测试插件页面。
- 新组件里凡是运行时拼出来的类名都要进 `safelist`，因为 Tailwind 不扫描插件源码。
