# CCGateway 插件及配套组件

本目录归集同一插件的源码，但平台插件与远程容器组件分别编译、打包和部署。

```text
ccgateway/
├─ manifest.json          # 平台插件清单
├─ main.go                # 插件进程入口
├─ go.mod                 # 插件独立 Go 模块
├─ internal/ccgateway/    # 插件适配、凭据校验、错误分类
├─ forms/                 # 账号表单
├─ assets/                # 插件资源
├─ docs/                  # CLI 逆向机制、改造说明及小型证据
└─ companions/            # 配套运行组件，不随插件包安装到核心
   ├─ go.mod              # 共享交互引擎模块 ccgateway
   ├─ engine/             # Anthropic ↔ Claude Code、历史、工具、日志
   ├─ mod/                # 嵌入 Worker 的 Mod
   ├─ catalog/            # 原生工具定义
   ├─ worker/             # 账号 Worker 独立模块及 Dockerfile
   ├─ controller/         # Python 容器控制器及 Dockerfile
   ├─ egress/             # 出口代理及 Dockerfile
   ├─ main.go             # 独立网关兼容入口
   └─ Dockerfile          # 兼容入口构建文件
```

平台插件只依赖自己的模块与平台 SDK，不依赖 companions。插件打包器通过白名单收集 manifest、资源、表单和插件二进制，不收集 companions。核心 Docker 上下文也排除 companions，构建脚本相应排除它的 Go workspace 条目。

Worker Docker 构建上下文为 companions；controller 和 egress 各自使用自己的目录作为上下文。镜像命名及生产容器、卷、授权状态不随目录调整改变。构建命令见 [配套组件说明](companions/README.md)。

核心侧管理桥接仍位于 `../../server/internal/ccgateway`，管理页面仍位于 `../../web/src/views/ccgateway`；本次没有重构平台的管理接口或 UI 扩展机制。

## CLI 机制与改造

**当前 2.1.302 实现入口：[Claude Code 2.1.302 独立分析与改动记录](docs/CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md)。** v7 迁移了原生 CLI 补丁，并在 ccgateway「CC 特性」中接入 direct/build 模式和 CLI 版本选择。账号授权创建时选择镜像内校验过的 CLI，禁用原生与受管自动更新；已有账号按配置 revision 同步并保留数据卷。2026-10-18 已部署 Core 0.1.158、插件/Controller/Worker 0.1.58，生产 21 号固定 CLI 2.1.302、保留 native 模式。OVH 透明出口阻塞已通过配套宿主 bridge guard 修复；正式发布、插件验签关闭状态与新建容器验证见新文档第 9 节。

[Claude Code 2.1.296 分析与改动记录](docs/CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md) 保留为历史入口：以下 v3/v6 和 2.1.296 的分析、哈希及测试不作为 2.1.302 的验证结果。

[Claude Code CLI 机制与改造指南](docs/CLAUDE-CODE-CLI-MECHANISMS.md) 记录 2.1.296 的 Bun 发行结构、SDK 和 VS Code 接入、mods 原理、工具 Schema 与注册路径，以及 Linux 重建和验证结果。配套函数摘录与验证摘要位于 `docs/cli-research/2.1.296/`。

[mods 工具注入扩展](companions/cli-mods/README.md) 提供 Linux 2.1.296 的可重复应用补丁、构建脚本与测试：按名称新增或替换完整工具定义，无 MCP 前缀；主模型 streaming 调用路径绕过旧工具前置检查并交给 mods，保留配置 hooks adapter。context、ask、结构化结果和恢复路径仍有兼容缺口；尚未切换生产 Worker 或修改 Go 引擎现有名称映射。

[claude request 与 WebSearch](docs/CLAUDE-REQUEST-AND-WEBSEARCH.md) 说明 v6 的 `--direct/--build --betas "a,b" file.json`、组件提取及 API Key 请求头隔离。控制器转发，Worker 提取消息内 reminder/system，CLI 复用内置函数组装并单次发送，工具调用交回调用方。Worker 用 `CCG_REQUEST_MODE=direct/build` 启用，默认仍为 native。OVH 独立容器真实测试通过，原 21 号未切换；官方客户端样本的 build 出口 JSON 完全相等，direct 保持正文原文。订阅认证、完整本机 startup 重建不在本次实现范围。

[附件组装机制与类型对照](docs/CLAUDE-CODE-ATTACHMENTS.md) 列出 CC 内部附件的字段、渲染方式和最终消息位置；内部附件类型不等于 mods 的创建接口数量。

[build 附件转换研究与实现](docs/BUILD-ATTACHMENT-TRANSFORM-DESIGN.md) 包含 2.1.302 渲染入口的 131 类清单和官方客户端请求捕获；插件设置可用 `build_attachment_sources` 为平台/OS 选择 Worker 来源，cwd、Git 和其他客户端内容保留。实际实现与验证范围见第 8 节。

2026-10-18 已补充本地官方 2.1.296 客户端的 Haiku / Opus 多轮项目分析记录。direct 正文逐字节一致；build 在部分 tool_result.content 上发生等价的字符串→text 数组转换，不能将上面的单回合 JSON 相等结论泛化。详见总记录的多轮验证、日志和自动更新章节。固定此基线需要同时禁用 CC 自带更新器（DISABLE_AUTOUPDATER=1）和 Worker 的受管 auto_update；原 21 号不会因此自动降级或替换二进制。
