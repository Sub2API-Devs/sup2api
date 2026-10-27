# 任务：控制器对已阻断的运行环境如实报 `blocked`，核心据此不再重复阻断

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

> 交给执行这项任务的 AI。请先通读全文，尤其是第 7 节的"操作约束"，有几条违反了会造成线上事故。
> 仓库：`D:\projects\golang\sup2api`（Windows，Git Bash），分支 `feat/next-platform`。始终用中文回复用户。

## 1. 背景

CCGateway 的每个账号对应控制器上的一个"运行环境"，由 app 和 egress 两个容器组成。核心（`next/server`）有一个定时扫描 `Run`，每轮对每个运行环境调用 `Reconcile`：

1. 先 `GET /accounts/<key>/status` 问控制器；
2. 如果账号启用、状态是 `ready`、修订号也一致，就什么都不做；
3. 否则 `PUT /accounts/<key>/config` 下发期望状态。账号停用时，控制器收到这个请求就执行 `block()`，停掉两个容器。

**问题在于**：控制器对已阻断的运行环境，`GET status` 返回的是 `pending`，不是 `blocked`。核心因此以为它没同步，每一轮都会再 `PUT config`。

- 线上 4 个节点每 3 秒扫一轮，只有一个停用账号（#20），控制器每分钟就要收 **80 次 `PUT config`**。
- 2026-10-11 发布的核心 v0.1.112（提交 `2fbe15cfc`）先在核心侧绕过了这个问题：节点阻断成功后记下修订号，10 分钟内不再重复，并把扫描周期改成了 60 秒。
- 这是权宜之计。正确的修法是控制器如实报 `blocked`。用户已同意这样改，并要求把绕过的代码删掉，只留一套机制。

控制器 README 和 CONTRACTS §49.2 写的 `status` 取值本来就是 `ready` / `pending` / `blocked`，列表接口 `GET /accounts` 也确实会报 `blocked`。只有单个运行环境的 `GET status` 没做到，所以这次其实是在修一个不一致。

## 2. 现状代码（行号以 `2293ade56` 为准）

### 控制器 `next/plugins/ccgateway/companions/controller/manager.py`（Python）

- `apply()`（约 574 行）：`desired` 里没有代理或 `enabled` 为假时，`return self.block(aid)`。
- `block()`（约 716 行）：
  - 从 `self.online` 里去掉该运行环境；
  - **只有状态文件存在时**才停掉 app 和 egress 容器，并把 `state['status']` 写成 `'blocked'`；
  - 返回 `{'account_id', 'status': 'blocked', 'revision': ''}`。
- `runtimes()`（约 766 行，供 `GET /accounts` 列表用）：只要状态文件里写的是 `blocked` 就报 `blocked`，不检查容器；其余情况调 `public()`。
- `public()`（约 786 行，供 `GET /accounts/<key>/status` 用，`handle` 里约 1258 行）：
  - `status` 只有两种：`'ready' if online 修订号 == state 修订号 else 'pending'`；
  - 完全不看 `state['status']`，这就是本任务的根源。
- `public()` 还被这些地方调用：`apply()` 内部、`connection()`（约 809 行，隧道和 `/connection` 的修订号核对）、`runtimes()`、worker 原地更新（约 1002 行）。
  - 这些调用方只看 `revision`，或拿它来清掉过期的 online 记录。
  - 阻断的运行环境 `revision` 始终为空，改 `status` 字段不影响它们。改完要逐个确认这一点。
- 重新启用时：`apply()` 调 `provision()`，`provision()` 里有 `state.update(..., status='pending')`，所以 `blocked` 会被自然覆盖。
- 测试：`test_manager.py`。用 `FakeDocker`/`FakeContainer`：`start()` 后 `status='running'`，`stop()` 后为 `'exited'`，删除后从 `containers.items` 消失。已有测试 `test_runtimes_lists_state_directories`（约 506 行）覆盖列表接口里的 `blocked`。
- 运行方式见 README 第 262 行：`python -m unittest -v test_network test_headers test_manager test_tunnel test_uploads test_runtime test_upgrade test_worker`。
  - 本机 Python 在 `C:\Python314`。`python3 -I` 会因找不到标准库而失败，改用 `py -3` 或 `python`。
  - 依赖见 `requirements.txt`。

### 核心 `next/server/internal/ccgateway/`（Go）

