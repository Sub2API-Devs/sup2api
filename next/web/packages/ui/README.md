# 平台 UI 组件

控制台和原生插件通过 `@sub2api/ui` 复用同一套组件与样式。

## 表格列设置（UI SDK 3.1）

通用表格只需通过 `column-settings-key` 指定开发者定义的表名，SDK 自动显示“列设置”按钮：

```vue
<STable
  :columns="columns"
  :rows="rows"
  column-settings-key="usage-log"
  card
/>
```

`TableColumn` 支持 `hideable: false`（必须显示）和 `defaultHidden: true`（默认隐藏）。未启用列设置的旧表格保持原样。勾选即时生效，支持恢复默认，至少保留一列。选择、展开、单元格插槽和展开行跨度会跟随可见列变化。

桌面表格与手机卡片共用设置，或按钮需要放到筛选栏时，使用导出的状态和控件：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { STable, STableColumnSettings, useTableColumns } from '@sub2api/ui'

const columns = computed(() => [
  { key: 'name', label: '名称', hideable: false },
  { key: 'client_ip', label: '调用 IP' }
])
const columnState = useTableColumns(columns, 'usage-log')
const { visibleColumns, isVisible } = columnState
</script>

<template>
  <STableColumnSettings :state="columnState" />
  <STable :columns="visibleColumns" :rows="rows" />
  <!-- 自定义布局使用同一 isVisible('client_ip')，无需重复保存状态。 -->
</template>
```

- 默认每个用户在 localStorage 中保存一个 JSON 对象，表名是对象中的 key；控制台通过 `TABLE_COLUMN_SCOPE_KEY` 注入当前用户，原生插件自动继承。独立预览可以自行提供响应式 scope；不传表名时只保留当前组件内状态。
- 表名由开发者指定，同一用户下应唯一，例如 `usage-log`、`account-list`；插件可加自己的名称前缀以避免冲突。管理端与个人端使用不同表名。调用方只传入有权限展示的列，SDK 不会根据保存的偏好恢复未声明的列。不要用列设置代替权限控制。
- 只保存显式选择，新增列遵循自身默认值；标签翻译不会改变按 key 保存的偏好。动态列、切换用户、跨标签页修改及恢复默认均重新计算可见列。
- localStorage 被禁用或数据损坏时表格仍可使用；不跨浏览器同步，也不保存行内容。
- 原生插件使用该新增导出时声明 `hostUICompat: "^3.1"`。宿主／构建 preset 的版本均为 `3.1.0`，原有 `^3.0` 插件仍兼容。

### 自定义／服务端保存

`columnSettingsKey` 是开发者指定的表名，不是调用模型的 API Key。默认浏览器存储键为 `s2a.table-columns.v1:<用户 scope>`（scope 做 URL 编码），保存内容使用导出的 `TableColumnPreferences` 结构，序列化为一个 JSON 对象：

```json
{
  "usage-log": { "client_ip": true, "tokens": false },
  "account-list": { "status": true }
}
```

每次保存读取最新对象，只合并当前表对应的项；恢复默认只移除当前表名，其余表配置保留。对象为空时才删除整个存储项。

业务方可实现导出的 `TableColumnStorage`，通过 `STable` 的 `columnStorage` 或 `useTableColumns` 第三个参数传入。下面的 `preferencesAPI` 由调用方实现，SDK 不注册或假设这些后端接口：

```ts
import type { TableColumnStorage } from '@sub2api/ui'

