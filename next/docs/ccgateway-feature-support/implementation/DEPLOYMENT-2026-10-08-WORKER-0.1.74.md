# Worker 0.1.74 部署与一次只读身份诊断

精确 Git：`2b349c61b6c3627f06c24b3d1954c426a03f90d8`。cc-max 通过 Git fetch 创建全新 detached clean worktree `/root/ccgateway-features-2b349c61b`，产物 `/opt/ccgateway-runtime/feature-validation-2b349c61b`。没有上传源码，没有混入未提交的 inline 候选。

## 构建与门禁

采用 Go1.27-bookworm、2CPU/2GiB、现存编译和模块缓存，结果不复用。禁网 engine race 34.612s；真实 CLI2.1.292 的 Resource 目标49.040s，包含已保存假 OAuth+单端口3.28s、APIkey/OAuth-env、取消和无模型出站断言。contracts/worker race 及三模块 vet 全绿。Node 作者与独审的4个 finally/首因用例通过。CLI tests不挂载真实账号配置。

- standalone Version0.1.74/full revision SHA256：`0cb68219fdcdc379aa1b9e7e015e2dcee1dafc4d04b3827c0cf82f9961e91bc4`
- 新镜像 `ccgateway-worker:0.1.74`：`sha256:1084285d772c03cb364aed268ad0f029f7875e123bd37cabaa56ad571e84bcf9`
- image 内程序 SHA256：`b6c4b53bbe7e4883fa60529f4df4958ceaddd5d62d23df9d3cc347ad6d994768`
- OCI revision与精确Git一致；镜像与standalone构建参数不同，二进制hash分别记录。

新镜像独立禁网容器：默认8787 health200、features200、modified=false、catalog2026-10-08.15、helper schema[1]、CLI2.1.292。校验容器已删除。没有覆盖旧镜像；剩余磁盘9.1GiB，没有清理旧资源。

## 原容器更新

#22 完成并健康后才更新 #21，每个账号重启一次。替换前检查无活动CLI，原程序hash必须为 `.73` 的 `549bd6576d2c403c843a9a29108629ffb3745e76eb2fa018fe47c132e1dbbe31`。分别新建：

- `/opt/ccgateway-runtime/manual-backups/20261008-2b349c61b-22`
- `/opt/ccgateway-runtime/manual-backups/20261008-2b349c61b-21`

保存旧程序、CLI symlink、完整容器身份/镜像/mount/labels快照与已过滤授权状态；临时程序hash核对后原子rename。嵌入Mod随程序一起更新，两账号均无Plugin override。

两账号新程序均为上述 standalone hash，health/features/version/revision匹配。before/after快照逐字一致：原容器ID、imageRef `ccgateway:0.1.56`、实际镜像、卷、授权labels均未改变。#22仍loggedIn=true/claude.ai，#21仍true/api_key。无重建、无模型调用。Core、controller及默认镜像配置本轮均未修改。

## 唯一只读身份探针

父任务明确授权后，仅#22调用一次 `GET /_ccgateway/resources/identity`，凭据只在容器进程内用于正常Worker鉴权，没有输出或落入验收文件。没有重试。

- 时间：2026-10-08T12:33:18.647Z—12:33:27.541Z
- HTTP503；Worker日志 `a15884a7-c329-442f-a137-af001a930ad9`
- 首因：`Failed to refresh OAuth token: another Claude Code process is refreshing it or exited mid-refresh`；CLI建议稍后重试，持久失败时关闭其他CLI或重新登录。这是CLI原错误，不是本次采取的操作。
- 后继错误仍为 `main model turn ended without applying its client feature plan`，正确保留失败校验。
- `resource_carrier_completed`：`request_prepared=false`、`response_received=false`、`runner_failed=true`。

这证明资源载体没有进入请求准备阶段，也没有收到profile响应；不能将之误报为提供商模型资格拒绝。CLI可能有自身OAuth刷新网络行为，不把该事实扩大为所有网络零调用。载体不会将原资源prompt发送到模型路径，相关禁网回归已验证。

探针后容器仅docker-init/ccgateway，没有残留CLI。没有删除刷新锁、修改OAuth数据、重新登录或继续模型验收。原始首因已报告root/API；账号授权恢复需另行调查，不能宣称身份功能已恢复。备份与健康状态均保留，当前服务运行.74。

## 后续明确授权的锁调查与恢复尝试

父任务另行授权调查及仅在证明过期/无持锁进程后备份锁。CLI2.1.292实际嵌入实现同时获取当前 `.oauth_refresh.lock` 和 legacy `realpath(config)+'.lock'`，stale60000ms/update5000ms；owner侧文件用于持锁进程判定。

现场当前锁与legacy锁均为空目录uid1000，没有owner文件，无存活CLI。恢复时年龄分别235529ms/3068596ms，均远超60秒。仅锁目录原子移到各自同父目录的mode700备份：`/work/config/.oauth-lock-backup-20261008-2b349c61b/lock`、`/work/.oauth-lock-backup-20261008-2b349c61b/lock`；授权文件未改。最初以UID0创建备份被现有容器权限拒绝且未移动任何锁，随后使用原UID1000成功；未调整目录权限或容器安全设置。

