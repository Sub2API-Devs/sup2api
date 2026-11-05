/**
 * services/mcpServe/callClaims.ts
 *
 * 2.1.316 新增：mcp serve 调用认领：运行/完成/禁止状态、保留结果、读文件状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51rq40ff.js (16), chunk-z0gd899m.js (11)
 * attribution: placement 26, affinity 1
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  array,
  literal,
  _enum,
  unknown,
  discriminatedUnion,
  zodStrictObject,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isSafeIdSegment } from "../../utils/agentId.js";
import { SAFE_ID_PATTERN } from "../../remote/tools/protocolConstants.js";
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import {
  toolHostInterfaceSchema,
  TOOL_HOST_INTERFACE_VERSION,
  parseInterfaceVersion,
  compareInterfaceVersions,
} from "../../remote/tools/protocolNegotiation.js";
import { EFFORT_LEVELS } from "../../utils/effort.js";
import { hasProtoKeys } from "../../utils/objectSafety.js";
import { byteLengthOf } from "../../remote/tools/callResults.js";
import { APPROVAL_SOURCES_WITH_REASON } from "../../tools/BashTool/bashTelemetry.js";
import { MAX_PERMISSION_UPDATES } from "../../remote/tools/protocolSchemas.js";
import {
  safeSerializedPermissionContextSchema,
  minimalPermissionContextSchema,
  exceedsSerializedContextLimit,
  hasNonNeutralRestrictions,
  isMinimalContextSerializable,
} from "../../utils/permissions/permissionContextSerialization.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { ANTHROPIC_RETURNTOOLOUTPUT, hasToolHostInterface } from "../remoteTools/returnToolOutput.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { createSignal } from "../../utils/signal.js";
import {
  readContainerStartRecord,
  MAX_START_RECORDS,
  MAX_START_METADATA_BYTES,
  START_TIMEOUT_MS,
  MAX_RETRY_ROUNDS,
  MAX_CONCURRENT_STARTS,
} from "./containerStart.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51rq40ff.js:648-749 placement
/**
 * mcp serve 调用认领的长度上限与分类器选项白名单。
 */
var MAX_CLAIM_STRING = 128;
var MAX_CLASSIFIER_OPTIONS = 16;
var MAX_MODEL_STRING = 256;
var MAX_SERVER_VERDICT_BYTES = 4096;
var CLASSIFIER_MAY_APPROVE_OPTIONS = ["background_operator", "unresolved_shell_write", "as_in_local_session"];
//@ chunk-51rq40ff.js:749-853 placement
/**
 * 判断调用声明是否为带批准的 run 步骤。
 */
function hasRunApproval(request) {
  switch (request.step) {
    case "check":
    case "decline":
      return false;
    case "run":
      return request.approval !== undefined;
  }
}
//@ chunk-51rq40ff.js:853-957 placement
/**
 * 判断调用声明是否为主代理（无 agent_id）的 run 步骤。
 */
function isMainAgentRun(request) {
  switch (request.step) {
    case "check":
    case "decline":
      return false;
    case "run":
      return request.agent_id === undefined;
  }
}
//@ chunk-51rq40ff.js:957-2334 placement
/**
 * 调用认领各字段在 tool_container 与 attached_computer 两种宿主下是否被采信（honoured/refused/never_believed），以及相关 zod 片段（tool_use_id、agent_id、分类器选项、模型名、ask 摘要）。
 */
