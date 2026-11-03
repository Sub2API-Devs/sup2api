/**
 * services/mcpServe/callClaims.ts
 *
 * 2.1.316 新增：mcp serve 调用认领：运行/完成/禁止状态、保留结果、读文件状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m8aeec95.js (26)
 * attribution: placement 26
 */
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { createSignal } from "../../utils/signal.js";
import { me, Ke, Ue, $e, Ve, ce } from "./containerStart.js";
import { iv } from "../../remote/tools/callResults.js";
import { logForDebugging } from "../../utils/debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, A, T, U, oe, Ir, zodStrictObject, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { G$ } from "../../utils/agentId.js";
import { AS } from "../../utils/commitAttribution.js";
import {
  zYt,
  TOOL_HOST_INTERFACE_VERSION,
  parseInterfaceVersion,
  compareInterfaceVersions,
} from "../../remote/tools/protocolNegotiation.js";
import { EFFORT_LEVELS } from "../../utils/effort.js";
import { hasProtoKeys } from "../../utils/objectSafety.js";
import { Vsi } from "../../tools/BashTool/bashTelemetry.js";
import { $Xr } from "../../remote/tools/protocolSchemas.js";
import {
  safeSerializedPermissionContextSchema,
  minimalPermissionContextSchema,
  PV,
  PTs,
} from "../../utils/permissions/permissionContextSerialization.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { ANTHROPIC_RETURNTOOLOUTPUT, r0n } from "../remoteTools/returnToolOutput.js";
import { loadCachedRestrictions } from "../policyLimits/index.js";

//@ chunk-m8aeec95.js:7210-7460 placement
var mcpServeCallState = new SessionRootSlot(() => ({
  id: randomUUID_3(),
  now: () => performance.now(),
  runningRuns: new Map(),
  finishedRuns: new Map(),
  barredRuns: new Map(),
  keptRuns: new Map(),
  newestDropped: void 0,
  runEnded: createSignal(),
  readFileState: me(),
  subagentReadFileStates: new Map(),
  changedFilesPasses: new WeakMap(),
}));
//@ chunk-m8aeec95.js:7460-7495 placement
function mcpServeSessionId(e) {
  return mcpServeCallState.of(e).id;
}
//@ chunk-m8aeec95.js:7495-7680 placement
function claimCallRun(e, n) {
  let of = mcpServeCallState.of(e),
    { runningRuns: runningRuns, finishedRuns: finishedRuns, barredRuns: barredRuns } = of;
  if (barredRuns.has(n)) return "barred";
  if (runningRuns.has(n) || finishedRuns.has(n)) return "started_before";
  return (runningRuns.set(n, of.now()), "claimed");
}
//@ chunk-m8aeec95.js:7680-7736 placement
var pe = (e, n) => (e === void 0 || n === void 0 ? (e ?? n) : Math.max(e, n));
/**
 * 向 Map 写入条目，超过容量时逐出最早的条目并返回被逐出的值。
 */
