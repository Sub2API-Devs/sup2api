# CCGateway 请求模式

2026-10-19：请求模式只保留 `build` 和 `direct`，默认 `build`。定制 CLI 仍为 2.1.302。

- `build`：Worker 提取消息组件，调用 `claude request --build` 构建并发送一次模型请求。
- `direct`：完整 Messages body 交给 `claude request --direct` 转发。

两种模式都将工具调用返回调用方执行，不由网关运行 Agent 工具循环。原 native 选项和仅适用于 Agent 的设置控件移除。当前 request 命令仍只支持 API Key；既有 OAuth 授权管理接口保留，不代表 request 已支持 OAuth 上游。

## 配置和迁移

Core 缺省配置为 build / CLI 2.1.302。历史 native、legacy、passthrough 和空模式在读取时归一为 build；保存新配置只接受 build/direct，不再接受显式 native。

Worker 的环境变量 `CCG_REQUEST_MODE` 缺省或空值均按 build；显式 native 会启动失败。独立 engine 命令及 `NewRuntime` 同样默认 build；生产构造入口始终选择单次 request 传输。旧 runner/协议辅助代码仍供授权管理和既有离线回归使用，不再作为可配置业务模式。

Controller 新建容器默认 build。迁移已存在的 Agent 容器时，使用当前配置的目标 Worker 镜像，验证固定 CLI 的哈希与 build 能力后才替换容器。账号专属数据卷、认证配置、网络策略保持；build/direct 之间切换仍保持原有镜像选择规则。

## 发布顺序

先构建并加载新 Worker/Controller 镜像，再更新 Controller 及其未来镜像配置，最后通过正常发布流程升级 Core。新版 Core 会归一旧配置并同步已有账号，因此原 native 容器可能在此时重建；应先保存容器基线和数据卷备份，在账号空闲时切换。不要先对旧 Core 管理下的 native 容器单独更新 Worker，以免旧 native 请求头与新 build 默认值产生冲突。

发布后核对四节点设置回读为 build、Controller 状态中的 CLI profile、Worker features 的 `request_build`、CLI 哈希及禁更状态；以真实 Messages 请求和本地 CC 工具回合验证。测试与正式发布结果在完成后追加。
