# 自有 GitHub 仓库在线更新

控制台左上角的核心版本提示支持检查公开 GitHub 仓库的稳定版 Release。
在“设置 → 在线更新”填写 `owner/repository` 或 `https://github.com/owner/repository`；
留空关闭远程检测。使用 GitHub.com 的公开仓库，不需要在控制台填写 GitHub token。

检测、导入和执行是三个阶段：查看版本与说明 → 导入受信签名发布 → 在核心升级页预检并创建集群计划。
切换仓库只改变来源，不改变网关的 `trusted_keys`。发布者必须使用网关已信任的 Ed25519 密钥签名。
旧版 sub2api 的后端二进制、源码 zip、Docker 镜像不能替代 next 核心发布包。

## 发布资产格式

每个稳定版 GitHub Release 附带：

- `next-core-manifest.json`：现有打包工具生成的签名信封，原样复制，不能修改 payload。
- `<bundle_digest>.tar.gz`：manifest 中每个平台声明的完整核心包，文件名、大小和 SHA256 必须一致。

Release tag、manifest 的 `release_id` 与 `core_version` 应指向同一个语义版本（允许版本前缀 `v`）。
不要将 next 与旧后端的稳定发布混用：检测使用仓库的 latest stable Release。
插件随核心包包含在 `builtin/` 中，插件本身继续使用已有的批准与独立发布机制。

## 从 OVH 已构建的签名包准备资产

先通过 Git 同步所需提交，在可信构建环境构建并运行 `package-release.sh`。
OVH 的 `prepare.sh` 已完成核心构建及签名，并将文件和摘要保存在 `~/sup2api-managed/publish/`。
随后使用 Python 3.11+ 导出待上传目录（命令不上传或部署）：

```sh
cd ~/sup2api/src
version=0.1.8
digest=$(sed -n 's/^manifest_digest=//p' "$HOME/sup2api-managed/publish/v$version.digests")
python3 next/deploy/gateway/github/prepare-assets.py \
  --publish-dir "$HOME/sup2api-managed/publish" \
  --manifest-digest "$digest" \
  --output "$HOME/sup2api/github-assets-v$version"
```

工具校验 payload 摘要及每个 bundle 的大小、SHA256，保留签名原文，不复制任何私钥。
它不替代网关的 Ed25519 验签。输出目录必须不存在，避免旧新资产混合。
将该目录中的 manifest 和所有 `.tar.gz` 上传到自有仓库相应 tag 的 Release 后发布为稳定版。
发布 GitHub Release 是独立的对外操作，导出命令不会自动执行。

如果核心数据库结构改变，打包必须传入正确的旧版 `schema-contract`，不能把新旧 schema 都填成新版。
保持原签名密钥；若确需轮换，先通过受控网关配置更新部署新的公钥，再发布由新密钥签名的包。

## 运行约束

- 核心处于网关托管模式时才可在线导入和执行升级；独立核心只显示自身版本。
- 查看更新需要升级读取权限；修改更新源需要设置管理权限；导入和执行需要升级执行权限及既有二次认证。
- 没有 Release、被限流、网络不可达、签名不可信、平台不匹配或资产不完整应显示检测失败或不可安装，不能冒充“已经最新”。
- 发布导入后仍需通过集群预检。前端不会绕过当前计划、插件状态、停止确认或迁移屏障。
- GitHub 资产下载可能返回重定向；使用独立受限下载策略处理，不开放任意来源或放宽原发布源策略。
  参见 [GitHub Release assets API](https://docs.github.com/en/rest/releases/assets)。
