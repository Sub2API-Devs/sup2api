# Core .78 UI 修复发布

精确源 `1c35179527a7632f3ea06b9d9014d81854112956`，manifest `300d9c5e3125e72367465e567db6933a8df392482b2ea412276b9beb58f37f78`。固定 Go1.27.1、六 builtin 包不变、签名/完整TLSGET/schema/备份见 CORE-0.1.78-VALIDATION-PREPARATION.md。此次没有后端/SDK/Worker业务变动，没有重复PG或推理测试。

根代理明确放行后，使用已核容器名的服务器既有 upgrade_observe.py，仅传manifest，无fault参数。句柄97907，即时freshpreflight200/blockers=[]后，以其当前revision创建正常 primary-first-v1 计划 `680f3dbec0c9dfaef0d8b199b39079bd`。62.26s到completed|27，66.39s观察结束/exit0。日志 `/home/debian/sup2api-managed/upgrade-20261008T195114.log`。

维护探针401共1063、503共1461；首次50322.18s、最后60.05s，实测窗口37.87s，不能称零中断。四节点实际version .78、binary SHA `872573c772bd97322fc076b006b34fcc732f47c5dd9aa8f3836ddb36d6d1a689`，权威节点状态全部local/ready=true/stopped=false、同manifest。

CCGateway active=desired .14，四节点实际/proc binary均 `2f836e52bd5da8c645c1891e834219f87ecda42753a1656f7fe2c0b519d2bede`。其余anthropic/gemini/moderation/openai/volcengine已安装版本和实际binary逐项与 .77 部署记录完全相同；保留原安装包身份，不声称全部等于新builtin包，也未发插件升级。

备份 `/home/debian/sup2api-managed/backups/core-0.1.78-20261008T194528Z` 和旧签名制品保留，无需回滚。Worker .80/Controller .48/default/21及22账号容器均未操作；无profile/quota/模型调用。稳定后获准复用usage744做真实只读UI核验，另记UI-PRODUCTION-CORE-0.1.78.md。
