# OVH 核心发行准备（未上线）

## 本次只读核验

- `/home/debian/sup2api/src`：clean，HEAD `aaa7ee9ec43343e6bbb327cbdfd8742d4adad5c0`。
- `sup2api-1..4` 均运行核心 `0.1.62`，全部 local / ready / not stopped；最后升级计划 completed。容器保持既有 `sup2api-gateway:local`。
- 当前 manifest：`83200bfd9457c8c05a12972238bc9d502b5ebc409d8ba7fa1ac7a23d5ab10a14`；签名 payload 的 source commit 是 `66e91860f1ceec40eb76cdc0d83c5dda0e5bd384`，不能以服务器 checkout HEAD 冒充已部署源码。
- 当前 schema：`fb05265b28db53cd8e6fe2b3932f3ba37320b712b720533dbb402e0907fcfd76`。
- 当前 builtin trust.pub 与 `stage/0.1.62/builtin/trust.pub` SHA256 相同：`e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`。
- 发行签名 key id 为 `sup2api-ovh-2026`；既有 `keys/release.key` 保持0600，未读取/输出私钥。发行目录为 `~/sup2api-managed/publish/sup2api`。
- 当前最高已准备版本0.1.62，下一个候选可用0.1.63；后续另一批新增内容可以单独0.1.64，不能重用覆盖0.1.63。

## 新准备入口

`next/deploy/gateway/ovh/prepare-core-release.sh VERSION FULL_GIT_SHA`：

1. 要求精确40位 Git SHA、完整工作区 clean、目标 stage/digests/image 均未占用。
2. 读取四个正式节点当前版本、schema、插件公钥摘要，必须一致；目标版本必须递增。
3. 使用原 default BuildKit 与原命名缓存；仅创建独有 runtime systemd slice，CPU200% / Memory4GiB / Swap0 / Tasks512，退出时清理该 slice。
4. 构建 `--target build`，强制 `REQUIRE_EXISTING_DEV_KEY=1`。缓存私钥丢失时立即失败，绝不自动重生签名密钥。Dockerfile/build-go.sh 此参数默认0，不改变一般开发构建。
5. 提取新目录，核版本以及候选 trust.pub 摘要与 live 完全一致，重新检查 Git 未变化。
6. 复用 `package-release.sh` 和当前正在运行的 gateway image ID，使用既有 release.key；SOURCE_SCHEMA 明确传入四节点读取的旧 schema，候选 schema/version 则由本次 Git 构建的二进制给出。
7. 仅生成新签名 bundle/manifest/digests，不执行 import、不创建升级计划、不重启或替换服务。失败保留新 stage 供排查，拒绝删除旧发行。

准备流程示例（等待 root 给最终 SHA 后执行，当前未执行）：

```sh
git -C "$HOME/sup2api/src" fetch origin
git -C "$HOME/sup2api/src" worktree add --detach "$HOME/sup2api/release-0.1.63" "$CANDIDATE_SHA"
sh "$HOME/sup2api/release-0.1.63/next/deploy/gateway/ovh/prepare-core-release.sh" 0.1.63 "$CANDIDATE_SHA"
```

随后单独审核 manifest 的 schema_before/schema_after、源码SHA、签名、公钥与完整文件摘要。正式升级获明确指令后才导入：

```sh
docker exec sup2api-1 sub2api-gateway import -config /etc/sub2api/shell.json \
  -manifest "https://releases/sup2api/${MANIFEST_DIGEST}.json"
```

再做 admin preflight，要求无 blockers，创建受控升级计划并观察四节点。现服务器 `~/sup2api-managed/upgrade_observe.py` 已使用真实容器名；仓库版本仍旧命名，不能盲替换执行。不要使用 observer 的第二个参数（故障注入重启）。本次涉及 schema 迁移，数据库恢复边界应随正式发布审核，不应以重指旧 binary 当作通用数据库回滚。

## 隔离验证与边界

