# CCGateway 特性实施进度

开始日期：2026-10-08（Asia/Shanghai）。状态：已推进至第九批并分阶段部署；当前状态见下节，早期批次中的“待提交/未部署”均为当时快照。原始调研保留为基线；本目录记录实际实现、实验、失败、评审和发布证据。

## 本轮追加证据与限制

Core.76准备已被immutable包核验主动阻断，未导入/切服务：浮动golang:1.27-trixie从Go1.27.1漂移到1.27.2，六个builtin原版本包全部摘要变化；不是插件源码变化或VCS元数据。5fc对应Linux四包race/vet与实际PG均绿，已签.76资产保留。Root从旧.75服务器prepare.log独立核原官方index digest8f58fd67ea075142d947a60e0caa4317746a55118d312f027793d382c7741734，决定正式Dockerfile固定原Go1.27.1精确digest，新Git提交后重新准备Core.77并核全部内置包，不改已签.76、不覆盖旧插件版本。

缓存TTL候选已冻结提交推送5fc8326f9587a41e69b565364f20a284bd86317e：Core作者四包test/vet及隔离PG39.050s通过，typed/冷decoded同原frozenbytes重复重放唯一usage/receipt且同价、1219partial和200持久；CC非作者nullable/overflow/perattempt/deepclone/原bytes独审绿，UI独审20tests/typecheck，root前端productionbuild10.10s绿，1440/390px六本地真实Edge组件截图无溢出/pageerror。不是生产浏览器验收。OVH仅Git精确新clean release-0.1.76构建，作者handle29841已确认live，受限Linux四包race绿、vet/真实隔离PG/签名准备续行；尚未切服务。Plugin409依赖不含server，本次只Core.76，正式包仍核Plugin.14不可变摘要；Worker.80/Controller.48保持。

最新线上为精确 Git609691490：Core.75/Plugin.14/Worker.80/Controller.48；四核心节点及原21/22容器已核，未来镜像默认.80，既有容器/授权保持。核心维护503采样窗口37.51秒。公开动态MCP和forced mixed各3请求全部通过，新/续/回退六RID均22/attempt1，账务和Worker日志独立核对；生产未强制cold/跨账号。详最新部署记录和PUBLIC-DYNAMIC-FORCED-CORE-0.1.75-WORKER-0.1.80。

新增缓存TTL事实补充正在进行：上游最终total比已报告TTL桶多1219，明确标未细分，不将差额描述成已证实5分钟；收费数学、旧账单、200/SSE不变。Core作者验证隔离PG冷outbox重放/唯一receipt/金额一致，UI作者已冻结17测试和类型检查绿，独立代理开始交叉审查。尚未提交部署，不混入609691490。用户允许替换长期无进展代理；新代理review_release_80已完成发布独审与UI实现，进度分别保存在专门文档。

下一候选已整合单动态deferred MCP和named eager目标+无关显式deferred目录，两者均有新/续/cold/rollback真实CLI隔离及交叉独审。Root追加原生wire审查复现两真红（实际native schema先被恢复掩盖；[]Object目录被[]any-only读取误判空），现统一主请求改写前校验、复用historyContent读取，原六case未改且与真实Read完整生命周期独审6.006s转绿。Root全engine5.272s、contracts/plugin/worker全部测试与vet通过，前端3文件31测试2.96s通过。候选catalog2026-10-09.17/Plugin.14，明确transport schema1与payload v1/v2独立协商，当前准备Core.75/Worker.80 Git发布；尚未提交部署，不与线上7d322混淆。公开动态MCP/forced各最多3次脚本已离线作者验证，最终独审中，未发送新生产模型请求。

当前已部署精确7d322：Core.74四节点ready、Plugin.13/Controller.48不变，Worker.79已原地更新21/22；Root独立核原容器ID/imageRef.56和双方程序hash0c44e181c3e60257e3f0668144139dc471529f859148f6f1aa8136b56e897231。未来default.79正常保存刷新，既有容器完整配置不变。核心正常updater completed，维护503观察约37.22s，不是零中断。公网normal4次及inline4次均200且工具交接/结果续聊/无budget普通SSE/回退marker全部精确。两组八RID均22/attempt1/billed/committed，各1history1receipt0outbox，第三parent为第二、回退parent为第一，用量与公开响应逐项一致；Worker每组2/1/1/1真实provider轮，完整隐藏A/U及紧后system跨轮hash一致，普通第三实际50/null帧已200并committed。inline撤回按位置生效、回退不复用未来撤回。脚本falseflags仍代表脚本未自行读取内部证据，独立佐证见PUBLIC-HELPER-BUDGET-CORE-0.1.74-WORKER-0.1.79。此次没有强制生产cold restart/跨账号调度。单dynamic MCP候选已有官方合同、作者8次隔离CLI和CC独审通过，尚未提交部署；forced mixed候选另在开发，均不纳7d322版本。

精确候选7d322abd9已提交推送，cc-max与OVH仅Git clean worktree构建。最终expected-thinking-count真实ABC142.198s通过，Linux核心/credits/codec race和vet、Worker engine race33.278s及定向真实CLI91.945s通过。Worker.79镜像与独立程序、禁网8787 health/features已核，Root已放行21/22顺序原地更新；Core.74签名构建/预检准备中，尚未完成发布。两个浏览器工具调用（创建平台验收tab30秒、只读getState15秒）均连接超时，未进行新页面视觉验收，不把工具超时当平台故障。并行的动态MCP/强制混合目录设计与未来实现不属于本冻结发布。

最新线上Worker.78（00c5b0d19）已原地更新21/22，Core.73/Plugin.13/Controller.48保持，未来默认镜像.78；原容器ID、镜像引用、挂载、授权保持。公网预算首次工具交接和结果续聊均200，第三普通SSE实际Worker200/end_turn而Core503：共享重组器拒合法thinking_delta.estimated_tokens=50/null。真实已知2input/66output/read883/1h1585有唯一receipt及0.0141846费用，不能称无消耗或OAuth失效；首错即停，未重试或执行回退/inline。

候选已窄修共享credits和strict转换器，仅thinking_delta接受nullable非负整数显示估计，不写入内容/历史/usage，非法字段仍拒；增加Core固定stage/error_kind安全诊断。作者/独审解析器与HTTP拒答200回归绿，Root全protocol-codec测试与vet、Core目标1.065s与vet绿。新增隐藏ToolSearch真实CLI JSON/SSE 7.178s通过，估计不污染40/16真实用量。Core→Worker→CLI→隔离PG 133.786s通过后，独审补原始SSE的50/null原值断言，重跑132.761s转绿；进一步明确每次响应thinking块数首0/后4次各1，负例和Emitter3.042s绿，精确最终代码ABC保留为发布门禁，不把前一版绿当新增计数断言结果。拟Core.74/Worker.79，Plugin实际409依赖包不含两处解析器仍.13；尚未提交部署。详THINKING-ESTIMATE-CUSTODY-REPAIR与两份独审记录。

Worker.77已Git原地部署21/22，Core.73/Plugin.13/Controller.48保持；真实OAuth session_context JSON131.355/SSE128.441及Linux门禁通过。新公网首200但续真实provider400：历史tool_reference已恢复，冷CLI却只有placeholder/ToolSearch缺lookup原定义，session_context已正确通过。停止不重试；见PUBLIC-HELPER-BUDGET-WORKER-0.1.77。目录候选已有精确旧.77真实RED39.787s，新严格fake+OAuth CoreABC JSON131.127/SSE126.791s均GREEN，cold/rollback/完整hash/TAB/124/131/1h1647及唯一receipt不变；Root独立catalog目标0.318s通过。准备只Worker.78 Git发布，不再核心维护；完整公网闭环仍待验收。

session_context组合已取得真正前态RED38.463s（clean cb38旧Worker+dummyOAuth/profile+真实PG，原位置错502），当前hook JSON131.355s转GREEN：可信suffix至少一次且原TAB/同文不丢不重复，5公开6provider/124in131out1h1647/5receipt与cold/rollback/hash通过。独审严格位置/取消否例绿，Root低嵌套整理后定向1.187s通过，Core同组合SSE正在执行。准备冻结提交Worker.77，Core.73/Plugin.13/Controller.48保持，不将正在跑的SSE或候选当部署完成。

Core.73/Worker.76已按精确cb38发布，四核心ready，Plugin.13包逐字未变，Controller.48；原21/22容器/卷/凭据保持，Root独立核ID及fec43652程序hash。公开预算首请求已200/tool_use、两真实provider轮48/154/cacheRead1646/1h1921及一次已结算账务/receipt对齐；第二tool_result续聊502后立即停。确证session_context恢复用原public ordinal却发生在hidden插入后，非OAuth或Core丢链。旧Worker+dummyOAuth/profile/真实PG前态38.463s复现原502，新阶段hook独审已绿，真实新场景转绿验证进行中。下一版仅Worker.77不重复核心发布；详PUBLIC-HELPER-BUDGET-CORE-0.1.73。

候选 `cb38d953b554bcd47ed75c9c7ddec9436a4d90d4` 已提交推送。新尾system真实ABC SSE128.800s亦GREEN：5公开/6provider/5usage5receipt，124/131/1h1647及cold/rollback/尾hash均按原断言通过；与JSON132.041s共同构成核心协议/账本证据。该fixture单delta，不冒充多delta，其独立证据为CLI29.391s及engine用例。全部隔离隧道已关闭。服务器正在Git精确构建Worker.76/Core.73，尚未部署；不改Controller.48、不自动重建21/22。

新尾system真实Core/Worker/CLI/隔离PG JSON132.041s已GREEN：5公开/6provider/5usage5receipt，input124/output131/1h1647原预期精确一致，cold/rollback及完整尾system原位hash通过。同场景Core SSE正在20327运行，未当通过；该ABC每provider单delta，多delta证据来自作者最终真实CLI及独立engine，明确分层。官方BetaUsage的speed分类已沿一致性机制补齐并最终engine5.518s/vet绿。准备Git提交冻结后服务器构建门禁，不提前部署。

本候选计量修复已重新冻结：最终真实CLI12调用/多delta/尾system原位/nullable+必填检查29.391s通过；全engine含新独立10例6.118s、vet通过。新代理从实际runner路由另发现缺input被造0的RED，修复后负例原断言转绿；官方SDK nullable假设及nested partial扩展案例已明确纠正，见HIDDEN-SEARCH-USAGE-FRESH-REVIEW。Core/Worker/CLI/隔离PG按原124/131/1h1647预期重跑中，尚不能作为绿或发布证明。

新增Core/Worker/CLI/隔离PG尾system联调129.149s为真实RED：cold/rollback尾对象hash均通过，6provider/input124/output131正确，但隐藏首轮1h缓存1647未进入成功汇总。进一步独审复现合法多message_delta重复加隐藏输入/缓存：预期input34/1h1647，实际58/3294（1.135s RED）。另核跨轮service_tier/inference_geo分类静默丢失，正统一修正usage聚合。第二次昂贵联调在30.169s主动取消并清理专属测试进程/隧道，不当产品测试失败或通过。下一版发布暂停至这些真实计量缺口闭环，不能只以尾历史绿放行。

尾预算system候选已完成作者真实CLI隔离12调用22.530s（JSON/SSE、结果续聊、普通续、cold、rollback，完整尾对象hash原位），全engine5.815s/vet；独立HTTP ACK及同文不同位置/原对象不变/v1拒绝测试1.257s通过，Root另复跑独立测试1.123s。Core→Worker→CLI→隔离PG新尾场景正在跑，不宣称通过或已部署。失败已知分轮用量UI已独审并Root复跑2文件8tests，通过后推送d5c0b14b7，尚未上线。下一版拟Core.73/Worker.76，Controller.48不变。

