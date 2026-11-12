# 均衡负载：去掉默认策略

> 日期：2026-11-12。状态：已实现，未合并、未发布。
> 分支：`claude/project-thread-9tr62c`（基于 `origin/develop` 的 `f7fb11b06`）。
> 契约：CONTRACTS §89。本文与代码不一致时以代码为准，并应改正本文。上一份：`DESIGN-2026-11-11-BALANCE-SESSION-METRIC.md`。
> 路径都相对 `next/`。

## 1. 背景

11-11 加会话指标时，“默认”策略保留了：它不读用量、按权重随机，默认配置下调度结果与 §89 上线前一致。用户看过之后的决定：

> 我们现在不是不用默认这个设置了吗？直接就默认的情况下，就基于会话来配置达到以前的目的就行了。

即开箱即用就是“流量 + 会话”。11-11 文档第 1.2 节列过它与旧默认的差异，这次是有意接受这些差异（第 5 节）。

## 2. 决定

1. 去掉“默认”策略，流量均衡永远开启。默认设置改为 `{"mode":"traffic","metric":"sessions","limit_load":false,"model_limits":false}`。
2. `mode` 字段保留，存库和响应里始终是 `traffic`。原因：滚动更新期间的旧核心（0.1.282 及以前）和回滚后的旧核心只在 `mode=traffic` 时做流量均衡；它们从 0.1.281 起认识 `sessions`。
3. `PUT` 不再校验 `mode`：传什么或不传都存 `traffic`，`metric` 照传入的存。`metric` 仍校验，非法值 400 `invalid_argument`。
4. 控制台去掉均衡策略一行、指标默认会话、不再置灰，始终提交 `mode: "traffic"`。
5. 能用的候选只有一个时不读用量：单个账号没有可比较的对象，读了也不改变结果。

## 3. 已存设置的归一规则

不迁移。读设置时（`balance_settings.go` `normalized()`）按下面处理，行在下次保存时才改写：

| 已存的行 | 读成 | 原因 |
|---|---|---|
| 没有行 | `traffic` + `sessions` | 新的默认值 |
| `mode` 不是 `traffic`（`default`、空、未知），`limit_load` 关 | `traffic` + `sessions`，`model_limits` 为 `false` | 当时指标和根据模型限速都是置灰的，不是用户选的 |
| `mode` 不是 `traffic`，`limit_load` 开 | `traffic` + 原指标，`model_limits` 不变 | 这两项是用户为上限负载选的 |
| `mode` 是 `traffic`，或缺 `mode` 字段 | `traffic` + 原指标，`model_limits` 不变 | 用户选的 |
| 任何行的未知 `metric` | `sessions` | 同默认值 |

行是解到默认值之上的（`loadSettingsRow`），所以缺 `mode` 的行按 `traffic` 处理。以前的 `PUT` 总是写整行，正常写出的行都带 `mode`。

`PUT` 不套用第二行的规则：旧控制台会带着 `mode: "default"` 提交，用户在页面上看到并保存的值应当原样存下。所以 `PUT` 只把 `mode` 置为 `traffic`，不改 `metric` 和 `model_limits`。

线上现有的 `traffic` + `rpm` 之类的行，归一后不变，行为也不变。

## 4. 兼容与回滚

- 新核心存下的行是 `mode=traffic`，旧核心（0.1.281、0.1.282）读到后照样做流量均衡，指标也认识。
- 没保存过的行（缺行或旧的 `default` 行）在旧核心上仍是旧的默认行为：不读用量、按权重随机。所以滚动更新期间，新旧节点对同一份设置的调度会不同，直到全部升级或有人保存一次。
- 滚动更新期间，控制台的请求可能落到旧节点。旧节点的 `GET` 返回未归一的旧值（没保存过的行是 `default` + `rpm`）。新控制台把 `mode` 当作 `traffic`（卡片的 `fromServer` 强制 `traffic`），指标照旧节点返回的显示。这时保存，存下的是 `traffic` 和那个指标，例如原来置灰的 `rpm`，之后就不会再归一成 `sessions`。不保存则没有影响；保存落到旧节点或新节点，存下的 `mode` 都是 `traffic`。
- 回滚到 0.1.281 之前的核心：它不认识 `sessions`，按 `rpm` 调度（11-11 文档 4.4）。

## 5. 与旧“默认”行为的差异

