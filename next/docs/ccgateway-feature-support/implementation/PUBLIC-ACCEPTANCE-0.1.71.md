# Worker 0.1.71 真实验收

源码 aa6b3a90500d9b64f85e937ba6d3a5730766b2a0；核心0.1.70、Worker0.1.71、插件0.1.11、catalog.14。全部节点、默认镜像和控制器稳定后执行；原账号容器和授权保留。

## Sonnet 构造 pending 历史

仅一次调用，`evidence/public-sonnet-pending-server-0.1.71.json`，5.85秒、HTTP400。前版502失败证据另存未覆盖。

独立日志 #22 `ce99d868-b9e0-4ee8-8740-c99681bb03fd`，09:12:17.123858133Z：附件续接修复生效，真实首user安全附件及Token提醒原位原文；人工末帧的重复提醒与marker没有外发。最终四条消息角色与客户端一致，完整assistant尾哈希 `fb48c1022bfe2ed485309430c5c79cd0d99c3441ad3a94f7aea295a69b8d6c05` 一致。仅一次真实提供商交换，无重试。

但新400并非人工prefill资格结论：客户端未提供thinking/context_management，CLI生成adaptive thinking与clear_thinking策略；主计划清掉默认thinking，却漏掉默认context_management。提供商原错明确clear_thinking_20251015需要enabled或adaptive thinking。该默认字段泄漏已交窄修及独审，不能以“原错误透传”掩盖请求适配缺陷；不通过给用户补thinking来修不合法组合。没有继续重试Sonnet。

## 五 Read 回归

`evidence/local-parallel-read-0.1.71.json`，本机Claude2.1.292、D:/projects/test的五个随机合成文件，27.18秒成功。一个assistant消息含五个Read，五个结果ID完全配对，最终五个随机标记均出现，无refusal/错误，CLI exit0。最后文件保留尾TAB场景。

session SHA256 `1886e2d9119e3f3f0a25fba96b770f0dbf1cad1804d6026a89d6d5851f5fb4dd`。这证明同一响应多工具往返，不能据此宣称实际磁盘IO时间重叠。核心记录/地区事实持久化与Worker原始日志已独立核对，详见下文。

## 核心持久用量事实

独立核心核对首请求RID `4717dcf32f764256dc087298`（09:14:48.979Z）及续请求 `cb0f9ad229d0efbf070069fd`（09:15:02.302Z）：均account22、HTTP200、attempts1。两行metrics现在都保存 `inference_geo:not_available`，明确证明响应字符串事实不再被窄枚举丢弃；未从日志未检出推导所有WARN绝不存在。

首轮实际2 input/483 output/4042 cache creation，费用0.02987800；续轮2 input/359 output/2674 cache read/2250 cache creation，费用0.01897280。合计4/842/6292/2674与本地CLI汇总一致，无重复请求或重复汇总证据。Worker关联使用此次专用fixture路径与五个call ID散列精确匹配，未声称持久跨层request ID已具备。

## 边界

Sonnet fixture始终标为人工unsigned历史，不冒充捕获的provider pause_turn。新功能的隔离测试、实际HTTP、发布和提供商内容成功分别记录。通用内部搜索预算仍保持门禁；新持久helper历史工作不属于本次已部署能力。

### Worker 独立日志核验

账号22请求 `7ebc7cec-ce8c-4f6c-8b0b-d2c17cbb3282`（09:15:01.870681284Z）和 `8b3205c8-d7cb-4a3e-bb38-46872364ec66`（09:15:14.508895011Z）各一条实际上游交换，均HTTP200，终态依次tool_use/end_turn，无错误或重试。第一响应同一消息确有五个原生Read。

第二请求五个客户端tool_use与最终上游tool_use的name/id/input完整canonical内容相同，名称全部Read，没有mcp改名。五个tool_result逐ID一一配对；call ID数组和result ID数组摘要均`806ff461d1fa3d1fc80ab36cf294616d451d60a116eb5b7cae1d1d7003dcd001`。

五个客户端结果末字符均为TAB(codepoint9)。前四个结果在最终wire逐字相同；最后结果在CLI临时视图中曾trimEnd，但最终完整客户端前缀（含TAB）已恢复，其后恰好一个本请求engine keep session_context的已认证wrapper，无其它后缀。后缀573字节，SHA256 `57909140cbe22530edbfa5fccced0fb03d1c79ac2a3676e4017a643a222cedf6`；对应keep事件一次，内容在最终结果只出现一次。未记录或打印文件正文、邮箱及密钥。

核心代理已独立确认这两条记录各attempt1/HTTP200，geo=not_available保真入账。本段是实际Worker日志证据；不将原生Read五个调用解释为磁盘读取时间重叠。
