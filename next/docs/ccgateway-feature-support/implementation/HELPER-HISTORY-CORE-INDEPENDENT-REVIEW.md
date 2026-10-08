# Helper custody 核心接线独立复核

范围：gateway helper_history_request/response、pipeline/dispatch接线、app维护loop，以及首次unknown的typed issuer资格分类。未运行数据库、未调用模型、未部署；C另行负责真实ABC集成。

新增独立测试 helper_history_delivery_review_test.go：
- JSON/SSE 均在 Commit 人工阻塞期间验证客户端连响应headers都不可见，提交后一次释放；持久usage一次，普通Submit未重复。
- 已实际dispatch后客户端取消：唯一上游调用，冻结失败且用量未知，不换号重发、不提交普通usage。
- 截断私有envelope：503、唯一调用、无history Commit，保留unknown outcome而非完整零用量。
- 已知链namespace/principal/generation/account分别漂移：推理前拒绝，不能改绑定或fallback。

源码复核：unknown仅在Reserve之前、尚未dispatch且ErrUnsupported资格明确时可切候选；超时/基础设施错误不会降为不支持。known链必须精确账户与namespace/issuer相同。私有response身份先校验，再恢复原status/body，失败分组usage在最终冻结前重置重取，不把public聚合与provider_calls相加。Commit失败转托管错误；成功响应未在Commit前释放。app维护按ready门禁运行、可取消、单轮有界；drain冲突退避另由root/A独审。

纳入root新增Headers=null合法响应防panic回归。针对上述独立测试及已有partial/eligibility测试合跑3.191s通过，gateway/app vet通过。当前证据仅真实HTTP核心流程+内存持久端口+假Worker envelope，不是Worker/CLI或真实数据库端到端证明。