var CLAIM_FIELD_TRUST; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var STEP_NEEDS_PERMISSION;
var toolUseIdSchema;
var agentIdSchema;
var classifierMayApproveSchema;
var eventNameSchema;
var mainLoopModelSchema;
var askDigestSchema;
deferInit("chunk-51rq40ff.js:957", () => {
  CLAIM_FIELD_TRUST = {
    step: {
      check: {
        tool_container: "honoured",
        attached_computer: "refused",
      },
      run: {
        tool_container: "honoured",
        attached_computer: "honoured",
      },
      decline: {
        tool_container: "honoured",
        attached_computer: "honoured",
      },
    },
    member: {
      agent_id: {
        tool_container: "honoured",
        attached_computer: "honoured",
      },
      classifier_may_approve: {
        tool_container: "honoured",
        attached_computer: "refused",
      },
      agent_has_read_tool: {
        tool_container: "honoured",
        attached_computer: "refused",
      },
      agent_effort_level: {
        tool_container: "honoured",
        attached_computer: "refused",
      },
      conversation_id: {
        tool_container: "refused",
        attached_computer: "honoured",
      },
      compaction_id: {
        tool_container: "refused",
        attached_computer: "honoured",
      },
      server_verdict: {
        tool_container: "refused",
        attached_computer: "honoured",
      },
      approval: {
        tool_container: "honoured",
        attached_computer: "honoured",
      },
    },
    approval_member: {
      attested: {
        tool_container: "refused",
        attached_computer: "honoured",
      },
      permission_updates: {
        tool_container: "refused",
        attached_computer: "honoured",
      },
      approver: {
        tool_container: "honoured",
        attached_computer: "never_believed",
      },
      permission_context: {
        tool_container: "honoured",
        attached_computer: "never_believed",
      },
    },
  };
  STEP_NEEDS_PERMISSION = {
    check: true,
    run: true,
    decline: false,
  };
  toolUseIdSchema = DoctorLazy(() =>
    stringSchema()
      .max(MAX_CLAIM_STRING)
      .regex(/^[\w.:@-]+$/)
      .regex(/[^.]/),
  );
  agentIdSchema = DoctorLazy(() => stringSchema().refine(isSafeIdSegment));
  classifierMayApproveSchema = DoctorLazy(() =>
    array(stringSchema().max(MAX_CLAIM_STRING))
      .max(MAX_CLASSIFIER_OPTIONS)
      .transform((requestedOptions) =>
        CLASSIFIER_MAY_APPROVE_OPTIONS.filter((option) => requestedOptions.includes(option)),
      ),
  );
  eventNameSchema = DoctorLazy(() => stringSchema().regex(SAFE_ID_PATTERN));
  mainLoopModelSchema = DoctorLazy(() =>
    stringSchema()
      .max(MAX_MODEL_STRING)
      .regex(/^\P{Cc}+$/u),
  );
  askDigestSchema = DoctorLazy(() => stringSchema().regex(SHA256_HEX_RE));
});
//@ chunk-51rq40ff.js:2334-2999 placement
/**
 * 构造调用认领的 zod 判别联合（step = check / run / decline），run 可带审批信息（ask_digest、approver、权限上下文、权限更新）。
 */
function buildCallClaimSchema(permissionContext) {
  let baseFields = {
    tool_host_interface: toolHostInterfaceSchema(),
    tool_use_id: toolUseIdSchema(),
  };
  let stepFields = {
    ...baseFields,
    agent_id: agentIdSchema().optional(),
    main_loop_model: mainLoopModelSchema(),
    classifier_may_approve: classifierMayApproveSchema().optional(),
    agent_has_read_tool: literal(true).optional(),
    agent_effort_level: _enum(EFFORT_LEVELS).optional(),
    conversation_id: eventNameSchema().optional(),
    compaction_id: eventNameSchema().optional(),
    permission_context: permissionContext,
    server_verdict: unknown()
      .refine((verdict) => !hasProtoKeys(verdict) && byteLengthOf(verdict) <= MAX_SERVER_VERDICT_BYTES)
      .optional(),
  };
  return discriminatedUnion("step", [
    zodStrictObject({
      ...stepFields,
      step: literal("check"),
    }),
    zodStrictObject({
      ...stepFields,
      step: literal("run"),
      approval: zodStrictObject({
        ask_digest: askDigestSchema(),
        approver: _enum(APPROVAL_SOURCES_WITH_REASON),
        permission_context: permissionContext,
        attested: booleanSchema().optional(),
        permission_updates: array(unknown())
          .max(MAX_PERMISSION_UPDATES)
          .refine((updates) => !hasProtoKeys(updates))
          .optional(),
      }).optional(),
    }),
    zodStrictObject({
      ...baseFields,
      step: literal("decline"),
      ask_digest: askDigestSchema(),
    }),
  ]);
}
//@ chunk-51rq40ff.js:2999-3071 placement
/**
 * 按容器类型区分的调用声明 schema。
 */