- `accounts.go` 的 `Reconcile`（约 256 行起）：
  - 开头调 `s.blockedRecently(key, d.Revision)`，命中就直接返回；
  - 然后 `GET status`，解码出的结构体里只有 `Status` 和 `Revision` 两个字段，判断条件是 `d.Enabled && status.Status == "ready" && status.Revision == d.Revision`；
  - 再 `putConfig`；成功且账号停用时调 `s.markBlocked(...)`。
- 同文件里还有：变量 `blockedFor`、类型 `blockedMark`，函数 `blockedRecently`、`markBlocked`、`forgetBlocked`，以及 `Kick()` 开头的 `s.forgetBlocked()`。
- `config.go` 的 `Service` 结构体：字段 `blockedMu sync.Mutex` 和 `blocked map[string]blockedMark`。
- `request_cache.go`：`forgetAccount()` 和 `invalidateRequests()` 末尾各调一次 `s.forgetBlocked()`。
- 测试：`request_cache_test.go` 里的 `TestDisabledRuntimeIsNotRewrittenEveryPass`。它模拟控制器对停用账号报 `pending`，断言 3 轮只 `PUT` 1 次，`Kick` 后会再 `PUT` 1 次。
- 控制台看到的账号状态由 `serveStatus`（约 693 行）给出：
  - 账号停用时核心直接回 `blocked`，不问控制器；
  - 启用时，如果控制器的修订号和期望不一致，核心会把状态改写成 `pending`，草稿则显示 `creating`。
  - 所以控制器新报的 `blocked`（修订号为空）不会出现在启用账号的控制台上。这一点本任务**不需要改**，但要确认。

## 3. 要做的改动

### 3.1 控制器

1. **加一个判断**，比如 `_is_blocked(aid, state)`：满足下面两条时为真，否则为假。
   - `state` 里的 `status` 是 `'blocked'`；
   - app 和 egress 容器**都没有在运行**（容器不存在 `NotFound` 也算没在运行）。

   第二条的用意：如果有人手动 `docker start` 了停用账号的容器，就不能报 `blocked`，要报 `pending`，让核心下一轮重新阻断。
2. **`public()`**：`_is_blocked` 为真时 `status` 报 `'blocked'`，`revision` 仍为空。其余逻辑不变。
3. **`runtimes()`**：改用同一个判断，让列表接口和单个接口一致。
4. **`public()` 新增布尔字段 `provisioned`**，值为 `bool(self.state(aid))`。

   用途是处理"没有状态文件"的情况：已删除或停用的账号，其运行环境可能从未创建或已被清理（核心的 `runtimeKeys` 会包含已删除和已停用的账号）。这时 `block()` 什么都不写，`GET status` 永远报 `pending`，修了第 2 条也一样会被反复 `PUT`。
   - **不要**用"没有状态就报 `blocked`"的办法：新建的启用账号在首次下发配置前也没有状态文件，控制台会短暂看到 `blocked`。
5. **补测试**（`test_manager.py`）：
   - 阻断后，`GET status`（即 `public()`）报 `blocked`，修订号为空；
   - 阻断后手动 `start()` 其中一个容器，报 `pending`；
   - 阻断后再以启用状态 `apply`，恢复正常的 `ready`/`pending` 判断；
   - 容器已被删除、但状态文件仍是 `blocked` 时，报 `blocked`（线上 #20 就是这种情况）；
   - 没有状态文件时，`provisioned` 为 false；
   - `connection()` 对阻断的运行环境仍返回 None（隧道和 `/connection` 回 409）；
   - 原有测试 `test_runtimes_lists_state_directories` 的期望可能要调整，因为它只改了状态文件、没有容器在跑。保持它测的本意即可。
6. **文档**：
   - 控制器 README 中 `status` 的说明（约 85 行），写明 `blocked` 的含义和 `provisioned` 字段；
   - CONTRACTS §49.14（控制器接口）如果列了 status 字段，也同步。

### 3.2 核心

1. **`Reconcile` 的跳过条件**改为：账号停用，并且（控制器报 `blocked`，或 `provisioned == false`）时直接返回，不 `PUT`。
   - 停用账号的期望状态只有"阻断"一种，所以不需要核对修订号。
   - 解码结构体加 `Provisioned *bool`，字段缺失（旧控制器）时按"已创建"处理，也就是照旧 `PUT`。