//@ chunk-m8aeec95.js:7736-7836 placement
function setWithEviction(e, n, r, s) {
  e.set(n, s);
  let [y] = e;
  if (e.size <= r || y === void 0) return;
  return (e.delete(y[0]), y[1]);
}
//@ chunk-m8aeec95.js:7836-7990 placement
function releaseCallRun(e, n) {
  let of = mcpServeCallState.of(e);
  if (!of.runningRuns.delete(n)) return;
  ((of.newestDropped = pe(of.newestDropped, setWithEviction(of.finishedRuns, n, Ke, of.now()))),
    of.runEnded.emit());
}
//@ chunk-m8aeec95.js:7990-8277 placement
function keepCallAnswer(e, n, { call: r, stop: stop }, y) {
  let of = mcpServeCallState.of(e),
    { keptRuns: keptRuns, finishedRuns: finishedRuns } = of;
  if (keptRuns.has(n)) return y();
  let S = { call: r, answer: y(), stop: stop };
  return (
    keptRuns.set(n, S),
    S.answer.then(
      (x) => {
        if ((keptRuns.delete(n), finishedRuns.has(n) && iv(x ?? null) <= Ue))
          keptRuns.set(n, { ...S, stop: () => {}, endedAt: of.now() });
      },
      () => keptRuns.delete(n),
    ),
    S.answer
  );
}
//@ chunk-m8aeec95.js:8277-8490 placement
function findKeptCallAnswer(e, n, r) {
  let { keptRuns: keptRuns, now: now } = mcpServeCallState.of(e),
    filtered = [...keptRuns].filter(([, O]) => O.endedAt !== void 0);
  filtered.forEach(([O, { endedAt: S = 0 }], x) => {
    if (now() - S > $e || filtered.length - x > Ve) keptRuns.delete(O);
  });
  let w = keptRuns.get(n);
  return w?.call === r ? w : void 0;
}
//@ chunk-m8aeec95.js:9182-9284 placement = call (0.577)
function call(_args, context) {
  let { readFileState: readFileState, subagentReadFileStates: subagentReadFileStates } =
    mcpServeCallState.of(_args);
  return context === void 0 ? readFileState : subagentReadFileStates.get(context);
}
//@ chunk-m8aeec95.js:9284-9562 placement
function readFileStateFor(e, n) {
  let { readFileState: readFileState, subagentReadFileStates: subagentReadFileStates } =
    mcpServeCallState.of(e);
  if (n === void 0) return readFileState;
  let y = subagentReadFileStates.get(n) ?? me();
  (subagentReadFileStates.delete(n), subagentReadFileStates.set(n, y));
  let [h] = subagentReadFileStates.keys();
  if (subagentReadFileStates.size > ce && h !== void 0)
    (subagentReadFileStates.delete(h),
      logForDebugging(`[mcp serve] more than ${ce} subagents: dropped the read record of ${h}`));
  return y;
}
/**
 * mcp serve 调用认领的长度上限与分类器选项白名单。
 */
//@ chunk-m8aeec95.js:9562-9668 placement
var MAX_CLAIM_STRING = 128,
  MAX_CLASSIFIER_OPTIONS = 16,
  MAX_MODEL_STRING = 256,
  MAX_SERVER_VERDICT_BYTES = 4096,
  CLASSIFIER_MAY_APPROVE_OPTIONS = ["background_operator", "unresolved_shell_write", "as_in_local_session"];
/**
 * 判断调用声明是否为带批准的 run 步骤。
 */
//@ chunk-m8aeec95.js:9668-9772 placement
function hasRunApproval(e) {
  switch (e.step) {
    case "check":
    case "decline":
      return !1;
    case "run":
      return e.approval !== void 0;
  }
}
/**
 * 判断调用声明是否为主代理（无 agent_id）的 run 步骤。
 */
//@ chunk-m8aeec95.js:9772-9876 placement
function isMainAgentRun(e) {
  switch (e.step) {
    case "check":
    case "decline":
      return !1;
    case "run":
      return e.agent_id === void 0;
  }
}
/**
 * 调用认领各字段在 tool_container 与 attached_computer 两种宿主下是否被采信（honoured/refused/never_believed），以及相关 zod 片段（tool_use_id、agent_id、分类器选项、模型名、ask 摘要）。
 */
