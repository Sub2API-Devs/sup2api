# 最终候选代码交付复核

对象：`cd4d5e40b2de7c22af7718a3b35d12d9f41e786a`。日期2026-10-08。research_cc只读复核，除本文外未修改业务、测试或构建文件；未构建/部署服务器镜像。

## 结论

核心与 Worker 的边界、协议聚合复用及 Mod 打包符合本轮架构。发现一项明确的跨路径校验差异已报主代理决定，不擅自更改候选。除此之外未发现需要以广泛风格重写阻止发布的问题；本结论不覆盖未运行的真实镜像、真实provider能力或所有HTTP组合。

## 明确风险与非阻断边界

1. 身份头校验重复且已发生漂移：diagnostics 双端拒绝多值 Principal/Generation；core `rewriteResourceEvents`、`observeFallbackCredit` 和 Worker `verifyExpectedResourceIdentity` 仍只取 Header.Get，resource capabilities 的重复头检查不含这两个身份头。首值正确、第二值不同可能在 diagnostics 拒绝而 resource/credit 接受。它是可信内部证据歧义，未证明现实跨 owner 利用。建议用 shared resources 身份头校验函数统一“恰好一值且匹配”，增加三链回归。已向主代理报告，未自行修改。
2. 正确 Worker 构建文件为 `companions/worker/Dockerfile`，默认 CLI2.1.292；旧 `companions/Dockerfile` 是 standalone 入口，仍默认2.1.288。构建时必须选正确文件/上下文，不能只凭同名tag认定版本。
3. Worker Docker健康检查使用 WORKER_PORT 或8787。默认 CCG_BIND=0.0.0.0:8787正确；若只改CCG_BIND端口而不设WORKER_PORT，或只监听IPv6，localhost健康检查可能误报。此配置边界已报主代理，不为默认发行泛改监听方案。
4. Config.CLIVersion 的默认2.1.288是旧未消费字段；Runtime实际调用checkVersion、健康响应使用实际w.Version，不会覆盖Docker安装的2.1.292。integration compose也有旧版本说明，但同样不控制安装。建议后续定向清理，当前不因死字段制造新发行。

## 复用、解耦与复杂度

- 核心持有 user/group/account 归属、数据库与资源/信用映射；Worker只消费可信能力并核实际issuer，保持运行时解耦。contracts是独立Go模块，没有把engine引入core进程。
- 信用SSE与内部cache回合共同使用 contracts/credits.MessageFromEvents，避免各写一份工具参数聚合器；空delta已在该共享层修复。包名偏信用但函数职责独立，命名调整不是阻断发布理由。
- diagnostics失败计量与stateful resource/credit链复用resourceResponseEvents；正常SSE仅登记首帧后恢复流，stateful输出原本整包缓冲。二者不能简单合成“全部缓冲”的公共入口，否则会改变普通流式时延。
- resource/credit正常链先按原provider事实计量再改写/登记，用scratch accumulator转发，diagnostics正常链不提前计量；独审的JSON/SSE组合已验证11/7只计一次。失败路径仅有界保留实际收到事实，不发明未收到用量。
- cache/citation/已知CLI丢字段恢复复用historySkeleton和alignClientHistory；内部回合仅有请求私有证据账本，不以全局工具名跳过未知历史。为避无证据native旧回合，本组合采用客户端全历史重建并公开限制。
- grant准入的authority锁/CLI slot/issuer探针存在相似代码，但每类资源授权范围不同；未来抽公共“核身份并取得释放句柄”可减少漂移，不能把file/container/credit/diagnostics grant合并成可互相替代的一张通行证。当前没有为降低行数改写已验证流程。

## 镜像与打包核对

- worker/Dockerfile使用companions目录为context；worker模块 `replace ccgateway => ..` 和 contracts=>../contracts 路径与COPY层匹配。源码COPY包含engine、contracts、mod；.dockerignore只排除本地缓存、exe、测试、.env，没有排除Mod。
- `mod/assets.go` 的 go:embed 显式包含隐藏 `.claude-plugin` 和 hooks；实际go list结果为 `.claude-plugin/plugin.json hooks/hooks.json hooks/register.js`。Runtime未指定外部PluginPath时从二进制解包，镜像无需另外上传源码hooks。
- Node22/bookworm安装CLI2.1.292；node用户可写/work/config、/work/data、/work/history。镜像禁自动更新，默认8787与账号内回环relay一致。版本ldflags分别注入Worker Version/Revision，不用镜像名代替运行时CLI探测。

验证：本候选 `GOWORK=off go test ./internal/config ./internal/server -count=1` 通过（3.432s/2.318s），并用同环境go list核实Mod嵌入清单。复核未重跑全部既有CLI/DB/race矩阵，也没有将旧候选测试替代新镜像验收。服务器构建/启动/真实业务验收由主代理另记。

## 主代理授权后的必要窄修（待新候选）

主代理随后授权修复上述第1项差异。本节是对cd4只读审查的后续，不代表cd4已包含修复。新增 `contracts/resources.ValidateIdentityHeaders`，仅校验已经确定的principal/generation各恰好一个且精确匹配；不授予任何owner、资源或token能力。核心资源/信用/诊断响应与Worker公共verifyExpectedResourceIdentity都复用该函数，移除diagnostics重复的身份值数判断。没有改认证接口、health或CLIVersion配置。

新增共享14种身份头条件用例、Worker公共授权校验负例、核心3路径×JSON/SSE×两种身份头共12项HTTP负例。歧义响应不登记、不自动重试，原11/7用量保留。contracts resources全测试2.826s、Worker定向3.410s、core相关HTTP联合4.033s通过。已冻结交独立API代理复核，未自行提交或部署。
