# OVH Docker 存储迁移准备

状态：用户已明确暂停迁移，当前不执行磁盘初始化或数据搬迁。
此前已完成迁移前检查、配置与运行清单备份、工具准备和复制 dry-run；
没有创建阵列、格式化目标盘、复制业务数据或修改挂载。

随后按用户要求，仅停止以下 8 个测试／抓包容器，保留容器和数据：

- `ccg-302-test-controller`
- `ccg-302-direct-test`
- `ccg-302-build-test`
- `ccg-v6-direct`
- `ccg-v6-build`
- `ccg-v6-capture`
- `ccg-request-build-test`
- `ccg-request-capture`

停止后实查剩余 19 个运行容器，其他运行服务集合未变。
下面的 27 个运行容器基线属于停止测试容器之前的历史记录；
未来如恢复迁移，必须重新采集基线，不能按旧清单重新启动这些测试容器。

## 实测源端

- Docker 29.5.2，containerd 2.2.4，containerd overlayfs 镜像存储。
- `/var/lib/docker`：217,766,080,512 字节，约 202.8 GiB。
- `/var/lib/containerd`：121,044,779,008 字节，约 112.7 GiB。
- 合计约 315.5 GiB，位于 `/dev/md3` 的 ext4 系统盘。
- 复制 dry-run 成功：2,493,194 个文件系统条目，包含硬链接、符号链接、
  设备节点及特殊文件。逻辑文件总大小 343,022,883,509 字节。
- 27 个运行容器、31 个已退出容器、77 个 Docker 数据卷。
- 已停止的 31 个容器均使用 `restart=no`，恢复时必须保持停止。
- containerd `moby` 的 27 个 task 均对应 Docker 容器；`moby_history` 无运行 task。
- 数据卷均为普通 local 卷，无自定义 driver options。
- 原有系统盘 md1、md2、md3 均为 RAID1 `[UU]`。

这些是准备时刻的基线。正式切换前必须重新采集，不能用旧快照覆盖期间的新状态。

## 目标方案

两块 NVMe 均为 3,840,755,982,336 字节：

- 当前 `/dev/nvme2n1`。
- 当前 `/dev/nvme3n1`。

只读检查未发现挂载或文件系统／分区签名。稳定 EUI 设备路径保存在服务器
私有 `target-disks.json`；正式操作必须按稳定 ID 再核对容量、挂载、holders
及占用，不能只依赖可能变化的 nvme 编号。

建议两盘 RAID1，容量约 3.84 TB / 3.49 TiB，再建立启用 `prjquota` 的 XFS。
建议挂载池到 `/srv/docker-storage`，分别存放 `docker/` 和 `containerd/`。
之后绑定挂载回原有 `/var/lib/docker` 与 `/var/lib/containerd` 路径，保持
容器挂载路径、镜像快照引用及 Docker/containerd 配置路径稳定。

创建阵列和格式化会覆盖目标盘，必须先确认两盘均可清空及 RAID1 方案。
当前没有执行这些操作。

## 已完成的准备

服务器私有目录：

```text
/var/backups/docker-storage-20261020T163903Z
```

目录权限 0700，文件默认 0600；内含可能带凭据的配置与完整 inspect 信息，
不得复制进 Git 或输出到日志／聊天：

- 容器、数据卷、网络 inspect 和镜像清单。
- 原启停状态、重启策略、镜像 ID、容器规格摘要。
- `/etc/docker`、`/etc/containerd`、fstab、mdadm 配置及相关 systemd 配置。
- 目标盘稳定 ID 与无签名检查结果。
- 复制 dry-run 和依赖安装日志。

这份备份是配置与运行清单，尚不是 315.5 GiB 数据内容的完整备份。
已安装 rsync 3.5.0、xfsprogs 6.13.0；Docker、containerd 和
ccgateway-bridge-guard 仍保持运行，rsync daemon 未启动。

## 切换步骤

1. 确认目标盘方案后，重新检查目标稳定 ID，创建 RAID1 和 XFS；核验项目配额。
   保留现有系统阵列。等待阵列同步满足切换条件。
2. 在新池在线预复制两处数据。保留 owner、group、权限、时间、硬链接、
   ACL、xattr、稀疏文件和设备节点，使用 `rsync -aHAXSx --numeric-ids`。
   在线复制不能视为一致性备份，仍须最终停机同步。
3. 切换前刷新基线并停止新的入口请求，排空进行中的请求。记录所有容器原
   重启策略，暂时关闭自动重启；仅停止当前运行集合。停止控制器／Core 等
   会操作 Docker 的进程，随后停止 Docker socket、Docker 和 containerd，
   避免 socket activation 或后台协调器在复制中重建状态。
4. 确认没有遗留容器 task 和源目录内的活动挂载，做最终同步及校验。
   校验通过前不切换数据路径。约 249 万条目的同步与校验耗时应据实评估，
   不承诺固定几分钟的维护窗口。
5. 保留系统盘原目录作为回滚副本，不删除原数据。配置池挂载与两个绑定挂载，
   同步保存 fstab、mdadm 和必要 systemd 依赖。Docker/containerd 必须依赖
   正确的新存储挂载，挂载失败时禁止悄悄使用旧目录启动。
6. 启动 containerd、Docker 和 bridge guard。按依赖顺序，仅启动切换前运行
   的容器，恢复各自重启策略。使用原容器 ID，不运行 compose 重建，也不
   用旧镜像覆盖账号容器内原地更新过的 Worker/CLI。
7. 检查容器及镜像身份、数据卷、挂载、健康、Core 节点、CCGateway 路由和
   网络规则。原本停止的账号和历史容器保持停止。核对业务状态后恢复入口。

影响范围包括 Core、CCGateway、Caddy、Redis、其他运行中的 Docker 服务，
不限于账号 Worker。宿主机原有 bind-mount 源目录保持原路径。

## 回滚边界

- 切换前：源数据和原服务配置仍可直接使用。
- 切换后、尚无新写入：停止服务，恢复原目录／挂载／systemd 配置和原运行集合。
- 新存储已有写入：先停止写入并保护、回同步新数据，再回退。
  不能直接丢弃新存储写入并宣称无损恢复。
- 验收和保留期结束前，不删除系统盘旧数据。

本次存储迁移保留现有版本、容器和数据。工作区尚未发布的内存默认值与
账号硬配额功能另行发布；把旧卷搬到 XFS 不会自动给旧卷补上 10 GiB 配额。
