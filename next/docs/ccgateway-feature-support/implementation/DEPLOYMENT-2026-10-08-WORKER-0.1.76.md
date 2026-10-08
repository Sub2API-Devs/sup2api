# Worker 0.1.76 候选构建

精确候选 `cb38d953b554bcd47ed75c9c7ddec9436a4d90d4`。cc-max 仅服务器 Git fetch 后创建 clean detached worktree `/root/ccgateway-features-cb38d953b`，制品目录 `/opt/ccgateway-runtime/feature-validation-cb38d953b`。没有上传源码。

开始预检可用磁盘 8.7GiB，`ccgateway-worker:0.1.76` 标签不存在。旧镜像、备份、账号卷保留。复用 Go1.27-bookworm 编译缓存，不复用测试结果；门禁容器禁网、2CPU/2GiB、GOMAXPROCS=2。

当前仅构建和验证，尚未替换、重启 #21/#22；Controller 不变。没有执行 auth status、在线 profile、真实模型或任何锁恢复操作。原容器更新须等待根代理明确放行。

Linux engine race **32.221s**；contracts、worker race 和三模块 vet 全部通过。standalone Version0.1.76/full revision 构建完成，SHA256 `fec43652f1d4393a3c1e47f3ea204202f5fd9a0f51c0a8b5ba4c709b01e753c6`。

只读核旧失败 `e5f62b84-3dc8-4887-85d5-537314662495` 原始提供商 SSE：start 4个token计数、cache_creation两桶整数、service_tier/inference_geo字符串；delta 4计数、output_tokens_details.thinking_tokens整数、iterations数组。没有 fallback_credit:null 或未识别字段，均由本次聚合规则覆盖。只输出字段名/类型，没有读取新在线响应或重试。

## 制品门禁完成，账号尚未更新

- 禁网真实 CLI 2.1.292：新尾预算 JSON/SSE、新/续/cold/rollback、多 delta 与用量独审定向 **56.163s** 全部通过。是假上游验证，无真实模型请求。
- 新镜像 `ccgateway-worker:0.1.76`：`sha256:1b0d0620c807c2c6c983ecef22cc85760408733bbf55d7647aaea13908645650`。
- 镜像内程序 SHA256：`057fdab72fabfd7571f9ad5f3a5ed7d4016dc7e00cc6b0135e2cd4cf383beb7b`，与 standalone 按不同构建参数分别记录。
- OCI revision 精确候选；禁网 fixture 默认8787 health/features均200，Version0.1.76/full revision、modified=false、catalog2026-10-08.16、schema[1]、payload[1,2]、CLI2.1.292全部核验。
- fixture已移除，可用空间8.4GiB。构建与门禁日志位于制品目录，原21/22账号未替换/重启，等待统一放行。

## 放行后的原地更新：已完成

根代理确认 Core JSON/SSE/PG 门禁通过后，按 #22→#21 顺序更新。每账号先确认旧 .75 哈希 `ac868ed98cefb14753cffd853f23269a170a9b689c044cf359c5511df98065b6`，无活动 CLI；备份后将校验新哈希的临时文件原子替换 `/usr/local/bin/ccgateway`，每账号重启一次，前一个通过后才更新下一个。

- #22 原 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`。
- #21 原 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`。
- 双方 imageRef 仍为 `ccgateway:0.1.56`。before/after 的 ID、imageID、mount、user、path、args、labels 逐字相同。
- 双方 deployed hash 均为上述 standalone `fec43652…753c6`；credential 文件字节哈希和账号身份摘要保持，无 Plugin override，Mod 使用随程序更新的嵌入资源。
- 每账号 health/features 正确，新 `/admin/status` 为 local_snapshot、credential_present=true、online_verified=false；#22 access_token_expired=false，#21 为 API key。此检查不宣称在线认证或模型推理已验证。
- 最终再次只读确认无活动 CLI。未调用 CLI auth status、profile、模型；未改锁、Controller 或未来默认镜像。

私有完整 before/after、credential 元数据及 `final-verification.json` 位于唯一备份目录 `/opt/ccgateway-runtime/manual-backups/20261008-cb38d953b-22`、同前缀 `-21`。回滚程序是各目录的 `ccgateway`，哈希已核为旧 .75；必要时同样先确认无活动 CLI，再从该备份校验后原子替换并重启原容器，不能重建账号。未执行回滚。

根代理随后独立 SSH 核验两原 ID、原 imageRef `.56`、running 状态及双方 `fec43652…753c6` 程序哈希一致，已确认。Core .73/default 后续由 API 代理按统一放行执行；本代理等待完成信号后仅做只读复核，不提前发模型验收。

Core .73/default .76/Controller .48 稳定后，本代理再次独立只读核对两账号：running=true，ID/imageID/imageRef/user/mount/path/args/labels 与更新后快照逐字相同，程序仍为 `fec43652f1d4393a3c1e47f3ea204202f5fd9a0f51c0a8b5ba4c709b01e753c6`。证据保存于制品目录 `post-controller-21/22-container.json` 和 `post-controller-21/22-verification.json`。没有发送身份、profile、auth status 或模型请求；公网验收由根代理独占。
