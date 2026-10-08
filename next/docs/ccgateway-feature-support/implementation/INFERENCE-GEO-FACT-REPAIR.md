# inference_geo 响应事实修复（候选，未发布）

官方当前 SDK `Usage.inference_geo: Optional[str]`，并非请求的 global/us 枚举：https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/usage.py 。线上公开生成控制/媒体/Web 的真实响应包含 not_available；核心此前 WARN 并丢弃 fact。原响应与 HTTP 状态未改，但读取该事实的价格表达式会看到缺省值，不能认作纯日志噪音。

## 修改与边界

- SDK UsageFact 新增 string 类型，manifest validator 允许开放字符串但禁止同时声明 enum。Anthropic 响应 inference_geo 声明改为 string。
- 核心 Acc 对 string 事实严格要求 JSON 字符串，不把数字、布尔、数组、对象转为字符串。缺失/null 延续既有不更新语义。原字符串（含空串）不改写、不推断地域。
- fallback attempt 事实抽取同步允许 string；插件 ExtractUsage 的 Fact(raw string) 已原样保留开放字符串，无需重复转换器。
- CCGateway manifest 没有单独覆盖此 usage fact，使用核心内置 Anthropic 平台声明。Worker 原始 usage 保留不变；请求 feature_plan 的 geo 仍只允许 null/global/us，没有将 not_available 放进请求参数资格。
- 不回填或重算既有 usage 记录，不把 not_available 映射为 global/us，不声称驻留保证。

## 验证

先加入真实内置平台规则测试：not_available、future-region-7、空串在 JSON/SSE message_start 下六项 RED（旧枚举丢弃）。修复后覆盖 JSON/message_start/message_delta × 八种值，包括 null/number/bool/object/array；额外检查 fallback facts、插件 facts 和价格表达式 u(inference_geo) 精确读取原值。表达式按已有每百万换算规则断言 0.000007，未改计价单位。

最终 usagerules 全包 1.390s、billing/expr 全包缓存通过、usagerules vet 通过；SDK manifest/check 全包 1.336s 和 platforms 通过（新增 string 合同合法/enum 冲突测试）；Worker TestInferenceGeo 0.310s。仅本地测试，无真实模型调用。等待另一代理独审。

## 发布依赖

这是核心内置平台合同升级，必须新核心支持 string 类型后才安装含此声明的新 schema/插件；旧核心 validator 会拒绝新类型。不得同版本覆写旧插件包。现 CCGateway 包未携独立此声明，Worker 无需为该 fact 单独升级；核心版本/包版本与部署顺序交 root 管理。源码候选尚未提交或部署。
