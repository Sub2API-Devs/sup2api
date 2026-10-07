# 前端实施记录

日期：2026-10-08。状态：本地实现及组件验证，未提交、未部署、未进行浏览器视觉验收或生产推理。本文件只记录前端实施，不将目录状态当成账号运行时验证。

## 已实现

- 按最新要求将横向菜单改为「通用 API 特性」「CC 特性」，保持原有菜单 ID、保存流程和草稿不丢失行为。
- `FeatureSupport.vue` 从 `/system/ccgateway/features` 获取共享注册表；按特性聚合 body、beta、处理机制、原因、条件和证据，最多每页8项，支持名称/参数/beta搜索及状态筛选，单行展开详情。
- `featureCatalog.ts` 校验约定返回结构；目录失败、旧核心或未知schema形态显示未能确认支持范围与重试，不使用本地重复的功能白名单、虚构状态或运行时成功标记。
- `F-FAST` 详情承载已有allow_fast，`F-OUTPUT`承载已有allow_effort；无现有管理员策略的功能只读，不造启用开关。目录版本与源码适配/运行时验证区别持续可见。
- 工具搜索API特性通过 `F-TOOL-SEARCH` 跳转CC配置；工具搜索模式、普通MCP前缀和上游错误处理放CC页折叠区。未知beta/body策略保留在API页单一折叠区。
- 附件配置仍在CC页：独立workingDirectory/platform、已知附件三个选项、全局both和未知附件放行/忽略。已有未提交的旧environment及单项both迁移完整保留。
- 原有请求策略JSON编码未改变；刷新目录/分页/切菜单不保存、不部署、不改账号容器。
- 中文、英文UI文案同步；后台目录title/reason目前使用服务端返回文本，若需目录内容多语言，应在共享注册表协议中增补语言契约而非前端复制目录。

## 本轮验证

- `npm run typecheck` 通过。
- `FeatureSupport.spec.ts` 新增5项：功能聚合且不造开关、分页筛选不改策略、旧核心失败与重试、API/CC工具搜索区分、拒绝异常状态和运行时验证声明。
- `RequestPolicySettings.spec.ts` 保留之前10项并新增菜单隔离/草稿保留/不触发部署用例。
- 配合AccountRuntimes原有3项，共19项组件用例；具体执行结果以本轮工具输出为准。

## 待协调与边界

- 后端必须接入相同GET注册表契约：catalog_version、policy_schema_version、runtime_verified=false，features元素含id/title/category/scope/status/body_paths/beta_headers/mechanisms/reason，requirements/evidence为可选字符串数组。目录是源码基线，不是账号能力探测。
- 本阶段不做账号/模型实际能力评估、账号策略覆盖、revision乐观锁或schema升级激活；需要配套后端契约，不能只在前端画控件。
- 不在本阶段单独放开tool_search=auto:0、任意beta/body透传；前后端验证器与Worker执行语义需统一后另行接入。
- 已有策略能力由后端注册表说明；thinking.display、block_binding等新字段不能因官方文档存在就展示为已实现或已验证。
- OpenAI协议支持范围完全由注册表标明，UI不会从其他平台入口自动推断CCGateway支持。
- 等后端集成完成需运行真实注册表结构验证、前端构建与浏览器检查；原容器#21/#22及镜像手动更新限制保持不变。

## 浏览器视觉检查尝试（未完成）

已读取computer-use技能并在系统临时目录建立独立fixture，采用真实RemoteSettings组件、项目样式和Go共享registry输出的36项目录；账号/连接API使用无凭据fixture，本地端口5187，未连接生产或更改已有服务。

Vite服务成功启动。但当前CUA的iab不可用；Chrome/Edge库存读取均返回`nodeRepl.fetch request failed`，单独创建Chrome页同样失败。因此没有得到浏览器截图或视觉验收结论，不能把组件测试当作视觉通过。已停止本次Vite进程，并确认无该preview.mjs进程残留。临时fixture保留在系统Temp的ccgateway-ui-review-20261008目录，不纳入仓库。
