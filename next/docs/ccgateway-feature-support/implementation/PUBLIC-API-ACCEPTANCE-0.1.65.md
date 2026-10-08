# 0.1.65 公开 API 与本地 CLI 验收

2026-10-08，公开平台入口、用户提供的现有客户端 Key、`claude-opus-5-5`。凭据仅进程内使用，未写入测试脚本/证据。未强制账号调度，不将这些请求称为同时覆盖两账号。

## 已完成

核心四节点实际 0.1.65、schema0042，CCGateway 实际插件0.1.10及包/二进制哈希核验见对应部署记录。Worker #21/#22已原容器补丁至0.1.65，catalog.8；默认新建镜像更新不替换原账号容器。

`evidence/public-api-smoke-0.1.65.json`：JSON、历史续聊、回退新分支、普通SSE、空参数客户端工具调用及结果回传全部200且内容断言通过。空参数工具502的旧失败已修复。普通续聊包含thinking时，测试原样保留其签名及全部内容块。

同轮count_tokens首次502（请求ID `e5ae85862d01a2220454e972`）与控制器刷新重叠：04:27:24.893Z启动、04:27:25.709Z请求进入连接发现失败、04:27:28.970Z刷新成功。该请求尚未到Worker。保留首次失败，不能把运维窗口称作零中断。

刷新稳定后，仅复测count_tokens：200、返回正整数input_tokens，请求ID `dd3364ed6056c8b951e369e7`，3.763秒。证据 `evidence/public-count-after-refresh-0.1.65.json`。这证明实际新插件计数路由生效，不是本地估算。

## 本地 Claude 实际任务：发现新的阻断，尚未通过

本机Claude2.1.292，在 `D:/projects/test` 通过进程环境变量临时指定公开平台，未修改全局配置。只允许Read，读取既有 `pelican-bicycle.svg` 前40行并描述内容，禁写文件，最多3轮且不持久会话。

第一次真实任务18.093秒：Read调用和客户端读取结果成功，但第二轮报错，整体exit1/is_error=true，不能因result_subtype=success就记录为成功。证据 `evidence/local-claude-0.1.65.json`。

Worker #22日志定位：第一次请求 `bd2ab881-f183-44fd-8fed-2d6c8d8f8b7d`；第二次 `f62f9687-1d6a-4c1d-a5f3-a866c4f74f39`，出站前报 `client user turn 3: client user block sequence changed`。CLI为tool_result追加了自己的附件，客户端原始结果未缺失；正在补可信附件证据与严格对齐，不以删除附件或无条件放宽校验处理。

本记录为进行中快照。后续修复、独立复核、Git服务器构建和真实CLI重测完成前，不宣称本地客户端使用链路全部通过。

## 验收脚本独立复核（后续加固，未重跑真实调用）

独立审查发现旧脚本只要求SSE存在message_stop，未严查重复start/stop、未结束block或终态后delta；普通内容检查若恰含预期文字，可能把refusal记作内容成功。本地CLI原检查未配对Read tool ID/返回结果，也未要求最终非空文本。已窄修三个证据脚本，不改engine或产品业务。

新SSE fixture解析器校验消息/块生命周期，保留thinking/signature/citations和工具整数精度，空input delta保留初始对象，非法尾流拒绝。Probe分开protocol_passed/content_completed/outcome，普通任务refusal内容未完成；diagnostics可明确protocol_only。Read脚本核文件名、tool_use_id配对、终态唯一及最终文本，仍不能自动证明描述的视觉语义正确。已知进程密钥与常见授权串在所有输出记录统一脱敏，不再只处理error_summary。

只用内存合成响应和mock opener复现：六类非法SSE、签名/9007199254740993精度、refusal两种判定、Read未配对/空最终文本、known-secret清理全部通过，另AST语法检查通过；没有网络/模型请求。原已保存真实JSON证据未修改，旧结果不能倒写成经过新解析器重跑。原本地Claude任务失败结论仍保留，后续由主任务修复产品后另行真实验收。