- 新加的号、刚恢复的号会先集中接新会话，直到会话数追上它按权重应得的份额；会话周期越长，持续越久（§89.3），能挡住它的只有它自己的上限。
- 每次不走粘性绑定的选号都读一次 Redis（`AccountLimiter.Usage`，失败换号复用同一份读数）。读失败按插件的值调度，不拒绝请求，与以前相同。
- 随机偏差会被纠正；会话数已按权重比分布或这一层空闲时，结果与按权重随机相同。
- 以前是“默认 + 上限负载”的行，现在在上限负载折减之后还会做流量均衡。负载高的号用量通常也高，会被再压低一些。
- 每次读用量（RPM、TPM、会话）是 Redis `TIME` 加一次 `EVAL`，两次往返；按模型时再多一组。并发读的是槽位。
- 用默认设置的部署，`usage_logs.sched_decisions` 会多出 `"plugin":"core"` 的记录：核心改变了哪个账号的层内占比就记哪个（§89.4）。以前默认设置下核心不改权重，没有这条。

## 6. 实现

- `server/internal/gateway/balance_settings.go`：默认值；去掉 `balanceModeDefault`、`balanceModes`、`active()`；`normalized()` 按第 3 节；`validate` 只校验 `metric`；`PUT` 置 `mode=traffic`。
- `server/internal/gateway/balance.go`：`readBalance` 在数 token（`count_tokens`）或能用的候选不到两个时不读；`byModel` 不再看 `mode`；`tierWeights` 读过用量就做流量均衡（`b != nil`），上限负载开着也做；`readUsage` 遇到未知指标时用默认指标兜底。
- 前端：`SchedulingSettings` 类型的 `mode` 只留 `'traffic'` 字面量；卡片 `LoadBalanceSettingsCard.vue` 的 `fromServer` 把 `mode` 强制为 `traffic`，去掉策略一行，指标默认会话，指标和根据模型限速不再置灰。
- `docs/CONTRACTS.md`：§89.1、89.2、89.3、89.5 就地修改，§18.2 的“默认不调整”同步改。

## 7. 测试

后端（`server/internal/gateway`）：

| 测试 | 断言 |
|---|---|
| `TestSchedulingSettingsNormalized`（新增） | 第 3 节的每一行：没有行、`default` + 关上限（`model_limits` 归 `false`）、`default` + 开上限 + TPM（`model_limits` 保留）、未知 `mode`、空 `mode`、缺 `mode`、`traffic` + RPM、未知指标 |
| `TestBalanceDefaultsBySessions`（替换原 `TestBalanceOffReadsNothing`） | 默认设置每次选号都读用量，会话多的号得到的新会话明显少，RPM 高不影响 |
| `TestBalanceLimitLoad`、`TestBalanceMergesPluginLoad` | 原来靠“默认策略不做流量均衡”单独看上限负载；现在打开 `model_limits`，靠请求模型的用量为空让流量均衡不起作用，原有断言（权重 ×10%、不改的账号不记录）保持 |
| `TestBalanceLimitLoadThenTraffic`（新增） | 上限负载开、按模型关：acc-1 RPM 90 上限 100、acc-2 RPM 90 无上限、acc-3 为 0，`tierWeights` 等于 `trafficWeights([0.1,1,1],[90,90,0])`，记录里 acc-1 的负载 90、权重为对应值 ×100。验证过：把流量均衡改成上限负载开着时不做，只有这个用例失败 |
| `TestBalanceNotReadForSingleCandidate`（新增） | 只有一个候选时不读用量。验证过：去掉这个判断它就失败 |
| `TestSchedulingSettingsAPIDB`（`db_test.go`） | 缺行时返回新默认值；`PUT` 传 `mode: "default"` 存 `traffic`、指标不变；不传 `mode` 也存 `traffic`（查库确认）；`mode` 非法不报错，只报 `metric`；旧的 `default` + 关上限的行读成 `sessions`、`model_limits` 为 `false` |
| `accountstats_test.go` | 测试用的限流器只实现了 `TryHit`，现在选号先读 `Usage`，会在拿槽位之前就 panic，测试“准入时 panic 释放槽位”就落空了（`require.Panics` 照样通过）。给它补一个返回空用量的 `Usage` |

其余用例里写的 `Mode: balanceModeDefault` 改成 `balanceModeTraffic`。整个 gateway 包里其他依赖“默认不读用量”的测试逐个看过：用 fake 限流器的用例没有会话用量，这一层空闲，权重不变；用真实限流器的用例账号优先级不同，不在同一层。

前端（`SchedulingPolicyView.spec.ts`）：没有行时指标默认会话、没有策略一行；后端返回旧的 `default` 时三项都可编辑，保存提交 `mode: "traffic"`；没有 `settings:manage` 时三项都禁用。

## 8. 不做的事

- 不迁移设置行，不删 `mode` 字段。
- 不加关闭均衡的开关。
- 不改流量均衡的公式和常量。
- 不升版本、不写 CHANGELOG、不部署：随下一次核心发布做。