2. **删除绕过机制**：
   - `blockedFor`、`blockedMark`、`blockedRecently`、`markBlocked`、`forgetBlocked`；
   - `Service` 里的 `blockedMu` 和 `blocked` 字段；
   - `Kick()` 里的调用，以及 `request_cache.go` 里的两处调用；
   - `Reconcile` 里 `putConfig` 之后的 `markBlocked` 分支，恢复成 `return s.putConfig(ctx, key, d)`。
3. **改写测试 `TestDisabledRuntimeIsNotRewrittenEveryPass`**。假控制器在阻断后报 `blocked`，覆盖以下情况：
   - 首轮报 `pending` 时会 `PUT` 一次；
   - 之后报 `blocked` 时不再 `PUT`；
   - 控制器报 `pending` 且 `provisioned: false` 时不 `PUT`；
   - 字段缺失（旧控制器）时照旧 `PUT`；
   - 启用账号即使控制器报 `blocked` 也照常 `PUT`（这是重新启用的路径）。
4. **CONTRACTS**：
   - §49.18 里"停用账号不再反复写配置"那一条，改成新机制；
   - §49.3 里关于扫描的描述按需调整。

### 3.3 插件版本

- 控制器镜像打包在 ccgateway 插件包里，改了控制器就**必须**升插件版本，否则构建脚本会复用缓存的旧镜像。
- 把 `next/plugins/ccgateway/manifest.json` 的 `"version"` 从 `0.1.36` 改为 `0.1.37`（全仓库只有这一处引用这个版本号）。

## 4. 本地验证（提交前）

```bash
cd next/plugins/ccgateway/companions/controller && py -3 -m unittest -v test_network test_headers test_manager test_tunnel test_uploads test_runtime test_upgrade test_worker
```

```bash
cd next/server && GOOS=linux go vet ./internal/ccgateway ./internal/app && go test -count=1 ./internal/ccgateway ./internal/account ./internal/gateway
```

- Go 的 PG 测试由 `testutil.DB` 自动启动嵌入式 PG，确认这些测试**真的跑了**，没有被跳过。
- `./internal/app` 里的 `TestManagedRuntimeMigrationDoesNotBootstrap` 会失败，原因是迁移 `0046_proxy_real_ip.sql` 不能重复执行。这是已知问题，与本任务无关，不用修。
- 本机没有 gcc，跑不了 `-race`，在报告里如实说明即可。
- 插件模块（`next/plugins/ccgateway`）也要 `go test ./...`，因为改了 manifest。

提交信息用英文，风格参考 `git log`。推送命令：

```bash
HTTPS_PROXY=http://127.0.0.1:7890 git push origin feat/next-platform
```

## 5. 部署到 OVH

先说顺序和影响：核心和插件包是一起构建、一起升级的。核心升级完成后，要再"推送内置镜像"才会换上新控制器。

- 在这两步之间（几分钟），新核心配的是旧控制器。旧控制器不带 `provisioned` 字段、也不报 `blocked`，所以停用账号会回到每分钟约 80 次 `PUT`。
- 这是 v0.1.112 之前的常态，无害，推送完就恢复。

### 5.1 核心和插件

先确认 OVH 上最新的核心版本号（看运行手册 `next/docs/ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md` 顶部，当前是 v0.1.112），用下一个版本号，比如 `0.1.113`：

```bash
ssh ovh 'cd ~/sup2api/src && git fetch -q origin && git checkout -q <提交sha> && cd ~/sup2api-managed && ./build-core.sh 0.1.113 > build-0.1.113.log 2>&1; D=$(sed -n "s/^manifest_digest=//p" build-0.1.113.log|tail -1); echo digest=$D; docker compose exec -T sup2api-1 sub2api-shell import -manifest https://releases/sup2api/$D.json && python3 upgrade_observe.py $D'
```

- 构建发现插件版本是新的，会自动跑 `build-ccgateway-images.sh` 构建四个镜像，比平时慢。
- 正常输出以 `plan completed` 结尾。
- 如果卡在 "maintenance waiting for fresh follower observations"：
  1. 先确认各节点心跳是新的（看 `updater.nodes`）；
  2. 再在 `~/sup2api-managed` 目录执行 `docker exec sup2api-1 sub2api-gateway resume -config /etc/sub2api/shell.json -id <计划 id>`。

### 5.2 推送内置镜像（换控制器）

调 `POST /system/ccgateway/runtime/bundled`，请求体 `{}`，效果和控制台部署页的"推送并启用内置镜像"一样：

