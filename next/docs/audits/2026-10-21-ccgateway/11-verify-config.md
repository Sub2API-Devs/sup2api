# 11 交叉核验：分层配置 / 前端账号编辑 / 账号生命周期 / 自动模型列表

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

核验日期 2026-10-21。基线：本机 `feat/next-platform` HEAD `43d576838`；线上源码 `9dfcb60b9`（core 0.1.173）。
对象：报告 M（00/01/02/03）、报告 A（`Downloads/1 - 副本.txt`）、报告 B（`Downloads/1.txt` 与 `artifacts/ccgateway-audit-20261021/审核报告.txt`、`ui-config-findings.json`、`ui-reproductions.spec.ts`、`config-reproduction_test.go`）。三份材料只当作待验证的线索。

方法：
- 每条结论都回到源码逐行核对。
- 用 `git show 9dfcb60b9:<file>` 和 `git merge-base --is-ancestor` 判断问题是否已在线上。
- 自写临时测试复现，跑完已删除，`git status --short` 中没有新增残留：
  - `server/internal/ccgateway/zz_verify_config_test.go`：真实 PG，走 HTTP 路由；
  - `server/internal/account/zz_verify_config_test.go`：真实 PG，走 HTTP PATCH，再执行 `Reconcile`，抓取发给假控制器的 revision；
  - `web/src/views/accounts/zz-verify-config.spec.ts`：vitest，用真实 `SButton`。
- 没有 ssh，没有访问生产。

在线判定依据：`9dfcb60b9..43d576838` 之间只有 8 个提交，包括 08035b19c（身份映射）、50da2ceac、83107b8ee、9f211dc09 等。凡依赖 `request_identity_sources` 的结论，都只存在于未推送代码。

## 1. 核验表

