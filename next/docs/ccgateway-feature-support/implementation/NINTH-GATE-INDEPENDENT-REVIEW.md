# 第九批发布门禁窄修独立复核

2026-10-08，复核工作区相对 `cd4d5e40b2de7c22af7718a3b35d12d9f41e786a` 的两项修复；不部署、不修改运行配置。

## 0042 迁移

独立检查确认只为 `provider_diagnostic_messages` 表和两个索引加入 `IF NOT EXISTS`，字段、约束、索引列均未改变。符合仓库从 FirstIdempotentMigration 起重复执行迁移的约定；原 Linux 三个实际失败用例确由这些重复 CREATE 引起。修复不会为已有表重建约束，也不宣称自动修复人为改变的表结构。

本地迁移事务兼容及唯一编号测试通过。没有在本地伪称 PostgreSQL 幂等回归通过：最终新 Git SHA 仍必须在隔离 Linux PostgreSQL 重跑此前三项失败及完整门禁。原失败见 `LINUX-NINTH-BATCH-DB-VALIDATION.md`。

## 身份头

共享 helper 对 principal、generation 各要求恰好一个值，且与非空可信身份精确一致。Worker 资源/诊断准入及核心资源产物、信用、诊断响应统一使用它；不把此比较当作独立资源归属授权。错误路径仍使用各自原有类型，不修改普通 HTTP 200/refusal 语义。

新增独立 `identity_headers_independent_test.go` 经 Go 实际 HTTP response parser 验证大小写不同的重复头、正反顺序、相同值/冲突值均保留为多值并被拒绝；可信身份任一为空也拒绝。未发现需要扩改生产实现的问题。

独立执行：contracts resources 全包通过 0.393s；Worker 身份/诊断 grant 定向通过 0.357s；核心作者三条路径 × JSON/SSE × 两种身份头的 12 个 HTTP 回归通过 1.049s（校验不重试、不登记，原 usage 11/7 保留）；新增真实 HTTP parser 独立测试及既有身份头测试通过 2.587s。本地核心设置 `SUB2API_TESTPG=off`，这些均非数据库验证。

## 发布边界

0.1.64 已签名候选保持原样且未导入/发布，不能覆盖其资产。当前线上仍为 0.1.63；修复提交后新建 0.1.65 候选并从实际线上 schema_before 构建。先等新 SHA 的 Linux 数据库、race 和 Worker 身份头负例门禁完成，再允许受控升级。
