# 第三方代码（vendor）命名：name-v4（组 4，下标 4）

范围：`analysis/segments/naming-vendor.json` 第 4 项（下标 4），33 个声明、起止 `dirs` 均为 `vendor/private-unresolved/index.js`，与派活消息一致。全部落在同一个 chunk `chunk-1ny7cxrt.js` 的 880,691–1,192,779 字节区间，是 Claude Desktop 的 `private-unresolved` 私有包（托管配置 `@ant/managed-config` 的桌面侧）。名字表 `artifacts/tmp/lead/final8`。

## 结果

| 项 | 数量 |
|---|---|
| 命名条目 | **1,915**（`naming/semantic-v4.jsonl`，全部 `cat 批次 >> 目标` 追加） |
| 覆盖声明 | 33 / 33（逐一 `show` 过） |
| 声明区间内唯一压缩绑定 | 1,914 |
| 区间外（`@86607`，模块 getter `___`，`require` 包装） | 1 |
| `annotate check naming/semantic-v4.jsonl artifacts/tmp/lead/final8` | **0 problems，0 suffixed by conflicts** |
| 覆盖复核（`artifacts/tmp/v4/chk*.txt`：final8 + 本表逐声明重渲染） | 剩余 `_K` **0** |

置信度分布：0.85 × 146、0.8 × 1,094、0.75 × 492、0.7 × 126、0.65 × 16、0.6 × 41。

## 覆盖面（本组是什么代码）

`vendor/private-unresolved/index.js` 一个文件里是 30 多个 CJS 模块，`x(function (e) {...})` 懒初始化，每个声明是一个配置段 schema：

- 配置段 schema：`OtlpConfig`、`DictationConfig`、`TokenLimitsConfig`、`Cowork/Code/ChatSurfaceConfig`、`ExtensionsConfig`、`AutoUpdateConfig`、`FeatureDiscoveryConfig`、`BootstrapConfig`、`LifecycleConfig`、`ModelsConfig`、`TelemetryConfig`、`McpConfig`、`WorkspaceConfig`、`BuiltinBrowserConfig`、`AuthenticationConfig`、`AppearanceConfig`、`BannerConfig`/`PASSTHROUGH_FIELDS`、`SessionRetentionConfig`、`SelfHostedConfig`、`ManagedConfig`、`FlatManagedConfig`。
- 基础设施：扁平键表（`FLAT_KEYS`/`FLAT_KEY_TO_NESTED_PATH`/`FORMER_NESTED_PATHS`）、字段元数据读取（`getFieldMeta`/`flatConfigKeys`/`enabledScopes`）、schema 裁剪与类型/JSON Schema 生成（`pruneSchema`/`emitTypeSource`/`buildHybridServableJsonSchema`）、脱敏（`redactedSnapshot`/`reducedSnapshot`/`redactSensitiveKeys`）、bootstrap 摄入与校验（`parseBootstrapConfig`/`collectConsentTargets`）、hybrid/group servable 派生、legacy 键与工具策略放宽（`admitLegacyCredentialKinds`/`admitLegacyToolPolicyValues`）、barrel 导出（`chunk-1ny7cxrt.js#ni`，`__exportStar` 转发 20 多个子模块）。

## 做法

- 每批先 `show` 1–3 个声明到 `artifacts/tmp/v4/dNN.txt`，用自写脚本 `artifacts/tmp/v4/summ.mjs` 汇总成「绑定键 + 本地压缩名 + 引用次数 + 上下文行」的摘要（`sNN.txt`）再读，避免反复读同一段大代码；每批写完立即 `cat 批次 >> naming/semantic-v4.jsonl` 并 `check`。
- 模块变量按导出内容命名（`zodModule`、`settingsFieldModule`、`configHelpersModule`、`messagesModule`、`flatConfigModule`、`managedConfigModule`、`clusterRegistryModule`…）；`x(function(e){...})` 的模块导出参数统一 `<模块>Exports`；`Object.defineProperty(o,"name",{get})` 转发块按被转发符号命名；导出的公开函数（`isPlainObject`、`parseBuiltinRule`、`resolveRedactPolicy`、`evaluateInference`…）直接用导出名。
- 同一函数内避免重名；对于大量「同一段代码里 e/t/n/o」的谓词（`show`/`warn`/`egressRequirements`/`checkDropped`），按语义起 `settings`/`models`/`node`/`flatKey`/`options`/`formatter` 等。

## 发现的问题

1. **33 个声明共用同一批顶层模块绑定。** `@672088`（字段元数据）、`@663046`（egress）、`@700311`（MCP 条目）、`@787546`（推理字段）、`@658702`（弃用）、`@688320`（版本）、`@688142`（i18n `msg`）、`@785250`、`@855758`、`@86166`、`@670945`、`@694470` 这 12 个顶层绑定在几乎每个声明里都出现、且此前完全没有名字（`show` 里全是 `yt_K672088` 之类）。每组都写一遍会让表里出现 30 多行同一偏移，本表第一次出现时命名、后续复用。它们的影响面很大：`@672088` 一个绑定在本 chunk 里就有 3,000+ 处引用。
2. **`suffixed by conflicts` 需要自己盯。** `check` 报的计数包含 `final8` 里原有的冲突；本表新引入的 `_2` 撞名必须另查。做法是写了 `artifacts/tmp/v4/conf.mjs`（`renameModule` + `final8` + 本表，打印 `r.conflicts` 里属于本表的项），每批后跑一次，把 `captures-outer-or-global` / `same-scope` 的名字换成更具体的（例如 `settingsConfigSchemas` → `configSchemaBundle`/`settingsSchemaBundle`/`flatKeyModule`，`hybridRefusalModule` 在不同声明里改叫 `hybridExclusionModule`/`hybridGuardModule`/`hybridRefuseModule`）。共处理约 50 处。
3. **先写后查会写错键。** 曾把 `@1134933`（decl 17 里 `let { name, ...rest }` 的 rest 对象）、`@1140313`（`ppe` 函数）当成别的用途写过一次，单看摘要容易错位；最终按 `show` 的完整函数体核对。
4. **`check` 只验 final8 + 本表，`show` 只看 final8。** 用 `final8` 重渲染时，本表写过的名字不会出现（首行仍写 `182/221 unnamed` 之类），容易误判「没写进去」。核对覆盖面的做法：把 final8 的 `locals.jsonl` 与本表按 `file\0key` 合并成 `artifacts/tmp/v4/final9/`，再用它 `show` 全部 33 个声明 —— 结果 33/33 都是 `0 unnamed`。注意合并必须按 `file+key` 去重，只按 `key` 会把别的 chunk 的同偏移行覆盖掉（`locals.jsonl` 里同一 `@偏移` 在多个 chunk 重复出现）。
5. **`__exportStar` barrel（`chunk-1ny7cxrt.js#ni`）里 20 多个 `require_*()` 调用没有独立绑定**，转发对象是同一个 `exports` 参数；只需给 `__createBinding`/`__setModuleDefault`/`__importStar`/`__exportStar` 及各参数命名（`target`/`source`/`key`/`alias`）。
6. **未发现明显错误的既有名字。** 抽查 final8 已给的名字（`isStaticTier3pKey`、`bootstrapableKeys`、`getFieldMeta`、`flatConfigKeys`）与代码一致。
