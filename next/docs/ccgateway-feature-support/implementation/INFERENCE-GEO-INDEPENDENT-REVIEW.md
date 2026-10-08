# inference_geo 开放响应字符串独审

2026-10-08，候选源码独审通过；未部署，未调用真实模型。

独立核对官方 SDK [Usage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/usage.py) 当前第20行：`inference_geo: Optional[str] = None`。响应事实不应套用请求的 global/us 枚举。修复保留原字符串，不推断地区，不回填旧账单。

检查 SDK UsageFact/validator、内置 Anthropic usage 声明、主响应 Acc 与 fallback attempt 抽取。string 仅接受 JSON 字符串；null/缺失不更新；数字、布尔、对象和数组拒绝登记，不抹掉先前有效事实。新增独立 `inference_geo_review_test.go` 验证 JSON escape/反斜线/换行精确解码、attempt 同值及非法后续更新不覆盖。作者覆盖的价格表达式 u(inference_geo) 读取也独立复跑。

独立执行：usagerules 全包 1.484s，billing/expr 全包 0.373s；usagerules vet 通过；SDK manifest/check 0.286s、platforms 0.251s；Worker 请求地域 TestInferenceGeo 0.297s。请求准入仍未接受 not_available 等任意字符串。没有重跑 DB 或提供商资格测试。

发布必须包含核心 SDK 内置平台声明及 Acc 修复。CCGateway manifest 仅引用 anthropic 平台，没有自己的 usage 覆盖；核心 registry 从 platforms.Builtin 载入声明，因此语义上不要求插件新增协议。构建时若共享 SDK 依赖导致插件二进制或包 hash 变化，仍必须升插件版本，不能同版本替换 immutable 包；最终制品 hash 需由发布阶段验证。
