# Core resource output registration — 2026-10-08

实现入口：`gateway/resource_response.go`，`call.forward` 在 `resourceAccess.outputs` 为真时进入专用路径。普通请求流不缓冲。

## 实际行为

- 有状态 JSON/SSE 最多读取 32 MiB；先关闭 Worker 响应，再进行文件 metadata GET，避免 Worker 正持有 issuer 锁时发生嵌套死锁。读取不完整、超额、SSE 缺最终 stop/error 明确失败，不重试模型。
- 先从原始 JSON/完整 SSE 帧提取 usage 与插件 usageCapture，再注册资源。失败依然执行原 forward 的结算/attemptDone；外发内容与 usage 独立处理，避免重复计量。
- 必须验证响应实际 principal/generation 与入站核准 binding 一致。container 必须提供未来 expires_at；已有容器不能偷偷换成另一容器。全流先观察 container，因此 SSE 的最后 delta.container 可绑定此前产生的父调用。
- 新文件仅经同 Worker/issuer 的 metadata GET 核验 ID、类型、大小、MIME 等后 `RegisterObserved`。已有入站资源使用原公开 ID；重复输出依赖持久 store 的幂等观察复用公开 ID。
- 仅改 shared scanner 返回的精确路径；不碰工具 input、任意字符串、stdout、encrypted 内容或数值。PTC 父调用用 `BindContext` 绑定持久公开 container ID。
- 已登记的 custom skill 只复用入站归属，未知 skill 不创建权限。ID 改写后调用 root 的 `rewriteResourceSkillVersions`。
- metadata/登记失败尝试 Reserve + MarkUncertain；内部 metadata 记 remote_id/source_request_id，外发错误不含远端 ID。quota 或 registry 异常时有结构化 request_id 日志。该记录是可查询整改证据，不承诺已自动恢复。
- 有状态 SSE 有完整缓冲延迟；普通 Messages 不增加缓冲。provider HTTP200 typed 工具错误仍是正常内容。

## 验证

`resource_response_test.go` 使用真实 HTTP gateway 与隔离 transport/store fixture：

- JSON/SSE container/file ID 改写、重复结果幂等复用。
- 原始 opaque stdout 保留，即使内含与文件 ID 相同的字符串。
- metadata500、issuer变化、缺message_stop：502，原 input11/output7 usage保留，模型不重发；metadata失败记录uncertain。
- 生成文件下载、同 owner 更换 API key 后冷引用继续。
- PTC父绑定公开container并正确续聊。
- 专门Close顺序测试：metadata RoundTrip前 Worker响应必须已关闭。

`go test ./internal/gateway -run '^TestResourceOutputs' -count=1` PASS；与 `TestFileReference` 联跑 PASS；`go vet ./internal/gateway` PASS。

完整 gateway 测试已尝试但本机嵌入 PostgreSQL 初始化失败（缺 `data/global/pg_control`），相关 DB tests 失败；没有把该套件标为通过，没有修改数据库。这批 core 与第六批 Worker 尚未生产部署；持久 PostgreSQL、真实提供商资源产物与核心公开站点端到端仍须由集成候选验证。