Core.72公网502已定位为原生CLI在隐藏ToolSearch完整A/U后追加total_tokens预算system，当前leading-only校验在第二provider发送前拒绝；第一provider200完整返回，真实已知输入24/输出91/1h缓存写1647完整保存在replacement。账务failed/incomplete、0费用，不是零消耗或再次OAuth失效。正由CC补原位捕获恢复红例/API独审协议与集成/UI补失败分轮已知用量展示，禁止删除或重算CLI提示。详细失败及部署证据已推送b0a975d2e。

最新发布已完成：精确Git `2bd328b46b18415ff209ecfaa39e71f27c17407c`，Core.72四节点ready、Plugin.13、Worker.75原地更新21/22、Controller.48。未来默认镜像.75，既有容器ID/镜像引用/挂载/授权保留。核心维护503观测约38.30秒。以下未部署、等待刷新等段落均为较早快照。

OAuth根因修复已得到真实证据：去掉identity前置短命auth status，以一次原生CLI载体自动刷新并取得profile200；#22 access有效期更新至2026-10-09 05:41北京时间，issuer/generation不变，无遗留锁/CLI。随后一次正常额度查询200且token_expired清除，无需重新授权。管理状态为明确的local_snapshot，不将凭据存在等同在线认证通过。详见Worker.75及Core.72部署记录。

新公网预算工具验收首请求502，12.705秒，RID摘要 `72296893f0a03d6a3f676f25d7356c15495102622dc5fabdb6a108db7b8fa010`；已按首错即停，未执行后续续聊/回退/inline，也未重试。证据为 `evidence/public-helper-budget-core-0.1.72.json`。API与CC分别只读核核心账务和Worker首因，自动刷新成功不等于模型特性验收成功。

OAuth锁根因已由现场仅文件syscall证据确定：identity前置短命 `claude auth status` 创建刷新锁后约4ms就exit_group(0)，未完成刷新/清理；随后的carrier多次EEXIST后锁超时。不是权限或refresh_token被撤销的证据。access已过期，保存的refresh期限尚未到；正在去掉会制造锁的状态子进程，保留同次原生CLI刷新与真实profile身份确认，同时使管理状态查询纯只读。修复尚未部署，不宣称当前自动刷新已恢复；无需用户先重新授权。

位置payload2已有真实Core/Worker/CLI/PG JSON167.188s、SSE169.326s门禁转绿，各7公开8provider/7用量7receipt，原丢目录红保留。旧v1省略协商40CLI联合回归与共享/core独审绿；v1→v2真实PG混合链追加另在跑。Root另补首公开前无法锚定私有system必须拒的独立红1.432s→绿1.394s，未用静默漏记覆盖未知布局。全部仍是候选，不与线上.74混称。

当前实际Worker.74（精确Git2b349c61b6c3627f06c24b3d1954c426a03f90d8）已Git构建并原地部署21/22，原容器/镜像引用/卷/授权保留，独立核程序hash0cb68219fdcdc379aa1b9e7e015e2dcee1dafc4d04b3827c0cf82f9961e91bc4。Core仍.71/plugin.12/catalog.15，默认未来镜像仍.73。首因保留已生效：只读identity明确失败于CLI OAuth refresh lock_timeout，request_prepared=false/response_received=false；不是平台Key错误或模型资格。确认旧锁过期无持锁进程后仅原子备份锁，一次复验仍重新留锁，权限检查正常；正在纯假过期凭据/禁网Linux复现，未重新授权/改token/再发模型。详见Worker.74部署与OAuth锁源码核验记录。

普通custom inline+budget候选被独立真实Core/Worker/CLI/PG红例阻断：续聊丢失user与公开inline之间的内部目录system。作者16CLI绿未覆盖此位置，不能称可发布；catalog.16/plugin.13及相关源码仍未提交。v1完整A/U段不能表达独立system位置，API负责payload2协商/旧链兼容，audit负责Worker按真实锚点捕获恢复，完成合同与独审前不部署、不把红例改断言掩盖。

检查点d8dfa6e66已提交推送：安全预派发分类诊断与两次失败验收记录、部署记录归档；没有部署该核心诊断。资源身份首因调查发现Mod finally和Go result两处原错遮蔽，候选已保留首因并保持scope失败关闭，新增固定派发/响应状态事实；隔离资源载体仍绿，尚不能宣称线上identity已恢复。拟独审后仅Worker.74窄更新，用一次只读身份探针获取真实首因，不发模型重试。另由独立作者推进预算+普通custom inline历史目录/真实system尾锚点保真，尚未提交，不混入本窄发布。

最新线上：精确428164d4756e64163710910224957744554a2011已完成Core.71/plugin.12/catalog.15、Worker.73及Controller.48部署，四核心节点ready；#21/#22原容器ID/镜像引用/卷/授权保留。核心维护503窗口约37.32s，非零中断。下面“正在发布/候选”的段落为较早快照。

公开helper预算验收两次各首请求503后停止：首次控制器.47缺features路由，已Git构建.48修复；第二次能力检查成功，失败于#22 OAuth identity CLI载体主轮归属校验，原错 `main model turn ended without applying its client feature plan`。两次均无helper Reserve/Dispatch，0用量/费用；还不能称预算真实闭环通过。现由CC隔离复现修复，API补安全分类诊断，独审代理复核；不要求用户处理，不跳过身份校验。详细证据另存 PUBLIC-HELPER-BUDGET-CORE-0.1.71.md，原Worker.71五Read/Sonnet验收文件完整保留。

精确Git候选 `428164d4756e64163710910224957744554a2011` 已通过服务器门禁：OVH六包race真实DB726pass/3可选CLI skip、contracts64pass及vet；cc-max三个模块race/vet和禁网CLI34调用81.436s通过。签名Core.71/plugin.12制品已验证，核心发布正在进行，尚不能当完成。

Worker.73已按#22→#21原地备份/原子替换/重启完成，无真实推理。Root独立SSH核两个原容器ID和原imageRef.56不变，均running且程序hash为549bd6576d2c403c843a9a29108629ffb3745e76eb2fa018fe47c132e1dbbe31；作者health/features/catalog.15/schema1/授权前后验证已记录。原账号、卷、授权保留。真实最多4次public_helper_budget验收脚本已独审，等Core全部稳定后才发送，不能用已通过隔离测试替代真实提供商结果。

最终候选门禁已闭环：新真实requirement端点的ABC JSON120.731s通过（5公开请求/6隔离provider calls，强隐藏内容与预算断言、冷恢复/回退/outbox）；直连预检与旧404独立DB14.80s，长unknown20.74s、末第529项known25.37s非skip通过，所有测试隧道已释放。核心候选EnableHelperHistory=true与Worker真实schema1声明已接通，普通旧路径回归已消除；manifest.12/catalog.15。注意这里只是候选源码激活，不是线上部署。

Root最终整包测试engine4.427s、contracts全包、Worker全包、plugin1.638s、codec/strict通过；核心gateway5.836s/ccgateway/usage/core/app等非DB整包与vet通过，SUB2API_TESTPG=off的结果不当DB证据，DB证据以上列专门执行为准。前端20tests/typecheck独审已通过。准备冻结Git候选，由cc-max/OVH Git精确构建做Linuxrace/migration门禁后发布，现线上仍Core.70/Worker.72。

无helper兼容改用Worker真实parser的三态纯准入（ordinary/needs_custody/defer_to_ordinary），不复制工具规则；未知新链才探测，known仍完整恢复，旧Worker404回原plain准入不当能力证明。Worker作者普通预算6次CLI/全engine与vet通过；核心作者三态目标与vet通过，正在独审/最新ABC复测。原资源grant缺失等预检不能判断场景不提前拒绝合法主请求，须由原完整admission裁决。

Root另修长普通会话回归：prefix计算原逐轮重新canonical全历史变成单次canonical加增量hash（不可clone的FIPS实现保真fallback），不把私有32MiB限制套所有公开普通body。Lookup超过512仅在发现已知托管记录后拒绝，未知普通历史保持unknown，不能截前缀隐藏已知链。513轮摘要/精确数字/Unicode匹配目标1.038s及vet通过；长unknown/known首prefix的真实DB新增例正交CC独审，尚未记通过。

Root最新ABC SSE独审121.948s通过，真实Worker/CLI/隔离PG，包含加强后的预算presence、完整hidden assistant三块顺序/签名/工具字段、完整对象摘要、配对结果对象摘要、原位system、冷恢复/回退直接断言。候选Worker已加schema1真实声明，并删除ABC夹具的手工声明覆盖；插件候选升.12避免覆盖旧包，Worker server1.999s/plugin1.431s及vet通过。尚未提交/部署。

准备激活时Root发现旧能力兼容问题：C将任何task_budget新请求纳入custody，会误拦原本零helper/forced eager/关闭内部搜索或服务器工具路径，特别是带合法旧assistant历史或无managed issuer账号。核心Enable立即保持false；API与CC正提取共享精确判定，仅真正需隐藏轮恢复的新链托管，known链仍强制恢复。不是放宽未知隐藏历史，也不能以新happy-path测试绿掩盖旧路径回归。下一候选须追加这些负/正例后才能激活。

ABC首轮完整真实Worker子进程+CLI+隔离PG矩阵已通过226.505s：JSON/SSE各5公开请求、共12假上游调用，包含外部工具result、普通无budget夹轮、新Worker/新CacheDir/新AService冷恢复及回退；每组5冻结outbox，120/48原用量，重复Persist两次后usage/receipt各5且pending0。保留最初35.230s与26.287s两个红灯：真实身份返回AuthType附加事实导致整struct比较误拒，现仅按合同principal/generation核验，独立身份/资格/nilheaders回归1.203s/0.605s通过。根代理发现夹具对预算存在性及完整隐藏签名/规划块需要直接断言，正在加强并重跑，不提前把旧编译结果算新断言通过。

Anchor按位置摘要复用已读源码并独立helper组1.535s通过，严格重复key/边界与数字校验保留。目录.15/Worker schema只读展示由CC完成、audit独审20前端测试2.05s/typecheck/catalog0.265s/vet通过；partial和runtime_verified=false保留。核心Enable及Worker广告尚未开启，候选仍未部署。

计量receipt/冻结原始bytes、三态Lookup、失败延后隔离已独立验证并提交推送 `05fc6852f`，仍未部署。Root四项真实隔离PG169.465s通过，consumer/core定向0.750s/1.145s与三包vet通过；详细范围见 HELPER-HISTORY-ROOT-INCREMENTAL-REVIEW。C空headers合法响应panic已独立先红后修，目标3.060s/vet通过，属于未提交接线候选。

B system保真增量已作者12CLI及独审通过；部分计量偶发额外调用定位为未终态SSE EOF先交给CLI、relay停止晚于重试窗口。新增同步EOF门禁不改原字节/错误、不补终态，Root确定性独审1.205s通过。实际预算原准入早于helper鉴权的问题正以可信execution限定接线，普通伪造头不能授权。ABC真正Worker子进程+CLI+隔离PG测试已启动（作者research_api管理句柄8374），尚未取得最终结果，不能写成通过。

初始thinking桥已独立提交推送 `235559d6d`，未部署。仅暂存outbound响应桥hunk，不包含尚在整改的helper恢复hunk；依赖helper的12调用集成测试独立移至helper_history_initial_thinking_cli_test.go，仍属后续B候选。独立桥测试1.274s通过。根代理新增公开响应→下一请求prefix独立回归2.663s通过，覆盖签名、数字原词法、tool_result及非法终态。

