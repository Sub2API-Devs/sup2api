# Core 0.1.77 正式发布

源 `84fe9d0a10b6b770077697c2658ee5319d21f86c`，manifest `6a0a3573f73fa34692bd9fec5f2bf0f534ab45104ae8fe5896b679f73e8969cb`。准备、固定 Go1.27.1、四包 race/vet、实际隔离 PG、签名/六包不可变/完整 TLS GET/备份证据见同目录 CORE-0.1.77-VALIDATION-PREPARATION.md。失败但未发布的 .76 制品保持原样。

## 执行与维护窗口

根代理放行后复核服务器既有 `/home/debian/sup2api-managed/upgrade_observe.py`，SHA256 `42564f4aa3b4987e5979cf27ca3e53e974c7c4bad876f3052d4ce2fd38359985`。其 `CONTAINER={n:n}` 对应实际 `sup2api-1..4`，不是仓库旧 compose 前缀映射；只传 manifest 一个参数，没有 fault/restart 参数，没有改观察脚本或已签包。

执行句柄 96708，fresh preflight HTTP200、blockers=[] 后，以其即时 expected_revision 创建 HTTP202 正常 primary-first-v1 计划 `1f3d2f1c053ee2cb6118e04000105235`。顺序 sup2api-1..4，61.86s 到 completed|27，65.98s 观察完成，exit0。日志 `/home/debian/sup2api-managed/upgrade-20261008T191504.log`。

无鉴权 prices 探针记录 401 共1064次，维护503共1448次。首次503在22.26s，最后60.34s，观察窗口38.08s；不能称零中断。这是管理维护观察，没有推理、profile、quota 请求。

## 实际运行核验

四节点实际程序均 version 0.1.77，SHA256 `811c868c44a3f523df59662d29d2cbf3f9358d710252203dcda55f643edf63c4`。权威 updater.nodes 全部 local/ready=true/stopped=false，release_digest 全为上述 manifest，计划 completed|27。

六插件 active/desired 版本均相同，以下为四节点 `/proc/<pid>/exe` 独立读取并逐插件一致的运行 binary SHA256：

- ccgateway 0.1.14：`2f836e52bd5da8c645c1891e834219f87ecda42753a1656f7fe2c0b519d2bede`，安装包身份 `a7e0d1f0...`，与本候选不可变 .14 包一致。
- anthropic 0.2.5：`eb99b51c39b740e7d70e4c3ffc3d7576876253264ad7c0849a107303a4cb65d6`。
- gemini 0.2.4：`57371504a965bfec2bb91d1d2dfad1465f8c304a9c1bfad2023fcdf8ec6de3ec`。
- moderation 0.1.6：`15e3710f4815bbff0a7f8ffc131e5cd47f1b3d12c3f1b29396a2417299dac041`。
- openai 0.3.4：`b9b02ae297cc713a9de989dfc9e0ee9767c9abf59d49855809f8bce3bf9f70a1`。
- volcengine 0.12.3：`6bab9cb7edbcbc14c7d99049c4d1c054f5559b1a61e8b007f3409a9cff5f9b70`。

其它插件保留既有同版本安装目录身份，不强制覆盖为 bundle 内包；“六个新 builtin 与 .75 builtin 相同”与“实际已安装插件进程”分别核验，不混为同一断言。本次没有插件升级请求。

Worker .80、Controller .48、未来默认镜像、21/22 容器和授权均未操作，未调用旧 auth status。备份 `/home/debian/sup2api-managed/backups/core-0.1.77-20261008T185816Z` 与 .75 旧签名制品保留；无需回滚。发布稳定已通知根代理，真实公开模型验收由根代理独占，本记录不冒充新缓存证据已经生产推理验证。