| # | 结论 | 来源 | 判定 | 关键证据 | 修正严重度 | 线上 |
|---|---|---|---|---|---|---|
| 1 | 全局策略写 `schema_version:2`，核心只收 1，保存 400，同页其他设置一起失败 | M-L1 = A-C1；**B 漏报** | **成立** | `RequestPolicySettings.vue:50,58`；`requestPolicy.ts:128,147`（本地校验接受 2）；`contracts/features/runtime.go:135`、`catalog.go:7`；`request_policy.go:41-44`。PG 复现见 §2.1 | P1（管理面必现；请求面不受影响） | 是（9dfcb60b9 引入） |
| 2 | 删除分组后，孤立的 `cc_feature_groups` 键让所有 remote-config 保存失败 | M-L2（02-F3）；A、B 漏报 | **成立** | 分组删除 `group/group.go:406` 只执行 `DELETE FROM groups`，全仓库无其他清理；`RemoteSettings.vue:236` 整表提交；`config.go:554-563` 逐键查 EXISTS；`:583-588` 换成通用文案。PG 复现见 §2.2 | **P2**（M 定 P1；删除该行即可恢复，但报错误导） | 代码在线；是否触发取决于是否删过配置了策略的分组 |
| 3 | 编辑器每次都带 credentials，随机 nonce 重新加密，revision 变化，runtime 重新激活 | M-L3（01-F2）对 A“revision…改动必然下发…正确” | **M 成立；A 的“正确”片面** | `AccountEditor.vue:549`；`handlers.go:1137-1159,1264`；`creds.go:306` 无条件 `Encrypt`；`secret.go:37-45` 随机 nonce；`ccgateway/accounts.go:135` revision 拼 `encode(credentials_enc,'hex')`。PG 定论见 §2.3 | P1（叠加 L4：管理员改名即可让在用客户端收到 409） | 是（线上 revision 还多拼 `a.status`/`p.status`） |
| 4 | `account_lifecycle_sync` 无自愈 | M-L5（01-F1）；A、B 漏报 | **成立，且影响比 M 写的更重** | 唯一写入点：`lifecycle_status.go:12,20`、`proxy.go:781`；`deliverAccountLifecycle`（`lifecycle_events.go:90-139`）只在投递时写，并带 `updated_at` 和 generation 条件；`Reconcile` 拿不到 try-lock 就返回 nil（`accounts.go:328-334`）；60 秒对账不回写状态。补充：`quota_refresh.go:265` 排除非 applied 账号，快照 30 分钟后变 `quota_stale`（`availability.go:127`），返回 UNKNOWN，managed 账号被**硬拦截** | P1（触发频率未实测） | 是 |
| 5 | `save()` 无重入守卫，回车可重复提交，apikey 可建出重复账号 | A-C4；M、B 未报 | **部分成立** | `save()` 确实没有 `if (saving.value) return`（`AccountEditor.vue:589-602`），服务端也没有幂等键或唯一约束。但保存按钮是表单的默认提交按钮，`:loading="saving"` 会让 `SButton` 设置 `disabled`（`SButton.vue:41,57`）。HTML 规定默认按钮禁用时，回车隐式提交不生效。schema 模式在 `saving=true` 之前只有微任务，用户事件插不进来。vitest 见 §2.4 | **P3**（A 定 High） | 代码在线；ccgateway apikey（schema 模式）在 UI 上无法触发 |
| 6 | models/fetch 的 `proxy_url` 绕过 proxy:manage | A-C6 | **部分成立（属于契约设计）** | `account/models.go:68-78` 确实不查 proxy 权限；但 CONTRACTS.md:1046 明文规定该接口的 `proxy_url`“不需要代理权限”。`HTTPClientFor`（`proxy/resolve.go:123-131`）只拒绝**字面**私网 IP，域名解析到私网不拦，`/proxies/probe` 与保存路径同样如此 | P3（策略不一致加通用的 DNS 私网缺口，不是实现越权） | 是 |
| 7 | 编辑自动模型账号只改名称，也会提交 `model_mapping:{}` | B（UI-01 / F04）；M、A 漏报 | **成立** | `fillForm` 先 `setSaved`，再 `applyDefaults(at)`（`AccountEditor.vue:432-433`）；`applyDefaults` 把 mapping 重置为 manifest 默认值（`useModelsEditor.ts:204-208`），ccgateway manifest 没有 `defaultModelMapping`；后端 `COALESCE($14)` 写入 `{}`。与 CONTRACTS §59.5“模型映射不受开关影响”相悖。vitest 见 §2.5 | P2 | 是 |
| 8 | “移除失败模型”假成功 | B（UI-02 / F05）= M-03 F-06 | **成立** | `AccountModelTest.vue:69` 的 `removable` 不看 `auto_models`；`:194` 只 PATCH `{models}`；`before_update` 按自动模式覆盖（`handlers.go:1186-1207`，插件 `models.go:33-45`）；UI 按本地 `drop` 删行并提示成功，忽略 `saved.models`。vitest 见 §2.5 | P2 | 是 |
| 9 | 全局 PUT 漏掉 identity 字段时，身份策略静默重置为 replace | B（CONFIG-01 / F06）= M-02 F5 | **成立** | `config.go:357-380` 只给 billing 和 attachment 做了“nil 保留”；Go 复现见 §2.6。当前 UI 的 `normalizeRequestPolicy` 总会带上该字段（`requestPolicy.ts:139`） | **P3**（M/B 定 P2；只有旧 UI 缓存或第三方 API 会触发） | 否（08035b19c 未推送） |
| 10 | direct 下界面隐藏身份设置，但配置仍生效 | B（UI-03 / F07）= M-02 F6 | **成立** | `RequestPolicySettings.vue:155-161` 在 direct 下只显示 directHint，`identity-sources`（`:178-193`）落在 `v-else` 里；`resolvedWorkerPolicy` 在 direct 下只清附件和计费（`feature_policy.go:274-277`）；engine identity 不区分模式（`request_command.go:209-227`） | P2 | 否（未推送） |
| 11 | 老账号 `auto_models` 为 NULL，任意 PATCH 覆盖手工列表；A 称“缺省=自动…并发保护…正确” | M-03 F-04 / M-01 F6 对 A | **M 成立；A 描述的机制属实，结论不矛盾，A 没看到存量影响** | 迁移 0055 只有 `ADD COLUMN`，没有回填；`models.go:34-36` 只有显式 false 才不打补丁；列表页 `{status,schedulable}` 和行内 `{priority,weight}` 的 PATCH 都会经过 `before_update`；`auto_models_test.go:62-71` 把“改名即覆盖”写成了断言。A 引用的 `WHERE updated_at=$2 AND auto_models IS NOT FALSE` 只保护 `refreshAutoModels`（`account_patch.go:110-111`），不保护 PATCH 路径（F-13） | P2 | 是（81f7bacde 已在线上；升级时所有存量账号都是 NULL） |
| 12a | 自动模式下映射别名不可调度 | M-03 F-05 | **成立** | `ServesModel` 按映射前的模型匹配（`core/ports_identity.go:119-131`），候选过滤见 `gateway/model_references.go:112-126`；自动列表不含映射键（`models.go:44`）；`mergeModels` 在自动模式下被拦截（`AccountEditor.vue:157-163`）。另外第 7 条会在下次编辑时清空映射 | P2 | 是 |
| 12b | 缺少 `claude-haiku-5-5` | M-03 F-08 | **部分成立** | `DefaultModels` 共 11 个，其中没有它（`models.go:12-16`）。CLI 2.1.304 二进制模型目录有 `{ id: "claude-haiku-5-5", family: "haiku" … }`，5.5 别名表 `haiku.default = "claude-haiku-5-5"`；官方请求 fixture 列出了 “Haiku 5.5”。上游是否对订阅账号开放未验证 | P3（M 定 P2） | 是 |
| 12c | Pro 账号请求 Fable 的 403 被当作凭证失效 | M-03 F-09 | **部分成立** | `classify.go:113-119` 把所有 401/403 判为 DISABLE，原因文案是 “rejected credentials”；`dispatch.go:770-784` 降为 60 秒冷却，若管理员配了规则则停用账号；订阅只在 health/reauth/创建三处写入。Pro 请求 Fable 时上游实际返回码未验证 | P3（M 定 P2） | 是 |
| 13 | `thinking_disabled_compat` 等 4 个旧字段在 build/direct 下不生效 | M-02 F4；A 称“三态完整、合并集中” | **M 成立；A 的说法属实但与是否生效无关，A 漏报** | engine 有 `RequestMode` 时一律走 `serveRequestCommand`（`main.go:99-101`）；`buildRequestPolicy` 只解析 sources/billing/identity/relay_mode/cli_version（`request_command.go:38-45`）；4 个字段只在 native 的 `passthrough.go:95,116-117` 使用。另外 A 第四节称“唯一实现 applyFeatureOverrides”，与它自己第六节“前后端各一份三层合并”（`requestPolicy.ts:179-181` 的 `mergeFeaturePolicy`）自相矛盾 | P2 | 是（线上曾开 omit，现已失效） |
| 14a | A：创建事务原子 | A | **成立** | `handlers.go:1017-1048` 在同一个事务里完成插入、`adoptPreparation`/`AdoptDraft`、审计和事件 | — | — |
| 14b | A：draft 双采有 `account_id IS NULL` 保护 | A | **成立** | `drafts.go:403-411`；`preparations.go:371`（另含 state、expires、proxy、settings 条件） | — | — |
| 14c | A：删除语义完整 | A 对 M-01 F3/F4 | **A 片面；M-F3、F4 成立** | 单个删除的正常路径正确（`handlers.go:1442`，`MarkAccountDeleted`）。F3：`accounts.go:345-350` purge 失败直接 `return e`，不会退回到 `putConfig(enabled=false)`。F4：`PurgePluginAccounts`（`purge.go:20-54`）只软删、删分组、发事件，没有调用 `MarkAccountDeleted`，`PurgeRequested=false`，只会停止容器，不清除数据卷 | F3 P2 / F4 P2 | 是 |
| 14d | A：reauth 原地进行，失败时旧凭据不受影响 | A，与 M-01 一致 | **成立** | M-01“已核对”同结论（`engine/auth.go:146-258`） | — | — |
| 14e | A：feature_revision 乐观锁并发保护到位 | A 对 M-02 F9 | **部分成立** | 锁本身有效（`config.go:386-389`）；但冲突后的“重试”只更新版本号（`RemoteSettings.vue:187-193`），旧草稿整份重发，会覆盖他人改动 | F9 P2 | 是 |

