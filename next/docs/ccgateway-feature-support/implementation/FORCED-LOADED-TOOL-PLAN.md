# 已装载客户端工具的 forced named 子集

下一候选独立于0.1.66 Read附件修复。只允许内部ToolSearch策略开启、tool_choice.type=tool明确命中普通客户端工具，且整个客户端工具目录均显式defer_loading:false。任何server/typed/MCP/inline/safeguards或legacy格式循环不因此开放；any/deferred目标继续原gate。全部nondeferred起步，避免其它deferred目录被CLI隐藏使缓存前缀改变。

保持ENABLE_TOOL_SEARCH策略与最终客户端tool_choice/name/schema/defer/cache原值；仅关闭本请求Mod对内部ToolSearch的执行授权（CCGATEWAY_TOOL_SEARCH=0），stdio同样拒helper，responseView不接纳未声明helper，maxTurns=1。最终真实wire必须逐客户端工具验证存在与schema/defer字段，不能把允许配置和执行授权混淆。异常provider返回helper时必须失败且无第二请求/工具执行。

真实CLI隔离矩阵：JSON/SSE×新/客户端结果续聊/回退/冷导入，核完整客户端目录、精确name/id/input、零helper轮次，以及恶意helper输出负例。不据fake Opus响应声称真实Opus5.5支持forced（官方该模型只auto/none）；模型资格仍由上游决定，不修改参数迁就模型。