随后按新授权只复验一次identity：12:37:34.042—12:37:43.556 UTC，HTTP503同原首因，日志 `4c1e3fcf-6bc4-4da4-9ebb-58917dd8b3a1`。仍request_prepared=false/response_received=false。新当前锁在12:37:34.616创建并遗留，但legacy锁未重建、owner文件未生成；不能再用旧锁单独解释。已停止线上探针，保留新锁以供取证，不循环搬锁或重试。

UID1000对 /work 与 /work/config 均W_OK/X_OK true，owner/group1000、mode755，realpath不变且无symlink。没有证据支持放宽父目录权限；尚待隔离验证auth status与carrier两个CLI生命周期的过期令牌路径。两次只读identity分别属于原诊断授权及后续锁恢复授权，未执行模型请求。

## 后续只读与禁网调查

Linux2.1.292实际内嵌代码确认legacy解析函数使用fs/promises.realpath，目标确为config目录加`.lock`，不是凭据文件。UID1000的两个独立临时目录mkdir/utimes/stat/rmdir均成功（测试目录已删除）。mtime没有+5ms不能证明precision probe失败，因为库可缓存同进程的时间精度。

只读授权元信息确认access期限2026-10-08T10:17:15.085Z已过，refresh期限2026-11-03T22:52:53.085Z尚未到；不输出令牌，也不据期限推断服务端未撤销。API同伴从已有配额缓存读出的原提供方错误只说明OAuth access token过期，不是refresh invalid_grant。usage接口本来只使用已保存access，不另实现并发refresh。

实际disable_nonessential和disable_autoupdater均1，与原fixture一致。账号透明egress仅DNS规则+最终HTTP account-proxy，无明确域名拒绝规则；旧时间窗无egress日志，不能据此证明官方刷新域名可达。

隔离.74镜像、network none、全假过期凭据、localhost拒绝代理：实际代理调用7次，无遗锁；人为延迟代理并drop全部caps/no-new-privileges再次隔离，31.939s，捕获platform.claude.com CONNECT两次及api.anthropic.com三次，无遗锁。两者都因假代理拒绝与资源请求重试返回`Resource carrier already consumed`，不能算刷新成功，更不能替代线上身份恢复。未复制用户配置/凭据到fixture。

真实现场新锁问题仍未复现。下一建议是经任务负责人确认后一次受控只读identity配合只含文件系统调用的进程追踪，排除read/write、网络payload及环境；服务器当前未安装strace，尚未安装或附加追踪。

## 文件系统追踪：确定前置状态子进程遗锁

负责人明确授权后，apt模拟确认仅新增strace/libunwind8，无升级/移除；安装使用no-install-recommends/no-upgrade与needrestart list模式，没有重启服务。追踪目录mode700，文件umask077，有25秒/文件大小上限；只选文件系统、clone/wait/exit调用，不含read/write、网络payload、execve或环境。

第一次attach后发现当前锁已自行/外部消失，备份步骤在lstat报ENOENT即停止，未发identity；随后确认TracerPid=0、授权mtime/过期时间未变、没有CLI。此锁消失原因没有归因证据。

第二个独立目录`lock-trace-02`确认三锁均不存在，attach就绪后执行唯一identity。12:59:56.357—13:00:05.854 UTC，HTTP503同首因，日志`865197df-7274-4ff8-8157-35bd6557c745`。追踪约978KB，已detach，未重复请求。

确证时序（宿主PID/TID）：

1. 前置CLI线程1044607在epoch1791464397.403883创建`/work/config/.oauth_refresh.lock`成功。
2. 同一前置CLI主线程1044603在1791464397.408220执行exit_group(0)，创建锁线程于.424043退出0。未见该轮legacy锁/owner文件建立或current锁释放。
3. 后续载体CLI线程1044624/1044625从1791464398.117527起对同路径连续6次mkdir获得EEXIST，期间stat成功、owner文件ENOENT；最终报告刷新锁超时。
4. 载体错误后Worker清理第二个CLI，线程于1791464405.789被SIGKILL。这个清理发生在错误之后，不能误当首次遗锁原因。

与源码identity先`claude auth status --json`、成功后才runResource的顺序对应，首个状态进程正常exit0却留下新锁，后续原生刷新被自己前置检查阻挡。这不是活跃的另一个用户CLI，也没有证据支持放宽文件权限。CLI292实际authStatus实现末尾直接process.exit，未采用普通优雅退出等待refresh的路径。

根治候选需消除身份获取对这个短命状态子进程的依赖或保证其后台刷新完成，不能每次无条件删锁。最终provider profile仍必须通过原生凭据、主轮scope和原出口验证。尚未修改此产品逻辑，待明确接口与隔离回归。

## API代理独立只读复核

.74部署后独立读取live21/22的Id/Image/image_ref/User/Mounts/Path/Args/labels，与本次作者after快照逐项相同；实际程序hash均0cb68219...91bc4。通过Core管理features各读一次，均200/build0.1.74/full2b349/modifiedfalse/helper schema[1]。授权true为作者既有过滤快照事实，未额外发auth刷新或identity探针，也没有模型调用。