var CALL_CLAIM_SCHEMAS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-51rq40ff.js:2999", () => {
  CALL_CLAIM_SCHEMAS = {
    tool_container: DoctorLazy(() => buildCallClaimSchema(safeSerializedPermissionContextSchema())),
    attached_computer: DoctorLazy(() => buildCallClaimSchema(minimalPermissionContextSchema())),
  };
});
//@ chunk-51rq40ff.js:3071-3185 placement
function runStepToolUseId(meta) {
  let toolOutput = isPlainObject(meta) ? meta[ANTHROPIC_RETURNTOOLOUTPUT] : undefined;
  return isPlainObject(toolOutput) && toolOutput.step === "run"
    ? toolUseIdSchema().safeParse(toolOutput.tool_use_id).data
    : undefined;
}
//@ chunk-51rq40ff.js:3185-3342 placement
function parseToolContainerStep(meta, peerVersion = TOOL_HOST_INTERFACE_VERSION) {
  let toolOutput = isPlainObject(meta) ? meta[ANTHROPIC_RETURNTOOLOUTPUT] : undefined;
  if (toolOutput === undefined)
    return {
      kind: "absent",
    };
  if (!hasToolHostInterface(toolOutput))
    return {
      kind: "other_request",
    };
  return judgeCallClaim(toolOutput, peerVersion, "tool_container");
}
//@ chunk-51rq40ff.js:3342-3560 placement
function judgeCallClaim(claim, peerVersion, audience) {
  let interfaceVersion = parseInterfaceVersion(claim.tool_host_interface);
  if (interfaceVersion === undefined)
    return {
      kind: "malformed",
    };
  let versionVerdict =
    peerVersion === "compared_elsewhere" ? undefined : checkInterfaceVersion(peerVersion, interfaceVersion);
  if (versionVerdict !== undefined && stepNeedsPermission(claim.step)) return versionVerdict;
  let callClaim = parseCallClaim(claim, audience);
  return callClaim.kind === "declined" ? callClaim : (versionVerdict ?? callClaim);
}
//@ chunk-51rq40ff.js:3560-3925 placement
/**
 * 解析 MCP 服务端的调用声明：权限上下文过大、含被拒字段、校验成功或格式错误（区分是否启用了未列出的限制）分别返回对应结果。
 */
function parseCallClaim(claim, audience) {
  let approval = isPlainObject(claim.approval) ? claim.approval : undefined;
  if (
    exceedsSerializedContextLimit(claim.permission_context) ||
    exceedsSerializedContextLimit(approval?.permission_context)
  )
    return {
      kind: "too_large",
    };
  let [refusedPart] = listRefusedClaimParts(claim, approval ?? {}, audience);
  if (refusedPart !== undefined)
    return {
      kind: "not_honoured",
      part: refusedPart,
    };
  let parsed = CALL_CLAIM_SCHEMAS[audience]().safeParse(claim);
  if (parsed.success) return toClaimResult(parsed.data);
  return {
    kind:
      hasNonNeutralRestrictions(claim.permission_context) ||
      hasNonNeutralRestrictions(approval?.permission_context)
        ? "unlisted_restriction_on"
        : "malformed",
  };
}
//@ chunk-51rq40ff.js:3925-4129 placement
function checkInterfaceVersion(peerVersion, peer) {
  let { kind } = compareInterfaceVersions(peerVersion, peer);
  switch (kind) {
    case "peer_too_old":
      return {
        kind: "session_too_old",
        session: peer,
      };
    case "self_too_old":
      return {
        kind: "daemon_too_old",
        session: peer,
      };
    case "agreed":
      return;
    default:
      return kind;
  }
}
//@ chunk-51rq40ff.js:4129-4195 placement
/**
 * 取某步骤所需的权限名。
 */
