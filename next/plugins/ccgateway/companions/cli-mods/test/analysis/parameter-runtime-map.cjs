#!/usr/bin/env node
// Human-reviewed semantic crosswalk. Explicit case IDs are inspected against
// concrete inputs, contracts, entry points and gates; names never imply coverage.
// 2026-10-27 cleanup: the runtime report artifacts/claude-2.1.304/assembly-replay-report.json
// (2026-10-20) was deleted and the single fixtures/assembly-cases.json has since been
// split into per-version assembly-cases-<version>.json. The script stops with an
// explicit error when an input is missing; it does not substitute other data.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../../../..');
const auditFile = path.join(root, 'artifacts/claude-2.1.304/assembly-audit/parameters.json');
const manifestFile = path.join(root, 'next/plugins/ccgateway/companions/cli-mods/test/fixtures/assembly-cases.json');
const runnerFile = path.join(root, 'next/plugins/ccgateway/companions/cli-mods/test/assembly-replay.cjs');
const runtimeReportFile = path.join(root, 'artifacts/claude-2.1.304/assembly-replay-report.json');
for (const input of [auditFile, manifestFile, runtimeReportFile]) {
  if (!fs.existsSync(input)) throw Error(`${path.relative(root, input)} is missing: this one-off crosswalk was bound to the 2026-10-20 inputs; the runtime report was deleted in the 2026-10-27 artifacts cleanup and the manifest is now per-version (fixtures/assembly-cases-<version>.json)`);
}
const { definitionHash } = require('../replay-helpers.cjs');
const auditRaw = fs.readFileSync(auditFile), manifestRaw = fs.readFileSync(manifestFile);
const audit = JSON.parse(auditRaw), manifest = JSON.parse(manifestRaw);
const runtimeReportRaw = fs.readFileSync(runtimeReportFile), runtimeReport = JSON.parse(runtimeReportRaw);
const observed = new Map(runtimeReport.cases.map(test => [test.id, test]));
const proposed = [...audit.field_flows.flatMap(flow => flow.cases.map(test => ({ ...test, flow: flow.id }))), ...audit.boundary_cases];
const runtimes = new Map(manifest.cases.map((test,index) => [test.id, {test,index}]));
const annotations = new Map();
function add(id, status, ids, reason, missing = []) { if (annotations.has(id)) throw Error('Duplicate review ' + id); annotations.set(id, { coverage_planning:status, runtime_case_ids:ids, semantic_reason:reason, uncovered_dimensions:missing }); }
add('PA-MODEL-ALIAS','not-covered',[],'现有模型均为具体ID，没有alias输入。',['alias解析及对应model facts']);
add('PA-MODEL-PINNED','partial',['params.model_concrete'],'明确断言sonnet-4-6输出，但建议用例要求带日期的haiku模型。',['日期版本模型及另一model family']);
add('PA-MAXTOKENS-SMALL','planned',['params.max_tokens_small'],'输入32并精确断言出站max_tokens=32。');
add('PA-MAXTOKENS-CLAMP','not-covered',[],'没有超出model maxOutputTokens上限的输入。',['模型上限捕获与clamp']);
add('PA-MAXTOKENS-ZERO','partial',['input.max_tokens_zero'],'Worker HTTP零值拒绝合同已定义；未直接进入standalone CLI观察||回退。',['standalone零值native fallback']);
add('PA-MAXTOKENS-NEGATIVE','partial',['input.max_tokens_negative'],'Worker HTTP负数拒绝合同已定义；standalone路径未定义。',['standalone负数处理']);
add('PA-THINKING-ENABLED','partial',['params.thinking_enabled_budget','params.thinking_enabled_adaptive_disabled'],'固定环境禁adaptive分支精确断言enabled1024+display；默认分支仍明确unknown，不等于所有model已验证。',['默认adaptive gate唯一oracle','2048预算与其它model family']);
add('PA-THINKING-LOW-BUDGET','not-covered',[],'最低已有预算为1024，没有budget=1触发下限clamp。',['低于1024的budget']);
add('PA-THINKING-SMALL-MAX','not-covered',[],'没有thinking enabled且max_tokens小于1025的组合。',['budget>=max_tokens边界']);
add('PA-THINKING-ADAPTIVE','planned',['params.thinking_adaptive'],'给定sonnet-4-6 fixture精确断言adaptive及原生display updates；覆盖该固定环境分支。');
add('PA-THINKING-DISABLED','partial',['params.thinking_disabled'],'基础disabled输出被精确断言，但无client display额外键，亦无rejectsDisabled另一model。',['disabled额外键清理','rejectsDisabled省略分支']);
add('PA-THINKING-UNSUPPORTED','not-covered',[],'没有不支持thinking的model facts。',['unsupported model']);
add('PA-TEMPERATURE-ON','not-covered',[],'thinking active用例未同时提供temperature；无法验证显式temperature的省略。',['显式temperature+active thinking']);
add('PA-TEMPERATURE-OFF','planned',['params.temperature_disabled'],'显式temperature=0.2+disabled并精确断言两者；与0.25建议值为同一数值传递门。');
add('PA-TEMPERATURE-DEFAULT','partial',['params.thinking_disabled','params.model_concrete'],'闭合差异检查仅在native新增temperature时要求1且disabled；若完全省略temperature则不会主动失败。',['必须存在默认temperature的正向断言']);
add('PA-TOOLCHOICE-FORCED','planned',['params.forced_tool_with_adaptive'],'强制lookup+adaptive，合同精确要求tool_choice auto并记录原生降级授权。');
add('PA-TOOLCHOICE-AUTO','not-covered',[],'没有输入tool_choice auto；forced输出auto不等于auto输入分支。',['显式auto输入']);
add('PA-TOOLCHOICE-ANY','planned',['params.tool_choice_any'],'显式any并精确断言出站any。');
add('PA-TOOLCHOICE-NONE','planned',['params.tool_choice_none'],'显式none并精确断言出站none。');
add('PA-EFFORT-SUPPORTED','partial',['params.effort_and_format'],'low effort被精确断言；建议要求high及相关beta，后者没有专门断言。',['显式high effort','native effort beta']);
add('PA-EFFORT-DISABLED-CLAMP','not-covered',[],'没有disabled+effort max触发WDr/Fgt。',['effort clamp']);
add('PA-EFFORT-UNSUPPORTED','not-covered',[],'没有不支持effort的model或KS=false上下文。',['unsupported effort model']);
add('PA-FORMAT-SCHEMA','partial',['params.effort_and_format'],'json_schema结构被精确断言，但模型否定门及format专用beta未断言。',['format native beta','不支持format的model gate']);
add('PA-FORMAT-EXTRA','partial',['params.output_config_unknown_key'],'opaque output_config键的严格保留合同可以暴露drop；未覆盖timing，也未覆盖standalone入口，合同期望与AST发现应由动态结果裁定。',['timing等额外键','standalone入口']);
add('PA-METADATA-CLIENT','planned',['params.metadata_regenerated'],'提供client user_id哨兵，runner验证原生metadata精确键集合/身份结构且user_id不同。');
add('PA-METADATA-ENV','not-covered',[],'未设置CLAUDE_CODE_EXTRA_METADATA。',['trusted metadata env及身份字段优先级']);
add('PA-BETAS-MERGE','partial',['send.build_beta'],'只测试单一header beta转发；没有body/header重复、native新增与OAuth合并的联合断言。',['body+header去重','native新增beta','OAuth token']);
add('PA-BETAS-DISABLED','not-covered',[],'没有组织级experimental beta禁用状态。',['organization policy']);
add('PA-BETAS-BADTOKEN','partial',['input.beta_non_string','input.standalone_invalid_beta'],'测试number类型beta，未测试含换行的字符串token。',['CRLF/token注入拒绝']);
add('PA-SYSTEM-STRING','planned',['system.string'],'string system含换行和尾空白，runner规范化一块后逐内容比较。');
add('PA-SYSTEM-ARRAY','planned',['system.cached_blocks'],'双text块及cache_control/ttl按数组完整比较。');
add('PA-SYSTEM-ABSENT','planned',['system.absent','system.empty_array','billing_env.billing_missing_native_fill'],'分别定义缺失/空数组保真和选择worker计费补齐场景。');
add('PA-SYSTEM-INVALID','not-covered',[],'input.null_text针对user消息，不能替代top-level systemPrompt null文本校验。',['system null text']);
add('PA-MESSAGES-SYSTEM-LIFECYCLE','planned',['messages.system_lifecycle_between_tool_pair'],'tool_use与tool_result之间有system clear_at/output_config，runner精确比较完整messages。');
add('PA-MESSAGES-MEDIA','partial',['messages.error_tool_result_media','messages.media_document'],'错误结果内有text+image，document仅在普通user块；未联合覆盖error tool_result内document。',['error tool_result document']);
add('PA-MESSAGES-WHITESPACE','partial',['messages.whitespace_blocks'],'空串/空白/cached块有精确比较，但没有连续相邻user消息。',['adjacent user消息不合并']);
add('PA-MESSAGES-PAIR-BAD','partial',['input.missing_tool_result'],'缺失结果拒绝已定义；duplicate id及mismatched id未定义。',['duplicate tool_use id','mismatched result id']);
add('PA-MESSAGES-OPAQUE','partial',['messages.opaque_thinking','tools.history_tool_reference'],'签名/redacted与tool_reference保留有fixture；未知普通message/block字段未覆盖。',['unknown message字段','unknown block字段']);
add('PA-TOOLS-CUSTOM','partial',['tools.custom_unknown_attributes','tools.deferred_flag_preservation','tools.search_with_deferred_custom'],'strict与defer_loading分别有完整tools比较，但未在同一工具联合设置两个门。',['strict+defer_loading组合']);
add('PA-TOOLS-TYPED','planned',['tools.server_tools_append_order'],'typed web_search穿插custom tools，完整数组合同同时检查schema与顺序。');
add('PA-TOOLS-FOUNDRY','not-covered',[],'suite声明仅first-party；没有Foundry route拒绝或模型配置剥离测试。',['Foundry gate']);
add('PA-STREAM-TRUE','planned',['send.build_sse'],'stream true出站参数与SSE响应字节及终止事件均明确断言。');
add('PA-STREAM-FALSE','partial',['params.model_concrete','send.build_http_error'],'明确验证stream false，错误JSON字节有检查；正常200非流JSON响应没有raw_response_exact合同。',['200非stream响应逐字节检查']);
add('PA-STREAM-INVALID','planned',['input.stream_not_boolean'],'stream字符串true，明确要求拒绝且零上游请求。');
for(const [field,id] of [['STOP_SEQUENCES','params.stop_sequences_preservation'],['TOP_P','params.top_p_preservation'],['TOP_K','params.top_k_preservation'],['SERVICE_TIER','params.service_tier_preservation'],['CONTEXT_MANAGEMENT','params.context_management_preservation']])add('PA-DROP-'+field+'-SENTINEL','partial',[id],'Worker真实入口提供合法类型哨兵并严格要求保留，可以暴露丢弃；缺standalone CLI对照。',['standalone参数入口','strict-preserve合同与原生drop的动态裁定']);
for(const field of ['SPEED','CACHE_CONTROL','SAFEGUARDS','THREAD','DIAGNOSTICS','CONTAINER','MCP_SERVERS','OUTPUT_FORMAT'])add('PA-DROP-'+field+'-SENTINEL','not-covered',[],'没有提供该顶层生成参数的fixture；其它内容块中的同名字段不算覆盖。',['顶层参数输入与最终出站检查']);
add('PA-NATIVE-EXTRABODY-CONFLICT','planned',['params.extra_body_cannot_override_preserved_input'],'runtime_environment实际设置system/messages/max_tokens冲突，合同要求原内容保留；可以明确检测native后置spread覆盖，不把200当通过。');
add('PA-NATIVE-EXTRABODY-POLICY-OFF','not-covered',[],'没有组织策略关闭extra body的上下文。',['qB禁止分支']);
add('PA-NATIVE-EXTRABODY-INVALID','not-covered',[],'没有格式非法的CLAUDE_CODE_EXTRA_BODY。',['非法env JSON分支']);
add('PA-BOUNDARY-RESERVED','partial',['input.standalone_reserved_parameter'],'standalone parameters.messages越权覆盖被测试；另外四个保留键未逐项定义。',['parameters model/system/tools/stream']);
add('PA-BOUNDARY-UNKNOWN-COMPONENT','planned',['input.standalone_unknown_component'],'standalone未知component明确要求exit1与零上游。');
add('PA-BOUNDARY-UNKNOWN-PARAM','partial',['params.unknown_field_preservation'],'Worker未知生成字段有严格保留合同；standalone parameters未知键未定义，unknown_field reject/ignore两策略没有联合覆盖。',['standalone未知parameter','reject/ignore策略对照']);
add('PA-BOUNDARY-INTERNAL','partial',['input.reserved_envelope','input.reserved_request_policy'],'Worker顶层runtimeContext/requestPolicy被拒绝；standalone parameters下的同名键未测试。',['parameters内嵌伪内部键']);
add('PA-BOUNDARY-UNSAFE','partial',['input.unsafe_number'],'Worker不安全number拒绝有fixture；standalone原文解析与direct大整数逐字节保留未定义。',['standalone unsafe number','direct大整数']);
add('PA-DIRECT-RAW','partial',['send.direct_exact','messages.official_304_direct'],'direct完整JSON/未知键/原始字节被检查，但没有刻意非标准空白或大整数哨兵。',['非标准空白输入','不安全大整数原始数字']);
add('PA-TRANSPORT-PROVIDER','not-covered',[],'suite排除非first-party，并未发送这些路由验证拒绝。',['Bedrock/Vertex/Foundry拒绝路径']);
add('PA-TRANSPORT-AUTH','partial',['send.direct_beta','send.build_beta'],'API-key隔离、无authorization/策略头泄漏有断言；OAuth、host/cookie/auth注入拒绝未覆盖。',['OAuth','forbidden headers']);
add('PA-BOUNDARY-THINKING-TYPE','partial',['input.thinking_invalid_type'],'Worker未知thinking.type拒绝合同已定义；非对象thinking及standalone fallback未定义。',['thinking非对象','standalone unknown type']);
add('PA-BOUNDARY-GENERATION-TYPES','not-covered',[],'零/负数仍是number；不能替代max_tokens/temperature string/null/boolean与malformed format的类型矩阵。',['generation type矩阵']);
add('PA-BOUNDARY-OUTPUT-CONFIG','partial',['messages.system_lifecycle_between_tool_pair','params.effort_and_format'],'分别测试message生命周期和顶层生成参数；无非法clear_at与冲突对照。',['invalid clear_at','两种output_config同时冲突']);
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
if (runtimeReport.manifest_sha256 !== sha(manifestRaw)) throw Error('Runtime report belongs to a different manifest');
const entries=proposed.map(test=>{
  const review=annotations.get(test.case_id);if(!review)throw Error('Unreviewed proposed case '+test.case_id);
  const fixtureEvidence=review.runtime_case_ids.map(id=>{
    const found=runtimes.get(id);if(!found)throw Error('Runtime fixture missing; mapping must be revised: '+id);
    const c=found.test;
    const execution = observed.get(id);
    if (!execution || execution.definition_sha256 !== definitionHash(c)) throw Error('Missing or stale runtime outcome: ' + id);
    return {id,index:found.index,definition_sha256:sha(JSON.stringify(c)),executable_definition_sha256:definitionHash(c),entry:c.transport??'worker-http',mode:c.mode,
      input_keys:Object.keys(c.body??{}),parameters:Object.fromEntries(Object.entries(c.body??{}).filter(([key])=>!['system','messages','tools'].includes(key))),
      runtime_environment:c.runtime_environment??{},headers:c.headers??{},policy:c.policy??{},contract:c.contract,
      declared_unknown_reason:c.unknown_reason??null,
      observed_runtime:{status:execution.status,failed_or_unknown_checks:execution.checks.filter(check=>check.status!=='pass'),actual_http_status:execution.actual_http_status,upstream_requests:execution.upstream_requests}};
  });
  return {case_id:test.case_id,flow:test.flow??'boundary',proposed_input:test.input,proposed_assertion:test.assertion,...review,fixture_evidence:fixtureEvidence,execution_result:'Bound to existing runtime outcomes by exact ID + executable definition hash; partial/not-covered dimensions remain unverified.'};
});
if(entries.length!==annotations.size)throw Error('Obsolete annotation IDs remain');
const summary=Object.fromEntries(['planned','partial','not-covered'].map(status=>[status,entries.filter(e=>e.coverage_planning===status).length]));
const result={schema:'ccgateway.assembly-audit.parameters-runtime-map.v1',
  input:{parameter_audit:path.relative(root,auditFile).split(path.sep).join('/'),parameter_audit_sha256:sha(auditRaw),runtime_manifest:path.relative(root,manifestFile).split(path.sep).join('/'),runtime_manifest_sha256:sha(manifestRaw),runtime_case_count:manifest.cases.length,runner:path.relative(root,runnerFile).split(path.sep).join('/'),runner_sha256:sha(fs.readFileSync(runnerFile)),runtime_report:path.relative(root,runtimeReportFile).split(path.sep).join('/'),runtime_report_sha256:sha(runtimeReportRaw),runtime_report_summary:runtimeReport.summary},
  method:'Explicit human-reviewed semantic mapping of input values, entry points, model/env gates, and concrete assertions. No name-based matching or new execution; existing runtime results bound by exact case ID, executable definition hash and manifest hash.',
  status_meanings:{planned:'相同语义输入与所需核心断言已在fixture定义；不是运行通过。',partial:'已有相关输入/断言，但至少一项入口、门控、数据形态或精确断言缺失。','not-covered':'当前manifest没有能证明该建议行为的fixture。'},
  summary:{proposed:entries.length,...summary},entries,
  notes:['本文件不修改主覆盖ledger，不将定义存在计为pass；运行结果仅绑定到实际fixture，不能替代partial/not-covered维度。','某些strict-preserve合同可能因AST揭示的native drop而失败；这是缺陷检测能力，不应降低合同以获得通过。','first-party固定sonnet模型的单分支结果不能覆盖其他model/provider/organization gates。','fixture source SHA改变后须重新生成此文件，不能沿用旧55/56-case清单。']};
const target=path.join(root,'artifacts/claude-2.1.304/assembly-audit/parameters-runtime-map.json');fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output:target,manifestCases:manifest.cases.length,...result.summary}));
