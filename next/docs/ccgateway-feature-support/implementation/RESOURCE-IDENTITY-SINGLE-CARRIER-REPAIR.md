# 单载体身份与无副作用状态快照

候选尚未部署。现场因果见 WORKER-0.1.74 部署记录：identity前置`auth status`子进程创建OAuth刷新锁后正常exit0，后续真正载体被该锁阻挡。修复不以每次删锁替代生命周期治理。

## 资源身份

删除身份入口的短命status命令。每次只启动一个原生CLI认证载体，保留主轮marker、Mod lease及系统恢复校验，原生请求到达已归属relay准备点后才检查其实际认证头：

- 单值X-Api-Key：必须已有managed issuer及generation，从真实CLI选择的APIkey分支产生本地管理身份；不发送profile或model请求。缺少managed配置保留原typed unsupported。
- 单值Bearer且原始Anthropic OAuth beta：转换同一请求为真实profile GET，仅从实际成功响应中的账号/组织信息派生不可逆issuer。
- 缺失、多值、两类同时存在、普通Bearer无OAuth标记均拒绝。显式非Anthropic后端配置拒绝。

不将环境凭据存在当成成功认证；只在内存中校验原生认证头的唯一性和形式，不保存或输出凭据值。自定义Anthropic协议代理base仍允许，与既有托管出口和假上游测试相容；不是按任意外部提供商推断Anthropic身份。OAuth实际来源无法仅由header区分stored/env，AuthType统一为`oauth`描述协议，principal和generation稳定算法不变。

APIkey本地完成仍须通过Runner的完整Mod/scope验证；外部取消不转换成成功。profile真实错误不伪造成在线有效。

## /admin/status

不再执行CLI或credential helper，不发网络请求，不触发刷新，只读取有界本地元数据与环境中是否配置凭据。

返回status_source=local_snapshot、online_verified=false、selection_verified=false；credential_present与兼容logged_in只表示已保存或环境凭据存在。credential_sources仅枚举来源，不返回值。多个候选、helper/外部FD来源用unresolved，不复制CLI复杂选择规则、不推测唯一优先级。存储access expiry可报告access_token_expired，不能据此断言refresh token失效。

读取路径区分secure-storage变量缺失与显式空：显式空按CLI约定使用传入HOME/.claude，不错误回退到CLAUDE_CONFIG_DIR。helper只读配置不执行；第三方后端单独显示third_party，不能冒称Anthropic已登录。

成品独审补充修正：默认全局配置是HOME/.claude.json，而凭据和用户settings目录仍是HOME/.claude；自定义CLAUDE_CONFIG_DIR时全局配置为该目录/.claude.json。已核CLI2.1.292实际内嵌Gt函数的globalConfig/userSettings分流。新增默认primaryApiKey/helper红例均先误报none，修复后通过，且自定义目录不混读默认全局文件、不执行helper或输出配置值。定向1.325s，最终全engine5.578s与vet通过。

核心与前端由research_api接字段白名单及本地凭据文案，避免丢掉offline语义。原在线模型或配额结果仍是在线验证来源；不自动重新授权。

## 验证阶段

- native header正负例、managed配置、OAuth等待真实profile、状态CLI路径不可执行仍成功、过期本地凭据不触锁、混合来源不猜优先级、secure-storage空变量路径、原logout行为等定向通过。
- 全engine单测4.727s和vet通过。
- Windows真实CLI2.1.292全部Resource目标29.621s通过，测试使用独立假凭据/假上游。
- Linux专属single-process wrapper已加入：任何auth子命令直接失败，identity必须恰一条CLI启动；APIkey provider零调用，OAuth恰profile一次。当前Windows明确skip，待精确Git Linux门禁，不能宣称已执行。
- 调查用expired/status无断言探针已移出候选，保留历史研究记录，不当产品成功证据。

首轮候选需独审后Git构建、现场一次已证明无持锁进程的过期锁备份，再单次identity确认。此文档不宣称线上授权已恢复。