function stepNeedsPermission(step) {
  let found = objectKeys(STEP_NEEDS_PERMISSION).find((key) => key === step);
  return found === undefined || STEP_NEEDS_PERMISSION[found];
}
//@ chunk-51rq40ff.js:4195-4597 placement
/**
 * 列出调用声明中当前工具不接受的部分：步骤、成员、approval 成员与无效的权限上下文。
 */
function listRefusedClaimParts(claim, approval, audience) {
  return [
    ...objectKeys(CLAIM_FIELD_TRUST.step).filter(
      (stepName) => claim.step === stepName && CLAIM_FIELD_TRUST.step[stepName][audience] === "refused",
    ),
    ...objectKeys(CLAIM_FIELD_TRUST.member).filter(
      (field) => Object.hasOwn(claim, field) && CLAIM_FIELD_TRUST.member[field][audience] === "refused",
    ),
    ...objectKeys(CLAIM_FIELD_TRUST.approval_member)
      .filter(
        (field) =>
          Object.hasOwn(approval, field) && CLAIM_FIELD_TRUST.approval_member[field][audience] === "refused",
      )
      .map((field) => `approval.${field}`),
    ...(isPermissionContextHonoured(audience, claim.permission_context) ? [] : ["permission_context"]),
    ...(isPermissionContextHonoured(audience, approval.permission_context)
      ? []
      : ["approval.permission_context"]),
  ];
}
//@ chunk-51rq40ff.js:4597-4704 placement
function isPermissionContextHonoured(audience, permissionContext) {
  switch (audience) {
    case "tool_container":
      return true;
    case "attached_computer":
      return permissionContext === undefined || isMinimalContextSerializable(permissionContext);
  }
}
//@ chunk-51rq40ff.js:4704-4839 placement
function toClaimResult(claim) {
  switch (claim.step) {
    case "check":
    case "run":
      return {
        kind: "requested",
        request: claim,
      };
    case "decline":
      return {
        kind: "declined",
        request: claim,
      };
  }
}
//@ chunk-51rq40ff.js:4839-4875 placement
/**
 * 取对象的键。
 */
function objectKeys(record) {
  return Object.keys(record);
}
//@ chunk-z0gd899m.js:492-580 affinity
function idleWatchState() {
  return {
    isWatched: false,
    hasMoved: false,
    taken: undefined,
    goneUntoldToMainAgent: undefined,
  };
}
//@ chunk-z0gd899m.js:580-838 placement
var mcpServeCallState; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z0gd899m.js:580", () => {
  mcpServeCallState = new SessionRootSlot(() => ({
    id: randomUUID(),
    now: () => performance.now(),
    runningRuns: new Map(),
    finishedRuns: new Map(),
    barredRuns: new Map(),
    keptRuns: new Map(),
    newestDropped: undefined,
    runEnded: createSignal(),
    readFileState: readContainerStartRecord(),
    subagentReadFileStates: new Map(),
    changedFilesPasses: new WeakMap(),
    shell: idleWatchState(),
  }));
});
//@ chunk-z0gd899m.js:838-873 placement
function mcpServeSessionId(session) {
  return mcpServeCallState.of(session).id;
}
//@ chunk-z0gd899m.js:873-1058 placement
function claimCallRun(session, toolUseId) {
  let callState = mcpServeCallState.of(session);
  let { runningRuns, finishedRuns, barredRuns } = callState;
  if (barredRuns.has(toolUseId)) return "barred";
  if (runningRuns.has(toolUseId) || finishedRuns.has(toolUseId)) return "started_before";
  runningRuns.set(toolUseId, callState.now());
  return "claimed";
}
//@ chunk-z0gd899m.js:1058-1113 placement
/**
 * 取两者中较大者（未定义时取另一个）。
 */
var maxDefined = (newestDropped, otherDropped) =>
  newestDropped === undefined || otherDropped === undefined
    ? (newestDropped ?? otherDropped)
    : Math.max(newestDropped, otherDropped);
