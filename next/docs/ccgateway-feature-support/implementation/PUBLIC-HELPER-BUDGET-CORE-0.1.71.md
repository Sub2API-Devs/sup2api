# Core .71 / Worker .73 公开验收

2026-10-08，源码428164d4756e64163710910224957744554a2011，插件.12/catalog.15。部署成功与真实功能验收分开记录。

## 首次真实请求：失败并停止

使用用户已有平台Key与公开3130入口，模型claude-opus-5-5。`public_helper_budget.py` 最多四次、无重试；首请求503后立即停止，实际仅一次，1.885s。原证据保留在 `evidence/public-helper-budget-0.1.71.json`，不能改写为后来成功。

核心关联RID `efb21210ad2a39fc834e057d`，SHA256 `39fce042721ede777c891cbc8d502e0b41248585a78edabeee7b5b8631df1df1`，11:53:43.846572UTC，sup2api-1/account22，错误 `helper history runtime verification unavailable`。鉴权成功；核心记录0tokens/free，未创建helper attempt、未模型派发。两Worker没有新增主请求日志或CLI进程；纯准入接口本来不写此日志，不能仅据无日志断言没有预检。

API代理实证认证GET控制器 `/accounts/d1d2964e14bf728d9/admin/features` 返回404；CC代理独立确认运行controller `.47` 的路由白名单缺admin/features，而Git候选已有该路由。Worker本身features200并不证明旧控制器能代理。不是APIKey错误、模型拒绝或冷却。此次发布遗漏了控制器能力路由版本，须正常Git构建并刷新Controller，保留账号容器与授权，不能跳过能力校验掩盖。

## 证据脚本修正

首报告beta中的task-budgets被通用 `sk-` 脱敏正则误当密钥子串，故原artifact显示ta[REDACTED]。实际发出的header取自已提交脚本常量，未被该后处理修改。已加词边界避免误伤beta，完整已知Key仍无条件替换；纯合成回归通过，无网络。原失败artifact不重写。

## Controller 修复与第二次真实请求

Controller .48 从同一Git提交构建并正常刷新；认证控制器与核心的两账号features端点均200/schema1。原账号容器和授权保持，详见部署记录。

稳定后另执行一次有界验收，首请求仍503后停止，12.187s，证据 `evidence/public-helper-budget-0.1.71-controller48.json`。核心RID `0c77dad4417b7ae826f562db`，请求摘要 `d36da34fc9081e849ea00477c2da8187a511627e889648844eed2be3551d9c36`，12:03:13.073273UTC，sup2api-1/account22/attempt1；helper attempt/outbox/receipt均无记录，用量与费用均0，未Reserve/Dispatch。这一次不是旧控制器404。

Worker请求 `b4e65e4d-54bd-46ae-9724-f247e21af472` 在12:03:15.143929822Z收到GET `/_ccgateway/resources/identity`，9608ms后失败；原始错误为 `main model turn ended without applying its client feature plan`。失败属于OAuth身份验证所用CLI载体的主轮归属校验。现有日志不足以判断profile GET是否已出站，不把未模型派发等同所有网络请求为零。

## 后续

先隔离复现并修复身份载体，独立审查后Git构建更新，再恢复公开验收；不跳过身份校验，不盲重试。四步公开验收、隐藏轮原位保真、同账号绑定和持久用量仍待真实验证，不能借隔离假上游结果补写为通过。