本主题另外核到的同类结论：

| # | 结论 | 来源 | 判定 | 证据 | 严重度 |
|---|---|---|---|---|---|
| E1 | 前端每次保存都把 `cli_version` 固化为 2.1.304 | M-02 F8 | 成立 | `requestPolicy.ts:141` 写死 `defaults.cli_version`；`sameRuntimeConfig` 比较版本后 Kick 全部运行时 | P3（现网就是 304，不会触发） |
| E2 | 前端不校验 identity map（`erase` 被当作合法） | B F08 / M-02 F12 | 成立 | `validRequestPolicy`（`requestPolicy.ts:145-160`）没有 identity 分支 | P3，未推送 |
| E3 | 已存储的覆盖严格解码，版本回退时整层失效 | M-02 F7 | 成立（代码） | `FeatureOverrides.UnmarshalJSON` 用 `DisallowUnknownFields`（`feature_policy.go:34-56`），用于读取 DB | P2 |
| E4 | 自动列表不随插件或 CLI 升级刷新 | M-03 F-07 = B“模型目录更新后需保存才重算” | 成立，三方一致 | `before_update` 只有用户保存和订阅变化两个调用点 | P2/P3 |
| E5 | `newRequestPolicy()` 也带 schema 2 | M-02 F14 | 成立，但目前走不到 | `requestPolicy.ts:178`；`RemoteSettings.vue:153` 的条件恒为假 | P3（修 L1 时一起删） |