B独审发现真实CLI内部ToolSearch前导非空system被旧提取忽略，不能上线该候选。作者正在基于原始两次出站和runner证明保存原位system；实际观察到单text块含ephemeral转纯string，只允许窄表示来源证明，持久化实际当前对象，不能将cache标记或system位置静默改写。C网关已接线并有作者测试，但一般能力仍关闭。

计量outbox单条永久冲突、或前64条损坏导致后续饥饿已复现并整改为持久延后逐条继续，不ACK坏记录；A新增next_attempt_at/retry_count/failure_code及损坏载荷隔离。C消费者目标测试已通过，A真实DB及根代理增量独审仍待完成，不能记为整体已通过。C收据独立真实PG33.719s通过，覆盖异事实/缺行/普通旧行/旧编码。DB全不可用明确失败，未引入另一个磁盘账本假承诺。

签名四处窄修已独审并提交推送 `f677d2de4`，尚未部署；详见 SIGNATURE-DELTA-REPAIR。initial thinking 桥另经 research_cc 独审，16次隔离CLI调用13.712s通过，包含初始正文/混合后续签名替换以及续聊历史；这部分仍为后续候选。C已开始实际gateway入口、派发、解包及持久接线，尚在补测试；A Lookup及用量receipt增量另交独立DB复核，不以作者测试替代独审。一般组合能力仍未开放。

Root追加复核：SSE `signature_delta` 的官方SDK语义是替换不透明签名，我方两个聚合器原为拼接。新增engine/credits回归均先红（initialfirst / initialfirstfinal），修改后完整engine5.353s、credits1.196s通过；包括空最终签名，思考正文不变。官方依据为anthropics Python SDK `src/anthropic/lib/streaming/_messages.py` accumulate_event及TypeScript `src/lib/MessageStream.ts` signature_delta分支（2026-10-08读取）。窄修尚待独审，未提交/部署。initial thinking桥由独立代理修复并有12次隔离CLI矩阵，不等于真实提供商验收。

用量冻结及ACK非DB定向复核core1.034s、usage0.705s通过。首次过宽测试正则误含DB例，本机PG仍缺global/pg_control而失败，未记DB通过且未处理本机数据库；实际DB证据仍以各代理的隔离PG记录为准。B正在补已消费隐藏轮后失败的部分计量，C仍在做网关接线。已知链每个完成公共轮（含无helper普通轮）必须保留收据；未知外部旧历史没有隐藏轮证明时不得猜测恢复。

同轮全next扫描另发现共享protocol-codec普通及strict Anthropic→Responses两处签名拼接，一并先红后修复；完整codec1.748s/strict1.254s及vet通过。因此候选共修四处聚合器，已交独审，不仅Worker端。B随后补齐部分计量：真实CLI隔离JSON/SSE首轮完成、第二轮EOF共4次提供商调用3.843s通过，实际已知用量逐调用记录且整体Complete=false；完整engine4.255s/vet通过，仍待独审和C跨层接线。

A检查点38a2a9d8f已推送但未部署。B纯codec独审已通过，整轮隐藏的text/thinking纳入完整捕获；runtime/carrier仍接线中。C用量consumer新增同事务摘要receipt与原始冻结bytes兼容，尚待全部集成独审，不能将唯一requestID误当异值费用已正确存储。派发前已知prefix跨namespace/过期链必须明确拒绝，不能绕到普通渠道遗失隐藏历史。

前端视觉补验未完成：CUA getState再次15秒超时；按Computer Use技能初始化@oai/sky成功，窗口查询可用，但get_window_state因无法可靠识别当前browser URL而按策略终止本轮Computer Use。没有页面点击、导航或有效截图。仅本地mock预览服务启动成功，随后已停止并删除本次临时web配置/bootstrap文件；没有接触真实账号登录或生产配置，不把组件测试/服务启动当视觉通过。

## 隐藏 helper 历史持久层检查点（未部署）

A存储层及0043迁移已独审真实PG9例通过，并提交推送38a2a9d8fe38435b5bfcd90edad7bc67daa203e8；没有接线或开放general gate，线上仍core.70/Worker.72/plugin.11/catalog.14。B作者research_cc、B独审audit_code_beta，正在补完整被buffer隐藏的text/thinking而非仅tool_use；已修未观测顶层字段可混入的问题。C作者research_api正在补carrier及usage outbox消费者；root发现仅ON CONFLICT成功可能误ACK异值RID，现用同事务摘要receipt，原记录raw/digest与未来字段兼容仍在补。所有B/C代码为本地候选，不混入当前部署证据。

## 最新真实闭环：Worker .72

精确提交e73b3392c64921c51439e63be5f118c761ae795e已原地部署Worker .72/default image .72，核心.70/plugin.11/catalog.14不重发。Sonnet构造unsigned pending历史一次真实200/end_turn17.584s，结果与pending ID配对、无新call。独立Worker816db358-b8a9-45d2-8d75-c266c652bf69核4roles/tail/system/安全与Token原位置保真，transport重复和marker不外发，默认thinking/context均缺省，实际provider仅1call，原result/终态完整相同。见PUBLIC-ACCEPTANCE-0.1.72；不是捕获真实pause_turn回放，也不宣称所有复杂组合通过。

持续目标仍active。通用内部预算持久helper历史A已有作者实现与隔离PG测试，独审发现MaxRecords预留不足和RequestID长度两处阻断正在整改；B已开始Worker捕获恢复设计，C有outbox骨架但未接线。相关代码均未提交/未部署，general gate未开放。不得将当前工作区未来0043等混入已发布SHA证据。

## 当前上线与下一窄修

aa6b3a905已完成 core .70 / Worker .71 / plugin .11 / catalog .14发布，默认未来镜像.71；原容器授权保留，维护503约36–38秒。五Read真实27.18s通过，Worker证原名/ID/输入/结果/TAB/一次认证上下文保真；核心两200/attempt1，各单用量单扣款，geo not_available事实已入库。

Sonnet复验不再是附件502，原四消息/尾部完全保真，真实上游一次400揭示另一个CLI默认泄漏：缺省thinking删除了但context_management.clear_thinking残留。候选仅主apiGeneration缺省字段表加入context_management，不改客户显式null/策略或辅助请求。作者24三态矩阵+24原Sonnet回归、独审24矩阵及显式非法组合400不重试/计数/辅助负例均绿，准备仅Worker .72发布；core/plugin/catalog不必重复更新。不能称Sonnet真实内容任务已成功。

通用budget隐藏history另开A/B/C工作，A新合同/持久服务/0043迁移尚在未提交本地，B/C仍对齐，不包含本次窄修发布。必须以精确Git SHA构建，不把工作区未完成账本混进去，general gate仍关闭。

## 下一发布候选已通过独审

准备 core .70 / Worker .71 / catalog .14 / plugin .11。Sonnet真实附件位置修复最终通过：长历史24隔离CLI独审；assistant之后附件不得归到前user的新增红例已整改，gateway/both JSON与SSE各8次受影响回归通过。zero-round及真实namespace、inference_geo字符串事实均独审通过。插件主动用新版本.11避免覆写既有.10制品，不表示插件wire不兼容。

主工作区engine全测4.522s/vet、SDKmanifest/check/platforms、核心usagerules/expr通过。补跑core ccgateway时误触本机已知损坏testPG（global/pg_control缺失），如实失败且未修删数据库；显式SUB2API_TESTPG=off后非DB测试1.847s通过，不能声称数据库回归通过。本候选未改SQL schema。待提交推送后服务器精确Git构建，原容器原地升级，稳定后复验Sonnet真实fixture并核地区fact入账。

## 后续候选进度（尚未发布）

准备核心 .70 / Worker .71 / catalog .14；源码尚未提交。两项zero-round窄修与实际toolHistoryNamespace隔离已独审通过；响应inference_geo开放字符串事实合同已独审通过，请求geo仍严格，需新核心支持string且实际检查插件包hash，如变化必须新版本不能覆写.10。catalog .14补零helper eager强制单轮预算说明，features测试通过。

Sonnet重复Token附件候选尚未完成：作者短历史24 CLI曾绿；独审在扩展多轮fixture后复现红灯，提醒可能在较后的真实user而非首user。正补按Prepared原生user实际位置绑定，并保留同请求鉴权Mod证据/实际wire原位三方校验；不同值、未知、安全附件与伪造仍拒。不借先前短矩阵绿宣称解决，不部署未审候选。

## 实际上线与真实验收（.70）

核心 .69 / Worker .70 / catalog .13 已按 e463222d Git 构建上线，四节点就绪，默认未来镜像 .70，原 #21/#22 容器/卷/授权未变。维护503约36–39秒，详见两份部署记录。

公开验收：完成旧工具历史一次200/refusal，日志证名称/输入/结果保真、仅一次上游、无新执行，但未完成标记任务且未发续聊；Sonnet构造pending历史出现真实502，定位线上保留的Token附件重复注入人工marker，尚未到上游，已开独立修复；max_tokens0初次400为提供商不支持thinking.disabled，原失败保留；移除此探针字段后另测0/1/SSE停止词三项全200，独立日志核原参数、每项一次上游、0不写assistant历史。见 PUBLIC-ACCEPTANCE-0.1.70.md，不能宣称全部验收通过。

后续两项窄修及实际namespace隔离已作者/独审通过但尚未提交部署：完成历史+safeguards按实际wire身份、零helper eager forced+budget、修正旧tag置于无调用configKey而不生效的问题。作者47隔离CLI、独审14隔离CLI及真实旧缓存索引切换回归通过。一般内部搜索隐藏history预算仍需持久方案，未开放。

## 当前候选：核心 0.1.69 / Worker 0.1.70 / catalog .13

本轮合并普通 API format + eager forced、已完成且不再声明的客户端工具历史保真、Sonnet 4.6 unsigned server pending 冷导入初始化。发布范围已扩大，取代下方早期“仅 Worker .70”计划。原 #21/#22 容器、镜像引用、卷和授权仍须保留；仅未来新建默认镜像更新。

完成历史修复作者 19 次真实 CLI 隔离测试通过，独审发现的混合目录过度限制与缓存指令指纹不一致已整改；最终独审含新/续聊/冷导入/回退及原名和大整数校验。Sonnet 作者与独审各 32 次真实 CLI 隔离调用通过，所有 bootstrap 路由零模型出站；不删除或迁移安全附件。主工作区 engine 全测和 vet、features .13 测试通过。详见对应独审文档。尚未部署本候选，真实平台验收将在稳定发布后执行；人工构造 pending fixture 不冒充实际提供商 pause_turn 历史。

## 最新状态（Worker 0.1.69 实测闭环，2026-10-08）

精确提交 `decd22f1f7e43f5fd45f426d192553f1d9f6494e` 已完成核心四节点 `0.1.68`、两账号 Worker `0.1.69`、目录 `.12` 发布；默认新建镜像 `.69`，现有原容器/卷/授权保持，发布维护 503 约 36–38 秒。媒体新证据 `public-media-citations-0.1.69.json` 三次全部 200：图片、首次文档引用及带完整引用历史续聊均通过，引用位置/标题/原文切片校验通过。Worker 日志核实 client 1 条引用→CLI 空数组→最终 wire 恢复原 1 条，完整 assistant 内容哈希一致。