Docker default buildx/BuildKit0.30、systemd257、cgroup v2。官方 [buildx build](https://github.com/docker/buildx/blob/master/docs/reference/buildx_build.md) 支持 `--cgroup-parent`；保留默认 builder 避免独立 builder 丢失私钥缓存。

经 root 授权，在 OVH 仅用已存在 `sup2api-core-build:0.1.62` 作 base，运行8秒 sleep 的 cache-only 探针。实际读到父 cgroup `cpu.max=200000 100000`、`memory.max=4294967296`，并观察到构建 RUN 进程处于该受限 slice 的子 cgroup，构建exit0；临时 slice 和 runtime 属性已清理。未上传业务源码，未创建正式发行包，未更新服务或全局 Docker 配置。

本机 shell syntax 与四项隔离负例通过（0.700s）：非法版本/SHA、不匹配SHA不产生输出、缺签名缓存密钥在构建/keygen之前拒绝。完整正式准备脚本尚未对新候选执行，因此暂不声称新版本构建/签名/上线已成功。

旧 `prepare.sh` 会改写配置并枚举历史发行；服务器 `build-core.sh` 会删除已有 stage，且未传SOURCE_SCHEMA；本次均不执行。

## 0.1.63 首次准备失败与修正

已在 OVH Git fetch 并建立 clean detached 工作树 `/home/debian/sup2api/release-0.1.63`，精确提交 `747c168a383fd4e6738cb9451a29b1fb84010560`。服务器 sh syntax 和四个隔离负例通过0.013s。

第一次准备日志为 `/home/debian/sup2api-managed/prepare-0.1.63-747c168a.log`。UI 构建成功，Go 阶段因 `fork/exec ... compile: resource temporarily unavailable` / `runtime: failed to create new OS thread` 停止。宿主384核在 BuildKit 子 cgroup 中仍被 Go 当作可用并发数，触及独立 slice 的 TasksMax512；不是业务代码编译不通过，也不是签名密钥问题。未生成发行 manifest、未 import、未升级任何节点，失败 stage 当时仅有 `preparation.txt`。

仓库窄修增加可选 `BUILD_MAX_PROCS`，默认空保持开发行为；正式准备固定2，同时设置 `GOMAXPROCS=2` 和保留原 GOFLAGS 后追加 `-p=2`。本机六项隔离测试通过0.976s，含实际 fake-go 捕获这两个值及非法参数拒绝。修复必须经 root commit/push 后从服务器 Git 获取，不在服务器改源码。失败 stage 只允许核验后改名留证，不能删除或覆盖其他已发行版本。

## 0.1.63 成功候选（等待导入授权）

服务器通过 Git 更新到 `b786448a80930802aeaf4130c7987350f39fece6`；旧失败目录核对只有 `preparation.txt` 后改名为 `stage/0.1.63-failed-747c168a`，未删除。新SHA六个脚本测试通过0.017s。日志 `~/sup2api-managed/prepare-0.1.63-b786448a.log`：前端、核心、所有打包插件成功，限额 slice 已自动清理；Git前后clean。

- manifest **payload** digest：`f6567906ab39bafb604f61e31b4a2225d09c2a02e44af17a447ca4d6ef526295`
- manifest JSON envelope SHA256：`1db8a810844d456e7442b8446e1d338febffbf78f73276cd583ded6a08cc6713`
- bundle SHA256：`f524bd1a6aafe10dba1b3952cbf11c56681deb3c29aa53cfdc0b320f9edf204d`，110029007 bytes
- 核心二进制 SHA256：`d5aa1b34e12a345dd8d0223a5838c9a865d857d65a612c0e4322605a1abaa432`
- source commit：`b786448a80930802aeaf4130c7987350f39fece6`
- schema_after：`a685e0d83523a7b5a7ee3017a93bd4d7a0a6f82714829374f93c9fcf1586b729`
- schema_before 保持已核验0.1.62值；strategy=`maintenance`；key_id=`sup2api-ovh-2026`；插件 trust 摘要保持原值。

独立 Python Ed25519 验证签名、payload digest、bundle大小/摘要、全部归档文件路径集合/大小/模式/摘要通过。验证结果落服务器 `stage/0.1.63/verification.json`。最初人工验证命令错误地比较 envelope SHA 与 manifest ID，立即按发布器实际协议改成 payload digest 再全部通过；这是验证命令修正，不是产物篡改。

候选打包后发现 bundle 权限0600（pack使用私有临时文件），manifest0644。新增准备脚本窄修：从本次 pack 的输出严格验证两个64位hex digest，只对这两个公开产物chmod0644，不递归扫描旧publish。该权限修正不改变候选字节/源码SHA；发布源实际HTTP读取核验尚待完成。四个正式节点仍0.1.62，未执行import/升级计划。

## 已导入及 preflight（尚未创建升级计划）

权限修复提交 `20a522669cb435baba0f18ae98788cef787adbb5` 已在服务器 Git fetch，核对受控脚本变更后仅将上述两个产物调为0644。原候选构建工作树保持 b786448a clean，业务包不重建。现有 origin 实际也能读取0600包，但统一0644不再依赖该服务以高权限读取。使用既有 CA 验证 TLS，manifest与110029007 bytes bundle完整GET并分别校验 envelope/bundle SHA256通过。

升级前平台专用备份目录：`/home/debian/sup2api-managed/backups/v0.1.63-20261008T031614Z`。仅 `sup2api` 数据库的 custom-format pg_dump，19755667 bytes，SHA256 `6933e1025cfb4e3ebd843e99d29da0ae1e8b020678d1707c561bddaff4eb7ff9`；`pg_restore --list` 成功（不等于做过实际恢复）。同目录有 `node-facts.json`（四节点 current/previous/image/containerID/version/schema/mounts）、四节点配置、compose及.env私有备份；目录0700、文件0600，未输出任何凭据。恢复必须协调数据库和四节点0.1.62版本，不能只回退binary而忽略迁移后的schema。该备份记录的是这一时点；若发布前继续有写入，应按正式发布窗口考虑更新备份。

已执行 `docker exec sup2api-1 sub2api-gateway import ...`，返回本次 manifest digest。preflight HTTP200，`blockers=[]`，nodes 为 sup2api-1/2/3/4，`expected_revision=121`。完整结果存 `stage/0.1.63/preflight.json`，待执行参数存 `stage/0.1.63/upgrade-plan.pending.json`。未POST `/system/upgrades`、未重启节点；继续等待 root 确认 Worker747c 原地更新。执行前必须重取 preflight/revision，不盲用可能已过期的121。

后续root确认Worker更新后，已重新preflight并完成正式0.1.63升级。以上保留当时准备阶段事实；最终结果及维护503观测见同目录 `DEPLOYMENT-2026-10-08-CORE-0.1.63.md`，计划 `1011ace1691f22206da4f0d18b026194` completed，四节点均0.1.63/local/ready。
