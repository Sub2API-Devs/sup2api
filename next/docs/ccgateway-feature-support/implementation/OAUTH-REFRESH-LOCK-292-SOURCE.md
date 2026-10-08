# CLI 2.1.292 OAuth refresh lock 源码核验

只读分析本机官方 native executable 内嵌 JavaScript；未读取凭据、未启动 CLI、未访问服务器或模型。Windows 包 SHA256：`eb95bb65955f8b1702e800815f9a2c0388a5de0f196c354c7ee1dd5cb9a2ba23`。以下偏移属于该文件；Linux 平台专用 PID 实现须由服务器同版本包另行确认。

- `h0n`（211138875）：当前锁为 secure-storage Claude directory 下 `.oauth_refresh.lock`，stale 60000ms、heartbeat 5000ms；legacy 锁为 realpath(directory)+`.lock`。`nw`（210218341）优先 CLAUDE_SECURESTORAGE_CONFIG_DIR，显式空值取 home/.claude，否则使用一般配置目录。
- `Scs`（211139307）：先取得当前锁，再 legacy 锁，之后写 `.oauth_refresh.lock.owner`。legacy ELOCKED 释放当前锁再抛出；其它 legacy errno 仅记录并继续。owner 写失败本身不会拒绝已经取得的锁。
- proper-lockfile（210212xxx）：mkdir 后先 utimes（向上取整秒+5ms）和 stat 探测精度，之后才注册内部锁与 heartbeat；probe 失败异步 rmdir 并返回原 errno。不是把 EACCES 统一转 ELOCKED。
- `Ol`（211141812）：ELOCKED 最多五次 1–2 秒抖动重试，静止 mtime 至少观察 7.5 秒后尝试有证明的死亡持有者接管；活动 mtime 返回 lock_busy，静止且未成功接管返回 lock_timeout，其它获取错误返回 lock_error。
- 唯一 `new q7e`（214848864）要求 lock_timeout、已存 access-token expiry 已过期及内部 gate 开启。现场精确“another Claude Code process ... exited mid-refresh”文案由此类映射（216945680），不是所有权限错误的通用文案。
- owner（210528145）含 pid、可选 procStart、pidDomain、pidSpace、当前/legacy birthtime；接管 `ZC`（210529320）要求 mtime/birthtime 不变、同 PID 域与空间、可信进程视图、证明进程死亡或 PID 已复用，且 legacy birthtime 匹配。无 owner、foreign namespace、无法证明死亡均不擅删。Windows 编译包包含 Linux 进程视图检查分支，但 Linux 专用实现不能据此包完整推定。
- 正常 release 删除本 PID/birthtime 对应 owner，然后 legacy/current；正常退出等待 refresh hold 最长 2 秒。底层正常退出同步清锁，但强杀无法保证执行 finally/exit hook。
- 项目 `engine/runner_session.go:22` 使用 exec.CommandContext，未自定义 Cancel；取消默认可强杀。`runner.go:145` 的 run context 被 relay abort 取消。因此存在中断刷新而留锁的机制可能，不能据此认定本次首因；当前新锁创建、legacy/owner 均无更需定位当前获取/精度 probe 或进程内另一路刷新。
- 成功 refresh 使用已存 refresh-token 比较后 CAS 写回；发现其他进程已经更新则采用 sibling，不能把锁错误当 token 已吊销、不能覆盖或删除授权。

## 现场结论边界与建议

CC 报告旧空锁备份后唯一复验又生成新 current 锁，但无 legacy/owner、无模型/profile响应。该事实排除了“仅清理旧锁即可修复”的结论，尚未证明 current probe 卡住、重入或进程被中止中的哪项。不要继续删除锁/重试来替代证据。优先用本地纯假过期凭据 fixture 核隔离 relay 与启动期刷新，精确记录锁阶段与 errno；远端只核权限/mtime/进程状态，不打印授权。后续若修退出策略，需有界 graceful termination 后强杀并保持已有错误透传和取消隔离；是否需要同账号 refresh 单飞须以复现为依据。