`public-pinned-mcp-search-0.1.69.json` 一次真实请求 200/end_turn：实际 API 搜索→完整名称引用→匿名 MCP 工具→结果顺序及唯一 ID 均通过，验证本次提供商返回名称与 pinned 查表键一致；无 pause 续调或错误重试。此结果不扩大到动态未固定目录、未知编码、全部账号资格。普通 API format 与 eager forced 组合的额外资格限制是新发现的待修正项，下一候选仍独立开发，不称目标已全部完成。

普通 API format + eager forced 修正已完成作者与独审：唯一业务行复用 `structuredOutput()` 区分旧 synthetic 循环，保留原 format/choice/parallel、单轮及 helper 禁执行；双方各 26 次真实 CLI 隔离调用通过，独审原大整数/边界及 vet 通过。准备仅更新 Worker `.70`，核心 `.68` 与 catalog `.12` 无需变更（既有目录描述为结构化“续轮”限制）；未以 fake provider 冒充 Opus 5.5 强制工具资格。

该修正已提交推送 `3ba9a697dfe35d23719d8f98a67c93ef852fa26f`，暂缓 `.70` 发布以合并后续确证修复。Sonnet 4.6 合法 server pause 的隔离真实 CLI 测试证明：暖路径成功，冷 Worker 导入相同 assistant-tail 在上游前报 `continuation transport input changed`。同一 CLI 安全附件暖时在首 user，冷时附在最后 transport marker 前；不能删除或移动安全块来绕过。CC agent 与 API 独立评估用真实首 user、零模型出站的原生 bootstrap 是否能建立正确 CLI 状态，当前 guard 未放开；尚未证明方案可行或实现完成。普通文字 prefill 的模型限制仍另列。

bootstrap 后续两关隔离探针已通过：真实首 user 能在未获得任何模型响应时留下原生 user/attachment 前缀；同 session 复用该前缀并导入真实客户端 assistant 后，合法续接通过，安全附件仍位于首 user。当前是产品接线阶段，必须补全部 relay 路由零出站、取消 Wait 后读取、身份/大小/超时与复杂组合边界独审，不以探针代替产品完成。

另在核对已撤销客户端工具历史：三次真实 CLI 假上游证明 tools 为空仍可传输完成历史原 name/id/input；当前 reserved typed 名的无定义硬拒绝与未知历史自动加 MCP 前缀需进一步评估。#22 一次受控真实资格尝试 95 秒超时，relay attempted/forwarded 均为 0，没有提供商状态，不是模型拒绝；未重试或改网络/授权，正在只读诊断启动差异。见 RETIRED-CLIENT-TOOL-HISTORY-ASSESSMENT.md，当前未据此放开准入。

### Worker 0.1.68 阶段快照（以下版本与失败保留为历史）

当前精确部署提交 `9ba4b278217f077e39cc4e31bc63f50658382133`：核心四节点 0.1.67、Worker #21/#22 0.1.68、catalog `.10`，默认新建镜像 `.68`；原账号容器、卷与授权保留。核心发布存在约 36–38 秒维护窗口，不是零中断。

后续真实验收：Web 搜索/抓取均 200，结果与引用、实际 token 费用经独立日志核对；当前价格公式不额外收取 Web 调用费，不能称等于提供商总成本。图片识别、首次文档引用 200，但完整 citation 历史续聊出现 502。已定位 CLI 将原引用变成空数组 `[]`，恢复逻辑误认为冲突，出站前拒绝；正在窄修并独审，失败证据 `public-media-citations-0.1.68.json` 保留。此失败不影响此前五 Read/MCP/inline 三项已取得的证据，但意味着媒体引用不能宣称全链路通过。

最新候选已完成独审：空 citation 数组仅在完整 assistant/user/document 对齐后恢复客户端原引用，作者和独审各 8 次真实 CLI 隔离矩阵通过；pinned deferred MCP 搜索按完整身份表及历史位置验证，作者和独审各 8 次隔离矩阵通过。合并 engine 单测/vet、catalog `.12` 测试通过；原目录断言仍要求所有 MCP 编码未知而失败一次，已随限定 pinned 合同更新，不能误记成提供商验证。当前准备 Git checkpoint 后发布核心 `.68` / Worker `.69`；尚未将候选写成线上版本。真实引用续聊和 pinned MCP 验收均须在发布稳定后执行。

三项真实验收及独立 Worker 日志均已通过：同一响应五 Read/五结果/最终五标记，最后结果原始 TAB 完整保留；公共 MCP 真实参数分片、工具结果与终态；inline 添加/撤销工具后实际内部 ToolSearch，再交回客户端工具并续聊完成。详见 [PUBLIC-ACCEPTANCE-0.1.68](PUBLIC-ACCEPTANCE-0.1.68.md) 与两份部署记录。公开 inline 探针 JSON 的 `internal_search_verified:false` 表示探针自身不能验证内部执行，独立日志证据另列，不覆盖原始记录。

整体目标尚未完成：继续按官方预算合同评估/实现内部 ToolSearch 与 task_budget 的组合，并保留强制工具多轮、动态 fallback 等未闭环边界。不能将普通单请求已支持与所有高级组合已支持混同。

### 前一阶段状态（历史快照，以下版本由上节取代）

2026-10-08 后续 checkpoint：全 eager 普通客户端工具的 `any` 单轮保真扩展已通过作者与独审，原工具选择/并行参数保留，上游工具目录仅含客户工具，helper 执行禁止；19 次 named/any 隔离真实 CLI 与预算边界验证通过。catalog `.11` 为未部署候选。task_budget 门禁保留，原因修正为跨客户端续聊/冷导入的隐藏 helper 历史尚未持久恢复，不能按 usage 猜扣 remaining。另正在实现完整 pinned 目录的 deferred MCP 搜索身份映射；fallback+compaction 因无明确 attempt 归属继续拒绝，相关探针仅证明原始字段传输。总目标仍 active，未按这次 checkpoint 标记完成。

- 已推送第七/八批747c168、第九批cd4d5e40b及修正1186563e4。cd4迁移幂等测试3项失败真实保留；118仅按代码修复后Git重检重跑，没有上传源文件或借旧SHA报绿。
- 1186563 Linux隔离PG45432七包609项、全contracts55项、strict33项，共697项通过，race/vet无错误；2项core可选真实CLI测试skip另列。0042并发/过期同ID拒绝、重复迁移实际通过。见[LINUX-NINTH-BATCH-DB-VALIDATION](LINUX-NINTH-BATCH-DB-VALIDATION.md)。
- Worker #21/#22现已保留原容器/卷/授权原地升级0.1.67/full779c0630，CLI2.1.292、code_catalog `2026-10-08.9`。两账号各一次READY通过，实际本地Claude原生Read两轮也已通过；system/工具结果原文、附件唯一性及环境字段策略经日志核验。见[Worker部署](DEPLOYMENT-2026-10-08-WORKER-0.1.66.md)与[真实CLI验收](PUBLIC-CLI-ACCEPTANCE-0.1.66.md)，不扩大为所有特性云验证。
- 核心0.1.66已完成正常发布，四节点local/ready、schema0042及实际插件0.1.10包/二进制哈希已核验；维护503约36–37秒。默认新建Worker镜像现为0.1.67，原21/22容器/卷/镜像引用不变。公开JSON/续聊/回退/SSE/空参工具往返与稳定后count_tokens200；控制器刷新期间一次计数502单列保留。原真实本地Claude工具结果追加CLI附件的严格对齐错误已在Worker0.1.66修复并实测两轮通过，原失败仍保留。见PUBLIC-API-ACCEPTANCE-0.1.65。
- 当前已部署catalog .9已支持并准确说明：credit字符串/object/null与strict/best_effort托管、指定服务器inline MCP、非defer MCP+client ToolSearch、已登记PTC/代码执行容器账本、跨Worker同issuer诊断归属、内部ToolSearch逐轮缓存。早期“credit拒绝/MCP inline拒绝/PTC未接/诊断只本地”的结论不再代表当前代码。
- 普通APIformat是上游约束解码；普通forcedchoice/task_budget已有单主请求支持。旧内部CC synthetic格式循环以及forced/budget+内部多轮仍严格gate，不能混为普通API缺失。default动态fallback授权、跨issuer诊断workspace证明、deferred MCP未知服务器编码、独立Batches/Responses持久ID产品仍未闭环；真实提供商资格/计费效果不可用fake测试冒充。
- 37功能/8横切的当前对照见[FINAL-FEATURE-CLOSURE](FINAL-FEATURE-CLOSURE.md)。以下各批“当前/下一步”文字保留原时间点，以上最新状态优先；不删除失败与未验收事实。

## 本轮授权与约束

### 恢复后的追加闭环（2026-10-08）

- Read工具结果追加可信CLI附件的修复已提交推送 `56f93858ca7ab76ef9615baec6addf77e74ff205`，作者与独审各8次隔离真实CLI、engine单测/vet通过；Worker0.1.66已按服务器Git精确提交构建上线，真实本地Read复验18.949秒、exit0、两轮完成；默认镜像与控制器刷新后两个原容器身份均保持。
- 普通公开JSON/SSE工具往返、count_tokens稳定后均通过；真实diagnostics第二次返回messages_changed538且refusal正常200，持久归属同owner/account/issuer已核验。无cachehit或内容成功的扩大结论。
- 附件修复与剩余高级组合分开。独审发现“已装载目标的forced named tool+内部搜索开关”存在可缩小的硬限制，已安排后续候选窄适配研究/实现；必须保持原tool_choice且零内部回合，any/deferred/server等未证明组合继续限制。不得把仅未适配写成天然不兼容。当前真实Read问题不归因于此组合。
- 后续窄适配及CC实测per-turn-control兼容已完成独审并推送 `779c0630d8451ca9ff5840c2a552c5b3568aca0b`。forced目录保真/拒helper实际9次隔离CLI，per-turn两名称分别16次，作者与独审分别通过；engine/vet、目录tests、前端7项及typecheck通过。catalog .9随核心0.1.66候选，Worker候选0.1.67；服务器Git构建发布中，尚未宣称真实provider不再降级。插件未依赖此次features变更，无须功能版本递增，但发布必须核实际0.1.10包哈希与原包一致。
- 上述779c现已上线：核心0.1.66四节点ready、Worker0.1.67原容器/授权保持、默认镜像.67、catalog.9；本地Read完整会话仅两次200，无先400删字段降级，per-turn和medium原值保留；两beta公开API分别200。见PUBLIC-CLI-ACCEPTANCE-0.1.67。
- 下一候选三项均已独审：custom inline+内部搜索分离历史与当前可搜索目录（32缓存+8无缓存真实CLI），MCP流式input到CLI的等价桥（修正stale Content-Length、保留真实终态/secret guard），多Read最后结果被CLI trimEnd误判（精确25个JS尾白、恢复原字节，40作者多工具CLI及独立反序/Unicode增量）。root当前整合全engine4.191s/vet通过，catalog.10及前端测试通过；尚未部署该候选。
- 用户截图的05:03两次502分别触发已记录的22账号冷却到05:03:33/48，覆盖后续503；5工具与5结果齐全，非Key错误。真实MCP首次502另属CLI对参数delta提前abandon，不能把两种原因混用；均保留原失败证据，下一候选上线后分别实测。