//@ chunk-m8aeec95.js:9876-11093 placement
var CLAIM_FIELD_TRUST = {
    step: {
      check: { tool_container: "honoured", attached_computer: "refused" },
      run: { tool_container: "honoured", attached_computer: "honoured" },
      decline: { tool_container: "honoured", attached_computer: "honoured" },
    },
    member: {
      agent_id: { tool_container: "honoured", attached_computer: "honoured" },
      classifier_may_approve: { tool_container: "honoured", attached_computer: "refused" },
      agent_has_read_tool: { tool_container: "honoured", attached_computer: "refused" },
      agent_effort_level: { tool_container: "honoured", attached_computer: "refused" },
      server_verdict: { tool_container: "refused", attached_computer: "honoured" },
      approval: { tool_container: "honoured", attached_computer: "honoured" },
    },
    approval_member: {
      attested: { tool_container: "refused", attached_computer: "honoured" },
      permission_updates: { tool_container: "refused", attached_computer: "honoured" },
      approver: { tool_container: "honoured", attached_computer: "never_believed" },
      permission_context: { tool_container: "honoured", attached_computer: "never_believed" },
    },
  },
  STEP_NEEDS_PERMISSION = { check: !0, run: !0, decline: !1 },
  toolUseIdSchema = DoctorLazy(() =>
    o()
      .max(MAX_CLAIM_STRING)
      .regex(/^[\w.:@-]+$/)
      .regex(/[^.]/),
  ),
  agentIdSchema = DoctorLazy(() => o().refine(G$)),
  classifierMayApproveSchema = DoctorLazy(() =>
    A(o().max(MAX_CLAIM_STRING))
      .max(MAX_CLASSIFIER_OPTIONS)
      .transform((e) => CLASSIFIER_MAY_APPROVE_OPTIONS.filter((n) => e.includes(n))),
  ),
  mainLoopModelSchema = DoctorLazy(() =>
    o()
      .max(MAX_MODEL_STRING)
      .regex(/^\P{Cc}+$/u),
  ),
  askDigestSchema = DoctorLazy(() => o().regex(AS));
/**
 * 构造调用认领的 zod 判别联合（step = check / run / decline），run 可带审批信息（ask_digest、approver、权限上下文、权限更新）。
 */
//@ chunk-m8aeec95.js:11093-11700 placement
function buildCallClaimSchema(e) {
  let n = { tool_host_interface: zYt(), tool_use_id: toolUseIdSchema() },
    r = {
      ...n,
      agent_id: agentIdSchema().optional(),
      main_loop_model: mainLoopModelSchema(),
      classifier_may_approve: classifierMayApproveSchema().optional(),
      agent_has_read_tool: T(!0).optional(),
      agent_effort_level: U(EFFORT_LEVELS).optional(),
      permission_context: e,
      server_verdict: oe()
        .refine((s) => !hasProtoKeys(s) && iv(s) <= MAX_SERVER_VERDICT_BYTES)
        .optional(),
    };
  return Ir("step", [
    zodStrictObject({ ...r, step: T("check") }),
    zodStrictObject({
      ...r,
      step: T("run"),
      approval: zodStrictObject({
        ask_digest: askDigestSchema(),
        approver: U(Vsi),
        permission_context: e,
        attested: M().optional(),
        permission_updates: A(oe())
          .max($Xr)
          .refine((s) => !hasProtoKeys(s))
          .optional(),
      }).optional(),
    }),
    zodStrictObject({ ...n, step: T("decline"), ask_digest: askDigestSchema() }),
  ]);
}
//@ chunk-m8aeec95.js:11700-11775 placement
var Qe = {
  tool_container: DoctorLazy(() => buildCallClaimSchema(safeSerializedPermissionContextSchema())),
  attached_computer: DoctorLazy(() => buildCallClaimSchema(minimalPermissionContextSchema())),
};
//@ chunk-m8aeec95.js:11775-11887 placement
function runStepToolUseId(e) {
  let n = isPlainObject(e) ? e[ANTHROPIC_RETURNTOOLOUTPUT] : void 0;
  return isPlainObject(n) && n.step === "run" ? toolUseIdSchema().safeParse(n.tool_use_id).data : void 0;
}
//@ chunk-m8aeec95.js:11887-12043 placement
function parseToolContainerStep(e, n = TOOL_HOST_INTERFACE_VERSION) {
  let r = isPlainObject(e) ? e[ANTHROPIC_RETURNTOOLOUTPUT] : void 0;
  if (r === void 0) return { kind: "absent" };
  if (!r0n(r)) return { kind: "other_request" };
  return judgeCallClaim(r, n, "tool_container");
}
//@ chunk-m8aeec95.js:12043-12263 placement
function judgeCallClaim(e, n, r) {
  let s = parseInterfaceVersion(e.tool_host_interface);
  if (s === void 0) return { kind: "malformed" };
  let y = n === "compared_elsewhere" ? void 0 : checkInterfaceVersion(n, s);
  if (y !== void 0 && rt(e.step)) return y;
  let h = parseCallClaim(e, r);
  return h.kind === "declined" ? h : (y ?? h);
}
/**
 * 解析 MCP 服务端的调用声明：权限上下文过大、含被拒字段、校验成功或格式错误（区分是否启用了未列出的限制）分别返回对应结果。
 */
