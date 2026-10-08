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