## 2. 争议与关键条目的详细论证

### 2.1 L1：schema_version（A 与 M 一致，B 漏报）

PG 临时测试先 GET `/system/ccgateway/remote-config` 取回已保存的 `request_policy`（`schema_version=1`），再模拟前端 PUT：设置 `relay_mode=direct`，同时修改网络。

```
GET request_policy.schema_version=1
schema_version=2 (+network change) -> 400 {code:invalid_argument message:unsupported request policy schema_version}
  stored network={Pool:10.0.0.0/8 Allocation:random} relay_mode=build      <- 网络改动一并丢失
schema_version=1 (+network change) -> 200
  stored network={Pool:10.250.0.0/16 Allocation:sequential} relay_mode=direct
```

错误在 `BindJSON` 阶段就返回（`RequestPolicy.UnmarshalJSON` → `ValidatePolicySchemaJSON`），整个请求体被拒。前端失败后不会重新 `assign`，所以 `requestPolicy` 一直保持 2，刷新页面之前，这一页的任何保存都会失败。

B 的复现 spec 渲染过 `RequestPolicySettings`，但只检查了 DOM，没有检查 PUT payload，因此漏掉了这一条。

### 2.2 L2：孤立分组键（只有 M 报告）

```
save group policy -> 200 rev=1
(DELETE FROM groups WHERE id=gid，等同 group.go:406)
GET after delete -> 200 cc_feature_groups=map[1:{…relay_mode:direct}]        <- 孤立键仍返回给前端
network save with full table -> 400 "The configuration could not be saved: check the request policy, beta mappings, private IPv4 CIDR…"
network save omitting table  -> 200
save removing orphan ({})    -> 200
```

- 结论成立。
- 报错是通用文案，完全不提分组。
- 只有整表提交的前端会被卡住，`RemoteSettings.vue:236` 正是整表提交。
- 恢复办法：在“分组默认”里删掉显示为 `#id` 的那一行。这条路径存在，所以严重度从 P1 下调为 **P2**；但排障成本高。

