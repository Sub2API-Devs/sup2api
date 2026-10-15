# 平台 UI 组件

控制台和原生插件通过 `@sub2api/ui` 复用同一套组件与样式。

## 标签页与标题归属（核心 0.1.151 起）

系统设置、插件设置和原生插件内部的标签页使用 `STabLayout`。它组合标签栏与内容面板，默认处理同名标题，并建立正确的 tab/tabpanel 关联。UI 2.0 已移除旧 `STabs` 公共接口；内部 `TabBar` 仅由 `STabLayout` 使用，不对插件导出。所有新旧调用必须将内容一起迁入容器。

```vue
<STabLayout v-model="tab" :tabs="tabs">
  <template #default="{ active }">
    <BillingSettings v-if="active === 'billing'" />
    <OtherSettings v-else-if="active === 'other'" />
  </template>
</STabLayout>
```

- 当前标签可见时，面板内 `SPageHeader`、`SSettingsGroup`、`SSectionTitle` 的同名 `title` 默认不再显示；不同名称的分组保持可见。判断来自组件上下文，不扫描 DOM，也不使用模糊文字匹配。
- 说明、保存按钮、开关、筛选器等独立内容保留。只有标题且标题重复时不留下空标题栏；只读时调用方应使用 `v-if` 省略没有操作的 `#actions` 插槽。
- 只有一个标签时默认隐藏标签栏，恢复内容自身标题；需要显示单标签可用 `show-single`。`show-tabs=false` 同样恢复自身标题。
- 嵌套容器使用最近层的标题，弹窗和抽屉重置上下文。折叠分组必须保留折叠按钮及名称；自定义标题插槽保持原样，避免误删其中的状态或交互。
- `STabLayout` 不自动重建内容组件。需要保留草稿可继续用 `v-show` 或 `KeepAlive`，需要切换时重新创建则由调用方设置 `key`。
- 控制台插件设置宿主已提供该上下文，声明式 `SchemaForm` 自动继承；原生插件自建标签页应使用上述容器。普通 HTML 标题、iframe 内部内容不自动处理。
- 新插件引用 `STabLayout` 时，`hostCompat` 最低核心版本应为 `>=0.1.151`（并保留项目要求的上界）。引用旧 `STabs` 的插件必须升级；UI 2.0 会按 `hostUICompat` 拦截仍仅声明 UI 1 的插件。

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
