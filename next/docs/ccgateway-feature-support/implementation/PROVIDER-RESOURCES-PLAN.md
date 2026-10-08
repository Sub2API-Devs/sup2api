# Provider 资源产品复用方案（第四批后只读评估）

2026-10-08。本文仅设计；未新增资源业务、迁移表、端点或云操作。此前 RESOURCE-PROTOCOL-BOUNDARIES 的“空 converter registry”是第三批前证据，当前共享 codec/strict adapter 已另行实现，不应据旧文档判断当前转换能力。

## 当前源码事实

- `gateway/pipeline.go:readBody` 将 body 完整限额读入并要求 UTF-8 JSON；不能把 Files multipart 当作 Messages JSON 简单放行。
- `sdk/manifest.Endpoint` 已声明 endpoint auth/protocol/request/response、异步任务 contract。`core/ports_tasks.go` 与 `usage/tasks.go` 已有用户/分组/账号固定、公共ID与上游ID、持久intent/snapshot等设计可复用；Files不是异步推理job，不能硬塞同一 task 表或假装有 model/usage。
- `ccgateway/client.go:modelTransport` 当前只接受受控 managed URL 与 POST，账号服务通过 runtime revision/openAccountModel 建立 transport。资源 GET/DELETE/multipart 需新的固定路径能力，不能扩成任意 URL代理。
- 当前 multipart 用途是管理端插件安装包上传（plugin/api/plugins.go），不是租户 Files API；可复用大小限制/临时文件清理实践，不能复用管理员权限或包签名安装流程。
- 插件 rollout/resources.go 管的是进程资源限制，与 provider 文件/容器无关。当前未找到独立 provider-resource repository/CRUD 端点。

## 建议模块边界

新增 core `ProviderResources` port + 独立 `internal/providerresources` service/repository；复用当前认证 principal、账户目录、事务/任务幂等模式、transport白名单、审计机制。插件只声明协议/资源kind/固定remote路径/credential配置，不持有跨租户owner策略。Worker只承担CLI自身上游鉴权通道和协议操作，不拥有平台租户数据库。

持久记录至少包括 public ID、UserID/GroupID、plugin/provider、kind（file/container/skill/version）、AccountID、真实上游ID、provider principal/workspace身份摘要、credential/runtime revision、state/expiry、关联操作intent、内容大小/media类型/必要校验和。原文件字节不默认长期留在数据库；临时spool有配额/过期/取消清理。

默认资源归属 UserID+GroupID，API Key 是访问手段而非永久资源owner；同用户同组换key可继续使用。跨用户/跨组共享必须独立ACL，不能因底层同Anthropic workspace就共享。公共opaque ID映射真实ID；不允许客户端提交未登记裸file_id/container/skill_id直接借用租户账号权限。

## 上传/读取闭环（优先交付）

1. 认证与组权限后创建本地upload intent，预留字节/数量配额，选择一个支持 Files 的账户。此时不捏造generation model；按资源capability选择。
2. 限额multipart解析，流式spool/forward；plugin Build只拿声明的文件元数据，不把二进制塞protobuf JSON字段。
3. 固定资源transport完成真实上游上传，记录remote ID和身份revision后再向客户端返回public ID。取消/超时不盲目自动重传；远端成功本地未知需intent状态与受控reconcile。
4. list只列本租户映射；retrieve/content/delete先查owner，再固定原account。不能将云workspace的完整list透出。
5. Messages中 file_id 使用声明路径的资源引用解析/替换；派生为必须的账号交集。多个资源绑定不同账户无法在单请求混用时明确拒绝，不能随机挑一个或静默重传。
6. 删除是状态机（deleting/tombstone/retry），重复删除幂等，远端404可视已删除。凭据轮换仅在实际provider principal/workspace身份一致后延续资源；不同身份不自动迁移。

原账号暂停/移除不允许资源自动换账号；错误应可解释且可恢复。生产已有#21/#22容器/授权状态保持，资源API不要求重建账号容器。

## CCGateway鉴权承载可行路线

可复用 count_tokens/JSON carrier 的“CLI作为自身鉴权承载、实际主请求被已归属relay替换成指定操作”机制，但资源必须新操作类型与固定verb/path，不能直接把Generation RequestPlan当万能HTTP代理。

只使用CLI发出的真实内层鉴权，在Worker内部执行实际Files API；不导出OAuth token给核心。Multipart body单独受控spool，操作响应直接保存真实JSON/二进制，内部CLI可用本地控制终态结束；不得让CLI发出收费生成请求充当上传前置步骤，不写生成历史checkpoint。真实云scope需分别验证API Key与CC OAuth，官方workspace OAuth能力不能自动等同CC订阅scope。

若某账号scope不支持Files，应返回实际403/能力不可用并排除该资源能力；这不是“协议无法实现”。允许其他已具备scope的账户类型先完整提供 Files 产品。

## Container / CodeExec / PTC / Skills

- Container：根据实际Messages响应登记owner与account，public引用解析固定后续账户、保留过期时间。不能把本地Worker cwd目录映射成官方container。继承/过期/删除或无法复用按实际API能力暴露。
- Code execution：复用已有 server tool ledger、terminal observer、response-only历史机制，增加官方执行工具/结果blocks及generated file登记。产生的file ID只能从已注册真实provider响应字段登记，不能遍历所有文本中的file_id或信任客户端回放创建所有权。计费需先声明实际server tool使用facts/价格输入。
- PTC：增加 caller/tool ID与执行上下文账本，客户端工具的回调仅绑定当前已授权调用；allowed_callers不是授权依据。pause_turn/恢复/超时/重试需保持执行幂等，不能重新运行已完成的provider代码。
- 内置Skills：可从已核准provider技能目录允许引用，但container/files依赖先齐全；本地Claude Code SKILL.md与API Skill不是同一资源。
- 自定义Skills/版本：上传/版本CRUD使用同一owner/账号映射框架，打包验证与解压限制独立（不复用插件包执行安装器）；版本固定与latest解析需有明确缓存/撤销策略。

## 建议下一批分工与验收门

A. ProviderResources持久归属+模型请求资源引用契约（core）和Files完整CRUD（API Key transport先可验证）。B. Worker资源操作通道/真实CLI隔离multipart与二进制证据，再真实账号scope。C. container和generated artifacts登记。D. CodeExec/PTC完整执行历史和费用。E. 内置Skills，再custom Skills/版本。

每批必须包含跨用户/跨组拒绝、账号轮换/移除、重试/取消与未知结果、远端路径白名单、限额/临时文件清理、JSON与二进制真实HTTP；最后才做真实云最小资源创建/读取/删除。资源真正写入/删除以及云测试由root安排，本文未执行。
