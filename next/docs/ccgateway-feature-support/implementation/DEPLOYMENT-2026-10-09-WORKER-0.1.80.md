# Worker 0.1.80 构建验证

精确候选 `60969149045452a96e5f0b125c912ddf28f8eeba`，服务器仅Git fetch创建clean detached worktree `/root/ccgateway-features-609691490`。制品和原始门禁日志 `/opt/ccgateway-runtime/feature-validation-609691490`。未上传源码。

预检标签 `.80` 未占用，磁盘7.4GiB。Go1.27-bookworm、2CPU/2GiB/GOMAXPROCS2、禁网门禁，复用编译缓存但不复用测试结果。首次启动误将CCG_REAL_CLI设置为全容器环境，可能扩大race范围，因此只停止本次门禁容器，保留 `engine-race-interrupted-envscope.log`（空输出，不计通过）。重新执行时仅定向CLI命令设置该变量；账号容器没有停止或变更。

最终门禁：

- engine race 33.637s，engine vet通过。
- CLI 2.1.292动态MCP、forced mixed原生与自定义、pinned与native-cache定向88.887s通过；全部使用隔离配置和禁网假上游。
- contracts race/vet、worker tests/vet通过。
- standalone Version0.1.80/revision精确，SHA256 `e2ab0ee3884ccbf725064f93e23dd48b6f55cdd5967dc8154627a825ea187f79`。
- 新镜像 `ccgateway-worker:0.1.80`，ID `sha256:aa1cc92e1dcb8accb5abc99b43b43cee010d6ae762f6e713951a6ffe66c56f6a`，OCI revision为精确候选。
- 镜像内程序SHA256 `b95bb6bc1b1dbaab70e3d4c1a0b9647e38beb2fd980c0035f135adb88ab01b49`；与standalone构建参数不同，分别记录。
- 禁网临时镜像容器默认8787 health/features200，Version/revision/modified=false/catalog `2026-10-09.17`/schema `[1]`/CLI2.1.292核验通过；临时容器已删除。Git源码仍clean，磁盘7.1GiB。

构建阶段未更新账号。随后收到root明确放行，按以下流程完成原地更新；未调用auth status、profile、授权探针或真实模型，未改默认镜像/Controller，保留所有旧制品和备份。

## 已放行原地更新

顺序 #22→#21，每账号分别在备份前、原子替换前确认没有活动CLI；临时文件核新SHA后原子替换，每账号仅重启一次。前一账号health/features/本地凭据状态及身份比对通过后才更新下一账号。

- #22 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22` 保持。
- #21 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b` 保持。
- 两者imageRef均仍`ccgateway:0.1.56`，ID/image/mount/labels/user/path/args的before/after完全相同，凭据文件摘要也相同。
- 两者新程序SHA为上述standalone `e2ab0ee3…187f79`；health/features200、full revision、catalog `.17` 通过。
- 新本地只读状态均`local_snapshot`、`online_verified=false`、凭据存在；#22 claude.ai、#21 api_key。此检查不表示在线认证验证。

唯一私有备份 `/opt/ccgateway-runtime/manual-backups/20261009-609691490-22` 和 `...-21`，其中旧程序 `ccgateway` 的SHA256均核为 `.79` 的 `0c44e181c3e60257e3f0668144139dc471529f859148f6f1aa8136b56e897231`。各目录保留容器/凭据摘要before、after、verification及final-verification.json。若回滚，在确认无活动CLI后，用对应旧程序校验该SHA，按临时文件→原子替换→原容器重启恢复，不重建账号。

最终只读复核两账号无活动CLI、备份与新程序hash准确。没有操作授权、token或锁文件。双账号完成信号已发送root/API；Core升级与未来默认镜像/Controller刷新由API代理后续独立处理。
