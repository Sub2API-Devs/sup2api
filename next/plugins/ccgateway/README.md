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
