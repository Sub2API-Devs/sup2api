# 2026-10-08 Worker 第五批原地部署记录

状态：#21 / #22 原地部署完成；#22 真实 Files 与文档推理闭环通过。核心公网 Files 路由尚未由本次操作部署，#21 资源身份资格仍未配置。没有把健康检查当作全部推理能力验证。

## 构建来源与范围

- 第五批提交：`0c96c681aedcb9c45cd64faf73b0ce60fa4df09a`。
- 部署前发现 standalone 旧网关与 Worker 默认值不同，主线程追加仅 config / tests 的兼容修复：`78aa07448e0286da518f994cf2629f802953a756`。保留旧 1 小时执行时限、128 MiB 缓存，并兼容 CCG_TIMEOUT；无第六批业务代码进入该部署。
- 服务器 `cc-max` 使用 `git fetch` 和精确 detached worktree `/root/ccgateway-features-78aa07448`；构建前 HEAD 与工作区干净状态均已检查。
- `golang:1.27-trixie` 构建容器限 2 CPU / 2 GiB，复用受控 Go 缓存卷。Linux worker config / worker 测试与 vet 通过。
- 最终构建显式注入版本 `features-78aa07448` 与完整 revision；部署后 `/admin/features` 核实版本 / revision / modified=false。
- Worker 产物：`/opt/ccgateway-runtime/feature-validation-78aa07448/worker`，SHA-256 `1869444ce135222a9f9a4d5b52cd7700aa5d02f2f6ff2434c76d0e278731ee44`。
- CLI 来自此前服务器 Git 构建的 `ccgateway-worker:features-bfcbc3b42` 镜像，仅临时提取容器，无授权挂载或模型请求。完整安装目录保留在 `/opt/ccgateway-runtime/feature-validation-0c96c681a/cli-2.1.292`，CLI SHA-256 `a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3`。
- 未从本地上传应用源码，未修改 OVH 其它服务。

## 升级前核验与备份

两个账号原 CLI 均为 2.1.288，进程用户 1000:1000，启动命令均保持 `docker-entrypoint.sh ccgateway`，实际程序 `/usr/local/bin/ccgateway`。升级前均仅有 init 与网关进程，没有活跃 CLI 子进程。

- #21：`ccg-21-app`，容器 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`；授权状态 true / api_key。
- #22：`ccg-d1d2964e14bf728d9-app`，容器 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`；授权状态 true / claude.ai。
- 两者原镜像均为 `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`；未更新容器镜像引用。
- 原 Worker SHA-256：`590a9b246471bdfb93f3e07225832155d44223d7c0dafb23680da1fcdd4a0ec1`；原 CLI SHA-256：`0298068b686e7fdbaf9402a7a587bb7f49c0b0e084de09f69145a0719207640c`。
- 独立完整备份：`/opt/ccgateway-runtime/manual-backups/20261008-0c96c681a-21`、`...-22`；分别含旧 ccgateway 程序、完整 claude-code 安装目录、原 symlink 目标、容器 ID / 镜像 / 用户 / 命令 / 挂载事实。没有备份或输出凭据。

授权文件只以 UID1000 由现有 CLI 读取，未输出 token、key、email、profile 原始账号 / 组织标识。`/work` 账号数据卷与只读 resolv.conf 挂载均不修改。

## 原地替换方法与回滚

将服务器构建程序复制为容器 `/usr/local/bin/ccgateway.next-78aa07448`，核对 hash 后原子 rename 到原程序名。CLI 安装到新的 `.../@anthropic-ai/claude-code.features-78aa07448` 目录，原子切换 `/usr/local/bin/claude` symlink；旧完整 CLI 目录不移动或删除。随后原容器 `docker restart -t 30`。不删容器、不重建、不换镜像、不改授权。

回滚使用同一账号备份中的旧程序，先复制到临时文件再 rename 回 `/usr/local/bin/ccgateway`；CLI symlink 原子改回 `../lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe`；原地重启原容器。完成后核旧程序 / CLI hash、登录布尔和挂载。新 CLI 目录可保留，不需要为回滚删除任何账号数据。

## #22 当前已确认

- 原地重启后 `/healthz` 200、CLI 2.1.292。
- `/admin/features` 200：版本 features-78aa07448、revision 精确匹配、modified=false。
- 授权仍 true / claude.ai / firstParty。
- ID、镜像、1000:1000、命令及两个挂载与升级前完全一致。
- 真实 GET `/_ccgateway/resources/identity` 200，principal / generation 存在。此调用真实走 OAuth `/api/oauth/profile`，证实当前 profile shape 可用；只输出存在性及 auth_type，未输出原始标识。

### #22 真实 Files 闭环

直连容器 Worker，使用既有 Worker key 与刚取得的实际 Principal / Generation；凭据始终只在容器内内存使用。

1. 上传 27 字节 `text/plain` 验证文件：200，提供方返回 file ID；报告仅保留 ID SHA-256 前缀 `626ab2a68a3ca671`。
2. metadata：200，ID 一致、MIME=text/plain、size=27。
3. Messages：模型 `claude-opus-5-5`，`document.source={type:file,file_id}`，按第五批受控文件 ID 合同准入。返回 200、end_turn，回答恰为预置验证词 ORCHID。usage input_tokens=111、output_tokens=7，thinking_tokens=0，cache token 均为 0。
4. DELETE：200、type=file_deleted、ID 一致。
5. 再读 metadata：404，确认探针文件已清理。

只发出一次收费模型请求。profile / Files 操作本身没有额外模型推理。本次不涉及公开资源 ID 的核心租户 ACL 路由，不能代替核心端到端验证。

资源日志亦在 UID1000 下验证：请求调试日志已开启；6 条资源记录、1 条上传事实、1 条明确 binary body 省略及 SHA-256。受检日志未出现 Worker API key；未读取或输出 OAuth credential 文件。闭环完成后 resource-spool 下剩余 body 临时文件数为 0。

## #21 当前已确认

- 同样原地替换为相同 Worker hash / revision 与 CLI 2.1.292，`/healthz`、`/admin/features` 均 200，modified=false。
- 授权仍 true / api_key / firstParty；原 ID、镜像、用户、命令与挂载均不变。
- 未配置或猜测 API key issuer / generation。GET 资源 identity 返回预期 503，明确 `API key resources require managed issuer ID and generation`。
- 本次没有向 #21 的真实上游发模型推理，不声称其上游模型或 Files 产品资格已经通过。

本次没有需要执行回滚的失败；两个账号的旧程序、CLI 原目录与外部备份继续保留。未改变已有镜像名称或自动替换策略。
