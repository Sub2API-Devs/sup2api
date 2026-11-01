# CCGateway guard 与 Go 控制器：已确认的决定

日期：2026-11-01。本文件优先于 01–05 中任何与之冲突的内容；实现、测试、上线都以此为准。

## 用户决定（2026-11-01）

| # | 事项 | 决定 |
|---|---|---|
| D1 | 控制器 DNS | `CCG_GUARD_CONTROL_DNS` **默认开启**，只放行控制器到 Docker 上游 DNS 服务器的 53 端口（UDP 和 TCP）。上游取自 dockerd 实际给容器用的 resolv.conf：宿主机是 systemd-resolved 时为 `/run/systemd/resolve/resolv.conf`，否则为 `/etc/resolv.conf`，去掉回环地址。IT-S02 必须实测解析成功 |
| D2 | guard 镜像 | 由 CI 构建并**推送到 GHCR**（`ghcr.io/sub2api-devs/ccgateway-guard`），核心 `images.go` 固定其 digest |
| D3 | 核心安装脚本演练环境 | 在 ovh 上开一次性特权 dind 容器 |
| D4 | 现网（docker-py 建的）网关 | `recreate` 一律拒绝；纳入 compose 只在 S6 维护窗口手工做 |
| D5 | 一次性任务的能力集合 | 只允许 `CHOWN`、`DAC_OVERRIDE`，**不含 `FOWNER`** |
| D6 | `/run/xtables.lock` | S0 确认 ovh 上无其他程序使用后**不挂载** |
| D7 | AppArmor | 不预先允许 `apparmor=unconfined`；遇到时停下来问用户 |
| D8 | 接管前拦截 | 核心加拦截：控制器未被 guard 接管时，拒绝把它自升级成带 `guard-api=1` 标签的镜像（返回 `controller_adopt_required`），并给控制台加文案。由主控协调相关组件更新 |
| D9 | 生产接管 S4 | 健康检查 60 秒不通过就自动回滚（预先批准）；由主控协调完成各组件更新 |
| D10 | 收尾删除 | 观察期后确认无误，直接删除旧目录、旧服务文件和 Python 镜像，不再询问 |

## 主控合并核对得出的统一口径

| # | 事项 | 口径 |
|---|---|---|
| U1 | guard API | 以 03 为准（端点、字段、错误码）。02 的 `guardapi` 按 03 §13.1 的变化修改 |
| U2 | `container_identity` | guard 返回 Docker 原始 inspect，由控制器计算（03 §13.2） |
| U3 | compose 模板 | 只有一份，嵌在核心里（04 §2.3 的位置与变量机制）。guard 服务的权限、挂载以 03 §9.5、§9.6 为准：只加回 `NET_ADMIN`、`SYS_ADMIN`、`SYS_PTRACE` |
| U4 | 一个 guard 服务一个实例 | 隔离实例是独立 compose 项目，带自己的 guard（03 §1.4） |
| U5 | 数据搬迁 | 由核心 shell 脚本做（04），guard 不做 |
| U6 | 鉴权失败 | 令牌或来源错误一律 401；`.2` 不是 compose 起的控制器时 403 `controller_unguarded` |
| U7 | 缺陷修复 | 按 05 §8 |
| U8 | 版本号 | 核心 0.1.227，插件 ccgateway 0.1.119（若期间有其他发布则顺延） |
