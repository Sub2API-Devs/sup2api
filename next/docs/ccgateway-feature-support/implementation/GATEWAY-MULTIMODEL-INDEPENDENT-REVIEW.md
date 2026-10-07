# Gateway 多模型接入独立审查

日期：2026-10-08，复核主线程的模型引用、鉴权、路由、价格快照和 usage 接入。审查者此前编写了底层附加 usage/账务基础，因此不将底层账务实现称为独立审查。

发现并整改：`mapReferencedModels` 在插件 BuildUpstreamRequest 之前完成，但是插件 BodyPatch 在 `forwardBuilt` 中随后执行，存在新增或修改 tools.model 绕过组权限/账号模型筛选/价格快照的窗口。现 applyPatches 后比较声明的模型引用与已映射请求；新增、删除、改模型或改变匹配 selector 均在发送上游之前拒绝。原本无引用而插件新增也覆盖。普通传输字段 patch 不受影响。

独立测试覆盖：

- 插件替换/引入/删除嵌套模型、改变类型不可绕过；temperature 普通 patch 可用。
- 主模型价格为 nil 时仍记录并收费已定价的附加模型。
- 账号 usage override 缺少附加规则时不调度该账号。
- 不同客户计价模型映射成同一观察模型身份时拒绝，避免猜测附加价格。
- 跨协议转换未提供引用转换契约时拒绝，不静默删调用。
- 重跑原 JSON/SSE HTTP 集成测试，含 hook 后二次授权、相同 delta 不重复累计、未知模型和负 usage 保持 API 200 并保存 BillingError。

上述 gateway 目标测试 PASS 2.761s；SDK request-reference schema 检查同步复核。没有将此次测试视作数据库结算、实际官方 advisor 或部署证明。
