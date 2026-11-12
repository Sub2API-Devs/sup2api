# 权限加固：行为变化与回滚（升级说明）

> 日期：2026-11-12。分支：`feat/authz-hardening`。每个产生行为变化或产品性收紧的提交在这里追加一条：影响对象、回滚方式。路径省略前缀 `next/`；Go 文件省略 `server/internal/`。

---

## T01 H1：授予超管角色比较超管标志

- 改动：授予与作用对象的比较统一用 `core.PermissionSet.Missing`，同时比较超管标志和权限 key。`SetUserRoles` 判断操作者是否超管改用有效权限集（受访问密钥收窄），不再直接查库；`createUserTx` 删掉事务外的重复预检，只保留同一事务里的 `SetUserRoles`。
- 影响对象：超管名下的访问密钥（即使带 `role:manage`、`user:create`）不能再通过 PUT `/users/:id/roles` 或 POST `/users {role_keys}` 授予 `super_admin`，返回 403。超管本人用会话登录照旧可以（多超管语义暂不变）。
- 接口细节：`CanActOn`/`CanActOnUser` 拒绝时的 `details.missing_permissions` 改为 `details.missing`；`CanGrant` 与它们的 403 都多一个 `details.superuser`（缺超管标志时为 true）。前端没有读取 `missing_permissions`。
- 回滚：revert 这个提交即可，无迁移、无数据变化。
