# 普通 inline + 预算：独立审查阻断

候选未提交/未部署。只改独立测试，不改作者业务。Worker作者16次隔离CLI绿不等于核心真实持久闭环已通过。

## 已核正确项

helperPublicTurnBoundary将user后连续公开system尾纳入摘要，真实after不退回user。helperInlineHistoryView复制Message切片，防toolCarrier写回原请求，清空最终InlineTools/internalCache并按每段prefix+原base工具重编译；早期无inline目录不含未来工具。独立连续system摘要和mutable discovery/目录不别名测试、作者目标一起1.443s通过。原base工具完整摘要、固定账号/issuer和链缓存摘要没有放宽。

## 真实ABC阻断

新增 `TestHelperHistoryABCInlineRealDBCLI` 复用实际core HTTP→真实Worker requirement→真实CLI假provider→隔离PG加密链/outbox。计划7公开请求8provider调用，包含新增directive、外部tool_result后撤销、普通夹轮、冷Worker/新store、撤销前后回退、同名大整数schema重加。原普通夹具仍inline=false行为。

实际首轮wire是 user → **内部工具目录system** → **公开inline system**。完整hidden轮时，在公开inline后再出现hidden assistant/user。当前只截取最后公开inline之后suffix，遗漏前面的内部目录；后续公开续聊仅 user → 公开inline → hidden assistant/user，目录消失。不能把公开inline复制到隐藏段或移动系统消息弥补。

验证过程保留：
- 首完整JSON171.164s红，绝对索引1断言头两次失败，其余流程计量断言无错；这最初仅是线索。
- 位置诊断30.470s红，确认inline index2和roles [user,system,system] / [user,system,system,assistant,user]。
- 首个hash版本27.422s红，发现CLI已知首轮array+ephemeral→完整hidden轮同文string；不能将其误认新丢失。基线改为完整hidden轮实际对象，符合既有来源证明规范。
- 一次操作脚本漏测试PG默认用户名导致认证失败4.374s，未执行业务测试，不算产品失败；修复脚本后重新开始。
- **最终可靠红例41.620s（子组28.99s）**：以完整hidden轮实际目录对象为基线，下一公开续聊 directive_index=1、preceding_role=user，原内部目录确实丢失。session61466终态，隧道finally关闭。

当前夹具保留该红灯且首断言失败即停止，不能用删断言让候选变绿。尚未跑最新SSE；JSON已形成阻断，不重复无效矩阵。没有生产模型调用。

## 后续位置合同建议（未实现）

现v1每段必须至少完整A/U对，不能表达user与公开inline之间独立system。建议payload2增加明确system_only与whole_round插入种类，各自绑定AfterMessage、公有prefix摘要、base工具摘要；系统组需已归属原始wire及双观察证据，不授予客户端构造权，同锚点顺序入摘要。保留v1解码。

可将位置payload版本与既有transport1/namespace解耦：新能力显式声明payload版本[1,2]，请求显式选择；缺省仅v1，新Worker不得向老core静默输出v2。新core在派发前协商，旧Worker不能恢复v2则明确拒绝、不降级。既有v1链可在新codec下读取原文并追加v2，model/CLI/policy与账号/issuer绑定不变，本地cache继续绑定完整chain原始摘要。此方案须独立合同审查，当前未修改共享schema。
