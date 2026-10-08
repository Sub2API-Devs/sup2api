# Core 0.1.74 发布准备

精确候选 `7d322abd9cf8579fe229aa74f50ee654c1d1e2d4`。目标 Core .74、Worker .79；Plugin .13、Controller .48保持。root尚未放行生产release。

只读预备：四节点均running；权威updater.nodes显示local/ready=true/stopped=false且release均为.73的 `04dd3605a2e84460f43cc355b838ea8b080c07ce47003dc1fad2a251ecbcbfc3`。磁盘882GiB可用，.74 checkout/stage此前未占用。曾尝试未注册 `/local/ready` 得到非JSON页面，不将该探针当ready证据；ready事实来自平台节点状态。

服务器Git fetch后创建clean detached `/home/debian/sup2api/release-0.1.74`，不上传源码。Linux定向Core gateway/credits race+vet使用2CPU/2GiB容器、只读源码挂载，日志 `/home/debian/sub2api-next-test/validation-7d322abd9`，句柄30953。

本地独立同SHA `artifacts/thinking-final-7d322` 运行最终expected-thinking-count真实ABC SSE，句柄96002：Windows真实CLI2.1.292、隔离假provider/OAuth与OVH隔离测试PG；不是Linux实测。严格thinking数量、原始50/null、普通夹轮、cold/rollback/refusal和账务断言必须全部通过。专用45439隧道finally关闭。

插件依赖此前已重新核409包，无contracts/credits或protocol-codec/strict，因此原则保持.13，但实际构建后仍须核包hash `1fc462a95937f6523e3b0224101cc9b9659eeec7ff432f8eef71d5f380b37ac1`、binary `1e5a7cd7726860f59e01663be42154157da4585b71ce630d43b1e9d74277a315`。任何不同内容不得覆盖immutable版本。

门禁后按既有prepare-core-release.sh保留default builder/cache及原signing trust，受限2CPU/4GiB构建签名。之后完整GET/hash/签名检查、限定本平台备份/manifest导入预检；生产升级必须另有root放行。没有模型/profile/quota调用。

最终精确Git Windows ABC门禁：session96002终态PASS142.198s，最新expected-thinking-count（首0/后四1）+raw50/null/普通无budget SSE/cold/rollback/refusal200/强账务全部通过。45439隧道finally关闭，无监听。

Linux Core gateway race1.138s、credits race1.025s及两vet exit0；codec全模块race1.092s/strict1.102s、vet exit0。首测试外层最后cat展示命令受PowerShell末尾CRLF影响，把最后日志路径附CR读取失败exit1；各真实测试/vet exit文件已为0，未将此展示错误掩盖或冒称产品测试失败。后续codec与prepare独立句柄54085，构建仍精确7d322。

限定本平台备份已完成：`/home/debian/sup2api-managed/backups/core-0.1.74-20261008T165135Z/database.dump`，21525810bytes/0600，pg_restore --list验证可读；同目录nodes-before.json为原四节点完整私有inspect（0600）。未触其他数据库。

签名prepare已exit0（外层最后tail同样出现末CR路径展示错误，真实prepare.exit=0与日志完整）。独立校验先修正两项校验脚本假设：manifest命名hash为签名payload摘要而非外层JSON，插件可执行文件位于runtimes/linux-amd64/plugin；制品没有被更改。

最终校验：manifest `1c8ea5ba21190c95732ad00f834e41f7b505fd0403ef8833a540c5d885ecfa0c`；bundle `f008de22656bf5991de507bef97904f9daeb9de3e7d7e9d65552e72291b91f20`（110172485bytes）；Core hash `44c94eb1aaae1640774995c65094f40ab0476d94d4885f6055b2e34f17b582ec`。Ed25519签名、payload摘要、tar每个文件mode/size/hash、源SHA、schema before/after相同已通过。使用受信CA完整TLS origin GET manifest3191bytes及bundle110172485bytes，与磁盘artifact逐hash相同。Plugin.13包与linux-amd64 binary确与前述immutablehash完全相同，trust未换。

正常manifest import完成；preflight HTTP200，blockers=[]，expected_revision141，primary sup2api-1，nodes严格sup2api-1..4。证据stage/0.1.74/preflight.json为0600。尚未创建upgrade计划、未改futuredefault；Worker.79双账号实际patch成功已收到，等待root最终release放行。没有公网模型调用。