const columnStorage: TableColumnStorage = {
  getItem: key => preferencesAPI.read(key),          // string | null 或 Promise
  setItem: (key, value) => preferencesAPI.save(key, value),
  removeItem: key => preferencesAPI.remove(key)
}
// <STable :column-storage="columnStorage" column-settings-key="usage-log" ... />
// 或 useTableColumns(columns, 'usage-log', columnStorage)
```

适配器收到的是按用户隔离的文档存储 key；`value` 是上面整个对象的 JSON 字符串，`null` 表示没有保存项。方法支持同步返回或 Promise；失败应抛出／reject。SDK 等待首次读取再允许切换列；同一适配器实例下，各表共享按用户串行的读取、合并、写入队列，避免组件之间覆盖其他表。调用同一后端的表应复用适配器实例；服务端多客户端并发仍由后端实现处理。SDK 忽略旧读取结果，切换用户后不发送旧用户的排队写入。状态导出 `loading`、`saving`、`error`、`reload()`、`retry()`，默认控件展示同步失败和重试。使用服务端适配器时不再同时写 localStorage，也不监听本地偏好变动。

跨设备同步取决于调用方服务端实现；服务端必须用当前登录身份鉴权，不能把传来的 scope 或 key 当作授权。不要在偏好 key 或保存值里放 API 密钥。SDK 不负责保存行内容、获取凭据或创建偏好 API。

### 通用 IP 列

任意 `STable` 可通过列配置使用同一套 IP 展示，无需复制使用日志的单元格模板：

```ts
import type { TableColumn } from '@sub2api/ui'

const columns: TableColumn[] = [
  { key: 'source_ip', label: '来源 IP', format: 'ip', filterable: true }
]
// <STable :columns="columns" :rows="rows"
//   @filter="(column, value) => { filters[column.key] = value }" />
```

- `format: 'ip'` 默认显示地址及复制按钮；`copyable: false` 可关闭复制。`filterable: true` 使地址可点击，并发出 `filter(column, address, row)`；默认只显示，不自动发起筛选请求。
- 支持任意字段名和点分路径，保留 IPv4／IPv6 的原始表示；长地址截断时可通过悬停查看完整值，复制和筛选始终使用完整地址。空值不显示可操作按钮。
- 卡片、详情和自定义单元格可直接用 `<SIPAddress :value="address" filterable @filter="onFilter" />`，可选 `copyable`、`active`、`empty`。点击复制／筛选不触发行点击；`cell-<key>` 插槽仍可覆盖内置 IP 渲染。
- 组件只展示调用方传入的数据，不做 IP 归属地查询，也不请求业务接口。

## 标签页与标题归属（增强 STabs：核心 0.1.154 起）

系统设置、插件设置和原生插件内部的标签页统一使用增强的 `STabs`。它组合标签栏与内容面板，默认处理同名标题，并建立正确的 tab/tabpanel 关联。不保留 `STabLayout` 导出、包装或兼容别名；内部 `TabBar` 不对外导出。内容必须放入容器，不能把标签栏与内容作为兄弟节点拼装。

```vue
<STabs v-model="tab" :tabs="tabs">
  <template #default="{ active }">
    <BillingSettings v-if="active === 'billing'" />
    <OtherSettings v-else-if="active === 'other'" />
  </template>
</STabs>
```

- 当前标签可见时，面板内 `SPageHeader`、`SSettingsGroup`、`SSectionTitle` 的同名 `title` 默认不再显示；不同名称的分组保持可见。判断来自组件上下文，不扫描 DOM，也不使用模糊文字匹配。
- 说明、保存按钮、开关、筛选器等独立内容保留。只有标题且标题重复时不留下空标题栏；只读时调用方应使用 `v-if` 省略没有操作的 `#actions` 插槽。
- 只有一个标签时默认隐藏标签栏，恢复内容自身标题；需要显示单标签可用 `show-single`。`show-tabs=false` 同样恢复自身标题。
- 嵌套容器使用最近层的标题，弹窗和抽屉重置上下文。折叠分组必须保留折叠按钮及名称；自定义标题插槽保持原样，避免误删其中的状态或交互。
- `STabs` 不自动重建内容组件。需要保留草稿可继续用 `v-show` 或 `KeepAlive`，需要切换时重新创建则由调用方设置 `key`。
- 控制台插件设置宿主已提供该上下文，声明式 `SchemaForm` 自动继承；原生插件自建标签页应使用上述容器。普通 HTML 标题、iframe 内部内容不自动处理。
- 新插件使用增强 `STabs` 时，`hostCompat` 最低核心版本应为 `>=0.1.154`（并保留项目要求的上界）。`hostUICompat` 声明 UI 3.0；使用旧入口的插件必须迁移，不提供兼容别名。

