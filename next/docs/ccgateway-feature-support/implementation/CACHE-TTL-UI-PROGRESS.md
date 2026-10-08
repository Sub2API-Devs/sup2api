# Cache TTL UI 实现进度

2026-10-09。前端独占范围：UsageTokens、UsageTokenFacts、UsageDetail、usage 展示辅助与测试、zh/en usage 文案、BillingBreakdown 可选展示标签。没有改 core/API 实体、费用计算或历史记录。

## 已完成的 RED → GREEN

新增 `next/web/src/views/usage/UsageCacheEvidence.spec.ts`，先执行：

`npm test -- src/views/usage/UsageCacheEvidence.spec.ts`

2/2 RED：仅 cache_creation_1h_tokens=1647 的失败记录列表显示 `—`；历史 cache_creation_tokens=1219 无来源证据仍标为“缓存写 5 分钟”。

修复列表缓存写入合计与缓存行显示条件，纳入1h；详情 token 字段使用中性“默认计费桶 / 1 小时计费桶”。原 token 和费用不变。联合 UsageCacheEvidence/UsageDetail/UsageTable：10 tests PASS（2.12s）。

BillingBreakdown 新增可选 cacheWriteLabels，只有 UsageDetail 提供中性标签；价格编辑器默认文案不变。新增断言验证数量/费率/原对象不变。

## 合同确认与实现

Root 随后确认 `metrics.cache_write_evidence` 合同：version=1；total/explicit_5m/explicit_1h 为带 state 的计数；可选 unclassified_tokens；completeness=complete/partial/unknown/inconsistent；source=json/sse/iteration；pricing_policy=platform_default_cache_write_compat。UI 按该合同实现，不猜其他版本。

`UsageDetail.spec.ts` 先补 partial 来源 RED：页面没有专用事实区，且原对象被通用 metrics 列表直接 JSON 输出。实现 `cacheWriteEvidence.ts` 安全投影和 `CacheWriteFacts.vue` 后该断言转绿。只接受固定key、v1、白名单枚举和安全非负整数；不展示任意扩展字段，不改变原对象。未知版本、错误形状、不安全数字降级为没有可用证据；结构化 evidence 始终从通用 metrics 区移除，不把坏对象原文输出。

事实区明确标“已报告”，保留0/absent/null/invalid区别。partial提示已报告细分可能早于最新总量；未分TTL独立显示，不计算或推断缺失数值。来源区说明兼容计费采用平台默认缓存写入费率；收费桶中性化，原费用不变。

主用量使用顶层metrics；additional与replacement使用 `billing_detail.inputs` 对应组件各自的 Metrics。已有失败已知轮数展示也传递各轮自己的 Metrics。新测试验证11/22/33三套证据分别显示，未跨轮合计，不输出 private_debug 或 plugin_detail。

跨 core 边界：详情 metrics 可供 self-service 使用；不得为TTL显示暴露原被隐藏的 plugin_detail 或 anomalies。列表原API无 metrics，不能凭两个旧计费桶推断TTL；可以展示正确缓存合计。合法HTTP200/refusal状态和原金额均不改变。

最终本地命令：

- `npm test -- src/views/usage`：4 files / 17 tests PASS，1.98s。
- `npm run typecheck`：PASS。
- 初始改动定向 ESLint exit0（原文件排版警告132，无error）；新增展示组件单独lint修整，不批量格式化原有页面。

未运行浏览器或声称生产视觉通过；本轮验证为本地组件测试和类型检查。没有提交业务、修改数据库或发布生产；已通知root冻结UI供CC独审。