- 根据上级目录 36 个 API F-* 特性、1 个 CC safeguards 特性及 8 个 O-* 横向任务完整评估并实施能保持语义的方案。不可等价项必须记录证据、拒绝行为与理由，不能以接收参数但忽略处理宣称兼容。
- 通用 API 特性放在「请求与工具」对应菜单，按功能聚合头、body、响应、历史；「附件与环境」改为「CC 特性」。自然支持项解释即可。
- 持续会话、完整历史调入新账号、回退后分支、system/工具/缓存均纳入测试。
- 可使用本地 CLI、#21/#22、cc-max 及 OVH 隔离测试环境；不得干扰 OVH 其它服务。保留账号容器/卷/OAuth，不按镜像差异自动重建。
- 部署使用已提交并推送的 Git commit，由服务器 Git checkout 后构建。不得上传源码快照。
- 每批实施后由非作者子代理复核，整改后才记录完成。用户不需要中途答疑；未决事项记录并采用有依据的合理方案。

## 起始状态

- Git 基线：f7b78a55fa3158317887a46a864d1a32226e99c0，分支 feat/next-platform。
- 已有未提交 UI 附件三选项/配置迁移修改纳入本轮；独立 cwd_probe_cli_test.go、artifacts/、pelican-bicycle.svg 不视作本轮实现证据，不擅自删除或提交。
- 文档中采样/停止词/完整 tool_choice 等请求能力确有缺口；真实 CLI 历史测试旧 namespace 夹具正在修复，不能先归因为生产续聊故障。
- 会话原有持续目标仍为 active；本次 CreateGoal 因已有目标失败，没有重复创建或把旧目标伪标完成。

## 分工与文件所有权

- 主代理：整体设计、共享特性目录/协议契约、core/plugin 路由、relay 主请求归属与最终 wire 处理、集成评审/部署/总验收。
- audit_code_beta：请求解析/RequestPlan/CLI 配置，第一批非消息参数和工具选择；记录 REQUEST-PROGRESS.md。
- research_cc：前端功能目录与 CC 特性重组、配置迁移/展示验证；记录 UI-PROGRESS.md。
- research_api：隔离真实 CLI 基线、历史夹具、主请求识别/复杂协议可行性实验；记录 VALIDATION-PROGRESS.md。
- 共享文件改动先协调，所有人不自行提交、推送或部署；主代理统一集成。

## 起始实施批次与退出条件（历史计划，当前状态见顶部）

1. **基础与契约（进行中）**：保真字段计划、功能目录、版本、主模型归属、修正历史夹具。功能未真正接入 relay 前不得显示支持。
2. **普通 API 完整往返（进行中）**：采样/停止/metadata/工具选择/工具元字段/推理/输出/缓存、system 元信息及响应保真；逐项请求-响应-历史测试。
3. **复杂协议能力（进行中）**：服务端工具、Tool Search、文档/资源、上下文/压缩等逐项实际 CLI 验证；可兼容项实施，不可等价项明确拒绝并说明。
4. **调度与协议边界（进行中）**：历史复用/新账号/回退分支，附属端点及其他协议的适配范围，日志溢出/取消/错误分类。
5. **独立评审进行中，部署待开始**：代码规范/语义/安全边界评审整改，Git 提交推送，服务器 Git 构建到隔离测试环境和专用 cc-max，逐功能实测。
6. **完整验收（待开始）**：36 个特性与 8 个横向任务逐条给源码、测试、实测和限制；不能把部分通过、假上游通过或部署成功混为全项完成。

## 当前记录

- 2026-10-08：核对调研文档及当前源码，启动三条子代理工作流。CodeGraph 项目绑定通过；主要已知文件直接读取。
- 2026-10-08：确定 Request.ApplyMainRequestFeatures 接口；仅已确认归属的主模型请求可覆盖客户端参数，不能将参数无区别应用到权限分类器/内部请求。
- 2026-10-08：共享特性目录采用插件配套独立 contracts 模块，数据/契约与 engine、核心运行逻辑分离；前端从 core 读取目录，不维护另一份能力状态。

## 第一批实现与证据（2026-10-08）

- UI：通用 API 特性/CC 特性重组；后端 `GET /system/ccgateway/features` 单一目录，明确 `runtime_verified=false`；19项组件测试及类型检查通过。独立审查修复 core Docker context 排除 contracts 的构建阻断。实际浏览器检查被 CUA 连接错误阻断，不能称已视觉验收。
- RequestPlan：采样、停止词、service_tier、tool_choice 的精确JSON验证与出站覆盖；metadata.user_id上限512并保护内层身份。数值边界经独立审查修正；adaptive+forced不做全局误拒，模型限制由上游判断。
- 主请求归属：每请求随机 append section + 已鉴权Mod turn租约，严格剥离后转发，不改辅助 model.complete/classify。原生 snapshot 会重用旧nonce的失败已实测保留；新参数请求同时关闭CLI与initialize的snapshot开关。逐turn校验和nonce其它位置泄漏防护经过独立整改。
- 真实 CLI 2.1.292 隔离验证：原TestRealCLI修fixture后70次回环请求完整通过；新FeaturePlan九请求覆盖新会话、续聊、开关切换、回退fork、新cache导入、forced工具结果续聊及SSE。最终wire无nonce且客户端system保留。只证明真实CLI+假上游链路，不证明真实上游模型采用参数。
- 响应：登记6类非执行envelope扩展；真实CLI流能保留，但JSONL除stop_details外不保证落盘。因此新增响应RawJSON checkpoint链，关联native anchor和client hash，支持重启/分支与旧snapshot；不将envelope塞回messages。structured原有不建native snapshot仍是待补持久化边界。
- SSE：主代理复核发现message_stop重建丢扩展，已整改。真实CLI→完整Worker HTTP外部JSON/SSE × start/delta/stop × structured共12组合验证通过，终止事件仅一次，late safeguard结果不搬到start。
- 日志：超64MiB保留有明确truncated状态的partial记录；关闭purge不复活，完成后拒迟到记录，metadata独立256KiB预算。独立审查补每request互斥与固定锁序、慢客户端不阻塞日志开关。core透传实际限额，UI展示24h/单请求/软总额，旧Worker明确未报告；定向Go与UI测试通过。Linux race仍待执行。
- Tool Search：原生CLI server search块续聊/fork/新HOME导入实测可行，已开始Worker codec/typed工具注入；首个完整6请求Worker回归通过，边界测试与独立审查未完成，尚未标正式支持。
- 新发现CC专有字段safeguards/safeguard_results，已新增专项研究/实现任务；不能只靠公开API字段清单宣称CC全面兼容。
- 原生工具：2.1.292实测目录收集到26名称、28schema变体，目录升级/混合工具验证进行中，未观察的隐藏工具不伪造定义。

分项日志：[UI](UI-PROGRESS.md)、[请求](REQUEST-PROGRESS.md)、[响应](RESPONSE-PROGRESS.md)、[历史响应](HISTORY-RESPONSE-PROGRESS.md)、[验证](VALIDATION-PROGRESS.md)、[独立评审](REVIEW-PROGRESS.md)、[归属审查](ATTRIBUTION-REVIEW.md)、[服务端工具方案](SERVER-TOOLS-PLAN.md)。

## 部署准备与禁止误报

第一批checkpoint验证：companions、Worker、contracts、平台插件的各模块普通单测和vet通过；core仅定向ccgateway配置/目录/日志等无数据库测试与包vet通过（未冒充core全库数据库测试）；前端typecheck及27项组件/策略测试通过。真实CLI大回归在2.1.292目录升级与MCP描述修复后再次70次回环请求通过，另有API搜索6次、RequestPlan9次、safeguards4次、HTTP响应位置12组合证据。所有假上游结果只作该层证据。

已补CC safeguards主请求保真，保持Mod/stdio本地执行deny；历史工具名会改变时明确拒绝。2.1.292目录最终为29名称、32schema变体；Read/Bash/Write+已有MCP+自定义+缺失工具fallback混合验证无本地写文件副作用。具体模型的真实classifier verdict、Linux跨平台目录与真实API行为仍待下一阶段验证。

- 第一批检查点已提交并推送：`e927e44f04182b1ee8e0942889ccedd2085edb9b`，96文件；线上仍是此前版本，尚未替换/重启账号容器。目录unsupported/partial是当前实施状态，不是所有不可行项的最终结论。
- 只读检查OVH当前账号为debian，HOME `/home/debian`；生产sup2api四节点端口3130–3133，多种其它服务运行中。隔离PG45432/Redis36379存在，不得拿生产数据库跑测试。
- cc-max `/root/sup2api`为现有Git checkout（只读观察HEAD36aeea1c5）；已有git-release目录、Worker0.1.64镜像及#21/#22旧镜像标识的保留容器。尚未更新、重启、删除任何服务器资源。
- 本机无gcc/CGO，race尝试未成功，不能把并发单测写为race通过；计划在服务器Git拉取checkpoint后用隔离Linux构建环境运行。

### 检查点服务器验证

- cc-max经Git fetch检出 `/root/ccgateway-features-e927e44f0`，OVH经Git fetch检出 `/home/debian/sub2api-next-test/git-features-e927e44f0`；均核对完整commit与干净工作区。没有上传源码。
- cc-max使用Go1.27.1/GCC隔离容器、只读源码、2CPU/2GiB运行 `go test -race -p 2 ./engine`，通过（15.465s）。原有worker-builder镜像实为Go1.21.13且无GCC，未拿它做伪验证。
- 从该Git检出构建 `ccgateway-worker:features-e927e44f0`，CLI明确2.1.292，镜像revision标签为完整commit。镜像构建通过；断网临时容器默认8787健康检查通过。首次探针漏设必需的合成CCG_API_KEY被正常拒绝，补齐隔离key后成功；未挂载账号授权或调用云模型。
- Linux真实CLI全组验证已在独立断网容器完成，`-test.run TestRealCLI -test.v` 最终PASS/exit0；产物目录 `/opt/ccgateway-runtime/feature-validation-e927e44f0/`，日志 `cli-linux.log`。覆盖该checkpoint全部真实CLI前缀测试（含响应12组合、safeguards、搜索/历史等）；仍是隔离假上游，不是账号真实推理。

### 第二批当前分工

- audit_code_beta：正整数max_tokens权威值已本地实现/实测，0token预热JSON到CLI SSE桥接进行中；不是只接受0后照常stream推理。
- research_api：document/URL image输入及引用历史保真；发现CLI丢citation/clear_at/inline effort的负证据，引用恢复实施中，system生命周期扩展仍未开放。
- research_cc：Worker能力端点/core只读账号代理/controller GET白名单/UI账号能力和schema1契约，本地验证已做，数据库ownership/Python控制器待服务器验证，账号列表分页收尾中。

### 第二批追加进展（尚未提交/上线）

- max_tokens：正整数主请求保真及0 token非流预热桥接已实施，gzip/逃逸marker与历史不污染经过独立整改，真实CLI隔离HTTP测试通过，详见LIMITS-PROGRESS。
- metadata：纠正第一批错误的“身份冲突拒绝”；官方user_id是归因而非鉴权。显式metadata对象原样替换、缺省保留CLI；HTTP凭据始终仍属容器。真正本地外层CC测试暴露system缓存块边界错误，缓存owner已修，完整双CLI回归继续中。
- thinking/output：发现CLI会省略disabled、强加默认effort、拒绝API updates/between_tools参数；现由已归属主请求表达API语义。API format改为真实上游约束解码，refusal/截断单次返回；首批假上游往返通过，签名历史与独立审查进行中。
- 主代理：新增direct服务端web_search/web_fetch的6版本API定义、结果/错误/引用、URL source专用工具名路由；36次完整Worker/真实CLI隔离请求通过（6版本各新/续聊/下一轮/回退/新cache导入/SSE）。不执行本地抓取，不把上游工具变MCP。pause_turn及未完成服务端调用与客户端工具混合还在适配，不宣称完整Web协议完成。独立审查已分派research_api。
- F-CACHE及media的共享历史对齐仍在收尾，禁止在完整外层CC测试和审查前部署第一批checkpoint到#21/#22。