验证至少覆盖：同名/不同名标题、单标签、语言切换、只读操作区、折叠分组、弹窗/抽屉、嵌套标签、声明式插件表单，以及保存功能。

## 表格手柄排序

```vue
<STable
  v-model:rows="rules"
  :columns="columns"
  row-key="id"
  reorderable
  :reorder-disabled="readOnly || saving"
/>
```

- `reorderable` 默认关闭。开启后自动在最左侧显示手柄，只有手柄能开始拖动，普通单元格仍可点击和选择文字。
- 支持鼠标、触屏和触控笔。拖动时显示插入位置，靠近滚动区域边缘自动滚动；松开后提交一次新顺序。
- 聚焦手柄后，上下方向键移动一行，Home/End 移至首尾。Esc、失焦、指针取消、数据刷新或组件卸载均取消进行中的拖动。
- `rowKey` 必须指向非空、唯一且稳定的字符串或有限数字。缺少有效标识、少于两行、`loading` 或 `reorderDisabled` 为真时，手柄禁用。
- 组件不修改传入数组，不调用保存接口。`update:rows` 返回新数组，通常通过 `v-model:rows` 接收；页面在用户点击“保存”后持久化。
- 可选监听 `reorder`，参数为导出的 `TableReorderEvent<T>`：`{ row, key, from, to, rows }`。`from/to` 为当前传入列表的零基索引。不要同时在两个事件中重复保存。
- 拖动只作用于当前表格，不支持跨表拖动。排序依据当前传入的 `rows`；业务若分页、筛选或另有列排序，须先明确如何映射到完整顺序，不应直接覆盖完整列表。
- 选中项、展开行和焦点按稳定标识保留。开启排序时的 `rowAttrs.draggable` 被覆盖为 `false`，避免整行原生拖动与手柄交互冲突。
- 普通表格不需要修改。`row-click`、选择、展开、单元格插槽及右侧固定操作列维持原有接口。

失败处理页的布局、规则语义和保存流程仍由业务页面负责，本次组件改进不接入这些改动。

## 批量选择与批量操作栏（UI SDK 3.2）

```vue
<SBulkBar
  :count="selected.length"
  :total="list.total"
  :page-selected="pageSelected"
  :all-selected="allSelected"
  :selecting-all="loadingAll"
  @select-page="selectPage"
  @select-all="selectAllResults"
  @clear="selected = []"
>
  <SButton size="sm" variant="primary" @click="bulkEdit">批量编辑</SButton>
  <SButton size="sm" variant="danger" @click="bulkDelete">删除</SButton>
</SBulkBar>
<STable v-model:selected="selected" :columns="columns" :rows="rows" selectable />
```

- `selectable` 的表格默认支持拖拽框选：从勾选列或单元格空白处按下拖动，经过的可选行全部选中；起点行已选中时改为取消。拖回时范围外的行恢复原状，靠近视口边缘自动滚动，滚轮继续扩展。`:swipe-select="false"` 关闭。
- 从单元格文字上按下仍是普通的文字选择；按钮、链接、输入框、开关等控件不受影响。拖动结束的那次点击被吞掉，不会再切换勾选框或触发 `row-click`。
- Shift + 点击勾选框：把上一次点击的行到当前行设为同一状态（跳过 `rowSelectable` 为假的行）。
- `SBulkBar` 只负责展示与事件，不保存选择、不请求接口。未选时默认隐藏，`persistent` 时显示提示（`#idle` 插槽可替换）。「选择全部 N 项」由调用方按当前筛选加载全部 key 后写回 `selected`；跨页保留选择时，业务方应在筛选条件变化后清空，避免对看不见的行执行操作。
- 批量操作的权限检查由服务端逐条执行，界面里按钮只用于提示适用数量。原生插件使用 `SBulkBar` 时声明 `hostUICompat: "^3.2"`。