- 控制器自升级；
- #21/#22/#23 的 worker 原地替换（只换程序文件、重启进程，容器 ID 不变）；
- egress 不动；
- 账号 #20 已停用、没有容器，结果里它显示 failed 是正常的。

辅助脚本（在本地写入 `artifacts/probe/ccg_api.py`，再 `ssh ovh 'cat > /tmp/ccg_api.py' < artifacts/probe/ccg_api.py`）：

```python
import json, os, sys, urllib.request

BASE = 'http://127.0.0.1:3130/api/v1'

def env():
    out = {}
    for line in open(os.path.expanduser('~/sup2api-managed/.env')):
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.rstrip('\n').split('=', 1)
            out[k] = v.strip().strip('"').strip("'")
    return out

def call(method, path, body=None, token=None, timeout=60):
    req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    doc = json.loads(raw) if raw else {}
    return doc.get('data', doc)

e = env()
token = call('POST', '/auth/login', {'email': e['SUB2API_BOOTSTRAP_ADMIN_EMAIL'], 'password': e['SUB2API_BOOTSTRAP_ADMIN_PASSWORD']})['access_token']
path = os.path.expanduser('~/.tmpkey')
cmd = sys.argv[1]
if cmd == 'mkkey':            # mkkey <group_id>: key -> ~/.tmpkey (0600), prints only the id
    k = call('POST', '/me/api-keys', {'name': 'tmp-check', 'group_id': int(sys.argv[2])}, token)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write(k['key'])
    print('key id', k['id'])
elif cmd == 'delkey':         # delkey <id>
    call('DELETE', '/me/api-keys/' + sys.argv[2], None, token)
    if os.path.exists(path):
        os.remove(path)
    print('deleted', sys.argv[2])
elif cmd == 'bundled':        # push the plugin's bundled images
    print(json.dumps(call('POST', '/system/ccgateway/runtime/bundled', {}, token, timeout=1800), ensure_ascii=False))
```

```bash
ssh ovh 'python3 /tmp/ccg_api.py bundled'
```

完成后确认控制器版本：

```bash
ssh ovh 'docker inspect ccg-controller --format "{{.Config.Image}}"'
```

应为 `ccgateway-controller:0.1.37`。

## 6. 线上验收

1. **控制器如实报状态**。在 OVH 主机上执行（管理 key 只在主机上读取，不打印）：

   ```bash
   ssh ovh 'sudo sh -c ". /opt/ccgateway-runtime.env; curl -s -H \"Authorization: Bearer \$CCG_CONTROLLER_KEY\" http://127.0.0.1:8787/accounts/20/status"'
   ```

   期望 `"status": "blocked"`、`"revision": ""`、`"provisioned": true`。
2. **控制器请求量**。控制器监听 `127.0.0.1:8787`，本身不记请求日志，用 tcpdump 统计 60 秒：

   ```bash
   ssh ovh 'sudo timeout 60 tcpdump -i lo -nn -A -s 300 "tcp dst port 8787 and (tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420 or tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x50555420)" 2>/dev/null | grep -oE "(GET|PUT) /[^ ]*" | sed -E "s#/accounts/[^/]+/#/accounts/K/#" | sort | uniq -c'
   ```

   - 期望：`PUT /accounts/K/config` 为 0。
   - `GET .../status` 大约是"节点数 × 运行环境数"，现在约 12–16 次。
   - 刚升级完的第一分钟里，每个节点可能会有 1 次 `PUT`，属于正常。
3. **核心没有报错**：

   ```bash
   ssh ovh 'for n in 1 2 3 4; do docker logs --since 15m sup2api-$n 2>&1 | grep -ciE "ccgateway.*(fail|error)|not_synchronized"; done'
   ```

   期望全部为 0。
