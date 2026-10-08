# 默认 Worker 镜像 0.1.66 更新

2026-10-08，核心保持 0.1.65，没有重复核心发布或维护计划。先等待 Worker 作者完成 Git 提交 `56f93858ca7ab76ef9615baec6addf77e74ff205` 的受限构建、镜像健康检查和两个账号原地更新成功信号，才保存默认配置。

作者报告：镜像 `ccgateway-worker:0.1.66`，image ID `sha256:85a6ff7e1570743e469760cc5b7a1d59512f4eeae25b75ff8dc5f19b47fe035e`；双账号程序 SHA256 `51c09e8408e5e3ac0ac93e143dbdf83d07e8fe1d2c50de21140578298caee221`，完整提交一致，catalog.8 / CLI 2.1.292，分别真实 READY HTTP 200 / end_turn。原地补丁详细门禁归 Worker 部署记录，不由本记录重复声称执行。

本代理实际操作：重新读取完整 public 配置，仅复制允许保存字段并将 `images.app` 改为 `ccgateway-worker:0.1.66`。其它连接、网络、策略、controller/egress 镜像逐项相同；秘密不读取、不输出，同连接目标的 mergeConfig 保留秘密，存在布尔前后一致。正常 runtime/install 返回 HTTP 200、up_to_date=true。

实物复核 controller 仍为 `ccg-controller:0.1.47`，环境默认 app 为 0.1.66，运行正常，启动时间 `2026-10-08T04:53:08.689509439Z`。#21/#22 容器前后 ID、image ID、原镜像引用、卷、用户、启动命令以及真实 `io.sup2api.ccgateway.auth` 标签均完全相同。无账号重建、无授权变更。

证据路径：cc-max `/opt/ccgateway-runtime/manual-backups/default-image-0.1.66/{before,after}.json`；OVH `/home/debian/sup2api-managed/worker-default-0.1.66/` 内 public-before/public-after/runtime-after。仅公开配置被保存，未保存令牌或 SSH 私钥。

本次与 root 明确串行：刷新期间没有验收模型请求在途，完成并确认容器后才通知执行最终 CLI Read 验收。不宣称控制器刷新零中断；本操作没有额外模型请求或独立流量探测，真实 Read 结果由后续验收单独记录。