## 验收台账

### 第二批续接记录（2026-10-08，当前未提交部署）

- Metadata 已纠正并完成真正外层本地 Claude CLI → Worker → 内层 CLI → 隔离假上游测试，两种合成认证模式保留外层 user_id 原值；这不是实账号 OAuth 验证。
- F-CACHE 原位断点、1h/5m 顺序、顶层自动缓存及新/续聊/fork/冷导入已实现并独立复核。显式缓存与尚未适配的内部轮次/服务端工具组合具体拒绝，不默默挪动断点。
- F-THINKING/F-OUTPUT 使用已归属主请求 API 参数；去掉 CC 默认 thinking/effort 对普通 API 的干扰，API JSON schema 不再模拟成 StructuredOutput 工具。真实 CLI 的终态/拒绝/截断、签名历史与冷重建已过隔离测试。
- F-SYSTEM 增加 clear_at 和 inline effort 元数据，保留原位置/生命周期；空 effort-only system 没有文本伪装。25 项及 12 轮长历史隔离测试完成。普通客户端 system 不被附件来源策略删除。
- F-CONTEXT/F-COMPACTION/assistant-tail 已实施；Opus 的暂停续接和压缩响应回放通过，Sonnet 额外 Auto Mode 安全附件无法等价恢复的生成组合仍明确拒绝，绝不搬移/删除安全指令。独立复核修复 thinking.signature 被误判为 compaction.signature；JSONL 轮询未变时不重复扫描。
- F-COUNT-TOKENS 首版独立复核发现计数 CC 扩展输入的语义错误，已改成计数客户端原始 body；6 项真实 CLI及 40 轮长历史/原始 schema 字节一致测试通过。Sonnet prefill 计数通过；不调用生成上游、不创建历史快照。
- F-WEB-TOOLS 已扩展至 7 版本；36+6 次完整 Worker/真实 CLI 隔离请求及8次混合延迟服务端结果流程通过。嵌套 WebFetch document 的缓存字段审查问题已修复，客户端引用来源纳入精确对齐。
- F-ADVISOR 三种结果与续聊/移除定义/冷导入12次隔离请求通过，CLI 省略的 Advisor 历史通过已注册 omissions 与完整非 system 序列校验恢复。只有 Advisor 块的历史组合仍在复核。
- Task budget 六项合法参数隔离往返通过。Fallback 响应桥接修复 CLI 漏掉原始 SSE 边界和历史块/trigger；10 项真 CLI 隔离验证通过。请求 fallback/credit 仍待多模型账务、非流式原始 JSON 桥接和账号亲和，不能据响应 codec 开放请求。
- 平台关联模型计费：官方 Advisor 顶层 usage **只包含 executor**，额外顾问 tokens 必须独立计价。新增描述式附加 usage 抽取、累计快照替换、独立价格快照、预扣与结算持久化；gateway 校验关联模型的分组权限、账号模型及价格并映射字段。独立复核修复插件 BodyPatch 在前置检查后改变关联模型的越权缺口。JSON/SSE/重复事件/未知模型账务错误测试通过；真正 PostgreSQL 结算重试测试仍待 Linux 隔离数据库。
- 主代理独立账务复核修复 Submit(nil) 在拷贝附加项前被解引用的问题，回归通过；不是只依赖实现者自测。
- F-CLIENT-TOOLSETS/F-INLINE-TOOLS 正在实现，四类 typed/toolset 首16次真 CLI 隔离流程通过，但完整版本/工具时间线组合未完成，勿提前标完整支持。
- F-FAST 与 Diagnostics 正在补主请求精确保真和可信 scope/message ID 归属索引；不得将 metadata/session_id 作为租户鉴权。
- Worker 普通单测、vet 通过；前端 `npm run typecheck` 与4文件25项组件测试通过。误用 pnpm 自动生成的 lock/workspace 文件已移除，`npm ci` 使用原 package-lock 恢复依赖；不把失败 pnpm 命令写成成功验证。
- 第一批 checkpoint 的 Linux race/完整真实 CLI 隔离测试已通过；第二批仍需新 Git checkpoint 后重新验证。没有把尚未提交的变化传至服务器，也没有重启/替换 #21/#22 或 OVH 其它服务。

当前分工：主代理集成/关联模型准入/独立账务审查与部署；audit_code_beta 多模型账务基础及主代理 gateway 独立复核；research_cc typed client tools/toolsets/inline 工具时间线；research_api 服务端工具独立复核、fast/diagnostics。详细证据见本目录各专项 PROGRESS/REVIEW 文件。

### 第二批冻结与集成检查

- 三个子任务已达到当前检查点冻结状态。typed12版本×6流程、API ToolSearch与typed组合8流程、inline引用/按值10流程已通过；独立复核修复typed搜索引用和移除toolset定义后的历史身份恢复。非空compaction.tool_changes、inline服务端工具暂时具体拒绝。
- 快速模式不再只设置CLI fastMode；精确主wire值与缺省清理已经实现。缓存诊断用可信host scope及Worker消息ID归属索引验证，1小时/4096条有界，独立于调试日志。受控授权/注销换代防旧请求迟到复活，宿主机绕过接口换授权仍是明确运维边界。
- 独立账务复核后，Compaction同样进入额外计费项，主模型身份由核心传入，不信任任意response model。JSON/SSE真实HTTP测试通过，包括最终speed/服务等级/地域和Web用量事实、重复delta不重复收费。
- 新SDK事件级facts需要声明后才可映射，初次整合检查因未扩展schema验证而失败，已补声明校验与enum回归，不通过放宽未知字段修复。
- 前端类型检查与25项定向测试再通过；Worker全部单测/vet通过；插件manifest测试已从错误的“每个SSE事件都有全量字段”假设改为实际累计快照语义，并通过。正在运行当前整个 `TestRealCLI` 集合；不能把尚在运行当完成。
- 当前其他协议/资源结论：next的converter registry尚无builtin转换（legacy存在另外一套）；Files/container/MCP connector资源字段的CLI传输probe8场景通过，但平台资源归属/端点产品未建立，继续明确拒绝。下一批复用legacy codec的设计见 PROTOCOL-CONVERSION-PLAN；资源边界见 RESOURCE-PROTOCOL-BOUNDARIES。

所有特性初始均为待评估/未完成。下列行只记录本轮工作状态；现有能力不是不存在，也不代表本轮已验证。

- 请求/输出：F-MODEL、F-LIMITS、F-STREAM、F-SYSTEM、F-MESSAGES、F-THINKING、F-OUTPUT、F-SAMPLING、F-STOP、F-METADATA、F-CACHE、F-DIAGNOSTICS。
- 工具/资源：F-TOOLS、F-TOOL-CHOICE、F-TOOL-SEARCH、F-TOOL-STREAM、F-CITATIONS、F-IMAGES、F-DOCUMENTS、F-FILES、F-SKILLS、F-WEB-TOOLS、F-CODE-EXEC、F-PTC、F-ADVISOR、F-CLIENT-TOOLSETS、F-MCP。
- 上下文/服务：F-CONTEXT、F-COMPACTION、F-INLINE-TOOLS、F-FAST、F-TASK-BUDGET、F-FALLBACK、F-ROUTING、F-COUNT-TOKENS、F-OTHER-APIS。
- 横向：O-REGISTRY、O-HISTORY、O-ATTACHMENTS、O-ERRORS、O-LOGGING、O-UI、O-PROTOCOLS、O-VALIDATION。

## 恢复工作的方法

先读本文件与三个分工进度文件，再检查 git diff/status 与实际测试产物。状态记录不能替代当前代码/运行证据。每批补充命令、结果、commit、部署目标和未解决事项后更新本文件。

### 第二批检查点与第三批启动（2026-10-08）

- 第二批检查点 b52f5fc1c18a364e06b978cec39d29490f4bdd11 已提交并推送，OVH 与 cc-max 通过 Git fetch 新建并核对干净 worktree。没有上传源码，没有更新线上容器。
- Windows 完整真实 CLI 隔离集首次 FAIL347.123s：旧 TestRealCLI 将 tool_choice:none 断言为删除工具目录、Fast 缺 beta、管理员关闭时期待静默降速。已改为校验原客户端定义+none及明确400/无上游调用；主集单用例67调用PASS50.697s，完整集合重跑中。普通refusal原始完整message_stop阻止隐式继续的race修复4种JSON/SSE组合通过，独立复核通过。
- OVH 隔离 PostgreSQL 45432 的 Linux race：gateway/convert/usagerules/billing/ccgateway通过；usage新DB回归首次失败。原因是测试直接调用事务settle后错误期待process层markFailed已运行；修正为走完整process并检查ledger故障确实触发，数据库复测待进行。没有改业务结算以迎合测试。
- cc-max #21/#22容器ID与既有镜像未动，实际CLI为2.1.288；本地主要验证2.1.292。上线前必须核验/原地更新CLI，不能只替换Worker后忽略版本差异。
- 第三批已开始：共享协议codec机械抽取（root独立AST核对104公开符号签名完全一致）、请求专属PreparedConverter、search_result/图片transformations/错误响应header完整链路。新增文件未混入第二批checkpoint。
- 所有线上部署、真实提供商推理、资源资格和UI视觉检查仍未完成；隔离假上游与编译成功不能作为这些工作的替代。

### 第二批验证完成、第三/四批集成中（2026-10-08 07:50）

- 第二批 Windows 完整真实 CLI 隔离集 PASS 376.624s；cc-max 从 b52 Git 源码编译的 Linux 完整 CLI 集 PASS。Linux engine/Worker/contracts race 与 vet 通过。控制器在既有 0.1.47 镜像中挂载 Git 源码只读运行，39 项 Python 测试 PASS 6.616s；宿主机缺 docker Python 依赖的失败不计作代码失败。
- usage DB 测试夹具修复已提交推送 af29d31ecf42366fdc5bffdf9b4993ade9c9c4a0；OVH 测试 worktree 经 Git 更新到该 SHA，隔离 PostgreSQL 45432 全 usage race PASS 5.010s。第三/四批尚未提交或部署。
- #21/#22 原容器各用原 CLI 2.1.288 完成一次真实 Opus 5.5 简短推理。#22 原授权 Files GET 200，Models 返回 code_execution.supported=true；只是账号资格基线，尚未上传/执行资源，不能证明新代码通过。详见 REAL-ACCOUNT-BASELINE。
- 第三批共享 codec 已抽取并通过独立复核；next 核心已接 OpenAI Chat Completions/Responses 严格转换。HTTP JSON/SSE/正常拒绝/截断/断流/权限/原始用量检查通过；完整核心→Worker→真实 CLI→假上游 50 次通过（包括 30 轮、回退、冷导入及数值精度）。OpenAI SSE 为确定终态拒绝而有界缓冲，已记录延迟取舍。
- search_result、图片 transformations、JSON/SSE/count 响应安全 header 已实现；55 次媒体/历史与 4 次成功响应 header 真 CLI 隔离验证通过。不是云端图片识别资格结论。
- 真实 CLI 揭示工具大整数舍入与初始非空 tool input 原生历史丢失；采用已归属原始输入、严格完整历史对齐和既有 responseOnly 重建修复。缓存键保留精确客户端数值。混合 MCP pending call 丢失另由注册遗漏集合恢复，禁止全局宽松对齐。
- 第四批显式 fallback 已接模型权限、参数价格快照、每次尝试替代主用量、最终真实 JSON/SSE carrier。8 次真 CLI 隔离调用通过；多次尝试不重复加最终用量，免费拒绝仍计限流。缺 per-attempt 归属的 compaction 组合将具体拒绝；实际 speed 等事实不能复制给前面尝试。DB 新 replacement 测试待下个 Git checkpoint 在隔离 PG 验证。
- 第四批 MCP connector 的请求/响应/历史与凭据日志隔离已实现，混合工具和跨 SSE 碎片凭据回显保护仍在收尾。Files/container/Code execution/PTC/Skills 资源产品与 fallback default/credit 尚未完成，不把这些记成不可实现。
- 07:47 本机 gateway 全包测试仍因旧 PostgreSQL 缺 global/pg_control 失败；convert/usagerules/core 通过。将数据库部分放到隔离 Linux PG，不修复或删除本机数据库。
- 当前分工：root 核心协议/模型授权/账务绑定与资源设计；audit_code_beta fallback/结算及资源预研；research_cc 精度与 Worker 绑定地址后独立复核 fallback；research_api MCP 收尾后独立复核精度。完成第四批后冻结、提交、Git 拉取测试，再推进资源批次。