### 2.3 L3：revision 变化（M 与 A 的直接冲突，已定论）

在 account 包写了 PG 测试，走真实的 `PATCH /accounts/:id`，然后执行 `ccgateway.Reconcile`，读取发给假控制器的 `revision`：

```
initial                                   revision=800232933b65… cred_enc=0119e24a…
PATCH name only (不带 credentials)          revision=800232933b65… cred_enc=0119e24a…   <- 不变
PATCH name + 编辑器回传的原凭据              revision=a768962349c0… cred_enc=0170da3a…   <- 变
PATCH name + credentials:{}                revision=beb6d476c03f… cred_enc=01eb8dae… settings={}
PATCH name + credentials:{} 再一次           revision=4e56cfd382b2… cred_enc=0106e9e5… settings={}
r3==r4 false   (明文、settings 完全相同，只有 GCM nonce 不同)
```

结论：

- 核心不比较新旧明文。只要 `hasCredentials()` 为真（`{}` 也算），就会重新 `Encrypt`，nonce 每次随机（`secret.go:38-45`）。
- revision 直接拼接密文 hex，所以**凭据没变也会换 revision**。
- 编辑器在非孤儿账号上**每次**都带 `credentials`（`AccountEditor.vue:549`），vitest 也确认 PATCH 体里有 `credentials`。所以“只改名称”必然触发 revision 变化。
- A 说的“改动必然下发”本身没错，但漏掉了反面：不改也会下发。这条应改判为缺陷。

控制器侧（`manager.py:749-868`，按代码读）：

1. revision 不同，跳过“已就绪直接返回”；
2. `online.pop`，置 `syncing`；
3. fingerprint 不变，所以不重建 app；`sing-box.json` 相同，所以复用 egress；
4. 仍然要跑 sing-box check 一次性容器、nft helper，再做最长 10 秒的代理探测；
5. 这段时间 `public()['revision']` 为空，`connection()` 返回 None，新请求得到 409 `not_synchronized`（`client.go:180-187, 261-263`）。

如果代理探测失败，runtime 会一直停在未同步，直到下一次对账成功。

### 2.4 A-C4：save() 重入（从 High 下调为 P3）

vitest 使用真实 `SButton`，新建 ccgateway apikey 账号，POST 挂起：

```
ITEM5 button type= submit disabled before submit= false is form default button= true
ITEM5 POSTs after two submits in one task = 2        <- save() 确无重入守卫
ITEM5 button disabled while POST pending = true      <- 浏览器层的点击和回车隐式提交都被挡住
ITEM5 POSTs after a later submit event = 3           <- jsdom 的 trigger 无视 disabled，真实浏览器不会这样
```

- 只有在同一个任务里发出两次 submit，才会产生重复 POST，真实用户做不到。
- schema 模式下，`invalidSection` 和 `collectCredentials` 在合法时只经过微任务；`saving=true` 和 DOM 禁用会在下一个用户事件之前完成。
- 只有 iframe/native 表单的 `validate()` 跨宏任务时才有可乘之机，ccgateway 两个类型都是 schema 模式。
- 服务端没有幂等键，这一点属实。建议仍在 `save()` 开头加守卫做纵深防御，按 P3 处理。

### 2.5 第 7、8 条：前端模型数据（B 报告，M 只报了第 8 条）

```
ITEM7 PATCH model_mapping = {} auto_models = true has credentials = true      (已保存映射 {claude-sonnet-5: claude-opus-5})
ITEM8 PATCH body = {"models":["claude-opus-5"]} rows shown = ["claude-opus-5"] server models = ["claude-sonnet-5","claude-opus-5"]
```

第 7 条：

- 自动模式账号每次打开编辑器，映射都会被清成 `{}` 并提交。
- 在自动模式下新加的映射，只能撑到下一次编辑。
- 叠加 12a（别名本来就不可调度），自动模式下的映射几乎无法使用。

第 8 条：