//@ chunk-m8aeec95.js:12263-12632 placement
function parseCallClaim(e, n) {
  let r = isPlainObject(e.approval) ? e.approval : void 0;
  if (PV(e.permission_context) || PV(r?.permission_context)) return { kind: "too_large" };
  let [s] = listRefusedClaimParts(e, r ?? {}, n);
  if (s !== void 0) return { kind: "not_honoured", part: s };
  let safeParse = Qe[n]().safeParse(e);
  if (safeParse.success) return toClaimResult(safeParse.data);
  return {
    kind:
      loadCachedRestrictions(e.permission_context) || loadCachedRestrictions(r?.permission_context)
        ? "unlisted_restriction_on"
        : "malformed",
  };
}
//@ chunk-m8aeec95.js:12632-12837 placement
function checkInterfaceVersion(e, n) {
  let { kind: kind } = compareInterfaceVersions(e, n);
  switch (kind) {
    case "peer_too_old":
      return { kind: "session_too_old", session: n };
    case "self_too_old":
      return { kind: "daemon_too_old", session: n };
    case "agreed":
      return;
    default:
      return kind;
  }
}
//@ chunk-m8aeec95.js:12837-12906 placement
function rt(e) {
  let found = J(STEP_NEEDS_PERMISSION).find((r) => r === e);
  return found === void 0 || STEP_NEEDS_PERMISSION[found];
}
/**
 * 列出调用声明中当前工具不接受的部分：步骤、成员、approval 成员与无效的权限上下文。
 */
//@ chunk-m8aeec95.js:12906-13311 placement
function listRefusedClaimParts(e, n, r) {
  return [
    ...J(CLAIM_FIELD_TRUST.step).filter((s) => e.step === s && CLAIM_FIELD_TRUST.step[s][r] === "refused"),
    ...J(CLAIM_FIELD_TRUST.member).filter(
      (s) => Object.hasOwn(e, s) && CLAIM_FIELD_TRUST.member[s][r] === "refused",
    ),
    ...J(CLAIM_FIELD_TRUST.approval_member)
      .filter((s) => Object.hasOwn(n, s) && CLAIM_FIELD_TRUST.approval_member[s][r] === "refused")
      .map((s) => `approval.${s}`),
    ...(isPermissionContextHonoured(r, e.permission_context) ? [] : ["permission_context"]),
    ...(isPermissionContextHonoured(r, n.permission_context) ? [] : ["approval.permission_context"]),
  ];
}
//@ chunk-m8aeec95.js:13311-13419 placement
function isPermissionContextHonoured(e, n) {
  switch (e) {
    case "tool_container":
      return !0;
    case "attached_computer":
      return n === void 0 || PTs(n);
  }
}
//@ chunk-m8aeec95.js:13419-13555 placement
function toClaimResult(e) {
  switch (e.step) {
    case "check":
    case "run":
      return { kind: "requested", request: e };
    case "decline":
      return { kind: "declined", request: e };
  }
}
//@ chunk-m8aeec95.js:13555-13591 placement
function J(e) {
  return Object.keys(e);
}

export {
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
  mcpServeCallState,
  pe,
  setWithEviction,
  toolUseIdSchema,
  agentIdSchema,
  call,
};