//@ chunk-z0gd899m.js:1113-1212 placement
/**
 * 向 Map 写入条目，超过容量时逐出最早的条目并返回被逐出的值。
 */
function setWithEviction(store, key, maxSize, value) {
  store.set(key, value);
  let [oldestEntry] = store;
  if (store.size <= maxSize || oldestEntry === undefined) return;
  store.delete(oldestEntry[0]);
  return oldestEntry[1];
}
//@ chunk-z0gd899m.js:1212-1363 placement
function releaseCallRun(session, key) {
  let callState = mcpServeCallState.of(session);
  if (!callState.runningRuns.delete(key)) return;
  callState.newestDropped = maxDefined(
    callState.newestDropped,
    setWithEviction(callState.finishedRuns, key, MAX_START_RECORDS, callState.now()),
  );
  callState.runEnded.emit();
}
//@ chunk-z0gd899m.js:1363-1649 placement
function keepCallAnswer(session, toolUseId, { call, stop }, answerFactory) {
  let callState = mcpServeCallState.of(session);
  let { keptRuns, finishedRuns } = callState;
  if (keptRuns.has(toolUseId)) return answerFactory();
  let keptRecord = {
    call,
    answer: answerFactory(),
    stop,
  };
  keptRuns.set(toolUseId, keptRecord);
  keptRecord.answer.then(
    (answer) => {
      keptRuns.delete(toolUseId);
      if (finishedRuns.has(toolUseId) && byteLengthOf(answer ?? null) <= MAX_START_METADATA_BYTES)
        keptRuns.set(toolUseId, {
          ...keptRecord,
          stop: () => {},
          endedAt: callState.now(),
        });
    },
    () => keptRuns.delete(toolUseId),
  );
  return keptRecord.answer;
}
//@ chunk-z0gd899m.js:1649-1860 placement
function findKeptCallAnswer(session, toolUseId, call) {
  let { keptRuns, now } = mcpServeCallState.of(session);
  let filtered = [...keptRuns].filter(([, keptRecord]) => keptRecord.endedAt !== undefined);
  filtered.forEach(([keptToolUseId, { endedAt = 0 }], index) => {
    if (now() - endedAt > START_TIMEOUT_MS || filtered.length - index > MAX_RETRY_ROUNDS)
      keptRuns.delete(keptToolUseId);
  });
  let keptRecord = keptRuns.get(toolUseId);
  return keptRecord?.call === call ? keptRecord : undefined;
}
//@ chunk-z0gd899m.js:2554-2656 placement (2.1.88 match: call, 0.577)
function call(_args, context) {
  let { readFileState, subagentReadFileStates } = mcpServeCallState.of(_args);
  return context === undefined ? readFileState : subagentReadFileStates.get(context);
}
//@ chunk-z0gd899m.js:2656-2931 placement
function readFileStateFor(session, agentId) {
  let { readFileState, subagentReadFileStates } = mcpServeCallState.of(session);
  if (agentId === undefined) return readFileState;
  let readRecord = subagentReadFileStates.get(agentId) ?? readContainerStartRecord();
  subagentReadFileStates.delete(agentId);
  subagentReadFileStates.set(agentId, readRecord);
  let [oldestAgentId] = subagentReadFileStates.keys();
  if (subagentReadFileStates.size > MAX_CONCURRENT_STARTS && oldestAgentId !== undefined) {
    subagentReadFileStates.delete(oldestAgentId);
    logForDebugging(
      `[mcp serve] more than ${MAX_CONCURRENT_STARTS} subagents: dropped the read record of ${oldestAgentId}`,
    );
  }
  return readRecord;
}
export {
  judgeCallClaim,
  mcpServeCallState,
  maxDefined,
  setWithEviction,
  toolUseIdSchema,
  askDigestSchema,
  runStepToolUseId,
  findKeptCallAnswer,
  parseToolContainerStep,
  keepCallAnswer,
  hasRunApproval,
  isMainAgentRun,
  readFileStateFor,
  claimCallRun,
  releaseCallRun,
  mcpServeSessionId,
  agentIdSchema,
  call,
};