- 服务端把列表还原了，前端仍显示“已移除”。

### 2.6 第 9 条：identity 遗漏

纯 Go 调用 `mergeConfig` 加 `ResolveFeaturePolicy`。旧值 `identity=client`、`billing.cc_version=worker`，入参两者都省略：

```
identity="replace" billing="worker" revision=8   (revision 由 7 变 8，无冲突)
```

结论成立。当前前端总会带 `request_identity_sources: {...saved}`，所以只有旧页面缓存（0.1.173 时期的页面没有这个字段）或外部 API 调用才会触发，而且该字段尚未发布。下调为 P3；建议在发布 08035b19c 之前和 billing 采用同样的语义。

### 2.7 第 4 条：生命周期同步无自愈的实际后果（补充 M）

M 写的影响是“额度不刷新，手动刷新 409”。继续追下去：

1. managed 账号的准入取决于额度快照（`availability.go:37`，apikey 直接放行）；
2. 快照超过 30 分钟就是 `quota_stale`，返回 UNKNOWN；
3. UNKNOWN 由核心硬拦截（`gateway/availability.go:170-182`）。

所以 OAuth 账号一旦停在 pending/failed，大约 30 分钟后就会**不可调度**，单账号分组直接 503。这比 M 写的严重；P1 维持不变。

与 L3 叠加：每次编辑都会先 `markLifecyclePending`，事件投递与请求路径 Kick 争同一把 try-lock 的机会也随之增加。

## 3. 三方在本主题的准确度评价

**M（主控）：本主题最准确。**

- 核心结论（L1、L2、L3、L5、F3、F4、F-04、F-05、F-06、F4/F5/F6、F8、F9）全部经源码或复现证实。
- L3 是本次唯一需要定论的冲突，PG 测试支持 M。
- 偏差有三处：
  - L5 低估了后果（实际会导致账号不可调度）；
  - L2 定 P1 偏高（存在 UI 恢复路径），F-08、F-09 定 P2 偏高（依赖未验证的上游行为）；
  - 漏报了第 7 条（编辑清空映射）。

**A：正确识别了 L1，其余在本主题偏乐观或偏重。**

- C4 的触发路径在真实浏览器里不成立（按钮禁用加隐式提交规则），High 定级过重。
- C6 与 CONTRACTS §21.4 的明文设计相冲突，应归为“策略不一致”。
- “已核对正确”清单中：
  - revision 一条与事实相反（应判为缺陷）；
  - “删除语义完整”忽略了 F3、F4；
  - “并发保护到位”忽略了 F9；
  - “合并逻辑唯一实现”与它自己第六节矛盾。
- 漏报 L2、L3、L5、第 7、8 条和 F4。
- 它对 `auto_models` 机制的描述准确，但没有评估存量 NULL 账号受到的影响。

**B：前端交互类问题抓得准，复现扎实。**

- 第 7、8、9、10 条和 E2 全部成立，且有可运行的复现。第 7 条是三方中独有、并已在线上的数据丢失问题。
- 漏报 L1：渲染过策略组件，但没检查提交载荷。也漏报 L2、L3、L5。
- 它的 identity 相关条目都只在未推送代码中，线上不受影响，报告里没有标注这一点。
- 第 9 条的严重度略高（当前 UI 不会触发）。

## 4. 清理确认

- 临时文件 `server/internal/ccgateway/zz_verify_config_test.go`、`server/internal/account/zz_verify_config_test.go`、`web/src/views/accounts/zz-verify-config.spec.ts` 已删除。
- 运行日志在仓库外 `%TEMP%\ccg-verify-config-run1.log`。
- `git status --short` 与审核开始时一致，只多了本报告；本报告位于已未跟踪的 `next/docs/audits/2026-10-21-ccgateway/` 目录内。
- 第一次运行 ccgateway 包时 10 分钟超时。原因是同包里其他核验员的 `zz_verify_path_test.go` 在那一时刻挂起；本组用例单跑时每条都在 1 秒内完成。
