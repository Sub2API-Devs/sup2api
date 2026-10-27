# 2026-10-24 代码质量审核：汇总

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

审的是 `f546fa31a..839d1c22e`（20 个提交，2026-10-23 审核的修复、Worker 只运行请求命令、CLI v23、删账号可选保留运行资源），按当前代码审，重点是这段新写或重写的部分；按审核做的修改在 03580970d..bd4e19fa2。准则是复用、解耦、简洁、低嵌套，以及顺带发现的真问题。五份分报告各有"处理结果"一节，逐条写了做法和审核不准的地方。

## 五个范围

| 范围 | 报告 | 条数 | 已修 | 部分 | 跳过 |
|---|---|---|---|---|---|
| 核心服务端 | [01-core](01-core.md)（K） | 21 | 17 | 2（K2、K13） | 2（K8、K20） |
| Worker 与插件 Go | [02-worker](02-worker.md)（W） | 20 | 15 | 3（W5、W14、W20） | 2（W8、W15） |
| 控制器 | [03-controller](03-controller.md)（P） | 20 | 19 | 0 | 1（P20） |
| cli-mods（CLI v23） | [04-cli-mods](04-cli-mods.md)（J） | 21 | 21 | 0 | 0 |
| 控制台与 SDK | [05-web-sdk](05-web-sdk.md)（V） | 17 | 14 | 1（V2） | 2（V15、V17） |
| 合计 | | 99 | 86 | 6 | 7 |

验证：核心、插件与 companions 四个 Go 模块 `go build`/`go vet`/`GOOS=linux go vet`/`go test` 通过（核心 PG 测试真跑）；控制器 190 个测试通过；cli-mods 171/171，0 跳过；控制台 688 个用例通过，`vue-tsc` 无错误。没有在 Linux 或 Docker 上真跑，生产未接触。

## 发现并修掉的真问题

- K4：保存 CC 配置时存储或加密失败报成 400；带 `cli_version` 保存时读不到已存配置，最后被说成 409 `config_changed`。
- K6：插件清除账号（`purged`）后，本节点的 CCGateway 请求缓存没有立即失效，要等总线回投或 30 秒过期。
- K14：`mergeFeatureGroups` 让新旧配置共用同一个 map，之后的删除会改到旧配置（潜在问题，当时还没有影响）。
- W2：没有内容保留能力、根本做不了 build 的 CLI，也会被报成支持 `build_attachment_sources_v1`。
- W3：未固定版本、读不到 `--ccgateway-info` 的 CLI 照常启动并报健康，之后每个请求 409。
- W6：关闭日志或清除完整内容时，持着账号日志锁删除整个目录，期间所有新请求卡住。
- P4：同名外部资源让 `DELETE` 回 503 并打堆栈、核心一直重试；还会让整份清理清单失败。
- P5：成对激活遇到标签不符时回 503 并打堆栈（单 Worker 路径是 404）。
- P6：临时容器删除失败会盖掉原来的错误。
- P10：删除途中网络已经消失时删除失败，不幂等。
- P11：加入 app 网络命名空间或挂载运行目录的已结束 one-shot 助手，删除运行环境后永久残留。
- P14：账号接口用 `int()` 解析 `Content-Length`，接受 `+5`、` 5`、`1_000`。
- P15：成对激活先备份再等空闲，每次 busy 重试都多一份备份，并把更早版本的程序备份轮换掉。
- J2：direct 给没有 system 的请求补的 system 放在第一个键，和官方键序不同。
- J19：注入提示词超出缓存断点上限时，会去掉客户端身份行自己的 `cache_control`。
- V1/V14：成对升级的按钮和说明写死 2.1.304，说明还讲已不成立的 302→304 迁移和 native 模式。
- V4：进入账号容器页时待清理列表请求两次。
- V5/V6：`runtime_not_retained`、`cli_version_unavailable` 不在原因表里，中文界面显示英文；清理失败后列表不刷新。
- V7：CLI 检查失败时出现两条一样的红色提示。
- V12：删除账号请求进行中，对话框仍能被 Esc、遮罩或 × 关掉。