4. **本机 CC 端到端测试（用户要求，必须做）**。

   先建临时 key，分组 6 是 CCGateway 账号所在的分组：

   ```bash
   ssh ovh 'python3 /tmp/ccg_api.py mkkey 6' && ssh ovh 'cat ~/.tmpkey' > artifacts/tmpkey && ssh ovh 'rm -f ~/.tmpkey'
   ```

   两个提示词并行跑：

   ```bash
   cd /d/projects/golang/new-api; K=$(cat /d/projects/golang/sup2api/artifacts/tmpkey); P=/d/projects/golang/sup2api/artifacts/probe; ANTHROPIC_BASE_URL=http://15.204.107.38:3130 ANTHROPIC_AUTH_TOKEN=$K timeout 1700 claude -p "启动子代理 理解最近的 素材库功能 然后报告给我" --model claude-opus-5-5 --output-format stream-json --verbose --max-turns 80 --no-session-persistence < /dev/null > $P/t4_sub.jsonl 2>$P/t4_sub.err & ANTHROPIC_BASE_URL=http://15.204.107.38:3130 ANTHROPIC_AUTH_TOKEN=$K timeout 900 claude -p "你能使用websearch工具查询下北京的天气吗" --model claude-opus-5-5 --allowedTools WebSearch --output-format stream-json --verbose --max-turns 10 --no-session-persistence < /dev/null > $P/t4_web.jsonl 2>$P/t4_web.err & wait
   ```

   - 从 jsonl 的 `result` 事件看结果（Python 不好用的话就用 node 解析）：
     - `subtype` 应为 `success`、`is_error` 为 false；
     - 统计工具调用次数，以及子代理（`parent_tool_use_id` 非空）的消息条数；
     - 两次都要成功：WebSearch 有搜索、有来源，子代理最后交回了报告。
   - 网关侧按 key 查（`<id>` 为上面打印的 key id）：

     ```bash
     ssh ovh 'U=$(docker exec sup2api-pg-1 printenv POSTGRES_USER); D=$(docker exec sup2api-pg-1 printenv POSTGRES_DB); docker exec sup2api-pg-1 psql -U $U -d $D -Atc "select endpoint, model, status_code, account_id, count(*) from usage_logs where api_key_id=<id> group by 1,2,3,4"'
     ```

     期望 `/v1/messages` 全部 200；count_tokens 全部 404 是预期行为（CCGateway 不支持该端点）。
5. **清理（必须）**：

   ```bash
   ssh ovh 'python3 /tmp/ccg_api.py delkey <id>; rm -f /tmp/ccg_api.py ~/.tmpkey'
   ```

   ```bash
   rm -f artifacts/tmpkey artifacts/probe/ccg_api.py
   ```

6. **运行手册**：在 `ENVIRONMENT-RUNBOOK.md` 顶部加一段新版本说明，参照现有段落的格式：
   - 版本号、提交 sha、manifest 前缀、ccgateway 0.1.37、控制器版本；
   - 升级前后的请求量对比；
   - 本机 CC 测试结果；
   - 临时 key 已删除。

   提交并推送。

## 7. 操作约束（必须遵守）

- **绝不重建** #21、#22 的账号容器。只允许原地更新 worker，也就是推送内置镜像这条路径。不要对它们执行 `docker rm`、`docker run`、`compose up`，也不要重新授权。
- **绝不在 OVH 上运行** `single/deploy.sh`，也不要在 `release-*`、`next/deploy/gateway/ovh` 下执行 `compose up`。
- **代码只经 git 上 OVH**：本地提交 → 带代理推送 → OVH 上 `git fetch` 再 `checkout`。不要 scp 源码。
- **不要打印任何密钥**：API key、控制器管理 key、`.env` 内容都不行。临时 key 只经文件传递，用完删除。
- 如果需要改 OVH 的 CCGateway 远程配置（本任务应该用不到）：
  - 必须模仿控制台的 PUT；
  - 请求里要带上 `images` 和 `network`，否则会被清空。
- **不要执行** `taskkill /IM claude.exe`，会杀掉用户自己的会话。
- OVH 的 caddy 日志里有第三方的 x-api-key，不要转述。
- 编辑带 CRLF 换行的文件（比如 `PASSTHROUGH-DESIGN.md`）时，用编辑工具，不要用正则脚本整体替换。
- 原则：尽量不改客户端请求的结构；错误文字与官方逐字一致。本任务不涉及这两点，但不要顺手改相关代码。

## 8. 完成标准

- 控制器和核心的测试全部通过（已知的 0046 迁移失败除外），控制器新增的测试覆盖第 3.1 节第 5 条列的各种情况。
- 核心里已没有 `blockedRecently`、`markBlocked`、`forgetBlocked`、`blockedMu` 字段（`git grep` 为空）。
- 线上：
  - 控制器为 `0.1.37`；
  - `GET /accounts/20/status` 报 `blocked`；
  - 每分钟 `PUT config` 为 0；
  - 本机 CC 两个提示词都成功；
  - 临时 key 已删除；
  - 运行手册已更新并推送。
- 向用户汇报：改了什么，线上实测数据（升级前后对比），有哪些没做或没验证到（比如 `-race`）。