线上 #21/#22 仍保留原容器与授权，没有更新程序、CLI 或镜像默认值；OVH 四个生产节点未发布本批代码。

### 第三/四批冻结复核（2026-10-08 08:10）

- MCP 完整作者集 24 次真 CLI 隔离调用通过；独立审查额外复现 initial input 与 listing schema 数值舍入，修复已完成。listing 复制 pin、续聊和冷导入 3 次精确上游 wire 检查通过。工具输入恢复现在包括 client/server/MCP 的调用与 MCP listing.tools；非数字字段改变仍拒绝。
- Worker bind 独立审查揭示指定非回环 IP 会让本机 relay 拒绝。现只接受 loopback/unspecified，localhost 同监听与内部 URL 一起归一 127.0.0.1，默认容器 wildcard 行为保留；未放宽 relay 回环访问要求。
- 主代理复核修复 MCP 凭据前缀检查的二次复杂度，改为一次预计算的线性前缀匹配；不完整工具 JSON 与未解码内容编码具体拒绝。调试结构化脱敏保留 json.Number，避免日志证据自身舍入。
- 显式 fallback 独立复核通过；真实终态事实只绑定最后一次采样，先前模型/缺失事实不补零，价格表达式依赖缺失事实时记录 BillingError。新的 gateway API200/计价快照/事实回归通过。
- catalog 已更新为 2026-10-08.4，MCP 两版 beta 收入统一注册，不再单独在 Worker 硬编码准入。OpenAI 协议/MCP/fallback 的前端介绍反映实际子集与限制。
- 冻结模块 tests/vet：shared codec、engine、Worker、SDK manifest/platforms/contracts 通过；本机 core/gateway/usage/billing 用 SUB2API_TESTPG=off 运行仅作为非DB检查，数据库将从新 Git checkpoint 去 OVH 45432 验证。
- 第五批仅新增时间线 helper 与资源设计/新模块，尚未接线。主代理提交时将第五批半成品和原有无关文件排除；不能把未接线 helper 当功能完成。

### 第三/四批 Git 与第五批实施（2026-10-08 08:29 CST）

- 第三/四批已提交推送 bfcbc3b4203cb664e53db305da4fadaecda67106（185文件）。OVH `/home/debian/sub2api-next-test/git-features-bfcbc3b42`、cc-max `/root/ccgateway-features-bfcbc3b42` 都经 Git 新建并核验精确 SHA/干净目录；未上传源码。
- 此 SHA 在 OVH 隔离45432数据库跑 gateway/convert/usagerules/usage/billing/ccgateway 全目标 Linux race+vet通过，含 replacement 冻结重试；cc-max engine/Worker race+vet通过。初次数据库启动脚本未处理镜像默认 POSTGRES_USER 而在执行测试前退出，已采用默认 postgres 后重跑成功。
- Worker 镜像 ccgateway-worker:features-bfcbc3b42 已由 Git 工作树构建，revision标签为完整SHA。镜像manifest sha256:3d408acbd2a7b4bceaf8aa13ad64ef9d18f935770c1d13af7b59240ab98f720f。完整 Linux CLI 隔离集与 legacy backend Docker 构建仍在进行，不能提前记通过。没有原地更新21/22或发布OVH核心。
- 第五批 inline/server/compaction 时间线已实现，core 三个已声明 Advisor 路径均鉴权/冻结价格/调度，签名历史 identity-only。核心HTTP 12场景通过。独立复核修复64模型引用把参数facts误计入上限、同模型位置换name重复声明；也修复已撤销工具被ToolSearch重新激活和显式空压缩净变更未reset。独立真CLI时间线40次隔离请求通过。
- 新 providerresources 服务/0038迁移具备owner(UserID+GroupID)、固定issuer/account generation、quota、reserve/Finalize/uncertain/confirmed failure/delete状态机；默认不主动过期。SQL过滤分页Query正在与Files HTTP接线，DB生命周期/并发/分页测试待下一Git检查点在隔离DB跑。
- Files核心HTTP五路由及Worker专用认证承载正在接线。Worker首3次真实CLI隔离GET/POST multipart/DELETE证明无收费/messages请求、二进制保真、无历史cache；真实账号profile/schema及完整资源CRUD资格未完成。稳定issuer需真实OAuth profile或显式API key管理身份，不能用token哈希或runtime版本替代。
- 当前任务归属：root共享账号resource transport/app接线/独立review与部署验证；research_cc Files HTTP/分页/上传；research_api Worker资源操作/issuer/spool/历史验证；audit_code_beta资源持久化及模型file_id ACL/固定账号映射。CodeExec/PTC/Skills、generated resources与credit仍后续依赖项，未误报完成。
- 前端typecheck通过；第一次定向vitest误写.test.ts导致No test files，正改为实际.spec.ts执行，此错误不算测试通过。

### 第五批独立复核与资源闭环（2026-10-08 08:51 CST）

- 上条前端定向测试已完成：实际4个.spec.ts共25项PASS，typecheck PASS。没有因文件名错误少测后直接记通过。
- `bfcbc3b42` legacy backend Docker镜像构建PASS；Worker镜像默认8787健康启动PASS（fixture调用Key，CLI 2.1.292）。完整Linux CLI集有2项历史用例在并行Docker构建期间20秒超时，其他项目通过；构建结束后用完全相同测试二进制分别连续3轮复测，两项均PASS。保留原失败日志，不能把原完整集合改记全绿。
- Files核心HTTP独立审查修复多值beta与显式版本丢失、安全响应头缺失、慢上传占满4个spool槽以及稳定版误用legacy文件名限制。真实TCP验证60秒空闲deadline按每次读重置；不会用总上传时长截断持续有进度的客户端。Worker资源转发另有10分钟总deadline。重复workspace/版本头的歧义也已具体拒绝。
- Worker独立审查修复CLI默认版本覆盖客户端资源版本，并将resource identity从会话cache移到独立DataDir目录。相同issuer重授权保持资源代际、真正换issuer或显式API key epoch才轮换；缓存替换与重启稳定性回归通过。
- Worker file_id验证已完成4类输入×6流转共24次真实CLI隔离请求，包含续聊、回退、冷导入、SSE及count；核心只映射已授权文件并固定原账号，Worker再次核验真实issuer和受控ID列表。资源调试日志补充中，二进制内容以明确的metadata/hash记录，不伪称已保存原始binary。
- 当前本地app/ccgateway/gateway/providerresources测试与vet通过；SUB2API_TESTPG=off明确跳过数据库部分，下一Git检查点再跑隔离Linux数据库。尚未更新21/22程序/CLI或发布OVH核心。
- 第六批CodeExec/PTC/Skills目前仅独立schema helper/设计，尚未接入现有主链；产物登记、container续期及PTC父调用绑定正设计。第五批提交必须排除这些未接线新文件与原有无关文件。
- 第五批冻结前主代理发现授权锁与CLI槽位顺序可形成死锁，统一为可取消的authority→slot顺序后，确定性满槽/取消回归20轮通过；第五批完整资源/历史/日志/legacybeta集合重新PASS34.114s、vet通过。root普通engine/companions与SDK检查通过。资源调试日志已接开关及关闭删除，记录原始filename与二进制省略原因。

### 第五批上线与第六批冻结准备（2026-10-08 09:58 CST）

- 第五批已提交推送 `0c96c681aedcb9c45cd64faf73b0ce60fa4df09a`。隔离OVH数据库验证发现测试账号缺少出口代理，夹具修复 `075845cc2abf25316ecdcdd110f84437fd0c458e` 后 ccgateway race/vet 和核心构建通过；gateway/providerresources Linux race此前已通过。没有修改生产数据库。
- 原地更新 #21/#22 为 `78aa07448e0286da518f994cf2629f802953a756`（兼容原1小时执行超时/128MiB缓存默认值），CLI 2.1.292。容器ID、镜像、挂载与授权均保留，服务器从精确Git提交构建；详见 DEPLOYMENT-2026-10-08-WORKER-RESOURCES。#22实际Files上传/模型读取/删除通过；#21未核验资源issuer，明确拒绝资源操作。尚未发布新OVH核心，因此这些不是公网核心资源闭环证据。
- 第六批已实现官方CodeExec/PTC、容器与产物登记、Skills端点及版本持久化/精确映射。核心按实际owner+issuer固定资源账号；服务端生成的容器、文件、PTC父调用必须先登记再交客户端。有状态SSE最多32MiB缓冲并先关闭Worker响应再取metadata，避免issuer锁死锁，普通Messages流不增加此缓冲。
- 三位代理交叉复核修复：嵌套Web/PTC父子因果校验、跨owner父ID占用、过期容器额度回收与重新续期、null容器误触能力、转换新增执行能力绕过、重复PTC父ID覆盖、Skills版本漂移、上传成功后metadata失败丢失受控资源证据。主代理另核对SSE帧/终态边界与原用量独立结算；资源登记失败不重发模型。
- custom Skills的latest在核心固定为具体已登记版本，Worker私有grant再核对parent/version；provider输出不得换成另一已登记版本。无显式skills的容器续聊，输出仅允许同owner+binding精确查到的已登记skill。输出ID与版本映射保持不可混用public/provider ID。
- Windows主目标gateway/providerresources/engine/contracts/Worker/app非DB测试与vet通过（本机SUB2API_TESTPG=off，未修坏掉的本机PG）。Skills真实CLI隔离新增2型×5流程共10次调用PASS12.757s；CodeExec/PTC及历史矩阵详见专项记录。当前第六批仍未提交/部署，Linux PostgreSQL、race与真实提供商执行/Skills资格待下一Git候选验证。
- 第七批credit仅独立contract、持久store、加密registry与测试；runtime hooks暂撤下，源码为 `fallback_credit.go.pending`，重挂patch保存在本机临时目录。第六批提交排除第七批文件，不能把credit称为已接入。当前团队已冻结第六批实现，research_cc收尾catalog与旧beta检查。

### 第六批已上线、第七/八批复核（2026-10-08）