## 线上行为变化

- J2：direct 请求没有 system 时，补上的 system 放在 `messages` 之后（与官方 2.1.304 键序一致）。
- J19：注入提示词让出缓存断点时只动注入的 CC 提示词块，客户端身份行的标记保留。
- P4：控制器 `DELETE /accounts/<key>` 遇到同名外部资源回 409 `resource_in_use`（以前 503 `runtime_unavailable`），其他接口不变；核心的原因随之从 `runtime_cleanup_failed` 变成 `resource_in_use`，重试方式不变。
- W20：Worker `/admin/cli` 的三个 install 动作回 400 `invalid_request_error`（以前 409）。
- K4：核心保存 CC 配置时的存储、加密或读取失败回 500 `internal`（以前 400 或 409 `config_changed`）。
- 较小的：账号准备的 sync 失败原因与账号一致（K1）；隧道上 Worker 的 3xx 作为普通响应返回（K13）；控制器拒绝不规范的 `Content-Length`（P14）。

契约已同步到 CONTRACTS §49.12、§49.14、§53.4、§53.20、§53.21。CLI v23 仍未发布（ELF `df6e562b…94ea`，产物在 `artifacts/claude-2.1.304/release-v23/`）；发布时用它替换 `cli-mods/release/`，仓库里现在的 `release/2.1.304/ccgateway-patch.json` 还写着旧文件名 `request-build-2.1.304.js`。

## 待用户决定或需要核心与 Worker 一起发布

- K8：helper history 的 namespace 改用线上实际发送的 `WorkerPolicy` 计算。所有账号的 namespace 会变一次，已有 helper history 全部失效，滚动升级期间新旧节点算出的不同；要和一次核心发布一起做并写发布说明。
- W8：删除 native 时代的 `features.Catalog()`/`CatalogVersion`。核心 `GET /system/ccgateway/features` 和核心测试还在用，要核心先删端点或改返回 `RequestCatalog("request_build")`。
- W15（含 V15）：`/admin/cli` 的 `catalog` 改名 `cli_check` 并去掉 `tool_count`/`variant_count`/`updating`/`auto_update_mode`，探测头 `native_build` 改名 `request_build`。核心↔Worker、核心↔web 线形都变，要核心先同时接受新旧两种形状。
- V2：去掉控制台 `requestPolicy.ts` 里的默认 `cli_version: '2.1.304'`。契约夹具 `web-policy-payloads.json` 的两例记录了这个默认值，要用 `CCG_UPDATE_CONTRACT_FIXTURES=1` 重新生成并跑核心契约测试。
- V3/V17：SDK `manifest.AccountDeletion` 增加可选的 `Description`（插件专属的删除说明，校验英文），以及 `MaxRetentionDays` 的位置与注释。控制台文案已先改成通用说法。
- P20：共享出口网关网络改用自己的名字和 `SHARED_OWNER` 标签，不再借草稿 key `d0000000000000000`。已有网络的名字和标签会变，需要迁移；已核实当前不会被误删。
- 核心旧共享运行时（ssh/local，`attempt.resolveShared`，§53.9）：是否删除待用户决定，删除时整段删掉即可。
- B12（2026-10-23 审核）：直连模式可访问宿主公网 IP，只分析过，待用户决定。

其余顺手可做的小尾巴：旧日志过期后删 `logFileKind` 的旧分类（W14⑤）；Worker 的发布渠道自动检查是否保留（W20）；`AccountDeletionOptions` 改带 `RetainDays`（K10）。已在汇总后补做：核心改用 `features.ValidCLIVersion`（W10）、`features.BuildBillingFields`（K20）、`resource_in_use` 的说明文字补上同名资源，以及控制台原因表补上 `resource_in_use` 与 `runtime_cleanup_failed`。核心在 worker 来源时仍要求 `build_attachment_sources_v1`：v1 现在只在 CLI 支持 v2 时报，两者等价，没有改（W2）。
