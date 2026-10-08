# Cache TTL 来源证据候选进度

2026-10-09；候选未提交/部署。生产仍Core.75/Worker.80/Plugin.14。真实六次验收与TTL首因见 PUBLIC-DYNAMIC-FORCED-CORE-0.1.75-WORKER-0.1.80.md；原设计见CACHE-TTL-EVIDENCE-DESIGN.md。root选定兼容方案：不改任何旧费用规则、历史账单或合法200，仅补明确证据，cc继续按平台默认缓存写入费率计价而非声称实际5m。

## 合同与实现

host保留metrics键cache_write_evidence，version1。total/explicit_5m/explicit_1h各为state(absent/null/value/invalid)+可选非负int64 value；unclassified_tokens可选；completeness complete/partial/unknown/inconsistent；source json/sse/iteration；pricing_policy固定platform_default_cache_write_compat。字段只固定enum/数值，没有正文、路径、令牌。保留桶值表示已报告值，不声称最终所有TTL完整。

新增core/cache_write_evidence.go与usagerules/cache_write_evidence.go。仅从实际声明的标准Anthropic cache总量+1h路径识别，不看请求头。builtinAnthropic规则实际可用；非匹配provider规则不添该对象，现数学不动。JSON/SSE更新总量、缺桶保留已报告值、parent null清来源确定性、新TTL可补齐；非法/不一致只标记证据，不抛模型错误。没有数值时不凭空添provider0。

主Acc.Metrics、Additional.Metrics及每个Replacement.Metrics独立携带，gateway已将Additional证据送至PricedUsage；helper provider_calls复用同Acc逐call保留，不跨模型汇总。host保留键不能由插件facts创建或覆盖；plugin extraction保留真正host证据，无host时删除冒充值。

core.CloneUsageMetrics/ClonePricedUsage以及usage.fromRecord深拷贝reserved typed/decoded map证据。gateway.cloneUsage只补该key的精确快照，保留原其它字段行为，避免json.Unmarshal float64丢>2^53证据。未重写整个clone。typed DTO稳定MarshalJSON与UseNumber冷解码map按相同键序，防首次outbox就被不同重编码顺序误判；原frozen bytes及digest仍保留。

## 红绿与门禁

- TestCacheWriteEvidenceActualUnclassified1219：实现前精确RED1.280s，missing evidence；实现后绿，原cc1219/cc1h1376保持。
- builtinAnthropic SSE真实start1376→delta2595缺TTL，partial1219；后续明确5m1219补齐；parentnull变partial，无伪0。另null/absent/显式0/非法类型/负数/小数/超int64/桶超总否例。
- Additional与Replacement分别保留，返回快照无别名；helper provider_calls两轮差额1219和5保持分离；冻结用量编码/冷解码原事实与tokens保持。
- HTTP JSON及SSE正例保持原200/原body bytes，不将来源不完整改模型错误。plugin保留键创建/覆盖拒绝。clone typed和decoded map的9007199254740993精度与变更隔离均测。
- 全usagerules/gateway/core/usage非DB测试：1.007s/7.514s/4.482s/0.780s，vet绿。此命令SUB2API_TESTPG=off，明确不是DB证据。
- 独立真实隔离PG TestCacheWriteEvidenceDBFrozenReplayKeepsPriceAndUniqueReceipt：session50248 PASS39.050s（case36.65s），typed producer和cold decoded record同一原frozen envelope均成功，重复入库仍1usage/1receipt；与无证据对照相同token同费用，两请求只有2usage账单；metrics持久差额1219/partial、状态200。测试用OVH testdb独立临时DB，无生产DB操作。
- 首PG session24087连接失败3.328s：测试容器未设置POSTGRES_USER，脚本空用户名回落本机16790，认证拒绝，没有建库或业务写入；修为测试服务标准postgres后才有上述PASS。两次专属45441隧道均finally关闭，凭据仅进程内存，不记录DSN。
- 开发过程一次测试从仓库根而非next/server执行导致找不到Go模块、一次格式化相对路径重复；随后在正确模块重跑，均非产品测试结果。

## 文件边界与发布影响

业务只server/internal/core（DTO、Additional指标字段、priced clone）、usagerules（Acc、Additional、attempt）、gateway（Additional接线、plugin保留键、clone reserved key）、usage.fromRecord快照。测试为各包新增cache_write_evidence_test.go。没有修改SDK/manifest导出结构、插件catalog、Worker或数据库迁移；UI由独立作者负责，不由本文覆盖。

最后保留键attempt事实覆盖与inconsistent尾空帧保持增量已目标测试1.157s/vet绿。下一步交CC非作者独审；生产部署须精确提交及独立门禁，不将本地候选说已上线。

## 集成冻结检查

独审已完成：Core新增独立边界用例、UI20tests/typecheck均通过，详细见CACHE-TTL-INDEPENDENT-REVIEW。真实Edge本地组件1440/390px六截图无横向溢出或pageerror，见CACHE-TTL-UI-VISUAL-ACCEPTANCE；不是生产登录页面验收。Root定向Cache测试usagerules1.203s/gateway2.862s/usage2.153s通过（SUB2API_TESTPG=off；core该筛选无用例，不作为core测试证据），完整前端typecheck+Vite build10.10s通过。生成的dist入口不提交，发布仍由服务器Git构建。CodeGraph在目标项目精确定位ClonePricedUsage，插件409项Go依赖实查不含server包，本次预计只Core .76，不改变Plugin .14或Worker .80；正式构建后仍核不可变插件包摘要。尚未提交/部署。
