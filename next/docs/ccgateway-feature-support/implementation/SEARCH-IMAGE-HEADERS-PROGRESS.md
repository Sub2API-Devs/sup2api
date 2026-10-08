# 第三批：搜索结果、图片变换与错误响应头

日期：2026-10-08。基于第二批 b52f5fc1c 继续；本批未提交、推送或部署。验证是本地 CLI 2.1.292 + 隔离假上游，不代表真实模型/账号资格。

## 已实施

### 客户端 search_result

按 [官方 Search results](https://platform.claude.com/docs/en/build-with-claude/search-results) 与 [SDK SearchResultBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/search_result_block_param.py) 实现用户消息和工具结果中的 search_result。text-only content、source/title、citations设置和缓存字段原样保留；请求内引用启用设置须一致。没有将它转成 document，也未引入无关beta。

来源进入 historyDocuments 的完整序列，保留同文不同source/title/顺序差异。cache遍历、剥除CLI默认与原位恢复覆盖嵌套content文本；引用仍按完整助手turn、前置用户锚点及来源语料匹配恢复。单测确认改变早期source/title/text或交换同文来源会拒绝恢复引用。

### image.transformations

按 [ImageBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/image_block_param.py) 与 [ImageTransformationsParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/image_transformations_param.py) 支持缺省、null、空对象及 oversized_image=downsize/error。字段交provider执行，不在Worker缩图或猜测模型尺寸上限。

真实CLI负例：URL image原样保留；base64 image会丢transformations、给相邻用户文本追加换行，并加本地临时图片路径附件。仅在主wire补一个transformations不能证明其余消息仍保真，因此最初测试正确失败502。

修复：仅带显式transformations的base64 image使用请求私有随机URL形状载体进入CLI输入/seed JSONL，避免CLI本地base64预处理。原始API Request不改；已归属主请求按注册载体恢复原source，再按完整角色/turn/block/source匹配恢复缺失元字段。已存在冲突拒绝，不凭相同图片hash跨位置附着元数据。计数走原始API请求；辅助模型请求携带该载体时拒绝，不能将临时URL发给provider。最终扫描不允许载体残留在任何字段。

这类请求当前完整重建本地CLI历史，旧native snapshot不复用；API原始history fingerprint不包含随机载体，最终wire不含随机URL，所以不会通过nonce改变provider prompt cache。普通URL图片仍使用既有prefix缓存通路。日志记录 image_carriers_restored 的图片数量和恢复策略，不添加凭据。

测试覆盖：直接用户base64、工具结果base64、文档内容base64，分别新请求/续聊/回退/冷导入/SSE。乱序、缺失/多余载体、同bytes但不同变换、显式冲突、普通文本内泄漏及未归属辅助请求负例均受控拒绝。

### 原始错误 HTTP 头

单一选择器位于 companions/contracts/httpfacts，供Worker和核心复用。只接受provider响应里的 request-id、Retry-After、x-should-retry、Anthropic限额/fast事实头；不复制Authorization、Set-Cookie、内网路由/传输头；Connection列出的hop字段及含CR/LF/NUL值排除。

Worker只从已归属主模型/count/warmup的错误响应捕获，保存到upstreamError.Headers，外部HTTP写body前应用。辅助请求事实不冒充主响应。核心dispatch将最终尝试响应头附着gwError，writeError写出前应用，成功forward亦沿用同一helper；不改变分类、账号切换或计费策略。最外next/gateway本来是ReverseProxy，验证其不会抹除这些业务错误头。

SSE已开始后保持HTTP200并发送原error事件，不尝试改写已经发出的status/header。成功模型响应的provider头在Worker重建JSON/SSE时尚未系统性捕获，本批不冒称已覆盖；核心已具备接收上游安全事实头的统一通路。

## 验证证据

- 第一组5媒体形态×5流程共25次真实CLI假上游通过19.64s（search top/tool_result、image URL/tool_result/document）。
- URL image null/empty/downsize各5次通过；base64负例先确证元字段/文本/本地路径改写，载体修复后直接5次通过3.66s，工具结果与文档内容10次通过7.49s。
- TestRealCLIUpstreamErrorHeaders：400/429/529原status/body/request-id/Retry-After，每场景仅一次模型HTTP，PASS2.48s。
- 核心 TestProviderErrorHeadersReachHTTPClient 三状态完整HTTP PASS2.771s，客户端伪造响应事实头没有覆盖真实provider值。
- 最外 TestOuterGatewayPreservesProviderErrorFacts PASS1.055s；共享httpfacts安全过滤测试通过。
- 全engine单测PASS4.065s、go vet engine通过、contracts全部通过。
- 拓宽核心Error/SSE回归时触发现有Windows嵌入PostgreSQL缺少data/global/pg_control；这是环境阻断，未删除/重建数据库目录、未将skip标通过。需Linux隔离数据库回归。

## 文件边界与未覆盖

engine新增search_result/image_carrier/image_transformations/upstream_headers及独有测试；现有request/media/browser_state/history/cache/inline_system/outbound_relay/main只接入上述逻辑。core改dispatch/errors/forward的安全header小范围，未动转换、路由或账务。next/gateway只加测试，无产品逻辑变更。

后续独立review重点：图片载体不能离开主请求、同文同图位置不串绑定、原始transformations:null与缺省不合并、root/嵌套cache断点不丢、流后错误不篡改HTTP状态、core最终尝试header不能混入此前被重试账号事实。真实provider图片拒绝、RAG引用质量、CDN/反向代理头行为需要另行真实账号验证。

最终媒体整组复跑：`TestRealCLISearchImageMetadata` 十一种形态各五流程，共55次真实CLI隔离请求，PASS40.42s。未调用真实云模型。基于最终carrier实现，URL与base64路径均通过。