- 第六批 `4903994f459cae7959bd6307b602c91e045f0ed6` 已提交推送（104文件，catalog .6）；Linux全engine发现旧测试仍拒绝null container，单行夹具修复 `160f6064ada938e69e84a32797df82fd660d8e6e` 后完整engine/Worker race通过。真实CLI原实现矩阵235.614s通过，测试补丁未改业务，因此未无意义重复该矩阵。
- OVH 隔离45432使用490399候选六包race/vet通过，519个pass事件、两个可选真实CLI skip，无race/失败；10个providerresources DB与两个ccgateway DB逐名确认实际pass。初始PATH/GOWORK测试启动失败保留，不计通过；见 LINUX-SIXTH-BATCH-DB-VALIDATION。
- #21/#22现均为原地升级160f6064a，Worker哈希 `9edea7dcc5ba07c57ff9307a7cac710efc2c36c01990145537ad698546d8ba30`，CLI2.1.292，旧78aa程序各有新备份。容器ID/image/user/卷/授权不变；#21真实短答READY通过。#22 CodeExec/PTC服务端工具均返回正常HTTP200中的too_many_requests，未成功执行；builtin pptx成功解析真实版本20261002并返回container，但其工具也受限。没有为得到成功而重试或改变授权。见 DEPLOYMENT-2026-10-08-EXECUTION-SKILLS。核心公网服务仍未发布本轮代码。
- 第七批core/Worker信用登记与兑换已接线，正常refusal200，记录owner/账号/issuer/原始提示摘要；Worker加密稳定保存原wire，core只存token哈希。JSON/SSE原用量先提取，Worker信用存储故障通过可信内部FailureHeader+原Message通知core，对外gateway_credit_storage而非refusal错误，不丢用量、不发未登记token。已通过本地HTTP和真实CLI隔离矩阵，尚未Git提交/部署/真实兑换。
- 独立复核又修复信用存储临时instance目录导致重启丢失/跨重启容量失控、跨进程OS锁、身份探针并发槽遗漏、PTC信用合法原样续写被普通账本误拒。所有特殊PTC恢复都要求已证明的原token/snapshot/完整摘要/issuer；不添加原请求没有的container，不放松普通历史义务。core预检无资源身份的候选可在模型派发前跳过；已绑定资源/credit不能换号。
- core信用准入不再阻断普通非CCGateway Anthropic透传；已知本owner CC token固定原账号，实际携token派发后所有路由都不自动重发。官方SDK额外支持null/object及strict/best_effort：共享Parameter和LookupOwned已补，core对象/期限/提示不匹配语义已有HTTP测试，Worker对象模式及跨层复核仍在收尾，不能据字符串测试声称全部完成。
- 第八批inline MCP、非defer MCP与客户端API ToolSearch、纯MCP safeguards的等价组合已实现。作者新增14次CLI与旧矩阵联合PASS51.945s；独立复核再次通过CLI及状态/凭据负例。deferred MCP搜索引用的跨server编码尚无足够证据，继续明确拒绝。见 MCP-COMBINATIONS-PROGRESS / MCP-COMBINATIONS-INDEPENDENT-REVIEW。
- 当前工作区为第七/八批待提交；原无关 artifacts、cwd_probe_cli_test.go、pelican-bicycle.svg未处理。下一步：完成对象信用Worker/独立复核、目录 .7、必要完整测试、新Git候选Linux验证、Git构建核心与Worker镜像、平台公开API/本地CLI和前端视觉验收、汇总逐feature证据与不能等价边界。不得遗漏尚未进行的核心部署。

### 第七/八批冻结与发布准备（2026-10-08）

- 信用 object/null/best_effort 已接线并独立复核。修复精度恢复的方向性漏洞：只允许提供商数字经过 CLI 数值归一，不接受 null、状态文本或数组位置改变。增量负例先红后绿，真实 CLI 定向回归 PASS19.392s；作者新旧信用/PTC联合34.227s证据另记，不当作真实提供商兑换。
- 根代理整体验证：gateway/fallbackcredits/providerresources/app/migrations 非DB单测全部通过，vet通过；engine 5.544s、contracts全包、Worker全包与vet通过。数据库仍等待本候选Git SHA在隔离Linux运行，不借旧SHA结果。目录 .7、前端21项组件测试与typecheck通过。
- OVH四节点仍0.1.62。新增受控发行准备脚本，不导入/升级服务；用原default builder和签名缓存、明确live source schema，专属2CPU/4GiB临时slice经真实RUN证实。四项隔离负例与shell语法通过；禁止覆盖旧发行，既有密钥缺失或trust变化直接停止。
- 37功能/8横切新闭环清单见 FINAL-FEATURE-CLOSURE。当前仍需第九批核心diagnostics归属与冷Worker能力、内部工具回合的缓存边界适配，并继续核验安全上下文/续写的等价边界。第七/八批先保存Git检查点；新业务不得混入本批提交。

### 第七/八批已提交与第九批冻结收尾（2026-10-08）

- 第七/八批已提交推送 `747c168a383fd4e6738cb9451a29b1fb84010560`。此前段落记录的是当时状态，不代表当前仍未提交。第九批新增内容仍待主代理提交，并使用新的候选 SHA 进行 Linux 验证。
- 第九批内部 CLI ToolSearch 的显式与 automatic 缓存已实现：真实响应回合账本、完整客户端前缀与原断点恢复、client/helper 目录区分、逐轮 TTL/四断点校验。48 次新矩阵及旧缓存组合隔离回归通过；automatic 按每次实际主请求自然覆盖新增内部内容。带断点工具要求显式 eager，内部回合暂按客户端全历史本地重建；旧 synthetic StructuredOutput 不开放，公共 API format 直接路径与其不同。信用/强制工具/任务预算门禁未借此放宽。见 INTERNAL-ROUND-CACHE-PROGRESS 及独立复核记录。
- 核心持久 diagnostics 归属索引及0042已接入：默认 user+group 24h/4096 条，固定账号/issuer/generation，可信授权支持冷 Worker。该期限仅为平台归属保留，不承诺提供商指纹 TTL；上游 not_found 仍正常200。无核心授权的旧直连 Worker 保留本地1h兼容校验。
- Diagnostics 独立复核修复：SSE登记失败丢输出用量、缺Ready失败丢全部用量、多值issuer歧义、非assistant假ID登记、过期同ID误报成功。新增诊断/信用/资源 JSON/SSE组合确认原11/7仅计一次，正常refusal200、失败不发未登记信用。冷 Worker真实CLI隔离与核心针对性回归通过；本机DB因测试PG缺pg_control失败，0042必须由Linux候选验证，未记为通过。详见 DIAGNOSTICS-INDEPENDENT-REVIEW。
- 官方模型边界已更正：Claude4.6及以后不接受普通assistant文字prefill；pause_turn的完整提供商内容续接另属合法协议，不能混为一谈。CLI安全附件无法等价保留时仍拒绝，不删附件/改role绕过；Opus假上游传输测试不能证明真实模型接受预填。见 MODEL-PREFILL-BOUNDARY。
- 目录更新 `.8`，保持源码能力与账号真实验证分离；前端继续按单功能聚合，不新增重复配置或假开关。本段不声称第九批上线、真实provider diagnostics命中或缓存计费命中。

- 目录收尾验证：`go test ./features -count=1` 通过（3.433s）；前端3文件21项针对性组件测试通过，版本夹具同步 .8 后 FeatureSupport 7项再次通过；`npm run typecheck` 通过。

### 当前线上与公开验收（2026-10-08，root）

- #21/#22已从服务器Git747c168源码构建并原地更新，二进制SHA256 `5a9d84063c6dea9214c9aaf058b927cfda68d687cdc696fae2ca74bc35592fd5`，catalog.7；两个原容器ID、image、user、挂载和登录均保持，真实短答READY均200。Linux engine/Worker/contracts race/vet通过，信用/MCP真实CLI定向149.111s通过。备份 `/opt/ccgateway-runtime/manual-backups/20261008-747c168a3-{21,22}`；首轮验证脚本误读catalog而非code_catalog字段，在#22已更新后停止，修正字段后核验#22并继续#21，没有重复覆盖备份或重建容器。
- OVH核心已发布0.1.63（b786448a业务、747c功能集），四节点local/ready，0041已迁移；签名/完整下载/备份/计划证据见DEPLOYMENT-2026-10-08-CORE-0.1.63。维护503约36.22–38.52秒，不能称零中断。
- 公网user Key鉴权有效，JSON/续聊/回退/SSE/结构化输出/Chat/Responses真调用通过，显式5m缓存二次上游report读取2738token。40轮外部历史触发正常200refusal，不算内容成功也不算网关错误。空参数工具出现真实502并触发正常十秒冷却，已定位空input_json_delta被误解析，四处聚合器修复+独审通过待提交部署。count_tokens在冷却结束后仍503，另查路由，详见PUBLIC-API-ACCEPTANCE-0.1.63。
- 前端已做精确部署SHA本地浏览器组件渲染和21项测试，线上API目录.7核对；CUA无法连接，所以不是线上页面视觉验收，截图明确标注本地。root已查看API宽屏与CC窄屏截图；证据在UI-VISUAL-ACCEPTANCE及其evidence目录。
- 第九批diag/internalcache+catalog.8及空delta补丁均尚未提交/上线。下一步确定count路由原因后完成本批冻结、Git推送、Linux0042/race、.64核心候选与Worker新镜像、原容器原地升级，再做公开工具/count及本地Claude实际任务验证。原无关三项及测试生成__pycache__继续排除提交。

### 第九批提交前最终检查

- 空工具input_json_delta修复已在Worker、MCP秘密检查、credits事件聚合与共享strict codec四处处理；初始对象+空串不改内容，非字符串/空白/截断/数组仍拒绝。作者8次真CLI工具往返7.920s、独审6.678s通过，记录EMPTY-TOOL-INPUT-DELTA-REPAIR/EMPTY-TOOL-INPUT-INDEPENDENT-REVIEW。
- count_tokens503确认是旧插件0.1.9仍活跃：内置同版本新内容不覆盖旧包，新count实现没真正运行。root将CCGateway manifest升0.1.10，完整插件测试/vet通过。源码相较原发行66e9186的插件业务变更仅CCGateway；共享strict转换运行在core，其他插件不导入protocol-codec。正式下一发行须验actual插件active版本和包SHA，不能仅验core版本。
- 第九批主目标core gateway/messagediagnostics/fallbackcredits/providerresources/app非DB测试与vet通过，engine/Worker/contracts测试与vet通过；空delta加入后共享codec全测试/vet通过。本机数据库仍不可用，0042必走新Git候选隔离Linux。

### 第九批 Linux 门禁修复（未发布0.1.64）

- `cd4d5e40b` 的cc-max全engine/Worker/contracts race与vet通过，diag/空工具/内部缓存真实CLI定向66.208s通过，产物仅留候选目录，未替换线上Worker。
- OVH新候选实际DB发现0042 DDL缺IF NOT EXISTS，导致重复迁移相关三测试失败；该候选不能发布。只对表/两索引增加幂等保护，独审确认没有其他schema变化，新Git SHA必须重跑真实LinuxDB。0.1.64已构建签名但未导入/升级，保留为未发布候选，不覆盖其artifact。
- 交付规范复核发现资源/信用与诊断身份头多值校验差异，已统一shared resources.ValidateIdentityHeaders，Worker和核心三响应路径复用。三路径JSON/SSE负例及真实HTTP大小写/重复头独审通过；不更改认证接口或放宽身份。
- 核心当前仍0.1.63、Worker747c。公开Files租户完整闭环已通过且文件删除/404确认；下一修正候选使用0.1.65，完成新SHA数据库门禁、核心和Worker更新及0.1.10插件实际安装验证，再复测工具与count。
