# Worker 资源输出身份与分类型授权

日期：2026-10-08。基于第五批 `0c96c681aedcb9c45cd64faf73b0ce60fa4df09a`，这里只报告第六批 Worker 资源准入基础，不把它等同于 CodeExec、PTC、Skills 全链上线。

## 核心到 Worker 的受控合同

- `X-CCGateway-Resource-Outputs: 1`：允许资源输出能力；即使请求没有输入 file_id，也必须真实核验 issuer，并持授权锁到整个模型请求结束。
- `X-CCGateway-Resource-Refs`：`[{kind,id}]`，kind 仅 file / container / skill，最多 100 个不同资源，同 kind+ID 重复拒绝，未知字段 / 类型 / 超额拒绝。
- 第五批 `X-CCGateway-Resource-Ids` 文件数组继续单独兼容；与新 Refs 同时出现拒绝，防止迁移期间合并歧义。
- `X-CCGateway-Resource-Contexts`：`[{kind:"ptc",parent_id,resource_id}]`，最多 100 个、父 ID 唯一、kind 固定，resource_id 必须同时有 container 类型授权。它不是由普通资源 ID 列表推断出来的父子关系。
- 所有合同均在 Worker API key 认证后使用，核心负责剥除外部用户同名私有头。Worker 再核实际 issuer / generation；header 字面本身不能跳过账号验证。

进程内 `Request.resources` 提供 `requireResourceKind(kind,id)`、`resourceOutputsAllowed()`、`checkResourceContext(parent,containerID)`。CodeExec owner 的解析与 PTC ledger 决定哪些 pending parent 必须校验关系；已完成历史不能被错误要求绑定到当前新容器。

## 保真与响应事实

实际 grant 核验成功后，Worker 立即把真实 Principal / Generation 写到响应头。后续成功 JSON、SSE、提供方错误或参数解析错误都保留该事实；未核验成功的请求不会回显请求者猜测的身份头。提供方发来的伪造同名头不会覆盖 Worker 实际事实。

输入资源仍在每轮主出站核允许类型 / ID。完整客户端历史继续精确对齐，顶层 container / custom skill 引用另外核原位置及 ID，不能因 CLI 重建而静默替换。资源能力不传给提供方，不进入 CLI 参数或伪装成 metadata 身份。

所有路径保留第五批已修复的 authority → CLI slot 顺序，取消时释放等待和 spool；没有为了避免死锁取消授权锁。

核心资源产物注册不能在尚未读完 Worker 的 SSE 时同步反向 GET metadata：Worker 此时仍持账号授权锁，输出背压可能形成相互等待。主线程选择仅对会产生状态资源的响应执行有界完整读取（当前 32 MiB）并关闭响应体，再做 metadata 查询、注册与事件 ID 改写。这类 SSE 有缓冲延迟，普通 Messages 不添加该缓冲。Worker 不为嵌套读取放开授权锁；即时 SSE 的只读嵌套 lease 是后续独立设计，当前未实现。

## 已验证与边界

真实 CLI 2.1.292 对隔离假提供方：无输入文件但持 Outputs 授权的普通模型请求，JSON / SSE / 上游 429 三次模型调用均保持实际身份响应头，且提供方处理期间授权锁确实持有；提供方伪造身份头不能覆盖。另参数解析 400 保留已核验身份，错误 issuer / 未授 Outputs 不回显身份，错误请求不进入模型提供方。429 case 显式启用既有 pass_upstream_errors 策略；默认 CLI 重试策略未被本改动改变。

分类型 / 上限 / 重复 / 未知 kind / PTC parent+container 绑定及错误类型的单测通过，`go vet ./engine` 通过。实际 CodeExec 返回 container / 文件的注册、租户公开 ID 映射和 PTC 持久父关联由 core / CodeExec owner 联合实现，不能用上述普通文本响应测试替代这些验证。

后续第五批原地部署已完成：服务器 Git 构建 78aa07448，#22 实际 OAuth profile 与 Files 文档闭环通过，#21 原地升级后仍明确拒绝未配置的资源身份。第六批输出能力不在该部署 SHA 中，仍只有本地隔离证据。未修改账号授权、未重建容器、未向服务器上传本地应用源码，见 DEPLOYMENT-2026-10-08-WORKER-RESOURCES.md。
